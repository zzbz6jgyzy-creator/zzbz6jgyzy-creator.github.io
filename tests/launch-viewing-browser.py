"""Actual built page with fixed public fixtures and local routing; no external writes."""
import asyncio,json,mimetypes,os,pathlib,re,shutil
from urllib.parse import urlparse
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('VIEWING_SCREENSHOTS','/tmp/launch-viewing'));OUT.mkdir(parents=True,exist_ok=True);DATA=json.loads((ROOT/'tests/fixtures/launch-viewing.json').read_text());KEY='sd-launch-viewing-v2'
WX={'properties':{'updateTime':'2026-10-24T15:00:00Z','skyCover':{'values':[{'validTime':'2026-10-27T04:00:00Z/PT1H','value':18}]},'probabilityOfPrecipitation':{'values':[{'validTime':'2026-10-27T04:00:00Z/PT1H','value':3}]}}}
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,mode='normal',query=''):
   c=await browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',java_script_enabled=mode!='no-js',timezone_id='Europe/Dublin',service_workers='block');page=await c.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));await c.add_init_script("localStorage.setItem('sd-theme','"+('light'if mode=='light'else'dark')+"');window.__geoCalls=0;Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text}});Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(ok,fail)=>{window.__geoCalls++;fail({code:1})}}});")
   if mode=='blocked-storage':await c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
   if mode=='bad-prefs':await c.add_init_script("localStorage.setItem('"+KEY+"',JSON.stringify({place:{lat:999,lon:5},units:'bad'}))")
   if mode=='legacy':await c.add_init_script("localStorage.setItem('sd-see-launch-v1',JSON.stringify({place:'Santa Barbara, California',lat:34.4208,lon:-119.6982}))")
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname=='api.weather.gov':
     if mode=='weather-failed':return await r.abort()
     body={'properties':{'forecastGridData':'https://api.weather.gov/gridpoints/LOX/105,70'}}if'/points/'in u.path else WX
     if mode=='no-forecast'and'/gridpoints/'in u.path:body={'properties':{'skyCover':{'values':[]}}}
     return await r.fulfill(body=json.dumps(body),content_type='application/geo+json')
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-js'and'/see-the-launch.bundle.'in u.path:return await r.abort()
    if u.path=='/data/launch-viewing.json':
     if mode=='source-failed':return await r.abort()
     if mode=='malformed':return await r.fulfill(body='{"version":1,"launches":[]}',content_type='application/json')
     if mode=='older':return await r.fulfill(body=json.dumps({**DATA,'checked':'2020-01-01T00:00Z'}),content_type='application/json')
     return await r.fulfill(body=json.dumps(DATA),content_type='application/json')
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if not f.is_file()or ROOT not in f.resolve().parents:return await r.abort()
    body=f.read_bytes()
    if u.path=='/see-the-launch.html':body=re.sub(rb'<script type="application/json" id="lv-data">[\s\S]*?</script>',lambda _:b'<script type="application/json" id="lv-data">'+json.dumps(DATA).encode()+b'</script>',body)
    return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
   await c.route('**/*',route);await page.clock.set_fixed_time(1792857600);await page.goto(SITE+'/see-the-launch.html'+query,wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.lv-enhanced')
   return c,page,errors,requests
  cases=[]
  for width in [320,390,768,1440]:
   c,page,errors,requests=await context(width);assert await page.locator('h1').count()==1;assert await page.evaluate('window.__geoCalls')==0;assert not any('api.weather.gov'in r or'open-meteo'in r or'll.thespacedevs.com'in r for r in requests)
   for view in ['sky','launches','guide','method']:
    await page.locator('.lv-nav [data-view='+view+']').click();assert await page.locator('#lv-'+view).is_visible();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,view,'overflow')
    if width in [390,1440]:await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'{view}-{width}.png'),full_page=True)
    cases.append([width,view])
   await page.locator('.lv-nav [data-view=sky]').click();await page.locator('[data-place="Santa Barbara"]').click();await expect(page.locator('#lv-direction-text b')).to_have_text('286° true');assert 'lat='not in page.url
   await page.locator('[data-map=region]').click();assert 'REGIONAL GEOMETRY'in await page.locator('#lv-map').inner_text()
   await page.locator('#lv-horizon').select_option('20');await page.locator('#lv-units').select_option('mi');await expect(page.locator('#lv-metrics')).to_contain_text('mi');await page.reload();await page.wait_for_selector('.lv-enhanced');await expect(page.locator('#lv-location-status')).to_contain_text('Santa Barbara');assert await page.locator('#lv-horizon').input_value()=='20'
   await page.locator('#lv-share-open').click();link=await page.locator('#lv-share-text').input_value();assert 'lat='not in link and'lon='not in link;await page.locator('#lv-share-location').check();link=await page.locator('#lv-share-text').input_value();assert 'lat=34.42'in link and'lon=-119.70'in link;await page.locator('#lv-share-copy').click();assert 'lat=34.42'in await page.evaluate('window.__copied');await page.keyboard.press('Escape')
   await page.locator('#lv-field-open').click();await expect(page.locator('#lv-field-bearing')).to_have_text('286°');await page.locator('#lv-night').click();assert 'lv-night'in await page.locator('#lv-field').get_attribute('class');await page.keyboard.press('Escape');assert not await page.locator('#lv-field').is_visible()
   await page.locator('#lv-weather').click();await expect(page.locator('#lv-weather-result')).to_contain_text('18');assert len([r for r in requests if'api.weather.gov'in r])==2
   await page.locator('#lv-launch').select_option('starship-15');await expect(page.locator('#lv-weather-result')).to_contain_text('No forecast checked');assert await page.locator('#lv-weather').is_disabled();assert 'Time unconfirmed'in await page.locator('#lv-metrics').inner_text()
   await page.locator('#lv-forget').click();assert 'Example view'in await page.locator('#lv-location-status').inner_text();assert await page.locator('#lv-field-open').is_disabled();await page.locator('#lv-geo').click();await expect(page.locator('#lv-location-status')).to_contain_text('blocked')
   await page.locator('#lv-location').fill('Dublin');await expect(page.locator('#lv-suggestions')).to_contain_text('Dublin');await page.locator('#lv-location').press('Enter');await expect(page.locator('#lv-location-status')).to_contain_text('Dublin');assert 'Europe/Dublin'in await page.locator('#lv-location-status').inner_text();assert not any('open-meteo'in r or'll.thespacedevs.com'in r for r in requests)
   await page.locator('#lv-location').fill('34.42, -119.70');await page.locator('#lv-search').click();await expect(page.locator('#lv-location-status')).to_contain_text('Pinned coordinates')
   assert not errors,errors;await c.close()
  for mode in ['light','no-js','blocked-js','bad-prefs','blocked-storage','legacy','source-failed','malformed','older','weather-failed','no-forecast']:
   c,page,errors,requests=await context(mode=mode)
   if mode in ['no-js','blocked-js']:
    assert await page.locator('#lv-guide').is_visible();assert await page.locator('#lv-map svg').count()==1;assert await page.locator('.lv-launch-card').count()>0;assert not await page.locator('#lv-location').is_visible()
   elif mode=='blocked-storage':await expect(page.locator('#lv-storage')).to_contain_text('unavailable')
   elif mode=='legacy':await expect(page.locator('#lv-location-status')).to_contain_text('Santa Barbara')
   elif mode in ['source-failed','malformed','older']:await expect(page.locator('#lv-freshness')).to_contain_text('Launch times may be out of date')
   elif mode in ['weather-failed','no-forecast']:
    await page.locator('[data-place="Santa Barbara"]').click();await page.locator('#lv-weather').click();await expect(page.locator('#lv-weather-result')).to_contain_text('unavailable'if mode=='weather-failed'else'Outside');assert '0%'not in await page.locator('#lv-weather-result').inner_text()
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode;assert not errors,errors;await c.close();cases.append(mode)
  c,page,errors,requests=await context(query='?lat=34.42&lon=-119.7&launch=starlink-15-16');await expect(page.locator('#lv-location-status')).to_contain_text('Shared approximate location');assert 'lat='not in page.url;assert not errors;await c.close();cases.append('explicit shared location')
  await browser.close();(OUT/'results.json').write_text(json.dumps({'passed':cases},indent=2));print('Passed viewing browser cases:',len(cases))
asyncio.run(main())
