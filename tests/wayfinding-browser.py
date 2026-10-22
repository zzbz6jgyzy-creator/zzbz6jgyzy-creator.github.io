"""Local browser journeys through homepage links, native contents and real mocked discussions."""
import asyncio,json,mimetypes,os,pathlib,re,traceback
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';PROJECT='https://luidcuzdrcvmzdxpiiwf.supabase.co'
CFG=json.loads((ROOT/'scripts/js-bundles.json').read_text())

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def scenario(width,theme='dark',scripts=True,enabled=True):
   context=await browser.new_context(viewport={'width':width,'height':844},is_mobile=width<500,java_script_enabled=scripts,reduced_motion='reduce')
   page=await context.new_page();errors=[];sdk=[];calls=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=r.request.url
    if u.startswith(PROJECT):
     assert u.split('/rpc/')[-1]=='sd_comments',u
     calls.append('sd_comments')
     return await r.fulfill(content_type='application/json',headers={'access-control-allow-origin':SITE},body=json.dumps({'items':[],'next':None,'count':0,'likes':0,'liked':False}))
    if r.request.method!='GET' or not u.startswith(SITE+'/'):return await r.abort()
    rel=urlparse(u).path.lstrip('/') or 'index.html'
    if rel=='members-config.json':
     config=json.loads((ROOT/rel).read_text());config['enabled']=enabled
     return await r.fulfill(content_type='application/json',body=json.dumps(config))
    if rel.startswith('vendor/supabase'):sdk.append(rel)
    bundle=re.fullmatch(r'assets/js/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js',rel)
    if bundle:return await r.fulfill(content_type='application/javascript',body='\n;\n'.join((ROOT/f).read_text() for f in CFG['bundles'][bundle[1]]))
    f=ROOT/rel
    if f.is_file() and ROOT in f.resolve().parents:return await r.fulfill(content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes())
    await r.abort()
   await page.route('**/*',route)
   try:
    await page.goto(SITE+'/',wait_until='domcontentloaded');await page.evaluate('document.documentElement.dataset.theme='+json.dumps(theme))
    links=page.locator('.hv-start a');assert await links.count()==3
    for i in range(3):
     rect=await links.nth(i).bounding_box();assert rect['height']>=44
    await page.locator('.hv-mast').screenshot(path=str(ROOT/'dev'/f'wayfinding-home-{width}-{theme}-{scripts}.png'))
    await page.get_by_role('link',name='Explore trackers',exact=True).click();await page.wait_for_url(SITE+'/#hv-trk-h')
    await page.wait_for_function("document.getElementById('hv-trk-h').getBoundingClientRect().top>=0&&document.getElementById('hv-trk-h').getBoundingClientRect().top<innerHeight")
    await page.goto(SITE+'/',wait_until='domcontentloaded')
    await page.get_by_role('link',name='Latest stories',exact=True).click();await page.wait_for_url(SITE+'/dispatch.html')
    await page.goto(SITE+'/',wait_until='domcontentloaded')
    await page.get_by_role('link',name='Find your Tesla',exact=True).click();await page.wait_for_url(SITE+'/guides/tesla-buying-guide.html')
    await page.goto(SITE+'/dispatch/tesla-ai-maps-v15.html',wait_until='domcontentloaded');await page.evaluate('document.documentElement.dataset.theme='+json.dumps(theme))
    details=page.locator('.sd-contents');assert await details.count()==1 and await details.get_attribute('open') is None
    await page.locator('.sd-article-tools').scroll_into_view_if_needed()
    if scripts and enabled:
     await page.locator('[data-discussion-jump]').wait_for()
     assert not sdk,'Discussion SDK loaded before the reader approached the comments'
    else:assert not await page.locator('[data-discussion-jump]').is_visible()
    await page.locator('.sd-article-tools').screenshot(path=str(ROOT/'dev'/f'wayfinding-article-{width}-{theme}-{scripts}-{enabled}.png'))
    await details.locator('summary').click()
    anchors=await details.locator('a').evaluate_all('(links)=>links.map(a=>a.hash.slice(1))')
    assert len(anchors)>=4
    assert await page.evaluate('(ids)=>ids.every(id=>[...document.querySelectorAll("[id]")].filter(el=>el.id===id).length===1)',anchors)
    await details.locator('a').first.click();await page.wait_for_url(SITE+'/dispatch/tesla-ai-maps-v15.html#'+anchors[0])
    assert await page.evaluate('(id)=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.top<innerHeight}',anchors[0])
    if scripts and enabled:
     await page.locator('[data-discussion-jump]').click();await page.wait_for_url(SITE+'/dispatch/tesla-ai-maps-v15.html#comments')
     await page.locator('#comments').get_by_role('link',name='Sign in to comment',exact=True).wait_for()
     assert await page.locator('#comments').count()==1 and calls==['sd_comments']
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert not errors,errors
    print(json.dumps({'width':width,'theme':theme,'scripts':scripts,'comments':enabled,'passed':True}),flush=True)
   except Exception:print(traceback.format_exc(),flush=True);raise
   finally:await context.close()
  (ROOT/'dev').mkdir(exist_ok=True)
  for args in [(320,'dark'),(390,'dark'),(390,'light'),(1440,'dark'),(1440,'light'),(390,'dark',False),(390,'dark',True,False)]:await scenario(*args)
  await browser.close()
asyncio.run(main())
