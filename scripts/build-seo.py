#!/usr/bin/env python3
"""SEO build step (runs in home-build.yml after build-articles.py).

1. Every Dispatch article listed in data/articles.json gets NewsArticle +
   BreadcrumbList JSON-LD (between <!-- seo:ld --> markers), og:type=article
   and article:published_time. A missing </head> is repaired first — that is
   why /dispatch/roadster-reveal-2026.html had no JSON-LD.
2. The same pass injects a visible Home → Dispatch → story crumb
   (<!-- seo:nav -->) and a desk/author block (<!-- seo:about -->) using only
    facts already on about.html: Supercharged Daily, Alex R, @ALJR86, not
   affiliated. No Person credentials are invented.
3. about.html gets Organization JSON-LD (same facts).
4. Listed non-article pages missing JSON-LD get a single <!-- seo:ld -->
   block (CollectionPage / WebApplication / Dataset / WebPage). name and
   description come from existing meta; url is the canonical; publisher is
   Supercharged Daily. Replaces only the seo:ld markers, so it is idempotent.
5. sitemap.xml is rebuilt from every public page (skips noindex pages, 404
   and /preview/). staging.html is the public Hot Staging game — it stays
   in the sitemap unless it has noindex. Article lastmod uses supported
   editorial history; other pages retain their existing git date behavior.
Idempotent: re-running produces no diff.
"""
import json, os, re, subprocess, html, glob, runpy, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://superchargeddaily.com"
X_URL = "https://x.com/ALJR86"
LD_RE = re.compile(r"\n?\s*<!-- seo:ld -->.*?<!-- /seo:ld -->", re.S)
NAV_RE = re.compile(r"\n?\s*<!-- seo:nav -->.*?<!-- /seo:nav -->", re.S)
ABOUT_RE = re.compile(r"\n?\s*<!-- seo:about -->.*?<!-- /seo:about -->", re.S)
RELATED_CSS_RE = re.compile(r"/related\.css\?v=[^\"\s]+")
CSS_VER = "202610182245"
EDITORIAL = runpy.run_path(os.path.join(ROOT, 'scripts', 'editorial-dates.py'))
ARTICLE_DATES = {}


def meta(src, attr, name):
    m = re.search(r'<meta\s+%s="%s"\s+content="([^"]*)"' % (attr, re.escape(name)), src)
    if not m:
        m = re.search(r'<meta\s+%s="%s"\s*\n?\s*content="([^"]*)"' % (attr, re.escape(name)), src)
    return html.unescape(m.group(1)) if m else None


def git_date(path):
    out = subprocess.run(
        ["git", "log", "-1", "--format=%cI", "--perl-regexp",
         "--author=^(?!github-actions)", "--invert-grep", "--grep=^SEO", "--", path],
        cwd=ROOT, capture_output=True, text=True,
    ).stdout.strip()
    return out or None


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def org():
    return {
        "@type": "Organization",
        "name": "Supercharged Daily",
        "url": SITE + "/about.html",
        "sameAs": [X_URL],
        "logo": {"@type": "ImageObject", "url": SITE + "/favicon-512.png", "width": 512, "height": 512},
    }


def ensure_head(src):
    if "</head>" in src:
        return src
    return re.sub(r"(\n[ \t]*)<body\b", r"\n  </head>\1<body", src, count=1)


def head_block(src, block):
    # Keep the shared contents stylesheet immediately before the member block;
    # both generators rely on that stable order for idempotent builds.
    for marker in ('<!--sd:wayfinding-style-->', '<!--sd:members-->'):
        pos = src.find(marker)
        if pos >= 0:
            line = src.rfind('\n', 0, pos) + 1
            if not src[line:pos].strip():
                pos = line
            return src[:pos] + block.strip('\n') + '\n' + src[pos:]
    return src.replace('</head>', block + '\n  </head>', 1)


AUTHOR = "Alex R"  # byline name on every Dispatch article (not the X handle)


def ld_block(news, crumbs):
    return (
        "\n    <!-- seo:ld -->\n"
        f'    <meta name="author" content="{AUTHOR}" />\n'
        '    <script type="application/ld+json">' + dumps(news) + "</script>\n"
        '    <script type="application/ld+json">' + dumps(crumbs) + "</script>\n"
        "    <!-- /seo:ld -->"
    )


