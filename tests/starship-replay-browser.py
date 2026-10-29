"""Real WebGL acceptance journeys; all requests stay inside this committed checkout."""
import asyncio,base64,json,mimetypes,os,pathlib,re,shutil,subprocess
from urllib.parse import unquote,urlparse
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path('/tmp/starship-replay');OUT.mkdir(exist_ok=True)
SITE='https://superchargeddaily.com'
ARGS=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']
STATE='window.__starshipReplay.getState()'

async def shot(page,name):
    data=await page.screenshot(type='jpeg',quality=74,animations='disabled',timeout=25000)
    (OUT/(name+'.jpg')).write_bytes(data)
    print('STARSHIP_SCREEN '+name+' '+base64.b64encode(data).decode(),flush=True)

async def serve(route,mode='normal'):
    u=urlparse(route.request.url)
    if route.request.method!='GET' or u.hostname!='superchargeddaily.com': return await route.abort()
    path=unquote(u.path).lstrip('/') or 'index.html'
    if mode=='module-fail' and path=='starship-replay-renderer.js':return await route.fulfill(status=503,body='Module unavailable')
    if mode=='texture-fail' and path.startswith('assets/earth/earth-day-'):return await route.fulfill(status=503,body='Image unavailable')
    file=ROOT/path
    if file.is_file() and ROOT in file.resolve().parents:return await route.fulfill(body=file.read_bytes(),content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
    return await route.fulfill(status=404,body='Not found')

async def main():
  results=[]
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome') or shutil.which('chromium'),args=ARGS)
    for width,height,theme,mode in [(1440,1000,'dark','normal'),(390,1000,'dark','normal'),(768,1000,'light','normal'),(390,1000,'light','reduced'),(390,900,'dark','no-webgl'),(1440,900,'dark','texture-fail'),(768,1000,'dark','module-fail'),(1440,1000,'dark','context-loss')]:
      name=f'{width}-{theme}-{mode}';print('STARSHIP_START '+name,flush=True)
      ctx=await browser.new_context(viewport={'width':width,'height':height},has_touch=width<1000,is_mobile=width<500,color_scheme=theme,reduced_motion='reduce' if mode=='reduced' else 'no-preference',service_workers='block')
      page=await ctx.new_page();errors=[];shader=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      page.on('console',lambda m:shader.append(m.text) if m.type=='error' and re.search(r'WebGLProgram|GL_INVALID|compileShader|linkProgram',m.text,re.I) else None)
      if mode=='no-webgl':await ctx.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:original.call(this,t,...a)}")
      await ctx.route('**/*',lambda r:serve(r,mode))
      try:
        await page.goto(SITE+'/starship-replay.html',wait_until='domcontentloaded')
        assert await page.locator('h1').count()==1
        assert await page.locator('meta[name=robots]').get_attribute('content')=='noindex,follow'
        assert await page.locator('#newsletter,.sd-band,.scroll-beam').count()==0
        await page.locator('#sources').click();assert await page.locator('#about').is_visible()
        assert '373 archived SpaceX position samples' in await page.locator('#about').inner_text()
        await page.keyboard.press('Escape');assert not await page.locator('#about').is_visible()
        assert await page.locator('#sources').evaluate('e=>e===document.activeElement')
        if mode in ['no-webgl','texture-fail','module-fail']:
          await page.wait_for_function("document.querySelector('[data-flight-replay]').dataset.state==='fallback'",timeout=90000)
          assert await page.locator('#fallback').is_visible()
          assert await page.locator('#retry').is_visible()
          assert await page.locator('.chapter').count()==9
          await shot(page,name)
        else:
          await page.wait_for_function("document.querySelector('[data-flight-replay]').dataset.state==='ready'&&window.__starshipReplay",timeout=120000)
          state=await page.evaluate(STATE);assert state['ready'] and state['frames']>0 and state['textureWidth']>=2048,state
          assert state['tileCount']>2500,state
          assert not state['playing'],'Replay must begin paused, including reduced motion'
          assert await page.locator('#flight-canvas').evaluate("e=>!!e.getContext('webgl2')")
          await shot(page,name+'-launch')
          if mode=='normal':
            await page.evaluate('window.__starshipReplay.seek(7)')
            bounds=(await page.evaluate(STATE))['framing']
            assert -.98<bounds['tipY']<.98 and -.98<bounds['tailY']<.98,('clipped ascent or exhaust',bounds)
            await shot(page,str(width)+'-ignition');await page.evaluate('window.__starshipReplay.seek(0)')
          if mode=='context-loss':
            await page.locator('#flight-canvas').evaluate("e=>e.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
            await page.wait_for_function("document.querySelector('[data-flight-replay]').dataset.state==='fallback'")
            await shot(page,name)
            await page.locator('#retry').click()
            await page.wait_for_function("document.querySelector('[data-flight-replay]').dataset.state==='ready'&&window.__starshipReplay",timeout=120000)
          else:
            await page.locator('#timeline').evaluate("e=>{e.value=142;e.dispatchEvent(new Event('input',{bubbles:true}))}")
            assert (await page.evaluate(STATE))['separated']
            assert (await page.evaluate(STATE))['t']==142
            assert not (await page.evaluate(STATE))['playing']
            await shot(page,name+'-staging')
            await page.locator('[data-camera=booster]').click();assert (await page.evaluate(STATE))['camera']=='booster'
            await page.evaluate('window.__starshipReplay.seek(402)')
            assert (await page.evaluate(STATE))['boosterEngine']>0
            await page.locator('.viewer').scroll_into_view_if_needed();await shot(page,name+'-booster')
            await page.evaluate("window.__starshipReplay.jump('orbit')")
            assert (await page.evaluate(STATE))['camera']=='earth'
            await page.locator('.viewer').scroll_into_view_if_needed();await shot(page,name+'-earth')
            await page.evaluate("window.__starshipReplay.jump('entry')")
            assert (await page.evaluate(STATE))['entry']>0
            await page.evaluate('window.__starshipReplay.seek(10500)')
            await page.locator('.viewer').scroll_into_view_if_needed();await shot(page,name+'-entry')
            canvas=page.locator('#flight-canvas')
            if width<1000:
              box=await canvas.bounding_box();cx=box['x']+box['width']*.5;cy=box['y']+box['height']*.6
              cdp=await ctx.new_cdp_session(page)
              def fingers(distance):return [{'x':cx-distance,'y':cy,'id':1},{'x':cx+distance,'y':cy,'id':2}]
              before_zoom=(await page.evaluate(STATE))['zoom']
              await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':fingers(30)})
              await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':fingers(48)})
              await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
              assert (await page.evaluate(STATE))['zoom']>before_zoom,'pinch did not zoom'
              await cdp.detach()
            await canvas.focus();yaw=(await page.evaluate(STATE))['yaw']
            await page.keyboard.press('ArrowRight');assert (await page.evaluate(STATE))['yaw']!=yaw
            await page.keyboard.press('+');assert (await page.evaluate(STATE))['zoom']>1
            await page.keyboard.press('Home');assert (await page.evaluate(STATE))['zoom']==1
            await page.keyboard.press('Space');await page.wait_for_function(STATE+'.playing')
            before=(await page.evaluate(STATE))['t'];await page.wait_for_function(STATE+'.t>'+str(before))
            await page.keyboard.press('Space');assert not(await page.evaluate(STATE))['playing']
            await page.locator('#restart').click();assert (await page.evaluate(STATE))['t']==0
            if width==1440 and mode=='normal':
              await page.locator('#quality').select_option('ultra');await page.wait_for_function(STATE+'.textureWidth===8192',timeout=120000)
              await page.evaluate("window.__starshipReplay.jump('orbit')");await page.locator('.viewer').scroll_into_view_if_needed();await shot(page,'1440-8k-earth')
            if mode=='reduced':
              frames=(await page.evaluate(STATE))['frames'];await page.wait_for_timeout(400)
              assert (await page.evaluate(STATE))['frames']<=frames+1
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'horizontal page overflow'
            # All on-screen labels must stay inside their own cards.
            for selector in ['.camera-tabs','.console','.scene-story','.scene-readout','.chapter']:
              assert await page.locator(selector).first.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),selector+' overflows'
            assert not shader,shader
            assert not errors,errors
            results.append({'name':name,'state':await page.evaluate(STATE),'shaderErrors':shader,'errors':errors})
      except Exception as e:
        await shot(page,name+'-FAILED');print('STARSHIP_FAILURE '+name+' '+repr(e)+' ERRORS '+json.dumps(errors)+' SHADERS '+json.dumps(shader),flush=True);raise
      finally:await ctx.close()
    # Real rendered film: launch, separation, booster, orbital payload, and entry cameras.
    ctx=await browser.new_context(viewport={'width':1440,'height':1000},record_video_dir=str(OUT),record_video_size={'width':1440,'height':1000},service_workers='block')
    await ctx.route('**/*',serve);page=await ctx.new_page();await page.goto(SITE+'/starship-replay.html',wait_until='domcontentloaded')
    await page.wait_for_function('window.__starshipReplay&&'+STATE+'.ready',timeout=120000)
    for chapter,t,speed in [('launch',3,'10'),('staging',142,'10'),('booster',397,'10'),('orbit',3100,'300'),('payload',2800,'60'),('deorbit',7940,'10'),('entry',10400,'60'),('landing',11298,'10')]:
      await page.evaluate("([c,t])=>{window.__starshipReplay.jump(c);window.__starshipReplay.seek(t)}",[chapter,t])
      await page.locator('#speed').select_option(speed);await page.evaluate('window.__starshipReplay.play()');await page.wait_for_timeout(2600);await page.evaluate('window.__starshipReplay.pause()')
    video=page.video;await ctx.close();video_file=await video.path()
    subprocess.run(['ffmpeg','-y','-sseof','-21','-i',str(video_file),'-an','-c:v','libx264','-crf','21','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'starship-flight-14.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    await browser.close()
  (OUT/'results.json').write_text(json.dumps(results,indent=2));print('STARSHIP_PASS '+str(len(results))+' rendered journeys; responsive/fallback checks and film complete.',flush=True)

asyncio.run(main())
