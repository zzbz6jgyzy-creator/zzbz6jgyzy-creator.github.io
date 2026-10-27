"""Optimus 3D viewer journeys with software WebGL: load, explode, inspect, guide launch and fallbacks."""
import asyncio,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com'
ARGS=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
async def site(ctx,block=None):
 async def route(r):
  u=urlparse(r.request.url)
  if u.hostname!='superchargeddaily.com' or (block and block in u.path):return await r.abort()
  f=ROOT/u.path.lstrip('/')
  if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
  return await r.abort()
 await ctx.route('**/*',route)
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=ARGS)
  for w,h in [(1440,900),(390,844)]:
   ctx=await browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');await site(ctx);page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(SITE+'/optimus-viewer.html');await page.wait_for_selector('.m3x-ready',timeout=120000)
   assert await page.evaluate('__ctx.shell()')==17
   assert await page.evaluate('__ctx.actuators()')=={'rotary':14,'linear':14}
   vis=await page.evaluate('__ctx.vis()');assert vis['shell'] and not any(vis[k] for k in ['battery','rotary','linear','hands','computer'])
   await page.locator('.m3x-explode').click();await page.wait_for_function('__ctx.vis().battery',timeout=30000)
   vis=await page.evaluate('__ctx.vis()');assert all(vis[k] for k in ['battery','rotary','linear','hands','computer','feet']),vis
   await page.locator('.m3x-parts').click();await page.locator('.m3x-list button[data-part="linear"]').click();await page.wait_for_selector('.m3x-card:not([hidden]) h2')
   assert await page.locator('.m3x-card h2').inner_text()=='Linear actuators';assert 'very tightly packaged' in await page.locator('.m3x-card').inner_text()
   await page.locator('.m3x-card .m3x-x').click();await page.locator('.m3x-reset').click();await page.wait_for_function('__ctx.exT()===0&&__ctx.selected()===null',timeout=30000)
   assert await page.evaluate('__ctx.exT()')==0 and await page.evaluate('__ctx.selected()') is None
   await page.locator('.m3x-canvas canvas').focus();before=await page.evaluate('__ctx.view().theta');await page.keyboard.press('ArrowLeft');assert await page.evaluate('__ctx.view().theta')!=before
   assert await page.locator('.m3x-list button').count()==11
   assert await page.evaluate("!document.querySelector('#newsletter,.sd-band,.scroll-beam')"),'site bundle leaked into the frame'
   assert not errors,errors;print('viewer',w,'passed',flush=True);await ctx.close()
  # Guide launch, part hand-off from the X-ray, exit with focus return.
  ctx=await browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce');await site(ctx);page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto(SITE+'/optimus.html');await page.locator('.os-system-tabs [data-system="hands"]').click()
  assert not await page.locator('iframe').count()
  await page.locator('[data-os3d-start]').click()
  await page.wait_for_function("document.querySelector('[data-os3d-status]').textContent.startsWith('3D ready')",timeout=120000)
  frame=page.frame_locator('[data-os3d-frame] iframe');await page.wait_for_timeout(300);assert await frame.locator('.m3x-card h2').inner_text()=='Hands'
  await page.locator('[data-os3d-exit]').click();assert await page.locator('iframe').count()==0;assert await page.evaluate("document.activeElement.matches('[data-os3d-start]')")
  assert not errors,errors;print('guide launch passed',flush=True);await ctx.close()
  # A missing model falls back to the guide with a message.
  ctx=await browser.new_context(viewport={'width':1440,'height':900});await site(ctx,block='optimus.glb');page=await ctx.new_page()
  await page.goto(SITE+'/optimus.html');await page.locator('[data-os3d-start]').click()
  await page.wait_for_function("document.querySelector('[data-os3d-status]').textContent.includes('could not load 3D')",timeout=60000)
  assert await page.locator('iframe').count()==0 and await page.locator('[data-os3d-stage]').is_visible();print('fallback passed',flush=True);await ctx.close()
  await browser.close()
asyncio.run(main())
