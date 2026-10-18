import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => { fail.push(name + ": " + msg); console.log("FAIL", name, msg); };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
const deskLabels = await page.$$eval(".pn-items > .pn-link, .pn-items > .pn-dd > button", (els) =>
  els.map((el) => el.childNodes[0]?.textContent?.trim() || el.textContent.trim())
);
const want = ["Home", "Tesla", "SpaceX", "Roadster", "Explore", "News"];
if (want.every((w) => deskLabels.includes(w))) ok("desktop nav labels");
else bad("desktop nav labels", JSON.stringify(deskLabels));
if (deskLabels.includes("Trackers") || deskLabels.includes("More")) bad("old nav leftovers", JSON.stringify(deskLabels));
else ok("no Trackers/More");

const homeCount = await page.$$eval('.pn-sheet a[href="/"]', (els) =>
  els.filter((a) => a.textContent.trim() === "Home").length
);
if (homeCount === 1) ok("sheet single Home");
else bad("sheet single Home", String(homeCount));

const explore = await page.$("#pn-ex");
if (explore && (await explore.$('a[href="/starship.html"]')) && (await explore.$('a[href="/updates.html"]'))) ok("explore tools");
else bad("explore tools", "missing starship/updates");

const feed = await page.$eval("[data-hv-feed]", (el) => el.innerText);
if (/\$5,000 Invested|become a millionaire|this one stock to buy/i.test(feed)) {
  await page.waitForTimeout(800);
}
const feed2 = await page.$eval("[data-hv-feed]", (el) => el.innerText);
if (/\$5,000 Invested/i.test(feed2)) bad("homepage dropped finance", feed2.slice(0, 180));
else ok("homepage dropped finance");
if (await page.$('.hv-ex[href="/starship.html"]') && await page.$('.hv-ex[href="/calendar.html"]')) ok("explore cards");
else bad("explore cards", "missing starship/calendar");

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForSelector(".pn:not(.collapsed)", { timeout: 4000 }).catch(() => {});
await page.click(".pn-menu");
await page.waitForSelector(".pn-sheet.open");
const sheetHome = await page.$$eval('.pn-sheet a[href="/"]', (els) =>
  els.filter((a) => a.textContent.trim() === "Home").length
);
if (sheetHome === 1) ok("mobile sheet Home");
else bad("mobile sheet Home", String(sheetHome));
const sheetH = await page.$$eval(".pn-sheet h3", (els) => els.map((h) => h.textContent.replace(/\s+/g, " ").trim()));
if (["Tesla", "SpaceX", "Roadster", "Explore", "News"].every((h) => sheetH.some((x) => x.includes(h)))) ok("mobile sections");
else bad("mobile sections", JSON.stringify(sheetH));
await page.click(".pn-close");

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("[data-disp-topic]").length > 1);
const chipLabels = await page.$$eval("[data-disp-topic]", (els) => els.map((e) => e.textContent.trim()));
if (chipLabels.includes("All") && chipLabels.includes("Tesla") && chipLabels.includes("Roadster")) ok("dispatch chips");
else bad("dispatch chips", JSON.stringify(chipLabels));
if (chipLabels.includes("Optimus")) bad("dispatch chips", "Optimus without cards");
else ok("no empty Optimus chip");
await page.click('[data-disp-topic="roadster"]');
await page.waitForTimeout(100);
const visible = await page.$$eval("a.story-card:not([hidden])", (els) =>
  els.map((el) => ({
    title: (el.querySelector("h3") || {}).textContent || "",
    href: el.getAttribute("href") || "",
    tag: ((el.querySelector(".tag") || {}).textContent || ""),
    summary: ((el.querySelector(".story-copy p") || {}).textContent || ""),
  }))
);
if (visible.length && visible.every((c) => /roadster/i.test(`${c.title} ${c.href} ${c.tag} ${c.summary}`))) ok("dispatch roadster filter");
else bad("dispatch roadster filter", JSON.stringify(visible));
await page.click('[data-disp-topic="all"]');
await page.fill("#disp-q", "Starship");
await page.waitForTimeout(80);
const star = await page.$$eval("a.story-card:not([hidden]) h3", (els) => els.map((e) => e.textContent));
if (star.length) ok("dispatch search");
else bad("dispatch search", "empty");

const searches = [
  ["Roadster", /roadster/i],
  ["FSD Europe", /fsd|europe/i],
  ["Starship", /starship/i],
  ["Tesla software", /software|update/i],
  ["Starlink", /starlink/i],
  ["Optimus", /optimus|promise/i],
];
await page.goto(BASE + "/search.html", { waitUntil: "domcontentloaded" });
for (const [q, re] of searches) {
  await page.fill("#sd-search-q", q);
  await page.waitForTimeout(120);
  const text = await page.$eval("[data-sd-hits]", (el) => el.innerText);
  if (re.test(text) && !/No matches/.test(text)) ok("search " + q);
  else bad("search " + q, text.slice(0, 160));
}
await page.fill("#sd-search-q", "");
await page.waitForTimeout(80);
const empty = await page.$eval("[data-sd-hits]", (el) => el.innerText);
if (/latest stories|pages/i.test(empty)) ok("search empty grouped");
else bad("search empty grouped", empty.slice(0, 120));

await page.goto(BASE + "/my-tesla.html", { waitUntil: "domcontentloaded" });
const n = await page.$("#mt-notify");
const copy = n ? await n.evaluate((el) => el.closest(".mt-card").innerText) : "";
if (n && /not live|not sent|does not send/i.test(copy)) ok("my tesla notify copy");
else bad("my tesla notify copy", copy.slice(0, 160));

await browser.close();
if (fail.length) {
  console.log("FAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("ALL_PASS");
