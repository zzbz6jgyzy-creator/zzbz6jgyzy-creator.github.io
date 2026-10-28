// Pins a dated slice of the bot-updated software history into data/fsd-tracker.json, so fsd-tracker.html is built from one
// reviewed file and does not change every hour. Run it when you refresh the page, then rebuild:
//   node scripts/refresh-fsd-software.mjs && node scripts/build-fsd-tracker.mjs
// What the numbers are: for each build, the running total of cars Teslascope has seen on it (last snapshot of each UTC day).
import fs from 'node:fs';
import vm from 'node:vm';
const path='data/fsd-tracker.json',d=JSON.parse(fs.readFileSync(path,'utf8'));
const hist=JSON.parse(fs.readFileSync('data/updates-history.json','utf8')).snapshots;
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('updates-data.js','utf8'),ctx);
const rel=ctx.window.TESLA_UPDATES.versions;
const byDay=new Map();hist.forEach(h=>byDay.set(h.t.slice(0,10),h));
const days=[...byDay.keys()].sort(),last=hist.at(-1);
const top=Object.entries(last.v).sort((a,b)=>b[1][0]-a[1][0]).slice(0,d.software.top).map(x=>x[0]);
const short=f=>{const p=(f||'').split(' · ');if(p.length>1&&!/\(/.test(p.at(-1)))p.pop();return p.join(' · ');};
d.software.asOf=last.t;
d.software.latestCount=last.fleet;
d.software.days=days;
d.software.builds=top.map(id=>({id,fsd:short(rel.find(r=>r.id===id)?.fsd),counts:days.map(day=>byDay.get(day).v[id]?.[0]||0)}));
d.software.releases=rel.filter(r=>r.kind==='fsd').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,d.software.timeline).map(r=>({id:r.id,date:r.date,status:r.status,fsd:r.fsd||'',countries:r.countries||[]}));
fs.writeFileSync(path,JSON.stringify(d,null,2)+'\n');
console.log('pinned',days.length,'days,',top.length,'builds, as of',last.t);
