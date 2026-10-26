"""Static references, touch/keyboard 3D and failure recovery. External services are blocked."""
import asyncio,json,mimetypes,os,re,shutil,math
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/model3-studio');OUT.mkdir(exist_ok=True);SITE='https://superchargeddaily.com'
async def tap(page,selector):
 el=page.locator(selector);await el.scroll_into_view_if_needed();await el.click()
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark',m)for m in ['nojs','bad-storage','blocked','malformed','legacy','deep','glb-fail','module-fail','no-webgl']]
  if os.environ.get('M3_BROWSER_MODE'):cases=[c for c in cases if c[2]==os.environ['M3_BROWSER_MODE']]
  for width,theme,mode in cases:
   ctx=await browser.new_context(viewport={'width':width,'height':1000},has_touch=width<800,java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block')
   await ctx.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}")
   if mode=='bad-storage':await ctx.add_init_script("localStorage.setItem('sd-model3-studio-v1','{broken')")
   if mode=='blocked':await ctx.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='sd-model3-studio-v1')throw Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='sd-model3-studio-v1')throw Error('blocked');return s.call(this,k,v)}")
   if mode=='no-webgl':await ctx.add_init_script("const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){return /webgl/.test(kind)?null:old.call(this,kind,...rest)}")
   page=await ctx.new_page();page.set_default_timeout(16000);errors=[];requests=[];page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(u.path)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='glb-fail'and u.path.endswith('.glb'):return await r.abort()
    if mode=='module-fail'and u.path=='/model3-explorer.js':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes()
     if mode=='malformed'and u.path=='/model3-explorer.html':body=re.sub(r'(<script type="application/json" id="m3-studio-data">)[\s\S]*?(</script>)',r'\1{broken\2',body.decode()).encode()
     return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await ctx.route('**/*',route);suffix={'legacy':'#battery','deep':'?market=US&trim=performance&compare=standard&part=frontMotor#compare'}.get(mode,'')
   await page.goto(SITE+'/model3-explorer.html'+suffix,wait_until='domcontentloaded');await page.wait_for_timeout(120)
   assert await page.locator('h1').count()==1;assert await page.locator('[data-system]').count()==19
   ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)');assert len(ids)==len(set(ids))
   assert not any(path.endswith('.glb')or'/vendor/three/'in path for path in requests),'3D loaded without consent'
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,theme,mode,'overflow')
   if mode in ['nojs','malformed']:
    assert await page.locator('[data-start-3d]').is_hidden();await tap(page,'#battery>summary');assert await page.locator('#battery').get_attribute('open')is not None
    assert await page.locator('table').count()==2
   else:
    await page.wait_for_selector('.m3s-enhanced');
    if mode=='legacy':assert await page.locator('#battery').get_attribute('open')is not None
    if mode=='deep':assert await page.locator('[data-market]').input_value()=='US';assert '309'in await page.locator('[data-comparison]').inner_text()
    if mode=='normal'and width in [390,1440]:
     await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
    await page.locator('[data-market]').select_option('US');await page.locator('[data-trim]').select_option('performance');assert '309'in await page.locator('[data-comparison]').inner_text()
    await page.locator('[data-market]').select_option('UK');await page.locator('[data-trim]').select_option('premium-rwd');assert '466'in await page.locator('[data-comparison]').inner_text()
    await page.locator('[data-photo="display"]').click();assert 'interior'in await page.locator('[data-gallery] img').get_attribute('src')
    await page.locator('[data-system-filter]').select_option('Energy');assert await page.locator('[data-system]:visible').count()<19
    await page.locator('[data-system-filter]').select_option('all')
    await tap(page,'[data-scenario] button[type=submit]');assert '50.0 kWh'in await page.locator('[data-scenario-result]').inner_text();assert '£15.00'in await page.locator('[data-scenario-result]').inner_text()
    await page.locator('[name=unit]').select_option('km');await tap(page,'[data-scenario] button[type=submit]');assert '50.0 kWh'in await page.locator('[data-scenario-result]').inner_text()
    await page.locator('[name=average]').fill('999');await tap(page,'[data-scenario] button[type=submit]');assert await page.locator('[data-scenario-result].has-error').count()==1
    await page.locator('[name=average]').fill('120');await page.locator('[name=distance]').fill('');await tap(page,'[data-scenario] button[type=submit]');assert 'Enter all'in await page.locator('[data-scenario-result]').inner_text()
    await page.locator('[name=distance]').fill('289.682');await tap(page,'[data-scenario] button[type=submit]')
    await page.locator('[data-curve-slider]').fill('40');assert '140 kW'in await page.locator('[data-curve-output]').inner_text()
    if mode=='normal'and width==1440 and theme=='dark':await page.locator('#compare').screenshot(path=str(OUT/'comparison-desktop.png'),style='.pn-wrap,.m3s-nav{visibility:hidden!important}')
    if mode=='normal'and width==390 and theme=='light':await page.locator('.m3s-chart-card').screenshot(path=str(OUT/'charging-phone.png'),style='.pn-wrap,.m3s-nav{visibility:hidden!important}')
    if mode in ['glb-fail','module-fail','no-webgl']:
     await tap(page,'[data-start-3d]');await page.wait_for_function("!document.querySelector('iframe')&&document.querySelector('[data-studio-status]').textContent.includes('could not load')");assert await page.locator('[data-gallery]').is_visible()
    if mode=='normal'and theme=='dark'and width in [390,1440]:
     await tap(page,'[data-start-3d]');await page.wait_for_function("document.querySelector('[data-studio-status]').textContent.startsWith('3D ready')",timeout=30000)
     f=page.frames[-1];await f.wait_for_function('Boolean(window.__m3x)');canvas=f.locator('canvas').first
     exit_box=await page.locator('[data-leave-3d]').bounding_box();assert exit_box and exit_box['y']>=0 and exit_box['y']+exit_box['height']<1000,'3D exit must remain in view'
     await f.locator('.m3x-pause').click();assert await f.locator('.m3x-pause').get_attribute('aria-pressed')=='true';await f.locator('.m3x-pause').click()
     before=await f.evaluate('__m3x.view()');await f.locator('.m3x-zoom-in').click();after=await f.evaluate('__m3x.view()');assert after['radius']<before['radius']
     if width==390:
      box=await canvas.bounding_box();cx=box['x']+box['width']/2;cy=box['y']+box['height']*.42;cdp=await ctx.new_cdp_session(page);before_touch=await f.evaluate('__m3x.view()')
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx-30,'y':cy},{'x':cx+30,'y':cy}]})
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx-65,'y':cy},{'x':cx+65,'y':cy}]})
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await page.wait_for_timeout(100);after_touch=await f.evaluate('__m3x.view()');assert after_touch['radius']<before_touch['radius'],'pinch did not zoom'
     await canvas.focus();before=await f.evaluate('__m3x.view()');await page.keyboard.press('ArrowRight');after=await f.evaluate('__m3x.view()');assert abs(after['theta']-before['theta'])>.05
     await f.locator('.m3x-explode').click();await f.wait_for_function('__m3x.ex()>.9');await f.locator('.m3x-parts').click();await f.locator('[data-part="battery"]').click();await f.wait_for_function("__m3x.selected()==='battery'")
     assert 'battery'in (await f.locator('.m3x-card h2').inner_text()).lower();assert 'chemistry'in await f.locator('.m3x-card').inner_text()
     await page.locator('[data-stage]').screenshot(path=str(OUT/f'3d-battery-{width}.png'),style='.pn-wrap,.m3s-nav{visibility:hidden!important}')
     await canvas.focus();await page.keyboard.press('Escape');await page.wait_for_function("!document.querySelector('iframe')");assert await page.locator('[data-gallery]').is_visible()
     await tap(page,'#battery>summary');await tap(page,'#battery [data-view-part]');await page.wait_for_function("document.querySelector('[data-studio-status]').textContent.startsWith('3D ready')",timeout=30000);f=page.frames[-1];await f.wait_for_function("window.__m3x&&__m3x.selected()==='battery'");await tap(page,'[data-leave-3d]')
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,mode,'final overflow')
   assert not errors,(width,mode,errors);print('PASS',width,theme,mode,flush=True);await ctx.close()
  await browser.close()
asyncio.run(main())
