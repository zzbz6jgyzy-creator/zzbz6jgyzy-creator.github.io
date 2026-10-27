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
