"""Global atlas browser coverage. Network services are blocked; sources are static evidence links."""
import asyncio,json,mimetypes,os,re,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/fsd-global');OUT.mkdir(exist_ok=True)
KEY='sd-fsd-global-v1'
async def tap(page,s):
 el=page.locator(s);await el.scroll_into_view_if_needed();await el.click()
async def no_overflow(page,label):assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),label
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'light','nojs'),(390,'dark','blocked'),(390,'dark','bad-storage'),(390,'dark','malformed'),(390,'dark','country-link'),(390,'dark','bad-country'),(390,'dark','legacy')]
  for width,theme,mode in cases:
   ctx=await browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block')
   await ctx.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('fixture'))}})")
   if mode=='blocked':await ctx.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='sd-fsd-global-v1')throw Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='sd-fsd-global-v1')throw Error('blocked');return s.call(this,k,v)}")
   if mode=='bad-storage':await ctx.add_init_script("try{localStorage.setItem('sd-fsd-global-v1','{broken')}catch{}")
   page=await ctx.new_page();page.set_default_timeout(15000);errors=[];requests=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes()
     if mode=='malformed'and u.path=='/fsd.html':body=re.sub(r'(<script type="application/json" id="fg-data">)[\s\S]*?(</script>)',r'\1{bad\2',body.decode()).encode()
     return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await ctx.route('**/*',route)
   suffix={'country-link':'?country=NZ#map','bad-country':'?country=%3Cscript%3E#map','legacy':'#versions'}.get(mode,'')
   await page.goto('https://superchargeddaily.com/fsd.html'+suffix,wait_until='domcontentloaded');await page.wait_for_timeout(150)
   await no_overflow(page,(width,theme,mode,'initial'))
   assert await page.locator('h1').count()==1
   ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)');assert len(ids)==len(set(ids))
   assert await page.locator('.fg-static-grid>details').count()==53
   if mode in ['nojs','malformed']:
    assert await page.locator('.fg-filter-tools').is_hidden()
    await tap(page,'.fg-static-directory>summary');await tap(page,'.fg-static-grid>details:first-child>summary')
    assert await page.locator('.fg-static-grid>details:first-child p').first.is_visible()
    assert await page.locator('.fg-version-card').count()==4
    await no_overflow(page,(width,theme,mode,'fallback'))
   else:
    assert await page.locator('.fg-filter-tools').is_visible()
    if mode=='country-link':assert await page.locator('#fg-dossier h3').inner_text()=='New Zealand'
    if mode=='bad-country':assert await page.locator('#fg-dossier h3').inner_text()=='United States'
    if mode=='legacy':assert await page.locator('#versions').is_visible()
    if mode=='normal'and width in [390,1440]:await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
    if mode=='normal'and width==1440 and theme=='dark':await page.locator('.fg-atlas').screenshot(path=str(OUT/'atlas-desktop-dark.png'))
    await page.locator('#fg-search').fill('UK');assert await page.locator('#fg-list .fg-country-row').count()==1
    await tap(page,'#fg-list [data-fg-country="GB"]');assert await page.locator('#fg-dossier h3').inner_text()=='United Kingdom';assert 'country=GB'in page.url
    await page.locator('#fg-hardware').select_option('ai4');assert 'does not establish local activation'in await page.locator('#fg-car-advice').inner_text()
    await tap(page,'#fg-save')
    assert ('storage is unavailable'if mode=='blocked'else'Saved.')in await page.locator('#fg-save-status').inner_text()
    if mode=='blocked':assert 'storage unavailable'in await page.locator('#fg-my-country').inner_text()
    await tap(page,'#fg-share');assert await page.locator('#fg-copy-link').input_value()=='https://superchargeddaily.com/fsd.html?country=GB#map'
    await tap(page,'#fg-reset');await page.locator('#fg-status').select_option('listed');assert await page.locator('#fg-list .fg-country-row').count()==16
    await page.locator('#fg-region').select_option('Europe');assert await page.locator('#fg-list .fg-country-row').count()==9
    await tap(page,'#fg-reset');await page.locator('#fg-search').fill('not-a-country');assert await page.locator('#fg-list .fg-empty').count()==1
    await tap(page,'#fg-reset');await tap(page,'[data-fg-region="Asia-Pacific"]');assert '300'in await page.locator('#fg-map').get_attribute('viewBox')
    box=await page.locator('#fg-map').get_attribute('viewBox');await tap(page,'[data-fg-zoom="in"]');assert box!=await page.locator('#fg-map').get_attribute('viewBox')
    await tap(page,'[data-fg-zoom="reset"]');await tap(page,'#fg-map-pins [data-fg-country="AU"]');assert await page.locator('#fg-dossier h3').inner_text()=='Australia'
    await no_overflow(page,(width,theme,mode,'country'))
    if mode=='normal'and width==390 and theme=='dark':
     await page.set_viewport_size({'width':390,'height':1800})
     await page.locator('#fg-country').screenshot(path=str(OUT/'country-phone-dark.png'),style='.pn-wrap,.fg-nav{visibility:hidden!important}')
     await page.set_viewport_size({'width':390,'height':1000})
    await page.locator('#fg-compare-a').select_option('AU');await page.locator('#fg-compare-b').select_option('CN');assert await page.locator('#fg-comparison h3').all_inner_texts()==['Australia','China']
    if mode=='normal'and width==1440 and theme=='light':await page.locator('#compare').screenshot(path=str(OUT/'compare-desktop-light.png'))
    await page.locator('#fg-change-country').select_option('AU');assert await page.locator('#fg-changes>li').count()==2
    await page.locator('#fg-change-type').select_option('recognition');assert await page.locator('#fg-changes .fg-empty').count()==1
    await page.locator('#fg-change-country').select_option('');await page.locator('#fg-change-type').select_option('')
    if mode=='normal'and width==1440 and theme=='dark':await page.locator('#guide').screenshot(path=str(OUT/'guide-desktop-dark.png'))
    if mode not in ['blocked','bad-storage']:
     assert json.loads(await page.evaluate("localStorage.getItem('sd-fsd-global-v1')"))=={'country':'GB'}
     await page.goto('https://superchargeddaily.com/fsd.html',wait_until='domcontentloaded');assert await page.locator('#fg-dossier h3').inner_text()=='United Kingdom'
     await tap(page,'#fg-forget');assert await page.evaluate("localStorage.getItem('sd-fsd-global-v1')")is None
     await tap(page,'#fg-list [data-fg-country="US"]');await tap(page,'#fg-list [data-fg-country="NZ"]');await page.go_back();assert await page.locator('#fg-dossier h3').inner_text()=='United States'
    await no_overflow(page,(width,theme,mode,'final'))
   assert not errors,(mode,errors)
   assert not any('tesla.com/'in u or 'teslascope.com/'in u for u in requests),'unexpected external data request'
   print('PASS',width,theme,mode,flush=True);await ctx.close()
  await browser.close()
asyncio.run(main())
