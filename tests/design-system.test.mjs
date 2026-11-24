// Design system: shared renderers, token contrast, the page-transform helpers in scripts/ds-pages.mjs, and the
// news-first structure of the live homepage, lists, articles, hubs and trackers. See docs/design-system.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { findElement, one, between, replaceOnce, children, htmlText, newestDate } from "../scripts/ds-pages.mjs";

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
  const scale = [...css.matchAll(/--ds-fs-(\d+): ([\d.]+)rem;/g)];
  assert.equal(scale.length, 8, "the type scale has 8 steps");
  for (const [, name, rem] of scale) assert.equal(Number(rem) * 16, Number(name), `--ds-fs-${name} is ${rem}rem`);
  assert.match(css, /--ds-fs-display: clamp\(2rem,/, "display type never starts below 32px");
  for (const file of ["ds.css"]) {
    const src = read(file);
    for (const m of src.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) assert.ok(Number(m[1]) * (m[2] === "rem" ? 16 : 1) >= 12, `${file}: ${m[0]}`);
    for (const m of src.matchAll(/font:\s*(\d{3})\s/g)) assert.ok(Number(m[1]) <= 700, `${file} asks for weight ${m[1]}, which Inter does not ship`);
    assert.ok(!/font-weight:\s*(8|9)00/.test(src), `${file} asks for a weight Inter does not ship`);
    assert.ok(!/var\(--ds-mono\)[^;]*;[^}]*font-weight:\s*[6-9]00|font:\s*[6-9]00[^;]*var\(--ds-mono\)/.test(src), `${file} asks for a bold IBM Plex Mono, which is not shipped`);
  }
});

// ---- Page-transform helpers ----------------------------------------------------------------------------
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

// ---- Homepage ------------------------
const home = read("index.html");
const main = home.match(/<main\b[\s\S]*?<\/main>/)[0];

