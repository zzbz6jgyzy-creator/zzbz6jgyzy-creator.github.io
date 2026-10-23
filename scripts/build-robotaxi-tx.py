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
    html = urllib.request.urlopen(req, timeout=30).read(2_000_001).decode("utf-8", "replace")
    if len(html) > 2_000_000:
        raise ValueError("Registry response exceeds the bounded size")
    vins = sorted(set(re.findall(r'class="rt-vin">([A-HJ-NPR-Z0-9]{17})<', html)))
    cc = [v for v in vins if v.startswith("5YJAJ")]
    my = [v for v in vins if v.startswith("7SAY")]
    if len(vins) < 100 or not cc or not my:
        print(f"Registry response not accepted: {len(vins)} VINs, {len(cc)} Cybercabs, {len(my)} Model Ys; leaving data untouched", file=sys.stderr)
        return 1
    declared = re.search(r'class="rt-fleet-title">([\d,]+) registered VINs', html)
    if not declared or int(declared.group(1).replace(',', '')) != len(vins):
        raise ValueError("Registry VIN list does not match the declared complete fleet count")
    if "Tesla Robotaxi" not in html:
        raise ValueError("Registry operator identity missing")
    data = json.loads(OUT.read_text()) if OUT.exists() else {"history": [], "vins": {}}
    now = datetime.datetime.now(datetime.timezone.utc)
    day = now.date().isoformat()
    for v in vins:
        data["vins"].setdefault(v, day)
    previous = data["history"][-1] if data["history"] else None
    observations = data.get("observations", [])
    if previous and data.get("checked") and not observations:
        observations.append({"at": data["checked"], **previous})
    point = {"date": day, "cybercab": len(cc), "modelY": len(my), "other": len(vins) - len(cc) - len(my), "src": URL}
    hist = [h for h in data["history"] if h["date"] != day]
    hist.append(point)
    hist.sort(key=lambda h: h["date"])
    data["history"] = hist
    observations.append({"at": now.replace(microsecond=0).isoformat().replace("+00:00", "Z"), **point})
    data["observations"] = observations[-1000:]
    data["source"] = {"name": "Texas Robotaxi Database (FSD Database, mirrors TxDMV)", "url": URL}
    data["checked"] = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    temporary = OUT.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, indent=1, sort_keys=False) + "\n")
    temporary.replace(OUT)
    print(f"{day}: Cybercab {len(cc)}, Model Y {len(my)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
