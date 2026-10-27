import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),M=require('../cybercab-guide-model.js');
const d=JSON.parse(fs.readFileSync('data/cybercab-guide.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('data/promises.json','utf8')).promises;
const ids=ledger.map(p=>p.id);

test('record validates and every number carries a status label and an opened source',()=>{
  assert.equal(M.validate(d,ids),d);
  const src=new Set(d.sources.map(s=>s.id));
  for(const m of d.metrics){assert.ok(M.status[m.status],m.id);assert.ok(src.has(m.source),m.id);}
  for(const r of d.versions.rows)for(const c of d.versions.columns.map(c=>c.id)){const x=r.cells[c];if(x){assert.ok(M.status[x.status]);assert.ok(src.has(x.source));}}
  for(const s of d.sources)assert.ok(s.checked<=d.reviewed,s.id);
});

test('status labels follow who said it: spec figures from outlets are never Disclosed',()=>{
  for(const row of ['battery','range','motor']){const x=d.versions.rows.find(r=>r.id===row).cells.production;assert.equal(x.status,'reported',row);}
  assert.ok(d.metrics.filter(m=>m.status==='target').every(m=>['customers','price'].includes(m.id)));
  assert.equal(d.versions.columns.at(-1).id,'customer');
  assert.ok(d.versions.rows.filter(r=>r.id!=='status').every(r=>r.cells.customer===null),'customer column stays blank except the stated aim');
});

test('Disclosed only ever cites a Tesla or regulator document, never a news report',()=>{
  const kind=Object.fromEntries(d.sources.map(s=>[s.id,s.kind]));
  const cites=x=>[x.source,...(x.also||[])];
  const ok=x=>x.status!=='disclosed'||kind[x.source]==='primary'||kind[x.source]==='regulator';
  for(const m of d.metrics)assert.ok(ok(m),m.id);
  for(const r of d.rivals.rows)for(const x of Object.values(r.cells))if(x)assert.ok(ok(x),'rival '+r.id);
  for(const x of [...d.parts,...d.partsUnplaced])assert.ok(ok(x),x.id);
  for(const r of d.versions.rows)for(const x of Object.values(r.cells))if(x)assert.ok(ok(x),r.id);
  assert.ok(cites({source:'a',also:['b']}).length===2);
});

test('validator rejects bad data',()=>{
  const bad=()=>structuredClone(d);
  let x=bad();x.metrics[0].source='nope';assert.throws(()=>M.validate(x,ids));
  x=bad();x.sources[0].url='http://insecure.test';assert.throws(()=>M.validate(x,ids));
  x=bad();x.sources[0].checked='2099-01-01';assert.throws(()=>M.validate(x,ids));
  x=bad();x.timeline[0].date='2026-02-30';assert.throws(()=>M.validate(x,ids));
  x=bad();x.timeline.reverse();assert.throws(()=>M.validate(x,ids));
  x=bad();x.promises[0].id='renamed-or-removed';assert.throws(()=>M.validate(x,ids));
  x=bad();x.changes[0].kind='silent';assert.throws(()=>M.validate(x,ids));
  x=bad();x.metrics[0].status='confirmed';assert.throws(()=>M.validate(x,ids));
});

test('promise rows are single-sourced from the ledger',()=>{
  const page=fs.readFileSync('cybercab-guide.html','utf8');
  for(const x of d.promises){const p=ledger.find(l=>l.id===x.id);assert.ok(p,x.id);assert.ok(page.includes(`id="p-${x.id}"`));assert.ok(page.includes(M.esc(p.quote)),x.id);}
});

test('page is reproducible, owns its schema and keeps search records',()=>{
  const before=fs.readFileSync('cybercab-guide.html','utf8'),index=fs.readFileSync('data/pages.json','utf8');
  execFileSync(process.execPath,['scripts/build-cybercab-guide.mjs']);
  assert.equal(fs.readFileSync('cybercab-guide.html','utf8'),before);
  assert.equal(fs.readFileSync('data/pages.json','utf8'),index);
  assert.equal((before.match(/<h1[ >]/g)||[]).length,1);
  assert.ok(!before.includes('${'));
  assert.ok(before.includes('rel="canonical" href="https://superchargeddaily.com/cybercab-guide.html"'));
  const ld=JSON.parse(before.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.deepEqual(ld['@graph'].map(g=>g['@type']),['WebPage','BreadcrumbList','FAQPage']);
  assert.equal(ld['@graph'][2].mainEntity.length,d.faqs.length);
  const pages=JSON.parse(index).pages;
  for(const id of ['status','versions','timeline','promises','questions'])assert.ok(pages.some(p=>p.url==='/cybercab-guide.html#'+id),id);
});

test('X post uses the standard click-to-load embed, never the widget script',()=>{
  const page=fs.readFileSync('cybercab-guide.html','utf8');
  assert.ok(page.includes('class="twitter-tweet"'));
  assert.ok(page.includes('https://x.com/live_munro/status/2114739987271073944'));
  assert.ok(page.includes('/x-embed.js')&&page.includes('/x-embed.css'));
  assert.ok(!page.includes('platform.twitter.com/widgets.js'));
});

test('change log is ordered and shown on the page; untrusted text is escaped',()=>{
  const page=fs.readFileSync('cybercab-guide.html','utf8');
  assert.equal((page.match(/<li><time datetime="[^"]+">[^<]+<\/time> <span class="cg-kind /g)||[]).length,d.changes.length);
  assert.equal(M.esc('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
});

test('capacity arithmetic is plain multiplication and rejects bad input',()=>{
  const c=d.capacity;
  assert.deepEqual(M.plan(500,c),{weekly:500,yearly:26000,pct:21,weeks:20});
  assert.equal(M.plan(2400,c).pct,Math.round(2400*52/c.yearly*100));
  for(const w of [0,-5,1.5,NaN,20000])assert.throws(()=>M.plan(w,c));
  const page=fs.readFileSync('cybercab-guide.html','utf8');
  for(const w of c.steps)assert.ok(page.includes((w*52).toLocaleString('en-GB')),String(w));
  assert.ok(page.includes('not a forecast'));
});

test('illustration is labelled as ours and only places features with a known position',()=>{
  const page=fs.readFileSync('cybercab-guide.html','utf8');
  assert.ok(page.includes('Our illustration'));assert.ok(page.includes('not Tesla CAD'));
  assert.equal((page.match(/class="cg-mark"/g)||[]).length,d.parts.length);
  assert.ok(d.partsUnplaced.length>=2&&d.partsUnplaced.every(p=>/not published/.test(p.text)));
  const bad=structuredClone(d);bad.parts[0].x=140;assert.throws(()=>M.validate(bad,ids));
});

test('share card is 1200x630, wired to og and twitter tags, and the template exists',()=>{
  const page=fs.readFileSync('cybercab-guide.html','utf8');
  assert.ok(page.includes('content="https://superchargeddaily.com/assets/og-cybercab-guide.jpg"'));
  assert.ok(page.includes('property="og:image:width" content="1200"')&&page.includes('property="og:image:height" content="630"'));
  assert.ok(page.includes('twitter:image:alt'));
  assert.ok(fs.existsSync('scripts/cybercab-og-card.html'));
  const jpg=fs.readFileSync('assets/og-cybercab-guide.jpg');let i=2,w=0,h=0;
  while(i<jpg.length){if(jpg[i]!==0xFF){i++;continue;}const m=jpg[i+1];if(m>=0xC0&&m<=0xC3){h=jpg.readUInt16BE(i+5);w=jpg.readUInt16BE(i+7);break;}i+=2+jpg.readUInt16BE(i+2);}
  assert.deepEqual([w,h],[1200,630]);
});
