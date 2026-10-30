"""Tactile controls and measured-scale Earth → Moon → Solar System → Milky Way."""
import asyncio,base64,json,mimetypes,os,pathlib,shutil
from urllib.parse import urlparse,unquote
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=pathlib.Path('/tmp/earth-preview');OUT.mkdir(exist_ok=True)
SITE='https://superchargeddaily.com'
ARGS=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']
STATE='window.__earthPreview.getState()'
async def snapshot(page,name):
 b=await page.screenshot(type='jpeg',quality=76,animations='disabled',timeout=35000);(OUT/(name+'.jpg')).write_bytes(b);print('COSMOS_PREVIEW '+name+' '+base64.b64encode(b).decode(),flush=True)

async def wake(page):await page.mouse.move(3,3);await page.mouse.move(6,9)
async def hud_click(page,sel):await wake(page);await page.locator(sel).click()
async def open_panel(page):
 if not await page.evaluate("document.getElementById('earth-panel').open"):await hud_click(page,'#earth-menu');await expect(page.locator('#earth-panel')).to_be_visible()
async def close_panels(page):
 for _ in range(4):
  if not await page.evaluate("[...document.querySelectorAll('dialog')].some(d=>d.open)"):break
  await page.keyboard.press('Escape');await page.wait_for_timeout(50)
async def panel_click(page,sel,keep=False):
 await open_panel(page);await page.locator(sel).click()
 if not keep:await close_panels(page)
OPQ="[...document.querySelectorAll('.cosmos-object-label:not([hidden])')].map(b=>parseFloat(getComputedStyle(b).opacity))"
OPACITIES="()=>"+OPQ
VISIBLE_TEXT="""()=>{const out=[];const w=document.createTreeWalker(document.querySelector('.earth-experience'),NodeFilter.SHOW_TEXT);
 while(w.nextNode()){const n=w.currentNode;if(!n.textContent.trim())continue;const e=n.parentElement;if(e.closest('script,style,noscript'))continue;
  if(!e.checkVisibility({opacityProperty:true,visibilityProperty:true}))continue;const r=e.getBoundingClientRect();if(r.width<=2||r.height<=2)continue;out.push(n.textContent.trim().slice(0,60));}return out;}"""
