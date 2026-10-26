"""Grok guide browser checks. All external services are blocked."""
import asyncio,json,mimetypes,os,re,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/grok-studio');OUT.mkdir(exist_ok=True)
SITE='https://superchargeddaily.com'
KEY='sd-grok-studio-v1'

async def tap(page,selector):
 target=page.locator(selector)
 await target.scroll_into_view_if_needed()
 await page.wait_for_timeout(120)
 await target.click()

async def overflow(page,label):
 bad=await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
 assert not bad,label

async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'light','nojs'),(390,'dark','blocked-storage'),(390,'dark','bad-storage'),(390,'dark','malformed'),(390,'dark','lesson-link'),(390,'dark','prompt-link'),(390,'dark','legacy'),(390,'dark','bad-hash')]
  for width,theme,mode in cases:
   context=await browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block')
   await context.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('fixture: unavailable'))}})")
   if mode=='blocked-storage':await context.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='sd-grok-studio-v1')throw new Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='sd-grok-studio-v1')throw new Error('blocked');return s.call(this,k,v)}")
   if mode=='bad-storage':await context.add_init_script("if(!localStorage.getItem('sd-grok-studio-v1'))localStorage.setItem('sd-grok-studio-v1','{broken')")
   page=await context.new_page();page.set_default_timeout(12000);errors=[];requests=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes()
     if mode=='malformed'and u.path=='/grok.html':
      body=re.sub(r'(<script type="application/json" id="gx-data">)[\s\S]*?(</script>)',r'\1{malformed\2',body.decode()).encode()
     return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route)
   suffix={'lesson-link':'#lesson-reliable-routine','prompt-link':'#prompt-weekly-digest','legacy':'#advanced','bad-hash':'#%3Cscript%3Ebad%3C/script%3E'}.get(mode,'')
   await page.goto(SITE+'/grok.html'+suffix,wait_until='domcontentloaded')
   await page.wait_for_timeout(250)
   assert await page.locator('h1').count()==1
   await overflow(page,(width,theme,mode,'initial'))
   ids=await page.locator('[id]').evaluate_all('(els)=>els.map(x=>x.id)')
   assert len(ids)==len(set(ids)),'duplicate IDs'
   assert await page.locator('.gx-lesson').count()==12
   assert await page.locator('.gx-static-prompt').count()==8
   assert await page.locator('video[preload="none"]').count()==2
   assert not any('.mp4'in u for u in requests),'video loaded before a reader played it'
   if mode in ['nojs','malformed']:
    assert await page.locator('.gx-product-tabs').is_hidden()
    assert await page.locator('.gx-product-panel:visible').count()==6
    assert await page.locator('.gx-model-card').count()==3
    await tap(page,'#lesson-source-check>summary')
    assert await page.locator('#lesson-source-check').get_attribute('open')is not None
    assert await page.locator('#lesson-source-check .gx-example').is_visible()
    await tap(page,'#marketplace>summary')
    await tap(page,'#prompt-weekly-digest>summary')
    assert await page.locator('#prompt-weekly-digest pre').is_visible()
    await overflow(page,(width,theme,mode,'fallback'))
   else:
    await page.wait_for_function("document.querySelector('.gx-studio').dataset.enhanced==='true'")
    if mode in ['normal','blocked-storage','bad-storage']:
     if mode=='normal'and width in [390,1440]:
      await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
     assert await page.locator('.gx-product-panel:visible').count()==1
     await tap(page,'[data-gx-tab="voice"]')
     assert await page.locator('#capability-voice').is_visible()
     await page.locator('[data-gx-tab="voice"]').press('End')
     assert await page.locator('#capability-api').is_visible()
     await page.locator('[data-gx-tab="api"]').press('Home')
     assert await page.locator('#capability-research').is_visible()
     await tap(page,'[data-gx-tab="imagine"]')
     if mode=='normal'and width==1440 and theme=='dark':
      await page.locator('#capability-imagine').screenshot(path=str(OUT/'capability-1440-dark.png'))
     await overflow(page,(width,theme,mode,'capability'))
     await tap(page,'[data-gx-level="advanced"]')
     assert await page.locator('.gx-level-group:visible').count()==1
     assert await page.locator('#advanced').is_visible()
     await tap(page,'#capability-imagine [data-gx-lesson="visual-brief"]')
     assert await page.locator('#beginner').is_visible()
     assert await page.locator('#lesson-visual-brief').get_attribute('open')is not None
     await tap(page,'[data-gx-complete="visual-brief"]')
     assert await page.locator('#gx-progress').get_attribute('aria-valuenow')=='1'
     assert await page.locator('[data-gx-complete="visual-brief"]').get_attribute('aria-pressed')=='true'
     if mode=='normal'and width==390 and theme=='dark':
      await page.locator('#lesson-visual-brief').screenshot(path=str(OUT/'lesson-390-dark.png'))
     await tap(page,'[data-gx-copy-lesson="visual-brief"]')
     assert 'Copy this text'in await page.locator('[data-gx-lesson-status="visual-brief"]').inner_text()
     await tap(page,'[data-gx-recipe="weekly-digest"]')
     await page.locator('#gx-goal').fill('PRIVATE TEST GOAL')
     await page.locator('#gx-context').fill('PRIVATE CONTEXT')
     assert 'PRIVATE TEST GOAL'in await page.locator('#gx-prompt-output').input_value()
     await tap(page,'#gx-save-template')
     assert await page.locator('#gx-save-template').get_attribute('aria-pressed')=='true'
     await tap(page,'#gx-copy-prompt')
     assert 'copy'in(await page.locator('#gx-prompt-status').inner_text()).lower()
     assert await page.evaluate('document.activeElement.id')=='gx-prompt-output'
     assert await page.locator('#gx-open-product').get_attribute('href')=='https://x.ai/bot'
     await page.locator('#gx-model-a').select_option('grok-4.3')
     await page.locator('#gx-model-b').select_option('grok-4.7')
     assert await page.locator('#gx-model-results .gx-model-card').count()==2
     assert await page.locator('#gx-model-results .gx-model-card').first.get_attribute('data-gx-model')=='grok-4.3'
     assert '$16.00'in await page.locator('#gx-estimate-result').inner_text()
     await page.locator('#gx-input').fill('200000')
     assert 'Long context'in await page.locator('#gx-estimate-result').inner_text()
     assert '$812.00'in await page.locator('#gx-estimate-result').inner_text()
     await page.locator('#gx-cost-region').select_option('us')
     assert '$893.20'in await page.locator('#gx-estimate-result').inner_text()
     await page.locator('#gx-input').fill('500000')
     assert 'exceeds'in await page.locator('#gx-estimate-result').inner_text()
     assert '$893.20'not in await page.locator('#gx-estimate-result').inner_text()
     await page.locator('#gx-input').fill('')
     assert 'Enter whole'in await page.locator('#gx-estimate-result').inner_text()
     await page.locator('#gx-input').fill('5000')
     await page.locator('#gx-cost-region').select_option('global')
     if mode=='normal'and width==1440 and theme=='light':
      await page.locator('.gx-estimator').screenshot(path=str(OUT/'cost-1440-light.png'))
     await tap(page,'[data-gx-billing="annual"]')
     assert '$300'in await page.locator('.gx-plan-featured').inner_text()
     assert '/ year'in await page.locator('.gx-plan-featured').inner_text()
     await tap(page,'[data-gx-billing="monthly"]')
     assert '$30'in await page.locator('.gx-plan-featured').inner_text()
     await overflow(page,(width,theme,mode,'all interactions'))
     assert not any('PRIVATE'in u for u in requests)
     if mode=='blocked-storage':
      assert 'unavailable'in await page.locator('#gx-storage-note').inner_text()
     else:
      stored=await page.evaluate("JSON.parse(localStorage.getItem('sd-grok-studio-v1'))")
      assert set(stored)=={'completed','saved','product','level','lesson'}
      assert stored['completed']==['visual-brief'];assert stored['saved']==['weekly-digest']
      assert 'PRIVATE'not in json.dumps(stored)
      await page.goto(SITE+'/grok.html',wait_until='domcontentloaded')
      await page.wait_for_function("document.querySelector('.gx-studio').dataset.enhanced==='true'")
      assert await page.locator('#gx-progress').get_attribute('aria-valuenow')=='1'
      assert await page.locator('#capability-imagine').is_visible()
      assert await page.locator('#beginner').is_visible()
      assert await page.locator('#gx-saved-examples [data-gx-template="weekly-digest"]').count()==1
      assert 'PRIVATE'not in await page.locator('#gx-prompt-output').input_value()
      await tap(page,'#gx-reset-progress')
      assert await page.locator('#gx-progress').get_attribute('aria-valuenow')=='0'
      assert await page.locator('#gx-saved-examples [data-gx-template="weekly-digest"]').count()==1
    elif mode=='lesson-link':
     assert await page.locator('#lesson-reliable-routine').get_attribute('open')is not None
     assert await page.locator('#advanced').is_visible()
    elif mode=='prompt-link':
     assert await page.locator('#gx-recipe-title').inner_text()=='Weekly Bot'
     assert await page.locator('#gx-open-product').get_attribute('href')=='https://x.ai/bot'
    elif mode=='legacy':
     assert await page.locator('#advanced').is_visible()
     assert await page.locator('.gx-level-group:visible').count()==1
    elif mode=='bad-hash':
     assert await page.locator('#capability-research').is_visible()
   assert not errors,(width,theme,mode,errors)
   assert not any('api.x.ai'in u for u in requests),'an API request was made'
   print('PASS',width,theme,mode,flush=True)
   await context.close()
  await browser.close()
asyncio.run(main())
