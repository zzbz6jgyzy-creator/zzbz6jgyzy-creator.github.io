"""Cybercab guide: responsive layout, no-JS and blocked-JS fallbacks, filter, and click-to-load X embed (no network)."""
import asyncio, mimetypes, os, shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
OUT = Path('/tmp/cybercab-guide')
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
                if mode == 'blocked-js' and 'cybercab-guide.bundle.' in u.path:
                    return await r.abort()
                f = ROOT / u.path.lstrip('/')
                if f.is_file() and ROOT in f.resolve().parents:
                    return await r.fulfill(body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
                return await r.abort()

            await ctx.route('**/*', route)
            await page.goto(SITE + '/cybercab-guide.html', wait_until='domcontentloaded')
            await page.wait_for_timeout(400)
            tag = f'{width}-{theme}-{mode}'
            assert await page.locator('h1').count() == 1, tag
            assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), (tag, 'overflow')
            assert await page.locator('.cg-metric').count() == 6, tag
            assert await page.locator('.cg-versions:not(.cg-rivals) tbody tr').count() == 10, tag
            assert await page.locator('.cg-event').count() == 15, tag
            assert await page.locator('.cg-promise').count() == 7, tag
            assert await page.locator('.cg-faq details').count() == 10, tag
            assert await page.locator('.cg-mark').count() == 5, tag
            assert await page.locator('.cg-captable tbody tr').count() == 5, tag
            assert await page.locator('.cg-rivals tbody tr').count() == 4, tag
            # Saved content reads without JS: every event visible, filter bar hidden.
            assert await page.locator('.cg-event:visible').count() == 15, tag
            assert 'platform.twitter.com' not in ' '.join(hosts), tag
            assert not errors, (tag, errors)
            if mode == 'normal':
                bar = page.locator('[data-filters]')
                assert await bar.is_visible(), tag
                await page.locator('[data-filters] [data-type=regulator]').click()
                assert await page.locator('.cg-event:visible').count() == 2, tag
                assert await page.locator('.cg-year:visible').count() == 1, tag
                await page.locator('[data-filters] [data-type=all]').click()
                assert await page.locator('.cg-event:visible').count() == 15, tag
                assert await page.locator('[data-cap-control]').is_visible(), tag
                await page.locator('#cg-weekly').fill('1000')
                assert '52,000 a year' in await page.locator('[data-cap-read]').inner_text(), tag
                assert await page.locator('.x-embed-load').count() == 1, tag
                for btn in await page.locator('.cg button, .cg summary, .cg-jump a').all():
                    box = await btn.bounding_box()
                    if box:
                        assert box['height'] >= 24, (tag, 'target size')
            else:
                assert not await page.locator('[data-filters]').is_visible(), tag
                assert not await page.locator('[data-cap-control]').is_visible(), tag
            if width in (390, 1440) and mode == 'normal':
                await page.screenshot(path=str(OUT / f'{tag}.png'), full_page=True)
            await ctx.close()
        await browser.close()
    print('Cybercab guide browser checks passed.')


asyncio.run(main())
