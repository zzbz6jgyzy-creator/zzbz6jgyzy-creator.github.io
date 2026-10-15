#!/usr/bin/env python3
"""Build data/updates-history.json from the git history of updates-live.json.
Each committed snapshot (Teslascope, every ~30 min) becomes one point per version:
count of connected cars seen on that build and per-country counts. Real, automatable,
no extra scraping. Run in CI with actions/checkout fetch-depth: 0."""
import json, subprocess, sys
out = sys.argv[1] if len(sys.argv) > 1 else "data/updates-history.json"
revs = subprocess.run(["git","log","--format=%H %cI","--reverse","--","updates-live.json"],capture_output=True,text=True).stdout.split("\n")
snaps = []
for line in revs:
    if not line.strip(): continue
    h, t = line.split()
    try: d = json.loads(subprocess.run(["git","show",f"{h}:updates-live.json"],capture_output=True,text=True).stdout)
    except Exception: continue
    snaps.append({"t": d.get("updated") or t, "fleet": d.get("fleet"),
        "v": {v["id"]: [v.get("count",0), v.get("countryCounts") or {}] for v in d.get("versions",[])}})
# thin to one snapshot per ~3h to keep the file small, keep the last one
thin, last = [], None
for s in snaps:
    hr = s["t"][:13]
    key = hr[:11] + str(int(hr[11:13])//3)
    if key != last: thin.append(s); last = key
    else: thin[-1] = s
json.dump({"source":"Teslascope snapshots committed to updates-live.json","sourceUrl":"https://teslascope.com/software","snapshots":thin}, open(out,"w"), separators=(",",":"))
print(out, len(snaps), "->", len(thin))
