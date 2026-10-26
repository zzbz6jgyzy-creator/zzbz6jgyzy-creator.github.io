"""Real gallery journeys using local first-party assets; downloads never leave the test."""
import asyncio,json,mimetypes,os,pathlib,shutil
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path('/tmp/wallpapers-studio');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,theme,mode in [(320,'dark','normal'),(390,'dark','normal'),(768,'dark','normal'),(1440,'dark','normal'),(390,'light','normal'),(1440,'light','normal'),(390,'dark','nojs'),(390,'dark','storage-blocked')]:
   c=await browser.new_context(viewport={'width':width,'height':950},reduced_motion='reduce',java_script_enabled=mode!='nojs',service_workers='block',is_mobile=width<=430,has_touch=width<=768)
   await c.add_init_script("localStorage.setItem('sd-theme',"+json.dumps(theme)+");"+("Object.defineProperty(window,'localStorage',{get(){throw new Error('unavailable')}})" if mode=='storage-blocked' else ''))
   page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=urlparse(r.request.url);f=ROOT/u.path.lstrip('/')
    if u.hostname!='superchargeddaily.com' or not f.is_file():return await r.abort()
    return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
   await c.route('**/*',route);await page.goto('https://superchargeddaily.com/wallpapers.html',wait_until='networkidle')
   assert await page.locator('h1').count()==1
   assert await page.locator('.ws-card').count()==16
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,'overflow')
   assert await page.locator('.ws-hero-art img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalWidth>0)'), 'broken hero image'
   await page.screenshot(path=str(OUT/f'{width}-{theme}-{mode}.png'),full_page=True)
   if mode!='nojs':
    await page.locator('[data-filter="Tesla"]').click();assert await page.locator('.ws-card:visible').count()==2
    await page.locator('.ws-card:visible [data-save]').first.click();await page.locator('[data-filter="Saved"]').click();assert await page.locator('.ws-card:visible').count()==1
    await page.locator('[data-format-choice="desktop"]').click();await page.locator('.ws-card:visible [data-wp-open]').click();await page.wait_for_selector('dialog[open]')
    assert 'desktop' in await page.locator('[data-wp-img]').get_attribute('alt');assert await page.locator('[data-wp-next]').is_hidden()
    async with page.expect_download() as d:await page.locator('[data-wp-desk]').click()
    download=await d.value;assert download.suggested_filename.endswith('-desktop.jpg')
    await page.keyboard.press('Escape');assert not await page.locator('dialog').is_visible()
    await page.locator('[data-filter="All"]').click();await page.locator('#ws-search').fill('no such wallpaper');assert await page.locator('.ws-empty').is_visible()
    await page.locator('#ws-reset').click();assert await page.locator('.ws-card:visible').count()==16
    await page.locator('[data-format-choice="phone"]').click();await page.locator('.ws-card [data-wp-open]').first.click();await page.wait_for_selector('dialog[open]');assert 'phone' in await page.locator('[data-wp-img]').get_attribute('alt')
    await page.locator('[data-wp-next]').click();assert 'Storm Launch' in await page.locator('[data-wp-title]').inner_text();await page.locator('[data-wp-close]').click()
    if mode!='storage-blocked':
     await page.reload();await page.wait_for_selector('.ws-enhanced');await page.locator('[data-filter="Saved"]').click();assert await page.locator('.ws-card:visible').count()==1
   else:assert await page.locator('.ws-download').count()==32
   assert not errors,(width,theme,mode,errors)
   print('PASS',width,theme,mode,flush=True);await c.close()
  await browser.close()
asyncio.run(main())
