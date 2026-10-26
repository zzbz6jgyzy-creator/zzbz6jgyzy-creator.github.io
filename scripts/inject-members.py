#!/usr/bin/env python3
"""Add the independent member module to current and future public pages.
The config's enabled flag keeps controls hidden until Auth and SQL are ready.
Run after article/nav generation. --check detects missing or stale tags.
"""
import pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
START,END='<!--sd:members-->','<!--/sd:members-->'
BLOCK='''    <!--sd:members-->
    <link rel="stylesheet" href="/members.css?v=20261022" />
    <script type="module" src="/members.js?v=20261022"></script>
    <!--/sd:members-->'''
RX=re.compile(r'[ \t]*<!--sd:members-->.*?<!--/sd:members-->\n?',re.S)
def inject(src):
 if '<main' not in src or 'class="pn-wrap"' not in src or '</head>' not in src:return src
 clean=RX.sub('',src)
 return re.sub(r'[ \t]*</head>',lambda _:BLOCK+'\n  </head>',clean,count=1)
def run(check=False):
 changed=[]
 for p in sorted(ROOT.rglob('*.html')):
  if any(x in p.parts for x in ('.git','node_modules','dev','tests','preview','lab','apps')):continue
  src=p.read_text();new=inject(src)
  if new!=src:
   changed.append(str(p.relative_to(ROOT)))
   if not check:p.write_text(new)
 print(('Out of sync: ' if check else 'Updated: ')+str(len(changed)))
 return 1 if check and changed else 0
if __name__=='__main__':sys.exit(run('--check' in sys.argv))
