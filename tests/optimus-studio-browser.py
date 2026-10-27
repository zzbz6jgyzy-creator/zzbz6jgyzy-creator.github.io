"""Saved-page and interactive journeys. YouTube responses are mocked; streaming is not tested."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=Path('/tmp/optimus-studio');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,theme,mode in [(320,'dark','normal'),(390,'dark','normal'),(768,'dark','normal'),(1440,'dark','normal'),(390,'light','normal'),(1440,'light','normal'),(390,'dark','nojs'),(390,'dark','blocked-js'),(390,'dark','blocked-player')]:
   ctx=await browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block');await ctx.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+")}catch{}")
   page=await ctx.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(r.request.url)
    if u.hostname=='www.youtube-nocookie.com':
     if mode=='blocked-player':return await r.abort()
     return await r.fulfill(body='<html><body>Mock official player</body></html>',content_type='text/html')
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-js' and 'optimus.bundle.'in u.path:return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await ctx.route('**/*',route);await page.goto(SITE+'/optimus.html',wait_until='domcontentloaded');await page.wait_for_timeout(400)
   assert await page.locator('h1').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'overflow')
   assert await page.locator('.os-hero-robot img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
   assert not any('youtube' in u for u in requests),'third-party film requested before consent'
   await page.screenshot(path=str(OUT/f'{width}-{theme}-{mode}-hero.png'))
   if mode in ['nojs','blocked-js']:
    assert await page.locator('.os-system-panel:visible').count()==6
    assert await page.locator('.os-demo').count()==12
    assert await page.locator('.os-event:visible').count()==19
    assert await page.locator('#os-film-direct').is_visible()
   if mode in ['normal','blocked-player']:
    assert await page.locator('.os').evaluate('(e)=>e.classList.contains("os-enhanced")')
    await page.locator('.os-system-tabs [data-system="hands"]').click();assert await page.locator('#system-hands').is_visible()
    await page.locator('.os-system-tabs [data-system="hands"]').press('ArrowRight');assert await page.locator('#system-actuation').is_visible()
    assert await page.locator('.os-system-panel:visible').count()==1
    await page.locator('#os-probability').select_option('0.99');await page.locator('#os-steps').select_option('50');assert await page.locator('#os-result').inner_text()=='60.5%'
    await page.locator('#os-search').fill('shirt');assert await page.locator('.os-demo:not([hidden])').count()==1
    await page.locator('#os-search').fill('no match qqq');assert await page.locator('.os-no-results').is_visible()
    await page.locator('#os-clear').click();await page.locator('#os-category').select_option('learning');assert await page.locator('.os-demo:not([hidden])').count()==3
    await page.locator('.os-timeline-filters [data-type="target"]').click();assert await page.locator('.os-event:visible').count()==2;assert await page.locator('.os-timeline-year:visible').count()==1
    await page.locator('.os-timeline-filters [data-type="all"]').click();assert await page.locator('.os-event:visible').count()==19
    if width<=700:
     assert await page.locator('.os-specs td[data-gen="gen3"]:visible').count()==11 and await page.locator('.os-specs td[data-gen="gen2"]:visible').count()==0
     await page.locator('.os-gen-switch [data-gen="gen2"]').click();assert await page.locator('.os-specs td[data-gen="gen2"]:visible').count()==11
    else:assert await page.locator('.os-specs td:visible').count()==55
    await page.locator('#os-clear').click();await page.locator('[data-gallery="2"]').click();assert await page.locator('.os-lightbox').is_visible();await page.keyboard.press('ArrowRight');assert 'angle' in await page.locator('.os-lightbox-image img').get_attribute('src');await page.keyboard.press('Escape');assert not await page.locator('.os-lightbox').is_visible();assert await page.locator('[data-gallery="2"]').evaluate('(x)=>x===document.activeElement')
    await page.locator('[data-film="event"]').click();await page.locator('#os-play').click();frame=page.locator('#os-player iframe');assert 'start=1189' in await frame.get_attribute('src');assert '6v6dbxPlsXs' in await frame.get_attribute('src');assert 'watch the official film' in await page.locator('#os-player-status').inner_text()
    await page.locator('[data-film="gen2"]').click();assert await page.locator('#os-player iframe').count()==0
    await page.evaluate("location.hash='ai-day-2022'");await page.wait_for_timeout(150);assert await page.locator('#ai-day-2022').get_attribute('open')is not None
   assert await page.locator('#os-film-direct').get_attribute('href')=='https://www.youtube.com/watch?v=cpraXaw7dyc'
   await page.locator('#questions details').first.locator('summary').click();assert await page.locator('#questions details').first.get_attribute('open')is not None
   if width in [390,1440] and theme=='dark' and mode=='normal':
    await page.locator('#engineering').screenshot(path=str(OUT/f'{width}-engineering.png'));await page.locator('#gallery').screenshot(path=str(OUT/f'{width}-gallery.png'));await page.screenshot(path=str(OUT/f'{width}-full.png'),full_page=True)
   assert not errors,(width,theme,mode,errors)
   print(width,theme,mode,'passed',flush=True);await ctx.close()
  await browser.close()
asyncio.run(main())
