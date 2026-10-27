"""Homepage conversion and discovery journeys. All signup requests are mocked."""
import asyncio,base64,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=Path('/tmp/home-studio');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,theme,mode in [(320,'dark','normal'),(390,'dark','normal'),(768,'dark','normal'),(1440,'dark','normal'),(390,'light','normal'),(1440,'light','normal'),(390,'dark','nojs'),(390,'dark','offline')]:
   context=await browser.new_context(viewport={'width':width,'height':844},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block');await context.add_init_script('localStorage.setItem("sd-theme",'+json.dumps(theme)+')');await context.add_init_script("window.__homeCLS=0;window.__homeShifts=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput){window.__homeCLS+=e.value;window.__homeShifts.push({value:e.value,start:e.startTime,sources:e.sources.map(s=>({tag:s.node?.tagName,cls:s.node?.className,from:s.previousRect,to:s.currentRect}))})}})).observe({type:'layout-shift',buffered:true})");page=await context.new_page();errors=[];requested=[];signups=[];analytics=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=urlparse(r.request.url);requested.append(r.request.url)
    if u.hostname=='alexs-newsletter-84b17e.beehiiv.com':
     signups.append(r.request.url);return await r.fulfill(body='<h1>Mock newsletter confirmation</h1>',content_type='text/html')
    if u.hostname=='sd-events.superchargeddaily.workers.dev':analytics.append(r.request.url);return await r.fulfill(status=204)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    rel=u.path.lstrip('/')or'index.html'
    if mode=='offline'and(rel.endswith('.json')or rel=='dispatch.html'):return await r.abort()
    if rel=='members-config.json':return await r.fulfill(body='{"enabled":false}',content_type='application/json')
    f=ROOT/rel
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await context.route('**/*',route);await page.clock.set_fixed_time('2026-10-28T12:00:00Z');await page.goto(SITE+'/',wait_until='domcontentloaded');await page.wait_for_timeout(500);await page.evaluate('document.fonts.ready')
   assert await page.locator('h1').count()==1
   if width<=600:
    boxes=[await page.locator(s).bounding_box() for s in ['.hs-hero h1','.hv-pitch','.hv-start','#newsletter','.hs-hero-visual','.hs-stories']]
    assert all(b and b['height']>0 for b in boxes),'Hero sections must have real, visible layout boxes'
    assert all(boxes[i]['y']+boxes[i]['height']<=boxes[i+1]['y']+2 for i in range(len(boxes)-1)),(width,'hero reading order',boxes)
   assert await page.locator('[data-newsletter-form]').count()==2,'One deliberate hero form and one lower-page form'
   assert 'Tesla, SpaceX and xAI' in await page.locator('.hv-pitch').inner_text()
   if width<=600:assert await page.locator('#newsletter input[type=email]').evaluate('(i)=>parseFloat(getComputedStyle(i).fontSize)')>=16,'Prevent iOS input zoom'
   email_box=await page.locator('#newsletter input[type=email]').bounding_box();assert email_box['width']>=130,(width,'email field too narrow',email_box)
   button=await page.locator('#newsletter button[type=submit]').bounding_box();assert button['y']>=0 and button['y']+button['height']<844,(width,button)
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,'overflow')
   if mode!='nojs':assert await page.evaluate('window.__homeCLS')<.1,(width,theme,'layout shift',await page.evaluate('[window.__homeCLS,window.__homeShifts]'))
   assert not any('.mp4'in u for u in requested),'No autoplay video or film downloads on the homepage'
   assert await page.locator('iframe').count()==0
   assert await page.locator('.hs-hero-roadster img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
   assert await page.locator('.hs-tool').count()==5
   for link in await page.locator('.hv-start a').all():assert (await link.bounding_box())['height']>=44
   await page.screenshot(path=str(OUT/f'home-{width}-{theme}-{mode}.png'))
   if mode=='normal' and (width,theme) in [(320,'dark'),(390,'dark'),(390,'light'),(1440,'dark')]:
    jpg=OUT/f'home-restored-{width}-{theme}.jpg';await page.screenshot(path=str(jpg),type='jpeg',quality=65);print('HOME_RESTORE_PREVIEW '+jpg.name+' '+base64.b64encode(jpg.read_bytes()).decode(),flush=True)
   if mode=='normal'and width==1440 and theme=='dark':
    await page.get_by_role('link',name='Explore trackers',exact=True).click();assert page.url.endswith('#hv-trk-h')
    await page.locator('[data-hs-filter="tesla"]').click()
    assert await page.locator('.hs-tool:not([hidden])').count()==3
    await page.locator('[data-hs-filter="tesla"]').press('ArrowRight');assert await page.locator('.hs-tool:not([hidden])').count()==1
    assert 'SpaceX'in await page.locator('#hs-filter-status').inner_text()
    await page.locator('[data-hs-filter="all"]').click();assert await page.locator('.hs-tool:not([hidden])').count()==5
    await page.locator('.hs-tools').screenshot(path=str(OUT/'toolkit-desktop.png'));await page.locator('.hs-newsletter').screenshot(path=str(OUT/'newsletter-desktop.png'))
    expanded=page.locator('[data-hv-feed]');assert await expanded.locator('li:visible').count()<=4
    await expanded.locator('..').get_by_role('button',name='Show all headlines',exact=False).click();assert await expanded.locator('li:visible').count()>4
    await page.goto(SITE+'/',wait_until='domcontentloaded');await page.wait_for_timeout(300)
    await page.locator('.pn a.pn-sub').click();await page.wait_for_function('document.activeElement.id==="hs-hero-email"')
   if mode=='normal'and width==390 and theme=='dark':
    await page.locator('.pn .pn-menu').click();await page.locator('.pn-sheet .pn-sub-sheet').click();await page.wait_for_function('document.activeElement.id==="hs-hero-email"');assert not await page.locator('body').evaluate('(e)=>e.classList.contains("pn-lock")')
   if mode in ['normal','nojs']and width==390 and theme=='dark':
    form=page.locator('#newsletter form');await form.locator('input[type=email]').fill('invalid');await form.locator('button').click();assert not signups
    await form.locator('input[type=email]').fill('review@example.com');await form.locator('button').click();await page.wait_for_url('https://alexs-newsletter-84b17e.beehiiv.com/**')
    query=parse_qs(urlparse(signups[-1]).query);assert query['email']==['review@example.com'];assert query['utm_source']==['website'];assert query['utm_content']==['website'];assert query['utm_medium']==['site-band']
    assert all('review%40example.com'not in u and 'review@example.com'not in u for u in analytics),'Email must never enter analytics'
    await page.goto(SITE+'/',wait_until='domcontentloaded');await page.wait_for_timeout(200)
    await page.locator('#newsletter-bottom input[type=email]').fill('second@example.com');await page.locator('#newsletter-bottom button[type=submit]').click();await page.wait_for_url('https://alexs-newsletter-84b17e.beehiiv.com/**');assert parse_qs(urlparse(signups[-1]).query)['email']==['second@example.com']
   if mode=='nojs':assert not await page.locator('.hs-tool-filters').is_visible()
   if mode=='offline':assert (await page.locator('[data-hv-h]').inner_text()).strip(),'Saved reporting survives unavailable JSON'
   assert not errors,(width,theme,mode,errors)
   print(width,theme,mode,'passed',flush=True);await context.close()
  await browser.close()
asyncio.run(main())
