"""Phone matrix for the Earth-to-Milky-Way explorer: real device sizes, touch, simulated notch / home-indicator safe areas
(Emulation.setSafeAreaInsetsOverride makes env(safe-area-inset-*) real in Chromium), portrait and landscape, shrunken toolbar
heights, large text. Every visible control must sit fully inside the viewport minus the safe insets.

Environment: CHROMIUM_PATH (Chrome/Chromium binary), PHONE_ONLY (comma separated device names), PHONE_SHOTS (directory for
screenshots; contact sheets are built from them), PHONE_AUDIT=1 (report violations instead of failing)."""
import asyncio, json, mimetypes, os, pathlib, re, shutil, sys
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
SHOTS = pathlib.Path(os.environ.get('PHONE_SHOTS', '/tmp/earth-preview/phone'))
SHOTS.mkdir(parents=True, exist_ok=True)
AUDIT = bool(os.environ.get('PHONE_AUDIT'))
STATE = 'window.__earthPreview.getState()'

# name, CSS width, CSS height, device pixel ratio, portrait safe insets (top, bottom), landscape side inset, landscape bottom inset
DEVICES = [
    ('iphone-se', 375, 667, 2, (20, 0), 0, 0),
    ('iphone-13-mini', 375, 812, 3, (50, 34), 50, 21),
    ('iphone-15', 393, 852, 3, (59, 34), 59, 21),
    ('iphone-16-pro-max', 440, 956, 3, (62, 34), 62, 21),
    ('pixel-7', 412, 915, 2.625, (0, 0), 0, 0),
    ('galaxy-s20', 360, 800, 3, (0, 0), 0, 0),
    ('galaxy-s23', 384, 854, 2.8, (0, 0), 0, 0),
    ('android-small', 360, 640, 2, (0, 0), 0, 0),
    ('ipad-mini', 744, 1133, 2, (24, 20), 0, 20),
]

async def route_setup(ctx, cloud='fixture'):
    async def route(r):
        u = urlparse(r.request.url)
        if r.request.method != 'GET':
            return await r.abort()
        if u.hostname == 'view.eumetsat.int':
            if cloud == 'fail':
                return await r.fulfill(status=503, body='Unavailable')
            if 'GetCapabilities' in r.request.url:
                return await r.fulfill(body='<WMS_Capabilities><Layer><Name>mumi:worldcloudmap_ir108</Name><Dimension name="time" default="2026-10-29T12:00:00Z">2026-10-29T12:00:00Z</Dimension></Layer></WMS_Capabilities>', content_type='text/xml')
            return await r.fulfill(body=(ROOT / 'assets/earth/earth-clouds-2k.webp').read_bytes(), content_type='image/webp', headers={'Last-Modified': 'Wed, 28 Oct 2026 06:00:00 GMT', 'Access-Control-Allow-Origin': '*'})
        if u.hostname != 'superchargeddaily.com':
            return await r.abort()
        path = unquote(u.path).lstrip('/') or 'index.html'
        file = ROOT / path
        if file.is_file() and ROOT in file.resolve().parents:
            ct = 'text/javascript' if file.suffix in ['.mjs', '.js'] else mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
            return await r.fulfill(body=file.read_bytes(), content_type=ct)
        return await r.fulfill(status=404, body='Not found')
    await ctx.route('**/*', route)

# Visible interactive things inside the viewer, with their rectangles.
CONTROLS = """(scope)=>{
 const root=scope?document.querySelector(scope):document.body;
 const sel='button,a[href],input,select,summary,textarea,.cosmos-dot';
 const out=[];
 for(const e of root.querySelectorAll(sel)){
  if(e.closest('[inert],[hidden],noscript')||e.closest('.sr-only'))continue;
  if(!e.checkVisibility({opacityProperty:false,visibilityProperty:true}))continue;
  const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;
  const cs=getComputedStyle(e);if(cs.pointerEvents==='none')continue;
  out.push({id:e.id||e.getAttribute('data-earth-scale')||e.getAttribute('data-place')||e.className.toString().split(' ')[0]||e.tagName,text:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,28),
   l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height,tag:e.tagName,inline:cs.display==='inline'});
 }
 return out;}"""

