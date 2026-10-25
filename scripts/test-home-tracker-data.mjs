import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync,writeFileSync,mkdtempSync,mkdirSync,cpSync,rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join,dirname } from 'node:path';
const require=createRequire(import.meta.url), {cybercab}=require('../home-tracker-data.js');
const fallback={value:'349',label:'Previously verified registry count'};
const snapshot={checked:'2026-10-22T06:00:23Z',source:{url:'https://fsddb.com/robotaxi?operator=tesla-robotaxi-llc'},history:[{date:'2026-10-22',cybercab:351},{date:'2026-10-20',cybercab:349}]};
const card=cybercab(snapshot,fallback);
assert.equal(card.value,'351');assert.equal(card.asOf,'2026-10-22');assert.match(card.label,/as of 22 Oct 2026/);assert.match(card.label,/22 Oct 2026, 07:00 Irish time/);assert.match(card.label,/not cars in service/);
assert.equal(cybercab({...snapshot,history:[{date:'2026-10-22',cybercab:0}]},fallback).value,'0');
assert.equal(cybercab({...snapshot,history:[{date:'2026-10-22',cybercab:1234}]},fallback).value,'1,234');
for(const bad of [null,{}, {...snapshot,checked:'invalid'}, {...snapshot,source:{url:'http://unverified.example'}}, {...snapshot,history:[]}, ...[-1,1.5,null,'351'].map(cybercab=>({...snapshot,history:[{date:'2026-10-22',cybercab}]})),{...snapshot,history:[{date:'2026-02-30',cybercab:400}]},{...snapshot,history:[{date:'2026-10-23',cybercab:400}]}]) assert.deepEqual(cybercab(bad,fallback),fallback);
assert.equal(cybercab(null),null);
console.log('PASS snapshot validation, sorting, zero counts, dates, source and last-good fallback');
const temp=mkdtempSync(join(tmpdir(),'sd-home-trackers-'));
try{
 const files=['index.html','dispatch.html','home-pair.js','home-tracker-data.js','starship-data.js','fsd-europe-data.js','cybercab-data.js','updates-live.json','data/articles.json','scripts/build-home.js','scripts/live-home-pick.js'];
 for(const f of files){mkdirSync(dirname(join(temp,f)),{recursive:true});cpSync(f,join(temp,f));}
 mkdirSync(join(temp,'data'),{recursive:true});
 const fixture={...snapshot,history:[{date:'2026-10-22',cybercab:1234}]};writeFileSync(join(temp,'data/robotaxi-tx.json'),JSON.stringify(fixture));
 const before=readFileSync(join(temp,'index.html'),'utf8');
 execFileSync(process.execPath,[join(temp,'scripts/build-home.js'),'--trackers-only']);
 const after=readFileSync(join(temp,'index.html'),'utf8'),rx=/<!--hv:trk-->[\s\S]*?<!--\/hv:trk-->/;
 assert.equal(before.replace(rx,''),after.replace(rx,''));assert.match(after,/<span class="hv-t-k">Cybercab<\/span><strong>1,234<\/strong>/);
 writeFileSync(join(temp,'data/robotaxi-tx.json'),'<html>upstream unavailable</html>');
 execFileSync(process.execPath,[join(temp,'scripts/build-home.js'),'--trackers-only']);
 assert.equal(readFileSync(join(temp,'index.html'),'utf8'),after);
 assert.match(after,/Get the free briefing/);
 console.log('PASS tracker-only rebuild preserves every other homepage region and keeps the last good count on bad JSON');
}finally{rmSync(temp,{recursive:true,force:true});}
