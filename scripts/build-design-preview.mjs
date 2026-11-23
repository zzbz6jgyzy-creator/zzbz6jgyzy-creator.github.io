#!/usr/bin/env node
// Builds the hidden design-preview pages in /preview/ from the live pages and the data files.
//
// Live pages and their builders are untouched. Each preview is composed from a live page (its tools, scripts and every
// hook a script needs are kept) plus the shared renderers in ds-components.js and the styles in ds.css / ds-preview.css.
// Previews are noindex,nofollow with a canonical to the live URL; robots.txt disallows /preview/; the sitemap, search
// index, nav sync, indexnow and the integrity check skip them. The preview pipeline is deleted at the switch.
//
// Every cut must match exactly once, so a change to a live page fails loudly here instead of producing a broken preview.
// Usage: node scripts/build-design-preview.mjs [--check]   (--check: exit 1 if a preview would change)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const DS = require("../ds-components.js");
const SITE = "https://superchargeddaily.com";
export const DS_CSS_V = "20261123f"; // bump when ds.css or ds-preview.css changes

const read = (rel, root = ROOT) => fs.readFileSync(path.join(root, rel), "utf8");

// ---- HTML helpers: no parser dependency; scripts and comments are skipped while balancing tags ----

/** Balanced element starting at the first match of openRe (at or after `from`). Returns { start, end } or null. */
export function findElement(html, openRe, from = 0) {
  const re = new RegExp(openRe.source, "g" + openRe.flags.replace(/g/g, ""));
  re.lastIndex = from;
  const m = re.exec(html);
  if (!m) return null;
  const tag = (m[0].match(/^<([a-z][a-z0-9-]*)/i) || [])[1];
  if (!tag) throw new Error("Pattern must match an opening tag: " + openRe);
  const scan = new RegExp(`<script\\b[^>]*>[\\s\\S]*?<\\/script>|<!--[\\s\\S]*?-->|<(\\/?)${tag}(?=[\\s>/])[^>]*>`, "gi");
  scan.lastIndex = m.index;
  let depth = 0;
  let t;
  while ((t = scan.exec(html))) {
    if (t[1] === undefined) continue; // script or comment
    if (t[1] === "/") depth--;
    else if (!t[0].endsWith("/>")) depth++;
    if (depth === 0) return { start: m.index, end: t.index + t[0].length };
  }
  throw new Error("Unbalanced <" + tag + "> for " + openRe);
}

/** The element matched by openRe, which must occur exactly once in html. */
export function one(html, openRe, label = String(openRe)) {
  const count = (html.match(new RegExp(openRe.source, "g")) || []).length;
  if (count !== 1) throw new Error(`Expected exactly one ${label}, found ${count}`);
  const r = findElement(html, openRe);
  return html.slice(r.start, r.end);
}

/** Text from marker a through marker b; each marker must occur exactly once. */
export function between(html, a, b) {
  const i = html.indexOf(a);
  const j = html.indexOf(b);
  if (i < 0 || j < i || html.indexOf(a, i + 1) >= 0 || html.indexOf(b, j + 1) >= 0) throw new Error("Marker pair not unique: " + a);
  return html.slice(i, j + b.length);
}

