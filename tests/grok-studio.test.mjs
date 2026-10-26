import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildGrokStudio } from '../scripts/build-grok-studio.mjs';
const require = createRequire(import.meta.url);
const M = require('../grok-studio-model.js');
const V = require('../grok-studio-view.js');
const root = new URL('..', import.meta.url).pathname;
const raw = JSON.parse(fs.readFileSync(path.join(root,'data/grok-studio.json'),'utf8'));
const d = M.validate(raw);
const articles = JSON.parse(fs.readFileSync(path.join(root,'data/articles.json'),'utf8'));
const clone = x => structuredClone(x);

test('the guide has six distinct surfaces, twelve actionable lessons and a dated official source trail', () => {
  assert.equal(d.products.length, 6);
  assert.equal(d.lessons.length, 12);
  assert.equal(d.sources.length, 18);
  assert.equal(d.checked, '2026-10-26');
  for (const level of d.levels) assert.equal(d.lessons.filter(l=>l.level===level.id).length, 3);
  for (const l of d.lessons) {
    assert.ok(l.intro.length > 100);
    assert.equal(l.steps.length, 3);
    assert.ok(l.check && l.prompt && l.sources.length);
  }
});
test('invalid references, duplicate IDs and unsafe source URLs fail before interactive enhancement', () => {
  for (const mutate of [
    x=>x.products[0].source='missing',
    x=>x.lessons[0].level='made-up',
    x=>x.products[0].lesson='unknown',
    x=>x.models[0].input=Infinity,
    x=>x.plans[0].bot='yes',
    x=>x.sources[0].url='javascript:alert(1)',
    x=>x.sources[0].url='https://evil.example/test',
    x=>x.sources[0].url='https://user:password@docs.x.ai/test',
    x=>x.lessons.push(x.lessons[0]),
    x=>x.releases[0].date='2027-01-01',
    x=>x.media[0].src='/../secret.mp4'
  ]) { const x=clone(raw);mutate(x);assert.throws(()=>M.validate(x)); }
});
test('validation and rendering preserve the reviewed catalogue without mutating it', () => {
  const x=clone(raw), before=JSON.stringify(x);
  M.validate(x);V.build(x,articles);
  assert.equal(JSON.stringify(x),before);
});
test('model comparisons keep context, modality and separate prices instead of inventing scores', () => {
  const flagship=d.models.find(m=>m.id==='grok-4.7'), long=d.models.find(m=>m.id==='grok-4.3');
  assert.equal(flagship.context,500000);assert.equal(long.context,1000000);
  assert.equal(flagship.input,2);assert.equal(flagship.output,6);
  assert.equal(long.input,1.25);assert.equal(long.output,2.5);
  const view=V.model(flagship,d);
  assert.match(view,/500,000 tokens/);
  assert.match(view,/short-context/);
  assert.doesNotMatch(view,/accuracy score|benchmark score|100% accurate/i);
});
test('the cost planner applies the long-context tier to all tokens exactly at the documented prompt threshold', () => {
  const estimate=input=>M.estimate(d,{model:'grok-4.7',region:'global',input,output:1000,requests:1});
  const short=estimate(199999),long=estimate(200000);
  assert.equal(short.long,false);assert.equal(long.long,true);
  assert.equal(short.inputRate,2);assert.equal(long.inputRate,4);
  assert.equal(short.outputRate,6);assert.equal(long.outputRate,12);
  assert.ok(Math.abs(long.total-.812)<1e-12);
});
test('costs include the selected endpoint factor and scale with request count', () => {
  const base={model:'grok-4.7',input:5000,output:1000,requests:1000};
  const global=M.estimate(d,{...base,region:'global'}),us=M.estimate(d,{...base,region:'us'});
  assert.equal(global.total,16);
  assert.ok(Math.abs(us.total-17.6)<1e-10);
  assert.equal(global.perRequest,.016);
});
test('invalid, blank, fractional and over-context requests never return a misleading estimate', () => {
  const base={model:'grok-4.7',region:'global',input:5000,output:1000,requests:1000};
  for (const patch of [
    {input:''},{output:NaN},{input:-1},{requests:0},{requests:1000001},
    {input:500000},{input:4.5},{model:'unknown'},{region:'other'}
  ]) assert.ok(M.estimate(d,{...base,...patch}).error);
  assert.equal(M.estimate(d,{...base,input:0,output:0}).total,0);
});
test('the rate table preserves long-context boundaries and cached/batch/tool exclusions', () => {
  const html=V.rates(d);
  for(const m of d.models)assert.ok(html.includes(m.name));
  assert.match(html,/200,000/);assert.match(html,/Cached input, batch, media, search/);
  assert.match(V.estimateResult(M.estimate(d,{model:'grok-4.7',region:'global',input:1,output:1,requests:1})),/not a quote/);
});
test('new individual subscription totals and Bot eligibility stay separate from API billing', () => {
  assert.equal(d.plans.find(p=>p.id==='plus').bot,false);
  assert.equal(d.plans.find(p=>p.id==='premium').bot,true);
  for(const [id,monthly,annual]of [['plus',8,80],['premium',30,300],['super',100,1000],['ultra',200,2000]]) {
    const p=d.plans.find(p=>p.id===id);
    assert.equal(p.monthly,monthly);assert.equal(p.annual,annual);
    assert.match(V.plan(p,'annual'),new RegExp('\\$'+annual.toLocaleString('en-US')+'</b>'));
    assert.match(V.plan(p,'annual'),/\/ year/);
  }
  assert.match(V.build(d,articles),/Consumer plans do not include developer API token billing/);
});
test('preferences contain known IDs only and never custom prompts, API keys or arbitrary fields', () => {
  const p=M.preferences({completed:['source-check','source-check','bad'],saved:['weekly-digest','bad','weekly-digest'],
    product:'bot',level:'advanced',lesson:'reliable-routine',secret:'private',goal:'custom words'},d);
  assert.deepEqual(Object.keys(p),['completed','saved','product','level','lesson']);
  assert.deepEqual(p.completed,['source-check']);assert.deepEqual(p.saved,['weekly-digest']);
  assert.equal(p.product,'bot');assert.equal(p.level,'advanced');
  assert.equal(JSON.stringify(p).includes('custom words'),false);
  assert.equal(M.preferences(null,d).product,'research');
  assert.equal(M.preferences({product:'<script>',level:'bad'},d).level,'all');
});
test('progress counts unique reviewed lessons and identifies an incomplete next step', () => {
  let p=M.progress({completed:['pick-a-product','pick-a-product','unknown']},d);
  assert.equal(p.done,1);assert.equal(p.total,12);assert.equal(p.next,'better-brief');
  p=M.progress({completed:d.lessons.map(l=>l.id)},d);
  assert.equal(p.percent,100);assert.equal(p.next,d.lessons[0].id);
});
test('the prompt studio uses the reader’s bounded inputs and has useful empty-field scaffolding', () => {
  const t=d.templates[0],out=M.prompt(t,{goal:'Compare two sources',context:'Source A and source B',constraints:'Show dates',format:'A table'});
  assert.match(out,/Outcome: Compare two sources/);
  assert.match(out,/Return: A table/);
  assert.match(M.prompt(t,{goal:'',context:''}),/\[Describe the result/);
  assert.ok(M.prompt(t,{context:'a'.repeat(10000)}).length<4000);
});
test('share links encode only a public lesson or starter template', () => {
  assert.equal(M.share('source-check',d),'https://superchargeddaily.com/grok.html#lesson-source-check');
  assert.equal(M.share('weekly-digest',d),'https://superchargeddaily.com/grok.html#prompt-weekly-digest');
  assert.equal(M.share('private custom prompt',d),'https://superchargeddaily.com/grok.html#tutorial');
});
test('story selection uses dated local xAI articles, deduplicates and rejects unsafe paths', () => {
  const rows=M.stories({articles:[
    {url:'/dispatch/a.html',topic:'xai',title:'A',date:'2026-10-22',image:'javascript:alert(1)'},
    {url:'/dispatch/a.html',topic:'xai',title:'duplicate',date:'2026-10-21'},
    {url:'https://evil.example/a.html',topic:'xai',title:'bad',date:'2026-10-23'},
    {url:'/dispatch/b.html',topic:'tesla',title:'Tesla',date:'2026-10-24'},
    {url:'/dispatch/c.html',topic:'xai',title:'C',date:'2026-10-25'}
  ]});
  assert.deepEqual(rows.map(r=>r.title),['C','A']);
  assert.equal(rows[1].image,'/assets/og-v2.jpg');
});
test('renderers escape hostile editorial text and do not create executable HTML', () => {
  const l={...d.lessons[0],title:'<script>alert(1)</script>',prompt:'</p><img src=x onerror=alert(1)>'};
  const html=V.lesson(l,d,0);
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<img src=x/);
  assert.equal(M.safeURL('http://docs.x.ai/test'),'');
  assert.equal(M.internal('//evil.example/path'),'');
});
test('complete saved HTML contains every lesson, prompt and legacy destination without duplicate IDs', () => {
  const html=V.build(d,articles);
  for(const l of d.lessons)assert.ok(html.includes('id="lesson-'+l.id+'"'));
  for(const t of d.templates)assert.ok(html.includes('id="prompt-'+t.id+'"'));
  for(const id of ['what','uses','marketplace','latest','stories','tutorial','introduction','beginner','intermediate','advanced','grok-bot-x-monitor','grok-bot-claude'])assert.ok(html.includes('id="'+id+'"'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  assert.equal([...html.matchAll(/<h1>/g)].length,1);
  assert.match(html,/preload="none"/);assert.doesNotMatch(html,/\sautoplay[ >]/);
});
test('the embedded JSON round-trips less-than characters without opening a script element', () => {
  const x=clone(d);x.lessons[0].prompt='</script><script>alert("test")</script>';
  const html=V.build(x,articles),payload=html.match(/<script type="application\/json" id="gx-data">([\s\S]*?)<\/script>/)[1];
  assert.ok(!payload.includes('</script>'));
  assert.equal(JSON.parse(payload).lessons[0].prompt,x.lessons[0].prompt);
});
test('the builder is deterministic, updates SEO and keeps unrelated search records and the site shell intact', () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'grok-model-'));
  try {
    fs.mkdirSync(path.join(tmp,'data'));
    for(const p of ['grok.html','data/grok-studio.json','data/articles.json','data/pages.json'])fs.copyFileSync(path.join(root,p),path.join(tmp,p));
    const original=fs.readFileSync(path.join(tmp,'grok.html'),'utf8');
    const before=JSON.parse(fs.readFileSync(path.join(tmp,'data/pages.json'),'utf8'));
    buildGrokStudio(tmp);
    const first=fs.readFileSync(path.join(tmp,'grok.html'),'utf8'),pages1=fs.readFileSync(path.join(tmp,'data/pages.json'),'utf8');
    buildGrokStudio(tmp);
    assert.equal(fs.readFileSync(path.join(tmp,'grok.html'),'utf8'),first);
    assert.equal(fs.readFileSync(path.join(tmp,'data/pages.json'),'utf8'),pages1);
    const other=x=>x.pages.filter(p=>!p.url.startsWith('/grok.html'));
    assert.deepEqual(other(JSON.parse(pages1)),other(before));
    assert.equal(first.slice(first.indexOf('</main>')+7),original.slice(original.indexOf('</main>')+7));
    assert.match(first,/<title>Grok &amp; xAI/);
    assert.match(first,/name="twitter:description"/);
    const schema=JSON.parse(first.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.hasPart.length,12);assert.equal(schema.dateModified,d.checked);
    assert.equal(schema['@type'],'CollectionPage');
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
