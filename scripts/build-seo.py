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
import json, os, re, subprocess, html, glob, runpy, datetime, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import seo_lib  # noqa: E402

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
AUTHOR_URL = SITE + "/author.html"


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
        "            <p>Supercharged Daily is an independent fan site covering Tesla, SpaceX and xAI (including Grok), from "
        f'<a href="/author.html">{AUTHOR}</a>. '
        "Not affiliated with Tesla, SpaceX or xAI.</p>\n"
        '            <p><a href="/about.html">About this site</a> · <a href="/editorial.html">Editorial policy</a></p>\n'
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


UPDATED_RE = re.compile(r"\n?\s*<!-- seo:updated -->.*?<!-- /seo:updated -->", re.S)


def inject_updated(src, published, revised):
    """Visible Updated line when the editorial revision is a later calendar day than published."""
    src = UPDATED_RE.sub("", src)
    pub = EDITORIAL["timestamp"](published)
    rev = EDITORIAL["timestamp"](revised)
    if not pub or not rev:
        return src
    pub_d = pub.astimezone(datetime.timezone.utc).date()
    rev_d = rev.astimezone(datetime.timezone.utc).date()
    if rev_d <= pub_d:
        return src
    iso = seo_lib.iso_utc(revised)
    label = seo_lib.dublin_label(revised)
    block = (
        '\n          <!-- seo:updated -->\n'
        f'          <p class="sd-updated">Updated <time datetime="{html.escape(iso)}">{html.escape(label)}</time></p>\n'
        "          <!-- /seo:updated -->"
    )
    m = re.search(r'<p class="meta">[\s\S]*?</p>', src)
    if m:
        return src[: m.end()] + block + src[m.end() :]
    m = re.search(r"</h1>", src)
    if m:
        return src[: m.end()] + block + src[m.end() :]
    return src


def articles():
    data = json.load(open(os.path.join(ROOT, "data", "articles.json")))
    publisher = org()
    publisher["url"] = SITE + "/"
    author = {"@type": "Person", "name": AUTHOR, "url": AUTHOR_URL, "sameAs": [X_URL]}
    for a in data["articles"]:
        path = os.path.join(ROOT, a["url"].lstrip("/"))
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        if "noindex" in src[:4000]:
            continue
        original = src
        src = ensure_head(src)
        src = RELATED_CSS_RE.sub("/related.css?v=" + CSS_VER, src)
        title = meta(src, "property", "og:title") or a["title"]
        title = re.sub(r"\s+[—|]\s+Supercharged Daily\s*$", "", title)
        short = a.get("title") or title
        desc = meta(src, "name", "description") or a.get("summary", "")
        # <title>/og stay ~60 chars with a consistent " | Supercharged Daily" suffix.
        # H1 keeps the full headline. JSON-LD headline is clipped at a word boundary.
        page_title = seo_lib.branded(short, 60)
        src = seo_lib.set_title(src, page_title)
        if desc:
            src = seo_lib.set_description(src, seo_lib.clip(desc, 160))
        img = meta(src, "property", "og:image") or (SITE + a["image"] if a.get("image") else None)
        revised = EDITORIAL['revision_date'](ROOT, os.path.relpath(path, ROOT), a['date'], src)
        if revised:
            revised = seo_lib.iso_utc(revised)
        ARTICLE_DATES[a['url'].lstrip('/')] = revised
        news = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "mainEntityOfPage": {"@type": "WebPage", "@id": SITE + a["url"]},
            "headline": seo_lib.clip(title, 110),
            "description": seo_lib.clip(desc, 200),
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
        if revised:
            if "article:modified_time" in new:
                # Lambda, not r"\1%s\2" % date: a date starting with 20 would
                # become group-ref \12 and emit junk lines like P26-10-20T….
                new = re.sub(
                    r'(<meta property="article:modified_time" content=")[^"]*(")',
                    lambda m, v=revised: m.group(1) + v + m.group(2),
                    new,
                    count=1,
                )
            else:
                new = new.replace(
                    '<meta property="article:published_time" content="%s" />' % a["date"],
                    '<meta property="article:published_time" content="%s" />\n    '
                    '<meta property="article:modified_time" content="%s" />' % (a["date"], revised),
                    1,
                )
        new = head_block(new, block)
        new = re.sub(r"(<!-- /seo:ld -->)\n\s*\n?\s*</head>", r"\1\n  </head>", new)
        new = inject_nav(new, short)
        new = inject_about(new)
        new = inject_updated(new, a["date"], revised)
        new = seo_lib.drop_handwritten_newsarticle(new)
        new = seo_lib.ensure_twitter_image(new)
        new = seo_lib.ensure_twitter_creator(new)
        if new != original:
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
        "Independent fan site covering Tesla, SpaceX and xAI (including Grok), from Alex R. "
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
# Optimus owns its WebPage/FAQ/film graph in build-optimus-studio.mjs.
# Production owns its dated Dataset/CSV schema in build-production-studio.mjs.
PAGE_TYPES = {
    "autonomy.html": "Dataset",
    "catch.html": "WebApplication",
    "cybertruck-explorer.html": "WebApplication",
    "daily.html": "WebApplication",
    "model3-explorer.html": "WebApplication",
    "robotaxi.html": "WebApplication",
    "search.html": "WebApplication",
    "staging.html": "WebApplication",
}

