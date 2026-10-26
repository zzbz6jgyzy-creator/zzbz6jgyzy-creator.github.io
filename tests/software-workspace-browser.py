"""Functional and visual checks using local first-party files, never live writes."""
import asyncio,json,mimetypes,os,pathlib
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com'
DATA=json.loads((ROOT/'updates-live.json').read_text());CFG=json.loads((ROOT/'scripts/js-bundles.json').read_text())
OUT=pathlib.Path(os.environ.get('SOFTWARE_SCREENSHOTS','/tmp/software-workspace'));OUT.mkdir(parents=True,exist_ok=True)
LATEST=max((v for v in DATA['versions'] if v['count']>0),key=lambda v:v.get('firstSeen') or v.get('date') or '')['id']
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,theme='dark',mode='live',profile=False):
   c=await browser.new_context(viewport={'width':width,'height':900},java_script_enabled=mode!='no-js',reduced_motion='reduce')
   await c.add_init_script("localStorage.setItem('sd-theme',"+repr(theme)+")")
   if profile:await c.add_init_script("localStorage.setItem('sd-my-tesla-v1',JSON.stringify({cc:'IE',hw:'hw4',model:'my',sw:'2026.32.7'}))")
   await c.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window._softwareCopied=value}}})")
   async def route(r):
    u=urlparse(r.request.url);rel=u.path.lstrip('/')
    if u.hostname!='superchargeddaily.com':await r.abort();return
    if mode=='blocked' and (rel=='updates-live.json' or rel.startswith('data/')):await r.abort();return
    if mode=='partial' and rel in ['data/updates-history.json','data/updates-extras.json']:await r.abort();return
    if mode in ['older','malformed'] and rel=='updates-live.json':
     payload={**DATA,'updated':'2020-01-01T00:00:00Z'} if mode=='older' else {'updated':'bad','versions':[]}
     await r.fulfill(content_type='application/json',body=json.dumps(payload));return
    f=ROOT/rel
    if f.is_file() and ROOT in f.resolve().parents:await r.fulfill(content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes());return
    await r.abort()
   await c.route('**/*',route);return c
  pages=0
  for width,theme in [(320,'dark'),(390,'dark'),(800,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
   c=await context(width,theme);page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   requests=[];page.on('request',lambda r:requests.append(r.url))
   await page.goto(SITE+'/updates.html');await page.locator('#sw-live[data-refresh-state="success"]').wait_for()
   assert await page.locator('h1').count()==1
   assert await page.locator('#t-new').inner_text()==LATEST
   assert await page.locator('#overview').is_visible()
   assert await page.locator('#releases').is_hidden()
   for view in ['overview','releases','compare','rollouts']:
    await page.locator(f'[data-view-link="{view}"]').click()
    assert await page.locator('#'+view).is_visible()
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,view,'overflow')
    if width in [390,1440]:await page.screenshot(path=str(OUT/f'{view}-{width}-{theme}.png'),full_page=True)
    pages+=1
   assert not any('cesium' in u.lower() for u in requests),'Globe code loaded without user action'
   await page.locator('[data-view-link="releases"]').click();await page.locator('#sw-search').fill(LATEST)
   assert await page.locator('.sw-release:visible').count()==1
   await page.locator('.sw-release summary').click();await page.locator('dialog[open]').wait_for()
   assert await page.locator('#sw-dialog-title').inner_text()==LATEST
   await page.keyboard.press('Escape');assert await page.locator('dialog[open]').count()==0
   assert await page.locator('.sw-release summary').evaluate('e=>e===document.activeElement')
   await page.locator('[data-clear-filters]').click();await page.locator('#sw-release-country').select_option('IE')
   assert await page.locator('#sw-country').input_value()=='IE'
   assert await page.locator('#sw-rollout-country').input_value()=='IE'
   expected=sum((v.get('countryCounts') or {}).get('IE',0)>0 for v in DATA['versions'])
   assert await page.locator('.sw-release:visible').count()==expected
   await page.locator('#sw-hardware').select_option('hw3')
   explicit=sum((v.get('countryCounts') or {}).get('IE',0)>0 and bool(v.get('fsdHw3')) for v in DATA['versions'])
   assert await page.locator('.sw-release:visible').count()==explicit
   await page.locator('[data-view-link="releases"]').focus();await page.keyboard.press('ArrowLeft')
   assert await page.locator('[data-view-link="overview"]').get_attribute('aria-selected')=='true'
   await page.keyboard.press('End');assert await page.locator('[data-view-link="rollouts"]').get_attribute('aria-selected')=='true'
   await page.locator('[data-view-link="compare"]').click();a=await page.locator('#d-a').input_value();await page.locator('#d-b').select_option(a)
   assert 'same release' in await page.locator('#diff-out').inner_text()
   await page.locator('[data-share-compare]').click();assert '#compare' in await page.evaluate('window._softwareCopied')
   await page.locator('[data-view-link="rollouts"]').click();await page.locator('a[href="#globe"]').click();await page.locator('#g-load').click();await page.locator('#g-error').filter(has_text='unavailable').wait_for()
   assert await page.locator('#sw-countries table').is_visible()
   assert not errors,(width,theme,errors)
   await c.close()
  for mode in ['no-js','blocked','older','malformed','partial']:
   c=await context(mode=mode);page=await c.new_page();await page.goto(SITE+'/updates.html')
   if mode!='no-js':await page.locator('[data-refresh-status]').wait_for()
   assert await page.locator('#t-new').inner_text()==LATEST
   if mode=='no-js':
    for view in ['overview','releases','compare','rollouts']:assert await page.locator('#'+view).is_visible()
    assert await page.locator('[data-release-filters]').is_hidden()
    await page.locator('.sw-release summary').first.click();assert await page.locator('.sw-release[open] .sw-release-notes').first.is_visible()
   else:
    await page.locator('[data-view-link="releases"]').click();await page.locator('#sw-search').fill('2026')
    assert await page.locator('.sw-release:visible').count()>0
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode
   await c.close()
  c=await context(profile=True);page=await c.new_page();await page.goto(SITE+'/updates.html');await page.locator('#sw-live[data-refresh-state="success"]').wait_for();assert await page.locator('#sw-country').input_value()=='IE';assert 'My Tesla' in await page.locator('[data-profile-note]').inner_text()
  for old,view in [('mycar','overview'),('waves','rollouts'),('sample-waves','rollouts'),('check','rollouts'),('ladder','rollouts'),('globe','rollouts'),('diff','compare')]:
   await page.goto(SITE+'/updates.html#'+old);await page.locator('#sw-live[data-refresh-state="success"]').wait_for();assert await page.locator('#'+view).is_visible(),old
  await page.goto(SITE+'/updates.html?release='+LATEST+'#releases');await page.locator('dialog[open]').wait_for();assert await page.locator('#sw-dialog-title').inner_text()==LATEST
  await c.close();await browser.close();print(f'PASS: {pages} responsive/theme views; search, filters, modal focus, keyboard, sharing, legacy URLs, profile country, globe failure and five saved-data fallback modes')
asyncio.run(main())
