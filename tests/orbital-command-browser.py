"""Chromium smokes against the built Orbital Command static files."""
import asyncio, mimetypes, os, shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://superchargeddaily.com"
OUT = Path("/tmp/orbital-command")
OUT.mkdir(exist_ok=True)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or shutil.which("chromium"),
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        for width, js, label in ((390, True, "mobile"), (1280, True, "desktop"), (390, False, "nojs")):
            context = await browser.new_context(
                viewport={"width": width, "height": 844},
                java_script_enabled=js,
                reduced_motion="reduce",
            )

            async def route(r):
                u = urlparse(r.request.url)
                if u.hostname != "superchargeddaily.com":
                    return await r.abort()
                rel = u.path.lstrip("/")
                if u.path in ("/orbital-command", "/orbital-command/"):
                    rel = "orbital-command/index.html"
                f = ROOT / rel
                if f.is_file() and ROOT in f.resolve().parents:
                    return await r.fulfill(
                        body=f.read_bytes(),
                        content_type=mimetypes.guess_type(str(f))[0] or "application/octet-stream",
                    )
                return await r.abort()

            await context.route("**/*", route)
            page = await context.new_page()
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))
            await page.goto(SITE + "/orbital-command/", wait_until="domcontentloaded")
            await page.wait_for_timeout(1200)
            html = await page.content()
            assert "Orbital Command" in html
            assert "CelesTrak" in html or "orbital" in html.lower()
            if js:
                await page.wait_for_selector("[data-act='landing-explore']", timeout=20000)
                await page.locator("[data-act='landing-explore']").click()
                await page.locator("[data-act='above']").click()
                await page.locator("[data-act='killarney']").click()
                assert await page.locator("[data-live]").count() == 1
                await page.screenshot(path=str(OUT / f"{label}.png"))
            else:
                assert await page.locator("h1").count() >= 1
                await page.screenshot(path=str(OUT / "nojs.png"))
            if errors:
                print("page errors", errors[:5], flush=True)
            await context.close()
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
