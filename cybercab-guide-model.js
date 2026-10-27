(function(root){'use strict';
// Shared by the builder (Node) and the page script (browser): one validator, one set of labels.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status={disclosed:'Disclosed',target:'Target',reported:'Reported'};
const types={milestone:'Milestone',filing:'Tesla filing',regulator:'Regulator',target:'Target',report:'Report'};
const day=x=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(x||''))return false;const d=new Date(x+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===x;};
const https=x=>{try{return new URL(x).protocol==='https:';}catch{return false;}};
function fail(m){throw Error('Invalid Cybercab guide record: '+m);}
// promiseIds is optional: the builder passes the ledger's ids so a renamed or removed promise fails the build.
function validate(d,promiseIds){
 if(d?.schema!==1||!day(d.reviewed))fail('schema or review date');
 const ids=d.sources.map(s=>s.id);
 if(new Set(ids).size!==ids.length)fail('duplicate source id');
 for(const s of d.sources)if(!/^[a-z0-9-]+$/.test(s.id)||!https(s.url)||!day(s.checked)||s.checked>d.reviewed||!day(s.date)||!s.title||!s.outlet)fail('source '+s.id);
 const ref=id=>ids.includes(id)||fail('unknown source '+id);
 const unique=(list,name)=>{if(new Set(list.map(x=>x.id)).size!==list.length)fail('duplicate '+name+' id');};
 for(const g of ['metrics','timeline','promises','evidence'])unique(d[g],g);
 for(const m of d.metrics){if(!status[m.status]||!day(m.asOf)||m.asOf>d.reviewed||!m.value||!m.label||!m.detail)fail('metric '+m.id);ref(m.source);}
 for(const t of d.timeline){if(!day(t.date)||!types[t.type]||!t.title||!t.text)fail('event '+t.id);if(t.date>d.reviewed&&t.type!=='target')fail('future event '+t.id);if(t.type==='target'&&t.date>d.reviewed&&!t.display&&!t.date)fail('target date');ref(t.source);}
 const sorted=d.timeline.every((t,i)=>!i||d.timeline[i-1].date<=t.date);if(!sorted)fail('timeline order');
 const cols=d.versions.columns.map(c=>c.id);
 for(const r of d.versions.rows){for(const c of cols){const cell=r.cells[c];if(cell===undefined)fail('missing cell '+r.id+'/'+c);if(cell){if(!status[cell.status]||!day(cell.asOf)||!cell.value)fail('cell '+r.id+'/'+c);ref(cell.source);}}}
 for(const f of d.faqs){if(!f.q||!f.a||!f.sources?.length)fail('faq');f.sources.forEach(ref);}
 for(const e of d.evidence){ref(e.source);if(!e.embed||!/^\d+$/.test(e.embed.id)||!/^\w+$/.test(e.embed.user))fail('embed');}
 if(promiseIds)for(const p of d.promises)if(!promiseIds.includes(p.id))fail('promise not in ledger: '+p.id);
 const ch=d.changes;if(!ch.length||!ch.every((c,i)=>day(c.date)&&['update','correction'].includes(c.kind)&&c.text&&(!i||ch[i-1].date>=c.date)))fail('changes');
 return d;
}
const api={validate,esc,status,types,day};
if(typeof module==='object'&&module.exports)module.exports=api;else root.CybercabGuide=api;
})(typeof window!=='undefined'?window:globalThis);
