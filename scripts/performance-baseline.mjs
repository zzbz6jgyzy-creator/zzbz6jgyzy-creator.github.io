#!/usr/bin/env node
// Public live-site lab baseline. Run on a normal network, without request interception.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = (process.env.LH_BASE || 'https://superchargeddaily.com').replace(/\/$/, '');
const out = process.env.LH_OUT || 'tmp/performance-baseline';
const pages = {home:'/', article:'/dispatch/tesla-ai-maps-v15.html', updates:'/updates.html'};
const selected = (process.env.LH_PAGES || Object.keys(pages).join(',')).split(',');
const runs = Number(process.env.LH_RUNS || 3);
if (!Number.isInteger(runs) || runs < 1 || runs > 5 || selected.some(p=>!pages[p])) throw Error('Use 1–5 runs and home,article,updates');
mkdirSync(out,{recursive:true});
const reports=[];
for (const page of selected) {
  for (let run=1;run<=runs;run++) {
    const prefix=join(out,`${page}-${run}`);
    const result=spawnSync(process.env.LIGHTHOUSE_BIN || 'lighthouse', [base+pages[page], '--only-categories=performance,accessibility,best-practices,seo', '--form-factor=mobile', '--throttling-method=simulate', '--output=json', '--output=html', '--output-path='+prefix, '--quiet', '--chrome-path='+(process.env.CHROME_PATH || '/usr/bin/google-chrome'), '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage'],{encoding:'utf8',timeout:180000});
    if(result.status!==0) throw Error(`Audit failed for ${page}: ${result.error || result.stderr || result.stdout}`);
    const report=JSON.parse(readFileSync(prefix+'.report.json','utf8'));
    if(report.runtimeError) throw Error(JSON.stringify(report.runtimeError));
    const audit=report.audits, numeric=id=>audit[id]?.numericValue;
    if (!Number.isFinite(report.categories.performance.score) || ['largest-contentful-paint','cumulative-layout-shift','total-blocking-time'].some(id=>!Number.isFinite(numeric(id)))) throw Error('Audit did not produce usable metrics for '+page);
    reports.push({page,run,url:report.finalDisplayedUrl || report.finalUrl,fetched:report.fetchTime,lighthouseVersion:report.lighthouseVersion,settings:report.configSettings,chrome:report.environment?.hostUserAgent,performance:Math.round(report.categories.performance.score*100),lcpMs:numeric('largest-contentful-paint'),cls:numeric('cumulative-layout-shift'),tbtMs:numeric('total-blocking-time'),fcpMs:numeric('first-contentful-paint'),bytes:numeric('total-byte-weight')});
    console.log(JSON.stringify(reports.at(-1)));
  }
}
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
const summary=selected.map(page=>({page,runs, ...Object.fromEntries(['performance','lcpMs','cls','tbtMs','fcpMs','bytes'].map(key=>[key,median(reports.filter(r=>r.page===page).map(r=>r[key]))]))}));
writeFileSync(join(out,'summary.json'),JSON.stringify({kind:'Lighthouse mobile lab; not field Core Web Vitals',reports,medians:summary},null,2)+'\n');
const markdown=['Mobile Lighthouse lab baseline (median of '+runs+' runs). These audit the currently deployed site; repeat after deployment. TBT is a lab responsiveness measure, not INP.','', '| Page | Performance | LCP (ms) | CLS | TBT (ms) |','|---|---:|---:|---:|---:|',...summary.map(r=>`| ${r.page} | ${r.performance} | ${Math.round(r.lcpMs)} | ${r.cls.toFixed(3)} | ${Math.round(r.tbtMs)} |`)];
writeFileSync(join(out,'summary.md'),markdown.join('\n')+'\n');
