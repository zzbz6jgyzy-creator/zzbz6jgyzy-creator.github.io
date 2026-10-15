#!/usr/bin/env python3
"""Bake Starlink GP + GCAT hardware versions into starlink-gp.js.

Sources (not committed):
  CelesTrak TLE  — real 5-digit catalog orbits
  Satvisor JSON  — CelesTrak mirror, 6-digit catalog numbers
  GCAT satcat    — Jonathan McDowell bus / generation, CC BY 4.0
"""
from __future__ import annotations

import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "starlink-gp.js"
GENS = ["v10", "v15", "v2m", "v2opt", "v2dtc", "v3"]
GEN_I = {g: i for i, g in enumerate(GENS)}


def parse_gcat(path: Path) -> dict[int, str]:
    header = None
    out: dict[int, str] = {}
    with path.open(encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith("#") and "JCAT" in line[:8]:
                header = line.lstrip("#").strip().split("\t")
                continue
            if line.startswith("#") or not line.strip() or not header:
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < len(header):
                parts += [""] * (len(header) - len(parts))
            rec = dict(zip(header, parts))
            bus = (rec.get("Bus") or "").strip()
            name = (rec.get("Name") or "").strip()
            pln = (rec.get("PLName") or "").strip()
            status = (rec.get("Status") or "").strip()
            if status != "O":
                continue
            blob = f"{bus} {name} {pln}"
            if "Starshield" in blob:
                continue
            try:
                cat = int((rec.get("Satcat") or "").strip())
            except ValueError:
                continue
            gen = classify(bus, name, pln)
            if gen:
                out[cat] = gen
    return out


def classify(bus: str, name: str, pln: str) -> str | None:
    if bus == "Starlink V3":
        return "v3"
    if bus == "Starlink V2MD":
        return "v2dtc"
    if bus == "Starlink V2MO":
        return "v2opt"
    if bus == "Starlink V2M":
        return "v2m"
    if "Starshield" in pln or "Starshield" in name:
        return None
    if "V0.9" in pln or "Tintin" in name or bus == "SpXMicro":
        return None
    if "V1.0" in pln or "TSP" in pln:
        return "v10"
    if bus == "Starlink":
        return "v15"
    if "Starlink" in name or "STARLINK" in name:
        if "V3" in bus:
            return "v3"
        return "v2opt"
    return None


def parse_tle(path: Path) -> dict[int, tuple[str, str, str]]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    out: dict[int, tuple[str, str, str]] = {}
    i = 0
    while i < len(lines) - 1:
        a, b = lines[i], lines[i + 1]
        if a.startswith("1 ") and b.startswith("2 "):
            name = lines[i - 1].strip() if i else ""
            try:
                cat = int(a[2:7])
            except ValueError:
                i += 1
                continue
            out[cat] = (name, a.strip(), b.strip())
            i += 2
            continue
        i += 1
    return out


def parse_omm(path: Path) -> dict[int, dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    out = {}
    for row in data:
        try:
            cat = int(row["NORAD_CAT_ID"])
        except (KeyError, TypeError, ValueError):
            continue
        out[cat] = row
    return out


def _tle_checksum(line: str) -> str:
    total = 0
    for ch in line[:68]:
        if ch.isdigit():
            total += int(ch)
        elif ch == "-":
            total += 1
    return str(total % 10)


def _tle_exp(val: float) -> str:
    if val == 0:
        return " 00000-0"
    sign = "-" if val < 0 else " "
    av = abs(val)
    exp = int(math.floor(math.log10(av)))
    n = exp + 1
    mant = int(round(av / (10**n) * 1e5))
    if mant >= 100000:
        mant = 10000
        n += 1
    return f"{sign}{mant:05d}{n:+d}".replace("+", "+") if False else f"{sign}{mant:05d}{'-' if n < 0 else '+'}{abs(n)}"


def omm_to_tle(row: dict) -> tuple[str, str]:
    cat = int(row["NORAD_CAT_ID"]) % 100000
    epoch = str(row.get("EPOCH") or "")
    dt = datetime.fromisoformat(epoch.replace("Z", "+00:00")).astimezone(timezone.utc)
    yy = dt.year % 100
    doy = (dt - datetime(dt.year, 1, 1, tzinfo=timezone.utc)).total_seconds() / 86400 + 1
    ndot = float(row.get("MEAN_MOTION_DOT") or 0)
    nddot = float(row.get("MEAN_MOTION_DDOT") or 0)
    bstar = float(row.get("BSTAR") or 0)
    inc = float(row["INCLINATION"])
    raan = float(row["RA_OF_ASC_NODE"])
    ecc = float(row["ECCENTRICITY"])
    aop = float(row["ARG_OF_PERICENTER"])
    ma = float(row["MEAN_ANOMALY"])
    n = float(row["MEAN_MOTION"])
    rev = int(float(row.get("REV_AT_EPOCH") or 0)) % 100000
    ndot_s = f"{ndot:10.8f}"
    if ndot_s.startswith(" 0"):
        ndot_s = " " + ndot_s[2:]
    elif ndot_s.startswith("-0"):
        ndot_s = "-" + ndot_s[2:]
    ndot_s = ndot_s[:10].ljust(10)
    l1 = f"1 {cat:05d}U 00000A   {yy:02d}{doy:012.8f} {ndot_s} {_tle_exp(nddot)} {_tle_exp(bstar)} 0  999"
    l1 = f"{l1[:68]:<68}"[:68] + _tle_checksum(l1[:68].ljust(68))
    ecc_s = f"{ecc:.7f}".split(".")[1]
    l2 = f"2 {cat:05d} {inc:8.4f} {raan:8.4f} {ecc_s} {aop:8.4f} {ma:8.4f} {n:11.8f}{rev:5d}"
    l2 = f"{l2[:68]:<68}"[:68] + _tle_checksum(l2[:68].ljust(68))
    return l1, l2


SRC = {
    "gcat": "https://planet4589.org/space/gcat/tsv/cat/satcat.tsv",
    "gcat100k": "https://planet4589.org/space/gcat/tsv/cat/satcat100k.tsv",
    "tle": "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
    "omm": "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json",
}


def fetch(url: str, dest: Path, min_size: int = 10000) -> Path:
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "superchargeddaily.com starlink tracker (daily)"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
    except Exception as exc:
        raise SystemExit(f"download failed for {url}: {exc}")
    if len(data) < min_size:
        raise SystemExit(f"suspiciously small download from {url}: {len(data)} bytes")
    dest.write_bytes(data)
    return dest


def main() -> None:
    import tempfile
    tmp = Path(tempfile.mkdtemp(prefix="starlink-gp-"))
    gcat = parse_gcat(fetch(SRC["gcat"], tmp / "satcat.tsv"))
    gcat.update(parse_gcat(fetch(SRC["gcat100k"], tmp / "satcat100k.tsv")))
    tle = parse_tle(fetch(SRC["tle"], tmp / "starlink.tle"))
    omm = parse_omm(fetch(SRC["omm"], tmp / "starlink.json"))
    # Starlinks GCAT lists as in orbit but missing from CelesTrak's Starlink group
    # (e.g. Starship-launched V3s): fetch them by launch designator.
    tags = {}
    for name in ("satcat.tsv", "satcat100k.tsv"):
        for line in (tmp / name).read_text(encoding="utf-8", errors="replace").splitlines():
            parts = line.split("\t")
            if len(parts) > 2 and parts[1].strip().isdigit():
                tags[int(parts[1])] = parts[2].strip()
    missing = sorted({tags[c] for c in gcat if c not in tle and c not in omm and c in tags})
    extra_rows = []
    for tag in missing[:12]:
        try:
            fetch(f"https://celestrak.org/NORAD/elements/gp.php?INTDES={tag}&FORMAT=json", tmp / "x.json", 2)
            extra_rows += json.loads((tmp / "x.json").read_text())
        except (Exception, SystemExit) as exc:
            print(f"skip {tag}: {exc}")
    for row in extra_rows:
        try:
            c = int(row["NORAD_CAT_ID"])
        except (KeyError, TypeError, ValueError):
            continue
        if c in gcat and c not in tle:
            omm[c] = row
    print(f"extra launches fetched: {missing[:12]} -> {len(extra_rows)} rows")
    if len(tle) < 5000 or len(gcat) < 5000:
        raise SystemExit(f"too few records (tle={len(tle)} gcat={len(gcat)}); not overwriting")
    epochs = [str(r.get("EPOCH") or "") for r in omm.values()]
    tle_as_of = max(epochs)[:10] if epochs else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    extra_path = Path("/tmp/extra-omm.json")
    if extra_path.exists():
        for row in json.loads(extra_path.read_text(encoding="utf-8")):
            try:
                cat = int(row["NORAD_CAT_ID"])
            except (KeyError, TypeError, ValueError):
                continue
            omm[cat] = row

    tle_sats = []
    gens = Counter()
    seen = set()

    for cat, (name, l1, l2) in tle.items():
        gen = gcat.get(cat)
        if not gen:
            if cat in gcat:
                continue
            gen = "v2opt"
        tle_sats.append([GEN_I[gen], l1, l2])
        gens[gen] += 1
        seen.add(cat)

    for cat, row in omm.items():
        if cat in seen or cat < 100000:
            continue
        name = str(row.get("OBJECT_NAME") or "")
        if not name.upper().startswith("STARLINK"):
            continue
        gen = gcat.get(cat) or "v2opt"
        try:
            l1, l2 = omm_to_tle(row)
        except Exception:
            continue
        tle_sats.append([GEN_I[gen], l1, l2])
        gens[gen] += 1
        seen.add(cat)

    payload = {
        "asOf": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "tleAsOf": tle_as_of,
        "gens": GENS,
        "counts": {g: gens[g] for g in GENS},
        "total": len(tle_sats),
        "sources": {
            "orbits": "CelesTrak GP, Starlink group (TLE + JSON)",
            "buses": "Jonathan McDowell, GCAT, CC BY 4.0, https://planet4589.org/space/gcat",
        },
        "tle": tle_sats,
    }
    text = "window.STARLINK_GP = " + json.dumps(payload, separators=(",", ":")) + ";\n"
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes) total={payload['total']} gens={dict(gens)}")


if __name__ == "__main__":
    main()
