#!/usr/bin/env python3
"""Fetch CelesTrak GP JSON for Orbital Command and write a compact snapshot.

The browser never calls CelesTrak. This job runs a few times a day.
A failed fetch keeps the last valid snapshot and records stale=true.

Starlink is not fetched here — reuse data/starlink.json from starlink-refresh.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "orbital-command"
SNAPSHOT = OUT_DIR / "snapshot.json"
STATUS = OUT_DIR / "status.json"
BASE = os.environ.get("CELESTRAK_BASE", "https://celestrak.org/NORAD/elements/gp.php")

# Small groups only. Do not add ACTIVE or the full Starlink group.
GROUPS = (
    ("stations", "GROUP=STATIONS"),
    ("visual", "GROUP=VISUAL"),
    ("weather", "GROUP=WEATHER"),
)

FEATURED = (25544, 20580, 48274)  # ISS, Hubble, CSS / Tianhe — CATNR lookup if missing from groups


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_bytes(url: str) -> bytes:
    fixture_tle = os.environ.get("OC_GP_FIXTURE_TLE")
    fixture_json = os.environ.get("OC_GP_FIXTURE_JSON")
    if "FORMAT=TLE" in url.upper() and fixture_tle:
        return Path(fixture_tle).read_bytes()
    if "FORMAT=JSON" in url.upper() and fixture_json:
        return Path(fixture_json).read_bytes()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SuperchargedDaily-OrbitalCommand/1.0 (static snapshot; not per-visitor)"},
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if "127.0.0.1" in url or "localhost" in url else urllib.request.build_opener()
    with opener.open(req, timeout=45) as res:
        return res.read()


def fetch_json(url: str) -> list:
    data = json.loads(fetch_bytes(url).decode("utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("empty or non-list GP response")
    return data


def fetch_tle(url: str) -> str:
    text = fetch_bytes(url).decode("utf-8", "replace")
    if "1 " not in text or "2 " not in text:
        raise ValueError("TLE response missing element lines")
    return text


def parse_tle_text(text: str) -> list[tuple[str, int, str, str]]:
    """Return (name, norad, line1, line2) from CelesTrak 3-line TLE text."""
    lines = text.splitlines()
    out: list[tuple[str, int, str, str]] = []
    i = 0
    while i < len(lines) - 1:
        a, b = lines[i], lines[i + 1]
        if a.startswith("1 ") and b.startswith("2 ") and len(a) >= 68 and len(b) >= 68:
            name = lines[i - 1].strip() if i else ""
            try:
                norad = int(a[2:7])
            except ValueError:
                i += 1
                continue
            out.append((name, norad, a.strip(), b.strip()))
            i += 2
            continue
        i += 1
    return out


def tle_ok(line1: str, line2: str) -> bool:
    return isinstance(line1, str) and isinstance(line2, str) and len(line1) >= 68 and len(line2) >= 68


def epoch_iso(row: dict, line1: str) -> str | None:
    raw = row.get("EPOCH")
    if raw:
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            pass
    if len(line1) >= 32:
        try:
            yy = int(line1[18:20])
            day = float(line1[20:32])
            year = 2000 + yy if yy < 57 else 1900 + yy
            dt = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=day - 1)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except (TypeError, ValueError):
            return None
    return None


def elements_from_tle2(line2: str) -> dict[str, float] | None:
    if len(line2) < 63:
        return None
    try:
        return {
            "inclinationDeg": float(line2[8:16]),
            "raanDeg": float(line2[17:25]),
            "eccentricity": float("0." + line2[26:33].strip()),
            "argPerigeeDeg": float(line2[34:42]),
            "meanAnomalyDeg": float(line2[43:51]),
            "meanMotionRevPerDay": float(line2[52:63]),
        }
    except ValueError:
        return None


def normalise_tle(name: str, norad: int, line1: str, line2: str, group: str, retrieved: str, omm: dict | None) -> dict | None:
    if norad <= 0 or not tle_ok(line1, line2):
        return None
    elems = elements_from_tle2(line2)
    if not elems:
        return None
    epoch = epoch_iso(omm or {}, line1)
    if not epoch:
        return None
    object_type = None
    if omm and omm.get("OBJECT_TYPE"):
        object_type = str(omm["OBJECT_TYPE"]).lower()
    bstar = None
    if omm and omm.get("BSTAR") not in (None, ""):
        try:
            bstar = float(omm["BSTAR"])
        except (TypeError, ValueError):
            bstar = None
    return {
        "norad": norad,
        "name": name or (str(omm.get("OBJECT_NAME")) if omm else None) or f"NORAD {norad}",
        "objectType": object_type,
        "operator": None,
        "epoch": epoch,
        "inclinationDeg": elems["inclinationDeg"],
        "eccentricity": elems["eccentricity"],
        "meanMotionRevPerDay": elems["meanMotionRevPerDay"],
        "raanDeg": elems["raanDeg"],
        "argPerigeeDeg": elems["argPerigeeDeg"],
        "meanAnomalyDeg": elems["meanAnomalyDeg"],
        "bstar": bstar,
        "tle1": line1,
        "tle2": line2,
        "sourceId": "celestrak-gp",
        "sourceUrl": "https://celestrak.org/NORAD/elements/gp.php",
        "retrievedAt": retrieved,
        "group": group,
        "starlinkGen": None,
        "mission": None,
    }


def load_previous() -> dict | None:
    if not SNAPSHOT.exists():
        return None
    try:
        data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    if data.get("schema") != "orbital-command.snapshot.v1":
        return None
    if not isinstance(data.get("objects"), list) or not data["objects"]:
        return None
    return data


def write_status(ok: bool, retrieved: str, count: int, error: str | None, stale: bool) -> None:
    STATUS.parent.mkdir(parents=True, exist_ok=True)
    STATUS.write_text(
        json.dumps(
            {
                "ok": ok,
                "stale": stale,
                "retrievedAt": retrieved,
                "objectCount": count,
                "error": error,
                "source": "CelesTrak GP",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def keep_last(error: str) -> int:
    prev = load_previous()
    if not prev:
        write_status(False, utc_now(), 0, error, True)
        print(f"no last-good snapshot: {error}", file=sys.stderr)
        return 2
    prev["stale"] = True
    prev["error"] = error
    SNAPSHOT.write_text(json.dumps(prev, separators=(",", ":")), encoding="utf-8")
    write_status(False, prev.get("retrievedAt") or utc_now(), len(prev["objects"]), error, True)
    print(f"kept last-good snapshot ({len(prev['objects'])} objects): {error}")
    return 0


def main() -> int:
    retrieved = utc_now()
    objects: list[dict] = []
    seen: set[int] = set()
    try:
        for group, query in GROUPS:
            # OMM JSON has Keplerian fields but not TLE_LINE1/2. Fetch TLE text.
            tle_rows = parse_tle_text(fetch_tle(f"{BASE}?{query}&FORMAT=TLE"))
            omm_by_id: dict[int, dict] = {}
            try:
                for row in fetch_json(f"{BASE}?{query}&FORMAT=JSON"):
                    try:
                        omm_by_id[int(row["NORAD_CAT_ID"])] = row
                    except (KeyError, TypeError, ValueError):
                        continue
            except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
                omm_by_id = {}
            for name, norad, line1, line2 in tle_rows:
                rec = normalise_tle(name, norad, line1, line2, group, retrieved, omm_by_id.get(norad))
                if not rec or rec["norad"] in seen:
                    continue
                seen.add(rec["norad"])
                objects.append(rec)
        for catnr in FEATURED:
            if catnr in seen:
                continue
            try:
                tle_rows = parse_tle_text(fetch_tle(f"{BASE}?CATNR={catnr}&FORMAT=TLE"))
            except (urllib.error.URLError, TimeoutError, ValueError):
                continue
            for name, norad, line1, line2 in tle_rows:
                rec = normalise_tle(name, norad, line1, line2, "featured", retrieved, None)
                if rec and rec["norad"] not in seen:
                    seen.add(rec["norad"])
                    objects.append(rec)
        if len(objects) < 3:
            raise ValueError(f"too few valid objects ({len(objects)})")
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError, KeyError) as exc:
        return keep_last(exc.__class__.__name__ + ": " + str(exc)[:180])

    payload = {
        "schema": "orbital-command.snapshot.v1",
        "retrievedAt": retrieved,
        "source": {
            "name": "CelesTrak",
            "url": "https://celestrak.org/NORAD/elements/gp.php",
            "attribution": "CelesTrak general perturbations (GP) orbital elements. Visitors do not query CelesTrak.",
        },
        "stale": False,
        "lastSuccessAt": retrieved,
        "error": None,
        "objects": objects,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    write_status(True, retrieved, len(objects), None, False)
    print(f"wrote {SNAPSHOT} ({len(objects)} objects)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
