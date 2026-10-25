"""Real-browser checks with deterministic local files and no external requests."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=Path('/tmp/reviews-studio');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  models=['index','model-3','model-y','model-s','model-x','cybertruck']
  cases=[(w,'dark','normal',m)for w in [320,390,1440]for m in models]+[(768,'dark','normal','index'),(768,'dark','normal','model-3')]+[(w,'light','normal',m)for w in [390,1440]for m in ['index','model-3']]+[(390,'dark','nojs',m)for m in ['index','model-3']]+[(390,'dark','blocked-storage','index')]
  for width,theme,mode,model in cases:
   context=await browser.new_context(viewport={'width':width,'height':950},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block',accept_downloads=True)
   await context.add_init_script("localStorage.setItem('sd-theme',"+json.dumps(theme)+")")
   if mode=='blocked-storage':await context.add_init_script("Storage.prototype.setItem=function(){throw new Error('blocked')}")
   page=await context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route);await page.goto(SITE+'/reviews/'+model+'.html',wait_until='domcontentloaded');await page.wait_for_timeout(300)
   assert await page.locator('h1').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,model,'overflow')
   image=page.locator('.rv-hub-hero img,.rv-review-hero img').first
   assert await image.evaluate('(i)=>i.complete&&i.naturalWidth>0')
   if (width in [390,1440]and model in ['index','model-3']and mode=='normal'):
    await page.screenshot(path=str(OUT/f'{model}-{width}-{theme}-hero.png'))
   if mode=='nojs':
    assert await page.locator('#rv-lab-form').is_hidden()
    assert '31.5' in await page.locator('#rv-lab-results').inner_text()
    if model=='index':assert await page.locator('.rv-card').count()==5
    else:
     assert await page.locator('.rv-chapter').count()==4
     await page.locator('.rv-faq summary').first.click();assert await page.locator('.rv-faq details').first.get_attribute('open')is not None
   else:
    await page.wait_for_function("document.querySelector('.rv-studio').dataset.enhanced==='true'")
    if model=='index':
     await page.locator('[data-rv-filter="family"]').click();assert await page.locator('.rv-card:not([hidden])').count()==2
     await page.locator('[data-rv-filter="all"]').click();await page.locator('#rv-search').fill('truck');assert await page.locator('.rv-card:not([hidden])').count()==1
     await page.locator('#rv-search').fill('unknown');assert await page.locator('#rv-empty').is_visible()
     await page.locator('#rv-search').fill('')
     await page.locator('[data-rv-save="model-y"]').click()
     if mode=='blocked-storage':assert 'Storage unavailable' in await page.locator('#rv-status').inner_text()
     await page.locator('[data-rv-filter="saved"]').click();assert await page.locator('.rv-card:not([hidden])').count()==1
     await page.locator('[data-rv-filter="all"]').click()
     for m in ['model-3','model-y','model-s']:await page.locator(f'[data-rv-compare="{m}"]').click()
     await page.locator('[data-rv-compare="model-x"]').click();assert 'full' in await page.locator('#rv-status').inner_text()
     assert await page.locator('#rv-compare-content thead th').count()==4
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,'comparison overflow')
     if width==1440 and theme=='dark':await page.locator('#collection').screenshot(path=str(OUT/'collection-desktop.png'))
     if mode!='blocked-storage':
      await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(200);assert await page.locator('[data-rv-save="model-y"]').get_attribute('aria-pressed')=='true';assert '3 / 3' in await page.locator('#rv-compare-count').inner_text()
     await page.locator('#rv-compare-clear').click();assert '0 / 3' in await page.locator('#rv-compare-count').inner_text()
    else:
     box=page.locator('[data-rv-check="0"]');await box.check();assert '1 / 5' in await page.locator('#rv-check-count').inner_text()
     await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(200);assert await page.locator('[data-rv-check="0"]').is_checked()
     async with page.expect_download() as download:await page.locator('#rv-download').click()
     file=await (await download.value).path();assert '[x]' in Path(file).read_text()
     await page.locator('#rv-reset-checks').click();assert '0 / 5' in await page.locator('#rv-check-count').inner_text()
    # Charging output must be honest about average power and preserve physical units.
    assert await page.locator('#rv-dc-minutes').inner_text()=='31.5'
    await page.locator('#rv-average').fill('200');assert await page.locator('#rv-dc-minutes').inner_text()=='15.8'
    await page.locator('#rv-target').fill('5');assert await page.locator('#rv-lab-results').is_hidden();assert 'higher than' in await page.locator('#rv-lab-error').inner_text()
    await page.locator('#rv-lab-reset').click();assert await page.locator('#rv-dc-minutes').inner_text()=='31.5'
    before=await page.locator('#rv-home-cost').inner_text();await page.locator('#rv-unit').select_option('mi');assert await page.locator('#rv-home-cost').inner_text()==before
    await page.locator('#rv-daily').fill('');assert await page.locator('#rv-lab-results').is_hidden()
    await page.locator('#rv-lab-reset').click();await page.locator('#rv-currency').select_option('USD');assert '$' in await page.locator('#rv-home-cost').inner_text()
    await page.locator('#rv-lab-reset').click()
    if model=='model-3'and width in [390,1440]and theme=='dark':await page.locator('#charging-lab').screenshot(path=str(OUT/f'charging-{width}.png'))
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,model,'final overflow')
   assert not errors,(width,theme,mode,model,errors)
   print(width,theme,mode,model,'passed',flush=True);await context.close()
  await browser.close()
asyncio.run(main())
