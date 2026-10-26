#!/usr/bin/env python3
"""Scaffold a new Dispatch article: page, story-card and data/articles.json entry.

    python3 scripts/new-article.py --slug starship-flight-15-date --topic spacex --tag Starship \
        --title "Full headline as readers see it" --summary "One-line standfirst." \
        [--image /assets/dispatch/x.jpg --image-alt "Describe it"] [--date 2026-10-27T09:30:00Z] [--dry-run]

The page is cloned from the newest text-only article, so head, nav, newsletter band and
footer match the live template. The body is a clearly marked DRAFT: write it, delete the
DRAFT markers, then commit. CI (home-build.yml) fills related stories, wayfinding, OG image,
sitemap, feed and the final NewsArticle graph when the branch reaches main.
"""
import argparse
import datetime
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://superchargeddaily.com"
TOPICS = {"tesla": "tag-tesla", "spacex": "tag-spacex", "xai": "tag-xai", "x": "tag-spacex"}
DRAFT = "<!-- DRAFT: remove every DRAFT marker before publishing -->"


def iso(value):
    if value:
        return value if value.endswith("Z") else value + "Z"
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def label(date_iso):
    d = datetime.datetime.fromisoformat(date_iso.replace("Z", "+00:00"))
    return f"{d.day} {d.strftime('%b %Y')}"


def skeleton(articles):
    for a in articles:
        p = ROOT / a["url"].lstrip("/")
        if not p.exists():
            continue
        s = p.read_text(encoding="utf-8")
        if "figure-video" not in s and "twitter-tweet" not in s and "<!-- seo:about -->" in s:
            return a, s
    sys.exit("no text-only article to use as a skeleton")


def set_meta(src, attr, name, value):
    value = html.escape(value, quote=True)
    rx = re.compile(r'(<meta\s+%s="%s"\s+content=")[^"]*(")' % (attr, re.escape(name)))
    if rx.search(src):
        return rx.sub(lambda m: m.group(1) + value + m.group(2), src, count=1)
    return src


