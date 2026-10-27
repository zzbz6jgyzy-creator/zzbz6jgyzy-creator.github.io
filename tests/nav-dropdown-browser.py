"""Desktop dropdown groups stay reachable: walking the pointer down the Tesla menu to "Company" must not collapse the menu.

Regression for: opening a group on hover closed the group above it, which shifted "Company" and shrank the panel out from
under the pointer, so the whole menu closed before Company could be clicked.
"""
import asyncio,json,mimetypes,os,pathlib,re
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
CFG=json.loads((ROOT/'scripts/js-bundles.json').read_text())

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def open_page(width,height):
   context=await browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
   page=await context.new_page()
   async def route(r):
    if r.request.method!='GET' or not r.request.url.startswith(SITE+'/'):return await r.abort()
    rel=urlparse(r.request.url).path.lstrip('/') or 'index.html'
    bundle=re.fullmatch(r'assets/js/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js',rel)
    if bundle:return await r.fulfill(content_type='application/javascript',body='\n;\n'.join((ROOT/f).read_text() for f in CFG['bundles'][bundle[1]]))
    f=ROOT/rel
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes())
    await r.abort()
   await page.route('**/*',route);await page.goto(SITE+'/',wait_until='domcontentloaded')
   await page.locator('.pn-dd > button').filter(has_text='Tesla').wait_for();await page.wait_for_timeout(600)
   return context,page
  def is_open(page):return page.evaluate("[...document.querySelectorAll('.pn-dd')].find(d=>/Tesla/.test(d.textContent)).classList.contains('open')")
  async def hover_title(page,label,rest=450):
   box=await page.locator('.pn-nest-t',has_text=label).first.bounding_box()
   await page.mouse.move(box['x']+60,box['y']+box['height']/2,steps=5);await page.wait_for_timeout(rest)
  for width,height in [(1440,900),(1366,768)]:
   # 1. straight to Company at normal speed, rest, then to Markets and click
   context,page=await open_page(width,height)
   tab=await page.locator('.pn-dd > button').filter(has_text='Tesla').bounding_box()
   await page.mouse.move(tab['x']+30,tab['y']+16);await page.wait_for_timeout(300)
   await hover_title(page,'Company')
   markets=page.locator('.pn-panel a',has_text='Markets').first;await markets.wait_for(state='visible',timeout=2000)
   box=await markets.bounding_box();await page.mouse.move(box['x']+40,box['y']+10,steps=6)
   assert await is_open(page),(width,'menu closed on the way to Markets')
   await page.mouse.click(box['x']+40,box['y']+10);await page.wait_for_url(SITE+'/tsla.html')
   await context.close()
   # 2. rest on the groups above Company first (they expand), then walk down to Company: the menu must stay open
   context,page=await open_page(width,height)
   tab=await page.locator('.pn-dd > button').filter(has_text='Tesla').bounding_box()
   await page.mouse.move(tab['x']+30,tab['y']+16);await page.wait_for_timeout(300)
   await hover_title(page,'Software');await hover_title(page,'Cars')
   assert await is_open(page),(width,'menu closed after resting on the groups above Company')
   panel=await page.locator('.pn-dd.open .pn-panel').bounding_box()
   assert panel['y']+panel['height']<=height,(width,'panel runs off the window',panel)
   await page.mouse.move(panel['x']+100,panel['y']+100,steps=3);await page.mouse.wheel(0,900);await page.wait_for_timeout(250)
   await hover_title(page,'Company')
   assert await is_open(page),(width,'menu closed while reaching Company')
   await context.close()
   print('PASS',width,height,flush=True)
  await browser.close()
asyncio.run(main())
