"""Newsroom checks with all non-site services blocked; no signup or account mutation."""
import asyncio,json,mimetypes,os,re,shutil
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/news-studio');OUT.mkdir(exist_ok=True)
SITE='https://superchargeddaily.com'
async def tap(page,s):
 t=page.locator(s);await t.scroll_into_view_if_needed();await t.click()
async def overflow(page,label):assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),label
async def main():
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE')or shutil.which('google-chrome')or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  cases=[(w,t,'normal')for w in [320,390,768,1440]for t in ['dark','light']]+[(390,'dark','nojs'),(1440,'light','nojs'),(390,'dark','blocked'),(390,'dark','bad-storage'),(390,'dark','malformed'),(390,'dark','link'),(390,'dark','legacy'),(390,'dark','offline'),(390,'dark','older-feed'),(390,'dark','fresh-story')]
  if os.environ.get('NEWS_BROWSER_MODE'):cases=[c for c in cases if c[2]==os.environ['NEWS_BROWSER_MODE']]
  for width,theme,mode in cases:
   ctx=await browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=mode!='nojs',reduced_motion='reduce',service_workers='block',has_touch=width<800)
   await ctx.add_init_script("try{localStorage.setItem('sd-theme',"+json.dumps(theme)+");}catch{}")
   if mode=='blocked':await ctx.add_init_script("const g=Storage.prototype.getItem,s=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k.startsWith('sd-personal'))throw Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(k.startsWith('sd-personal'))throw Error('blocked');return s.call(this,k,v)}")
   if mode=='bad-storage':await ctx.add_init_script("localStorage.setItem('sd-personal-guest-v1','{broken')")
   page=await ctx.new_page();page.set_default_timeout(15000);errors=[];requests=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   async def route(r):
    u=urlparse(r.request.url);requests.append(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    f=ROOT/u.path.lstrip('/')
    if mode=='offline'and u.path in ['/data/articles.json','/news-data.json','/data/news-hold.json']:return await r.abort()
    if f.is_file()and ROOT in f.resolve().parents:
     body=f.read_bytes()
     if u.path=='/news.html'and mode=='malformed':body=re.sub(r'(<script type="application/json" id="ns-data">)[\s\S]*?(</script>)',r'\1{broken\2',body.decode()).encode()
     if mode=='older-feed'and u.path in ['/data/articles.json','/news-data.json']:
      data=json.loads(body);data['updated']='2000-01-01T00:00:00Z';body=json.dumps(data).encode()
     if mode=='fresh-story'and u.path=='/data/articles.json':
      data=json.loads(body);fresh=datetime.now(timezone.utc).isoformat().replace('+00:00','Z');data['updated']=fresh;data['articles'].insert(0,{'url':'/dispatch/fixture-new-story.html','title':'Starship fixture fresh story','date':fresh,'topic':'spacex','tag':'Starship','summary':'New source fixture for the newsroom.'});body=json.dumps(data).encode()
     return await r.fulfill(body=body,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await ctx.route('**/*',route)
   suffix={'link':'?topic=starlink&view=compact#browse','legacy':'#grok'}.get(mode,'')
   await page.goto(SITE+'/news.html'+suffix,wait_until='domcontentloaded');await page.wait_for_timeout(100)
   await overflow(page,(width,theme,mode,'initial'));assert await page.locator('h1').count()==1
   ids=await page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)');assert len(ids)==len(set(ids))
   if mode in ['nojs','malformed']:
    assert await page.locator('.ns-toolbar').is_hidden();assert await page.locator('#ns-results .ns-card').count()>12
    await tap(page,'.ns-wire-fallback>summary');assert await page.locator('.ns-wire-fallback .ns-wire-card').count()>0
    assert await page.locator('.ns-wire-fallback .ns-wire-card a').first.get_attribute('rel')=='noopener noreferrer'
    await overflow(page,(width,theme,mode,'fallback'))
   else:
    await page.wait_for_function("document.querySelector('main.ns').classList.contains('ns-enhanced')&&!document.getElementById('ns-refresh').disabled")
    if mode=='link':assert await page.locator('[data-ns-topic="starlink"]').get_attribute('aria-pressed')=='true';assert await page.locator('#ns-results').get_attribute('data-layout')=='compact'
    if mode=='legacy':assert await page.locator('[data-ns-source="external"]').get_attribute('aria-pressed')=='true'
    if mode in ['offline','older-feed']:assert 'saved content remains available'in await page.locator('#ns-refresh-status').inner_text()
    if mode=='fresh-story':
     await page.wait_for_function("document.querySelector('#ns-results').textContent.includes('Starship fixture fresh story')");assert 'Starship fixture fresh story'in await page.locator('#ns-results').inner_text();assert 'min read'not in await page.locator('#ns-results .ns-card').first.locator('.ns-meta').inner_text()
    if mode=='normal'and width in [390,1440]:await page.screenshot(path=str(OUT/f'hero-{width}-{theme}.png'))
    await tap(page,'.ns-toolbar [data-ns-reset]');assert await page.locator('#ns-results .ns-card').count()==12
    await tap(page,'#ns-more');assert await page.locator('#ns-results .ns-card').count()==24
    await page.locator('#ns-query').fill('FSD Europe');assert await page.locator('#ns-results .ns-card').count()>0
    await page.locator('#ns-query').fill('zzzz-no-such-story');assert await page.locator('#ns-results .ns-empty').count()==1
    await tap(page,'.ns-toolbar [data-ns-reset]');await tap(page,'[data-ns-topic="starlink"]');assert await page.locator('#ns-results .ns-card').count()>0;assert 'topic=starlink'in page.url
    await tap(page,'[data-ns-view="compact"]');await overflow(page,(width,theme,mode,'compact'))
    if mode=='normal'and width==390 and theme=='light':await page.screenshot(path=str(OUT/'browse-phone-light.png'),style='.pn-wrap{visibility:hidden!important}')
    await tap(page,'.ns-toolbar [data-ns-reset]');await tap(page,'[data-ns-view="cards"]')
    save=page.locator('#ns-results [data-ns-save]').first;url=await save.get_attribute('data-ns-save');await save.click()
    assert ('this visit'if mode=='blocked'else'Saved to your device reading list')in await page.locator('#ns-status').inner_text()
    assert await save.get_attribute('aria-pressed')=='true'
    await tap(page,'[data-ns-source="saved"]');assert await page.locator('#ns-results .ns-card').count()==1
    if mode=='normal'and width==1440 and theme=='dark':await page.locator('#browse').screenshot(path=str(OUT/'reading-list-desktop.png'),style='.pn-wrap{visibility:hidden!important}')
    if mode!='blocked':
     doc=await page.evaluate("JSON.parse(localStorage.getItem('sd-personal-guest-v1')).doc")
     assert doc['saved'][url]['value']is True
    await tap(page,'#ns-results [data-ns-save]');assert await page.locator('#ns-results .ns-empty').count()==1
    await tap(page,'[data-ns-source="external"]');assert await page.locator('#ns-results .ns-wire-card').count()>0
    assert await page.locator('#ns-results [data-ns-save]').count()==0
    if mode=='normal'and width==1440 and theme=='light':await page.screenshot(path=str(OUT/'headlines-desktop-light.png'),style='.pn-wrap{visibility:hidden!important}')
    await tap(page,'.ns-toolbar [data-ns-reset]');await tap(page,'#ns-results [data-ns-related] >> nth=0');assert await page.locator('#next-read .ns-next-stories>a').count()==3
    assert await page.locator('#next-read .ns-context>a').count()==3
    if mode=='normal'and width==1440 and theme=='dark':await page.locator('#next-read').screenshot(path=str(OUT/'trail-desktop-dark.png'),style='.pn-wrap{visibility:hidden!important}')
    await tap(page,'#ns-refresh');await page.wait_for_function("!document.getElementById('ns-refresh').disabled")
    await overflow(page,(width,theme,mode,'final'))
   assert not errors,(width,mode,errors)
   assert not any('supabase.co'in u for u in requests),'unconnected guest touched an account'
   print('PASS',width,theme,mode,flush=True);await ctx.close()
  await browser.close()
asyncio.run(main())

