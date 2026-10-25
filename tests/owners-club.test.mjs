import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {buildOwnersClub} from '../scripts/build-owners-club.mjs';

const require=createRequire(import.meta.url);
const M=require('../owners-club-model.js');
const V=require('../owners-club-view.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('tesla-clubs-data.js','utf8'),context);
const raw=JSON.parse(JSON.stringify(context.window.TESLA_CLUBS));
const guide=JSON.parse(fs.readFileSync('data/owners-club-guide.json','utf8'));
const directory=()=>M.normalize(structuredClone(raw),structuredClone(guide));
const ids=rows=>rows.map(c=>c.id);

// These are audit invariants, rather than counts inferred from the renderer.
test('the public audit retains all 174 listings and 42 country/territory labels',()=>{
 const d=directory();
 assert.equal(d.clubs.length,174);
 assert.equal(d.countries.length,42);
 assert.deepEqual(Object.fromEntries(Object.keys(M.TYPES).map(k=>[k,d.clubs.filter(c=>c.section===k).length])),{club:45,chapter:94,community:35});
 assert.equal(d.excluded,51);
 assert.equal(d.updated,'2026-10-16');
 assert.equal(d.clubs.filter(c=>c.scope==='worldwide').length,4);
 assert.equal(d.countries.reduce((n,c)=>n+c.count,0),170);
 assert.ok(d.clubs.some(c=>c.id==='CA-171'));
});

test('normalising does not change audited source records or guide references',()=>{
 const a=structuredClone(raw),g=structuredClone(guide),before=JSON.stringify({a,g});
 M.normalize(a,g);
 assert.equal(JSON.stringify({a,g}),before);
});

test('duplicate identities, unsupported public categories and inconsistent counts fail closed',()=>{
 for(const mutate of [a=>a.clubs[1].id=a.clubs[0].id,a=>a.clubs[0].section='hold',a=>a.counts.club++,a=>a.clubs[0].country='Unlisted country']){
  const a=structuredClone(raw);mutate(a);assert.throws(()=>M.normalize(a,guide));
 }
});

test('country, type, area, channel and bookmark filters intersect rather than broadening matches',()=>{
 const d=directory(),uk=M.filter(d,{country:'United Kingdom'});
 assert.equal(uk.length,17);
 assert.equal(M.filter(d,{country:'United Kingdom',type:'chapter'}).length,15);
 assert.deepEqual(ids(M.filter(d,{country:'United Kingdom',type:'chapter',area:'Oceania'})),[]);
 const social=M.filter(d,{country:'Türkiye',channel:'social'});
 assert.ok(social.length>0);assert.ok(social.every(c=>c.country==='Türkiye'&&c.channelGroup==='social'));
 assert.deepEqual(ids(M.filter(d,{country:'United Kingdom',savedOnly:true},['TOC-0012','TOC-0112'])),['TOC-0012']);
 assert.equal(M.filter(d,{country:'Worldwide'}).length,4);
 assert.equal(M.filter(d,{q:'no-such-owner-group-98765'}).length,0);
});

test('accent-insensitive search and familiar country aliases find the real records',()=>{
 const d=directory();
 assert.deepEqual(ids(M.filter(d,{q:'uk'})),ids(M.filter(d,{country:'United Kingdom'})));
 assert.deepEqual(ids(M.filter(d,{q:'usa'})),ids(M.filter(d,{country:'United States'})));
 assert.deepEqual(ids(M.filter(d,{q:'Turkey'})),ids(M.filter(d,{country:'Türkiye'})));
 assert.deepEqual(ids(M.filter(d,{q:'Czech Republic'})),ids(M.filter(d,{country:'Czechia'})));
 assert.ok(ids(M.filter(d,{q:'Quebec'})).includes('TOC-0112'));
 assert.deepEqual(ids(M.filter(d,{q:'Tesla Québec'})),['TOC-0112']);
});

test('a regional view retains its country-level club without inventing other local matches',()=>{
 const d=directory(),rows=M.filter(d,{country:'United Kingdom',region:'London'});
 assert.deepEqual(ids(rows).sort(),['TOC-0012','TOC-0085']);
 assert.ok(rows.every(c=>c.region==='London'||c.section==='club'&&c.scope==='country'));
 assert.equal(M.filter(d,{country:'United Kingdom',region:'London',type:'chapter'}).length,1);
});

test('parent networks relate the right chapters and exclude independent lookalikes',()=>{
 const d=directory(),parent=d.clubs.find(c=>c.id==='TOC-0012'),london=d.clubs.find(c=>c.id==='TOC-0085');
 const related=M.family(d,parent);
 assert.equal(related.length,15);
 assert.ok(related.every(c=>c.parent==='Tesla Owners UK'&&c.country==='United Kingdom'));
 assert.ok(M.family(d,london).some(c=>c.id===parent.id));
 assert.ok(!M.family(d,london).some(c=>c.id==='TOC-0179'));
 assert.equal(M.filter(d,{country:'United Kingdom',family:'Tesla Owners UK'}).length,16);
});

test('saved preferences discard unknown IDs and keep only supported coarse browsing values',()=>{
 const d=directory(),p=M.preferences({saved:['TOC-0012','TOC-0012','NOT-A-CLUB',17,'CA-171'],filters:{country:'United Kingdom',area:'Europe',type:'chapter',channel:'social',view:'list',lat:51.5,lon:-.1,city:'London',q:'London'},lat:51.5},d);
 assert.deepEqual(p,{saved:['TOC-0012','CA-171'],filters:{country:'United Kingdom',area:'Europe',type:'chapter',channel:'social',view:'list'}});
 assert.deepEqual(M.preferences({saved:'bad',filters:{country:'bad',area:'bad',type:'bad',channel:'bad',view:'bad'}},d),{saved:[],filters:{country:'',area:'',type:'',channel:'',view:'cards'}});
 assert.deepEqual(M.preferences(null,d).saved,[]);
 const clean=M.cleanState({q:'x'.repeat(150),region:'invented region',family:'invented parent',savedOnly:'true',page:Infinity},d);
 assert.equal(clean.q.length,100);assert.equal(clean.region,'');assert.equal(clean.family,'');assert.equal(clean.savedOnly,false);assert.equal(clean.page,1);
});

test('region suggestions use valid, deduplicated references and never infer a country',()=>{
 const d=directory(),rows=M.suggestions(d,{lat:51.51,lon:-.13},'United Kingdom');
 assert.equal(rows[0].region,'London');
 assert.ok(rows.length<=6);
 assert.ok(rows.every(c=>c.country==='United Kingdom'&&Number.isFinite(c.distance)));
 assert.equal(new Set(rows.map(c=>c.country+'|'+c.region)).size,rows.length);
 assert.ok(rows.every(c=>d.clubs.some(x=>x.scope==='region'&&x.country===c.country&&x.region===c.region)));
 assert.deepEqual(M.suggestions(d,{lat:91,lon:0}),[]);
 assert.deepEqual(M.suggestions(d,{lat:53.35,lon:-6.26},'Ireland'),[]);
 assert.equal(M.distance({lat:0,lon:0},{lat:0,lon:0}),0);
 assert.equal(M.distance({lat:Infinity,lon:0},{lat:0,lon:0}),Infinity);
});

test('map and club views describe reference geography and do not fabricate distances or venues',()=>{
 const d=directory(),london=d.clubs.find(c=>c.id==='TOC-0085');
 assert.match(V.atlas(d),/approximate country reference points, not meeting locations/);
 assert.match(V.atlas(d),/Connecting curves are decorative/);
 assert.match(V.detail(d,london,[]),/approximate regional reference point, not a venue/);
 assert.doesNotMatch(V.card(london),/\b\d+(?:\.\d+)?\s*km\b/i);
 assert.doesNotMatch(V.detail(d,london,[]),/\b\d+(?:\.\d+)?\s*km\b/i);
});

const columns=['name','country','latitude','longitude','timeZone','population','asciiName','admin1Code'];
const city=(name,country,pop,ascii=name,lat=51,lon=0)=>[name,country,lat,lon,'Europe/London',pop,ascii,'TEST'];
test('city search prefers exact names, then prefixes, then population within directory countries',()=>{
 const d=directory(),index={columns,cities:[city('New London','US',800000),city('Londonville','US',900000),city('London','CA',400000),city('London','GB',9000000),city('London','ZZ',99000000),city('London','GB',100,undefined,99),city('Québec','CA',500000,'Quebec')]};
 const matches=M.cityMatches(index,'London',d);
 assert.deepEqual(matches.map(c=>[c.name,c.country]),[['London','United Kingdom'],['London','Canada'],['Londonville','United States'],['New London','United States']]);
 assert.equal(M.cityMatches(index,'Quebec',d)[0].name,'Québec');
 assert.deepEqual(M.cityMatches(index,'L',d),[]);
 assert.throws(()=>M.cityMatches({columns:[],cities:[]},'London',d),/City index unavailable/);
});

test('untrusted link protocols, credentialed URLs, emails and markup cannot enter rendered links',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,x','//example.com','https://name:secret@example.com'])assert.equal(M.safeURL(url),'');
 assert.equal(M.safeURL('https://example.com/path'),'https://example.com/path');
 assert.equal(M.email('bad@example.com?subject=oops'),'');
 const a=structuredClone(raw);a.clubs[0].name='<img src=x onerror="alert(1)">';a.clubs[0].website='javascript:alert(1)';a.clubs[0].xUrl='data:text/html,x';a.clubs[0].email='bad@example.com?subject=x';
 const c=M.normalize(a,guide).clubs[0],html=V.card(c);
 assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
 assert.doesNotMatch(html,/<img src=x|href="javascript:|href="data:|href="mailto:/);
});

test('listings without contact URLs stay honest rather than receiving an invented join action',()=>{
 const d=directory(),c=d.clubs.find(c=>c.id==='TOC-0097');
 assert.equal(c.website,'');assert.equal(c.xUrl,'');
 assert.match(V.card(c),/No public contact link in this snapshot/);
 assert.match(V.detail(d,c,[]),/No public contact link was recorded/);
 assert.doesNotMatch(V.links(c),/href=/);
});

test('share links whitelist directory filters and omit device coordinates and local bookmark state',()=>{
 const state={country:'United Kingdom',q:'<London & UK>',lat:51.5,lon:-.13,place:'Private address',savedOnly:true,saved:['TOC-0012'],cityQuery:'London'};
 const u=new URL(M.share(state,'TOC-0012'));
 assert.equal(u.origin,'https://superchargeddaily.com');
 assert.deepEqual([...u.searchParams.keys()].sort(),['country','q']);
 assert.equal(u.searchParams.get('q'),state.q);
 assert.equal(u.hash,'#club/TOC-0012');
 assert.equal(new URL(M.share({},'CA-171')).hash,'#club/CA-171');
 assert.equal(new URL(M.share({},'javascript:x')).hash,'#directory');
});

test('saved HTML and search records rebuild deterministically while preserving unrelated records',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'owners-club-build-'));
 try{
  fs.mkdirSync(path.join(root,'data'));
  for(const name of ['tesla-clubs.html','tesla-clubs-data.js','data/owners-club-guide.json','data/pages.json'])fs.copyFileSync(name,path.join(root,name));
  const before=JSON.parse(fs.readFileSync(path.join(root,'data/pages.json'),'utf8')).pages.filter(p=>!p.url.startsWith('/tesla-clubs.html'));
  buildOwnersClub(root);
  const html=fs.readFileSync(path.join(root,'tesla-clubs.html'),'utf8'),pages=fs.readFileSync(path.join(root,'data/pages.json'),'utf8');
  buildOwnersClub(root);
  assert.equal(fs.readFileSync(path.join(root,'tesla-clubs.html'),'utf8'),html);
  assert.equal(fs.readFileSync(path.join(root,'data/pages.json'),'utf8'),pages);
  assert.deepEqual(JSON.parse(pages).pages.filter(p=>!p.url.startsWith('/tesla-clubs.html')),before);
  const allIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(allIds).size,allIds.length);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.equal((html.match(/data-oc-card=/g)||[]).length,174);
  assert.equal((html.match(/class="oc-static-country"/g)||[]).length,43);
  const jsonld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(jsonld['@type'],'CollectionPage');assert.equal(jsonld.mainEntity.numberOfItems,174);
  assert.equal(jsonld.mainEntity.itemListElement.length,174);
  assert.match(html,/name="description"/);assert.match(html,/property="og:title"/);assert.match(html,/name="twitter:card"/);
  assert.match(html,/16 Oct 2026/);assert.match(html,/CC BY 4\.0/);assert.match(html,/GeoNames/);
  const records=JSON.parse(pages).pages.filter(p=>p.url.startsWith('/tesla-clubs.html'));
  assert.equal(records.length,5);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unicode search retains Korean and CJK text rather than turning it into an empty query',()=>{
 const d=directory();
 assert.deepEqual(ids(M.filter(d,{q:'테슬라이프'})),['TOC-0190']);
 assert.deepEqual(M.filter(d,{q:'不存在的群組'}),[]);
 assert.notEqual(M.norm('테슬라이프'),'');
});

test('contact-channel filters exclude uncontactable listings and recognise X-only social groups',()=>{
 const d=directory(),unknown=d.clubs.find(c=>c.id==='TOC-0097');
 assert.equal(unknown.channelGroup,'unknown');
 assert.ok(!ids(M.filter(d,{channel:'website'})).includes(unknown.id));
 assert.ok(!ids(M.filter(d,{channel:'social'})).includes(unknown.id));
 const a=structuredClone(raw);Object.assign(a.clubs[0],{website:'',email:'',xUrl:'https://x.com/example',channel:''});
 const x=M.normalize(a,guide).clubs[0];assert.equal(x.channelGroup,'social');
});
