"""News-first acceptance checks in a real browser (docs/design-system.md).

For each page, at 320/390/768/1440 in light and dark: no sideways scroll, one h1 with the plain title, no page
errors, and layout shift under 0.1. At 390x844 the news-first targets from the approved plan:
  homepage: the lead headline sits fully in the first screen, at least 5 headlines start within 1.5 screens, and no
  story repeats between the lead and the latest list; the scripts still fill the live numbers and the launch list.
  articles: the lead photo or video (or the first paragraph when there is none) starts above 700px, with the
  headline, standfirst and byline above it; the h1 is the live article's own.
  Dispatch list and news: the first story card starts above 450px.
  hubs: the first story headline starts in the first screen (above 800px, so at least its first line shows).
  trackers: the tracker's first key number (or the calendar's week strip) is fully inside the first screen.
Run: python3 tests/design-acceptance-browser.py   (CHROMIUM_PATH may point at Chrome or Chromium)
"""
import asyncio, html, os, pathlib, re, shutil, socket, subprocess, sys, time
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SHOTS = pathlib.Path(os.environ.get("DESIGN_SHOTS", "/tmp/design-acceptance"))
CLS_JS = "() => window.__cls || 0"
INIT = """window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value}}).observe({type:'layout-shift',buffered:true})}catch(e){}"""

# Three articles: one with a lead photo, one long contents list, one with the disclosure note
ARTICLES = ["tesla-cybercab-dallas-launch", "starship-every-flight-1-to-15", "spacex-q3-2026-results"]  # live since the switch


def live_h1(rel):
    m = re.search(r"<h1\b[^>]*>(.*?)</h1>", (ROOT / rel).read_text(), re.S)
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", m.group(1))).split())


PAGES = [
    {"path": "/", "h1": "Tesla, SpaceX and xAI news", "kind": "home"},  # switched 23 Nov 2026
    {"path": "/dispatch.html", "h1": "Dispatch", "kind": "list", "card": "[data-disp-grid] > .story-card:not([hidden])"},
    {"path": "/news.html", "h1": "Tesla, SpaceX and Grok news", "kind": "list", "card": "#latest .ns-feature"},
] + [{"path": f"/dispatch/{s}.html", "h1": live_h1(f"dispatch/{s}.html"), "kind": "article"} for s in ARTICLES] + [
    {"path": "/tesla.html", "h1": "Tesla news, trackers and guides", "kind": "hub"},
    {"path": "/spacex.html", "h1": "SpaceX launches, Starship and Starlink", "kind": "hub"},
    {"path": "/grok.html", "h1": "Grok and xAI: models, plans and news", "kind": "hub"},
    {"path": "/fsd-tracker.html", "h1": "FSD tracker", "kind": "tracker", "key": ".ds-tracker-numbers .ft-kpi-value"},
    {"path": "/starship.html", "h1": "Starship flights", "kind": "tracker", "key": "#ss-hero-next"},
    {"path": "/cybercab.html", "h1": "Cybercab fleet", "kind": "tracker", "key": ".mw-metric strong"},
    {"path": "/calendar.html", "h1": "Launch calendar", "kind": "tracker", "key": ".cs-week-strip"},
    {"path": "/starlink.html", "h1": "Starlink tracker", "kind": "tracker", "key": ".ds-tracker-numbers .so-metrics strong"},
    {"path": "/production.html", "h1": "Tesla production and deliveries", "kind": "tracker", "key": "#pd-stats strong"},
]


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


async def check_home(page, tag):
    vh = 844
    r = await page.evaluate("""() => {
      const box = (el) => { const b = el.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY }; };
      const lead = document.querySelector('[data-hv-h]');
      const heads = [lead, ...document.querySelectorAll('.ds-story-list[aria-label="Latest stories"] .ds-story-title')].filter(Boolean).map(box);
      const urls = [document.querySelector('[data-hv-lead]').getAttribute('href'), ...[...document.querySelectorAll('.ds-story-list[aria-label="Latest stories"] a')].map(a => a.getAttribute('href'))];
      return { lead: box(lead), heads: heads.map(h => h.top), urls,
               trk: document.querySelectorAll('[data-hv-trk] .hv-t').length,
               cd: document.querySelector('[data-hv-cd]').children.length };
    }""")
    assert r["lead"]["bottom"] <= vh, (tag, "lead headline not in the first screen", r["lead"])
    assert sum(1 for t in r["heads"] if t < vh * 1.5) >= 5, (tag, "fewer than 5 headlines within 1.5 screens", r["heads"])
    assert len(set(r["urls"])) == len(r["urls"]), (tag, "a story repeats", r["urls"])
    assert r["trk"] >= 3, (tag, "live numbers were not painted")
    assert r["cd"] >= 1, (tag, "launch list is empty")


