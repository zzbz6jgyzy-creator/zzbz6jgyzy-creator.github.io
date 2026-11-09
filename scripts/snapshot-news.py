#!/usr/bin/env python3
"""Pull today's Tesla, SpaceX and Grok headlines from Google News RSS."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from news_keep import apply_keep, load_hold, title_key

UA = "ALJR86-news/1.0 (+https://superchargeddaily.com/news.html)"
MAX_AGE_HOURS = 36
PER_TOPIC = 16
TOPICS = (
    ("tesla", "Tesla when:1d"),
    ("spacex", "SpaceX when:1d"),
    ("grok", "Grok xAI when:1d"),
)
BING_QUERIES = {
    "tesla": ("Tesla", "Cybertruck", "Tesla FSD"),
    "spacex": ("SpaceX", "Starship", "Starlink"),
    "grok": ("Grok xAI", "Grokipedia", "xAI Grok"),
}


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
        row = {
            "id": item_id,
            "topic": topic,
            "title": title,
            "source": source or "Google News",
            "url": link,
            "published": published,
            "snippet": snippet_from(title, node.findtext("description") or ""),
        }
        image = rss_image(node)
        if image:
            row["image"] = image
        items.append(row)
        if len(items) >= PER_TOPIC:
            break
    return items


def local_name(tag: str) -> str:
    return tag.split("}", 1)[-1]


def child_text(node: ET.Element, name: str) -> str:
    for child in node:
        if local_name(child.tag) == name:
            return (child.text or "").strip()
    return ""


def rss_image(node: ET.Element) -> str:
    for child in node:
        name = local_name(child.tag)
        if name in {"Image", "thumbnail"}:
            raw = (child.text or "").strip() or (child.get("url") or "").strip()
            if raw:
                return abs_image(raw)
        if name in {"content", "enclosure"}:
            typ = (child.get("type") or "").lower()
            url = (child.get("url") or "").strip()
            if url and (typ.startswith("image") or name == "content"):
                return abs_image(url)
    desc = node.findtext("description") or ""
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc, re.I)
    if match:
        return abs_image(html.unescape(match.group(1)))
    return ""


def abs_image(raw: str) -> str:
    url = (raw or "").strip()
    if not url:
        return ""
    if url.startswith("//"):
        url = "https:" + url
    elif url.startswith("/"):
        url = "https://www.bing.com" + url
    url = re.sub(r"^http://", "https://", url)
    if "bing.com/th" in url and "w=" not in url:
        url += ("&" if "?" in url else "?") + "w=640"
    if url.endswith(("gstatic.com/gnews/logo/google_news_192.png", "google_news_512.png")):
        return ""
    return url


# title_key imported from news_keep


def bing_url(query: str) -> str:
    return "https://www.bing.com/news/search?" + urllib.parse.urlencode({"q": query, "format": "rss"})


def unwrap_bing_link(link: str) -> str:
    parsed = urllib.parse.urlparse(link or "")
    if "apiclick.aspx" in parsed.path:
        real = urllib.parse.parse_qs(parsed.query).get("url", [""])[0]
        if real:
            return real
    return link


def parse_bing(xml_bytes: bytes, topic: str, now: datetime) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    cutoff = now - timedelta(hours=MAX_AGE_HOURS)
    seen: set[str] = set()
    items: list[dict] = []
    for node in root.findall(".//item"):
        title = (node.findtext("title") or "").strip()
        link = unwrap_bing_link((node.findtext("link") or "").strip())
        if not title or not link:
            continue
        published = parse_pub(node.findtext("pubDate") or "")
        if published:
            pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            if pub_dt < cutoff:
                continue
        key = title_key(title)
        if not key or key in seen:
            continue
        seen.add(key)
        source = child_text(node, "Source") or "Bing News"
        image = rss_image(node)
        items.append(
            {
                "id": hashlib.sha1(f"{topic}|{link}".encode()).hexdigest()[:12],
                "topic": topic,
                "title": title,
                "source": source,
                "url": link,
                "published": published,
                "snippet": snippet_from(title, node.findtext("description") or ""),
                **({"image": image} if image else {}),
            }
        )
    return items


def attach_images(items: list[dict], photos: list[dict]) -> list[dict]:
    by_key: dict[str, str] = {}
    for row in photos:
        image = row.get("image") or ""
        key = title_key(row.get("title") or "")
        if image and key:
            by_key[key] = image
    for row in items:
        if row.get("image"):
            continue
        key = title_key(row.get("title") or "")
        if key in by_key:
            row["image"] = by_key[key]
            continue
        prefix = key[:42]
        if not prefix:
            continue
        for other, image in by_key.items():
            if prefix in other or other[:42] in key:
                row["image"] = image
                break
    return items


def fingerprint(items: list[dict]) -> list[tuple[str, str, str, str]]:
    return sorted((i["topic"], i["title"], i["url"], i.get("image") or "") for i in items)


def collect(now: datetime) -> list[dict]:
    items: list[dict] = []
    photos: list[dict] = []
    errors: list[str] = []
    for topic, query in TOPICS:
        url = rss_url(query)
        try:
            items.extend(parse_rss(fetch(url), topic, now))
        except (urllib.error.URLError, TimeoutError, RuntimeError, ET.ParseError) as exc:
            errors.append(f"{topic}: {exc}")
        for bing_q in BING_QUERIES.get(topic, ()):
            try:
                photos.extend(parse_bing(fetch(bing_url(bing_q)), topic, now))
            except (urllib.error.URLError, TimeoutError, RuntimeError, ET.ParseError) as exc:
                errors.append(f"bing/{topic}/{bing_q}: {exc}")
    items = attach_images(items, photos)
    missing = [row for row in items if not row.get("image")][:24]

    def lookup(row: dict) -> tuple[str, str]:
        try:
            hits = parse_bing(fetch(bing_url(row["title"][:90])), row["topic"], now)
        except (urllib.error.URLError, TimeoutError, RuntimeError, ET.ParseError):
            return row["id"], ""
        key = title_key(row["title"])
        for hit in hits:
            image = hit.get("image") or ""
            if not image:
                continue
            other = title_key(hit["title"])
            if key[:40] in other or other[:40] in key:
                return row["id"], image
        return row["id"], (hits[0].get("image") if hits else "") or ""

    if missing:
        found: dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=6) as pool:
            futures = [pool.submit(lookup, row) for row in missing]
            for fut in as_completed(futures):
                item_id, image = fut.result()
                if image:
                    found[item_id] = image
        for row in items:
            if not row.get("image") and row["id"] in found:
                row["image"] = found[row["id"]]
    seen = {title_key(row["title"]) for row in items}
    for row in photos:
        key = title_key(row["title"])
        if not key or key in seen or not row.get("image"):
            continue
        seen.add(key)
        items.append(row)
    items = resolve_links(items)
    hold = load_hold(Path(__file__).resolve().parent.parent / "data" / "news-hold.json")
    items = apply_keep(items, hold)
    items.sort(key=lambda row: row.get("published") or "", reverse=True)
    if errors and not items:
        raise RuntimeError("; ".join(errors))
    if errors:
        print("partial snapshot:", "; ".join(errors), file=sys.stderr)
    with_img = sum(1 for row in items if row.get("image"))
    print(f"{with_img}/{len(items)} headlines have images", file=sys.stderr)
    return items


# --- Google News redirect links -> the publisher's own URL --------------------------------------
# Google News RSS links point at news.google.com/rss/articles/<id>. We resolve each id once with the
# same request Google's own article page makes (signature + timestamp from the article page, then the
# batchexecute "garturlreq" call), cache the answer in data/news-resolve-cache.json, and fall back to
# the Google link whenever anything fails. No API key; at most RESOLVE_MAX new lookups per run.
RESOLVE_CACHE = Path(__file__).resolve().parent.parent / "data" / "news-resolve-cache.json"
RESOLVE_MAX = 40
RESOLVE_KEEP = 600
RESOLVE_PAUSE = 1.2  # seconds between lookups; Google answers 429 to bursts


def google_news_id(url: str) -> str:
    parsed = urllib.parse.urlparse(url or "")
    if parsed.netloc != "news.google.com":
        return ""
    parts = [p for p in parsed.path.split("/") if p]
    return parts[-1] if len(parts) >= 2 and parts[-2] == "articles" else ""


def publisher_url(gid: str, timeout: int = 15) -> str:
    page = urllib.request.urlopen(urllib.request.Request("https://news.google.com/articles/" + gid, headers={"User-Agent": UA}), timeout=timeout)
    text = page.read().decode("utf-8", "ignore")
    sig, ts = re.search(r'data-n-a-sg="([^"]+)"', text), re.search(r'data-n-a-ts="([^"]+)"', text)
    if not sig or not ts:
        return ""
    inner = ["garturlreq", [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None, None, None, None, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0], gid, int(ts.group(1)), sig.group(1)]
    body = urllib.parse.urlencode({"f.req": json.dumps([[["Fbv4je", json.dumps(inner), None, "generic"]]])}).encode()
    req = urllib.request.Request("https://news.google.com/_/DotsSplashUi/data/batchexecute", data=body,
                                 headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
    return parse_batchexecute(urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore"))


# A Google News card that resolves to a social post (an outlet's Facebook page, an X post) is not the
# publisher's article, so keep the Google link for those rather than label a social post with the outlet.
SOCIAL_HOSTS = ("facebook.com", "x.com", "twitter.com", "instagram.com", "linkedin.com", "threads.net", "tiktok.com", "youtube.com")


def _walk_garturlres(node):
    if isinstance(node, list):
        if len(node) >= 2 and node[0] == "garturlres" and isinstance(node[1], str):
            return node[1]
        for child in node:
            found = _walk_garturlres(child)
            if found:
                return found
    elif isinstance(node, str) and "garturlres" in node:
        try:
            return _walk_garturlres(json.loads(node))
        except json.JSONDecodeError:
            return ""
    return ""


def parse_batchexecute(raw: str) -> str:
    """Pull the publisher URL out of a batchexecute reply by decoding its JSON (so escaped characters
    such as \\u003d and \\u0026 come back as = and &), then refuse Google and social hosts."""
    url = ""
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("[") or "garturlres" not in line:
            continue
        try:
            url = _walk_garturlres(json.loads(line))
        except json.JSONDecodeError:
            continue
        if url:
            break
    parsed = urllib.parse.urlparse(url)
    host = parsed.netloc.lower().split(":")[0]
    if parsed.scheme not in ("http", "https") or not host or host.endswith("google.com"):
        return ""
    if any(host == h or host.endswith("." + h) for h in SOCIAL_HOSTS):
        return ""
    return url


def resolve_links(items: list[dict], fetcher=publisher_url, cache_path: Path = RESOLVE_CACHE) -> list[dict]:
    try:
        cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    except (OSError, json.JSONDecodeError):
        cache = {}
    looked, blocked = 0, False
    for row in items:
        gid = google_news_id(row.get("url", ""))
        if not gid:
            continue
        if gid not in cache and looked < RESOLVE_MAX and not blocked:
            if looked and fetcher is publisher_url:
                time.sleep(RESOLVE_PAUSE)
            looked += 1
            try:
                cache[gid] = fetcher(gid) or ""
            except urllib.error.HTTPError as err:
                print(f"resolve stopped at {gid[:16]}: {err}", file=sys.stderr)
                blocked = err.code == 429  # rate limited: try the rest on the next run
                continue
            except (urllib.error.URLError, OSError, ValueError, TimeoutError) as err:
                print(f"resolve skipped {gid[:16]}: {err}", file=sys.stderr)
                continue
        if cache.get(gid):
            row["url"] = cache[gid]
    if looked:
        keep = dict(list(cache.items())[-RESOLVE_KEEP:])
        try:
            cache_path.write_text(json.dumps(keep, indent=1, sort_keys=False) + "\n")
        except OSError:
            pass
        print(f"resolved {sum(1 for r in items if not google_news_id(r.get('url','')))}/{len(items)} links to publishers ({looked} lookups)", file=sys.stderr)
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
