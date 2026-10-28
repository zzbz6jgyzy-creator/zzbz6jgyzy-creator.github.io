"""Exercise persistent navigation with local pages and production scripts.

External requests and all network writes are blocked. Requires Python Playwright
and Chromium. Screenshots are written to dev/ for visual review.
"""
import asyncio
import base64
import json
import mimetypes
import os
import pathlib
import re
import traceback
from urllib.parse import urlparse

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
CFG = json.loads((ROOT / 'scripts/js-bundles.json').read_text())
SHORTCUTS = {
    'Original stories': '/dispatch.html',
    'Software updates': '/updates.html',
    'Cybercab': '/cybercab.html',
    'Starship': '/starship.html',
}
FOCUSABLE = '''(sheet) => [...sheet.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'
)].filter(el => !el.closest('[hidden], [inert]') && el.getClientRects().length)'''


async def ready(page):
    await page.wait_for_function('window.__pn && window.__sdFind && window.__sdTheme')


async def assert_header(page, width):
    """The same labeled actions stay reachable at the top and down the page."""
    nav = page.locator('.pn')
    assert not await nav.evaluate('(el) => el.classList.contains("collapsed")')
    box = await nav.bounding_box()
    assert box and 44 <= box['height'] <= 64, box
    assert box['x'] >= 0 and box['x'] + box['width'] <= width + 1, box
    assert 0 <= box['y'] <= 28, box
    for cls, label, href in [('pn-search', 'Search', '/search.html'),
                             ('pn-daily', 'Your Daily', '/daily.html')]:
        link = nav.locator('a.' + cls)
        assert await link.count() == 1, (cls, 'duplicate header utility')
        assert await link.get_attribute('href') == href
        assert await link.is_visible()
        assert await link.locator('span').inner_text() == label
        text_box = await link.locator('span').bounding_box()
        assert text_box and text_box['width'] > 20 and text_box['height'] > 8, (label, text_box)
        target = await link.bounding_box()
        assert target and target['width'] >= 44 and target['height'] >= 44, (label, target)
        assert target['x'] >= box['x'] and target['x'] + target['width'] <= box['x'] + box['width'] + 1, target
    assert await nav.locator('a.pn-sub').count() == 1
    if width < 900:
        menu = nav.locator('.pn-menu')
        assert await menu.is_visible()
        assert await menu.locator('span').inner_text() == 'Menu'
        target = await menu.bounding_box()
        assert target and target['width'] >= 44 and target['height'] >= 44, target
        assert not await nav.locator('.pn-items').is_visible()
    else:
        assert await nav.locator('.pn-word').is_visible()
        assert await nav.locator('.pn-dd > button').count() == 4
    return box


