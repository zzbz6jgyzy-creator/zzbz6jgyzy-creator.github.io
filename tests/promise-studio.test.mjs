import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const M=require('../promise-studio-model.js');
const read=p=>fs.readFileSync(p,'utf8');
const raw=JSON.parse(read('data/promises.json'));
const guide=JSON.parse(read('data/promise-studio-guide.json'));
const d=M.normalize(raw,guide);
const record=id=>d.records.find(p=>p.id===id);
const copy=()=>structuredClone(raw);

test('the dated source retains all 64 claim records with independent company and topic fields',()=>{
  assert.equal(d.updated,'2026-10-28');
  assert.equal(d.records.length,64);
  assert.equal(new Set(d.records.map(p=>p.id)).size,64);
  assert.deepEqual(Object.fromEntries(d.companies.map(c=>[c,d.records.filter(p=>p.company===c).length])),{SpaceX:16,Tesla:44,xAI:4});
  assert.equal(d.topics.length,13);
  assert.equal(d.records.filter(p=>p.quote_type==='exact').length,48);
  assert.equal(d.records.filter(p=>p.quote_type==='paraphrase').length,16);
});

test('status totals describe claims, not distinct product deliveries',()=>{
  const counts=M.counts(d);
  assert.deepEqual(counts,{'Delivered':6,'Delivered late':11,'In progress':16,'Missed':27,'Revised':4});
  assert.equal(Object.values(counts).reduce((n,x)=>n+x,0),64);
  const completed=d.records.filter(p=>p.status==='Delivered'||p.status==='Delivered late');
  assert.equal(completed.length,17);
  assert.ok(new Set(completed.map(p=>p.outcome_date)).size<completed.length,'multiple claim records share a recorded outcome date');
});

test('normalization leaves raw quotes, classifications and presentation metadata unchanged',()=>{
  const before=JSON.stringify(raw),presentation=JSON.stringify(guide);
  M.normalize(raw,guide);
  assert.equal(JSON.stringify(raw),before);
  assert.equal(JSON.stringify(guide),presentation);
});

test('malformed identities, unsafe source URLs and missing display metadata are rejected',()=>{
  let bad=copy();bad.promises.push(structuredClone(bad.promises[0]));assert.throws(()=>M.normalize(bad,guide),/Invalid promise record/);
  bad=copy();bad.promises[0].source.url='javascript:alert(1)';assert.throws(()=>M.normalize(bad,guide),/Invalid promise record/);
  bad=copy();bad.promises[0].source.url='https://user:password@example.com';assert.throws(()=>M.normalize(bad,guide),/Invalid promise record/);
  bad=copy();bad.promises[0].said_on='2026-02-30';assert.throws(()=>M.normalize(bad,guide),/Invalid promise record/);
  const missing=structuredClone(guide);delete missing.targets[raw.promises[0].id];assert.throws(()=>M.normalize(raw,missing),/Missing target presentation/);
});

test('partial dates preserve their actual month or year and use UTC calendar bounds',()=>{
  assert.deepEqual(M.span('2013'),{start:Date.UTC(2013,0,1),end:Date.UTC(2014,0,1),precision:'year',label:'2013'});
  const month=M.span('2013-09');
  assert.equal(month.start,Date.UTC(2013,8,1));assert.equal(month.end,Date.UTC(2013,9,1));assert.equal(month.precision,'month');
  assert.match(month.label,/2013/);assert.doesNotMatch(month.label,/\b(?:1|15|30)\b/);
  assert.equal(M.date(record('fsd-90-percent-2013').said_on),month.label);
  const leap=M.span('2024-02-29');assert.equal(leap.end-leap.start,86400000);assert.equal(leap.end,Date.UTC(2024,2,1));
  for(const invalid of ['2023-02-29','2026-02-30','2026-13','2026-00','2026-01-00','2026-01-32','2026-1-1','not a date','2026-10-01T00:00:00Z'])assert.equal(M.span(invalid),null,invalid);
});

test('a price comparison date and an explicitly undated hardware claim never become deadlines',()=>{
  for(const id of ['fsd-hardware-2016','cybertruck-price-39900']){
    const p=record(id),target=M.target(p,d);
    assert.equal(p.status,'Revised');assert.equal(target.precision,'undated');assert.equal(target.start,null);assert.equal(target.end,null);
    assert.equal(M.windowState(p,d,Date.UTC(2050,0,1)),'Revised');
  }
  assert.equal(record('cybertruck-price-39900').deadline,'2023-11-30','the comparison reference stays in the unchanged source');
});

