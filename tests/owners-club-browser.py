"""Deterministic Owners Club layout and interactions; no external services."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/owners-club');OUT.mkdir(exist_ok=True)
SITE='https://superchargeddaily.com'
KEY='sd-owners-clubs-v2'
CITY_INDEX={
 'version':1,
 'columns':['name','country','latitude','longitude','timeZone','population','asciiName','admin1Code'],
 'cities':[
  ['London','GB',51.5085,-.1257,'Europe/London',8961989,'London','ENG'],
  ['London','CA',42.9834,-81.233,'America/Toronto',422324,'London','08'],
  ['Dublin','IE',53.3331,-6.2489,'Europe/Dublin',1024027,'Dublin','L'],
  ['Dublin','US',40.0992,-83.1141,'America/New_York',49474,'Dublin','OH'],
  ['Québec','CA',46.8123,-71.2145,'America/Toronto',531902,'Quebec','10']
 ]
}

async def tap(page,selector):
 locator=page.locator(selector)
 await locator.scroll_into_view_if_needed()
 await page.wait_for_timeout(160)
 await locator.click()

async def open_city(page):
 if await page.locator('#oc-city-panel').get_attribute('open')is None:
  summary=page.locator('#oc-city-panel summary')
  await summary.scroll_into_view_if_needed()
  await page.wait_for_timeout(450)
  await summary.click()
  await page.wait_for_function("document.getElementById('oc-city-panel').open")

async def assert_count(page,count):
 assert await page.locator('#oc-result-count b').inner_text()==str(count)

async def assert_private(page,requests):
 assert not any(k in parse_qs(urlparse(page.url).query)for k in ['lat','lon','latitude','longitude','place'])
 for u in requests:
  parsed=urlparse(u)
  assert not any(k in parse_qs(parsed.query)for k in ['lat','lon','latitude','longitude']),u
  assert not any(x in parsed.hostname for x in ['geocoding-api','bigdatacloud','nominatim','komoot'])
 raw=await page.evaluate("(()=>{try{return localStorage.getItem('sd-owners-clubs-v2')}catch{return null}})()")
 if raw:
  saved=json.loads(raw)
  assert set(saved)=={'saved','filters'}
  assert set(saved['filters'])=={'country','area','type','channel','view'}
  assert not any(k in json.dumps(saved).lower()for k in ['latitude','longitude','cityquery'])

async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'dark','nojs'),(390,'dark','blocked-storage'),(390,'dark','geo-granted'),(390,'dark','geo-denied'),(390,'dark','geo-race'),(390,'dark','city-failure'),(390,'dark','legacy'),(390,'dark','shared')]
  for width,theme,mode in cases:
   context=await browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block',geolocation={'latitude':51.5085,'longitude':-.1257},permissions=['geolocation']if mode=='geo-granted'else[])
   await context.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('fixture: clipboard unavailable'))}})")
   if mode=='blocked-storage':
    await context.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='sd-owners-clubs-v2')throw new Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='sd-owners-clubs-v2')throw new Error('blocked');return s.call(this,k,v)}")
   if mode=='geo-denied':
    await context.add_init_script("Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,fail)=>fail({code:1})}})")
   if mode=='geo-race':
    await context.add_init_script("Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,fail)=>{window.pendingGeoOK=ok;window.pendingGeoFail=fail}}})")
   page=await context.new_page();page.set_default_timeout(12000)
   errors=[];requests=[];city_requests=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if u.path=='/data/viewing/cities.json':
     city_requests.append(r.request.url)
     if mode=='city-failure':return await r.fulfill(status=503,body='Unavailable')
     return await r.fulfill(content_type='application/json',body=json.dumps(CITY_INDEX))
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route)
   suffix='?country=United+Kingdom&lat=51.5085&lon=-0.1257&place=Old+location'if mode=='legacy'else'?country=United+Kingdom&type=chapter&region=London'if mode=='shared'else''
   await page.goto(SITE+'/tesla-clubs.html'+suffix,wait_until='domcontentloaded');await page.wait_for_timeout(300)
   assert await page.locator('h1').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'initial overflow')
   all_ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)')
   assert len(set(all_ids))==len(all_ids),'duplicate page IDs'
   assert not city_requests,'city index loaded before a search'
   if width in [390,1440]and mode=='normal':await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
   if mode=='nojs':
    assert await page.locator('[data-oc-card]').count()==174
    assert await page.locator('.oc-static-country').count()==43
    assert await page.locator('#oc-workspace').is_hidden()
    assert await page.locator('#oc-country-united-kingdom [data-oc-card]').count()==17
    assert await page.locator('[data-oc-country]').count()==43
    await tap(page,'[data-oc-country="United Kingdom"]')
    assert page.url.endswith('#oc-country-united-kingdom')
   else:
    await page.wait_for_function("document.querySelector('.oc-studio').dataset.enhanced==='true'")
    if mode in ['normal','blocked-storage']:
     await assert_count(page,174)
     assert await page.locator('#oc-results [data-oc-card]').count()==12
     await tap(page,'#oc-pagination [data-oc-page="2"]')
     assert 'Page 2 of 15'in await page.locator('#oc-pagination').inner_text()
     await page.locator('#oc-country').select_option('United Kingdom');await assert_count(page,17)
     await tap(page,'#oc-pagination [data-oc-page="2"]');assert await page.locator('#oc-results [data-oc-card]').count()==5
     await tap(page,'[data-oc-type="chapter"]');await assert_count(page,15)
     await tap(page,'[data-oc-view="list"]');assert await page.locator('.oc-studio').get_attribute('data-view')=='list'
     await tap(page,'[data-oc-view="cards"]')
     await tap(page,'[data-oc-type="club"]');await assert_count(page,1)
     await tap(page,'#oc-results [data-oc-save="TOC-0012"]')
     assert await page.locator('#oc-saved-count').inner_text()=='1'
     if mode=='blocked-storage':assert 'page visit'in await page.locator('#oc-storage-note').inner_text()
     else:
      await page.reload(wait_until='domcontentloaded');await page.wait_for_function("document.querySelector('.oc-studio').dataset.enhanced==='true'")
      assert await page.locator('#oc-saved-count').inner_text()=='1';await assert_count(page,1)
      assert await page.locator('#oc-results [data-oc-save="TOC-0012"]').get_attribute('aria-pressed')=='true'
     await tap(page,'#oc-results [data-oc-detail="TOC-0012"]')
     assert await page.locator('#oc-dialog').get_attribute('open')is not None
     assert await page.locator('#oc-dialog-title').inner_text()=='Tesla Owners UK'
     assert '15 related listings'in await page.locator('#oc-dialog-body').inner_text()
     assert await page.evaluate("document.getElementById('oc-dialog').contains(document.activeElement)")
     if width in [390,1440]and mode=='normal':await page.locator('#oc-dialog').screenshot(path=str(OUT/f'dialog-{width}-{theme}.png'))
     await tap(page,'#oc-dialog [data-oc-copy="TOC-0012"]')
     assert 'Copy this link: https://superchargeddaily.com/tesla-clubs.html'in await page.locator('#oc-dialog-status').inner_text()
     await page.keyboard.press('Escape');assert await page.locator('#oc-dialog').get_attribute('open')is None
     await tap(page,'#oc-results [data-oc-detail="TOC-0012"]')
     await tap(page,'[data-oc-family="Tesla Owners UK"]');await assert_count(page,16)
     assert await page.locator('#oc-dialog').get_attribute('open')is None
     await tap(page,'[data-oc-type="community"]');await page.locator('#oc-channel').select_option('social')
     await tap(page,'[data-oc-saved-view]');await assert_count(page,1)
     assert await page.locator('#oc-channel').input_value()==''
     assert await page.locator('[data-oc-type=""]').get_attribute('aria-pressed')=='true'
     assert await page.locator('#oc-country').input_value()==''
     await tap(page,'#oc-reset');await assert_count(page,174)
     await page.locator('#oc-query').fill('no-such-group-98765');await assert_count(page,0)
     assert 'No listings match'in await page.locator('#oc-results').inner_text()
     await tap(page,'[data-oc-reset]');await assert_count(page,174)
     await tap(page,'[data-oc-area="Oceania"]');await assert_count(page,13)
     assert await page.locator('[data-oc-country]:visible').count()==2
     await tap(page,'[data-oc-country="Australia"]');await assert_count(page,9)
     await tap(page,'#oc-more-countries');assert await page.locator('[data-oc-country]:visible').count()==43
     await tap(page,'[data-oc-country="Worldwide"]');await assert_count(page,4)
     await tap(page,'[data-oc-type="community"]');await page.locator('[data-oc-type="community"]').press('Home')
     assert await page.locator('[data-oc-type=""]').get_attribute('aria-pressed')=='true'
     await tap(page,'#oc-copy-view');assert 'Copy this link:'in await page.locator('#oc-share-status').inner_text()
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'interaction overflow')
     if width in [390,1440]and mode=='normal':
      await page.locator('#oc-country').select_option('United Kingdom')
      await page.locator('#directory').scroll_into_view_if_needed();await page.wait_for_timeout(300)
      await page.screenshot(path=str(OUT/f'directory-{width}-{theme}.png'))
     if width==390 and theme=='dark'and mode=='normal':
      await tap(page,'#oc-reset');await open_city(page)
      await page.locator('#oc-city-query').fill('London');await tap(page,'#oc-city-submit')
      await page.wait_for_function("document.querySelectorAll('[data-oc-city]').length===2")
      assert len(city_requests)==1
      await tap(page,'[data-oc-city="0"]');await assert_count(page,17)
      assert 'Browsing United Kingdom for London'in await page.locator('#oc-location-status').inner_text()
      assert await page.locator('[data-oc-region]').count()==6
      await tap(page,'[data-oc-region="0"]');await assert_count(page,2)
      assert 'not meeting venues'in await page.locator('#oc-city-panel').inner_text()or'not identify a club venue'in await page.locator('#oc-city-panel').inner_text()
      await page.locator('#oc-city-query').fill('Dublin');await tap(page,'#oc-city-submit')
      await page.wait_for_function("document.querySelectorAll('[data-oc-city]').length===2")
      assert len(city_requests)==1,'loaded city index was not reused'
    elif mode in ['geo-granted','geo-denied','geo-race']:
     await open_city(page);await tap(page,'#oc-locate')
     if mode=='geo-granted':
      await page.wait_for_function("document.querySelectorAll('[data-oc-region]').length>0")
      assert 'London'in await page.locator('[data-oc-region="0"]').inner_text()
      assert 'not meeting venues'in await page.locator('#oc-location-status').inner_text()
      assert not city_requests
      await tap(page,'[data-oc-region="0"]');await assert_count(page,2)
     elif mode=='geo-denied':
      assert 'Location was not shared'in await page.locator('#oc-location-status').inner_text()
      assert await page.locator('#oc-locate').is_enabled()
     else:
      assert await page.locator('#oc-locate').is_disabled()
      await page.locator('#oc-city-query').fill('London');await tap(page,'#oc-city-submit')
      await page.wait_for_function("document.querySelectorAll('[data-oc-city]').length===2")
      assert await page.locator('#oc-locate').is_enabled()
      before=await page.locator('#oc-location-status').inner_text()
      await page.evaluate('window.pendingGeoOK({coords:{latitude:51.5085,longitude:-.1257}})')
      assert await page.locator('#oc-location-status').inner_text()==before
    elif mode=='city-failure':
     await open_city(page);await page.locator('#oc-city-query').fill('London');await tap(page,'#oc-city-submit')
     await page.wait_for_function("document.getElementById('oc-location-status').textContent.includes('could not load')")
     assert await page.locator('#oc-city-submit').is_enabled()
     await page.locator('#oc-country').select_option('Ireland');await assert_count(page,1)
    elif mode=='legacy':
     await assert_count(page,17)
     assert not any(k in parse_qs(urlparse(page.url).query)for k in ['lat','lon','place'])
    elif mode=='shared':
     await assert_count(page,1)
     assert 'London'in await page.locator('#oc-results').inner_text()
     await page.goto(SITE+'/tesla-clubs.html#club/CA-171',wait_until='domcontentloaded')
     await page.wait_for_function("document.getElementById('oc-dialog').open")
     assert 'Atlantic Canada'in await page.locator('#oc-dialog-title').inner_text()
     await page.keyboard.press('Escape')
    await assert_private(page,requests)
   assert not errors,(width,theme,mode,errors)
   print('PASS',width,theme,mode,flush=True)
   await context.close()
  await browser.close()

asyncio.run(main())
