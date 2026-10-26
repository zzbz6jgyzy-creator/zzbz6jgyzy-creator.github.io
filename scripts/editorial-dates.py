"""Recover article revision dates from editorial content, not generated page furniture."""
import datetime
import functools
import hashlib
from html.parser import HTMLParser
import re
import subprocess

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
BLOCKS = [('seo:nav','/seo:nav'), ('seo:about','/seo:about'),
          ('related:start','related:end'), ('nl:start','nl:end'),
          ('sd:article-wayfinding','/sd:article-wayfinding'),
          ('seo:updated','/seo:updated'), ('seo:disclosure','/seo:disclosure'),
          ('seo:topic-stories','/seo:topic-stories'),
          ('seo:ld','/seo:ld')]
# Furniture-only commits must not move sitemap lastmod or dateModified.
BOT_SUBJECT = re.compile(
    r'^(Refresh today|Pre-render homepage|Refresh Tesla software|Refresh upcoming launches|'
    r'Sync current Starlink|Keep saved pages|SEO\b|Audit fixes:)',
    re.I,
)
# Data files whose git date is the honest lastmod for a tracker HTML shell.
TRACKER_SOURCES = {
    'starlink.html': ['data/starlink.json', 'starlink-live.js', 'data/starlink-history.json'],
    'fsd-europe.html': ['data/fsd-europe.json'],
    'cybercab.html': ['data/robotaxi-tx.json', 'data/robotaxi-evidence.json', 'data/mobility-snapshot.json'],
    'updates.html': ['updates-live.json', 'data/updates-history.json', 'data/updates-extras.json'],
    'starship.html': ['starship-data.js', 'data/starship-studio.json'],
    'see-the-launch.html': ['data/launches.json', 'data/launch-viewing.json'],
    'calendar.html': ['data/events.json', 'data/launches.json', 'data/calendar-studio.json'],
    'fsd.html': ['data/fsd-global.json', 'data/fsd-europe.json'],
    'promise-tracker.html': ['data/promises.json'],
    'production.html': ['data/production.json'],
    'tsla.html': ['data/markets-studio.json'],
    'autonomy.html': ['data/autonomy-evidence.json'],
    'my-tesla.html': ['data/my-tesla-epa.json'],
    'news.html': ['data/articles.json', 'news-data.json'],
}


