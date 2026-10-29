import assert from 'node:assert/strict';
import {createWeather,extractCloudFrame,cloudMapURL} from '../earth-weather.js';
Object.defineProperty(globalThis,'navigator',{value:{connection:{saveData:false}},configurable:true});globalThis.innerWidth=1440;globalThis.document=Object.assign(new EventTarget(),{hidden:false});
const now=Date.now(),frame=new Date(now-3*3600000).toISOString();
const xml=at=>'<WMS_Capabilities><Layer><Name>mumi:worldcloudmap_ir108</Name><Dimension name="time" default="'+at+'">2021-06-06T00:00:00Z/'+at+'/PT3H</Dimension></Layer></WMS_Capabilities>';
assert.equal(extractCloudFrame(xml(frame),now),frame);assert.equal(extractCloudFrame(xml(new Date(now+3600000).toISOString()),now),null);assert.equal(extractCloudFrame(xml(new Date(now-4*86400000).toISOString()),now),null);assert.equal(extractCloudFrame('<ServiceException>unavailable</ServiceException>'),null);
const url=new URL(cloudMapURL(frame,2048));assert.equal(url.searchParams.get('time'),frame.replace('.000Z','Z'));assert.equal(url.searchParams.get('crs'),'EPSG:4326');assert.equal(url.searchParams.get('bbox'),'-90,-180,90,180');assert.throws(()=>cloudMapURL('bad'));assert.throws(()=>cloudMapURL(frame,8192));
const viewer={getState:()=>({quality:'auto',maxTextureSize:8192}),setWeatherTexture:async(url,at,meta)=>{assert.ok(url.startsWith('blob:'));assert.equal(meta.kind,'infrared');viewer.at=at;}};
let metadata=xml(frame),fail=false;const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');if(fail)throw new Error('Provider unavailable');if(url.includes('GetCapabilities'))return new Response(metadata,{headers:{'content-type':'text/xml'}});assert.equal(new URL(url).hostname,'view.eumetsat.int');return new Response(new Uint8Array(2048),{headers:{'content-type':'image/png'}});};
async function start(){let weather;const state=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Weather did not settle')),2000);weather=createWeather({viewer,onChange:s=>{if(!s.loading){clearTimeout(timer);resolve(s);}}});});return{weather,state};}
try{
 let t=await start();assert.equal(t.state.available,true);assert.equal(t.state.at,frame);assert.equal(t.state.ageKnown,true);assert.equal(t.state.kind,'infrared');assert.ok(t.state.checkedAt);fail=true;await t.weather.refresh();assert.equal(t.weather.getState().available,true);assert.equal(t.weather.getState().at,frame);assert.equal(t.weather.getState().refreshFailed,true);t.weather.dispose();
 fail=false;metadata='<WMS_Capabilities><Layer><Name>mumi:worldcloudmap_ir108</Name></Layer></WMS_Capabilities>';t=await start();assert.equal(t.state.available,false);assert.ok(t.state.label.startsWith('Illustrative'));t.weather.dispose();
 console.log('Dated satellite frames, pinned WMS request, missing/future/stale rejection and failed-refresh preservation verified.');
}finally{globalThis.fetch=original;}