async def labels_check(page,width):
 # Solar System: labels are off by default, one name appears on hover, the switch restores all.
 assert await page.evaluate("document.querySelector('[data-earth-preview]').dataset.labels")=='off'
 await page.wait_for_function(OPQ+".length>3&&"+OPQ+".every(o=>o<.05)",timeout=15000)
 await page.wait_for_function("document.getElementById('earth-live').textContent.includes('Solar System')",timeout=15000)
 await page.wait_for_function("parseFloat(getComputedStyle(document.getElementById('cosmos-focus-name')).opacity)===0",timeout=15000)
 await page.wait_for_function("document.getElementById('earth-note').hidden",timeout=20000)
 texts=await page.evaluate(VISIBLE_TEXT);assert texts==[],('Solar view must be clean',texts)
 if width>1000:
  label=page.locator('.cosmos-object-label:not([hidden])').first;box=await label.bounding_box();await page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
  await page.wait_for_function("document.querySelectorAll('.cosmos-object-label:hover').length===1&&parseFloat(getComputedStyle(document.querySelector('.cosmos-object-label:hover')).opacity)>.9",timeout=5000)
  assert len([o for o in await page.evaluate(OPACITIES) if o>.5])==1,'Only the hovered name may show'
  await page.mouse.move(width/2,450)
 live=await page.evaluate("document.getElementById('earth-live').textContent");assert 'Solar System' in live and 'Viewing distance' in live,live
 await open_panel(page);await page.locator('#earth-labels-toggle').check();await close_panels(page)
 await page.wait_for_function(OPQ+".every(o=>o>.95)",timeout=5000)
 assert await page.evaluate("localStorage.getItem('sd-earth-labels')")=='1'
 await open_panel(page);await page.locator('#earth-labels-toggle').uncheck();await close_panels(page)
 await page.wait_for_function(OPQ+".every(o=>o<.05)",timeout=5000)
 assert await page.evaluate("localStorage.getItem('sd-earth-labels')")=='0'

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome'),args=ARGS)
  results=[]
  for width,height in [(1440,900),(390,844),(768,1024)]:
   ctx=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=width<1000,is_mobile=width<500,service_workers='block',record_video_dir=str(OUT/'cosmos-recording') if width==1440 else None,record_video_size={'width':width,'height':height} if width==1440 else None)
   async def route(r):
    u=urlparse(r.request.url)
    if r.request.method!='GET':return await r.abort()
    if u.hostname in ['view.eumetsat.int','tiles.openfreemap.org','s3.amazonaws.com']:return await r.continue_()
    if u.hostname!='superchargeddaily.com':return await r.abort()
    path=ROOT/(unquote(u.path).lstrip('/') or 'index.html')
    if path.is_file() and ROOT in path.resolve().parents:return await r.fulfill(body=path.read_bytes(),content_type='text/javascript' if path.suffix in ['.js','.mjs'] else mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
    return await r.fulfill(status=404,body='Not found')
   await ctx.route('**/*',route);page=await ctx.new_page();page.set_default_timeout(30000);errors=[];console=[]
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
   async def audit_response(response):
    if 'view.eumetsat.int' not in response.url:return
    print('SATELLITE_HTTP',width,response.status,response.url,json.dumps(await response.all_headers()),flush=True)
    if 'GetCapabilities' in response.url:
     text=await response.text();start=text.find('mumi:worldcloudmap_ir108');print('SATELLITE_METADATA',text[max(0,start-100):start+1800],flush=True)
   page.on('response',audit_response)
   try:
    print('COSMOS_START',width,flush=True);await page.goto(SITE+'/mission-control.html',wait_until='domcontentloaded');await page.mouse.move(width/2,height/2);await page.locator('#earth-enter').click();await expect(page.locator('#earth-intro')).to_be_hidden(timeout=15000)
    await page.wait_for_function('window.__earthPreview?.getState().ready&&window.__earthPreview.getState().cosmos?.skyReady',timeout=100000)
    await page.wait_for_function(STATE+'.relief',timeout=40000);await hud_click(page,'#earth-motion');await page.wait_for_function(STATE+'.paused')
    await snapshot(page,str(width)+'-earth')
    # Touch/mouse must grab the sphere, not clamp latitude or keep drifting after release.
    canvas=page.locator('#earth-canvas');box=await canvas.bounding_box();x=box['x']+box['width']*(.64 if width>1000 else .60);y=box['y']+box['height']*.48
    before=await page.evaluate(STATE+'.orbitQuaternion');anchor=await page.evaluate('([x,y])=>window.__earthPreview.pickLocation(x,y)',[x,y])
    if width<1000:
     client=await ctx.new_cdp_session(page)
     for t,pts in [('touchStart',[{'x':x,'y':y,'id':1}]),('touchMove',[{'x':x+40,'y':y-55,'id':1}]),('touchEnd',[])]:await client.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':pts})
    else:await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+110,y-90,steps=12);await page.mouse.up()
    after=await page.evaluate(STATE+'.orbitQuaternion');assert sum(abs(a-b) for a,b in zip(before,after))>.02,(before,after)
    if width==1440 and anchor:
     held=await page.evaluate('([x,y])=>window.__earthPreview.pickLocation(x,y)',[x+110,y-90]);assert held and abs(held['lat']-anchor['lat'])<.3 and abs((held['lon']-anchor['lon']+180)%360-180)<.3,(anchor,held)
    await page.wait_for_timeout(250);assert await page.evaluate(STATE+'.orbitQuaternion')==after,'Paused drag must stop at the released position'
    if width==1440:
     upside_down=False
     for _ in range(8):
      await page.mouse.move(width*.68,height*.48);await page.mouse.down();await page.mouse.move(width*.68,height*.75,steps=8);await page.mouse.up()
      upside_down=upside_down or (await page.evaluate(STATE+'.cameraUp[1]'))<-.2
     assert upside_down,'Repeated vertical grabs must travel over the pole without a latitude clamp'
     await panel_click(page,'#earth-reset');old=await page.evaluate(STATE+'.zoom')
     await canvas.dispatch_event('wheel',{'deltaY':-8,'ctrlKey':True,'bubbles':True,'cancelable':True});assert await page.evaluate(STATE+'.zoom')>old,'Trackpad pinch must zoom the canvas'
    await open_panel(page);await page.locator('#earth-reset').click();await page.locator('#cosmos-deep-sky').click();await expect(page.locator('#cosmos-deep-sky')).to_have_attribute('aria-pressed','true');await page.locator('#cosmos-deep-sky').click();await close_panels(page)
    for scale,scene,focus in [('moon','moon','Moon'),('solar','solar','Sun'),('galaxy','galaxy','Earth')]:
     await panel_click(page,'[data-earth-scale='+scale+']');await page.wait_for_function(STATE+'.scene==='+json.dumps(scene)+'&&'+STATE+'.focus==='+json.dumps(focus),timeout=80000)
     await page.wait_for_timeout(750)
     if scene=='solar':await labels_check(page,width)
     await snapshot(page,str(width)+'-'+scene)
     assert await page.locator('[data-earth-scale='+scale+']').get_attribute('aria-pressed')=='true'
     state=await page.evaluate(STATE);assert state['cosmos']['starsCount']>6000,state
     if scene=='galaxy':
      assert state['distanceKm']>1e18 and state['cosmos']['galaxyCount']>=40000,state
      await page.evaluate('window.__earthPreview.setZoom(.0001)');await page.wait_for_function(STATE+'.scene==="solar"')
      await page.evaluate('window.__earthPreview.setZoom(1)');await page.wait_for_function(STATE+'.scene==="earth"&&'+STATE+'.focus==="Earth"')
      assert await page.evaluate('document.querySelector("[data-earth-preview]").dataset.mode')=='earth','Zooming in from the galaxy must return to Earth, not empty galactic-centre space'
     if scale=='moon':
      for body in ['Saturn','Jupiter']:
       await open_panel(page);await page.locator('#earth-explore').click();await expect(page.locator('#cosmos-places-dialog')).to_be_visible()
       await page.locator('#cosmos-places-list button').filter(has=page.locator('span',has_text=body)).click()
       await page.wait_for_function(STATE+'.focus==='+json.dumps(body)+'&&'+STATE+'.cosmos.surfaces.includes('+json.dumps(body)+')',timeout=35000)
       assert await page.evaluate(STATE+'.distanceKm')>({'Saturn':58232,'Jupiter':69911}[body]*2.5)
       if body=='Saturn':await page.wait_for_function(STATE+'.cosmos.ringsReady',timeout=35000)
       await page.wait_for_timeout(500);await snapshot(page,str(width)+'-'+body.lower())
    await panel_click(page,'[data-earth-scale=earth]');await page.wait_for_function(STATE+'.scene==="earth"')
    if width==1440:
     state=await page.evaluate(STATE)
     if state['studioSupported']:
      await open_panel(page);await page.locator('#earth-quality').select_option('studio');await close_panels(page);await page.wait_for_function(STATE+'.textureWidth===16384',timeout=120000);await snapshot(page,'studio-16k');await open_panel(page);await page.locator('#earth-quality').select_option('auto');await close_panels(page);await page.wait_for_function('!document.getElementById("earth-quality").disabled',timeout=60000)
     await hud_click(page,'#earth-motion');await panel_click(page,'[data-earth-scale=galaxy]');await page.wait_for_function(STATE+'.scene==="galaxy"&&!'+STATE+'.travelling',timeout=30000);await page.wait_for_timeout(1500)
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    print('COSMOS_WEATHER',width,json.dumps({'state':await page.evaluate('window.__earthWeather?.getState()'),'console':console}),flush=True)
    assert not errors,(width,errors);assert not [x for x in console if 'shader' in x.lower() or 'WebGLProgram' in x],console
    results.append({'width':width,'ok':True,'state':await page.evaluate(STATE)});print('COSMOS_PASS',width,flush=True)
   except Exception:
    print('COSMOS_FAILURE',width,json.dumps({'errors':errors,'console':console,'state':await page.evaluate('window.__earthPreview?.getState()')}),flush=True);await snapshot(page,str(width)+'-failure');raise
   finally:
    video=page.video if width==1440 else None;await ctx.close()
    if video:
     source=await video.path();ffmpeg=shutil.which('ffmpeg');proc=await asyncio.create_subprocess_exec(ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(source),'-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','fast','-crf','24','-movflags','+faststart',str(OUT/'cosmos-tour.mp4'),stderr=asyncio.subprocess.PIPE);_,err=await proc.communicate();assert proc.returncode==0,err.decode()
  (OUT/'cosmos-results.json').write_text(json.dumps(results,indent=2));await browser.close();print('COSMOS_COMPLETE',len(results),flush=True)
asyncio.run(main())
