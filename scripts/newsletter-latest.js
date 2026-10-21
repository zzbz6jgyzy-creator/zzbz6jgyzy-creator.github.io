#!/usr/bin/env node
// Points every "Read the latest issue" link at the newest published Beehiiv issue.
// Source: the public Beehiiv sitemap (no API key). On any failure, links are left unchanged.
// Also writes data/newsletter-latest.json (slug + public issue count) for signup social proof.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BASE = 'https://alexs-newsletter-84b17e.beehiiv.com';
const OUT = path.join(ROOT, 'data', 'newsletter-latest.json');
const LINK = /(alexs-newsletter-84b17e\.beehiiv\.com\/p\/)([a-z0-9-]+)(\?utm_source=website&(?:amp;)?utm_medium=site-(?:band|article|tracker))/g;

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'vendor') return [];
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : (e.name.endsWith('.html') || e.name === 'grow.js' || e.name === 'build-home.js' ? [p] : []);
  });
}

async function latestFromSitemap() {
  const res = await fetch(BASE + '/sitemap.xml', { headers: { 'user-agent': 'Mozilla/5.0 (SuperchargedDaily build)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error('sitemap HTTP ' + res.status);
  const xml = await res.text();
  let best = null;
  let count = 0;
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>[^<]*\/p\/([a-z0-9-]+)<\/loc>/) || [])[1];
    if (!loc) continue;
    count += 1;
    const newsDate = (m[1].match(/<news:publication_date>([^<]+)</) || [])[1];
    const lastmod = (m[1].match(/<lastmod>([^<]+)</) || [])[1];
    const raw = newsDate || lastmod;
    const t = raw ? Date.parse(raw) : 0;
    if (raw && isNaN(t)) continue;
    if (t > Date.now()) continue;
    if (!best || t > best.t) best = { slug: loc, t };
  }
  if (!best) throw new Error('no published issue in sitemap');
  return { slug: best.slug, count };
}

function writeMeta(slug, count) {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const next = { slug, issueCount: count, updated: new Date().toISOString(), source: 'beehiiv-sitemap' };
  if (prev.slug === next.slug && prev.issueCount === next.issueCount) return false;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
  console.log('newsletter-latest: wrote data/newsletter-latest.json -> ' + slug + ' (' + count + ' issues)');
  return true;
}

(async () => {
  let slug, count;
  try {
    ({ slug, count } = await latestFromSitemap());
  } catch (e) {
    console.log('newsletter-latest: keeping current link (' + e.message + ')');
    return;
  }
  writeMeta(slug, count);
  let growChanged = false;
  for (const p of walk(ROOT)) {
    const src = fs.readFileSync(p, 'utf8');
    const out = src.replace(LINK, (_, a, _old, c) => a + slug + c);
    if (out !== src) {
      fs.writeFileSync(p, out);
      console.log('newsletter-latest: ' + path.relative(ROOT, p) + ' -> ' + slug);
      if (path.basename(p) === 'grow.js') growChanged = true;
    }
  }
  if (growChanged) { // bump the grow.js cache tag so browsers and the CDN pick up the new link
    const v = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
    for (const h of walk(ROOT).filter((p) => p.endsWith('.html'))) {
      const s = fs.readFileSync(h, 'utf8');
      const o = s.replace(/grow\.js\?v=\d+/g, 'grow.js?v=' + v);
      if (o !== s) fs.writeFileSync(h, o);
    }
  }
})();
