"""Offline first-party browser regression: responsive lessons and fallbacks."""
import asyncio,json,mimetypes,os,pathlib
from urllib.parse import urlparse,unquote
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
LESSONS=json.loads((ROOT/'data/explainers.json').read_text())['lessons']
OUT=pathlib.Path(os.environ.get('EXPLAINERS_SCREENSHOTS','/tmp/explainers-preview'));OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROME_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
  async def context(width=390,js=True,light=False,blocked=False):
   c=await browser.new_context(viewport={'width':width,'height':900},java_script_enabled=js,reduced_motion='reduce')
   if light:await c.add_init_script("localStorage.setItem('sd-theme','light')")
   async def route(r):
    parsed=urlparse(r.request.url);path=unquote(parsed.path).lstrip('/') or 'index.html';f=ROOT/path
    if parsed.hostname!='superchargeddaily.com' or not f.is_file() or f.suffix=='.mp4' or (blocked and 'explainers-fsd.bundle.' in path):await r.abort();return
    await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
   await c.route('**/*',route);return c
  checks=0
  for width,light in [(320,False),(390,False),(1440,False),(390,True),(1440,True)]:
   c=await context(width,light=light);page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   for slug in [None]+[l['slug'] for l in LESSONS]:
    url='/explainers/'+slug+'.html' if slug else '/explainers.html'
    await page.goto('https://superchargeddaily.com'+url);await page.locator('.lx').wait_for();await page.wait_for_timeout(100)
    assert await page.locator('h1').count()==1
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth+1'),(width,url,'overflow')
    if not slug:
     assert await page.locator('.lx-card').count()==4
     assert await page.evaluate('scrollY')==0
    else:
     await page.locator('[data-next]').click();assert await page.locator('[data-lesson-figure]').get_attribute('data-step')=='1'
     await page.locator('[data-step-target="4"]').click();assert await page.locator('[data-next]').is_disabled()
     await page.locator('[data-restart]').click();assert await page.locator('[data-previous]').is_disabled()
     await page.locator('[data-step-target="0"]').focus();await page.keyboard.press('ArrowRight');assert await page.locator('[data-lesson-figure]').get_attribute('data-step')=='1'
     await page.locator('[data-scrub]').fill('3');assert await page.locator('[data-lesson-figure]').get_attribute('data-step')=='3'
     await page.locator('[data-play]').click();assert await page.locator('[data-play]').inner_text()=='Pause';await page.locator('[data-play]').click()
     for b in await page.locator('.lx button:visible').all():assert (await b.bounding_box())['height']>=43
     if slug=='hot-staging':
      await page.locator('button[data-mode="cold"]').click();assert await page.locator('[data-current-title]').inner_text()=='Ignite the upper stage'
      await page.locator('button[data-mode="hot"]').click()
     if slug=='fsd':
      assert await page.locator('[data-compare-controls]').is_visible()
      await page.locator('[data-compare="b"]').select_option('europe');assert 'Europe' in await page.locator('[data-compare-head="b"]').inner_text()
     await page.locator('[data-restart]').click()
    if width in [390,1440]:await page.screenshot(path=str(OUT/f'{slug or "hub"}-{width}-{"light" if light else "dark"}.png'),full_page=True)
    checks+=1
   assert not errors,errors
   await c.close()
  c=await context(js=False);page=await c.new_page()
  for l in LESSONS:
   await page.goto('https://superchargeddaily.com/explainers/'+l['slug']+'.html')
   assert await page.locator('.lx-step>p:visible').count()==5
   assert await page.locator('[data-lesson-controls]').is_hidden()
   if l['id']=='fsd':assert await page.locator('table td:visible').count()==10
  await c.close()
  c=await context();page=await c.new_page()
  for l in LESSONS:
   await page.goto('https://superchargeddaily.com/explainers.html#'+l['legacy']);await page.wait_for_url('**/explainers/'+l['slug']+'.html')
  await page.goto('https://superchargeddaily.com/explainers.html#tesla');assert await page.locator('[data-explainers-hub]').count()==1
  await c.close()
  c=await context(blocked=True);page=await c.new_page();await page.goto('https://superchargeddaily.com/explainers/fsd.html');assert await page.locator('[data-compare-controls]').is_visible();await c.close()
  await browser.close();print(f'PASS: {checks} responsive/theme pages; all controls, legacy links, no-JS and blocked tracker fallback')
asyncio.run(main())