# Trackers that were generic WebPage / CollectionPage. Dataset is the honest type:
# they publish sourced measurements with a dateModified tied to the data files.
TRACKER_DATASETS = {
    "starlink.html": {
        "variables": [
            "Satellites in orbit",
            "Generation (v1, v2 mini, v3)",
            "Decayed or deorbited",
        ],
    },
    "fsd-europe.html": {
        "variables": [
            "National permission status",
            "Tesla-listed availability",
            "Customer observation date",
        ],
    },
    "cybercab.html": {
        "variables": [
            "Texas automated-vehicle registry count",
            "City Robotaxi service status",
            "Cybercab share of the fleet",
        ],
    },
    "updates.html": {
        "variables": [
            "Tesla software version",
            "Teslascope sample size",
            "Release notes",
        ],
    },
    "starship.html": {
        "variables": [
            "Flight number",
            "Flight outcome",
            "Next-flight planning window",
        ],
    },
    "see-the-launch.html": {
        "variables": [
            "Pad",
            "Observer bearing",
            "Launch planning window",
        ],
    },
    "calendar.html": {
        "variables": [
            "Event date",
            "Timing precision",
            "Category",
        ],
    },
    "fsd.html": {
        "variables": [
            "Country availability listing",
            "Software observation",
            "Vehicle eligibility caveat",
        ],
    },
}

TRACKER_OG = {
    "updates.html": (
        "/assets/og/updates.jpg",
        "Tesla software update tracker on Supercharged Daily",
    ),
    "see-the-launch.html": (
        "/assets/og/see-the-launch.jpg",
        "Can I see the SpaceX launch? Pad bearing and sky geometry",
    ),
    "calendar.html": (
        "/assets/og/calendar.jpg",
        "SpaceX launch and Tesla calendar on Supercharged Daily",
    ),
    "games.html": (
        "/assets/og/games.jpg",
        "Tesla and SpaceX browser games on Supercharged Daily",
    ),
}

