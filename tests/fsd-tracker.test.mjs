import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),M=require('../fsd-tracker-model.js');
const d=JSON.parse(fs.readFileSync('data/fsd-tracker.json','utf8'));
const src=Object.fromEntries(d.sources.map(s=>[s.id,s]));

test('record validates and every figure carries a status, date and opened source',()=>{
  assert.equal(M.validate(d),d);
  for(const k of d.kpis.filter(k=>!k.computed)){assert.ok(M.status[k.status],k.id);assert.ok(src[k.source],k.id);}
  for(const p of d.adoption.points)assert.ok(src[p.source],p.id);
  for(const s of d.sources)assert.ok(s.checked<=d.reviewed,s.id);
});

test('Disclosed only ever cites a Tesla or regulator document, never a news report',()=>{
  for(const k of d.kpis.filter(k=>!k.computed&&k.status==='disclosed'))assert.ok(['primary','regulator'].includes(src[k.source].kind),k.id);
});

test('adoption series matches Tesla\'s decks and the ratio is plain arithmetic',()=>{
  const q3=d.adoption.points.at(-1);
  assert.equal(q3.subs,1.74);assert.equal(q3.deliveries,10.2);assert.equal(M.ratio(q3),17.1);
  assert.equal(M.ratio({subs:1,deliveries:8}),12.5);
  assert.equal(d.adoption.points.length,7);
  for(const bad of [{subs:0,deliveries:1},{subs:1,deliveries:0},{subs:-1,deliveries:2},{subs:NaN,deliveries:2}])assert.throws(()=>M.ratio(bad));
  assert.ok(Math.round((q3.subs/d.adoption.points.find(p=>p.id==='q3-25').subs-1)*100)===67,'67% year on year, as Tesla says');
});

test('validator rejects bad data',()=>{
  const bad=()=>structuredClone(d);
  let x=bad();x.kpis[0].source='nope';assert.throws(()=>M.validate(x));
  x=bad();x.sources[0].url='http://insecure.test';assert.throws(()=>M.validate(x));
  x=bad();x.sources[0].checked='2099-01-01';assert.throws(()=>M.validate(x));
  x=bad();x.adoption.points.reverse();assert.throws(()=>M.validate(x));
  x=bad();x.adoption.points[3].deliveries=1;assert.throws(()=>M.validate(x));
  x=bad();x.kpis[0].status='confirmed';assert.throws(()=>M.validate(x));
  x=bad();x.changes[0].kind='silent';assert.throws(()=>M.validate(x));
});

