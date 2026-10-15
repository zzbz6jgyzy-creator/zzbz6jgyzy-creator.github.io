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
import json, re, subprocess, datetime, html, os, sys
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
        if tag == "h3": s.field = "title"
        if tag == "p": s.field = "summary"
    def handle_endtag(s, tag):
        if not s.cur: return
        if tag in ("span", "h3", "p"): s.field = None
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
    arts = sorted(old.values(), key=lambda a: a["date"], reverse=True)
    prev = json.load(open(OUT, encoding="utf-8")).get("articles") if os.path.exists(OUT) else None
    if prev == arts: print("articles.json unchanged"); return
    json.dump({"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "articles": arts},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"wrote {len(arts)} articles")

def sleek_signup():
    """Newsletter rule: articles use only the sleek grow.js band (data-band), never the old red
    inline .sd-nl / .nl-end box. Strip any red box a new article was copied with, and make sure
    grow.js is loaded with data-band data-pop."""
    import glob, re
    box = re.compile(r'\n[ \t]*<section class="newsletter sd-nl".*?</section>', re.S)
    for path in glob.glob(os.path.join(ROOT, "dispatch", "*.html")) + glob.glob(os.path.join(ROOT, "guides", "*.html")):
        s = open(path, encoding="utf-8").read(); t = box.sub("", s)
        if "/grow.js" not in t and "<main" in t and "</body>" in t:
            t = t.replace("</body>", '    <script src="/grow.js?v=202610142125" data-band data-pop defer></script>\n  </body>', 1)
        if t != s: open(path, "w", encoding="utf-8").write(t); print("sleek signup:", os.path.relpath(path, ROOT))

# ---- Related stories: 3 internal links + "More on <topic>" at the bottom of every Dispatch article ----
SUBJECTS = [  # (keyword regex, label, link)
    (r"starlink", "Starlink", "/starlink.html"),
    (r"starship|super heavy|raptor|ship \d|booster|b10\d\d|flight 1\d", "Starship", "/starship.html"),
    (r"cybercab|robotaxi", "Cybercab", "/cybercab.html"),
    (r"\bfsd\b|full self|assisted driving|autopilot", "FSD", "/fsd-europe.html"),
    (r"software|firmware|update \d|automations|headlight", "Tesla software", "/updates.html"),
    (r"roadster", "Roadster", "/tesla.html"),
    (r"grok|xai", "Grok", "/grok.html"),
    (r"dragon|falcon|crs-?\d|crew|space station|\biss\b|solar (arrays|wings)", "SpaceX", "/spacex.html"),
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
            os_ = set(subjects(o)); return (len(ms & os_) * 3 + (2 if o.get("topic") == me.get("topic") else 0), o.get("date", ""))
        cands = sorted((o for o in arts if o["url"] != url and os.path.exists(os.path.join(ROOT, o["url"].lstrip("/")))), key=score, reverse=True)[:3]
        if me.get("topic") in TOPIC_PAGE: lab, link = TOPIC_PAGE[me["topic"]]
        else: lab, link = "Dispatch", "/dispatch.html"
        if ms: _, lab, link = SUBJECTS[min(ms)]
        cards = "".join(
            f'<a class="rel-card" href="{html.escape(o["url"])}">'
            + (f'<img src="{html.escape(o["image"])}" alt="" loading="lazy" width="320" height="180" />' if o.get("image") else "")
            + f'<span class="rel-tag">{html.escape(o.get("tag") or "Dispatch")}</span><span class="rel-h">{html.escape(o["title"], quote=False)}</span></a>' for o in cands)
        block = (f'\n        <!--related:start--><section class="related-stories" aria-labelledby="rel-h"><h2 id="rel-h">Related stories</h2>'
                 f'<div class="rel-grid">{cards}</div><p class="rel-more"><a href="{link}">More on {html.escape(lab)} →</a></p></section><!--related:end-->')
        t = rx.sub("", s)
        t = t.replace("</main>", block.lstrip("\n") + "\n      </main>", 1) if False else re.sub(r"(\s*)</main>", lambda m: block + m.group(1) + "</main>", t, count=1)
        if 'href="/related.css' not in t:
            t = t.replace("</head>", '    <link rel="stylesheet" href="/related.css?v=202610152048" />\n  </head>', 1)
        if t != s: open(path, "w", encoding="utf-8").write(t); print("related:", os.path.relpath(path, ROOT))

import glob
sleek_signup()
main()
related_stories()
