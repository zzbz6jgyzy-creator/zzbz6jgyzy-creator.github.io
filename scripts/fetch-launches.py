#!/usr/bin/env python3
"""Pull every upcoming SpaceX launch from Launch Library 2 into data/launches.json.

The site's countdowns (home page + calendar) read this file first, so every
launch shows up without a hand-curated list. LL2 is free but rate-limited
(15 req/hour), so only this job calls it; on failure the last file is kept.
"""
import json, sys, urllib.request, datetime, os

URL = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?lsp__name=SpaceX&limit=40&mode=normal"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "launches.json")
KEEP = ("id", "name", "net", "window_start", "window_end", "url")

# Drop launches that are scrubbed/on hold, or whose timed NET passed >30 min ago
# without lifting off (LL2 still lists them until it sets a new date). They come
# back on their own once LL2 gives a new NET with a Go/TBC status.
def skip_launch(x, now):
    st = (x.get("status") or {}).get("abbrev") or ""
    prec = (x.get("net_precision") or {}).get("abbrev") or ""
    timed = prec in ("SEC", "MIN", "")
    if st == "Hold" or (st == "TBD" and timed):
        return True
    try:
        t = datetime.datetime.fromisoformat(str(x.get("net")).replace("Z", "+00:00"))
    except Exception:
        return False
    return timed and st not in ("In Flight", "Success") and now - t > datetime.timedelta(minutes=30)

def main():
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "superchargeddaily.com launch refresh"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
    except Exception as e:
        print("LL2 fetch failed, keeping previous file:", e)
        return 0
    rows = []
    now = datetime.datetime.now(datetime.timezone.utc)
    for x in data.get("results") or []:
        if skip_launch(x, now):
            continue
        row = {k: x.get(k) for k in KEEP}
        row["status"] = {k: (x.get("status") or {}).get(k) for k in ("name", "abbrev")}
        np = x.get("net_precision") or {}
        row["net_precision"] = {"name": np.get("name"), "abbrev": np.get("abbrev")}
        pad = x.get("pad") or {}
        row["pad"] = {"name": pad.get("name"), "location": {"name": (pad.get("location") or {}).get("name")}}
        rows.append(row)
    if not rows:
        print("LL2 returned no rows, keeping previous file"); return 0
    out = {
        "_about": "Upcoming SpaceX launches from Launch Library 2 (ll.thespacedevs.com), refreshed by .github/workflows/launches-refresh.yml. Do not hand-edit.",
        "source": "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?lsp__name=SpaceX",
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "results": rows,
    }
    old = None
    try:
        old = json.load(open(OUT))
    except Exception:
        pass
    if old and old.get("results") == rows:
        print("No launch change"); return 0
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False); f.write("\n")
    print(f"Wrote {len(rows)} launches")
    return 0

if __name__ == "__main__":
    sys.exit(main())
