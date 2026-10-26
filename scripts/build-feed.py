#!/usr/bin/env python3
"""Write /feed.xml and /sitemap-news.xml from articles.json (and tracker changes).

Newest first. Idempotent. Called from build-seo.py and from the 30-minute
news snapshot so the feed stays current without rewriting every HTML page.
"""
from __future__ import annotations

import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo_lib import ROOT, SITE, xml_esc, rfc2822, iso_utc  # noqa: E402

ARTICLES = os.path.join(ROOT, "data", "articles.json")
CHANGES = os.path.join(ROOT, "data", "intelligence", "changes.json")
FEED = os.path.join(ROOT, "feed.xml")
NEWS_MAP = os.path.join(ROOT, "sitemap-news.xml")


def load_articles():
    data = json.load(open(ARTICLES, encoding="utf-8"))
    rows = []
    for a in data.get("articles") or []:
        path = os.path.join(ROOT, a["url"].lstrip("/"))
        if not os.path.exists(path):
            continue
        rows.append(a)
    rows.sort(key=lambda a: a.get("date") or "", reverse=True)
    return rows, data.get("updated")


def load_tracker_changes(limit=12):
    """Recent non-dispatch tracker deltas, if the intelligence snapshot has them."""
    if not os.path.exists(CHANGES):
        return []
    try:
        data = json.load(open(CHANGES, encoding="utf-8"))
    except (OSError, ValueError):
        return []
    out = []
    for c in data.get("changes") or []:
        href = c.get("href") or c.get("sourceUrl") or ""
        if not href.startswith("/"):
            continue
        if href.startswith("/dispatch/"):
            continue
        title = (c.get("title") or c.get("summary") or "").strip()
        if not title:
            continue
        out.append(
            {
                "url": href.split("#")[0],
                "title": "Tracker: " + title,
                "date": c.get("at") or data.get("updated"),
                "summary": c.get("summary") or title,
                "tag": c.get("tracker") or "Tracker",
            }
        )
        if len(out) >= limit:
            break
    return out


def rss_item(a):
    loc = SITE + a["url"]
    title = xml_esc(a.get("title") or a["url"])
    summary = xml_esc(a.get("summary") or "")
    date = a.get("date") or ""
    tag = xml_esc(a.get("tag") or "Dispatch")
    img = a.get("image") or ""
    enclosure = ""
    if img:
        src = img if img.startswith("http") else SITE + img
        enclosure = '\n      <enclosure url="%s" type="image/jpeg" />' % xml_esc(src)
    return (
        "    <item>\n"
        "      <title>%s</title>\n"
        "      <link>%s</link>\n"
        "      <guid isPermaLink=\"true\">%s</guid>\n"
        "      <pubDate>%s</pubDate>\n"
        "      <category>%s</category>\n"
        "      <description>%s</description>"
        "%s\n"
        "    </item>"
        % (title, xml_esc(loc), xml_esc(loc), xml_esc(rfc2822(date)), tag, summary, enclosure)
    )


def write_feed(articles, changes, built):
    items = [rss_item(a) for a in articles[:80]]
    items += [rss_item(c) for c in changes]
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        "    <title>Supercharged Daily</title>\n"
        "    <link>%s/</link>\n"
        "    <atom:link href=\"%s/feed.xml\" rel=\"self\" type=\"application/rss+xml\" />\n"
        "    <description>Original Tesla, SpaceX and xAI reporting, plus tracker changes.</description>\n"
        "    <language>en-gb</language>\n"
        "    <lastBuildDate>%s</lastBuildDate>\n"
        "%s\n"
        "  </channel>\n"
        "</rss>\n"
        % (SITE, SITE, xml_esc(rfc2822(built)), "\n".join(items))
    )
    open(FEED, "w", encoding="utf-8").write(body)


def write_news_sitemap(articles):
    """Google News sitemap: dispatches from the last two days (plus a small buffer)."""
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=3)
    rows = []
    for a in articles:
        try:
            dt = datetime.datetime.fromisoformat(a["date"].replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError):
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        if dt < cutoff:
            continue
        loc = SITE + a["url"]
        title = xml_esc(a.get("title") or "")
        pub = iso_utc(a["date"])
        rows.append(
            "  <url>\n"
            "    <loc>%s</loc>\n"
            "    <news:news>\n"
            "      <news:publication>\n"
            "        <news:name>Supercharged Daily</news:name>\n"
            "        <news:language>en</news:language>\n"
            "      </news:publication>\n"
            "      <news:publication_date>%s</news:publication_date>\n"
            "      <news:title>%s</news:title>\n"
            "    </news:news>\n"
            "  </url>" % (xml_esc(loc), xml_esc(pub), title)
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n'
        + "\n".join(rows)
        + "\n</urlset>\n"
    )
    open(NEWS_MAP, "w", encoding="utf-8").write(xml)
    return len(rows)


def run():
    articles, updated = load_articles()
    changes = load_tracker_changes()
    built = updated or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if articles:
        built = articles[0].get("date") or built
    write_feed(articles, changes, built)
    n = write_news_sitemap(articles)
    print("feed.xml: %d stories, %d tracker changes; news sitemap: %d" % (len(articles), len(changes), n))


if __name__ == "__main__":
    run()
