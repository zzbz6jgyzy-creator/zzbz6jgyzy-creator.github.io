#!/usr/bin/env python3
"""Check public primary-source pages. Never changes a country's approval/availability facts."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
UA = 'SuperchargedDaily-source-check/1.0 (+https://superchargeddaily.com/fsd-europe.html)'
LIMIT = 2 * 1024 * 1024


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.main = 0
        self.parts = []
        self.main_parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ['script', 'style', 'nav', 'header', 'footer']:
            self.hidden += 1
        if tag in ['main', 'article']:
            self.main += 1

    def handle_endtag(self, tag):
        if tag in ['script', 'style', 'nav', 'header', 'footer']:
            self.hidden = max(0, self.hidden - 1)
        if tag in ['main', 'article']:
            self.main = max(0, self.main - 1)

    def handle_data(self, value):
        if not self.hidden and value.strip():
            self.parts.append(value)
            if self.main:
                self.main_parts.append(value)


def fingerprint(body, content_type):
    if 'pdf' in content_type:
        if not body.startswith(b'%PDF'):
            raise ValueError('Invalid PDF response')
        return hashlib.sha256(body).hexdigest()
    if not any(t in content_type for t in ['html', 'text/plain']):
        raise ValueError('Unsupported source content type')
    parser = Text()
    parser.feed(body.decode('utf-8', 'replace'))
    text = re.sub(r'\s+', ' ', ' '.join(parser.main_parts or parser.parts)).strip()
    if len(text) < 200 or any(x in text.lower() for x in ['verify you are human', 'checking your browser before accessing', 'just a moment...']):
        raise ValueError('Source text unavailable or a challenge page')
    return hashlib.sha256(text.encode()).hexdigest()


def fetch(source):
    req = urllib.request.Request(source['url'], headers={'User-Agent': UA, 'Accept': 'text/html,application/pdf;q=0.9'})
    with urllib.request.urlopen(req, timeout=25) as response:
        if response.status != 200:
            raise ValueError('HTTP ' + str(response.status))
        body = response.read(LIMIT + 1)
        if len(body) > LIMIT:
            raise ValueError('Source exceeds the bounded response size')
        if not response.url.startswith('https://'):
            raise ValueError('Source redirected away from HTTPS')
        return body, response.headers.get('Content-Type', '')


def check_one(source, previous, now, fetcher=fetch):
    result = {**previous, 'id': source['id'], 'url': source['url'], 'lastAttemptAt': now}
    try:
        body, content_type = fetcher(source)
        digest = fingerprint(body, content_type)
        baseline = previous.get('baselineHash') or digest
        trusted = previous.get('reviewedHash') or baseline
        result.update(state='ok', baselineHash=baseline, observedHash=digest, lastSuccessAt=now,
                      pendingReview=digest != trusted, error=None)
        if digest != trusted:
            result['firstChangedAt'] = previous.get('firstChangedAt') or now
        else:
            result.pop('firstChangedAt', None)
    except Exception as exc:
        # Preserve the baseline, last success and any pending review. A failure is not a new fact.
        result.update(state='unavailable', error=str(exc)[:180])
    return result


def acknowledge(state, source_id, digest, now):
    if not re.fullmatch(r's-[a-f0-9]{12}', source_id) or not re.fullmatch(r'[a-f0-9]{64}', digest):
        raise ValueError('Invalid source ID or fingerprint')
    record = state.get('sources', {}).get(source_id)
    if not record or record.get('observedHash') != digest:
        raise ValueError('Only the current observed fingerprint can be acknowledged')
    record.update(reviewedHash=digest, sourceReviewAt=now, pendingReview=False)
    record.pop('firstChangedAt', None)
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ack', help='Mark a source-content change reviewed; does not change country facts')
    parser.add_argument('--hash', dest='digest')
    args = parser.parse_args()
    path = ROOT / 'data/fsd-europe-source-checks.json'
    try:
        state = json.loads(path.read_text())
    except FileNotFoundError:
        state = {'schemaVersion': 1, 'sources': {}}
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    if args.ack:
        acknowledge(state, args.ack, args.digest or '', now)
    else:
        data = json.loads((ROOT / 'data/fsd-europe.json').read_text())
        sources = [s for s in data['sources'] if s['type'] in ['authority', 'manufacturer']]
        def check(source):
            if not source['url'].startswith('https://'):
                raise ValueError('Only HTTPS public sources are supported')
            return check_one(source, state['sources'].get(source['id'], {}), now)
        with ThreadPoolExecutor(max_workers=4) as pool:
            records = list(pool.map(check, sources))
        for record in records:
            state['sources'][record['id']] = record
    state['updated'] = now
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)
    pending = sum(bool(s.get('pendingReview')) for s in state['sources'].values())
    failures = sum(s.get('state') != 'ok' for s in state['sources'].values())
    print(f'Source checks: {len(state["sources"])} retained, {pending} content changes for review, {failures} unavailable. Country facts were not changed.')


if __name__ == '__main__':
    main()
