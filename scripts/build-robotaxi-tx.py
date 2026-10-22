#!/usr/bin/env python3
"""Snapshot Tesla's Texas autonomous-vehicle registrations, split Cybercab vs Model Y.

Source: FSD Database "Texas Robotaxi Database" (mirrors the TxDMV AV registry).
Model is decided by VIN prefix: 5YJAJ = Cybercab, 7SAY = Model Y.
Appends one point per UTC day to data/robotaxi-tx.json and records each VIN's
first-seen date, so weekly and 30-day deltas come from real history.
"""
import json, re, sys, urllib.request, datetime, pathlib

URL = "https://fsddb.com/robotaxi?operator=tesla-robotaxi-llc"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "robotaxi-tx.json"

def main():
    req = urllib.request.Request(URL, headers={"User-Agent": "SuperchargedDaily/1.0 (+https://superchargeddaily.com)"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    vins = sorted(set(re.findall(r'class="rt-vin">([A-HJ-NPR-Z0-9]{17})<', html)))
    cc = [v for v in vins if v.startswith("5YJAJ")]
    my = [v for v in vins if v.startswith("7SAY")]
    if len(vins) < 100 or not cc or not my:
        print(f"Registry response not accepted: {len(vins)} VINs, {len(cc)} Cybercabs, {len(my)} Model Ys; leaving data untouched", file=sys.stderr)
        return 1
    data = json.loads(OUT.read_text()) if OUT.exists() else {"history": [], "vins": {}}
    now = datetime.datetime.now(datetime.timezone.utc)
    day = now.date().isoformat()
    for v in vins:
        data["vins"].setdefault(v, day)
    point = {"date": day, "cybercab": len(cc), "modelY": len(my), "other": len(vins) - len(cc) - len(my), "src": URL}
    hist = [h for h in data["history"] if h["date"] != day]
    hist.append(point)
    hist.sort(key=lambda h: h["date"])
    data["history"] = hist
    data["source"] = {"name": "Texas Robotaxi Database (FSD Database, mirrors TxDMV)", "url": URL}
    data["checked"] = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    OUT.write_text(json.dumps(data, indent=1, sort_keys=False) + "\n")
    print(f"{day}: Cybercab {len(cc)}, Model Y {len(my)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
