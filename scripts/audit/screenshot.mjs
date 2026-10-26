#!/usr/bin/env node
// Screenshots at 390 / 768 / 1440 in light and dark. usage: node scripts/audit/screenshot.mjs <path|url> [outDir] [--full] [--live]
// Prints the saved file paths; open them with the Read tool to look at them.
import { tools, chromePath, proxyFor, target, isolate, VIEWPORTS, SCHEMES } from './common.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const flags = process.argv.slice(2).filter((x) => x.startsWith('--'));
if (!args[0]) { console.error('usage: screenshot.mjs <path|url> [outDir] [--full] [--live]'); process.exit(2); }
const t = await target(args[0], { live: flags.includes('--live') });
const slug = (new URL(t.url).pathname.replace(/\.html$/, '').replace(/^\/|\/$/g, '') || 'home').replace(/[^\w-]+/g, '-');
const out = args[1] || path.join(os.tmpdir(), 'sd-shots');
fs.mkdirSync(out, { recursive: true });
const require = tools();
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: chromePath(), proxy: proxyFor(t.url), args: ['--no-sandbox'] });
for (const vp of VIEWPORTS) for (const scheme of SCHEMES) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme, reducedMotion: 'reduce' });
  await isolate(ctx, t.local);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(t.url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(900);
  const file = path.join(out, `${slug}-${vp.name}-${scheme}.png`);
  await page.screenshot({ path: file, fullPage: flags.includes('--full') });
  console.log(file + (errors.length ? '   ⚠ page errors: ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close();
t.stop();
