#!/usr/bin/env python3
"""Sync data/articles.json (the article list for /news.html and the homepage)
from the Dispatch cards in /dispatch.html.

Format of data/articles.json:
{
  "updated": "ISO-8601 UTC",
  "articles": [            # newest first
    {"url": "/dispatch/slug.html", "title": "...", "date": "2026-10-14T17:18:43Z",
     "topic": "tesla|spacex|xai|x", "tag": "Short label", "image": "/assets/...jpg",
     "summary": "One line", "pinned": false}
  ]
}

Adding an article: publish /dispatch/<slug>.html and add its story-card at the top
of /dispatch.html (as today). This script then adds it here automatically
(run it after adding a card:
`python3 scripts/build-articles.py`). You may also append an entry to the JSON
directly; existing entries (and their dates/topics) are never overwritten.
Set "pinned": true to hold a story as the featured lead.
"""
import json, re, subprocess, datetime, html, os, sys, glob, runpy
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "articles.json")

class Cards(HTMLParser):
    def __init__(s):
        super().__init__(); s.cards = []; s.cur = None; s.depth = 0; s.field = None
    def handle_starttag(s, tag, a):
        a = dict(a); cls = a.get("class", "") or ""
        if tag == "a" and "story-card" in cls and (a.get("href") or "").startswith("/dispatch/"):
            s.cur = {"url": a["href"], "title": "", "tag": "", "tagcls": "", "summary": "", "image": ""}; s.depth = 0; return
        if not s.cur: return
        if tag == "a": s.depth += 1
        if tag == "video" and a.get("poster") and not s.cur["image"]: s.cur["image"] = a["poster"]
        if tag == "img" and a.get("src") and not s.cur["image"]: s.cur["image"] = a["src"]
        if tag == "span" and re.search(r"\btag\b", cls): s.field = "tag"; s.cur["tagcls"] = cls
        if tag in ("h2", "h3"): s.field = "title"
        if tag == "p": s.field = "summary"
    def handle_endtag(s, tag):
        if not s.cur: return
        if tag in ("span", "h2", "h3", "p"): s.field = None
        if tag == "a":
            if s.depth == 0: s.cards.append(s.cur); s.cur = None
            else: s.depth -= 1
    def handle_data(s, d):
        if s.cur and s.field: s.cur[s.field] += d

def topic_of(c):
    t = (c["tag"] + " " + c["title"]).lower()
    if re.search(r"\bx (premium|subscription|money)|^x\b|\bx\.com\b", t) or c["url"].startswith("/dispatch/x-"): return "x"
    if re.search(r"\bgrok\b|\bxai\b|spacex ai", t): return "xai"
    if "tesla" in c["tagcls"]: return "tesla"
    if "spacex" in c["tagcls"]: return "spacex"
    return "tesla"

