#!/usr/bin/env node
// Points every "Read the latest issue" link at the newest published Beehiiv issue.
// Source: the public Beehiiv sitemap (no API key). On any failure, links are left unchanged.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BASE = 'https://alexs-newsletter-84b17e.beehiiv.com';
const FILES = ['index.html', 'grow.js', 'scripts/build-home.js'];
const LINK = /(alexs-newsletter-84b17e\.beehiiv\.com\/p\/)([a-z0-9-]+)(\?utm_source=website&(?:amp;)?utm_medium=site-band)/g;

async function latestSlug() {
  const res = await fetch(BASE + '/sitemap.xml', { headers: { 'user-agent': 'Mozilla/5.0 (SuperchargedDaily build)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error('sitemap HTTP ' + res.status);
  const xml = await res.text();
  let best = null;
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>[^<]*\/p\/([a-z0-9-]+)<\/loc>/) || [])[1];
    const date = (m[1].match(/<news:publication_date>([^<]+)</) || [])[1];
    if (!loc || !date || isNaN(Date.parse(date)) || Date.parse(date) > Date.now()) continue;
    if (!best || Date.parse(date) > best.t) best = { slug: loc, t: Date.parse(date) };
  }
  if (!best) throw new Error('no published issue in sitemap');
  return best.slug;
}

(async () => {
  let slug;
  try { slug = await latestSlug(); } catch (e) { console.log('newsletter-latest: keeping current link (' + e.message + ')'); return; }
  let growChanged = false;
  for (const f of FILES) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const out = src.replace(LINK, (_, a, _old, c) => a + slug + c);
    if (out !== src) { fs.writeFileSync(p, out); console.log('newsletter-latest: ' + f + ' -> ' + slug); if (f === 'grow.js') growChanged = true; }
  }
  if (growChanged) { // bump the grow.js cache tag so browsers and the CDN pick up the new link
    const v = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith('.') || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
    for (const h of walk(ROOT)) { const s = fs.readFileSync(h, 'utf8'); const o = s.replace(/grow\.js\?v=\d+/g, 'grow.js?v=' + v); if (o !== s) fs.writeFileSync(h, o); }
  }
  if (!growChanged) console.log('newsletter-latest: already ' + slug);
})();
