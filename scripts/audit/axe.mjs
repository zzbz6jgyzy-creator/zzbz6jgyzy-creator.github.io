#!/usr/bin/env node
// axe-core (WCAG 2.0/2.1/2.2 A+AA + best-practice) at 390 and 1440px, light and dark.
// usage: node scripts/audit/axe.mjs <path|url> [--live]   (exit 1 if any serious/critical violation)
import { tools, chromePath, proxyFor, target, isolate, SCHEMES } from './common.mjs';

const arg = process.argv[2];
if (!arg) { console.error('usage: axe.mjs <path|url> [--live]'); process.exit(2); }
const t = await target(arg, { live: process.argv.includes('--live') });
const require = tools();
const { chromium } = require('playwright-core');
const AxeBuilder = require('@axe-core/playwright').default;
const browser = await chromium.launch({ executablePath: chromePath(), proxy: proxyFor(t.url), args: ['--no-sandbox'] });
let bad = 0;
for (const scheme of SCHEMES) for (const w of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
  await isolate(ctx, t.local);
  const page = await ctx.newPage();
  await page.goto(t.url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(800);
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  console.log(`\n== ${scheme} ${w}px${hscroll ? '  ⚠ horizontal scroll' : ''}`);
  if (hscroll) bad++;
  if (!r.violations.length) console.log('  no violations');
  for (const v of r.violations) {
    if (['serious', 'critical'].includes(v.impact)) bad++;
    const n = v.nodes[0], d = (n.any[0] || {}).data || {};
    const detail = d.fgColor ? ` ${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1` : '';
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} (${v.tags.filter((x) => x.startsWith('wcag')).join(',')})${detail}\n      e.g. ${n.target.join(' ')}`);
  }
  await ctx.close();
}
await browser.close();
t.stop();
console.log(bad ? `\nFAIL: ${bad} serious/critical issue(s) or scroll problem(s)` : '\nPASS');
process.exit(bad ? 1 : 0);
