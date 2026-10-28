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

test('safety claims: figures add up, are labelled Reported, and promises come from the ledger',()=>{
  assert.equal(M.validate(d),d);
  const ledger=JSON.parse(fs.readFileSync('data/promises.json','utf8')).promises.filter(p=>p.topic===d.promises.topic);
  const fsdRow=d.claims.us.rows.find(r=>r.id==='fsd'),us=d.claims.us.rows.find(r=>r.id==='us');
  assert.equal(fsdRow.miles,5300676);assert.equal(us.miles,660164);
  assert.equal(Math.round(fsdRow.miles/us.miles*10)/10,8);
  for(const c of d.claims.caveats)for(const s of c.sources)assert.ok(src[s],c.text);
  for(const id of [d.claims.us.source,d.claims.eu.source,d.claims.eu.also,d.claims.eu.critic])assert.equal(src[id].kind,'reporting');
  let x=structuredClone(d);x.claims.us.rows[0].miles=9e6;assert.throws(()=>M.validate(x),/add up/);
  x=structuredClone(d);x.claims.eu.multiple=9;assert.throws(()=>M.validate(x),/EU multiple/);
  x=structuredClone(d);x.claims.us.rows=x.claims.us.rows.filter(r=>r.id!=='us');assert.throws(()=>M.validate(x));
  const page=fs.readFileSync('fsd-tracker.html','utf8');
  const safety=page.slice(page.indexOf('id="safety"'),page.indexOf('id="promises"'));
  assert.ok(!safety.includes('ft-chip-disclosed'),'nothing in the safety section is Disclosed');
  assert.ok(safety.includes('As of 19 Feb 2026')&&safety.includes('By 19 February Tesla had reported'),'US figures carry their date');
  assert.equal((page.match(/class="ft-promise /g)||[]).length,ledger.length,'every ledger entry for the topic is shown');
  assert.ok(page.includes('id="safety"')&&page.includes('id="promises"'));
});

test('RSS feed, share image, refresh table, country picker and newsletter band are wired',()=>{
  const page=fs.readFileSync('fsd-tracker.html','utf8'),feed=fs.readFileSync('fsd-tracker-feed.xml','utf8');
  assert.equal((feed.match(/<item>/g)||[]).length,d.changes.length);
  assert.equal(new Set(feed.match(/<guid[^>]*>[^<]*<\/guid>/g)).size,d.changes.length,'guids are unique');
  assert.ok(feed.includes('<atom:link href="https://superchargeddaily.com/fsd-tracker-feed.xml"'));
  assert.ok(page.includes('rel="alternate" type="application/rss+xml"'));
  assert.ok(page.includes('https://superchargeddaily.com/assets/og-fsd-tracker.jpg')&&fs.existsSync('assets/og-fsd-tracker.jpg'));
  const next=page.slice(page.indexOf('id="next"'),page.indexOf('id="labels"'));
  assert.equal((next.match(/<tr><th scope="row">/g)||[]).length,d.refresh.length);
  assert.ok(page.includes('id="ft-pick"')&&(page.match(/<option value="[A-Z]{2}"/g)||[]).length===d.atlas.countries.length);
  assert.equal((page.match(/<!--nl:start-->/g)||[]).length,1,'the newsletter band survives a rebuild');
  const x=structuredClone(d);x.refresh[0].kind='sometime';assert.throws(()=>M.validate(x),/refresh/);
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

test('markets figure is the pinned atlas count, so it matches the map and the region bars',()=>{
  const listed=d.atlas.countries.filter(c=>c.status==='listed').length;
  const page=fs.readFileSync('fsd-tracker.html','utf8');
  assert.ok(page.includes(`<p class="ft-kpi-value">${listed}<small>`));
  assert.equal((page.match(/class="ft-m-listed"><title>/g)||[]).length,listed,'one listed path per listed market');
  const src=fs.readFileSync('scripts/build-fsd-tracker.mjs','utf8');
  assert.ok(!src.includes("data/fsd-global")&&!src.includes("data/fsd-europe"),'build reads only the pinned file');
});

test('charts are plain SVG with titles and a table fallback',()=>{
  const page=fs.readFileSync('fsd-tracker.html','utf8');
  assert.ok(page.includes('<title id="ft-a-t">'));assert.ok(page.includes('<details class="ft-table-view">'));
  assert.equal((page.match(/class="ft-bar/g)||[]).length,d.adoption.points.length);
  assert.ok(!/<script[^>]*src="[^"]*\/(chart(\.min)?\.js|d3(\.min)?\.js|d3-|plotly|echarts)/i.test(page),'no chart library');
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
  const sec=page.slice(page.indexOf('id="adoption"'),page.indexOf('id="miles"'));
  assert.equal((sec.match(/<li( class="ft-hot")?><span class="ft-hb-q">/g)||[]).length,d.adoption.points.length);
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
  assert.ok(fs.existsSync('scripts/refresh-fsd-pins.mjs'));
});

test('the refresh script pins software data deterministically',()=>{
  const before=fs.readFileSync('data/fsd-tracker.json','utf8');
  try{execFileSync(process.execPath,['scripts/refresh-fsd-pins.mjs'],{env:{...process.env,FSD_PINS_OFFLINE:'1'}});
    const a=JSON.parse(fs.readFileSync('data/fsd-tracker.json','utf8')),was=JSON.parse(before);
    // The software, atlas and Europe slices follow other files that change on main, so they may legitimately differ.
    // What an offline run must never touch, whatever today's date: the review date, the hand-measured numbers and Eurostat's dates.
    for(const k of ['reviewed','kpis','adoption','miles'])assert.deepEqual(a[k],was[k],k+' is unchanged by an offline run');
    assert.deepEqual(a.sources.find(s=>s.id==='eurostat'),was.sources.find(s=>s.id==='eurostat'),'no new opened date for Eurostat offline');
    assert.equal(M.validate(a),a);assert.equal(a.software.builds.length,a.software.top);
  }finally{fs.writeFileSync('data/fsd-tracker.json',before);}
});

test('Europe: tiles, meters and the step chart are consistent with the pinned records and Eurostat arithmetic',()=>{
  const eu=d.europe,page=fs.readFileSync('fsd-tracker.html','utf8');
  const rec=eu.states.filter(s=>s.recognised),pop=rec.reduce((a,s)=>a+s.population,0)/eu.populationTotal*100;
  assert.equal(eu.states.length,27);assert.equal(rec.length,eu.recognitions.length);
  assert.equal(eu.states.reduce((a,s)=>a+s.population,0),eu.populationTotal,'27 states add up to the Eurostat EU total');
  assert.ok(page.includes(`<b>${pop.toFixed(1)}%</b> of EU population`));
  assert.ok(page.includes(`<b>${rec.length}</b> of 27 states recognised`));
  assert.equal((page.match(/<li class="ft-t-(both|rec|list|none)"/g)||[]).length,27);
  const recList=page.slice(page.indexOf('<ol class="ft-rec">'));assert.equal((recList.slice(0,recList.indexOf('</ol>')).match(/<li><time datetime="2026-/g)||[]).length,eu.recognitions.length);
  assert.ok(page.includes('it is not a vote of the EU\'s technical committee'));
  assert.ok(page.includes('we do not forecast it'));
  const th=eu.thresholds;assert.ok(d.sources.find(s=>s.id===th.source).kind==='reporting','thresholds are labelled Reported, not Disclosed');
  const bad=structuredClone(d);bad.europe.recognitions.pop();assert.throws(()=>M.validate(bad));
  const bad2=structuredClone(d);bad2.europe.populationTotal=1e9;assert.throws(()=>M.validate(bad2));
  const bad3=structuredClone(d);bad3.atlas.countries[0].status='maybe';assert.throws(()=>M.validate(bad3));
});

test('map is a build-time SVG that shares its geometry, and the page stays light',()=>{
  const page=fs.readFileSync('fsd-tracker.html','utf8');
  assert.equal((page.match(/<g id="ft-geo">/g)||[]).length,1,'geometry defined once');
  assert.equal((page.match(/<use href="#ft-geo"\/>/g)||[]).length,2);
  assert.ok(Buffer.byteLength(page)<260*1024,'page HTML under 260 KB');
  assert.ok(!/<script[^>]*src="[^"]*\/(leaflet|mapbox|d3(\.min)?\.js|d3-|topojson)/i.test(page),'no map library (bundle hashes may contain any letters)');
});
