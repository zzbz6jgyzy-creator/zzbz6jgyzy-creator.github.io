(function(root){'use strict';
// Used by the builder (Node) and available to page scripts: one validator, one set of labels.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// disclosed: Tesla or a regulator, in a document we opened. estimate: our own arithmetic. approx: read off a published chart.
const status={disclosed:'Disclosed',reported:'Reported',estimate:'Our estimate',approx:'Approx. from chart',target:'Target'};
const day=x=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(x||''))return false;const d=new Date(x+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===x;};
const https=x=>{try{return new URL(x).protocol==='https:';}catch{return false;}};
const fail=m=>{throw Error('Invalid FSD tracker record: '+m);};
// Active subscriptions per delivered car, as a percentage to one decimal. A proxy, never Tesla's own take rate.
function ratio(p){if(!(p.subs>0)||!(p.deliveries>0))throw Error('subs and deliveries must be positive');return Math.round(p.subs/p.deliveries*1000)/10;}
function validate(d,promiseIds){
 if(d?.schema!==1||!day(d.reviewed))fail('schema or review date');
 const ids=d.sources.map(s=>s.id);if(new Set(ids).size!==ids.length)fail('duplicate source id');
 for(const s of d.sources)if(!/^[a-z0-9-]+$/.test(s.id)||!https(s.url)||!day(s.checked)||s.checked>d.reviewed||!day(s.date)||!s.title||!s.outlet||!['primary','regulator','reporting'].includes(s.kind))fail('source '+s.id);
 const ref=id=>ids.includes(id)||fail('unknown source '+id);
 const kids=d.kpis.map(k=>k.id);if(new Set(kids).size!==kids.length)fail('duplicate kpi id');
 for(const k of d.kpis){if(k.computed)continue;if(!status[k.status]||!day(k.asOf)||k.asOf>d.reviewed||!k.value||!k.label||!k.detail)fail('kpi '+k.id);ref(k.source);}
 const pts=d.adoption.points;
 if(pts.length<4)fail('too few adoption points');
 pts.forEach((p,i)=>{if(!/^[a-z0-9-]+$/.test(p.id)||!day(p.end)||p.end>d.reviewed||!p.label)fail('point '+p.id);ratio(p);ref(p.source);
  if(i&&!(p.end>pts[i-1].end))fail('points out of order');if(i&&p.deliveries<pts[i-1].deliveries)fail('cumulative deliveries fell at '+p.id);});
 for(const a of d.adoption.attach){if(!(a.value>0&&a.value<=100)||!['over','about','exact'].includes(a.bound))fail('attach '+a.id);ref(a.source);}
 const m=d.miles;ref(m.source);ref(m.europe.source);
 if(!(m.tolerance>0)||m.points.length<5)fail('miles');
 m.points.forEach((p,i)=>{if(!day(p.end)||!p.label||!(p.total>=0)||!(p.v11>=0)||p.v11>p.total)fail('miles point '+p.label);if(i&&(p.end<=m.points[i-1].end||p.total<m.points[i-1].total||p.v11<m.points[i-1].v11))fail('miles not cumulative at '+p.label);});
 const sw=d.software;ref(sw.source);
 if(!(sw.top>=2&&sw.top<=8&&sw.timeline>=3&&sw.heatDays>=3&&sw.days.length>=5&&sw.builds.length===sw.top&&sw.releases.length===sw.timeline&&sw.latestCount>0&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(sw.asOf)))fail('software settings');
 sw.days.forEach((x,i)=>{if(!day(x)||(i&&x<=sw.days[i-1]))fail('software days');});
 for(const b of sw.builds)if(!b.id||b.counts.length!==sw.days.length||b.counts.some(v=>!Number.isInteger(v)||v<0))fail('software build '+b.id);
 for(const r of sw.releases)if(!r.id||!day(r.date)||!r.status)fail('release '+r.id);
 const at=d.atlas;ref(at.source);if(!day(at.asOf)||at.countries.length<20||at.countries.some(c=>!/^[A-Z]{2}$/.test(c.code)||!['listed','uncertain','not_listed'].includes(c.status)||!c.region||!(Math.abs(c.lon)<=180&&Math.abs(c.lat)<=90)))fail('atlas');
 const eu=d.europe;ref(eu.popSource);ref(eu.thresholds.source);
 if(!day(eu.asOf)||eu.states.length!==27||!(eu.populationTotal>4e8)||eu.states.some(s=>!/^[A-Z]{2}$/.test(s.code)||!(s.population>0)||typeof s.recognised!=='boolean'))fail('europe states');
 if(eu.states.filter(s=>s.recognised).length!==eu.recognitions.length)fail('recognitions do not match recognised states');
 eu.recognitions.forEach((r,i)=>{if(!day(r.date)||r.date>d.reviewed||(i&&r.date<eu.recognitions[i-1].date)||!eu.states.some(s=>s.code===r.code&&s.recognised)||!r.links.length||r.links.some(u=>!https(u))||!['authority','media'].includes(r.kind))fail('recognition '+r.code);});
 if(Math.abs(eu.states.reduce((a,s)=>a+s.population,0)-eu.populationTotal)>1)fail('EU population does not add up');
 const cl=d.claims;ref(cl.us.source);ref(cl.eu.source);ref(cl.eu.also);ref(cl.eu.critic);if(!['fsd','manual-as','us'].every(i=>cl.us.rows.some(r=>r.id===i)))fail('claims rows');
 if(!day(cl.asOf)||cl.asOf>d.reviewed||cl.us.rows.length<3)fail('claims');
 for(const r of cl.us.rows){if(!r.id||!r.label||!(r.miles>0)||!(r.collisions>0)||!(r.drivenMiles>0)||(r.prior!==null&&!(r.prior>0)))fail('claims row '+r.id);
  // Tesla's published miles per collision must equal miles driven divided by collisions, to 1%, or a figure was mistyped.
  if(Math.abs(r.drivenMiles/r.collisions/r.miles-1)>0.01)fail('claims row does not add up: '+r.id);}
 if(!(cl.eu.multiple>1&&cl.eu.km>0&&cl.eu.july.multiple>1&&cl.eu.july.km>0&&cl.eu.fsdCollisions>0&&cl.eu.manualCollisions>0&&cl.eu.fsdKm>0&&cl.eu.manualKm>0&&cl.eu.window))fail('claims eu');
 // 4.1x is the ratio of the two collision rates; check it from the counts.
 if(Math.abs((cl.eu.manualCollisions/cl.eu.manualKm)/(cl.eu.fsdCollisions/cl.eu.fsdKm)-cl.eu.multiple)>0.05)fail('EU multiple does not match the collision counts');
 for(const c of cl.caveats){if(!c.text||(c.status!==null&&!status[c.status]))fail('caveat');for(const x of c.sources)ref(x);}
 if(!d.promises.topic)fail('promise topic');
 const ch=d.changes;if(!ch.length||!ch.every((c,i)=>day(c.date)&&['update','correction'].includes(c.kind)&&c.text&&(!i||ch[i-1].date>=c.date)))fail('changes');
 return d;
}
const api={validate,esc,status,day,ratio};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FsdTracker=api;
})(typeof window!=='undefined'?window:globalThis);
