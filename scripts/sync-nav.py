#!/usr/bin/env python3
"""Generate the shared desktop mega menu and mobile navigation from nav.json.

Native details and ordinary anchors keep every destination usable before JS.
The explicit marker also lets future runs replace the complete component safely.
"""
import html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / 'scripts/nav.json').read_text())
CSS_VERSION = '20261028-studio-1'
CHEVRON = '<svg class="ns-chevron" viewBox="0 0 24 24" aria-hidden="true"><use href="#ns-icon-chevron"/></svg>'
ARROW = '<svg class="ns-arrow" viewBox="0 0 24 24" aria-hidden="true"><use href="#ns-icon-arrow"/></svg>'
PATHS = {
 'arrow':'M5 12h14m-6-6 6 6-6 6',
 'chevron':'m7 10 5 5 5-5',
 'news':'M4 5h16v14H4zM8 9h8M8 13h3M8 16h8',
 'article':'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
 'globe':'M3 12h18M12 3c6 5 6 13 0 18-6-5-6-13 0-18M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
 'mail':'M3 5h18v14H3zM3 6l9 7 9-7',
 'person':'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-3c0-6 16-6 16 0v3',
 'people':'M8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6M17 5a3 3 0 0 1 0 6M2 21v-4c0-5 12-5 12 0v4M18 14c3 0 4 2 4 5v2',
 'check':'m5 12 4 4L19 6M20 12v8H4V4h10',
 'car':'m4 10 2-6h12l2 6M3 10h18v8H3zM6 18v3M18 18v3M6 14h2m8 0h2',
 'bag':'M4 7h16v14H4zM8 8V6a4 4 0 0 1 8 0v2',
 'robot':'M5 7h14v13H5zM12 7V3M9 12h1m4 0h1M9 16h6M2 10v6m20-6v6',
 'cube':'m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
 'book':'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2ZM12 5v16',
 'rocket':'m14 3 7-1-1 7-9 9-5-5zM6 9l-4 2v5l4-3M15 18l-2 4H8l3-4M3 21l3-3M15 7l2 2',
 'orbit':'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M4 4c-5 7 9 21 16 16 5-7-9-21-16-16',
 'calendar':'M4 5h16v16H4zM8 2v6m8-6v6M4 10h16M8 14h2m4 0h2m-8 4h2',
 'compass':'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-6-3-2 6-4 2 2-6z',
 'code':'m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',
 'chart':'M4 3v17h17M8 16v-4m5 4V8m5 8V4',
 'map':'m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3zM9 2v17m6-14v17',
 'clock':'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 6v6l4 2',
 'spark':'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
 'image':'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M15 7h1',
 'game':'M7 7h10c5 0 7 13 3 13l-4-4H8l-4 4C0 20 2 7 7 7M6 10v5m-2-2h5m6-1h1m2 2h1',
 'search':'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 'close':'m6 6 12 12M6 18 18 6',
 'menu':'M4 7h16M4 12h16M4 17h16',
}

def esc(s): return html.escape(html.unescape(str(s)), quote=True)
def icon(name):
 name=name if name in PATHS else 'spark'
 return f'<svg class="ns-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#ns-icon-{name}"/></svg>'

def link(item):
 name, href, desc, glyph = (list(item) + ['', ''])[:4]
 return f'<li><a class="ns-link" href="{esc(href)}"><span class="ns-link-icon">{icon(glyph)}</span><span><span class="ns-link-title">{esc(name)}</span><small>{esc(desc)}</small></span>{ARROW}</a></li>'

def groups(d):
 return ''.join(f'<section class="ns-group"><h3>{esc(g["label"])}</h3><ul>{"".join(link(i) for i in g["items"])}</ul></section>' for g in d['groups'])

def feature(d):
 f=d['feature']; art=f['art']
 if art=='roadster':
  visual='<img src="/assets/roadster-studio/finale-640w.webp" alt="" width="640" height="474" loading="lazy" decoding="async"/>'
 else: visual=icon({'briefing':'mail','compass':'compass','daily':'spark','explore':'orbit'}.get(art,'spark'))
 return f'<a class="ns-feature ns-feature-{art}" href="{esc(f["href"])}"><span class="ns-feature-art" aria-hidden="true">{visual}</span><span class="ns-feature-copy"><strong>{esc(f["title"])}</strong><span>{esc(f["text"])}</span><b>{esc(f["label"])} {ARROW}</b></span></a>'

def desktop(d):
 landing=d.get('landing'); end=f'<a class="ns-overview" href="{esc(landing[1])}">{esc(landing[0])}{ARROW}</a>' if landing else ''
 return f'<details class="pn-dd ns-dropdown" name="sd-primary-menu"><summary aria-controls="{d["id"]}">{esc(d["label"])}{CHEVRON}</summary><div class="pn-panel ns-panel" id="{d["id"]}"><div class="ns-panel-head"><p>{esc(d["intro"])}</p>{end}</div><div class="ns-panel-content"><div class="ns-groups">{groups(d)}</div>{feature(d)}</div></div></details>'

def mobile(d):
 landing=d.get('landing'); end=f'<a class="ns-mobile-overview" href="{esc(landing[1])}">{esc(landing[0])}{ARROW}</a>' if landing else ''
 return f'<details class="ns-mobile-section" name="sd-mobile-section"><summary>{esc(d["label"])}{CHEVRON}</summary><div>{end}{groups(d)}{feature(d)}</div></details>'

