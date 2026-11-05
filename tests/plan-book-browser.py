"""Book edition of Tesla: The Plan (hidden preview): pagination keeps every word once, in order; pages flip; contents jump."""
import asyncio, json, mimetypes, os, re, shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://superchargeddaily.com'
PAGE = SITE + '/tesla-the-plan-book.html'
NORM = "s=>s.replace(/\\s+/g,' ').trim()"


async def serve(route):
    path = urlparse(route.request.url).path
    if path == '/':
        path = '/index.html'
    f = ROOT / path.lstrip('/')
    if f.is_file():
        await route.fulfill(status=200, body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    else:
        await route.fulfill(status=404, body=b'')


async def check(browser, width, height, theme):
    ctx = await browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', service_workers='block')
    await ctx.add_init_script("try{localStorage.setItem('sd-theme'," + json.dumps(theme) + ");}catch{}")
    await ctx.route(SITE + '/**', serve)
    page = await ctx.new_page()
    problems = []
    page.on('pageerror', lambda e: problems.append('pageerror ' + str(e)))
    page.on('console', lambda m: problems.append(m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
    await page.goto(PAGE, wait_until='load')
    await page.wait_for_function('window.__planBook && window.__planBook.flip', timeout=20000)
    info = await page.evaluate('({pages:window.__planBook.pages,spread:window.__planBook.layout.spread,toc:window.__planBook.tocStart,body:window.__planBook.bodyStart,credits:window.__planBook.creditsStart})')
    tag = f'{width}x{height} {theme}'

    assert info['spread'] == (width >= 900), (tag, info)
    assert info['pages'] >= 30 and info['pages'] % 2 == 0, (tag, info)
    assert info['body'] > info['toc'] >= 3, (tag, info)

    # robots and canonical: the preview must stay hidden
    robots = await page.evaluate("document.querySelector('meta[name=robots]').content")
    assert 'noindex' in robots, robots
    canonical = await page.evaluate("document.querySelector('link[rel=canonical]').href")
    assert canonical.endswith('/dispatch/tesla-the-plan-complete-story.html'), canonical

    # every word of the article once, in order
    shown = await page.evaluate("""() => {
      const n = s => s.replace(/\\s+/g, ' ').trim();
      const pick = k => Array.from(document.querySelectorAll('.pb-page')).filter(p => p.classList.contains(k)).map(p => Array.from(p.querySelector('.pb-inner').children).map(c => n(c.textContent)).join(' ')).join(' ');
      return n(pick('pb-body-page') + ' ' + pick('pb-credits'));
    }""")
    template = await page.evaluate("""() => {
      const n = s => s.replace(/\\s+/g, ' ').trim();
      const t = document.getElementById('pb-source').content;
      const blocks = sel => Array.from(t.querySelector(sel).children).map(c => n(c.textContent)).join(' ');
      return n(blocks('[data-pb=body]') + ' ' + blocks('[data-pb=credits]'));
    }""")
    assert shown == template, (tag, 'text differs', len(shown), len(template))
    assert len(template.split()) > 9000, len(template.split())

    # duplicates: no id on a page element (the library clones pages)
    ids = await page.evaluate("Array.from(document.querySelectorAll('.pb-page [id]')).length")
    assert ids == 0, ids

    # no page overflows (measured by briefly showing each page)
    over = await page.evaluate("""() => {
      const bad = [];
      document.querySelectorAll('.pb-page').forEach((p, i) => {
        const L = window.__planBook.layout, was = [p.style.display, p.style.visibility, p.style.width, p.style.height];
        p.style.display = 'block'; p.style.visibility = 'hidden'; p.style.width = L.pw + 'px'; p.style.height = L.ph + 'px';
        const inner = p.querySelector('.pb-inner');
        if (inner.scrollHeight > inner.clientHeight + 1 && !p.classList.contains('pb-cover') && !p.classList.contains('pb-backcover')) bad.push(i);
        p.style.display = was[0]; p.style.visibility = was[1]; p.style.width = was[2]; p.style.height = was[3];
      });
      return bad;
    }""")
    assert not over, (tag, 'overflowing pages', over)

    # controls
    status = page.locator('[data-pb-status]')
    assert (await status.inner_text()) == 'Cover'
    assert await page.locator('[data-pb-prev]').is_disabled()
    await page.locator('[data-pb-next]').click()
    await page.wait_for_function('window.__planBook.index >= 1', timeout=5000)
    text = await status.inner_text()
    assert 'of' in text and text != 'Cover', text
    await page.keyboard.press('ArrowRight')
    await page.wait_for_function('window.__planBook.index >= 2', timeout=5000)
    await page.keyboard.press('ArrowLeft')
    await page.wait_for_timeout(400)
    await page.keyboard.press('End')
    await page.wait_for_function(f"window.__planBook.index === {info['pages'] - 1}", timeout=5000)
    await page.wait_for_timeout(400)
    assert await page.locator('[data-pb-next]').is_disabled()
    got = await status.inner_text()
    assert got == 'Back cover', got
    await page.keyboard.press('Home')
    await page.wait_for_function('window.__planBook.index === 0', timeout=5000)

    # contents: a row jumps to the page that holds the chapter
    await page.locator('[data-pb-contents]').click()
    await page.wait_for_function(f"window.__planBook.index >= {info['toc']} - 1", timeout=5000)
    row = page.locator('.pb-toc-row:visible', has_text='Part six: the Model S').first
    await row.wait_for(state='visible', timeout=5000)
    target = int(await row.get_attribute('data-page'))
    await row.click()
    await page.wait_for_function(f"Math.abs(window.__planBook.index - {target}) <= 1", timeout=8000)
    heading = await page.evaluate("""n => {
      const all = Array.from(document.querySelectorAll('.pb-page'));
      return n < all.length && !!all[n].querySelector('h2[data-ch-title]') && all[n].querySelector('h2[data-ch-title]').dataset.chTitle;
    }""", target)
    assert heading == 'Part six: the Model S', (tag, heading, target)

    # a page of reading text is legible: enough characters, readable size
    fs = await page.evaluate("parseFloat(getComputedStyle(document.querySelector('.pb-body-page .pb-inner')).fontSize)")
    assert fs >= 14, fs
    assert await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")

    real = [p for p in problems if 'favicon' not in p]
    assert not real, (tag, real)
    await ctx.close()
    return tag, info


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or os.environ.get('CHROMIUM_PATH') or shutil.which('google-chrome') or shutil.which('chromium'), headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for w, h, t in [(390, 844, 'dark'), (768, 1024, 'light'), (1440, 900, 'dark'), (1440, 900, 'light')]:
            tag, info = await check(browser, w, h, t)
            print('PASS', tag, info, flush=True)
        await browser.close()


asyncio.run(main())