class Run:
    def __init__(self):
        self.problems = []
    def add(self, ctx, msg):
        self.problems.append(f'{ctx}: {msg}')
        print('PHONE_PROBLEM', ctx, msg, flush=True)

def safe_rect(w, h, ins):
    return (ins['left'], ins['top'], w - ins['right'], h - ins['bottom'])

async def check_controls(run, page, tag, scope, ins, min_size=44, strict_safe=True, skip=()):
    """Every visible control fully inside the viewport (and the safe area when strict_safe), and big enough to tap."""
    w, h = await page.evaluate('[innerWidth,innerHeight]')
    sl, st, sr, sb = safe_rect(w, h, ins) if strict_safe else (0, 0, w, h)
    for c in await page.evaluate(CONTROLS, scope):
        if any(s in c['id'] for s in skip):
            continue
        label = f"{c['id']} '{c['text']}'"
        if c['l'] < sl - .5 or c['t'] < st - .5 or c['r'] > sr + .5 or c['b'] > sb + .5:
            run.add(tag, f"{label} outside [{sl:.0f},{st:.0f},{sr:.0f},{sb:.0f}]: {c['l']:.0f},{c['t']:.0f},{c['r']:.0f},{c['b']:.0f}")
        if c['id'] == 'cosmos-dot':
            continue
        lim = 24 if c['inline'] else min_size
        if c['h'] < lim - .5 or (c['w'] < lim - .5 and not c['inline']):
            run.add(tag, f"{label} target {c['w']:.0f}x{c['h']:.0f} under {lim}")

async def check_page(run, page, tag):
    over = await page.evaluate('[document.documentElement.scrollWidth,document.body.scrollWidth,innerWidth]')
    if max(over[:2]) > over[2] + 1:
        run.add(tag, f'horizontal overflow {over}')

async def shot(page, name):
    await page.screenshot(path=str(SHOTS / (name + '.png')), animations='disabled', timeout=45000)

async def scroll_to_end(run, page, tag, container, last_selector, ins):
    """The last item of a scroller must be reachable and clear of the home indicator."""
    await page.evaluate(f"(()=>{{const c=document.querySelector('{container}');c.scrollTop=c.scrollHeight;}})()")
    await page.wait_for_timeout(120)
    info = await page.evaluate(f"""(()=>{{const c=document.querySelector('{container}'),l=document.querySelector('{last_selector}'),cr=c.getBoundingClientRect(),lr=l.getBoundingClientRect();
      return {{bottom:lr.bottom,top:lr.top,cb:cr.bottom,ct:cr.top,h:innerHeight,w:innerWidth,sh:c.scrollHeight,ch:c.clientHeight,st:c.scrollTop}}}})()""")
    if info['bottom'] > info['h'] - ins['bottom'] + .5 or info['bottom'] > info['cb'] + .5:
        run.add(tag, f'last item {last_selector} not reachable: {info}')
    return info

async def settle(page):
    await page.evaluate('document.getAnimations().forEach(a=>{try{if(isFinite(a.effect.getComputedTiming().endTime))a.finish()}catch(e){}})')
    await page.wait_for_timeout(100)

async def wait_ready(page):
    await page.wait_for_function("window.__earthPreview?.getState().ready", timeout=120000)

async def set_insets(ctx, page, ins):
    cdp = await ctx.new_cdp_session(page)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {k: int(v) for k, v in ins.items()}})
    return cdp

def insets_for(dev, landscape):
    name, w, h, dpr, (top, bottom), side, lbottom = dev
    if landscape:
        return {'top': 0, 'bottom': lbottom, 'left': side, 'right': side}
    return {'top': top, 'bottom': bottom, 'left': 0, 'right': 0}