TOPIC_TRACKERS = {
    "starlink.html": ["starlink"],
    "starship.html": ["starship", "super heavy", "raptor"],
    "fsd-europe.html": ["fsd", "assisted driving", "europe"],
    "fsd.html": ["fsd", "full self"],
    "cybercab.html": ["cybercab", "robotaxi"],
    "updates.html": ["software", "firmware", "update"],
    "see-the-launch.html": ["launch", "starship", "falcon"],
    "calendar.html": ["launch", "earnings"],
    "promise-tracker.html": ["promise", "roadster", "optimus", "fsd"],
    "roadster.html": ["roadster"],
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


def _country_name(rel):
    slug = os.path.splitext(os.path.basename(rel))[0]
    return slug.replace("-", " ").replace("_", " ").title()


def apply_titles():
    """Hub titles, FSD-country and Cybercab-city templates from scripts/seo-titles.json."""
    cfg = seo_lib.load_titles()
    pages_cfg = cfg.get("pages") or {}
    for rel, spec in pages_cfg.items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        new = src
        if spec.get("title"):
            new = seo_lib.set_title(new, spec["title"])
        if spec.get("description"):
            new = seo_lib.set_description(new, spec["description"])
        if spec.get("h1"):
            new = seo_lib.replace_first_h1(new, spec["h1"])
        if spec.get("h1_prefix"):
            m = re.search(r"<main\b", new, re.I)
            if m:
                head, tail = new[: m.start()], new[m.start() :]
                tail = re.sub(
                    r"(<h1\b[^>]*>)([\s\S]*?)(</h1>)",
                    lambda k: k.group(1) + spec["h1_prefix"] + k.group(2) if spec["h1_prefix"] not in k.group(2) else k.group(0),
                    tail,
                    count=1,
                    flags=re.I,
                )
                new = head + tail
        if new != src:
            open(path, "w", encoding="utf-8").write(new)

    fsd_t = (cfg.get("templates") or {}).get("fsd-europe") or {}
    for rel, path in seo_lib.html_files():
        if not rel.startswith("fsd-europe/") or rel == "fsd-europe.html":
            continue
        name = _country_name(rel)
        src = open(path, encoding="utf-8").read()
        title = (fsd_t.get("title") or "FSD in {name} | Supercharged Daily").format(name=name)
        desc = (fsd_t.get("description") or "").format(name=name)
        new = seo_lib.set_title(src, title)
        if desc:
            new = seo_lib.set_description(new, desc)
        og = os.path.join(ROOT, "assets", "og", "fsd-%s.jpg" % os.path.splitext(os.path.basename(rel))[0])
        if os.path.exists(og):
            new = seo_lib.set_og_image(
                new,
                SITE + "/assets/og/fsd-%s.jpg" % os.path.splitext(os.path.basename(rel))[0],
                "FSD in %s — Supercharged Daily" % name,
            )
        if new != src:
            open(path, "w", encoding="utf-8").write(new)

    city_t = (cfg.get("templates") or {}).get("cybercab-city") or {}
    for rel, path in seo_lib.html_files():
        if not rel.startswith("cybercab-cities/"):
            continue
        name = _country_name(rel)
        src = open(path, encoding="utf-8").read()
        title = (city_t.get("title") or "{name} Cybercab tracker | Supercharged Daily").format(name=name)
        desc = (city_t.get("description") or "").format(name=name)
        new = seo_lib.set_title(src, title)
        if desc:
            new = seo_lib.set_description(new, desc)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


def tracker_schema():
    """WebPage → Dataset on sourced trackers. dateModified follows the data files, not HTML furniture."""
    for rel, spec in TRACKER_DATASETS.items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        name = page_name(src) or rel
        desc = meta(src, "name", "description") or meta(src, "property", "og:description") or ""
        revised = EDITORIAL["tracker_date"](ROOT, rel) or EDITORIAL["page_revision_date"](ROOT, rel, src)
        if revised:
            revised = seo_lib.iso_utc(revised)
        ld = seo_lib.dataset(
            name=re.sub(r"\s+[—|]\s+Supercharged Daily\s*$", "", name),
            description=desc,
            url=canonical(src, rel),
            date_modified=revised,
            variables=spec["variables"],
        )
        # Drop a leftover handwritten WebPage/CollectionPage so we do not emit two page graphs.
        def keep(m):
            block = m.group(0)
            try:
                data = json.loads(m.group(1))
            except json.JSONDecodeError:
                return block
            types = data.get("@type")
            if types in ("WebPage", "CollectionPage") and "seo:ld" not in src[max(0, m.start() - 80) : m.start()]:
                return ""
            return block

        new = re.sub(
            r'[ \t]*<script type="application/ld\+json">(\s*\{[\s\S]*?\})</script>\s*',
            keep,
            src,
        )
        objects = [ld]
        if rel == "starship.html":
            ev = starship_event()
            if ev:
                objects.append(ev)
        new = seo_lib.inject_json_ld(new, objects)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


def starship_event():
    """Flight 15 Event graph from starship-data.js. NET window, not a SpaceX T-0."""
    path = os.path.join(ROOT, "starship-data.js")
    if not os.path.exists(path):
        return None
    text = open(path, encoding="utf-8").read()
    m = re.search(r"next:\s*\{([\s\S]*?)\n  \},", text)
    if not m:
        return None
    block = m.group(1)
    flight = re.search(r"flight:\s*(\d+)", block)
    start = re.search(r'start:\s*"([^"]+)"', block)
    pad = re.search(r'pad:\s*"([^"]+)"', block)
    headline = re.search(r'headline:\s*"([^"]+)"', block)
    tested = re.search(r'tested:\s*"([^"]+)"', block)
    if not (flight and start):
        return None
    start_iso = start.group(1)
    # Day-precision NET windows should not pretend to have a clock.
    start_day = start_iso[:10]
    desc = tested.group(1) if tested else "Planning window from public FAA slides and SpaceX remarks. Not a SpaceX T-0."
    return {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Starship Flight %s" % flight.group(1),
        "description": desc,
        "startDate": start_day,
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {
            "@type": "Place",
            "name": pad.group(1) if pad else "Starbase",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Boca Chica",
                "addressRegion": "TX",
                "addressCountry": "US",
            },
        },
        "organizer": {"@type": "Organization", "name": "SpaceX", "url": "https://www.spacex.com/launches"},
        "url": SITE + "/starship.html",
        "image": SITE + "/assets/dispatch/starship-ift5-jurvetson.jpg",
        "isAccessibleForFree": True,
    }


