#!/usr/bin/env node
// Pre-renders the homepage's Dispatch lead, supporting stories, tracker numbers and headlines
// into index.html between <!--hv:NAME--> ... <!--/hv:NAME--> markers, so the content is in the
// raw HTML for crawlers and no-JS visitors. home-v2.js still replaces it live in the browser.
// Run: node scripts/build-home.js   (refresh workflows + home-build.yml re-run it)
// Locks: homepage band always includes data-band-topic="website"; home event pick
// matches live.js (timed Falcon stays, NET Starship drops); tesla/spacex rewrite
// never inserts markers before <main> and aborts if it would drop a <picture>.
const fs = require("fs"), path = require("path"), vm = require("vm");
const pairer = require("../home-pair.js");
const { pickNextEvent } = require("./live-home-pick");
const R = path.join(__dirname, ".."), rd = (f) => fs.readFileSync(path.join(R, f), "utf8");
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const day = (d, o) => new Intl.DateTimeFormat("en-GB", Object.assign({ day: "numeric", month: "short", timeZone: "UTC" }, o)).format(d);
const win = {}; vm.createContext({ window: win });
for (const f of ["starship-data.js", "fsd-europe-data.js", "cybercab-data.js"]) { try { vm.runInContext(rd(f), vm.createContext({ window: win })); } catch (e) { console.warn("skip", f, e.message); } }