test('quarter and year target windows are drawn as windows rather than exact-day promises',()=>{
  const q=M.target(record('fsd-eu-approval-q1-2027'),d);
  assert.equal(q.precision,'quarter');assert.equal(q.start,Date.UTC(2027,0,1));assert.equal(q.end,Date.UTC(2027,3,1));assert.match(q.label,/Q1 2027/);
  const year=M.target(record('tesla-5m-vehicles-2030'),d);
  assert.equal(year.start,Date.UTC(2030,0,1));assert.equal(year.end,Date.UTC(2031,0,1));assert.equal(year.approximate,true);assert.match(year.label,/2030/);
});

test('compound Terafab wording keeps both quoted months or quarters visible',()=>{
  const chip=M.target(record('terafab-test-chip-mid-2027'),d);
  assert.equal(chip.start,Date.UTC(2027,4,1));assert.equal(chip.end,Date.UTC(2027,6,1));assert.match(chip.label,/May or June/);assert.equal(chip.approximate,true);
  const volume=M.target(record('terafab-volume-q3-2028'),d);
  assert.equal(volume.start,Date.UTC(2028,6,1));assert.equal(volume.end,Date.UTC(2029,0,1));assert.match(volume.label,/Q3 or Q4/);assert.match(volume.basis,/cutoff/i);
});

test('passing a target window prompts review without rewriting an editorial status',()=>{
  const p=record('fsd-eu-approval-q1-2027'),before=JSON.stringify(p);
  assert.equal(M.windowState(p,d,Date.UTC(2027,3,2)),'Target window passed · status awaits review');
  assert.equal(M.windowState(p,d,Date.UTC(2027,0,15)),'Within the recorded target window');
  assert.equal(M.windowState(p,d,Date.UTC(2026,9,26)),'Target window ahead');
  assert.equal(p.status,'In progress');assert.equal(JSON.stringify(p),before);
});

test('evidence without a row date falls back to its source publication date without inventing a title',()=>{
  const p=record('roadster-production-2022'),sourceRow=p.evidence.find(x=>!x.date);
  assert.ok(sourceRow);assert.ok(!sourceRow.source.title);
  const entry=M.events(p,d).find(x=>x.kind==='evidence'&&x.text===sourceRow.text);
  assert.equal(entry.date,sourceRow.source.date);assert.equal(entry.dateBasis,'Source publication date');assert.equal(entry.source.outlet,sourceRow.source.outlet);
  const verified=M.events(p,d).find(x=>x.kind==='verified');assert.equal(verified.date,p.last_verified);assert.match(verified.text,/not a new product milestone/);
});

test('chronologies retain statement, every evidence row and revision, and optional recorded outcomes',()=>{
  const p=record('unsupervised-personal-2025'),rows=M.events(p,d);
  assert.equal(rows.filter(x=>x.kind==='statement').length,1);
  assert.equal(rows.filter(x=>x.kind==='revision').length,p.revisions.length);
  assert.equal(rows.filter(x=>x.kind==='evidence').length,p.evidence.length);
  for(let i=1;i<rows.length;i++)assert.ok(M.span(rows[i].date).start>=M.span(rows[i-1].date).start);
  const delivered=d.records.find(x=>x.outcome_date);assert.equal(M.events(delivered,d).find(x=>x.kind==='outcome').date,delivered.outcome_date);
});

test('company, topic, status, query and watchlist filters intersect real source records',()=>{
  const mixed=M.filtered(d,{company:'SpaceX',topic:'Grok / xAI'});
  assert.ok(mixed.length>0);assert.ok(mixed.every(p=>p.company==='SpaceX'&&p.topic==='Grok / xAI'));
  const saved=[record('fsd-eu-approval-q1-2027').id,record('terafab-volume-q3-2028').id];
  const chosen=M.filtered(d,{company:'Tesla',status:'In progress',savedOnly:true,q:'approval'},saved);
  assert.deepEqual(chosen.map(p=>p.id),['fsd-eu-approval-q1-2027']);
  assert.equal(M.filtered(d,{q:'a phrase no record can possibly contain'}).length,0);
  const earliest=M.filtered(d,{sort:'oldest'});assert.equal(earliest[0].said_on,'2013-09');
});

