"""Progressive reader tools for published Dispatch stories; never rewrite reporting."""
import html,pathlib,re,sys,math
ROOT=pathlib.Path(__file__).resolve().parents[1]
BAR=re.compile(r'\n?<!--rs:tools-->[\s\S]*?<!--/rs:tools-->\n?')
ASSETS=re.compile(r'[ \t]*<!--rs:assets-->[\s\S]*?<!--/rs:assets-->\n?')
def decorate(src):
 if not re.search(r'<article\b[^>]*class="[^"]*\barticle\b',src) or 'http-equiv="refresh"' in src:return src
 s=ASSETS.sub('',BAR.sub('',src))
 body=re.search(r'<article\b[\s\S]*?</article>',s)[0]
 plain=re.sub(r'<(?:script|style|nav|aside)\b[\s\S]*?</(?:script|style|nav|aside)>',' ',body)
 plain=html.unescape(re.sub(r'<[^>]*>',' ',plain));minutes=max(1,math.ceil(len(plain.split())/220))
 block=f'''\n<!--rs:tools--><div class="rs-tools" aria-label="Reading tools"><span class="rs-time">DISPATCH <span aria-hidden="true">/</span> About {minutes} min read</span><div class="rs-controls" hidden><div class="rs-size" role="group" aria-label="Article text size"><button type="button" data-rs-size="-1" aria-label="Smaller article text">A−</button><button type="button" data-rs-size="1" aria-label="Larger article text">A+</button></div><button type="button" data-rs-focus aria-pressed="false">Focus</button><button type="button" data-rs-share>Share</button><button type="button" data-rs-print>Print</button></div><span class="rs-status" role="status" aria-live="polite"></span></div><!--/rs:tools-->\n'''
 intro=re.search(r'<p\b[^>]*class="[^"]*\bstandfirst\b[^>]*>[\s\S]*?</p>',s)
 at=intro.end() if intro else re.search(r'</h1>',s).end()
 s=s[:at]+block+s[at:]
 s=re.sub(r'<article\b([^>]*)>',lambda m:'<article'+re.sub(r'class="([^"]*)"',lambda c:'class="'+c[1].replace(' rs-article','')+' rs-article"',m[1])+'>',s,count=1)
 s=re.sub(r'<body\b([^>]*)>',lambda m:'<body'+(re.sub(r'class="([^"]*)"',lambda c:'class="'+' '.join([x for x in c[1].split() if x!='rs-story']+['rs-story'])+'"',m[1]) if 'class=' in m[1] else m[1]+' class="rs-story"')+'>',s,count=1)
 assets='    <!--rs:assets--><link rel="stylesheet" href="/article-reader.css?v=20261027"/><script defer src="/article-reader.js?v=20261027"></script><!--/rs:assets-->\n'
 if '<!--sd:members-->' in s:s=s.replace('    <!--sd:members-->',assets+'    <!--sd:members-->',1)
 else:s=s.replace('  </head>',assets+'  </head>',1)
 return s
def run(check=False):
 changed=[]
 for p in sorted((ROOT/'dispatch').glob('*.html')):
  old=p.read_text();new=decorate(old)
  if old!=new:
   changed.append(p.name)
   if not check:p.write_text(new)
 print(('Out of sync: ' if check else 'Updated readers: ')+str(len(changed)))
 return int(check and bool(changed))
if __name__=='__main__':sys.exit(run('--check' in sys.argv))
