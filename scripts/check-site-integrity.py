#!/usr/bin/env python3
"""Refuse a commit that leaves the site broken in a way a reader would see.

Bots commit rebuilt pages to main every ~30 minutes and articles are published straight to main,
so a half-written file or a bundle that was never staged goes live within minutes. On 9 Nov 2026
both happened in one morning: a publish cut dispatch.html off mid-tag (118 story cards lost) and a
Starlink refresh pointed starlink.html at two bundles it never committed. This check catches both
kinds of problem before the push.

Checks, on every tracked page outside astro/, social/, templates/ and scripts/:
  1. the page ends with </html> (not cut off part-way)
  2. every local script, stylesheet, calendar (.ics) and /assets/ file it points to exists
  3. every JSON file under data/ and at the root parses
  4. dispatch.html still lists at least 10 stories, and no fewer than 80% of the base's
  5. the homepage lead slot links to a story

With --base, only problems that the base does not already have fail the check, so a problem
already on main never blocks an unrelated bot. Sources:
  (default)    the working tree
  --ref REF    a commit, e.g. HEAD (what is about to be pushed)
  --ref :      the index (what is about to be committed)

Usage: python3 scripts/check-site-integrity.py [--ref REF] [--base REF]
Exit 0 = fine, 1 = new problems (listed on stderr).
"""
import argparse
import json
import os
import re
import subprocess
import sys

ROOT = os.environ.get("SITE_INTEGRITY_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = ("astro/", "social/", "templates/", "scripts/", "node_modules/", "dist/", "tests/")
REF_RE = re.compile(r'''(?:src|href)=["'](/[^"'?#\s]+?\.(?:js|css|mjs|ics))(?:[?#][^"']*)?["']''', re.I)
ASSET_RE = re.compile(r'''(?:src|href|poster)=["'](/assets/[^"'?#\s]+)(?:[?#][^"']*)?["']''', re.I)
MIN_STORIES, MIN_SHARE = 10, 0.8


def git(*args, data=None):
    r = subprocess.run(["git", *args], cwd=ROOT, input=data, capture_output=True)
    if r.returncode:
        raise SystemExit("git %s failed: %s" % (" ".join(args), r.stderr.decode(errors="replace").strip()))
    return r.stdout


class Tree:
    """Files as they stand in the working tree, the index (ref ':') or a commit."""

    def __init__(self, ref=None):
        self.ref = ref
        if ref is None:
            names = git("ls-files", "-z").decode().split("\0")
            self.names = {n for n in names if n and os.path.exists(os.path.join(ROOT, n))}
            # New files a builder wrote but nobody staged yet still exist for a reader of the working tree.
            self.names |= {n for n in git("ls-files", "-z", "--others", "--exclude-standard").decode().split("\0") if n}
        elif ref == ":":
            self.names = {n for n in git("ls-files", "-z").decode().split("\0") if n}
        else:
            self.names = {n for n in git("ls-tree", "-r", "-z", "--name-only", ref).decode().split("\0") if n}

    def read(self, paths):
        paths = [p for p in paths if p in self.names]
        if self.ref is None:
            out = {}
            for p in paths:
                with open(os.path.join(ROOT, p), encoding="utf-8", errors="replace") as fh:
                    out[p] = fh.read()
            return out
        spec = (self.ref if self.ref != ":" else "")
        req = "".join("%s:%s\n" % (spec, p) for p in paths).encode()
        raw = git("cat-file", "--batch", data=req)
        out, i = {}, 0
        for p in paths:
            nl = raw.index(b"\n", i)
            head = raw[i:nl].split()
            if len(head) < 3 or head[1] == b"missing":
                i = nl + 1
                continue
            size = int(head[2])
            out[p] = raw[nl + 1:nl + 1 + size].decode("utf-8", errors="replace")
            i = nl + 1 + size + 1
        return out


def pages(tree):
    return sorted(n for n in tree.names if n.endswith(".html") and not n.startswith(SKIP_DIRS))


def problems(tree):
    found = set()
    htmls = tree.read(pages(tree))
    for path, text in htmls.items():
        if "<html" in text[:4000].lower() and not text.rstrip().lower().endswith("</html>"):
            found.add("%s: cut off (does not end with </html>)" % path)
        for ref in set(REF_RE.findall(text)) | set(ASSET_RE.findall(text)):
            target = ref.lstrip("/")
            if target and target not in tree.names and not target.endswith("/"):
                found.add("%s: points to %s, which does not exist" % (path, ref))
    datas = sorted(n for n in tree.names if n.endswith(".json") and (n.startswith("data/") or "/" not in n))
    for path, text in tree.read(datas).items():
        try:
            json.loads(text)
        except ValueError as e:
            found.add("%s: not valid JSON (%s)" % (path, str(e)[:80]))
    disp = htmls.get("dispatch.html", "")
    stories = len(set(re.findall(r'<a class="story-card[^"]*" href="(/dispatch/[^"]+)"', disp)))
    if "dispatch.html" in htmls and stories < MIN_STORIES:
        found.add("dispatch.html: only %d story cards (expected at least %d)" % (stories, MIN_STORIES))
    home = htmls.get("index.html", "")
    if home:
        lead = re.search(r"<!--hv:lead-->(.*?)<!--/hv:lead-->", home, re.S)
        if not lead or not re.search(r'href="/dispatch/[^"]+\.html"', lead.group(1)):
            found.add("index.html: the homepage lead slot has no story link")
    return found, stories


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--ref", help="check a commit (or ':' for the index) instead of the working tree")
    ap.add_argument("--base", help="only fail on problems this ref does not already have")
    args = ap.parse_args()
    now, stories = problems(Tree(args.ref))
    if args.base:
        before, base_stories = problems(Tree(args.base))
        new = now - before
        if base_stories >= MIN_STORIES and stories < base_stories * MIN_SHARE:
            new.add("dispatch.html: story cards fell from %d to %d" % (base_stories, stories))
        old = len(now & before)
    else:
        new, old = now, 0
    if new:
        print("Site integrity check failed. These would reach readers:", file=sys.stderr)
        for line in sorted(new):
            print("  - " + line, file=sys.stderr)
        print("Fix the builder or the file and commit again; see scripts/check-site-integrity.py.", file=sys.stderr)
        return 1
    note = " (%d already on the base, not blocking)" % old if old else ""
    print("site integrity: ok, %d pages, %d stories%s" % (len(pages(Tree(args.ref))), stories, note))
    return 0


if __name__ == "__main__":
    sys.exit(main())
