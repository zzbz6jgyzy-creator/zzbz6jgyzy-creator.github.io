"""Responsive previews and focused journeys; all external services are blocked."""
import asyncio,json,mimetypes,os,pathlib,shutil
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=pathlib.Path('/tmp/page-studios');OUT.mkdir(exist_ok=True)
PAGES=['dispatch.html','gear.html','search.html','games.html','about.html','author.html','members.html','tcmv.html']
assert PAGES
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for path in PAGES:
   for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
    c=await browser.new_context(viewport={'width':width,'height':1100},is_mobile=width<=430,has_touch=width<=768,reduced_motion='reduce',service_workers='block')
    await c.add_init_script('localStorage.setItem("sd-theme",'+json.dumps(theme)+')')
    async def route(r):
     u=urlparse(r.request.url);f=ROOT/(u.path.lstrip('/') or 'index.html')
     if u.hostname!='superchargeddaily.com' or not f.is_file():return await r.abort()
     return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    await c.route('**/*',route);page=await c.new_page();await page.goto('https://superchargeddaily.com/'+path,wait_until='networkidle');await page.evaluate('document.fonts.ready')
    assert await page.locator('main.ac-page' if path=='games.html' else 'main.ps-page').count()==1
    assert await page.locator('main h1').count()==1
    overflow=await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    if overflow:
     print(await page.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right])"),flush=True)
    assert not overflow,(path,width,theme,'overflow')
    await page.screenshot(path=str(OUT/f'{path[:-5]}-{width}-{theme}.png'))
    if path=='dispatch.html':
     title=(await page.locator('[data-disp-grid] .story-card:visible h2').first.inner_text()).strip();await page.locator('[data-disp-q]').fill(title);assert await page.locator('[data-disp-grid] .story-card:visible').count()>0,'title-only search failed'
     await page.locator('[data-disp-q]').fill('');await page.locator('[data-disp-dir=oldest]').click();links=await page.locator('[data-disp-grid] .story-card:visible').evaluate_all('(els)=>els.map(e=>e.getAttribute("href"))');dates={a['url']:a.get('date','') for a in json.loads((ROOT/'data/articles.json').read_text())['articles']};ordered=[dates[x] for x in links if dates.get(x)];assert ordered==sorted(ordered),'oldest sort did not reorder the DOM'
    elif path=='gear.html':
     check=page.locator('[data-ps-checklist] input').first;await check.check();await page.reload();assert await page.locator('[data-ps-checklist] input').first.is_checked()
    elif path=='search.html':
     assert (await page.locator('.sd-search-form').bounding_box())['height']<100,'search entry should keep the field and submit action together'
     await page.locator('#sd-search-q').fill('Starlink');await page.wait_for_selector('[data-sd-hits] .sd-find-hit',timeout=15000);await page.locator('.sd-search-go').click();assert 'q=Starlink' in page.url
    elif path=='games.html':assert await page.locator('.ac-game-card').count()==3;assert await page.locator('.ac-art-link img').count()==3
    elif path=='members.html':assert await page.locator('[data-members-account]').count()==1
    elif path=='tcmv.html':assert await page.locator('.ps-process article').count()==3
    print('PASS',path,width,theme,flush=True);await c.close()
  await browser.close()
asyncio.run(main())

