#!/usr/bin/env python3
"""Shared SEO helpers used by build-seo.py and build-feed.py.

Keep headline clipping, brand suffixes and head hygiene in one place so the
30-minute headline refresh cannot reintroduce mid-word cuts or Google Fonts.
"""
from __future__ import annotations

import html
import json
import os
import re
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://superchargeddaily.com"
BRAND = "Supercharged Daily"
SUFFIX = " | Supercharged Daily"
AUTHOR = "Alex R"
X_URL = "https://x.com/ALJR86"
LICENSE_URL = SITE + "/editorial.html#data"
EMAIL = "superchargeddaily@gmail.com"

GF_RX = re.compile(
    r"[ \t]*<link[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*"
    r"|[ \t]*<noscript>\s*(?:<link[^>]*fonts\.googleapis\.com[^>]*>\s*)+</noscript>\s*",
    re.I,
)
STANDFIRST_RX = re.compile(
    r"@media\(max-width:760px\)\{\.standfirst\{min-height:380px\}\}",
    re.I,
)
# Fallout from replacing article:modified_time with r"\1%s\2" % "2026-…":
# Python treats \12 as group 12 and leaves orphan "P26-10-…" lines.
BROKEN_MODIFIED_RX = re.compile(r"^[ \t]*P\d{2}-\d{2}-\d{2}T[^\n]*\n", re.M)
DUP_CSS = ("grow.css", "related.css", "intel.css")


def clip(text: str, limit: int, ellipsis: bool = False) -> str:
    """Shorten at a word boundary. Never cut mid-word (JSON-LD used to slice at 110)."""
    text = re.sub(r"\s+", " ", (text or "").strip())
    if len(text) <= limit:
        return text
    cut = text[: limit + 1].rsplit(" ", 1)[0].rstrip(" ,.;:—–-")
    if not cut:
        cut = text[:limit].rstrip()
    if ellipsis and not cut.endswith((".", "…")):
        cut = cut.rstrip(".") + "…"
    return cut


def branded(title: str, limit: int = 60) -> str:
    """One brand suffix style: ' | Supercharged Daily'. Fit ~60 characters."""
    title = re.sub(r"\s+", " ", title or "").strip()
    title = re.sub(r"\s+[—|]\s+Supercharged Daily\s*$", "", title, flags=re.I)
    room = limit - len(SUFFIX)
    if room < 12:
        return clip(title, limit)
    core = clip(title, room)
    return core + SUFFIX


def xml_esc(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def rfc2822(iso: str) -> str:
    """RSS pubDate from an ISO-8601 value. Falls back to the raw string."""
    import datetime

    raw = (iso or "").replace("Z", "+00:00")
    try:
        dt = datetime.datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.strftime("%a, %d %b %Y %H:%M:%S %z")
    except (ValueError, TypeError):
        return iso or ""


def iso_utc(iso: str) -> str:
    import datetime

    raw = (iso or "").replace("Z", "+00:00")
    try:
        dt = datetime.datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, TypeError):
        return iso or ""


