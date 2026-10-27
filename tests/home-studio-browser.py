"""Homepage discovery, responsive layout and mocked newsletter handoffs.

No request is allowed to reach Beehiiv, analytics or another external service.
HOME_PREVIEW_BASE_ROOT optionally supplies the PR's base checkout for honest
before/after previews; that checkout is captured, never mutated or asserted.
"""
import asyncio, base64, json, mimetypes, os, shutil
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
OUT = Path('/tmp/home-studio')
OUT.mkdir(exist_ok=True)
SCENARIOS = [
    (320, 'dark', 'normal'), (390, 'dark', 'normal'),
    (768, 'dark', 'normal'), (1440, 'dark', 'normal'),
    (390, 'light', 'normal'), (1440, 'light', 'normal'),
    (390, 'dark', 'nojs'), (390, 'dark', 'offline'),
    (390, 'dark', 'large-text'),
]


def route_for(root, mode, requested, signups, analytics):
    async def route(r):
        u = urlparse(r.request.url)
        requested.append(r.request.url)
        if u.hostname == 'alexs-newsletter-84b17e.beehiiv.com':
            signups.append(r.request.url)
            return await r.fulfill(body='<h1>Mock newsletter confirmation</h1>', content_type='text/html')
        if u.hostname == 'sd-events.superchargeddaily.workers.dev':
            analytics.append(r.request.url)
            return await r.fulfill(status=204)
        if u.hostname != 'superchargeddaily.com':
            return await r.abort()
        rel = u.path.lstrip('/') or 'index.html'
        if mode == 'offline' and (rel.endswith('.json') or rel == 'dispatch.html'):
            return await r.abort()
        if rel == 'members-config.json':
            return await r.fulfill(body='{"enabled":false}', content_type='application/json')
        f = root / rel
        if f.is_file() and root in f.resolve().parents:
            return await r.fulfill(body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
        return await r.abort()
    return route


async def settled(page):
    await page.wait_for_timeout(500)
    await page.evaluate('document.fonts.ready')


async def preview(page, name, locator=None):
    jpg = OUT / (name + '.jpg')
    await (locator or page).screenshot(path=str(jpg), type='jpeg', quality=58, animations='disabled')
    print('HOME_HOOK_PREVIEW ' + jpg.name + ' ' + base64.b64encode(jpg.read_bytes()).decode(), flush=True)


async def no_overlap(page, selectors, label):
    boxes = [await page.locator(s).bounding_box() for s in selectors]
    assert all(b and b['height'] > 0 for b in boxes), (label, 'Visible content needs real layout boxes', boxes)
    assert all(boxes[i]['y'] + boxes[i]['height'] <= boxes[i + 1]['y'] + 2 for i in range(len(boxes) - 1)), (label, 'Content overlaps or reading order changed', boxes)


async def focus_is_visible(page):
    await page.wait_for_function('document.activeElement.id === "hs-hero-email"')
    field = await page.locator('#hs-hero-email').bounding_box()
    nav = await page.locator('.pn').bounding_box()
    assert field and field['y'] >= (nav['y'] + nav['height'] if nav else 0) - 1, ('Focused email hidden by navigation', field, nav)
    assert field['y'] + field['height'] <= 844, ('Focused email below viewport', field)


async def capture_before(browser):
    base = os.environ.get('HOME_PREVIEW_BASE_ROOT')
    if not base:
        return
    base = Path(base).resolve()
    assert (base / 'index.html').is_file(), 'Before preview must come from an actual base checkout'
    for width, theme in [(390, 'dark'), (390, 'light'), (1440, 'dark')]:
        context = await browser.new_context(viewport={'width': width, 'height': 844}, reduced_motion='reduce', service_workers='block')
        await context.add_init_script('localStorage.setItem("sd-theme", ' + json.dumps(theme) + ')')
        await context.route('**/*', route_for(base, 'normal', [], [], []))
        page = await context.new_page()
        await page.goto(SITE + '/', wait_until='domcontentloaded')
        await settled(page)
        await preview(page, f'before-{width}-{theme}')
        await context.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome') or shutil.which('chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        await capture_before(browser)
        for width, theme, mode in SCENARIOS:
            context = await browser.new_context(viewport={'width': width, 'height': 844}, java_script_enabled=mode != 'nojs', reduced_motion='reduce', service_workers='block')
            await context.add_init_script('localStorage.setItem("sd-theme", ' + json.dumps(theme) + ')')
            await context.add_init_script("window.__homeCLS=0;window.__homeShifts=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput){window.__homeCLS+=e.value;window.__homeShifts.push({value:e.value,start:e.startTime,sources:e.sources.map(s=>({tag:s.node?.tagName,cls:s.node?.className,from:s.previousRect,to:s.currentRect}))})}})).observe({type:'layout-shift',buffered:true})")
            page = await context.new_page()
            errors, requested, signups, analytics = [], [], [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            await context.route('**/*', route_for(ROOT, mode, requested, signups, analytics))
            await page.goto(SITE + '/', wait_until='domcontentloaded')
            await settled(page)
            assert await page.locator('h1').count() == 1
            assert await page.locator('[data-newsletter-form]').count() == 2, 'One hero form and one lower-page form'
            assert 'Tesla, SpaceX and xAI' in await page.locator('.hv-pitch').inner_text()
            if width <= 600:
                await no_overlap(page, ['.hs-hero h1', '.hv-pitch', '.hv-start', '#newsletter', '.hs-hero-visual', '.hs-wayfinder', '.hs-stories'], (width, mode))
                assert await page.locator('#newsletter input[type=email]').evaluate('(i)=>parseFloat(getComputedStyle(i).fontSize)') >= 16, 'Prevent iOS input zoom'
            email_box = await page.locator('#newsletter input[type=email]').bounding_box()
            assert email_box['width'] >= 130, (width, 'Email field too narrow', email_box)
            button = await page.locator('#newsletter button[type=submit]').bounding_box()
            assert button['y'] >= 0 and button['y'] + button['height'] < 844, (width, 'First-screen signup', button)
            if await page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'):
                await preview(page, f'overflow-{width}-{theme}')
                print('HOME_OVERFLOW',await page.evaluate('''() => [...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className?.baseVal??e.className,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.width&& (e.x < -1 || e.right > innerWidth + 1)).slice(0,30)'''),flush=True)
                raise AssertionError((width,theme,mode,'Horizontal overflow'))
            if mode != 'nojs':
                assert await page.evaluate('window.__homeCLS') < .1, (width, theme, 'Layout shift', await page.evaluate('[window.__homeCLS, window.__homeShifts]'))
            assert not any('.mp4' in u for u in requested), 'Homepage must not download autoplay films'
            assert await page.locator('iframe').count() == 0
            assert await page.locator('.hs-hero-roadster img').evaluate('(i)=>i.complete && i.naturalWidth>0')
            assert await page.locator('.hs-tool').count() == 5
            for link in await page.locator('.hv-start a, .hs-wayfinder a').all():
                box = await link.bounding_box()
                assert box['height'] >= 44 and box['width'] >= 44, (width, 'Navigation target too small', await link.inner_text(), box)
            assert set(await page.locator('.hs-wayfinder a').evaluate_all('(a)=>a.map(x=>x.getAttribute("href"))')) == {'#latest-stories', '#hv-trk-h', '/daily.html'}, 'First-visit routes must be useful without JavaScript'
            await page.screenshot(path=str(OUT / f'home-{width}-{theme}-{mode}.png'))
            if mode == 'normal' and (width, theme) in [(390, 'dark'), (390, 'light'), (768, 'dark'), (1440, 'dark')]:
                await preview(page, f'after-{width}-{theme}')
            if mode == 'normal' and width == 1440 and theme == 'dark':
                await page.get_by_role('link', name='Explore trackers', exact=True).click()
                assert page.url.endswith('#hv-trk-h')
                await page.locator('[data-hs-filter="tesla"]').click()
                assert await page.locator('.hs-tool:not([hidden])').count() == 3
                await page.locator('[data-hs-filter="tesla"]').press('ArrowRight')
                assert await page.locator('.hs-tool:not([hidden])').count() == 1
                assert 'SpaceX' in await page.locator('#hs-filter-status').inner_text()
                await page.locator('[data-hs-filter="all"]').click()
                assert await page.locator('.hs-tool:not([hidden])').count() == 5
                await preview(page, 'after-toolkit-desktop', page.locator('.hs-tools'))
                await preview(page, 'after-newsletter-desktop', page.locator('.hs-newsletter'))
                expanded = page.locator('[data-hv-feed]')
                assert await expanded.locator('li:visible').count() <= 4
                await expanded.locator('..').get_by_role('button', name='Show all headlines', exact=False).click()
                assert await expanded.locator('li:visible').count() > 4
                await page.goto(SITE + '/', wait_until='domcontentloaded')
                await settled(page)
                await page.locator('.pn a.pn-sub').click()
                await focus_is_visible(page)
            if mode == 'normal' and width == 390 and theme == 'dark':
                await page.locator('.pn .pn-menu').click()
                await page.locator('.pn-sheet .pn-sub-sheet').click()
                await focus_is_visible(page)
                assert not await page.locator('body').evaluate('(e)=>e.classList.contains("pn-lock")')
            if mode in ['normal', 'nojs'] and width == 390 and theme == 'dark':
                form = page.locator('#newsletter form')
                await form.locator('input[type=email]').fill('invalid')
                await form.locator('button').click()
                assert not signups, 'Invalid email cannot leave the website'
                await form.locator('input[type=email]').fill('review@example.com')
                await form.locator('button').click()
                await page.wait_for_url('https://alexs-newsletter-84b17e.beehiiv.com/**')
                query = parse_qs(urlparse(signups[-1]).query)
                assert query['email'] == ['review@example.com']
                assert query['utm_source'] == ['website'] and query['utm_content'] == ['website'] and query['utm_medium'] == ['site-band']
                assert all('review%40example.com' not in u and 'review@example.com' not in u for u in analytics), 'Email must never enter analytics'
                await page.goto(SITE + '/', wait_until='domcontentloaded')
                await settled(page)
                await page.locator('#newsletter-bottom input[type=email]').fill('second@example.com')
                await page.locator('#newsletter-bottom button[type=submit]').click()
                await page.wait_for_url('https://alexs-newsletter-84b17e.beehiiv.com/**')
                assert parse_qs(urlparse(signups[-1]).query)['email'] == ['second@example.com']
            if mode == 'nojs':
                assert not await page.locator('.hs-tool-filters').is_visible()
            if mode == 'offline':
                assert (await page.locator('[data-hv-h]').inner_text()).strip(), 'Saved reporting survives unavailable JSON'
            if mode == 'large-text':
                # Simulate text-only enlargement from measured sizes, so nested spans
                # are enlarged once, without exponential relative-font inheritance.
                await page.evaluate('''() => {
                    const nodes=[...document.querySelectorAll('main h1,main h2,main h3,main p,main a,main button,main input,main strong,main small,main span,main b,main li')];
                    const sizes=nodes.map(n=>{const s=getComputedStyle(n);return [n,parseFloat(s.fontSize),parseFloat(s.lineHeight)]});
                    sizes.forEach(([n,f,l])=>{n.style.setProperty('font-size',f*2+'px','important');if(Number.isFinite(l))n.style.setProperty('line-height',l*2+'px','important')});
                }''')
                await page.wait_for_timeout(100)
                assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), '200% text needs a single reading column'
                await no_overlap(page, ['.hs-hero h1', '.hv-pitch', '.hv-start', '#newsletter', '.hs-hero-visual', '.hs-wayfinder', '.hs-stories'], '200% text')
                for selector in ['#hs-hero-email', '#newsletter button[type=submit]', '.hs-wayfinder a:first-child']:
                    box = await page.locator(selector).bounding_box()
                    assert box and box['width'] > 0 and box['x'] >= -1 and box['x'] + box['width'] <= width + 1, ('Enlarged control clipped', selector, box)
                await preview(page, 'after-390-large-text')
            assert not errors, (width, theme, mode, errors)
            print(width, theme, mode, 'passed', flush=True)
            await context.close()
        await browser.close()

asyncio.run(main())