/** Replace exactly one occurrence of needle. Slices, so "$&" or "$'" in third-party text are never expanded. */
export function replaceOnce(html, needle, value) {
  const i = html.indexOf(needle);
  if (i < 0 || html.indexOf(needle, i + needle.length) >= 0) throw new Error("Needle not unique: " + needle.slice(0, 80));
  return html.slice(0, i) + value + html.slice(i + needle.length);
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** Element children of html[start, end), skipping text and comments: [{ tag, cls, start, end }]. */
export function children(html, start, end) {
  const out = [];
  let i = start;
  while (i < end) {
    const lt = html.indexOf("<", i);
    if (lt < 0 || lt >= end) break;
    if (html.startsWith("<!--", lt)) {
      i = html.indexOf("-->", lt) + 3;
      continue;
    }
    const m = /^<([a-z][a-z0-9-]*)\b[^>]*>/i.exec(html.slice(lt, lt + 4000));
    if (!m) throw new Error("Unexpected markup inside the range at " + lt + ": " + html.slice(lt, lt + 40));
    const tag = m[1].toLowerCase();
    let e;
    if (VOID.has(tag) || m[0].endsWith("/>")) e = lt + m[0].length;
    else if (tag === "script" || tag === "style") e = html.indexOf(`</${tag}>`, lt) + tag.length + 3;
    else e = findElement(html, new RegExp(`<${tag}\\b`, "i"), lt).end;
    if (e > end) throw new Error(`<${tag}> at ${lt} runs past the end of the range`);
    out.push({ tag, cls: (m[0].match(/\bclass="([^"]*)"/) || [])[1] || "", start: lt, end: e });
    i = e;
  }
  return out;
}

function sectionCssVersion(root) {
  const m = read("theme-boot.js", root).match(/SECTION_CSS_V\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("SECTION_CSS_V not found in theme-boot.js");
  return m[1];
}

/** Previews live one folder deeper (/preview/...), so every local URL in a source page must be root-relative. */
export function assertRootRelative(html, label) {
  // Query-only links ("?event=x") stay on the same page wherever it lives, and any URL with a scheme is absolute.
  const bad = [...html.matchAll(/\s(?:src|href|poster|action)="(?!\/|#|\?|\{|[a-z][a-z0-9+.-]*:)([^"]+)"/gi)].map((m) => m[1]);
  if (bad.length) throw new Error(`${label}: relative URLs would break under /preview/: ${bad.slice(0, 3).join(", ")}`);
}

const navCache = new Map();
/**
 * Renders the navigation from scripts/nav.json (no duplicate links, a Grok menu, "Cybercab
 * fleet", no phone "Quick access" list). sync-nav.py renders it, so the markup is exactly what the switch would ship.
 */
export function withNextNav(html, root = ROOT) {
  const block = between(html, "<!--sd:navigation-->", "<!--/sd:navigation-->");
  const tag = (block.match(/<nav class="pn"[^>]*>/) || [])[0];
  if (!tag) throw new Error('No <nav class="pn"> in the navigation block');
  if (!navCache.has(tag)) {
    navCache.set(tag, execFileSync("python3", [path.join(root, "scripts/sync-nav.py"), "--block", "scripts/nav.json"], { input: tag, encoding: "utf8", cwd: root }));
  }
  return replaceOnce(html, block, navCache.get(tag));
}

/** Head changes shared by every preview: noindex, canonical check, section theme, design CSS, LCP preload. */
export function previewHead(html, { live, section = "", preload = "", keepImagePreloads = false, root = ROOT }) {
  let h = html.replace(/<title>(?!Preview · )/, "<title>Preview · ");
  const robots = '<meta name="robots" content="noindex, nofollow" />';
  h = /<meta name="robots"[^>]*>/.test(h) ? h.replace(/<meta name="robots"[^>]*>/, robots) : replaceOnce(h, "</title>", "</title>\n    " + robots);
  const canon = `<link rel="canonical" href="${SITE}${live}" />`;
  if (!h.includes(canon)) throw new Error("Live page has no canonical " + canon);
  if (section) h = h.replace(/<html\b([^>]*)>/, (m, a) => (/data-section=/.test(a) ? m : `<html${a} data-section="${section}">`));
  // The old hero's preload (and any other image preload) goes; the new LCP image gets its own.
  h = h.replace(/<!--hv:preload-->[\s\S]*?<!--\/hv:preload-->/, "");
  if (!keepImagePreloads) h = h.replace(/\s*<link rel="preload" as="image"[^>]*>/g, "");
  const css = [];
  if (section && !h.includes("/section-theme.css")) css.push(`<link rel="stylesheet" href="/section-theme.css?v=${sectionCssVersion(root)}" />`);
  if (!h.includes('href="/ds.css')) css.push(`<link rel="stylesheet" href="/ds.css?v=${DS_CSS_V}" />`); // live pages carry it since the switch
  css.push(`<link rel="stylesheet" href="/ds-preview.css?v=${DS_CSS_V}" />`);
  h = replaceOnce(h, "</head>", (preload ? "    " + preload + "\n" : "") + "    " + css.join("\n    ") + "\n  </head>");
  h = withNextNav(h, root);
  // inject-js-bundles.py (run by the bots on every page, previews included) collapses blank-line runs the same way;
  // matching it keeps the bots and the preview refresh from rewriting each other's output.
  return h.replace(/\n{3,}/g, "\n\n");
}

/** Article records from data/articles.json, with picture sets only where the 480w files exist on disk. */
export function articles(root = ROOT) {
  const list = JSON.parse(read("data/articles.json", root)).articles || [];
  return list.map((a) => {
    const p = a.picture;
    const ok = p && p.base && [480].every((w) => ["avif", "webp"].every((ext) => fs.existsSync(path.join(root, `${p.base}-${w}w.${ext}`.replace(/^\//, "")))));
    return ok ? a : { ...a, picture: null };
  });
}

function preloadFor(pictureHtml, sizes) {
  const m = pictureHtml.match(/<source type="image\/avif" srcset="([^"]+)"/);
  return m ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${m[1]}" imagesizes="${sizes}" fetchpriority="high" />` : "";
}

/** Adds classes to <body>, with or without an existing class attribute. */
export function addBodyClass(html, cls) {
  if (/<body\b[^>]*\bclass="/.test(html)) return html.replace(/<body\b([^>]*?)\bclass="([^"]*)"/, (m, a, c) => `<body${a}class="${c} ${cls}"`);
  return replaceOnce(html, "<body>", `<body class="${cls}">`);
}

/** Plain text of a small HTML fragment (tags dropped, common entities decoded), for renderers that escape their input. */
export function htmlText(fragment) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : named[e.toLowerCase()] ?? m))
    .replace(/\s+/g, " ")
    .trim();
}

/** The first card of a list becomes the likely LCP image: load it eagerly at high priority and preload its AVIF set. */
function promoteFirstImage(page, cardRe, sizes) {
  const card = findElement(page, cardRe);
  if (!card) return { page, preload: "" };
  const html = page.slice(card.start, card.end);
  const eager = html.replace(/\sloading="lazy"/, ' loading="eager" fetchpriority="high"');
  return { page: page.slice(0, card.start) + eager + page.slice(card.end), preload: preloadFor(html, sizes) };
}

// ---- Pages ----

/** Homepage trackers and tools, by plain name. Every URL is a live page linked from the nav or the old tool cards. */
/** Header furniture an article opens with, before its first piece of content. */
const ARTICLE_HEADER = new Set(["eyebrow", "standfirst", "meta", "sd-disclosure", "sd-updated"]);

/**
 * Article: the reading tools (rs:tools) and "On this page" (sd:article-wayfinding) move from between the standfirst and
 * the byline to just after the lead photo or video, so the headline, standfirst, byline and lead image sit together in
 * the first screen. Nothing else moves. Both blocks are page furniture for scripts/editorial-dates.py once rs:tools joins
 * its BLOCKS list (redesign step 3, itself a deliberate correction of about 83 wrong "Updated 9 Nov 2026" dates); after
 * that, the same move in build-article-reader.py and build-wayfinding.py at the switch changes no article's fingerprint.
 * Where the story has no lead figure the blocks go just before its first content.
 */
export function buildArticle(slug, root = ROOT) {
  const liveUrl = `/dispatch/${slug}.html`;
  const live = read(liveUrl.slice(1), root);
  assertRootRelative(live, liveUrl);
  if (!/<article\b[^>]*class="[^"]*\brs-article\b/.test(live)) throw new Error(liveUrl + " is not a Dispatch article");
  let page = addBodyClass(live, "ds-page ds-article");
  const tools = between(page, "<!--rs:tools-->", "<!--/rs:tools-->");
  page = replaceOnce(page, tools, "");
  let way = "";
  if (page.includes("<!--sd:article-wayfinding-->")) {
    way = between(page, "<!--sd:article-wayfinding-->", "<!--/sd:article-wayfinding-->");
    page = replaceOnce(page, way, "");
  }
  const art = findElement(page, /<article\b[^>]*class="[^"]*\brs-article\b[^"]*"[^>]*>/);
  const inner = page.indexOf(">", art.start) + 1;
  const kids = children(page, inner, page.lastIndexOf("</article>", art.end));
  const first = kids.find((k) => k.tag !== "h1" && !k.cls.split(/\s+/).some((c) => ARTICLE_HEADER.has(c)));
  if (!first) throw new Error(liveUrl + ": no content after the article header");
  const at = first.tag === "figure" ? first.end : first.start;
  page = page.slice(0, at) + "\n" + tools + (way ? "\n" + way : "") + "\n" + page.slice(at);
  page = replaceOnce(page, "</main>", DS.previewFlag(liveUrl) + "\n</main>");
  return previewHead(page, { live: liveUrl, keepImagePreloads: true, root });
}

/**
 * Dispatch list: a compact masthead, the existing topic chips, search and sort, then the cards. The Editorial desk box
 * moves below the list (beside it on wide screens). The card markup is untouched: data/articles.json is parsed from it,
 * new-article.py inserts at its grid marker, the integrity check counts a.story-card and dispatch-browse.js pages it.
 */
export function buildDispatchList(root = ROOT) {
  const live = read("dispatch.html", root);
  assertRootRelative(live, "/dispatch.html");
  const hero = one(live, /<header class="ps-hero"/, "Dispatch hero");
  const desk = one(hero, /<aside class="ps-edition"/, "Editorial desk");
  const intro = desk.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  const steps = [...desk.matchAll(/<div class="ps-rule"><b>[^<]*<\/b>\s*([\s\S]*?)<\/div>/g)].map((m) => m[1].trim());
  const policy = desk.match(/<a href="(\/[^"#]+)">([\s\S]*?)<\/a>/);
  if (!intro || steps.length < 2 || !policy) throw new Error("Editorial desk changed shape: intro, steps or policy link missing");
  const newest = (live.match(/<div class="story-grid" data-disp-grid>[\s\S]*?<time datetime="([^"]+)"/) || [])[1];
  if (!newest) throw new Error("dispatch.html: no dated story card");
  const mast = DS.masthead({
    kicker: "Original reporting",
    title: "Dispatch",
    dek: htmlText(intro[1]),
    metaHtml: `Latest story ${DS.fmtDate(newest)} · <a href="${DS.esc(policy[1])}">How we report</a>`,
    className: "ds-masthead--list",
  });
  let page = replaceOnce(live, hero, mast);
  const aside =
    '<aside class="ds-desk" aria-labelledby="ds-desk-h"><h2 id="ds-desk-h">The editorial desk</h2>' +
    `<p>${intro[1].trim()}</p><ol>${steps.map((t) => `<li>${t}</li>`).join("")}</ol>` +
    `<p><a href="${DS.esc(policy[1])}">${policy[2].replace(/\s*→\s*$/, "").trim()}<span aria-hidden="true"> →</span></a></p></aside>`;
  const grid = one(page, /<section class="section"[^>]*>\s*<div class="story-grid" data-disp-grid>/, "Dispatch card grid");
  page = replaceOnce(page, grid, `<div class="ds-list-layout">\n${grid}\n${aside}\n</div>`);
  const lead = promoteFirstImage(page, /<a class="story-card"/, "(max-width: 760px) 100vw, 640px");
  page = addBodyClass(lead.page, "ds-page ds-list ds-dispatch");
  page = replaceOnce(page, "</main>", DS.previewFlag("/dispatch.html") + "\n</main>");
  return previewHead(page, { live: "/dispatch.html", preload: lead.preload, root });
}

/**
 * news.html: a compact masthead (it keeps #ns-reporting-date, which news-studio.js updates), the featured stories (#latest)
 * straight after it, and a plain heading on the story library (its id stays for aria-labelledby).
 */
export function buildNews(root = ROOT) {
  const live = read("news.html", root);
  assertRootRelative(live, "/news.html");
  const head = one(live, /<header class="ns-masthead"/, "news masthead");
  const date = one(head, /<time id="ns-reporting-date"/, "#ns-reporting-date");
  const title = htmlText(one(head, /<h1\b/, "news h1")).replace(/\.$/, "");
  const lede = htmlText((head.match(/<div class="ns-intro">[\s\S]*?<\/h1>\s*<\/div>\s*<div>\s*<p>([\s\S]*?)<\/p>/) || [])[1] || "");
  if (!lede) throw new Error("news.html: intro paragraph not found");
  const daily = head.match(/<a href="(\/daily\.html)">/);
  const mast = DS.masthead({
    kicker: "Newsroom",
    title,
    dek: lede.split(/(?<=\.)\s/)[0],
    metaHtml: `Reporting through ${date}` + (daily ? ` · <a href="${daily[1]}">Make it your Daily</a>` : ""),
    className: "ds-masthead--list",
  });
  let page = replaceOnce(live, head, mast);
  const lib = one(page, /<div class="ns-section-head"/, "news library heading");
  if (!/id="ns-browse-heading"/.test(lib)) throw new Error("news.html: #ns-browse-heading moved");
  const archive = lib.match(/<a class="ns-archive-link" href="(\/[^"]+)"/);
  page = replaceOnce(page, lib, DS.sectionHead({ id: "ns-browse-heading", title: "All stories", href: archive ? archive[1] : "/dispatch.html", linkText: "Dispatch archive" }));
  page = addBodyClass(page, "ds-page ds-list ds-news");
  page = replaceOnce(page, "</main>", DS.previewFlag("/news.html") + "\n</main>");
  return previewHead(page, { live: "/news.html", keepImagePreloads: true, root });
}

// ---- Hubs: compact masthead with the hub's own key numbers and a slim photo band, then its latest stories ----

/** A slim photo band from a live <picture> (kept as is: its sources, sizes and credits are the live page's). */
const BAND_SIZES = "(min-width:1228px) 1180px, 100vw";
function bandFrom(pictureHtml, captionHtml) {
  const pic = pictureHtml
    .replace(/(<img\b[^>]*?)\s+class="[^"]*"/, "$1") // the old hero's image classes position it full-screen
    .replace(/\ssizes="[^"]*"/g, ` sizes="${BAND_SIZES}"`); // a slim band, not a full-screen hero
  return `<figure class="ds-band">${pic}${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}</figure>`;
}

const MONTH = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

/** Newest of the dates in a string of card dates (datetime attributes or "20 Nov 2026" text); pass card dates only, not summaries. */
export function newestDate(html) {
  const iso = [...html.matchAll(/datetime="(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\w* (\d{4})\b/g)) {
    iso.push(`${m[3]}-${String(MONTH[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  if (!iso.length) throw new Error("No dated story to take an Updated date from");
  return DS.fmtDate(iso.sort().pop() + "T12:00:00Z");
}

function hubSection(id, title, href, linkText, inner, attrs = "") {
  return `<section class="ds-section ds-hub-stories"${attrs} aria-labelledby="${id}">` + DS.sectionHead({ id, title, href, linkText }) + inner + "</section>";
}

function finishHub(page, liveUrl, section, root) {
  page = addBodyClass(page, `ds-page ds-hub ds-hub-${section}`);
  page = replaceOnce(page, "</main>", DS.previewFlag(liveUrl) + "\n</main>");
  // The old heroes' image preloads were sized for a full-screen hero; the band's image is in the HTML near the top.
  return previewHead(page, { live: liveUrl, section, root });
}

/** Tesla hub: the masthead takes the hub's own numbers (#to-brief-grid and its note); #to-stories moves up under it. */
export function buildTeslaHub(root = ROOT) {
  const liveUrl = "/tesla.html";
  const live = read("tesla.html", root);
  assertRootRelative(live, liveUrl);
  const hero = one(live, /<section class="to-hero"/, "Tesla hero");
  const pic = one(hero, /<picture>/, "Tesla hero picture");
  const grid = one(live, /<div id="to-brief-grid"/, "#to-brief-grid");
  const after = live.slice(live.indexOf(grid) + grid.length);
  const fine = (after.match(/^\s*<p class="to-fine">[\s\S]*?<\/p>/) || [])[0];
  if (!fine) throw new Error("tesla.html: the numbers note no longer follows #to-brief-grid");
  const stories = one(live, /<div id="to-stories"/, "#to-stories");
  const caption = hero.match(/<a class="to-hero-caption" href="(\/[^"]+)"><span>([^<]*)<\/span>[\s\S]*?<small>([^<]*)<\/small>/);
  if (!caption) throw new Error("tesla.html: hero caption changed shape");
  const subject = caption[2].split("/").pop().trim();
  const mast = DS.masthead({
    kicker: "Tesla",
    title: "Tesla news, trackers and guides",
    titleId: "to-title",
    dek: "The cars, the software, Robotaxi and the numbers, from an owner and shareholder.",
    metaHtml: `Latest story ${newestDate([...stories.matchAll(/<p class="to-eyebrow">[^<]*<span>\s*\/\s*([^<]+)<\/span>/g)].map((m) => m[1]).join(" "))} · <a href="#sources">Sources</a>`,
    statsHtml: `<div class="ds-hub-numbers">${grid}<details class="ds-hub-note"><summary>About these numbers</summary>${fine.trim()}</details></div>`,
    band: null,
    extraHtml: bandFrom(pic, `<a href="${DS.esc(caption[1])}">${DS.esc(subject)}</a> · ${DS.esc(caption[3].trim())}`),
  });
  let page = replaceOnce(live, grid + fine, "");
  page = replaceOnce(page, stories, "");
  page = replaceOnce(page, hero, mast + hubSection("ds-hub-stories-h", "Latest stories", "/dispatch.html?topic=tesla", "All Tesla stories", stories));
  return finishHub(page, liveUrl, "tesla", root);
}

/** SpaceX hub: the next-launch card (#sx-next, kept live by spacex-studio.js) joins the masthead; the stories move up. */
export function buildSpacexHub(root = ROOT) {
  const liveUrl = "/spacex.html";
  const live = read("spacex.html", root);
  assertRootRelative(live, liveUrl);
  const hero = one(live, /<header class="sx-hero"/, "SpaceX hero");
  const pic = one(hero, /<picture>/, "SpaceX hero picture");
  const credit = hero.match(/<div class="sx-hero-bottom">[\s\S]*?<a href="(#[^"]+)">([^<]+)<\/a>/);
  if (!credit) throw new Error("spacex.html: photo credit changed shape");
  const next = one(live, /<aside class="sx-next" id="sx-next"/, "#sx-next");
  const section = one(live, /<section class="sx-section" id="stories"/, "SpaceX stories section");
  const head = one(section, /<header class="sx-section-head"/, "SpaceX stories heading");
  const asOf = (live.match(/"scheduleAsOf":\s*"([^"]+)"/) || [])[1];
  const mast = DS.masthead({
    kicker: "SpaceX",
    title: "SpaceX launches, Starship and Starlink",
    dek: "The launch schedule, the fleet and our reporting, with dated sources.",
    metaHtml: (asOf ? `Schedule as of ${DS.fmtDate(asOf)} · ` : "") + '<a href="#sources">Sources</a>',
    statsHtml: `<div class="ds-hub-numbers">${next}</div>`,
    extraHtml: bandFrom(pic, DS.esc(credit[2].trim())),
  });
  const stories = section
    .replace(head, DS.sectionHead({ id: "ds-hub-stories-h", title: "Latest stories", href: "/dispatch.html?topic=spacex", linkText: "All SpaceX stories" }))
    .replace('<section class="sx-section" id="stories">', '<section class="sx-section ds-section ds-hub-stories" id="stories" aria-labelledby="ds-hub-stories-h">');
  let page = replaceOnce(live, next, "");
  page = replaceOnce(page, section, "");
  page = replaceOnce(page, hero, mast + stories);
  return finishHub(page, liveUrl, "spacex", root);
}

const GROK_LABEL = { model: "Grok model", bot: "Grok Bot", voice: "Grok Voice", imagine: "Grok Imagine", api: "xAI API" };

/** Grok hub: the newest official release per product line as key numbers; the reporting grid moves up from #latest. */
export function buildGrokHub(root = ROOT) {
  const liveUrl = "/grok.html";
  const live = read("grok.html", root);
  assertRootRelative(live, liveUrl);
  const hero = one(live, /<header class="gx-hero"/, "Grok hero");
  const latest = one(live, /<section class="gx-section" id="latest"/, "Grok #latest");
  const sub = one(latest, /<div class="gx-subhead" id="stories"/, "Grok reporting heading");
  const grid = one(latest, /<div class="gx-story-grid"/, "Grok reporting grid");
  const note = (latest.slice(latest.indexOf(sub) + sub.length, latest.indexOf(grid)).match(/<p class="gx-fine">[\s\S]*?<\/p>/) || [""])[0];
  const description = htmlText((hero.match(/<p class="gx-hero-description">([\s\S]*?)<\/p>/) || [])[1] || "");
  const checked = (hero.match(/Source reference checked ([^<]+)</) || [])[1];
  if (!description || !checked) throw new Error("grok.html: hero description or source date missing");
  const seen = new Set();
  const releases = [...latest.matchAll(/<article class="gx-release"><p class="gx-kicker">([^<]+)<\/p><span>([^<]+)<\/span>[\s\S]*?<a class="gx-source-link" href="(https:[^"]+)"/g)]
    .map((m) => ({ date: m[1].trim(), product: m[2].split("/")[0].trim(), version: m[2].split("/").slice(1).join("/").trim(), href: m[3] }))
    .filter((r) => r.version && !seen.has(r.product.toLowerCase()) && seen.add(r.product.toLowerCase()))
    .slice(0, 3);
  if (releases.length < 2) throw new Error("grok.html: fewer than two dated releases in #latest");
  const mast = DS.masthead({
    kicker: "Grok and xAI",
    title: "Grok and xAI: models, plans and news",
    dek: description.split(/(?<=\.)\s/)[0],
    metaHtml: `Source reference checked ${DS.esc(checked.trim())} · <a href="#sources">Sources</a>`,
    statsHtml: DS.stats(releases.map((r) => ({ label: GROK_LABEL[r.product.toLowerCase()] || r.product, value: r.version, asOf: r.date, asOfLabel: "Released", source: { href: r.href, label: "Release notes" } })), { label: "Newest official releases" }),
  });
  let page = replaceOnce(live, sub, "");
  page = replaceOnce(page, grid, "");
  if (note) page = replaceOnce(page, note, "");
  page = replaceOnce(page, hero, mast + hubSection("ds-hub-stories-h", "Latest stories", "/dispatch.html?topic=xai", "All Grok stories", note + grid, ' id="stories"'));
  return finishHub(page, liveUrl, "grok", root);
}

// ---- Trackers: plain title, dek, updated/source line and the tracker's own key numbers; the tool starts right after ----

function finishTracker(page, liveUrl, slug, section, root) {
  page = addBodyClass(page, `ds-page ds-tracker ds-tracker-${slug}`);
  page = replaceOnce(page, "</main>", DS.previewFlag(liveUrl) + "\n</main>");
  return previewHead(page, { live: liveUrl, section, root });
}

const firstSentence = (text) => text.split(/(?<=[.?!])\s/)[0];

export function buildFsdTracker(root = ROOT) {
  const liveUrl = "/fsd-tracker.html";
  const live = read("fsd-tracker.html", root);
  assertRootRelative(live, liveUrl);
  const hero = one(live, /<header class="ft-hero">/, "FSD tracker hero");
  const kpis = one(hero, /<div class="ft-kpis">/, ".ft-kpis");
  const jump = one(hero, /<nav class="ft-jump"/, ".ft-jump");
  const meta = (hero.match(/<p class="ft-hero-meta">([\s\S]*?)<\/p>/) || [])[1];
  const lede = htmlText((hero.match(/<p class="ft-lede">([\s\S]*?)<\/p>/) || [])[1] || "");
  if (!meta || !lede) throw new Error("fsd-tracker.html: hero lede or meta changed shape");
  const mast = DS.masthead({ kicker: "Tesla", title: "FSD tracker", dek: firstSentence(lede), metaHtml: meta, statsHtml: `<div class="ds-tracker-numbers">${kpis}</div>`, extraHtml: jump });
  return finishTracker(replaceOnce(live, hero, mast), liveUrl, "fsd", "", root);
}

/** Starship: the next-flight card (#ss-hero-next, #ss-hero-window) and #ss-source-date move into the masthead. */
export function buildStarship(root = ROOT) {
  const liveUrl = "/starship.html";
  const live = read("starship.html", root);
  assertRootRelative(live, liveUrl);
  const top = one(live, /<div class="ss-topline">/, "Starship top line");
  const date = one(top, /<span id="ss-source-date"/, "#ss-source-date");
  const hero = one(live, /<header class="ss-hero" id="top">/, "Starship hero");
  const img = (hero.match(/<img class="ss-hero-photo"[^>]*>/) || [])[0];
  const brief = one(hero, /<a class="ss-hero-brief"/, "next-flight card");
  const credit = one(live, /<p class="ss-photo-credit">/, "photo credit");
  if (!img) throw new Error("starship.html: hero photo missing");
  const mast = DS.masthead({
    id: "top",
    kicker: "SpaceX",
    title: "Starship flights",
    dek: "Every Starship flight so far and the next one, with dated sources.",
    metaHtml: `${date} · <a href="#sources">Sources</a>`,
    statsHtml: `<div class="ds-tracker-numbers">${brief}</div>`,
    extraHtml: bandFrom(`<picture>${img}</picture>`, credit.replace(/^<p class="ss-photo-credit">/, "").replace(/<\/p>$/, "")),
  });
  let page = replaceOnce(live, credit, "");
  page = replaceOnce(page, hero, "");
  page = replaceOnce(page, top, mast);
  return finishTracker(page, liveUrl, "starship", "spacex", root);
}

/**
 * Cybercab: the masthead sits before #mw-app. The old hero stays inside it, hidden, with its h1 demoted, because
 * build-mobility.mjs renders #mw-app whole; the overview's own metrics then sit just under the masthead.
 */
export function buildCybercab(root = ROOT) {
  const liveUrl = "/cybercab.html";
  const live = read("cybercab.html", root);
  assertRootRelative(live, liveUrl);
  const app = (live.match(/<div id="mw-app"[^>]*>/) || [])[0];
  const hero = one(live, /<header class="mw-hero">/, "Cybercab hero");
  const small = (hero.match(/<p class="mw-small">([\s\S]*?)<\/p>/) || [])[1];
  const fig = one(hero, /<figure class="mw-studio">/, "Cybercab studio figure");
  const pic = one(fig, /<picture>/, "studio picture");
  const cap = ((fig.match(/<figcaption>[\s\S]*?<span>([\s\S]*?)<\/span><\/figcaption>/) || [])[1] || "").trim();
  if (!app || !small || !cap) throw new Error("cybercab.html: #mw-app, the registry line or the photo credit changed shape");
  const mast = DS.masthead({
    kicker: "Tesla Robotaxi",
    title: "Cybercab fleet",
    dek: "Where Tesla's Cybercabs and Robotaxis run, how many there are, and the evidence behind each claim.",
    metaHtml: small,
    extraHtml: bandFrom(pic, cap),
  });
  const quiet = hero.replace(/<h1>([\s\S]*?)<\/h1>/, '<p class="mw-hero-title">$1</p>').replace('<header class="mw-hero">', '<header class="mw-hero" hidden>');
  let page = replaceOnce(live, hero, quiet);
  page = replaceOnce(page, app, mast + "\n" + app);
  return finishTracker(page, liveUrl, "cybercab", "", root);
}

/** Calendar: calendar-studio.js rewrites #cs-hero on start, so it becomes an inert <template> stub after the masthead. */
export function buildCalendar(root = ROOT) {
  const liveUrl = "/calendar.html";
  const live = read("calendar.html", root);
  assertRootRelative(live, liveUrl);
  const hero = one(live, /<div id="cs-hero">/, "#cs-hero");
  const asOf = (live.match(/Launch times as of ([^<.]+)\./) || [])[1];
  if (!asOf) throw new Error("calendar.html: launch-times stamp missing");
  const mast = DS.masthead({
    kicker: "Tesla, SpaceX and xAI",
    title: "Launch calendar",
    dek: "Launches, Tesla events and earnings calls, with how certain each date is.",
    metaHtml: `Launch times as of ${DS.esc(asOf.trim())} · Targets can change`,
  });
  let page = replaceOnce(live, hero, mast + '<template id="cs-hero"></template>');
  // The week strip and filters are hidden until the script flags #cs-app; with the old hero gone they sit in the first
  // screen, so the preview ships the flag and they are there from first paint instead of pushing the page down.
  page = replaceOnce(page, '<div id="cs-app">', '<div id="cs-app" class="cs-enhanced">');
  return finishTracker(page, liveUrl, "calendar", "", root);
}

/** Starlink: the masthead replaces the workspace's top line; the source strip and key figures move into it (still inside .so-workspace). */
export function buildStarlink(root = ROOT) {
  const liveUrl = "/starlink.html";
  const live = read("starlink.html", root);
  assertRootRelative(live, liveUrl);
  const mastLine = one(live, /<header class="so-mast">/, "Starlink top line");
  const strip = one(live, /<div class="so-source-strip">/, "source strip");
  const metrics = one(live, /<section class="so-metrics"/, "key figures");
  const overview = one(live, /<section class="so-hero" id="overview"/, "#overview");
  const quietOverview = overview.replace(/<h1 id="so-title">([\s\S]*?)<\/h1>/, '<h2 id="so-title" class="so-hero-title">$1</h2>');
  if (quietOverview === overview) throw new Error("starlink.html: the overview h1 moved");
  const mast = DS.masthead({
    kicker: "SpaceX",
    title: "Starlink tracker",
    dek: "How many Starlink satellites are in orbit, how the constellation is built, and what is passing above you.",
    statsHtml: `<div class="ds-tracker-numbers">${strip}${metrics}</div>`,
  });
  let page = replaceOnce(live, strip, "");
  page = replaceOnce(page, metrics, "");
  page = replaceOnce(page, overview, quietOverview);
  page = replaceOnce(page, mastLine, mast);
  return finishTracker(page, liveUrl, "starlink", "spacex", root);
}

/** Production: the quarter picker (#pd-quarter) and the stats (#pd-stats) move into the masthead; #pd-spotlight stays, hidden. */
export function buildProduction(root = ROOT) {
  const liveUrl = "/production.html";
  const live = read("production.html", root);
  assertRootRelative(live, liveUrl);
  const hero = one(live, /<header class="pd-hero">/, "production hero");
  const picker = one(hero, /<div class="pd-quarter-select/, "quarter picker");
  const spot = one(hero, /<div class="pd-spotlight" id="pd-spotlight">/, "#pd-spotlight");
  const note = one(live, /<p class="pd-view-note" id="pd-view-note">/, "#pd-view-note");
  const status = one(live, /<p class="pd-status" id="pd-status"/, "#pd-status");
  const stats = one(live, /<div class="pd-stats" id="pd-stats">/, "#pd-stats");
  const published = (spot.match(/published ([^<]+)</) || [])[1];
  if (!published) throw new Error("production.html: publication date missing from the spotlight");
  const mast = DS.masthead({
    kicker: "Tesla",
    title: "Tesla production and deliveries",
    dek: "Tesla's quarterly production, deliveries and energy storage, from its official reports.",
    metaHtml: `Latest report published ${DS.esc(published.trim())} · <a href="#sources">Sources</a>`,
    statsHtml: `<div class="ds-tracker-numbers">${picker}${note}${status}${stats}<div hidden>${spot}</div></div>`,
  });
  let page = replaceOnce(live, note, "");
  page = replaceOnce(page, status, "");
  page = replaceOnce(page, stats, "");
  page = replaceOnce(page, hero, mast);
  // Same for the quarter picker, which the script shows by flagging main.pd-studio.
  page = replaceOnce(page, '<main id="main" class="pd-studio">', '<main id="main" class="pd-studio" data-enhanced="true">');
  return finishTracker(page, liveUrl, "production", "", root);
}

/** Three article types: a news story, a long feature, and a finance story with the share disclosure. */
export const ARTICLES = ["tesla-cybercab-dallas-launch", "starship-every-flight-1-to-15", "spacex-q3-2026-results"];

export const PAGES = [
  { out: "preview/dispatch.html", build: buildDispatchList },
  { out: "preview/news.html", build: buildNews },
  { out: "preview/tesla.html", build: buildTeslaHub },
  { out: "preview/spacex.html", build: buildSpacexHub },
  { out: "preview/grok.html", build: buildGrokHub },
  { out: "preview/fsd-tracker.html", build: buildFsdTracker },
  { out: "preview/starship.html", build: buildStarship },
  { out: "preview/cybercab.html", build: buildCybercab },
  { out: "preview/calendar.html", build: buildCalendar },
  { out: "preview/starlink.html", build: buildStarlink },
  { out: "preview/production.html", build: buildProduction },
  ...ARTICLES.map((slug) => ({ out: `preview/dispatch/${slug}.html`, build: (root) => buildArticle(slug, root) })),
];

/**
 * Builds every preview and reports every failing page at once instead of stopping at the first (a failing page keeps
 * its old file). The CLI exits 1 if any page failed, so the refresh workflow commits nothing until it is fixed.
 */
export function buildAll(root = ROOT, { check = false } = {}) {
  const changed = [];
  const failed = [];
  for (const p of PAGES) {
    let html;
    try {
      html = p.build(root);
    } catch (e) {
      failed.push({ out: p.out, error: e });
      continue;
    }
    const file = path.join(root, p.out);
    const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (old !== html) {
      changed.push(p.out);
      if (!check) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, html);
      }
    }
  }
  return { changed, failed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const { changed, failed } = buildAll(ROOT, { check });
  console.log((check ? "Previews out of date: " : "Previews written: ") + (changed.length ? changed.join(", ") : "none"));
  for (const f of failed) console.error(`Preview failed: ${f.out}: ${f.error.message}`);
  if (failed.length || (check && changed.length)) process.exit(1);
}
