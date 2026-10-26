#!/usr/bin/env node
// Proves the Astro build serves what the repo root serves today.
//
//   node scripts/parity.mjs [--from ..] [--to dist]
//
// Checks every file in the publish set (byte hash), every URL in the sitemaps (maps to a built file), the stubs, 404 and
// well-known files, and the Workers limits. Pages listed in ported.json are compared by presence only (they are rebuilt by Astro).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publishSet, REDIRECTS } from './prepare-legacy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const FROM = path.resolve(process.cwd(), opt('--from', path.join(HERE, '..', '..')));
const TO = path.resolve(process.cwd(), opt('--to', path.join(HERE, '..', 'dist')));
const ported = new Set(JSON.parse(fs.readFileSync(path.join(HERE, '..', 'ported.json'), 'utf8')).files);

const problems = [];
const fail = (m) => problems.push(m);
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const MiB = 1024 * 1024;

const files = publishSet();
let same = 0;
for (const f of files) {
  const to = path.join(TO, f);
  if (!fs.existsSync(to)) { fail(`missing in build: ${f}`); continue; }
  if (ported.has(f)) continue;
  if (fs.statSync(path.join(FROM, f)).size !== fs.statSync(to).size || sha(path.join(FROM, f)) !== sha(to)) fail(`differs: ${f}`);
  else same++;
}

// Anything in the build that is not in the publish set (other than the two Cloudflare control files and Astro output) is a leak.
const expected = new Set([...files, '_headers', '_redirects']);
const built = [];
(function walk(rel) {
  for (const e of fs.readdirSync(path.join(TO, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(r); else built.push(r);
  }
})('');
const astroOwned = (f) => f.startsWith('_astro/');
for (const f of built) if (!expected.has(f) && !astroOwned(f) && !ported.has(f)) fail(`unexpected file in build: ${f}`);
for (const f of built) {
  const p = path.join(TO, f);
  const rel = f.split('/')[0];
  if (/^(scripts|tests|docs|supabase|workers|templates|\.github|\.claude|\.cursor|astro|dev|node_modules)$/.test(rel) || (/\.md$/i.test(f) && !/^(assets|data)\//.test(f)) || f === 'CNAME') fail(`repo-only file published: ${f}`);
  if (fs.statSync(p).size > 25 * MiB) fail(`over 25 MiB (Workers limit): ${f}`);
}
if (built.length >= 20000) fail(`${built.length} files; Workers static assets allow 20,000`);

// Sitemap URLs must each resolve to a built file.
let urls = 0;
for (const sm of fs.readdirSync(FROM).filter((n) => /^sitemap.*\.xml$|^news-sitemap\.xml$/.test(n))) {
  const xml = fs.readFileSync(path.join(FROM, sm), 'utf8');
  for (const [, loc] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    let u;
    try { u = new URL(loc); } catch { continue; }
    if (u.hostname !== 'superchargeddaily.com') continue;
    if (u.pathname.endsWith('.xml') && /sitemap/.test(u.pathname)) { if (!fs.existsSync(path.join(TO, u.pathname.slice(1)))) fail(`sitemap ${loc} not built`); continue; }
    urls++;
    const rel = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    if (!fs.existsSync(path.join(TO, rel))) fail(`sitemap URL has no built file: ${loc} (looked for ${rel})`);
  }
}

for (const must of ['404.html', 'index.html', 'robots.txt', 'sitemap.xml', '.well-known/security.txt', '_headers', '_redirects']) {
  if (fs.existsSync(path.join(FROM, must)) || must.startsWith('_')) if (!fs.existsSync(path.join(TO, must))) fail(`required file missing: ${must}`);
}
for (const [from, to] of REDIRECTS) {
  const r = fs.readFileSync(path.join(TO, '_redirects'), 'utf8');
  if (fs.existsSync(path.join(FROM, from.slice(1))) && !r.includes(`${from} ${to} 301`)) fail(`redirect missing: ${from} -> ${to}`);
}
// Cloudflare would 301 /x.html to /x unless html_handling is "none".
const w = fs.readFileSync(path.join(HERE, '..', 'wrangler.jsonc'), 'utf8');
if (!/"html_handling":\s*"none"/.test(w)) fail('wrangler.jsonc must set html_handling "none" to keep .html URLs');

const total = built.reduce((n, f) => n + fs.statSync(path.join(TO, f)).size, 0);
console.log(`parity: ${files.length} publish files (${same} byte-identical, ${ported.size} ported), ${urls} sitemap URLs, ${built.length} built files, ${(total / MiB).toFixed(1)} MiB`);
if (problems.length) {
  console.error(`${problems.length} difference(s):\n` + problems.slice(0, 50).map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log('parity: 0 differences');
