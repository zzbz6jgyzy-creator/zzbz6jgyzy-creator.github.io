#!/usr/bin/env python3
"""One-shot HTML pass for the mobile performance polish.

- Drop Google Fonts (self-hosted in styles.css)
- Preload Inter latin on key pages
- Defer shared + tracker scripts on key pages
- Load below-fold CSS asynchronously on key pages
- Bump cache tags on touched stylesheets
"""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = "202610211030"
KEY = {
    "index.html",
    "starship.html",
    "starlink.html",
    "fsd-europe.html",
    "my-tesla.html",
    "updates.html",
    "dispatch/starship-flight-15-catch-timeline.html",
}
ASYNC_CSS = (
    "design-21st.css",
    "grow.css",
    "intel.css",
    "related.css",
)
DEFER_JS = (
    "script.js",
    "design-21st.js",
    "nav-pill.js",
    "starship-data.js",
    "starship-lab-data.js",
    "starship.js",
    "starship-lab.js",
    "starlink-data.js",
    "starlink-live.js",
    "starlink-tracker.js",
    "starlink-identify.js",
    "starlink-globe.js",
    "cesium-lazy.js",
    "fsd-europe-data.js",
    "tcmv-data.js",
    "fsd-europe-v2.js",
    "updates-data.js",
    "fsd-data.js",
    "my-tesla-data.js",
    "intel-core.js",
    "my-tesla.js",
    "newsletter.js",
)
BUMP = {
    "styles.css": V,
    "nav-pill.css": V,
    "home-v2.css": V,
    "live.css": V,
    "theme.css": V,
    "intel.css": V,
    "grow.css": V,
    "starship-lab.css": V,
    "starlink-tracker.css": V,
    "fsd-europe-v2.css": V,
    "my-tesla.css": V,
    "updates-v3.css": V,
    "related.css": V,
    "design-21st.css": V,
}
PRELOAD = '    <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/inter-latin.woff2" crossorigin />\n'
CRIT = '    <style>html,body{background:#0c0d10;color:#ecece8}html[data-theme=light],html[data-theme=light] body{background:#f3f1ec;color:#16171b}</style>\n'
GF_RX = re.compile(
    r"[ \t]*<link[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*"
    r"|[ \t]*<noscript>\s*<link[^>]*fonts\.googleapis\.com[^>]*>\s*(?:<link[^>]*fonts\.googleapis\.com[^>]*>\s*)*</noscript>\s*",
    re.I,
)
NOSCRIPT_GF_RX = re.compile(
    r"[ \t]*<noscript>\s*(?:<link[^>]*fonts\.googleapis\.com[^>]*>\s*)+</noscript>\s*",
    re.I,
)


def async_css(href: str, extra: str = "") -> str:
    return (
        f'<link rel="stylesheet" href="{href}" media="print" onload="this.media=\'all\'"{extra} />'
        f'<noscript><link rel="stylesheet" href="{href}" /></noscript>'
    )


def patch_async_css(html: str) -> str:
    def repl(m):
        tag = m.group(0)
        href = m.group(1)
        name = href.split("?")[0].lstrip("/")
        if name not in ASYNC_CSS:
            return tag
        if "onload=" in tag:
            return tag
        indent = re.match(r"^(\s*)", tag).group(1)
        return indent + async_css(href)

    return re.sub(
        r'<link rel="stylesheet" href="(/[^"]+\.css[^"]*)"[^>]*>',
        repl,
        html,
    )


def patch_defer_js(html: str) -> str:
    def repl(m):
        tag = m.group(0)
        src = m.group(1)
        name = src.split("?")[0].lstrip("/")
        if name not in DEFER_JS:
            return tag
        if re.search(r"\bdefer\b", tag):
            return tag
        return tag.replace("<script ", "<script defer ", 1)

    return re.sub(r'<script(?![^>]*\btype="application/ld\+json")[^>]*\bsrc="(/[^"]+\.js[^"]*)"[^>]*>\s*</script>', repl, html)


def bump_css(html: str) -> str:
    for name, ver in BUMP.items():
        html = re.sub(
            rf'(/{re.escape(name)}\?v=)\d+',
            rf"\g<1>{ver}",
            html,
        )
    return html


def insert_preload(html: str) -> str:
    if "inter-latin.woff2" in html:
        return html
    # After theme-boot + viewport, before title or first stylesheet.
    m = re.search(r'<meta name="viewport"[^>]*>\s*', html)
    if not m:
        m = re.search(r'<script src="/theme-boot\.js"></script>\s*', html)
    if not m:
        return html
    return html[: m.end()] + PRELOAD + html[m.end() :]


def strip_google_fonts(html: str) -> str:
    html = NOSCRIPT_GF_RX.sub("", html)
    html = GF_RX.sub("", html)
    return html


def main() -> None:
    changed = []
    for path in sorted(ROOT.rglob("*.html")):
        if any(p in path.parts for p in (".git", "node_modules", "vendor")):
            continue
        rel = str(path.relative_to(ROOT))
        old = path.read_text(encoding="utf-8")
        html = old
        if rel in KEY:
            html = strip_google_fonts(html)
            if "<style>html,body{background:#0c0d10" not in html:
                html = html.replace('<script src="/theme-boot.js"></script>\n', '<script src="/theme-boot.js"></script>\n' + CRIT)
            html = insert_preload(html)
            html = patch_async_css(html)
            html = patch_defer_js(html)
            html = bump_css(html)
        if html != old:
            path.write_text(html, encoding="utf-8")
            changed.append(rel)
    print(f"updated {len(changed)} html files")
    for rel in changed:
        print(" ", rel)


if __name__ == "__main__":
    main()