test('search remains case, accent and Unicode aware without silently emptying a query',()=>{
  const local=structuredClone(d);local.records[0].title='Énergie 目标机器人';
  assert.deepEqual(M.filtered(local,{q:'ENERGIE 目标机器人'}).map(p=>p.id),[local.records[0].id]);
  assert.equal(M.filtered(local,{q:'不存在的机器人'}).length,0);
});

test('stored preferences keep known watched IDs and supported browsing values only',()=>{
  const id=d.records[0].id;
  assert.deepEqual(M.preferences({saved:[id,id,'unknown'],filters:{company:'Tesla',topic:'bogus',status:'bogus',view:'timeline',sort:'bad'},lat:51.5,lon:-.1,q:'private',email:'example@example.com'},d),{saved:[id],filters:{company:'Tesla',topic:'',status:'',view:'timeline',sort:'recent'}});
  for(const invalid of [null,'bad',{saved:'not an array',filters:'bad'}])assert.deepEqual(M.preferences(invalid,d).saved,[]);
  const bounded=M.state({q:'x'.repeat(500),page:-1,view:'evil',savedOnly:'yes'},d);assert.equal(bounded.q.length,120);assert.equal(bounded.page,1);assert.equal(bounded.view,'cards');assert.equal(bounded.savedOnly,false);
});

test('the shared timeline includes the complete last target year instead of clipping it at January',()=>{
  const a=M.axis(d);
  assert.equal(a.start,Date.UTC(2013,0,1));assert.ok(a.end>=Date.UTC(2031,0,1));assert.equal(a.years[0],2013);assert.ok(a.years.includes(2031));
  assert.ok(M.target(record('tesla-5m-vehicles-2030'),d).end<=a.end);
});

test('upcoming cards exclude elapsed windows but do not relabel those source records',()=>{
  const now=Date.UTC(2026,9,26),rows=M.upcoming(d,now);
  assert.ok(rows.length>0&&rows.length<=4);
  assert.ok(rows.every(p=>p.status==='In progress'&&M.target(p,d).end>now));
  for(let i=1;i<rows.length;i++)assert.ok(M.target(rows[i],d).end>=M.target(rows[i-1],d).end);
  assert.equal(M.upcoming(d,Date.UTC(2100,0,1)).length,0);
  assert.equal(M.counts(d)['In progress'],16);
});

