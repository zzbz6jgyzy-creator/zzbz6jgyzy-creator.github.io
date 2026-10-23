"""Local tracker regression checks. All external requests are blocked; no live writes."""
import asyncio, json, mimetypes, os, pathlib, re, traceback
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = pathlib.Path(os.environ.get('TRACKER_SITE_ROOT', pathlib.Path(__file__).resolve().parents[1]))
SITE = 'https://superchargeddaily.com'
CONFIG = json.loads((ROOT/'scripts/js-bundles.json').read_text())

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        async def check(page_name, mode, width):
            context = await browser.new_context(viewport={'width': width, 'height': 844}, java_script_enabled=mode!='no-js')
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            async def route(request):
                url = request.request.url
                if not url.startswith(SITE+'/'): return await request.abort()
                rel = urlparse(url).path.lstrip('/')
                if mode=='blocked' and (rel.startswith('data/') or rel=='updates-live.json'): return await request.abort()
                bundle = re.fullmatch(r'assets/js/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js', rel)
                if bundle:
                    files = CONFIG['bundles'][bundle[1]]
                    body = '\n;\n'.join((ROOT/f).read_text() for f in files)
                    return await request.fulfill(content_type='application/javascript', body=body)
                file = ROOT/rel
                if file.is_file() and ROOT in file.resolve().parents:
                    return await request.fulfill(content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream', body=file.read_bytes())
                return await request.abort()
            await page.route('**/*', route)
            try:
                await page.goto(SITE+'/'+page_name+'.html', wait_until='domcontentloaded')
                if page_name=='updates':
                    data = json.loads((ROOT/'updates-live.json').read_text())
                    newest = max((v for v in data['versions'] if v['count']>0), key=lambda v:v.get('firstSeen') or v.get('date') or '')
                    assert await page.locator('#t-new').inner_text()==newest['id']
                    assert await page.locator('#waves-list > .sw-wave').count()>0
                    assert await page.locator('#sw-live').get_attribute('data-snapshot-at')==data['updated']
                    if mode=='blocked':
                        await page.locator('#sw-live [data-refresh-status]').wait_for()
                        assert data['updated'] in await page.locator('#sw-live time').get_attribute('datetime')
                    elif mode=='live':
                        await page.wait_for_function("document.querySelector('#sw-live').dataset.refreshState==='success'")
                        await page.locator('#sw-country').select_option('IE')
                        assert await page.locator('#sw-country').input_value()=='IE'
                        await page.locator('[data-view-link="rollouts"]').click()
                    assert await page.locator('#waves-list').count()==1
                    if mode!='no-js':await page.locator('[data-view-link="rollouts"]').click()
                    await page.locator('#waves-list').screenshot(path=str(ROOT/'dev'/f'tracker-updates-{mode}-{width}.png'))
                else:
                    tx = json.loads((ROOT/'data/robotaxi-tx.json').read_text())
                    geo = json.loads((ROOT/'data/robotaxi-areas.geojson').read_text())
                    await page.locator('[data-rt-cities]').scroll_into_view_if_needed()
                    if mode=='blocked':
                        await page.locator('[data-rt-cities] [data-refresh-status]').wait_for()
                        await page.locator('[data-cc-count] [data-refresh-status]').wait_for()
                        await page.locator('[data-cc-changes] [data-refresh-status]').wait_for()
                    elif mode=='live':
                        button=page.locator('[data-rt-filter]').first
                        await button.wait_for()
                        before=await button.get_attribute('aria-pressed')
                        await button.click()
                        assert await button.get_attribute('aria-pressed')!=before
                        assert await page.locator('[data-rt-map]').count()==1
                    assert await page.locator('[data-cc-count] .cc-count-card').count()==2
                    assert await page.locator('[data-cc-count] .is-cybercab .cc-count-total strong').inner_text()==format(tx['history'][-1]['cybercab'], ',')
                    assert await page.locator('[data-rt-cities] table').count()==1
                    assert await page.locator('[data-rt-city]').count()==len(geo['features'])
                    assert await page.locator('[data-rt-cities] a[href]').count()>0
                    await page.locator('[data-cc-count]').screenshot(path=str(ROOT/'dev'/f'tracker-cybercab-{mode}-{width}.png'))
                assert not errors, errors
                assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'), 'Page overflows viewport'
                print(json.dumps({'page':page_name,'mode':mode,'width':width,'passed':True}), flush=True)
            except Exception:
                print(traceback.format_exc(), flush=True)
                raise
            finally:
                await context.close()
        (ROOT/'dev').mkdir(exist_ok=True)
        await asyncio.gather(*(check(name, mode, width) for name in ['updates','cybercab'] for mode,width in [('no-js',390),('blocked',390),('live',390),('live',1440)]))
        await browser.close()

asyncio.run(main())
