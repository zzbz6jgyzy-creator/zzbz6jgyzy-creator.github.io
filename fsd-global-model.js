/* Global FSD evidence rules shared by the saved page, browser and build. */
((root)=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const day=v=>validDate(v)?new Date(v+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not established';
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const safeURL=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
 const labels={listed:'Tesla-listed',not_listed:'Not on checked list',uncertain:'Scope unresolved',recorded:'Authority record',reported:'Reported recognition',unknown:'Not established here'};
 const regionBoxes={World:[0,15,1000,425],Americas:[45,40,400,380],Europe:[460,50,180,150],'Asia-Pacific':[700,105,300,280],'Middle East & Africa':[470,140,235,260]};
 const byCode=(d,code)=>d.countries.find(c=>c.code===code);
 function validate(d){
  if(d?.schemaVersion!==1||!validDate(d.reviewed)||!Array.isArray(d.countries)||!d.countries.length||!Array.isArray(d.sources)||!Array.isArray(d.events)||!Array.isArray(d.versions))throw Error('Invalid global snapshot');
  const ids=new Set(),codes=new Set(),sourceTypes=['manufacturer','authority','tracker','media','owner'];
  for(const s of d.sources){if(!s.id||ids.has(s.id)||!s.label||!safeURL(s.url)||!sourceTypes.includes(s.type)||s.checked&&!validDate(s.checked))throw Error('Invalid source');ids.add(s.id);}
  const refs=r=>Array.isArray(r)&&r.every(x=>ids.has(x));
  for(const c of d.countries){
   if(!/^[A-Z]{2}$/.test(c.code)||codes.has(c.code)||!c.name||!Object.hasOwn(regionBoxes,c.region)||!Number.isFinite(c.lon)||c.lon< -180||c.lon>180||!Number.isFinite(c.lat)||c.lat< -90||c.lat>90)throw Error('Invalid country');codes.add(c.code);
   if(!['listed','not_listed','uncertain'].includes(c.availability.status)||!validDate(c.availability.checked)||!refs(c.availability.sources)||!c.availability.sources.some(id=>d.sources.find(s=>s.id===id)?.type==='manufacturer'))throw Error('Availability requires dated manufacturer evidence');
   if(!['recorded','reported','unknown'].includes(c.permission.status)||!refs(c.permission.sources)||c.permission.date&&!validDate(c.permission.date))throw Error('Invalid permission');
   if(c.permission.status==='recorded'&&!c.permission.sources.some(id=>d.sources.find(s=>s.id===id)?.type==='authority'))throw Error('Authority record needs authority evidence');
   if(c.permission.status==='reported'&&!c.permission.sources.length)throw Error('Reported permission needs evidence');
   if(!refs(c.conditions.sources)||!c.conditions.note)throw Error('Invalid vehicle conditions');
  }
  const records=new Set();
  for(const e of d.events){if(!e.id||records.has(e.id)||!validDate(e.date)||e.precision!=='day'||!e.title||!e.summary||!refs(e.sources)||!e.sources.length||!Array.isArray(e.countries)||e.countries.some(c=>!codes.has(c))||!['review','software','recognition','statement','process','availability'].includes(e.type))throw Error('Invalid dated event');records.add(e.id);}
  for(const v of d.versions){if(!v.id||!validDate(v.date)||!ids.has(v.source)||d.sources.find(s=>s.id===v.source).type!=='tracker'||!Array.isArray(v.countries)||v.countries.some(c=>!codes.has(c)))throw Error('Invalid software observation');}
  return d;
 }
 function compose(raw,eu){
  if(raw?.schemaVersion!==1||!Array.isArray(raw.listed)||new Set(raw.listed).size!==raw.listed.length||!validDate(eu?.updated))throw Error('Invalid source data');
  const d=JSON.parse(JSON.stringify(raw));
  d.sources.push(...eu.sources.map(s=>({id:'eu-'+s.id,url:s.url,label:s.label,type:s.type,checked:s.checkedAt||null,note:'Shared with the FSD Europe evidence dataset.'})));
  const euCountry=new Map(eu.countries.map(c=>[c.code,c]));
  for(const c of d.countries){
   const e=euCountry.get(c.code);c.availability={status:d.listed.includes(c.code)?'listed':c.code==='CN'?'uncertain':'not_listed',checked:d.reviewed,sources:['tesla-world']};
   if(e?.availability?.reviewedAt>d.reviewed)c.availability={status:e.availability.status==='listed'?'listed':e.availability.status==='not_listed'?'not_listed':'uncertain',checked:e.availability.reviewedAt,sources:e.availability.evidence.map(id=>'eu-'+id)};
   c.permission=e?{status:e.permission.status,date:e.permission.date,checked:e.permission.reviewedAt||null,sources:e.permission.evidence.map(id=>'eu-'+id),authority:e.authority}:{status:'unknown',date:null,checked:null,sources:[],authority:null};
   c.conditions={note:'Confirm your vehicle’s configuration, installed software and package in the Tesla app and touchscreen. A country listing does not guarantee access for your car.',hardware:null,software:null,sources:[c.region==='Europe'?'eu-s-c55a052f27a6':'tesla-us']};
   c.note=d.notes[c.code]|| (c.availability.status==='listed'?'Tesla includes this market in its current worldwide rollout list. Features and vehicle eligibility vary.':'This market is absent from the checked Tesla worldwide list. That does not rule out demonstrations, testing or a separate legal permission.');
   if(['US','CA','MX','PR'].includes(c.code))c.conditions.sources.push('tesla-sub');
   if(c.code==='AU')c.conditions.sources=['tesla-au','tesla-au-sub'];
   if(c.code==='NZ')c.conditions.sources=['tesla-nz'];
   c.europeSlug=e?.slug||null;
  }
  if(d.listed.some(code=>!byCode(d,code)))throw Error('Listed market missing from atlas');
  d.europeReviewed=eu.updated;
  d.window={...eu.process.window,evidence:eu.process.window.evidence.map(id=>'eu-'+id)};
  d.events.push(...eu.events.filter(e=>e.evidence.length&&(!e.country||byCode(d,e.country))).map(e=>({id:'eu-'+e.id,date:e.date,precision:e.precision,type:['recognition','statement','process','availability'].includes(e.type)?e.type:'process',title:e.type==='recognition'?(e.evidence.some(id=>eu.sources.find(s=>s.id===id)?.type==='authority')?'National recognition record':'Reported national recognition'):e.type==='statement'?(e.evidence.some(id=>eu.sources.find(s=>s.id===id)?.type==='manufacturer')?'Dated manufacturer statement':e.evidence.some(id=>eu.sources.find(s=>s.id===id)?.type==='authority')?'Dated authority statement':'Dated reporting'):'Europe evidence update',summary:e.summary,countries:e.country?[e.country]:[],sources:e.evidence.map(id=>'eu-'+id)})));
  delete d.listed;delete d.notes;
  return validate(d);
 }
 const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function filtered(d,state={}){const q=normalize(state.query);return d.countries.filter(c=>(!state.region||c.region===state.region)&&(!state.status||c.availability.status===state.status)&&(!q||normalize(c.name+' '+c.code+' '+c.region+' '+({GB:'UK Britain',US:'USA America',KR:'Korea',AE:'UAE',TR:'Turkey'}[c.code]||'')).includes(q))).sort((a,b)=>a.name.localeCompare(b.name,'en'));}
 const stats=d=>({listed:d.countries.filter(c=>c.availability.status==='listed').length,tracked:d.countries.length,regions:new Set(d.countries.filter(c=>c.availability.status==='listed').map(c=>c.region)).size,uncertain:d.countries.filter(c=>c.availability.status==='uncertain').length});
 const sources=(d,ids)=>[...new Set(ids)].map(id=>d.sources.find(s=>s.id===id)).filter(Boolean);
 const events=(d,state={})=>d.events.filter(e=>(!state.country||e.countries.includes(state.country))&&(!state.type||e.type===state.type)).slice().sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 function preferences(d,input){let o;try{o=typeof input==='string'?JSON.parse(input):input;}catch{return {country:null};}return {country:typeof o?.country==='string'&&byCode(d,o.country)?o.country:null};}
 function countryFromURL(d,input){try{const u=new URL(input,'https://superchargeddaily.com');const c=u.searchParams.get('country');return byCode(d,c)?.code||null;}catch{return null;}}
 const countryURL=code=>'/fsd.html?country='+encodeURIComponent(code)+'#map';
 function carAdvice(c,hardware){
  if(c.availability.status==='uncertain')return 'Current market scope is unresolved. A hardware selection cannot resolve that. Ask Tesla for the conditions for your car.';
  if(c.availability.status!=='listed')return 'This market is not on the checked Tesla list. Owning newer hardware or an FSD package does not establish local activation.';
  if(hardware==='older')return 'Do not assume compatibility. Check the installed driving computer and any manufacturer upgrade requirements before subscribing.';
  if(hardware==='ai3')return 'HW3 and AI4 can receive different FSD models. Check Tesla’s eligibility offer for your exact vehicle; a software sample is not a compatibility certificate.';
  if(hardware==='ai4')return 'AI4 hardware is one prerequisite, not a guarantee. Confirm the local package, vehicle configuration and delivered software in your Tesla app.';
  return 'Check the installed driving computer under Additional Vehicle Information and confirm the FSD offer in your Tesla app. Menu names differ by software and market.';
 }
 const api={esc,day,validDate,safeURL,labels,regionBoxes,validate,compose,byCode,filtered,stats,sources,events,preferences,countryFromURL,countryURL,carAdvice};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SDFGlobal=api;
})(typeof window==='undefined'?globalThis:window);
