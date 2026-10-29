/* Public EUMETSAT-derived cloud maps, served with CORS by Live Cloud Maps (CC0).
 * Last-Modified is publication time, not a single global observation time.
 */
import {weatherAge} from './earth-live-model.js?v=20261029-live1';
const ORIGIN='https://clouds.matteason.co.uk';
export function createWeather({viewer,onChange=()=>{}}){
  let controller,disposed=false,busy=false,timer,previous=null,currentWidth=0;
  let state={available:false,at:null,label:'Loading latest clouds…',stale:false,width:0};
  const notify=()=>{if(!disposed)onChange({...state});};
  function notifyLoading(){if(!disposed)onChange({...state,loading:true});}
  function widthFor(quality){const max=viewer.getState().maxTextureSize;return Math.min(max,navigator.connection?.saveData?1024:quality==='ultra'&&!navigator.connection?.saveData?8192:quality==='high'||(innerWidth>=800&&!navigator.connection?.saveData)?4096:2048);}
  async function refresh(quality='auto'){
    if(disposed)return;
    const width=widthFor(quality);
    if(busy&&width===currentWidth)return;
    controller?.abort();controller=new AbortController();const own=controller;
    busy=true;currentWidth=width;notifyLoading();
    const timeout=setTimeout(()=>own.abort(),18000);
    try{
      const response=await fetch(ORIGIN+'/images/'+width+'x'+(width/2)+'/clouds.jpg',{signal:own.signal,cache:'no-cache',credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Invalid cloud response');
      const modified=response.headers.get('last-modified');
      const time=modified?Date.parse(modified):NaN;
      // Reject impossible dates and very old maps; never silently call them current.
      if(Number.isFinite(time)&&(time>Date.now()+600000||Date.now()-time>86400000*3))throw new Error('Cloud image date is not current');
      const blob=await response.blob();
      if(blob.size>16000000||blob.size<1000)throw new Error('Invalid cloud image size');
      if(disposed||own!==controller)return;
      const url=URL.createObjectURL(blob);
      try{await viewer.setWeatherTexture(url,Number.isFinite(time)?new Date(time).toISOString():null);}finally{URL.revokeObjectURL(url);}
      if(disposed||own!==controller)return;
      previous=Number.isFinite(time)?new Date(time).toISOString():null;
      state={available:true,at:previous,width,label:previous?weatherAge(previous).label:'Latest clouds · update time unavailable',stale:previous?weatherAge(previous).stale:true};
    }catch(error){
      if(disposed||own!==controller)return;
      if(state.available){state={...state,stale:true,refreshFailed:true,label:'Cloud refresh unavailable · showing previous image'};}
      else state={available:false,at:null,width:0,stale:true,label:'Illustrative clouds · latest feed unavailable'};
    }finally{clearTimeout(timeout);if(own===controller){busy=false;notify();}}
  }
  function tick(){if(disposed||document.hidden)return;if(state.available&&previous){const age=weatherAge(previous);state={...state,label:age.label,stale:age.stale||state.refreshFailed};notify();}}
  const visibility=()=>{if(!document.hidden){tick();if(!busy)refresh(viewer.getState().quality);}};
  document.addEventListener('visibilitychange',visibility);
  timer=setInterval(()=>{tick();if(!document.hidden)refresh(viewer.getState().quality);},1800000);
  refresh(viewer.getState().quality);
  return{refresh,getState:()=>({...state}),dispose(){disposed=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visibility);}};
}
