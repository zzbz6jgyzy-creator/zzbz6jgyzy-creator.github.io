#!/usr/bin/env python3
"""Render Markdown articles in content/dispatch/ into dispatch/<slug>.html, ready for the CI generators.

    python3 scripts/render-article.py [slug ...] [--check] [--force]

With no slug it renders every content/dispatch/*.md whose HTML is missing or was rendered from older text (the hash in the
`<!-- md:... -->` comment). --check only reports. Pages are cloned from the live template by scripts/new-article.py (head, nav,
newsletter band, footer), so CI (home-build.yml) then fills related stories, wayfinding, OG image, sitemap, feed and the NewsArticle
graph exactly as for a hand-written page. Nothing is published from here.

Front matter (between --- lines): title, summary, topic (tesla|spacex|xai|x), tag, date (ISO UTC, optional), image, imageAlt,
description (optional). Body syntax: see docs/writing-articles.md.
"""
import argparse
import hashlib
import html
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "content" / "dispatch"
XEMBED_V = "202610262130"

spec = importlib.util.spec_from_file_location("new_article", ROOT / "scripts" / "new-article.py")
na = importlib.util.module_from_spec(spec)
spec.loader.exec_module(na)

E = html.escape


class ArticleError(Exception):
    pass


def split_front(text):
    m = re.match(r"---\n(.*?)\n---\n?", text, re.S)
    if not m:
        raise ArticleError("missing front matter (--- block)")
    meta = {}
    for line in m.group(1).splitlines():
        if line.strip() and not line.startswith("#"):
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"')
    return meta, text[m.end():]


def inline(s):
    """**bold**, *italic*, `code`, [text](url). Everything else is escaped."""
    out, pos = [], 0
    token = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+|/[^)\s]*|#[^)\s]*)\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`")
    for m in token.finditer(s):
        out.append(E(s[pos:m.start()], quote=False))
        if m.group(1):
            ext = m.group(2).startswith("http")
            rel = ' rel="noopener"' if ext and "superchargeddaily.com" not in m.group(2) else ""
            out.append(f'<a href="{E(m.group(2))}"{rel}>{inline(m.group(1))}</a>')
        elif m.group(3):
            out.append(f"<strong>{inline(m.group(3))}</strong>")
        elif m.group(4):
            out.append(f"<em>{inline(m.group(4))}</em>")
        else:
            out.append(f"<code>{E(m.group(5), quote=False)}</code>")
        pos = m.end()
    out.append(E(s[pos:], quote=False))
    return "".join(out)


def keyed(block):
    """`key: value` lines of a directive; a line starting with two spaces continues the previous value."""
    d, last = {}, None
    for line in block:
        m = re.match(r"([a-z]+):\s*(.*)$", line)
        if m:
            last = m.group(1)
            d[last] = m.group(2)
        elif last and line.startswith("  "):
            d[last] += " " + line.strip()
    return d


def need(d, directive, *keys):
    for k in keys:
        if not d.get(k):
            raise ArticleError(f"::{directive} needs '{k}:'")


def media_path(p, directive):
    if not p.startswith("/assets/"):
        raise ArticleError(f"::{directive}: file paths start with /assets/ ({p})")
    if not (ROOT / p.lstrip("/")).exists():
        raise ArticleError(f"::{directive}: {p} does not exist; upload it to assets/dispatch/ first")
    return p


