#!/usr/bin/env python3
"""Snapshot Tesla firmware versions from Teslascope's public software API."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "ALJR86-updates/1.0 (+https://zzbz6jgyzy-creator.github.io/updates.html)"
BASE = "https://teslascope.com/api/software"
MAX_VERSIONS = 16
SLEEP_S = 0.35


def fetch(url: str, timeout: int = 25) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        if res.status != 200:
            raise RuntimeError(f"{url} -> {res.status}")
        return json.loads(res.read().decode("utf-8"))


def iso_day(value: str | None) -> str:
    if not value:
        return ""
    return str(value)[:10]


def iso_stamp(value: str | None) -> str:
    if not value:
        return ""
    text = str(value).replace(" ", "T")
    if text.endswith("+00:00"):
        text = text[:-6] + "Z"
    if text.endswith(".000000Z"):
        text = text[:-8] + "Z"
    return text


def compact_text(value: str | None, limit: int = 280) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def slim_version(raw: dict) -> dict | None:
    version = str(raw.get("version") or "").strip()
    if not re.match(r"^\d{4}\.\d+", version):
        return None
    fleet = int(raw.get("totalCount") or 0)
    count = int(raw.get("count") or 0)
    percent = round((100 * count / fleet), 1) if fleet else 0.0
    countries = []
    country_counts = {}
    for row in raw.get("countries") or []:
        if not isinstance(row, dict):
            continue
        code = str(row.get("country") or "").strip().upper()
        if not code:
            continue
        countries.append(code)
        country_counts[code] = int(row.get("count") or 0)
    features = []
    seen = set()
    for row in list(raw.get("features") or []) + list(raw.get("previous_features") or []):
        if not isinstance(row, dict):
            continue
        title = compact_text(row.get("title"), 80)
        if not title or title.lower() in seen:
            continue
        if not row.get("show_in_history", True) and title.lower() == "security improvements":
            continue
        seen.add(title.lower())
        features.append({"title": title, "text": compact_text(row.get("description"), 220)})
        if len(features) >= 8:
            break
    pending = raw.get("pending") if isinstance(raw.get("pending"), dict) else {}
    return {
        "id": version,
        "date": iso_day(raw.get("firstSpotted") or raw.get("created_at")),
        "count": count,
        "fleet": fleet,
        "percent": percent,
        "fsd": raw.get("fsd") or None,
        "fsdHw3": raw.get("fsd_hw3") or None,
        "fsdHw4": raw.get("fsd_hw4") or None,
        "features": features,
        "countries": countries,
        "countryCounts": country_counts,
        "pending": int(pending.get("total") or 0),
        "firstSeen": iso_stamp(raw.get("firstSpotted") or raw.get("created_at")),
        "lastSeen": iso_stamp(raw.get("latest_received_at") or raw.get("updated_at")),
    }


def load_version(version: str) -> dict | None:
    url = f"{BASE}/{urllib.parse.quote(version)}"
    try:
        payload = fetch(url)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise
    body = payload.get("response")
    if payload.get("code") != 200 or not isinstance(body, dict):
        return None
    return slim_version(body)


def snapshot() -> dict:
    listing = fetch(BASE)
    names = listing.get("response") if listing.get("code") == 200 else []
    if not isinstance(names, list):
        raise RuntimeError("Teslascope software list was not a list")
    wanted = [str(name) for name in names if str(name).startswith("2026.")][:24]
    versions = []
    seen = set()
    latest = load_version("latest")
    if latest:
        versions.append(latest)
        seen.add(latest["id"])
    for name in wanted:
        if name in seen:
            continue
        time.sleep(SLEEP_S)
        row = load_version(name)
        if not row:
            continue
        versions.append(row)
        seen.add(row["id"])
        if len(versions) >= MAX_VERSIONS:
            break
    versions.sort(key=lambda row: (row.get("date") or "", row.get("id") or ""), reverse=True)
    fleet = next((row["fleet"] for row in versions if row.get("fleet")), 0)
    return {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "teslascope",
        "sourceUrl": "https://teslascope.com/software",
        "fleet": fleet,
        "latest": versions[0]["id"] if versions else "",
        "versions": versions,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="updates-live.json")
    args = parser.parse_args()
    data = snapshot()
    path = Path(args.out)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path} · {len(data['versions'])} builds · latest {data['latest']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
