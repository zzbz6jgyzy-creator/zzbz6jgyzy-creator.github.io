/* Shared software snapshot rules. Used by the static builder and the browser. */
((root)=>{
  'use strict';
  const DAY=864e5;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)&&Number.isFinite(Date.parse(value));
  const count=value=>Number.isFinite(value)&&value>=0;
  const version=value=>typeof value==='string'&&/^\d{4}(?:\.\d+)+$/.test(value);
  const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}};
  const compare=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d;}return 0;};
  const firstSeen=v=>validDate(v.firstSeen)?v.firstSeen:validDate(v.date)?v.date:null;
  const byFirstSeen=(a,b)=>(Date.parse(firstSeen(b))||-Infinity)-(Date.parse(firstSeen(a))||-Infinity)||compare(b.id,a.id);
  const regions={NA:new Set(['US','CA','MX','PR']),EU:new Set('AL AD AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK'.split(' ')),AP:new Set('AU BN CN FJ HK ID IN JP KH KR LA LK MM MN MO MY NP NZ PH PK SG TH TL TW VN'.split(' '))};
  const region=c=>Object.keys(regions).find(key=>regions[key].has(c))||'OT';
  const regionName=c=>({NA:'North America',EU:'Europe',AP:'Asia-Pacific',OT:'Other regions'})[region(c)];
  const countryName=c=>{try{return new Intl.DisplayNames(['en'],{type:'region'}).of(c)||c;}catch{return c;}};
  const day=s=>validDate(s)?new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Date not reported';
  const time=s=>validDate(s)?new Date(s).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':'Date not reported';
  const number=n=>Number.isFinite(n)?n.toLocaleString('en-US'):'Unknown';
  function validate(live){if(!validDate(live?.updated)||!count(live.fleet)||live.fleet===0||!safeUrl(live.sourceUrl)||!Array.isArray(live.versions)||!live.versions.length)throw Error('Invalid software snapshot');const ids=new Set();for(const v of live.versions){if(!version(v.id)||ids.has(v.id)||(!count(v.count)||v.count>live.fleet))throw Error('Invalid software version/count');ids.add(v.id);if(v.countryCounts&&Object.entries(v.countryCounts).some(([c,n])=>!(/^[A-Z]{2}$/.test(c))||!count(n)))throw Error('Invalid country count');}if(!live.versions.some(v=>v.count>0))throw Error('No observed builds');return live;}
  const catalog=live=>live.versions.slice().sort(byFirstSeen);
  const releases=live=>live.versions.filter(v=>v.count>0).slice().sort(byFirstSeen);
  const share=(v,live)=>Math.round(v.count/live.fleet*1000)/10;
  const notes=v=>Array.isArray(v?.features)?v.features.filter(f=>f&&typeof f.title==='string'&&f.title.trim()).map(f=>({title:f.title,text:typeof f.text==='string'?f.text:''})):[];
  const countries=live=>[...new Set(live.versions.flatMap(v=>Object.keys(v.countryCounts||{})))].sort((a,b)=>countryName(a).localeCompare(countryName(b)));
  function snapshots(live,history){const rows=(Array.isArray(history?.snapshots)?history.snapshots:[]).filter(s=>validDate(s.t)&&s.v&&Date.parse(s.t)<=Date.parse(live.updated)).slice().sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));const current={t:live.updated,fleet:live.fleet,v:Object.fromEntries(live.versions.map(v=>[v.id,[v.count,v.countryCounts||{}]]))};if(rows.at(-1)?.t===live.updated)rows[rows.length-1]=current;else rows.push(current);return rows;}
  function delta(live,history,id){const rows=snapshots(live,history),cut=Date.parse(live.updated)-DAY,base=rows.filter(s=>Date.parse(s.t)<=cut).at(-1),current=live.versions.find(v=>v.id===id);if(!base||!current||!count(base.v[id]?.[0]))return null;return {value:current.count-base.v[id][0],from:base.t,to:live.updated,hours:(Date.parse(live.updated)-Date.parse(base.t))/36e5};}
  const signed=n=>(n>0?'+':n<0?'−':'±')+number(Math.abs(n));
  function freshness(stamp,asOf,maxHours=24){if(!validDate(stamp))return {state:'unknown',label:'Timestamp unavailable',hours:null};const hours=(Date.parse(asOf)-Date.parse(stamp))/36e5;if(!Number.isFinite(hours)||hours<0)return {state:'unknown',label:'Timestamps need checking',hours};return {state:hours>maxHours?'stale':'fresh',label:hours>maxHours?'Older snapshot':'Saved snapshot',hours};}
  function filtered(live,{query='',country='',hardware='all'}={}){const q=query.trim().toLowerCase();return catalog(live).filter(v=>(!country||(v.countryCounts||{})[country]>0)&&(!q||[v.id,...notes(v).map(f=>f.title)].join(' ').toLowerCase().includes(q))&&(hardware==='all'||!!v[hardware==='hw3'?'fsdHw3':'fsdHw4']));}
  function comparison(a,b){const A=notes(a),B=notes(b);if(!A.length||!B.length)return null;const clean=t=>t.replace(/\s+/g,' ').trim();const match=new Map(B.map(f=>[f.title.toLowerCase(),f]));return {selected:A.map(f=>{const prev=match.get(f.title.toLowerCase());return {...f,status:!prev?'Only in selected excerpt':clean(f.text)===clean(prev.text)?'Listed in both':'Excerpt wording differs',previous:prev?.text||''};}),other:B.filter(f=>!A.some(g=>g.title.toLowerCase()===f.title.toLowerCase()))};}
  function points(live,history,id,days=5){const cut=Date.parse(live.updated)-days*DAY;return snapshots(live,history).filter(s=>Date.parse(s.t)>=cut).map(s=>({t:s.t,n:count(s.v[id]?.[0])?s.v[id][0]:null}));}
  function pairings(live,fsd){const rows=[];for(const v of releases(live))for(const [key,hardware]of [['fsdHw3','HW3'],['fsdHw4','HW4 / AI4']])if(v[key])rows.push({build:v.id,hardware,fsd:v[key],region:'Market applicability not established',source:'Teslascope build mapping',date:live.updated,url:'https://teslascope.com/software/'+v.id});for(const v of Array.isArray(fsd?.versions)?fsd.versions:[])for(const build of String(v.build||'').match(/\d{4}(?:\.\d+)+/g)||[])if(version(build))rows.push({build,hardware:v.hardware||'Not specified',fsd:v.id||'Not specified',region:v.region||'Not specified',source:'Global FSD tracker',date:fsd.updated,url:'/fsd.html#versions'});return rows;}
  function bootstrap(live,history,extras,fsd){return {live,history:{snapshots:snapshots(live,history).map(s=>({t:s.t,fleet:s.fleet,v:Object.fromEntries(Object.entries(s.v).map(([id,row])=>[id,[row[0]]]))}))},extras,fsd:{updated:fsd?.updated,versions:fsd?.versions||[]}};}
  root.SDSoftware={DAY,esc,validDate,count,version,safeUrl,compare,firstSeen,byFirstSeen,region,regionName,countryName,day,time,number,validate,catalog,releases,share,notes,countries,snapshots,delta,signed,freshness,filtered,comparison,points,pairings,bootstrap};
})(typeof window==='undefined'?globalThis:window);
