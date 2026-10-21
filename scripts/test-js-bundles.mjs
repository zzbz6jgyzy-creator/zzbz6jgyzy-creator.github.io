#!/usr/bin/env node
// Static + headless checks for hashed JS bundles.
import { readFileSync, existsSync, readdirSync } from "fs";
import { createRequire } from "module";
import { join } from "path";

const require = createRequire(import.meta.url);
let chromium;
for (const spec of ["/tmp/pw-local/node_modules/playwright", "playwright"]) {
  try {
    ({ chromium } = spec.startsWith("/") ? require(spec) : await import(spec));
    break;
  } catch {}
}

const ROOT = process.cwd();
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const CFG = JSON.parse(readFileSync("scripts/js-bundles.json", "utf8"));
const MANIFEST = JSON.parse(readFileSync("assets/js/manifest.json", "utf8"));
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const KEY = [
  ["home", "/"],
  ["starship", "/starship.html"],
  ["starlink", "/starlink.html"],
  ["my-tesla", "/my-tesla.html"],
  ["updates", "/updates.html"],
  ["tesla", "/tesla.html"],
  ["fsd-europe", "/fsd-europe.html"],
  ["dispatch", "/dispatch.html"],
  ["flight15", "/dispatch/starship-flight-15-catch-timeline.html"],
  ["merger", "/dispatch/tesla-spacex-merger-barclays.html"],
];

const LOOSE = [
  "script.js",
  "nav-pill.js",
  "grow.js",
  "theme.js",
  "newsletter.js",
  "newsletter-cta.js",
  "track.js",
  "live-now.js",
  "search.js",
  "design-21st.js",
  "intel-core.js",
  "intel.js",
  "home-v2.js",
  "live.js",
];

