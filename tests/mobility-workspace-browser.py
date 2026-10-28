import asyncio,json,mimetypes,pathlib,os
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=pathlib.Path(os.environ.get('MOBILITY_SCREENSHOTS','/tmp/mobility-workspace'));OUT.mkdir(parents=True,exist_ok=True);SITE='https://superchargeddaily.com'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
   ctx=await browser.new_context(viewport={'width':width,'height':980},reduced_motion='reduce',accept_downloads=True);page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   if theme=='light':await ctx.add_init_script("localStorage.setItem('sd-theme','light')")
   async def route(r):
    u=urlparse(r.request.url);f=ROOT/u.path.lstrip('/')
    if u.hostname!='superchargeddaily.com' or not f.is_file():await r.abort();return
    await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
   await page.route('**/*',route);await page.goto(SITE+'/cybercab.html');await page.locator('#mw-app[data-enhanced="true"]').wait_for(timeout=8000)
   assert await page.locator('h1').count()==1
   await page.screenshot(path=str(OUT/f'overview-{width}-{theme}-top.png'));await page.screenshot(path=str(OUT/f'overview-{width}-{theme}.png'),full_page=True)
   for view in ['overview','fleet','cities','evidence']:
    await page.locator(f'.mw-tabs [data-mw-route="{view}"]').click();assert await page.locator('#'+view).is_visible()
    if await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
     await page.screenshot(path=str(OUT/f'overflow-{width}-{theme}-{view}.png'));print(await page.evaluate("[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cl:e.className?.baseVal||e.className,r:e.getBoundingClientRect().right,w:e.getBoundingClientRect().width})).filter(e=>e.r>innerWidth+1).slice(0,20)"));raise AssertionError((width,theme,view,'overflow'))
    if width in [390,1440]:await page.screenshot(path=str(OUT/f'{view}-{width}-{theme}.png'),full_page=True)
   assert not errors,errors
   print(json.dumps({'width':width,'theme':theme,'passed':True}));await ctx.close()
  ctx=await browser.new_context(viewport={'width':390,'height':980},reduced_motion='reduce',accept_downloads=True);page=await ctx.new_page();await ctx.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window._copied=value}}})")
  await page.route('**/*',route);await page.goto(SITE+'/cybercab.html?city=dallas#cities');await page.locator('#mw-app[data-enhanced="true"]').wait_for()
  assert await page.locator('#mw-city-select').input_value()=='dallas';assert 'Announced target' in await page.locator('#mw-city-detail').inner_text()
  await page.locator('#mw-city-detail [data-follow-city]').click();assert await page.locator('#mw-city-detail [data-follow-city]').get_attribute('aria-pressed')=='true'
  await page.locator('[data-vehicle="model_y"]').click();assert 'Robotaxi service listed' in await page.locator('#mw-city-detail').inner_text()
  await page.locator('#mw-city-search').fill('Florida');assert await page.locator('.mw-city-card').count()==4
  await page.locator('#mw-city-reset').click();assert await page.locator('.mw-city-card').count()==11
  await page.locator('[data-compare-city="1"]').select_option('miami');assert 'miami' in (await page.locator('#mw-comparison').inner_text()).lower()
  await page.locator('[data-share-comparison]').click();assert 'compare=' in await page.evaluate('window._copied')
  await page.locator('[data-export="card"]').click();await page.locator('summary').filter(has_text='Replay dated service evidence').click();await page.locator('#mw-replay').fill('0')
  assert await page.locator('#mw-replay-label').inner_text()!='Current records'
  await page.locator('#mw-replay-play').click();await page.wait_for_timeout(1400);assert int(await page.locator('#mw-replay').input_value())>=1
  await page.locator('.mw-tabs [data-mw-route="fleet"]').click();assert await page.locator('#mw-replay-play').get_attribute('aria-pressed')=='false'
  await page.locator('[data-series="model_y"]').click();await page.locator('[data-range="7"]').click();assert await page.locator('[data-series="model_y"]').get_attribute('aria-pressed')=='true'
  async with page.expect_download() as down:await page.locator('[data-export="csv"]').click()
  item=await down.value;assert 'Cybercab registered' in pathlib.Path(await item.path()).read_text()
  async with page.expect_download() as down:await page.locator('[data-export="json"]').click()
  item=await down.value;payload=json.loads(pathlib.Path(await item.path()).read_text());assert len(payload['cities'])==3;assert 'vins' not in payload
  await page.locator('.mw-tabs [data-mw-route="cities"]').click()
  async with page.expect_download() as down:await page.locator('[data-export="card"]').click()
  item=await down.value;assert pathlib.Path(await item.path()).read_text().startswith('<svg')
  await page.reload();await page.locator('#mw-app[data-enhanced="true"]').wait_for();assert await page.locator('#mw-city-detail [data-follow-city]').get_attribute('aria-pressed')=='true';assert await page.locator('[data-compare-city="1"]').input_value()=='miami'
  await ctx.close()
  ctx=await browser.new_context(java_script_enabled=False,viewport={'width':390,'height':980});page=await ctx.new_page();await page.route('**/*',route);await page.goto(SITE+'/cybercab.html');assert await page.locator('.mw-city-card').count()==11
  await page.locator('[data-city-pick="dallas"]').click();assert await page.locator('.mw-city-card[open]').count()==1
  for slug in ['austin','dallas','houston','miami','orlando','tampa','bay-area','las-vegas','jacksonville','phoenix','san-antonio']:
   await page.goto(SITE+'/cybercab-cities/'+slug+'.html');assert await page.locator('h1').count()==1;assert await page.locator('link[rel="canonical"]').get_attribute('href')==SITE+'/cybercab-cities/'+slug+'.html';assert 'Current city evidence' in await page.locator('main').inner_text();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  await ctx.close();print('Interactions, follows, history, downloads, no-JavaScript and eleven city profiles passed.');await browser.close()
asyncio.run(main())
