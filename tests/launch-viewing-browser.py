"""Actual built page with fixed public fixtures and local routing; no external writes."""
import asyncio,base64,copy,json,mimetypes,os,pathlib,re,shutil
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('VIEWING_SCREENSHOTS','/tmp/launch-viewing'));OUT.mkdir(parents=True,exist_ok=True);DATA=json.loads((ROOT/'tests/fixtures/launch-viewing.json').read_text());KEY='sd-launch-viewing-v2'
WX={'properties':{'updateTime':'2026-10-24T15:00:00Z','skyCover':{'values':[{'validTime':'2026-10-27T04:00:00Z/PT1H','value':18}]},'probabilityOfPrecipitation':{'values':[{'validTime':'2026-10-27T04:00:00Z/PT1H','value':3}]}}}
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,mode='normal',query='',refresh_gate=None):
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
     if mode=='invalid-checked':return await r.fulfill(body=json.dumps({**DATA,'checked':'not-a-date'}),content_type='application/json')
     if mode in ['elapsed-refresh','unknown-pad-refresh']:
      await refresh_gate.wait()
      changed=copy.deepcopy(DATA);changed['checked']='2026-10-24T16:34:00Z'
      if mode=='elapsed-refresh':
       for launch in changed['launches']:launch.update(start='2020-01-01T00:00:00Z',status='done')
      else:
       launch=next(e for e in changed['launches'] if e['id']=='starlink-15-16');launch.update(id='unmatched-pad-test',title='Unmatched pad test launch',pad=None);changed['launches']=[launch]
      return await r.fulfill(body=json.dumps(changed),content_type='application/json')
     return await r.fulfill(body=json.dumps(DATA),content_type='application/json')
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if not f.is_file()or ROOT not in f.resolve().parents:return await r.abort()
    body=f.read_bytes()
    if u.path=='/see-the-launch.html':body=re.sub(rb'<script type="application/json" id="lv-data">[\s\S]*?</script>',lambda _:b'<script type="application/json" id="lv-data">'+json.dumps(DATA).encode()+b'</script>',body)
    return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
   await c.route('**/*',route);await page.clock.set_fixed_time(datetime(2026,10,24,16,tzinfo=timezone.utc));await page.goto(SITE+'/see-the-launch.html'+query,wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.lv-enhanced')
   return c,page,errors,requests
  async def preview(page,name,element=None):
   file=OUT/(name+'.jpg')
   if element:await page.locator(element).screenshot(path=str(file),type='jpeg',quality=65)
   else:
    await page.evaluate("scrollTo({top:0,behavior:'instant'})")
    await page.screenshot(path=str(file),type='jpeg',quality=65)
   print('LAUNCH_EXPERIENCE_PREVIEW '+file.name+' '+base64.b64encode(file.read_bytes()).decode(),flush=True)
  cases=[]
  for width in [320,390,768,1024,1440]:
   c,page,errors,requests=await context(width);assert await page.locator('h1').count()==1;assert await page.evaluate('window.__geoCalls')==0;assert not any('api.weather.gov'in r or'open-meteo'in r or'll.thespacedevs.com'in r for r in requests)
   await expect(page.locator('#lv-mission-bar')).not_to_be_empty()
   await expect(page.locator('#lv-readiness')).not_to_be_empty()
   await expect(page.locator('#lv-prep-clock')).not_to_be_empty()
   assert await page.locator('#lv-readiness li').count()==5
   await expect(page.locator('#lv-readiness [data-check=location]')).to_have_attribute('data-ready','false')
   if width in [390,1440]:await preview(page,'launch-hero-'+str(width)+'-dark')
   for view in ['sky','launches','guide','method']:
    await page.locator('.lv-nav [data-view='+view+']').click();assert await page.locator('#lv-'+view).is_visible();assert urlparse(page.url).fragment=='lv-'+view;assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,view,'overflow')
    if width in [390,1440]:await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'{view}-{width}.png'),full_page=True)
    cases.append([width,view])
   await page.locator('.lv-nav [data-view=sky]').click();await page.locator('[data-place="Santa Barbara"]').click();await expect(page.locator('#lv-direction-text b')).to_have_text('286° true');assert 'lat='not in page.url
   await expect(page.locator('#lv-readiness [data-check=location]')).to_have_attribute('data-ready','true')
   if width==390:await preview(page,'launch-compass-390','#lv-compass-card')
   if width==1440:await preview(page,'launch-primary-board-1440','.lv-primary-board')
   await page.locator('[data-map=region]').click();assert 'REGIONAL GEOMETRY'in await page.locator('#lv-map').inner_text()
   await page.locator('#lv-horizon').select_option('20');await page.locator('#lv-units').select_option('mi');await expect(page.locator('#lv-metrics')).to_contain_text('mi');await page.reload();await page.wait_for_selector('.lv-enhanced');await expect(page.locator('#lv-location-status')).to_contain_text('Santa Barbara');assert await page.locator('#lv-horizon').input_value()=='20'
   await page.locator('#lv-share-open').click();link=await page.locator('#lv-share-text').input_value();assert 'lat='not in link and'lon='not in link;await page.locator('#lv-share-location').check();link=await page.locator('#lv-share-text').input_value();assert 'lat=34.42'in link and'lon=-119.70'in link;await page.locator('#lv-share-copy').click();assert 'lat=34.42'in await page.evaluate('window.__copied');await page.keyboard.press('Escape')
   await page.locator('#lv-field-open').click();await expect(page.locator('#lv-field-bearing')).to_have_text('286°');await page.locator('#lv-night').click();assert 'lv-night'in await page.locator('#lv-field').get_attribute('class');await page.keyboard.press('Escape');assert not await page.locator('#lv-field').is_visible()
   await page.locator('#lv-weather').click();await expect(page.locator('#lv-weather-result')).to_contain_text('18');assert len([r for r in requests if'api.weather.gov'in r])==2
   await page.locator('#lv-launch').select_option('starship-15');await expect(page.locator('#lv-weather-result')).to_contain_text('No forecast checked');assert await page.locator('#lv-weather').is_disabled();assert 'Time unconfirmed'in await page.locator('#lv-metrics').inner_text();await expect(page.locator('#lv-prep-clock')).to_contain_text('Time unconfirmed');await expect(page.locator('#lv-mission-bar')).to_contain_text('Starship Flight 15')
   await page.locator('#lv-forget').click();assert 'Example view'in await page.locator('#lv-location-status').inner_text();assert await page.locator('#lv-field-open').is_disabled();await page.locator('#lv-geo').click();await expect(page.locator('#lv-location-status')).to_contain_text('blocked')
   await page.locator('#lv-location').fill('Dublin');await expect(page.locator('#lv-suggestions')).to_contain_text('Dublin');await page.locator('#lv-location').press('Enter');await expect(page.locator('#lv-location-status')).to_contain_text('Dublin');assert 'Europe/Dublin'in await page.locator('#lv-location-status').inner_text();assert not any('open-meteo'in r or'll.thespacedevs.com'in r for r in requests)
   await page.locator('#lv-location').fill('34.42, -119.70');await page.locator('#lv-search').click();await expect(page.locator('#lv-location-status')).to_contain_text('Pinned coordinates')
   assert not errors,errors;await c.close()
  for mode in ['light','no-js','blocked-js','bad-prefs','blocked-storage','legacy','source-failed','malformed','older','invalid-checked','weather-failed','no-forecast']:
   c,page,errors,requests=await context(mode=mode)
   if mode in ['no-js','blocked-js']:
    assert await page.locator('#lv-guide').is_visible();assert await page.locator('#lv-map svg').count()==1;assert await page.locator('.lv-launch-card').count()>0;assert not await page.locator('#lv-location').is_visible()
   elif mode=='blocked-storage':await expect(page.locator('#lv-storage')).to_contain_text('unavailable')
   elif mode=='legacy':await expect(page.locator('#lv-location-status')).to_contain_text('Santa Barbara')
   elif mode in ['source-failed','malformed','older','invalid-checked']:await expect(page.locator('#lv-freshness')).to_contain_text('Launch times may be out of date')
   elif mode in ['weather-failed','no-forecast']:
    await page.locator('[data-place="Santa Barbara"]').click();await page.locator('#lv-weather').click();await expect(page.locator('#lv-weather-result')).to_contain_text('unavailable'if mode=='weather-failed'else'Outside');assert '0%'not in await page.locator('#lv-weather-result').inner_text()
   if mode=='light':await preview(page,'launch-hero-390-light')
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode;assert not errors,errors;await c.close();cases.append(mode)
  c,page,errors,requests=await context(query='?lat=34.42&lon=-119.7&launch=starlink-15-16');await expect(page.locator('#lv-location-status')).to_contain_text('Shared approximate location');assert 'lat='not in page.url;assert not errors;await c.close();cases.append('explicit shared location')
  # Shared scenarios preserve the controls, without leaking coordinates by default.
  c,page,errors,_=await context();await page.locator('[data-place="Santa Barbara"]').click();await page.locator('[data-map=region]').click()
  await page.locator('#lv-horizon').select_option('20');await page.locator('#lv-units').select_option('mi')
  await page.locator('.lv-assumptions summary').click();await page.locator('#lv-altitude').select_option('120');await page.locator('#lv-downrange').select_option('250')
  await page.locator('#lv-share-open').click();link=await page.locator('#lv-share-text').input_value();params=parse_qs(urlparse(link).query)
  for key,value in {'horizon':'20','altitude':'120','downrange':'250','units':'mi','map':'region'}.items():assert params.get(key)==[value],(key,link)
  assert 'lat'not in params and'lon'not in params
  await page.locator('#lv-share-location').check();link=await page.locator('#lv-share-text').input_value()
  other,q,other_errors,_=await context(query='?'+urlparse(link).query+'#'+urlparse(link).fragment)
  for key,value in {'horizon':'20','altitude':'120','downrange':'250','units':'mi'}.items():assert await q.locator('#lv-'+key).input_value()==value
  assert await q.locator('[data-map=region]').get_attribute('aria-pressed')=='true'
  await expect(q.locator('#lv-location-status')).to_contain_text('Santa Barbara');assert 'lat='not in q.url
  assert not errors and not other_errors,(errors,other_errors);await other.close();await c.close();cases.append('shared scenario round trip')
  # A refresh must not leave the previous target's instruments on screen.
  for mode in ['elapsed-refresh','unknown-pad-refresh']:
   gate=asyncio.Event();c,page,errors,_=await context(mode=mode,refresh_gate=gate)
   await page.locator('[data-place="Santa Barbara"]').click();await expect(page.locator('#lv-direction-text b')).to_have_text('286° true')
   assert await page.locator('#lv-compass svg').count()==1;gate.set()
   if mode=='elapsed-refresh':
    await expect(page.locator('#lv-brief')).to_contain_text('No dated upcoming launches')
    await expect(page.locator('#lv-direction-text')).to_contain_text('No target selected')
    assert await page.locator('#lv-metrics').inner_text()=='';assert await page.locator('#lv-share-open').is_disabled()
   else:await expect(page.locator('#lv-launch-info')).to_contain_text('Unmatched pad test launch')
   assert await page.locator('#lv-compass svg').count()==0;assert await page.locator('#lv-sky-visual svg').count()==0
   assert await page.locator('#lv-field-open').is_disabled();assert await page.locator('#lv-compass-expand').is_disabled()
   await page.locator('#lv-compass-expand').dispatch_event('click');assert not await page.locator('#lv-field').is_visible()
   assert not errors,errors;await c.close();cases.append(mode)
  await browser.close();(OUT/'results.json').write_text(json.dumps({'passed':cases},indent=2));print('Passed viewing browser cases:',len(cases))
asyncio.run(main())
