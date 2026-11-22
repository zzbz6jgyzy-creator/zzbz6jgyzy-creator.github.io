// Redesign foundation: shared renderers, token contrast, the preview builder's HTML helpers, the homepage preview's
// structure and the exclusions that keep /preview/ out of search, the sitemap and live tooling. See docs/design-system.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { findElement, one, between, replaceOnce, buildHome, articles, HOME_TOOLS, PAGES } from "../scripts/build-design-preview.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const DS = require("../ds-components.js");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ---- Renderers -------------------------------------------------------------------------------
test("renderers escape every value and keep a bare <h1>", () => {
  const html = DS.masthead({ kicker: "Tesla <b>", title: 'A "plain" title & more', dek: "<script>x</script>", metaHtml: "Updated 22 Nov 2026" });
  assert.match(html, /<h1>A &quot;plain&quot; title &amp; more<\/h1>/);
  assert.ok(!html.includes("<script>") && !html.includes("<b>"));
  assert.match(DS.masthead({ title: "T", titleId: "x" }), /<h1 id="x">T<\/h1>/);
  assert.match(DS.masthead({ title: "T", small: true }), /class="ds-masthead ds-masthead--small"/);
});

test("picture uses the smallest WebP as fallback and honours maxWidth", () => {
  const p = { base: "/assets/dispatch/x", widths: [960, 480, 1600], ratio: [1920, 1080] };
  const html = DS.picture(p, { alt: "A car", maxWidth: 960 });
  assert.match(html, /image\/avif" srcset="\/assets\/dispatch\/x-480w\.avif 480w, \/assets\/dispatch\/x-960w\.avif 960w"/);
  assert.ok(!html.includes("1600w"));
  assert.match(html, /<img src="\/assets\/dispatch\/x-480w\.webp" alt="A car" width="1920" height="1080" loading="lazy" decoding="async">/);
  assert.equal(DS.picture(null, {}), "");
  assert.match(DS.picture(null, { img: "/a.jpg", alt: "" }), /<img src="\/a\.jpg" alt=""/);
});

test("story list skips repeats and excluded URLs, stops at the limit, and dates in UTC", () => {
  const items = [
    { url: "/a", title: "A", date: "2026-11-20T23:30:00Z", topic: "tesla", tag: "FSD", minutes: 5 },
    { url: "/a", title: "A again", date: "2026-11-20T10:00:00Z" },
    { url: "/b", title: "B", date: "2026-11-19T00:00:00Z", topic: "spacex" },
    { url: "/c", title: "C", date: "2026-11-18T00:00:00Z" },
    { url: "/d", title: "", date: "2026-11-18T00:00:00Z" },
  ];
  const html = DS.storyList(items, { limit: 2, exclude: ["/b"] });
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.ok(html.includes('href="/a"') && html.includes('href="/c"') && !html.includes('href="/b"') && !html.includes("A again"));
  assert.match(html, /20 Nov · 5 min read/);
  assert.match(html, /data-topic="tesla"/);
  assert.match(DS.story({ url: "/x", title: "X", meta: "Plain description" }), /ds-story--text[\s\S]*Plain description/);
  assert.equal(DS.fmtDay("2026-11-30T23:59:00-05:00"), "1 Dec");
  assert.equal(DS.fmtDate("not a date"), "");
});

test("key numbers carry a label, an as-of date, a source link and a status", () => {
  const html = DS.stats([{ label: "Robotaxis", value: "1,507", unit: "registered in Texas", asOf: "21 Nov 2026", source: { label: "TxDMV via FSD Database", href: "https://fsddb.com/" }, status: "reported" }]);
  assert.match(html, /<ul class="ds-stats"><li class="ds-stat"><span class="ds-stat-label">Robotaxis<\/span><span class="ds-stat-value">1,507<\/span>/);
  assert.match(html, /As of 21 Nov 2026 · <a href="https:\/\/fsddb\.com\/">TxDMV via FSD Database<\/a>/);
  assert.match(html, /<span class="ds-status">Reported<\/span>/);
  assert.equal(DS.stats([]), "");
  assert.match(DS.sectionHead({ title: "Latest", href: "/dispatch.html", linkText: "All stories" }), /<h2>Latest<\/h2><a href="\/dispatch\.html">All stories<span aria-hidden="true"> →<\/span><\/a>/);
});

// ---- Tokens ------------------------------------------------------------------------------------
const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test("every accent and text token pair passes its contrast target", () => {
  const pairs = [
    ["#ffffff", "#e31937", 4.5, "white on the brand red fill"],
    ["#f23a52", "#0c0d10", 4.5, "red text on the dark page"],
    ["#f23a52", "#14151a", 4.5, "red text on dark cards"],
    ["#b01028", "#f3f1ec", 4.5, "red text on the light page"],
    ["#b01028", "#ffffff", 4.5, "red text on light cards"],
    ["#93d9f0", "#0c0d10", 7, "SpaceX ice on dark"],
    ["#06121a", "#93d9f0", 7, "text on the ice fill"],
    ["#06516f", "#f3f1ec", 7, "SpaceX ice on light (7:1, as the doc says)"],
    ["#ffffff", "#06516f", 7, "white on the light ice fill"],
    ["#cfd6e4", "#0c0d10", 4.5, "Grok silver on dark"],
    ["#111318", "#cfd6e4", 4.5, "text on the silver fill"],
    ["#39425a", "#f3f1ec", 4.5, "Grok silver on light"],
    ["#ffffff", "#39425a", 4.5, "white on the light silver fill"],
    ["#ecece8", "#0c0d10", 7, "ink on dark"],
    ["#a7a9ae", "#14151a", 4.5, "secondary ink on dark cards"],
    ["#5a5d64", "#f3f1ec", 4.5, "secondary ink on the light page"],
  ];
  for (const [fg, bg, min, what] of pairs) assert.ok(ratio(fg, bg) >= min, `${what}: ${fg} on ${bg} is ${ratio(fg, bg).toFixed(2)}:1`);
});

test("ds.css declares the tested tokens and never ships text below 12px", () => {
  const css = read("ds.css");
  assert.match(css, /--ds-accent-fill: #e31937/);
  assert.match(css, /--ds-accent: var\(--red-text, #f23a52\)/);
  assert.match(css, /html\[data-section="spacex"\] \{ --ds-accent: #93d9f0; --ds-accent-fill: #93d9f0; --ds-on-accent: #06121a; \}/);
  assert.match(css, /html\[data-theme="light"\]\[data-section="spacex"\] \{ --ds-accent: #06516f; --ds-accent-fill: #06516f; --ds-on-accent: #fff; \}/);
  assert.match(css, /html\[data-section="grok"\] \{ --ds-accent: #cfd6e4; --ds-accent-fill: #cfd6e4; --ds-on-accent: #111318; \}/);
  assert.match(css, /html\[data-theme="light"\]\[data-section="grok"\] \{ --ds-accent: #39425a; --ds-accent-fill: #39425a; --ds-on-accent: #fff; \}/);
  for (const file of ["ds.css", "ds-preview.css"]) {
    const sizes = [...read(file).matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    assert.ok(sizes.every((n) => n >= 12), `${file} has a font size under 12px`);
    assert.ok(!/font-weight:\s*(8|9)00/.test(read(file)), `${file} asks for a weight Inter does not ship`);
  }
});

// ---- Builder helpers ----------------------------------------------------------------------------
test("element extraction balances nested tags and skips scripts and comments", () => {
  const html = '<main><div class="a"><div>1</div><!-- <div> --><script>const s="<div>";</script><div>2</div></div><div class="b"></div></main>';
  const r = findElement(html, /<div class="a"/);
  assert.equal(html.slice(r.start, r.end), '<div class="a"><div>1</div><!-- <div> --><script>const s="<div>";</script><div>2</div></div>');
  assert.equal(one(html, /<div class="b"/), '<div class="b"></div>');
  assert.throws(() => one(html, /<div class="missing"/), /Expected exactly one/);
  assert.throws(() => one('<p class="x"></p><p class="x"></p>', /<p class="x"/), /found 2/);
  assert.equal(between("a<!--m-->b<!--/m-->c", "<!--m-->", "<!--/m-->"), "<!--m-->b<!--/m-->");
  assert.throws(() => replaceOnce("aa", "a", "b"), /not unique/);
});

test("articles keep a picture set only when its 480w files exist", () => {
  const list = articles();
  assert.ok(list.length > 10);
  for (const a of list.filter((x) => x.picture)) {
    for (const ext of ["avif", "webp"]) assert.ok(fs.existsSync(path.join(ROOT, `${a.picture.base}-480w.${ext}`.replace(/^\//, ""))), a.url);
  }
});

// ---- Homepage preview ---------------------------------------------------------------------------
const home = buildHome();
const main = home.match(/<main\b[\s\S]*?<\/main>/)[0];

test("homepage preview is hidden from search and points to the live page", () => {
  assert.match(home, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.equal((home.match(/<meta name="robots"/g) || []).length, 1);
  assert.match(home, /<link rel="canonical" href="https:\/\/superchargeddaily\.com\/" \/>/);
  assert.match(home, /<link rel="stylesheet" href="\/ds\.css\?v=[^"]+" \/>/);
  assert.match(home, /<link rel="stylesheet" href="\/ds-preview\.css\?v=[^"]+" \/>/);
  assert.match(main, /class="ds-preview-flag"/);
  assert.equal(buildHome(), home, "the build is deterministic");
});

test("homepage preview leads with the top story and a latest list, with plain labels", () => {
  assert.equal((home.match(/<h1[ >]/g) || []).length, 1);
  assert.match(main, /<h1>Tesla, SpaceX and xAI news<\/h1>/);
  for (const slogan of ["Go beyond the headline", "The story. And the bigger picture.", "Less scrolling", "More discovering", "Your interests", "Launches. Livestreams. Lift-off.", "Your window to the constellation"]) {
    assert.ok(!main.includes(slogan), `slogan still on the page: ${slogan}`);
  }
  assert.ok(!main.includes('class="hs-hero"'), "the old hero is gone");
  const order = ['class="pv-lead"', 'id="ds-latest-h"', 'id="ds-numbers-h"', 'id="newsletter"', 'id="hv-trk-h"', 'id="ds-launch-h"', 'id="hv-ch-h"', 'id="hs-wire-h"'];
  const at = order.map((s) => main.indexOf(s));
  assert.ok(at.every((i) => i > 0), "every section is present: " + order.filter((s, i) => at[i] < 0).join(", "));
  assert.deepEqual([...at].sort((a, b) => a - b), at, "sections are in the agreed order");
  const leadHref = main.match(/<a class="hv-lead" href="([^"]+)"/)[1];
  const latest = one(main, /<ol class="ds-story-list" aria-label="Latest stories"/);
  const urls = [...latest.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(urls.length, 7);
  assert.equal(new Set([leadHref, ...urls]).size, 8, "no story repeats between the lead and the latest list");
  const tools = one(main, /<ol class="ds-story-list" id="ds-tools"/);
  assert.equal((tools.match(/<li>/g) || []).length, HOME_TOOLS.length);
  for (const t of HOME_TOOLS) assert.ok(fs.existsSync(path.join(ROOT, t.url.slice(1))), t.url);
});

test("homepage preview keeps every hook home-v2.js, home-studio.js and the bots use", () => {
  for (const hook of ["data-hv-lead", "data-hv-h", "data-hv-p", "data-hv-tag", "data-hv-img", "data-hv-supp", "data-hv-trk", "data-hv-cd", "data-hv-feed", 'id="newsletter"', 'id="hs-hero-email"', "data-newsletter-form", "data-live-slot"]) {
    assert.equal((main.match(new RegExp(hook.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length >= 1, true, hook);
  }
  for (const marker of ["hv:lead", "hv:supp", "hv:trk", "hv:event", "hv:changed", "hv:feed", "hv:band", "hv:feature"]) {
    assert.equal((main.match(new RegExp(`<!--${marker}-->`, "g")) || []).length, 1, marker);
    assert.equal((main.match(new RegExp(`<!--/${marker}-->`, "g")) || []).length, 1, "/" + marker);
  }
  assert.match(main, /<div class="hv-supp" data-hv-supp hidden>/, "the old supporting cards stay hidden for the script");
  const leadImg = one(main, /<div class="hv-lead-media"/).match(/<img\b[^>]*>/)[0];
  assert.ok(!/loading="lazy"/.test(leadImg) && /fetchpriority="high"/.test(leadImg), "the lead image loads first");
  assert.match(home, /<link rel="preload" as="image" type="image\/avif" imagesrcset="[^"]+" imagesizes="[^"]+" fetchpriority="high" \/>/);
  assert.ok(!home.includes("<!--hv:preload-->"), "the old hero preload is gone");
});

// ---- Committed previews and exclusions --------------------------------------------------------------
test("committed previews are whole pages whose local files exist", () => {
  for (const p of PAGES) {
    const file = path.join(ROOT, p.out);
    assert.ok(fs.existsSync(file), p.out + " is committed");
    const html = fs.readFileSync(file, "utf8");
    assert.ok(html.trimEnd().toLowerCase().endsWith("</html>"), p.out + " is cut off");
    assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
    const refs = new Set([...html.matchAll(/(?:src|href)=["'](\/[^"'?#\s]+?\.(?:js|css|mjs|ics))(?:[?#][^"']*)?["']/gi)].map((m) => m[1]));
    for (const m of html.matchAll(/(?:src|href|poster)=["'](\/assets\/[^"'?#\s]+)(?:[?#][^"']*)?["']/gi)) refs.add(m[1]);
    for (const r of refs) assert.ok(fs.existsSync(path.join(ROOT, r.slice(1))), `${p.out} points to ${r}, which does not exist`);
  }
});

test("previews stay out of robots, the sitemaps, search and live tooling", () => {
  assert.match(read("robots.txt"), /^Disallow: \/preview\/$/m);
  for (const f of ["sitemap.xml", "sitemap-news.xml", "data/pages.json", "feed.xml"]) {
    if (fs.existsSync(path.join(ROOT, f))) assert.ok(!read(f).includes("/preview/"), f + " lists a preview page");
  }
  assert.match(read("scripts/check-site-integrity.py"), /"preview\/"\)/);
  assert.match(read("scripts/sync-nav.py"), /parts\[:1\]==\('preview',\): continue/);
  assert.match(read("scripts/inject-js-bundles.py"), /if rel\.startswith\("preview\/"\):\n\s+# Design preview[^\n]*\n\s+rel = rel\[len\("preview\/"\):\]/);
  assert.match(read("scripts/indexnow-ping.py"), /"scripts\/", "preview\/"/);
  for (const wf of ["home-build.yml", "news-snapshot.yml", "starlink-refresh.yml"]) {
    assert.match(read(".github/workflows/" + wf), /\[ -d preview \] && git add -A -- preview \|\| true/, wf + " stages preview bundle updates");
  }
});
