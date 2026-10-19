import fs from "fs";
import { createRequire } from "module";
import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const require = createRequire(import.meta.url);
const keep = require("../news-keep.js");

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const SHOT = process.env.SHOT || "/opt/cursor/artifacts";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const home = fs.readFileSync("index.html", "utf8");
const news = fs.readFileSync("news.html", "utf8");
const homeV2 = fs.readFileSync("home-v2.js", "utf8");
const build = fs.readFileSync("scripts/build-home.js", "utf8");
const newsJs = fs.readFileSync("news.js", "utf8");
const tesla = fs.readFileSync("tesla.html", "utf8");
const spacex = fs.readFileSync("spacex.html", "utf8");
const updatesData = fs.readFileSync("updates-data.js", "utf8");
const clickbait = /sentient|forget the tesla|380\s*mph|ev sportscars|failed .+ pump/i;

const pick = "C.stats.find((s) => s.live === \"cybercab\")";
if (homeV2.includes(pick) && build.includes(pick)) ok("cybercab live pick");
else bad("cybercab live pick", "home-v2 or build-home still uses stats[0]");
if (/<strong>349<\/strong>/.test(home) && /Texas DMV/.test(home)) ok("prebuilt 349");
else bad("prebuilt 349", "index.html still shows 300+ serving Austin");
if (!/Cybercabs serving Austin \(Tesla Robotaxi, 10 Oct 2026\)/.test(home.match(/<!--hv:trk-->[\s\S]*?<!--\/hv:trk-->/) || [""])[0]) ok("trk not 10 Oct claim");
else bad("trk not 10 Oct claim", "prebuilt still Tesla 300+ serving");

if (/forDesk/.test(newsJs) && typeof keep.forDesk === "function") ok("news uses forDesk");
else bad("news uses forDesk", "news.js still date-sorts prepare()");
if (/v2-aljr-news-v4/.test(newsJs)) ok("news cache bumped");
else bad("news cache bumped", "CACHE_KEY still v3");
if (/news-keep\.js\?v=202610191600/.test(home + news) && /news\.js\?v=202610191600/.test(news) && /home-v2\.js\?v=202610191600/.test(home)) ok("pins");
else bad("pins", "news-keep / news / home-v2 pin");
if (/ranked for on-topic headlines/.test(news)) ok("news ranking copy");
else bad("news ranking copy", "how-this-is-built still implies newest-first wire");
if (/Teslascope sample/.test(updatesData) && !/Newest US build/.test(updatesData)) ok("no US-build claim");
else bad("no US-build claim", "updates-data.js still says Newest US build");

const NOW = Date.parse("2026-10-19T12:00:00Z");
const row = (over) => ({
  title: "x",
  source: "Example Desk",
  published: "2026-10-19T08:00:00Z",
  url: "https://example.com/" + Math.random().toString(16).slice(2),
  topic: "tesla",
  ...over,
});
const desk = keep.forDesk(
  [
    row({ title: "Elon Musk Says The Tesla Roadster Will Be 'Sentient' And Can Do Autonomous Stunts On A Texas Loop", source: "Motor1.com" }),
    row({ title: "SpaceX launch Monday morning could bring another space jellyfish to Carolina skies", source: "WRAL", topic: "spacex" }),
    row({ title: "SpaceX Launch Could Create a Giant Jellyfish in the Sky Over the East Coast Monday", source: "Benzinga", topic: "spacex" }),
    row({ title: "Appeals Court Blocks Class Actions Over Tesla’s Self-Driving Claims", source: "Claims Journal" }),
    row({ title: "SpaceX $SPCX Stock: Curated Wealth Partners LLC Lowers Position", source: "MarketBeat", topic: "spacex" }),
  ],
  {},
  NOW
);
const deskTitles = desk.map((r) => r.title);
if (!clickbait.test(deskTitles[0] || "")) ok("desk clickbait not first");
else bad("desk clickbait not first", deskTitles[0]);
if (desk.filter((r) => /jellyfish/i.test(r.title)).length === 2) ok("desk keeps both jellyfish");
else bad("desk keeps both jellyfish", deskTitles.join(" | "));
const homeEight = keep.forHomepage(
  desk.map((r) => ({ ...r })),
  {},
  NOW
);
if (homeEight.filter((r) => /jellyfish/i.test(r.title)).length === 1) ok("homepage still one jellyfish");
else bad("homepage still one jellyfish", homeEight.map((r) => r.title).join(" | "));

if (/data-band-topic="website"/.test(home) && /Bandwagon/i.test(home)) ok("home locks kept");
else bad("home locks kept", "band topic or Bandwagon missing");
if ((tesla.match(/<picture\b/gi) || []).length >= 10) ok("tesla pictures");
else bad("tesla pictures", String((tesla.match(/<picture\b/gi) || []).length));
if ((spacex.match(/<picture\b/gi) || []).length >= 7) ok("spacex pictures");
else bad("spacex pictures", String((spacex.match(/<picture\b/gi) || []).length));
if (/https:\/\/x\.com\/ALJR86/.test(home) && /twitter:site" content="@ALJR86"/.test(tesla) && /Follow on X/.test(home)) ok("follow + site");
else bad("follow + site", "handle changed");

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const cards = [...document.querySelectorAll("[data-hv-trk] .hv-t")];
  const cab = cards.find((el) => /cybercab/i.test(el.textContent));
  return cab && /349/.test(cab.textContent) && /DMV|registered/i.test(cab.textContent);
}, { timeout: 10000 });
ok("home cybercab 349 live");
await page.locator("[data-hv-trk]").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/desk-honesty-trk.png" });

await page.goto(BASE + "/news.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-news-list] .news-card h3");
const wire = await page.$$eval("[data-news-list] .news-card h3", (els) => els.slice(0, 8).map((e) => e.textContent.trim()));
if (!wire.some((t) => clickbait.test(t))) ok("news eight no clickbait");
else bad("news eight no clickbait", wire.filter((t) => clickbait.test(t)).join(" | "));
if (wire.filter((t) => /jellyfish/i.test(t)).length >= 1) ok("news kept a jellyfish");
else ok("news jellyfish optional if ranked out of first eight");
await page.locator("[data-news-list]").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/desk-honesty-news.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.locator("[data-hv-trk]").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/desk-honesty-trk-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!overflow) ok("home no overflow 390");
else bad("home no overflow 390", "horizontal scroll");

await browser.close();
if (fail.length) {
  console.error("FAIL", fail.length, fail.join(" | "));
  process.exit(1);
}
console.log("ALL_PASS");
