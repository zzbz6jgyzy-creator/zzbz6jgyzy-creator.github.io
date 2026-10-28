"""FSD tracker: responsive layout, no-JS and blocked-JS fallbacks, tooltips and table view (no network)."""
import asyncio, mimetypes, os, shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
OUT = Path('/tmp/fsd-tracker')
OUT.mkdir(exist_ok=True)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome') or shutil.which('chromium'),
            args=['--no-sandbox', '--disable-dev-shm-usage'])
        cases = [(320, 'dark', 'normal'), (390, 'dark', 'normal'), (768, 'dark', 'normal'), (1440, 'dark', 'normal'),
                 (390, 'light', 'normal'), (1440, 'light', 'normal'), (390, 'dark', 'nojs'), (390, 'dark', 'blocked-js')]
        for width, theme, mode in cases:
            ctx = await browser.new_context(viewport={'width': width, 'height': 1000}, java_script_enabled=mode != 'nojs',
                                            reduced_motion='reduce', service_workers='block')
            await ctx.add_init_script(f"try{{localStorage.setItem('sd-theme','{theme}')}}catch(e){{}}")
            page = await ctx.new_page()
            errors, hosts = [], set()
            page.on('pageerror', lambda e: errors.append(str(e)))

            async def route(r):
                u = urlparse(r.request.url)
                hosts.add(u.hostname)
                if u.hostname != 'superchargeddaily.com':
                    return await r.abort()
                if mode == 'blocked-js' and 'fsd-tracker.bundle.' in u.path:
                    return await r.abort()
                f = ROOT / u.path.lstrip('/')
                if f.is_file() and ROOT in f.resolve().parents:
                    return await r.fulfill(body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
                return await r.abort()

            await ctx.route('**/*', route)
            await page.goto(SITE + '/fsd-tracker.html', wait_until='domcontentloaded')
            await page.wait_for_timeout(400)
            tag = f'{width}-{theme}-{mode}'
            assert await page.locator('h1').count() == 1, tag
            assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), (tag, 'overflow')
            assert await page.locator('.ft-kpi').count() == 5, tag
            assert await page.locator('#miles svg').count() == 2 and await page.locator('#software .ft-chart').count() == 2, tag
            assert await page.locator('.ft-heat tbody tr').count() == 6, tag
            assert await page.locator('#atlas svg.ft-map').count() == 2 and await page.locator('.ft-tiles li').count() == 27 and await page.locator('.ft-rec li').count() == 10, tag
            assert await page.locator('.ft-meter').count() == 2, tag
            assert await page.locator('.ft-rel li').count() == 8, tag
            assert await page.locator('.ft-bar').count() == 7, tag
            assert await page.locator('#adoption .ft-table tbody tr').count() == 7, tag
            assert not errors, (tag, errors)
            # The table view is a native <details>, so it works with no script.
            await page.locator('#adoption .ft-table-view summary').click()
            assert await page.locator('#adoption .ft-table').is_visible(), tag
            if width <= 700:
                assert not await page.locator('#adoption .ft-desk').is_visible(), tag
                assert await page.locator('#adoption .ft-hbars li').count() == 7, tag
                assert await page.locator('#adoption .ft-hbars').is_visible(), tag
            else:
                assert await page.locator('#adoption .ft-desk').is_visible() and not await page.locator('#adoption .ft-phone').is_visible(), tag
            if mode in ('normal',) and width > 700:
                await page.locator('.ft-bar').nth(6).focus()
                tip = page.locator('.ft-tip')
                assert await tip.is_visible(), tag
                assert '1.74 million' in await tip.inner_text(), tag
                await page.keyboard.press('Escape')
                assert not await tip.is_visible(), tag
            visible_svgs = [await el.is_visible() for el in await page.locator('#miles .ft-chart, #software .ft-chart').all()]
            assert visible_svgs.count(True) == 2, (tag, 'one miles and one software chart visible per width')
            step = page.locator('#europe .ft-desk svg')
            assert (await step.is_visible()) == (width > 700), (tag, 'step chart only on wide screens; the dated list is always there')
            for el in await page.locator('.ft a.ft-cite, .ft summary, .ft-jump a').all():
                box = await el.bounding_box()
                if box:
                    assert box['height'] >= 24, (tag, 'target size')
            if width in (390, 1440) and mode == 'normal':
                await page.screenshot(path=str(OUT / f'{tag}.png'), full_page=True)
            await ctx.close()
        await browser.close()
    print('FSD tracker browser checks passed.')


asyncio.run(main())
