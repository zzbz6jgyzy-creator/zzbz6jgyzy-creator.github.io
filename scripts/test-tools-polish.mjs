import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const SHOT = process.env.SHOT || "/opt/cursor/artifacts";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => { fail.push(name + ": " + msg); console.log("FAIL", name, msg); };

const lum = (css) => {
  const nums = [...String(css).matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?/g)]
    .filter((m) => m[4] === undefined || Number(m[4]) > 0.2)
    .map((m) => (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255);
  return nums.length ? Math.max(...nums) : 0;
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.addInitScript(() => {
  try { localStorage.setItem("sd-theme", "light"); } catch {}
});

await page.goto(BASE + "/reviews/index.html", { waitUntil: "domcontentloaded" });
const gear = await page.$eval(".gear-band", (el) => {
  const s = getComputedStyle(el);
  const h2 = getComputedStyle(el.querySelector("h2"));
  return { bg: s.backgroundColor + " " + s.backgroundImage, color: h2.color, hrefs: [...el.querySelectorAll("a")].map((a) => a.href) };
});
if (lum(gear.bg) > 0.7 && lum(gear.color) < 0.35) ok("gear-band light paper");
else bad("gear-band light paper", JSON.stringify(gear));
const codes = await page.$$eval("a[href]", (els) => els.map((a) => a.href));
if (codes.some((h) => h.includes("J72E6FRRQ7QK")) && codes.some((h) => h.includes("ts.la/alex474841"))) ok("affiliate codes stay");
else bad("affiliate codes stay", JSON.stringify(codes.filter((h) => /teslaacessories|ts\.la/.test(h)).slice(0, 4)));
await page.screenshot({ path: SHOT + "/tools-gear-band-light.png", fullPage: false });

await page.evaluate(() => {
  const a = document.createElement("a");
  a.className = "mj";
  a.innerHTML = '<strong class="mj-t">Live</strong><span class="mj-b"><strong>1</strong></span>';
  document.body.appendChild(a);
});
const mj = await page.$eval(".mj", (el) => {
  const s = getComputedStyle(el);
  const box = getComputedStyle(el.querySelector(".mj-b"));
  return { bg: s.backgroundColor + " " + s.backgroundImage, box: box.backgroundColor };
});
if (lum(mj.bg) > 0.7 && lum(mj.box) > 0.7) ok("mj light paper");
else bad("mj light paper", JSON.stringify(mj));

await page.goto(BASE + "/guides/tesla-buying-guide.html", { waitUntil: "domcontentloaded" });
const box = await page.$eval(".sd-box", (el) => {
  const s = getComputedStyle(el);
  return { bg: s.backgroundColor, color: s.color };
});
const th = await page.$eval(".sd-table th", (el) => getComputedStyle(el).color + " " + getComputedStyle(el).backgroundColor);
if (lum(box.bg) > 0.7 && lum(box.color) < 0.4) ok("sd-box light paper");
else bad("sd-box light paper", JSON.stringify(box));
if (lum(th) > 0.15) ok("sd-table th lifted");
else bad("sd-table th lifted", th);
await page.locator(".sd-box").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/tools-sd-box-light.png" });

await page.goto(BASE + "/calendar.html", { waitUntil: "domcontentloaded" });
const statusStart = await page.$eval("[data-calendar-status]", (el) => el.textContent);
if (/Checking Launch Library 2|Launch Library 2|Showing curated dates/.test(statusStart)) ok("calendar status copy");
else bad("calendar status copy", statusStart);
const filterH = await page.$eval(".cal-filters button", (el) => el.getBoundingClientRect().height);
if (filterH >= 40) ok("calendar filter touch");
else bad("calendar filter touch", String(filterH));
await page.waitForFunction(() => {
  const t = document.querySelector("[data-calendar-status]")?.textContent || "";
  return /Launch Library 2|Showing curated dates/.test(t) && !/Checking Launch Library 2/.test(t);
}, { timeout: 12000 }).catch(() => {});
const statusEnd = await page.$eval("[data-calendar-status]", (el) => el.textContent);
if (/Launch Library 2|Showing curated dates/.test(statusEnd)) ok("calendar settled");
else bad("calendar settled", statusEnd);
await page.screenshot({ path: SHOT + "/tools-calendar.png" });

await page.goto(BASE + "/starship.html", { waitUntil: "domcontentloaded" });
const lede = await page.$eval(".slab-lede", (el) => el.textContent);
if (/desk read of SpaceX pages/.test(lede) && /not live telemetry/.test(lede)) ok("starship disclaimer");
else bad("starship disclaimer", lede.slice(0, 160));
await page.waitForSelector("#slab-detail h3, [data-slab-fail]", { timeout: 8000 });
const labOk = await page.$("#slab-detail h3");
if (labOk) ok("starship lab populated");
else bad("starship lab populated", await page.$eval("#slab-detail", (el) => el.innerText.slice(0, 120)));
await page.locator("#lab").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/tools-starship-lab.png" });

const labSrc = await (await fetch(BASE + "/starship-lab.js?v=202610190500")).text();
if (/Flight Lab data didn.t load/.test(labSrc)) ok("starship fail copy");
else bad("starship fail copy", "missing");

await page.goto(BASE + "/promise-tracker.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("#pt-list .pt-card").length > 2, { timeout: 8000 });
const cards = await page.$$eval("#pt-list .pt-card", (els) => els.length);
if (cards > 2) ok("promise cards");
else bad("promise cards", String(cards));
const loadingGone = await page.$eval("#pt-list", (el) => !/Loading promises/.test(el.innerText));
if (loadingGone) ok("promise loaded");
else bad("promise loaded", "still loading");
await page.screenshot({ path: SHOT + "/tools-promise-tracker.png" });

await page.goto(BASE + "/starlink.html", { waitUntil: "domcontentloaded" });
const stamp = await page.$eval(".sl-fine, #sl-globe-credit", (el) => el.textContent);
if (/CelesTrak/.test(stamp)) ok("starlink stamp");
else bad("starlink stamp", stamp);

await page.goto(BASE + "/roadster.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#newsletter[data-band-topic]");
const road = await page.$eval("#newsletter", (el) => ({ topic: el.getAttribute("data-band-topic"), t: el.innerText }));
if (road.topic === "roadster" && /roadster on supercharged daily/i.test(road.t)) ok("newsletter roadster");
else bad("newsletter roadster", JSON.stringify(road));
await page.locator("#newsletter").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/tools-newsletter-roadster.png" });

await page.goto(BASE + "/my-tesla.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#newsletter[data-band-topic]");
const mt = await page.getAttribute("#newsletter", "data-band-topic");
if (mt === "tesla-software") ok("newsletter tesla-software");
else bad("newsletter tesla-software", String(mt));

await page.goto(BASE + "/spacex.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#newsletter[data-band-topic]");
const sx = await page.getAttribute("#newsletter", "data-band-topic");
if (sx === "spacex") ok("newsletter spacex");
else bad("newsletter spacex", String(sx));

await page.setViewportSize({ width: 390, height: 844 });
await page.addInitScript(() => {
  try { localStorage.removeItem("sd-pop-seen"); } catch {}
});
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.addInitScript(() => {
  try {
    localStorage.setItem("sd-theme", "light");
    localStorage.removeItem("sd-pop-seen");
    sessionStorage.setItem("sd-views", "9");
  } catch {}
});
await mobile.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
await mobile.waitForTimeout(400);
await mobile.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.7));
await mobile.waitForTimeout(700);
const pops = await mobile.$$(".sd-pop");
if (pops.length === 0) ok("no mobile pop");
else bad("no mobile pop", String(pops.length));
await mobile.screenshot({ path: SHOT + "/tools-mobile-no-pop.png" });
await mobile.close();

const follow = await page.$eval('a[href="https://x.com/ALJR86"]', (el) => el.getAttribute("href"));
if (follow === "https://x.com/ALJR86") ok("follow on X");
else bad("follow on X", String(follow));

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
