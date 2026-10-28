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
  assert.match(html, /<title>Gear for your Tesla — Supercharged Daily<\/title>/);
  assert.ok(html.includes('"@type": "WebPage"') && html.includes("https://x.com/ALJR86"));
  assert.equal((html.match(/<main\b/g) || []).length, 1);
});

test("every anchor id the site and nav rely on still exists, and quick-nav links resolve", () => {
  for (const id of ["gear-h", "models", "gs-models-h", "gs-stores-h", "daily", "gs-daily-h", "upgrades", "evb-h", "evbandit", "ps-fitment-title", "fitment"]) {
    assert.ok(new RegExp(`\\sid="${id}"`).test(main), "missing id " + id);
  }
  const nav = main.slice(main.indexOf('<nav class="gx-subnav"'), main.indexOf("</nav>"));
  const hrefs = [...nav.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, 4);
  for (const h of hrefs) assert.ok(new RegExp(`\\sid="${h}"`).test(main), "quick-nav target missing: " + h);
});

test("picker: five model tiles, each an https TESMAG collection link marked sponsored", () => {
  const picker = main.slice(main.indexOf('id="models"'), main.indexOf('</ul>', main.indexOf('id="models"')));
  const links = tags(picker, "a").filter((t) => /gx-model-link/.test(t));
  assert.equal(links.length, 5);
  for (const [i, m] of data.models.entries()) {
    const href = decode(attr(links[i], "href"));
    assert.match(href, /^https:\/\/www\.teslaacessories\.com\/collections\/[a-z0-9-]+\?referral_code=J72E6FRRQ7QK/);
    assert.ok(href.includes("/collections/" + m.id.replace("m3", "model-3").replace("my", "model-y").replace("ms", "model-s").replace("mx", "model-x").replace("ct", "cybertruck")));
    assert.match(attr(links[i], "rel"), /\bsponsored\b/);
    assert.match(attr(links[i], "rel"), /\bnoopener\b/);
    assert.match(attr(links[i], "aria-label"), new RegExp(m.name));
  }
  assert.equal((picker.match(/class="gx-model-up" href="#upgrades"/g) || []).length, 5);
});

test("every partner or referral link is https, sponsored and has a visible disclosure in its section", () => {
  const external = tags(main, "a").filter((t) => /href="https?:/.test(t) && /teslaacessories|evbandit|ts\.la/.test(t));
  assert.equal(external.filter((t) => /teslaacessories/.test(t)).length, 14, "TESMAG links changed");
  assert.equal(external.filter((t) => /evbandit\.com/.test(t)).length, 8, "EV Bandit links changed");
  assert.equal(external.filter((t) => /ts\.la/.test(t)).length, 1);
  for (const t of external) {
    assert.match(attr(t, "href"), /^https:\/\//);
    assert.match(attr(t, "rel"), /\bsponsored\b/, t);
    assert.match(attr(t, "rel"), /\bnoopener\b/, t);
  }
  const disclosures = main.match(/class="gx-disclosure[^"]*"><span class="gx-chip">Affiliate<\/span>/g) || [];
  assert.equal(disclosures.length, 5, "picker + 2 section heads + 2 section feet");
  assert.match(main, /Referral link: we may earn a reward/);
});

test("every image has alt text, intrinsic size and sensible loading; sources exist on disk", () => {
  const imgs = tags(main, "img");
  assert.equal(imgs.length, 23);
  imgs.forEach((t, i) => {
    assert.ok((attr(t, "alt") || "").length > 8, "alt: " + t);
    assert.match(attr(t, "width") || "", /^\d+$/);
    assert.match(attr(t, "height") || "", /^\d+$/);
    if (i === 0) { assert.match(t, /fetchpriority="high"/); assert.ok(!/loading="lazy"/.test(t)); }
    else assert.match(t, /loading="lazy"/);
  });
  const files = new Set([...main.matchAll(/(?:srcset|src)="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0])));
  for (const f of files) assert.ok(fs.existsSync("." + f), "missing file " + f);
  assert.ok(!/<img[^>]*src="\/assets\/ctx-media/.test(main), "uses the heavy single-size originals");
});

test("head: hero preload matches the hero image, stylesheet and script tokens are file hashes", () => {
  const hero = data.images[data.hero.image];
  assert.ok(html.includes(`imagesrcset="${hero.widths.map((w) => `${hero.base}-${w}w.avif ${w}w`).join(", ")}"`));
  for (const f of ["gear-shop.css", "gear-studio.js"]) {
    const m = html.match(new RegExp(`/${f.replace(".", "\\.")}\\?v=([0-9a-f]{10})`));
    assert.ok(m, f + " token");
  }
  assert.ok(!html.includes("tesla-page.css") && !html.includes("page-studios.css"), "removed render-blocking stylesheets are back");
});

test("content kept: credits, checklist, newsletter and the Wikimedia licences", () => {
  assert.equal(data.credits.length, 10);
  for (const c of data.credits) assert.ok(main.includes(`href="${c.url.replace(/&/g, "&amp;")}"`) || main.includes(c.url), c.subject);
  assert.match(main, /CC BY-SA 4\.0/);
  assert.equal((main.match(/<input type="checkbox"/g) || []).length, 4);
  assert.match(main, /data-ps-checklist/);
  assert.match(main, /Get the free weekly edition/);
});
