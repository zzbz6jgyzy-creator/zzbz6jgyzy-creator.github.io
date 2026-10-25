#!/usr/bin/env python3
"""Build the learning hub, four standalone lessons and original SVG covers.

Editorial source: data/explainers.json. Shared shell/nav: explainers.html.
FSD comparison: fsd-data.js, the same source as the global FSD tracker.
No remote requests or automatic review-date changes. --check detects drift.
"""
import datetime, html, json, pathlib, re, runpy, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
ART=runpy.run_path(str(ROOT/'scripts/lesson-graphics.py'))['svg']
DETAIL=runpy.run_path(str(ROOT/'scripts/lesson-graphics.py'))['detail_svg']
BUNDLES=runpy.run_path(str(ROOT/'scripts/inject-js-bundles.py'))
E=lambda value:html.escape(str(value),quote=True)
J=lambda value:json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
VERSION='2026102302'

def _sd_day(v):
  try:return datetime.date.fromisoformat(str(v)[:10]).strftime('%d %b %Y').lstrip('0')
  except Exception:return str(v)

def catalog():
    data=json.loads((ROOT/'data/explainers.json').read_text())
    datetime.date.fromisoformat(data['reviewed'])
    slugs=set();ids=set()
    for lesson in data['lessons']:
        assert re.fullmatch('[a-z0-9-]+',lesson['slug']) and lesson['slug'] not in slugs
        assert lesson['id'] not in ids
        slugs.add(lesson['slug']);ids.add(lesson['id'])
        sources={source['id'] for source in lesson['sources']}
        assert len(sources)==len(lesson['sources'])
        for source in lesson['sources']+lesson['related']:
            assert source['url'].startswith(('https://','/')) and not source['url'].startswith('//')
        for stage in lesson['stages']+lesson['sections']:
            assert not stage.get('source') or stage['source'] in sources
        chapter_ids=set()
        for ch in lesson.get('deepDive',[]):
            assert re.fullmatch('[a-z0-9-]+',ch['id']) and ch['id'] not in chapter_ids
            chapter_ids.add(ch['id'])
            for paragraph in ch['paragraphs']:
                assert paragraph['text'].strip() and set(paragraph.get('sources',[]))<=sources
            for key in ['math','table']:
                if key in ch:assert set(ch[key].get('sources',[]))<=sources
            if 'table' in ch:assert all(len(row)==len(ch['table']['headers']) for row in ch['table']['rows'])
        for fact in lesson.get('facts',[]):assert set(fact.get('sources',[]))<=sources
    return data

def tracker():
    code="const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync('fsd-data.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.FSD_GLOBAL));"
    data=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))
    datetime.date.fromisoformat(data['updated'])
    assert isinstance(data.get('versions'),list)
    return data

def url(lesson):return '/explainers/'+lesson['slug']+'.html'
def link(item):return f'<a href="{E(item["url"])}">{E(item["title"])} <span aria-hidden="true">↗</span></a>'
def source_ref(lesson,key):
    if not key:return ''
    source=next(s for s in lesson['sources'] if s['id']==key)
    return f' <a class="lx-cite" href="#source-{E(key)}" aria-label="Source: {E(source["title"])}">[{lesson["sources"].index(source)+1}]</a>'

def card(lesson,prefix=''):
    return f'''<a class="lx-card" id="{E(prefix+lesson['legacy'])}" href="{url(lesson)}">
      <div class="lx-cover"><img src="/assets/explainers/{E(lesson['slug'])}.svg" alt="" width="720" height="480" loading="lazy" decoding="async" /></div>
      <div class="lx-card-copy"><p class="lx-eyebrow">{E(lesson['category'])}</p><h3>{E(lesson['title'])}</h3><p>{E(lesson['summary'])}</p><div class="lx-card-foot"><span>About {lesson['minutes']} min · Visual guide</span><span>Explore lesson <span aria-hidden="true">→</span></span></div></div></a>'''

