#!/usr/bin/env python3
"""Pull today's Tesla, SpaceX and Grok headlines from Google News RSS."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

UA = "ALJR86-news/1.0 (+https://zzbz6jgyzy-creator.github.io/news.html)"
MAX_AGE_HOURS = 36
PER_TOPIC = 16
TOPICS = (
    ("tesla", "Tesla when:1d"),
    ("spacex", "SpaceX when:1d"),
    ("grok", "Grok xAI when:1d"),
)


def rss_url(query: str) -> str:
    return "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"}
    )


def fetch(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        if res.status != 200:
            raise RuntimeError(f"{url} -> {res.status}")
        return res.read()


def strip_html(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


def parse_pub(value: str) -> str | None:
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def split_title(raw: str, source: str) -> tuple[str, str]:
    title = (raw or "").strip()
    src = (source or "").strip()
    dash = title.rfind(" - ")
    if dash > 0:
        trail = title[dash + 3 :].strip()
        if not src:
            src = trail
        if trail.lower() == src.lower() or (src and trail.lower() in src.lower()):
            title = title[:dash].strip()
    return title, src


def snippet_from(title: str, description: str) -> str:
    text = strip_html(description)
    if not text:
        return ""
    compact = text.strip()
    head = title.lower()[:40]
    if head and compact.lower().startswith(head):
        return ""
    if len(compact) < 48:
        return ""
    if compact.lower() == title.lower():
        return ""
    return compact[:220].rstrip()


def parse_rss(xml_bytes: bytes, topic: str, now: datetime) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    cutoff = now - timedelta(hours=MAX_AGE_HOURS)
    seen: set[str] = set()
    items: list[dict] = []
    for node in root.findall(".//item"):
        raw_title = (node.findtext("title") or "").strip()
        link = (node.findtext("link") or "").strip()
        if not raw_title or not link:
            continue
        source_el = node.find("source")
        source = (source_el.text or "").strip() if source_el is not None else ""
        title, source = split_title(raw_title, source)
        published = parse_pub(node.findtext("pubDate") or "")
        if published:
            pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            if pub_dt < cutoff:
                continue
        key = re.sub(r"[^a-z0-9]+", "", title.lower())[:80]
        if key in seen:
            continue
        seen.add(key)
        item_id = hashlib.sha1(f"{topic}|{link}".encode()).hexdigest()[:12]
        items.append(
            {
                "id": item_id,
                "topic": topic,
                "title": title,
                "source": source or "Google News",
                "url": link,
                "published": published,
                "snippet": snippet_from(title, node.findtext("description") or ""),
            }
        )
        if len(items) >= PER_TOPIC:
            break
    return items


def fingerprint(items: list[dict]) -> list[tuple[str, str, str]]:
    return sorted((i["topic"], i["title"], i["url"]) for i in items)


def collect(now: datetime) -> list[dict]:
    items: list[dict] = []
    errors: list[str] = []
    for topic, query in TOPICS:
        url = rss_url(query)
        try:
            items.extend(parse_rss(fetch(url), topic, now))
        except (urllib.error.URLError, TimeoutError, RuntimeError, ET.ParseError) as exc:
            errors.append(f"{topic}: {exc}")
    items.sort(key=lambda row: row.get("published") or "", reverse=True)
    if errors and not items:
        raise RuntimeError("; ".join(errors))
    if errors:
        print("partial snapshot:", "; ".join(errors), file=sys.stderr)
    return items


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="news-data.json")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    items = collect(now)
    if not items:
        print("no headlines", file=sys.stderr)
        return 1
    out = Path(args.out)
    payload = {
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "items": items,
    }
    if out.exists():
        try:
            old = json.loads(out.read_text())
            if fingerprint(old.get("items") or []) == fingerprint(items):
                print(f"unchanged ({len(items)} headlines)")
                return 0
        except json.JSONDecodeError:
            pass
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {out} ({len(items)} headlines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
