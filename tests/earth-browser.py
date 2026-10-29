"""Actual Three.js + MapLibre journeys, read-only public providers, responsive captures."""
import asyncio, base64, json, mimetypes, os, pathlib, re, shutil
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
OUT=pathlib.Path('/tmp/earth-preview');OUT.mkdir(exist_ok=True)
ARGS=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']
STATE='window.__earthPreview.getState()'
ALLOWED={'tiles.openfreemap.org','s3.amazonaws.com','view.eumetsat.int'}

async def snapshot(page,name):
    data=await page.screenshot(type='jpeg',quality=73,animations='disabled',timeout=30000)
    (OUT/(name+'.jpg')).write_bytes(data)
    print('EARTH_PREVIEW '+name+' '+base64.b64encode(data).decode(),flush=True)

async def setup_route(ctx,mode='normal',cloud='fixture'):
    requests=[]
    async def route(r):
        u=urlparse(r.request.url)
        if r.request.method!='GET':return await r.abort()
        if u.hostname=='view.eumetsat.int' and cloud=='fixture':
            if mode=='cloud-fail':return await r.fulfill(status=503,body='Unavailable')
            if 'GetCapabilities' in r.request.url:
                return await r.fulfill(body='<WMS_Capabilities><Layer><Name>mumi:worldcloudmap_ir108</Name><Dimension name="time" default="2026-10-29T12:00:00Z">2026-10-29T12:00:00Z</Dimension></Layer></WMS_Capabilities>',content_type='text/xml')
            # Deterministic image fixture; the final film uses real dated EUMETSAT data.
            return await r.fulfill(body=(ROOT/'assets/earth/earth-clouds-2k.webp').read_bytes(),content_type='image/webp',headers={'Last-Modified':'Wed, 28 Oct 2026 06:00:00 GMT','Access-Control-Allow-Origin':'*'})
        if u.hostname in ALLOWED:return await r.continue_()
        if u.hostname!='superchargeddaily.com':return await r.abort()
        path=unquote(u.path).lstrip('/') or 'index.html';requests.append(path)
        if mode=='module-fail' and path=='earth-renderer.js':return await r.fulfill(status=503,body='Unavailable')
        if mode=='map-fail' and path.endswith('maplibre-gl.mjs'):return await r.fulfill(status=503,body='Unavailable')
        if mode=='texture-fail' and path.startswith('assets/earth/earth-day'):return await r.fulfill(status=503,body='Unavailable')
        file=ROOT/path
        if file.is_file() and ROOT in file.resolve().parents:
            ct='text/javascript' if file.suffix in ['.mjs','.js'] else mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
            return await r.fulfill(body=file.read_bytes(),content_type=ct)
        return await r.fulfill(status=404,body='Not found')
    await ctx.route('**/*',route)
    return requests

