#!/usr/bin/env python3
"""Ping IndexNow (Bing, Yandex, etc.) with changed URLs.
Usage: indexnow-ping.py [--all] [--since REF]
Default: pages changed between REF (default HEAD~1) and HEAD. Never exits non-zero."""
import json, re, subprocess, sys, urllib.request
HOST = "superchargeddaily.com"
KEY = "90c625f4cef3c2c28ae55a9bbc2062a4"
BASE = "https://" + HOST
UA = {"User-Agent": "Mozilla/5.0 (compatible; SuperchargedDaily-IndexNow/1.0)"}
def sitemap_urls():
    xml = urllib.request.urlopen(urllib.request.Request(BASE + "/sitemap.xml", headers=UA), timeout=30).read().decode()
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
def changed_urls(ref):
    out = subprocess.run(["git", "diff", "--name-only", "--diff-filter=AM", ref, "HEAD"],
                         capture_output=True, text=True).stdout.split()
    urls = []
    for f in out:
        if not f.endswith(".html") or f == "404.html" or f.startswith((".", "scripts/")):
            continue
        urls.append(BASE + "/" if f == "index.html" else BASE + "/" + f)
    return urls
def main():
    a = sys.argv[1:]
    if "--all" in a:
        urls = sitemap_urls()
    else:
        ref = a[a.index("--since") + 1] if "--since" in a else "HEAD~1"
        if set(ref) <= {"0"}: ref = "HEAD~1"
        urls = changed_urls(ref)
    urls = sorted(set(urls))[:10000]
    if not urls:
        print("IndexNow: nothing to submit"); return
    body = json.dumps({"host": HOST, "key": KEY, "keyLocation": f"{BASE}/{KEY}.txt",
                       "urlList": urls}).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
                                 headers={"Content-Type": "application/json; charset=utf-8", **UA})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        print(f"IndexNow: HTTP {r.status} for {len(urls)} URLs")
    except urllib.error.HTTPError as e:
        print(f"IndexNow: HTTP {e.code} {e.read()[:300]!r}")
if __name__ == "__main__":
    try: main()
    except Exception as e: print("IndexNow ping failed:", e)
