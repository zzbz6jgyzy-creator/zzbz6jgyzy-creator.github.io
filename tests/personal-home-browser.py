"""Personalization journeys use repository assets and mocked accounts, with no live account writes."""
import asyncio,json,mimetypes,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SITE='https://superchargeddaily.com';OUT=Path('/tmp/personal-home');OUT.mkdir(exist_ok=True)
A='00000000-0000-4000-8000-000000000001';B='00000000-0000-4000-8000-000000000002'
SDK="""export function createClient(){return {auth:{getSession:async()=>({data:{session:window.__mockUser?{user:{id:window.__mockUser}}:null}}),getUser:async()=>({data:{user:window.__mockUser?{id:window.__mockUser}:null}}),onAuthStateChange:cb=>{window.__mockAuth=cb;return{data:{subscription:{unsubscribe(){}}}}}},rpc:(name,args)=>({abortSignal:async(signal)=>{const response=await fetch('/__personal_mock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args,user:window.__mockUser}),signal});return await response.json();},then(resolve,reject){return this.abortSignal().then(resolve,reject);}})}}"""
async def main():
 cloud={};writes=[]
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  async def context(width=390,theme='dark',mode='normal',user=None,auto=False):
   ctx=await browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',java_script_enabled=mode!='nojs',service_workers='block')
   init="try{localStorage.setItem('sd-theme',"+json.dumps(theme)+")}catch{};window.__mockUser="+json.dumps(user)+";"
   if auto:init+="localStorage.setItem('sd-personal-sync-account-v1',"+json.dumps(user)+");localStorage.setItem('sd-members-auth','mock');"
   if mode=='storage-blocked':init+="Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked')}});"
   await ctx.add_init_script(init);page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(r):
    u=urlparse(r.request.url)
    if u.hostname!='superchargeddaily.com':return await r.abort()
    if u.path=='/vendor/supabase-2.118.0.js':return await r.fulfill(body=SDK,content_type='text/javascript')
    if u.path=='/__personal_mock':
     q=json.loads(r.request.post_data);uid=q.get('user');current=cloud.get(uid,{'document':None,'revision':0})
     if mode=='sync-offline':return await r.abort()
     if mode=='setup-needed':reply={'error':{'code':'PGRST202','message':'missing'}}
     elif not uid:reply={'error':{'message':'sign_in_required'}}
     elif q['name']=='sd_member_profile':reply={'data':{'display_name':None,'accepted':False,'blocked':False,'moderator':False}}
     elif q['name']=='sd_personal_home':reply={'data':current}
     elif q['args']['p_revision']!=current['revision']:reply={'error':{'message':'revision_conflict'}}
     else:
      current={'document':q['args']['p_document'],'revision':current['revision']+1};cloud[uid]=current;writes.append(uid);reply={'data':current}
     return await r.fulfill(body=json.dumps(reply,sort_keys=True),content_type='application/json')
    if mode=='source-failed' and u.path in ['/data/articles.json','/data/intelligence/bundle.json']:return await r.abort()
    if mode=='blocked-js' and 'personal-home.bundle.'in u.path:return await r.abort()
    f=ROOT/(u.path.lstrip('/')or'index.html')
    if f.is_file()and ROOT in f.resolve().parents:return await r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream')
    return await r.abort()
   await ctx.route('**/*',route);await page.goto(SITE+'/daily.html',wait_until='domcontentloaded')
   if mode not in ['nojs','blocked-js']:await page.wait_for_selector('.ph-enhanced')
   return ctx,page,errors
  async def setup(page,name='Alex',preset='owner'):
   await page.locator('#ph-build').click();await page.locator('[data-preset="'+preset+'"]').click();await page.locator('#ph-next').click();await page.locator('#ph-next').click();await page.locator('[name=nickname]').fill(name);await page.locator('#ph-save-setup').click();assert not await page.locator('#ph-setup').is_visible();assert name in await page.locator('#ph-title').inner_text()
  for width,theme in [(320,'dark'),(390,'dark'),(768,'dark'),(1440,'dark'),(390,'light'),(1440,'light')]:
   ctx,page,errors=await context(width,theme);await page.wait_for_timeout(250)
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,theme,'overflow')
   assert await page.locator('h1').count()==1
   await page.screenshot(path=str(OUT/f'{width}-{theme}-preview.png'))
   await setup(page);await page.locator('#ph-stories').scroll_into_view_if_needed()
   assert await page.locator('.ph-story').count()>0
   first=page.locator('.ph-story [data-mark="saved"]').first;await first.click();assert await page.locator('#ph-saved-count').inner_text()=='1'
   await page.reload();await page.wait_for_selector('.ph-enhanced');assert 'Alex' in await page.locator('#ph-title').inner_text();assert await page.locator('#ph-saved-count').inner_text()=='1'
   await page.locator('[data-feed="discover"]').click();await page.locator('#ph-search').fill('nonexistent zzz');assert await page.locator('.ph-stories .ph-empty').is_visible();await page.locator('[data-show-all]').click();assert await page.locator('.ph-story').count()>0
   await page.locator('.ph-rail [data-edit]').click();await page.screenshot(path=str(OUT/f'{width}-{theme}-setup.png'));await page.keyboard.press('Escape');assert await page.locator('.ph-rail [data-edit]').evaluate('(e)=>e===document.activeElement')
   await page.locator('.ph-preferences summary').click();await page.locator('[data-move-section="stories"][data-direction="-1"]').click();assert await page.locator('[data-section]').nth(1).get_attribute('data-section')=='stories'
   if width in [390,1440]and theme=='dark':
    await page.locator('.ph-preferences summary').click();await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'{width}-personalized.png'));await page.screenshot(path=str(OUT/f'{width}-full.png'),full_page=True)
   assert not errors,(width,theme,errors);print(width,theme,'responsive returning-reader journey passed',flush=True);await ctx.close()
  for mode in ['nojs','blocked-js','source-failed','storage-blocked']:
   ctx,page,errors=await context(mode=mode)
   assert await page.locator('.ph-story').count()>0
   if mode in ['nojs','blocked-js']:assert not await page.locator('#ph-build').is_visible()
   else:
    await setup(page,'Sam','explorer')
    if mode=='storage-blocked':assert 'storage' in (await page.locator('#ph-status').inner_text()).lower()
   assert not errors,(mode,errors);print(mode,'fallback passed',flush=True);await ctx.close()
  ctx,page,errors=await context();await setup(page,'Control')
  await page.locator('.ph-preferences summary').click();await page.locator('#ph-start').check();await page.goto(SITE+'/');await page.wait_for_url(SITE+'/daily.html');await page.wait_for_selector('.ph-enhanced');assert 'Control'in await page.locator('#ph-title').inner_text()
  await page.goto(SITE+'/?view=public',wait_until='domcontentloaded');assert page.url.endswith('/?view=public');await page.goto(SITE+'/daily.html',wait_until='domcontentloaded');await page.wait_for_selector('.ph-enhanced')
  await page.locator('.ph-rail [data-edit]').click();await page.locator('#ph-next').click();await page.locator('#ph-next').click();await page.locator('[name=density][value=compact]').check();await page.locator('#ph-save-setup').click();assert await page.locator('.ph').evaluate('(e)=>e.classList.contains("ph-compact")');assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  await page.locator('.ph-preferences summary').click()
  await page.locator('#ph-import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"not":"a profile"}'});await page.wait_for_function("document.querySelector('#ph-status').textContent.includes('not a valid')");assert 'not a valid'in await page.locator('#ph-status').inner_text();assert 'Control'in await page.locator('#ph-title').inner_text()
  doc=await page.evaluate("JSON.parse(localStorage.getItem('sd-personal-guest-v1')).doc");doc['fields']['name']['value']='Imported Alex'
  payload=json.dumps({'product':'Supercharged Daily personal home','version':1,'document':doc}).encode()
  await page.locator('#ph-import').set_input_files({'name':'good.json','mimeType':'application/json','buffer':payload});await page.get_by_role('button',name='Import my setup',exact=True).click();assert 'Imported Alex'in await page.locator('#ph-title').inner_text()
  await page.locator('#ph-reset').click();await page.get_by_role('button',name='Keep my setup',exact=True).click();assert 'Imported Alex'in await page.locator('#ph-title').inner_text()
  await page.locator('#ph-reset').click();await page.get_by_role('button',name='Reset my personal home',exact=True).click();assert 'Imported Alex'not in await page.locator('#ph-title').inner_text();assert await page.locator('#ph-saved-count').inner_text()=='0'
  assert not errors;await ctx.close();print('start-page routing, compact view, imports and reset passed',flush=True)
  ctx,page,errors=await context(user=A);await setup(page,'Cloud Alex');await page.locator('#ph-connect').click();await page.wait_for_function("document.querySelector('#ph-storage').textContent==='Saved to your account'");assert cloud[A]['document']['fields']['name']['value']=='Cloud Alex'
  await page.locator('.ph-story [data-mark="saved"]').first.click();await page.wait_for_function("document.querySelector('#ph-storage').textContent==='Saved to your account'");await page.locator('.ph-preferences summary').click();await page.locator('#ph-sync-now').click();await page.wait_for_timeout(150);assert len([x for x in cloud[A]['document']['saved'].values()if x['value']])==1
  await page.locator('#ph-sync-now').click();await page.wait_for_timeout(150);assert len(writes)==2,'unchanged database ordering must not cause redundant saves'
  await ctx.close()
  ctx,page,errors=await context(user=A,auto=True);await page.wait_for_function("document.querySelector('#ph-title').textContent.includes('Cloud Alex')");assert await page.locator('#ph-saved-count').inner_text()=='1';assert not errors;await ctx.close();print('cross-device account restore passed',flush=True)
  ctx,page,errors=await context(user=B);await page.locator('#ph-connect').click();await page.wait_for_function("document.querySelector('#ph-storage').textContent==='Saved to your account'");assert 'Cloud Alex'not in await page.locator('#ph-title').inner_text();assert await page.locator('#ph-saved-count').inner_text()=='0';await page.evaluate("window.__mockUser=null;window.__mockAuth('SIGNED_OUT',null)");assert 'Cloud Alex'not in await page.locator('#ph-title').inner_text();assert not errors;await ctx.close();print('account isolation and sign-out passed',flush=True)
  ctx,page,errors=await context(user=A);await page.goto(SITE+'/members.html?return=%2Fdaily.html',wait_until='domcontentloaded');await page.get_by_role('link',name='Continue to your personal home →',exact=True).wait_for();assert not errors;await ctx.close();print('member return offers personal home without a public comment profile',flush=True)
  for mode in ['setup-needed','sync-offline']:
   ctx,page,errors=await context(mode=mode,user=A);await setup(page,'Local safe');await page.locator('#ph-connect').click();await page.wait_for_timeout(400);assert 'Local safe'in await page.locator('#ph-title').inner_text();assert 'Saved to your account'not in await page.locator('#ph-storage').inner_text();assert not errors;await ctx.close();print(mode,'keeps local setup',flush=True)
  await browser.close()
asyncio.run(main())