def crumb_html(short_title):
    label = html.escape(short_title)
    return (
        "\n          <!-- seo:nav -->\n"
        '          <nav class="sd-crumbs" aria-label="Breadcrumb">\n'
        "            <ol>\n"
        '              <li><a href="/">Home</a></li>\n'
        '              <li><a href="/dispatch.html">Dispatch</a></li>\n'
        f'              <li aria-current="page">{label}</li>\n'
        "            </ol>\n"
        "          </nav>\n"
        "          <!-- /seo:nav -->"
    )


def about_html():
    return (
        "\n          <!-- seo:about -->\n"
        '          <aside class="sd-about" aria-label="About Supercharged Daily">\n'
        '            <p class="sd-about-kicker">About</p>\n'
        "            <p>Supercharged Daily is an independent Tesla, SpaceX and Grok news site from "
        f'<a href="{X_URL}">{AUTHOR}</a>. '
        "Not affiliated with Tesla, SpaceX or xAI.</p>\n"
        '            <p><a href="/about.html">About this site</a></p>\n'
        "          </aside>\n"
        "          <!-- /seo:about -->"
    )


def inject_nav(src, short_title):
    src = NAV_RE.sub("", src)
    m = re.search(r'<article\s+class="article"[^>]*>', src)
    if not m:
        return src
    return src[: m.end()] + crumb_html(short_title) + src[m.end() :]


def inject_about(src):
    src = ABOUT_RE.sub("", src)
    block = about_html()
    m = re.search(r"(\n[ \t]*)</article>", src)
    if not m:
        return src
    return src[: m.start()] + block + m.group(0) + src[m.end() :]


def articles():
    data = json.load(open(os.path.join(ROOT, "data", "articles.json")))
    publisher = org()
    publisher["url"] = SITE + "/"
    author = {"@type": "Person", "name": AUTHOR, "url": SITE + "/about.html", "sameAs": [X_URL]}
    for a in data["articles"]:
        path = os.path.join(ROOT, a["url"].lstrip("/"))
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        if "noindex" in src[:4000]:
            continue
        src = ensure_head(src)
        src = RELATED_CSS_RE.sub("/related.css?v=" + CSS_VER, src)
        title = meta(src, "property", "og:title") or a["title"]
        title = re.sub(r"\s+—\s+Supercharged Daily$", "", title)
        short = a.get("title") or title
        desc = meta(src, "name", "description") or a.get("summary", "")
        img = meta(src, "property", "og:image") or (SITE + a["image"] if a.get("image") else None)
        revised = EDITORIAL['revision_date'](ROOT, os.path.relpath(path, ROOT), a['date'], src)
        ARTICLE_DATES[a['url'].lstrip('/')] = revised
        news = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "mainEntityOfPage": {"@type": "WebPage", "@id": SITE + a["url"]},
            "headline": title[:110],
            "description": desc,
            "datePublished": a["date"],
            **({'dateModified': revised} if revised else {}),
            "author": author,
            "publisher": publisher,
            "articleSection": a.get("tag") or a.get("topic", ""),
        }
        if img:
            news["image"] = [img]
        crumbs = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Dispatch", "item": SITE + "/dispatch.html"},
                {"@type": "ListItem", "position": 3, "name": short, "item": SITE + a["url"]},
            ],
        }
        block = ld_block(news, crumbs)
        new = LD_RE.sub("", src)
        new = new.replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="article" />')
        if "article:published_time" not in new:
            new = new.replace(
                '<meta property="og:type" content="article" />',
                '<meta property="og:type" content="article" />\n    <meta property="article:published_time" content="%s" />' % a["date"],
                1,
            )
        new = head_block(new, block)
        new = re.sub(r"(<!-- /seo:ld -->)\n\s*\n?\s*</head>", r"\1\n  </head>", new)
        new = inject_nav(new, short)
        new = inject_about(new)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


def about_page():
    path = os.path.join(ROOT, "about.html")
    src = open(path, encoding="utf-8").read()
    if "noindex" in src[:4000]:
        return
    ld = org()
    ld["@context"] = "https://schema.org"
    ld["url"] = SITE + "/"
    ld["email"] = "superchargeddaily@gmail.com"
    ld["description"] = (
        "Independent Tesla, SpaceX and Grok news site from Alex R. "
        "Not affiliated with Tesla, SpaceX or xAI."
    )
    block = (
        "\n    <!-- seo:ld -->\n"
        '    <script type="application/ld+json">' + dumps(ld) + "</script>\n"
        "    <!-- /seo:ld -->"
    )
    new = LD_RE.sub("", src)
    if "</head>" not in new:
        return
    new = head_block(new, block)
    new = re.sub(r"(<!-- /seo:ld -->)\n\s*\n?\s*</head>", r"\1\n  </head>", new)
    if new != src:
        open(path, "w", encoding="utf-8").write(new)


