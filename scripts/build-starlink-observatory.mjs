#!/usr/bin/env node
// Saved content and orbital illustration share the same validated source snapshot.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const ctx={};vm.createContext(ctx);
for(const f of ['starlink-model.js','starlink-view.js']) vm.runInContext(read(f),ctx);
const liveCtx={window:{}};vm.runInNewContext(read('starlink-live.js'),liveCtx);
const live=liveCtx.window.STARLINK_LIVE;
const cat=JSON.parse(read('data/starlink.json'));
const sat=createRequire(import.meta.url)(path.join(ROOT,'vendor/satellite.min.js'));
const histories=JSON.parse(read('data/starlink-history.json')).snapshots;
const epochs=[],points=[],altitudes=Array(8).fill(0),inclinations=Array(4).fill(0);
const bins=[[0,350],[350,450],[450,500],[500,550],[550,600],[600,700],[700,1000],[1000,Infinity]];
const records=cat.satellites.map(row=>{try{const rec=sat.twoline2satrec(row[3],row[4]); if(rec.error)return null;epochs.push(new Date((rec.jdsatepoch-2440587.5)*86400000).toISOString());return {row,rec};}catch{return null;}}).filter(Boolean);
epochs.sort();const at=new Date(epochs.at(-1)),gmst=sat.gstime(at);let valid=0;
for(const {row,rec}of records){try{const p=sat.propagate(rec,at).position;if(!p)continue;const g=sat.eciToGeodetic(p,gmst),lon=g.longitude*180/Math.PI,lat=g.latitude*180/Math.PI,h=g.height;
if(![lon,lat,h].every(Number.isFinite)||h<80||h>10000)continue;
valid++; const b=bins.findIndex(([a,b])=>h>=a&&h<b);if(b>=0)altitudes[b]++;
const inc=rec.inclo*180/Math.PI;inclinations[inc<48?0:inc<60?1:inc<85?2:3]++;
if(valid%8===0)points.push([+lon.toFixed(2),+lat.toFixed(2),row[2],Math.round(h)]);
}catch{}}
const other=Object.fromEntries(['launched','inOrbit','working'].map(k=>[k,live.totals[k]-Object.values(live.generations).reduce((n,g)=>n+g[k],0)]));
const land=JSON.parse(read('assets/starlink/land.json')).rings;
const data={schema:1,countsAt:live.updated,source:live.source,totals:live.totals,other,generations:ctx.SDStarlink.GEN.map(([id,name,color,kicker,description])=>({id,name,color,kicker,description,...live.generations[id]})),orbits:{count:cat.count,valid,latest:epochs.at(-1),median:epochs[Math.floor(epochs.length/2)],oldest:epochs[0],catalogAt:cat.updated,positionAt:at.toISOString(),altitudes:bins.map(([min,max],i)=>({min,max:Number.isFinite(max)?max:null,count:altitudes[i]})),inclinations,points,land},history:histories};
ctx.SDStarlink.validate(data);
const out=JSON.stringify(data,null,1)+'\n';fs.writeFileSync(path.join(ROOT,'data/starlink-observatory.json'),out);
const target=path.join(ROOT,'starlink.html');let html=fs.readFileSync(target,'utf8');
// The standalone template is noindex; only its marked content belongs in the tracker.
const sky=read('templates/starlink-sky.html').match(/<!--sl:sky-fragment-->([\s\S]*?)<!--\/sl:sky-fragment-->/);
if(!sky)throw Error('Missing sky finder template markers');
const block=ctx.SDStarlinkView.render(data).replace('<section class="so-section" id="evidence"',sky[1].trim()+'\n<section class="so-section" id="evidence"');
if(!html.includes('<!--sl:observatory-->'))throw Error('Missing observatory build marker');
html=html.replace(/<!--sl:observatory-->[\s\S]*?<!--\/sl:observatory-->/,'<!--sl:observatory-->\n'+block+'\n<!--/sl:observatory-->');
const safe=JSON.stringify(data).replace(/</g,'\\u003c');
html=html.replace(/<script type="application\/json" id="sl-observatory-data">[\s\S]*?<\/script>/,'<script type="application/json" id="sl-observatory-data">'+safe+'</script>');
fs.writeFileSync(target,html);
console.log(`Starlink saved snapshot: ${data.totals.inOrbit} in orbit; ${valid} propagated records; counts ${data.countsAt}`);