test("the homepage leads with the top story and a latest list, with plain labels", () => {
  assert.equal((home.match(/<h1[ >]/g) || []).length, 1);
  assert.match(main, /<h1>Tesla, SpaceX and xAI news<\/h1>/);
  for (const slogan of ["Go beyond the headline", "The story. And the bigger picture.", "Less scrolling", "More discovering", "Your interests", "Launches. Livestreams. Lift-off.", "Your window to the constellation"]) {
    assert.ok(!main.includes(slogan), `slogan still on the page: ${slogan}`);
  }
  assert.ok(!main.includes('class="hs-hero"'), "the old hero is gone");
  assert.match(main, /<h2 id="ds-numbers-h">From the trackers<\/h2>/, "dated snapshots are not called live");
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
  const toolUrls = [...tools.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(toolUrls.length, 11);
  for (const u of toolUrls) assert.ok(fs.existsSync(path.join(ROOT, u.slice(1))), u);
});

test("the homepage keeps every hook home-v2.js, home-studio.js and the bots use", () => {
  for (const hook of ["data-hv-lead", "data-hv-h", "data-hv-p", "data-hv-tag", "data-hv-img", "data-hv-supp", "data-hv-trk", "data-hv-cd", "data-hv-feed", 'id="newsletter"', 'id="hs-hero-email"', "data-newsletter-form", "data-live-slot"]) {
    assert.equal((main.match(new RegExp(hook.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length >= 1, true, hook);
  }
  for (const marker of ["hv:mast", "hv:lead", "hv:latest", "hv:supp", "hv:trk", "hv:event", "hv:changed", "hv:feed", "hv:band", "hv:feature", "hv:slasof"]) {
    assert.equal((main.match(new RegExp(`<!--${marker}-->`, "g")) || []).length, 1, marker);
    assert.equal((main.match(new RegExp(`<!--/${marker}-->`, "g")) || []).length, 1, "/" + marker);
  }
  assert.match(main, /<div class="hv-supp" data-hv-supp hidden>/, "the old supporting cards stay hidden for the script");
  const leadImg = one(main, /<div class="hv-lead-media"/).match(/<img\b[^>]*>/)[0];
  assert.ok(!/loading="lazy"/.test(leadImg) && /fetchpriority="high"/.test(leadImg), "the lead image loads first");
  const preload = between(home, "<!--hv:preload-->", "<!--/hv:preload-->");
  const leadSrcset = one(main, /<div class="hv-lead-media"/).match(/<source type="image\/avif" srcset="([^"]+)"/)[1];
  assert.ok(preload.includes(`imagesrcset="${leadSrcset}"`) && /fetchpriority="high"/.test(preload), "the preload is the lead image");
});

// ---- Lists, articles, hubs and trackers --------------------------------------------------------------
test("child scan skips text and comments and handles void and script elements", () => {
  const html = '<article> x <!-- <p> --><p class="a">1<p2></p><img src="/a.png"><script>let t="<p>";</script><figure><figure></figure></figure></article>';
  const kids = children(html, "<article>".length, html.length - "</article>".length);
  assert.deepEqual(kids.map((k) => [k.tag, k.cls]), [["p", "a"], ["img", ""], ["script", ""], ["figure", ""]]);
  assert.equal(html.slice(kids[3].start, kids[3].end), "<figure><figure></figure></figure>");
});

const TOOLS_RX = /\n?<!--rs:tools-->[\s\S]*?<!--\/rs:tools-->\n?/;
const WAY_RX = /\n?<!--sd:article-wayfinding-->[\s\S]*?<!--\/sd:article-wayfinding-->\n?/;
const articleBody = (html) => {
  const a = findElement(html, /<article\b[^>]*class="[^"]*\brs-article\b/);
  return html.slice(a.start, a.end).replace(TOOLS_RX, "").replace(WAY_RX, "").replace(/\s+/g, " ");
};

// Articles switched on 23 Nov 2026: the reading tools follow the lead photo or video on every live story.
for (const slug of ["tesla-cybercab-dallas-launch", "starship-every-flight-1-to-15", "spacex-q3-2026-results"]) {
  test(`article ${slug}: the reading tools follow the lead figure and come before the contents and the first section`, () => {
    const html = read(`dispatch/${slug}.html`);
    assert.match(html, /<body class="[^"]*\brs-story\b/);
    const tools = html.indexOf("<!--rs:tools-->");
    const art = html.slice(0, tools);
    assert.ok(art.lastIndexOf("</figure>") > art.lastIndexOf('class="meta"'), "the reading tools follow the lead figure");
    const h2 = html.indexOf("<h2", tools);
    assert.ok(h2 < 0 || tools < h2);
    if (WAY_RX.test(html)) assert.ok(html.indexOf("<!--sd:article-wayfinding-->") > tools, "contents follow the tools");
  });
}

const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const hooks = (html, prefix) => new Set([...html.matchAll(new RegExp(`\\s(${prefix}[\\w-]*)`, "g"))].map((m) => m[1]));

test("htmlText drops tags and decodes entities", () => {
  assert.equal(htmlText("Tesla&#x27;s <b>FSD</b> &amp; Grok&nbsp;news"), "Tesla's FSD & Grok news");
});

// Lists switched on 23 Nov 2026 (dispatch.html restructured once; news.html from news-studio-view.js).
test("Dispatch list: compact masthead, then the cards, with the desk after them and one high-priority image", () => {
  const html = read("dispatch.html");
  assert.deepEqual([...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)].map((m) => m[1]), ["Dispatch"]);
  assert.ok(!html.includes('class="ps-hero"'), "the old hero is gone");
  assert.match(html, /<div class="story-grid" data-disp-grid>/);
  assert.match(html, /<!--ds:latest-story--><time datetime="[^"]+">\d{1,2} [A-Z][a-z]{2} \d{4}<\/time><!--\/ds:latest-story-->/);
  const first = html.slice(html.indexOf("data-disp-grid")).match(/<a class="story-card"[\s\S]*?<\/a>/)[0];
  assert.match(first, /loading="eager" fetchpriority="high"/, "the newest card's image is the first image");
  assert.equal((html.match(/fetchpriority="high"/g) || []).length, 1);
  assert.equal((html.match(/<link rel="preload" as="image"/g) || []).length, 0, "no stale image preload");
  const grid = html.indexOf("data-disp-grid");
  const desk = html.indexOf('<aside class="ds-desk"');
  assert.ok(desk > grid, "the editorial desk comes after the cards");
  assert.match(html.slice(desk), /^<aside class="ds-desk"[^>]*><h2 id="ds-desk-h">The editorial desk<\/h2>[\s\S]*?href="\/editorial\.html"/);
});