async def main():
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome'),args=ARGS)
        async def scenario(width,height,mode='normal',theme='dark'):
            name=f'{width}-{theme}-{mode}';print('EARTH_START '+name,flush=True)
            ctx=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=width<1000,is_mobile=width<500,reduced_motion='reduce' if mode=='reduced' else 'no-preference',color_scheme=theme,service_workers='block',permissions=['geolocation'],geolocation={'latitude':53.3464,'longitude':-6.2631})
            ctx.set_default_timeout(25000)
            await ctx.add_init_script('Date.now=()=>1793278800000;') # 2026-10-29 13:00 UTC; deterministic dated-cloud checks
            if mode=='no-webgl':await ctx.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)}")
            requests=await setup_route(ctx,mode)
            page=await ctx.new_page();errors=[];shader_errors=[];network_errors=[];console_errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('requestfailed',lambda r:network_errors.append({'url':r.url,'error':r.failure}))
            page.on('console',lambda m:console_errors.append(m.text) if m.type in ['error','warning'] else None)
            page.on('console',lambda m:shader_errors.append(m.text) if m.type=='error' and re.search(r'THREE.WebGLProgram|shader.*(?:error|fail)|GL_INVALID|compileShader|linkProgram|layers\[[0-9]+\]',m.text,re.I) else None)
            try:
                await page.goto(SITE+'/mission-control.html',wait_until='domcontentloaded')
                assert await page.locator('h1').count()==1
                assert await page.locator('meta[name=robots]').get_attribute('content')=='noindex,follow'
                assert await page.locator('#newsletter,.sd-band,.scroll-beam').count()==0
                await page.locator('#earth-about').click();about=page.locator('#earth-about-dialog')
                await expect(about).to_be_visible();text=(await about.inner_text()).lower()
                for phrase in ['three-hour','frame time','not photographic','modified eumetsat','historical']:assert phrase in text,phrase
                await page.keyboard.press('Escape');await expect(about).not_to_be_visible()
                if mode in ['no-webgl','module-fail','texture-fail']:
                    await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.state==='fallback'",timeout=90000)
                    await expect(page.locator('#earth-fallback')).to_be_visible()
                    if mode=='no-webgl':assert not any(re.search(r'assets/earth/earth-(?:day|night|cloud)',x) for x in requests)
                    await snapshot(page,name)
                else:
                    await page.wait_for_function("window.__earthPreview?.getState().ready",timeout=90000)
                    await page.wait_for_function("window.__earthWeather?.getState().available || document.getElementById('earth-weather').dataset.state==='fallback'",timeout=30000)
                    state=await page.evaluate(STATE);assert state['frames']>0 and state['textureWidth']>=2048 and state['textureCount']>=3,state
                    assert state['view']=='live'
                    assert not any('maplibre' in x for x in requests),'Ground engine must be lazy'
                    if mode=='reduced':
                        assert state['paused'] and not state['running'];before=state['rotation'];await page.wait_for_timeout(200);assert (await page.evaluate(STATE))['rotation']==before
                    elif mode=='cloud-fail':
                        assert not (await page.evaluate('window.__earthWeather.getState()'))['available']
                        await expect(page.locator('#earth-weather-label')).to_contain_text('Illustrative')
                    elif mode=='context-loss':
                        await page.locator('#earth-canvas').evaluate("e=>e.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
                        await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.state==='fallback'")
                    elif mode in ['normal','map-fail']:
                        await page.locator('#earth-motion').click();await page.wait_for_function(STATE+'.paused')
                        before=(await page.evaluate(STATE))['rotation'];await page.wait_for_timeout(200);assert (await page.evaluate(STATE))['rotation']==before
                        for view in ['daylight','night','live']:
                            await page.locator('#earth-about').click()
                            await page.locator('.cosmos-light-studies').evaluate('e=>e.open=true')
                            await page.locator('[data-earth-view='+view+']').click();await page.keyboard.press('Escape');await page.wait_for_function(STATE+'.view==='+json.dumps(view))
                        await page.locator('#earth-reset').click()
                        await page.locator('#earth-canvas').focus();before=(await page.evaluate(STATE))['cameraYaw'];await page.keyboard.press('ArrowRight');await page.wait_for_function(STATE+'.cameraYaw!=='+str(before))
                        await page.locator('#earth-reset').click()
                        if width==1440 and mode=='normal' and theme=='dark':
                            await page.locator('#earth-quality').select_option('ultra');await page.wait_for_function("!document.getElementById('earth-quality').disabled",timeout=90000)
                            await page.wait_for_function(STATE+'.textureWidth>=8192',timeout=90000)
                            await snapshot(page,'earth-8k-desktop')
                            await page.locator('#earth-quality').select_option('auto');await page.wait_for_function("!document.getElementById('earth-quality').disabled")
                        if width==390 and mode=='normal':
                            # Touch pinch on the unobstructed part of the globe.
                            client=await ctx.new_cdp_session(page)
                            old=(await page.evaluate(STATE))['zoom']
                            points=lambda d:[{'x':195-d,'y':480,'id':1},{'x':195+d,'y':480,'id':2}]
                            await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points(30)})
                            await client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':points(47)})
                            await client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                            await page.wait_for_function(STATE+'.zoom>'+str(old));await page.locator('#earth-reset').click()
                        await snapshot(page,name+'-earth')
                        await page.locator('#earth-explore').click();await expect(page.locator('#earth-search-dialog')).to_be_visible()
                        await page.locator('#earth-search').fill('not a place');await page.locator('#earth-search').press('Enter');await expect(page.locator('#earth-search-error')).to_be_visible()
                        await page.locator('#earth-place-list button').filter(has=page.locator('span',has_text='Manhattan')).click()
                        if mode=='map-fail':await expect(page.locator('#ground-fallback')).to_be_visible(timeout=40000)
                        else:
                            await page.wait_for_function("window.__earthGround?.getState().ready || document.querySelector('[data-earth-preview]').dataset.groundState==='fallback'",timeout=70000)
                            assert await page.evaluate('window.__earthGround?.getState().ready'),await page.evaluate('window.__earthGround?.diagnostics?.()')
                            await page.wait_for_function('window.__earthGround.getState().renderedBuildings>15',timeout=70000)
                            ground=await page.evaluate('window.__earthGround.getState()');assert ground['zoom']>=14,ground
                            await page.wait_for_timeout(700)
                            assert not (await page.evaluate(STATE))['running'],'Hidden Earth must stop rendering'
                            assert await page.locator('#earth-satellite').get_attribute('target')=='_blank'
                            assert 'basemap=satellite' in await page.locator('#earth-satellite').get_attribute('href')
                            await snapshot(page,name+'-ground')
                            await page.locator('#ground-buildings').click();await expect(page.locator('#ground-buildings')).to_have_attribute('aria-pressed','false');await page.locator('#ground-buildings').click()
                            await page.locator('#ground-terrain').click();await expect(page.locator('#ground-terrain')).to_have_attribute('aria-pressed','false');await page.locator('#ground-terrain').click()
                            if width==1440 and theme=='dark':
                                await page.locator('#earth-change-place').click();await page.locator('#earth-place-list button').filter(has=page.locator('span',has_text='The Matterhorn')).click()
                                await page.wait_for_function('window.__earthGround.getState().lat>45&&window.__earthGround.getState().lat<46',timeout=20000)
                                await page.wait_for_timeout(3500);await snapshot(page,'alpine-terrain')
                                print('EARTH_HANDOFF_START',flush=True)
                                centre=await page.evaluate('window.__earthGround.getState()')
                                await page.evaluate('window.__earthGround.map.jumpTo({zoom:3.2,pitch:0})')
                                assert await page.evaluate("document.querySelector('[data-earth-preview]').dataset.mode")=='ground','Programmatic map moves must keep the current view'
                                await page.locator('#ground-map .maplibregl-canvas').focus();await page.keyboard.press('-')
                                await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.mode==='earth'")
                                selected=await page.evaluate(STATE+'.selectedPoint');assert selected and abs(selected['lat']-centre['lat'])<.01 and abs((selected['lon']-centre['lon']+180)%360-180)<.01,(centre,selected)
                                assert await page.evaluate('window.__earthGround===null'),'Wide map must release its resources after handoff'
                                print('EARTH_HANDOFF_RETURNED',flush=True)
                            if await page.evaluate("document.querySelector('[data-earth-preview]').dataset.mode")!='earth':await page.locator('[data-earth-mode=earth]').click()
                            await expect(page.locator('#earth-canvas')).to_be_visible()
                            await page.wait_for_function(STATE+'.view==="live"')
                            await page.locator('#earth-explore').click();await page.locator('#earth-locate').click()
                            await page.wait_for_function('window.__earthGround?.getState().ready&&window.__earthGround.getState().lat>53&&window.__earthGround.getState().lat<54&&window.__earthGround.getState().zoom>14',timeout=60000)
                            assert await page.evaluate("document.querySelector('[data-earth-preview]').dataset.mode")=='ground','Opening a new place after globe return must stay in the map'
                            print('EARTH_MAP_REOPENED',flush=True)
                            if width==1440:
                                await page.locator('[data-earth-mode=earth]').click()
                                await page.mouse.move(940,450);await page.mouse.wheel(0,-1100)
                                await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.mode==='ground'")
                    if mode not in ['normal','map-fail']:await snapshot(page,name)
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),name
                assert not errors,(name,errors)
                assert not shader_errors,(name,shader_errors)
                results.append({'scenario':name,'ok':True,'requests':len(requests)})
                print('EARTH_PASS '+name,flush=True)
            except Exception:
                print('EARTH_ERROR '+name+' '+json.dumps({'errors':errors,'shaders':shader_errors,'network':network_errors[-20:],'console':console_errors[-15:],'ground':await page.evaluate('window.__earthGround?.diagnostics?.()')}),flush=True)
                await snapshot(page,name+'-failed');raise
            finally:await ctx.close()
        group=os.environ.get('EARTH_TEST_GROUP','all')
        cases={'desktop':[(1440,900),(1440,900,'normal','light'),(1440,900,'context-loss')],'touch':[(390,844),(768,1024),(390,700,'short'),(844,390,'short'),(390,844,'reduced','light')],'failures':[(390,844,'no-webgl'),(390,844,'module-fail'),(390,844,'texture-fail'),(390,844,'cloud-fail'),(390,844,'map-fail')]}
        selected=cases.get(group,[item for case in cases.values() for item in case])
        for args in selected:
            await asyncio.wait_for(scenario(*args),timeout=300 if args[0]==1440 else 230)
        (OUT/'results.json').write_text(json.dumps(results,indent=2))
        if group not in ['all','desktop']:
            await browser.close();print('EARTH_COMPLETE '+str(len(results))+' journeys',flush=True);return
        # A real, unmocked cloud and map journey for the review film.
        ctx=await browser.new_context(viewport={'width':1440,'height':900},record_video_dir=str(OUT/'recording'),record_video_size={'width':1440,'height':900},service_workers='block')
        await setup_route(ctx,cloud='real');page=await ctx.new_page();satellite_requests=[]
        page.on('requestfailed',lambda r:satellite_requests.append({'url':r.url,'error':r.failure}) if 'eumetsat' in r.url else None)
        page.on('console',lambda m:print('SATELLITE_CONSOLE',m.text,flush=True) if m.type=='error' else None)
        await page.goto(SITE+'/mission-control.html');await page.wait_for_function('window.__earthPreview?.getState().ready',timeout=90000)
        try:await page.wait_for_function('window.__earthWeather?.getState().available',timeout=130000)
        except Exception:
            print('SATELLITE_FAILED',json.dumps({'state':await page.evaluate('window.__earthWeather?.getState()'),'requests':satellite_requests}),flush=True);raise
        print('SATELLITE_VERIFIED',json.dumps(await page.evaluate('window.__earthWeather.getState()')),flush=True)
        assert (await page.evaluate(STATE))['cloudKind']=='infrared'
        await page.wait_for_timeout(700);await snapshot(page,'actual-latest-clouds')
        start=asyncio.get_running_loop().time();await page.wait_for_timeout(4000)
        await page.locator('#earth-explore').click();await page.wait_for_timeout(500)
        await page.locator('#earth-place-list button').filter(has=page.locator('span',has_text='Manhattan')).click()
        await page.wait_for_function('window.__earthGround?.getState().renderedBuildings>15',timeout=70000);await page.wait_for_timeout(4500)
        await page.locator('#earth-change-place').click();await page.locator('#earth-place-list button').filter(has=page.locator('span',has_text='The Matterhorn')).click();await page.wait_for_timeout(4500)
        duration=asyncio.get_running_loop().time()-start
        video=page.video;await ctx.close();source=await video.path()
        ffmpeg=shutil.which('ffmpeg');assert ffmpeg
        process=await asyncio.create_subprocess_exec(ffmpeg,'-hide_banner','-loglevel','error','-y','-sseof','-'+str(round(duration,2)),'-i',str(source),'-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','fast','-crf','23','-movflags','+faststart',str(OUT/'earth-preview.mp4'),stderr=asyncio.subprocess.PIPE)
        _,error=await process.communicate();assert process.returncode==0,error.decode()
        await browser.close();print('EARTH_COMPLETE '+str(len(results))+' journeys',flush=True)
asyncio.run(main())