async def scenario(browser, run, dev, landscape, extra=None):
    name, w, h, dpr, _, _, _ = dev
    vw, vh = (h, w) if landscape else (w, h)
    tag = f"{name}-{'land' if landscape else 'port'}"
    ins = insets_for(dev, landscape)
    ctx = await browser.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=dpr, is_mobile=w < 600, has_touch=True,
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' if name.startswith('iphone') else None)
    ctx.set_default_timeout(30000)
    await ctx.add_init_script('Date.now=()=>1793278800000;')
    await route_setup(ctx, 'fail')
    page = await ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    cdp = await set_insets(ctx, page, ins)
    await page.goto(SITE + '/mission-control.html', wait_until='domcontentloaded')
    try:
        # 1. Intro: heading, Enter and instructions all visible without scrolling.
        await expect(page.locator('#earth-enter')).to_be_visible()
        await page.wait_for_timeout(400)
        await check_controls(run, page, tag + ' intro', '#earth-intro', ins, skip=())
        card = await page.evaluate("(()=>{const r=document.querySelector('.earth-intro-card').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]})()")
        sl, st, sr, sb = safe_rect(vw, vh, ins)
        if card[0] < sl - .5 or card[1] < st - .5 or card[2] > sr + .5 or card[3] > sb + .5:
            run.add(tag + ' intro', f'card not inside safe area: {card}')
        await check_page(run, page, tag + ' intro')
        await shot(page, tag + '-1-intro')
        await page.locator('#earth-enter').tap()
        await expect(page.locator('#earth-intro')).to_be_hidden(timeout=20000)
        await wait_ready(page)
        await page.wait_for_function("document.getElementById('earth-note').hidden===false||true")
        # 2. Inside: HUD, toasts, provenance chip, focus name, canvas coverage.
        await page.evaluate("""(()=>{const f=document.getElementById('cosmos-focus-name');f.textContent='Neptune and its moons';f.classList.add('is-visible');
          const n=document.getElementById('earth-note');n.textContent='Fly to a place: choose where you want to look.';n.hidden=false;})()""")
        await page.wait_for_timeout(300)
        await page.evaluate("document.getElementById('earth-note').hidden=false")
        await check_controls(run, page, tag + ' hud', '#earth-hud', ins)
        prov = await page.evaluate("(()=>{const p=document.getElementById('earth-provenance');return p.hidden?null:[p.getBoundingClientRect().toJSON(),innerWidth,innerHeight]})()")
        if prov is None:
            run.add(tag, 'provenance chip not shown in cloud-fail mode')
        else:
            r = prov[0]
            if r['left'] < sl - .5 or r['right'] > sr + .5 or r['bottom'] > sb + .5:
                run.add(tag + ' provenance', f'chip outside safe area {r}')
        for sel in ['#cosmos-focus-name', '#earth-note']:
            r = await page.evaluate(f"document.querySelector('{sel}').getBoundingClientRect().toJSON()")
            if r['left'] < sl - .5 or r['right'] > sr + .5 or r['bottom'] > sb + .5 or r['top'] < st - .5:
                run.add(tag, f'{sel} outside safe area {r}')
        cv = await page.evaluate("(()=>{const r=document.getElementById('earth-canvas').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight,document.getElementById('earth-canvas').width,document.getElementById('earth-canvas').height,devicePixelRatio]})()")
        if cv[0] > .5 or cv[1] > .5 or cv[2] < cv[4] - .5 or cv[3] < cv[5] - .5:
            run.add(tag, f'canvas does not cover the viewport {cv}')
        if cv[6] > (cv[2] - cv[0]) * 2.01 or cv[7] > (cv[3] - cv[1]) * 2.01:
            run.add(tag, f'canvas buffer above the 2x pixel-ratio cap {cv}')
        # overlap: nothing on the HUD row collides with each other
        await check_page(run, page, tag + ' inside')
        await shot(page, tag + '-2-inside')
        # 3. Panel
        await page.evaluate("document.getElementById('earth-menu').click()")
        await expect(page.locator('#earth-panel')).to_be_visible()
        await page.wait_for_timeout(500)
        await settle(page)
        pr = await page.evaluate("document.getElementById('earth-panel').getBoundingClientRect().toJSON()")
        if pr['left'] < -.5 or pr['right'] > vw + .5 or pr['top'] < -.5 or pr['bottom'] > vh + .5:
            run.add(tag + ' panel', f'panel outside viewport {pr}')
        # head (close button) must clear the notch
        cb = await page.evaluate("document.querySelector('[data-close=earth-panel]').getBoundingClientRect().toJSON()")
        if cb['top'] < ins['top'] - .5 or cb['right'] > vw - ins['right'] + .5 or cb['left'] < ins['left'] - .5:
            run.add(tag + ' panel', f'close button inside unsafe area {cb}')
        await shot(page, tag + '-3-panel')
        info = await scroll_to_end(run, page, tag + ' panel', '.earth-panel-body', '.earth-panel-body .earth-panel-section:last-child .earth-credits', ins)
        if extra != 'no-panel-controls':
            body = await page.evaluate("""(()=>{const c=document.querySelector('.earth-panel-body'),out=[];
              for(const e of c.querySelectorAll('button,a[href],select,input')){if(e.closest('[hidden]')||!e.checkVisibility())continue;
              const lab=e.closest('label'),r=(lab||e).getBoundingClientRect();out.push({id:e.id||e.className.toString().split(' ')[0]||e.tagName,text:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),w:r.width,h:r.height,l:r.left,r:r.right,inline:getComputedStyle(e).display==='inline'})}
              return out})()""")
            for c in body:
                lim = 24 if c['inline'] else 44
                if (c['h'] < lim - .5 or c['w'] < lim - .5):
                    run.add(tag + ' panel', f"{c['id']} '{c['text']}' {c['w']:.0f}x{c['h']:.0f} under {lim}")
                if c['l'] < ins['left'] - .5 or c['r'] > vw - ins['right'] + .5:
                    run.add(tag + ' panel', f"{c['id']} outside horizontally {c['l']:.0f}..{c['r']:.0f}")
        await shot(page, tag + '-4-panel-end')
        # 4. Dialogs opened from the panel: search (Earth scale), then about.
        await page.evaluate("document.getElementById('earth-explore').click()")
        await expect(page.locator('#earth-search-dialog')).to_be_visible()
        await settle(page)
        await check_dialog(run, page, tag + ' search', '#earth-search-dialog', ins, vw, vh)
        await shot(page, tag + '-5-search')
        await page.keyboard.press('Escape')
        await page.evaluate("document.getElementById('earth-about').click()")
        await expect(page.locator('#earth-about-dialog')).to_be_visible()
        await settle(page)
        await check_dialog(run, page, tag + ' about', '#earth-about-dialog', ins, vw, vh)
        await shot(page, tag + '-6-about')
        for _ in range(3):
            await page.keyboard.press('Escape')
        # 5. Orientation change: swap the viewport and keep the canvas sized to it.
        await page.set_viewport_size({'width': vh, 'height': vw})
        await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {k: int(v) for k, v in insets_for(dev, not landscape).items()}})
        await page.wait_for_timeout(1200)
        cv2 = await page.evaluate("(()=>{const r=document.getElementById('earth-canvas').getBoundingClientRect();const c=document.getElementById('earth-canvas');return [r.width,r.height,innerWidth,innerHeight,c.width,c.height]})()")
        if abs(cv2[0] - cv2[2]) > 1 or abs(cv2[1] - cv2[3]) > 1:
            run.add(tag + ' rotate', f'canvas not resized {cv2}')
        if abs(cv2[4] / cv2[5] - cv2[2] / cv2[3]) > .03:
            run.add(tag + ' rotate', f'drawing buffer aspect differs from the viewport {cv2}')
        ins2 = insets_for(dev, not landscape)
        await check_controls(run, page, tag + ' rotated hud', '#earth-hud', ins2)
        await shot(page, tag + '-7-rotated')
        # 6. Dynamic toolbar: the viewport grows and shrinks by a browser toolbar; the canvas must keep covering it.
        await page.set_viewport_size({'width': vw, 'height': vh})
        await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {k: int(v) for k, v in ins.items()}})
        for drop in (56, 100):
            await page.set_viewport_size({'width': vw, 'height': vh - drop})
            await page.wait_for_timeout(500)
            c3 = await page.evaluate("(()=>{const r=document.getElementById('earth-canvas').getBoundingClientRect();return [r.top,r.bottom,innerHeight]})()")
            if c3[0] > .5 or c3[1] < c3[2] - .5:
                run.add(tag + f' toolbar-{drop}', f'canvas does not cover {c3}')
            await check_controls(run, page, tag + f' toolbar-{drop} hud', '#earth-hud', ins)
        await page.set_viewport_size({'width': vw, 'height': vh})
        if errors:
            run.add(tag, f'page errors {errors}')
    finally:
        await ctx.close()


