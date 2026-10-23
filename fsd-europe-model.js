/* Shared rules for the saved page, browser and build. No inferred votes or vehicle entitlements. */
((root) => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().startsWith(value);
  const url = value => { try { const u = new URL(value, 'https://superchargeddaily.com'); return u.protocol === 'https:' ? u.href : null; } catch { return null; } };
  const day = value => date(value) ? new Date(value+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'Date not established';
  const month = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '') ? new Date(value+'-15T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}) : 'No verified date';
  const labels = {recorded:'Recognition recorded',reported:'Recognition reported',unknown:'Permission not established',listed:'Listed by Tesla',not_listed:'Not on the checked Tesla list',unverified:'Not independently verified'};
  const sourceTypes = new Set(['authority','manufacturer','media','tracker','owner']);
  function validate(data) {
    if(data?.schemaVersion!==1 || !date(data.updated) || typeof data.revision!=='string' || !Array.isArray(data.countries) || !Array.isArray(data.sources) || !Array.isArray(data.events)) throw Error('Invalid Europe dataset');
    const sources=new Map(),codes=new Set();
    for(const s of data.sources){if(!s.id||sources.has(s.id)||!url(s.url)||!s.url.startsWith('https://')||!sourceTypes.has(s.type)||!s.label||s.checkedAt&&!date(s.checkedAt))throw Error('Invalid source');sources.set(s.id,s);}
    const evidence = refs => Array.isArray(refs) && refs.every(id=>sources.has(id));
    for(const c of data.countries){
      if(!/^[A-Z]{2}$/.test(c.code)||codes.has(c.code)||!c.name||!/^[a-z]+(?:-[a-z]+)*$/.test(c.slug)||!['EU','UK','EEA','Swiss'].includes(c.jurisdiction))throw Error('Invalid country');codes.add(c.code);
      if(!['recorded','reported','unknown'].includes(c.permission?.status)||!['listed','not_listed','unknown'].includes(c.availability?.status)||!['reported','verified','unverified'].includes(c.observations?.status))throw Error('Invalid independent country status');
      for(const claim of [c.permission,c.availability,c.observations,c.conditions,c.context])if(!claim||!evidence(claim.evidence)||claim.date&&!date(claim.date)||claim.reviewedAt&&!date(claim.reviewedAt))throw Error('Invalid claim evidence/date');
      if(c.permission.status==='recorded'&&!c.permission.evidence.some(id=>sources.get(id).type==='authority'))throw Error('Recorded recognition needs an authority source');
      if(c.permission.status==='reported'&&!c.permission.evidence.length)throw Error('Reported recognition needs evidence');
      if(c.availability.status==='listed'&&!c.availability.evidence.some(id=>sources.get(id).type==='manufacturer'))throw Error('Availability needs manufacturer evidence');
      if(c.observations.status!=='unverified'&&!c.observations.evidence.length)throw Error('Observation needs evidence');
      if(!evidence(c.sourceIds))throw Error('Invalid country source references');
    }
    if(data.countries.filter(c=>c.jurisdiction==='EU').length!==27)throw Error('EU scope must have exactly 27 unique members');
    const ids=new Set();for(const e of data.events){if(ids.has(e.id)||!e.id||!date(e.date)||e.precision!=='day'||e.country&&!codes.has(e.country)||!e.summary||!evidence(e.evidence))throw Error('Invalid dated event');ids.add(e.id);}
    const window=data.process?.window;if(!window||window.precision!=='month'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(window.value)||window.confirmed!==false||!evidence(window.evidence)||!evidence(data.process.evidence))throw Error('Meeting window must retain unconfirmed month precision');
    return data;
  }
  const country = (data,code) => data.countries.find(c=>c.code===code);
  const sorted = data => data.countries.slice().sort((a,b)=>a.name.localeCompare(b.name));
  const listed = data => data.countries.filter(c=>c.jurisdiction==='EU'&&c.availability.status==='listed');
  const events = (data,state={}) => data.events.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).filter(e=>(!state.country||e.country===state.country)&&(!state.type||e.type===state.type));
  const filtered = (data,state={}) => sorted(data).filter(c=>(!state.query||c.name.toLowerCase().includes(state.query.trim().toLowerCase())||c.code.toLowerCase()===state.query.trim().toLowerCase())&&(!state.scope||(state.scope==='EU'?c.jurisdiction==='EU':c.jurisdiction!=='EU'))&&(!state.status||c.availability.status===state.status));
  function permissionAt(data,c,at){if(!date(at))return c.permission.status;const records=data.events.filter(e=>e.country===c.code&&e.type==='recognition'&&e.date<=at).sort((a,b)=>b.date.localeCompare(a.date));return records.length&&c.permission.date&&c.permission.date<=at?c.permission.status:'unknown';}
  const milestones = data => [...new Set(data.events.filter(e=>e.type==='recognition'&&e.country).map(e=>e.date))].sort();
  const sources = (data,ids) => [...new Set(ids)].map(id=>data.sources.find(s=>s.id===id)).filter(Boolean);
  const colour = status => status==='recorded'?'teal':status==='listed'?'blue':status==='reported'?'amber':'grey';
  function snapshot(data,codes){return {schemaVersion:1,asOf:data.updated,countries:codes.map(code=>country(data,code)).filter(Boolean).map(c=>({code:c.code,name:c.name,jurisdiction:c.jurisdiction,permission:c.permission,availability:c.availability,observations:c.observations,conditions:c.conditions,sources:sources(data,c.sourceIds)})),note:data.note};}
  root.SDFE={esc,date,url,day,month,labels,validate,country,sorted,listed,events,filtered,permissionAt,milestones,sources,colour,snapshot};
})(typeof window==='undefined'?globalThis:window);
