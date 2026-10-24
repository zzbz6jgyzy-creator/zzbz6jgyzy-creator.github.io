import asyncio,json,mimetypes,os,pathlib
from urllib.parse import urlparse
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('EVIDENCE_SCREENSHOTS','/tmp/autonomy-evidence'));OUT.mkdir(parents=True,exist_ok=True)
async def run():
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  async def setup(width=390,mode='normal',hash=''):
   c=await b.new_context(viewport={'width':width,'height':900},device_scale_factor=1,java_script_enabled=mode!='no-js',reduced_motion='reduce');page=await c.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
   await c.add_init_script("localStorage.setItem('sd-theme','"+('light'if mode=='light'else'dark')+"')")
   if mode=='blocked-storage':await c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})")
   if mode=='bad-prefs':await c.add_init_script("localStorage.setItem('sd-autonomy-evidence-v1','{bad')")
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-js'and'/autonomy.bundle.'in u.path:return await r.abort()
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if not f.is_file()or ROOT not in f.resolve().parents:return await r.abort()
    return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
   await c.route('**/*',route);await page.goto(SITE+'/autonomy.html'+hash,wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.ae-enhanced')
   return c,page,errors,requests
  cases=[]
  for width in [320,390,768,1440]:
   c,page,errors,requests=await setup(width);assert await page.locator('h1').count()==1
   for view in ['understand','checks','safety','sources']:
    await page.locator('.ae-nav [data-view='+view+']').click();await expect(page.locator('#'+view)).to_be_visible();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,view)
    if width in [390,1440]:await page.evaluate('scrollTo(0,0)');await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await page.screenshot(path=str(OUT/f'{view}-{width}.png'),full_page=True)
    cases.append([width,view])
   await page.locator('[data-view=understand]').click();await page.locator('[data-mode=driverless]').click();await expect(page.locator('#ae-mode-copy')).to_contain_text('boundary matters');assert await page.locator('#ae-mode-diagram .ae-domain').count()==1
   assert await page.evaluate("(()=>{const a=[...document.querySelectorAll('[id]')].map(x=>x.id);return new Set(a).size===a.length})()")
   await page.locator('[data-view=checks]').click();assert not await page.locator('#ae-clear-source').is_visible();await page.locator('[data-filter=safety]').click();assert await page.locator('.ae-claim:not([hidden])').count()==3
   await page.locator('#ae-search').fill('airbag');assert await page.locator('.ae-claim:not([hidden])').count()==1;await page.locator('#ae-search').fill('qwertyuiop');assert await page.locator('#ae-no-results').is_visible();await page.locator('#ae-search').fill('');await page.reload();await expect(page.locator('[data-filter=safety]')).to_have_attribute('aria-pressed','true')
   await page.locator('[data-view=sources]').click();await page.locator('#source-nhtsa-sgo [data-source-filter]').click();await expect(page.locator('#checks')).to_be_visible();await expect(page.locator('#ae-results')).to_contain_text('NHTSA');assert await page.locator('.ae-claim:not([hidden])').count()==2;await page.locator('#ae-clear-source').click();assert await page.locator('.ae-claim:not([hidden])').count()==12
   await page.locator('#claim-supervision summary').click();await page.locator('#claim-supervision a[href="#source-tesla-fsd"]').click();await expect(page.locator('#sources')).to_be_visible();assert page.url.endswith('#source-tesla-fsd')
   await page.locator('[data-view=safety]').click();await page.locator('#ae-events').fill('20');await page.locator('#ae-miles').fill('10000000');await expect(page.locator('#ae-rate-output strong')).to_have_text('2');await page.locator('#ae-events').fill('-1');await expect(page.locator('#ae-rate-output')).to_contain_text('Enter a whole');await page.locator('#ae-events').fill('');assert await page.locator('#ae-rate-output strong').count()==0
   await page.locator('#ae-exposure').fill('30');await expect(page.locator('.ae-bound b')).to_contain_text('0.1');await page.locator('#ae-exposure').fill('0.5');await expect(page.locator('.ae-bound b')).to_contain_text('5.991');await page.locator('#ae-exposure').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#ae-exposure')).to_have_attribute('aria-valuetext','1 million miles');await page.locator('#statistical-method summary').click();assert await page.locator('#statistical-method').get_attribute('open')is not None
   assert not errors,errors;assert not any('/data/promises.json'in r or'/fsd-data.js'in r for r in requests);await c.close()
  for mode in ['light','no-js','blocked-js','blocked-storage','bad-prefs']:
   c,page,errors,requests=await setup(mode=mode)
   if mode in ['no-js','blocked-js']:
    for view in ['understand','checks','safety','sources']:assert await page.locator('#'+view).is_visible()
    assert not await page.locator('#ae-search').is_visible();assert await page.locator('.ae-claim').count()==12;assert await page.locator('.ae-source').count()==11
   else:await page.locator('[data-view=safety]').click();await expect(page.locator('#safety')).to_be_visible()
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode;assert not errors,errors;cases.append(mode)
   if mode=='light':await page.screenshot(path=str(OUT/'safety-light-390.png'),full_page=True)
   await c.close()
  for hash,view in [('#claim-crash-counts','checks'),('#source-tesla-safety','sources'),('#statistical-method','safety'),('#method','sources'),('#%ZZ','understand')]:
   c,page,errors,requests=await setup(hash=hash);await expect(page.locator('#'+view)).to_be_visible()
   if hash=='#claim-crash-counts':assert await page.locator('#claim-crash-counts details').get_attribute('open')is not None
   if hash=='#statistical-method':assert await page.locator('#statistical-method').get_attribute('open')is not None
   assert not errors,errors;cases.append(hash);await c.close()
  await b.close();print(json.dumps({'passed':len(cases),'cases':cases},indent=2))
asyncio.run(run())
