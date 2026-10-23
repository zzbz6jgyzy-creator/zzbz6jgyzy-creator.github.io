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
          ('sd:article-wayfinding','/sd:article-wayfinding')]


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
    log = git('log','--first-parent','--reverse','--format=%H%x09%aI','--',path)
    if log.returncode:
        return None
    revisions = [line.split('\t',1) for line in log.stdout.decode().splitlines() if '\t' in line]
    if not revisions:
        return None
    # One batch process, rather than one process per historical page revision.
    batch = subprocess.run(['git','cat-file','--batch'], cwd=root, capture_output=True,
                           input=''.join(commit + ':' + path + '\n' for commit, _ in revisions).encode())
    if batch.returncode:
        return None
    data = batch.stdout; offset = 0; previous = None; latest = published
    for _, date in revisions:
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
        if previous is not None and fingerprint != previous:
            if changed_at is None:
                return None
            if changed_at > timestamp(latest):
                latest = date
        previous = fingerprint
    return latest if previous is not None and signature(current_source) == previous else None
