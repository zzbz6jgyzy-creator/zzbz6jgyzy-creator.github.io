// Redesign foundation: shared renderers, token contrast, the preview builder's HTML helpers, the homepage preview's
// structure and the exclusions that keep /preview/ out of search, the sitemap and live tooling. See docs/design-system.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { findElement, one, between, replaceOnce, children, htmlText, newestDate, buildHome, buildArticle, buildDispatchList, buildNews, buildTeslaHub, buildSpacexHub, buildGrokHub, buildFsdTracker, buildStarship, buildCybercab, buildCalendar, buildStarlink, buildProduction, ARTICLES, articles, HOME_TOOLS, PAGES } from "../scripts/build-design-preview.mjs";

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
  for (const file of ["ds.css", "ds-preview.css"]) {
    const src = read(file);
    for (const m of src.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) assert.ok(Number(m[1]) * (m[2] === "rem" ? 16 : 1) >= 12, `${file}: ${m[0]}`);
    for (const m of src.matchAll(/font:\s*(\d{3})\s/g)) assert.ok(Number(m[1]) <= 700, `${file} asks for weight ${m[1]}, which Inter does not ship`);
    assert.ok(!/font-weight:\s*(8|9)00/.test(src), `${file} asks for a weight Inter does not ship`);
    assert.ok(!/var\(--ds-mono\)[^;]*;[^}]*font-weight:\s*[6-9]00|font:\s*[6-9]00[^;]*var\(--ds-mono\)/.test(src), `${file} asks for a bold IBM Plex Mono, which is not shipped`);
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

