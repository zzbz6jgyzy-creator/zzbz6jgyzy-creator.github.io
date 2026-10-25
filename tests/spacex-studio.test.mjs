import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {buildSpaceXStudio} from '../scripts/build-spacex-studio.mjs';
const require=createRequire(import.meta.url), M=require('../spacex-studio-model.js'), V=require('../spacex-studio-view.js');
const read=p=>fs.readFileSync(p,'utf8');
const embedded=()=>JSON.parse(read('spacex.html').match(/id="sx-data">([\s\S]*?)<\/script>/)[1]);
const data=embedded(), now=Date.parse('2026-10-25T12:00:00Z');
test('editorial data has five distinct sourced programmes and safe destinations',()=>{assert.equal(M.validate(data),data);assert.equal(new Set(data.programs.map(p=>p.id)).size,5);assert.ok(data.programs.every(p=>p.paragraphs.length===3));assert.equal(data.steps.length,5);assert.equal(data.milestones.length,6);});
test('calendar source precision survives without fabricated month/year timestamps',()=>{
 const month={precision:'month',date:'2026-11-30'}, year={precision:'year',date:'2026-12-31'};
 assert.equal(new Date(M.bounds(month).start).toISOString(),'2026-11-01T00:00:00.000Z');
 assert.equal(new Date(M.bounds(month).end).toISOString(),'2026-12-01T00:00:00.000Z');
 assert.equal(M.date(month),'Nov 2026');assert.equal(M.date(year),'2026 target');
 assert.equal(M.date({precision:'unknown',date:''}),'Date pending');
 assert.match(M.countdown({...month,start:'2026-11-30T00:00:00Z'},now),/time not confirmed/);
});
test('day targets do not move to the previous date when changing timezone',()=>{
 const day={precision:'day',date:'2026-11-08'};
 assert.equal(M.date(day,'UTC'),M.date(day,'America/Los_Angeles'));
 assert.equal(M.date(day,'UTC'),'8 Nov 2026');
 const timed={precision:'datetime',start:'2026-11-08T02:00:00Z'};
 assert.notEqual(M.date(timed,'UTC'),M.date(timed,'America/Los_Angeles'));
});
test('an elapsed launch window is not inferred to be a successful flight',()=>{
 const event={id:'a',title:'Falcon 9',status:'Go',precision:'datetime',start:'2026-10-25T11:00:00Z',windowEnd:'2026-10-25T13:00:00Z'};
 assert.equal(M.upcoming([event],now).length,1);assert.match(M.countdown(event,now),/check the source/);
 assert.equal(M.upcoming([event],Date.parse('2026-10-25T14:00:00Z')).length,0);
 assert.equal(M.upcoming([{...event,status:'cancelled'}],now).length,0);
 assert.doesNotMatch(V.next({...data,events:[]},now),/live|launched|success/i);
});
test('family and story filters distinguish spacecraft, boosters and constellation reporting',()=>{
 assert.equal(M.family({title:'Falcon Heavy | Payload'}),'heavy');
 assert.equal(M.family({title:'Falcon 9 | Dragon CRS-35'}),'dragon');
 assert.equal(M.family({title:'Super Heavy | Flight 15'}),'starship');
 assert.equal(M.topic({title:'Starlink subscribers',tag:'SpaceX'}),'starlink');
 assert.equal(M.topic({title:'Starship pushes Orion to the Moon',tag:'SpaceX'}),'starship');
});
test('bookmarks are deduplicated and limited to known catalogue identifiers',()=>{
 const id=data.events[0].id;
 const s=M.clean({pins:['starship','starship','missing'],saved:[id,id,'missing']},data);
 assert.deepEqual(s.pins,['starship']);assert.deepEqual(s.saved,[id]);
 assert.doesNotThrow(()=>M.clean({pins:'bad',saved:null},data));
});
test('unsafe editorial and source destinations are rejected and text is escaped',()=>{
 for(const mutate of [x=>x.tools[0].href='//bad.example',x=>x.programs[0].source='missing',x=>x.sources[0].url='javascript:x',x=>x.articles[0].url='https://wrong.example']){
  const d=structuredClone(data);mutate(d);assert.throws(()=>M.validate(d));
 }
 const event={...data.events[0],title:'<img onerror="x">'};
 assert.match(V.launches({...data,events:[{...event,status:'expected',precision:'unknown',date:''}]},now),/&lt;img/);
});
test('saved build is reproducible and retains unrelated search records in order',()=>{
 const before=[read('spacex.html'),read('data/pages.json')];
 const unrelated=JSON.parse(before[1]).pages.filter(p=>!p.url.startsWith('/spacex.html'));
 buildSpaceXStudio();assert.deepEqual([read('spacex.html'),read('data/pages.json')],before);
 assert.deepEqual(JSON.parse(read('data/pages.json')).pages.filter(p=>!p.url.startsWith('/spacex.html')),unrelated);
});
test('saved HTML includes every programme, working anchors, credits and social metadata',()=>{
 const html=read('spacex.html');assert.equal((html.match(/<h1\b/g)||[]).length,1);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const a of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(a[1]),'Missing '+a[1]);
 assert.equal((html.match(/data-sx-program-panel=/g)||[]).length,5);
 assert.equal((html.match(/data-sx-step-panel=/g)||[]).length,5);
 assert.ok((html.match(/<picture\b/g)||[]).length>=7);
 assert.match(html,/kind="descriptions"/);assert.match(html,/muted preload="none"/);
 assert.match(html,/public domain/);assert.match(html,/CC BY 2.0/);assert.match(html,/not telemetry|not.*telemetry/i);
 assert.match(html,/og:image:height" content="1067/);
 const graph=JSON.parse(html.match(/type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(graph['@type'],'CollectionPage');
 assert.match(html,/spacex\.bundle\./);assert.doesNotMatch(html,/<!--hv:event-->/);
});
test('generated launch rows are drawn from the shared calendar, not a second schedule',()=>{
 const calendar=JSON.parse(read('data/calendar-studio.json'));
 assert.equal(data.scheduleAsOf,calendar.launchChecked);
 assert.deepEqual(data.events,calendar.events.filter(e=>e.group==='spacex'&&e.category==='Launch'));
 const month=data.events.find(e=>e.precision==='month');if(month)assert.ok(!M.date(month).includes(':'));
});
