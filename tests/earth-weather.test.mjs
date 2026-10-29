import assert from 'node:assert/strict';
import {createWeather} from '../earth-weather.js';
Object.defineProperty(globalThis,'navigator',{value:{connection:{saveData:false}},configurable:true});
globalThis.innerWidth=1440;
globalThis.document=Object.assign(new EventTarget(),{hidden:false});
const originalFetch=globalThis.fetch;
const now=Date.now();
const viewer={getState:()=>({maxTextureSize:8192,quality:'auto'}),setWeatherTexture:async(url,at)=>{assert.ok(url.startsWith('blob:'));viewer.at=at;viewer.applied++;},applied:0};
let response;
globalThis.fetch=async(url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.ok(url.startsWith('https://clouds.matteason.co.uk/images/'));if(response instanceof Error)throw response;return new Response(new Uint8Array(2048),{headers:response});};
async function result(headers){response=headers;let weather;const state=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Weather fixture did not settle')),2000);weather=createWeather({viewer,onChange:s=>{if(!s.loading){clearTimeout(timer);resolve(s);}}});});return{weather,state};}
try{
  let test=await result({'content-type':'image/jpeg','last-modified':new Date(now-3*3600000).toUTCString()});assert.equal(test.state.available,true);assert.equal(test.state.stale,false);const previous=test.state.at;
  response=new Error('Provider unavailable');await test.weather.refresh();assert.equal(test.weather.getState().available,true);assert.equal(test.weather.getState().at,previous);assert.equal(test.weather.getState().refreshFailed,true);test.weather.dispose();
  test=await result({'content-type':'image/jpeg'});assert.equal(test.state.available,true);assert.equal(test.state.at,null);assert.equal(test.state.stale,true);assert.ok(test.state.label.includes('time unavailable'));test.weather.dispose();
  for(const date of [new Date(now+2*3600000),new Date(now-4*86400000)]){test=await result({'content-type':'image/jpeg','last-modified':date.toUTCString()});assert.equal(test.state.available,false);assert.ok(test.state.label.startsWith('Illustrative'));test.weather.dispose();}
  test=await result({'content-type':'text/html'});assert.equal(test.state.available,false);test.weather.dispose();
  console.log('Cloud publication dates, unknown timestamp, failed refresh, future/stale rejection and content validation passed.');
}finally{globalThis.fetch=originalFetch;}
