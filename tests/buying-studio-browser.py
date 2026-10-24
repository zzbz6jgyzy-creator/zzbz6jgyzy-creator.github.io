import asyncio,json,mimetypes,os,pathlib
from urllib.parse import urlparse
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('BUYING_SCREENSHOTS','/tmp/buying-studio'));OUT.mkdir(parents=True,exist_ok=True);KEY='sd-buying-studio-v1'
async def run():
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  async def setup(width=390,mode='normal',suffix=''):
   c=await b.new_context(viewport={'width':width,'height':900},device_scale_factor=1,java_script_enabled=mode!='no-js',reduced_motion='reduce',accept_downloads=True);page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await c.add_init_script("localStorage.setItem('sd-theme','"+('light'if mode=='light'else'dark')+"')")
   if mode=='blocked-storage':await c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})")
   if mode=='bad-prefs':await c.add_init_script("localStorage.setItem('"+KEY+"','{bad')")
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked-js'and'/buy-guide.bundle.'in u.path:return await r.abort()
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if not f.is_file()or ROOT not in f.resolve().parents:return await r.abort()
    return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
   await c.route('**/*',route);await page.goto(SITE+'/guides/tesla-buying-guide.html'+suffix,wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.bg-enhanced')
   return c,page,errors
  cases=[]
  for width in [320,390,768,1440]:
   c,page,errors=await setup(width);assert await page.locator('h1').count()==1
   for view in ['fit','models','numbers','confidence']:
    await page.locator('[data-bg-view='+view+']').click();await expect(page.locator('#'+view)).to_be_visible();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,view)
    if width in [390,1440]:
     await page.locator('img').evaluate_all("imgs=>imgs.forEach(i=>i.loading='eager')");await page.evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))');await page.evaluate('scrollTo(0,0)');await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await page.screenshot(path=str(OUT/f'{view}-{width}.png'),full_page=True)
    cases.append([width,view])
   await page.locator('[data-bg-view=fit]').click();await page.locator('#bg-priority').select_option('utility');await page.locator('#bg-route').select_option('new');await expect(page.locator('#bg-recommendations article').first).to_contain_text('Cybertruck')
   await page.locator('[data-bg-view=models]').click();await page.locator('[data-bg-model=mx]').click();await expect(page.locator('#bg-showroom h3')).to_have_text('Model X');await page.locator('[data-shortlist=ct]').click();await page.locator('[data-shortlist=ms]').click();await expect(page.locator('#bg-notice')).to_contain_text('three models');assert await page.locator('#bg-comparison thead th').count()==4
   await page.locator('[data-bg-view=numbers]').click();await page.locator('#bg-apr').fill('0');await page.locator('#bg-budget-result summary').click();await expect(page.locator('#bg-budget-result')).to_contain_text('$0');await page.locator('#bg-unit').select_option('km');assert abs(float(await page.locator('#bg-annualDistance').input_value())-16093.44)<.01;await expect(page.locator('[data-consumption-unit]')).to_have_text('Wh/km')
   await page.locator('#bg-currency').select_option('EUR');await expect(page.locator('#bg-notice')).to_contain_text('no currency conversion');assert await page.locator('#bg-price').input_value()=='40000';await page.locator('#bg-price').fill('');await expect(page.locator('.bg-budget-error')).to_contain_text('valid price');await page.reload();await expect(page.locator('.bg-budget-error')).to_contain_text('valid price');await page.locator('#bg-budget-reset').click();await page.locator('#bg-payment').select_option('cash');assert not await page.locator('#bg-finance-fields').is_visible()
   await page.locator('#bg-power').fill('0.5');await page.locator('#bg-hours').fill('1');await expect(page.locator('#bg-charge-result')).to_contain_text('Needs more time');await page.locator('[data-reference=m3]').click();assert await page.locator('#bg-currency').input_value()=='USD';assert await page.locator('#bg-unit').input_value()=='mi';assert await page.locator('#bg-daily').input_value()=='40';assert await page.locator('#bg-price').input_value()=='36990'
   if width<761:assert await page.locator('#bg-budget-summary').is_visible()
   await page.locator('[data-bg-view=confidence]').click();await page.locator('[data-check=parking]').check();await page.locator('[data-check=insurance]').check();await expect(page.locator('#bg-check-count')).to_have_text('2 of 16');await page.reload();await expect(page.locator('#bg-check-count')).to_have_text('2 of 16');assert await page.locator('[data-check=parking]').is_checked()
   async with page.expect_download()as download:await page.locator('#bg-download').click()
   dl=await download.value;assert dl.suggested_filename=='my-tesla-buying-plan.txt';text=pathlib.Path(await dl.path()).read_text();assert '[x] Measure parking'in text;assert 'price: 36990'in text
   assert not errors,errors;await c.close()
  for mode in ['light','no-js','blocked-js','blocked-storage','bad-prefs']:
   c,page,errors=await setup(mode=mode)
   if mode in ['no-js','blocked-js']:
    for view in ['fit','models','numbers','confidence']:assert await page.locator('#'+view).is_visible()
    assert not await page.locator('#bg-price').is_visible();assert await page.locator('.bg-check-item').count()==16;assert await page.locator('.bg-comparison-table').count()==1
   else:
    if mode=='blocked-storage':await expect(page.locator('#bg-storage')).to_contain_text('unavailable')
    await page.locator('[data-bg-view=numbers]').click();await expect(page.locator('#numbers')).to_be_visible()
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode;assert not errors,errors;cases.append(mode);await c.close()
  for suffix,view in [('#buy-calc','numbers'),('#charging','numbers'),('#warranty','confidence'),('#image-credits','confidence'),('?car=ct#models','models'),('#%ZZ','fit')]:
   c,page,errors=await setup(suffix=suffix);await expect(page.locator('#'+view)).to_be_visible()
   if'?car=ct'in suffix:await expect(page.locator('#bg-showroom h3')).to_have_text('Cybertruck')
   assert not errors,errors;cases.append(suffix);await c.close()
  await b.close();print(json.dumps({'passed':len(cases),'cases':cases},indent=2))
asyncio.run(run())
