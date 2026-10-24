"""Browser integration with the real pinned Supabase client and mocked provider APIs.
Never sends sign-ins, comments, reports or votes to a live project.
Run with Python Playwright + Chromium installed.
"""
import asyncio,base64,json,pathlib,urllib.request,urllib.error,mimetypes,time,sys,os,traceback
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright
R=pathlib.Path(__file__).resolve().parents[1];OUT=R/'dev'/'browser-results';OUT.mkdir(parents=True,exist_ok=True)
SITE='https://superchargeddaily.com';PROJECT='https://luidcuzdrcvmzdxpiiwf.supabase.co';CACHE={}
def live(url):
 if url in CACHE:return CACHE[url]
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept-Encoding':'identity'}),timeout=20) as r:res=(r.status,dict(r.headers),r.read())
 except urllib.error.HTTPError as e:res=(e.code,dict(e.headers),e.read())
 CACHE[url]=res;return res
U='00000000-0000-4000-8000-000000000001'
def session():
 now=int(time.time());enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
 token=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':U,'aud':'authenticated','role':'authenticated','exp':now+3600,'iat':now,'email':'reader@example.test'})+'.'+enc('test-signature')
 user={'id':U,'aud':'authenticated','role':'authenticated','email':'reader@example.test','email_confirmed_at':'2026-10-22T10:00:00Z','app_metadata':{'provider':'google'},'user_metadata':{},'created_at':'2026-10-22T10:00:00Z'}
 return {'access_token':token,'refresh_token':'test-only','expires_at':now+3600,'expires_in':3600,'token_type':'bearer','user':user}
def comment(i='1',**kw):
 return dict({'id':i,'parent_id':None,'body':'A useful perspective. <img src=x onerror="window.commentXss=true">','created_at':'2026-10-22T10:00:00Z','name':'Reader One','moderator':False,'own':False,'status':'published','likes':2,'liked':False,'replies':1},**kw)
