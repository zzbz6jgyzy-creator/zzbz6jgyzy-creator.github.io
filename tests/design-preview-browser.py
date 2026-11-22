"""Redesign preview acceptance checks in a real browser (docs/design-system.md, plan step 1).

For each preview page, at 320/390/768/1440 in light and dark: no sideways scroll, one h1 with the plain title, no page
errors, and layout shift under 0.1. At 390x844 the news-first targets from the approved plan:
  homepage: the lead headline sits fully in the first screen, at least 5 headlines start within 1.5 screens, and no
  story repeats between the lead and the latest list; the scripts still fill the live numbers and the launch list.
Run: python3 tests/design-preview-browser.py   (CHROMIUM_PATH may point at Chrome or Chromium)
"""
import asyncio, os, pathlib, shutil, socket, subprocess, sys, time
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SHOTS = pathlib.Path(os.environ.get("PREVIEW_SHOTS", "/tmp/design-preview"))
CLS_JS = "() => window.__cls || 0"
INIT = """window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value}}).observe({type:'layout-shift',buffered:true})}catch(e){}"""

PAGES = [
    {"path": "/preview/index.html", "h1": "Tesla, SpaceX and xAI news", "kind": "home"},
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
                            h1 = await page.evaluate("[...document.querySelectorAll('h1')].map(x => x.textContent.trim())")
                            assert h1 == [spec["h1"]], (tag, "h1", h1)
                            assert not errors, (tag, "page errors", errors)
                            cls = await page.evaluate(CLS_JS)
                            assert cls < 0.1, (tag, "layout shift", cls)
                            if w == 390 and spec["kind"] == "home":
                                await check_home(page, tag)
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
