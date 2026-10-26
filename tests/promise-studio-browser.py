"""Deterministic Promise Tracker browser checks; all external services are blocked."""
import asyncio,json,mimetypes,os,re,shutil
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/promise-studio');OUT.mkdir(exist_ok=True)
SITE='https://superchargeddaily.com'
KEY='sd-promise-ledger-v1'
FIRST='fsd-eu-approval-q1-2027'

async def tap(page,selector):
 target=page.locator(selector)
 await target.scroll_into_view_if_needed()
 await page.wait_for_timeout(150)
 await target.click()

async def count(page,value):
 text=await page.locator('#pr-result-count').inner_text()
 assert re.match(r'^\s*'+str(value)+r'\b',text),(value,text)

async def storage(page):
 return await page.evaluate("(()=>{try{return JSON.parse(localStorage.getItem('sd-promise-ledger-v1')||'null')}catch{return null}})()")

async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'dark','nojs'),(390,'dark','blocked-storage'),(390,'dark','stale'),(390,'dark','legacy'),(390,'dark','shared'),(390,'dark','malformed'),(390,'dark','bad-shared')]
  for width,theme,mode in cases:
   context=await browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block')
   await context.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}Date.now=()=>Date.parse('"+('2028-01-01T12:00:00Z'if mode=='stale'else'2026-10-26T12:00:00Z')+"');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('fixture: unavailable'))}})")
   if mode=='blocked-storage':await context.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='sd-promise-ledger-v1')throw new Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='sd-promise-ledger-v1')throw new Error('blocked');return s.call(this,k,v)}")
   page=await context.new_page();page.set_default_timeout(12000);errors=[];requests=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes()
     if mode=='malformed'and u.path=='/promise-tracker.html':
      body=re.sub(r'(<script type="application/json" id="pr-data">)[\s\S]*?(</script>)',r'\1{malformed\2',body.decode()).encode()
     return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route)
   suffix='#fsd-90-percent-2013'if mode=='legacy'else'?company=SpaceX&topic=Grok%20%2F%20xAI&view=timeline'if mode=='shared'else'?company=unknown&status=unknown&view=unknown#unknown-record'if mode=='bad-shared'else''
   await page.goto(SITE+'/promise-tracker.html'+suffix,wait_until='domcontentloaded');await page.wait_for_timeout(300)
   assert await page.locator('h1').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'initial overflow')
   ids=await page.locator('[id]').evaluate_all('(els)=>els.map(x=>x.id)');assert len(ids)==len(set(ids)),'duplicate page IDs'
   if mode in ['nojs','malformed']:
    assert await page.locator('[data-pr-record]').count()==64
    assert await page.locator('.pr-static-evidence').count()==64
    assert await page.locator('#pr-controls').is_hidden()
    assert await page.locator('[data-pr-watchlist]').first.is_hidden()
    assert await page.locator('[data-pr-save]').first.is_hidden()
    detail=page.locator('.pr-static-evidence').first
    await detail.locator('summary').scroll_into_view_if_needed();await page.wait_for_timeout(450);await detail.locator('summary').click()
    assert await detail.get_attribute('open')is not None
    assert await detail.locator('.pr-statement').is_visible()
    assert await detail.locator('.pr-evidence-link').count()>0
   else:
    await page.wait_for_function("document.querySelector('.pr-studio').dataset.enhanced==='true'")
    if width in [390,1440]and mode=='normal':await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
    if mode in ['normal','blocked-storage']:
     await count(page,64);assert await page.locator('#pr-results [data-pr-record]').count()==12
     await tap(page,'[data-pr-page="2"]');assert await page.locator('#pr-results [data-pr-record]').count()==12
     await tap(page,'#pr-reset');await count(page,64)
     await page.locator('#pr-company').select_option('SpaceX');await count(page,16)
     await page.locator('#pr-topic').select_option('Grok / xAI');await count(page,1)
     assert await page.locator('#pr-results [data-pr-record]').get_attribute('data-pr-record')=='grok-bot-enterprise-few-weeks'
     await tap(page,'#pr-reset')
     await tap(page,'[data-pr-status="Delivered"]');await count(page,6)
     await page.locator('[data-pr-status="Delivered"]').press('Home');await count(page,64)
     await page.locator('#pr-query').fill('EU-wide');await count(page,1)
     await tap(page,'#pr-results [data-pr-save="'+FIRST+'"]')
     assert await page.locator('#pr-saved-count').inner_text()=='1'
     await page.locator('#pr-company').select_option('SpaceX');await count(page,0)
     await tap(page,'.pr-hero [data-pr-watchlist]')
     await count(page,1);assert await page.locator('#pr-company').input_value()==''
     assert await page.locator('#pr-results [data-pr-record]').get_attribute('data-pr-record')==FIRST
     await tap(page,'#pr-results [data-pr-open="'+FIRST+'"]')
     assert await page.locator('#pr-dialog').is_visible()
     assert 'EU-wide'in await page.locator('#pr-dialog-title').inner_text()
     assert 'Q1 2027'in await page.locator('#pr-dialog').inner_text()
     assert await page.locator('#pr-dialog .pr-evidence-link').first.get_attribute('href')=='https://stockanalysis.com/stocks/tsla/transcripts/712902-q3-2026/'
     assert await page.locator('#pr-dialog .pr-related-link').get_attribute('href')=='/autonomy.html'
     assert await page.locator('#pr-dialog [data-pr-save]').get_attribute('aria-pressed')=='true'
     await tap(page,'#pr-dialog [data-pr-copy]');assert 'https://superchargeddaily.com/promise-tracker.html'in await page.locator('#pr-dialog-status').inner_text()
     if width==390 and theme=='dark'and mode=='normal':await page.locator('#pr-dialog').screenshot(path=str(OUT/'evidence-390-dark.png'))
     await page.keyboard.press('Escape');assert await page.locator('#pr-dialog').is_hidden()
     focus=await page.evaluate('({id:document.activeElement.id,open:document.activeElement.dataset.prOpen})');assert focus['id']=='pr-query'or focus['open']==FIRST,focus
     await tap(page,'#pr-reset');await tap(page,'[data-pr-view="timeline"]')
     assert await page.locator('.pr-timeline-row').count()==64
     assert '2031'in await page.locator('.pr-timeline-axis').inner_text()
     assert await page.locator('.pr-timeline-outcome').count()==17
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'timeline overflow')
     if width==1440 and theme=='light'and mode=='normal':await page.screenshot(path=str(OUT/'timeline-1440-light.png'))
     await page.locator('#pr-company').select_option('SpaceX');await page.locator('#pr-topic').select_option('Grok / xAI');await count(page,1)
     await tap(page,'#pr-copy-search');shared=await page.locator('#pr-share-status').inner_text();assert 'promise-tracker.html?'in shared;assert 'SpaceX'in shared
     prefs=await storage(page)
     if mode=='blocked-storage':assert 'storage'in(await page.locator('#pr-storage-note').inner_text()).lower()
     else:
      assert set(prefs)=={'saved','filters'};assert prefs['saved']==[FIRST];assert set(prefs['filters'])=={'company','topic','status','view','sort'}
      assert prefs['filters']['company']=='SpaceX';assert prefs['filters']['topic']=='Grok / xAI';assert prefs['filters']['view']=='timeline'
      await page.reload(wait_until='domcontentloaded');await page.wait_for_function("document.querySelector('.pr-studio').dataset.enhanced==='true'")
      await count(page,1);assert await page.locator('#pr-company').input_value()=='SpaceX';assert await page.locator('.pr-timeline-row').count()==1;assert await page.locator('#pr-saved-count').inner_text()=='1'
      await page.goto(SITE+'/promise-tracker.html#watchlist',wait_until='domcontentloaded');await page.wait_for_function("document.querySelector('.pr-studio').dataset.enhanced==='true'");await count(page,1)
      assert await page.locator(f'#pr-results [data-pr-record="{FIRST}"], #pr-results .pr-timeline-title[data-pr-open="{FIRST}"]').count()==1
    elif mode=='stale':
     assert await page.locator('#pr-runtime-status').inner_text()
     await page.locator('#pr-query').fill('EU-wide');await count(page,1)
     assert (await page.locator('#pr-results .pr-status').inner_text()).strip().lower()=='in progress'
     raw_status=await page.locator('#pr-data').evaluate('(e)=>JSON.parse(e.textContent).raw.promises.find(p=>p.id==="fsd-eu-approval-q1-2027").status')
     assert raw_status=='In progress'
    elif mode=='legacy':
     await page.wait_for_function("document.getElementById('pr-dialog').open")
     assert '90%'in await page.locator('#pr-dialog-title').inner_text()
     assert '2013'in await page.locator('#pr-dialog').inner_text()
     await tap(page,'#pr-close');assert await page.locator('#pr-dialog').is_hidden()
     await page.goto(SITE+'/promise-tracker.html#roadster-ship-2025',wait_until='domcontentloaded');await page.wait_for_function("document.getElementById('pr-dialog').open")
     assert await page.locator('#pr-dialog a[href="https://superchargeddaily.com/dispatch/roadster-reveal-2026.html"]').count()>0
    elif mode=='shared':
     await count(page,1);assert await page.locator('#pr-company').input_value()=='SpaceX';assert await page.locator('#pr-topic').input_value()=='Grok / xAI';assert await page.locator('.pr-timeline-row').count()==1
     await tap(page,'[data-pr-view="cards"]');assert await page.locator('#pr-results [data-pr-record]').get_attribute('data-pr-record')=='grok-bot-enterprise-few-weeks'
    elif mode=='bad-shared':
     await count(page,64);assert await page.locator('#pr-company').input_value()=='';assert await page.locator('#pr-dialog').is_hidden();assert await page.locator('#pr-results [data-pr-record]').count()==12
   assert not errors,(width,theme,mode,errors)
   assert not any('/data/promises.json'in u for u in requests),'source fetched despite a complete embedded snapshot'
   print('PASS',width,theme,mode,flush=True);await context.close()
  await browser.close()
asyncio.run(main())
