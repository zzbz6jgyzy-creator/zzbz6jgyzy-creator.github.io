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

const pages = [
  ["grok.html", "Grok Bot tutorial — Supercharged Daily"],
  ["dispatch.html", "Dispatch — Supercharged Daily"],
  ["games.html", "Games — Supercharged Daily"],
  ["explainers.html", "Visual Explainers — Supercharged Daily"],
  ["tesla-clubs.html", "Tesla owners clubs — Supercharged Daily"],
  ["tsla.html", "Tesla and SpaceX — Supercharged Daily"],
  ["tcmv.html", "TCMV meetings — Supercharged Daily"],
  ["gear.html", "Gear for your Tesla — Supercharged Daily"],
  ["guides/tesla-buying-guide.html", "Tesla buying guide 2026: Model 3 vs Model Y, trims, charging"],
  ["reviews/index.html", "Tesla car reviews — Supercharged Daily"],
  ["reviews/model-s.html", "Model S review — Supercharged Daily"],
  ["reviews/model-3.html", "Model 3 review — Supercharged Daily"],
  ["reviews/model-x.html", "Model X review — Supercharged Daily"],
  ["reviews/model-y.html", "Model Y review — Supercharged Daily"],
  ["reviews/cybertruck.html", "Cybertruck review — Supercharged Daily"],
  ["wallpapers.html", "Wallpapers — Supercharged Daily"],
];

for (const [file, name] of pages) {
  const html = fs.readFileSync(file, "utf8");
  const good =
    /application\/ld\+json/.test(html) &&
    html.includes('"@type": "WebPage"') &&
    html.includes("https://x.com/ALJR86") &&
    html.includes(file.replace(/^guides\//, "guides/")) &&
    html.includes(name) &&
    !/"@type": "Person"/.test(html);
  if (good) ok("json-ld " + file);
  else bad("json-ld " + file, "missing WebPage from existing title");
}

const dispatch = fs.readFileSync("dispatch.html", "utf8");
if (/earnings week/.test(dispatch) && /Bandwagon-5/.test(dispatch) && !/300 Cybercabs in Austin, Starlink in Venezuela/.test(dispatch.slice(0, 2500))) ok("dispatch meta current");
else bad("dispatch meta current", "head still leads with 300 Cybercabs");
if (dispatch.includes("<h3>300 Cybercabs in Austin</h3>")) ok("kept 10 Oct story card");
else bad("kept 10 Oct story card", "historical article card missing");

const clubsJs = fs.readFileSync("tesla-clubs.js", "utf8");
const clubsHtml = fs.readFileSync("tesla-clubs.html", "utf8");
if (/Directory compiled/.test(clubsJs) && /tesla-clubs\.js\?v=202610191700/.test(clubsHtml)) ok("clubs stamp");
else bad("clubs stamp", "compile date helper or pin missing");
if (/Compiled dates, not live telemetry/.test(clubsHtml)) ok("clubs fallback");
else bad("clubs fallback", "idle copy missing");

const home = fs.readFileSync("index.html", "utf8");
const tesla = fs.readFileSync("tesla.html", "utf8");
const spacex = fs.readFileSync("spacex.html", "utf8");
if (/<strong>349<\/strong>/.test(home) && /data-band-topic="website"/.test(home) && /Bandwagon/i.test(home)) ok("home locks kept");
else bad("home locks kept", "349, band topic or Bandwagon missing");
if ((tesla.match(/<picture\b/gi) || []).length >= 10) ok("tesla pictures");
else bad("tesla pictures", String((tesla.match(/<picture\b/gi) || []).length));
if ((spacex.match(/<picture\b/gi) || []).length >= 7) ok("spacex pictures");
else bad("spacex pictures", String((spacex.match(/<picture\b/gi) || []).length));
if (/https:\/\/x\.com\/ALJR86/.test(home + clubsHtml + dispatch) && /twitter:site" content="@ALJR86"/.test(dispatch)) ok("follow + site");
else bad("follow + site", "handle changed");
if (!/search\.html/.test(fs.readFileSync("sitemap.xml", "utf8"))) ok("sitemap skips search");
else bad("sitemap skips search", "search listed");

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
if (/WebPage/.test(ld || "") && /earnings week/.test(ld || "") && /ALJR86/.test(ld || "")) ok("dispatch ld rendered");
else bad("dispatch ld rendered", (ld || "").slice(0, 180));
await page.locator(".page-hero").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/remaining-desks-dispatch.png" });

await page.goto(BASE + "/tesla-clubs.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => /Directory compiled 16 Oct 2026/.test(document.getElementById("tc-live")?.textContent || ""), { timeout: 8000 });
ok("clubs compiled stamp");
await page.locator("#tc-live").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/remaining-desks-clubs.png" });

await page.goto(BASE + "/grok.html", { waitUntil: "domcontentloaded" });
const grokLd = await page.locator('script[type="application/ld+json"]').first().textContent();
if (/grok\.html/.test(grokLd || "") && /WebPage/.test(grokLd || "")) ok("grok ld rendered");
else bad("grok ld rendered", (grokLd || "").slice(0, 160));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
await page.screenshot({ path: SHOT + "/remaining-desks-dispatch-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!overflow) ok("dispatch no overflow 390");
else bad("dispatch no overflow 390", "horizontal scroll");

await browser.close();
if (fail.length) {
  console.error("FAIL", fail.length, fail.join(" | "));
  process.exit(1);
}
console.log("ALL_PASS");
