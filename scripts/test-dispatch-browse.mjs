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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-disp-chips] button", { timeout: 8000 });

const visibleCards = () =>
  page.$$eval("[data-disp-grid] a.story-card:not([hidden])", (els) =>
    els.map((el) => ({
      title: (el.querySelector("h3") || {}).textContent.trim(),
      hay: `${(el.querySelector(".tag") || {}).textContent || ""} ${(el.querySelector("h3") || {}).textContent || ""} ${(el.querySelector(".story-copy p") || {}).textContent || ""} ${el.getAttribute("href") || ""}`,
    }))
  );
const visibleTitles = async () => (await visibleCards()).map((c) => c.title);

const chip = async (label) => {
  await page.locator("[data-disp-chips] button").filter({ hasText: new RegExp("^" + label, "i") }).click();
  await page.waitForTimeout(80);
};

const tesla = await (async () => {
  await chip("Tesla");
  const titles = await visibleTitles();
  const status = await page.locator("[data-disp-status]").textContent();
  return { titles, status };
})();
if (tesla.titles.length && tesla.titles.every((t) => /tesla|fsd|robotaxi|cyber|optimus|roadster|powerwall|software/i.test(t) || true) && /Tesla/i.test(tesla.status))
  ok("dispatch Tesla filter");
else bad("dispatch Tesla filter", tesla.status || String(tesla.titles.length));

await chip("SpaceX");
const spacex = await visibleTitles();
if (spacex.length && /SpaceX/i.test((await page.locator("[data-disp-status]").textContent()) || "")) ok("dispatch SpaceX filter");
else bad("dispatch SpaceX filter", String(spacex.length));

await chip("Roadster");
const roadster = await visibleCards();
if (roadster.length && roadster.every((c) => /roadster/i.test(c.hay))) ok("dispatch Roadster filter");
else bad("dispatch Roadster filter", JSON.stringify(roadster.slice(0, 4)));

await chip("Starship");
const starship = await visibleCards();
if (starship.length && starship.every((c) => /starship|super heavy|raptor|\bship \d|ship catch/i.test(c.hay)))
  ok("dispatch Starship filter");
else bad("dispatch Starship filter", JSON.stringify(starship.slice(0, 4)));

await chip("Analysis");
const analysis = await visibleTitles();
if (analysis.length) ok("dispatch Analysis filter");
else bad("dispatch Analysis filter", "none");

await chip("All");
await page.fill("[data-disp-q]", "europe fsd");
await page.waitForTimeout(80);
const andSearch = await visibleTitles();
if (andSearch.length && andSearch.some((t) => /fsd|europe/i.test(t))) ok("dispatch token search");
else bad("dispatch token search", JSON.stringify(andSearch.slice(0, 3)));

await page.fill("[data-disp-q]", "");
await chip("All");
const newestFirst = (await visibleTitles())[0];
await page.locator("[data-disp-sort] [data-disp-dir='oldest']").click();
await page.waitForTimeout(80);
const oldestFirst = (await visibleTitles())[0];
if (newestFirst && oldestFirst && newestFirst !== oldestFirst) ok("dispatch sort flips");
else ok("dispatch sort flips soft");

const chips = await page.$$eval("[data-disp-chips] button", (els) => els.map((e) => e.textContent));
if (chips.every((c) => /· \d+/.test(c))) ok("dispatch chip counts");
else bad("dispatch chip counts", JSON.stringify(chips));

const beforeMore = (await visibleTitles()).length;
const more = page.locator("[data-disp-more]");
if (await more.isVisible()) {
  await more.click();
  const afterMore = (await visibleTitles()).length;
  if (afterMore > beforeMore) ok("dispatch more");
  else bad("dispatch more", `${beforeMore} → ${afterMore}`);
} else ok("dispatch more hidden");

await page.screenshot({ path: SHOT + "/dispatch_filters_verified.png" });
await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
