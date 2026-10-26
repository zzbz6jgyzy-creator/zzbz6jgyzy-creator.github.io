(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SDPromiseModel=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const statuses=['Delivered','Delivered late','In progress','Missed','Revised'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const statusClass=s=>String(s).toLowerCase().replace(/[^a-z]+/g,'-');
  function safeURL(value){try{if(typeof value==='string'&&/^\/[a-zA-Z0-9][a-zA-Z0-9/_.,#?=&%-]*$/.test(value)&&!decodeURIComponent(value).includes('..'))return 'https://superchargeddaily.com'+value;const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function span(value){
    if(typeof value!=='string'||!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value))return null;
    const parts=value.split('-').map(Number),[year,month=1,day=1]=parts;
    if(year<1900||year>2200||month<1||month>12||day<1||day>31)return null;
    const start=Date.UTC(year,month-1,day),check=new Date(start);
    if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)return null;
    const precision=parts.length===1?'year':parts.length===2?'month':'day';
    const end=precision==='year'?Date.UTC(year+1,0,1):precision==='month'?Date.UTC(year,month,1):start+86400000;
    const label=new Intl.DateTimeFormat('en-GB',{year:'numeric',...(precision!=='year'?{month:'short'}:{}),...(precision==='day'?{day:'numeric'}:{}),timeZone:'UTC'}).format(new Date(start));
    return{start,end,precision,label};
  }
  const date=value=>span(value)?.label||'Not dated';
  function normalize(raw,guide){
    if(!raw||raw.schema_version!==1||!span(raw.updated)||!Array.isArray(raw.promises)||guide?.version!==1)throw Error('Invalid promise source');
    const seen=new Set();
    const sourceOK=s=>s&&safeURL(s.url)&&typeof s.outlet==='string'&&s.outlet&&(!s.date||span(s.date));
    for(const p of raw.promises){
      if(!/^[a-z0-9][a-z0-9-]*$/.test(p.id||'')||seen.has(p.id)||!p.title||!p.person||!p.company||!p.topic||!statuses.includes(p.status)||!['exact','paraphrase'].includes(p.quote_type)||!span(p.said_on)||p.deadline&&!span(p.deadline)||!span(p.last_verified)||!sourceOK(p.source)||!Array.isArray(p.evidence)||!Array.isArray(p.revisions)||p.outcome_date&&!span(p.outcome_date))throw Error('Invalid promise record: '+p.id);
      for(const item of [...p.evidence,...p.revisions])if(!item.text||!sourceOK(item.source)||item.date&&!span(item.date))throw Error('Invalid evidence or revision: '+p.id);
      const presentation=guide.targets?.[p.id];
      if(!presentation)throw Error('Missing target presentation: '+p.id);
      if(presentation&&(!presentation.label||!['day','month','quarter','half-year','year','undated'].includes(presentation.precision)||!presentation.basis||typeof presentation.approximate!=='boolean'))throw Error('Invalid display precision: '+p.id);
      seen.add(p.id);
    }
    if(Object.keys(guide.targets||{}).some(id=>!seen.has(id)))throw Error('Unknown presentation record');
    return{updated:raw.updated,records:raw.promises,guide,topics:[...new Set(raw.promises.map(p=>p.topic))].sort(),companies:[...new Set(raw.promises.map(p=>p.company))].sort()};
  }
  function target(p,d){
    const raw=span(p.deadline),g=d.guide.targets?.[p.id];
    if(!raw||g?.precision==='undated')return{label:g?.label||'No dated target',precision:'undated',approximate:g?.approximate??false,start:null,end:null,basis:g?.basis||'No deadline is recorded.'};
    const precision=g?.precision||raw.precision,year=+p.deadline.slice(0,4),month=+(p.deadline.slice(5,7)||1);
    let start=raw.start,end=raw.end;
    if(precision==='year'){start=Date.UTC(year,0,1);end=Date.UTC(year+1,0,1);}
    if(precision==='month'){start=Date.UTC(year,month-1,1);end=Date.UTC(year,month,1);}
    if(precision==='quarter'){const q=Math.floor((month-1)/3);start=Date.UTC(year,q*3,1);end=Date.UTC(year,q*3+3,1);}
    if(precision==='half-year'){const half=month<=6?0:6;start=Date.UTC(year,half,1);end=Date.UTC(year,half+6,1);}
    if(g?.window_start&&g?.window_end){const a=span(g.window_start),b=span(g.window_end);if(!a||!b||a.start>=b.start)throw Error('Invalid target window: '+p.id);start=a.start;end=b.start;}
    return{label:g?.label||raw.label,precision,approximate:g?.approximate??raw.precision!=='day',start,end,basis:g?.basis||'The recorded target; some source dates encode an editorial end-of-window interpretation.'};
  }
  function counts(d){return Object.fromEntries(statuses.map(s=>[s,d.records.filter(p=>p.status===s).length]));}
  function windowState(p,d,now=Date.now()){
    if(p.status!=='In progress')return p.status;
    const t=target(p,d);if(t.end===null)return 'No dated target';
    return now>=t.end?'Target window passed · status awaits review':now<t.start?'Target window ahead':'Within the recorded target window';
  }
  function events(p,d){
    const rows=[{kind:'statement',label:p.quote_type==='paraphrase'?'Statement · paraphrase':'Statement · exact-quote label',date:p.said_on,text:p.quote,source:p.source}];
    for(const r of p.revisions)rows.push({kind:'revision',label:'Recorded revision',date:r.date||r.source.date||'',text:r.text,source:r.source,...(!r.date&&r.source.date?{dateBasis:'Source publication date'}:{})});
    for(const r of p.evidence)rows.push({kind:'evidence',label:'Evidence in the saved record',date:r.date||r.source.date||'',text:r.text,source:r.source,...(!r.date&&r.source.date?{dateBasis:'Source publication date'}:{})});
    if(p.outcome_date)rows.push({kind:'outcome',label:'Recorded outcome',date:p.outcome_date,text:'The editorial record associates this date with the stated outcome. Read the scope and evidence above; it does not establish broader availability.',source:null});
    rows.push({kind:'verified',label:'Record last verified',date:p.last_verified,text:'Editorial verification date, not a new product milestone or the time this page was opened.',source:null});
    return rows.map((r,index)=>({...r,index,dateLabel:date(r.date)})).sort((a,b)=>(span(a.date)?.start??Infinity)-(span(b.date)?.start??Infinity)||a.index-b.index);
  }
  function axis(d){const ranges=d.records.flatMap(p=>[span(p.said_on),target(p,d),span(p.outcome_date)]).filter(x=>x&&Number.isFinite(x.start)&&Number.isFinite(x.end));const first=new Date(Math.min(...ranges.map(x=>x.start))).getUTCFullYear(),last=new Date(Math.max(...ranges.map(x=>x.end))-1).getUTCFullYear()+1;return{start:Date.UTC(first,0,1),end:Date.UTC(last,0,1),years:Array.from({length:last-first+1},(_,i)=>first+i)};}
  function preferences(value,d){
    value=value&&typeof value==='object'?value:{};const f=value.filters&&typeof value.filters==='object'?value.filters:{};
    return{saved:[...new Set(Array.isArray(value.saved)?value.saved:[])].filter(id=>d.records.some(p=>p.id===id)),filters:{company:d.companies.includes(f.company)?f.company:'',topic:d.topics.includes(f.topic)?f.topic:'',status:statuses.includes(f.status)?f.status:'',view:f.view==='timeline'?'timeline':'cards',sort:['recent','oldest','target','verified'].includes(f.sort)?f.sort:'recent'}};
  }
  function state(value,d){const p=preferences({filters:value},d).filters;return{...p,q:typeof value?.q==='string'?value.q.slice(0,120):'',savedOnly:value?.savedOnly===true,page:Number.isInteger(value?.page)&&value.page>0?value.page:1};}
  function filtered(d,value,saved=[]){
    const s=state(value,d),tokens=norm(s.q).split(' ').filter(Boolean);
    return d.records.filter(p=>(!s.company||p.company===s.company)&&(!s.topic||p.topic===s.topic)&&(!s.status||p.status===s.status)&&(!s.savedOnly||saved.includes(p.id))&&tokens.every(t=>norm([p.title,p.quote,p.person,p.company,p.topic,p.status,p.note,...p.evidence.map(x=>x.text),...p.revisions.map(x=>x.text)].join(' ')).includes(t))).sort((a,b)=>{
      if(s.sort==='target')return(target(a,d).end??Infinity)-(target(b,d).end??Infinity)||a.title.localeCompare(b.title);
      const field=s.sort==='verified'?'last_verified':'said_on',direction=s.sort==='oldest'?1:-1;
      return direction*((span(a[field])?.start||0)-(span(b[field])?.start||0))||a.title.localeCompare(b.title);
    });
  }
  function upcoming(d,now=Date.now()){return d.records.filter(p=>p.status==='In progress'&&target(p,d).end>now).sort((a,b)=>target(a,d).end-target(b,d).end||a.id.localeCompare(b.id)).slice(0,4);}
  function delivered(d){return d.records.filter(p=>p.outcome_date&&['Delivered','Delivered late'].includes(p.status)).sort((a,b)=>span(b.outcome_date).start-span(a.outcome_date).start).slice(0,4);}
  function share(value,id=''){const u=new URL('https://superchargeddaily.com/promise-tracker.html');for(const k of ['company','topic','status','q','view','sort'])if(value[k]&&!(k==='view'&&value[k]==='cards')&&!(k==='sort'&&value[k]==='recent'))u.searchParams.set(k,String(value[k]));u.hash=/^[a-z0-9][a-z0-9-]*$/.test(id)?id:'explore';return u.href;}
  function routes(topic){const map={'FSD / autonomy':['/autonomy.html','FSD & Robotaxi evidence','Understand supervision, regulatory layers and what the evidence establishes.'],'Robotaxi / Cybercab':['/cybercab.html','Cybercab tracker','Follow the reported fleet and commercial-operation context.'],Optimus:['/optimus.html','Optimus field guide','Explore demonstrations, engineering and the separate path to production.'],Roadster:['/roadster.html','Roadster studio','Explore the car, technology and reported programme milestones.'],Starship:['/starship.html','Starship flights','Read the flight records, objectives and phase-level assessments.'],Mars:['/starship.html','Starship flights','Explore the vehicle programme behind the Mars ambitions.'],Production:['/production.html','Production & deliveries','Compare official quarterly manufacturing and delivery records.'],'Grok / xAI':['/grok.html','Grok guide','Explore the site’s AI guide and learning resources.'],'AI compute':['/tsla.html','Markets desk','Read company reporting and the financial context behind capital investment.']};const r=map[topic];return r?{href:r[0],title:r[1],description:r[2]}:null;}
  return{statuses,esc,norm,statusClass,safeURL,span,date,normalize,target,counts,windowState,events,axis,preferences,state,filtered,upcoming,delivered,share,routes};
});