def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def load_titles():
    path = os.path.join(ROOT, "scripts", "seo-titles.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def set_attr(src: str, attr: str, name: str, value: str) -> str:
    """Replace an existing meta content=, or no-op if the tag is missing."""
    value = html.escape(value, quote=True)
    rx = re.compile(
        r'(<meta\s+(?:%s="%s"|%s=\'%s\')[^>]*\scontent=")[^"]*(")'
        % (attr, re.escape(name), attr, re.escape(name)),
        re.I,
    )
    if rx.search(src):
        return rx.sub(lambda m: m.group(1) + value + m.group(2), src, count=1)
    rx2 = re.compile(
        r'(<meta\s+content=")[^"]*("[^>]*\s%s="%s")' % (attr, re.escape(name)),
        re.I,
    )
    if rx2.search(src):
        return rx2.sub(lambda m: m.group(1) + value + m.group(2), src, count=1)
    return src


def set_title(src: str, title: str) -> str:
    esc = html.escape(title, quote=False)
    src = re.sub(r"<title>[\s\S]*?</title>", "<title>%s</title>" % esc, src, count=1)
    for attr, name in (
        ("property", "og:title"),
        ("name", "twitter:title"),
    ):
        src = set_attr(src, attr, name, title)
    return src


def set_description(src: str, desc: str) -> str:
    for attr, name in (
        ("name", "description"),
        ("property", "og:description"),
        ("name", "twitter:description"),
    ):
        src = set_attr(src, attr, name, desc)
    return src


def _insert_in_head(src: str, snippet: str) -> str:
    """Park robots/feed/twitter tags before page CSS that sits next to members.

    Studio builders re-insert their stylesheet immediately before
    ``<!--sd:members-->``. Putting Discover/RSS tags on ``</head>`` lands them
    between that CSS and the members block, so the next studio --check fails.
    Prefer ``<!-- /seo:ld -->``, then ``</title>``, then ``</head>``.
    """
    snippet = snippet if snippet.endswith("\n") else snippet + "\n"
    for marker in ("    <!-- /seo:ld -->", "<!-- /seo:ld -->", "</title>"):
        pos = src.find(marker)
        if pos >= 0:
            at = pos + len(marker)
            return src[:at] + "\n" + snippet.rstrip("\n") + src[at:]
    return src.replace("</head>", snippet + "  </head>", 1)


def ensure_robots(src: str) -> str:
    """Site-wide Discover opt-in. Promise tracker already had this; others did not."""
    wanted = "index, follow, max-image-preview:large"
    m = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', src, re.I)
    if m:
        current = m.group(1)
        if "noindex" in current.lower():
            return src
        if "max-image-preview" in current.lower():
            return src
        return src[: m.start(1)] + wanted + src[m.end(1) :]
    if re.search(r'<meta\s+content="[^"]*"\s+name="robots"', src, re.I):
        return src
    return _insert_in_head(
        src, '    <meta name="robots" content="%s" />' % wanted
    )


def ensure_feed_link(src: str) -> str:
    if 'rel="alternate"' in src and "feed.xml" in src:
        return src
    block = (
        '    <link rel="alternate" type="application/rss+xml" '
        'title="Supercharged Daily" href="https://superchargeddaily.com/feed.xml" />'
    )
    return _insert_in_head(src, block)


def strip_google_fonts(src: str) -> str:
    return GF_RX.sub("", src)


def drop_standfirst_reserve(src: str) -> str:
    """The 380px min-height on .standfirst was overridden by styles.css after load (CLS)."""
    return STANDFIRST_RX.sub("", src)


def dedupe_stylesheet(src: str, name: str) -> str:
    """Keep the first stylesheet for a file; drop later copies (blocking + async cancel)."""
    pattern = re.compile(
        r"[ \t]*<link\b[^>]*href=\"/" + re.escape(name) + r"[^\"]*\"[^>]*>\s*"
        r"(?:<noscript>\s*<link\b[^>]*href=\"/" + re.escape(name) + r"[^\"]*\"[^>]*>\s*</noscript>\s*)?",
        re.I,
    )
    matches = list(pattern.finditer(src))
    if len(matches) < 2:
        return src
    # Keep the first; delete the rest from the end so offsets stay valid.
    for m in reversed(matches[1:]):
        src = src[: m.start()] + src[m.end() :]
    return src


def ensure_twitter_image(src: str) -> str:
    if re.search(r'<meta\s+name="twitter:image"', src):
        return src
    m = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', src)
    if not m:
        return src
    tag = '    <meta name="twitter:image" content="%s" />\n' % m.group(1)
    alt = re.search(r'<meta\s+property="og:image:alt"\s+content="([^"]+)"', src)
    if alt:
        tag += '    <meta name="twitter:image:alt" content="%s" />\n' % alt.group(1)
    if "</head>" not in src:
        return src
    return _insert_in_head(src, tag.rstrip("\n"))


def ensure_twitter_creator(src: str) -> str:
    if re.search(r'<meta\s+name="twitter:creator"', src):
        return src
    if re.search(r'<meta\s+name="twitter:site"', src):
        return src.replace(
            '<meta name="twitter:site" content="@ALJR86" />',
            '<meta name="twitter:site" content="@ALJR86" />\n    '
            '<meta name="twitter:creator" content="@ALJR86" />',
            1,
        )
    return src


def drop_handwritten_newsarticle(src: str) -> str:
    """Off-template dispatches kept a second NewsArticle script outside seo:ld."""
    if "<!-- seo:ld -->" not in src:
        return src

    def keep(m):
        block = m.group(0)
        start, end = m.span()
        before = src[:start]
        # Only strip duplicates that sit *outside* the generated markers.
        if "<!-- seo:ld -->" in before and "<!-- /seo:ld -->" not in before.split("<!-- seo:ld -->")[-1]:
            return block
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            return block
        types = data.get("@type")
        if types == "NewsArticle" or (isinstance(types, list) and "NewsArticle" in types):
            return ""
        return block

    return re.sub(
        r'[ \t]*<script type="application/ld\+json">(\s*\{[\s\S]*?\})</script>\s*',
        keep,
        src,
    )


def org():
    return {
        "@type": "Organization",
        "name": BRAND,
        "url": SITE + "/",
        "sameAs": [X_URL],
        "logo": {
            "@type": "ImageObject",
            "url": SITE + "/favicon-512.png",
            "width": 512,
            "height": 512,
        },
    }


def person():
    return {
        "@type": "Person",
        "name": AUTHOR,
        "url": SITE + "/author.html",
        "sameAs": [X_URL],
    }


def html_files(root=ROOT):
    """Public HTML pages, skipping templates and vendor trees."""
    import glob

    skip = ("preview/", "node_modules/", "vendor/", "templates/", "tests/", "lab/", "apps/")
    for path in glob.glob(os.path.join(root, "**", "*.html"), recursive=True):
        rel = os.path.relpath(path, root).replace(os.sep, "/")
        if rel.startswith(skip):
            continue
        yield rel, path


def dublin_label(iso: str) -> str:
    """Visible date in Europe/Dublin, matching Dispatch card dates."""
    import datetime
    try:
        from zoneinfo import ZoneInfo
    except ImportError:
        ZoneInfo = None  # type: ignore
    raw = (iso or "").replace("Z", "+00:00")
    try:
        dt = datetime.datetime.fromisoformat(raw)
    except (ValueError, TypeError):
        return iso or ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    if ZoneInfo:
        dt = dt.astimezone(ZoneInfo("Europe/Dublin"))
    return f"{dt.day} {dt.strftime('%b %Y')}"


def hygiene(src: str) -> str:
    """Site-wide head fixes: Discover opt-in, RSS link, self-hosted fonts, CLS, CSS dupes."""
    src = ensure_robots(src)
    src = ensure_feed_link(src)
    src = strip_google_fonts(src)
    src = drop_standfirst_reserve(src)
    src = BROKEN_MODIFIED_RX.sub("", src)
    for name in DUP_CSS:
        src = dedupe_stylesheet(src, name)
    src = ensure_twitter_image(src)
    src = ensure_twitter_creator(src)
    return src


def set_og_image(src: str, url: str, alt: str, width="1200", height="630") -> str:
    src = set_attr(src, "property", "og:image", url)
    src = set_attr(src, "property", "og:image:alt", alt)
    src = set_attr(src, "property", "og:image:width", width)
    src = set_attr(src, "property", "og:image:height", height)
    src = set_attr(src, "name", "twitter:image", url)
    src = set_attr(src, "name", "twitter:image:alt", alt)
    if not re.search(r'<meta\s+name="twitter:image"', src) and "</head>" in src:
        src = _insert_in_head(
            src,
            '    <meta name="twitter:image" content="%s" />\n'
            '    <meta name="twitter:image:alt" content="%s" />'
            % (html.escape(url, True), html.escape(alt, True)),
        )
    return src


def replace_first_h1(src: str, inner_html: str) -> str:
    """Replace the first H1 inside <main>, leaving the mobile-nav H3s alone."""
    m = re.search(r"<main\b", src, re.I)
    if not m:
        return src
    head, tail = src[: m.start()], src[m.start() :]
    return head + re.sub(r"<h1\b[^>]*>[\s\S]*?</h1>", "<h1>" + inner_html + "</h1>", tail, count=1, flags=re.I)


def inject_json_ld(src: str, objects: list, marker="seo:ld") -> str:
    """Replace or insert a marker-wrapped JSON-LD block. Leaves other graphs alone."""
    start, end = "<!-- %s -->" % marker, "<!-- /%s -->" % marker
    scripts = "".join(
        '\n    <script type="application/ld+json">' + dumps(obj) + "</script>" for obj in objects
    )
    block = "\n    %s%s\n    %s" % (start, scripts, end)
    rx = re.compile(r"\n?\s*" + re.escape(start) + r".*?" + re.escape(end), re.S)
    if rx.search(src):
        return rx.sub(block, src, count=1)
    if "</head>" in src:
        return src.replace("</head>", block + "\n  </head>", 1)
    return src


def dataset(
    *,
    name: str,
    description: str,
    url: str,
    date_modified: str | None,
    variables: list,
    extra: dict | None = None,
):
    ld = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": name,
        "description": description,
        "url": url,
        "creator": person(),
        "publisher": org(),
        "license": LICENSE_URL,
        "isAccessibleForFree": True,
        "variableMeasured": [
            {"@type": "PropertyValue", "name": v} if isinstance(v, str) else v
            for v in variables
        ],
    }
    if date_modified:
        ld["dateModified"] = date_modified
    if extra:
        ld.update(extra)
    return ld