async def check_article(page, tag):
    r = await page.evaluate("""() => {
      const art = document.querySelector('.rs-article');
      const furniture = '.eyebrow,h1,.standfirst,.meta,.sd-disclosure,.sd-updated,.rs-tools,.sd-article-tools';
      const first = [...art.children].find(e => !e.matches(furniture) && e.getBoundingClientRect().height > 0);
      const top = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
      return { first: first.tagName + '.' + first.className, top: top(first), byline: top(art.querySelector('.meta')),
               tools: top(art.querySelector('.rs-tools')) };
    }""")
    assert r["top"] < 700, (tag, "the lead photo or first paragraph starts too low", r)
    assert r["byline"] < r["top"], (tag, "the byline should sit above the lead", r)
    assert r["tools"] > r["byline"], (tag, "the reading tools should follow the byline, not sit above it", r)


async def check_list(page, tag, card):
    top = await page.evaluate("(sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top + scrollY)", card)
    assert top < 450, (tag, "the first story card starts too low", top)


async def check_hub(page, tag):
    top = await page.evaluate("Math.round(document.querySelector('.ds-hub-stories h3').getBoundingClientRect().top + scrollY)")
    assert top < 800, (tag, "the first story headline is below the first screen", top)


async def check_tracker(page, tag, key):
    r = await page.evaluate("(sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY) }; }", key)
    assert r["bottom"] <= 844, (tag, "the key number is not fully in the first screen", key, r)


async def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    port = free_port()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    failures = []
    try:
        async with async_playwright() as p:
            exe = os.environ.get("CHROMIUM_PATH") or shutil.which("google-chrome") or shutil.which("chromium") or "/opt/pw-browsers/chromium"
            browser = await p.chromium.launch(executable_path=exe, args=["--no-sandbox"])
            for spec in PAGES:
                for scheme in ("dark", "light"):
                    for w in (320, 390, 768, 1440):
                        h = 844 if w == 390 else 900
                        tag = f"{spec['path']} {w} {scheme}"
                        ctx = await browser.new_context(viewport={"width": w, "height": h}, color_scheme=scheme, reduced_motion="reduce")
                        await ctx.add_init_script(INIT)
                        await ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(f"http://127.0.0.1:{port}") else r.abort())
                        page = await ctx.new_page()
                        errors = []
                        page.on("pageerror", lambda e: errors.append(str(e)))
                        try:
                            await page.goto(f"http://127.0.0.1:{port}{spec['path']}", wait_until="load")
                            await page.wait_for_timeout(1500)
                            sx = await page.evaluate("document.documentElement.scrollWidth - innerWidth")
                            assert sx <= 1, (tag, "sideways scroll", sx)
                            h1 = await page.evaluate("[...document.querySelectorAll('h1')].map(x => x.textContent.replace(/\\s+/g, ' ').trim())")
                            assert h1 == [spec["h1"]], (tag, "h1", h1)
                            assert not errors, (tag, "page errors", errors)
                            cut = await page.evaluate("""() => [...document.querySelectorAll('.ds-masthead *')].filter(e => getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth).map(e => e.textContent.trim().slice(0, 40))""")
                            assert not cut, (tag, "masthead text is cut off", cut)
                            cls = await page.evaluate(CLS_JS)
                            assert cls < 0.1, (tag, "layout shift", cls)
                            if w == 390 and spec["kind"] == "home":
                                await check_home(page, tag)
                            if w == 390 and spec["kind"] == "article":
                                await check_article(page, tag)
                            if w == 390 and spec["kind"] == "list":
                                await check_list(page, tag, spec["card"])
                            if w == 390 and spec["kind"] == "hub":
                                await check_hub(page, tag)
                            if w == 390 and spec["kind"] == "tracker":
                                await check_tracker(page, tag, spec["key"])
                            if w in (390, 1440):
                                await page.screenshot(path=str(SHOTS / f"{spec['path'].strip('/').replace('/', '_')}-{w}-{scheme}.png"), full_page=True)
                            print("PASS", tag)
                        except AssertionError as e:
                            failures.append(e)
                            print("FAIL", e)
                        await ctx.close()
            await browser.close()
    finally:
        srv.terminate()
    if failures:
        sys.exit(1)


asyncio.run(main())