for (const slug of ARTICLES) {
  test(`article preview ${slug}: hidden from search, and only the reading tools and contents move`, () => {
    const live = read(`dispatch/${slug}.html`);
    const html = buildArticle(slug);
    assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
    assert.equal((html.match(/<meta name="robots"/g) || []).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="https://superchargeddaily.com/dispatch/${slug}.html" />`));
    assert.match(html, /<title>Preview · /);
    assert.match(html, /<body class="[^"]*\bds-page ds-article"/);
    assert.match(html, /<link rel="stylesheet" href="\/ds-preview\.css\?v=[^"]+" \/>/);
    assert.match(html, /class="ds-preview-flag"/);
    // Same article text, media and order once the two furniture blocks are set aside (editorial-dates sees no change)
    assert.equal(articleBody(html), articleBody(live));
    assert.equal(html.match(TOOLS_RX)[0].trim(), live.match(TOOLS_RX)[0].trim(), "the reading tools are moved whole");
    // The tools now follow the lead figure and come before the first section heading
    const tools = html.indexOf("<!--rs:tools-->");
    const art = html.slice(0, tools);
    assert.ok(art.lastIndexOf("</figure>") > art.lastIndexOf('class="meta"'), "the reading tools follow the lead figure");
    const h2 = html.indexOf("<h2", tools);
    assert.ok(h2 < 0 || tools < h2);
    if (WAY_RX.test(live)) assert.ok(html.indexOf("<!--sd:article-wayfinding-->") > tools, "contents follow the tools");
    assert.equal(buildArticle(slug), html, "the build is deterministic");
  });
}

const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const hooks = (html, prefix) => new Set([...html.matchAll(new RegExp(`\\s(${prefix}[\\w-]*)`, "g"))].map((m) => m[1]));
const hidden = (html) => {
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.equal((html.match(/<meta name="robots"/g) || []).length, 1);
  assert.match(html, /<title>Preview · /);
  assert.match(html, /class="ds-preview-flag"/);
};

test("htmlText drops tags and decodes entities", () => {
  assert.equal(htmlText("Tesla&#x27;s <b>FSD</b> &amp; Grok&nbsp;news"), "Tesla's FSD & Grok news");
});

test("Dispatch list preview: compact masthead, the same cards and every browse hook", () => {
  const live = read("dispatch.html");
  const html = buildDispatchList();
  hidden(html);
  assert.ok(html.includes('<link rel="canonical" href="https://superchargeddaily.com/dispatch.html" />'));
  assert.deepEqual([...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)].map((m) => m[1]), ["Dispatch"]);
  assert.ok(!html.includes('class="ps-hero"'), "the old hero is gone");
  // Card markup is what articles.json, new-article.py and the integrity check read: same cards, same order, same HTML
  const cards = (h) => [...h.matchAll(/<a class="story-card"[\s\S]*?<\/a>/g)].map((m) => m[0].replace(' loading="eager" fetchpriority="high"', ' loading="lazy"'));
  assert.deepEqual(cards(html), cards(live));
  assert.match(html, /<div class="story-grid" data-disp-grid>/);
  for (const h of hooks(live, "data-disp-")) assert.ok(hooks(html, "data-disp-").has(h), "keeps " + h);
  for (const id of ids(live)) assert.ok(ids(html).has(id), "keeps #" + id);
  // The newest card is the LCP image: eager, high priority, preloaded; no other image preload (the live page preloads card #119)
  const first = html.match(/<a class="story-card"[\s\S]*?<\/a>/)[0];
  assert.match(first, /loading="eager" fetchpriority="high"/);
  assert.equal((html.match(/<link rel="preload" as="image"/g) || []).length, 1);
  // The editorial desk follows the list, with the policy link and a plain heading
  const grid = html.indexOf("data-disp-grid");
  const desk = html.indexOf('<aside class="ds-desk"');
  assert.ok(desk > grid, "the editorial desk comes after the cards");
  assert.match(html.slice(desk), /^<aside class="ds-desk"[^>]*><h2 id="ds-desk-h">The editorial desk<\/h2>[\s\S]*?href="\/editorial\.html"/);
  assert.ok(!/Beyond the headline/.test(html.slice(html.indexOf("<main"), html.indexOf("</main>"))), "no slogan heading");
  assert.equal(buildDispatchList(), html, "the build is deterministic");
});

test("news preview: compact masthead keeps the date news-studio.js updates, then the featured stories", () => {
  const live = read("news.html");
  const html = buildNews();
  hidden(html);
  assert.ok(html.includes('<link rel="canonical" href="https://superchargeddaily.com/news.html" />'));
  const h1 = [...html.matchAll(/<h1>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  assert.equal(h1.length, 1);
  assert.ok(!/<br>|\.$/.test(h1[0]), "plain h1 text");
  assert.equal((html.match(/id="ns-reporting-date"/g) || []).length, 1);
  assert.ok(!html.includes('class="ns-masthead"'));
  assert.match(html, /<\/header><section class="ns-front" id="latest"/, "featured stories follow the masthead");
  assert.match(html, /<h2 id="ns-browse-heading">All stories<\/h2>/);
  for (const id of ids(live)) assert.ok(ids(html).has(id), "keeps #" + id);
  for (const h of hooks(live, "data-ns-")) assert.ok(hooks(html, "data-ns-").has(h), "keeps " + h);
  assert.equal(buildNews(), html, "the build is deterministic");
});

test("newestDate reads datetime attributes and written dates, and refuses to guess", () => {
  assert.equal(newestDate('<time datetime="2026-11-19T10:00:00Z"></time> <span> / 20 Nov 2026</span> 21 Sept 2026'), "20 Nov 2026");
  assert.throws(() => newestDate("<p>no dates</p>"), /No dated story/);
});

const HUBS = [
  { slug: "tesla", build: buildTeslaHub, title: "Tesla news, trackers and guides", numbers: 'id="to-brief-grid"', band: true, data: "data-source-", hero: /<section class="to-hero"/ },
  { slug: "spacex", build: buildSpacexHub, title: "SpaceX launches, Starship and Starlink", numbers: 'id="sx-next"', band: true, data: "data-sx-", hero: /<header class="sx-hero"/ },
  { slug: "grok", build: buildGrokHub, title: "Grok and xAI: models, plans and news", numbers: 'class="ds-stats"', band: false, data: "data-gx-", hero: /<header class="gx-hero"/ },
];
/** Ids that lived only inside a removed hero and are referenced nowhere else on the live page (e.g. an SVG gradient). */
const heroOnlyIds = (live, heroRe) => {
  const hero = one(live, heroRe, "hero");
  const rest = live.replace(hero, "");
  return new Set([...ids(hero)].filter((id) => !new RegExp(`(?:#|["\\s])${id.replace(/[-]/g, "\\-")}(?=["\\s)])`).test(rest)));
};
for (const hub of HUBS) {
  test(`${hub.slug} hub preview: plain title, its own key numbers, then its latest stories, with every id kept`, () => {
    const live = read(`${hub.slug}.html`);
    const html = hub.build();
    hidden(html);
    assert.ok(html.includes(`<link rel="canonical" href="https://superchargeddaily.com/${hub.slug}.html" />`));
    assert.match(html, new RegExp(`<html[^>]*data-section="${hub.slug}"`));
    assert.deepEqual([...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]), [hub.title]);
    const mast = one(html, /<header class="ds-masthead"/, "masthead");
    assert.ok(mast.includes(hub.numbers), "the masthead carries the hub's key numbers");
    assert.equal(mast.includes('class="ds-band"'), hub.band);
    // The latest stories follow the masthead directly
    const after = html.slice(html.indexOf(mast) + mast.length, html.indexOf(mast) + mast.length + 200);
    assert.match(after, /^<section class="[^"]*\bds-hub-stories\b/);
    assert.match(after, /<h2 id="ds-hub-stories-h">Latest stories<\/h2>/);
    const gone = heroOnlyIds(live, hub.hero);
    for (const id of ids(live)) assert.ok(ids(html).has(id) || gone.has(id), "keeps #" + id);
    const heroHtml = one(live, hub.hero, "hero");
    const restHooks = hooks(live.replace(heroHtml, ""), hub.data);
    for (const h of hooks(live, hub.data)) assert.ok(hooks(html, hub.data).has(h) || !restHooks.has(h), "keeps " + h);
    assert.equal((html.match(/<script[^>]*id="(?:to|sx|gx)-data"/g) || []).length, (live.match(/<script[^>]*id="(?:to|sx|gx)-data"/g) || []).length);
    assert.equal(hub.build(), html, "the build is deterministic");
  });
}

test("Grok key numbers are the newest official release per product, each dated and linked", () => {
  const html = buildGrokHub();
  const tiles = [...html.matchAll(/<li class="ds-stat"><span class="ds-stat-label">([^<]+)<\/span><span class="ds-stat-value">([^<]+)<\/span><span class="ds-stat-src">As of ([^<]+) · <a href="(https:[^"]+)">/g)];
  assert.ok(tiles.length >= 2 && tiles.length <= 3, "two or three release tiles");
  assert.equal(new Set(tiles.map((t) => t[1])).size, tiles.length, "one tile per product");
  for (const t of tiles) assert.match(t[3], /^\d{1,2} [A-Z][a-z]{2,3} \d{4}$/);
});

const TRACKERS = [
  { file: "fsd-tracker", build: buildFsdTracker, title: "FSD tracker", hero: /<header class="ft-hero">/, inMast: ['class="ft-kpis"', 'class="ft-jump"'] },
  { file: "starship", build: buildStarship, title: "Starship flights", hero: /<header class="ss-hero" id="top">/, inMast: ['id="ss-hero-next"', 'id="ss-hero-window"', 'id="ss-source-date"', 'class="ds-band"'] },
  { file: "cybercab", build: buildCybercab, title: "Cybercab fleet", hero: null, inMast: ['class="ds-band"', "Texas registry as of"] },
  { file: "calendar", build: buildCalendar, title: "Launch calendar", hero: /<div id="cs-hero">/, inMast: ["Launch times as of"] },
  { file: "starlink", build: buildStarlink, title: "Starlink tracker", hero: /<header class="so-mast">/, inMast: ['class="so-source-strip"', 'class="so-metrics"'] },
  { file: "production", build: buildProduction, title: "Tesla production and deliveries", hero: /<header class="pd-hero">/, inMast: ['id="pd-quarter"', 'id="pd-stats"', 'id="pd-spotlight"', 'id="pd-view-note"'] },
];
for (const t of TRACKERS) {
  test(`${t.file} tracker preview: plain title, its own key numbers in the masthead, every hook kept`, () => {
    const live = read(`${t.file}.html`);
    const html = t.build();
    hidden(html);
    assert.ok(html.includes(`<link rel="canonical" href="https://superchargeddaily.com/${t.file}.html" />`));
    assert.deepEqual([...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]), [t.title]);
    const mast = one(html, /<header class="ds-masthead"/, "masthead");
    for (const x of t.inMast) assert.ok(mast.includes(x), `the masthead holds ${x}`);
    const gone = t.hero ? heroOnlyIds(live, t.hero) : new Set();
    for (const id of ids(live)) assert.ok(ids(html).has(id) || gone.has(id), "keeps #" + id);
    for (const h of hooks(live, "data-")) {
      if (/^data-(countup|open|view|mw-|so-|cs-|ss-|pd-|ft-)/.test(h)) assert.ok(hooks(html, "data-").has(h), "keeps " + h);
    }
    assert.equal(t.build(), html, "the build is deterministic");
  });
}

test("tracker previews keep the script contracts the plan names", () => {
  const cal = buildCalendar();
  assert.ok(cal.includes('<template id="cs-hero"></template>') && !cal.includes('<div id="cs-hero">'), "calendar-studio.js writes into an inert stub");
  const cyber = buildCybercab();
  assert.ok(cyber.indexOf('<header class="ds-masthead') < cyber.indexOf('<div id="mw-app"'), "the Cybercab masthead sits before #mw-app");
  assert.match(cyber, /<header class="mw-hero" hidden>[\s\S]*?<p class="mw-hero-title">/, "the old hero stays inside #mw-app, hidden, without its h1");
  const sl = buildStarlink();
  const ws = sl.indexOf('<div class="so-workspace"');
  assert.ok(ws > -1 && sl.indexOf('<header class="ds-masthead') > ws, "the Starlink masthead is inside .so-workspace");
  assert.match(sl, /<section class="so-hero" id="overview"[^>]*>[\s\S]*?<h2 id="so-title"/, "#overview stays, with its old h1 as an h2");
  const pd = buildProduction();
  assert.match(pd, /<div hidden><div class="pd-spotlight" id="pd-spotlight">/, "#pd-spotlight stays for production-studio.js, hidden");
});

test("the proposed nav has no duplicate links, a Grok menu and only links that resolve", () => {
  const live = JSON.parse(read("scripts/nav.json"));
  const next = JSON.parse(read("scripts/nav.next.json"));
  const groupLinks = (cfg) => cfg.dropdowns.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i[1])));
  const dupes = (list) => list.length - new Set(list).size;
  assert.ok(dupes(groupLinks(live)) > 0, "today's nav repeats links (the reason for the change)");
  assert.equal(dupes(groupLinks(next)), 0, "no link appears in two menus");
  assert.deepEqual(next.dropdowns.map((d) => d.label), ["News", "Tesla", "SpaceX", "Grok", "Trackers", "Explore"]);
  assert.deepEqual(next.mobileShortcuts, [], "the phone Quick access list goes");
  assert.ok(groupLinks(next).includes("/cybercab.html"));
  assert.ok(next.dropdowns.flatMap((d) => d.groups.flatMap((g) => g.items)).some((i) => i[0] === "Cybercab fleet" && i[1] === "/cybercab.html"));
  // Nothing reachable today disappears from the menus
  for (const h of groupLinks(live)) assert.ok(groupLinks(next).includes(h) || next.dropdowns.some((d) => (d.landing || [])[1] === h || (d.feature || {}).href === h), "keeps " + h);
  for (const d of next.dropdowns) {
    for (const h of [...d.groups.flatMap((g) => g.items.map((i) => i[1])), (d.landing || [])[1], (d.feature || {}).href].filter(Boolean)) {
      const [file, hash] = h.replace(/\?[^#]*/, "").split("#");
      const rel = file === "/" ? "index.html" : file.slice(1);
      assert.ok(fs.existsSync(path.join(ROOT, rel)), h + " points to a missing page");
      if (hash) assert.ok(read(rel).includes(`id="${hash}"`), h + " points to a missing anchor");
    }
  }
});

test("every preview carries the proposed nav and the hooks members.js needs", () => {
  for (const p of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, p.out), "utf8");
    const nav = between(html, "<!--sd:navigation-->", "<!--/sd:navigation-->");
    assert.ok(nav.includes('aria-controls="pn-grok"'), p.out + " has the Grok menu");
    assert.ok(!nav.includes("Quick access"), p.out + " still has the Quick access list");
    assert.match(nav, /<nav class="pn"[^>]*data-nav-studio/);
    assert.ok(nav.includes("data-ns-account"));
  }
  assert.ok(read("index.html").includes("Quick access"), "the live nav is unchanged until the switch");
});

test("committed previews are whole pages whose local files exist", () => {
  for (const p of PAGES) {
    const file = path.join(ROOT, p.out);
    assert.ok(fs.existsSync(file), p.out + " is committed");
    const html = fs.readFileSync(file, "utf8");
    assert.ok(html.trimEnd().toLowerCase().endsWith("</html>"), p.out + " is cut off");
    assert.ok(!/\n{3,}/.test(p.build()), p.out + " has blank-line runs inject-js-bundles.py would rewrite");
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