def hub(data):
    groups=''
    for topic,label,description in [('spacex','SpaceX','The hardware and sequences behind reusable spaceflight.'),('tesla','Tesla','Driver-assistance technology, explained with its limits in view.')]:
        lessons=[l for l in data['lessons'] if l['topic']==topic]
        groups+=f'<section class="lx-topic" id="{topic}" aria-labelledby="heading-{topic}"><header class="lx-section-head"><div><p class="lx-eyebrow">{len(lessons):02d} visual guides</p><h2 id="heading-{topic}">{label}</h2></div><p>{description}</p></header><div class="lx-catalog">'+''.join(card(l) for l in lessons)+'</div></section>'
    return f'''<main id="main" class="lx lx-hub" data-explainers-hub>
      <header class="lx-hub-hero"><div><p class="lx-eyebrow">Supercharged Daily · Explainers</p><h1>How it works.</h1><p class="lx-deck">Understand the technology behind Tesla and SpaceX. Clear illustrations, one step at a time.</p><nav class="lx-topic-nav" aria-label="Explainer topics"><a href="#spacex">Explore SpaceX <span aria-hidden="true">↓</span></a><a href="#tesla">Explore Tesla <span aria-hidden="true">↓</span></a></nav><p class="lx-fine">Four visual guides · Free to explore · Original illustrations</p></div><div class="lx-hub-art" aria-hidden="true">{ART('hot-staging','hub-hero',True)}<span>Start with the mechanism. Follow the sequence.</span></div></header>
      {groups}
      <aside class="lx-method"><p class="lx-eyebrow">How to read these guides</p><h2>See the mechanism. Check the evidence.</h2><p>Illustrations explain relationships and sequences. They are labelled when schematic, and do not substitute for flight telemetry or a vehicle’s instructions. Each lesson includes its sources, key terms and links to the relevant tracker.</p><a href="/about.html">About Supercharged Daily <span aria-hidden="true">→</span></a></aside>
    </main>'''

def configs(data):
    versions=data.get('versions',[])
    def pick(region,hardware):
        matches=[v for v in versions if region(v.get('region','').lower()) and hardware in v.get('hardware','')]
        return sorted(matches,key=lambda v:v.get('date',''),reverse=True)[0] if matches else {}
    north=lambda s:any(x in s for x in ['united states','north america','canada'])
    return [dict(id='na-hw3',label='North America · HW3',hardware='HW3',version=pick(north,'HW3')),
            dict(id='na-hw4',label='North America · HW4 / AI4',hardware='HW4 / AI4',version=pick(north,'HW4')),
            dict(id='europe',label='Europe · reported branch',hardware='Check vehicle',version=pick(lambda s:'europe' in s,'HW'))]

def comparison(snapshot):
    rows=configs(snapshot);a,b=rows[:2]
    options=''.join(f'<option value="{E(x["id"])}">{E(x["label"])}</option>' for x in rows)
    def value(c,key):return c['hardware'] if key=='hardware' else c['version'].get(key) or 'Not reported'
    fields=[('hardware','Hardware'),('id','Reported FSD version'),('build','Vehicle software build'),('region','Reported market')]
    body=''.join(f'<tr><th scope="row">{label}</th><td data-compare-cell="a:{key}">{E(value(a,key))}</td><td data-compare-cell="b:{key}">{E(value(b,key))}</td></tr>' for key,label in fields)
    return f'''<section class="lx-compare" aria-labelledby="compare-title"><p class="lx-eyebrow">From the global FSD tracker</p><h2 id="compare-title">Compare the reported branches</h2><p class="lx-fine" data-tracker-stamp>Tracker as of {E(_sd_day(snapshot['updated']))}. Reported versions, not confirmation for your VIN.</p><div class="lx-compare-selects" hidden data-compare-controls><label>Configuration A<select data-compare="a">{options}</select></label><label>Configuration B<select data-compare="b">{options.replace('value="na-hw4"','value="na-hw4" selected')}</select></label></div><div class="lx-table-wrap"><table><caption>Hardware, FSD version, vehicle build and market are separate fields.</caption><thead><tr><th scope="col">Compare</th><th scope="col" data-compare-head="a">{E(a['label'])}</th><th scope="col" data-compare-head="b">{E(b['label'])}</th></tr></thead><tbody>{body}<tr><th scope="row">Active supervision</th><td>Required</td><td>Required</td></tr></tbody></table></div><p>Availability also depends on the vehicle and its enabled features. <a href="/fsd.html#versions">Open the maintained tracker and source notes →</a></p><script type="application/json" data-comparison>{J({'updated':snapshot['updated'],'configs':rows})}</script></section>'''

