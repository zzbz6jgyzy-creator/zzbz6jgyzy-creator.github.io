"""X posts load only on request: no platform.twitter.com traffic until the button is pressed, text readable without JS."""
import asyncio,os,pathlib,shutil,subprocess,sys,time,socket
from playwright.async_api import async_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
PAGE='/dispatch/latvia-fsd-tenth-eu.html'
FAKE_WIDGETS="""window.twttr={widgets:{load(el){el.querySelectorAll('blockquote.twitter-tweet').forEach(q=>{const d=document.createElement('div');d.className='fake-x-iframe';d.textContent='LIVE EMBED';q.replaceWith(d)})}}};"""
def free_port():
 s=socket.socket();s.bind(('127.0.0.1',0));p=s.getsockname()[1];s.close();return p
async def main():
 port=free_port();srv=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
 try:
  async with async_playwright()as p:
   browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH')or shutil.which('google-chrome')or shutil.which('chromium'),args=['--no-sandbox'])
   async def ctx(mode):
    c=await browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce',java_script_enabled=mode!='nojs');hits=[]
    async def route(r):
     u=r.request.url
     if 'platform.twitter.com' in u:
      hits.append(u)
      if mode=='ok':await r.fulfill(status=200,content_type='application/javascript',body=FAKE_WIDGETS)
      else:await r.abort()
     elif not u.startswith('http://127.0.0.1'):await r.abort()
     else:await r.continue_()
    await c.route('**/*',route);return c,hits
   for mode in ['ok','fail']:
    c,hits=await ctx(mode);page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto(f'http://127.0.0.1:{port}{PAGE}',wait_until='load');await page.wait_for_timeout(800)
    assert not hits,('third-party request before any click',hits)
    q=page.locator('blockquote.twitter-tweet').first;await expect(q).to_be_visible();assert 'Latvia' in await q.inner_text()
    btn=page.locator('.x-embed-load').first;await expect(btn).to_be_visible();box=await btn.bounding_box();assert box['height']>=44,box
    await btn.click()
    if mode=='ok':
     await expect(page.locator('.fake-x-iframe').first).to_be_visible(timeout=5000);await expect(page.locator('.x-embed-load')).to_have_count(0,timeout=5000);assert hits
    else:
     await expect(btn).to_have_text('Try again',timeout=5000);await expect(page.locator('.x-embed-actions a').first).to_have_attribute('href',__import__('re').compile('x.com/.*/status/'))
    assert not errors,errors;await c.close();print('PASS',mode,flush=True)
   c,hits=await ctx('nojs');page=await c.new_page();await page.goto(f'http://127.0.0.1:{port}{PAGE}',wait_until='load')
   await expect(page.locator('blockquote.twitter-tweet').first).to_be_visible();assert 'Latvia' in await page.locator('blockquote.twitter-tweet').first.inner_text();assert await page.locator('.x-embed-load').count()==0;assert not hits;await c.close();print('PASS no-js',flush=True)
   for scheme in ['light','dark']:
    c=await browser.new_context(viewport={'width':390,'height':900},color_scheme=scheme);await c.route('**/*',lambda r:r.abort() if not r.request.url.startswith('http://127.0.0.1') else r.continue_());page=await c.new_page()
    await page.goto(f'http://127.0.0.1:{port}{PAGE}',wait_until='load');await page.wait_for_timeout(500)
    bg=await page.evaluate("getComputedStyle(document.querySelector('blockquote.twitter-tweet')).backgroundColor");fg=await page.evaluate("getComputedStyle(document.querySelector('blockquote.twitter-tweet p')).color");assert bg!=fg,(bg,fg);await c.close();print('PASS',scheme,flush=True)
   await browser.close()
 finally:srv.terminate()
asyncio.run(main())
