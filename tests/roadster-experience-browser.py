"""Roadster experience preview: responsive layout, no-JS, reduced motion, Save-Data, motion toggle, film, replay and rail (no network)."""
import asyncio, mimetypes, os, shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
OUT = Path('/tmp/roadster-experience')
OUT.mkdir(exist_ok=True)
CASES = [(320, 'dark', 'normal'), (390, 'dark', 'normal'), (768, 'dark', 'normal'), (1440, 'dark', 'normal'),
         (390, 'light', 'normal'), (1440, 'light', 'normal'), (390, 'dark', 'nojs'), (390, 'dark', 'reduced'),
         (390, 'dark', 'savedata'), (1440, 'dark', 'blocked-video')]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome') or shutil.which('chromium'),
            args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width, theme, mode in CASES:
            ctx = await browser.new_context(viewport={'width': width, 'height': 900}, java_script_enabled=mode != 'nojs',
                                            reduced_motion='reduce' if mode == 'reduced' else 'no-preference', service_workers='block',
                                            accept_downloads=True)
            await ctx.add_init_script(f"try{{localStorage.setItem('sd-theme','{theme}')}}catch(e){{}}")
            if mode == 'savedata':
                await ctx.add_init_script("Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true})")
            page = await ctx.new_page()
            errors, external, requested = [], set(), []
            page.on('request', lambda r: requested.append(urlparse(r.url).path))
            page.on('pageerror', lambda e: errors.append(str(e)))

            async def route(r):
                u = urlparse(r.request.url)
                if u.hostname != 'superchargeddaily.com':
                    external.add(u.hostname)
                    return await r.abort()
                if mode == 'blocked-video' and u.path.endswith(('.mp4', '.webm')):
                    return await r.abort()
                f = ROOT / u.path.lstrip('/')
                if f.is_file() and ROOT in f.resolve().parents:
                    body = f.read_bytes()
                    mime = mimetypes.guess_type(str(f))[0] or 'application/octet-stream'
                    rng = r.request.headers.get('range')
                    if rng and rng.startswith('bytes='):
                        a, b = rng[6:].split('-', 1)
                        a = int(a or 0)
                        b = min(int(b) if b else len(body) - 1, len(body) - 1)
                        return await r.fulfill(status=206, body=body[a:b + 1], content_type=mime,
                                               headers={'Content-Range': f'bytes {a}-{b}/{len(body)}', 'Accept-Ranges': 'bytes'})
                    return await r.fulfill(body=body, content_type=mime, headers={'Accept-Ranges': 'bytes'})
                return await r.abort()

            await ctx.route('**/*', route)
            await page.goto(SITE + '/roadster-preview.html', wait_until='domcontentloaded')
            await page.wait_for_timeout(500)
            tag = f'{width}-{theme}-{mode}'
            js = mode != 'nojs'
            assert await page.locator('h1').count() == 1, tag
            assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), (tag, 'overflow')
            assert await page.locator('.rx-fact').count() == 4 and await page.locator('.rx-step[data-rx-step]').count() == 5, tag
            assert await page.locator('.rx-faq details').count() == 10 and await page.locator('.rx-card').count() == 3, tag
            # The wordmark must fit inside the viewport at every width (it is the widest thing on the page).
            box = await page.locator('.rx-hero h1').bounding_box()
            assert box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (tag, 'wordmark clipped', box)
            assert not await page.evaluate("[...document.querySelectorAll('.rx [id]')].some(e=>e.id==='')"), tag

            # Motion: on only when the reader allows it. Reduced motion, Save-Data and no-JS never play the hero loop.
            hero_video = page.locator('.rx-hero video')
            await page.wait_for_timeout(600)
            playing = await page.evaluate("(()=>{const v=document.querySelector('.rx-hero video');return !!v&&!v.paused&&v.readyState>1})()") if js else False
            if mode in ('reduced', 'savedata', 'nojs', 'blocked-video'):
                assert not playing, (tag, 'no motion in this mode')
            if mode == 'normal' and width >= 1440 and theme == 'dark':
                assert playing, (tag, 'hero loop plays when motion is allowed')
            if js:
                assert (await page.locator('.rx').get_attribute('data-motion')) == ('off' if mode in ('reduced', 'savedata') else 'on'), tag
                assert await page.locator('#rx-motion').is_visible(), tag

            # Pause motion: pauses the loop, flips the control and survives a reload.
            if mode == 'normal' and width == 1440 and theme == 'dark':
                await page.locator('#rx-motion').click()
                assert await page.locator('#rx-motion').get_attribute('aria-pressed') == 'true', tag
                assert not await page.evaluate("!document.querySelector('.rx-hero video').paused"), (tag, 'paused')
                await page.reload(wait_until='domcontentloaded')
                await page.wait_for_timeout(500)
                assert (await page.locator('.rx').get_attribute('data-motion')) == 'off', (tag, 'choice is remembered')
                await page.locator('#rx-motion').click()
                assert (await page.locator('.rx').get_attribute('data-motion')) == 'on', tag
                await page.evaluate("localStorage.removeItem('sd-rx-motion')")

            # Stage loops: only the active layer's loop plays, phones get the 720 px file, and no loop plays when motion is off.
            if js and mode in ('normal', 'reduced', 'savedata') and theme == 'dark' and width in (390, 1440):
                await page.evaluate("document.querySelector('[data-rx-step=hop]').scrollIntoView({block:'center',behavior:'instant'})")
                await page.wait_for_timeout(2500)
                state = await page.evaluate("[...document.querySelectorAll('[data-rx-layer]')].map(l=>{const v=l.querySelector('video');return {id:l.dataset.rxLayer,active:l.classList.contains('is-active'),playing:!!v&&!v.paused,src:v?v.currentSrc:''}})")
                if mode == 'normal':
                    assert [s['id'] for s in state if s['playing']] == ['hop'], (tag, 'only the active layer plays', state)
                    hop = [s for s in state if s['id'] == 'hop'][0]
                    assert ('-720.' if width <= 700 else '-1280.') in hop['src'], (tag, 'right size for the screen', hop)
                else:
                    assert not any(s['playing'] for s in state), (tag, 'no stage loop in this mode', state)
                    assert not any('/assets/roadster-clips/' in u and u.endswith(('.webm', '.mp4')) for u in requested), (tag, 'no loop is downloaded when motion is off', [u for u in requested if 'roadster-clips' in u])

            # The pinned stage: the picture follows the step in the middle of the screen.
            if js:
                await page.locator('[data-rx-step=run]').scroll_into_view_if_needed()
                await page.evaluate("document.querySelector('[data-rx-step=run]').scrollIntoView({block:'center',behavior:'instant'})")
                await page.wait_for_timeout(700)
                assert await page.locator('[data-rx-layer=run].is-active').count() == 1, (tag, 'stage layer follows the step')
                assert await page.locator('.rx-layer.is-active').count() == 1, tag
            else:
                assert await page.locator('.rx-layer.is-active').count() == 1, (tag, 'first picture shows without script')
                assert await page.locator('.rx-tech-panel:visible').count() == 6, (tag, 'every engineering panel reads without script')
                assert await page.locator('.rx-filters:visible,.rx-system-buttons:visible,.rx-hotspots:visible,[data-rx-compare]:visible').count() == 0, (tag, 'script-only controls are hidden without script')

            # Part 3 chapters: collections, the full-screen viewer, hotspots, systems, physics, comparison, units.
            if js and mode == 'normal' and theme == 'dark' and width in (390, 1440):
                await page.evaluate("document.querySelector('#gallery').scrollIntoView({behavior:'instant'})")
                await page.locator('[data-rx-filter=interior]').click()
                assert await page.locator('.rx-shot:not([hidden])').count() == 2, (tag, 'interior collection')
                assert '2 pictures in Interior' in (await page.locator('#rx-gallery-count').text_content()), tag
                await page.locator('[data-rx-filter=all]').click()
                await page.locator('.rx-shot a').first.click()
                assert await page.locator('#rx-photo-dialog').evaluate('d=>d.open'), (tag, 'viewer opens')
                await page.keyboard.press('ArrowRight')
                assert '2 / 15' in (await page.locator('#rx-photo-caption').text_content()), tag
                await page.keyboard.press('Escape')
                assert not await page.locator('#rx-photo-dialog').evaluate('d=>d.open'), tag
                await page.evaluate("document.querySelector('#cockpit').scrollIntoView({behavior:'instant'})")
                await page.locator('[data-rx-hotspot="1"]').click()
                assert await page.locator('[data-rx-cockpit="1"].is-selected').count() == 1, (tag, 'hotspot selects its card')
                await page.evaluate("document.querySelector('#tech').scrollIntoView({behavior:'instant'})")
                await page.locator('[data-rx-system=thrust]').click()
                assert await page.locator('[data-rx-tech-panel=thrust]').is_visible() and not await page.locator('[data-rx-tech-panel=suction]').is_visible(), tag
                assert (await page.locator('.rx-engineering').get_attribute('data-rx-diagram')) == 'thrust', tag
                await page.evaluate("document.querySelector('#performance').scrollIntoView({behavior:'instant'})")
                await page.locator('[data-rx-physics="0.59"]').click()
                assert (await page.locator('#rx-g-value').text_content()).startswith('> 4.6'), (tag, await page.locator('#rx-g-value').text_content())
                await page.evaluate("document.querySelector('#trims').scrollIntoView({behavior:'instant'})")
                await page.locator('[data-rx-compare=thrust]').click()
                await page.locator('[data-rx-compare=rocket]').click()
                assert await page.locator('#rx-compare th[scope=col]').count() == 3, (tag, 'comparison has two trims')
                await page.locator('[data-rx-unit=metric]').click()
                assert '483 km' in await page.locator('[data-rx-distance]').text_content(), tag

            # Chapter rail: wide screens only, one current chapter.
            if js and width >= 1100:
                await page.evaluate("document.querySelector('#faq').scrollIntoView({behavior:'instant'})")
                await page.wait_for_timeout(500)
                assert await page.locator('.rx-rail').is_visible(), tag
                assert (await page.locator('[data-rx-rail][aria-current=true]').get_attribute('data-rx-rail')) == 'faq', (tag, 'rail follows the chapter')
            else:
                assert not await page.locator('.rx-rail').is_visible(), tag

            # The film loads only on press; with the blocked file it reports failure and can be retried.
            if js and mode in ('normal', 'blocked-video') and theme == 'dark':
                await page.evaluate("document.querySelector('#rx-film-cover').scrollIntoView({block:'center',behavior:'instant'})")
                assert await page.evaluate("!document.querySelector('#rx-film').getAttribute('src')"), (tag, 'film not requested before press')
                assert not any(u.endswith('.mp4') and 'roadster-film' in u for u in requested), (tag, 'film not requested before press')
                await page.locator('#rx-film-cover').click()
                await page.wait_for_timeout(900)
                if mode == 'blocked-video':
                    assert await page.locator('#rx-film-cover').is_visible(), (tag, 'cover returns when the film fails')
                    assert 'could not be loaded' in await page.locator('#rx-film-status').inner_text(), tag
                else:
                    # Headless Chromium builds without H.264 cannot decode the film, so assert the request, not playback.
                    assert any(u.startswith('/assets/roadster-studio/roadster-film-') and u.endswith('.mp4') for u in requested), (tag, 'film requested after press')

            # Tesla's replay: nothing from YouTube until play is pressed, then a no-cookie iframe.
            if js and mode == 'normal' and width == 390 and theme == 'dark':
                assert not any(h and 'youtube' in h for h in external), (tag, 'no YouTube request before press')
                await page.evaluate("document.querySelector('#rx-replay').scrollIntoView({block:'center',behavior:'instant'})")
                await page.locator('[data-rx-replay]').click()
                src = await page.locator('#rx-replay iframe').get_attribute('src')
                assert src.startswith('https://www.youtube-nocookie.com/embed/qt5p-_tE8d0'), (tag, src)

            # No script: everything is still readable, the cover and controls that need script are hidden, a direct film link exists.
            if not js:
                assert await page.locator('.rx-film-frame').is_hidden() and await page.locator('a[href*="roadster-film-720.mp4"]').count() >= 1, tag
                assert not await page.locator('#rx-motion').is_visible(), tag

            # FAQ works natively.
            first = page.locator('.rx-faq details').first
            await first.locator('summary').click()
            assert await first.evaluate('d=>d.open'), tag
            for el in await page.locator('.rx a.rx-cite, .rx summary, .rx-btn').all():
                bb = await el.bounding_box()
                if bb and bb['height'] > 0:
                    assert bb['height'] >= 24, (tag, 'target size', await el.evaluate('e=>e.outerHTML.slice(0,160)'), bb)
            if mode == 'normal' and width in (390, 1440):
                await page.screenshot(path=str(OUT / f'{tag}.png'), full_page=False)
            real_errors = [e for e in errors if 'cloudflareinsights' not in e]
            assert not real_errors, (tag, real_errors)
            await ctx.close()
        await browser.close()
    print('Roadster experience browser checks passed.')


asyncio.run(main())
