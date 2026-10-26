"""Owner journeys against local first-party resources; no Tesla/Supabase writes."""
import asyncio,json,mimetypes,os,pathlib,shutil
from urllib.parse import urlparse
from playwright.async_api import async_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=pathlib.Path(os.environ.get('GARAGE_SCREENSHOTS','/tmp/my-tesla-studio'));OUT.mkdir(parents=True,exist_ok=True)
KEY='sd-my-tesla-garage-v2'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,theme='dark',mode='normal',seed=None):
   c=await browser.new_context(viewport={'width':width,'height':950},reduced_motion='reduce',java_script_enabled=mode!='no-js',service_workers='block');init="localStorage.setItem('sd-theme',"+json.dumps(theme)+");"
   if seed:init+="localStorage.setItem('"+KEY+"',"+json.dumps(json.dumps(seed))+");"
   if mode=='legacy':init+="localStorage.setItem('sd-my-tesla-v1',JSON.stringify({model:'Y',year:2023,cc:'IE',hw:'hw3',sw:'2026.32.7'}));"
   if mode=='corrupt':init+="localStorage.setItem('"+KEY+"','{broken');"
   if mode=='storage-blocked':init+="Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked')}});"
   await c.add_init_script(init);page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=urlparse(r.request.url);f=ROOT/(u.path.lstrip('/')or'index.html')
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if mode=='blocked'and(u.path.startswith('/data/')or u.path=='/updates-live.json'):return await r.abort()
    if mode=='blocked-js'and'/my-tesla.bundle.'in u.path:return await r.abort()
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await c.route('**/*',route);await page.goto(SITE+'/my-tesla.html',wait_until='domcontentloaded')
   if mode not in ['no-js','blocked-js']:await page.wait_for_selector('.mg-enhanced')
   return c,page,errors
  async def setup(page,name='My Highland',model='3',year='2024',country='US',trim='Long Range AWD'):
   await page.locator('[data-edit="new"]').first.click();f=page.locator('#mg-profile-form');await f.locator('[name=model]').select_option(model);await f.locator('[name=year]').select_option(year);await f.locator('[name=cc]').select_option(country);await f.locator('[name=trim]').fill(trim);await f.locator('[name=name]').fill(name);await f.locator('[name=wheels]').fill('18-inch');await f.locator('[name=odo]').fill('17500');await f.locator('[type=submit]').click()
   await f.locator('[name=hw]').select_option('hw4');await f.locator('[name=battery]').select_option('NCA/NCM');await f.locator('[name=sw]').fill('2026.32.7');await f.locator('[name=usableKwh]').fill('75');await f.locator('[name=soc]').fill('68')
   if country=='US':
    await page.wait_for_function("document.querySelector('[name=epaId]').options.length>1");await f.locator('[name=epaId]').select_option('47908')
   await f.locator('[type=submit]').click();await f.locator('[name=homeRate]').fill('0.16');await f.locator('[name=acKw]').fill('7.2');await f.locator('[type=submit]').click();assert not await page.locator('#mg-profile-dialog').is_visible();assert name in await page.locator('#mg-title').inner_text()
  async def log(page,kind,fields):
   await page.locator('[data-log="'+kind+'"]:visible').first.click();f=page.locator('#mg-record-form')
   for k,v in fields.items():
    el=f.locator('[name='+k+']')
    if await el.evaluate('e=>e.tagName')=='SELECT':await el.select_option(v)
    else:await el.fill(v)
   await f.locator('[type=submit]').click();assert not await page.locator('#mg-record-dialog').is_visible()
  count=0
  for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
   c,page,errors=await context(width,theme);await page.screenshot(path=str(OUT/f'landing-{width}-{theme}.png'),full_page=True)
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,'landing overflow');await page.locator('#mg-demo').click();assert await page.locator('#mg-demo-banner').is_visible();assert await page.evaluate("localStorage.getItem('"+KEY+"')===null")
   for view in ['overview','energy','planner','software','care','passport']:
    await page.locator('[data-view='+view+']').click();assert await page.locator('#'+view).is_visible();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,view,'overflow')
    if width in [390,1440]and theme=='dark':await page.screenshot(path=str(OUT/f'{view}-{width}-{theme}.png'),full_page=True)
    count+=1
   await page.locator('#mg-exit-demo').click();assert not await page.locator('#mg-workspace').is_visible();await setup(page)
   assert '342' in await page.locator('#mg-hero-glass').inner_text()
   await log(page,'charge',{'energy':'50','cost':'0','kind':'home'});await log(page,'charge',{'energy':'25','kind':'supercharger'});await log(page,'drive',{'distance':'100','kwh':'25'})
   await page.locator('[data-view=energy]').click();assert '250' in await page.locator('#mg-energy-stats').inner_text();assert 'unpriced'not in await page.locator('#mg-journal').inner_text();assert 'Not entered' in await page.locator('#mg-journal').inner_text();assert '$0.00' in await page.locator('#mg-journal').inner_text()
   await page.reload();await page.wait_for_selector('.mg-enhanced');assert 'My Highland'in await page.locator('#mg-title').inner_text();assert await page.evaluate("JSON.parse(localStorage.getItem('"+KEY+"')).cars[0].charges.length") ==2
   # Verify quick readings, keyboard dismissal and focus return.
   await page.locator('[data-view=overview]').click();button=page.locator('[data-log=snapshot]');await button.click();await page.locator('#mg-snapshot-form [name=soc]').fill('0');await page.locator('#mg-snapshot-form [name=odo]').fill('18000');await page.locator('#mg-snapshot-form [type=submit]').click();assert '18,000' in await page.locator('#mg-stats').inner_text()
   await page.locator('[data-edit=active]').first.click();await page.keyboard.press('Escape');assert await page.locator('[data-edit=active]').first.evaluate('e=>e===document.activeElement')
   assert not errors,(width,theme,errors);await c.close()
  print('PASS:',count,'responsive/theme views, setup, explicit EPA match, charge/drive logging, unknown/free prices, reload and quick readings',flush=True)
  c,page,errors=await context();await setup(page)
  # Charging and journey calculations, with values the owner can verify.
  await page.locator('[data-view=planner]').click();f=page.locator('#mg-charge-plan');await f.locator('[name=from]').fill('20');await f.locator('[name=to]').fill('80');await f.locator('[type=submit]').click();assert '50 kWh' in await page.locator('#mg-charge-result').inner_text();assert '$8.00'in await page.locator('#mg-charge-result').inner_text()
  j=page.locator('#mg-journey-plan');await j.locator('[name=distance]').fill('100');await j.locator('[name=consumption]').fill('250');await j.locator('[type=submit]').click();assert '25 kWh' in await page.locator('#mg-journey-result').inner_text();assert 'not'not in await page.locator('#mg-journey-result').inner_text()
  await page.locator('[data-view=care]').click();await log(page,'care',{'title':'Tyre check','dueDistance':'18000'});await page.locator('[data-complete]').click();assert 'Completed' in await page.locator('#mg-care-list').inner_text();await page.locator('[data-reopen]').click();assert 'Completed'not in await page.locator('#mg-care-list').inner_text()
  # Add another car, verify isolated stats and legacy compatibility pointer.
  first=await page.evaluate("JSON.parse(localStorage.getItem('"+KEY+"')).activeId");await setup(page,'Family Y',model='Y',year='2023',country='IE',trim='Long Range AWD');assert await page.locator('#mg-car-select option').count()==2;assert '342'not in await page.locator('#mg-hero-glass').inner_text();assert await page.evaluate("JSON.parse(localStorage.getItem('sd-my-tesla-v1')).cc")=='IE';await page.locator('#mg-car-select').select_option(first);assert 'My Highland'in await page.locator('#mg-title').inner_text()
  # Export/import, atomic cancel, malformed backup and injection safety.
  await page.locator('[data-view=passport]').click()
  async with page.expect_download()as dl:await page.locator('#mg-export').click()
  download=await dl.value;path=OUT/'garage-backup.json';await download.save_as(path);backup=json.loads(path.read_text());assert len(backup['cars'])==2
  malicious=json.loads(json.dumps(backup));malicious['cars'][0]['name']='<img src=x onerror=alert(1)>';await page.locator('#mg-import').set_input_files({'name':'garage.json','mimeType':'application/json','buffer':json.dumps(malicious).encode()});await page.locator('#mg-confirm-no').click();assert 'My Highland'in await page.locator('#mg-title').inner_text()
  await page.locator('#mg-import').set_input_files({'name':'garage.json','mimeType':'application/json','buffer':json.dumps(malicious).encode()});await page.locator('#mg-confirm-yes').click();assert '<img src=x' in await page.locator('#mg-title').inner_text();assert await page.locator('#mg-title img').count()==0
  await page.locator('#mg-import').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{broken'});await expect(page.locator('#mg-alert')).to_contain_text('not a valid');assert await page.evaluate("JSON.parse(localStorage.getItem('"+KEY+"')).cars.length")==2
  await page.locator('#mg-delete-car').click();await page.locator('#mg-confirm-no').click();assert await page.evaluate("JSON.parse(localStorage.getItem('"+KEY+"')).cars.length")==2
  assert not errors,errors;await c.close();print('PASS: calculators, care completion/reopen, two-car isolation, compatible legacy pointer, backup roundtrip/cancel, malformed import and HTML injection safety',flush=True)
  for mode in ['blocked','storage-blocked','legacy','corrupt','no-js','blocked-js']:
   c,page,errors=await context(mode=mode)
   if mode in ['no-js','blocked-js']:
    assert 'Your Tesla:'in await page.locator('#mg-title').inner_text();assert await page.locator('#mg-method').is_visible();assert not await page.locator('[data-edit=new]').first.is_visible()
   elif mode=='legacy':
    assert 'Model Y'in await page.locator('#mg-title').inner_text();await page.locator('[data-view=passport]').click();assert 'Not confirmed'in await page.locator('#mg-passport-content').inner_text();assert await page.evaluate("JSON.parse(localStorage.getItem('sd-my-tesla-v1')).hw")=='hw3'
   elif mode=='corrupt':assert await page.locator('#mg-export-original').is_visible();assert await page.evaluate("localStorage.getItem('"+KEY+"')")=='{broken'
   elif mode=='storage-blocked':
    await setup(page,country='IE');assert 'visit only'in await page.locator('#mg-storage').inner_text();await log(page,'drive',{'distance':'100','kwh':'15'});assert await page.locator('#mg-workspace').is_visible()
   else:
    await setup(page,country='IE');await page.locator('[data-view=software]').click();assert 'No usable country sample'in await page.locator('#mg-software-content').inner_text();await log(page,'charge',{'energy':'10','cost':'0'})
   assert not errors,(mode,errors);assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),mode;await c.close()
  print('PASS: failed sources, blocked storage, legacy migration, corrupt-data recovery and no/blocked-JavaScript fallbacks',flush=True)
  await browser.close()
asyncio.run(main())
