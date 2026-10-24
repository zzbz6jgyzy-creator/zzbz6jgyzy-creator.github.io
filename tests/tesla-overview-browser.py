import asyncio,json,mimetypes,os,pathlib,re
from urllib.parse import urlparse
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('TESLA_SCREENSHOTS','/tmp/tesla-overview-previews'));OUT.mkdir(parents=True,exist_ok=True)
KEY='sd-tesla-overview-v1'
async def run():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  async def setup(width=390,mode='normal',hash=''):
   c=await b.new_context(viewport={'width':width,'height':900},device_scale_factor=1,java_script_enabled=mode!='no-js',reduced_motion='reduce');errors=[];page=await c.new_page();page.on('pageerror',lambda x:errors.append(str(x)))
   await c.add_init_script("localStorage.setItem('sd-theme','"+('light'if mode=='light'else'dark')+"')")
   if mode=='storage-blocked':await c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})")
   if mode=='bad-prefs':await c.add_init_script("localStorage.setItem('"+KEY+"',JSON.stringify({vehicle:'<script>',pins:['bad',1,{},'software','software'],metric:'bad'}))")
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-js'and'/tesla.bundle.'in u.path:return await r.abort()
    if u.path=='/data/tesla-overview.json':
     if mode=='fetch-failed':return await r.abort()
     if mode=='malformed':return await r.fulfill(body='{"version":1}',content_type='application/json')
     if mode=='older':
      d=json.loads((ROOT/'data/tesla-overview.json').read_text());d['software']['updated']='2000-01-01';d['software']['id']='OLD-BUILD';return await r.fulfill(body=json.dumps(d),content_type='application/json')
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if not f.is_file()or ROOT not in f.resolve().parents:return await r.abort()
    return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
   await c.route('**/*',route);await page.goto(SITE+'/tesla.html'+hash,wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.to-enhanced')
   return c,page,errors
  cases=[]
  for w in [320,390,768,1440]:
   c,page,errors=await setup(w);assert await page.locator('h1').count()==1
   for view in ['overview','lineup','trackers','discover']:
    await page.locator('.to-nav [data-view='+view+']').click();await expect(page.locator('#'+view)).to_be_visible();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(w,view,'overflow')
    if w in [390,1440]:
     await page.locator('img').evaluate_all("imgs=>imgs.forEach(i=>i.loading='eager')");await page.evaluate("Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))");await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'{view}-{w}.png'),full_page=True)
    cases.append([w,view])
   await page.locator('[data-view=lineup]').click();await page.locator('[data-car=cybertruck]').click();await expect(page.locator('#to-showroom h3')).to_have_text('Cybertruck');await page.reload();await expect(page.locator('#to-showroom h3')).to_have_text('Cybertruck')
   await page.locator('[data-view=trackers]').click();await page.locator('[data-filter=autonomy]').click();assert await page.locator('.to-tool:not([hidden])').count()==4
   await page.locator('#to-search').fill('Europe');assert await page.locator('.to-tool:not([hidden])').count()==2
   await page.locator('#to-search').fill('qwertyasdf');assert await page.locator('#to-no-results').is_visible();await page.locator('#to-search').fill('');await page.locator('[data-filter=all]').click()
   await page.locator('[data-pin=optimus]').click();await expect(page.locator('[data-pin=optimus]')).to_have_attribute('aria-pressed','true');await page.locator('[data-view=overview]').click();assert await page.locator('#to-shortcuts a[href="/optimus.html"]').count()==1
   await page.locator('[data-metric=energyGwh]').click();await expect(page.locator('#to-chart')).to_contain_text('GWh');await page.locator('#to-chart summary').click();assert await page.locator('#to-chart table').is_visible();await page.reload();await expect(page.locator('[data-metric=energyGwh]')).to_have_attribute('aria-pressed','true')
   await page.locator('[data-view=trackers]').click();await page.locator('[data-pin=roadster]').click();await page.locator('[data-pin=production]').click();await page.locator('[data-pin=markets]').click();await expect(page.locator('#to-announcement')).to_contain_text('six shortcuts');assert await page.evaluate("JSON.parse(localStorage.getItem('"+KEY+"')).pins.length")==6
   await page.keyboard.press('Tab');assert not errors,errors;await c.close()
  for mode in ['light','no-js','blocked-js','storage-blocked','bad-prefs','fetch-failed','malformed','older']:
   c,page,errors=await setup(mode=mode)
   if mode in ['no-js','blocked-js']:
    for view in ['overview','lineup','trackers','discover']:assert await page.locator('#'+view).is_visible()
    assert not await page.locator('#to-search').is_visible();assert await page.locator('.to-tool').count()==12
   else:
    if mode=='storage-blocked':await expect(page.locator('#to-storage')).to_contain_text('unavailable')
    await page.locator('[data-view=discover]').click();assert await page.locator('.to-story').count()>0
    assert 'OLD-BUILD'not in await page.locator('#to-brief-grid').inner_text()
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode
   assert not errors,errors;cases.append(mode);await c.close()
  for h,view in [('#energy','discover'),('#news','discover'),('#robotaxi','overview'),('#explorers','lineup'),('#sources','overview')]:
   c,page,errors=await setup(hash=h);await expect(page.locator('#'+view)).to_be_visible();assert not errors;cases.append(h);await c.close()
  await b.close();print(json.dumps({'passed':len(cases),'cases':cases},indent=2))
asyncio.run(run())
