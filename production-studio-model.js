/* Shared calculations for the saved page and browser. No market estimates. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SDProductionModel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const fields=['production','deliveries','model3yProduction','model3yDeliveries','otherProduction','otherDeliveries','energyGwh'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(n,dec=0)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:dec});
const signed=(n,dec=0)=>(n>0?'+':n<0?'−':'')+num(Math.abs(n),dec);
const pct=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b>0?(a-b)/b*100:null;
const percent=v=>v===null?'Not available':signed(v,1)+'%';
const date=v=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z'));
const source=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['ir.tesla.com','assets-ir.tesla.com'].includes(x.hostname)&&!x.username&&!x.password;}catch{return false;}};
function validate(data,editorial){
 if(!data||!Array.isArray(data.quarters)||!data.quarters.length||!/^\d{4}-\d{2}-\d{2}$/.test(data.updated))throw Error('Missing production data');
 const ids=new Set();let prev='';
 for(const q of data.quarters){
  const m=/^Q([1-4]) (\d{4})$/.exec(q.id||'');
  if(!m||ids.has(q.id)||!source(q.sourceUrl)||fields.some(k=>!Number.isFinite(q[k])||q[k]<0)||fields.filter(k=>k!=='energyGwh').some(k=>!Number.isInteger(q[k])))throw Error('Invalid quarter '+q.id);
  const end=new Date(Date.UTC(+m[2],+m[1]*3,0)).toISOString().slice(0,10);
  if(q.periodEnd!==end||q.periodEnd<=prev||!/^\d{4}-\d{2}-\d{2}$/.test(q.published)||q.published<=q.periodEnd)throw Error('Invalid period '+q.id);
  if(q.model3yProduction+q.otherProduction!==q.production||q.model3yDeliveries+q.otherDeliveries!==q.deliveries)throw Error('Reported groups do not sum '+q.id);
  ids.add(q.id);prev=q.periodEnd;
 }
 for(const a of data.annualTotals||[]){const qs=data.quarters.filter(q=>q.id.endsWith(' '+a.year));if(qs.length!==4||!source(a.sourceUrl)||['production','deliveries'].some(k=>qs.reduce((s,q)=>s+q[k],0)!==a[k])||!Number.isFinite(a.energyGwh)||a.energyGwh<0)throw Error('Invalid annual total');}
 if(editorial){if(editorial.version!==1||!source(editorial.factorySource)||!Array.isArray(editorial.factories)||!editorial.factories.length)throw Error('Invalid factory catalogue');const known=new Set();for(const f of editorial.factories){if(!/^[a-z]+$/.test(f.id)||known.has(f.id)||!Number.isFinite(f.x)||!Number.isFinite(f.y)||f.x<0||f.x>100||f.y<0||f.y>100||!f.lines.length)throw Error('Invalid factory');known.add(f.id);}}
 return data;
}
const gap=q=>q.deliveries-q.production;
const prior=(qs,q,kind='year')=>{const i=qs.findIndex(x=>x.id===q.id);return kind==='quarter'?(i>0&&Date.parse(q.periodEnd)-Date.parse(qs[i-1].periodEnd)<100*86400000?qs[i-1]:null):qs.find(x=>x.id===q.id.slice(0,3)+(Number(q.id.slice(3))-1))||null;};
function annual(data){return [...new Set(data.quarters.map(q=>q.id.slice(3)))].map(year=>{
 const qs=data.quarters.filter(q=>q.id.endsWith(' '+year)),complete=qs.length===4,official=(data.annualTotals||[]).find(a=>a.year===+year);
 const sum=k=>qs.reduce((s,q)=>s+q[k],0);
 return {id:year+(complete?'':' YTD'),year:+year,count:qs.length,complete,production:sum('production'),deliveries:sum('deliveries'),energyGwh:official?official.energyGwh:Math.round(sum('energyGwh')*1000)/1000,sourceUrl:official?.sourceUrl||qs.at(-1).sourceUrl,periodEnd:qs.at(-1).periodEnd,energyBasis:official?'Published full-year total':'Sum of available quarters',coverage:qs.map(q=>q.id.slice(0,2)).join('–')};
 });}
function yearContext(data,q){const year=+q.id.slice(3),count=+q.id[1],qs=data.quarters.filter(x=>x.id.endsWith(' '+year)&&+x.id[1]<=count),ps=data.quarters.filter(x=>x.id.endsWith(' '+(year-1))&&+x.id[1]<=count);return {year,count,deliveries:qs.reduce((s,x)=>s+x.deliveries,0),production:qs.reduce((s,x)=>s+x.production,0),yoy:qs.length===count&&ps.length===count?pct(qs.reduce((s,x)=>s+x.deliveries,0),ps.reduce((s,x)=>s+x.deliveries,0)):null};}
function series(data,{group='quarter',range='all'}={}){let rows=group==='year'?annual(data):data.quarters;return range==='all'?rows:rows.slice(-Number(range));}
function preferences(x,data,editorial){x=x&&typeof x==='object'?x:{};return{quarter:data.quarters.some(q=>q.id===x.quarter)?x.quarter:data.quarters.at(-1).id,metric:['vehicles','energy','gap'].includes(x.metric)?x.metric:'vehicles',group:x.group==='year'?'year':'quarter',range:['4','8','all'].includes(x.range)?x.range:'all',factory:editorial.factories.some(f=>f.id===x.factory)?x.factory:'texas'};}
function comparison(qs,from,to){const a=qs.find(q=>q.id===from)||qs.at(-1),b=qs.find(q=>q.id===to)||qs.at(-1);return{a,b,values:['deliveries','production','energyGwh'].map(k=>({key:k,a:a[k],b:b[k],delta:b[k]-a[k],pct:pct(b[k],a[k])})),gapA:gap(a),gapB:gap(b)};}
function next(data,editorial,now=Date.now()){const q=data.quarters.at(-1),n=+q.id[1],year=+q.id.slice(3)+(n===4?1:0),quarter=n===4?1:n+1,id='Q'+quarter+' '+year,end=new Date(Date.UTC(year,quarter*3,0)).toISOString().slice(0,10),entry=editorial.nextRelease;return{quarter:id,periodEnd:end,published:entry?.quarter===id?entry.published:null,sourceUrl:entry?.quarter===id&&source(entry.sourceUrl)?entry.sourceUrl:'https://ir.tesla.com/',awaiting:now>Date.parse(end)+45*86400000};}
function csv(data){const keys=['id','periodEnd','published',...fields,'sourceUrl'];const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return keys.map(cell).join(',')+'\r\n'+data.quarters.map(q=>keys.map(k=>cell(q[k])).join(',')).join('\r\n')+'\r\n';}
return{fields,esc,num,signed,pct,percent,date,source,validate,gap,prior,annual,yearContext,series,preferences,comparison,next,csv};
});