def refs(lesson,keys):return ''.join(source_ref(lesson,key) for key in keys)

def contents(lesson):
    return '<details class="lx-contents"><summary>In this guide · six detailed chapters</summary><ol>'+''.join(f'<li><a href="#chapter-{E(ch["id"])}">{E(ch["title"])}</a></li>' for ch in lesson.get('deepDive',[]))+'</ol></details>'

def fact_cards(lesson):
    return '<section class="lx-facts" aria-label="Facts in context">'+''.join(f'<article><p class="lx-fact-value">{E(f["value"])}</p><h2>{E(f["label"])}</h2><p>{E(f["note"])}{refs(lesson,f.get("sources",[]))}</p></article>' for f in lesson.get('facts',[]))+'</section>'

def deep_dive(lesson):
    chapters=[]
    for ch in lesson.get('deepDive',[]):
        parts=[]
        for paragraph in ch['paragraphs']:
            label=paragraph.get('kind','Explanation')
            parts.append(f'<div class="lx-depth-paragraph"><p class="lx-evidence-label">{E(label)}</p><p>{E(paragraph["text"])}{refs(lesson,paragraph.get("sources",[]))}</p></div>')
        if ch.get('visual'):
            description={'forces':'Instantaneous vertical force balance. Force arrows are schematic; the simplified equation omits aerodynamic forces.','cameras':'Eight road-facing cameras in the cited US Model Y chapter: front bumper ×1, windshield ×2, door pillars ×2, front fenders ×2, rear ×1. Cabin camera separate. Schematic positions, not fields of view.','braking':'Chosen inputs: one-second delay, constant 6 m/s² deceleration. Totals: 14.1 m at 30 km/h, 39.8 m at 60 km/h and 77.1 m at 90 km/h. These are model calculations, not Tesla measurements.'}[ch['visual']]
            parts.append('<figure class="lx-detail-figure">'+DETAIL(ch['visual'],'detail-'+lesson['id']+'-'+ch['id'])+'<figcaption>'+E(description)+'</figcaption></figure>')
        if ch.get('table'):
            t=ch['table'];parts.append('<div class="lx-depth-table" role="region" tabindex="0" aria-label="Scrollable comparison"><table><caption>'+E(t['caption'])+'</caption><thead><tr>'+''.join('<th scope="col">'+E(h)+'</th>' for h in t['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">' if i==0 else '<td>')+E(c)+('</th>' if i==0 else '</td>') for i,c in enumerate(row))+'</tr>' for row in t['rows'])+'</tbody></table></div><p class="lx-table-source">'+refs(lesson,t.get('sources',[]))+'</p>')
        if ch.get('math'):
            m=ch['math'];parts.append('<aside class="lx-calculation"><h3>'+E(m['title'])+'</h3><p class="lx-formula">'+E(m['formula'])+'</p><ul>'+''.join('<li>'+E(t)+'</li>' for t in m['terms'])+'</ul><p>'+E(m['note'])+refs(lesson,m.get('sources',[]))+'</p></aside>')
        chapters.append(f'<section class="lx-chapter" id="chapter-{E(ch["id"])}"><h2>{E(ch["title"])}</h2>'+''.join(parts)+'</section>')
    return '<section class="lx-depth" id="deep-dive" aria-label="The detailed explanation">'+''.join(chapters)+'</section>'

def faq(lesson):
    return '<section class="lx-misconceptions lx-faq"><p class="lx-eyebrow">The next questions</p><h2>Go a level deeper</h2>'+''.join('<details><summary>'+E(q['title'])+'</summary><p>'+E(q['text'])+'</p></details>' for q in lesson.get('faq',[]))+'</section>'