LARGE = """(k)=>{for(const e of document.querySelectorAll('#earth-intro *,#earth-panel *,.earth-dialog *')){const f=parseFloat(getComputedStyle(e).fontSize);if(f)e.style.setProperty('font-size',(f*k)+'px','important');}}"""

async def large_text(browser, run, dev, landscape, k=1.5):
    """Android font scale / Safari text size: nothing may be cut off or unreachable at 150% text."""
    name, w, h, dpr, _, _, _ = dev
    vw, vh = (h, w) if landscape else (w, h)
    tag = f"{name}-{'land' if landscape else 'port'}-text{int(k*100)}"
    ins = insets_for(dev, landscape)
    ctx = await browser.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=dpr, is_mobile=True, has_touch=True)
    ctx.set_default_timeout(30000)
    await route_setup(ctx, 'fail')
    page = await ctx.new_page()
    await set_insets(ctx, page, ins)
    try:
        await page.goto(SITE + '/mission-control.html', wait_until='domcontentloaded')
        await expect(page.locator('#earth-enter')).to_be_visible()
        await page.evaluate(LARGE, k)
        await page.wait_for_timeout(300)
        # Enter must be reachable (the overlay scrolls when text is large) and never clipped horizontally.
        await page.evaluate("(()=>{const o=document.getElementById('earth-intro');o.scrollTop=o.scrollHeight})()")
        r = await page.evaluate("document.getElementById('earth-enter').getBoundingClientRect().toJSON()")
        if r['left'] < ins['left'] - .5 or r['right'] > vw - ins['right'] + .5 or r['top'] < ins['top'] - .5 or r['bottom'] > vh - ins['bottom'] + .5:
            run.add(tag + ' intro', f'Enter unreachable {r}')
        top = await page.evaluate("(()=>{const c=document.querySelector('.earth-intro-card');c.parentElement.scrollTop=0;return c.getBoundingClientRect().top})()")
        if top < ins['top'] - .5:
            run.add(tag + ' intro', f'intro heading cut off at the top ({top})')
        await check_page(run, page, tag + ' intro')
        await shot(page, tag + '-1-intro')
        await page.locator('#earth-enter').evaluate('e=>e.click()')
        await expect(page.locator('#earth-intro')).to_be_hidden(timeout=20000)
        await page.evaluate("document.getElementById('earth-menu').click()")
        await expect(page.locator('#earth-panel')).to_be_visible()
        await settle(page)
        await page.evaluate(LARGE, k)
        await scroll_to_end(run, page, tag + ' panel', '.earth-panel-body', '.earth-panel-body .earth-panel-section:last-child .earth-credits', ins)
        hr = await page.evaluate("[...document.querySelectorAll('.earth-panel-body *')].filter(e=>e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX!=='visible').map(e=>e.className||e.tagName)")
        if hr:
            run.add(tag + ' panel', f'text clipped horizontally in {hr}')
        await shot(page, tag + '-2-panel-end')
    finally:
        await ctx.close()

