/* Timestamped EUMETSAT WMS infrared composite. Cold-brightness is a cloud proxy,
 * not an exhaustive cloud classification or an instantaneous weather forecast. */
import {weatherAge} from './earth-live-model.js?v=20261029-cosmos1';
const ENDPOINT='https://view.eumetsat.int/geoserver/ows';
export const CLOUD_LAYER='mumi:worldcloudmap_ir108';
export function extractCloudFrame(xml,now=Date.now()){
 if(typeof xml!=='string'||xml.length>10000000)return null;
 const name=/<(?:[\w-]+:)?Name>\s*mumi:worldcloudmap_ir108\s*<\/(?:[\w-]+:)?Name>/.exec(xml);if(!name)return null;
 const tail=xml.slice(name.index).split(/<\/(?:[\w-]+:)?Layer>/,1)[0];
 const dims=[...tail.matchAll(/<(?:[\w-]+:)?Dimension\b([^>]*)>([^<]*)<\/(?:[\w-]+:)?Dimension>/g)];
 const d=dims.find(m=>/\bname\s*=\s*["']time["']/.test(m[1]));if(!d)return null;
 const def=/\bdefault\s*=\s*["']([^"']+)["']/.exec(d[1])?.[1];
 let time=def&&def!=='current'?Date.parse(def):NaN;
 if(!Number.isFinite(time)){const values=d[2].match(/\d{4}-\d\d-\d\dT[\d:.]+Z/g)||[];time=Math.max(...values.map(Date.parse).filter(Number.isFinite));}
 if(!Number.isFinite(time)||time>now+600000||now-time>3*86400000)return null;
 return new Date(time).toISOString();
}
export function cloudMapURL(at,width=2048){
 if(!Number.isFinite(Date.parse(at))||![1024,2048,4096].includes(width))throw new TypeError('A valid satellite frame and supported resolution are required.');
 const p=new URLSearchParams({service:'WMS',request:'GetMap',version:'1.3.0',layers:CLOUD_LAYER,styles:'',format:'image/png',crs:'EPSG:4326',bbox:'-90,-180,90,180',width:String(width),height:String(width/2),time:new Date(at).toISOString().replace('.000Z','Z')});
 return ENDPOINT+'?'+p;
}
export function createWeather({viewer,onChange=()=>{}}){
 let controller,disposed=false,busy=false,timer,currentWidth=0;
 let state={available:false,at:null,label:'Illustrative clouds · requesting satellite frame',stale:false,width:0,kind:'infrared'};
 const notify=()=>{if(!disposed)onChange({...state});};
 function widthFor(quality){return navigator.connection?.saveData?1024:['high','ultra','studio'].includes(quality)?4096:2048;}
 async function refresh(quality='auto'){
  if(disposed)return;const width=widthFor(quality);if(busy&&width===currentWidth)return;
  controller?.abort();controller=new AbortController();const own=controller;busy=true;currentWidth=width;if(!disposed)onChange({...state,loading:true});
  const timeout=setTimeout(()=>own.abort(),100000);
  const options={signal:own.signal,cache:'no-cache',credentials:'omit',referrerPolicy:'no-referrer'};
  try{
   const metadata=await fetch(ENDPOINT+'?service=WMS&request=GetCapabilities&version=1.3.0',options);if(!metadata.ok)throw new Error('Satellite metadata unavailable');
   const xml=await metadata.text(),at=extractCloudFrame(xml);if(!at)throw new Error('A current dated satellite frame is unavailable');
   if(state.available&&state.at===at&&state.width===width&&!state.refreshFailed){state={...state,checkedAt:new Date().toISOString(),stale:weatherAge(at).stale};return;}
   const response=await fetch(cloudMapURL(at,width),options);if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Invalid satellite frame');
   const blob=await response.blob();if(blob.size>30000000||blob.size<1000)throw new Error('Invalid satellite image size');
   if(disposed||own!==controller)return;
   const url=URL.createObjectURL(blob);try{await viewer.setWeatherTexture(url,at,{kind:'infrared'});}finally{URL.revokeObjectURL(url);}
   if(disposed||own!==controller)return;
   state={available:true,at,width,kind:'infrared',checkedAt:new Date().toISOString(),ageKnown:true,label:weatherAge(at).label,stale:weatherAge(at).stale};
  }catch(error){
   if(disposed||own!==controller)return;
   const reason=String(error?.message||'Satellite request failed');
   state=state.available?{...state,stale:true,refreshFailed:true,reason,label:'Satellite refresh unavailable · previous dated frame'}:{available:false,at:null,width:0,kind:'infrared',stale:true,reason,label:'Illustrative clouds · satellite feed unavailable'};
  }finally{clearTimeout(timeout);if(own===controller){busy=false;notify();}}
 }
 const visible=()=>{if(!document.hidden)refresh(viewer.getState().quality);};document.addEventListener('visibilitychange',visible);
 timer=setInterval(()=>{if(!document.hidden)refresh(viewer.getState().quality);},1800000);refresh(viewer.getState().quality);
 return{refresh,getState:()=>({...state}),dispose(){disposed=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);}};
}
