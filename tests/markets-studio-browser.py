"""Responsive Markets interactions with deterministic chart-provider fixtures."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/markets-studio');OUT.mkdir(exist_ok=True);SITE='https://superchargeddaily.com'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'dark','nojs'),(390,'dark','blocked-storage'),(390,'dark','blocked-chart'),(390,'dark','legacy'),(390,'dark','stale')]
  for width,theme,mode in cases:
   context=await browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block',accept_downloads=True)
   await context.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}Date.now=()=>Date.parse('"+('2028-01-01T00:00:00Z'if mode=='stale'else'2026-10-25T13:00:00Z')+"');")
   if mode=='blocked-storage':await context.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='sd-markets-desk-v1')throw new Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='sd-markets-desk-v1')throw new Error('blocked');return s.call(this,k,v)}")
   page=await context.new_page();errors=[];charts=[];page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname=='s3.tradingview.com':
     charts.append(r.request.url)
     if mode=='blocked-chart':return await r.abort()
     return await r.fulfill(content_type='application/javascript',body="(()=>{const s=document.currentScript,c=JSON.parse(s.textContent),f=document.createElement('iframe');f.src='https://chart.fixture.test/?symbol='+encodeURIComponent(c.symbols[0][1]);f.dataset.symbol=c.symbols[0][1];f.dataset.theme=c.colorTheme;s.parentElement.querySelector('.tradingview-widget-container__widget').append(f);})();")
    if u.hostname=='chart.fixture.test':return await r.fulfill(content_type='text/html',body='<html><body style="background:#141924;color:white">Deterministic provider fixture</body></html>')
    if u.hostname!='superchargeddaily.com':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route)
   await page.goto(SITE+'/tsla.html'+('#spcx'if mode=='legacy'else''),wait_until='domcontentloaded');await page.wait_for_timeout(250)
   assert await page.locator('h1').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'initial overflow')
   assert not charts, 'external chart requested before opening'
   assert len(await page.locator('[id]').evaluate_all('(els)=>els.map(x=>x.id)'))==len(set(await page.locator('[id]').evaluate_all('(els)=>els.map(x=>x.id)')))
   if width in [390,1440]and mode=='normal':await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
   if mode=='nojs':
    assert await page.locator('#results [data-mk-panel=spcx]').is_visible()
    assert await page.locator('.mk-company-buttons').is_hidden()
    assert await page.locator('#mk-return-form').is_hidden()
    assert await page.locator('.mk-nojs-chart').is_visible()
   else:
    await page.wait_for_function("document.querySelector('.mk-studio').dataset.enhanced==='true'")
    if mode=='legacy':assert await page.locator('#mk-company-select').input_value()=='spcx'
    if mode=='stale':assert 'Check the original sources'in await page.locator('#mk-status').inner_text()
    await page.locator('#mk-company-select').select_option('tsla')
    assert '$28.05B'in await page.locator('#mk-hero-snapshot').inner_text()
    assert await page.locator('#results [data-mk-panel=spcx]').is_hidden()
    await page.locator('[data-mk-metric=operatingIncome]').click();assert 'Operating income'in await page.locator('#mk-chart-tsla .mk-chart-title').inner_text()
    await page.locator('[data-mk-company=spcx]').click()
    assert '$14.58B'in await page.locator('#mk-hero-snapshot').inner_text()
    assert 'SpaceX'in await page.locator('#mk-price-name').inner_text()
    assert await page.locator('#cash-flow [data-mk-panel=tsla]').is_hidden()
    assert 'EDITORIAL CASH BRIDGE'in await page.locator('#cash-flow [data-mk-panel=spcx]').inner_text()
    assert '−$34.97B'in await page.locator('#cash-flow [data-mk-panel=spcx]').inner_text()
    assert await page.locator('#mk-chart-spcx .mk-chart-missing').count()==2
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,mode,'SpaceX overflow')
    await page.locator('#mk-entry').fill('100');await page.locator('#mk-current').fill('125');await page.locator('#mk-shares').fill('2.5');await page.locator('#mk-return-form button[type=submit]').click()
    assert '+25%'in await page.locator('#mk-return-result').inner_text();assert '+$62.5'in await page.locator('#mk-return-result').inner_text()
    if width in [390,1440]and mode=='normal':
     await page.locator('#tools').screenshot(path=str(OUT/f'tools-{width}-{theme}.png'))
     await page.locator('#results').screenshot(path=str(OUT/f'results-{width}-{theme}.png'))
    await page.locator('#mk-current').fill('0');await page.locator('#mk-return-form button[type=submit]').click();assert '−100%'in await page.locator('#mk-return-result').inner_text()
    await page.locator('#mk-entry').fill('0');await page.locator('#mk-return-form button[type=submit]').click();assert await page.locator('#mk-entry').get_attribute('aria-invalid')=='true'
    await page.locator('[data-mk-company=tsla]').click();assert await page.locator('#mk-entry').input_value()==''
    assert 'January 2027 · expected window'in await page.locator('#mk-dates-tsla').inner_text()or mode=='stale'
    await page.locator('[data-mk-company=tsla]').press('End');assert await page.locator('#mk-company-select').input_value()=='spcx'
    if mode!='blocked-storage':
     prefs=json.loads(await page.evaluate("localStorage.getItem('sd-markets-desk-v1')"));assert prefs=={'company':'spcx','metric':'operatingIncome'}
     await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(100);assert await page.locator('#mk-company-select').input_value()=='spcx';assert await page.locator('#mk-entry').input_value()==''
    assert not charts
    await page.locator('#mk-load-chart').click()
    if mode=='blocked-chart':
     await page.wait_for_function("document.getElementById('mk-provider-status').textContent.includes('Chart unavailable')")
     assert await page.locator('#mk-provider button').inner_text()=='Try loading the chart again'
    else:
     await page.wait_for_function("document.getElementById('mk-provider-status').textContent.includes('chart opened')")
     assert await page.locator('#mk-provider iframe').count()==1
     before=len(charts);await page.locator('#mk-company-select').select_option('tsla');await page.wait_for_function("document.querySelector('#mk-provider iframe')?.dataset.symbol==='NASDAQ:TSLA|1D'")
     assert len(charts)==before+1
     await page.evaluate("document.documentElement.dataset.theme='light'");await page.wait_for_function("document.querySelector('#mk-provider iframe')?.dataset.theme==='light'")
     assert await page.locator('#mk-provider iframe').count()==1
    await page.locator('#sources summary').click();await page.locator('#mk-reset-view').click();assert await page.locator('#mk-company-select').input_value()=='tsla';assert await page.locator('[data-mk-metric=revenue]').get_attribute('aria-pressed')=='true'
   assert not errors,(width,theme,mode,errors)
   print('PASS',width,theme,mode,flush=True);await context.close()
  await browser.close()
asyncio.run(main())
