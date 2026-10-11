#!/usr/bin/env python3
"""Build an equirectangular 1000×500 country-path SVG from Natural Earth 110m."""

from __future__ import annotations

import json
import sys
from pathlib import Path

MAP_W = 1000
MAP_H = 500

# ISO_A2 is missing for a few 110m rows; pins still cover these two.
EXTRA = {
    "HK": (114.2, 22.3, 3.2, 2.4),
    "SG": (103.8, 1.35, 2.8, 2.1),
}


def iso_code(props: dict) -> str | None:
    for key in ("ISO_A2", "ISO_A2_EH"):
        value = str(props.get(key) or "").strip().upper()
        if len(value) == 2 and value.isalpha():
            return value
    return None


def project(lon: float, lat: float) -> tuple[float, float]:
    lon = max(-180.0, min(180.0, float(lon)))
    lat = max(-90.0, min(90.0, float(lat)))
    return (lon + 180.0) * (MAP_W / 360.0), (90.0 - lat) * (MAP_H / 180.0)


def rings_from_geom(geom: dict) -> list[list[list[float]]]:
    kind = geom.get("type")
    coords = geom.get("coordinates") or []
    if kind == "Polygon":
        return coords
    if kind == "MultiPolygon":
        out = []
        for poly in coords:
            out.extend(poly)
        return out
    return []


def path_from_ring(ring: list) -> str:
    if len(ring) < 3:
        return ""
    parts: list[str] = []
    prev_lon = None
    started = False
    for point in ring:
        lon, lat = point[0], point[1]
        if prev_lon is not None and abs(lon - prev_lon) > 180:
            started = False
        x, y = project(lon, lat)
        cmd = "M" if not started else "L"
        parts.append(f"{cmd}{x:.1f} {y:.1f}")
        started = True
        prev_lon = lon
    if len(parts) < 3:
        return ""
    parts.append("Z")
    return "".join(parts)


def box_path(lon: float, lat: float, w: float, h: float) -> str:
    x, y = project(lon, lat)
    return f"M{x - w:.1f} {y - h:.1f}h{w * 2:.1f}v{h * 2:.1f}h{-w * 2:.1f}Z"


def main() -> int:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ne_110m_admin_0_countries.geojson")
    dest = Path(sys.argv[2] if len(sys.argv) > 2 else "assets/world-countries.svg")
    data = json.loads(src.read_text())
    paths: list[tuple[str, str]] = []
    seen: set[str] = set()
    for feat in data.get("features") or []:
        code = iso_code(feat.get("properties") or {})
        if not code or code in seen:
            continue
        d = "".join(path_from_ring(ring) for ring in rings_from_geom(feat.get("geometry") or {}))
        if not d:
            continue
        seen.add(code)
        paths.append((code, d))
    for code, (lon, lat, w, h) in EXTRA.items():
        if code not in seen:
            paths.append((code, box_path(lon, lat, w, h)))
            seen.add(code)
    paths.sort()
    body = "".join(
        f'<path data-code="{code}" d="{d}"/>'
        for code, d in paths
    )
    dest.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" aria-hidden="true">'
        "<!-- Natural Earth 110m admin-0, public domain. Equirectangular 1000×500. -->"
        f"{body}</svg>\n"
    )
    print(f"wrote {dest} ({dest.stat().st_size} bytes, {len(paths)} countries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
