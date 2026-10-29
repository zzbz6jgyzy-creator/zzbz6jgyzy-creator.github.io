/* Astronomical positions: Astronomy Engine 2.1.19 (MIT), EQJ / AU.
 * Galaxy morphology is a structural illustration, not a measured full stellar map. */
import * as A from './vendor/astronomy/astronomy.js';
export const AU=149597870.7,EARTH_RADIUS=6371,LY=9460730472580.8,PC=AU*206264.80624709636,KPC=1000*PC;
export const SUN_GALACTIC=[-8.2,0,.0208];
export const MAX_RANGE=240000*LY;
export const BODIES=Object.freeze([
 {id:'Sun',radius:695700,texture:'sun-2k.webp',color:'#fff0ca',description:'The star at the centre of our Solar System.'},
 {id:'Mercury',radius:2439.7,period:87.969,texture:'mercury-2k.webp',color:'#bdb5aa',description:'The smallest planet, closest to the Sun.'},
 {id:'Venus',radius:6051.8,period:224.701,texture:'venus-2k.webp',color:'#e9d5ac',description:'A rocky world wrapped in a dense atmosphere.'},
 {id:'Earth',radius:6371,period:365.256,texture:null,color:'#a9deef',description:'Our home. Current sunlight and the latest available clouds.'},
 {id:'Moon',radius:1737.4,period:27.322,texture:'moon-4k.webp',color:'#d8dcde',description:'Lunar Reconnaissance Orbiter surface imagery.'},
 {id:'Mars',radius:3389.5,period:686.98,texture:'mars-2k.webp',color:'#d59c7f',description:'A rocky planet with a thin atmosphere.'},
 {id:'Jupiter',radius:69911,period:4332.589,texture:'jupiter-2k.webp',color:'#d7b79e',description:'The largest planet in our Solar System.'},
 {id:'Saturn',radius:58232,period:10759.22,texture:'saturn-2k.webp',color:'#e5d4a8',description:'An immense gas giant, surrounded by rings.'},
 {id:'Uranus',radius:25362,period:30685.4,texture:'uranus-2k.webp',color:'#b2d8dc',description:'An ice giant whose rotation axis lies almost in its orbital plane.'},
 {id:'Neptune',radius:24622,period:60189,texture:'neptune-2k.webp',color:'#8eaac9',description:'The outermost of the eight planets.'},
]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const scale=(v,n)=>v.map(x=>x*n);
export const length=v=>Math.hypot(...v);
export const vec=v=>[v.x,v.y,v.z];
export function eqToGal(v,date=new Date()){return vec(A.RotateVector(A.Rotation_EQJ_GAL(),new A.Vector(...v,A.MakeTime(date))));}
export function galToEq(v,date=new Date()){return vec(A.RotateVector(A.Rotation_GAL_EQJ(),new A.Vector(...v,A.MakeTime(date))));}
export function earthAxes(date=new Date()){
 const time=A.MakeTime(date),rotation=A.Rotation_EQJ_EQD(time),theta=A.SiderealTime(time)*Math.PI/12;
 return [[1,0,0],[0,1,0],[0,0,1]].map(v=>{const e=A.RotateVector(rotation,new A.Vector(...v,time));return[e.x*Math.cos(theta)+e.y*Math.sin(theta),e.z,e.x*Math.sin(theta)-e.y*Math.cos(theta)];});
}
export function bodyAxes(id,date=new Date()){
 const a=A.RotationAxis(id,date),ra=a.ra*Math.PI/12,d=a.dec*Math.PI/180,w=a.spin*Math.PI/180;
 const ca=Math.cos(ra),sa=Math.sin(ra),cd=Math.cos(d),sd=Math.sin(d),cw=Math.cos(w),sw=Math.sin(w);
 const prime=[-sa*cw-ca*sd*sw,ca*cw-sa*sd*sw,cd*sw];
 const east=[sa*sw-ca*sd*cw,-ca*sw-sa*sd*cw,cd*cw];
 return[prime,[ca*cd,sa*cd,sd],east.map(x=>-x)];
}
export function ephemeris(date=new Date()){
 const earth=vec(A.HelioVector(A.Body.Earth,date)),positions={};
 for(const body of BODIES){let p;if(body.id==='Earth')p=[0,0,0];else if(body.id==='Moon')p=scale(vec(A.GeoMoon(date)),AU);else p=scale(sub(vec(A.HelioVector(body.id,date)),earth),AU);positions[body.id]=p;}
 return{at:date.toISOString(),earthHelio:scale(earth,AU),positions,moonPhase:A.MoonPhase(date),axes:earthAxes(date)};
}
export function orbit(id,date=new Date(),count=192){
 const b=BODIES.find(x=>x.id===id);if(!b?.period)return[];
 return Array.from({length:count+1},(_,i)=>{const t=new Date(date.getTime()+b.period*86400000*(i/count-.5));return scale(vec(A.HelioVector(id,t)),AU);});
}
export function levelFor(distance,focus='Earth'){
 if(focus!=='Earth'&&distance<BODIES.find(b=>b.id===focus)?.radius*120)return focus==='Moon'?'moon':'planet';
 if(focus==='Earth'&&distance<EARTH_RADIUS*50)return'earth';if(distance<AU*.15)return'lunar';if(distance<LY*.12)return'solar';if(distance<LY*500)return'neighbourhood';return'galaxy';
}
export function unitFor(distance){return distance<2e7?EARTH_RADIUS:distance<LY*.08?AU:distance<LY*800?LY:KPC;}
export function formatDistance(km){if(km<1e6)return new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(km)+' km';if(km<LY*.01)return(km/AU).toLocaleString('en-GB',{maximumFractionDigits:km/AU<10?2:0})+' AU';return(km/LY).toLocaleString('en-GB',{maximumFractionDigits:km/LY<10?2:0})+' light-years';}
export function scalePreset(id,fit=3.4){
 if(id==='earth')return{focus:'Earth',distance:fit*EARTH_RADIUS,level:'earth'};
 if(id==='moon')return{focus:'Moon',distance:6.5*1737.4,level:'moon'};
 if(id==='solar')return{focus:'Sun',distance:AU*95,level:'solar'};
 if(id==='galaxy')return{focus:'Galaxy',distance:KPC*60,level:'galaxy'};
 const b=BODIES.find(b=>b.id===id);if(b)return{focus:id,distance:b.radius*6.5,level:id==='Earth'?'earth':id==='Moon'?'moon':'planet'};
 throw new TypeError('Unknown cosmic destination');
}
export function galaxyPopulation(count=120000){
 let seed=731977;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-9,random())))*Math.cos(2*Math.PI*random());
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count);
 const bar=Math.PI-27*Math.PI/180;
 for(let i=0;i<count;i++){
  let x,y,z,r;const type=random(),arm=i%4;
  if(type<.20){const a=random()*Math.PI*2,rr=Math.pow(random(),.65)*2.7;x=rr*Math.cos(a)*1.35;y=rr*Math.sin(a)*.58;z=normal()*.28*Math.exp(-rr*.45);const xx=x;x=xx*Math.cos(bar)-y*Math.sin(bar);y=xx*Math.sin(bar)+y*Math.cos(bar);r=rr;}
  else if(type<.27){x=normal()*1.8;y=normal()*1.8;z=normal()*.85;r=Math.hypot(x,y);}
  else{r=3+Math.pow(random(),.8)*12.3;const a=bar+arm*Math.PI/2+Math.log(r/3.0)/Math.tan(.225)+normal()*(arm%2?.13:.065);x=r*Math.cos(a);y=r*Math.sin(a);z=normal()*(.055+r*.0045);if(random()<.2){const a=random()*Math.PI*2;x=r*Math.cos(a);y=r*Math.sin(a);}}
  positions.set([x,y,z],i*3);const core=Math.exp(-r/3.1),young=type>=.27&&random()>.48;
  const jitter=.7+random()*.3;colors.set([(young?.60:.97)*jitter,(young?.76:.83-core*.17)*jitter,(young?1:.68-core*.32)*jitter],i*3);
  sizes[i]=(type<.27?1.1:1.0)+Math.pow(random(),8)*3.0;
 }
 return{positions,colors,sizes,model:true,diameterLy:100000,sunGalactic:SUN_GALACTIC};
}
