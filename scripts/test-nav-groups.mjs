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

const nav = JSON.parse(fs.readFileSync("scripts/nav.json", "utf8"));
const index = fs.readFileSync("index.html", "utf8");
const html = fs.readFileSync("tesla.html", "utf8");

const walk = (items, acc = []) => {
  for (const it of items) {
    if (it && typeof it === "object" && it.items) walk(it.items, acc);
    else acc.push(it[1]);
  }
  return acc;
};
const hrefs = nav.dropdowns.flatMap((d) => walk(d.items));
const must = [
  "/tesla.html", "/my-tesla.html", "/autonomy.html", "/production.html", "/tesla-clubs.html",
  "/explainers.html#tesla", "/guides/tesla-buying-guide.html", "/model3-explorer.html",
  "/cybertruck-explorer.html", "/tsla.html", "/reviews/index.html", "/optimus.html",
  "/spacex.html", "/starship.html", "/starlink.html", "/calendar.html", "/see-the-launch.html",
  "/roadster.html#top", "/roadster.html#gallery", "/updates.html", "/fsd-europe.html",
  "/cybercab.html", "/promise-tracker.html", "/daily.html", "/grok.html", "/games.html",
  "/news.html", "/dispatch.html", "/about.html",
];
if (must.every((h) => hrefs.includes(h))) ok("all dests kept");
else bad("all dests kept", must.filter((h) => !hrefs.includes(h)).join(", "));

if (/pn-tesla-software-autonomy/.test(html) && /pn-tesla-cars-owners/.test(html) && /pn-tesla-company/.test(html)) ok("tesla nests");
else bad("tesla nests", "missing tesla submenu ids");
if (/pn-spacex-launches/.test(html) && /pn-roadster-the-car/.test(html) && /pn-ex-tesla/.test(html)) ok("other nests");
else bad("other nests", "missing spacex/roadster/explore groups");
if (/nav-pill\.css\?v=202610271600/.test(index) && /nav-pill\.js\?v=202610202200/.test(index)) ok("nav pins");
else bad("nav pins", "index still on old nav-pill");
if (/theme\.css\?v=202610191800/.test(index)) ok("home theme pin");
else bad("home theme pin", "index.html theme.css pin changed");

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });

const labels = await page.$$eval(".pn-items > .pn-link, .pn-items > .pn-dd > button", (els) =>
  els.map((el) => el.childNodes[0]?.textContent?.trim() || el.textContent.trim())
);
if (["Home", "Tesla", "SpaceX", "Roadster", "Explore", "News"].every((w) => labels.includes(w))) ok("top labels");
else bad("top labels", JSON.stringify(labels));
if (labels.includes("Trackers")) bad("no Trackers top", JSON.stringify(labels));
else ok("no Trackers top");

const teslaKids = await page.$$eval("#pn-tesla > a, #pn-tesla > .pn-nest > .pn-nest-t", (els) =>
  els.map((el) => el.childNodes[0]?.textContent?.trim() || el.textContent.trim())
);
if (teslaKids.includes("Tesla overview") && teslaKids.includes("My Tesla") && teslaKids.includes("Software & autonomy") && teslaKids.includes("Cars & owners") && teslaKids.includes("Company") && teslaKids.length === 5) ok("tesla short");
else bad("tesla short", JSON.stringify(teslaKids));

await page.hover(".pn-dd:has(#pn-tesla) > button");
await page.waitForTimeout(200);
const teslaOpen = await page.$eval(".pn-dd:has(#pn-tesla)", (el) => el.classList.contains("open"));
if (teslaOpen) ok("tesla hover open");
else bad("tesla hover open", "dropdown stayed closed");
await page.screenshot({ path: SHOT + "/nav_tesla_grouped.png" });

await page.hover('button[aria-controls="pn-tesla-cars-owners"]');
await page.waitForTimeout(200);
const carsOpen = await page.$eval("#pn-tesla-cars-owners", (el) => !el.hidden);
const clubs = await page.$eval('#pn-tesla a[href="/tesla-clubs.html"]', (el) => el.offsetParent !== null);
if (carsOpen && clubs) ok("cars submenu");
else bad("cars submenu", JSON.stringify({ carsOpen, clubs }));
await page.screenshot({ path: SHOT + "/nav_tesla_cars_submenu.png" });

const exploreKids = await page.$$eval("#pn-ex > a, #pn-ex > .pn-nest > .pn-nest-t", (els) =>
  els.map((el) => el.childNodes[0]?.textContent?.trim() || el.textContent.trim())
);
if (exploreKids.includes("Your Supercharged Daily") && exploreKids.includes("Tesla") && exploreKids.includes("SpaceX") && exploreKids.includes("More") && exploreKids.length === 4) ok("explore short");
else bad("explore short", JSON.stringify(exploreKids));
if (await page.$('#pn-ex a[href="/starship.html"]') && await page.$('#pn-ex a[href="/updates.html"]')) ok("explore dests");
else bad("explore dests", "starship/updates missing");

await page.goto(BASE + "/model3-explorer.html", { waitUntil: "domcontentloaded" });
const openNest = await page.$eval("#pn-tesla-cars-owners", (el) => !el.hidden);
const current = await page.$eval('#pn-tesla a[href="/model3-explorer.html"]', (el) => el.getAttribute("aria-current") === "page");
if (openNest && current) ok("current page nest");
else bad("current page nest", JSON.stringify({ openNest, current }));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForSelector(".pn:not(.collapsed)", { timeout: 4000 }).catch(() => {});
await page.click(".pn-menu");
await page.waitForSelector(".pn-sheet.open");
const sheetH = await page.$$eval(".pn-sheet h3", (els) => els.map((h) => h.textContent.replace(/\s+/g, " ").trim()));
if (["Tesla", "SpaceX", "Roadster", "Explore", "News"].every((h) => sheetH.some((x) => x.includes(h)))) ok("sheet sections");
else bad("sheet sections", JSON.stringify(sheetH));
const teslaBtn = page.locator(".pn-sheet h3").filter({ hasText: "Tesla" }).locator("button");
await teslaBtn.click();
const subH = await page.$$eval(".pn-sheet h4", (els) => els.map((h) => h.textContent.replace(/\s+/g, " ").trim()));
if (subH.some((x) => /Software & autonomy/.test(x)) && subH.some((x) => /Cars/.test(x))) ok("sheet subheads");
else bad("sheet subheads", JSON.stringify(subH));
const h4Btns = await page.locator(".pn-sheet h4 button").count();
if (h4Btns === 0) ok("sheet no nested buttons");
else bad("sheet no nested buttons", String(h4Btns));
const clubVis = await page.locator('.pn-sheet a[href="/tesla-clubs.html"]').isVisible();
const buyVis = await page.locator('.pn-sheet a[href="/guides/tesla-buying-guide.html"]').isVisible();
if (clubVis && buyVis) ok("sheet groups visible");
else bad("sheet groups visible", JSON.stringify({ clubVis, buyVis }));
await page.screenshot({ path: SHOT + "/nav_mobile_sheet_grouped.png" });
await page.screenshot({ path: SHOT + "/nav_mobile_cars_open.png" });

await browser.close();
if (fail.length) {
  console.log("FAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("ALL_PASS");
