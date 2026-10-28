(function(root){'use strict';
// Used by the builder (Node) and by tests: one validator and one set of labels for the Roadster experience.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// demo: shown at the reveal. claim: Tesla said it. target: an aim, not a result. reported: an outlet reported it. analysis: our reading.
const status={demo:'Shown at the reveal',claim:"Tesla's claim",target:'Target',reported:'Reported',analysis:'Our analysis'};
const day=x=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(x||''))return false;const d=new Date(x+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===x;};
const https=x=>{try{return new URL(x).protocol==='https:';}catch{return false;}};
const fail=m=>{throw Error('Invalid Roadster experience record: '+m);};
// studioSources: the sources of data/roadster-studio.json, which this page shares. Their ids may be cited here too.
function validate(d,studioSources=[],clipIds=null){
 if(d?.schema!==1||!day(d.reviewed))fail('schema or review date');
 const own=[...(d.sources||[]),...studioSources.map(s=>({id:s.id,kind:/^manufacturer/i.test(s.kind||'')?'manufacturer':'reporting'}))],ids=own.map(s=>s.id);
 if(new Set(ids).size!==ids.length)fail('duplicate source id');
 for(const s of (d.sources||[]))if(!/^[a-z0-9-]+$/.test(s.id)||!s.label||!s.outlet||!s.title||!https(s.url)||!day(s.date)||!day(s.checked)||s.checked>d.reviewed||!['reporting','manufacturer','own'].includes(s.kind))fail('source '+s.id);
 const ref=(list,where)=>{if(!Array.isArray(list))fail(where+' sources');for(const id of list)ids.includes(id)||fail('unknown source '+id+' in '+where);};
 const labelled=(x,where)=>{if(!status[x.status])fail(where+' status');
  if(x.status==='analysis')return;
  if(!x.sources?.length)fail(where+' needs a source');ref(x.sources,where);
  // Reported means an outlet or our own report said it, so it must cite one, never a company page alone.
  if(x.status==='reported'&&!x.sources.some(id=>{const s=own.find(o=>o.id===id);return s&&['reporting','own'].includes(s.kind);}))fail(where+' is Reported but cites no reporting');};
 const unique=(list,key,where)=>{const k=list.map(x=>x[key]);if(new Set(k).size!==k.length||k.some(v=>!/^[a-z0-9-]+$/.test(v||'')))fail('duplicate or bad id in '+where);};
 if(!d.page?.title||!d.page?.description||d.page.description.length>170)fail('page title or description');
 unique(d.chapters,'id','chapters');if(d.chapters.length<3||d.chapters.some(c=>!c.label))fail('chapters');
 unique(d.facts,'id','facts');
 for(const f of d.facts){if(!f.label||!f.value||!f.detail)fail('fact '+f.id);labelled(f,'fact '+f.id);}
 if(d.facts.filter(f=>f.strip).length!==4)fail('the hero strip needs exactly four facts');
 const r=d.reveal;unique(r.steps,'id','reveal steps');if(r.steps.length<3||!r.title||!r.lead)fail('reveal');
 for(const s of r.steps){if(!s.number||!s.kicker||!s.title||!s.text||!s.image||!s.alt)fail('reveal step '+s.id);labelled(s,'reveal step '+s.id);if(s.clip&&clipIds&&!clipIds.includes(s.clip))fail('unknown clip '+s.clip+' in reveal step '+s.id);}
 const v=d.reservation;unique(v.cards,'id','reservation cards');if(!v.title||!v.lead||!v.note)fail('reservation');
 for(const c of v.cards){if(!c.label||!c.value||!c.detail)fail('reservation card '+c.id);labelled(c,'reservation card '+c.id);}
 v.terms.forEach((t,i)=>{if(!t.text)fail('reservation term '+i);labelled(t,'reservation term '+i);});
 unique(d.faq,'id','faq');if(d.faq.length<8)fail('too few questions');
 for(const q of d.faq){if(!q.q||!q.a||!q.sources?.length)fail('question '+q.id);ref(q.sources,'question '+q.id);}
 // Chapters added in part 3: every labelled item cites a source.
 for(const c of d.cockpit.cards)labelled(c,'cockpit card '+c.number);
 if(d.cockpit.hotspots.length!==d.cockpit.cards.length)fail('hotspots and cards');
 unique(d.engineer.cards,'id','engineer');for(const c of d.engineer.cards){if(!c.title||!c.text)fail('engineer '+c.id);labelled(c,'engineer '+c.id);}
 const ids2=[];for(const g of d.performance.groups){if(!g.label||!g.items.length)fail('number group');for(const i of g.items){if(!i.label||!i.value||!i.detail)fail('number '+i.id);labelled(i,'number '+i.id);ids2.push(i.id);}}
 if(new Set(ids2).size!==ids2.length)fail('duplicate number id');
 unique(d.timeline.events,'id','timeline');for(const t of d.timeline.events){if(!t.label||!t.title||!t.text)fail('timeline '+t.id);labelled(t,'timeline '+t.id);}
 unique(d.timeline.promise.rows,'id','promise rows');for(const r of d.timeline.promise.rows){if(!r.label||!r.then||!r.now)fail('promise '+r.id);labelled(r,'promise '+r.id);}
 const ch=d.changes;if(!ch.length||!ch.every((c,i)=>day(c.date)&&c.date<=d.reviewed&&['update','correction'].includes(c.kind)&&c.text&&(!i||ch[i-1].date>=c.date)))fail('changes');
 const so=d.social;if(!so?.title||!so.posts?.length)fail('social');unique(so.posts,'id','social posts');
 for(const q of so.posts)if(!q.text||!q.author||!/^https:\/\/x\.com\/Tesla\/status\/\d+$/.test(q.url)||!q.caption)fail('social post '+q.id+' must be an official @Tesla post');
 return d;
}
const api={validate,esc,status,day};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoadsterExperience=api;
})(typeof window!=='undefined'?window:globalThis);