def block(navtag):
 navtag=re.sub(r'\s+data-start-collapsed(?:="[^"]*")?', '', navtag)
 navtag=re.sub(r'\s+data-nav-studio(?:="[^"]*")?', '', navtag)
 if ' id=' not in navtag: navtag=navtag[:-1]+' id="sd-primary-navigation">'
 navtag=navtag[:-1]+' data-nav-studio>'
 home=re.search(r'\bid="([^"]+)"',navtag).group(1)
 symbols='<svg width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true"><defs>'+''.join(f'<symbol id="ns-icon-{k}" viewBox="0 0 24 24"><path d="{v}"/></symbol>' for k,v in PATHS.items())+'</defs></svg>'
 menus=''.join(desktop(d) for d in CFG['dropdowns'])
 mobile_menus=''.join(mobile(d) for d in CFG['dropdowns'])
 shortcuts=''.join(f'<a href="{esc(h)}">{esc(n)}</a>' for n,h in CFG['mobileShortcuts'])
 return f'''<!--sd:navigation--><div class="pn-wrap" data-nav-studio>
 {navtag}{symbols}
  <a class="pn-logo" href="/" aria-label="Supercharged Daily home"><img src="/assets/brand/icon-1b-mark.svg" alt="" width="26" height="26"/><img class="pn-word" src="/assets/brand/wordmark.svg" alt="" width="114" height="18"/></a>
  <div class="pn-items">{menus}</div>
  <div class="pn-utilities"><a class="pn-link pn-search" href="/search.html">{icon('search')}<span>Search</span><kbd aria-hidden="true">⌘ K</kbd></a><a class="pn-link pn-daily" href="/daily.html">{icon('spark')}<span>Your Daily</span></a><a class="pn-sub pn-cta" href="/#newsletter">Free briefing</a></div>
  <a class="pn-menu" href="#pn-sheet" aria-controls="pn-sheet">{icon('menu')}<span>Menu</span></a>
 </nav></div>
 <div class="pn-overlay" data-nav-studio></div>
 <aside class="pn-sheet" id="pn-sheet" data-nav-studio aria-label="Explore Supercharged Daily">
  <div class="pn-sheet-head"><a href="/" aria-label="Supercharged Daily home"><img src="/assets/brand/wordmark.svg" alt="" width="150" height="24"/></a><a class="pn-close" href="#{home}" aria-label="Close menu">{icon('close')}</a></div>
  <form class="ns-mobile-search" action="/search.html" method="get" role="search" aria-label="Search the site"><div class="ns-mobile-search-bar">{icon('search')}<label class="ns-sr" for="ns-mobile-query">Search stories, guides and tools</label><input id="ns-mobile-query" data-ns-query type="search" role="combobox" aria-expanded="false" aria-autocomplete="list" name="q" placeholder="Search stories, guides and tools" autocomplete="off" aria-controls="ns-mobile-results"/><button type="button" class="ns-search-clear" aria-label="Clear search" hidden>{icon('close')}</button><button class="ns-search-submit" type="submit" aria-label="Search">{ARROW}</button></div><p class="ns-search-status" data-sd-status role="status"></p><div id="ns-mobile-results" class="ns-mobile-results" data-sd-hits role="listbox" aria-label="Search results"></div></form>
  <div class="ns-browse"><a class="pn-daily pn-daily-sheet" href="/daily.html"><span class="ns-daily-mark">{icon('spark')}</span><span><strong>Your Daily</strong><small>Your interests, stories and tools.</small></span>{ARROW}</a>
   <nav class="ns-mobile-categories" aria-label="Explore sections">{mobile_menus}</nav>
   <nav class="pn-shortcuts" aria-label="Quick links"><p>Quick access</p><div>{shortcuts}</div></nav>
  </div>
  <div class="ns-mobile-utilities"><a href="/members.html" data-ns-account>Member account</a><a href="/about.html">About</a><a href="/contact.html">Contact</a></div>
  <a class="pn-sub pn-sub-sheet pn-cta" href="/#newsletter">Get the free Sunday briefing {ARROW}</a>
 </aside><!--/sd:navigation-->'''

RX=re.compile(r'<!--sd:navigation-->.*?<!--/sd:navigation-->|<div class="pn-wrap">\s*(<nav class="pn"[^>]*>).*?</aside>',re.S)
def transform(s):
 def render(m):
  tag=re.search(r'<nav class="pn"[^>]*>',m[0]).group(0)
  return block(tag)
 n=RX.sub(render,s,count=1)
 if RX.search(s):
  n=re.sub(r'(?<=href="/nav-pill\.css)(?:\?v=[^"]*)?(?=")','?v='+CSS_VERSION,n)
  n=re.sub(r'(?<=src="/nav-pill\.js)(?:\?v=[^"]*)?(?=")','?v='+CSS_VERSION,n)
  n=re.sub(r'(?<=src="/members\.js)(?:\?v=[^"]*)?(?=")','?v=20261028-navstudio',n)
 return n

if __name__=='__main__':
 check='--check' in sys.argv; changed=[]
 for p in sorted(ROOT.rglob('*.html')):
  if any(x in p.parts for x in ['.git','node_modules','astro','.homepage-before']): continue
  s=p.read_text(); n=transform(s)
  if n!=s:
   changed.append(str(p.relative_to(ROOT)))
   if not check:p.write_text(n)
 print(('out of sync: ' if check else 'updated: ')+str(len(changed)),*changed,sep='\n  ')
 sys.exit(1 if check and changed else 0)
