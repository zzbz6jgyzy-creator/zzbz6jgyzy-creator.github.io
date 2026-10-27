"""Exercise the generated navigation with local pages and the production scripts.
External requests and all writes are blocked. Requires Python Playwright + Chromium.
"""
import asyncio,json,mimetypes,os,pathlib,re,traceback
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
CFG=json.loads((ROOT/'scripts/js-bundles.json').read_text())
SHORTCUTS={'Original stories':'/dispatch.html','Software updates':'/updates.html','Cybercab':'/cybercab.html','Starship':'/starship.html'}

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def scenario(width,theme='dark',scripts=True):
   context=await browser.new_context(viewport={'width':width,'height':844},is_mobile=width<500,java_script_enabled=scripts,reduced_motion='reduce')
   await context.add_init_script('localStorage.setItem("sd-theme",'+json.dumps(theme)+')')
   page=await context.new_page();errors=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   async def route(r):
    if r.request.method!='GET' or not r.request.url.startswith(SITE+'/'):return await r.abort()
    rel=urlparse(r.request.url).path.lstrip('/') or 'index.html'
    bundle=re.fullmatch(r'assets/js/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js',rel)
    if bundle:
     return await r.fulfill(content_type='application/javascript',body='\n;\n'.join((ROOT/f).read_text() for f in CFG['bundles'][bundle[1]]))
    f=ROOT/rel
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes())
    await r.abort()
   await page.route('**/*',route)
   try:
    await page.goto(SITE+'/',wait_until='domcontentloaded')
    await page.evaluate('document.documentElement.dataset.theme='+json.dumps(theme))
    if not scripts:
     # Destinations stay in static HTML, without waiting for client-side construction.
     assert await page.locator('.pn-shortcuts a').count()==4
     for name,path in SHORTCUTS.items():assert await page.locator('.pn-shortcuts a[href="'+path+'"]').inner_text()==name
    elif width<900:
     await page.locator('.sdm-nav-primary').wait_for(state='attached')
     await page.locator('.pn-menu').click();await page.locator('.pn-sheet.open').wait_for()
     assert await page.locator('.pn-grp-t[aria-expanded=true]').count()==0
     for name,path in SHORTCUTS.items():
      link=page.locator('.pn-shortcuts').get_by_role('link',name=name,exact=True)
      assert await link.is_visible()
      box=await link.bounding_box();assert box['height']>=44 and box['y']+box['height']<=844,box
     await page.locator('.pn-sheet').screenshot(path=str(ROOT/'dev'/f'nav-mobile-{width}-{theme}.png'))
     # Four real navigation journeys, without opening a menu category.
     for name,path in SHORTCUTS.items():
      await page.locator('.pn-shortcuts').get_by_role('link',name=name,exact=True).click();await page.wait_for_url(SITE+path)
      await page.locator('.pn-menu').wait_for();await page.locator('.pn-menu').click();await page.locator('.pn-sheet.open').wait_for()
      assert await page.locator('.pn-shortcuts').get_by_role('link',name=name,exact=True).get_attribute('aria-current')=='page'
     await page.locator('.pn-sheet h3 button').filter(has_text='News').click()
     assert await page.locator('.pn-grp').get_by_role('link',name='Latest headlines',exact=True).is_visible()
     assert await page.locator('.pn-grp').get_by_role('link',name='Original stories · Dispatch',exact=True).is_visible()
     await page.keyboard.press('Escape');assert not await page.locator('.pn-sheet').evaluate('(el)=>el.classList.contains("open")')
     assert await page.locator('.pn-menu').get_attribute('aria-expanded')=='false'
    else:
     await page.locator('.sdm-nav-primary').wait_for(state='attached')
     await page.locator('.pn-dd > button').filter(has_text='Tesla').hover()
     group=page.get_by_role('button',name='Software & autonomy',exact=True)
     await group.hover()
     panel=page.locator('#pn-tesla-software-autonomy')
     await panel.wait_for(state='visible',timeout=2000)  # hover opens a group after a short pause so passing over it does not expand it
     assert await panel.is_visible()
     for path in ['/updates.html','/fsd-europe.html','/cybercab.html']:assert await panel.locator('a[href="'+path+'"]').is_visible()
     await page.screenshot(path=str(ROOT/'dev'/f'nav-desktop-{width}-{theme}.png'))
     await panel.get_by_role('link',name='Software Update Tracker',exact=False).click();await page.wait_for_url(SITE+'/updates.html')
     await page.locator('.pn-dd > button').filter(has_text='News').hover()
     assert await page.locator('#pn-news').get_by_role('link',name='Latest headlines',exact=False).is_visible()
     assert await page.locator('#pn-news').get_by_role('link',name='Original stories · Dispatch',exact=False).is_visible()
     assert await page.locator('.pn-sheet').get_attribute('aria-hidden')=='true'
     assert await page.locator('.pn-sheet').evaluate('(el)=>el.getBoundingClientRect().left>=innerWidth')
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),'Viewport overflows'
    assert not errors,errors
    print(json.dumps({'width':width,'theme':theme,'scripts':scripts,'passed':True}),flush=True)
   except Exception:
    print(traceback.format_exc(),flush=True);raise
   finally:await context.close()
  (ROOT/'dev').mkdir(exist_ok=True)
  for args in [(320,'dark'),(390,'dark'),(390,'light'),(768,'dark'),(900,'dark'),(1440,'dark'),(1440,'light'),(390,'dark',False)]:await scenario(*args)
  await browser.close()
asyncio.run(main())