def build(args):
    data = json.loads((ROOT / "data" / "articles.json").read_text(encoding="utf-8"))
    articles = data["articles"]
    url = f"/dispatch/{args.slug}.html"
    if any(a["url"] == url for a in articles) or (ROOT / url.lstrip("/")).exists():
        sys.exit(f"{url} already exists")
    if args.topic not in TOPICS:
        sys.exit("--topic must be one of " + ", ".join(TOPICS))
    when = iso(args.date)
    _, page = skeleton(articles)
    image = args.image or "/assets/og-v2.jpg"
    alt = args.image_alt or "Supercharged Daily"
    full = SITE + url
    title_tag = f"{args.title} | Supercharged Daily" if len(args.title) <= 42 else args.title

    # head metadata
    page = re.sub(r"<title>[\s\S]*?</title>", lambda m: "<title>%s</title>" % html.escape(title_tag, quote=False), page, count=1)
    page = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")', lambda m: m.group(1) + html.escape(args.summary, quote=True) + m.group(2), page, count=1)
    page = re.sub(r'(<meta\s*\n\s*name="description"\s*\n\s*content=")[^"]*(")', lambda m: m.group(1) + html.escape(args.summary, quote=True) + m.group(2), page, count=1)
    page = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + full + m.group(2), page, count=1)
    for attr, name, value in [
        ("property", "article:published_time", when),
        ("property", "article:modified_time", when),
        ("property", "og:title", args.title),
        ("property", "og:description", args.summary),
        ("property", "og:url", full),
        ("property", "og:image", SITE + image),
        ("property", "og:image:alt", alt),
        ("name", "twitter:title", args.title),
        ("name", "twitter:description", args.summary),
        ("name", "twitter:image", SITE + image),
        ("name", "twitter:image:alt", alt),
    ]:
        page = set_meta(page, attr, name, value)

    # JSON-LD: keep the skeleton's publisher/author graph, swap the story fields
    def ld(m):
        blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', m.group(0), re.S)
        out = []
        for raw in blocks:
            obj = json.loads(raw)
            if obj.get("@type") == "NewsArticle":
                obj["mainEntityOfPage"] = {"@type": "WebPage", "@id": full}
                obj["headline"] = args.title if len(args.title) <= 110 else args.title[:109].rsplit(" ", 1)[0] + "…"
                obj["description"] = args.summary
                obj["datePublished"] = when
                obj.pop("dateModified", None)
                obj["image"] = [SITE + image]
                obj["articleSection"] = args.tag
            elif obj.get("@type") == "BreadcrumbList":
                last = obj["itemListElement"][-1]
                last["name"], last["item"] = args.title, full
            out.append('    <script type="application/ld+json">%s</script>' % json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
        return "<!-- seo:ld -->\n    <meta name=\"author\" content=\"Alex R\" />\n" + "\n".join(out) + "\n    <!-- /seo:ld -->"

    page = re.sub(r"<!-- seo:ld -->[\s\S]*?<!-- /seo:ld -->", ld, page, count=1)

    # breadcrumb + body
    page = re.sub(r'(<li aria-current="page">)[^<]*(</li>)', lambda m: m.group(1) + html.escape(args.title) + m.group(2), page, count=1)
    start = page.index('<p class="eyebrow">')
    end = page.index("<!-- seo:about -->")
    body = (
        f'<p class="eyebrow">{html.escape(args.tag)} · {label(when)}</p>\n'
        f"          <h1>{html.escape(args.title)}</h1>\n"
        f'          <p class="meta"><span>From <a href="/author.html">Alex R</a></span> <span>{html.escape(args.tag)}</span></p>\n'
        f"          {DRAFT}\n"
        f'          <p class="standfirst"><strong>{html.escape(args.summary)}</strong></p>\n'
        "          <p>DRAFT: what happened, with the source named in the sentence.</p>\n"
        "          <h2>DRAFT: what is confirmed, and what is not</h2>\n"
        "          <p>DRAFT: separate company statements, filings and reports. No invented quotes or numbers.</p>\n"
        "          <h2>Sources</h2>\n"
        '          <ul><li><a href="https://example.com/DRAFT" rel="noopener">DRAFT: primary source, with date</a></li></ul>\n'
        '          <p><a class="x-link" href="https://x.com/ALJR86">Follow @ALJR86 on X →</a></p>\n          '
    )
    page = page[:start] + body + page[end:]
    # these are rebuilt by CI from the new entry
    page = re.sub(r"<!--related:start-->[\s\S]*?<!--related:end-->", "", page)
    page = re.sub(r"<!--sd:article-wayfinding-->[\s\S]*?<!--/sd:article-wayfinding-->", "", page)

    entry = {
        "url": url, "title": args.title, "date": when, "topic": args.topic, "tag": args.tag,
        "image": image, "summary": args.summary, "pinned": False, "imageAlt": alt, "author": "Alex R",
    }
    card = (
        f'            <a class="story-card" href="{url}">\n'
        f'              <picture><img src="{html.escape(image)}" alt="{html.escape(alt, quote=True)}" width="1200" height="630" loading="lazy" /></picture>\n'
        '              <div class="story-copy">\n'
        f'                <span class="tag {TOPICS[args.topic]}">{html.escape(args.tag)}</span>\n'
        f"                <h2>{html.escape(args.title)}</h2>\n"
        f"                <p>{html.escape(args.summary)}</p>\n"
        f'                <p class="sd-disp-meta"><time datetime="{when}">{label(when)}</time></p>\n'
        "              </div>\n"
        "            </a>\n"
    )
    return url, page, entry, card, data


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", required=True, help="lowercase-with-dashes file name, no .html")
    ap.add_argument("--title", required=True, help="full headline")
    ap.add_argument("--summary", required=True, help="one-line standfirst (also the meta description)")
    ap.add_argument("--topic", required=True, choices=sorted(TOPICS))
    ap.add_argument("--tag", required=True, help='short label, e.g. "Starship", "FSD", "Grok"')
    ap.add_argument("--image", help="site path, e.g. /assets/dispatch/x.jpg (default: site card)")
    ap.add_argument("--image-alt")
    ap.add_argument("--date", help="ISO UTC, default now")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", args.slug):
        sys.exit("--slug must be lowercase letters, digits and dashes")
    url, page, entry, card, data = build(args)
    if args.dry_run:
        print(f"would create {url} ({len(page)} bytes), add a story-card and an articles.json entry")
        return
    (ROOT / url.lstrip("/")).write_text(page, encoding="utf-8")
    data["articles"].insert(0, entry)
    data["updated"] = entry["date"]
    (ROOT / "data" / "articles.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    dispatch = ROOT / "dispatch.html"
    s = dispatch.read_text(encoding="utf-8")
    marker = '<div class="story-grid" data-disp-grid>\n'
    if marker not in s:
        sys.exit("dispatch.html story grid not found; add the card by hand")
    dispatch.write_text(s.replace(marker, marker + card, 1), encoding="utf-8")
    print(f"created {url}\nnext: write the body in dispatch/{args.slug}.html, remove the DRAFT markers, then run scripts/audit/run.sh {url} --quick")


if __name__ == "__main__":
    main()
