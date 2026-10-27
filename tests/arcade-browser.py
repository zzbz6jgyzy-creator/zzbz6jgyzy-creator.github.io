"""Real game journeys with local assets, deterministic clocks and no public score writes."""
import asyncio,pathlib,mimetypes,os,shutil,json,base64
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=pathlib.Path('/tmp/arcade-previews');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,theme='dark',blocked=False):
   c=await browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',service_workers='block',is_mobile=width<=430,has_touch=width<=768)
   await c.add_init_script('try{localStorage.setItem("sd-theme",'+json.dumps(theme)+')}catch{}')
   if blocked:await c.add_init_script("Storage.prototype.getItem=function(){throw Error('blocked')};Storage.prototype.setItem=function(){throw Error('blocked')}")
   async def route(r):
    u=urlparse(r.request.url);f=ROOT/u.path.lstrip('/')
    if u.hostname=='aljr-boards.superchargeddaily.workers.dev':
     assert r.request.method=='GET','new-edition scores must not enter legacy public boards'
     return await r.fulfill(json={'rows':[]})
    if u.hostname!='superchargeddaily.com' or not f.is_file():return await r.abort()
    return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
   await c.route('**/*',route);return c
  previews=[]
  for name in ['games','catch','staging','robotaxi']:
   for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
    c=await context(width,theme);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(e.stack))
    await q.goto('https://superchargeddaily.com/'+name+'.html',wait_until='networkidle');assert not errors,(name,errors)
    assert await q.locator('h1').count()==1
    assert not await q.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(name,width,theme,'overflow')
    if name=='games':
     await q.get_by_role('button',name='Strategy',exact=True).click();assert await q.locator('[data-game-kind]:visible').count()==1
     await q.get_by_role('button',name='All games',exact=True).click();assert await q.locator('[data-game-kind]:visible').count()==3
     assert await q.locator('[data-daily="catch"]').get_attribute('href')
    else:
     await q.locator('[data-ac-focus]').click();assert await q.locator('body').evaluate("e=>e.classList.contains('ac-focus')")
     await q.locator('[data-ac-focus]').click();await q.locator('[data-ac-help]').click();assert await q.locator('[data-ac-manual]').get_attribute('open') is not None
     await q.locator('[data-ac-manual] summary').click()
    await q.evaluate("scrollTo({top:0,behavior:'instant'})")
    file=OUT/f'{name}-{width}-{theme}.png';await q.screenshot(path=str(file))
    if (name=='games'and width==390 and theme=='dark')or(width==1440 and theme=='dark'):
     jpg=OUT/f'{name}-{width}-preview.jpg';await q.screenshot(path=str(jpg),type='jpeg',quality=65);previews.append(jpg);print('ARCADE_PREVIEW '+jpg.name+' '+base64.b64encode(jpg.read_bytes()).decode(),flush=True)
    print('PASS layout',name,width,theme,flush=True);await c.close()
  for name,api in [('catch','CatchGame'),('staging','StagingGame')]:
   c=await context();q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(e.stack));await q.goto('https://superchargeddaily.com/'+name+'.html',wait_until='networkidle');await q.clock.install()
   await q.locator('[data-ac-focus]').click();await q.locator('[data-'+name+'-play]').click();await q.clock.run_for(3500 if name=='staging' else 200)
   if name=='catch':assert 'Fuel ' in await q.locator('[data-ac-fuel]').inner_text()
   assert await q.evaluate(f'{api}.state()') in ['fly','boost'];assert await q.evaluate(f'{api}.muted()')
   await q.locator('[data-hold="right"]').dispatch_event('pointerdown',{'pointerId':11,'pointerType':'touch','button':0})
   if name=='catch':await q.locator('[data-hold="thrust"]').dispatch_event('pointerdown',{'pointerId':12,'pointerType':'touch','button':0})
   await q.clock.run_for(120 if name=='staging'else 300);assert await q.evaluate(f'{api}.held().right');assert await q.evaluate(f'{api}.hold().right')>0
   await q.locator('[data-hold="right"]').dispatch_event('pointercancel',{'pointerId':11});await q.locator('[data-hold="thrust"]' if name=='catch' else '[data-hold="left"]').dispatch_event('pointercancel',{'pointerId':12})
   assert not await q.evaluate(f'{api}.held().right')
   await q.locator('[data-ac-pause]').click();assert await q.evaluate(f'{api}.state()')=='pause';before=await q.evaluate(f'JSON.stringify({api}.ship())'if name=='catch'else f'JSON.stringify({api}.stack())');await q.clock.run_for(1000);assert before==await q.evaluate(f'JSON.stringify({api}.ship())'if name=='catch'else f'JSON.stringify({api}.stack())')
   await q.locator('[data-'+name+'-play]').click();assert await q.evaluate(f'{api}.state()')!='pause'
   await q.screenshot(path=str(OUT/f'{name}-phone-flight.png'));jpg=OUT/f'{name}-phone-flight.jpg';await q.screenshot(path=str(jpg),type='jpeg',quality=65);previews.append(jpg);print('ARCADE_PREVIEW '+jpg.name+' '+base64.b64encode(jpg.read_bytes()).decode(),flush=True)
   # Daily retry uses identical physical starting conditions despite random visual effects.
   await q.goto('https://superchargeddaily.com/'+name+'.html?mode=daily&day=2026-10-27',wait_until='networkidle')
   expression=f'(()=>{{{api}.restart();const x={api}.ship();return [x.x,x.y,x.vx,x.vy,x.angle,x.fuel]}})()'if name=='catch'else f'(()=>{{{api}.restart();const x={api}.stack();return [x.x,x.vx,x.angle,x.alt,x.outBias]}})()'
   a=await q.evaluate(expression);b=await q.evaluate(expression);assert a==b,(name,'daily reset mismatch',a,b)
   await q.goto('https://superchargeddaily.com/'+name+'.html?mode=training',wait_until='networkidle');await q.clock.install();await q.locator('[data-ac-demo]').click();await q.clock.run_for(45000 if name=='catch'else 18000)
   assert await q.evaluate(f'{api}.state()')=='complete',(name,'demonstration did not finish',await q.evaluate(f'{api}.state()'))
   assert not await q.evaluate('Object.keys(SDArcade.read().records).length'),'demonstration must not save a score'
   if name=='staging':
    await q.locator('[data-ac-restart]').click();await q.clock.run_for(12000);assert await q.evaluate('StagingGame.state()')=='window';assert await q.locator('[data-staging-cue]').is_visible()
    await q.keyboard.press('Space');await q.clock.run_for(3000);assert await q.evaluate('StagingGame.state()')=='complete';assert await q.evaluate('Object.values(SDArcade.read().records)[0].complete')
   assert not errors,(name,errors);print('PASS playthrough',name,flush=True);await c.close()
  # Play a complete seven-day city through real assignment, upgrade and turn controls.
  c=await context();q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(e.stack));await q.goto('https://superchargeddaily.com/robotaxi.html?mode=campaign',wait_until='networkidle');await q.locator('[data-taxi-play]').click();assert await q.evaluate('RobotaxiGame.state()')=='deploy'
  await q.locator('[data-upgrade="routing"]').click();assert await q.evaluate('RobotaxiGame.snapshot().upgrades.routing');assert await q.evaluate('RobotaxiGame.snapshot().cash')==3600
  await q.get_by_role('button',name='Send a cab to Downtown',exact=True).click();await q.get_by_role('button',name='Send a cab to Airport',exact=True).click()
  before=await q.evaluate('RobotaxiGame.snapshot()');await q.reload();await q.locator('[data-taxi-play]').click();assert await q.evaluate('RobotaxiGame.snapshot()')==before,'saved week was not restored'
  await q.screenshot(path=str(OUT/'robotaxi-phone-planning.png'));jpg=OUT/'robotaxi-phone-planning.jpg';await q.screenshot(path=str(jpg),type='jpeg',quality=65);previews.append(jpg);print('ARCADE_PREVIEW '+jpg.name+' '+base64.b64encode(jpg.read_bytes()).decode(),flush=True)
  for day in range(7):
   assert await q.evaluate('RobotaxiGame.snapshot().day')==day
   await q.locator('[data-taxi-pricing]').select_option('value' if day%2 else 'balanced')
   for zone in ['Downtown','Airport','The Hills','Downtown','Airport','Stadium']:
    b=q.get_by_role('button',name='Send a cab to '+zone,exact=True)
    if await b.is_enabled():await b.click()
   await q.get_by_role('button',name='Run the day',exact=True).click()
   assert await q.evaluate('RobotaxiGame.snapshot().history.length')==day+1
   if day<6:
    assert await q.evaluate('RobotaxiGame.state()')=='night';await q.get_by_role('button',name='Sleep ·',exact=False).click()
   else:assert await q.evaluate('RobotaxiGame.state()')=='end'
  await q.get_by_role('button',name='Review the week',exact=True).click();assert await q.locator('[data-taxi-chart]>div').count()==7;assert await q.locator('[data-taxi-chart]').is_visible()
  assert await q.evaluate('SDArcade.read().records["robotaxi:campaign"].complete');assert not await q.evaluate('localStorage.getItem("sd-arcade-taxi-resume-v2:campaign")');assert not errors,errors
  print('PASS seven-day fleet, upgrades, saving and debrief',flush=True);await c.close()
  for name in ['games','catch','staging','robotaxi']:
   c=await context(blocked=True);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(e.stack));await q.goto('https://superchargeddaily.com/'+name+'.html',wait_until='networkidle')
   if name!='games':
    await q.locator('[data-'+('taxi'if name=='robotaxi'else name)+'-play]').click();assert 'Storage unavailable' in await q.locator('[data-ac-save]').inner_text()
   assert not errors,(name,'blocked storage',errors);print('PASS blocked storage',name,flush=True);await c.close()
  c=await context();q=await c.new_page();await q.goto('https://superchargeddaily.com/catch.html',wait_until='networkidle')
  await q.evaluate("localStorage.setItem('quota-fixture','old');Storage.prototype.setItem=function(){throw Error('quota')};SDArcade.storage.setItem('quota-fixture','new')")
  assert await q.evaluate("SDArcade.storage.getItem('quota-fixture')")=='new','quota failure must retain the latest visit state'
  await q.evaluate("SDArcade.storage.removeItem('quota-fixture')");assert await q.evaluate("SDArcade.storage.getItem('quota-fixture')") is None
  print('PASS quota fallback with existing storage',flush=True);await c.close()
  for width,expect in [(390,True),(1440,False)]:
   c=await context(width);q=await c.new_page();await q.goto('https://superchargeddaily.com/catch.html',wait_until='networkidle')
   assert not await q.evaluate("document.body.classList.contains('ac-focus')")
   await q.locator('[data-catch-play]').click()
   assert await q.evaluate("document.body.classList.contains('ac-focus')")==expect,('auto focus view',width)
   if expect:
    box=await q.locator('[data-catch-stage]').bounding_box();assert box['y']+box['height']<=1000,'stage fits the phone screen'
    await q.locator('[data-ac-focus]').click();assert not await q.evaluate("document.body.classList.contains('ac-focus')")
    await q.evaluate("CatchGame.restart()");assert not await q.evaluate("document.body.classList.contains('ac-focus')"),'exit is remembered for the session'
   print('PASS phone focus view',width,flush=True);await c.close()
  # Small inline previews let reviewers inspect CI screenshots through the connected log reader.
  await browser.close()
asyncio.run(main())
