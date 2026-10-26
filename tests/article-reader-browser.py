"""Reading controls and content safety, using local resources and no account writes."""
import asyncio,mimetypes,pathlib,os,shutil,json
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=pathlib.Path('/tmp/article-reader');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for path in ['booster-22-static-fire.html','latvia-fsd-tenth-eu.html','spacex-40b-gpu-lease.html']:
   for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
    c=await browser.new_context(viewport={'width':width,'height':1100},reduced_motion='reduce',service_workers='block',is_mobile=width<=430,has_touch=width<=768)
    await c.add_init_script('localStorage.setItem("sd-theme",'+json.dumps(theme)+');Object.defineProperty(navigator,"share",{value:undefined});Object.defineProperty(navigator,"clipboard",{value:{writeText:async text=>window.__copied=text}})')
    async def route(r):
     u=urlparse(r.request.url);f=ROOT/u.path.lstrip('/')
     if u.hostname!='superchargeddaily.com' or not f.is_file():return await r.abort()
     return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    await c.route('**/*',route);page=await c.new_page();await page.goto('https://superchargeddaily.com/dispatch/'+path,wait_until='networkidle')
    assert await page.locator('h1').count()==1;assert await page.locator('.rs-tools').count()==1
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(path,width,'overflow')
    await page.screenshot(path=str(OUT/f'{path[:-5]}-{width}-{theme}.png'))
    paragraphs=await page.locator('.rs-article>p').all_text_contents();sources=await page.locator('.rs-article a').evaluate_all('(els)=>els.map(e=>e.href)')
    await page.locator('[data-rs-size="1"]').click();assert await page.locator('.rs-article').get_attribute('data-text-size')=='1'
    await page.locator('[data-rs-focus]').click();assert await page.locator('body').evaluate('e=>e.classList.contains("rs-focus")');assert not await page.locator('.pn-wrap').is_visible()
    await page.keyboard.press('Escape');assert await page.locator('.pn-wrap').is_visible()
    await page.locator('[data-rs-share]').click();assert '/dispatch/'+path in await page.evaluate('window.__copied')
    assert paragraphs==await page.locator('.rs-article>p').all_text_contents();assert sources==await page.locator('.rs-article a').evaluate_all('(els)=>els.map(e=>e.href)')
    await page.reload();assert await page.locator('.rs-article').get_attribute('data-text-size')=='1'
    await page.evaluate('const a=document.querySelector(".rs-article");scrollTo(0,scrollY+a.getBoundingClientRect().top+a.offsetHeight*.3)');await page.wait_for_function('new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".rs-progress span")).transform).a>0')
    if await page.locator('.sd-contents').count():
     await page.locator('.sd-contents summary').click();link=page.locator('.sd-contents a').first;target=await link.get_attribute('href');await link.click();assert (await page.locator(target).bounding_box())['y']>=(await page.locator('.rs-tools').bounding_box())['y']+(await page.locator('.rs-tools').bounding_box())['height']-1,'contents target hidden by reader controls'
    print('PASS',path,width,theme,flush=True);await c.close()
  await browser.close()
asyncio.run(main())