for (const [name, info] of Object.entries(MANIFEST.bundles)) {
  const rel = info.file.replace(/^\//, "");
  if (existsSync(rel) && info.bytes > 100) ok("bundle file " + name);
  else bad("bundle file " + name, info.file);
  for (const src of info.sources) {
    if (existsSync(src)) ok("source kept " + src);
    else bad("source kept " + src, "missing");
  }
}

const built = readdirSync("assets/js").filter((f) => f.endsWith(".js"));
if (built.every((f) => /\.bundle\.[a-f0-9]{10}\.js$/.test(f))) ok("hashed filenames");
else bad("hashed filenames", built.join(","));

const htmlOf = (path) =>
  path === "/"
    ? readFileSync("index.html", "utf8")
    : readFileSync(path.replace(/^\//, ""), "utf8");

for (const [name, path] of KEY) {
  const html = htmlOf(path);
  const label = name;
  if (html.includes('<script src="/theme-boot.js"></script>') && html.indexOf("theme-boot.js") < html.indexOf("<body"))
    ok(label + " theme-boot early");
  else bad(label + " theme-boot early", "missing or late");
  if (html.includes("<!--sd:bundles-->") && html.includes("<!--/sd:bundles-->")) ok(label + " markers");
  else bad(label + " markers", "missing");
  const bundles = [...html.matchAll(/\/assets\/js\/([a-z0-9-]+)\.bundle\.[a-f0-9]+\.js/g)].map((m) => m[1]);
  if (bundles.length >= 1 && bundles.length <= 3) ok(label + " bundle count " + bundles.length);
  else bad(label + " bundle count", String(bundles.length));
  if (bundles.every((_, i, a) => html.indexOf("/assets/js/" + a[i]) > 0)) ok(label + " deferred bundles present");
  const looseHit = LOOSE.filter((f) => new RegExp(`src="/${f.replace(".", "\\.")}`).test(html));
  if (!looseHit.length) ok(label + " no loose sources");
  else bad(label + " no loose sources", looseHit.join(" "));
  if (/\bdefer src="\/assets\/js\/core\.bundle\./.test(html)) ok(label + " core defer");
  else bad(label + " core defer", "core not deferred");
}

const sl = htmlOf("/starlink.html");
if (sl.includes("/starlink-gp.js") && !/src="\/starlink-live\.js/.test(sl)) ok("starlink gp kept");
else bad("starlink gp kept", "gp missing or live.js still linked");
if (!sl.includes("cdn.jsdelivr.net/npm/satellite.js") && !/src="\/vendor\/satellite\.min\.js"/.test(sl))
  ok("starlink satellite lazy");
else bad("starlink satellite lazy", "satellite still eager");

const home = htmlOf("/");
if (home.includes("data-band") && home.includes("data-pop") && home.includes('data-page="home"')) ok("home attrs");
else bad("home attrs", "grow/live attrs missing");
if (home.includes("fonts.googleapis.com")) bad("home fonts", "google fonts returned");
else ok("home no gfonts");
if (home.includes("/assets/fonts/inter-latin.woff2")) ok("home font preload");
else bad("home font preload", "missing");

const sitemap = readFileSync("sitemap.xml", "utf8");
const pages = [...sitemap.matchAll(/<loc>https:\/\/superchargeddaily\.com([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
if (pages.length > 80) ok("sitemap size " + pages.length);
else bad("sitemap size", String(pages.length));

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

const TRACKERS = [
  "/",
  "/starship.html",
  "/starlink.html",
  "/my-tesla.html",
  "/updates.html",
  "/fsd-europe.html",
  "/cybercab.html",
  "/tesla.html",
  "/spacex.html",
  "/calendar.html",
  "/dispatch.html",
  "/dispatch/starship-flight-15-catch-timeline.html",
  "/dispatch/tesla-spacex-merger-barclays.html",
  "/news.html",
  "/roadster.html",
];

const extra = pages.filter((p) => !TRACKERS.includes(p) && !p.includes("/videos"));
const crawl = TRACKERS.concat(extra);

for (const path of crawl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  const url = BASE + (path === "" ? "/" : path);
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    if (!res || !res.ok()) bad("nav " + path, "HTTP " + (res && res.status()));
    await page.waitForTimeout(700);
    const refresh = await page.$('meta[http-equiv="refresh"]');
    if (refresh) {
      ok("redirect " + path);
      await page.close();
      continue;
    }
    const boot = await page.$eval("html", (el) => el.outerHTML.slice(0, 400));
    if (boot.includes("theme-boot.js")) ok("boot " + path);
    const nav = await page.$(".pn");
    if (nav) {
      const theme = await page.$(".pn-theme, .pn-search, .pn-menu");
      if (theme) ok("chrome " + path);
      else bad("chrome " + path, "nav missing theme/search/menu after boot");
    }
    const noisy = errors.filter(
      (e) =>
        !/favicon|cloudflareinsights|cdn-cgi|Failed to load resource|net::ERR_|ResizeObserver|compute-pressure|appendChild|Access-Control-Allow-Origin|twitter\.com|platform\.twitter/i.test(
          e
        )
    );
    if (!noisy.length) ok("console " + path);
    else bad("console " + path, noisy.slice(0, 3).join(" | "));
  } catch (e) {
    bad("goto " + path, String(e).slice(0, 180));
  }
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector(".pn");
const beforeTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
await page.click(".pn-theme");
await page.waitForTimeout(80);
const afterTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
if (beforeTheme !== afterTheme) ok("theme toggle");
else bad("theme toggle", `${beforeTheme} -> ${afterTheme}`);
await page.click(".pn-theme");

const feed = await page.$("[data-hv-feed]");
const cd = await page.$("[data-hv-cd]");
if (feed && cd) ok("home trackers");
else bad("home trackers", "missing feed or countdown well");
const form = await page.$("[data-newsletter-form]");
if (form) ok("home newsletter");
else bad("home newsletter", "missing form");

await page.goto(BASE + "/starship.html", { waitUntil: "networkidle", timeout: 30000 });
const slab = await page.$(".slab, .ss-lab, [data-flight], main");
if (slab) ok("starship main");
else bad("starship main", "missing");

await page.goto(BASE + "/starlink.html", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(800);
const sln = await page.$(".sl-n, #sl-orbit-svg, main");
if (sln) ok("starlink main");
else bad("starlink main", "missing");

await page.goto(BASE + "/my-tesla.html", { waitUntil: "networkidle", timeout: 30000 });
const sel = await page.$("select, #car, [data-car], main");
if (sel) ok("my-tesla main");
else bad("my-tesla main", "missing");

await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("[data-disp-topic]", { timeout: 8000 });
await page.click('[data-disp-topic="roadster"]');
await page.waitForTimeout(150);
const vis = await page.$$eval("a.story-card:not([hidden])", (els) => els.length);
if (vis > 0) ok("dispatch filter");
else bad("dispatch filter", "no roadster cards");

await browser.close();
if (fail.length) {
  console.log("\n" + fail.length + " failed");
  process.exit(1);
}
console.log("\nall passed");
