#!/usr/bin/env python3
"""Build /data/starlink.json from the already-baked starlink-gp.js.

Used to seed the identify-satellite catalog without a live CelesTrak fetch.
The GitHub Action prefers scripts/build-starlink-gp.py, which writes both files
from a fresh download.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GP = ROOT / "starlink-gp.js"
OUT = ROOT / "data" / "starlink.json"
GEN_LABELS = {
    "v10": "V1.0",
    "v15": "V1.5",
    "v2m": "V2 Mini",
    "v2opt": "V2 Mini Optimized",
    "v2dtc": "V2 Mini Direct-to-Cell",
    "v3": "V3",
}


def load_gp() -> dict:
    text = GP.read_text(encoding="utf-8")
    start = text.index("{")
    end = text.rindex("}") + 1
    return json.loads(text[start:end])


def norad_of(tle1: str) -> int:
    try:
        return int(tle1[2:7])
    except ValueError:
        return 0


def tle_epoch_iso(line1: str) -> str | None:
    if not line1 or len(line1) < 32:
        return None
    try:
        yy = int(line1[18:20])
        day = float(line1[20:32])
        year = 2000 + yy if yy < 57 else 1900 + yy
        dt = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=day - 1)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError):
        return None


def vintage_of(gp: dict) -> str:
    raw = gp.get("tleAsOf") or gp.get("asOf") or ""
    if isinstance(raw, str) and "T" in raw:
        return raw
    stamps = []
    for row in gp.get("tle") or []:
        if isinstance(row, list) and len(row) > 1:
            iso = tle_epoch_iso(row[1])
            if iso:
                stamps.append(iso)
    if stamps:
        return max(stamps)
    if raw:
        return raw
    raise SystemExit("baked GP has no CelesTrak epoch; not writing a bake-clock fallback")


def main() -> None:
    gp = load_gp()
    gens = gp.get("gens") or list(GEN_LABELS)
    rows = []
    for row in gp.get("tle") or []:
        if not isinstance(row, list) or len(row) < 3:
            continue
        gi, l1, l2 = row[0], row[1], row[2]
        gen = gens[gi] if isinstance(gi, int) and 0 <= gi < len(gens) else "v2opt"
        cat = norad_of(l1)
        rows.append([f"STARLINK-{cat}", cat, gen, l1, l2])
    vintage = vintage_of(gp)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    body = {
        "updated": vintage,
        "tleAsOf": vintage,
        "count": len(rows),
        "fields": ["name", "norad", "gen", "tle1", "tle2"],
        "gens": GEN_LABELS,
        "sources": gp.get("sources")
        or {
            "orbits": "CelesTrak GP, Starlink group (TLE + JSON)",
            "buses": "Jonathan McDowell, GCAT, CC BY 4.0, https://planet4589.org/space/gcat",
        },
        "satellites": rows,
    }
    OUT.write_text(json.dumps(body, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes) count={len(rows)}")


if __name__ == "__main__":
    main()