test("newsroom: compact masthead keeps the date news-studio.js updates, then the featured stories", () => {
  const html = read("news.html");
  const h1 = [...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  assert.deepEqual(h1, ["Tesla, SpaceX and Grok news"]);
  assert.equal((html.match(/id="ns-reporting-date"/g) || []).length, 1);
  assert.ok(!html.includes('class="ns-masthead"'));
  assert.match(html, /<\/header><section class="ns-front" id="latest"/, "featured stories follow the masthead");
  assert.match(html, /<h2 id="ns-browse-heading">All stories<\/h2>/);
});

test("newestDate reads datetime attributes and written dates, and refuses to guess", () => {
  assert.equal(newestDate('<time datetime="2026-11-19T10:00:00Z"></time> <span> / 20 Nov 2026</span> 21 Sept 2026'), "20 Nov 2026");
  assert.throws(() => newestDate("<p>no dates</p>"), /No dated story/);
});

// Hubs switched on 23 Nov 2026: each studio builder passes its page through scripts/ds-pages.mjs before writing.
const HUBS = [
  { slug: "tesla", title: "Tesla news, trackers and guides", numbers: 'id="to-brief-grid"', band: true, data: /<script[^>]*id="to-data"/ },
  { slug: "spacex", title: "SpaceX launches, Starship and Starlink", numbers: 'id="sx-next"', band: true, data: /<script[^>]*id="sx-data"/ },
  { slug: "grok", title: "Grok and xAI: models, plans and news", numbers: 'class="ds-stats"', band: false, data: null },
];
for (const hub of HUBS) {
  test(`${hub.slug} hub: plain title, its own key numbers, then its latest stories`, () => {
    const html = read(`${hub.slug}.html`);
    assert.deepEqual([...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]), [hub.title]);
    assert.match(html, new RegExp(`<body class="[^"]*\\bds-hub-${hub.slug}\\b`));
    const bodyClasses = html.match(/<body\b[^>]*\bclass="([^"]*)"/)[1].split(/\s+/);
    assert.equal(bodyClasses.length, new Set(bodyClasses).size, "body classes are added once");
    const mast = one(html, /<header class="ds-masthead"/, "masthead");
    assert.ok(mast.includes(hub.numbers), "the masthead carries the hub's key numbers");
    assert.equal(mast.includes('class="ds-band"'), hub.band);
    const after = html.slice(html.indexOf(mast) + mast.length, html.indexOf(mast) + mast.length + 200);
    assert.match(after, /^<section class="[^"]*\bds-hub-stories\b/);
    assert.match(after, /<h2 id="ds-hub-stories-h">Latest stories<\/h2>/);
    if (hub.data) assert.match(html, hub.data, "the studio's saved data stays for its script");
  });
}

test("Grok key numbers are the newest official release per product, each with its release date and link", () => {
  const html = read("grok.html");
  const tiles = [...html.matchAll(/<li class="ds-stat"><span class="ds-stat-label">([^<]+)<\/span><span class="ds-stat-value">([^<]+)<\/span><span class="ds-stat-src">Released ([^<]+) · <a href="(https:[^"]+)">/g)];
  assert.ok(tiles.length >= 2 && tiles.length <= 3, "two or three release tiles");
  assert.equal(new Set(tiles.map((t) => t[1])).size, tiles.length, "one tile per product");
  for (const t of tiles) assert.match(t[3], /^\d{1,2} [A-Z][a-z]{2,3} \d{4}$/);
});

/**
 * Ids that lived only inside a removed hero: referenced nowhere else on the live page (e.g. an SVG gradient) and never
 * looked up by the page's own scripts (a call argument that is exactly the id or "#id", as getElementById(), $() and
 * querySelector() take them; the same id inside rendered HTML, id="x", is not a lookup).
 */
