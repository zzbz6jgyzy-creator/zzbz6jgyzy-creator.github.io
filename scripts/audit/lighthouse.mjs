#!/usr/bin/env node
// Lighthouse (mobile + desktop) with Core Web Vitals. usage: node scripts/audit/lighthouse.mjs <path|url> [--live]
// Lab data only (simulated throttling). Real INP/LCP need field data (Search Console / CrUX).
import { tools, chromePath, proxyFor, target } from './common.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = process.argv[2];
if (!arg) { console.error('usage: lighthouse.mjs <path|url> [--live]'); process.exit(2); }
const t = await target(arg, { live: process.argv.includes('--live') });
const require = tools();
const lighthouse = (await import(require.resolve('lighthouse'))).default;
const chromeLauncher = await import(require.resolve('chrome-launcher')).catch(() => null);
if (!chromeLauncher) { console.error('chrome-launcher missing; reinstall tools'); process.exit(2); }
const proxy = proxyFor(t.url);
const flags = ['--headless=new', '--no-sandbox'].concat(proxy ? ['--proxy-server=' + proxy.server] : []);
let failed = false;
for (const mode of ['mobile', 'desktop']) {
  const chrome = await chromeLauncher.launch({ chromePath: chromePath(), chromeFlags: flags });
  const res = await lighthouse(t.url, { port: chrome.port, output: 'json', logLevel: 'error' },
    mode === 'desktop' ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } } : undefined);
  await chrome.kill();
  const { categories: c, audits: a } = res.lhr;
  const score = (k) => Math.round(c[k].score * 100);
  const v = (k) => (a[k] && a[k].displayValue) || '-';
  const ok = mode === 'mobile' ? score('performance') >= 90 : true;
  if (!ok) failed = true;
  console.log(`\n== ${mode}: Performance ${score('performance')}  Accessibility ${score('accessibility')}  Best Practices ${score('best-practices')}  SEO ${score('seo')}`);
  console.log(`   LCP ${v('largest-contentful-paint')}  CLS ${v('cumulative-layout-shift')}  TBT ${v('total-blocking-time')} (INP proxy)  FCP ${v('first-contentful-paint')}  weight ${v('total-byte-weight')}`);
  for (const cat of ['accessibility', 'best-practices', 'seo']) {
    for (const r of c[cat].auditRefs) {
      const au = a[r.id];
      if (r.weight > 0 && au.score !== null && au.score < 1) console.log(`   ✗ [${cat}] ${au.title}`);
    }
  }
  if (process.env.SD_LH_JSON) fs.writeFileSync(path.join(process.env.SD_LH_JSON, `lh-${mode}.json`), JSON.stringify(res.lhr));
}
t.stop();
console.log(failed ? '\nFAIL: mobile performance is below 90' : '\nPASS (mobile performance ≥ 90)');
process.exit(failed ? 1 : 0);
