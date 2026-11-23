// Shared HTML helpers and the live page transforms of the news-first redesign (switched 23 Nov 2026).
// A studio builder renders its page from its view and data, then passes the result through its transform here just before
// writing, so the transform always sees the same fresh view output and never edits an already-switched page. Every cut must
// match exactly once, so a change to a view fails the build loudly instead of shipping a half-switched page.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const DS = require("../ds-components.js");

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

export const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

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

/** Plain text of a small HTML fragment (tags dropped, common entities decoded), for renderers that escape their input. */
export function htmlText(fragment) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : named[e.toLowerCase()] ?? m))
    .replace(/\s+/g, " ")
    .trim();
}

/** A slim photo band from a live <picture> (kept as is: its sources, sizes and credits are the live page's). */
export const BAND_SIZES = "(min-width:1228px) 1180px, 100vw";

export function bandFrom(pictureHtml, captionHtml) {
  const pic = pictureHtml
    .replace(/(<img\b[^>]*?)\s+class="[^"]*"/, "$1") // the old hero's image classes position it full-screen
    .replace(/\ssizes="[^"]*"/g, ` sizes="${BAND_SIZES}"`); // a slim band, not a full-screen hero
  return `<figure class="ds-band">${pic}${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}</figure>`;
}

export const MONTH = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

/** Newest of the dates in a string of card dates (datetime attributes or "20 Nov 2026" text); pass card dates only, not summaries. */
export function newestDate(html) {
  const iso = [...html.matchAll(/datetime="(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\w* (\d{4})\b/g)) {
    iso.push(`${m[3]}-${String(MONTH[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  if (!iso.length) throw new Error("No dated story to take an Updated date from");
  return DS.fmtDate(iso.sort().pop() + "T12:00:00Z");
}

export function hubSection(id, title, href, linkText, inner, attrs = "") {
  return `<section class="ds-section ds-hub-stories"${attrs} aria-labelledby="${id}">` + DS.sectionHead({ id, title, href, linkText }) + inner + "</section>";
}

export const GROK_LABEL = { model: "Grok model", bot: "Grok Bot", voice: "Grok Voice", imagine: "Grok Imagine", api: "xAI API" };

/** Add classes to <body> once: builders keep the existing <body> tag between runs. */
export function ensureBodyClass(html, cls) {
  const m = html.match(/<body\b([^>]*)>/);
  if (!m) throw new Error("No <body> tag");
  const have = ((m[1].match(/\bclass="([^"]*)"/) || [])[1] || "").split(/\s+/).filter(Boolean);
  const want = [...have, ...cls.split(/\s+/).filter((c) => !have.includes(c))].join(" ");
  const tag = /\bclass="/.test(m[1]) ? m[0].replace(/\bclass="[^"]*"/, `class="${want}"`) : m[0].replace("<body", `<body class="${want}"`);
  return html.replace(m[0], () => tag);
}

// ---- Hubs: compact masthead with the hub's own key numbers and a slim photo band, then its latest stories ----
/** Tesla hub: the masthead takes the hub's own numbers (#to-brief-grid and its note); #to-stories moves up under it. */
export function teslaHub(live) {
  const liveUrl = "/tesla.html";
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
  return ensureBodyClass(page, "ds-page ds-hub ds-hub-tesla");
}

/** SpaceX hub: the next-launch card (#sx-next, kept live by spacex-studio.js) joins the masthead; the stories move up. */
export function spacexHub(live) {
  const liveUrl = "/spacex.html";
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
  return ensureBodyClass(page, "ds-page ds-hub ds-hub-spacex");
}

/** Grok hub: the newest official release per product line as key numbers; the reporting grid moves up from #latest. */
export function grokHub(live) {
  const liveUrl = "/grok.html";
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
  return ensureBodyClass(page, "ds-page ds-hub ds-hub-grok");
}
