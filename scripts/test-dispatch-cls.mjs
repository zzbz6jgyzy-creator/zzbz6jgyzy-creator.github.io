import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => { fail.push(name + ": " + msg); console.log("FAIL", name, msg); };

const disp = await (await fetch(BASE + "/dispatch.html")).text();
if (/page-hero[\s\S]*?<h1>[^<]+<\/h1>/.test(disp) && !/page-hero[\s\S]*reveal delay-2/.test(disp)) ok("dispatch hero no reveal");
else bad("dispatch hero no reveal", "reveal still on hero");
if (disp.includes('data-disp-topic="all"') && disp.includes('data-disp-topic="tesla"')) ok("static chips");
else bad("static chips", "chips missing from HTML");
if (disp.includes("fetchpriority=\"high\"") && disp.includes("musk-earnings-week-q3-2026-poster-480w.avif")) ok("first card eager");
else bad("first card eager", "missing preload or fetchpriority");
if (!/data-disp-grid[\s\S]{0,800}height:auto/.test(disp)) ok("no inline height auto");
else bad("no inline height auto", "first cards still height:auto");
if (!/data-disp-grid[\s\S]*class="story-card reveal"/.test(disp)) ok("cards no reveal");
else bad("cards no reveal", "reveal still on archive cards");

const news = await (await fetch(BASE + "/news.html")).text();
if (/page-hero[\s\S]*?<h1>News<\/h1>/.test(news) && !/page-hero[\s\S]*reveal delay-2/.test(news)) ok("news hero no reveal");
else bad("news hero no reveal", "reveal still on news hero");

const css = await (await fetch(BASE + "/dispatch-browse.css?v=202610190700")).text();
if (css.includes(":not(.disp-ready)") && css.includes("nth-child(n+13)")) ok("css hide rest");
else bad("css hide rest", "missing nth-child rule");

const newsCss = await (await fetch(BASE + "/news-articles.css?v=202610190700")).text();
if (newsCss.includes('html[data-theme="light"] .art-lead-media')) ok("news light wells");
else bad("news light wells", "missing light theme media lift");

const m3 = await (await fetch(BASE + "/model3-explorer.html")).text();
const ct = await (await fetch(BASE + "/cybertruck-explorer.html")).text();
if (m3.includes('href="#main"') && m3.includes('id="main"') && ct.includes('href="#main"') && ct.includes('id="main"')) ok("explorer skip");
else bad("explorer skip", "missing skip-link or main");
if (m3.includes("https://x.com/ALJR86") && disp.includes("https://x.com/ALJR86")) ok("follow on X");
else bad("follow on X", "handle changed");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelector("[data-disp-grid]")?.classList.contains("disp-ready"));
const vis = await page.$$eval("[data-disp-grid] > .story-card", (els) => ({
  total: els.length,
  shown: els.filter((el) => !el.hidden).length,
  hidden: els.filter((el) => el.hidden).length,
  ready: els[0]?.closest("[data-disp-grid]")?.classList.contains("disp-ready"),
  meta: els.filter((el) => el.querySelector(".sd-disp-meta")).length,
}));
if (vis.shown === 12 && vis.hidden === vis.total - 12 && vis.ready) ok("paginates to 12");
else bad("paginates to 12", JSON.stringify(vis));
if (vis.meta === vis.total) ok("meta reserved");
else bad("meta reserved", JSON.stringify(vis));

await page.click('[data-disp-topic="tesla"]');
await page.waitForTimeout(80);
const tesla = await page.$$eval("[data-disp-grid] > .story-card", (els) => els.filter((el) => !el.hidden).length);
const status = await page.$eval("[data-disp-status]", (el) => el.textContent);
if (tesla > 0 && tesla < vis.total && /Tesla/i.test(status)) ok("tesla filter");
else bad("tesla filter", JSON.stringify({ tesla, status }));

await page.click('[data-disp-topic="all"]');
await page.waitForTimeout(40);
await page.click("[data-disp-more]");
await page.waitForTimeout(80);
const more = await page.$$eval("[data-disp-grid] > .story-card", (els) => els.filter((el) => !el.hidden).length);
if (more === 24) ok("more stories");
else bad("more stories", String(more));

await page.goto(BASE + "/news.html", { waitUntil: "domcontentloaded" });
const newsWell = await page.evaluate(() => {
  document.documentElement.setAttribute("data-theme", "light");
  const el = document.createElement("div");
  el.className = "art-media";
  document.body.append(el);
  return getComputedStyle(el).backgroundColor;
});
if (newsWell === "rgb(232, 230, 224)") ok("news media not charcoal");
else bad("news media not charcoal", newsWell);

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
