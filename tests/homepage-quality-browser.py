"""Exercise the generated homepage and actual browser scripts using local, read-only fixtures."""
import asyncio, datetime, html, json, mimetypes, os, pathlib, re
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://superchargeddaily.com'
CFG=json.loads((ROOT/'scripts/js-bundles.json').read_text())
ARTICLES=json.loads((ROOT/'data/articles.json').read_text())['articles']
LEAD=ARTICLES[0]

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def scenario(width=390,theme='dark',scripts=True,mode='upcoming',registry=True,page_path='/'):
   context=await browser.new_context(viewport={'width':width,'height':844},java_script_enabled=scripts,reduced_motion='reduce',timezone_id='Europe/Dublin')
   page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   now=datetime.datetime.now(datetime.timezone.utc)
   event={'id':'quality-event','page':'spacex','title':'Falcon 9 · Test mission','start':(now+datetime.timedelta(hours=6)).isoformat(),'end':(now+datetime.timedelta(hours=8)).isoformat(),'status':'scheduled','provider':'link','fallbackUrl':'https://x.com/SpaceX','source':'https://thespacedevs.com/llapi'}
   if mode=='live':event.update(status='live',start=(now-datetime.timedelta(minutes=10)).isoformat(),end=(now+datetime.timedelta(minutes=50)).isoformat())
   if mode in ['net','tbc']:event['net' if mode=='net' else 'timeTbc']=True
   async def route(r):
    u=r.request.url
    if not u.startswith(SITE+'/') or r.request.method!='GET':return await r.abort()
    rel=urlparse(u).path.lstrip('/') or 'index.html'
    fixture=None
    if rel=='live-data.json':fixture={'events':[] if mode=='none' else [event]}
    elif rel=='data/events.json':fixture={'events':{}}
    elif rel=='data/launches.json':fixture={'results':[]}
    elif rel=='members-config.json':fixture={'enabled':False}
    elif rel=='data/articles.json' and not registry:return await r.abort()
    if fixture is not None:return await r.fulfill(content_type='application/json',body=json.dumps(fixture))
    bundle=re.fullmatch(r'assets/js/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js',rel)
    if bundle:return await r.fulfill(content_type='application/javascript',body='\n;\n'.join((ROOT/f).read_text() for f in CFG['bundles'][bundle[1]]))
    f=ROOT/rel
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes())
    return await r.abort()
   await page.route('**/*',route)
   await page.goto(SITE+page_path,wait_until='domcontentloaded')
   if scripts:await page.evaluate('document.documentElement.dataset.theme='+json.dumps(theme))
   if scripts:await page.evaluate('document.fonts.ready')
   if page_path=='/':
    title=page.locator('[data-hv-h]')
    if registry or not scripts:
     if scripts:await page.wait_for_function('(title)=>document.querySelector("[data-hv-h]").textContent===title',arg=LEAD.get('homeTitle',LEAD['title']))
     assert await title.inner_text()==LEAD.get('homeTitle',LEAD['title'])
    else:
     await page.wait_for_function('(title)=>document.querySelector("[data-hv-h]").textContent===title',arg=LEAD['title'])
    if scripts and mode=='live':
     await page.locator('[data-live-only] .lw-live').wait_for()
     assert not await page.locator('.lv-home-next').count()
     assert await page.locator('iframe').count()==0
    elif scripts and mode=='none':
     await page.wait_for_function('!document.querySelector("[data-prebuilt]")')
     assert await page.locator('.hv-event .lv').count()==0
    else:
     card=page.locator('.lv-home-next');await card.wait_for()
     if scripts:await card.get_by_role('heading',name=event['title'],exact=True).wait_for()
     assert await card.locator('img,iframe,.lw-tile').count()==0
     if scripts and mode in ['net','tbc']:
      assert await card.locator('.lh-next-countdown').count()==0
      assert ('net' if mode=='net' else 'time tbc') in (await card.inner_text()).lower()
     for link in await card.locator('a').all():
      bounds=await link.bounding_box();assert bounds['height']>=44,bounds
     if width<=390 and registry and LEAD.get('homeTitle'):
      rect=await card.bounding_box();assert rect['height']<=210,rect
      tracker=await page.locator('#hv-trk-h').bounding_box();assert tracker['y']<(1150 if width==320 else 1050),tracker
     assert await card.get_by_role('link',name='All events →').get_attribute('href')=='/calendar.html'
    if os.environ.get('QUALITY_SHOTS') and mode=='upcoming' and registry:
     shots=pathlib.Path(os.environ['QUALITY_SHOTS']);shots.mkdir(parents=True,exist_ok=True)
     await page.screenshot(path=str(shots/f'home-{width}-{theme}-{scripts}.png'))
    if scripts:assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'Homepage overflow'
    if scripts and mode=='upcoming' and registry:
     await page.get_by_role('link',name='Explore trackers',exact=True).click();await page.wait_for_url(SITE+'/#hv-trk-h')
     await page.goto(SITE+LEAD['url'],wait_until='domcontentloaded')
     original=(ROOT/LEAD['url'].lstrip('/')).read_text()
     heading=html.unescape(re.sub('<[^>]+>',' ',re.search(r'<h1\b[^>]*>(.*?)</h1>',original,re.S)[1]))
     assert ' '.join((await page.locator('h1').inner_text()).split())==' '.join(heading.split()), 'Homepage copy leaked into article H1'
   else:
    await page.locator('.lw-title').filter(has_text=event['title']).wait_for()
    assert await page.locator('.lv-home-next').count()==0,'Non-home cards changed'
   assert not errors,errors
   print(json.dumps({'width':width,'theme':theme,'scripts':scripts,'mode':mode,'registry':registry,'page':page_path,'passed':True}),flush=True)
   await context.close()
  for args in [(320,),(390,),(390,'light'),(1440,),(390,'dark',False),(390,'dark',True,'live'),(390,'dark',True,'net'),(390,'dark',True,'tbc'),(390,'dark',True,'none'),(390,'dark',True,'upcoming',False),(390,'dark',True,'upcoming',True,'/spacex.html')]:await scenario(*args)
  await browser.close()
asyncio.run(main())
