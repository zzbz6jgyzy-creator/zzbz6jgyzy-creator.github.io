#!/usr/bin/env python3
"""Extra software-tracker data -> data/updates-extras.json
  teslafi: fleet share + pending installs per build (TeslaFi public firmware page)
  recent:  latest individual cars updating (Teslascope public /software page)
Each part is kept from the previous file if its source fails or blocks us.
--skip-teslafi refreshes only the Teslascope feed."""
import html, json, re, sys, urllib.request, datetime as dt
OUT = "data/updates-extras.json"
UA = "Mozilla/5.0 (compatible; ALJR86-updates/1.0; +https://superchargeddaily.com/updates.html)"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=30) as r: return r.read().decode("utf-8", "ignore")
clean = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
try: prev = json.load(open(OUT))
except Exception: prev = {}
out = {"updated": now, "teslafi": prev.get("teslafi"), "recent": prev.get("recent")}

def teslafi():
    s = get("https://www.teslafi.com/firmware.php")
    i = s.find("Pending Installs"); body = s[i:s.find("</tbody>", i)]
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", body, re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(tds) < 4: continue
        m = re.search(r">(\d{4}\.\d+(?:\.\d+)*)</a>", tds[0])
        if not m: continue
        num = lambda x: int(re.sub(r"\D", "", clean(x)) or 0)
        pct = clean(tds[2]).rstrip("%")
        rows.append({"id": m.group(1), "installs": num(tds[1]), "percent": float(pct) if pct else 0.0, "pending": num(tds[3])})
    if len(rows) < 5: raise RuntimeError("TeslaFi table not found")
    return {"source": "TeslaFi", "sourceUrl": "https://www.teslafi.com/firmware", "fetched": now,
            "fleet": sum(r["installs"] for r in rows), "versions": rows[:80]}

def recent():
    s = get("https://teslascope.com/software")
    i = s.find('id="changes"'); body = s[s.find("<tbody>", i):s.find("</tbody>", i)]
    items = []
    for tr in re.findall(r"<tr>(.*?)</tr>", body, re.S):
        t = re.search(r'datetime="([^"]+)"', tr)
        cells = {k: clean(v) for k, v in re.findall(r'data-label="([^"]+)"[^>]*>(.*?)</td>', tr, re.S)}
        if not t or not cells.get("New Version"): continue
        when = dt.datetime.fromisoformat(t.group(1)).astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        items.append({"t": when, "to": cells.get("New Version"), "from": cells.get("Previous Version"),
                      "model": cells.get("Model", "").replace("( ", "(").replace(" )", ")"), "hw": cells.get("HW"), "country": cells.get("Country")})
    if not items: raise RuntimeError("Teslascope feed not found")
    return {"source": "Teslascope", "sourceUrl": "https://teslascope.com/software", "fetched": now, "items": items[:12]}

ok = True
if "--skip-teslafi" not in sys.argv:
    try: out["teslafi"] = teslafi()
    except Exception as e: print("teslafi failed:", e); ok = False
try: out["recent"] = recent()
except Exception as e: print("recent failed:", e); ok = False
json.dump(out, open(OUT, "w"), indent=1)
print(OUT, "teslafi", len((out["teslafi"] or {}).get("versions", [])), "recent", len((out["recent"] or {}).get("items", [])))
