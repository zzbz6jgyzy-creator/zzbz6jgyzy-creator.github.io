(function(root){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function validate(d){
  if(d?.schema!==1||!/^\d{4}-\d{2}-\d{2}$/.test(d.reviewed)||d.configs?.length!==3||d.tech?.length!==6||d.gallery?.length<10)throw Error('Invalid Roadster editorial data');
  const ids=d.sources.map(s=>s.id);if(new Set(ids).size!==ids.length||d.sources.some(s=>!/^https:\/\//.test(s.url)))throw Error('Invalid source ledger');
  for(const items of [d.tech,d.gallery,d.configs])if(new Set(items.map(x=>x.id)).size!==items.length)throw Error('Duplicate identifiers');
  if(d.demonstration.seconds<=0||d.configs.some(c=>c.accel<=0||!Number.isSafeInteger(c.seats)))throw Error('Invalid performance data');
  if(d.film.chapters.some((c,i,a)=>c.start<0||c.start>=d.film.duration||(i&&c.start<=a[i-1].start)))throw Error('Invalid film chapters');
  for(const x of [...d.tech,...d.gallery])if(!ids.includes(x.source))throw Error('Missing evidence source');
  return d;
 }
 const mphToKmh=mph=>mph*1.609344;
 function physics(seconds){if(!Number.isFinite(seconds)||seconds<=0)throw Error('Invalid elapsed time');const speed=60*.44704;return{speed,acceleration:speed/seconds,g:speed/seconds/9.80665,distance:speed*seconds/2};}
 const stamp=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
 const api={esc,validate,physics,mphToKmh,stamp};root.RoadsterStudio=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
