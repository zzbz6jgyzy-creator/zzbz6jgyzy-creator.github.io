#!/usr/bin/env node
// Astro (src/content.config.ts) and the live renderer (scripts/render-article.py) must accept and refuse the same
// front matter, so a story that passes one cannot break the other. Each fixture is written to
// content/dispatch/zz-schema-*.md, checked with `astro sync` and `render-article.py --check`, then removed.
//   node scripts/check-content-schema.mjs        (run from astro/, Node >= 22.23.4)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ASTRO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(ASTRO, '..');
const DIR = path.join(ROOT, 'content', 'dispatch');
const BODY = '\nSpaceX ran a test, per [SpaceX](https://www.spacex.com/).\n\nSecond paragraph.\n\nThird paragraph.\n';
const front = (o) => '---\n' + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n---\n';
const good = { title: 'SpaceX runs a test', summary: 'A plain one-line summary.', topic: 'spacex', tag: 'Starship', date: '2026-11-09T12:00:00Z' };
const FIXTURES = [
  ['valid', good, true],
  ['valid with image', { ...good, image: '/assets/dispatch/x.jpg', imageAlt: 'A rocket on the pad' }, true],
  ['DRAFT title', { ...good, title: 'DRAFT headline' }, false],
  ['markdown in title', { ...good, title: 'SpaceX *runs* a test' }, false],
  ['unknown topic', { ...good, topic: 'nasa' }, false],
  ['image without alt', { ...good, image: '/assets/dispatch/x.jpg' }, false],
];

const created = !fs.existsSync(DIR);
fs.mkdirSync(DIR, { recursive: true });
let bad = 0;
try {
  for (const [i, [name, fm, ok]] of FIXTURES.entries()) {
    const file = path.join(DIR, `zz-schema-${i}.md`);
    fs.writeFileSync(file, front(fm) + BODY);
    const astro = spawnSync('npx', ['astro', 'sync'], { cwd: ASTRO, encoding: 'utf8' }).status === 0;
    const py = spawnSync('python3', ['scripts/render-article.py', '--check', `zz-schema-${i}`], { cwd: ROOT, encoding: 'utf8' });
    // render-article.py --check prints "ok" for a valid story; media files are not checked by --check for front matter images.
    const python = py.status === 0 && /^ok\s/m.test(py.stdout);
    const pass = astro === ok && python === ok;
    if (!pass) bad++;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: expected ${ok ? 'accept' : 'refuse'}, astro ${astro ? 'accepts' : 'refuses'}, renderer ${python ? 'accepts' : 'refuses'}`);
    fs.rmSync(file);
  }
} finally {
  for (const f of fs.readdirSync(DIR)) if (f.startsWith('zz-schema-')) fs.rmSync(path.join(DIR, f));
  if (created && fs.readdirSync(DIR).length === 0) fs.rmSync(path.join(ROOT, 'content'), { recursive: true, force: true });
  spawnSync('npx', ['astro', 'sync'], { cwd: ASTRO });
}
if (bad) { console.error(`${bad} fixture(s) disagree`); process.exit(1); }
console.log('content schema: Astro and render-article.py agree on all fixtures');
