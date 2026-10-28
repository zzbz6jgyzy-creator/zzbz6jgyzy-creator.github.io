"""The desktop panel stays open while crossing to its farthest column."""
import asyncio,mimetypes,os,pathlib,re
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,height in [(1080,768),(1440,900)]:
   c=await browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce');c.set_default_timeout(12000)
   page=await c.new_page()
   async def route(r):
    u=urlparse(r.request.url);f=ROOT/(u.path.lstrip('/') or 'index.html')
    if r.request.method!='GET' or u.hostname!='superchargeddaily.com':return await r.abort()
    if u.path=='/members-config.json':return await r.fulfill(body='{"enabled":false}',content_type='application/json')
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    return await r.abort()
   await c.route('**/*',route);await page.goto(SITE+'/',wait_until='domcontentloaded')
   await page.wait_for_function('window.__pn')
   trigger=page.locator('.ns-dropdown>summary').filter(has_text=re.compile('^Tesla$'))
   await trigger.hover();await page.locator('#pn-tesla').wait_for(state='visible')
   target=page.locator('#pn-tesla a[href="/explainers.html#tesla"]')
   b=await target.bounding_box();await page.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=15)
   await page.wait_for_timeout(350)
   assert await page.locator('#pn-tesla').is_visible(),'Panel closed while crossing its columns'
   panel=await page.locator('#pn-tesla').bounding_box();assert panel['y']+panel['height']<=height
   await target.click();await page.wait_for_url(SITE+'/explainers.html#tesla')
   print('PASS pointer',width,height,flush=True);await c.close()
  await browser.close()
asyncio.run(main())