// Dispatch cards
const cards = [], seen = new Set();
for (const m of rd("dispatch.html").matchAll(/<a class="story-card[^"]*" href="(\/dispatch\/[^"]+)">([\s\S]*?)<\/a>/g)) {
  const b = m[2], g = (re) => ((b.match(re) || [])[1] || "");
  const c = { href: m[1], img: g(/poster="([^"]+)"/) || g(/<img[^>]*src="([^"]+)"/), tag: strip(g(/<span class="tag[^"]*">([\s\S]*?)<\/span>/)) || "Dispatch", h: strip(g(/<h3>([\s\S]*?)<\/h3>/)), p: strip(g(/<div class="story-copy">[\s\S]*?<p>([\s\S]*?)<\/p>/)) };
  if (c.h && !seen.has(c.href)) { seen.add(c.href); cards.push(c); }
}
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "’");
cards.forEach((c) => { c.h = decode(c.h); c.p = decode(c.p); c.tag = decode(c.tag); });
// Pin: data/articles.json "pinned": true (+ optional "pinUntil" ISO time) holds a story as the lead until it expires
try {
  const now = Date.now(), pin = (JSON.parse(rd("data/articles.json")).articles || []).find((a) => a.pinned && (!a.pinUntil || Date.parse(a.pinUntil) > now));
  if (pin) {
    let i = cards.findIndex((c) => c.href === pin.url);
    const pc = i >= 0 ? cards.splice(i, 1)[0] : { href: pin.url, img: pin.image, tag: pin.tag || "Dispatch", h: pin.title, p: pin.summary };
    cards.unshift(pc);
  }
} catch (e) { console.warn("pin skip", e.message); }
const L = cards[0];
// Lead image: <picture> with the AVIF/WebP sets build-images.mjs makes (<name>-<w>w.avif/webp), plus a preload
const pinAlt = (() => { try { const a = (JSON.parse(rd("data/articles.json")).articles || []).find((x) => L && x.url === L.href); return a && a.imageAlt; } catch (e) { return ""; } })();
const leadSrc = (L && L.img) || "/assets/dispatch/cybercab-austin-poster.jpg";
const sets = {};
if (/^\/assets\/.+\.(jpe?g|png)$/i.test(leadSrc)) {
  const base = leadSrc.replace(/\.(jpe?g|png)$/i, ""), dir = path.join(R, path.dirname(leadSrc)), stem = path.basename(base);
  for (const fmt of ["avif", "webp"]) {
    const ws = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).map((f) => (f.match(new RegExp("^" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-(\\d+)w\\." + fmt + "$")) || [])[1]).filter(Boolean).map(Number).filter((w) => w <= 1600).sort((a, b) => a - b);
    if (ws.length) sets[fmt] = ws.map((w) => `${base}-${w}w.${fmt} ${w}w`).join(", ");
  }
}
const SZ = "(max-width: 760px) 100vw, 640px";
const leadAlt = pinAlt || (L ? L.h : "");
const leadImg = `${sets.avif ? `<source type="image/avif" srcset="${esc(sets.avif)}" sizes="${SZ}" />` : ""}${sets.webp ? `<source type="image/webp" srcset="${esc(sets.webp)}" sizes="${SZ}" />` : ""}<img src="${esc(leadSrc)}" alt="${esc(leadAlt)}" fetchpriority="high" decoding="async" data-hv-img />`;
const preload = sets.avif ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${esc(sets.avif)}" imagesizes="${SZ}" fetchpriority="high" />` : `<link rel="preload" as="image" href="${esc(leadSrc)}" fetchpriority="high" />`;
const lead = L ? `<a class="hv-lead" href="${esc(L.href)}" data-hv-lead>
            <div class="hv-lead-media"><picture>${leadImg}</picture></div>
            <div class="hv-lead-copy"><span class="hv-tag" data-hv-tag>${esc(L.tag)}</span><h2 data-hv-h>${esc(L.h)}</h2><p data-hv-p>${esc(L.p)}</p><span class="hv-read">Read the story →</span></div>
          </a>` : null;
const suppThumb = (src) => {
  const webp = String(src).replace(/\.(jpe?g|png)$/i, "-480w.webp");
  return `<img src="${esc(webp)}" alt="" width="112" height="70" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${esc(src)}'" />`;
};
const supp = cards.slice(1, 4).map((c) => `<a class="hv-s" href="${esc(c.href)}">${c.img ? suppThumb(c.img) : ""}<div><span class="hv-tag">${esc(c.tag)}</span><h3>${esc(c.h)}</h3></div></a>`).join("");

// Trackers (same rules as home-v2.js)
const trk = [], S = win.STARSHIP, F = win.FSD_EUROPE, C = win.CYBERCAB;
let ev = null; try { ev = JSON.parse(rd("data/events.json")); } catch (e) {}
if (S && S.next) {
  const e = ev && ev.events && ev.events["starship-flight-" + S.next.flight];
  const start = e && e.date ? e.date + "T00:00:00Z" : S.next.start, prec = (e && e.precision) || S.next.precision;
  trk.push({ href: "/starship.html", k: "Starship", v: "Flight " + S.next.flight, s: (prec === "day" ? "NET " : "") + day(new Date(start)) + " · " + (S.next.headline || "") });
}
if (F && F.countries) {
  const ok = F.countries.filter((c) => c.status === "approved"), pop = ok.reduce((a, c) => a + (c.pop || 0), 0);
  const pct = F.thresholds ? Math.round((pop / F.thresholds.euPopulationM) * 100) : 0;
  trk.push({ href: "/fsd-europe.html", k: "FSD Europe", v: ok.length + " / " + (F.thresholds ? F.thresholds.statesNeeded : 15), s: "states recognise RDW approval · " + pct + "% of EU pop. (need " + (F.thresholds ? F.thresholds.populationNeeded : 65) + "%)" });
}
const cc = C && C.stats && (C.stats.find((s) => s.live === "cybercab") || C.stats[0]);
if (cc) trk.push({ href: "/cybercab.html", k: "Cybercab", v: cc.value, s: cc.label });
try {
  const u = JSON.parse(rd("updates-live.json")), vs = (u.versions || []).filter((x) => x.count > 0);
  const top = [...vs].sort((a, b) => b.count - a.count)[0], nw = [...vs].sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || ""))[0];
  if (nw) trk.push({ href: "/updates.html", k: "Software updates", v: nw.id, s: "newest build reporting · most common: " + (top ? top.id + " (" + top.percent + "% of " + Number(u.fleet || top.fleet).toLocaleString("en-US") + " cars)" : "—") + " · Teslascope, " + String(u.updated || "").slice(0, 10) });
} catch (e) {}
const trkHtml = trk.map((x) => `<a class="hv-t" href="${x.href}"><span class="hv-t-k">${esc(x.k)}</span><strong>${esc(x.v)}</strong><span class="hv-t-s">${esc(x.s)}</span></a>`).join("");

// Headlines
let feed = "";
try {
  const d = JSON.parse(rd("news-data.json")), s2 = new Set();
  let arts = [];
  try { arts = (JSON.parse(rd("data/articles.json")).articles || []); } catch (e2) {}
  const used = new Set();
  const keep = require("../news-keep.js");
  const held = (() => { try { return JSON.parse(rd("data/news-hold.json")); } catch (e3) { return {}; } })();
  feed = keep.forHomepage((d.items || []).filter((it) => { const k = (it.title || "").toLowerCase(); if (!k || s2.has(k)) return false; s2.add(k); return /^https:\/\//.test(it.url || ""); }), held).slice(0, 8)
    .map((it) => pairer.itemHtml(it, pairer.pairItem(it, arts, used), esc, `${it.source || ""} · ${it.published ? day(new Date(it.published)) : ""}`.replace(/^ · /, ""))).join("");
} catch (e) {}

// Next-livestream card (same pick + markup as live.js's "Next live stream" card), prebuilt so the
// lead story doesn't jump when live.js mounts it. Times are written in UTC; live.js swaps in the
// visitor's own zone straight away. live.js removes [data-prebuilt] before mounting its own card.
function eventCardFor(page) {
  try {
  const d = JSON.parse(rd("live-data.json")), shared = (ev && ev.events) || {}, now = Date.now(), H = 36e5;
  const e = pickNextEvent(d.events || [], { page, shared, now, H });
  if (!e) return "";
    const canEmbed = e.provider === "youtube" || e.provider === "x";
    const url = e.provider === "youtube" && /^[\w-]{6,20}$/.test(e.embedId || "") ? "https://www.youtube.com/watch?v=" + e.embedId : (/^https:\/\//.test(e.fallbackUrl || e.postUrl || "") ? (e.fallbackUrl || e.postUrl) : "/calendar.html");
    const o = { weekday: "short", day: "numeric", month: "short", timeZone: (e.timeTbc || e.net) ? "America/Los_Angeles" : "UTC" };
    const date = new Intl.DateTimeFormat("en-GB", o).format(new Date(e.start)) + (e.timeTbc || e.net ? "" : " · " + new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(e.start)));
    const chip = e.timeTbc ? "Time TBC" : e.net ? "NET" : "UTC";
    const src = e.thumb || e.image || "";
    const thumb = /\/assets\/live\/falcon9\.(jpe?g|png|webp)$/i.test(src)
      ? `<div class="lw-thumb" role="img" aria-label="${esc(e.title)}"><picture><source type="image/avif" srcset="/assets/live/falcon9-480w.avif 480w, /assets/live/falcon9-960w.avif 960w, /assets/live/falcon9-1200w.avif 1200w" sizes="(max-width:760px) 92vw, 360px" /><source type="image/webp" srcset="/assets/live/falcon9-480w.webp 480w, /assets/live/falcon9-960w.webp 960w, /assets/live/falcon9-1200w.webp 1200w" sizes="(max-width:760px) 92vw, 360px" /><img src="/assets/live/falcon9.jpg" alt="" width="1200" height="800" fetchpriority="high" decoding="async" /></picture></div>`
      : (e.image ? `<div class="lw-thumb" role="img" aria-label="${esc(e.title)}"><img src="${esc(src)}" alt="" width="1200" height="800" fetchpriority="high" decoding="async" /></div>` : "");
    const credit = e.image && e.imageCredit ? `<small class="lw-cr">${esc(e.imageCredit)}</small>` : "";
    const tile = (n, l) => `<span class="lw-tile"><b>${n}</b><i>${l}</i></span>`;
    const tiles = e.net ? "" : `<div class="lw-cd" aria-live="off">${tile("–", "days") + tile("––", "hrs") + tile("––", "mins")}</div>`;
    if (new Date(e.start) - now > 72 * H) { // >72h out: slim card (live.js swaps in the visitor's zone)
      const dd = Math.round((new Date(e.start) - now) / 864e5);
      return `<section class="lv${page === "home" ? " lv-inhero" : ""} lv-quiet lv-slim" aria-label="Next livestream" data-prebuilt><a class="lw lw-slim" href="${esc(url)}" target="_blank" rel="noopener"><span class="lw-dot"></span><span class="lws-txt"><b class="lws-t">${esc(e.title)}</b><span class="lws-m">${esc(date)} <span class="lv-tz">${esc(chip)}</span> <span class="lws-cd">in ${dd}d</span></span></span><span class="lws-go">Watch ↗</span></a></section>`;
    }
    return `<section class="lv${page === "home" ? " lv-inhero" : ""} lv-quiet" aria-label="Next livestream" data-prebuilt><div class="lw"><div class="lw-head"><span class="lw-dot"></span><span>Next live stream</span><span class="lw-host">${canEmbed ? "Streamed here on Supercharged Daily" : "Direct link to the official stream"}</span></div><div class="lw-body">${thumb}<div class="lw-info"><h3 class="lw-title">${esc(e.title)}</h3><p class="lw-when">${esc(date)} <span class="lv-tz">${esc(chip)}</span></p>${tiles}<div class="lw-acts"><a class="lw-btn lw-btn-soft" href="${esc(url)}" target="_blank" rel="noopener"><span class="lw-play"></span>Watch the live stream ↗</a><a class="lw-cal" href="/calendar.html">All events →</a></div>${credit}</div></div></div></section>`;
  } catch (err) { console.warn("event card skip", err.message); return ""; }
}
const eventCard = eventCardFor("home");
// Only rewrite an existing <!--hv:event--> pair. Never insert a marker in front of
// <main> — that path previously swallowed tesla.html / spacex.html <picture> sets.
function replaceEventCard(html, card, file) {
  const open = html.indexOf("<!--hv:event-->");
  const close = html.indexOf("<!--/hv:event-->");
  if (open < 0 || close < 0 || close < open) {
    console.warn(file + ": event markers missing; skip");
    return html;
  }
  const block = html.slice(open, close + "<!--/hv:event-->".length);
  if (/<main[\s>]/.test(block)) {
    console.warn(file + ": event markers span <main>; skip");
    return html;
  }
  const next = html.slice(0, open) + "<!--hv:event-->" + card + "<!--/hv:event-->" + html.slice(close + "<!--/hv:event-->".length);
  const pics0 = (html.match(/<picture\b/gi) || []).length;
  const pics1 = (next.match(/<picture\b/gi) || []).length;
  if (pics1 < pics0) {
    console.warn(file + ": would drop <picture> (" + pics0 + " → " + pics1 + "); skip");
    return html;
  }
  return next;
}
for (const [f, pg] of [["tesla.html", "tesla"], ["spacex.html", "spacex"]]) {
  const h0 = rd(f), h = replaceEventCard(h0, eventCardFor(pg), f);
  if (h !== h0) { fs.writeFileSync(path.join(R, f), h); console.log(f + " updated"); }
}


// Starlink "as of" label (homepage Starlink tile) from starlink-live.js, which
// scripts/build-starlink-stats.py bakes from Jonathan McDowell's stats page.
let slAsOf = "";
try {
  const SL = JSON.parse(rd("starlink-live.js").replace(/^[\s\S]*?window\.STARLINK_LIVE\s*=\s*/, "").replace(/;\s*$/, ""));
  const n = SL.totals && SL.totals.inOrbit, t = Date.parse(SL.updated);
  if (n && Number.isFinite(t)) slAsOf = `${Number(n).toLocaleString("en-US")} in orbit · as of ${day(new Date(t), { year: "numeric" })} · Jonathan McDowell`;
} catch (e) { console.warn("starlink as-of skip", e.message); }

// Grok page story strip: AI / Grok / xAI / SpaceX AI articles from data/articles.json,
// newest first, reusing the exact story-card markup from dispatch.html.
try {
  const arts = (JSON.parse(rd("data/articles.json")).articles || [])
    .filter((a) => a.topic === "xai" || /\b(AI|Grok|xAI)\b/.test(a.tag || ""))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
  const dh = rd("dispatch.html"), blocks = {};
  for (const m of dh.matchAll(/<a class="story-card[^"]*" href="(\/dispatch\/[^"]+)">[\s\S]*?<\/a>/g)) if (!blocks[m[1]]) blocks[m[1]] = m[0];
  const strip6 = arts.filter((a) => blocks[a.url]).map((a) => blocks[a.url].replace(/^<a class="story-card[^"]*"/, '<a class="story-card reveal"')).join("\n            ");
  const g0 = rd("grok.html"), re = /<!--gk:stories-->[\s\S]*?<!--\/gk:stories-->/;
  if (strip6 && re.test(g0)) {
    const g1 = g0.replace(re, () => `<!--gk:stories-->\n            ${strip6}\n          <!--/gk:stories-->`);
    if (g1 !== g0) { fs.writeFileSync(path.join(R, "grok.html"), g1); console.log("grok.html updated"); }
  }
} catch (e) { console.warn("grok strip skip", e.message); }

// Newsletter band (same markup as grow.js data-band; grow.js skips building it when it's already here)
const band = `<section class="sd-band" id="newsletter" data-newsletter="band" data-band-topic="website" aria-label="Newsletter signup"><div><h2>Get Supercharged Daily</h2><p>The week’s Tesla, SpaceX, xAI and X stories plus $TSLA and $SPCX moves. Free, every Sunday.</p></div>
      <div><form class="sd-form" data-newsletter-form>
      <label class="visually-hidden" for="sd-band-email">Email address</label>
      <input id="sd-band-email" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="you@example.com" />
      <input type="text" name="website" hidden tabindex="-1" autocomplete="off" />
      <button class="sd-btn" type="submit">Subscribe</button></form><p class="sd-fine">Free. No spam. Unsubscribe anytime. <a class="sd-latest" href="https://alexs-newsletter-84b17e.beehiiv.com/p/supercharged-daily-1?utm_source=website&amp;utm_medium=site-band&amp;utm_campaign=latest-issue" target="_blank" rel="noopener">Read the latest issue →</a></p><p class="newsletter-status" data-newsletter-status role="status"></p></div></section>`;

let html = rd("index.html"); const before = html;
const put = (name, inner) => {
  if (inner == null || inner === "") return;
  const re = new RegExp(`<!--hv:${name}-->[\\s\\S]*?<!--/hv:${name}-->`);
  if (!re.test(html)) throw new Error("marker missing: " + name);
  html = html.replace(re, () => `<!--hv:${name}-->${inner}<!--/hv:${name}-->`);
};
put("lead", lead); put("preload", preload); put("band", band);
html = replaceEventCard(html, eventCard, "index.html");
 put("supp", supp); put("slasof", slAsOf); put("trk", trkHtml); put("feed", feed);
if (html !== before) { fs.writeFileSync(path.join(R, "index.html"), html); console.log("index.html updated"); } else console.log("index.html unchanged");
