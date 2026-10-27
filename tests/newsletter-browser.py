"""Newsletter conversion journeys; external navigation and counters are mocked."""
import asyncio,base64,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=Path('/tmp/newsletter-previews');OUT.mkdir(exist_ok=True)

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,theme='dark',nojs=False,blocked=False,metadata='normal'):
   c=await browser.new_context(viewport={'width':width,'height':900},java_script_enabled=not nojs,reduced_motion='reduce',service_workers='block',is_mobile=width<620,has_touch=width<=768)
   await c.add_init_script('try{localStorage.setItem("sd-theme",'+json.dumps(theme)+')}catch{}')
   if blocked:await c.add_init_script("Storage.prototype.getItem=function(){throw Error('blocked')};Storage.prototype.setItem=function(){throw Error('blocked')}")
   signups=[];events=[]
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname=='alexs-newsletter-84b17e.beehiiv.com':signups.append(r.request.url);return await r.fulfill(body='<h1>Mock Beehiiv signup</h1>',content_type='text/html')
    if u.hostname=='sd-events.superchargeddaily.workers.dev':events.append(r.request.url);return await r.fulfill(status=204)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    rel=u.path.lstrip('/') or 'index.html'
    if rel=='data/newsletter-latest.json':
     if metadata=='offline':return await r.abort()
     if metadata=='invalid':return await r.fulfill(json={'slug':'https://evil.example/'})
     return await r.fulfill(json={'slug':'fresh-weekly-edition'})
    if rel=='members-config.json':return await r.fulfill(json={'enabled':False})
    f=ROOT/rel
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    return await r.abort()
   await c.route('**/*',route);return c,signups,events
  for width in [320,390,768,1024,1440]:
   for theme in ['dark','light']:
    c,signups,events=await context(width,theme);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.goto(SITE+'/newsletter.html',wait_until='networkidle');await q.evaluate('document.fonts.ready')
    assert await q.locator('h1').count()==1
    assert await q.locator('[data-newsletter-form]').count()==2
    assert await q.locator('.ns-faq details').count()==6
    assert not await q.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,'horizontal overflow')
    for f in await q.locator('[data-newsletter-form]').all():
     assert await f.locator('input[type=email]').evaluate('(i)=>parseFloat(getComputedStyle(i).fontSize)')>=16
     assert (await f.locator('button').bounding_box())['height']>=44
    assert await q.locator('.ns-page a.sd-latest').first.evaluate('(a)=>a.pathname')=='/p/fresh-weekly-edition'
    await q.locator('.ns-faq summary').first.focus();await q.keyboard.press('Enter');assert await q.locator('.ns-faq details').first.get_attribute('open') is not None
    if width==390 and theme=='dark':
     await q.locator('.pn .pn-menu').click();await q.locator('.pn-sheet .pn-sub-sheet').click();await q.wait_for_function('document.activeElement.id==="nl-hero-email"');assert not await q.locator('body').evaluate('(b)=>b.classList.contains("pn-lock")')
    if width==1440 and theme=='dark':
     await q.locator('.pn .pn-sub').click();await q.wait_for_function('document.activeElement.id==="nl-hero-email"')
    await q.evaluate("scrollTo({top:0,behavior:'instant'})")
    await q.screenshot(path=str(OUT/f'newsletter-{width}-{theme}.png'),full_page=True)
    if (width,theme) in [(390,'dark'),(1440,'dark'),(390,'light')]:
     jpg=OUT/f'newsletter-{width}-{theme}.jpg';await q.screenshot(path=str(jpg),type='jpeg',quality=65)
     print('NEWSLETTER_PREVIEW '+jpg.name+' '+base64.b64encode(jpg.read_bytes()).decode(),flush=True)
    assert not errors,(width,theme,errors)
    print('PASS layout',width,theme,flush=True);await c.close()
  for nojs,blocked,placement in [(False,False,'hero'),(False,False,'footer'),(True,False,'hero'),(True,False,'footer'),(False,True,'hero')]:
   c,signups,events=await context(nojs=nojs,blocked=blocked);q=await c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.goto(SITE+'/newsletter.html',wait_until='networkidle');f=q.locator('[data-newsletter="landing-'+placement+'"] form')
   await f.locator('input[type=email]').fill('invalid');await f.locator('button').click();assert not signups
   await f.locator('input[type=email]').fill('reader@example.com')
   await f.locator('button').click();await q.wait_for_url('https://alexs-newsletter-84b17e.beehiiv.com/**')
   params=parse_qs(urlparse(signups[-1]).query);assert params['email']==['reader@example.com'];assert params['utm_medium']==['site-newsletter-'+placement];assert params['utm_content']==['website']
   counted=[u for u in events if parse_qs(urlparse(u).query).get('n')==['signup_submit']]
   assert len(counted)==(0 if nojs else 1),(nojs,blocked,events)
   assert all('reader'not in u for u in events),'Email must not enter analytics'
   assert not errors,errors
   # A return/retry remains possible; no local subscriber flag hides the forms.
   await q.goto(SITE+'/newsletter.html',wait_until='networkidle');assert await q.locator('[data-newsletter-form]:visible').count()==2
   if not blocked:assert await q.evaluate("localStorage.getItem('sd-nl-sub')") is None
   print('PASS signup',nojs,blocked,placement,flush=True);await c.close()
  for mode in ['offline','invalid']:
   c,_,_=await context(metadata=mode);q=await c.new_page();await q.goto(SITE+'/newsletter.html',wait_until='networkidle')
   for a in await q.locator('.ns-page a.sd-latest').all():assert (await a.get_attribute('href')).startswith('https://alexs-newsletter-84b17e.beehiiv.com/p/supercharged-daily-')
   print('PASS issue fallback',mode,flush=True);await c.close()
  # Forms inserted after initial load bind once; honeypots do not count or redirect.
  c,signups,events=await context();q=await c.new_page();await q.goto(SITE+'/newsletter.html',wait_until='networkidle')
  await q.evaluate('''()=>{const d=document.createElement('section');d.dataset.newsletter='pop';d.innerHTML='<form data-newsletter-form><label for="late-email">Email</label><input id="late-email" name="email" type="email" required><input name="website" hidden><button>Join</button></form><p data-newsletter-status role="status"></p>';document.querySelector('main').append(d)}''')
  f=q.locator('[data-newsletter="pop"] form');await f.locator('input[type=email]').fill('reader@example.com');await f.locator('input[name=website]').evaluate('(i)=>i.value="spam"');await f.locator('button').click();assert not signups;assert not [u for u in events if 'signup_submit'in u]
  await f.locator('input[name=website]').evaluate('(i)=>i.value=""');await f.locator('button').click();await q.wait_for_url('https://alexs-newsletter-84b17e.beehiiv.com/**');assert len([u for u in events if 'signup_submit'in u])==1
  print('PASS dynamic form and honeypot',flush=True);await c.close();await browser.close()

asyncio.run(main())
