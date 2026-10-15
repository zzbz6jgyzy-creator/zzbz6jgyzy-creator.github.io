#!/usr/bin/env python3
"""List dead X/Twitter post links across dispatch/*.html (manual run; not scheduled).
Uses X's public oEmbed endpoint: 404 = deleted/unavailable post."""
import pathlib, re, sys, urllib.request, urllib.error, urllib.parse
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAT = re.compile(r'https?://(?:www\.)?(?:x|twitter)\.com/(\w+)/status/(\d+)')
links = {}
for f in sorted((ROOT / 'dispatch').glob('*.html')):
    for m in PAT.finditer(f.read_text(errors='ignore')):
        links.setdefault(m.group(0), set()).add(f.name)
dead = 0
for url, files in sorted(links.items()):
    q = 'https://publish.twitter.com/oembed?omit_script=1&url=' + urllib.parse.quote(url, safe='')
    try:
        urllib.request.urlopen(urllib.request.Request(q, headers={'User-Agent': 'check-x-links'}), timeout=15)
        status = 'ok'
    except urllib.error.HTTPError as e:
        status = 'DEAD' if e.code in (404, 403, 410) else f'http {e.code}'
    except Exception as e:
        status = f'error {e}'
    if status != 'ok':
        dead += status == 'DEAD'
        print(f'{status}\t{url}\t{", ".join(sorted(files))}')
print(f'{len(links)} links checked, {dead} dead', file=sys.stderr)
sys.exit(1 if dead else 0)