class Editorial(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.stack = []; self.text = []; self.media = []; self.found = False
        for start, end in BLOCKS:
            source = re.sub(r'<!--\s*' + re.escape(start) + r'\s*-->.*?<!--\s*' + re.escape(end) + r'\s*-->', '', source, flags=re.S)
        # Restrict the signature to the actual article, excluding head/nav/footer.
        match = re.search(r'<article\b[^>]*>(.*?)</article>', source, re.S | re.I)
        if match:
            self.found = True
            self.feed(match.group(1))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        ignored = (self.stack and self.stack[-1][1]) or tag in {'script','style','nav'} or bool(set(attrs.get('class','').split()) & {'meta','article-meta','article-byline','sd-about','sd-desk','sd-article-tools','newsletter','sd-nl','nl-end','sd-band','related-stories'})
        if not ignored:
            if tag in {'p','h1','h2','h3','h4','li','td','th','blockquote','figcaption','br'}:
                self.text.append(' ')
            keys = {'a': ('href',), 'img': ('src','alt'), 'video': ('src','poster'),
                    'audio': ('src',), 'iframe': ('src','title')}.get(tag, ())
            if tag == 'source' and any(parent in {'video','audio'} for parent, _ in self.stack):
                keys = ('src','type')
            if keys:
                self.media.append((tag, tuple((key, attrs.get(key,'')) for key in keys)))
        if tag not in VOID:
            self.stack.append((tag, bool(ignored)))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
        if tag in {'p','h1','h2','h3','h4','li','td','th','blockquote','figcaption'}:
            self.text.append(' ')

    def handle_data(self, data):
        if not self.stack or not self.stack[-1][1]:
            self.text.append(data)


def signature(source):
    parsed = Editorial(source)
    if not parsed.found:
        return None
    content = (' '.join(''.join(parsed.text).split()), parsed.media)
    return hashlib.sha256(repr(content).encode()).hexdigest()


def timestamp(value):
    try:
        date = datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
        return date if date.tzinfo is not None else None
    except (ValueError, TypeError, AttributeError):
        return None


@functools.lru_cache(maxsize=None)
def revision_date(root, path, published, current_source):
    """Return a supported ISO date, or None when complete history is unavailable.

    Publication comes from the article registry. Later dates require a change in
    article text, citations or media. Generated navigation, related stories,
    newsletter/author/contents blocks and presentation attributes do not qualify.
    Uncommitted editorial changes have no supported timestamp yet.
    """
    initial = timestamp(published)
    if initial is None:
        return None
    def git(*args):
        return subprocess.run(['git', *args], cwd=root, capture_output=True)
    shallow = git('rev-parse','--is-shallow-repository')
    if shallow.returncode or shallow.stdout.strip() != b'false':
        return None
    log = git('log','--first-parent','--reverse','--format=%H%x09%aI%x09%s%x09%an','--',path)
    if log.returncode:
        return None
    revisions = []
    for line in log.stdout.decode().splitlines():
        parts = line.split('\t', 3)
        if len(parts) < 4:
            continue
        commit, date, subject, author = parts
        furniture = 'github-actions' in author.lower() or bool(BOT_SUBJECT.search(subject or ''))
        revisions.append((commit, date, furniture))
    if not revisions:
        return None
    # One batch process, rather than one process per historical page revision.
    batch = subprocess.run(['git','cat-file','--batch'], cwd=root, capture_output=True,
                           input=''.join(commit + ':' + path + '\n' for commit, _, _ in revisions).encode())
    if batch.returncode:
        return None
    data = batch.stdout; offset = 0; previous = None; latest = published
    for _, date, furniture in revisions:
        end = data.find(b'\n', offset)
        if end < 0:
            return None
        header = data[offset:end].split(); offset = end + 1
        if len(header) != 3 or header[1] != b'blob':
            return None
        size = int(header[2]); source = data[offset:offset+size].decode('utf-8', errors='replace'); offset += size + 1
        fingerprint = signature(source)
        if fingerprint is None:
            continue
        changed_at = timestamp(date)
        # Always advance the fingerprint so a skipped furniture commit cannot
        # donate its timestamp to the next kept commit.
        if previous is not None and fingerprint != previous and not furniture:
            if changed_at is None:
                return None
            if changed_at > timestamp(latest):
                latest = date
        previous = fingerprint
    return latest if previous is not None and signature(current_source) == previous else None


def _strip_furniture(source):
    for start, end in BLOCKS:
        source = re.sub(
            r'<!--\s*' + re.escape(start) + r'\s*-->.*?<!--\s*' + re.escape(end) + r'\s*-->',
            '',
            source,
            flags=re.S,
        )
    source = re.sub(r'<div class="pn-wrap">[\s\S]*?</aside>', '', source, count=1)
    source = re.sub(r'<footer class="site-footer">[\s\S]*?</footer>', '', source)
    source = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', source, flags=re.I)
    source = re.sub(r'<style\b[^>]*>[\s\S]*?</style>', '', source, flags=re.I)
    return source


def page_signature(source):
    """Hash of visible main copy, ignoring nav, footer, generated blocks and scripts."""
    source = _strip_furniture(source)
    match = re.search(r'<main\b[^>]*>(.*?)</main>', source, re.S | re.I)
    body = match.group(1) if match else source
    text = re.sub(r'<[^>]+>', ' ', body)
    text = re.sub(r'&(?:[a-z]+|#\d+);', ' ', text, flags=re.I)
    text = ' '.join(text.split())
    media = re.findall(r'(?:src|href)="([^"]+)"', body)
    return hashlib.sha256(repr((text, tuple(media[:40]))).encode()).hexdigest()


def git_file_date(root, path):
    """Last commit date for a path, skipping Actions bots and furniture-only subjects."""
    out = subprocess.run(
        ['git', 'log', '-20', '--format=%cI%x09%s%x09%an', '--', path],
        cwd=root, capture_output=True, text=True,
    )
    if out.returncode:
        return None
    for line in out.stdout.splitlines():
        parts = line.split('\t', 2)
        if len(parts) < 3:
            continue
        date, subject, author = parts[0], parts[1], parts[2]
        if 'github-actions' in author.lower():
            continue
        if BOT_SUBJECT.search(subject or ''):
            continue
        return date
    return None


def tracker_date(root, rel):
    sources = TRACKER_SOURCES.get(rel)
    if not sources:
        return None
    dates = [git_file_date(root, p) for p in sources]
    dates = [d for d in dates if d]
    return max(dates) if dates else None


@functools.lru_cache(maxsize=None)
def page_revision_date(root, path, current_source):
    """Honest lastmod for a non-article page: tracker data files, else main-copy git history."""
    rel = path.replace('\\', '/')
    data_date = tracker_date(root, rel)
    initial = timestamp(data_date) if data_date else None
    def git(*args):
        return subprocess.run(['git', *args], cwd=root, capture_output=True)
    shallow = git('rev-parse', '--is-shallow-repository')
    if shallow.returncode or shallow.stdout.strip() != b'false':
        return data_date
    log = git('log', '--first-parent', '--reverse', '--format=%H%x09%aI%x09%s%x09%an', '--', path)
    if log.returncode:
        return data_date
    revisions = []
    for line in log.stdout.decode().splitlines():
        parts = line.split('\t', 3)
        if len(parts) < 4:
            continue
        commit, date, subject, author = parts
        furniture = 'github-actions' in author.lower() or bool(BOT_SUBJECT.search(subject or ''))
        revisions.append((commit, date, furniture))
    if not revisions:
        return data_date
    batch = subprocess.run(
        ['git', 'cat-file', '--batch'], cwd=root, capture_output=True,
        input=''.join(commit + ':' + path + '\n' for commit, _, _ in revisions).encode(),
    )
    if batch.returncode:
        return data_date
    data = batch.stdout
    offset = 0
    previous = None
    latest = data_date
    latest_ts = initial
    for _, date, furniture in revisions:
        end = data.find(b'\n', offset)
        if end < 0:
            return data_date
        header = data[offset:end].split()
        offset = end + 1
        if len(header) != 3 or header[1] != b'blob':
            return data_date
        size = int(header[2])
        source = data[offset:offset + size].decode('utf-8', errors='replace')
        offset += size + 1
        fingerprint = page_signature(source)
        changed_at = timestamp(date)
        if previous is not None and fingerprint != previous and changed_at and not furniture:
            if latest_ts is None or changed_at > latest_ts:
                latest = date
                latest_ts = changed_at
        previous = fingerprint
    if previous is not None and page_signature(current_source) != previous and data_date:
        return data_date
    return latest or data_date
