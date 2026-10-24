/* Pure validation and calculations. No remote vehicle access. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SDGarage=api;})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';
 const KEY='sd-my-tesla-garage-v2',LEGACY='sd-my-tesla-v1',MI=1.609344,models={3:2017,Y:2020,S:2012,X:2015,CT:2023};
 const text=(x,max=80)=>typeof x==='string'?x.trim().slice(0,max):'';
 const num=(x,min,max)=>x===null||x===''||x===undefined?null:typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max?x:null;
 const today=(now=new Date())=>[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 function date(x){if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return '';const d=new Date(x+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===x?x:'';}
 const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'g'+Date.now().toString(36)+Math.random().toString(36).slice(2);
 const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(x);
 function car(input={}){
  if(!Object.hasOwn(models,input.model))throw Error('Choose a supported Tesla model.');
  if(!Number.isInteger(input.year)||input.year<models[input.model]||input.year>new Date().getFullYear()+1)throw Error('Choose the original model year.');
  const c={id:validId(input.id)?input.id:id(),model:input.model,year:input.year,name:text(input.name,40),trim:text(input.trim),cc:/^[A-Z]{2}$/.test(input.cc||'')?input.cc:'',unit:input.unit==='mi'?'mi':'km',currency:['USD','EUR','GBP','CAD','AUD','NZD','CHF','NOK','SEK','DKK','CNY','JPY','KRW','AED','SGD','INR','OTHER'].includes(input.currency)?input.currency:'EUR',hw:['hw1','hw2','hw25','hw3','hw4','none'].includes(input.hw)?input.hw:'',sw:/^\d{4}\.\d{1,3}(?:\.\d{1,4}){0,2}$/.test(input.sw||'')?input.sw:'',battery:['LFP','NCA/NCM','other'].includes(input.battery)?input.battery:'',wheels:text(input.wheels,40),drive:['RWD','AWD'].includes(input.drive)?input.drive:'',accelTest:input.accelTest==='0-60 mph'?'0-60 mph':'0-100 km/h',specReference:text(input.specReference,160),epaId:/^\d{1,7}$/.test(input.epaId||'')?input.epaId:'',rating:['EPA','WLTP','CLTC','OTHER'].includes(input.rating)?input.rating:'WLTP',rangeSource:text(input.rangeSource,160),delivery:date(input.delivery),createdAt:date(input.createdAt)||today(),updatedAt:date(input.updatedAt)||today(),snapshotAt:date(input.snapshotAt)||date(input.createdAt)||today(),note:text(input.note,400)};
  for(const [key,max]of Object.entries({odoKm:3000000,soc:100,usableKwh:250,ratedRangeKm:2000,homeRate:100,acKw:50,acEfficiency:100,accelerationSec:60,topSpeedKmh:500,powerKw:2000}))c[key]=num(input[key],0,max);
  if(c.acEfficiency!==null&&c.acEfficiency<50)c.acEfficiency=null;
  c.charges=(Array.isArray(input.charges)?input.charges:[]).slice(0,500).map(r=>({id:validId(r.id)?r.id:id(),date:date(r.date),energy:num(r.energy,.01,500),cost:num(r.cost,0,100000),kind:['home','public','supercharger','other'].includes(r.kind)?r.kind:'other'})).filter(r=>r.date&&r.energy!==null);
  c.drives=(Array.isArray(input.drives)?input.drives:[]).slice(0,500).map(r=>({id:validId(r.id)?r.id:id(),date:date(r.date),km:num(r.km,.01,10000),kwh:num(r.kwh,.01,1000)})).filter(r=>r.date&&r.km!==null&&r.kwh!==null);
  c.care=(Array.isArray(input.care)?input.care:[]).slice(0,100).map(r=>({id:validId(r.id)?r.id:id(),title:text(r.title,100),dueDate:date(r.dueDate),dueKm:num(r.dueKm,0,3000000),doneAt:date(r.doneAt)})).filter(r=>r.title&&(r.dueDate||r.dueKm!==null));
  for(const list of [c.charges,c.drives,c.care]){const seen=new Set();for(const r of list){if(seen.has(r.id))r.id=id();seen.add(r.id);}}
  if(c.cc!=='US')c.epaId='';return c;
 }
 function document(input){if(!input||input.schema!==2||!Array.isArray(input.cars)||input.cars.length>5)throw Error('This is not a supported My Tesla backup.');const cars=input.cars.map(car),ids=new Set(cars.map(c=>c.id));if(ids.size!==cars.length)throw Error('Duplicate car IDs.');return{schema:2,activeId:ids.has(input.activeId)?input.activeId:cars[0]?.id||'',cars};}
 const empty=()=>({schema:2,activeId:'',cars:[]});
 function migrate(input){if(!input||!Object.hasOwn(models,input.model)||!Number.isInteger(Number(input.year)))return empty();try{const c=car({...input,year:Number(input.year),unit:['US','GB'].includes(input.cc)?'mi':'km',currency:input.cc==='US'?'USD':input.cc==='GB'?'GBP':'EUR',hw:''});return{schema:2,activeId:c.id,cars:[c]};}catch{return empty();}}
 function parse(s){if(typeof s!=='string'||s.length>2097152)throw Error('Backup is too large or unreadable.');return document(JSON.parse(s));}
 const active=d=>d.cars.find(c=>c.id===d.activeId)||d.cars[0]||null;
 const fromDistance=(v,unit)=>unit==='mi'?v*MI:v;
 const distance=(km,unit)=>unit==='mi'?km/MI:km;
 const consumption=(km,kwh,unit)=>km>0?kwh/(unit==='mi'?km/MI:km)*1000:null;
 function stats(c,days=30,now=new Date()){
  const end=today(now),cut=new Date(now);cut.setDate(cut.getDate()-days+1);const start=days?today(cut):'0000-01-01',eligible=r=>r.date>=start&&r.date<=end;
  const drives=c.drives.filter(eligible),charges=c.charges.filter(eligible),km=drives.reduce((n,r)=>n+r.km,0),kwh=drives.reduce((n,r)=>n+r.kwh,0),energy=charges.reduce((n,r)=>n+r.energy,0),priced=charges.filter(r=>r.cost!==null),cost=priced.reduce((n,r)=>n+r.cost,0),pricedEnergy=priced.reduce((n,r)=>n+r.energy,0);
  return{drives,charges,km,kwh,energy,cost,priced:priced.length,unpriced:charges.length-priced.length,averageRate:pricedEnergy?cost/pricedEnergy:null,wh:km?consumption(km,kwh,c.unit):null,whKm:km?kwh/km*1000:null,homeEnergy:charges.filter(r=>r.kind==='home').reduce((n,r)=>n+r.energy,0)};
 }
 function epa(c,data){return c.cc==='US'&&(data?.vehicles||[]).find(r=>r.id===c.epaId&&r.model===c.model&&r.year===c.year)||null;}
 function spec(c,data){const r=epa(c,data);return c.ratedRangeKm!==null&&c.ratedRangeKm>0?{km:c.ratedRangeKm,label:c.rating,source:'Owner-entered rating',url:null}:r?{km:r.rangeMiles*MI,label:'EPA',source:'EPA certification',url:'https://www.fueleconomy.gov/feg/noframes/'+r.id+'.shtml'}:null;}
 function chargePlan({capacity,from,to,power,efficiency,rate}){if(![capacity,from,to,power,efficiency].every(x=>typeof x==='number'&&Number.isFinite(x))||capacity<=0||capacity>250||from<0||to>100||to<=from||power<=0||power>50||efficiency<50||efficiency>100)return null;const battery=capacity*(to-from)/100,wall=battery/(efficiency/100);return{battery,wall,hours:wall/power,cost:typeof rate==='number'&&rate>=0?wall*rate:null};}
 function journey({km,whKm,capacity,start,reserve,rate,efficiency,petrolLitres,petrolPrice}){
  if(![km,whKm].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0))return null;const energy=km*whKm/1000,wall=typeof efficiency==='number'&&efficiency>=50&&efficiency<=100?energy/(efficiency/100):null,cost=wall!==null&&typeof rate==='number'&&rate>=0?wall*rate:null,petrol=typeof petrolLitres==='number'&&petrolLitres>0&&typeof petrolPrice==='number'&&petrolPrice>=0?km/100*petrolLitres*petrolPrice:null,usable=typeof capacity==='number'&&capacity>0&&typeof start==='number'&&start>=0&&start<=100&&typeof reserve==='number'&&reserve>=0&&reserve<=start?capacity*(start-reserve)/100:null;
  return{energy,wall,cost,petrol,difference:cost!==null&&petrol!==null?petrol-cost:null,remaining:usable===null?null:usable-energy};
 }
 function due(item,c,now=new Date()){if(item.doneAt)return'completed';if(item.dueDate&&item.dueDate<=today(now)||item.dueKm!==null&&c.odoKm!==null&&item.dueKm<=c.odoKm)return'due';const soon=new Date(now);soon.setDate(soon.getDate()+30);return item.dueDate&&item.dueDate<=today(soon)||item.dueKm!==null&&c.odoKm!==null&&item.dueKm-c.odoKm<=1000?'soon':'planned';}
 function version(a,b){const x=String(a||'').split('.').map(Number),y=String(b||'').split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const n=(x[i]||0)-(y[i]||0);if(n)return n;}return 0;}
 return{KEY,LEGACY,MI,models,text,num,today,date,id,car,document,empty,migrate,parse,active,distance,fromDistance,consumption,stats,epa,spec,chargePlan,journey,due,version};
});