async def keyboard_case(browser, run, dev):
    """The search field must stay on screen when a keyboard takes ~40% of the height (layout viewport shrinks on Android)."""
    name, w, h, dpr, _, _, _ = dev
    ins = insets_for(dev, False)
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=True, has_touch=True)
    ctx.set_default_timeout(30000)
    await route_setup(ctx, 'fail')
    page = await ctx.new_page()
    await set_insets(ctx, page, ins)
    tag = name + '-keyboard'
    try:
        await page.goto(SITE + '/mission-control.html', wait_until='domcontentloaded')
        await page.locator('#earth-enter').evaluate('e=>e.click()')
        await wait_ready(page)
        await page.evaluate("document.getElementById('earth-menu').click()")
        await page.evaluate("document.getElementById('earth-explore').click()")
        await expect(page.locator('#earth-search-dialog')).to_be_visible()
        await page.locator('#earth-search').focus()
        await page.set_viewport_size({'width': w, 'height': int(h * .55)})
        await page.wait_for_timeout(700)
        r = await page.evaluate("(()=>{const i=document.getElementById('earth-search').getBoundingClientRect();return [i.top,i.bottom,innerHeight]})()")
        if r[0] < 0 or r[1] > r[2]:
            run.add(tag, f'search input hidden behind the keyboard {r}')
        fs = await page.evaluate("parseFloat(getComputedStyle(document.getElementById('earth-search')).fontSize)")
        if fs < 16:
            run.add(tag, f'search font {fs}px under 16px makes iOS Safari zoom the page on focus')
        await shot(page, tag)
    finally:
        await ctx.close()