const heroOnlyIds = (live, heroRe) => {
  const hero = one(live, heroRe, "hero");
  const rest = live.replace(hero, "");
  const scripts = [...live.matchAll(/<script\b[^>]*\bsrc="\/([^"?#]+\.m?js)/g)]
    .map((m) => path.join(ROOT, m[1]))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");
  const esc = (id) => id.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  return new Set([...ids(hero)].filter((id) => !new RegExp(`(?:#|["\\s])${esc(id)}(?=["\\s)])`).test(rest) && !new RegExp(`\\(\\s*(['"\`])#?${esc(id)}\\1`).test(scripts)));
};
// Trackers switched on 23 Nov 2026 (builders pass their page through scripts/ds-pages.mjs; starship.html restructured once).
const TRACKERS = [
  { file: "fsd-tracker", title: "FSD tracker", inMast: ['class="ft-kpis"', 'class="ft-jump"'] },
  { file: "starship", title: "Starship flights", inMast: ['id="ss-hero-next"', 'id="ss-hero-window"', 'id="ss-source-date"', 'class="ds-band"'] },
  { file: "cybercab", title: "Cybercab fleet", inMast: ['class="ds-band"', "Texas registry as of"] },
  { file: "calendar", title: "Launch calendar", inMast: ["Launch times as of"] },
  { file: "starlink", title: "Starlink tracker", inMast: ['class="so-source-strip"', 'class="so-metrics"'] },
  { file: "production", title: "Tesla production and deliveries", inMast: ['id="pd-quarter"', 'id="pd-stats"', 'id="pd-spotlight"', 'id="pd-view-note"'] },
];
for (const t of TRACKERS) {
  test(`${t.file} tracker: plain title and its own key numbers in the masthead`, () => {
    const html = read(`${t.file}.html`);
    assert.deepEqual([...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]), [t.title]);
    const mast = one(html, /<header class="ds-masthead"/, "masthead");
    for (const x of t.inMast) assert.ok(mast.includes(x), `the masthead holds ${x}`);
    assert.ok(!/\n{3,}/.test(html), "no blank-line runs for inject-js-bundles to collapse");
  });
}

test("trackers keep the script contracts the plan names", () => {
  const cal = read("calendar.html");
  assert.ok(cal.includes('<template id="cs-hero"></template>') && !cal.includes('<div id="cs-hero">'), "calendar-studio.js writes into an inert stub");
  assert.equal((cal.match(/<div id="cs-app"><script>\(function\(a\)\{a\.classList\.add\("cs-enhanced"\)/g) || []).length, 1, "the calendar flags itself while parsing, once");
  assert.ok(!cal.includes('<div id="cs-app" class="cs-enhanced">'), "no static flag: without JavaScript the static listing shows");
  assert.match(read("production.html"), /<main id="main" class="pd-studio"><script>[^<]*SDProductionReady/, "production flags itself while parsing, with a load fallback");
  const cyber = read("cybercab.html");
  assert.ok(cyber.indexOf('<header class="ds-masthead') < cyber.indexOf('<div id="mw-app"'), "the Cybercab masthead sits before #mw-app");
  assert.match(cyber, /<header class="mw-hero" hidden>[\s\S]*?<p class="mw-hero-title">/, "the old hero stays inside #mw-app, hidden, without its h1");
  const sl = read("starlink.html");
  const ws = sl.indexOf('<div class="so-workspace"');
  assert.ok(ws > -1 && sl.indexOf('<header class="ds-masthead') > ws, "the Starlink masthead is inside .so-workspace");
  assert.match(sl, /<section class="so-hero" id="overview"[^>]*>[\s\S]*?<h2 id="so-title"/, "#overview stays, with its old h1 as an h2");
  assert.match(read("production.html"), /<div hidden><div class="pd-spotlight" id="pd-spotlight">/, "#pd-spotlight stays for production-studio.js, hidden");
});

test("no nav menu list repeats a link, Grok has a menu, and every link resolves", () => {
  const next = JSON.parse(read("scripts/nav.json"));
  const groupLinks = (cfg) => cfg.dropdowns.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i[1])));
  const dupes = (list) => list.length - new Set(list).size;
  assert.equal(dupes(groupLinks(next)), 0, "no link appears in two menu lists (feature cards may point at a listed page)");
  assert.deepEqual(next.dropdowns.map((d) => d.label), ["News", "Tesla", "SpaceX", "Grok", "Trackers", "Explore"]);
  assert.deepEqual(next.mobileShortcuts, [], "the phone Quick access list goes");
  assert.ok(next.dropdowns.flatMap((d) => d.groups.flatMap((g) => g.items)).some((i) => i[0] === "Cybercab fleet" && i[1] === "/cybercab.html"));
  for (const d of next.dropdowns) {
    for (const h of [...d.groups.flatMap((g) => g.items.map((i) => i[1])), (d.landing || [])[1], (d.feature || {}).href].filter(Boolean)) {
      const [file, hash] = h.replace(/\?[^#]*/, "").split("#");
      const rel = file === "/" ? "index.html" : file.slice(1);
      assert.ok(fs.existsSync(path.join(ROOT, rel)), h + " points to a missing page");
      if (hash) assert.ok(read(rel).includes(`id="${hash}"`), h + " points to a missing anchor");
    }
  }
});