def apply_og():
    for rel, (img, alt) in TRACKER_OG.items():
        path = os.path.join(ROOT, rel)
        disk = os.path.join(ROOT, img.lstrip("/"))
        if not os.path.exists(path) or not os.path.exists(disk):
            continue
        src = open(path, encoding="utf-8").read()
        new = seo_lib.set_og_image(src, SITE + img, alt)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


def sitewide():
    """Head hygiene on every public HTML page. Idempotent."""
    for rel, path in seo_lib.html_files():
        src = open(path, encoding="utf-8").read()
        new = seo_lib.hygiene(src)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


TOPIC_RE = re.compile(r"\n?\s*<!-- seo:topic-stories -->.*?<!-- /seo:topic-stories -->", re.S)


def topic_stories():
    """'Latest stories on this topic' on trackers — topic-scored, not most-recent-only."""
    arts = json.load(open(os.path.join(ROOT, "data", "articles.json"), encoding="utf-8")).get("articles") or []
    for rel, keys in TOPIC_TRACKERS.items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        if "</main>" not in src:
            continue
        rx = re.compile("|".join(keys), re.I)

        def score(a):
            hay = " ".join((a.get("title") or "", a.get("tag") or "", a.get("summary") or "", a.get("url") or ""))
            hits = len(rx.findall(hay))
            return (hits, a.get("date") or "")

        cands = [a for a in arts if os.path.exists(os.path.join(ROOT, a["url"].lstrip("/")))]
        cands = sorted(cands, key=score, reverse=True)
        cands = [a for a in cands if score(a)[0] > 0][:4]
        if not cands:
            continue
        items = "".join(
            '<li><a href="%s">%s</a></li>'
            % (html.escape(a["url"]), html.escape(a["title"], quote=False))
            for a in cands
        )
        extra = ""
        if rel == "fsd-europe.html":
            leaves = sorted(glob.glob(os.path.join(ROOT, "fsd-europe", "*.html")))
            extra = "".join(
                '<li><a href="/fsd-europe/%s">FSD in %s</a></li>'
                % (html.escape(os.path.basename(p)), html.escape(_country_name("fsd-europe/" + os.path.basename(p))))
                for p in leaves
            )
            extra = '<p class="sd-topic-kicker">Country pages</p><ul class="sd-topic-list">%s</ul>' % extra
        if rel == "cybercab.html":
            leaves = sorted(glob.glob(os.path.join(ROOT, "cybercab-cities", "*.html")))
            extra = "".join(
                '<li><a href="/cybercab-cities/%s">%s</a></li>'
                % (html.escape(os.path.basename(p)), html.escape(_country_name("cybercab-cities/" + os.path.basename(p))))
                for p in leaves
            )
            extra = '<p class="sd-topic-kicker">City pages</p><ul class="sd-topic-list">%s</ul>' % extra
        block = (
            '\n        <!-- seo:topic-stories -->'
            '<aside class="sd-topic-stories" aria-labelledby="sd-topic-h">'
            '<h2 id="sd-topic-h">Latest stories on this topic</h2>'
            '<ul class="sd-topic-list">%s</ul>%s'
            "</aside>"
            "<!-- /seo:topic-stories -->"
        ) % (items, extra)
        new = TOPIC_RE.sub("", src)
        # Keep topic stories above the newsletter so the two generators do not
        # swap order (and dirty git) on every home-build.
        nl = re.search(r"\n?[ \t]*<!--nl:start-->", new)
        if nl:
            new = new[: nl.start()] + block + new[nl.start() :]
        else:
            new = re.sub(r"(\s*)</main>", lambda m: block + m.group(1) + "</main>", new, count=1)
        if 'href="/related.css' not in new and "</head>" in new:
            new = new.replace("</head>", '    <link rel="stylesheet" href="/related.css?v=' + CSS_VER + '" />\n  </head>', 1)
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