def fixture(path):
 main='<section data-members-account aria-label="Member account"></section>' if path=='/members.html' else '<article class="article"><h1>Test article</h1></article>' if path.startswith('/dispatch/') else '<h1>Test hub</h1><section id="lab">Flight lab</section>'
 return '''<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Member regression fixture</title>
 <style>:root{--font:Arial,sans-serif;--bg:#111;--card:#181818;--ink:#eee;--ink-soft:#ccc;--mute:#aaa;--tesla:#e31937;--red-text:#ff6379;--line:#444;--line-strong:#666;--input-bg:#222}body{background:var(--bg);color:var(--ink);margin:16px}main{max-width:760px;margin:auto}a{color:var(--red-text)}.pn-items,.pn-sheet{display:flex;gap:16px;flex-wrap:wrap}</style>
 <link rel="stylesheet" href="/members.css"><script type="module" src="/members.js"></script></head><body>
 <nav><div class="pn-items"><a class="pn-cta" href="/">Home</a></div><div id="pn-ex"></div></nav><aside class="pn-sheet"><div class="pn-sheet-head">Menu</div></aside><main>'''+main+'</main></body></html>'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  results=[]
  async def scenario(name,path,width,logged=False,moderator=False,enabled=True,new=False,theme='dark',synthetic=False,navigation=False):
   context=await browser.new_context(viewport={'width':width,'height':900 if width>500 else 844},is_mobile=width<500)
   if logged:await context.add_init_script('localStorage.setItem("sd-members-auth",'+json.dumps(json.dumps(session()))+');')
   page=await context.new_page();errors=[];calls=[];oauth=[]
   profile={'display_name':None if new else 'Reader','moderator':moderator,'blocked':False,'accepted':not new}
   rows=[comment(),comment('2',body='Another viewpoint.',replies=0)];replyrows=[comment('3',parent_id='1',body='A reply.',replies=0)]
   article_vote={'likes':7,'liked':False};failpost=[True];nextid=[10];failprofile=[new];profile_pending=asyncio.Event();profile_release=asyncio.Event()
   async def route(r):
    url=r.request.url
    if url.startswith(PROJECT):
     headers={'content-type':'application/json','access-control-allow-origin':SITE,'access-control-allow-headers':'*'}
     if r.request.method=='OPTIONS':return await r.fulfill(status=200,headers=headers,body='{}')
     if '/auth/v1/authorize' in url:
      oauth.append(url);return await r.fulfill(status=200,headers={'content-type':'text/html'},body='<p>Test Google redirect</p>')
     if '/auth/v1/logout' in url:return await r.fulfill(status=204,headers=headers,body='')
     if '/auth/v1/user' in url:return await r.fulfill(status=200,headers=headers,body=json.dumps(session()['user']))
     if '/rest/v1/rpc/' in url:
      method=url.split('/rpc/')[1].split('?')[0];args=json.loads(r.request.post_data or '{}');calls.append((method,args))
      if method=='sd_member_profile':data=profile
      elif method=='sd_set_profile':
       if failprofile[0]:
        profile_pending.set();await profile_release.wait();failprofile[0]=False
        return await r.fulfill(status=503,headers=headers,body=json.dumps({'message':'unavailable','code':'503'}))
       profile.update(display_name=args['p_name'],accepted=True);data=profile
      elif method=='sd_comments':
       current=[x for x in replyrows if x['parent_id']==args['p_parent']] if args.get('p_parent') else rows
       current=sorted((x for x in current if not args.get('p_before') or int(x['id'])<int(args['p_before'])),key=lambda x:int(x['id']),reverse=True)
       limit=args.get('p_limit',20);items=current[:limit]
       data={'items':items,'next':items[-1]['id'] if len(current)>limit else None,'count':len(rows)+len(replyrows),'likes':article_vote['likes'],'liked':article_vote['liked']}
      elif method=='sd_vote':
       target=article_vote if args.get('p_comment') is None else next(x for x in rows if x['id']==args['p_comment'])
       if target['liked']!=args['p_active']:target['likes']+=1 if args['p_active'] else -1
       target['liked']=args['p_active'];data={'likes':target['likes'],'liked':target['liked']}
      elif method=='sd_post_comment':
       if failpost[0]:failpost[0]=False;return await r.fulfill(status=503,headers=headers,body=json.dumps({'message':'unavailable','code':'503'}))
       i=str(nextid[0]);nextid[0]+=1;item=comment(i,body=args['p_body'],name=profile['display_name'],own=True,parent_id=args.get('p_parent'),replies=0)
       if args.get('p_parent'):replyrows.insert(0,item);next(x for x in rows if x['id']==args['p_parent'])['replies']+=1
       else:rows.insert(0,item)
       data={'id':i,'status':'published'}
      elif method=='sd_delete_comment':
       item=next(x for x in rows if x['id']==args['p_id']);item.update(status='deleted',body=None);data=None
      elif method=='sd_report_comment':data=None
      elif method=='sd_moderation_queue':data=[dict(rows[0],article='/dispatch/tesla-ai-maps-v15.html',reports=[{'reason':'spam','details':'Please review.'}])]
      elif method=='sd_moderate':data=None
      else:return await r.fulfill(status=400,headers=headers,body=json.dumps({'message':'Unexpected RPC '+method}))
      return await r.fulfill(status=200,headers=headers,body=json.dumps(data))
     return await r.fulfill(status=400,headers=headers,body='{}')
    if url.startswith(SITE+'/'):
     pathurl=urlparse(url).path;f=R/(pathurl.lstrip('/') or 'index.html')
     if synthetic and (pathurl=='/' or pathurl.endswith('.html')):return await r.fulfill(status=200,content_type='text/html',body=fixture(pathurl))
     if pathurl=='/members-config.json':
      config=json.loads((R/'members-config.json').read_text());config['enabled']=enabled
      return await r.fulfill(status=200,content_type='application/json',body=json.dumps(config))
     try:
      if f.is_file() and R in f.resolve().parents:return await r.fulfill(status=200,content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes())
      if synthetic:return await r.abort()
      status,headers,body=await asyncio.to_thread(live,url)
      return await r.fulfill(status=status,headers={k:v for k,v in headers.items() if k.lower() not in ['content-encoding','content-length','transfer-encoding']},body=body)
     except Exception:return await r.abort()
    await r.abort()
   await page.route('**/*',route);page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    await page.goto(SITE+path,wait_until='domcontentloaded',timeout=45000)
    await page.evaluate('document.documentElement.dataset.theme='+json.dumps(theme))
    if '/dispatch/' in path and enabled:
     await page.locator('#comments').wait_for();await page.locator('#comments').scroll_into_view_if_needed()
     await page.locator('#comment-1').wait_for(timeout=20000)
     assert await page.locator('#comment-1 img').count()==0
     assert not await page.evaluate('!!window.commentXss')
     assert '<img src=x' in await page.locator('#comment-1 .sdm-comment-body').inner_text()
     if logged:
      av=page.locator('.sdm-article-reaction .sdm-vote');await av.click();await page.wait_for_function("document.querySelector('.sdm-article-reaction .sdm-vote').getAttribute('aria-pressed')==='true'")
      assert await av.inner_text()=='8';await av.click();await page.wait_for_function("document.querySelector('.sdm-article-reaction .sdm-vote').getAttribute('aria-pressed')==='false'")
      assert await av.inner_text()=='7'
      cv=page.locator('#comment-1 .sdm-vote');await cv.click();await page.wait_for_function("document.querySelector('#comment-1 .sdm-vote').getAttribute('aria-pressed')==='true'")
      assert await cv.inner_text()=='3'
      field=page.locator('#sd-comment-root');await field.fill('My new comment.');submit=page.get_by_role('button',name='Submit comment',exact=True)
      await submit.click();await page.get_by_text('We couldn’t complete that request. Please try again.',exact=True).wait_for()
      assert await field.input_value()=='My new comment.'
      first_nonce=[a['p_nonce'] for m,a in calls if m=='sd_post_comment'][-1]
      await submit.click();await page.get_by_text('Your comment is published.',exact=True).wait_for()
      assert await page.locator('#comment-10').count()==1
      assert first_nonce==[a['p_nonce'] for m,a in calls if m=='sd_post_comment'][-1]
      await page.locator('#comment-1').get_by_role('button',name='View replies (1)',exact=True).click()
      await page.locator('#comment-3').wait_for()
      await page.evaluate('window.savedParent=document.getElementById("comment-1")')
      await page.locator('#comment-1').get_by_role('button',name='Reply',exact=True).click()
      await page.get_by_label('Your reply',exact=True).fill('My reply.');await page.get_by_role('button',name='Submit reply',exact=True).click()
      await page.get_by_text('Your reply is published.',exact=True).wait_for()
      await page.wait_for_function("document.activeElement.id==='comment-11'")
      assert await page.locator('#replies-1').is_visible()
      assert await page.evaluate('window.savedParent===document.getElementById("comment-1")')
      assert 'My reply.' in await page.locator('#comment-11').inner_text()
      await page.wait_for_function("(()=>{const r=document.getElementById('comment-11').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()")
      box=await page.locator('#comment-11').bounding_box();height=await page.evaluate('innerHeight')
      assert box and box['y']>=0 and box['y']+box['height']<=height, (box,height)
      # A parent with no previous replies also gains a visible, focused reply.
      assert not await page.locator('#replies-2').is_visible()
      await page.locator('#comment-2').get_by_role('button',name='Reply',exact=True).click()
      await page.locator('#sd-comment-2').fill('The first reply here.');await page.locator('#reply-form-2').get_by_role('button',name='Submit reply',exact=True).click()
      await page.wait_for_function("document.activeElement.id==='comment-12'")
      assert await page.locator('#replies-2').is_visible()
      assert await page.locator('#comment-12 .sdm-comment-body').inner_text()=='The first reply here.'
      assert await page.locator('#replies-1').is_visible()
      assert await page.locator('.sdm-discussion-head').inner_text()=='Join the discussion\n6 published comments'
      await page.locator('#comment-2').get_by_role('button',name='Report',exact=True).click()
      await page.get_by_label('Details (optional)').fill('Please check this.');await page.get_by_role('button',name='Send report',exact=True).click()
      await page.get_by_text('Report sent to the editor. Thank you.',exact=True).wait_for()
     else:assert await page.get_by_role('link',name='Sign in to comment',exact=True).count()==1
     await page.locator('#comments').screenshot(path=str(OUT/(name+'.png')))
    elif enabled and (path=='/' or navigation):
     await page.locator('#pn-ex [data-member-nav]').wait_for(state='attached')
     assert await page.locator('.sdm-nav-primary').is_visible()==(width>=1200)
     if navigation:
      href=await page.locator('#pn-ex [data-member-nav]').get_attribute('href')
      assert parse_qs(urlparse(href).query)['return']==[path]
      assert all(parse_qs(urlparse(href).query)['return']==[path] for href in await page.locator('[data-member-nav]').evaluate_all('(links)=>links.map(link=>link.getAttribute("href"))'))
      await page.locator('#pn-ex [data-member-nav]').click()
      back=page.get_by_role('link',name='Return to the page →',exact=True);await back.wait_for()
      assert await back.get_attribute('href')==path
      await back.click();await page.wait_for_url(SITE+path)
      await page.locator('#pn-ex [data-member-nav]').wait_for()
     await page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
    elif enabled:
     if logged:
      await page.get_by_label('Public display name',exact=True).wait_for(timeout=20000)
      if new:
       await page.get_by_label('Public display name',exact=True).fill('New Reader');await page.get_by_role('button',name='Save profile',exact=True).click()
       await page.get_by_text('Please accept the community rules.',exact=True).wait_for();assert not any(m=='sd_set_profile' for m,a in calls)
       await page.locator('#sd-member-rules').check();await page.get_by_role('button',name='Save profile',exact=True).click()
       await asyncio.wait_for(profile_pending.wait(),timeout=15)
       assert await page.get_by_role('button',name='Saving…',exact=True).is_disabled()
       await page.get_by_text('Saving your profile…',exact=True).wait_for();profile_release.set()
       await page.get_by_text('We couldn’t complete that request. Please try again.',exact=True).wait_for()
       assert await page.get_by_label('Public display name',exact=True).input_value()=='New Reader'
       assert await page.locator('#sd-member-rules').is_checked()
       assert await page.get_by_role('button',name='Save profile',exact=True).is_enabled()
       await page.get_by_role('button',name='Save profile',exact=True).click()
       await page.get_by_text('Your profile is saved',exact=True).wait_for()
       await page.wait_for_function("document.activeElement.classList.contains('sdm-profile-success')")
       box=await page.locator('.sdm-profile-success').bounding_box();height=await page.evaluate('innerHeight')
       assert box and box['y']>=0 and box['y']+box['height']<=height
       await page.get_by_role('heading',name='Your member profile').wait_for();assert any(m=='sd_set_profile' for m,a in calls)
       await page.reload(wait_until='domcontentloaded');await page.get_by_role('heading',name='Your member profile').wait_for()
       assert await page.get_by_label('Public display name',exact=True).input_value()=='New Reader'
       assert await page.locator('#sd-member-rules').is_checked()
       await page.get_by_role('button',name='Save profile',exact=True).click()
       await page.get_by_text('Your profile is saved',exact=True).wait_for()
       await page.wait_for_function("document.activeElement.classList.contains('sdm-profile-success')")
       await page.get_by_label('Public display name',exact=True).fill('Updated Reader')
       assert await page.locator('.sdm-profile-success').count()==0
       await page.get_by_role('button',name='Save profile',exact=True).click()
       await page.get_by_text('Your profile is saved',exact=True).wait_for()
      if name.startswith('personal-home-return'):
       banner=page.locator('.sdm-profile-success').filter(has=page.locator('a.sdm-button[href="/daily.html"]'))
       await banner.wait_for();await banner.scroll_into_view_if_needed()
       heading=banner.locator(':scope > strong');description=banner.locator(':scope > p');cta=banner.locator(':scope > .sdm-button')
       card=await banner.bounding_box();title=await heading.bounding_box();text=await description.bounding_box();button=await cta.bounding_box()
       assert card and title and text and button
       assert title['width']>card['width']*.75 and text['width']>card['width']*.75,'callout text is squeezed into columns'
       assert title['y']+title['height']<=text['y']+1 and text['y']+text['height']<=button['y']+1,'heading, description and action must stack'
       assert button['height']<=95,'continue button must not become a tall narrow pill'
       if width<=600:assert button['width']>card['width']*.75,'phone action needs the available row width'
       assert await cta.get_attribute('href')=='/daily.html'
       await banner.screenshot(path=str(OUT/(name+'-callout.png')))
      if moderator:
       await page.get_by_role('heading',name='Editor moderation',exact=True).wait_for();assert await page.get_by_role('button',name='Approve',exact=True).count()==0
       await page.locator('#sd-mod-mode').select_option('reported');await page.get_by_text('spam: Please review.').wait_for()
       await page.get_by_role('button',name='Dismiss report',exact=True).click();await page.get_by_text('Moderation saved.',exact=True).wait_for()
     else:await page.get_by_role('button',name='Continue with Google',exact=True).wait_for(timeout=20000)
     if name=='google-pkce':assert await page.get_by_role('link',name='Back to the homepage →',exact=True).get_attribute('href')=='/'
     await page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
     if logged and new:
      await page.get_by_role('button',name='Sign out',exact=True).click();await page.get_by_role('button',name='Continue with Google',exact=True).wait_for()
     if not logged:
      await page.get_by_role('button',name='Continue with Google',exact=True).click();await page.wait_for_timeout(500)
      assert oauth and 'provider=google' in oauth[0] and 'code_challenge=' in oauth[0] and 'code_challenge_method=s256' in oauth[0]
    else:
     await page.get_by_text('Member sign-in opens soon.',exact=False).wait_for()
     assert not calls and await page.locator('[data-member-nav]').count()==0
    if not oauth:assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert not errors,errors
    results.append({'scenario':name,'passed':True,'calls':len(calls),'errors':errors});print(json.dumps(results[-1]),flush=True)
   except Exception as e:
    results.append({'scenario':name,'passed':False,'error':str(e),'traceback':traceback.format_exc(),'errors':errors});print(json.dumps(results[-1]),flush=True)
    await page.screenshot(path=str(OUT/(name+'-failure.png')),full_page=True)
   await context.close()
  cases=[('anonymous-mobile',('/dispatch/tesla-ai-maps-v15.html',390),{}),('member-mobile',('/dispatch/tesla-ai-maps-v15.html',390,True),{}),('new-account-light',('/members.html',320,True),{'new':True,'theme':'light'}),('moderator-desktop',('/members.html',1440,True,True),{}),('google-pkce',('/members.html?return=%2F%2Fevil.example',390),{}),('inactive',('/members.html',390),{'enabled':False}),('nav-900',('/',900),{}),('nav-1024',('/',1024),{}),('nav-1440',('/',1440),{})]
  cases.append(('new-account-mobile',('/members.html',390,True),{'new':True}))
  cases.extend([('reply-visibility-mobile',('/dispatch/test-article.html',390,True),{'synthetic':True}),('nav-dispatch-return',('/dispatch.html',1440),{'synthetic':True,'navigation':True}),('nav-starship-return',('/starship.html#lab',390),{'synthetic':True,'navigation':True})])
  cases.extend([('personal-home-return-320',('/members.html?return=%2Fdaily.html',320,True),{}),('personal-home-return-390',('/members.html?return=%2Fdaily.html',390,True),{}),('personal-home-return-light',('/members.html?return=%2Fdaily.html',390,True),{'theme':'light'}),('personal-home-return-desktop',('/members.html?return=%2Fdaily.html',1440,True),{})])
  selected=set(sys.argv[1:]);await asyncio.gather(*[scenario(name,*args,**kwargs) for name,args,kwargs in cases if not selected or name in selected])
  (OUT/'results.json').write_text(json.dumps(results,indent=2));await browser.close()
  if not all(x['passed'] for x in results):raise SystemExit(1)
asyncio.run(main())
