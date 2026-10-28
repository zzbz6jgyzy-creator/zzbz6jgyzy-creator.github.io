// Pins dated slices of bot- and owner-updated data into data/fsd-tracker.json, so fsd-tracker.html is built from one reviewed file
// and does not change when other trackers' data changes. Run it when you refresh the page, then rebuild:
//   node scripts/refresh-fsd-pins.mjs && node scripts/build-fsd-tracker.mjs
// Pins: (1) software: for each build, the running total of cars Teslascope has seen on it (last snapshot of each UTC day);
// (2) atlas: each tracked market's status from the global tracker; (3) europe: recognitions, Tesla listings and Eurostat population.
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),G=require('../fsd-global-model.js');
const path='data/fsd-tracker.json',d=JSON.parse(fs.readFileSync(path,'utf8'));

// ---- software ----
const hist=JSON.parse(fs.readFileSync('data/updates-history.json','utf8')).snapshots;
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('updates-data.js','utf8'),ctx);
const rel=ctx.window.TESLA_UPDATES.versions;
const byDay=new Map();hist.forEach(h=>byDay.set(h.t.slice(0,10),h));
const days=[...byDay.keys()].sort(),last=hist.at(-1);
const top=Object.entries(last.v).sort((a,b)=>b[1][0]-a[1][0]).slice(0,d.software.top).map(x=>x[0]);
const short=f=>{const p=(f||'').split(' · ');if(p.length>1&&!/\(/.test(p.at(-1)))p.pop();return p.join(' · ');};
d.software.asOf=last.t;d.software.latestCount=last.fleet;d.software.days=days;
d.software.builds=top.map(id=>({id,fsd:short(rel.find(r=>r.id===id)?.fsd),counts:days.map(day=>byDay.get(day).v[id]?.[0]||0)}));
d.software.releases=rel.filter(r=>r.kind==='fsd').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,d.software.timeline).map(r=>({id:r.id,date:r.date,status:r.status,fsd:r.fsd||'',countries:r.countries||[]}));

// ---- atlas and europe ----
const euRaw=JSON.parse(fs.readFileSync('data/fsd-europe.json','utf8')),raw=JSON.parse(fs.readFileSync('data/fsd-global.json','utf8'));
const g=G.compose(raw,euRaw),srcById=Object.fromEntries(euRaw.sources.map(s=>[s.id,s]));
const tm=raw.sources.find(s=>s.id==='tesla-world');
d.atlas={asOf:g.reviewed,source:'tesla-markets',countries:g.countries.map(c=>({code:c.code,name:c.name,region:c.region,lon:c.lon,lat:c.lat,status:c.availability.status}))};
const eu=euRaw.countries.filter(c=>c.jurisdiction==='EU'),eurostat=process.env.FSD_PINS_OFFLINE?{pop:Object.fromEntries(d.europe.states.map(s=>[s.code,s.population])),total:d.europe.populationTotal,updated:d.sourcesPinned.eurostatUpdated}:(()=>{
  const j=JSON.parse(execFileSync('curl',['-sS','-m','60','https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan?format=JSON&lang=en&unit=NR&sex=T&age=TOTAL&time=2025'],{maxBuffer:1<<26}).toString());
  const idx=j.dimension.geo.category.index,vals=j.value,code=c=>c==='GR'?'EL':c;
  return {pop:Object.fromEntries(eu.map(c=>[c.code,vals[String(idx[code(c.code)])]])),total:vals[String(idx.EU27_2020)],updated:j.updated.slice(0,10)};
})();
const recog=euRaw.events.filter(e=>e.type==='recognition').sort((a,b)=>a.date.localeCompare(b.date));
d.europe={asOf:euRaw.updated,popSource:'eurostat',popAsOf:'2025-01-01',populationTotal:eurostat.total,
 thresholds:{states:euRaw.thresholds.statesNeeded,populationPct:euRaw.thresholds.populationNeeded,source:'fsd-eu'},
 states:eu.map(c=>({code:c.code,name:c.name,recognised:['recorded','reported'].includes(c.permission.status),permission:c.permission.status,listed:c.availability.status==='listed',observed:c.observations.status==='reported',population:eurostat.pop[c.code]})),
 recognitions:recog.map(e=>({date:e.date,code:e.country,name:eu.find(c=>c.code===e.country).name,kind:e.sourceType,links:e.evidence.map(id=>srcById[id]?.url).filter(Boolean).slice(0,2)}))};
// Keep the cited source dates in step with what was pinned, then validate before writing anything.
const sref=id=>d.sources.find(x=>x.id===id);
sref('eurostat').date=eurostat.updated;sref('eurostat').checked=new Date().toISOString().slice(0,10);
sref('tesla-markets').checked=tm.checked;sref('tesla-markets').date=tm.checked;
if(d.europe.states.some(s=>!Number.isInteger(s.population)))throw Error('Eurostat is missing a country; nothing was written');
d.sourcesPinned={eurostatUpdated:eurostat.updated,teslaMarketsChecked:tm.checked};
require('../fsd-tracker-model.js').validate(d);
fs.writeFileSync(path,JSON.stringify(d,null,2)+'\n');
console.log('pinned',days.length,'days,',top.length,'builds,',d.atlas.countries.length,'markets,',d.europe.states.length,'EU states,',recog.length,'recognitions; Eurostat',eurostat.updated);