# Non-article pages that were missing JSON-LD. Types:
#   Dataset         sourced trackers / evidence tables
#   WebApplication  games, 3D explorers, search, personal follow tool
#   CollectionPage  hubs (none of this set)
#   WebPage         fallback
PAGE_TYPES = {
    "autonomy.html": "Dataset",
    "catch.html": "WebApplication",
    "cybertruck-explorer.html": "WebApplication",
    "daily.html": "WebApplication",
    "model3-explorer.html": "WebApplication",
    "optimus.html": "Dataset",
    "production.html": "Dataset",
    "robotaxi.html": "WebApplication",
    "search.html": "WebApplication",
    "staging.html": "WebApplication",
}


def canonical(src, rel):
    m = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', src)
    if not m:
        m = re.search(r'<link\s+href="([^"]+)"\s+rel="canonical"', src)
    return m.group(1) if m else SITE + "/" + rel


def page_name(src):
    name = meta(src, "property", "og:title")
    if name:
        return name
    m = re.search(r"<title>(.*?)</title>", src, re.S)
    if not m:
        return None
    return html.unescape(re.sub(r"\s+", " ", m.group(1))).strip()


def pages():
    """Inject one seo:ld JSON-LD block on listed pages. Idempotent."""
    publisher = org()
    publisher["url"] = SITE + "/"
    for rel, typ in PAGE_TYPES.items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        src = ensure_head(src)
        name = page_name(src)
        desc = meta(src, "name", "description") or meta(src, "property", "og:description") or ""
        if not name:
            continue
        ld = {
            "@context": "https://schema.org",
            "@type": typ,
            "name": name,
            "url": canonical(src, rel),
            "description": desc,
            "publisher": publisher,
        }
        found = re.search(r"<!-- seo:ld -->.*?<!-- /seo:ld -->", src, re.S)
        if found:
            sm = re.search(r'<script type="application/ld\+json">(.*?)</script>', found.group(0), re.S)
            if sm:
                try:
                    if json.loads(sm.group(1)) == ld:
                        continue
                except json.JSONDecodeError:
                    pass
        block = (
            "\n    <!-- seo:ld -->\n"
            '    <script type="application/ld+json">' + dumps(ld) + "</script>\n"
            "    <!-- /seo:ld -->"
        )
        new = LD_RE.sub("", src)
        if "</head>" not in new:
            continue
        new = head_block(new, block)
        new = re.sub(r"(<!-- /seo:ld -->)\n\s*\n?\s*</head>", r"\1\n  </head>", new)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


def sitemap():
    pages = sorted(
        glob.glob(os.path.join(ROOT, "*.html"))
        + glob.glob(os.path.join(ROOT, "dispatch", "*.html"))
        + glob.glob(os.path.join(ROOT, "guides", "*.html"))
        + glob.glob(os.path.join(ROOT, "reviews", "*.html"))
    )
    rows = []
    for p in pages:
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if rel in ("404.html",) or rel.startswith("preview/"):
            continue
        head = open(p, encoding="utf-8").read()[:6000]
        if re.search(r'name="robots"[^>]*noindex', head):
            continue
        loc = SITE + "/" if rel == "index.html" else SITE + "/" + rel
        if rel.startswith('dispatch/'):
            # Unknown editorial history must not fall back to a template commit.
            revised = ARTICLE_DATES.get(rel)
            parsed = EDITORIAL['timestamp'](revised)
            d = parsed.astimezone(datetime.timezone.utc).date().isoformat() if parsed else ''
        else:
            d = (git_date(rel) or "")[:10]
        rows.append("  <url><loc>%s</loc>%s</url>" % (loc, "<lastmod>%s</lastmod>" % d if d else ""))
    rows.sort(key=lambda r: (0 if r.startswith("  <url><loc>%s/</loc>" % SITE) else 1, r))
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(rows)
        + "\n</urlset>\n"
    )
    open(os.path.join(ROOT, "sitemap.xml"), "w").write(xml)


if __name__ == "__main__":
    articles()
    about_page()
    pages()
    sitemap()
    import runpy
    runpy.run_path(os.path.join(ROOT, "scripts", "inject-members.py"))["run"]()
