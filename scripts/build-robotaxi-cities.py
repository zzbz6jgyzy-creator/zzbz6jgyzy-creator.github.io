#!/usr/bin/env python3
"""Tesla Robotaxi service areas (geofences) + per-state fleet figures.

Geofences: Robotaxi-Tracker/robotaxi-service-areas (CC BY 4.0), boundaries taken from the
Tesla Robotaxi app's fleet areas. Writes data/robotaxi-areas.geojson and keeps
data/robotaxi-areas-history.json, which logs every area change (sq mi) with the
date it was first seen here. Expansion history before Oct 2026 is seeded from
robotracker.app/updates.

Fleet: Platform Aeronaut AV Tracker state table (California, Florida rows, each
with its own upstream source). Texas comes from data/robotaxi-tx.json (TxDMV).
Writes data/robotaxi-fleet.json. On any fetch/parse failure the old file stays.
"""
import json, re, sys, math, hashlib, datetime, pathlib, urllib.request, html as H

ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
REPO = "Robotaxi-Tracker/robotaxi-service-areas"
RAW = f"https://raw.githubusercontent.com/{REPO}/main/areas/tesla/{{slug}}/{{f}}"
TREE = f"https://api.github.com/repos/{REPO}/git/trees/main?recursive=1"
PA = "https://avrideshare.platformaeronaut.com/tracker/tesla-robotaxi"
UA = {"User-Agent": "SuperchargedDaily/1.0 (+https://superchargeddaily.com)"}
NOW = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
TODAY = NOW.date().isoformat()
STAMP = NOW.isoformat().replace("+00:00", "Z")

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8", "replace")

def ring_area(ring):  # sq mi, local equirectangular; fine at city scale
    R = 3958.8
    lat0 = math.radians(sum(p[1] for p in ring) / len(ring))
    pts = [(math.radians(x) * R * math.cos(lat0), math.radians(y) * R) for x, y in ring]
    return abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2

def geom_area(g):
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return sum(ring_area(p[0]) - sum(ring_area(h) for h in p[1:]) for p in polys)

def areas():
    tree_data = json.loads(get(TREE))
    tree = tree_data["tree"]
    revision = tree_data["sha"]
    raw = RAW.replace("/main/", "/" + revision + "/")
    slugs = sorted({p["path"].split("/")[2] for p in tree if re.match(r"areas/tesla/[^/]+/boundary\.geojson$", p["path"])})
    if not slugs:
        raise RuntimeError("no Tesla areas")
    hist_p = ROOT / "robotaxi-areas-history.json"
    hist = json.loads(hist_p.read_text())
    old_p = ROOT / "robotaxi-areas.geojson"
    old = {f["properties"]["slug"]: f for f in json.loads(old_p.read_text())["features"]} if old_p.exists() else {}
    feats = []
    for slug in slugs:
        meta = json.loads(get(raw.format(slug=slug, f="meta.json")))
        b = json.loads(get(raw.format(slug=slug, f="boundary.geojson")))
        g = b.get("geometry") or b["features"][0]["geometry"]
        g["coordinates"] = json.loads(json.dumps(g["coordinates"]), parse_float=lambda s: round(float(s), 5))
        a = round(geom_area(g), 1)
        h = hashlib.sha1(json.dumps(g, sort_keys=True).encode()).hexdigest()[:12]
        c = hist["cities"].setdefault(slug, {"name": meta.get("name", slug), "log": []})
        prev = old.get(slug)
        if prev and prev["properties"]["hash"] != h:
            pa = prev["properties"]["areaSqMi"]
            kind = "expanded" if a > pa + 0.5 else "shrank" if a < pa - 0.5 else "reshaped"
            c["log"].append({"date": TODAY, "areaSqMi": a, "from": pa, "kind": kind, "src": f"https://github.com/{REPO}"})
            if kind == "expanded":
                c["lastExpanded"] = TODAY
            c["previous"] = prev["geometry"]
        elif not prev and not c["log"]:
            c["log"].append({"date": TODAY, "areaSqMi": a, "kind": "first seen", "src": f"https://github.com/{REPO}"})
        feats.append({"type": "Feature", "geometry": g, "properties": {
            "slug": slug, "name": (b.get("properties") or {}).get("name") or meta.get("name"),
            "areaSqMi": a, "hash": h, "center": [meta.get("centerLng"), meta.get("centerLat")]}})
    fc = {"type": "FeatureCollection", "source": {
        "name": "Robotaxi Tracker service areas, app-derived", "url": f"https://github.com/{REPO}",
        "licence": "CC BY 4.0", "licenceUrl": "https://creativecommons.org/licenses/by/4.0/", "revision": revision}, "checked": STAMP, "features": feats}
    old_p.write_text(json.dumps(fc, separators=(",", ":")) + "\n")
    hist["checked"] = STAMP
    hist_p.write_text(json.dumps(hist, indent=1) + "\n")
    print("areas:", ", ".join(f"{f['properties']['slug']} {f['properties']['areaSqMi']}" for f in feats))

def fleet():
    t = get(PA)
    i = t.find("State markets")
    rows = {}
    for r in re.findall(r"<tr.*?</tr>", t[i:i + 20000], re.S):
        cells = [re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", c))).strip() for c in re.findall(r"<td.*?</td>", r, re.S)]
        links = [l for l in re.findall(r'href="(https?://[^"]+)"', r)]
        if len(cells) >= 4:
            m = re.match(r"([\d,]+)\s*(VIN|Est\.?)?", cells[1])
            if m:
                d = datetime.datetime.strptime(cells[2].strip(), "%b-%d-%Y").date().isoformat()
                rows[cells[0]] = {"count": int(m.group(1).replace(",", "")), "kind": "estimate" if (m.group(2) or "").startswith("Est") else "registered",
                                  "asOf": d, "note": cells[3].replace(" ↗", ""), "src": links[0] if links else PA}
    if "California" not in rows:
        raise RuntimeError("fleet table not found")
    tx = json.loads((ROOT / "robotaxi-tx.json").read_text())
    last = tx["history"][-1]
    out = {"checked": STAMP, "aggregator": {"name": "Platform Aeronaut AV Tracker", "url": PA},
           "states": {
               "Texas": {"count": last["modelY"], "kind": "registered", "asOf": last["date"], "src": tx["source"]["url"],
                         "note": "Model Y robotaxis on the TxDMV automated-vehicle registry (Cybercabs excluded). The registry has no city split."},
               **{k: v for k, v in rows.items() if k != "Texas"}}}
    prev = json.loads((ROOT / "robotaxi-fleet.json").read_text()) if (ROOT / "robotaxi-fleet.json").exists() else {}
    hist = [h for h in prev.get("history", []) if h["date"] != TODAY]
    hist.append({"date": TODAY, **{k: {"count": v["count"], "asOf": v["asOf"]} for k, v in out["states"].items()}})
    out["history"] = sorted(hist, key=lambda h: h["date"])
    (ROOT / "robotaxi-fleet.json").write_text(json.dumps(out, indent=1) + "\n")
    print("fleet:", {k: v["count"] for k, v in out["states"].items()})

if __name__ == "__main__":
    rc = 0
    for fn in (areas, fleet):
        try:
            fn()
        except Exception as e:
            print(f"{fn.__name__} skipped: {e}", file=sys.stderr)
    sys.exit(rc)
