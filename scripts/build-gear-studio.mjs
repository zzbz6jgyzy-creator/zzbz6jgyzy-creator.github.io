#!/usr/bin/env node
/* Gear page builder: data/gear.json -> the <!--gx:studio--> block inside gear.html's <main>, plus the stylesheet/script
   version tokens in <head>. Everything outside the marker (head meta, JSON-LD, navigation, footer) stays hand-owned or
   owned by build-seo / the navigation builder. Deterministic: no dates; versions are file hashes. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = (root, f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(root, f))).digest("hex").slice(0, 10);
const ARROW = '<span class="gx-arrow" aria-hidden="true">↗</span>';

/* Simple line icons (24px grid, stroked by CSS). Decorative: every card also has its text. */
const ICONS = {
  mat: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h6"/>',
  screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  dash: '<rect x="3" y="5" width="18" height="9" rx="2"/><path d="M7 19h10M12 14v5"/>',
  storage: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  seat: '<path d="M8 4h4a2 2 0 0 1 2 2v6h4a1 1 0 0 1 1 1v3H9a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2z"/><path d="M9 20h9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  paw: '<circle cx="7" cy="11" r="1.8"/><circle cx="11" cy="7" r="1.8"/><circle cx="16" cy="8" r="1.8"/><circle cx="19" cy="13" r="1.8"/><path d="M8 18c0-3 2.5-5 5-5s4.5 2 4 5c-.3 1.6-2 2-4 2s-5-.4-5-2z"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6.5M12 14.5V21M3 12h6.5M14.5 12H21"/>',
  carbon: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
  car: '<path d="M3 16l1.6-5.5A2 2 0 0 1 6.5 9h8a2 2 0 0 1 1.5.7L19 13h2v3"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
};

