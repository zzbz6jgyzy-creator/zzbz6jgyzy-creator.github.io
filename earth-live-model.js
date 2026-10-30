/* Geographic and solar calculations. All coordinates are WGS84 degrees, times UTC. */
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const radians=d=>d*Math.PI/180;
export const degrees=r=>r*180/Math.PI;
export const longitude=d=>(((d+180)%360)+360)%360-180;
export const PLACES=Object.freeze([
  {id:'starbase',name:'Starbase',country:'Texas · United States',lat:25.997,lon:-97.156,timeZone:'America/Chicago'},
  {id:'manhattan',name:'Manhattan',country:'New York · United States',lat:40.7485,lon:-73.9857,timeZone:'America/New_York'},
  {id:'alps',name:'The Matterhorn',country:'Alps · Switzerland',lat:45.9763,lon:7.6586,timeZone:'Europe/Zurich'},
  {id:'dublin',name:'Dublin',country:'Ireland',lat:53.3464,lon:-6.2631,timeZone:'Europe/Dublin'},
  {id:'tokyo',name:'Tokyo',country:'Japan',lat:35.6586,lon:139.7454,timeZone:'Asia/Tokyo'},
  {id:'canaveral',name:'Cape Canaveral',country:'Florida · United States',lat:28.6084,lon:-80.6043,timeZone:'America/New_York'},
  {id:'grandcanyon',name:'Grand Canyon',country:'Arizona · United States',lat:36.0982,lon:-112.1115,timeZone:'America/Phoenix'},
  {id:'london',name:'London',country:'United Kingdom',lat:51.5077,lon:-.1238,timeZone:'Europe/London'},
  {id:'sydney',name:'Sydney',country:'Australia',lat:-33.8584,lon:151.2124,timeZone:'Australia/Sydney'},
  {id:'dubai',name:'Dubai',country:'United Arab Emirates',lat:25.1972,lon:55.2744,timeZone:'Asia/Dubai'},
  {id:'singapore',name:'Singapore',country:'Singapore',lat:1.2845,lon:103.86,timeZone:'Asia/Singapore'},
  {id:'paris',name:'Paris',country:'France',lat:48.8583,lon:2.2945,timeZone:'Europe/Paris'},
]);

/** Low-order apparent solar position; sufficient for visual illumination, not navigation. */
export function solarPosition(value=Date.now()){
  const ms=value instanceof Date?value.getTime():Number(value);
  if(!Number.isFinite(ms))throw new TypeError('A valid time is required.');
  const jd=ms/86400000+2440587.5,n=jd-2451545,t=n/36525;
  const L=radians((280.46+.9856474*n)%360),g=radians((357.528+.9856003*n)%360);
  const lambda=L+radians(1.915)*Math.sin(g)+radians(.020)*Math.sin(2*g);
  const epsilon=radians(23.439-.0000004*n);
  const ra=Math.atan2(Math.cos(epsilon)*Math.sin(lambda),Math.cos(lambda));
  const lat=degrees(Math.asin(Math.sin(epsilon)*Math.sin(lambda)));
  const gmst=280.46061837+360.98564736629*n+.000387933*t*t-t*t*t/38710000;
  return{lat,lon:longitude(degrees(ra)-((gmst%360)+360)%360),at:new Date(ms).toISOString()};
}
export function geoVector(lat,lon){const a=radians(lat),b=radians(lon);return{x:Math.cos(a)*Math.cos(b),y:Math.sin(a),z:-Math.cos(a)*Math.sin(b)};}
export function vectorGeo({x,y,z}){const r=Math.hypot(x,y,z);if(!r)throw new TypeError('A geographic vector is required.');return{lat:degrees(Math.asin(clamp(y/r,-1,1))),lon:longitude(degrees(Math.atan2(-z,x)))};}
export function sunAt(lat,lon,time=Date.now()){
  const position=solarPosition(time),a=geoVector(lat,lon),b=geoVector(position.lat,position.lon);
  const elevation=degrees(Math.asin(clamp(a.x*b.x+a.y*b.y+a.z*b.z,-1,1)));
  return{elevation,phase:elevation>=0?'Daylight':elevation>=-6?'Twilight':'Night'};
}
export function coordinates(lat,lon,precision=2){return Math.abs(lat).toFixed(precision)+'° '+(lat<0?'S':'N')+' / '+Math.abs(lon).toFixed(precision)+'° '+(lon<0?'W':'E');}
export function parsePlace(text){
  const input=String(text||'').trim();const preset=PLACES.find(p=>p.name.toLowerCase()===input.toLowerCase()||p.id===input.toLowerCase());if(preset)return{...preset};
  const m=input.match(/^([+-]?\d+(?:\.\d+)?)\s*[,;]\s*([+-]?\d+(?:\.\d+)?)$/);
  if(m&&Number.isFinite(+m[1])&&Number.isFinite(+m[2])&&Math.abs(+m[1])<=85&&Math.abs(+m[2])<=180)return{id:'point',name:'Your chosen place',country:coordinates(+m[1],+m[2]),lat:+m[1],lon:+m[2],zoom:15,pitch:55,kind:'point'};
  return null;
}
export function weatherAge(at,now=Date.now()){
  const time=Date.parse(at),age=(now-time)/60000;
  if(!Number.isFinite(time)||age< -10)return{valid:false,label:'Observation unavailable',stale:true};
  const minutes=Math.max(0,Math.round(age));return{valid:true,minutes,stale:minutes>720,label:minutes<1?'Image updated just now':minutes<60?'Image updated '+minutes+' min ago':'Image updated '+Math.floor(minutes/60)+'h '+(minutes%60)+'m ago'};
}
