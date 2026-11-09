#!/usr/bin/env node
// astro/src/lib/dispatch-md.mjs must render the Dispatch Markdown dialect exactly like scripts/render-article.py
// (render_body), block for block, and refuse the same input. Fixtures cover every syntax in docs/writing-articles.md.
//   node scripts/check-md-parity.mjs   (from astro/)
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderBody, ArticleError } from '../src/lib/dispatch-md.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OK = [
  'Plain paragraph with **bold**, *italic*, `code` & <angle> "quotes" and it\'s apostrophes.\nSecond line joins.',
  'Links: [SpaceX](https://www.spacex.com/), [ours](https://superchargeddaily.com/x.html), [local](/tesla.html), [anchor](#a) and [**bold link**](https://x.com/a).',
  '## A section\n\nText.\n\n### Sub *section*\n\nMore.',
  '- one [a](https://example.com/a)\n- two **b**\n\n1. first\n2. second',
  '> A quoted line\n> continues here',
  '## Fleet numbers\n\n| Model | Count |\n|---|---:|\n| Model *Y* | 1,282 |\n| Waymo | 1,285 |',
  '::pull A pull quote with [a link](https://example.com/).',
  '::note Small print & caveats.',
  '::sources [SpaceX](https://www.spacex.com/); [FAA](https://www.faa.gov/).',
  '::x\nurl: https://x.com/SpaceX/status/2109956064774918286\nauthor: SpaceX (@SpaceX)\ntext: Liftoff! <wow> & more\n  continued line\ncaption: Video: SpaceX on X.',
  '::image\nsrc: /assets/dispatch/ark-tesla-2031-model-poster.jpg\nalt: A "chart" of things\ncaption: Image: ARK Invest.',
  '::video\nsrc: /assets/dispatch/b1088-20th-flight.mp4\nposter: /assets/dispatch/assisted-driving-poster.jpg\ncaption: Video: @SpaceX',
  'Para one.\n\n- list right after\n\nPara two\n> not a quote start mid-paragraph',
];
const BAD = [
  'DRAFT paragraph', '<div>raw</div>', '# H1 in body', '| a |\n| b |', '::sources no links here',
  '::x\nurl: https://twitter.com/a/status/1\nauthor: a\ntext: t\ncaption: c', '::image\nsrc: /assets/dispatch/missing.jpg\nalt: a\ncaption: c',
  '::video\nsrc: video.mp4\nposter: /assets/x.jpg\ncaption: c', '::unknown thing',
];

function python(md) {
  const code = 'import importlib.util,json,sys\nspec=importlib.util.spec_from_file_location("ra","scripts/render-article.py");ra=importlib.util.module_from_spec(spec);spec.loader.exec_module(ra)\n' +
    'md=sys.stdin.read()\ntry:\n print(json.dumps({"ok":ra.render_body(md,set())}))\nexcept ra.ArticleError as e:\n print(json.dumps({"err":str(e)}))';
  const r = spawnSync('python3', ['-c', code], { cwd: ROOT, input: md, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}
function js(md) {
  try { return { ok: renderBody(md, new Set(), ROOT) }; } catch (e) { if (e instanceof ArticleError) return { err: e.message }; throw e; }
}

let bad = 0;
for (const md of OK) {
  const p = python(md), j = js(md);
  const same = JSON.stringify(p) === JSON.stringify(j) && p.ok;
  if (!same) { bad++; console.log('FAIL render\n  md:', JSON.stringify(md), '\n  py:', JSON.stringify(p), '\n  js:', JSON.stringify(j)); }
}
for (const md of BAD) {
  const p = python(md), j = js(md);
  const same = p.err && j.err && p.err === j.err;
  if (!same) { bad++; console.log('FAIL refuse\n  md:', JSON.stringify(md), '\n  py:', JSON.stringify(p), '\n  js:', JSON.stringify(j)); }
}
if (bad) { console.error(`${bad} fixture(s) differ`); process.exit(1); }
console.log(`markdown parity: ${OK.length} renders and ${BAD.length} refusals identical to render-article.py`);