export function validate(d) {
  const bad = [];
  const https = (h, label) => { if (!/^https:\/\//.test(h)) bad.push(`${label}: not https`); };
  d.models.forEach((m) => { https(m.href, m.name); if (!d.images[m.image]) bad.push(m.name + ": image"); if (!m.alt) bad.push(m.name + ": alt"); });
  d.catalog.items.forEach((x) => {
    https(x.href, x.title);
    if (!d.shops[x.shop]) bad.push(x.title + ": shop");
    if (!ICONS[x.icon]) bad.push(x.title + ": icon");
    if (!x.cats.length) bad.push(x.title + ": categories");
  });
  Object.values(d.shops).forEach((s) => https(s.shopAll.href, s.name));
  https(d.referral.href, "referral");
  if (bad.length) throw new Error("gear.json invalid: " + bad.join("; "));
  return d;
}

export function buildGear(root = ROOT) {
  const d = validate(JSON.parse(fs.readFileSync(path.join(root, "data/gear.json"), "utf8")));
  const I = d.images;
  const picture = (key, alt, sizes) => {
    const i = I[key];
    const set = (ext) => i.widths.map((w) => `${esc(i.base)}-${w}w.${ext} ${w}w`).join(", ");
    return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${sizes}"/><source type="image/webp" srcset="${set("webp")}" sizes="${sizes}"/><img src="${esc(i.src)}" width="${i.w}" height="${i.h}" alt="${esc(alt)}" loading="lazy" decoding="async"/></picture>`;
  };
  const ext = (h) => `href="${esc(h)}" target="_blank" rel="sponsored noopener"`;
  const note = (cls = "") => `<p class="gx-disclosure${cls}"><strong>Affiliate links.</strong> ${esc(d.disclosure.replace(/^Affiliate links: /, ""))}</p>`;

  const sprite = `<svg class="gx-sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>${Object.entries(ICONS).map(([k, v]) => `<symbol id="gx-i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join("")}</defs></svg>`;

  const models = d.models.map((m) => `<li class="gx-model" data-model="${esc(m.id)}">
<div class="gx-model-media">${picture(m.image, m.alt, "(min-width:700px) 230px, 104px")}</div>
<div class="gx-model-body"><h3>${esc(m.name)}</h3><p>${esc(m.line)}</p>
<a class="gx-model-link" ${ext(m.href)} aria-label="${esc(d.picker.cta)} ${esc(m.name)} collection (affiliate link, opens in a new tab)">${esc(d.picker.cta)} ${ARROW}</a></div>
</li>`).join("\n");

  const nav = d.nav.map((n) => `<a href="#${esc(n.id)}">${esc(n.label)}</a>`).join("");

  const filters = d.catalog.filters.map((f, i) => {
    const value = f.key || f.id, id = f.key ? f.id : `gx-f-${f.id}`;
    return `<input type="radio" name="gx-filter" id="${esc(id)}" value="${esc(value)}"${i === 0 ? " checked" : ""}/><label for="${esc(id)}">${esc(f.label)}</label>`;
  }).join("");

  const cards = d.catalog.items.map((x) => {
    const shop = d.shops[x.shop];
    const src = `${esc(shop.name)}${x.kicker ? ` · ${esc(x.kicker)}` : ""}`;
    return `<li class="gx-card${x.featured ? " gx-card-start" : ""}" data-cat="${esc([...x.cats, x.shop].join(" "))}">
<span class="gx-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><use href="#gx-i-${esc(x.icon)}"/></svg></span>
<div class="gx-card-body"><p class="gx-src">${src}${x.featured ? ' <span class="gx-start">Start here</span>' : ""}</p>
<h3><a class="gx-card-link"${x.id === "evbandit" ? ' id="evbandit"' : ""} ${ext(x.href)}>${esc(x.title)}<span class="gx-sr"> — ${esc(shop.name)}, affiliate link, opens in a new tab</span> ${ARROW}</a></h3>
<p>${esc(x.text)}</p>${x.bullets ? `\n<ul>${x.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>
</li>`;
  }).join("\n");

  const shopAll = Object.values(d.shops).map((s) => `<a class="gx-btn" ${ext(s.shopAll.href)}>${esc(s.shopAll.label)} ${ARROW}</a>`).join("");
  const legend = Object.values(d.shops).map((s) => `<span><strong>${esc(s.name)}</strong> · ${esc(s.legend)}</span>`).join("");
  const credits = d.credits.map((c) => `${esc(c.subject)} – <a href="${esc(c.url)}" rel="noopener">${esc(c.author)}</a> (${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" rel="license noopener">${esc(c.license)}</a>` : esc(c.license)})`).join("; ");
  const ck = d.checklist, rf = d.referral, h = d.hero;
  const total = d.catalog.items.length;

  return `<!--gx:studio-->
${sprite}
<section class="gx-hero gx-wrap" aria-labelledby="gear-h">
<div class="gx-hero-copy"><p class="gx-eyebrow">${esc(h.kicker)}</p><h1 id="gear-h">${esc(h.title)}</h1><p class="gx-lede">${esc(h.lede)}</p></div>
<div class="gx-hero-shops"><div class="gx-shopall">${shopAll}</div>${note()}</div>
</section>
<nav class="gx-subnav" aria-label="On this page"><div class="gx-wrap"><div class="gx-subnav-in">${nav}</div></div></nav>
<section class="gx-section gx-wrap" id="models" aria-labelledby="gs-models-h">
<header class="gx-head"><h2 id="gs-models-h">${esc(d.picker.title)}</h2><p class="gx-sub">${esc(d.picker.text)}</p></header>
<ul class="gx-models" role="list">
${models}
</ul>
</section>
<section class="gx-section gx-wrap gx-index" id="gear" aria-labelledby="gs-gear-h">
<header class="gx-head"><h2 id="gs-gear-h">${esc(d.catalog.title)}</h2><p class="gx-sub">${esc(d.catalog.text)}</p></header>
<fieldset class="gx-filters"><legend class="gx-sr">Filter the gear list</legend>${filters}</fieldset>
<p class="gx-legend">${legend}<span class="gx-count" role="status" data-total="${total}"></span></p>
<ul class="gx-grid" role="list">
${cards}
</ul>
${note(" gx-disclosure-end")}
</section>
<section class="gx-section gx-wrap gx-checklist" id="fitment" data-ps-checklist aria-labelledby="ps-fitment-title"><div><p class="gx-kicker">${esc(ck.kicker)}</p><h2 id="ps-fitment-title">${esc(ck.title)}</h2><p class="gx-sub">${esc(ck.lede)}</p></div><div class="gx-checks">${ck.items.map((i) => `<label><input type="checkbox"/><span>${esc(i)}</span></label>`).join("")}<p class="gx-note" role="status">${esc(ck.status)}</p></div></section>
<section class="gx-section gx-wrap gx-ref" aria-label="${esc(rf.kicker)}"><div><p class="gx-kicker">${esc(rf.kicker)}</p><h2>${esc(rf.title)}</h2><p class="gx-sub">${esc(rf.text)}</p><p class="ref-note gx-ref-note">${esc(rf.note)}</p></div><a class="gx-btn gx-btn-ghost" href="${esc(rf.href)}" target="_blank" rel="sponsored noopener">ts.la/alex474841 ${ARROW}</a></section>
<section class="gx-credits gx-wrap" aria-label="Sources and image credits">
<p>${esc(d.sources)}</p>
<p><strong>Image credits</strong> (Wikimedia Commons): ${credits}. ${esc(d.creditsNote)}</p>
</section>
<!--/gx:studio-->`;
}

export function writeGear(root = ROOT) {
  const file = path.join(root, "gear.html");
  let html = fs.readFileSync(file, "utf8");
  const markup = buildGear(root);
  if (!/<!--gx:studio-->/.test(html)) throw new Error("gear.html lost its <!--gx:studio--> marker");
  html = html.replace(/<!--gx:studio-->[\s\S]*?<!--\/gx:studio-->/, () => markup);
  const css = hash(root, "gear-shop.css"), js = hash(root, "gear-studio.js");
  html = html.replace(/\/gear-shop\.css\?v=[^"]+/, `/gear-shop.css?v=${css}`).replace(/\/gear-studio\.js\?v=[^"]+/, `/gear-studio.js?v=${js}`);
  fs.writeFileSync(file, html);
  return html;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeGear();
  console.log("Gear page built from data/gear.json");
}
