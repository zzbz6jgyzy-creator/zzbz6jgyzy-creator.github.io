import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildGear, writeGear } from "../scripts/build-gear-studio.mjs";

const html = fs.readFileSync("gear.html", "utf8");
const data = JSON.parse(fs.readFileSync("data/gear.json", "utf8"));
const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const tags = (src, name) => [...src.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((m) => m[0]);
const decode = (s) => s.replace(/&amp;/g, "&");

test("gear.html contains exactly the block the builder generates (determinism)", () => {
  assert.ok(html.includes(buildGear()), "gear.html is stale: run node scripts/build-gear-studio.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gear-"));
  try {
    fs.mkdirSync(path.join(dir, "data"));
    fs.copyFileSync("data/gear.json", path.join(dir, "data/gear.json"));
    for (const f of ["gear.html", "gear-shop.css", "gear-studio.js"]) fs.copyFileSync(f, path.join(dir, f));
    const once = writeGear(dir);
    assert.equal(writeGear(dir), once, "second build changed the page");
    assert.equal(once, html, "a rebuild would change gear.html");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("one h1, one main, titles and schema stay as published", () => {
  assert.equal((main.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /<title>Gear for your Tesla — Supercharged Daily<\/title>/);
  assert.ok(html.includes('"@type": "WebPage"') && html.includes("https://x.com/ALJR86"));
  assert.ok(!/<!--nl:start-->|ps-newsletter/.test(main), "no newsletter band on this page");
});

test("anchor ids the site relies on exist and the sticky nav targets resolve", () => {
  for (const id of ["gear-h", "models", "gs-models-h", "gear", "gs-gear-h", "daily", "upgrades", "evbandit", "ps-fitment-title", "fitment"]) {
    assert.ok(new RegExp(`\\sid="${id}"`).test(main), "missing id " + id);
  }
  const nav = main.slice(main.indexOf('<nav class="gx-subnav"'), main.indexOf("</nav>"));
  const hrefs = [...nav.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, ["models", "gear", "fitment"]);
  for (const h of hrefs) assert.ok(new RegExp(`\\sid="${h}"`).test(main), "nav target missing: " + h);
});

test("model picker: five TESMAG collection links, https, sponsored, named for the model", () => {
  const picker = main.slice(main.indexOf('id="models"'), main.indexOf('id="gear"'));
  const links = tags(picker, "a").filter((t) => /gx-model-link/.test(t));
  assert.equal(links.length, 5);
  const slugs = ["model-3", "model-y", "model-s", "model-x", "cybertruck"];
  data.models.forEach((m, i) => {
    const href = decode(attr(links[i], "href"));
    assert.match(href, /^https:\/\/www\.teslaacessories\.com\/collections\/[a-z0-9-]+\?referral_code=J72E6FRRQ7QK/);
    assert.ok(href.includes("/collections/" + slugs[i] + "?"), href);
    assert.match(attr(links[i], "rel"), /\bsponsored\b.*\bnoopener\b|\bnoopener\b.*\bsponsored\b/);
    assert.match(attr(links[i], "aria-label"), new RegExp(m.name));
  });
  assert.ok(!/evbandit/.test(picker), "no per-model EV Bandit links in the picker");
});

test("catalogue: 15 cards from both shops, every one a sponsored https link with an accessible source name", () => {
  const cards = [...main.matchAll(/<li class="gx-card[^"]*" data-cat="([^"]*)">([\s\S]*?)<\/li>\n(?=<li class="gx-card|<\/ul>)/g)];
  assert.equal(cards.length, 15);
  assert.equal(cards.filter((c) => /\btesmag\b/.test(c[1])).length, 8);
  assert.equal(cards.filter((c) => /\bevbandit\b/.test(c[1])).length, 7);
  for (const [, cats, body] of cards) {
    const a = tags(body, "a")[0];
    assert.match(attr(a, "href"), /^https:\/\/(www\.teslaacessories\.com|evbandit\.com)\//);
    assert.match(attr(a, "rel"), /\bsponsored\b/);
    assert.match(attr(a, "rel"), /\bnoopener\b/);
    assert.match(body, /affiliate link, opens in a new tab/);
    assert.ok(cats.split(" ").length >= 2, "each card has a category and a shop");
  }
  assert.match(cards[0][2], /Fitted floor mats/);
  assert.match(cards[1][2], /Screen protection/);
  assert.match(cards[0][2], /Start here/);
  assert.match(cards[1][2], /id="evbandit"/);
});

test("filters: radio chips (work without JS), CSS rule exists for each, every card matches its filter", () => {
  const css = fs.readFileSync("gear-shop.css", "utf8");
  const radios = tags(main, "input").filter((t) => /type="radio"/.test(t));
  assert.equal(radios.length, data.catalog.filters.length);
  assert.equal(radios.filter((t) => /\schecked/.test(t)).length, 1);
  for (const r of radios) {
    const id = attr(r, "id"), v = attr(r, "value");
    assert.ok(main.includes(`<label for="${id}">`), "label for " + id);
    if (id !== "gx-f-all") {
      assert.ok(css.includes(`#${id}:checked`) && css.includes(`[data-cat~="${v}"]`), "no CSS rule for " + id);
      assert.ok(new RegExp(`data-cat="[^"]*\\b${v}\\b`).test(main), "no card for filter " + v);
    }
  }
});

test("disclosure: one note at the top next to the shop-all links, one after the grid; referral note kept", () => {
  const notes = main.match(/class="gx-disclosure[^"]*"><strong>Affiliate links\.<\/strong>/g) || [];
  assert.equal(notes.length, 2);
  const top = main.indexOf('class="gx-disclosure"'), firstLink = main.indexOf('class="gx-btn"');
  assert.ok(firstLink > 0 && firstLink < top && top < main.indexOf('class="gx-subnav"'), "note sits right after the shop-all buttons");
  assert.ok(main.indexOf("gx-disclosure-end") > main.indexOf("</ul>\n<p class=\"gx-disclosure gx-disclosure-end"), "note follows the grid");
  assert.match(main, /may earn a commission if you buy through them, at no extra cost to you\. Prices and stock are set by TESMAG and EV Bandit/);
  assert.match(main, /Referral link: we may earn a reward/);
});

test("all partner and referral links are https and sponsored; the link set is unchanged", () => {
  const external = tags(main, "a").filter((t) => /teslaacessories|evbandit|ts\.la/.test(t));
  const hrefs = external.map((t) => decode(attr(t, "href")));
  assert.equal(hrefs.filter((h) => /teslaacessories/.test(h)).length, 5 + 8 + 1, "5 models + 7 collections + floor mats + shop all");
  assert.equal(hrefs.filter((h) => /evbandit\.com/.test(h)).length, 8);
  assert.equal(hrefs.filter((h) => /ts\.la/.test(h)).length, 1);
  for (const t of external) {
    assert.match(attr(t, "href"), /^https:\/\//);
    assert.match(attr(t, "rel"), /\bsponsored\b/, t);
    assert.match(attr(t, "rel"), /\bnoopener\b/, t);
  }
});

test("images: only the five credited model photos; alt, size and lazy loading on each; files exist", () => {
  const imgs = tags(main, "img");
  assert.equal(imgs.length, 5);
  for (const t of imgs) {
    assert.ok((attr(t, "alt") || "").length > 8, "alt: " + t);
    assert.match(attr(t, "width") || "", /^\d+$/);
    assert.match(attr(t, "height") || "", /^\d+$/);
    assert.match(t, /loading="lazy"/);
  }
  const files = new Set([...main.matchAll(/(?:srcset|src)="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0])));
  for (const f of files) assert.ok(fs.existsSync("." + f), "missing file " + f);
  assert.equal(new Set(imgs.map((t) => attr(t, "src"))).size, 5, "no duplicate photos");
  assert.equal(data.credits.length, 5, "one credit per photo shown");
  for (const c of data.credits) assert.ok(main.includes(c.url) || main.includes(c.url.replace(/&/g, "&amp;")), c.subject);
  assert.match(main, /CC BY-SA 4\.0/);
});

test("head: version tokens are file hashes and the heavy stylesheets stay out", () => {
  for (const f of ["gear-shop.css", "gear-studio.js"]) assert.ok(new RegExp(`/${f.replace(".", "\\.")}\\?v=[0-9a-f]{10}`).test(html), f);
  assert.ok(!html.includes("tesla-page.css") && !html.includes("page-studios.css"));
});

test("checklist is kept with four checks and a status line", () => {
  assert.equal((main.match(/<input type="checkbox"/g) || []).length, 4);
  assert.match(main, /data-ps-checklist/);
  assert.match(main, /role="status">Your preparation checklist stays on this device\./);
});
