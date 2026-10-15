#!/usr/bin/env python3
"""SEO build step (runs in home-build.yml after build-articles.py).

1. Every Dispatch article listed in data/articles.json gets NewsArticle JSON-LD
   (between <!-- seo:ld --> markers), og:type=article and article:published_time.
   Facts come only from the page itself + articles.json; nothing is invented.
2. sitemap.xml is rebuilt from every public page (skips noindex pages, 404,
   staging and /preview/), lastmod = last git commit date of each file.
Idempotent: re-running produces no diff.
"""
import json, os, re, subprocess, html, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://superchargeddaily.com"
LD_RE = re.compile(r"\n?\s*<!-- seo:ld -->.*?<!-- /seo:ld -->", re.S)

def meta(src, attr, name):
    m = re.search(r'<meta\s+%s="%s"\s+content="([^"]*)"' % (attr, re.escape(name)), src)
    if not m:
        m = re.search(r'<meta\s+%s="%s"\s*\n?\s*content="([^"]*)"' % (attr, re.escape(name)), src)
    return html.unescape(m.group(1)) if m else None

def git_date(path):
    out = subprocess.run(["git", "log", "-1", "--format=%cI", "--perl-regexp", "--author=^(?!github-actions)", "--invert-grep", "--grep=^SEO", "--", path], cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    return out or None

def articles():
    data = json.load(open(os.path.join(ROOT, "data", "articles.json")))
    for a in data["articles"]:
        path = os.path.join(ROOT, a["url"].lstrip("/"))
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        if "noindex" in src[:4000]:
            continue
        title = meta(src, "property", "og:title") or a["title"]
        title = re.sub(r"\s+—\s+Supercharged Daily$", "", title)
        desc = meta(src, "name", "description") or a.get("summary", "")
        img = meta(src, "property", "og:image") or (SITE + a["image"] if a.get("image") else None)
        ld = {
            "@context": "https://schema.org", "@type": "NewsArticle",
            "mainEntityOfPage": {"@type": "WebPage", "@id": SITE + a["url"]},
            "headline": title[:110], "description": desc,
            "datePublished": a["date"],
            "dateModified": max(a["date"], git_date(path) or a["date"]),
            "author": {"@type": "Organization", "name": "Supercharged Daily", "url": SITE + "/"},
            "publisher": {"@type": "Organization", "name": "Supercharged Daily", "url": SITE + "/",
                          "logo": {"@type": "ImageObject", "url": SITE + "/favicon-512.png", "width": 512, "height": 512}},
            "articleSection": a.get("tag") or a.get("topic", ""),
        }
        if img:
            ld["image"] = [img]
        block = ('\n    <!-- seo:ld -->\n    <script type="application/ld+json">' +
                 json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") +
                 '</script>\n    <!-- /seo:ld -->')
        new = LD_RE.sub("", src)
        new = new.replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="article" />')
        if 'article:published_time' not in new:
            new = new.replace('<meta property="og:type" content="article" />',
                              '<meta property="og:type" content="article" />\n    <meta property="article:published_time" content="%s" />' % a["date"], 1)
        new = new.replace("</head>", block + "\n  </head>", 1)
        new = re.sub(r"(<!-- /seo:ld -->)\n\s*\n?\s*</head>", r"\1\n  </head>", new)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)

def sitemap():
    pages = sorted(glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "dispatch", "*.html"))
                   + glob.glob(os.path.join(ROOT, "guides", "*.html")) + glob.glob(os.path.join(ROOT, "reviews", "*.html")))
    rows = []
    for p in pages:
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if rel in ("404.html", "staging.html") or rel.startswith("preview/"):
            continue
        head = open(p, encoding="utf-8").read()[:6000]
        if re.search(r'name="robots"[^>]*noindex', head):
            continue
        loc = SITE + "/" if rel == "index.html" else SITE + "/" + rel
        d = (git_date(rel) or "")[:10]
        rows.append("  <url><loc>%s</loc>%s</url>" % (loc, "<lastmod>%s</lastmod>" % d if d else ""))
    rows.sort(key=lambda r: (0 if r.startswith("  <url><loc>%s/</loc>" % SITE) else 1, r))
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"
    open(os.path.join(ROOT, "sitemap.xml"), "w").write(xml)

if __name__ == "__main__":
    articles(); sitemap()
