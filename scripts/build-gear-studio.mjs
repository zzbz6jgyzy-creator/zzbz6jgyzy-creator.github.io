#!/usr/bin/env node
/* Gear page builder: data/gear.json -> the <!--gx:studio--> block inside gear.html's <main>, plus the hero image preload
   and the stylesheet/script version tokens in <head>. Everything outside those markers (head meta, JSON-LD, navigation,
   footer) stays hand-owned or owned by build-seo / the navigation builder. Deterministic: no dates, versions are file hashes. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = (root, f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(root, f))).digest("hex").slice(0, 10);
const ARROW = '<span class="gx-arrow" aria-hidden="true">↗</span>';
const DOWN = '<span class="gx-arrow" aria-hidden="true">↓</span>';

export function validate(d) {
  const bad = [];
  const partner = (h, label) => {
    if (!/^https:\/\//.test(h)) bad.push(`${label}: not https`);
  };
  d.models.forEach((m) => { partner(m.href, m.name); if (!d.images[m.image]) bad.push(m.name + ": image"); if (!m.alt) bad.push(m.name + ": alt"); });
  [...d.daily.tiles, ...d.upgrades.products, d.daily.feature, d.upgrades.feature, d.daily.shopAll, d.upgrades.shopAll, d.referral].forEach((x) => partner(x.href, x.title || x.label || "link"));
  if (bad.length) throw new Error("gear.json invalid: " + bad.join("; "));
  return d;
}

export function buildGear(root = ROOT) {
  const d = validate(JSON.parse(fs.readFileSync(path.join(root, "data/gear.json"), "utf8")));
  const I = d.images;
  const picture = (key, alt, { sizes, eager = false, position = "", cls = "" } = {}) => {
    const i = I[key];
    const set = (ext) => i.widths.map((w) => `${i.base}-${w}w.${ext} ${w}w`).join(", ");
    const style = position ? ` style="object-position:${esc(position)}"` : "";
    const load = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
    return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${sizes}"/><source type="image/webp" srcset="${set("webp")}" sizes="${sizes}"/><img${cls ? ` class="${cls}"` : ""} src="${i.src}" width="${i.w}" height="${i.h}" alt="${esc(alt)}" ${load}${style}/></picture>`;
  };
  const ext = (h) => `href="${esc(h)}" target="_blank" rel="sponsored noopener"`;
  const chip = (t) => `<span class="gx-chip">${esc(t)}</span>`;

  const hero = d.hero;
  const models = d.models.map((m) => `<li class="gx-model" data-model="${m.id}">
<div class="gx-model-media">${picture(m.image, m.alt, { sizes: "(min-width:900px) 230px, 72vw" })}</div>
<div class="gx-model-body"><h3>${esc(m.name)}</h3><p>${esc(m.line)}</p>
<a class="gx-model-link" ${ext(m.href)} aria-label="${esc(d.picker.cta)} ${esc(m.name)} collection (affiliate link, opens in a new tab)">${esc(d.picker.cta)} ${ARROW}</a></div>
<a class="gx-model-up" href="#upgrades" aria-label="${esc(d.picker.upgrades)} for ${esc(m.name)}: jump to the EV Bandit shelf">${esc(d.picker.upgrades)} ${DOWN}</a>
</li>`).join("\n");

  const nav = d.nav.map((n) => `<a href="#${n.id}">${esc(n.label)}</a>`).join("");

  const stores = d.stores.items.map((s) => `<a class="gx-store gx-reveal" href="#${s.target}">
<div class="gx-store-media">${picture(s.image, s.alt, { sizes: "(min-width:900px) 600px, 100vw", position: s.position })}</div>
<div class="gx-store-copy">${chip(s.badge)}<h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><span class="gx-cta">${esc(s.cta)} ${DOWN}</span></div></a>`).join("\n");

  const feature = (f, extra = "") => `<a class="gx-feature gx-reveal"${f.id ? ` id="${f.id}"` : ""} ${ext(f.href)}>
<div class="gx-feature-media">${picture(f.image, f.alt, { sizes: "(min-width:900px) 620px, 100vw", position: f.position || "" })}</div>
<div class="gx-feature-copy"><p class="gx-kicker">${esc(f.kicker)}</p><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p>
<ul>${f.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><span class="gx-cta">${esc(f.cta)} ${ARROW}</span></div></a>`;

  const head = (s, kicker) => `<header class="gx-section-head"><div><p class="gx-kicker">${esc(kicker)}</p><h2 id="${s.headingId}">${esc(s.title)}</h2><p class="gx-sub">${esc(s.sub)}</p></div>
<p class="gx-disclosure">${chip("Affiliate")} ${esc(s.disclosure.replace(/^Affiliate links: /, ""))}</p></header>`;

  const tiles = d.daily.tiles.map((t, i) => `<a class="gx-tile gx-reveal${i === 0 ? " gx-tile-lg" : ""}${i >= d.daily.tiles.length - 2 ? " gx-tile-wide" : ""}" ${ext(t.href)}>
${picture(t.image, t.alt, { sizes: i === 0 || i >= d.daily.tiles.length - 2 ? "(min-width:900px) 600px, 100vw" : "(min-width:900px) 300px, 50vw", position: t.position || "" })}
<span class="gx-tile-shade" aria-hidden="true"></span><span class="gx-tile-copy"><strong>${esc(t.title)}</strong><em>${esc(t.text)}</em><span class="gx-tile-cta">${esc(t.cta)} ${ARROW}</span></span></a>`).join("\n");

  const products = d.upgrades.products.map((p) => `<a class="gx-product gx-reveal" ${ext(p.href)}>
<div class="gx-product-media">${picture(p.image, p.alt, { sizes: "(min-width:900px) 380px, 100vw", position: p.position || "" })}</div>
<div class="gx-product-copy"><p class="gx-kicker">${esc(p.kicker)}</p><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><span class="gx-cta">${esc(p.cta)} ${ARROW}</span></div></a>`).join("\n");

  const foot = (s) => `<div class="gx-foot"><a class="gx-btn" ${ext(s.shopAll.href)}>${esc(s.shopAll.label)} ${ARROW}</a><p class="gx-disclosure">${chip("Affiliate")} ${esc(s.disclosure.replace(/^Affiliate links: /, ""))}</p></div>`;

  const credits = d.credits.map((c) => `${esc(c.subject)} – <a href="${esc(c.url)}" rel="noopener">${esc(c.author)}</a> (${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" rel="license noopener">${esc(c.license)}</a>` : esc(c.license)})`).join("; ");
  const hc = hero.credit;
  const ck = d.checklist, nl = d.newsletter, rf = d.referral;

  const markup = `<!--gx:studio-->
<section class="gx-hero" aria-labelledby="gear-h">
<div class="gx-hero-media">${picture(hero.image, hero.alt, { sizes: "100vw", eager: true })}</div>
<div class="gx-hero-scrim" aria-hidden="true"></div>
<div class="gx-wrap gx-hero-body">
<div class="gx-hero-copy"><p class="gx-eyebrow">${esc(hero.kicker)}</p><h1 id="gear-h">${esc(hero.title)}</h1><p class="gx-lede">${esc(hero.lede)}</p></div>
<div class="gx-picker" id="models" role="group" aria-labelledby="gs-models-h">
<div class="gx-picker-head"><h2 id="gs-models-h">${esc(d.picker.title)}</h2><p>${esc(d.picker.text)}</p></div>
<ul class="gx-models" role="list">
${models}
</ul>
<p class="gx-disclosure gx-disclosure-hero">${chip("Affiliate")} ${esc(d.daily.disclosure.replace(/^Affiliate links: /, ""))}</p>
</div>
</div>
<p class="gx-credit">Photo: <a href="${esc(hc.url)}" rel="noopener">${esc(hc.author)}</a>, Wikimedia Commons, <a href="${esc(hc.licenseUrl)}" rel="license noopener">${esc(hc.license)}</a></p>
</section>
<nav class="gx-subnav" aria-label="On this page"><div class="gx-wrap"><div class="gx-subnav-in">${nav}</div></div></nav>
<section class="gx-section gx-wrap" aria-labelledby="gs-stores-h">
<header class="gx-section-head"><div><h2 id="gs-stores-h">${esc(d.stores.title)}</h2></div><p class="gx-sub">${esc(d.stores.text)}</p></header>
<div class="gx-stores">
${stores}
</div>
</section>
<section class="gx-section gx-wrap" id="${d.daily.id}" aria-labelledby="${d.daily.headingId}">
${head(d.daily, d.daily.partner)}
${feature(d.daily.feature)}
<div class="gx-bento">
${tiles}
</div>
${foot(d.daily)}
</section>
<section class="gx-section gx-wrap" id="${d.upgrades.id}" aria-labelledby="${d.upgrades.headingId}">
${head(d.upgrades, d.upgrades.partner)}
${feature(d.upgrades.feature)}
<div class="gx-products">
${products}
</div>
${foot(d.upgrades)}
</section>
<section class="gx-section gx-wrap gx-checklist" id="fitment" data-ps-checklist aria-labelledby="ps-fitment-title"><div><p class="gx-kicker">${esc(ck.kicker)}</p><h2 id="ps-fitment-title">${esc(ck.title)}</h2><p class="gx-sub">${esc(ck.lede)}</p></div><div class="gx-checks">${ck.items.map((i) => `<label><input type="checkbox"/><span>${esc(i)}</span></label>`).join("")}<p class="gx-note" role="status">${esc(ck.status)}</p></div></section>
<section class="gx-section gx-wrap gx-band-row" aria-label="${esc(rf.kicker)}"><a class="gx-band" href="${esc(rf.href)}" target="_blank" rel="sponsored noopener"><div><p class="gx-kicker">${esc(rf.kicker)}</p><h2>${esc(rf.title)}</h2><p>${esc(rf.text)}</p></div><span class="gx-cta">ts.la/alex474841 ${ARROW}</span></a><p class="ref-note gx-ref-note">${esc(rf.note)}</p></section>
<section class="gx-section gx-wrap ps-newsletter gx-news" aria-labelledby="gx-news-h"><div><p class="gx-kicker">${esc(nl.kicker)}</p><h2 id="gx-news-h">${esc(nl.title)}</h2><p>${esc(nl.text)}</p></div><a class="gx-btn" href="${esc(nl.href)}">${esc(nl.cta)} ${ARROW}</a></section>
<section class="gx-credits gx-wrap" aria-label="Sources and image credits">
<p>${esc(d.sources)}</p>
<p><strong>Image credits</strong> (Wikimedia Commons): ${credits}. ${esc(d.creditsNote)}</p>
</section>
<!--/gx:studio-->`;
  return markup;
}

export function writeGear(root = ROOT) {
  const file = path.join(root, "gear.html");
  let html = fs.readFileSync(file, "utf8");
  const d = JSON.parse(fs.readFileSync(path.join(root, "data/gear.json"), "utf8"));
  const markup = buildGear(root);
  if (/<!--gx:studio-->/.test(html)) html = html.replace(/<!--gx:studio-->[\s\S]*?<!--\/gx:studio-->/, () => markup);
  else {
    // first run: replace everything inside <main …> … </main> with the generated block
    html = html.replace(/(<main id="main"[^>]*>)[\s\S]*?(<\/main>)/, (_, a, b) => `${a}\n${markup}\n${b}`);
  }
  const hi = d.images[d.hero.image];
  const set = (ext) => hi.widths.map((w) => `${hi.base}-${w}w.${ext} ${w}w`).join(", ");
  const preload = `<!--gx:preload--><link rel="preload" as="image" type="image/avif" imagesrcset="${set("avif")}" imagesizes="100vw" fetchpriority="high" /><!--/gx:preload-->`;
  html = html.replace(/<!--gx:preload-->[\s\S]*?<!--\/gx:preload-->/, () => preload);
  const css = hash(root, "gear-shop.css"), js = hash(root, "gear-studio.js");
  html = html.replace(/\/gear-shop\.css\?v=[^"]+/, `/gear-shop.css?v=${css}`).replace(/\/gear-studio\.js\?v=[^"]+/, `/gear-studio.js?v=${js}`);
  fs.writeFileSync(file, html);
  return html;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeGear();
  console.log("Gear page built from data/gear.json");
}
