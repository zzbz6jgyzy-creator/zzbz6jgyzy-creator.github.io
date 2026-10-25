"""Browser checks for the Roadster studio, with real media and deterministic local assets."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=Path('/tmp/roadster-studio');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,theme,mode in [(320,'dark','normal'),(390,'dark','normal'),(768,'dark','normal'),(1440,'dark','normal'),(390,'light','normal'),(1440,'light','normal'),(390,'dark','nojs'),(390,'dark','blocked-film')]:
   context=await browser.new_context(viewport={'width':width,'height':950},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block');await context.add_init_script("localStorage.setItem('sd-theme',"+json.dumps(theme)+")")
   page=await context.new_page();errors=[];requests=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(u.path)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-film' and u.path.endswith('.mp4'):return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes();mime=mimetypes.guess_type(str(f))[0]or'application/octet-stream';requested=r.request.headers.get('range')
     if requested and requested.startswith('bytes='):
      start,end=requested[6:].split('-',1);start=int(start or 0);end=min(int(end)if end else len(body)-1,len(body)-1)
      return await r.fulfill(status=206,body=body[start:end+1],content_type=mime,headers={'Content-Range':f'bytes {start}-{end}/{len(body)}','Accept-Ranges':'bytes'})
     return await r.fulfill(body=body,content_type=mime,headers={'Accept-Ranges':'bytes'})
    return await r.abort()
   await context.route('**/*',route)
   await page.goto(SITE+'/roadster.html',wait_until='domcontentloaded');await page.wait_for_timeout(500)
   await page.screenshot(path=str(OUT/f'{width}-{theme}-{mode}-hero.png'))
   assert await page.locator('h1').count()==1
   assert await page.locator('.rs-config').count()==3
   assert await page.locator('.rs-trim-details[open]').count()==0
   for trim in ['performance','thrust','rocket']:
    detail=page.locator(f'[data-config="{trim}"] .rs-trim-details')
    summary=detail.locator('summary')
    await summary.focus();await page.keyboard.press('Enter')
    assert await detail.get_attribute('open')is not None
    assert await detail.locator('dl').is_visible()
    assert await detail.locator('a').get_attribute('href')=='https://x.com/sawyermerritt/status/2114223853303959785'
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,trim,'expanded overflow')
    await page.keyboard.press('Enter')
    assert await detail.get_attribute('open')is None
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,'overflow')
   assert not any(u.endswith('.mp4') for u in requests),'film loaded before request'
   assert await page.locator('.rs-hero-image img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
   if mode=='normal' and width==1440 and theme=='dark':
    await page.wait_for_function("document.querySelector('.rs-studio').dataset.enhanced==='true'")
    await page.locator('[data-rs-gallery="interior"]').click();assert await page.locator('.rs-gallery-card:not([hidden])').count()==2
    await page.locator('.rs-gallery-card:not([hidden]) [data-rs-photo]').first.click();await page.wait_for_function("document.querySelector('#rs-photo-image').naturalWidth>0")
    assert await page.locator('#rs-photo-dialog').get_attribute('open')is not None
    await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');assert not await page.locator('#rs-photo-dialog').is_visible()
    await page.locator('[data-rs-hotspot="1"]').click();assert await page.locator('[data-rs-cockpit="1"]').evaluate('(e)=>e.classList.contains("is-selected")')
    await page.locator('[data-rs-system="thrust"]').click();assert await page.locator('[data-rs-tech-panel]:not([hidden])').count()==1
    assert await page.locator('.rs-engineering-stage').get_attribute('data-rs-diagram')=='thrust'
    await page.locator('[data-rs-system="thrust"]').press('ArrowRight');assert await page.locator('.rs-engineering-stage').get_attribute('data-rs-diagram')=='pressure'
    await page.locator('[data-rs-physics="0.59"]').click();assert '4.64' in await page.locator('#rs-g-value').inner_text()
    await page.locator('[data-rs-compare="performance"]').click();await page.locator('[data-rs-compare="rocket"]').click();assert await page.locator('#rs-compare th[scope="col"]').count()==3
    assert 'Not approved for public road use' in await page.locator('#rs-compare').inner_text()
    await page.locator('[data-rs-unit="metric"]').click();assert '370 km/h' in await page.locator('[data-rs-speed]').inner_text()
    await page.locator('#cockpit').screenshot(path=str(OUT/'cockpit-desktop.png'));await page.locator('#tech').screenshot(path=str(OUT/'engineering-desktop.png'))
    await page.locator('#rs-film-quality').select_option('720');await page.locator('#rs-film-cover').click()
    try:await page.wait_for_function("document.querySelector('#rs-film').currentTime>0",timeout=30000)
    except Exception:
     print('Media diagnostics:',await page.locator('#rs-film').evaluate("(v)=>({ready:v.readyState,error:v.error?.message,paused:v.paused,codec:v.canPlayType('video/mp4')})"),flush=True)
     raise
    assert await page.locator('#rs-film').evaluate('(v)=>v.muted')
    await page.locator('[data-rs-chapter="23.6"]').click();await page.wait_for_function("document.querySelector('#rs-film').currentTime>=23.4")
    await page.locator('#rs-film').evaluate('(v)=>v.pause()');await page.locator('#rs-film-quality').select_option('1080');await page.wait_for_function("document.querySelector('#rs-film').readyState>=1&&document.querySelector('#rs-film').currentTime>=23.4")
    await page.locator('#rs-film-ambient').click();assert not await page.locator('#rs-film').evaluate('(v)=>v.muted')
    await page.locator('#rs-film').screenshot(path=str(OUT/'film-desktop.png'))
   if mode=='nojs':
    assert await page.locator('.rs-gallery-card').count()==15
    assert await page.locator('.rs-tech-panel').count()==6
    assert await page.locator('.rs-nojs-film').count()==1
   if mode=='blocked-film':
    await page.locator('#rs-film-cover').click();await page.wait_for_function("document.querySelector('#rs-film-status').textContent.includes('could not load')")
   assert not errors,(width,theme,mode,errors)
   print(width,theme,mode,'passed',flush=True);await context.close()
  await browser.close()
asyncio.run(main())
