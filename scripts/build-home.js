#!/usr/bin/env node
// Pre-renders the homepage's Dispatch lead, supporting stories, tracker numbers and headlines
// into index.html between <!--hv:NAME--> ... <!--/hv:NAME--> markers, so the content is in the
// raw HTML for crawlers and no-JS visitors. home-v2.js still replaces it live in the browser.
// Run: node scripts/build-home.js   (refresh workflows + home-build.yml re-run it)
const fs = require("fs"), path = require("path"), vm = require("vm");
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
const supp = cards.slice(1, 4).map((c) => `<a class="hv-s" href="${esc(c.href)}">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" />` : ""}<div><span class="hv-tag">${esc(c.tag)}</span><h3>${esc(c.h)}</h3></div></a>`).join("");

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
if (C && C.stats && C.stats[0]) trk.push({ href: "/cybercab.html", k: "Cybercab", v: C.stats[0].value, s: C.stats[0].label });
try {
  const u = JSON.parse(rd("updates-live.json")), vs = (u.versions || []).filter((x) => x.count > 0);
  const top = [...vs].sort((a, b) => b.count - a.count)[0], nw = [...vs].sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || ""))[0];
  if (nw) trk.push({ href: "/updates.html", k: "Software updates", v: nw.id, s: "newest build reporting · most common: " + (top ? top.id + " (" + top.percent + "%)" : "—") + " · Teslascope" });
} catch (e) {}
const trkHtml = trk.map((x) => `<a class="hv-t" href="${x.href}"><span class="hv-t-k">${esc(x.k)}</span><strong>${esc(x.v)}</strong><span class="hv-t-s">${esc(x.s)}</span></a>`).join("");

// Headlines
let feed = "";
try {
  const d = JSON.parse(rd("news-data.json")), s2 = new Set(), lab = { tesla: "Tesla", spacex: "SpaceX", grok: "xAI", xai: "xAI", x: "X" };
  feed = (d.items || []).filter((it) => { const k = (it.title || "").toLowerCase(); if (!k || s2.has(k)) return false; s2.add(k); return /^https:\/\//.test(it.url || ""); }).slice(0, 8)
    .map((it) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="hv-f-t">${esc(lab[it.topic] || "News")}</span><span class="hv-f-h">${esc((it.title || "").replace(/\s+-\s+[^-]+$/, ""))}</span><span class="hv-f-m">${esc(it.source || "")} · ${it.published ? day(new Date(it.published)) : ""}</span></a></li>`).join("");
} catch (e) {}