def lesson_page(lesson,data,snapshot):
    steps=''.join(f'<li class="lx-step"{ " data-active" if i==0 else ""}><h3><span class="lx-step-static">{i+1:02d} · {E(s["title"])}</span><button type="button" data-step-target="{i}" aria-label="Step {i+1}: {E(s["title"])}" hidden><span class="lx-step-number">{i+1:02d}</span><span class="lx-step-name">{E(s["title"])}</span></button></h3><p>{E(s["text"])}{source_ref(lesson,s.get("source"))}</p></li>' for i,s in enumerate(lesson['stages']))
    mode='<div class="lx-mode" role="group" aria-label="Staging method"><button type="button" data-mode="hot" aria-pressed="true">Hot staging</button><button type="button" data-mode="cold" aria-pressed="false">Cold staging</button></div>' if lesson['id']=='hot-staging' else ''
    lab=f'''<section class="lx-lab" aria-labelledby="diagram-title" data-lesson-lab><header class="lx-lab-head"><div><p class="lx-eyebrow">Explore the sequence</p><h2 id="diagram-title">{E(lesson['diagramTitle'])}</h2></div><span class="lx-step-status" data-step-status role="status" aria-live="polite">Five stages</span></header><div class="lx-lab-grid"><div><figure class="lx-figure" data-lesson-figure data-step="0" data-mode="hot">{ART(lesson['id'],'lesson-'+lesson['id'])}<figcaption>{E(lesson['diagramNote'])}</figcaption></figure><ol class="lx-legend">{''.join(f'<li><span>{i+1}</span>{E(label)}</li>' for i,label in enumerate(lesson['legend']))}</ol><div class="lx-controls" data-lesson-controls hidden>{mode}<div class="lx-playback"><button type="button" data-play aria-pressed="false">Play steps</button><button type="button" data-previous aria-label="Previous step">←</button><input type="range" data-scrub min="0" max="4" value="0" step="1" aria-label="Lesson stage"/><button type="button" data-next aria-label="Next step">→</button><button type="button" data-restart>Restart</button></div></div></div><div class="lx-step-column"><ol class="lx-steps">{steps}</ol><div class="lx-current" data-current hidden><p class="lx-eyebrow" data-current-number></p><h3 data-current-title></h3><p data-current-text></p></div></div></div><script type="application/json" data-lesson-stages>{J(lesson['stages'])}</script></section>'''
    sections=''.join(f'<section class="lx-explanation"><h2>{E(s["title"])}</h2><p>{E(s["text"])}{source_ref(lesson,s.get("source"))}</p></section>' for s in lesson['sections'])
    myths=''.join(f'<details><summary>{E(item["title"])}</summary><p>{E(item["text"])}</p></details>' for item in lesson['misconceptions'])
    glossary=''.join(f'<div><dt>{E(item["term"])}</dt><dd>{E(item["text"])}</dd></div>' for item in lesson['glossary'])
    sources=''.join(f'<li id="source-{E(s["id"])}">{link(s)}<p>{E(s["note"])}</p></li>' for s in lesson['sources'])
    related=''.join(f'<a class="lx-next-card" href="{E(item["url"])}"><strong>{E(item["title"])} <span aria-hidden="true">→</span></strong><span>{E(item["text"])}</span></a>' for item in lesson['related'])
    video=''
    if lesson['id']=='hot-staging':
        video='''<section class="lx-footage"><p class="lx-eyebrow">See the real event</p><h2>Official SpaceX footage</h2><p>Compare the schematic with the official second-flight recap. The film supplies real imagery; the illustration supplies the explanation.</p><a href="https://www.youtube.com/watch?v=C3iHAgwIYtI" target="_blank" rel="noopener">Watch Starship’s Second Flight Test on YouTube ↗</a></section>'''
    elif lesson['id']=='catch':
        video='''<section class="lx-footage"><p class="lx-eyebrow">See the real event</p><h2>The first Super Heavy catch</h2><video controls playsinline preload="none" poster="/assets/dispatch/starship-catch-poster.jpg" aria-label="Official SpaceX footage of the first Super Heavy catch"><source src="/assets/dispatch/starship-catch.mp4" type="video/mp4"/>Your browser does not support this video. <a href="/assets/dispatch/starship-catch.mp4">Open the footage</a>.</video><p class="lx-fine">Official SpaceX footage · first Super Heavy catch. Video loads when you choose to play.</p><a href="https://www.spacex.com/launches/starship-flight-5" target="_blank" rel="noopener">Open SpaceX’s mission reference ↗</a></section>'''
    note='<p class="lx-responsibility">Driver assistance requires an attentive driver. Consult the instructions for your vehicle and region.</p>' if lesson['topic']=='tesla' else ''
    return f'''<main id="main" class="lx lx-lesson" data-lesson="{E(lesson['id'])}"><nav class="lx-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/explainers.html">Explainers</a><span aria-hidden="true">/</span><span aria-current="page">{E(lesson['title'])}</span></nav><header class="lx-lesson-head"><p class="lx-eyebrow">{E(lesson['category'])} · About {lesson['minutes']} min</p><h1>{E(lesson['title'])}</h1><p class="lx-answer">{E(lesson['answer'])}</p><p class="lx-lesson-meta">By <a href="/about.html">Alex R</a><span>Reference review <time datetime="{data['reviewed']}">{datetime.date.fromisoformat(data['reviewed']).strftime('%d %b %Y')}</time></span></p></header><nav class="lx-lesson-nav" aria-label="In this guide"><a href="#diagram-title">Explore diagram</a><a href="#deep-dive">Detailed guide</a><a href="#sources">Sources</a></nav><p class="lx-intro">{E(lesson['intro'])}</p>{note}{contents(lesson)}{lab}{comparison(snapshot) if lesson['id']=='fsd' else ''}{fact_cards(lesson)}<div class="lx-reading" id="key-ideas">{sections}{deep_dive(lesson)}{faq(lesson)}<section class="lx-misconceptions"><p class="lx-eyebrow">A clearer picture</p><h2>Common misunderstandings</h2>{myths}</section><section class="lx-glossary"><p class="lx-eyebrow">Plain English</p><h2>Key terms</h2><dl>{glossary}</dl></section>{video}<section class="lx-sources" id="sources"><p class="lx-eyebrow">Check the evidence</p><h2>Sources and scope</h2><p>The references below support the stated mechanism and limits. The artwork is an original educational schematic. Version snapshots are separate from the reference-review date.</p><ol>{sources}</ol></section></div><section class="lx-continue" aria-labelledby="continue-title"><p class="lx-eyebrow">Keep exploring</p><h2 id="continue-title">Connect the explanation to the evidence</h2><div>{related}</div><a class="lx-back" href="/explainers.html">← All visual explainers</a></section></main>'''

