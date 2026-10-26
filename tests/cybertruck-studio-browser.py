"""Cybertruck references, workbench, touch/keyboard 3D and recoverable failure states."""
import asyncio,json,mimetypes,os,re,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/cybertruck-studio');OUT.mkdir(exist_ok=True);SITE='https://superchargeddaily.com'
async def tap(page,selector):
 el=page.locator(selector);await el.scroll_into_view_if_needed();await el.click()
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark',m)for m in ['nojs','bad-storage','blocked','malformed','legacy','deep','invalid','glb-fail','module-fail','no-webgl']]
  if os.environ.get('CT_BROWSER_MODE'):cases=[c for c in cases if c[2]==os.environ['CT_BROWSER_MODE']]
  for width,theme,mode in cases:
   height=680 if width==320 else 844 if width==390 else 1000
   ctx=await browser.new_context(viewport={'width':width,'height':height},has_touch=width<800,java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block')
   await ctx.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}")
   if mode=='bad-storage':await ctx.add_init_script("localStorage.setItem('sd-cybertruck-studio-v1','{broken')")
   if mode=='blocked':await ctx.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='sd-cybertruck-studio-v1')throw Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='sd-cybertruck-studio-v1')throw Error('blocked');return s.call(this,k,v)}")
   if mode=='no-webgl':await ctx.add_init_script("const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){return /webgl/.test(kind)?null:old.call(this,kind,...rest)}")
   page=await ctx.new_page();page.set_default_timeout(18000);errors=[];requests=[];page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='glb-fail'and u.path.endswith('.glb'):return await r.abort()
    if mode=='module-fail'and u.path=='/cybertruck-explorer.js':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes()
     if mode=='malformed'and u.path=='/cybertruck-explorer.html':body=re.sub(r'(<script type="application/json" id="ct-studio-data">)[\s\S]*?(</script>)',r'\1{broken\2',body.decode()).encode()
     return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await ctx.route('**/*',route);suffix={'legacy':'#lv','deep':'?trim=dual-motor&compare=premium#payload','invalid':'?trim=constructor&compare=unknown&tool=bogus'}.get(mode,'')
   await page.goto(SITE+'/cybertruck-explorer.html'+suffix,wait_until='domcontentloaded');await page.wait_for_timeout(120)
   assert await page.locator('h1').count()==1;assert await page.locator('[data-system]').count()==19
   ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)');assert len(ids)==len(set(ids))
   assert not any('.glb'in u or'/vendor/three/'in u for u in requests),'3D loaded before visitor chose it'
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,theme,mode,'overflow')
   if mode in ['nojs','malformed']:
    assert await page.locator('[data-start-3d]').is_hidden();await tap(page,'#battery>summary');assert await page.locator('#battery').get_attribute('open')is not None
    assert await page.locator('table').count()==1;assert await page.locator('[data-tool-panel]:visible').count()==3
   else:
    await page.wait_for_selector('.cts-enhanced')
    if mode=='legacy':assert await page.locator('#lv').get_attribute('open')is not None
    if mode=='deep':assert await page.locator('[data-trim]').input_value()=='dual-motor';assert await page.locator('[data-tool="payload"]').get_attribute('aria-selected')=='true'
    if mode=='invalid':assert await page.locator('[data-trim]').input_value()=='premium'
    if mode=='normal'and width in [390,1440]:await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
    await page.locator('[data-trim]').select_option('dual-motor');assert '7,500'in await page.locator('[data-comparison]').inner_text()
    await page.locator('[data-trim]').select_option('premium');await page.locator('[data-compare]').select_option('cyberbeast');assert '2.6 s'in await page.locator('[data-comparison]').inner_text()
    await page.locator('[data-photo="cabin"]').click();assert 'cabin'in await page.locator('[data-gallery] img').get_attribute('src')
    await page.locator('[data-system-filter]').select_option('Energy');assert await page.locator('[data-system]:visible').count()<19;await page.locator('[data-system-filter]').select_option('all')
    await tap(page,'[data-steering="high"]');assert await page.locator('[data-steer-art]').get_attribute('data-steer-art')=='high';assert 'Coordinated'in await page.locator('[data-steering-status]').inner_text();await tap(page,'[data-steering="low"]')
    if mode=='normal'and width==1440 and theme=='dark':await page.locator('.cts-steering').screenshot(path=str(OUT/'steering-desktop.png'),style='.pn-wrap,.cts-nav{visibility:hidden!important}')
    await tap(page,'[data-tool="trip"]');trip=page.locator('[data-scenario]');await trip.locator('[name=penalty]').fill('50');await trip.locator('button[type=submit]').click();assert '150.0 kWh'in await page.locator('[data-scenario-result]').inner_text();assert '$45.00'in await page.locator('[data-scenario-result]').inner_text()
    await trip.locator('[name=unit]').select_option('km');await trip.locator('button[type=submit]').click();assert '150.0 kWh'in await page.locator('[data-scenario-result]').inner_text()
    await trip.locator('[name=average]').fill('400');await trip.locator('button[type=submit]').click();assert await page.locator('[data-scenario-result].has-error').count()==1
    await trip.locator('[name=average]').fill('150');await trip.locator('[name=distance]').fill('');await trip.locator('button[type=submit]').click();assert 'Enter all'in await page.locator('[data-scenario-result]').inner_text();await trip.locator('[name=distance]').fill('289.682');await trip.locator('button[type=submit]').click()
    await tap(page,'[data-tool="payload"]');load=page.locator('[data-payload]');assert await load.locator('[name=label]').input_value()=='';await load.locator('button[type=submit]').click();assert await page.locator('[data-payload-result].has-error').count()==1
    await load.locator('[name=label]').fill('2000');await load.locator('button[type=submit]').click();assert '700 lb'in await page.locator('[data-payload-result]').inner_text()
    if mode=='normal'and width in [390,1440]and theme=='dark':await page.locator('.cts-workbench').screenshot(path=str(OUT/f'payload-{width}.png'),style='.pn-wrap,.cts-nav{visibility:hidden!important}')
    await load.locator('[name=trailer]').fill('12000');await load.locator('button[type=submit]').click();assert 'trailer reference exceeded'in await page.locator('[data-payload-result]').inner_text()
    await load.locator('[name=trailer]').fill('5000');await load.locator('[name=weight]').select_option('kg');await load.locator('button[type=submit]').click();assert '317.5 kg'in await page.locator('[data-payload-result]').inner_text()
    await tap(page,'[data-tool="power"]');power=page.locator('[data-power]');await power.locator('button[type=submit]').click();assert '54.0 hours'in await page.locator('[data-power-result]').inner_text()
    await power.locator('[name=load]').fill('2500');await power.locator('button[type=submit]').click();assert await page.locator('[data-power-result].has-error').count()==1
    await power.locator('[name=mode]').select_option('bed');assert '21.6 hours'in await page.locator('[data-power-result]').inner_text()
    await page.locator('[data-tool="power"]').focus();await page.keyboard.press('ArrowLeft');assert await page.locator('[data-tool="payload"]').get_attribute('aria-selected')=='true';await page.keyboard.press('Home');assert await page.locator('[data-tool="trip"]').get_attribute('aria-selected')=='true'
    await page.locator('[data-curve-slider]').fill('40');assert '168 kW'in await page.locator('[data-curve-output]').inner_text()
    if mode=='normal'and width==1440 and theme=='dark':await page.locator('#compare').screenshot(path=str(OUT/'comparison-desktop.png'),style='.pn-wrap,.cts-nav{visibility:hidden!important}')
    if mode=='normal'and width==390 and theme=='light':await page.locator('.cts-chart-card').screenshot(path=str(OUT/'charging-phone.png'),style='.pn-wrap,.cts-nav{visibility:hidden!important}')
    if mode in ['glb-fail','module-fail','no-webgl']:
     await tap(page,'[data-start-3d]');await page.wait_for_function("!document.querySelector('iframe')&&document.querySelector('[data-studio-status]').textContent.includes('could not load')");assert await page.locator('[data-gallery]').is_visible()
    if mode=='normal'and theme=='dark'and width in [390,1440]:
     await tap(page,'[data-start-3d]');await page.wait_for_function("document.querySelector('[data-studio-status]').textContent.startsWith('3D ready')",timeout=35000)
     f=page.frames[-1];await f.wait_for_function('Boolean(window.__ctx)');canvas=f.locator('canvas').first
     box=await page.locator('[data-leave-3d]').bounding_box();assert box and box['y']>=0 and box['y']+box['height']<height,'Exit 3D must remain visible'
     await page.evaluate("window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:window,data:{type:'sd-cybertruck-failed'}}))");assert await page.locator('iframe').count()==1,'untrusted message removed viewer'
     await f.locator('.m3x-pause').click();assert await f.locator('.m3x-pause').get_attribute('aria-pressed')=='true';await f.locator('.m3x-pause').click()
     before=await f.evaluate('__ctx.view()');await f.locator('.m3x-zoom-in').click();after=await f.evaluate('__ctx.view()');assert after['radius']<before['radius']
     if width==390:
      box=await canvas.bounding_box();cx=box['x']+box['width']/2;cy=box['y']+box['height']*.42;cdp=await ctx.new_cdp_session(page);before_touch=await f.evaluate('__ctx.view()')
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx-30,'y':cy},{'x':cx+30,'y':cy}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx-65,'y':cy},{'x':cx+65,'y':cy}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await page.wait_for_timeout(100);after_touch=await f.evaluate('__ctx.view()');assert after_touch['radius']<before_touch['radius'],'pinch did not zoom'
     await canvas.focus();before=await f.evaluate('__ctx.view()');await page.keyboard.press('ArrowRight');after=await f.evaluate('__ctx.view()');assert abs(after['theta']-before['theta'])>.05
     await f.locator('.m3x-explode').click();await f.wait_for_function('__ctx.ex()>.9');await f.locator('.m3x-parts').click();await f.locator('[data-part="lv"]').click();await f.wait_for_function("__ctx.selected()==='lv'")
     assert '48V'in await f.locator('.m3x-card h2').inner_text();await page.locator('[data-stage]').screenshot(path=str(OUT/f'3d-48v-{width}.png'),style='.pn-wrap,.cts-nav{visibility:hidden!important}')
     await canvas.focus();await page.keyboard.press('Escape');await page.wait_for_function("!document.querySelector('iframe')");assert await page.locator('[data-gallery]').is_visible()
     await tap(page,'#battery>summary');await tap(page,'#battery [data-view-part]');await page.wait_for_function("document.querySelector('[data-studio-status]').textContent.startsWith('3D ready')",timeout=35000);f=page.frames[-1];await f.wait_for_function("window.__ctx&&__ctx.selected()==='battery'");await tap(page,'[data-leave-3d]')
    if mode not in ['blocked','nojs','malformed']:
     prefs=await page.evaluate("JSON.parse(localStorage.getItem('sd-cybertruck-studio-v1'))");assert set(prefs)=={'trim','compare','unit','weight'}
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,mode,'final overflow');assert not errors,(width,mode,errors)
   assert not any('supabase.co'in u for u in requests),'guide touched an account';print('PASS',width,theme,mode,flush=True);await ctx.close()
  await browser.close()
asyncio.run(main())
