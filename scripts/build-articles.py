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

main()
