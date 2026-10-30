"""Read-only/local source routing. Exercises the actual built first-party page."""
import asyncio,json,mimetypes,os,pathlib,shutil
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('STARSHIP_SCREENSHOTS','/tmp/starship-observatory'));OUT.mkdir(parents=True,exist_ok=True);KEY='sd-starship-observatory-v1'
DATA=json.loads((ROOT/'data/starship-studio.json').read_text())
# The planning date shown is the next flight's reference date; read it from the data so a schedule change doesn't break the test.
import datetime as _dt;_r=_dt.date.fromisoformat(DATA['next']['referenceDate']);PLAN_DATE=f"{_r.day} {_r.strftime('%b')} {_r.year}"
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,theme='dark',mode='normal',url='/starship.html',timezone='UTC'):
   c=await browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',java_script_enabled=mode!='no-js',service_workers='block',timezone_id=timezone)
   init="localStorage.setItem('sd-theme',"+json.dumps(theme)+");Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text}});"
   if mode=='bad-prefs':init+="localStorage.setItem('"+KEY+"',JSON.stringify({favorites:'bad',recent:{}}));"
   if mode=='storage-blocked':init+="Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked')}});"
   await c.add_init_script(init);page=await c.new_page();errors=[];requests=[];page.on('pageerror',lambda err:errors.append(str(err)));page.on('request',lambda req:requests.append(req.url))
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if u.path.endswith('.mp4'):return await r.abort()
    if mode=='blocked-js'and'/starship.bundle.'in u.path:return await r.abort()
    if u.path=='/data/starship-studio.json':
     if mode=='source-failed':return await r.abort()
     if mode=='older':return await r.fulfill(body=json.dumps({**DATA,'updated':'2020-01-01'}),content_type='application/json')
     if mode=='malformed':return await r.fulfill(body='{"schema":1,"flights":[]}',content_type='application/json')
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await c.route('**/*',route);await page.goto(SITE+url,wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.ss-enhanced')
   return c,page,errors,requests
  count=0
  for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
   c,page,errors,requests=await context(width,theme);assert await page.locator('h1').count()==1;assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not any('youtube'in r or r.endswith('.mp4')for r in requests),'eager video request'
   for view in ['overview','next','archive','engineering','watch']:
    await page.locator('.ss-nav [data-view='+view+']').click();assert await page.locator('#'+view).is_visible();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,view,'overflow')
    if width in [390,1440]and theme=='dark':
     await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'{view}-{width}-{theme}.png'),full_page=True)
    count+=1
   await page.locator('.ss-nav [data-view=archive]').click();await page.locator('#ss-search').fill('Flight 5');assert await page.locator('.ss-flight').count()==1;assert await page.locator('.ss-flight').get_attribute('data-flight')=='5'
   await page.locator('.ss-flight>summary').click();assert await page.locator('#ss-flight-dialog').is_visible();assert await page.locator('#ss-flight-content .ss-phase-list>li').count()==10
   await page.locator('#ss-save-flight').click();assert await page.locator('#ss-save-flight').get_attribute('aria-pressed')=='true';await page.locator('#ss-copy-flight').click();assert '#flight/5'in await page.evaluate('window.__copied')
   if width in [390,1440]and theme=='dark':await page.screenshot(path=str(OUT/f'flight-{width}-dark.png'))
   await page.keyboard.press('Escape');assert await page.locator('.ss-flight>summary').evaluate('e=>e===document.activeElement')
   await page.locator('#ss-clear').click();await page.locator('#ss-saved-filter').click();assert await page.locator('.ss-flight').count()==1
   await page.reload();await page.wait_for_selector('.ss-enhanced');assert await page.locator('#ss-saved-count').inner_text()=='1';await page.locator('#ss-layout-toggle').click();assert await page.locator('#ss-flight-list table').is_visible();await page.locator('#ss-layout-toggle').click()
   await page.locator('#ss-search').fill('not-a-real-flight-zzz');assert await page.locator('.ss-empty').is_visible();await page.locator('[data-reset-filters]').click();assert await page.locator('.ss-flight').count()==len(DATA['flights'])
   await page.locator('#ss-open-compare').click();assert await page.locator('#ss-compare-dialog').is_visible();assert await page.locator('.ss-compare-table tbody tr').count()==10;await page.locator('#ss-copy-compare').click();assert '#compare/'in await page.evaluate('window.__copied');await page.locator('#ss-compare-a').select_option('14');await page.locator('#ss-compare-b').select_option('14');assert 'two different flights'in await page.locator('#ss-compare-content').inner_text();await page.keyboard.press('Escape')
   await page.locator('.ss-nav [data-view=engineering]').click();await page.locator('[data-part=engines]').click();assert await page.locator('[data-part-info=engines]').is_visible();assert await page.locator('[data-stack-part=engines]').get_attribute('class')=='ss-rocket-part is-active';assert await page.locator('.ss-engine-ring .ss-engine').count()==33
   assert not errors,(width,theme,errors);await c.close()
  print('PASS:',count,'responsive/theme views; archive search, saved flights/reload, table, modal focus, comparisons, copy links and anatomy',flush=True)
  for url,title in [('/starship.html#lab/5','Flight 5'),('/starship.html#flight/14','Flight 14')]:
   c,page,errors,_=await context(url=url);assert await page.locator('#ss-flight-title').inner_text()==title;await page.keyboard.press('Escape');assert not errors;await c.close()
  c,page,errors,_=await context(url='/starship.html#lab/compare/5/14');assert await page.locator('#ss-compare-dialog').is_visible();await page.keyboard.press('Escape');await c.close()
  for old in ['#log','#schedule','#next-flight']:
   c,page,errors,_=await context(url='/starship.html'+old);assert await page.locator('#'+('archive'if old=='#log'else'next')).is_visible();assert not errors;await c.close()
  c,page,errors,requests=await context();await page.locator('.ss-nav [data-view=watch]').click();await page.locator('#ss-watch-flight').select_option('5');assert await page.locator('.ss-media-card:visible').count()==2
  # First play action opens the player; YouTube stays absent until the explicit consent button.
  recap=await page.evaluate("SDStarshipView.media(JSON.parse(document.getElementById('ss-studio-data').textContent)).findIndex(m=>m.flight===5&&m.kind==='recap')")
  await page.locator('[data-media="'+str(recap)+'"]').click();assert await page.locator('#ss-player iframe').count()==0;assert not any('youtube'in u for u in requests);await page.locator('#ss-load-youtube').click();assert await page.locator('#ss-player iframe').count()==1;await page.keyboard.press('Escape');assert await page.locator('#ss-player iframe').count()==0
  await page.locator('#ss-watch-flight').select_option('14');await page.locator('.ss-media-play:visible').first.click();assert await page.locator('#ss-player video').count()==1;await page.keyboard.press('Escape');assert await page.locator('#ss-player video').count()==0;assert not errors,errors;await c.close();print('PASS: old bookmarks/deep links, actual flight media filtering, explicit third-party player load and player cleanup',flush=True)
  for mode in ['source-failed','older','malformed','storage-blocked','bad-prefs','no-js','blocked-js']:
   c,page,errors,_=await context(mode=mode)
   if mode in ['no-js','blocked-js']:
    assert await page.locator('[data-ss-panel]:visible').count()==5;assert not await page.locator('#ss-search').is_visible();await page.locator('.ss-flight[data-flight="5"]>summary').click();assert await page.locator('.ss-flight[data-flight="5"] .ss-flight-fallback').is_visible();assert await page.locator('.ss-flight[data-flight="5"] .ss-phase-list>li').count()==10
   else:
    await page.locator('.ss-nav [data-view=archive]').click();await page.locator('#ss-search').fill('S41');assert await page.locator('.ss-flight').count()==1
    if mode in ['source-failed','older','malformed']:
     await page.locator('#ss-refresh').click();await page.wait_for_function("!document.getElementById('ss-refresh').disabled")
     message=await page.locator('#ss-data-status').inner_text();assert ('older'in message if mode=='older'else'unavailable'in message.lower()),(mode,message);assert await page.locator('.ss-flight').count()==1
    if mode=='storage-blocked':
     await page.locator('.ss-flight>summary').click();await page.locator('#ss-save-flight').click();assert 'visit only'in await page.locator('#ss-flight-status').inner_text()
   assert not errors,(mode,errors);assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode;await c.close()
  c,page,errors,_=await context(timezone='Pacific/Kiritimati');await page.locator('.ss-nav [data-view=next]').click();assert PLAN_DATE in await page.locator('.ss-planning-date').inner_text(),PLAN_DATE;assert 'Awaiting'in await page.locator('#ss-clock-label').inner_text();await c.close();print('PASS: failed/older/malformed sources, blocked storage, malformed preferences, readable no/blocked-JS page, calendar-date timezone and unconfirmed timing',flush=True)
  await browser.close()
asyncio.run(main())
