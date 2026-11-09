import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GENERIC = /^\/assets\/(?:og(?:-v\d+)?|brand)(?:\.|\/|-)/i;
const ALLOW = new Set([
  // Slugs allowed to keep the branded OG card when no decent licensed photo exists.
  // Keep this list empty unless a story truly cannot take a relevant CC/PD/press photo.
]);

function slugOf(url) {
  return String(url || '').replace(/^\/dispatch\/|\.html$/g, '');
}

test('dispatch articles.json cards use a real on-disk photo, not the branded OG fallback', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/articles.json'), 'utf8'));
  const misses = [];
  for (const a of data.articles || []) {
    if (!a.url || !a.url.startsWith('/dispatch/')) continue;
    const slug = slugOf(a.url);
    if (ALLOW.has(slug)) continue;
    const image = a.image || '';
    if (!image || GENERIC.test(image)) {
      misses.push(`${a.url} image=${image || '(missing)'}`);
      continue;
    }
    const file = path.join(ROOT, image.replace(/^\//, ''));
    if (!fs.existsSync(file)) misses.push(`${a.url} missing file ${image}`);
  }
  assert.equal(misses.length, 0, misses.join('\n'));
});

function cardPhoto(body) {
  return (body.match(/<img[^>]*src="([^"]+)"/) || [])[1]
    || (body.match(/<video[^>]*(?:poster|data-poster)="([^"]+)"/) || [])[1]
    || '';
}

function photoOnDisk(src) {
  const file = path.join(ROOT, src.replace(/^\//, ''));
  if (fs.existsSync(file)) return true;
  // Lazy video posters sometimes point at a 960w webp; the jpg sibling still counts.
  const stem = src.replace(/-960w\.(webp|avif)$/i, '.$1').replace(/\.(webp|avif)$/i, '.jpg');
  return fs.existsSync(path.join(ROOT, stem.replace(/^\//, '')));
}

test('hand-written Dispatch listing cards match articles.json and are not generic OG art', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/articles.json'), 'utf8'));
  const byUrl = Object.fromEntries((data.articles || []).map(a => [a.url, a]));
  const html = fs.readFileSync(path.join(ROOT, 'dispatch.html'), 'utf8');
  const genericCards = [];
  for (const m of html.matchAll(/<a class="story-card[^"]*" href="(\/dispatch\/[^"]+)">([\s\S]*?)<\/a>/g)) {
    const url = m[1];
    const slug = slugOf(url);
    if (ALLOW.has(slug)) continue;
    const body = m[2];
    const src = cardPhoto(body);
    if (!src || GENERIC.test(src) || !photoOnDisk(src)) {
      genericCards.push(`${url} card=${src || '(no img)'}`);
      continue;
    }
    const indexed = byUrl[url];
    const isVideo = /<video[\s>]/.test(body);
    if (!isVideo && indexed && indexed.image && indexed.image !== src) {
      genericCards.push(`${url} card ${src} != articles.json ${indexed.image}`);
    }
  }
  assert.equal(genericCards.length, 0, genericCards.join('\n'));
});
