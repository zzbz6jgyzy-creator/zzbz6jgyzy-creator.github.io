#!/usr/bin/env python3
"""Build assets/europe-fsd-v2.svg (900x780) from Natural Earth 1:50m admin-0 countries.

Natural Earth is public domain (https://www.naturalearthdata.com/about/terms-of-use/).
Usage: python3 scripts/build-europe-map.py ne_50m_admin_0_countries.geojson
Source file: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
"""
import json, math, sys
from pathlib import Path

EU = set("AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK".split())
W, H, PAD = 900, 780, 18
LON0, LAT0 = math.radians(10), math.radians(52)
BOX = (-32, 30, 50, 75)  # lon/lat window for rings worth drawing
FIT = (-10.5, 34.4, 34.8, 70.2)  # EU-27 extent the view is fitted to

def laea(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    k = math.sqrt(2 / (1 + math.sin(LAT0) * math.sin(p) + math.cos(LAT0) * math.cos(p) * math.cos(l - LON0)))
    return k * math.cos(p) * math.sin(l - LON0), k * (math.cos(LAT0) * math.sin(p) - math.sin(LAT0) * math.cos(p) * math.cos(l - LON0))

def code(pr):
    for k in ("ISO_A2_EH", "ISO_A2"):
        v = str(pr.get(k) or "").upper()
        if len(v) == 2 and v.isalpha(): return v
    return None

feats = json.load(open(sys.argv[1]))["features"]
# fit
pts = [laea(lo, la) for lo in (FIT[0], FIT[2], 10) for la in (FIT[1], FIT[3], 50)]
xs, ys = [p[0] for p in pts], [p[1] for p in pts]
s = min((W - 2 * PAD) / (max(xs) - min(xs)), (H - 2 * PAD) / (max(ys) - min(ys)))
ox, oy = (W - s * (max(xs) - min(xs))) / 2 - s * min(xs), (H - s * (max(ys) - min(ys))) / 2 + s * max(ys)
P = lambda lo, la: (lambda x, y: (ox + s * x, oy - s * y))(*laea(lo, la))

out = []
for f in feats:
    c = code(f["properties"]); g = f["geometry"]
    if not c or not g: continue
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    d, best = [], (0, None)
    for poly in polys:
        for i, ring in enumerate(poly):
            if not any(BOX[0] <= lo <= BOX[2] and BOX[1] <= la <= BOX[3] for lo, la in ring): continue
            if c == "FR" and not all(lo > -10 and la > 35 for lo, la in ring[:3]): continue
            xy, last = [], None
            for lo, la in ring:
                p = (round(P(lo, la)[0]), round(P(lo, la)[1]))
                if last is None or abs(p[0]-last[0]) + abs(p[1]-last[1]) >= 1.2: xy.append(p); last = p
            if len(xy) < 3: continue
            d.append("M" + "L".join(f"{x:g} {y:g}" for x, y in xy) + "Z")
            if i == 0:
                a = sum(xy[j][0] * xy[j - 1][1] - xy[j - 1][0] * xy[j][1] for j in range(len(xy))) / 2
                if abs(a) > best[0]:
                    cx = sum(p[0] for p in xy) / len(xy); cy = sum(p[1] for p in xy) / len(xy)
                    best = (abs(a), (round(cx, 1), round(cy, 1)))
    if not d: continue
    eu = c in EU
    cx, cy = best[1] or (0, 0)
    attrs = f'class="m-c{" is-eu" if eu else ""}" data-code="{c}"' + (f' data-cx="{cx}" data-cy="{cy}"' if eu else "")
    out.append(f'<path {attrs} d="{"".join(d)}"/>')
out.sort(key=lambda t: 'is-eu' in t)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" aria-hidden="true"><!-- Natural Earth 1:50m admin-0, public domain. Built by scripts/build-europe-map.py -->' + "".join(out) + "</svg>"
Path(__file__).resolve().parent.parent.joinpath("assets/europe-fsd-v2.svg").write_text(svg)
print(len(out), "shapes,", len(svg) // 1024, "KB")
