"""Actual local WebGL Earth journeys; fixtures block all external requests and writes."""
import asyncio, base64, json, mimetypes, os, pathlib, re, shutil
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
OUT = pathlib.Path('/tmp/earth-preview')
OUT.mkdir(exist_ok=True)
ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl']
STATE = 'window.__earthPreview.getState()'


async def snapshot(page, name):
    data = await page.screenshot(type='jpeg', quality=76, animations='disabled', timeout=20000)
    (OUT / (name + '.jpg')).write_bytes(data)
    print('EARTH_PREVIEW ' + name + ' ' + base64.b64encode(data).decode(), flush=True)


async def main():
    async with async_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome') or shutil.which('chromium')
        browser = await p.chromium.launch(executable_path=executable, args=ARGS)
        results = []

        async def scenario(width, height, mode='normal', theme='dark'):
            name = f'{width}-{theme}-{mode}'
            print('EARTH_START ' + name, flush=True)
            ctx = await browser.new_context(
                viewport={'width': width, 'height': height},
                device_scale_factor=1,
                has_touch=width < 1000, is_mobile=width < 500,
                reduced_motion='reduce' if mode == 'reduced' else 'no-preference',
                color_scheme=theme, service_workers='block')
            ctx.set_default_timeout(15000)
            ctx.set_default_navigation_timeout(20000)
            page = await ctx.new_page()
            errors, shader_errors, requests = [], [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            def console(message):
                if message.type == 'error' and re.search(
                    r'THREE\.WebGLProgram|shader.*(?:error|fail)|GL_INVALID|compileShader|linkProgram', message.text, re.I):
                    shader_errors.append(message.text)
            page.on('console', console)
            if mode == 'no-webgl':
                await ctx.add_init_script("""const original=HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext=function(type,...args){
                    return /webgl/i.test(type)?null:original.call(this,type,...args)};""")
            async def route(r):
                u = urlparse(r.request.url)
                if r.request.method != 'GET' or u.hostname != 'superchargeddaily.com':
                    return await r.abort()
                path = unquote(u.path).lstrip('/') or 'index.html'
                requests.append(path)
                if mode == 'module-fail' and path.endswith('earth-renderer.js'):
                    return await r.fulfill(status=503, body='Renderer unavailable')
                if mode == 'texture-fail' and path.startswith('assets/earth/') and not re.search(r'poster|fallback|license|source', path, re.I):
                    return await r.fulfill(status=503, body='Texture unavailable')
                file = ROOT / path
                if file.is_file() and ROOT in file.resolve().parents:
                    return await r.fulfill(body=file.read_bytes(), content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
                return await r.fulfill(status=404, body='Not found')
            await ctx.route('**/*', route)
            try:
                await page.goto(SITE + '/mission-control.html', wait_until='domcontentloaded')
                stage = page.locator('[data-earth-preview]')
                assert await stage.count() == 1
                assert await page.locator('meta[name="robots"]').get_attribute('content') == 'noindex,follow'
                assert await page.locator('h1').count() == 1
                assert await page.locator('#newsletter,.sd-band,.scroll-beam').count() == 0, 'Shared site promotions leaked into the cinematic preview'
                body = (await page.locator('body').inner_text()).lower()
                assert 'static satellite imagery' in body, 'Static imagery needs a clear disclosure'
                await page.locator('#earth-about').click()
                dialog = page.locator('#earth-about-dialog')
                assert await dialog.is_visible()
                assert 'not live weather' in (await dialog.inner_text()).lower()
                await page.keyboard.press('Escape')
                assert not await dialog.is_visible()
                assert await page.locator('#earth-about').evaluate('e=>e===document.activeElement')
                if mode in ['no-webgl', 'texture-fail', 'module-fail']:
                    await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.state==='fallback'", timeout=120000)
                    assert await page.locator('#earth-fallback').is_visible()
                    assert await page.locator('#earth-retry').is_visible()
                    if mode == 'no-webgl':
                        assert not any(re.search(r'assets/earth/.*(?:day|night|cloud)', q) for q in requests), 'No-WebGL devices should not download full texture layers'
                    await snapshot(page, name)
                else:
                    await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.state==='ready'&&window.__earthPreview&&window.__earthPreview.getState().ready", timeout=120000)
                    state = await page.evaluate(STATE)
                    assert state['frames'] >= 1 and state['textureCount'] >= 3 and state['textureWidth'] >= 2048, state
                    canvas = page.locator('#earth-canvas')
                    assert await canvas.is_visible()
                    assert await canvas.evaluate("e=>!!e.getContext('webgl2')"), 'Ready must mean an actual WebGL2 renderer'
                    assert await canvas.get_attribute('aria-label')
                    if mode == 'reduced':
                        assert state['paused'] and not state['running'], state
                        await page.wait_for_timeout(350)
                        later = await page.evaluate(STATE)
                        assert later['rotation'] == state['rotation'], (state, later)
                        assert later['frames'] <= state['frames'] + 1, (state, later)
                    elif mode == 'context-loss':
                        lost = await canvas.evaluate("e=>{const x=e.getContext('webgl2').getExtension('WEBGL_lose_context');if(!x)return false;x.loseContext();return true}")
                        assert lost, 'SwiftShader must support context loss simulation'
                        await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.state==='fallback'", timeout=20000)
                        assert await page.locator('#earth-fallback').is_visible()
                        await snapshot(page, name)
                    else:
                        before = state['frames']
                        await page.wait_for_function(f'{STATE}.frames>{before}+1')
                        await page.locator('#earth-motion').click()
                        await page.wait_for_function(STATE + '.paused')
                        assert await page.locator('#earth-motion').get_attribute('aria-pressed') in ['true', 'false']
                        paused = await page.evaluate(STATE)
                        await page.wait_for_timeout(350)
                        assert (await page.evaluate(STATE))['rotation'] == paused['rotation']
                        for view in ['daylight', 'night', 'sunrise']:
                            frame = (await page.evaluate(STATE))['frames']
                            button = page.locator(f'[data-earth-view="{view}"]')
                            await button.click()
                            await page.wait_for_function(f'{STATE}.view==={json.dumps(view)}')
                            await page.wait_for_function(f'{STATE}.frames>{frame}')
                            assert await button.get_attribute('aria-pressed') == 'true'
                            if width == 1440 and theme == 'dark' and view != 'sunrise':
                                await snapshot(page, '1440-' + view)
                        initial_zoom = (await page.evaluate(STATE))['zoom']
                        if await page.locator('[data-earth-zoom="in"]').is_visible():
                            await page.locator('[data-earth-zoom="in"]').click()
                            await page.wait_for_function(f'{STATE}.zoom>{initial_zoom}')
                            await page.locator('[data-earth-zoom="out"]').click()
                            await page.wait_for_function(f'Math.abs({STATE}.zoom-{initial_zoom})<0.000001')
                        else:
                            # Small screens intentionally use pinch instead of extra toolbar buttons.
                            box = await canvas.bounding_box()
                            x, y = box['x'] + box['width'] * .5, box['y'] + box['height'] * .45
                            client = await ctx.new_cdp_session(page)
                            def points(distance):
                                return [{'x': x-distance, 'y': y, 'id': 1}, {'x': x+distance, 'y': y, 'id': 2}]
                            await client.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': points(35)})
                            await client.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': points(50)})
                            await client.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                            await page.wait_for_function(f'{STATE}.zoom>{initial_zoom}')
                            await page.locator('#earth-reset').click()
                            await page.wait_for_function(f'Math.abs({STATE}.zoom-{initial_zoom})<0.000001')
                        before = await page.evaluate(STATE)
                        box = await canvas.bounding_box()
                        x, y = box['x'] + box['width'] * .5, box['y'] + box['height'] * .45
                        if width < 1000:
                            client = await ctx.new_cdp_session(page)
                            await client.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
                            await client.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + 55, 'y': y + 12}]})
                            await client.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                        else:
                            await page.mouse.move(x, y)
                            await page.mouse.down()
                            await page.mouse.move(x + 70, y + 12, steps=8)
                            await page.mouse.up()
                        await page.wait_for_function(f'{STATE}.cameraYaw!=={before["cameraYaw"]}||{STATE}.cameraPitch!=={before["cameraPitch"]}')
                        if width == 1440 and theme == 'dark':
                            await canvas.focus()
                            start = await page.evaluate(STATE)
                            await page.keyboard.press('ArrowLeft')
                            await page.wait_for_function(f'{STATE}.cameraYaw!=={start["cameraYaw"]}')
                            await page.mouse.move(x, y)
                            await page.mouse.wheel(0, -160)
                            await page.wait_for_function(f'{STATE}.zoom!=={start["zoom"]}')
                            await page.locator('#earth-reset').click()
                            await page.wait_for_function(f'{STATE}.zoom==={start["zoom"]}')
                            await page.locator('#earth-quality').select_option('ultra')
                            await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.quality==='ultra'&&window.__earthPreview.getState().ready&&window.__earthPreview.getState().textureWidth>=4096", timeout=120000)
                            await snapshot(page, '1440-dark-ultra')
                            await page.locator('#earth-quality').select_option('auto')
                            await page.wait_for_function("document.querySelector('[data-earth-preview]').dataset.quality==='auto'&&window.__earthPreview.getState().ready", timeout=120000)
                            await page.locator('#earth-fullscreen').click()
                            await page.wait_for_timeout(150)
                            if await page.evaluate('!!document.fullscreenElement'):
                                await page.keyboard.press('Escape')
                                # Headless Chrome may not synthesize the UA full-screen shortcut.
                                if await page.evaluate('!!document.fullscreenElement'):
                                    await page.locator('#earth-fullscreen').click()
                                await page.wait_for_function('!document.fullscreenElement')
                        for selector in ['#earth-motion', '#earth-reset', '#earth-fullscreen', '#earth-quality', '[data-earth-view]', '[data-earth-zoom]']:
                            for control in await page.locator(selector).all():
                                if not await control.is_visible():
                                    continue
                                rect = await control.bounding_box()
                                assert rect['width'] >= 44 and rect['height'] >= 44, (name, selector, rect)
                                assert rect['x'] >= -1 and rect['x'] + rect['width'] <= width + 1, (name, selector, rect)
                                assert rect['y'] >= -1 and rect['y'] + rect['height'] <= height + 1, (name, selector, rect)
                        if width in [390, 768, 844, 1440]:
                            await page.evaluate('document.fonts.ready')
                            await snapshot(page, name)
                        if (await page.evaluate(STATE))['paused']:
                            await page.locator('#earth-motion').click()
                        await page.wait_for_function(STATE + '.running')
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), name
                assert not errors, (name, errors)
                assert not shader_errors, (name, shader_errors)
                results.append({'name': name, 'passed': True})
                print('EARTH_PASS ' + json.dumps(results[-1]), flush=True)
            except Exception as error:
                results.append({'name': name, 'passed': False, 'error': str(error), 'pageErrors': errors, 'shaderErrors': shader_errors})
                print('EARTH_FAIL ' + json.dumps(results[-1]), flush=True)
                await snapshot(page, name + '-failure')
                raise
            finally:
                await ctx.close()

        for args in [(320, 760), (390, 844), (768, 1024), (844, 390), (1440, 900), (1440, 900, 'normal', 'light'),
                     (390, 844, 'reduced'), (390, 844, 'no-webgl'), (1440, 900, 'context-loss'),
                     (390, 844, 'texture-fail'), (390, 844, 'module-fail')]:
            await asyncio.wait_for(scenario(*args), timeout=240)
        (OUT / 'results.json').write_text(json.dumps(results, indent=2))
        # A separate capture contains a clean, running Earth rather than the test interactions.
        # Record only loading plus ten seconds, then retain the final ten-second scene.
        capture = pathlib.Path('/tmp/earth-preview-recording')
        capture.mkdir(exist_ok=True)
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900},
            reduced_motion='no-preference', service_workers='block',
            record_video_dir=str(capture), record_video_size={'width': 1440, 'height': 900})
        async def movie_route(r):
            u = urlparse(r.request.url)
            if r.request.method != 'GET' or u.hostname != 'superchargeddaily.com':
                return await r.abort()
            file = ROOT / unquote(u.path).lstrip('/')
            if file.is_file() and ROOT in file.resolve().parents:
                return await r.fulfill(body=file.read_bytes(), content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
            return await r.fulfill(status=404, body='Not found')
        await ctx.route('**/*', movie_route)
        page = await ctx.new_page()
        movie_errors = []
        page.on('pageerror', lambda e: movie_errors.append(str(e)))
        video = page.video
        await page.goto(SITE + '/mission-control.html', wait_until='domcontentloaded')
        await page.wait_for_function("window.__earthPreview&&window.__earthPreview.getState().running&&window.__earthPreview.getState().textureWidth>=4096", timeout=120000)
        await page.evaluate('document.fonts.ready')
        await page.mouse.move(8, 8)
        first_frame = (await page.evaluate(STATE))['frames']
        await page.wait_for_timeout(10500)
        assert (await page.evaluate(STATE))['frames'] > first_frame + 20
        assert not movie_errors, movie_errors
        await ctx.close()
        movie = await video.path()
        ffmpeg = shutil.which('ffmpeg')
        assert ffmpeg, 'The runner must provide ffmpeg to trim the clean preview film'
        output = OUT / 'earth-preview.mp4'
        process = await asyncio.create_subprocess_exec(ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
            '-sseof', '-10', '-i', str(movie), '-t', '10', '-an', '-vf', 'fps=30',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', str(output), stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        _, error = await process.communicate()
        assert process.returncode == 0, error.decode()
        assert output.stat().st_size > 10000, 'The film must contain actual rendered frames'
        print('EARTH_MOVIE ' + json.dumps({'file': output.name, 'bytes': output.stat().st_size, 'duration': 10}), flush=True)
        await browser.close()


asyncio.run(main())