def metadata(shell,title,description,path,image,image_alt,ld):
    shell=re.sub(r'\n?[ \t]*<!--lx:metadata-->.*?<!--/lx:metadata-->\n?','',shell,flags=re.S)
    shell=re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>','',shell,flags=re.S)
    shell=re.sub(r'<title>.*?</title>',lambda _:f'<title>{E(title)} — Supercharged Daily</title>',shell,flags=re.S)
    shell=re.sub(r'<link\b[^>]*rel="canonical"[^>]*>',lambda _:f'<link rel="canonical" href="{SITE+path}" />',shell)
    values={'description':description,'og:type':'website' if path=='/explainers.html' else 'article','og:title':title,'og:description':description,'og:url':SITE+path,'og:image':SITE+image,'og:image:alt':image_alt,'twitter:title':title,'twitter:description':description,'twitter:image':SITE+image,'twitter:image:alt':image_alt}
    for key,value in values.items():
        attr='property' if key.startswith('og:') else 'name'
        replacement=f'<meta {attr}="{key}" content="{E(value)}" />'
        rx=r'<meta\b[^>]*'+attr+'="'+re.escape(key)+r'"[^>]*>'
        shell=re.sub(rx,lambda _:replacement,shell) if re.search(rx,shell) else shell.replace('</head>',replacement+'\n</head>',1)
    shell=re.sub(r'<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>','',shell)
    shell=re.sub(r'<noscript>\s*</noscript>','',shell)
    shell=re.sub(r'<script>(?:(?!</script>).)*data-vx-tab(?:(?!</script>).)*</script>','',shell,flags=re.S)
    shell=re.sub(r'/explainers\.css\?v=[^"\s]+','/explainers.css?v='+VERSION,shell)
    block='\n    <!--lx:metadata--><script type="application/ld+json">'+J(ld)+'</script><!--/lx:metadata-->\n'
    marker='    <!--sd:members-->'
    shell=shell.replace(marker,block+marker,1) if marker in shell else shell.replace('</head>',block+'</head>',1)
    return shell

