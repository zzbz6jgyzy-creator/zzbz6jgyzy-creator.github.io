"""Local routed page, no external writes. Real built scripts, downloads and responsive journeys."""
import asyncio,json,mimetypes,os,pathlib,shutil
from urllib.parse import urlparse
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('CALENDAR_SCREENSHOTS','/tmp/calendar-studio'));OUT.mkdir(parents=True,exist_ok=True);DATA=json.loads((ROOT/'data/calendar-studio.json').read_text());KEY='sd-calendar-studio-v1'
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,mode='normal'):
   c=await browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',java_script_enabled=mode!='no-js',timezone_id='Europe/Dublin',service_workers='block');page=await c.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));await c.add_init_script("localStorage.setItem('sd-theme','dark');Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text}})")
   if mode=='light':await c.add_init_script("localStorage.setItem('sd-theme','light')")
   if mode=='bad-prefs':await c.add_init_script("localStorage.setItem('"+KEY+"',JSON.stringify({saved:{bad:1},zone:'broken'}))")
   if mode=='blocked-storage':await c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-js'and'/calendar.bundle.'in u.path:return await r.abort()
    if u.path=='/data/calendar-studio.json':
     if mode=='source-failed':return await r.abort()
     if mode=='malformed':return await r.fulfill(body='{"version":1,"events":[]}',content_type='application/json')
     if mode=='older':return await r.fulfill(body=json.dumps({**DATA,'launchChecked':'2020-01-01T00:00Z'}),content_type='application/json')
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await c.route('**/*',route);await page.clock.set_fixed_time(1792857600);await page.goto(SITE+'/calendar.html',wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.cs-enhanced');await page.wait_for_function("document.getElementById('cs-result-count').textContent.length>0")
   return c,page,errors,requests
  checks=[]
  for width in [320,390,768,1440]:
   c,page,errors,requests=await context(width)
   assert await page.locator('h1').count()==1
   for view in ['agenda','month','saved','planning']:
    await page.locator('[data-view='+view+']').click();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,view,'overflow')
    if width in [390,1440]:
     await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'{view}-{width}.png'),full_page=True)
    checks.append([width,view])
   await page.locator('[data-view=agenda]').click();await page.locator('#cs-search').fill('15-16');await expect(page.locator('#cs-results .cs-event')).to_have_count(1)
   await page.locator('#cs-results [data-save]').click();await expect(page.locator('#cs-saved-count')).to_have_text('1');await page.reload();await page.wait_for_selector('.cs-enhanced');await page.wait_for_function("document.getElementById('cs-result-count').textContent.length>0");await expect(page.locator('#cs-saved-count')).to_have_text('1')
   await page.locator('[data-view=saved]').click();await expect(page.locator('#cs-results .cs-event')).to_have_count(1)
   await page.locator('#cs-results [data-open]').click();assert await page.locator('#cs-dialog').is_visible();await page.locator('#cs-dialog-copy').click();assert 'event=starlink-15-16'in await page.evaluate('window.__copied')
   async with page.expect_download()as info:await page.locator('#cs-dialog-export').click()
   download=await info.value;text=pathlib.Path(await download.path()).read_text();assert 'UID:starlink-15-16@superchargeddaily.com'in text;assert 'DTSTART:20261027T044500Z'in text
   await page.keyboard.press('Escape');assert not await page.locator('#cs-dialog').is_visible()
   await page.locator('#cs-zone').select_option('America/Los_Angeles');assert '21:45'in await page.locator('#cs-results .cs-event-time').inner_text()
   await page.locator('[data-view=month]').click();cell=page.locator('.cs-month-grid [tabindex="0"]');await cell.focus();old=await cell.get_attribute('data-date');await page.keyboard.press('ArrowRight');assert await page.locator('.cs-month-grid [tabindex="0"]').get_attribute('data-date')!=old;assert await page.locator('.cs-month-grid [tabindex="0"]').evaluate('(e)=>document.activeElement===e')
   await page.locator('[data-month="1"]').click();await expect(page.locator('.cs-month-bar h3')).to_have_text('November 2026');await page.locator('[data-date="2026-11-08"]').click();assert 'NET date'in await page.locator('.cs-day-panel').inner_text();assert 'Time unconfirmed'in await page.locator('.cs-day-panel').inner_text()
   assert not errors,errors;assert not any('ll.thespacedevs.com'in u for u in requests);await c.close()
  for mode in ['light','no-js','blocked-js','bad-prefs','blocked-storage','source-failed','malformed','older']:
   c,page,errors,requests=await context(mode=mode)
   if mode in ['no-js','blocked-js']:
    assert await page.locator('.cs-static-only').is_visible();assert await page.locator('.cs-static-detail').count()>40;assert not await page.locator('.cs-toolbar').is_visible()
   elif mode=='blocked-storage':await expect(page.locator('#cs-storage')).to_contain_text('unavailable')
   elif mode in ['source-failed','malformed','older']:await expect(page.locator('#cs-freshness')).to_contain_text('Using the saved page');assert await page.locator('#cs-results .cs-event').count()>0
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode;assert not errors,errors;await c.close();checks.append(mode)
  await browser.close();(OUT/'results.json').write_text(json.dumps({'passed':checks},indent=2));print('Passed calendar responsive journeys, exports, time zones, keyboard and fallback cases:',len(checks))
asyncio.run(main())
