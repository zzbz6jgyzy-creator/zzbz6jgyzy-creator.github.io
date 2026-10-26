#!/usr/bin/env node
// Packages the existing static site for Cloudflare: copies the publishable files from the repo root into ./.legacy (Astro's
// public dir), skipping anything already ported to an Astro page (ported.json), and writes _headers and _redirects.
//
//   node scripts/prepare-legacy.mjs [--out DIR] [--headers-only]
//
// The repo root stays the source of truth until a page is ported. Files are hardlinked when the filesystem allows it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ASTRO = path.resolve(HERE, '..');
export const ROOT = path.resolve(ASTRO, '..');

// Root-level files that are part of the site. Everything else at the root (*.md, CNAME, .nojekyll, tooling) is not published.
export const ROOT_FILE = /\.(html|css|js|json|xml|txt|png|ico|svg|webmanifest|ics)$/i;
// Directories that are part of the site. Repo-only dirs (scripts tests docs supabase workers templates .github .claude .cursor astro dev) are absent on purpose.
export const PUBLIC_DIRS = ['assets', 'vendor', 'data', 'dispatch', 'reviews', 'explainers', 'guides', 'fsd-europe', 'cybercab-cities', 'videos', '.well-known'];
export const REPO_ONLY = ['scripts', 'tests', 'docs', 'supabase', 'workers', 'templates', '.github', '.claude', '.cursor', 'astro', 'dev', 'node_modules', '.git'];
// Meta-refresh stubs with a plain destination become real 301s. The two that carry a #fragment stay as the stub pages.
export const REDIRECTS = [
  ['/goldcab.html', '/games.html'],
  ['/videos.html', '/'],
  ['/videos/index.html', '/'],
  ['/dispatch/index.html', '/dispatch.html'],
  ['/dispatch/', '/dispatch.html'],
  ['/videos/', '/'],
];

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const OUT = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(ASTRO, '.legacy'));

function ported() {
  const p = path.join(ASTRO, 'ported.json');
  return new Set(fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')).files : []);
}

function* walk(dir, rel = '') {
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) yield* walk(dir, r);
    else if (e.isFile()) yield r;
  }
}

export function publishSet() {
  const skip = ported();
  const files = [];
  for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (e.isFile() && ROOT_FILE.test(e.name) && !e.name.startsWith('.') && !skip.has(e.name)) files.push(e.name);
  }
  for (const d of PUBLIC_DIRS) {
    if (!fs.existsSync(path.join(ROOT, d))) continue;
    for (const f of walk(ROOT, d)) if (!skip.has(f)) files.push(f);
  }
  return files.sort();
}

export function headers(files) {
  const assetDirs = [...new Set(files.filter((f) => /^assets\/[^/]+\//.test(f)).map((f) => f.split('/')[1]))].sort();
  const rootData = files.filter((f) => !f.includes('/') && f.endsWith('.json'));
  const rules = [
    // No Cache-Control here: Cloudflare merges every matching rule, so overlapping rules would concatenate values.
    ['/*', [
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy: strict-origin-when-cross-origin',
      'Permissions-Policy: camera=(), microphone=(), payment=(), usb=()',
      'Strict-Transport-Security: max-age=31536000',
    ]],
    ['/', ['Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600']],
    ['/*.html', ['Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600']],
    // Hashed bundles never change at a given URL.
    ['/assets/js/*', ['Cache-Control: public, max-age=31536000, immutable']],
    ['/assets/fonts/*', ['Cache-Control: public, max-age=31536000, immutable']],
    ...assetDirs.filter((d) => !['js', 'fonts'].includes(d)).map((d) => [`/assets/${d}/*`, ['Cache-Control: public, max-age=604800, stale-while-revalidate=86400']]),
    ['/data/*', ['Cache-Control: public, max-age=60, stale-while-revalidate=300']],
    ...rootData.map((f) => [`/${f}`, ['Cache-Control: public, max-age=60, stale-while-revalidate=300']]),
  ];
  return rules.map(([p, h]) => `${p}\n${h.map((x) => '  ' + x).join('\n')}`).join('\n\n') + '\n';
}

export function redirects(files) {
  return REDIRECTS.filter(([from]) => files.includes(from.endsWith('/') ? from.slice(1) + 'index.html' : from.slice(1))).map(([a, b]) => `${a} ${b} 301`).join('\n') + '\n';
}

function link(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = publishSet();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  let bytes = 0, biggest = ['', 0];
  for (const f of files) {
    const s = fs.statSync(path.join(ROOT, f)).size;
    bytes += s;
    if (s > biggest[1]) biggest = [f, s];
    if (!flag('--headers-only')) link(path.join(ROOT, f), path.join(OUT, f));
  }
  fs.writeFileSync(path.join(OUT, '_headers'), headers(files));
  fs.writeFileSync(path.join(OUT, '_redirects'), redirects(files));
  const MiB = 1024 * 1024;
  console.log(`prepare-legacy: ${files.length} files, ${(bytes / MiB).toFixed(1)} MiB -> ${path.relative(process.cwd(), OUT) || '.'} (largest ${biggest[0]} ${(biggest[1] / MiB).toFixed(1)} MiB)`);
  if (files.length + 2 > 20000) { console.error('Too many files for Workers static assets (limit 20,000).'); process.exit(1); }
  if (biggest[1] > 25 * MiB) { console.error('A file exceeds the 25 MiB Workers assets limit.'); process.exit(1); }
}