// Next-livestream card (same pick + markup as live.js's "Next live stream" card), prebuilt so the
// lead story doesn't jump when live.js mounts it. Times are written in UTC; live.js swaps in the
// visitor's own zone straight away. live.js removes [data-prebuilt] before mounting its own card.
function eventCardFor(page) {
  try {
  const d = JSON.parse(rd("live-data.json")), shared = (ev && ev.events) || {}, now = Date.now(), H = 36e5;
  const list = (d.events || []).map((e) => Object.assign({}, e)).filter((e) => {
    const s = shared[e.id]; if (s && s.date) { const tz = s.tz || "Z"; e.start = s.date + "T00:00:00" + tz; e.end = s.date + "T23:59:00" + tz; }
    return e.status !== "ended" && new Date(e.end) > now && (page === "home" || e.page === page || (page === "spacex" && e.page === "starship"));
  });
  const featOn = list.some((e) => e.featured || (shared[e.id] && shared[e.id].major && e.page !== "starship"));
  const evs = page === "home" && featOn ? list.filter((e) => e.page !== "starship") : list;
  const live = evs.some((e) => e.status === "live" || (!e.timeTbc && !e.net && now >= new Date(e.start) - H / 2));
  const fut = evs.filter((e) => new Date(e.start) > now).sort((a, b) => new Date(a.start) - new Date(b.start));
  const e = live ? null : (evs.find((x) => x.featured) || fut.find((x) => !x.timeTbc && !x.net) || fut[0]);
  if (!e) return "";
    const canEmbed = e.provider === "youtube" || e.provider === "x";
    const url = e.provider === "youtube" && /^[\w-]{6,20}$/.test(e.embedId || "") ? "https://www.youtube.com/watch?v=" + e.embedId : (/^https:\/\//.test(e.fallbackUrl || e.postUrl || "") ? (e.fallbackUrl || e.postUrl) : "/calendar.html");
    const o = { weekday: "short", day: "numeric", month: "short", timeZone: (e.timeTbc || e.net) ? "America/Los_Angeles" : "UTC" };
    const date = new Intl.DateTimeFormat("en-GB", o).format(new Date(e.start)) + (e.timeTbc || e.net ? "" : " · " + new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(e.start)));
    const chip = e.timeTbc ? "Time TBC" : e.net ? "NET" : "UTC";
    const thumb = e.image ? `<div class="lw-thumb" role="img" aria-label="${esc(e.title)}"><img src="${esc(e.thumb || e.image)}" alt="" fetchpriority="high" decoding="async" /></div>` : "";
    const credit = e.image && e.imageCredit ? `<small class="lw-cr">${esc(e.imageCredit)}</small>` : "";
    const tile = (n, l) => `<span class="lw-tile"><b>${n}</b><i>${l}</i></span>`;
    const tiles = e.net ? "" : `<div class="lw-cd" aria-live="off">${tile("–", "days") + tile("––", "hrs") + tile("––", "mins")}</div>`;
    return `<section class="lv${page === "home" ? " lv-inhero" : ""} lv-quiet" aria-label="Next livestream" data-prebuilt><div class="lw"><div class="lw-head"><span class="lw-dot"></span><span>Next live stream</span><span class="lw-host">${canEmbed ? "Streamed here on Supercharged Daily" : "Direct link to the official stream"}</span></div><div class="lw-body">${thumb}<div class="lw-info"><h3 class="lw-title">${esc(e.title)}</h3><p class="lw-when">${esc(date)} <span class="lv-tz">${esc(chip)}</span></p>${tiles}<div class="lw-acts"><a class="lw-btn lw-btn-soft" href="${esc(url)}" target="_blank" rel="noopener"><span class="lw-play"></span>Watch the live stream ↗</a><a class="lw-cal" href="/calendar.html">All events →</a></div>${credit}</div></div></div></section>`;
  } catch (err) { console.warn("event card skip", err.message); return ""; }
}
const eventCard = eventCardFor("home");
// tesla.html / spacex.html: live.js inserts its card just before <main>; prebuild the same card there
for (const [f, pg] of [["tesla.html", "tesla"], ["spacex.html", "spacex"]]) {
  let h = rd(f); const h0 = h, card = eventCardFor(pg);
  if (!/<!--hv:event-->/.test(h)) h = h.replace(/(\n\s*)<main id="main"/, (m, ws) => `${ws}<!--hv:event--><!--/hv:event-->${ws}<main id="main"`);
  h = h.replace(/<!--hv:event-->[\s\S]*?<!--\/hv:event-->/, () => `<!--hv:event-->${card}<!--/hv:event-->`);
  if (h !== h0) { fs.writeFileSync(path.join(R, f), h); console.log(f + " updated"); }
}

// Newsletter band (same markup as grow.js data-band; grow.js skips building it when it's already here)
const band = `<section class="sd-band" data-newsletter="band" aria-label="Newsletter signup"><div><h2>Get Supercharged Daily</h2><p>The week’s Tesla, SpaceX, xAI and X stories plus $TSLA and $SPCX moves. Free, every Sunday.</p></div>
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
html = html.replace(/<!--hv:event-->[\s\S]*?<!--\/hv:event-->/, () => `<!--hv:event-->${eventCard}<!--/hv:event-->`);
 put("supp", supp); put("trk", trkHtml); put("feed", feed);
if (html !== before) { fs.writeFileSync(path.join(R, "index.html"), html); console.log("index.html updated"); } else console.log("index.html unchanged");