def run(check=False):
    data=catalog();snapshot=tracker();source=(ROOT/'explainers.html').read_text()
    main=re.search(r'<main\b[^>]*id="main"[^>]*>.*?</main>',source,re.S)
    if not main:raise ValueError('Explainers shared shell must contain main#main')
    shell=source[:main.start()]+'{{LESSON_MAIN}}'+source[main.end():]
    publisher={'@type':'Organization','name':'Supercharged Daily','url':SITE}
    hub_ld={'@context':'https://schema.org','@type':'CollectionPage','name':'Tesla and SpaceX visual explainers','url':SITE+'/explainers.html','publisher':publisher,'mainEntity':{'@type':'ItemList','itemListElement':[{'@type':'ListItem','position':i+1,'name':l['title'],'url':SITE+url(l)} for i,l in enumerate(data['lessons'])]}}
    output={'explainers.html':metadata(shell,'Tesla and SpaceX visual explainers','Original visual guides to Starship hot staging, booster catches, FSD hardware and software, and collision assistance. Explore one clear lesson at a time.','/explainers.html','/assets/dispatch/starship-catch-poster.jpg','SpaceX footage of a Super Heavy booster catch',hub_ld).replace('{{LESSON_MAIN}}',hub(data))}
    for lesson in data['lessons']:
        path=url(lesson)
        ld=[{'@context':'https://schema.org','@type':['Article','LearningResource'],'headline':lesson['title'],'description':lesson['summary'],'url':SITE+path,'dateModified':data['reviewed'],'author':{'@type':'Person','name':'Alex R','url':SITE+'/about.html'},'publisher':publisher,'image':SITE+lesson['image'],'learningResourceType':'Interactive explainer','educationalLevel':'General audience','isAccessibleForFree':True,'timeRequired':'PT'+str(lesson['minutes'])+'M','citation':[s['url'] if s['url'].startswith('https:') else SITE+s['url'] for s in lesson['sources']]},{'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':SITE+'/'},{'@type':'ListItem','position':2,'name':'Explainers','item':SITE+'/explainers.html'},{'@type':'ListItem','position':3,'name':lesson['title'],'item':SITE+path}]}]
        output[path.lstrip('/')]=metadata(shell,lesson['title'],lesson['summary'],path,lesson['image'],lesson['imageAlt'],ld).replace('{{LESSON_MAIN}}',lesson_page(lesson,data,snapshot))
        output['assets/explainers/'+lesson['slug']+'.svg']=ART(lesson['id'],'cover-'+lesson['id'],True)+'\n'
    for rel in list(output):
        if rel.endswith('.html'):
            output[rel]=BUNDLES['patch'](output[rel],BUNDLES['page_spec'](rel))
    pages=json.loads((ROOT/'data/pages.json').read_text())
    for page in pages['pages']:
        if page['url']=='/explainers.html':
            page.update(title='Visual explainers',summary='Four illustrated Tesla and SpaceX guides: hot staging, booster catches, FSD hardware and software, and collision assistance.')
        elif page['url']=='/explainers.html#tesla':page['summary']='FSD hardware and software, plus warnings and braking assistance.'
    lesson_urls={url(l) for l in data['lessons']}
    pages['pages']=[p for p in pages['pages'] if p['url'] not in lesson_urls]
    pages['pages'] += [dict(url=url(l),title=l['title'],tag='Explainers',summary=l['summary']) for l in data['lessons']]
    pages['updated']=max(pages['updated'],data['reviewed'])
    output['data/pages.json']=json.dumps(pages,ensure_ascii=False,indent=2)+'\n'
    changed=[]
    for rel,content in output.items():
        p=ROOT/rel
        if not p.exists() or p.read_text()!=content:
            changed.append(rel)
            if not check:p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
    print(('Out of sync: ' if check else 'Built: ')+str(len(changed))+' explainer files')
    return int(bool(changed) and check)

if __name__=='__main__':sys.exit(run('--check' in sys.argv))
