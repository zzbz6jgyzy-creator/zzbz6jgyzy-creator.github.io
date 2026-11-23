"""Where a Dispatch article's reading tools and "On this page" go (redesign switch, 23 Nov 2026).

The headline, standfirst, byline and lead photo or video sit together at the top; the reading tools (rs:tools, written by
build-article-reader.py) follow the lead figure, and "On this page" (sd:article-wayfinding, written by build-wayfinding.py)
follows the tools. Where a story has no lead figure both go right after the header. Both blocks are page furniture for
scripts/editorial-dates.py, so moving them changes no story's "Updated" date.
"""
from html.parser import HTMLParser

# Classes of the elements that make up an article's header (an editor's update note under the byline belongs to it), of
# a lead video frame that is not a <figure>, and of the two furniture blocks themselves.
HEADER = {'eyebrow', 'standfirst', 'meta', 'sd-disclosure', 'sd-updated', 'update-note', 'article-update', 'sd-update'}
LEAD_MEDIA = {'review-video-frame'}
FURNITURE = {'rs-tools', 'sd-article-tools'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class _Children(HTMLParser):
    """Top-level children (tag, classes, start, end offsets) of the first <article class="... article ...">."""

    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.offsets = [0]
        for line in src.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.depth = None
        self.kids = []
        self.open = None
        self.feed(src)

    def pos(self):
        line, col = self.getpos()
        return self.offsets[line - 1] + col

    def handle_starttag(self, tag, attrs):
        classes = set((dict(attrs).get('class') or '').split())
        if self.depth is None:
            if tag == 'article' and 'article' in classes:
                self.depth = 0
            return
        if self.depth < 0:
            return
        if self.depth == 0:
            self.open = {'tag': tag, 'classes': classes, 'start': self.pos(), 'end': None}
            if tag in VOID:
                self.open['end'] = self.pos() + len(self.get_starttag_text())
                self.kids.append(self.open)
                return
        if tag not in VOID:
            self.depth += 1

    def handle_startendtag(self, tag, attrs):
        if self.depth == 0:
            self.open = {'tag': tag, 'classes': set((dict(attrs).get('class') or '').split()),
                         'start': self.pos(), 'end': self.pos() + len(self.get_starttag_text())}
            self.kids.append(self.open)

    def handle_endtag(self, tag):
        if self.depth is None or self.depth < 0 or tag in VOID:
            return
        if self.depth == 0:
            if tag == 'article':
                self.depth = -1
            return
        self.depth -= 1
        if self.depth == 0 and self.open is not None:
            self.open['end'] = self.pos() + len('</' + tag + '>')
            self.kids.append(self.open)
            self.open = None


def tools_point(src):
    """Offset for rs:tools: after the lead figure, else after the header. None if the page has no article header."""
    kids = _Children(src).kids
    header_end = None
    for kid in kids:
        if kid['end'] is None:
            continue
        if kid['tag'] == 'h1' or kid['classes'] & HEADER:
            header_end = kid['end']
            continue
        if kid['classes'] & FURNITURE:
            continue
        if header_end is None:
            return None
        return kid['end'] if kid['tag'] == 'figure' or kid['classes'] & LEAD_MEDIA else header_end
    return header_end
