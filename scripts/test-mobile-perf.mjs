import { readFileSync, existsSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let chromium;
for (const spec of ["/tmp/pw-local/node_modules/playwright", "playwright"]) {
  try {
    ({ chromium } = spec.startsWith("/") ? require(spec) : await import(spec));
    break;
  } catch {}
}

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const KEY = [
  "/",
  "/starship.html",
  "/starlink.html",
  "/fsd-europe.html",
  "/my-tesla.html",
  "/updates.html",
  "/dispatch/starship-flight-15-catch-timeline.html",
];

const fonts = [
  "assets/fonts/inter-latin.woff2",
  "assets/fonts/inter-latin-ext.woff2",
  "assets/fonts/ibm-plex-mono-400-latin.woff2",
  "assets/fonts/ibm-plex-mono-500-latin.woff2",
  "assets/fonts/michroma-latin.woff2",
];
for (const f of fonts) {
  if (existsSync(f) && readFileSync(f).subarray(0, 4).toString() === "wOF2") ok("font " + f);
  else bad("font " + f, "missing or not woff2");
}

const styles = readFileSync("styles.css", "utf8");
if (styles.includes('@font-face') && styles.includes("/assets/fonts/inter-latin.woff2") && styles.includes("font-display: swap")) ok("styles font-face");
else bad("styles font-face", "missing self-hosted @font-face");
if (styles.includes("Inter Fallback") && styles.includes("size-adjust: 108%") && styles.includes('"Inter Fallback"')) ok("styles font fallback");
else bad("styles font fallback", "missing metric-matched Inter fallback");
if (styles.includes(".article p a") && styles.includes("text-decoration: underline")) ok("article link underline");
else bad("article link underline", "body links not underlined");
if (styles.includes(".intel-note") && styles.includes("font-size: 13px")) ok("intel-note blocking");
else bad("intel-note blocking", "intel-note still only in async intel.css");
if (styles.includes(".newsletter-kicker") && styles.includes("var(--red-text)")) ok("newsletter kicker contrast");
else bad("newsletter kicker contrast", "still uses --tesla for text");

const nav = readFileSync("nav-pill.css", "utf8");
if (nav.includes(".pn-menu") && nav.includes("width:44px") && nav.includes("height:44px")) ok("nav tap 44");
else bad("nav tap 44", "menu still under 44px");

const homeCss = readFileSync("home-v2.css", "utf8");
if (homeCss.includes("[data-hv-cd]") && homeCss.includes("min-height:232px")) ok("countdown well");
else bad("countdown well", "missing reserved height");
if (homeCss.includes(".hv-feed-sub a") && homeCss.includes("min-height:44px")) ok("home feed-sub tap");
else bad("home feed-sub tap", "See all changes link still under 44px");

const updatesCss = readFileSync("updates-v3.css", "utf8");
if (updatesCss.includes("min-height:22.5rem") && updatesCss.includes(".sw-tile{") && updatesCss.includes("min-height:10.5rem")) ok("updates sw-now well");
else bad("updates sw-now well", "mobile reservation still 292px or missing tile min-height");

const fsdCss = readFileSync("fsd-europe-v2.css", "utf8");
if (fsdCss.includes(".f2-srcs a") && fsdCss.includes("min-height: 44px")) ok("fsd source tap");
else bad("fsd source tap", "source links still under 44px");

const related = readFileSync("related.css", "utf8");
if (related.includes(".sd-about a") && related.includes("text-decoration:underline")) ok("about link underline");
else bad("about link underline", "sd-about links not underlined");

for (const path of KEY) {
  const html = await (await fetch(BASE + path)).text();
  const label = path === "/" ? "index" : path;
  if (!html.includes("fonts.googleapis.com") && !html.includes("fonts.gstatic.com")) ok(label + " no gfonts");
  else bad(label + " no gfonts", "still loads Google Fonts");
  if (html.includes("/assets/fonts/inter-latin.woff2")) ok(label + " preload");
  else bad(label + " preload", "missing Inter preload");
  const coreRe = /<script[^>]+src="\/assets\/js\/core\.bundle\.[^"]+"[^>]*>/;
  const coreTag = (html.match(coreRe) || [])[0] || "";
  if (coreTag && /\bdefer\b/.test(coreTag)) ok(label + " core defer");
  else if (/<script[^>]+src="\/script\.js[^"]*"[^>]*\bdefer\b/.test(html) || /<script defer src="\/script\.js/.test(html)) ok(label + " script defer");
  else bad(label + " core defer", "core bundle / script.js not deferred");
  if (coreTag && /\bdefer\b/.test(coreTag)) ok(label + " nav defer");
  else if (/<script[^>]+src="\/nav-pill\.js[^"]*"[^>]*\bdefer\b/.test(html) || /<script defer src="\/nav-pill\.js/.test(html)) ok(label + " nav defer");
  else bad(label + " nav defer", "core bundle / nav-pill.js not deferred");
}