async def assert_sheet_keyboard(page):
    sheet = page.locator('.pn-sheet')
    assert await page.locator('.pn-close').evaluate('(el) => el === document.activeElement')
    assert await sheet.evaluate('(el) => !el.inert')
    await sheet.evaluate(f'(sheet) => ({FOCUSABLE})(sheet).at(-1).focus()')
    await page.keyboard.press('Tab')
    assert await sheet.evaluate(f'(sheet) => ({FOCUSABLE})(sheet)[0] === document.activeElement'), 'Tab escaped the menu'
    await page.keyboard.press('Shift+Tab')
    assert await sheet.evaluate(f'(sheet) => ({FOCUSABLE})(sheet).at(-1) === document.activeElement'), 'Shift+Tab escaped the menu'
    await page.keyboard.press('Escape')
    assert not await sheet.evaluate('(el) => el.classList.contains("open")')
    assert await sheet.get_attribute('aria-hidden') == 'true'
    assert await sheet.evaluate('(el) => el.inert')
    assert await page.locator('.pn-menu').get_attribute('aria-expanded') == 'false'
    assert await page.locator('.pn-menu').evaluate('(el) => el === document.activeElement')


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            args=['--no-sandbox', '--disable-dev-shm-usage'])

        async def scenario(width, theme='dark', scripts=True):
            context = await browser.new_context(
                viewport={'width': width, 'height': 844}, is_mobile=width < 500,
                java_script_enabled=scripts, reduced_motion='reduce')
            await context.add_init_script('localStorage.setItem("sd-theme",' + json.dumps(theme) + ')')
            context.set_default_timeout(12000)
            context.set_default_navigation_timeout(15000)
            print('NAV_START', width, theme, scripts, flush=True)
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            async def route(r):
                if r.request.method != 'GET' or not r.request.url.startswith(SITE + '/'):
                    return await r.abort()
                rel = urlparse(r.request.url).path.lstrip('/') or 'index.html'
                bundle = re.fullmatch(r'assets/js/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js', rel)
                if bundle:
                    return await r.fulfill(content_type='application/javascript', body='\n;\n'.join(
                        (ROOT / f).read_text() for f in CFG['bundles'][bundle[1]]))
                f = ROOT / rel
                if f.is_file() and ROOT in f.resolve().parents:
                    return await r.fulfill(content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream', body=f.read_bytes())
                await r.abort()

            await page.route('**/*', route)
            try:
                await page.goto(SITE + '/', wait_until='domcontentloaded')
                if scripts:
                    await ready(page)
                await page.evaluate('document.documentElement.dataset.theme=' + json.dumps(theme))
                print('NAV_READY', width, theme, scripts, flush=True)
                top = await assert_header(page, width)
                await page.screenshot(animations='disabled', timeout=12000, path=str(ROOT / 'dev' / f'nav-header-{width}-{theme}{"-nojs" if not scripts else ""}.png'))
                await page.evaluate('window.scrollTo(0, 700)')
                await page.wait_for_function('window.scrollY >= 600')
                # Old collapse behavior was scheduled on a scroll animation frame.
                if scripts:
                    await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                scrolled = await assert_header(page, width)
                for key in ['x', 'y', 'width', 'height']:
                    assert abs(top[key] - scrolled[key]) <= 1, ('header moved after scroll', key, top, scrolled)
                await page.screenshot(path=str(ROOT / 'dev' / f'nav-scrolled-{width}-{theme}{"-nojs" if not scripts else ""}.png'))

                if not scripts:
                    # The destinations are useful static anchors before scripts load.
                    assert await page.locator('.pn-shortcuts a').count() == 4
                    for name, path in SHORTCUTS.items():
                        assert await page.locator('.pn-shortcuts a[href="' + path + '"]').inner_text() == name
                    await page.locator('.pn a.pn-daily').click()
                    await page.wait_for_url(SITE + '/daily.html')
                    await page.locator('.pn a.pn-search').click()
                    await page.wait_for_url(SITE + '/search.html')
                else:
                    await page.locator('.pn a.pn-search').click()
                    await page.locator('.sd-find-root').wait_for(state='visible')
                    assert await page.locator('#sd-find-q').evaluate('(el) => el === document.activeElement')
                    await page.keyboard.press('Escape')
                    await page.locator('.sd-find-root').wait_for(state='hidden')
                    await page.locator('.pn a.pn-daily').click()
                    await page.wait_for_url(SITE + '/daily.html')
                    await ready(page)
                    assert await page.locator('.pn a.pn-daily').get_attribute('aria-current') == 'page'
                    await page.goto(SITE + '/', wait_until='domcontentloaded')
                    await ready(page)

                    if width < 900:
                        await page.locator('.pn-menu').click()
                        await page.locator('.pn-sheet.open').wait_for()
                        await assert_sheet_keyboard(page)
                        await page.locator('.pn-menu').click()
                        assert await page.locator('.pn-grp-t[aria-expanded=true]').count() == 0
                        for cls in ['pn-search-sheet', 'pn-daily-sheet', 'pn-sub-sheet']:
                            assert await page.locator('.pn-sheet .' + cls).count() == 1, (cls, 'duplicate sheet utility')
                        for name in SHORTCUTS:
                            link = page.locator('.pn-shortcuts').get_by_role('link', name=name, exact=True)
                            assert await link.is_visible()
                            box = await link.bounding_box()
                            assert box['height'] >= 44 and box['y'] + box['height'] <= 844, box
                        await page.locator('.pn-sheet').screenshot(animations='disabled', timeout=12000, path=str(ROOT / 'dev' / f'nav-mobile-{width}-{theme}.png'))
                        if width == 390 and theme == 'dark':
                            shot = await page.locator('.pn-sheet').screenshot(animations='disabled', timeout=12000, type='jpeg', quality=65)
                            print('NAV_PREVIEW ' + base64.b64encode(shot).decode(), flush=True)
                        # Four navigation journeys without opening a menu category.
                        for name, path in SHORTCUTS.items():
                            await page.locator('.pn-shortcuts').get_by_role('link', name=name, exact=True).click()
                            await page.wait_for_url(SITE + path)
                            await ready(page)
                            await page.locator('.pn-menu').click()
                            await page.locator('.pn-sheet.open').wait_for()
                            assert await page.locator('.pn-shortcuts').get_by_role('link', name=name, exact=True).get_attribute('aria-current') == 'page'
                        await page.locator('.pn-sheet h3 button').filter(has_text='News').click()
                        assert await page.locator('.pn-grp').get_by_role('link', name='Newsroom', exact=True).is_visible()
                        assert await page.locator('.pn-grp').get_by_role('link', name='Original stories · Dispatch', exact=True).is_visible()
                        await page.locator('.pn-search-sheet').click()
                        await page.locator('.sd-find-root').wait_for(state='visible')
                        assert await page.locator('.pn-sheet').get_attribute('aria-hidden') == 'true'
                        await page.keyboard.press('Escape')
                    else:
                        await page.locator('.pn-dd > button').filter(has_text='Tesla').hover()
                        group = page.get_by_role('button', name='Software & autonomy', exact=True)
                        await group.hover()
                        panel = page.locator('#pn-tesla-software-autonomy')
                        await panel.wait_for(state='visible', timeout=2000)
                        for path in ['/updates.html', '/fsd-europe.html', '/cybercab.html']:
                            assert await panel.locator('a[href="' + path + '"]').is_visible()
                        await page.screenshot(path=str(ROOT / 'dev' / f'nav-desktop-{width}-{theme}.png'))
                        await panel.get_by_role('link', name='Software Update Tracker', exact=False).click()
                        await page.wait_for_url(SITE + '/updates.html')
                        await ready(page)
                        await page.locator('.pn-dd > button').filter(has_text='News').hover()
                        assert await page.locator('#pn-news').get_by_role('link', name='Newsroom', exact=False).is_visible()
                        assert await page.locator('#pn-news').get_by_role('link', name='Original stories · Dispatch', exact=False).is_visible()
                        assert await page.locator('.pn-sheet').get_attribute('aria-hidden') == 'true'
                        assert await page.locator('.pn-sheet').evaluate('(el) => el.getBoundingClientRect().left >= innerWidth')
                assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'), 'Viewport overflows'
                assert not errors, errors
                print(json.dumps({'width': width, 'theme': theme, 'scripts': scripts, 'passed': True}), flush=True)
            except Exception:
                print(traceback.format_exc(), flush=True)
                raise
            finally:
                await context.close()

        (ROOT / 'dev').mkdir(exist_ok=True)
        for args in [(320, 'dark'), (375, 'dark'), (390, 'dark'), (390, 'light'),
                     (768, 'dark'), (768, 'light'), (900, 'dark'),
                     (1440, 'dark'), (1440, 'light'), (390, 'dark', False),
                     (1440, 'dark', False)]:
            await asyncio.wait_for(scenario(*args), timeout=90)
        await browser.close()


asyncio.run(main())