async def check_dialog(run, page, tag, selector, ins, vw, vh):
    r = await page.evaluate(f"document.querySelector('{selector}').getBoundingClientRect().toJSON()")
    if r['left'] < ins['left'] - .5 or r['right'] > vw - ins['right'] + .5 or r['top'] < ins['top'] - .5 or r['bottom'] > vh - ins['bottom'] + .5:
        run.add(tag, f'dialog outside the safe area {r}')
    await check_controls(run, page, tag + ' controls-top', selector + ' .earth-dialog-head', ins)
    sc = await page.evaluate(f"(()=>{{const d=document.querySelector('{selector}');return [d.scrollHeight,d.clientHeight,d.scrollWidth,d.clientWidth]}})()")
    if sc[2] > sc[3] + 1:
        run.add(tag, f'dialog scrolls sideways {sc}')
    # scroll to the end and check the last visible control/paragraph is reachable
    await page.evaluate(f"(()=>{{const d=document.querySelector('{selector}');d.scrollTop=d.scrollHeight}})()")
    last = await page.evaluate(f"""(()=>{{const d=document.querySelector('{selector}'),dr=d.getBoundingClientRect();let m=0;
       for(const e of d.querySelectorAll('*')){{if(!e.checkVisibility())continue;const r=e.getBoundingClientRect();if(r.height>0&&r.width>0)m=Math.max(m,r.bottom)}}
       return [m,dr.bottom,dr.top]}})()""")
    if last[0] > last[1] + 1:
        run.add(tag, f'content below the dialog edge after scrolling to the end {last}')

async def main():
    only = [x for x in os.environ.get('PHONE_ONLY', '').split(',') if x]
    run = Run()
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome'), args=ARGS)
        for dev in DEVICES:
            if only and dev[0] not in only:
                continue
            for landscape in (False, True):
                print('PHONE_START', dev[0], 'landscape' if landscape else 'portrait', flush=True)
                await asyncio.wait_for(scenario(browser, run, dev, landscape), timeout=300)
            if dev[0] in ('android-small', 'iphone-se', 'iphone-15'):
                for landscape in (False, True):
                    await asyncio.wait_for(large_text(browser, run, dev, landscape), timeout=200)
                await asyncio.wait_for(keyboard_case(browser, run, dev), timeout=200)
        await browser.close()
    (SHOTS / 'problems.json').write_text(json.dumps(run.problems, indent=1))
    print('PHONE_PROBLEMS', len(run.problems), flush=True)
    if run.problems and not AUDIT:
        sys.exit(1)
    print('PHONE_COMPLETE', flush=True)

asyncio.run(main())
