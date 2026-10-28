import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),M=require('../roadster-experience-model.js');
const d=JSON.parse(fs.readFileSync('data/roadster-experience.json','utf8'));
const studio=JSON.parse(fs.readFileSync('data/roadster-studio.json','utf8'));
const page=()=>fs.readFileSync('roadster-preview.html','utf8');
const own=Object.fromEntries(d.sources.map(s=>[s.id,s]));

test('record validates; every figure carries a status, a source and a date',()=>{
  assert.equal(M.validate(d,studio.sources),d);
  for(const s of d.sources)assert.ok(s.checked<=d.reviewed,s.id);
  for(const f of d.facts)assert.ok(M.status[f.status]&&f.sources.length,f.id);
  assert.equal(d.facts.filter(f=>f.strip).length,4);
});

test('Reported cites an outlet or our own report, never a company page alone',()=>{
  const items=[...d.facts,...d.reveal.steps,...d.reservation.cards,...d.reservation.terms].filter(x=>x.status==='reported');
  assert.ok(items.length>3);
  for(const x of items)assert.ok(x.sources.some(id=>own[id]&&['reporting','own'].includes(own[id].kind)),JSON.stringify(x).slice(0,80));
});

test('figures match the sources we opened',()=>{
  const all=JSON.stringify(d);
  // Reservation amounts, as Engadget and Autoblog report them.
  assert.ok(all.includes('$5,000 at reservation, then $45,000 within 10 days'));
  // The Verge's quote of the car-on-the-roads line is exact, and absence claims are dated.
  assert.ok(all.includes('\\"This will be an actual car that\'s on the roads\\"'));
  assert.ok(!/No independent timing has been published|None of these has been independently tested|no range has been certified/.test(all),'absence claims are scoped and dated');
  assert.ok(all.includes('$250,000'));
  // The reveal date and the claimed run.
  assert.equal(d.facts.find(f=>f.id==='run').value,'0.81 s');
  assert.equal(d.facts.find(f=>f.id==='production').value,'2028');
  assert.equal(d.facts.find(f=>f.id==='production').status,'target','2028 is a target, never a result');
  // Clause 4 of the reservation agreement is quoted exactly as HotCars prints it.
  assert.ok(d.reservation.terms.some(t=>t.text.includes('we cannot guarantee when your vehicle will actually be delivered or if it will be delivered.')));
  // Nothing is labelled as a result that is only a claim or a target.
  for(const s of d.reveal.steps)if(s.id==='run')assert.equal(s.status,'claim');
});

test('validator rejects bad data',()=>{
  const bad=()=>structuredClone(d);
  let x=bad();x.facts[0].sources=['nope'];assert.throws(()=>M.validate(x,studio.sources),/unknown source/);
  x=bad();x.sources[0].url='http://insecure.test';assert.throws(()=>M.validate(x,studio.sources));
  x=bad();x.sources[0].checked='2099-01-01';assert.throws(()=>M.validate(x,studio.sources));
  x=bad();x.facts[0].status='confirmed';assert.throws(()=>M.validate(x,studio.sources),/status/);
  x=bad();x.facts[0].sources=[];assert.throws(()=>M.validate(x,studio.sources),/needs a source/);
  x=bad();x.facts[3].sources=['tesla'];assert.throws(()=>M.validate(x,studio.sources),/Reported but cites no reporting/);
  x=bad();x.facts[2].strip=false;assert.throws(()=>M.validate(x,studio.sources),/exactly four/);
  x=bad();x.changes.reverse();assert.throws(()=>M.validate(x,studio.sources),/changes/);
  x=bad();x.faq=x.faq.slice(0,3);assert.throws(()=>M.validate(x,studio.sources),/too few/);
});

