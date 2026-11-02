#!/usr/bin/env python3
"""Bake Jonathan McDowell's Starlink summary table into starlink-live.js.

Source: https://planet4589.org/space/con/star/stats.html (summary status table).
Only real numbers from that page are written. Incomplete fetches (missing
timestamp, truncated table, network errors) keep the last good file and exit 0
with a warning. Mapping bugs (unmapped row, generation totals that don't add
up) still fail the job.
"""
from __future__ import annotations

import html
import http.client
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

URL = "https://planet4589.org/space/con/star/stats.html"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "starlink-live.js"
HIST = ROOT / "data" / "starlink-history.json"
COLS = ["launched", "failedToOrbit", "earlyDeorbit", "disposed", "reentryAfterFail",
        "down", "inOrbit", "screened", "dead", "graveyard", "working", "retiring",
        "outOfConstellation", "anomalous", "reserve", "special", "drift", "ascent",
        "operational"]
# McDowell pads single-digit days ("Nov  2"). A single space between month and day
# misses the 1st–9th of every month and exits without writing.
TS_RE = re.compile(
    r"Data last updated:\s*(\d{4})\s+(\w{3})\s+(\d{1,2})\s+(\d{2})(\d{2}):(\d{2})",
    re.I,
)


class IncompleteSource(Exception):
    """McDowell's page was missing a field we need. Keep the last good file."""


def plain_text(raw: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", raw))


def fetch() -> str:
    req = urllib.request.Request(URL, headers={"User-Agent": "superchargeddaily.com starlink tracker (daily)"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError, http.client.HTTPException) as exc:
        raise IncompleteSource(f"fetch failed: {exc}") from exc
    if not raw.strip():
        raise IncompleteSource("empty page")
    return raw


def extract_block(raw: str) -> str:
    start = raw.find("Summary status table")
    end = raw.find("List of all Starlink satellites", start if start >= 0 else 0)
    if start < 0 or end < 0:
        raise IncompleteSource("summary table not found")
    return raw[start:end]


def parse_updated(block: str) -> datetime:
    m = TS_RE.search(plain_text(block))
    if not m:
        raise IncompleteSource("no timestamp")
    y, mon, d, hh, mm, ss = m.groups()
    return datetime.strptime(
        f"{y} {mon.title()} {int(d):02d} {hh}:{mm}:{ss}",
        "%Y %b %d %H:%M:%S",
    ).replace(tzinfo=timezone.utc)


def gen_of(name: str) -> str | None:
    if "Prototype" in name:
        return "other"
    if "Simulator" in name or "Dodger" in name:
        return None
    if re.fullmatch(r"Starlink Gen\w+|Total", name):
        return None
    if "DTC" in name:
        return "v2dtc"
    if "Mini/Opt" in name:
        return "v2opt"
    if "V2 Mini Shell" in name:
        return "v2m"
    if name == "Starlink V3":
        return "v3"
    if "Group 1" in name:
        return "v10"
    if re.search(r"Group [2-5]", name):
        return "v15"
    raise SystemExit(f"unmapped row: {name!r}")


def parse_stats(raw: str) -> tuple[datetime, dict, dict]:
    """Return (timestamp, totals, generations). IncompleteSource keeps last file."""
    block = extract_block(raw)
    ts = parse_updated(block)

    gens = {g: dict.fromkeys(COLS, 0) for g in ["v10", "v15", "v2m", "v2opt", "v2dtc", "v3"]}
    totals = None
    other = dict.fromkeys(COLS, 0)
    for tr in re.findall(r"<tr.*?</tr>", block, flags=re.S | re.I):
        cells = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip()
                 for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S | re.I)]
        if len(cells) < 20 or not re.fullmatch(r"\d+", cells[1]):
            continue
        name, nums = cells[0], [int(x) for x in cells[1:20]]
        row = dict(zip(COLS, nums))
        if name == "Total":
            totals = row
            continue
        g = gen_of(name)
        if g == "other":
            for k, v in row.items():
                other[k] += v
        elif g:
            for k, v in row.items():
                gens[g][k] += v
    if not totals:
        raise IncompleteSource("no Total row")
    for k in ("launched", "inOrbit", "working"):
        s = sum(g[k] for g in gens.values()) + other[k]
        if s != totals[k]:
            raise SystemExit(f"generation sum mismatch for {k}: {s} vs {totals[k]}")
    return ts, totals, gens


def write_output(ts: datetime, totals: dict, gens: dict) -> None:
    prev_orbits = ""
    if OUT.exists():
        try:
            blob = OUT.read_text(encoding="utf-8")
            prev = json.loads(blob[blob.index("{") : blob.rindex("}") + 1])
            prev_orbits = prev.get("orbitsUpdated") or ""
        except (json.JSONDecodeError, ValueError):
            prev_orbits = ""

    payload = {
        "updated": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        **({"orbitsUpdated": prev_orbits} if prev_orbits else {}),
        "source": URL,
        "totals": totals,
        "generations": gens,
    }
    OUT.write_text("// Generated by scripts/build-starlink-stats.py. Do not edit by hand.\n"
                   "window.STARLINK_LIVE = " + json.dumps(payload, indent=1) + ";\n", encoding="utf-8")
    print(f"wrote {OUT}: updated {payload['updated']} inOrbit={totals['inOrbit']} working={totals['working']}")
    append_history(payload)


def append_history(payload: dict) -> None:
    """Record McDowell count snapshots only when the published table actually moved."""
    data = {
        "source": URL,
        "note": "Committed Jonathan McDowell snapshots. Not a live operator feed. Days between snapshots are not interpolated.",
        "snapshots": [],
    }
    if HIST.exists():
        try:
            data = json.loads(HIST.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    snaps = data.setdefault("snapshots", [])
    rec = {
        "updated": payload["updated"],
        "inOrbit": payload["totals"]["inOrbit"],
        "working": payload["totals"]["working"],
        "operational": payload["totals"]["operational"],
        "launched": payload["totals"]["launched"],
    }
    if snaps:
        last = snaps[-1]
        if last.get("updated") == rec["updated"] and last.get("inOrbit") == rec["inOrbit"] and last.get("working") == rec["working"]:
            return
    snaps.append(rec)
    HIST.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
    print(f"appended starlink-history: {rec['updated']} inOrbit={rec['inOrbit']}")


def main() -> int:
    try:
        ts, totals, gens = parse_stats(fetch())
    except IncompleteSource as exc:
        msg = f"McDowell stats incomplete ({exc}); keeping last good data"
        print(f"warning: {msg}", file=sys.stderr)
        print(f"::warning::{msg}")
        return 0
    write_output(ts, totals, gens)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
