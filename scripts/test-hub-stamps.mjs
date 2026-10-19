import fs from "fs";
import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const SHOT = process.env.SHOT || "/opt/cursor/artifacts";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const tesla = fs.readFileSync("tesla.html", "utf8");
const spacex = fs.readFileSync("spacex.html", "utf8");
const home = fs.readFileSync("index.html", "utf8");
const teslaHub = fs.readFileSync("tesla-hub.js", "utf8");
const spacexHub = fs.readFileSync("spacex-hub.js", "utf8");
const updates = JSON.parse(fs.readFileSync("updates-live.json", "utf8"));

if (!/\.latest/.test(teslaHub)) ok("tesla-hub skips latest");
else bad("tesla-hub skips latest", "must not read updates-live.json latest");
if (!/Newest US/.test(tesla) && !/US build/.test(teslaHub)) ok("no US-build claim");
else bad("no US-build claim", "Teslascope is a sample, not a US census");
if (/tesla-hub\.js\?v=202610191500/.test(tesla) && /tesla-page\.css\?v=202610191500/.test(tesla)) ok("tesla pins");
else bad("tesla pins", "hub js or css pin missing");
if ((tesla.match(/fsd-europe-data\.js/g) || []).length === 1) ok("one fsd-europe-data");
else bad("one fsd-europe-data", String((tesla.match(/fsd-europe-data\.js/g) || []).length));
if ((spacex.match(/starship-data\.js/g) || []).length === 1) ok("one starship-data");
else bad("one starship-data", String((spacex.match(/starship-data\.js/g) || []).length));
if (/spacex-hub\.js\?v=202610191500/.test(spacex)) ok("spacex pin");
else bad("spacex pin", "spacex-hub pin missing");
if (/id="tz-updated"/.test(tesla) && /data-tz-sw-id/.test(tesla) && /data-tz-eu-n/.test(tesla)) ok("tesla stamp hooks");
else bad("tesla stamp hooks", "missing tz hooks");
if (/id="sx-updated"/.test(spacex) && /STARSHIP/.test(spacexHub) && /Starship compiled/.test(spacexHub)) ok("spacex stamp is Starship-only");
else bad("spacex stamp is Starship-only", "must stamp from STARSHIP.updated only");
if ((tesla.match(/<picture\b/gi) || []).length >= 10) ok("tesla pictures");
else bad("tesla pictures", String((tesla.match(/<picture\b/gi) || []).length));
if ((spacex.match(/<picture\b/gi) || []).length >= 7) ok("spacex pictures");
else bad("spacex pictures", String((spacex.match(/<picture\b/gi) || []).length));
if (/data-band-topic="website"/.test(home) && /Bandwagon/i.test(home)) ok("home locks kept");
else bad("home locks kept", "band topic or Bandwagon missing");
if (/https:\/\/x\.com\/ALJR86/.test(tesla + spacex) && /twitter:site" content="@ALJR86"/.test(tesla)) ok("follow + site");
else bad("follow + site", "handle changed");
if (/Follow on X/.test(tesla) && /Follow on X/.test(spacex)) ok("follow on x copy");
else bad("follow on x copy", "cta missing");

const vs = (updates.versions || []).filter((x) => x.count > 0);
const nw = [...vs].sort((a, b) => String(b.firstSeen || "").localeCompare(String(a.firstSeen || "")))[0];
if (nw && nw.id === "2026.38.5.1" && updates.latest === "2026.32.100") ok("sample pick vs ghost latest");
else bad("sample pick vs ghost latest", JSON.stringify({ id: nw && nw.id, latest: updates.latest }));

const pages = [
  ["fsd-europe.html", "FSD Europe tracker — Supercharged Daily"],
  ["fsd.html", "FSD Global Tracker — Supercharged Daily"],
  ["updates.html", "Software Update Tracker — Supercharged Daily"],
  ["starlink.html", "Starlink Tracker — Supercharged Daily"],
  ["starship.html", "Starship Mission Control — Supercharged Daily"],
  ["my-tesla.html", "My Tesla — Supercharged Daily"],
  ["see-the-launch.html", "Can I see the launch? — Supercharged Daily"],
  ["cybercab.html", "Cybercab Tracker — Supercharged Daily"],
];
for (const [file, name] of pages) {
  const html = fs.readFileSync(file, "utf8");
  const good =
    /application\/ld\+json/.test(html) &&
    html.includes('"@type": "WebPage"') &&
    html.includes("https://x.com/ALJR86") &&
    html.includes(file) &&
    html.includes(name) &&
    !/"@type": "Person"/.test(html);
  if (good) ok("json-ld " + file);
  else bad("json-ld " + file, "missing WebPage from existing title");
}

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const stamp = document.getElementById("tz-updated");
  const sw = document.querySelector("[data-tz-sw-id]");
  const eu = document.querySelector("[data-tz-eu-n]");
  return (
    stamp &&
    /FSD Europe compiled 18 Oct 2026/.test(stamp.textContent) &&
    /software sample 19 Oct 2026 via Teslascope/.test(stamp.textContent) &&
    sw &&
    sw.textContent.includes("Newest reporting: 2026.38.5.1") &&
    eu &&
    eu.textContent.includes("9 of 27 EU countries")
  );
}, { timeout: 10000 });
ok("tesla stamp + cards live");

const teslaNote = await page.locator("[data-tz-sw-note]").first().textContent();
if (/Teslascope sample/.test(teslaNote || "") && /14\.3\.12 on HW4/.test(teslaNote || "")) ok("tesla teslascope note");
else bad("tesla teslascope note", teslaNote || "");

await page.locator("#tz-updated").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/hub-stamps-tesla-hero.png" });
await page.locator("#trackers").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/hub-stamps-tesla-cards.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#tz-updated");
await page.waitForFunction(() => /compiled/.test(document.getElementById("tz-updated")?.textContent || ""));
await page.locator("#tz-updated").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/hub-stamps-tesla-hero-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!overflow) ok("tesla no overflow 390");
else bad("tesla no overflow 390", "horizontal scroll");

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(BASE + "/spacex.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const el = document.getElementById("sx-updated");
  return el && el.textContent.includes("Starship compiled 16 Oct 2026");
}, { timeout: 10000 });
ok("spacex starship stamp");
const sx = await page.locator("#sx-updated").textContent();
if (!/Falcon|Starlink/.test(sx || "")) ok("spacex stamp not fleet-wide");
else bad("spacex stamp not fleet-wide", sx || "");
await page.locator("#sx-updated").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/hub-stamps-spacex.png" });

const euLd = await page.goto(BASE + "/fsd-europe.html", { waitUntil: "domcontentloaded" });
void euLd;
const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
if (/WebPage/.test(ld || "") && /fsd-europe\.html/.test(ld || "") && /ALJR86/.test(ld || "")) ok("fsd-europe ld rendered");
else bad("fsd-europe ld rendered", (ld || "").slice(0, 160));

await browser.close();
if (fail.length) {
  console.error("FAIL", fail.length, fail.join(" | "));
  process.exit(1);
}
console.log("ALL_PASS");
