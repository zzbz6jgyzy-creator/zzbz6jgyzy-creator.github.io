/* Geographic and solar calculations. All coordinates are WGS84 degrees, times UTC. */
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const radians=d=>d*Math.PI/180;
export const degrees=r=>r*180/Math.PI;
export const longitude=d=>(((d+180)%360)+360)%360-180;
export const PLACES=Object.freeze([
  {id:'starbase',name:'Starbase',country:'Texas · United States',lat:25.997,lon:-97.156,timeZone:'America/Chicago',zoom:15.2,pitch:56,kind:'launch',tag:'WHERE THE JOURNEY STARTS'},
  {id:'manhattan',name:'Manhattan',country:'New York · United States',lat:40.7485,lon:-73.9857,timeZone:'America/New_York',zoom:15.5,pitch:61,kind:'city',tag:'A CITY IN THREE DIMENSIONS'},
  {id:'alps',name:'The Matterhorn',country:'Alps · Switzerland',lat:45.9763,lon:7.6586,timeZone:'Europe/Zurich',zoom:12.5,pitch:66,kind:'mountain',tag:'FOLLOW THE CONTOURS'},
  {id:'dublin',name:'Dublin',country:'Ireland',lat:53.3464,lon:-6.2631,timeZone:'Europe/Dublin',zoom:15.5,pitch:55,kind:'city',tag:'AT THE EDGE OF THE ATLANTIC'},
  {id:'tokyo',name:'Tokyo',country:'Japan',lat:35.6586,lon:139.7454,timeZone:'Asia/Tokyo',zoom:15.2,pitch:60,kind:'city',tag:'A DIFFERENT SIDE OF THE DAY'},
  {id:'canaveral',name:'Cape Canaveral',country:'Florida · United States',lat:28.6084,lon:-80.6043,timeZone:'America/New_York',zoom:14.5,pitch:55,kind:'launch',tag:'THE SPACE COAST'},
  {id:'grandcanyon',name:'Grand Canyon',country:'Arizona · United States',lat:36.0982,lon:-112.1115,timeZone:'America/Phoenix',zoom:12.5,pitch:65,kind:'mountain',tag:'DEEP TIME, IN DETAIL'},
  {id:'london',name:'London',country:'United Kingdom',lat:51.5077,lon:-.1238,timeZone:'Europe/London',zoom:15.2,pitch:58,kind:'city',tag:'TRACE THE RIVER'},
  {id:'sydney',name:'Sydney',country:'Australia',lat:-33.8584,lon:151.2124,timeZone:'Australia/Sydney',zoom:14.7,pitch:58,kind:'city',tag:'THE HARBOUR BELOW'},
  {id:'dubai',name:'Dubai',country:'United Arab Emirates',lat:25.1972,lon:55.2744,timeZone:'Asia/Dubai',zoom:15,pitch:60,kind:'city',tag:'BETWEEN CITY AND DESERT'},
  {id:'singapore',name:'Singapore',country:'Singapore',lat:1.2845,lon:103.86,timeZone:'Asia/Singapore',zoom:15,pitch:58,kind:'city',tag:'A GARDEN AT THE EQUATOR'},
  {id:'paris',name:'Paris',country:'France',lat:48.8583,lon:2.2945,timeZone:'Europe/Paris',zoom:15.5,pitch:58,kind:'city',tag:'STREETS WITH A STORY'},
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
export function satelliteURL(lat,lon){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new TypeError('Invalid map coordinates.');
  const u=new URL('https://www.google.com/maps/@');u.search=new URLSearchParams({api:'1',map_action:'map',center:lat.toFixed(6)+','+lon.toFixed(6),zoom:'20',basemap:'satellite'}).toString();return u.href;
}
export function weatherAge(at,now=Date.now()){
  const time=Date.parse(at),age=(now-time)/60000;
  if(!Number.isFinite(time)||age< -10)return{valid:false,label:'Observation unavailable',stale:true};
  const minutes=Math.max(0,Math.round(age));return{valid:true,minutes,stale:minutes>720,label:minutes<1?'Image updated just now':minutes<60?'Image updated '+minutes+' min ago':'Image updated '+Math.floor(minutes/60)+'h '+(minutes%60)+'m ago'};
}