def sitemap():
    pages = sorted(
        glob.glob(os.path.join(ROOT, "*.html"))
        + glob.glob(os.path.join(ROOT, "dispatch", "*.html"))
        + glob.glob(os.path.join(ROOT, "guides", "*.html"))
        + glob.glob(os.path.join(ROOT, "reviews", "*.html"))
        + glob.glob(os.path.join(ROOT, "explainers", "*.html"))
        + glob.glob(os.path.join(ROOT, "fsd-europe", "*.html"))
        + glob.glob(os.path.join(ROOT, "cybercab-cities", "*.html"))
        + glob.glob(os.path.join(ROOT, "orbital-command", "index.html"))
    )
    rows = []
    for p in pages:
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if rel in ("404.html",) or rel.startswith("preview/"):
            continue
        src = open(p, encoding="utf-8").read()
        if re.search(r'name="robots"[^>]*noindex', src[:8000]):
            continue
        loc = SITE + "/" if rel == "index.html" else SITE + "/" + rel
        if rel.startswith("dispatch/"):
            # Unknown editorial history must not fall back to a template commit.
            revised = ARTICLE_DATES.get(rel)
            parsed = EDITORIAL["timestamp"](revised)
            d = parsed.astimezone(datetime.timezone.utc).date().isoformat() if parsed else ""
        else:
            revised = EDITORIAL["page_revision_date"](ROOT, rel, src)
            parsed = EDITORIAL["timestamp"](revised)
            d = parsed.astimezone(datetime.timezone.utc).date().isoformat() if parsed else (revised or "")[:10]
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
    runpy.run_path(os.path.join(ROOT, "scripts", "build-trust-pages.py"))["run"]()
    runpy.run_path(os.path.join(ROOT, "scripts", "generate-og.py"))["run"]()
    articles()
    about_page()
    pages()
    apply_titles()
    tracker_schema()
    apply_og()
    topic_stories()
    sitewide()
    sitemap()
    runpy.run_path(os.path.join(ROOT, "scripts", "build-feed.py"))["run"]()
    # Studios (build-noscript.mjs) rewrite <main> after the earlier newsletter
    # pass, so re-inject here — last writer — or Promise tracker / newsroom lose
    # their Beehiiv block on the next home-build.
    runpy.run_path(os.path.join(ROOT, "scripts", "inject_newsletter.py"))["run"]()
    runpy.run_path(os.path.join(ROOT, "scripts", "inject-members.py"))["run"]()
    # Contents stylesheet must sit immediately before <!--sd:members-->.
    # sitewide hygiene inserts robots/feed nearby and would fail --check otherwise.
    runpy.run_path(os.path.join(ROOT, "scripts", "build-wayfinding.py"))["run"]()
