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
function validate(d){
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
 const ch=d.changes;if(!ch.length||!ch.every((c,i)=>day(c.date)&&['update','correction'].includes(c.kind)&&c.text&&(!i||ch[i-1].date>=c.date)))fail('changes');
 return d;
}
const api={validate,esc,status,day,ratio};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FsdTracker=api;
})(typeof window!=='undefined'?window:globalThis);