test('page is reproducible, escapes text, labels estimates and keeps search records',()=>{
  const before=fs.readFileSync('fsd-tracker.html','utf8'),index=fs.readFileSync('data/pages.json','utf8');
  execFileSync(process.execPath,['scripts/build-fsd-tracker.mjs']);
  assert.equal(fs.readFileSync('fsd-tracker.html','utf8'),before);
  assert.equal(fs.readFileSync('data/pages.json','utf8'),index);
  assert.equal((before.match(/<h1[ >]/g)||[]).length,1);
  assert.ok(!before.includes('${'));
  assert.ok(before.includes('rel="canonical" href="https://superchargeddaily.com/fsd-tracker.html"'));
  assert.ok(before.includes('ft-chip-estimate'),'our ratio is labelled as an estimate');
  assert.equal((before.match(/class="ft-kpi"/g)||[]).length,d.kpis.length);
  const adoptionSec=before.slice(before.indexOf('id="adoption"'),before.indexOf('id="miles"'));
  assert.equal((adoptionSec.match(/<tr><th scope="row">/g)||[]).length,d.adoption.points.length,'table view has every quarter');
  const ld=JSON.parse(before.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.deepEqual(ld['@graph'].map(g=>g['@type']),['WebPage','BreadcrumbList']);
  const pages=JSON.parse(index).pages;
  for(const u of ['/fsd-tracker.html','/fsd-tracker.html#adoption'])assert.ok(pages.some(p=>p.url===u),u);
  assert.equal(M.esc('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
});

test('markets figure comes from the global tracker data, so the two pages cannot disagree',()=>{
  const g=JSON.parse(fs.readFileSync('data/fsd-global.json','utf8'));
  const page=fs.readFileSync('fsd-tracker.html','utf8');
  assert.ok(page.includes(`<p class="ft-kpi-value">${g.listed.length}<small>`));
});

test('charts are plain SVG with titles and a table fallback',()=>{
  const page=fs.readFileSync('fsd-tracker.html','utf8');
  assert.ok(page.includes('<title id="ft-a-t">'));assert.ok(page.includes('<details class="ft-table-view">'));
  assert.equal((page.match(/class="ft-bar/g)||[]).length,d.adoption.points.length);
  assert.ok(!/<script[^>]*src="[^"]*(chart|d3|plotly|echarts)/i.test(page),'no chart library');
});

test('the global tracker builder and this builder leave data/pages.json stable in either order',()=>{
  const run=f=>execFileSync(process.execPath,[f]);
  const saved=fs.readFileSync('data/pages.json','utf8');
  try{
    run('scripts/build-fsd-global.mjs');run('scripts/build-fsd-tracker.mjs');const a=fs.readFileSync('data/pages.json','utf8');
    run('scripts/build-fsd-tracker.mjs');run('scripts/build-fsd-global.mjs');const b=fs.readFileSync('data/pages.json','utf8');
    assert.equal(a,b);
  }finally{fs.writeFileSync('data/pages.json',saved);}
});

test('axis grows with the data and the phone chart lists every quarter',()=>{
  const page=fs.readFileSync('fsd-tracker.html','utf8');
  assert.equal((page.match(/<li( class="ft-hot")?><span class="ft-hb-q">/g)||[]).length,d.adoption.points.length);
  assert.ok(!/ratio [\d.]+% of/.test(page),'ratio never phrased as a share of cars');
});

test('miles chart is cumulative, marked approximate, and never presented as an exact figure',()=>{
  const m=d.miles,page=fs.readFileSync('fsd-tracker.html','utf8');
  for(let i=1;i<m.points.length;i++){assert.ok(m.points[i].total>=m.points[i-1].total);assert.ok(m.points[i].v11<=m.points[i].total);}
  assert.ok(m.points.at(-1).total>14&&m.points.at(-1).total<16.5,'matches the end of Tesla\'s chart (axis to 16 billion)');
  assert.ok(page.includes('ft-chip-approx'));assert.ok(page.includes('≈'));
  assert.ok(d.kpis.find(k=>k.id==='miles').status==='approx');
  const bad=structuredClone(d);bad.miles.points[5].total=0.01;assert.throws(()=>M.validate(bad));
  const bad2=structuredClone(d);bad2.miles.points[3].v11=99;assert.throws(()=>M.validate(bad2));
});

test('software section is pinned data, described as running totals of cars seen, and not a share of the fleet',()=>{
  const page=fs.readFileSync('fsd-tracker.html','utf8'),sw=d.software;
  assert.equal(sw.builds.length,sw.top);assert.equal(sw.releases.length,sw.timeline);
  assert.ok(sw.builds.every(b=>b.counts.length===sw.days.length));
  assert.equal((page.match(/<li><i style="background:/g)||[]).length,sw.top);
  assert.equal((page.match(/<li><p class="ft-date">/g)||[]).length,sw.timeline);
  assert.ok(page.includes('A car can appear under more than one build, so the lines are not stacked'));
  assert.ok(page.includes('running total of cars seen on that build, not a share of cars on it today'));
  assert.ok(page.includes('it is not Tesla\'s rollout count'));
  assert.ok(!/cover \d+% of/.test(page)&&!page.includes('share of the sampled cars'),'no share-of-fleet claims');
  assert.ok(page.includes(`to ${sw.asOf.slice(11,16)} UTC`),'last column labelled as a part day');
  assert.ok(page.includes('First seen'));
  assert.ok(!/TeslaFi|shares for|share of cars/.test(page.replace('not a share of cars on it today','')),'no share claims or uncited outlets in the software section');
  const ids=[...page.matchAll(/ id="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'ids are unique (desktop and phone charts)');
});

test('the page does not depend on the bot-updated software history',()=>{
  const src=fs.readFileSync('scripts/build-fsd-tracker.mjs','utf8');
  assert.ok(!src.includes('updates-history')&&!src.includes('updates-data'),'build reads only reviewed files');
  assert.ok(fs.existsSync('scripts/refresh-fsd-software.mjs'));
});

test('the refresh script pins software data deterministically',()=>{
  const before=fs.readFileSync('data/fsd-tracker.json','utf8');
  try{execFileSync(process.execPath,['scripts/refresh-fsd-software.mjs']);
    const a=JSON.parse(fs.readFileSync('data/fsd-tracker.json','utf8'));assert.equal(M.validate(a),a);assert.equal(a.software.builds.length,a.software.top);
  }finally{fs.writeFileSync('data/fsd-tracker.json',before);}
});
