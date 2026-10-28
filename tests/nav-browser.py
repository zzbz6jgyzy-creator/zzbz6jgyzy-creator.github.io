"""Real navigation journeys, local assets only; no real subscriptions or writes."""
import asyncio,base64,json,mimetypes,os,pathlib,re
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
OUT=pathlib.Path('/tmp/navigation-studio');OUT.mkdir(exist_ok=True)
CFG=json.loads((ROOT/'scripts/js-bundles.json').read_text())

async def preview(page,name,locator=None):
 data=await (locator or page).screenshot(type='jpeg',quality=60,animations='disabled',timeout=12000)
 (OUT/(name+'.jpg')).write_bytes(data)
 print('NAV_STUDIO_PREVIEW '+name+' '+base64.b64encode(data).decode(),flush=True)

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def scenario(width,theme='dark',mode='normal'):
   scripts=mode!='nojs'
   context=await browser.new_context(viewport={'width':width,'height':844},java_script_enabled=scripts,reduced_motion='reduce',service_workers='block')
   context.set_default_timeout(12000);context.set_default_navigation_timeout(15000)
   init='localStorage.setItem("sd-theme",'+json.dumps(theme)+');'
   if mode=='storage':init+="Object.defineProperty(window,'localStorage',{get(){throw Error('Unavailable')}});"
   await context.add_init_script(init)
   page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=urlparse(r.request.url)
    if r.request.method!='GET' or u.hostname!='superchargeddaily.com':return await r.abort()
    rel=u.path.lstrip('/') or 'index.html'
    if rel=='members-config.json':return await r.fulfill(body='{"enabled":false}',content_type='application/json')
    if mode=='offline' and rel in ['data/pages.json','data/articles.json']:return await r.abort()
    bundle=re.fullmatch(r'assets/js/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js',rel)
    if bundle:return await r.fulfill(body='\n;\n'.join((ROOT/f).read_text() for f in CFG['bundles'][bundle[1]]),content_type='application/javascript')
    f=ROOT/rel
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route)
   try:
    print('NAV_START',width,theme,mode,flush=True)
    await page.goto(SITE+'/',wait_until='domcontentloaded')
    if scripts:await page.wait_for_function('window.__pn && window.__sdFind && window.__sdTheme')
    await page.evaluate('document.fonts.ready')
    nav=page.locator('.pn');sheet=page.locator('.pn-sheet')
    assert await nav.locator('.ns-dropdown').count()==5
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    initial=await nav.bounding_box()
    for key in ['pn-search','pn-daily']:
     a=nav.locator('.'+key);assert await a.is_visible();b=await a.bounding_box();assert b['height']>=44 and b['width']>=44
    await page.evaluate('window.scrollTo(0,700)')
    await page.wait_for_function('scrollY>=600')
    if scripts:await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    after=await nav.bounding_box()
    assert all(abs(initial[k]-after[k])<2 for k in ['x','y','width','height']),('header moved',initial,after)
    if width<1080:
     assert await nav.locator('.pn-menu').is_visible()
     await nav.locator('.pn-menu').click();await sheet.wait_for(state='visible')
     assert await sheet.locator('.ns-mobile-section').count()==5
     members=sheet.locator('.ns-mobile-members')
     assert await members.is_visible()
     member_box=await members.bounding_box();categories=await sheet.locator('.ns-mobile-categories').bounding_box()
     assert member_box['height']>=44 and member_box['y']+member_box['height']<=categories['y']
     for title in ['News','Tesla','SpaceX','Trackers','Explore']:
      summary=sheet.locator('.ns-mobile-section>summary').filter(has_text=re.compile('^'+title+'$'))
      assert await summary.is_visible();b=await summary.bounding_box();assert b['height']>=44
     if scripts:
      assert await page.locator('main').first.evaluate('e=>!!e.closest("[inert]")')
      assert await sheet.locator('.pn-close').evaluate('e=>e===document.activeElement')
      controls="[...e.querySelectorAll('a[href],button,input,summary')].filter(a=>a.getClientRects().length&&!a.closest('[hidden],[inert]'))"
      await sheet.evaluate('e=>'+controls+'.at(-1).focus()')
      await page.keyboard.press('Tab');assert await sheet.evaluate('e=>'+controls+'[0]===document.activeElement')
      await page.keyboard.press('Shift+Tab');assert await sheet.evaluate('e=>'+controls+'.at(-1)===document.activeElement')
     if width in [390,768] and mode=='normal':await preview(page,('mobile-menu-' if width==390 else 'tablet-menu-')+theme,sheet)
     await sheet.locator('.ns-mobile-section>summary').filter(has_text='Trackers').click()
     if width in [390,768] and theme=='dark' and mode=='normal':await preview(page,'mobile-trackers' if width==390 else 'tablet-trackers',sheet)
     await sheet.locator('.ns-mobile-categories a[href="/updates.html"]').click()
     await page.wait_for_url(SITE+'/updates.html')
     if scripts:await page.wait_for_function('window.__pn && window.__sdFind')
     await page.locator('.pn-menu').click();await page.locator('.pn-sheet').wait_for(state='visible')
     sheet=page.locator('.pn-sheet')
     if scripts:
      assert await sheet.locator('.ns-mobile-section>summary').filter(has_text='Trackers').get_attribute('aria-current')=='true'
      await sheet.locator('[data-ns-query]').fill('Starlink')
      if mode=='offline':
       await sheet.locator('.sd-find-empty').wait_for(state='visible');assert (await sheet.locator('[data-sd-status]').inner_text()).strip()
      else:
       hit=sheet.locator('.sd-find-hit[href$="/starlink.html"]').first
       await hit.wait_for(state='visible')
       assert await page.locator('.sd-find-root:visible').count()==0,'Search must stay inside the phone menu'
       await sheet.locator('[data-ns-query]').press('ArrowDown')
       assert await sheet.locator('[data-ns-query]').get_attribute('aria-activedescendant')
       if width==390 and theme=='dark' and mode=='normal':await preview(page,'mobile-search',sheet)
      await sheet.locator('.ns-search-clear').click();assert await sheet.locator('.ns-browse').is_visible()
      if mode=='large':
       await sheet.evaluate("e=>{let a=[...e.querySelectorAll('summary,.ns-link-title,.ns-link small')];let s=a.map(n=>[n,parseFloat(getComputedStyle(n).fontSize)]);s.forEach(([n,f])=>n.style.fontSize=f*2+'px')}")
       await sheet.locator('.ns-mobile-section>summary').filter(has_text='Trackers').click()
       assert await sheet.evaluate('e=>e.scrollWidth<=e.clientWidth+1')
       await preview(page,'mobile-large-text',sheet)
      await page.keyboard.press('Escape');assert not await sheet.is_visible()
      assert await page.locator('.pn-menu').evaluate('e=>e===document.activeElement')
      assert not await page.locator('main').first.evaluate('e=>!!e.closest("[inert]")')
      await page.locator('.pn a.pn-search').click();await page.locator('.sd-find-root').wait_for(state='visible')
      assert await page.locator('#sd-find-q').evaluate('e=>e===document.activeElement')
      await page.keyboard.press('Escape')
     else:
      await sheet.locator('[data-ns-query]').fill('Starlink')
      await sheet.locator('.ns-search-submit').click();await page.wait_for_url(SITE+'/search.html?q=Starlink')
      await page.locator('.pn-menu').click();await page.locator('.pn-sheet').wait_for(state='visible')
      await page.locator('.pn-close').click();assert not await page.locator('.pn-sheet').is_visible()
    else:
     assert not await nav.locator('.pn-menu').is_visible()
     assert await nav.get_by_role('link',name='Members',exact=True).is_visible()
     members=await nav.locator('.pn-members').bounding_box()
     assert members['height']>=44 and members['x']+members['width']<=width
     for title in ['Tesla','Trackers','SpaceX']:
      summary=nav.locator('.ns-dropdown>summary').filter(has_text=re.compile('^'+title+'$'))
      await summary.click();panel=nav.locator('.ns-dropdown[open] .ns-panel')
      assert await panel.is_visible();assert await panel.locator('details').count()==0
      b=await panel.bounding_box();assert b['x']>=0 and b['x']+b['width']<=width+1
      if width==1440 and mode=='normal':await preview(page,'desktop-'+title.lower()+'-'+theme)
     await nav.locator('.ns-dropdown>summary').filter(has_text='SpaceX').click()
     if scripts:
      tesla=nav.locator('.ns-dropdown>summary').filter(has_text='Tesla')
      await tesla.focus();await page.keyboard.press('ArrowDown')
      assert await nav.locator('#pn-tesla').evaluate('e=>e.contains(document.activeElement)')
      await page.keyboard.press('Escape');assert await tesla.evaluate('e=>e===document.activeElement')
      await page.keyboard.press('Tab');assert await nav.locator('.ns-dropdown>summary').filter(has_text='SpaceX').evaluate('e=>e===document.activeElement')
     await nav.locator('.ns-dropdown>summary').filter(has_text='Trackers').click()
     await nav.locator('#pn-trackers a[href="/fsd-europe.html"]').click();await page.wait_for_url(SITE+'/fsd-europe.html')
    assert not errors,(width,mode,errors)
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    print('PASS',width,theme,mode,flush=True)
   finally:await context.close()
  for args in [(320,'dark','normal'),(390,'dark','normal'),(390,'light','normal'),(768,'dark','normal'),(768,'light','normal'),(1024,'dark','normal'),(1080,'dark','normal'),(1440,'dark','normal'),(1440,'light','normal'),(390,'dark','nojs'),(1440,'dark','nojs'),(390,'dark','offline'),(390,'dark','storage'),(390,'dark','large')]:
   await asyncio.wait_for(scenario(*args),timeout=90)
  await browser.close()
asyncio.run(main())
