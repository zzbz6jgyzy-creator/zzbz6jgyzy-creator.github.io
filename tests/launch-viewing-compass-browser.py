"""Actual built UI, with synthetic iOS/Android sensor readings. No hardware claims."""
import asyncio,json,mimetypes,os,pathlib,re,shutil
from urllib.parse import urlparse
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=pathlib.Path('/tmp/launch-compass');OUT.mkdir(exist_ok=True);SITE='https://superchargeddaily.com';DATA=json.loads((ROOT/'tests/fixtures/launch-viewing.json').read_text())
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  async def setup(mode='ios',width=390,height=950):
   c=await b.new_context(viewport={'width':width,'height':height},is_mobile=width<1100,has_touch=True,reduced_motion='reduce',service_workers='block');page=await c.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   await page.clock.install(time='2026-10-24T16:00:00Z')
   init="""window.__permissionCalls=0;window.__permissionAbsolute=null;window.__geoCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(ok,fail)=>{window.__geoCalls++;ok({coords:{latitude:34.4208,longitude:-119.6982}})}}});window.__emit=(data,type='deviceorientation')=>{const e=new Event(type);for(const [k,v]of Object.entries(data))Object.defineProperty(e,k,{value:v});window.dispatchEvent(e);};window.__angle=0;Object.defineProperty(screen.orientation,'angle',{get:()=>window.__angle});"""
   if mode=='unsupported':init+="Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});"
   elif mode in ['ios','denied','late-permission']:init+="Object.defineProperty(DeviceOrientationEvent,'requestPermission',{configurable:true,value:async function(absolute){window.__permissionCalls++;window.__permissionWasActive=navigator.userActivation.isActive;window.__permissionAbsolute=absolute;"+("return 'denied';"if mode=='denied'else"return new Promise(r=>window.__resolvePermission=r);"if mode=='late-permission'else"return 'granted';")+"}});"
   else:init+="Object.defineProperty(DeviceOrientationEvent,'requestPermission',{value:undefined,configurable:true});"
   await c.add_init_script(init)
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if u.path=='/data/launch-viewing.json':return await r.fulfill(body=json.dumps(DATA),content_type='application/json')
    f=ROOT/u.path.lstrip('/')
    if not f.is_file()or ROOT not in f.resolve().parents:return await r.abort()
    body=f.read_bytes()
    if u.path=='/see-the-launch.html':body=re.sub(rb'<script type="application/json" id="lv-data">[\s\S]*?</script>',lambda _:b'<script type="application/json" id="lv-data">'+json.dumps(DATA).encode()+b'</script>',body)
    return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
   await c.route('**/*',route);await page.goto(SITE+'/see-the-launch.html',wait_until='domcontentloaded');await page.wait_for_selector('.lv-enhanced');assert await page.evaluate('window.__permissionCalls')==0;assert await page.evaluate('window.__geoCalls')==0
   return c,page,errors
  async def emit(page,heading,platform='ios',angle=0,accuracy=8,beta=0,gamma=0):
   await page.evaluate('a=>window.__angle=a',angle)
   data={'beta':beta,'gamma':gamma}
   if platform=='ios':data.update(webkitCompassHeading=heading,webkitCompassAccuracy=accuracy,absolute=False)
   else:data.update(alpha=(360-heading)%360,absolute=platform!='relative')
   await page.evaluate('d=>window.__emit(d,'+json.dumps('deviceorientationabsolute'if platform=='android'else'deviceorientation')+')',data);await page.clock.run_for(100)
  cases=[]
  for platform,width,height,angle in [('ios',320,950,0),('ios',390,950,0),('ios',1024,768,90),('android',390,950,0),('android',844,500,90)]:
   c,page,errors=await setup(platform,width,height)
   await page.locator('.lv-hero [data-compass-jump]').click();await expect(page.locator('#lv-compass-card')).to_be_visible()
   await page.locator('#lv-compass-start').click();assert await page.evaluate('window.__permissionCalls')==0;await expect(page.locator('#lv-location')).to_be_focused()
   await page.locator('[data-place="Santa Barbara"]').click();await page.locator('#lv-compass-start').click()
   if platform=='ios':assert await page.evaluate('window.__permissionCalls')==1;assert await page.evaluate('window.__permissionAbsolute')is True;assert await page.evaluate('window.__permissionWasActive')is True
   await expect(page.locator('#lv-compass-state')).to_have_text('Finding heading')
   decl=await page.evaluate('SDLaunchWMM.field(34.4208,-119.6982,new Date(Date.now())).declination')
   # A magnetic reading plus WMM correction and the screen rotation points at 286 true.
   raw=(286-decl-angle)%360;await emit(page,raw,platform,angle)
   await expect(page.locator('#lv-compass-card')).to_have_attribute('data-live','true');await expect(page.locator('#lv-compass-cue')).to_contain_text('Facing the pad')
   assert await page.locator('#lv-compass-start').inner_text()=='Stop live compass'
   await emit(page,(raw-70)%360,platform,angle);await expect(page.locator('#lv-compass-cue')).to_contain_text('Turn right')
   await page.locator('#lv-compass-expand').click();await expect(page.locator('#lv-field')).to_be_visible();assert await page.locator('#lv-sensor').inner_text()=='Stop live compass'
   assert await page.locator('#lv-field-compass [data-lv-compass-dial]').get_attribute('transform')!='rotate(0 110 110)'
   await page.locator('#lv-night').click();assert 'lv-night'in await page.locator('#lv-field').get_attribute('class')
   await page.keyboard.press('Escape');await expect(page.locator('#lv-compass-start')).to_have_text('Start live compass');assert await page.locator('#lv-compass-card').get_attribute('data-live')=='false'
   if width in [390,1024]:
    await page.locator('#lv-compass-start').click();await emit(page,raw,platform,angle)
    style=await page.add_style_tag(content='.pn-wrap{visibility:hidden!important}.lv-nav{position:relative!important;top:auto!important}')
    await page.locator('#lv-compass-card').screenshot(path=str(OUT/f'live-{platform}-{width}.png'));await style.evaluate('(s)=>s.remove()')
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(platform,width,'overflow');assert not errors,errors
   cases.append([platform,width,height,'portrait'if angle==0 else'landscape']);print(cases[-1],'passed',flush=True);await c.close()
  for mode in ['denied','unsupported','android','ios','late-permission']:
   c,page,errors=await setup(mode);await page.locator('[data-place="Santa Barbara"]').click();await page.locator('#lv-compass-start').click()
   if mode=='denied':await expect(page.locator('#lv-compass-state')).to_have_text('Access blocked');assert 'site settings'in await page.locator('#lv-compass-status').inner_text()
   elif mode=='unsupported':await expect(page.locator('#lv-compass-state')).to_have_text('Sensor unavailable')
   elif mode=='android':
    await expect(page.locator('#lv-compass-state')).to_have_text('Finding heading')
    await emit(page,80,'relative');assert await page.locator('#lv-compass-card').get_attribute('data-live')=='false'
    await page.clock.fast_forward(10100);await expect(page.locator('#lv-compass-state')).to_have_text('No heading received')
   elif mode=='late-permission':
    assert await page.locator('#lv-compass-start').is_disabled();await page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))");await page.evaluate("window.__resolvePermission('granted')");await page.clock.run_for(100);await expect(page.locator('#lv-compass-state')).to_have_text('Paused');assert await page.locator('#lv-compass-card').get_attribute('data-live')=='false'
   elif mode=='ios':
    await expect(page.locator('#lv-compass-state')).to_have_text('Finding heading')
    await emit(page,50,accuracy=-1);await expect(page.locator('#lv-compass-state')).to_have_text('Check accuracy');assert await page.locator('#lv-compass-card').get_attribute('data-live')=='false'
    await emit(page,50,accuracy=40);await expect(page.locator('#lv-compass-state')).to_have_text('Check accuracy')
    await emit(page,50,beta=75);await expect(page.locator('#lv-compass-state')).to_have_text('Hold flatter')
    await emit(page,50);await expect(page.locator('#lv-compass-state')).to_have_text('Live compass')
    await page.clock.fast_forward(21000);await expect(page.locator('#lv-compass-state')).to_have_text('Reading paused');assert await page.locator('#lv-compass-card').get_attribute('data-live')=='false'
    await emit(page,50);await expect(page.locator('#lv-compass-state')).to_have_text('Live compass')
    await page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))");await expect(page.locator('#lv-compass-state')).to_have_text('Paused');assert await page.locator('#lv-compass-start').inner_text()=='Start live compass'
   assert not errors,errors;cases.append(mode);await c.close()
  c,page,errors=await setup('ios',1024,768);await page.evaluate("Object.defineProperty(screen,'orientation',{value:undefined,configurable:true});Object.defineProperty(window,'orientation',{value:90,configurable:true})");await page.locator('[data-place="Santa Barbara"]').click();await page.locator('#lv-compass-start').click();await expect(page.locator('#lv-compass-state')).to_have_text('Finding heading');decl=await page.evaluate('SDLaunchWMM.field(34.4208,-119.6982,new Date(Date.now())).declination');await emit(page,(286-decl-90)%360,angle=90);await expect(page.locator('#lv-compass-cue')).to_contain_text('Facing the pad');assert not errors;await c.close();cases.append('legacy iOS screen rotation')
  c,page,errors=await setup();await page.evaluate("Date.now=()=>Date.parse('2031-01-01T00:00:00Z')");await page.locator('[data-place="Santa Barbara"]').click();await page.locator('#lv-compass-start').click();await expect(page.locator('#lv-compass-state')).to_have_text('Finding heading');await emit(page,280);await expect(page.locator('#lv-compass-state')).to_have_text('Static bearing');assert await page.locator('#lv-compass-card').get_attribute('data-live')=='false';assert not errors;await c.close();cases.append('expired magnetic model')
  c,page,errors=await setup();await page.locator('#lv-compass-location').click();await expect(page.locator('#lv-location-status')).to_contain_text('Your location');assert await page.evaluate('window.__geoCalls')==1;assert await page.evaluate('window.__permissionCalls')==0;await c.close();cases.append('explicit location request')
  await b.close();(OUT/'results.json').write_text(json.dumps(cases,indent=2));print('Passed compass scenarios:',len(cases))
asyncio.run(main())
