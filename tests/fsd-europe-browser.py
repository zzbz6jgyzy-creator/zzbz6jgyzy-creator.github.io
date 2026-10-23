import asyncio,json,mimetypes,pathlib,os
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=pathlib.Path(os.environ.get('FSD_SCREENSHOTS','/tmp/fsd-europe-screenshots'));OUT.mkdir(parents=True,exist_ok=True);SITE='https://superchargeddaily.com'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
   c=await browser.new_context(viewport={'width':width,'height':980},reduced_motion='reduce');page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   if theme=='light':await c.add_init_script("localStorage.setItem('sd-theme','light')")
   async def route(r):
    u=urlparse(r.request.url);f=ROOT/u.path.lstrip('/')
    if u.hostname!='superchargeddaily.com' or not f.is_file():await r.abort();return
    await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
   await page.route('**/*',route);await page.goto(SITE+'/fsd-europe.html');await page.locator('#fe-workspace[data-enhanced="true"]').wait_for(timeout=8000)
   assert await page.locator('h1').count()==1
   for view in ['overview','countries','changes','guide']:
    await page.locator(f'[data-view-link="{view}"]').click();assert await page.locator('#'+view).is_visible()
    
    if await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
     await page.screenshot(path=str(OUT/'overflow.png'))
     print(await page.evaluate("JSON.stringify(['html','body','.site-shell','main.fe','#fe-workspace','.page-grid','.workspace','.rail','.intro','.signals','.map-layout','.inspector'].map(s=>{let e=document.querySelector(s);return{s,w:e.getBoundingClientRect().width,sw:e.scrollWidth,cssWidth:getComputedStyle(e).width,display:getComputedStyle(e).display}}))"));print(await page.evaluate("[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cl:e.className?.baseVal||e.className,id:e.id,r:e.getBoundingClientRect().right,w:e.getBoundingClientRect().width})).filter(e=>e.r>innerWidth+1).filter(e=>e.id==='fe-workspace'||e.cl==='fe'||e.cl==='site-shell'||(typeof e.cl==='string'&&e.cl.includes('panel'))).slice(0,20)"))
     raise AssertionError((width,theme,view,'overflow'))
   await page.locator('[data-view-link="countries"]').click();await page.locator('#fe-search').fill('Slovakia');assert await page.locator('.country-card:visible').count()==1
   await page.locator('.country-card > summary').click();assert await page.locator('#fe-country').input_value()=='SK'
   await page.locator('#fe-country').select_option('NL');assert 'Recognition recorded' in await page.locator('#fe-country-detail').inner_text()
   await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'overview-{width}-{theme}.png'),full_page=True);await page.screenshot(path=str(OUT/f'overview-{width}-{theme}-top.png'))
   assert not errors,errors
   print(json.dumps({'width':width,'theme':theme,'passed':True}));await c.close()
  c=await browser.new_context(viewport={'width':390,'height':980},accept_downloads=True);page=await c.new_page()
  await page.route('**/*',route);await page.goto(SITE+'/fsd-europe.html?country=SK&compare=SK,DE,IE#overview');await page.locator('#fe-workspace[data-enhanced="true"]').wait_for()
  assert await page.locator('#fe-country').input_value()=='SK'
  await page.locator('#fe-country-detail [data-follow]').click();assert await page.locator('#fe-country-detail [data-follow]').get_attribute('aria-pressed')=='true'
  await page.locator('#fe-history-date').fill('0');assert '2026' in await page.locator('#fe-history-label').inner_text()
  assert 'historical customer' in await page.locator('#fe-map-date').inner_text()
  await page.locator('#fe-play').click();await page.wait_for_timeout(2400);assert int(await page.locator('#fe-history-date').input_value())>=2
  await page.locator('[data-view-link="countries"]').click();assert await page.locator('#fe-play').get_attribute('aria-pressed')=='false'
  await page.locator('[data-compare="1"]').select_option('CH');assert 'Switzerland' in await page.locator('#fe-comparison').inner_text()
  await page.locator('[data-trip="1"]').select_option('SK');assert 'Slovakia' in await page.locator('#fe-trip-result').inner_text()
  async with page.expect_download() as download:await page.locator('#fe-export').click()
  item=await download.value;payload=json.loads(pathlib.Path(await item.path()).read_text());assert len(payload['countries'])==3;assert payload['countries'][0]['code']=='SK'
  async with page.expect_download() as download:await page.locator('#fe-card').click()
  item=await download.value;assert pathlib.Path(await item.path()).read_text().startswith('<svg')
  await page.reload();assert await page.locator('[data-compare="1"]').input_value()=='CH'
  await page.locator('[data-view-link="overview"]').click();assert await page.locator('#fe-country-detail [data-follow]').get_attribute('aria-pressed')=='true'
  await page.locator('[data-view-link="changes"]').click();await page.locator('#fe-follow-only').check();assert 'Slovakia' in await page.locator('#fe-follow-status').inner_text()
  await c.close()
  c=await browser.new_context(java_script_enabled=False,viewport={'width':390,'height':980});page=await c.new_page();await page.route('**/*',route);await page.goto(SITE+'/fsd-europe.html')
  assert await page.locator('.country-card').count()==31
  await page.locator('[data-country="SK"]').click();assert await page.locator('.country-card[open]').count()==1
  assert 'Slovakia' in await page.locator('.country-card[open]').inner_text()
  for slug in ['netherlands','lithuania','estonia','denmark','belgium','slovenia','czechia','croatia','slovakia']:
   await page.goto(SITE+'/fsd-europe/'+slug+'.html');assert await page.locator('h1').count()==1;assert await page.locator('link[rel="canonical"]').get_attribute('href')==SITE+'/fsd-europe/'+slug+'.html'
   assert 'Vehicle conditions' in await page.locator('main').inner_text();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  await c.close();print('Interaction, persistence, history, downloads, no-JS and nine country profiles passed.');await browser.close()
asyncio.run(main())
