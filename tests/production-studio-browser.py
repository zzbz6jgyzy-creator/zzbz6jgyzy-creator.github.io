"""Deterministic responsive and interaction checks; no third-party requests."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/production-studio');OUT.mkdir(exist_ok=True);SITE='https://superchargeddaily.com'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'dark','nojs'),(390,'dark','blocked-storage'),(390,'dark','stale'),(390,'dark','shared')]
  for width,theme,mode in cases:
   context=await browser.new_context(viewport={'width':width,'height':950},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block',accept_downloads=True)
   await context.add_init_script("localStorage.setItem('sd-theme',"+json.dumps(theme)+");Date.now=()=>Date.parse('"+('2028-01-01T00:00:00Z'if mode=='stale'else'2026-10-25T13:00:00Z')+"');")
   if mode=='blocked-storage':await context.add_init_script("Storage.prototype.setItem=function(){throw new Error('blocked')}")
   page=await context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route)
   suffix='?from=Q1+2024&to=Q3+2026#compare'if mode=='shared'else''
   await page.goto(SITE+'/production.html'+suffix,wait_until='domcontentloaded');await page.wait_for_timeout(300)
   assert await page.locator('h1').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'initial overflow')
   assert await page.locator('#pd-table tbody tr').count()==11
   assert await page.locator('.pd-factory-photo').evaluate('(e)=>e.getBoundingClientRect().height<520'), 'factory photo overlay escaped its frame'
   if width in [390,1440]and mode=='normal':await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
   if mode=='nojs':
    assert await page.locator('[data-pd-factory-panel]').count()==5
    assert await page.locator('[data-pd-factory-panel]').last.is_visible()
    assert await page.locator('.pd-compare-controls').is_hidden()
    assert await page.locator('#pd-spotlight').is_visible()
    await page.locator('.pd-annual summary').click();assert '1,789,226'in await page.locator('.pd-annual').inner_text()
   else:
    await page.wait_for_function("document.querySelector('.pd-studio').dataset.enhanced==='true'")
    if mode=='stale':assert 'Check Tesla IR for newer releases'in await page.locator('#pd-status').inner_text();assert 'ended'in await page.locator('#pd-next-state').inner_text()
    if mode=='shared':assert await page.locator('#pd-from').input_value()=='Q1 2024';assert await page.locator('#pd-to').input_value()=='Q3 2026'
    await page.locator('#pd-quarter').select_option('Q1 2024');assert '386,810'in await page.locator('#pd-spotlight').inner_text();assert 'historical'in await page.locator('#pd-view-note').inner_text()
    await page.locator('[data-pd-pick="Q3 2026"]').click();assert '486,532'in await page.locator('#pd-stats').inner_text()
    await page.locator('[data-pd-pick="Q3 2026"]').press('Home');assert await page.locator('#pd-quarter').input_value()=='Q1 2024'
    await page.locator('[data-pd-metric=energy]').click();assert 'Energy storage deployed'in await page.locator('#pd-chart-title').text_content()
    await page.locator('#pd-group').select_option('year');assert '2026 YTD'in await page.locator('#pd-chart-desc').text_content();assert '31.4'in await page.locator('#pd-chart-desc').text_content()
    await page.locator('[data-pd-metric=gap]').click();assert 'Deliveries minus production'in await page.locator('#pd-chart-title').text_content()
    await page.locator('#pd-group').select_option('quarter');await page.locator('#pd-range').select_option('4');assert await page.locator('.pd-x-label').count()==4
    await page.locator('#pd-from').select_option('Q3 2025');await page.locator('#pd-to').select_option('Q3 2026');assert '−2.1%'in await page.locator('#pd-comparison').inner_text()
    await page.locator('#pd-swap').click();assert await page.locator('#pd-to').input_value()=='Q3 2025'
    await page.locator('#pd-from').select_option('Q3 2026');await page.locator('#pd-to').select_option('Q3 2026');assert '0%'in await page.locator('#pd-comparison').inner_text()
    await page.locator('#pd-qoq').click();assert await page.locator('#pd-from').input_value()=='Q2 2026'
    await page.locator('#pd-yoy').click();assert await page.locator('#pd-from').input_value()=='Q3 2025'
    await page.locator('#pd-to').select_option('Q1 2024');await page.locator('#pd-yoy').click();assert 'outside this dataset'in await page.locator('#pd-share-status').inner_text()
    await page.locator('#pd-to').select_option('Q3 2026');await page.locator('#pd-yoy').click()
    await page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('unavailable')}}})")
    await page.locator('#pd-share').click();assert await page.locator('#pd-share-url').is_visible();assert 'from=Q3+2025'in await page.locator('#pd-share-url').input_value()
    for region in ['california','nevada','texas','berlin','shanghai']:
     await page.locator(f'[data-pd-factory={region}]').click();assert await page.locator(f'[data-pd-factory-panel={region}]').is_visible();assert await page.locator('[data-pd-factory-panel]:not([hidden])').count()==1
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,region,'overflow')
    await page.locator('[data-pd-factory=shanghai]').press('Home');assert await page.locator('[data-pd-factory=california]').get_attribute('aria-pressed')=='true'
    await page.locator('#pd-table-year').select_option('2026');assert await page.locator('#pd-table tbody tr').count()==3
    assert await page.locator('.pd-download').get_attribute('download')=='supercharged-daily-tesla-production.csv'
    csv=await page.locator('.pd-download').evaluate('(a)=>fetch(a.href).then(r=>r.text())');assert '"4.053"'in csv;assert len(csv.splitlines())==12
    if mode=='blocked-storage':assert 'storage is unavailable'in await page.locator('#pd-status').inner_text()
    elif mode=='normal':
     await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(200);assert await page.locator('#pd-quarter').input_value()=='Q1 2024';assert await page.locator('#pd-group').input_value()=='quarter';assert await page.locator('#pd-range').input_value()=='4';assert await page.locator('[data-pd-factory=california]').get_attribute('aria-pressed')=='true'
    if mode=='normal'and theme=='dark'and width in [390,1440]:
     await page.locator('#pd-quarter').select_option('Q3 2026');await page.locator('#pd-range').select_option('all');await page.locator('[data-pd-metric=vehicles]').click()
     preview_style=await page.add_style_tag(content='.pd-nav{position:relative!important;top:auto!important}.pn-wrap{visibility:hidden!important}')
     await page.locator('#trends').screenshot(path=str(OUT/f'trends-{width}.png'))
     await page.locator('#compare').screenshot(path=str(OUT/f'compare-{width}.png'))
     await page.locator('[data-pd-factory=texas]').click();await page.locator('#factories').screenshot(path=str(OUT/f'factories-{width}.png'))
     await page.locator('#pd-group').select_option('year');await page.locator('[data-pd-metric=energy]').click();await page.locator('.pd-chart-panel').screenshot(path=str(OUT/f'energy-{width}.png'))
     await preview_style.evaluate('(e)=>e.remove()')
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'final overflow')
   assert not errors,(width,theme,mode,errors)
   print(width,theme,mode,'passed',flush=True);await context.close()
  await browser.close()
asyncio.run(main())
