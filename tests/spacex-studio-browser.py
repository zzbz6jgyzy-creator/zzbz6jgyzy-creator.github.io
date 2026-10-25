"""Deterministic local browser checks for the SpaceX mission hub."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/spacex-studio');OUT.mkdir(exist_ok=True);SITE='https://superchargeddaily.com'
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'dark','nojs'),(390,'dark','blocked-storage'),(390,'dark','expired'),(390,'dark','blocked-film')]
  for width,theme,mode in cases:
   context=await browser.new_context(viewport={'width':width,'height':950},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block')
   await context.add_init_script("localStorage.setItem('sd-theme',"+json.dumps(theme)+");Date.now=()=>Date.parse('"+('2030-01-01T00:00:00Z'if mode=='expired'else'2026-10-25T13:00:00Z')+"');")
   if mode=='blocked-storage':await context.add_init_script("Storage.prototype.setItem=function(){throw new Error('blocked')}")
   page=await context.new_page();errors=[];requests=[];page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(u.path)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-film'and u.path.endswith('.mp4'):return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes();mime=mimetypes.guess_type(str(f))[0]or'application/octet-stream';requested=r.request.headers.get('range')
     if requested and requested.startswith('bytes='):
      start,end=requested[6:].split('-',1);start=int(start or 0);end=min(int(end)if end else len(body)-1,len(body)-1)
      return await r.fulfill(status=206,body=body[start:end+1],content_type=mime,headers={'Content-Range':f'bytes {start}-{end}/{len(body)}','Accept-Ranges':'bytes'})
     return await r.fulfill(body=body,content_type=mime)
    return await r.abort()
   await context.route('**/*',route);await page.goto(SITE+'/spacex.html',wait_until='domcontentloaded');await page.wait_for_timeout(400)
   assert await page.locator('h1').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'overflow')
   assert await page.locator('.sx-hero-photo img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
   assert not any(x.endswith('.mp4')for x in requests),'video fetched before play'
   if width in [390,1440]and mode=='normal':await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
   if mode=='nojs':
    assert await page.locator('[data-sx-program-panel]').count()==5
    assert await page.locator('[data-sx-program-panel]').last.is_visible()
    assert await page.locator('[data-sx-step-panel]').count()==5
    assert await page.locator('.sx-story').count()==12
    assert await page.locator('.sx-launch').count()>0
    assert await page.locator('.sx-program-buttons').is_hidden()
    await page.locator('.sx-compare summary').click();assert await page.locator('.sx-table-scroll').is_visible()
   elif mode=='expired':
    assert 'No future timed opening' in await page.locator('#sx-next').inner_text()
    assert 'over 48 hours old' in await page.locator('#sx-age').inner_text()
    assert not await page.locator('.sx-countdown').count()
   else:
    await page.wait_for_function("document.querySelector('.sx-studio').dataset.enhanced==='true'")
    assert await page.locator('[data-sx-program-panel]:not([hidden])').count()==1
    for programme in ['heavy','dragon','starship','starlink','falcon9']:
     await page.locator(f'[data-sx-program="{programme}"]').click()
     assert await page.locator(f'[data-sx-program-panel="{programme}"]').is_visible()
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,programme,'overflow')
    await page.locator('[data-sx-program="falcon9"]').press('End');assert await page.locator('[data-sx-program="starlink"]').get_attribute('aria-pressed')=='true'
    for step in ['separate','orbit','return','repeat','launch']:
     await page.locator(f'[data-sx-step="{step}"]').click();assert await page.locator('#sx-flight-art').get_attribute('data-stage')==step
     assert await page.locator('[data-sx-step-panel]:not([hidden])').count()==1
    await page.locator('[data-sx-step="launch"]').press('ArrowRight');assert await page.locator('#sx-flight-art').get_attribute('data-stage')=='separate'
    await page.locator('[data-sx-filter="starship"]').click();assert 'Starship' in await page.locator('#sx-launch-list').inner_text()
    assert '00:00'not in await page.locator('#sx-launch-list').inner_text(),'day target acquired midnight timestamp'
    await page.locator('[data-sx-filter="all"]').click();await page.locator('#sx-zone').select_option('America/New_York')
    assert 'UTC'not in await page.locator('.sx-launch-date').first.inner_text()
    await page.locator('.sx-save').first.click();assert await page.locator('.sx-save').first.get_attribute('aria-pressed')=='true'
    if mode=='blocked-storage':assert 'Storage is unavailable' in await page.locator('#sx-message').inner_text()
    await page.locator('#sx-saved').click();assert await page.locator('.sx-launch').count()==1
    await page.locator('[data-sx-pin="viewing"]').click();assert 'Can I see the launch?' in await page.locator('#sx-pins').inner_text()
    if mode!='blocked-storage':
     await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(200)
     assert 'Can I see the launch?'in await page.locator('#sx-pins').inner_text()
     await page.locator('#sx-saved').click();assert await page.locator('.sx-launch').count()==1
    await page.locator('#sx-clear-saved').click();assert await page.locator('#sx-saved').inner_text()=='Saved launches (0)'
    await page.locator('[data-sx-topic="starlink"]').click();assert await page.locator('[data-sx-story]:not([hidden])').count()>0
    await page.locator('[data-sx-topic="dragon"]').click();assert await page.locator('#sx-stories-empty').is_visible()
    await page.locator('[data-sx-topic="all"]').click();assert await page.locator('[data-sx-story]:not([hidden])').count()==12
    await page.locator('.sx-compare summary').click();assert await page.locator('.sx-table-scroll').is_visible()
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,'table overflow')
    if mode=='normal'and theme=='dark'and width in [390,1440]:
     await page.locator('[data-sx-program="starship"]').click();await page.locator('#fleet').screenshot(path=str(OUT/f'fleet-{width}.png'))
     await page.locator('#engineering').screenshot(path=str(OUT/f'engineering-{width}.png'))
     await page.locator('#destinations').screenshot(path=str(OUT/f'tools-{width}.png'))
    if mode=='normal'and theme=='dark'and width==1440:
     await page.locator('#sx-film').evaluate('(v)=>v.play()');await page.wait_for_function("document.querySelector('#sx-film').currentTime>0")
     assert await page.locator('#sx-film').evaluate('(v)=>v.muted');await page.locator('#sx-film').evaluate('(v)=>v.pause()')
    if mode=='blocked-film':
     await page.locator('#sx-film').scroll_into_view_if_needed();await page.locator('#sx-film').evaluate('(v)=>{v.play().catch(()=>{});return true;}');await page.wait_for_function("document.querySelector('#sx-film-status').textContent.includes('could not load')")
   assert not errors,(width,theme,mode,errors)
   print(width,theme,mode,'passed',flush=True);await context.close()
  await browser.close()
asyncio.run(main())