test('share links whitelist descriptive filters and never contain local watchlists or coordinates',()=>{
  const id=record('fsd-eu-approval-q1-2027').id;
  const u=new URL(M.share({company:'Tesla',topic:'FSD / autonomy',status:'In progress',q:'<script>alert(1)</script>',view:'timeline',sort:'verified',saved:['secret'],lat:50,lon:10},id));
  assert.equal(u.origin,'https://superchargeddaily.com');assert.equal(u.pathname,'/promise-tracker.html');assert.equal(u.hash,'#'+id);
  assert.deepEqual([...u.searchParams.keys()],['company','topic','status','q','view','sort']);assert.equal(u.searchParams.get('q'),'<script>alert(1)</script>');
  assert.equal(new URL(M.share({},'javascript:alert(1)')).hash,'#explore');
  assert.equal(M.safeURL('javascript:alert(1)'), '');assert.equal(M.safeURL('https://u:p@example.com'), '');assert.equal(M.esc('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;');
});

test('viewers retain every quoted/paraphrased statement, scope note and source citation',()=>{
  const V=require('../promise-studio-view.js');
  for(const p of d.records){
    const html=V.dossier(p,d,{dialog:false});
    assert.ok(html.includes(M.esc(p.quote)),p.id);
    assert.match(html,p.quote_type==='paraphrase'?/Recorded paraphrase/:/Recorded quotation/);
    if(p.note)assert.ok(html.includes(M.esc(p.note)),p.id+' scope note');
    assert.ok(html.includes(M.esc(M.target(p,d).label)),p.id+' target label');
    for(const entry of [...p.evidence,...p.revisions])assert.ok(html.includes(M.esc(entry.text)),p.id+' evidence or revision');
  }
  assert.ok(V.dossier(record('roadster-ship-2025'),d).includes('href="https://superchargeddaily.com/dispatch/roadster-reveal-2026.html"'));
  assert.equal(M.safeURL('/dispatch/roadster-reveal-2026.html'),'https://superchargeddaily.com/dispatch/roadster-reveal-2026.html');
  for(const unsafe of ['//evil.example','/../secret','/%2e%2e/secret','javascript:alert(1)'])assert.equal(M.safeURL(unsafe),'');
});

test('graphics count actual claims and only draw outcomes present in the saved source',()=>{
  const V=require('../promise-studio-view.js'),hero=V.heroGraphic(d),timeline=V.timeline(d,d.records);
  assert.equal((hero.match(/class="pr-matrix-tile /g)||[]).length,64);
  assert.match(hero,/Tiles count claims, not distinct products or deliveries/);
  assert.equal((timeline.match(/<circle[^>]+class="pr-timeline-outcome"/g)||[]).length,d.records.filter(p=>p.outcome_date).length);
  assert.equal((timeline.match(/<rect[^>]+class="pr-timeline-target"/g)||[]).length,62);
  assert.match(timeline,/2031/);assert.match(timeline,/diamonds are editorial verification dates/);
  assert.doesNotMatch(timeline,/\d+ days (?:left|overdue)/);
});

test('renderers escape hostile text and preserve honest empty-evidence and missing-title fallbacks',()=>{
  const V=require('../promise-studio-view.js'),p=structuredClone(record('fsd-eu-approval-q1-2027'));
  p.title='<img src=x onerror="bad">';p.note='<script>bad()</script>';
  const html=V.card(p,d,[],{static:true});
  assert.ok(html.includes('&lt;img src=x onerror=&quot;bad&quot;&gt;'));assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  assert.doesNotMatch(html,/<img src=x|<script>bad/);
  assert.match(html,/No separate evidence entry is attached/);
  const r=record('roadster-production-2022'),entry=r.evidence.find(x=>!x.source.title);
  const link=V.source(entry.source);assert.ok(link.includes(M.esc(entry.source.outlet)));assert.doesNotMatch(link,/undefined/);
});

test('the saved ledger rebuilds deterministically, retains all source evidence and preserves unrelated search records',async()=>{
  const {buildPromiseStudio}=await import('../scripts/build-promise-studio.mjs');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'promise-studio-build-'));
  try{
    fs.mkdirSync(path.join(root,'data'));
    for(const p of ['promise-tracker.html','data/promises.json','data/promise-studio-guide.json','data/pages.json'])fs.copyFileSync(p,path.join(root,p));
    const rawBefore=fs.readFileSync(path.join(root,'data/promises.json'),'utf8');
    const guideBefore=fs.readFileSync(path.join(root,'data/promise-studio-guide.json'),'utf8');
    const unrelated=JSON.parse(fs.readFileSync(path.join(root,'data/pages.json'),'utf8')).pages.filter(x=>!x.url.startsWith('/promise-tracker.html'));
    buildPromiseStudio(root);
    const first=fs.readFileSync(path.join(root,'promise-tracker.html'),'utf8');
    const pages=fs.readFileSync(path.join(root,'data/pages.json'),'utf8');
    buildPromiseStudio(root);
    assert.equal(fs.readFileSync(path.join(root,'promise-tracker.html'),'utf8'),first);
    assert.equal(fs.readFileSync(path.join(root,'data/pages.json'),'utf8'),pages);
    assert.equal(fs.readFileSync(path.join(root,'data/promises.json'),'utf8'),rawBefore);
    assert.equal(fs.readFileSync(path.join(root,'data/promise-studio-guide.json'),'utf8'),guideBefore);
    assert.deepEqual(JSON.parse(pages).pages.filter(x=>!x.url.startsWith('/promise-tracker.html')),unrelated);
    assert.equal(JSON.parse(pages).pages.filter(x=>x.url.startsWith('/promise-tracker.html')).length,6);
    const ids=[...first.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,'every saved element has a unique ID');
    assert.equal((first.match(/data-pr-record="/g)||[]).length,64);
    assert.equal((first.match(/class="pr-static-evidence"/g)||[]).length,64);
    assert.equal((first.match(/<h1\b/g)||[]).length,1);
    for(const p of d.records){assert.ok(ids.includes(p.id),p.id+' legacy anchor');assert.ok(first.includes(M.esc(p.quote)),p.id+' saved statement');}
    const schema=JSON.parse(first.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@type'],'CollectionPage');assert.equal(schema.mainEntity['@type'],'Dataset');assert.equal(schema.mainEntity.dateModified,d.updated);
    assert.match(first,/name="description"/);assert.match(first,/property="og:title"/);assert.match(first,/name="twitter:card"/);
    assert.equal((first.match(/<!--pr:credits-->/g)||[]).length,1);
    assert.match(first,/Steve Jurvetson/);assert.match(first,/CC BY-SA 4.0/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