const slHtml = await (await fetch(BASE + "/starlink.html")).text();
if (!slHtml.includes("cdn.jsdelivr.net/npm/satellite.js")) ok("starlink no eager satellite.js");
else bad("starlink no eager satellite.js", "satellite.js still in the document");
if (slHtml.includes('id="sl-orbit-svg"') && slHtml.includes('id="sl-earth"')) ok("starlink static orbit svg");
else bad("starlink static orbit svg", "orbit svg still empty");
if (/id="sd-late-starlink-gp"/.test(slHtml) && !/<script[^>]+src="\/starlink-gp\.js/.test(slHtml))
  ok("starlink gp not on defer queue");
else bad("starlink gp not on defer queue", "1.6MB catalog still blocks first paint");

if (!chromium) {
  console.log("SKIP browser checks (playwright not installed)");
  if (fail.length) {
    console.log("\n" + fail.length + " failed");
    process.exit(1);
  }
  console.log("\nall passed");
  process.exit(0);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || "/usr/local/bin/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const overflowAt = async (width, path) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const dx = Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth);
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 2 && r.right > window.innerWidth + 2;
      })
      .slice(0, 8)
      .map((el) => (el.className || el.tagName) + " r=" + Math.round(el.getBoundingClientRect().right));
    return { dx, offenders };
  });
};

for (const path of KEY) {
  for (const w of [360, 390]) {
    const r = await overflowAt(w, path);
    if (r.dx <= 2) ok(`${path} ${w} no overflow`);
    else bad(`${path} ${w} no overflow`, `dx=${r.dx} ${JSON.stringify(r.offenders)}`);
  }
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".pn-menu");
const menu = await page.$eval(".pn-menu", (el) => {
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
});
if (menu.w >= 44 && menu.h >= 44) ok("home menu target");
else bad("home menu target", JSON.stringify(menu));

await page.click(".pn-menu");
await page.waitForSelector(".pn-sheet.open");
const sheetLinks = await page.$$eval(".pn-sheet a, .pn-sheet .pn-close, .pn-sheet .pn-grp-t", (els) =>
  els
    .map((el) => Math.round(el.getBoundingClientRect().height))
    .filter((h) => h > 0)
    .slice(0, 12)
);
if (sheetLinks.length && sheetLinks.every((h) => h >= 40)) ok("sheet tap heights");
else bad("sheet tap heights", JSON.stringify(sheetLinks));
await page.click(".pn-close");

await page.goto(BASE + "/starship.html", { waitUntil: "networkidle" });
const rail = await page.$$(".slab-rail button");
if (rail.length) {
  const first = await rail[0].evaluate((el) => el.getBoundingClientRect().height);
  if (first >= 44) ok("starship rail tap");
  else bad("starship rail tap", String(first));
} else ok("starship rail tap (none yet)");

await browser.close();
if (fail.length) {
  console.log("\n" + fail.length + " failed");
  process.exit(1);
}
console.log("\nall passed");
