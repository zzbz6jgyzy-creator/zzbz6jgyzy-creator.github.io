"""Real gallery journeys using local first-party assets; downloads never leave the test."""
import asyncio,json,os,pathlib,shutil,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path('/tmp/wallpapers-studio');OUT.mkdir(exist_ok=True)

class GalleryHandler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def log_message(self,*a):pass
 def end_headers(self):
  path=self.path.split('?',1)[0]
  # Chromium inlines image/jpeg navigations. The Desktop control is <a download>,
  # but Playwright route.fulfill never sees that request (download manager bypasses
  # it), so expect_download times out. Serve the files over real HTTP with an
  # attachment header so the click is a genuine download.
  if path.startswith('/assets/wallpapers/') and path.endswith('.jpg'):
   self.send_header('Content-Disposition','attachment; filename="%s"'%pathlib.Path(path).name)
  super().end_headers()

def start_server():
 httpd=ThreadingHTTPServer(('127.0.0.1',0),GalleryHandler)
 threading.Thread(target=httpd.serve_forever,daemon=True).start()
 return httpd

async def main():
 httpd=start_server()
 origin='http://127.0.0.1:%d'%httpd.server_address[1]
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
   for width,theme,mode in [(320,'dark','normal'),(390,'dark','normal'),(768,'dark','normal'),(1440,'dark','normal'),(390,'light','normal'),(1440,'light','normal'),(390,'dark','nojs'),(390,'dark','storage-blocked')]:
    c=await browser.new_context(viewport={'width':width,'height':950},reduced_motion='reduce',java_script_enabled=mode!='nojs',service_workers='block',is_mobile=width<=430,has_touch=width<=768,accept_downloads=True)
    await c.add_init_script("localStorage.setItem('sd-theme',"+json.dumps(theme)+");"+("Object.defineProperty(window,'localStorage',{get(){throw new Error('unavailable')}})" if mode=='storage-blocked' else ''))
    page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    async def route(r):
     if r.request.url.startswith(origin):return await r.fallback()
     return await r.abort()
    await c.route('**/*',route);await page.goto(origin+'/wallpapers.html',wait_until='networkidle')
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
     # Stabilize the dialog before the pointer click; the preview can resize it as it decodes.
     await page.locator('[data-wp-img]').evaluate('(img)=>img.decode()')
     desk=page.locator('dialog[open] a[data-wp-desk]')
     assert (await desk.get_attribute('href') or '').endswith('-desktop.jpg')
     async with page.expect_download() as d:await desk.click()
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
 finally:
  httpd.shutdown();httpd.server_close()
asyncio.run(main())
