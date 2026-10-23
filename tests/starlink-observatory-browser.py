"""Real Chromium checks against saved first-party assets, including real workers."""
import asyncio,json,mimetypes,re,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
OUT=Path('/tmp/starlink-observatory');OUT.mkdir(exist_ok=True)
DATA=json.loads((ROOT/'data/starlink-observatory.json').read_text());TOTAL=format(DATA['totals']['inOrbit'],',');V3=next(g['inOrbit'] for g in DATA['generations'] if g['id']=='v3')

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,theme,mode in [(320,'dark','normal'),(390,'dark','normal'),(768,'dark','normal'),(1440,'dark','normal'),(390,'light','normal'),(1440,'light','normal'),(390,'dark','nojs'),(390,'dark','blocked'),(390,'dark','malformed'),(390,'dark','older')]:
   context=await browser.new_context(viewport={'width':width,'height':920},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block')
   await context.add_init_script("localStorage.setItem('sd-theme',"+json.dumps(theme)+")")
   errors=[];requests=[]
   async def route(r):
    u=urlparse(r.request.url);requests.append(u.path)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if u.path=='/data/starlink.json' and mode=='blocked':return await r.abort()
    if u.path=='/data/starlink.json' and mode=='older':
     cat=json.loads((ROOT/'data/starlink.json').read_text());cat['tleAsOf']='2020-01-01T00:00:00Z';return await r.fulfill(body=json.dumps(cat),content_type='application/json')
    if u.path=='/data/starlink.json' and mode=='malformed':return await r.fulfill(body='{"satellites":[]}',content_type='application/json')
    f=ROOT/u.path.lstrip('/')
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route)
   page=await context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
   await page.goto(SITE+'/starlink.html',wait_until='domcontentloaded');await page.wait_for_timeout(500)
   assert await page.locator('h1').count()==1
   assert await page.locator('.so-gen').count()==6
   assert TOTAL in await page.locator('.so-hero-total').inner_text()
   assert await page.locator('#identify').count()==1
   if width>=1050:
    assert await page.evaluate("document.querySelector('.so-canvas-wrap').getBoundingClientRect().right<=document.querySelector('.so-console').getBoundingClientRect().left+1"), 'globe overlaps controls'
   await page.screenshot(path=str(OUT/f'{width}-{theme}-{mode}-hero.png'))
   if await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
    print(await page.evaluate("[...document.body.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0&&!e.closest('.pn-sheet')).slice(0,25).map(e=>[e.tagName,e.className?.baseVal||e.className,e.id,Math.round(e.getBoundingClientRect().right)])"),flush=True)
    raise AssertionError((width,theme,'overflow'))
   # Opening a page does not download the 2MB orbital catalogue, GP or third-party graphics.
   assert '/data/starlink.json' not in requests,requests
   assert not any(x.endswith('starlink-gp.js') for x in requests)
   await page.screenshot(path=str(OUT/f'{width}-{theme}-{mode}-hero.png'))
   if mode=='normal' and width==1440 and theme=='dark':
    await page.locator('#fleet').screenshot(path=str(OUT/'fleet-desktop.png'))
    await page.locator('#so-start').click();await page.wait_for_function("document.querySelector('.so-workspace').dataset.explorer==='ready'",timeout=30000)
    await page.wait_for_function("document.querySelector('#so-draw-count').textContent.includes('valid positions')",timeout=20000)
    assert await page.locator('#so-pause').inner_text()=='Play'
    await page.locator('#so-generation').select_option('v3');assert str(V3)+' matching' in await page.locator('#so-results-count').inner_text()
    await page.locator('.so-result').first.click();assert 'Altitude' in await page.locator('#so-inspector').inner_text()
    await page.locator('#so-save-satellite').click();assert 'Saved list updated' in await page.locator('#so-save-status').inner_text()
    await page.locator('#so-only-saved').check();assert await page.locator('.so-result').count()==1
    await page.locator('#so-only-saved').uncheck();await page.locator('#so-generation').select_option('all');await page.locator('#so-search').fill('44714');assert await page.locator('.so-result').count()==1
    await page.locator('.so-result').first.click();assert 'STARLINK-1008' in await page.locator('#so-inspector').inner_text()
    await page.locator('#so-canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+')
    await page.locator('#so-speed').select_option('60');await page.locator('#so-time').fill('60');await page.locator('#so-reset').click();assert await page.locator('#so-speed').input_value()=='1'
    await page.locator('.so-explorer').screenshot(path=str(OUT/'explorer-desktop.png'))
    async with page.expect_download() as dl:await page.locator('#so-export-counts').click()
    download=await dl.value;assert 'source_date' in Path(await download.path()).read_text()
   if mode in ('blocked','malformed','older'):
    await page.locator('#so-start').click();await page.wait_for_function("document.querySelector('#so-start').textContent.includes('Retry')")
    assert TOTAL in await page.locator('.so-hero-total').inner_text()
   if errors:raise AssertionError((width,theme,mode,errors))
   print(width,theme,mode,'passed',flush=True);await context.close()
  await browser.close()
asyncio.run(main())
