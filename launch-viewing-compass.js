/* Sensor maths are isolated so synthetic iOS/Android and orientation cases can be verified. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/launch-wmm2025.js'));else root.SDLaunchCompass=factory(root.SDLaunchWMM);})(typeof globalThis!=='undefined'?globalThis:this,function(W){
'use strict';const RAD=Math.PI/180,wrap=n=>(n%360+360)%360,delta=(to,from)=>(to-from+540)%360-180;
function sample(ev,screenAngle=0){
 const angle=Number.isFinite(screenAngle)?screenAngle:0,beta=Number.isFinite(ev.beta)?ev.beta:0,gamma=Number.isFinite(ev.gamma)?ev.gamma:0,tilted=Math.cos(beta*RAD)*Math.cos(gamma*RAD)<Math.cos(45*RAD);let magnetic,provider,accuracy=null;
 if(typeof ev.webkitCompassHeading==='number'){
  if(!Number.isFinite(ev.webkitCompassHeading)||ev.webkitCompassHeading<0||ev.webkitCompassHeading>=360||typeof ev.webkitCompassAccuracy==='number'&&(!Number.isFinite(ev.webkitCompassAccuracy)||ev.webkitCompassAccuracy<0))return null;
  magnetic=wrap(ev.webkitCompassHeading+angle);provider='iOS compass';accuracy=Number.isFinite(ev.webkitCompassAccuracy)?ev.webkitCompassAccuracy:null;
 }else{
  if(ev.absolute!==true||!Number.isFinite(ev.alpha)||ev.alpha<0||ev.alpha>=360)return null;
  const a=ev.alpha*RAD,b=beta*RAD,g=gamma*RAD,t=angle*RAD,x=Math.cos(g)*Math.sin(t),y=Math.cos(b)*Math.cos(t)+Math.sin(b)*Math.sin(g)*Math.sin(t),east=Math.cos(a)*x-Math.sin(a)*y,north=Math.sin(a)*x+Math.cos(a)*y;
  if(Math.hypot(east,north)<.1)return {magnetic:null,accuracy:null,tilted:true,provider:'Absolute orientation'};
  magnetic=wrap(Math.atan2(east,north)/RAD);provider='Absolute orientation';
 }
 return{magnetic,accuracy,tilted,provider};
}
function corrected(reading,place,now=Date.now()){
 if(!reading||!Number.isFinite(reading.magnetic)||!place)return null;
 const field=W?.field(place.lat,place.lon,new Date(now));
 if(!field||field.horizontal<6000)return null;
 return{heading:wrap(reading.magnetic+field.declination),declination:field.declination,accuracy:reading.accuracy,tilted:reading.tilted,provider:reading.provider};
}
const smooth=(previous,next,weight=.25)=>Number.isFinite(previous)?wrap(previous+delta(next,previous)*weight):wrap(next);
function turn(target,heading,tolerance=12){const d=delta(target,heading);return{degrees:Math.round(Math.abs(d)),aligned:Math.abs(d)<=tolerance,side:d<0?'left':'right',text:Math.abs(d)<=tolerance?'Facing the pad · approximately aligned':'Turn '+(d<0?'left':'right')+' about '+Math.round(Math.abs(d))+'°'};}
return{wrap,delta,sample,corrected,smooth,turn};
});
