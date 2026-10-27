#!/usr/bin/env python3
"""Build compact homepage shortcuts and native contents links for long Dispatch articles."""
import html,pathlib,re,sys,unicodedata,runpy
from html.parser import HTMLParser

ROOT=pathlib.Path(__file__).resolve().parents[1]
READER=runpy.run_path(str(pathlib.Path(__file__).with_name('build-article-reader.py')))['decorate']
STYLE='    <!--sd:wayfinding-style--><link rel="stylesheet" href="/wayfinding.css?v=2026102301" /><!--/sd:wayfinding-style-->'
STYLE_RX=re.compile(r'[ \t]*<!--sd:wayfinding-style-->.*?<!--/sd:wayfinding-style-->\n?',re.S)
ARTICLE_RX=re.compile(r'\n?<!--sd:article-wayfinding-->.*?<!--/sd:article-wayfinding-->\n?',re.S)
HOME_RX=re.compile(r'\n?<!--sd:home-wayfinding-->.*?<!--/sd:home-wayfinding-->\n?',re.S)
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Sections(HTMLParser):
 def __init__(self,src):
  super().__init__(convert_charrefs=True)
  self.offsets=[0];self.stack=[];self.headings=[];self.ids=set();self.current=None;self.root=None;self.intro=None;self.stopped=False
  for line in src.splitlines(keepends=True):self.offsets.append(self.offsets[-1]+len(line))
  self.feed(src)
 def pos(self):
  line,col=self.getpos();return self.offsets[line-1]+col
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs);classes=set(attrs.get('class','').split());raw=self.get_starttag_text()
  if attrs.get('id'):self.ids.add(attrs['id'])
  entry={'tag':tag,'attrs':attrs,'classes':classes,'start':self.pos(),'raw':raw}
  if self.root is None and tag=='article' and 'article' in classes:self.root=entry
  active=self.root in self.stack or entry is self.root
  excluded=any(e['tag'] in {'nav','aside','footer','script','style'} or e['classes'] & {'related-stories','sd-band','sd-desk','sdm-discussion'} for e in self.stack)
  if active and tag=='h2' and not excluded and not self.stopped:
   entry['text']=[];self.current=entry
  if tag not in VOID:self.stack.append(entry)
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  if tag not in VOID:self.handle_endtag(tag)
 def handle_data(self,data):
  if self.current is not None:self.current['text'].append(data)
 def handle_comment(self,data):
  if self.root in self.stack and data.strip() in {'seo:about','related:start'}:self.stopped=True
 def handle_endtag(self,tag):
  index=next((i for i in range(len(self.stack)-1,-1,-1) if self.stack[i]['tag']==tag),None)
  if index is None:return
  entry=self.stack[index]
  if entry is self.current:
   entry['label']=' '.join(''.join(entry['text']).split())
   if entry['label']:self.headings.append(entry)
   self.current=None
  if self.root in self.stack and tag=='p' and entry['classes'] & {'meta','article-meta','article-byline'} and not self.headings:self.intro=self.pos()+len('</p>')
  del self.stack[index:]

def stylesheet(src,needed):
 clean=STYLE_RX.sub('',src)
 if not needed:return clean
 if '<!--sd:members-->' in clean:
  return re.sub(r'[ \t]*<!--sd:members-->',lambda _:STYLE+'\n    <!--sd:members-->',clean,count=1)
 return re.sub(r'[ \t]*</head>',lambda _:STYLE+'\n  </head>',clean,count=1)

def article(src):
 clean=ARTICLE_RX.sub('',src);sections=Sections(clean)
 if len(sections.headings)<4:return stylesheet(clean,False)
 ids=set(sections.ids);edits=[];links=[]
 for section in sections.headings:
  anchor=section['attrs'].get('id')
  if not anchor:
   slug=re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',section['label']).encode('ascii','ignore').decode().lower()).strip('-') or 'section'
   base='section-'+slug;anchor=base;suffix=2
   while anchor in ids:anchor=f'{base}-{suffix}';suffix+=1
   ids.add(anchor);raw=section['raw']
   if 'id' in section['attrs']:raw=re.sub(r'(?<![\w:-])id\s*=\s*(?:"[^"]*"|\x27[^\x27]*\x27|[^\s>]+)',f'id="{anchor}"',raw,count=1,flags=re.I)
   else:raw=raw[:-1]+f' id="{anchor}">'
   edits.append((section['start'],section['start']+len(section['raw']),raw))
  links.append(f'<li><a href="{html.escape("#"+anchor,quote=True)}">{html.escape(section["label"])}</a></li>')
 block='\n<!--sd:article-wayfinding--><div class="sd-article-tools"><details class="sd-contents"><summary>On this page</summary><nav aria-label="Article sections"><ol>'+''.join(links)+'</ol></nav></details><a class="sd-discussion-jump" href="#comments" data-discussion-jump hidden>Jump to discussion <span aria-hidden="true">→</span></a></div><!--/sd:article-wayfinding-->\n'
 insert=sections.intro if sections.intro is not None else sections.headings[0]['start']
 edits.append((insert,insert,block))
 for start,end,replacement in sorted(edits,reverse=True):clean=clean[:start]+replacement+clean[end:]
 return stylesheet(clean,True)

def homepage(src):
 clean=HOME_RX.sub('',src)
 pitch=re.search(r'<p\b[^>]*class="hv-pitch"[^>]*>.*?</p>',clean,re.S)
 if not pitch or 'id="hv-trk-h"' not in clean:return src
 block='\n<!--sd:home-wayfinding--><nav class="hv-start" aria-label="Start exploring"><a href="/dispatch.html">Latest stories</a><a href="#hv-trk-h">Explore trackers</a><a href="/guides/tesla-buying-guide.html">Find your Tesla</a></nav><!--/sd:home-wayfinding-->\n'
 return stylesheet(clean[:pitch.end()]+block+clean[pitch.end():],True)

def run(check=False):
 changed=[];eligible=0
 files=[ROOT/'index.html']+sorted((ROOT/'dispatch').glob('*.html'))
 for path in files:
  if not path.exists():continue
  src=path.read_text();new=homepage(src) if path.name=='index.html' and path.parent==ROOT else article(src)
  if path.parent==ROOT/'dispatch':new=READER(new)
  if '<!--sd:article-wayfinding-->' in new:eligible+=1
  if new!=src:
   changed.append(str(path.relative_to(ROOT)))
   if not check:path.write_text(new)
 print(('Out of sync: ' if check else 'Updated: ')+str(len(changed))+f'; {eligible} articles have contents links.')
 return int(check and bool(changed))

if __name__=='__main__':sys.exit(run('--check' in sys.argv))
