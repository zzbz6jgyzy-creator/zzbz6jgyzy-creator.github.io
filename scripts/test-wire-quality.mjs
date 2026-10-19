import fs from "fs";
import { createRequire } from "module";
import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const require = createRequire(import.meta.url);
const pairer = require("../home-pair.js");

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const SHOT = process.env.SHOT || "/opt/cursor/artifacts";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const home = fs.readFileSync("index.html", "utf8");
const tesla = fs.readFileSync("tesla.html", "utf8");
const spacex = fs.readFileSync("spacex.html", "utf8");
const news = fs.readFileSync("news.html", "utf8");
const calendar = fs.readFileSync("calendar.html", "utf8");

const titles = [...home.matchAll(/class="hv-f-h">(.*?)<span/g)].map((m) => m[1]);
if (titles.length === 8) ok("eight headlines");
else bad("eight headlines", String(titles.length));
if (!titles.some((t) => /sentient|forget the tesla|380\s*mph|ev sportscars/i.test(t))) ok("no clickbait eight");
else bad("no clickbait eight", titles.filter((t) => /sentient|forget the tesla|380|sportscars/i.test(t)).join(" | "));
if (titles.filter((t) => /jellyfish/i.test(t)).length === 1) ok("one jellyfish");
else bad("one jellyfish", titles.filter((t) => /jellyfish/i.test(t)).join(" | "));
if (titles.some((t) => /bandwagon|starfall/i.test(t))) ok("bandwagon kept");
else bad("bandwagon kept", titles.join(" | "));

const ons = [...home.matchAll(/class="hv-f-on" href="([^"]+)">(.*?)<\/a>/g)].map((m) => ({ href: m[1], label: m[2] }));
if (ons.some((o) => o.href === "/see-the-launch.html")) ok("jellyfish pairs to see-the-launch");
else bad("jellyfish pairs to see-the-launch", JSON.stringify(ons.slice(0, 4)));
if (ons.some((o) => o.href === "/calendar.html")) ok("bandwagon pairs to calendar");
else bad("bandwagon pairs to calendar", JSON.stringify(ons));

if (/data-band-topic="website"/.test(home) && /Bandwagon/i.test(home)) ok("home locks kept");
else bad("home locks kept", "band topic or Bandwagon event missing");
if (/news-keep\.js\?v=202610191400/.test(home) && /home-pair\.js\?v=202610191400/.test(home)) ok("pins");
else bad("pins", "news-keep or home-pair pin not bumped");

const ld = (html, name) =>
  /application\/ld\+json/.test(html) &&
  html.includes('"@type": "WebPage"') &&
  html.includes("https://x.com/ALJR86") &&
  html.includes(name);
if (ld(tesla, "tesla.html")) ok("tesla json-ld");
else bad("tesla json-ld", "missing WebPage");
if (ld(spacex, "spacex.html")) ok("spacex json-ld");
else bad("spacex json-ld", "missing WebPage");
if (ld(news, "news.html")) ok("news json-ld");
else bad("news json-ld", "missing WebPage");
if (ld(calendar, "calendar.html")) ok("calendar json-ld");
else bad("calendar json-ld", "missing WebPage");

if ((tesla.match(/<picture\b/gi) || []).length >= 10) ok("tesla pictures");
else bad("tesla pictures", String((tesla.match(/<picture\b/gi) || []).length));
if ((spacex.match(/<picture\b/gi) || []).length >= 7) ok("spacex pictures");
else bad("spacex pictures", String((spacex.match(/<picture\b/gi) || []).length));
if (/https:\/\/x\.com\/ALJR86/.test(home + tesla + spacex) && /twitter:site" content="@ALJR86"/.test(tesla)) ok("follow + site");
else bad("follow + site", "handle changed");

const jelly = pairer.pairItem({ title: "SpaceX launch Monday morning could bring another space jellyfish", topic: "spacex" }, []);
if (jelly.href === "/see-the-launch.html") ok("pair helper jellyfish");
else bad("pair helper jellyfish", JSON.stringify(jelly));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-hv-feed] .hv-f-h");
const liveTitles = await page.$$eval("[data-hv-feed] .hv-f-h", (els) => els.map((e) => e.textContent.replace("↗", "").trim()));
if (!liveTitles.some((t) => /sentient|forget the tesla|380\s*mph|ev sportscars/i.test(t))) ok("rendered no clickbait");
else bad("rendered no clickbait", liveTitles.join(" | "));
if (liveTitles.filter((t) => /jellyfish/i.test(t)).length === 1) ok("rendered one jellyfish");
else bad("rendered one jellyfish", liveTitles.filter((t) => /jellyfish/i.test(t)).join(" | "));
await page.locator("[data-hv-feed]").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/wire-quality-feed.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.locator("[data-hv-feed]").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/wire-quality-feed-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!overflow) ok("home no overflow 390");
else bad("home no overflow 390", "horizontal scroll");

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
const teslaLd = await page.locator('script[type="application/ld+json"]').first().textContent();
if (/WebPage/.test(teslaLd || "") && /ALJR86/.test(teslaLd || "")) ok("tesla ld rendered");
else bad("tesla ld rendered", (teslaLd || "").slice(0, 160));

await browser.close();
if (fail.length) {
  console.error("FAIL", fail.length, fail.join(" | "));
  process.exit(1);
}
console.log("ALL_PASS");