def table(rows, label):
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    head, body = cells[0], [r for r in cells[2:]]
    th = "".join(f"<th>{inline(c)}</th>" for c in head)
    trs = "\n".join("      <tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
    return (f'<div class="sd-table-wrap" tabindex="0" role="region" aria-label="{E(label)}"><table class="sd-table">\n'
            f"    <thead><tr>{th}</tr></thead>\n    <tbody>\n{trs}\n    </tbody>\n  </table></div>")


def render_body(md, uses):
    lines = md.strip("\n").splitlines()
    out, i, heading = [], 0, "Table"
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("<!--") or re.search(r"\bDRAFT\b", line):
            raise ArticleError(f"line {i + 1}: remove DRAFT markers and HTML comments")
        if re.match(r"<[a-zA-Z]", line):
            raise ArticleError(f"line {i + 1}: raw HTML is not allowed; use the directives in docs/writing-articles.md")
        m = re.match(r"::(x|video|image|note|sources|pull)\b\s*(.*)$", line)
        if m:
            name, rest = m.group(1), m.group(2)
            block = []
            i += 1
            while i < len(lines) and lines[i].strip():
                block.append(lines[i])
                i += 1
            if name in ("pull", "note", "sources") and rest:
                d = {"text": rest}
            else:
                d = keyed(block)
            out.append(directive(name, d, uses))
            continue
        if line.startswith("## "):
            heading = line[3:].strip()
            out.append(f"<h2>{inline(heading)}</h2>")
            i += 1
        elif line.startswith("### "):
            out.append(f"<h3>{inline(line[4:].strip())}</h3>")
            i += 1
        elif line.startswith("#"):
            raise ArticleError(f"line {i + 1}: the title comes from front matter; use ## for sections")
        elif line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            if len(rows) < 3 or not re.match(r"^\|?\s*:?-{2,}", rows[1]):
                raise ArticleError("a table needs a header row, a |---| row and at least one body row")
            out.append(table(rows, heading))
        elif line.startswith(">"):
            q = []
            while i < len(lines) and lines[i].startswith(">"):
                q.append(lines[i].lstrip("> ").rstrip())
                i += 1
            out.append("<blockquote>\n  <p>" + inline(" ".join(q)) + "</p>\n</blockquote>")
        elif re.match(r"(-|\d+\.)\s", line):
            tag = "ol" if line[0].isdigit() else "ul"
            items = []
            while i < len(lines) and re.match(r"(-|\d+\.)\s", lines[i]):
                items.append(re.sub(r"^(-|\d+\.)\s+", "", lines[i]))
                i += 1
            out.append(f"<{tag}>" + "".join(f"<li>{inline(t)}</li>" for t in items) + f"</{tag}>")
        else:
            para = []
            while i < len(lines) and lines[i].strip() and not re.match(r"(#|\||>|::|(-|\d+\.)\s)", lines[i]):
                para.append(lines[i].strip())
                i += 1
            out.append("<p>" + inline(" ".join(para)) + "</p>")
    return out


def directive(name, d, uses):
    if name == "pull":
        need(d, name, "text")
        return f'<p class="pull">{inline(d["text"])}</p>'
    if name == "note":
        need(d, name, "text")
        return f'<p class="sd-note">{inline(d["text"])}</p>'
    if name == "sources":
        need(d, name, "text")
        if "](" not in d["text"]:
            raise ArticleError("::sources must link every source")
        return f'<p class="sources"><strong>Sources:</strong> {inline(d["text"])}</p>'
    if name == "image":
        need(d, name, "src", "alt", "caption")
        src = media_path(d["src"], name)
        return (f'<figure>\n  <img src="{E(src)}" alt="{E(d["alt"])}" width="{E(d.get("width", "1280"))}" height="{E(d.get("height", "720"))}" '
                f'loading="lazy" style="width:100%;height:auto" />\n  <figcaption>{inline(d["caption"])}</figcaption>\n</figure>')
    if name == "video":
        need(d, name, "src", "poster", "caption")
        src, poster = media_path(d["src"], name), media_path(d["poster"], name)
        return (f'<figure class="figure-video">\n  <video controls playsinline preload="metadata" poster="{E(poster)}">\n'
                f'    <source src="{E(src)}" type="video/mp4" />\n    Your browser does not support the video tag.\n  </video>\n'
                f'  <figcaption>{inline(d["caption"])}</figcaption>\n</figure>')
    if name == "x":
        need(d, name, "url", "author", "text", "caption")
        if not re.match(r"https://x\.com/\w+/status/\d+$", d["url"]):
            raise ArticleError(f"::x url must look like https://x.com/<user>/status/<id> ({d['url']})")
        uses.add("x")
        return (f'<figure class="figure-embed">\n  <blockquote class="twitter-tweet" data-media-max-width="720" data-dnt="true" data-theme="dark">\n'
                f'    <p lang="en" dir="ltr">{E(d["text"], quote=False)}</p>\n'
                f'    — {E(d["author"], quote=False)} <a href="{E(d["url"])}">View the post on X</a>\n  </blockquote>\n'
                f'  <figcaption>{inline(d["caption"])}</figcaption>\n</figure>')
    raise ArticleError(f"unknown directive ::{name}")


def fingerprint(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def render(slug, text):
    meta, md = split_front(text)
    for k in ("title", "summary", "topic", "tag"):
        if not meta.get(k):
            raise ArticleError(f"front matter needs '{k}:'")
    if re.search(r"[*`\[\]<>]|\]\(", meta["summary"] + meta["title"]):
        raise ArticleError("title and summary are plain text (they become meta tags); no Markdown or HTML")
    if meta["topic"] not in na.TOPICS:
        raise ArticleError("topic must be one of " + ", ".join(sorted(na.TOPICS)))
    if meta.get("image") and not meta.get("imageAlt"):
        raise ArticleError("an image needs imageAlt:")
    uses = set()
    parts = render_body(md, uses)
    if sum(1 for p in parts if p.startswith("<p>")) < 3:
        raise ArticleError("fewer than three paragraphs: is this finished?")
    if not any('<a href="http' in p for p in parts):
        raise ArticleError("no source links: name the sources inline or add ::sources")
    when = na.iso(meta.get("date"))
    stamp = f"<!-- md:{fingerprint(text)} -->"
    indent = " " * 10
    body = (f'<p class="eyebrow">{E(meta["tag"])} · {na.label(when)}</p>\n'
            f"{indent}{stamp}\n"
            f'{indent}<h1>{E(meta["title"], quote=False)}</h1>\n'
            f'{indent}<p class="meta"><span>From <a href="/author.html">Alex R</a></span> <span>{E(meta["tag"])}</span></p>\n'
            f'{indent}<p class="standfirst"><strong>{E(meta["summary"], quote=False)}</strong></p>\n'
            + "".join(f"{indent}{p.replace(chr(10), chr(10) + indent)}\n" for p in parts)
            + f'{indent}<p><a class="x-link" href="https://x.com/ALJR86">Open @ALJR86 on X →</a></p>\n{indent[:-2]}')
    ns = argparse.Namespace(slug=slug, title=meta["title"], summary=meta["summary"], topic=meta["topic"], tag=meta["tag"],
                            image=meta.get("image"), image_alt=meta.get("imageAlt"), date=meta.get("date"),
                            body_html=body, update=True)
    url, page, entry, card, data = na.build(ns)
    if meta.get("description"):
        page = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")', lambda m: m.group(1) + E(meta["description"]) + m.group(2), page, count=1)
    if "x" in uses:
        page = page.replace("</head>", f'    <link rel="stylesheet" href="/x-embed.css?v={XEMBED_V}" />\n  </head>', 1)
        page = page.replace("</body>", f'    <script defer src="/x-embed.js?v={XEMBED_V}"></script>\n  </body>', 1)
    return url, page, entry, card, data


def stale(slug, text):
    p = ROOT / "dispatch" / f"{slug}.html"
    return not p.exists() or f"<!-- md:{fingerprint(text)} -->" not in p.read_text(encoding="utf-8")


def write(slug, text):
    url, page, entry, card, data = render(slug, text)
    existed = (ROOT / url.lstrip("/")).exists()
    (ROOT / url.lstrip("/")).write_text(page, encoding="utf-8")
    by_url = {a["url"]: a for a in data["articles"]}
    if url in by_url:
        keep = by_url[url]
        dated = bool(re.search(r"^date:", text.split("---")[1], re.M))
        keep.update({k: v for k, v in entry.items() if k != "pinned" and (k != "date" or dated)})
    else:
        data["articles"].insert(0, entry)
        data["updated"] = entry["date"]
        dispatch = ROOT / "dispatch.html"
        s = dispatch.read_text(encoding="utf-8")
        marker = '<div class="story-grid" data-disp-grid>\n'
        if marker not in s:
            raise ArticleError("dispatch.html story grid not found")
        dispatch.write_text(s.replace(marker, marker + card, 1), encoding="utf-8")
    (ROOT / "data" / "articles.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return url, existed


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--check", action="store_true", help="validate and report; write nothing")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    files = [SRC / f"{s}.md" for s in a.slugs] if a.slugs else sorted(SRC.glob("*.md"))
    bad = 0
    for f in files:
        slug = f.stem
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
            print(f"{f.name}: file name must be lowercase-with-dashes")
            bad += 1
            continue
        text = f.read_text(encoding="utf-8")
        try:
            if a.check:
                render(slug, text)
                print(f"ok      {slug}{'' if not stale(slug, text) else '  (would render)'}")
            elif a.force or stale(slug, text):
                url, existed = write(slug, text)
                print(f"{'updated' if existed else 'created'} {url}")
            else:
                print(f"current {slug}")
        except ArticleError as e:
            print(f"{f.name}: {e}")
            bad += 1
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
