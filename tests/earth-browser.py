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


async def wake(page):
    await page.mouse.move(3,3);await page.mouse.move(6,9)
async def hud_click(page,selector):
    await wake(page);await page.locator(selector).click()
async def open_panel(page):
    if not await page.evaluate("document.getElementById('earth-panel').open"):
        await hud_click(page,'#earth-menu');await expect(page.locator('#earth-panel')).to_be_visible()
async def close_panels(page):
    for _ in range(4):
        if not await page.evaluate("[...document.querySelectorAll('dialog')].some(d=>d.open)"):break
        await page.keyboard.press('Escape');await page.wait_for_timeout(50)
async def panel_click(page,selector,keep=False):
    await open_panel(page);await page.locator(selector).click()
    if not keep:await close_panels(page)
VISIBLE_TEXT="""()=>{const out=[];const root=document.querySelector('.earth-experience');const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(w.nextNode()){const n=w.currentNode;if(!n.textContent.trim())continue;const e=n.parentElement;if(e.closest('script,style,noscript,.maplibregl-ctrl'))continue;
  if(!e.checkVisibility({opacityProperty:true,visibilityProperty:true}))continue;const r=e.getBoundingClientRect();if(r.width<=2||r.height<=2)continue;out.push(n.textContent.trim().slice(0,60));}
 return out;}"""
async def assert_clean(page,name):
    await page.wait_for_function("document.getElementById('earth-note').hidden",timeout=20000)
    texts=await page.evaluate(VISIBLE_TEXT);assert texts==[],(name,texts)
async def intro_check(page,name):
    intro=page.locator('#earth-intro');await expect(intro).to_be_visible()
    assert await page.evaluate("document.activeElement.id")=='earth-enter'
    assert await page.locator('#earth-enter').inner_text()
    assert await page.evaluate("document.getElementById('earth-world').inert")
    await snapshot(page,name+'-intro')
    await page.keyboard.press('Escape');await expect(intro).to_be_hidden(timeout=15000)
    assert await page.evaluate("document.activeElement.id")=='earth-canvas','Focus must land on the canvas'
    assert await page.evaluate("sessionStorage.getItem('sd-earth-intro')")=='1'
    await page.reload(wait_until='domcontentloaded')
    assert await page.evaluate("document.documentElement.classList.contains('earth-entered')")
    await expect(page.locator('#earth-intro')).to_be_hidden()

