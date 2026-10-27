#!/usr/bin/env python3
"""SEO/metadata check for one page: a repo path (dispatch/x.html) or a URL.

Checks the things the site's own builders are supposed to guarantee: title and
description length, canonical, Open Graph + X card, parsable JSON-LD, exactly one H1,
image alts, and stray text in <head> (the broken-description bug class).
Exit code 1 when anything fails.
"""
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.links, self.ld, self.h1, self.imgs, self.noalt = {}, {}, [], 0, 0, 0
        self.title = None
        self.stray = []
        self._in = []
        self._buf = ""
        self._ld = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self._in.append(tag)
        if tag == "title" and "svg" not in self._in:
            self.title = ""
        elif tag == "meta" and (a.get("name") or a.get("property")):
            self.meta.setdefault((a.get("name") or a.get("property")).lower(), a.get("content") or "")
        elif tag == "link" and a.get("rel"):
            self.links.setdefault(a["rel"].lower(), a.get("href"))
        elif tag == "h1":
            self.h1 += 1
        elif tag == "img":
            self.imgs += 1
            if "alt" not in a:
                self.noalt += 1
        elif tag == "script":
            self._ld = a.get("type") == "application/ld+json"
            self._buf = ""

    def handle_endtag(self, tag):
        if tag == "script" and self._ld and self._buf.strip():
            self._ld = False
            try:
                self.ld.append(json.loads(self._buf))
            except ValueError:
                self.ld.append("INVALID")
            self._buf = ""
        while self._in and self._in.pop() != tag:
            pass

    def handle_data(self, data):
        cur = self._in[-1] if self._in else ""
        if cur == "title" and "svg" not in self._in and self.title is not None:
            self.title += data
        elif cur == "script":
            self._buf += data
        elif "head" in self._in and cur == "head" and data.strip():
            self.stray.append(data.strip()[:80])


def load(arg):
    if re.match(r"https?://", arg):
        req = urllib.request.Request(arg, headers={"User-Agent": "sd-seo-check"})
        return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    return (ROOT / arg.lstrip("/")).read_text(encoding="utf-8")


def check(html_text, name=""):
    p = Page()
    p.feed(html_text)
    problems, notes = [], []
    title = (p.title or "").strip()
    desc = p.meta.get("description", "")
    types = [i.get("@type") for i in p.ld if isinstance(i, dict)]
    if not title:
        problems.append("missing <title>")
    elif len(title) > 70:
        notes.append(f"title is {len(title)} chars (search engines cut at ~60)")
    if not desc:
        problems.append("missing meta description")
    elif not 70 <= len(desc) <= 170:
        notes.append(f"description is {len(desc)} chars (aim 120-160)")
    if not p.links.get("canonical"):
        problems.append("missing canonical")
    for k in ("og:title", "og:description", "og:image", "og:url", "twitter:card", "twitter:image"):
        if not p.meta.get(k):
            problems.append(f"missing {k}")
    if "INVALID" in p.ld:
        problems.append("JSON-LD does not parse")
    if not p.ld:
        problems.append("no JSON-LD")
    if p.h1 != 1:
        problems.append(f"{p.h1} <h1> elements (want 1)")
    if p.noalt:
        problems.append(f"{p.noalt} of {p.imgs} images have no alt attribute")
    if p.stray:
        problems.append("text loose in <head> (broken tag?): " + "; ".join(p.stray[:3]))
    if "<!-- DRAFT" in html_text or "DRAFT:" in html_text:
        problems.append("DRAFT marker still in the page")
    is_article = "dispatch/" in name or p.meta.get("og:type") == "article"
    if is_article:
        if "NewsArticle" not in types:
            problems.append("article without NewsArticle JSON-LD")
        for k in ("article:published_time",):
            if not p.meta.get(k):
                problems.append(f"missing {k}")
        for ld in p.ld:
            if isinstance(ld, dict) and ld.get("@type") == "NewsArticle":
                for k in ("headline", "datePublished", "author", "publisher", "image"):
                    if not ld.get(k):
                        problems.append(f"NewsArticle missing {k}")
                if re.search(r"\b(is|the|a|an|of|to|and|for|in|on|with|as|at|by|from)$", ld.get("headline", ""), re.I):
                    problems.append("NewsArticle headline ends mid-sentence: " + ld["headline"][-40:])
    return {
        "page": name,
        "title": title,
        "description_chars": len(desc),
        "json_ld_types": types,
        "problems": problems,
        "notes": notes,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: seo_check.py <repo-path|url>")
    out = check(load(sys.argv[1]), sys.argv[1])
    print(json.dumps(out, indent=2, ensure_ascii=False))
    sys.exit(1 if out["problems"] else 0)