test('preview is reproducible, hidden from search, and well formed',()=>{
  const before=page();
  execFileSync(process.execPath,['scripts/build-roadster-experience.mjs']);
  assert.equal(page(),before,'rebuilding changes nothing');
  assert.ok(!before.includes('${')&&!before.includes('@@'));
  assert.ok(before.includes('<meta name="robots" content="noindex, nofollow" />'),'the preview is not indexed');
  assert.equal((before.match(/<h1[ >]/g)||[]).length,1);
  const ids=[...before.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]),dupes=ids.filter((v,i)=>ids.indexOf(v)!==i);
  assert.deepEqual(dupes,[],'no duplicate ids');
  const ld=JSON.parse(before.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.deepEqual(ld['@graph'].map(g=>g['@type']),['WebPage','BreadcrumbList']);
  assert.ok(before.includes('rel="canonical" href="https://superchargeddaily.com/roadster-preview.html"'));
  for(const m of before.matchAll(/class="rx-cite" href="([^"]+)"/g))assert.ok(m[1].startsWith('https://'),m[1]);
});

test('every chapter in the rail exists on the page, and the existing anchors are kept',()=>{
  const html=page();
  for(const c of d.chapters){
    assert.ok(html.includes(`data-rx-rail="${c.id}"`),c.id+' in the rail');
    assert.ok(c.id==='top'||html.includes(`id="${c.id}"`),c.id+' section');
    assert.ok(html.includes(`data-rx-chapter="${c.id}"`),c.id+' chapter marker');
  }
  assert.ok(html.includes('id="top"'),'#top anchor');
  // These are linked from the menu, the search index and outside pages; PR 3 adds the rest and the swap test checks all of them.
  for(const id of ['top','video','money'])assert.ok(html.includes(`id="${id}"`),id);
});

test('the live page and the shared indexes are untouched by the preview',()=>{
  const live=fs.readFileSync('roadster.html','utf8');
  assert.ok(live.includes('<!--rs:studio-->'),'roadster.html is still built by build-roadster-studio.mjs');
  assert.ok(!JSON.parse(fs.readFileSync('data/pages.json','utf8')).pages.some(p=>/roadster-preview/.test(p.url)),'not in the search index');
  assert.ok(!fs.readFileSync('sitemap.xml','utf8').includes('roadster-preview'),'not in the sitemap');
  assert.ok(!fs.readFileSync('scripts/nav.json','utf8').includes('roadster-preview'),'not in the menu');
});

test('images, bundle and styles the preview references exist',()=>{
  const html=page();
  for(const m of html.matchAll(/(?:src|href)="(\/[^"\s?]+\.(?:webp|avif|jpg|mp4|webm|vtt|css|js))(?:\?[^"]*)?"/g))assert.ok(fs.existsSync(m[1].slice(1)),m[1]);
  for(const m of html.matchAll(/(\/assets\/roadster(?:-studio)?\/[\w-]+\.(?:webp|avif))/g))assert.ok(fs.existsSync(m[1].slice(1)),m[1]);
  const js=fs.readFileSync('roadster-experience.js','utf8');
  assert.ok(js.includes('prefers-reduced-motion')&&js.includes('saveData'),'reduced motion and Save-Data are honoured');
  assert.ok(html.includes('id="rx-motion"'),'a visible control pauses motion (WCAG 2.2.2)');
  assert.ok(html.indexOf('id="rx-motion"')<html.indexOf('class="rx-hero"'),'the pause control comes first in the tab order');
  const css=fs.readFileSync('roadster-experience.css','utf8');
  assert.ok(/html\[data-theme="light"\] \.rx-read :focus-visible\{outline-color:var\(--rx-read-accent\)\}/.test(css),'focus ring keeps contrast on the light reading sections');
  assert.ok(css.includes('.rx[data-motion=off] .rx-scroll span{animation:none}'),'the pause button stops the scroll cue too');
  assert.ok(!/<noscript>[^]*<style/.test(html),'no style element inside a body noscript');
  const ledger=html.match(/class="rx-ledger">[^]*?<\/ul>/)[0];
  assert.ok(!ledger.includes('tesla.com/roadster')&&!ledger.includes('tesla.com/en_US/roadster'),'the ledger lists only sources the page cites, not Tesla pages we could not open');
});