def first_date(path):
    try:
        out = subprocess.run(["git", "log", "--diff-filter=A", "--format=%aI", "--", path],
                             cwd=ROOT, capture_output=True, text=True).stdout.split()
        if out:
            return datetime.datetime.fromisoformat(out[-1]).astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception: pass
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def main():
    p = Cards(); p.feed(open(os.path.join(ROOT, "dispatch.html"), encoding="utf-8").read())
    old = {}
    if os.path.exists(OUT):
        for a in json.load(open(OUT, encoding="utf-8")).get("articles", []): old[a["url"]] = a
    seen = set()
    for c in p.cards:
        if c["url"] in seen or c["url"] in old: seen.add(c["url"]); continue
        seen.add(c["url"])
        if not os.path.exists(os.path.join(ROOT, c["url"].lstrip("/"))): continue
        old[c["url"]] = {"url": c["url"], "title": " ".join(c["title"].split()), "date": first_date(c["url"].lstrip("/")),
                         "topic": topic_of(c), "tag": " ".join(c["tag"].split()) or "Dispatch",
                         "image": c["image"], "summary": " ".join(c["summary"].split()), "pinned": False}
    for a in old.values(): a["author"] = AUTHOR
    arts = sorted(old.values(), key=lambda a: a["date"], reverse=True)
    prev = json.load(open(OUT, encoding="utf-8")).get("articles") if os.path.exists(OUT) else None
    if prev == arts: print("articles.json unchanged"); return
    json.dump({"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "articles": arts},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"wrote {len(arts)} articles")

def heading_levels():
    """Dispatch index cards sat at H3 under an H1 (skip). Wallpaper tiles did the same."""
    path = os.path.join(ROOT, "dispatch.html")
    s = open(path, encoding="utf-8").read()
    t = re.sub(
        r'(<div class="story-copy">[\s\S]*?)<h3>([\s\S]*?)</h3>',
        r"\1<h2>\2</h2>",
        s,
    )
    if t != s:
        open(path, "w", encoding="utf-8").write(t)
        print("dispatch heading level: h3 → h2")
    wp = os.path.join(ROOT, "wallpapers.html")
    if os.path.exists(wp):
        s = open(wp, encoding="utf-8").read()
        t = re.sub(r"(<figcaption>[\s\S]*?)<h3>([\s\S]*?)</h3>", r"\1<h2>\2</h2>", s)
        if t != s:
            open(wp, "w", encoding="utf-8").write(t)
            print("wallpapers heading level: h3 → h2")


def card_dates():
    """Static date on every Dispatch index card (works without JS; dispatch-browse.js adds read time)."""
    import re as _re, zoneinfo
    path = os.path.join(ROOT, "dispatch.html"); s = open(path, encoding="utf-8").read()
    dates = {a["url"]: a["date"] for a in json.load(open(OUT, encoding="utf-8")).get("articles", [])}
    tz = zoneinfo.ZoneInfo("Europe/Dublin")
    def card(m):
        block, href = m.group(0), m.group(1)
        iso = dates.get(href)
        block = _re.sub(r'\n?[ \t]*<p class="sd-disp-meta">.*?</p>', "", block, flags=_re.S)
        if not iso: return block
        d = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(tz)
        label = f"{d.day} {d.strftime('%b %Y')}"
        return _re.sub(r'(\n([ \t]*)<p>[\s\S]*?</p>)(\s*</div>\s*</a>)$',
                       lambda k: f'{k.group(1)}\n{k.group(2)}<p class="sd-disp-meta"><time datetime="{iso}">{label}</time></p>{k.group(3)}',
                       block, count=1)
    t = _re.sub(r'<a class="story-card" href="(/dispatch/[^"]+)">[\s\S]*?</a>', card, s)
    if t != s: open(path, "w", encoding="utf-8").write(t); print("dispatch card dates updated")

AUTHOR = "Alex R"  # article byline / sign-off name (not the X handle)

DESK_TOPIC = {"Launch footage": "SpaceX"}  # byline labels show the plain topic, never "<topic> desk"

def desk_labels(s):
    """Byline label rule: "<span>Tesla desk · News</span>" becomes "<span>Tesla · News</span>"."""
    import re
    fix = lambda m: m.group(1) + DESK_TOPIC.get(m.group(2), m.group(2))
    s = re.compile(r'(<span>)([A-Z][A-Za-z ]*?) desk(?=( · [^<]*)?</span>)').sub(fix, s)
    return re.compile(r'(\n\s*<span>)([A-Z][A-Za-z ]*?) desk(?=</span>)').sub(fix, s)

def bylines():
    """Byline rule: article bylines and sign-offs name the author as AUTHOR, never the X handle.
    Only the <p class="meta"> "From ..." span and <p class="signoff"> text are touched; links to
    x.com/ALJR86, embedded posts, citations and Follow-on-X links are left alone."""
    import glob, re
    sign = re.compile(r'(<p class="signoff">— (?:<a href="https://x\.com/A[Ll]JR86">)?)@A[Ll]JR86(</a>)?(</p>)')
    meta = re.compile(r'(<p class="meta">\s*<span>)From @A[Ll]JR86(</span>)')
    named = re.compile(r'(<p class="meta">\s*<span>)From Alex R(</span>)')
    linked = f'\\1From <a href="/author.html">{AUTHOR}</a>\\2'
    for path in glob.glob(os.path.join(ROOT, "dispatch", "*.html")) + glob.glob(os.path.join(ROOT, "guides", "*.html")):
        s = open(path, encoding="utf-8").read()
        t = meta.sub(linked, sign.sub(lambda m: m.group(1) + AUTHOR + (m.group(2) or "") + m.group(3), s))
        t = named.sub(linked, t)
        t = desk_labels(t)
        if t != s: open(path, "w", encoding="utf-8").write(t); print("byline:", os.path.relpath(path, ROOT))

def sleek_signup():
    """Newsletter rule: strip any old red inline .sd-nl / .nl-end box a new article was copied
    with, and make sure grow.js is present. The end-of-article / tracker signup HTML is injected
    later by scripts/inject_newsletter.py (<!--nl:start-->). grow.js then skips its footer band
    and scroll popup when that inline block is already on the page."""
    import glob, re
    box = re.compile(r'\n[ \t]*<section class="newsletter sd-nl".*?</section>', re.S)
    for path in glob.glob(os.path.join(ROOT, "dispatch", "*.html")) + glob.glob(os.path.join(ROOT, "guides", "*.html")):
        s = open(path, encoding="utf-8").read(); t = box.sub("", s)
        # grow.js ships inside the core bundle (<!--sd:bundles-->); only add the standalone tag to
        # pages that have neither, or it runs twice and inject-js-bundles.py strips it again.
        if "/grow.js" not in t and "sd:bundles" not in t and "/assets/js/core.bundle." not in t and "<main" in t and "</body>" in t:
            t = t.replace("</body>", '    <script src="/grow.js?v=202610210800" data-band data-pop defer></script>\n  </body>', 1)
        if t != s: open(path, "w", encoding="utf-8").write(t); print("sleek signup:", os.path.relpath(path, ROOT))

# ---- Related stories: 3 internal links + "More on <topic>" at the bottom of every Dispatch article ----
SUBJECTS = [  # (keyword regex, label, link)
    (r"starlink", "Starlink", "/starlink.html"),
    (r"starship|super heavy|raptor|ship \d|booster|b10\d\d|flight 1\d", "Starship", "/starship.html"),
    (r"cybercab|robotaxi", "Cybercab", "/cybercab.html"),
    (r"\bfsd\b|full self|assisted driving|autopilot", "FSD", "/fsd-europe.html"),
    (r"software|firmware|update \d|automations|headlight", "Tesla software", "/updates.html"),
    (r"roadster", "Roadster", "/roadster.html"),
    (r"grok|xai", "Grok", "/grok.html"),
    (r"dragon|falcon|crs-?\d|crew|space station|\biss\b|solar (arrays|wings)", "SpaceX", "/spacex.html"),
    (r"netherlands|dutch|\brdw\b", "FSD in the Netherlands", "/fsd-europe/netherlands.html"),
    (r"\bbelgium\b|belgian", "FSD in Belgium", "/fsd-europe/belgium.html"),
    (r"\bcroatia\b", "FSD in Croatia", "/fsd-europe/croatia.html"),
    (r"czechia|czech", "FSD in Czechia", "/fsd-europe/czechia.html"),
    (r"\bdenmark\b|danish", "FSD in Denmark", "/fsd-europe/denmark.html"),
    (r"\bestonia\b", "FSD in Estonia", "/fsd-europe/estonia.html"),
    (r"\blithuania\b", "FSD in Lithuania", "/fsd-europe/lithuania.html"),
    (r"\bslovakia\b", "FSD in Slovakia", "/fsd-europe/slovakia.html"),
    (r"\bslovenia\b", "FSD in Slovenia", "/fsd-europe/slovenia.html"),
    (r"\baustin\b", "Austin Cybercab", "/cybercab-cities/austin.html"),
    (r"bay area|san francisco|\bsf\b", "Bay Area Cybercab", "/cybercab-cities/bay-area.html"),
    (r"\bdallas\b", "Dallas Cybercab", "/cybercab-cities/dallas.html"),
    (r"\bhouston\b", "Houston Cybercab", "/cybercab-cities/houston.html"),
    (r"\bmiami\b", "Miami Cybercab", "/cybercab-cities/miami.html"),
    (r"\borlando\b", "Orlando Cybercab", "/cybercab-cities/orlando.html"),
    (r"\btampa\b", "Tampa Cybercab", "/cybercab-cities/tampa.html"),
]
TOPIC_PAGE = {"tesla": ("Tesla", "/tesla.html"), "spacex": ("SpaceX", "/spacex.html"), "xai": ("Grok", "/grok.html"), "x": ("X", "/news.html")}
def subjects(a):
    t = (a.get("title", "") + " " + a.get("tag", "") + " " + a["url"].replace("-", " ")).lower()
    return [i for i, (rx, _, _) in enumerate(SUBJECTS) if re.search(rx, t)]
def related_stories():
    arts = json.load(open(OUT, encoding="utf-8")).get("articles", [])
    by = {a["url"]: a for a in arts}
    rx = re.compile(r'\n?[ \t]*<!--related:start-->.*?<!--related:end-->', re.S)
    for path in glob.glob(os.path.join(ROOT, "dispatch", "*.html")):
        url = "/dispatch/" + os.path.basename(path)
        s = open(path, encoding="utf-8").read()
        if "</main>" not in s: continue
        me = by.get(url) or {"url": url, "title": os.path.basename(path), "topic": "", "tag": ""}
        ms = set(subjects(me))
        def score(o):
            os_ = set(subjects(o))
            overlap = len(ms & os_)
            topic = 2 if o.get("topic") == me.get("topic") else 0
            # Topic overlap beats recency; date is only a tie-break so thin pages
            # stop clustering on whichever story happened to publish last.
            return (overlap * 3 + topic, o.get("date", ""))
        scored = [(score(o), o) for o in arts if o["url"] != url and os.path.exists(os.path.join(ROOT, o["url"].lstrip("/")))]
        scored.sort(key=lambda x: x[0], reverse=True)
        cands = [o for _, o in scored[:3]]
        if me.get("topic") in TOPIC_PAGE: lab, link = TOPIC_PAGE[me["topic"]]
        else: lab, link = "Dispatch", "/dispatch.html"
        if ms: _, lab, link = SUBJECTS[min(ms)]
        cards = "".join(
            f'<a class="rel-card" href="{html.escape(o["url"])}">'
            + (f'<img src="{html.escape(o["image"])}" alt="" loading="lazy" width="320" height="180" />' if o.get("image") else "")
            + f'<span class="rel-tag">{html.escape(o.get("tag") or "Dispatch")}</span><span class="rel-h">{html.escape(o["title"], quote=False)}</span></a>' for o in cands)
        places = [SUBJECTS[i] for i in sorted(ms) if "/fsd-europe/" in SUBJECTS[i][2] or "/cybercab-cities/" in SUBJECTS[i][2]]
        place_html = ""
        if places:
            place_html = '<p class="rel-places">' + " · ".join(
                f'<a href="{html.escape(p[2])}">{html.escape(p[1])}</a>' for p in places
            ) + "</p>"
        block = (f'\n        <!--related:start--><section class="related-stories" aria-labelledby="rel-h"><h2 id="rel-h">Related stories</h2>'
                 f'<div class="rel-grid">{cards}</div><p class="rel-more"><a href="{link}">More on {html.escape(lab)} →</a></p>{place_html}</section><!--related:end-->')
        t = rx.sub("", s)
        t = t.replace("</main>", block.lstrip("\n") + "\n      </main>", 1) if False else re.sub(r"(\s*)</main>", lambda m: block + m.group(1) + "</main>", t, count=1)
        if 'href="/related.css' not in t:
            t = t.replace("</head>", '    <link rel="stylesheet" href="/related.css?v=202610152048" />\n  </head>', 1)
        if t != s: open(path, "w", encoding="utf-8").write(t); print("related:", os.path.relpath(path, ROOT))

DISCLOSURE_RE = re.compile(r"\n?\s*<!-- seo:disclosure -->.*?<!-- /seo:disclosure -->", re.S)
FINANCE_RX = re.compile(
    r"q[1-4]\b|10-?q|10-?k|proxy|earnings|merger|markets|\btsla\b|profit|revenue|"
    r"shareholder|sec filing|financial|cash flow|10q",
    re.I,
)
DISCLOSURE = (
    '\n          <!-- seo:disclosure -->\n'
    '          <p class="sd-disclosure">The editor holds Tesla and SpaceX shares. '
    "Supercharged Daily is independent and not affiliated with either company. "
    "Nothing here is financial advice.</p>\n"
    "          <!-- /seo:disclosure -->"
)


def needs_disclosure(path, html, article=None):
    rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
    if rel in ("tsla.html",):
        return True
    hay = " ".join(
        [
            rel,
            (article or {}).get("tag") or "",
            (article or {}).get("title") or "",
            (article or {}).get("topic") or "",
        ]
    )
    if html:
        m = re.search(r"<title>([\s\S]*?)</title>", html)
        if m:
            hay += " " + m.group(1)
    return bool(FINANCE_RX.search(hay))


def disclosures():
    """Share-ownership note on Tesla/SpaceX finance stories and the Markets page."""
    arts = {}
    try:
        arts = {a["url"]: a for a in json.load(open(OUT, encoding="utf-8")).get("articles", [])}
    except (OSError, ValueError):
        pass
    n = 0
    targets = glob.glob(os.path.join(ROOT, "dispatch", "*.html")) + [os.path.join(ROOT, "tsla.html")]
    for path in targets:
        if not os.path.exists(path):
            continue
        s = open(path, encoding="utf-8").read()
        rel_url = "/" + os.path.relpath(path, ROOT).replace(os.sep, "/")
        if not needs_disclosure(path, s, arts.get(rel_url)):
            continue
        t = DISCLOSURE_RE.sub("", s)
        m = re.search(r'<p class="meta">[\s\S]*?</p>', t)
        if m:
            t = t[: m.end()] + DISCLOSURE + t[m.end() :]
        elif rel_url == "/tsla.html":
            t = re.sub(r"(</h1>)", lambda m: m.group(1) + DISCLOSURE, t, count=1)
        else:
            continue
        if t != s:
            open(path, "w", encoding="utf-8").write(t)
            n += 1
            print("disclosure:", os.path.relpath(path, ROOT))
    print("disclosures:", n)


if __name__ == "__main__":
    bylines()
    disclosures()
    sleek_signup()
    try:
        runpy.run_path(os.path.join(ROOT, "scripts", "sync-footer.py"))["run"]()
    except Exception as e:
        print("footer sync skip:", e)
    try:
        import importlib.util as _u
        _sp = _u.spec_from_file_location("footer_contact", os.path.join(ROOT, "scripts", "footer_contact.py")); _m = _u.module_from_spec(_sp); _sp.loader.exec_module(_m); _m.run()
    except Exception as e:
        print("footer contact skip:", e)
    main()
    related_stories()
    heading_levels()
    card_dates()
    try:
        runpy.run_path(os.path.join(ROOT, "scripts", "inject_newsletter.py"))["run"]()
    except Exception as e:
        print("newsletter inject skip:", e)

    # Static navigation for the homepage and current/future long articles.
    runpy.run_path(os.path.join(ROOT, "scripts", "build-wayfinding.py"))["run"]()