HUD="document.querySelector('[data-earth-preview]').dataset.hud"
async def hud_panel_checks(page):
    await page.evaluate('document.activeElement?.blur()')
    await page.wait_for_function(HUD+"==='idle'",timeout=25000)
    await page.wait_for_function("parseFloat(getComputedStyle(document.getElementById('earth-hud')).opacity)<.05",timeout=5000)
    assert await page.get_by_role('button',name='Pause rotation').count()==1,'Pause must stay in the accessibility tree while faded'
    assert await page.evaluate("getComputedStyle(document.getElementById('earth-motion')).display")!='none'
    await wake(page);await page.wait_for_function(HUD+"==='active'")
    await page.wait_for_function("parseFloat(getComputedStyle(document.getElementById('earth-hud')).opacity)>.95",timeout=5000)
    await page.locator('#earth-canvas').focus();await page.keyboard.press('Tab')
    assert await page.evaluate("document.getElementById('earth-hud').contains(document.activeElement)")
    await page.wait_for_timeout(3600);assert await page.evaluate(HUD)=='active','HUD must not hide while keyboard focus is inside it'
    await page.evaluate("document.activeElement.blur()");await page.wait_for_function(HUD+"==='idle'",timeout=25000)
    await wake(page);await page.locator('#earth-menu').click();panel=page.locator('#earth-panel');await expect(panel).to_be_visible()
    assert await page.locator('#earth-menu').get_attribute('aria-expanded')=='true'
    assert await page.evaluate("document.getElementById('earth-panel').contains(document.activeElement)"),'Focus must move into the panel'
    await page.wait_for_timeout(3600);assert await page.evaluate(HUD)=='active','HUD must not hide while the panel is open'
    text=(await panel.inner_text()).lower()
    for phrase in ['eumetsat','brunier','openstreetmap','sources & detail','show labels','pause' if False else 'zoom']:assert phrase in text,phrase
    await page.keyboard.press('Escape');await expect(panel).to_be_hidden()
    await expect(page.locator('#earth-menu')).to_have_attribute('aria-expanded','false')
    await page.wait_for_function("document.activeElement.id==='earth-menu'",timeout=3000)
    assert await page.evaluate("document.elementFromPoint(innerWidth/2,innerHeight/2).id")=='earth-canvas','Closed panel must not block the canvas'

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
                if mode=='intro':
                    await intro_check(page,name);results.append({'scenario':name,'ok':True});print('EARTH_PASS '+name,flush=True);return
                await expect(page.locator('#earth-intro')).to_be_visible()
                await page.mouse.move(width/2,height/2);await page.locator('#earth-enter').click()
                await expect(page.locator('#earth-intro')).to_be_hidden(timeout=15000)
                await open_panel(page);await page.locator('#earth-about').click();about=page.locator('#earth-about-dialog')
                await expect(about).to_be_visible();text=(await about.inner_text()).lower()
                for phrase in ['three-hour','frame time','not photographic','modified eumetsat','historical']:assert phrase in text,phrase
                await page.keyboard.press('Escape');await expect(about).not_to_be_visible();await close_panels(page)
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
                        await assert_clean(page,name);await hud_panel_checks(page);await hud_click(page,'#earth-motion');await page.wait_for_function(STATE+'.paused')
                        before=(await page.evaluate(STATE))['rotation'];await page.wait_for_timeout(200);assert (await page.evaluate(STATE))['rotation']==before
                        for view in ['daylight','night','live']:
                            await open_panel(page);await page.locator('#earth-about').click()
                            await page.locator('.cosmos-light-studies').evaluate('e=>e.open=true')
                            await page.locator('[data-earth-view='+view+']').click();await close_panels(page);await page.wait_for_function(STATE+'.view==='+json.dumps(view))
                        await panel_click(page,'#earth-reset')
                        await page.locator('#earth-canvas').focus();before=(await page.evaluate(STATE))['cameraYaw'];await page.keyboard.press('ArrowRight');await page.wait_for_function(STATE+'.cameraYaw!=='+str(before))
                        await panel_click(page,'#earth-reset')
                        if width==1440 and mode=='normal' and theme=='dark':
                            await open_panel(page);await page.locator('#earth-quality').select_option('ultra');await close_panels(page);await page.wait_for_function("!document.getElementById('earth-quality').disabled",timeout=90000)
                            await page.wait_for_function(STATE+'.textureWidth>=8192',timeout=90000)
                            await snapshot(page,'earth-8k-desktop')
                            await open_panel(page);await page.locator('#earth-quality').select_option('auto');await close_panels(page);await page.wait_for_function("!document.getElementById('earth-quality').disabled")
                        if width==390 and mode=='normal':
                            # Touch pinch on the unobstructed part of the globe.
                            client=await ctx.new_cdp_session(page)
                            old=(await page.evaluate(STATE))['zoom']
                            points=lambda d:[{'x':195-d,'y':480,'id':1},{'x':195+d,'y':480,'id':2}]
                            await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points(30)})
                            await client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':points(47)})
                            await client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                            await page.wait_for_function(STATE+'.zoom>'+str(old));await panel_click(page,'#earth-reset')
                        await snapshot(page,name+'-earth')
                        await open_panel(page);await page.locator('#earth-explore').click();await expect(page.locator('#earth-search-dialog')).to_be_visible()
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
                            await open_panel(page);await page.locator('#ground-buildings').click();await expect(page.locator('#ground-buildings')).to_have_attribute('aria-pressed','false');await page.locator('#ground-buildings').click()
                            await page.locator('#ground-terrain').click();await expect(page.locator('#ground-terrain')).to_have_attribute('aria-pressed','false');await page.locator('#ground-terrain').click();await close_panels(page)
                            await page.wait_for_timeout(5600)
                            texts=await page.evaluate(VISIBLE_TEXT);assert set(texts)<={'Back to Earth'},('Ground view must show only the return button',texts)
                            if width==1440 and theme=='dark':
                                await open_panel(page);await page.locator('#earth-change-place').click();await page.locator('#earth-place-list button').filter(has=page.locator('span',has_text='The Matterhorn')).click()
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
                            if await page.evaluate("document.querySelector('[data-earth-preview]').dataset.mode")!='earth':await hud_click(page,'#earth-return')
                            await expect(page.locator('#earth-canvas')).to_be_visible()
                            await page.wait_for_function(STATE+'.view==="live"')
                            await open_panel(page);await page.locator('#earth-explore').click();await page.locator('#earth-locate').click()
                            await page.wait_for_function('window.__earthGround?.getState().ready&&window.__earthGround.getState().lat>53&&window.__earthGround.getState().lat<54&&window.__earthGround.getState().zoom>14',timeout=60000)
                            assert await page.evaluate("document.querySelector('[data-earth-preview]').dataset.mode")=='ground','Opening a new place after globe return must stay in the map'
                            print('EARTH_MAP_REOPENED',flush=True)
                            if width==1440:
                                await hud_click(page,'#earth-return')
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
        cases={'desktop':[(1440,900),(1440,900,'normal','light'),(1440,900,'context-loss')],'touch':[(390,844),(390,844,'intro'),(768,1024),(390,700,'short'),(844,390,'short'),(390,844,'reduced','light')],'failures':[(390,844,'no-webgl'),(390,844,'module-fail'),(390,844,'texture-fail'),(390,844,'cloud-fail'),(390,844,'map-fail')]}
        selected=cases.get(group,[item for case in cases.values() for item in case])
        if os.environ.get('EARTH_ONLY'):selected=[selected[int(i)] for i in os.environ['EARTH_ONLY'].split(',')]
        for args in selected:
            await asyncio.wait_for(scenario(*args),timeout=480 if args[0]==1440 else 230)
        (OUT/'results.json').write_text(json.dumps(results,indent=2))
        if group not in ['all','desktop']:
            await browser.close();print('EARTH_COMPLETE '+str(len(results))+' journeys',flush=True);return
        # A real, unmocked cloud and map journey for the review film.
        ctx=await browser.new_context(viewport={'width':1440,'height':900},record_video_dir=str(OUT/'recording'),record_video_size={'width':1440,'height':900},service_workers='block')
        await setup_route(ctx,cloud='real');page=await ctx.new_page();satellite_requests=[];satellite_responses=[]
        page.on('requestfailed',lambda r:satellite_requests.append({'url':r.url,'error':r.failure}) if 'eumetsat' in r.url else None)
        page.on('response',lambda r:satellite_responses.append({'url':r.url,'status':r.status}) if 'view.eumetsat.int/geoserver/ows' in r.url else None)
        page.on('console',lambda m:print('SATELLITE_CONSOLE',m.text,flush=True) if m.type=='error' else None)
        await page.goto(SITE+'/mission-control.html');await page.click('#earth-enter');await page.wait_for_function('window.__earthPreview?.getState().ready',timeout=90000)
        try:await page.wait_for_function('()=>{const s=window.__earthWeather?.getState();return s&&!s.loading&&(s.available||s.reason)}',timeout=130000)
        except Exception:
            print('SATELLITE_FAILED',json.dumps({'state':await page.evaluate('window.__earthWeather?.getState()'),'requests':satellite_requests}),flush=True);raise
        satellite=await page.evaluate('window.__earthWeather.getState()');render=await page.evaluate(STATE)
        if satellite['available']:
            assert render['cloudKind']=='infrared' and render['observedCloud'] and satellite['at']
            print('SATELLITE_VERIFIED',json.dumps(satellite),flush=True);capture='actual-latest-clouds'
        else:
            # Public-service uptime is outside the product boundary. A confirmed
            # transient HTTP failure must exercise the real, honest fallback.
            # Missing/invalid timestamps, bad image data and unknown failures stay fatal.
            status=satellite.get('providerStatus');assert status in [408,429,500,502,503,504],satellite
            assert any(r['status']==status for r in satellite_responses),satellite_responses
            assert satellite['stale'] and satellite['at'] is None and not render['observedCloud'] and render['cloudKind']=='illustrative',satellite
            await expect(page.locator('#earth-weather-label')).to_contain_text('Illustrative')
            print('SATELLITE_PROVIDER_UNAVAILABLE_FALLBACK_VERIFIED',json.dumps(satellite),flush=True);capture='satellite-unavailable-fallback'
        (OUT/'satellite-results.json').write_text(json.dumps({'state':satellite,'responses':satellite_responses,'failed_requests':satellite_requests},indent=2))
        await page.wait_for_timeout(700);await snapshot(page,capture)
        start=asyncio.get_running_loop().time();await page.wait_for_timeout(4000)
        await open_panel(page);await page.locator('#earth-explore').click();await page.wait_for_timeout(500)
        await page.locator('#earth-place-list button').filter(has=page.locator('span',has_text='Manhattan')).click()
        await page.wait_for_function('window.__earthGround?.getState().renderedBuildings>15',timeout=70000);await page.wait_for_timeout(4500)
        await open_panel(page);await page.locator('#earth-change-place').click();await page.locator('#earth-place-list button').filter(has=page.locator('span',has_text='The Matterhorn')).click();await page.wait_for_timeout(4500)
        duration=asyncio.get_running_loop().time()-start
        video=page.video;await ctx.close();source=await video.path()
        ffmpeg=shutil.which('ffmpeg');assert ffmpeg
        process=await asyncio.create_subprocess_exec(ffmpeg,'-hide_banner','-loglevel','error','-y','-sseof','-'+str(round(duration,2)),'-i',str(source),'-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','fast','-crf','23','-movflags','+faststart',str(OUT/'earth-preview.mp4'),stderr=asyncio.subprocess.PIPE)
        _,error=await process.communicate();assert process.returncode==0,error.decode()
        await browser.close();print('EARTH_COMPLETE '+str(len(results))+' journeys',flush=True)
asyncio.run(main())
