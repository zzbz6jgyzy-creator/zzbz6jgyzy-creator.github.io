(function (root) {
  'use strict';
  const GEN = [
    ['v10','V1.0','#94a3b8','The original production generation','A single solar-array wing and flat spacecraft bus. Early and later batches differ; laser capability must not be inferred from this label alone.'],
    ['v15','V1.5','#c4cbd5','The laser-linked successor','A later first-generation design associated with the expansion of inter-satellite optical links. Hardware generation is separate from orbital status.'],
    ['v2m','V2 Mini','#efb783','Second-generation hardware, Falcon 9 sized','A larger bus and two solar-array wings. The Mini name distinguishes it from the much larger Starship-class design.'],
    ['v2opt','V2 Mini Optimized','#fc526d','The later Mini bus','GCAT distinguishes this hardware bus from the original Mini. The count here follows that classification, rather than grouping every Gen 2 satellite together.'],
    ['v2dtc','Direct to Cell','#77dcfa','A cellular payload in orbit','These spacecraft add a cellular payload. A satellite overhead does not establish local mobile-service availability: partner, device and regulatory conditions still apply.'],
    ['v3','V3','#d5c2ff','The Starship-class generation','Tracked separately in McDowell’s catalogue. Launched, in orbit, working and in an operational shell remain distinct milestones.']
  ];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => Number(n).toLocaleString('en-US');
  const day = s => new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  function validateLaunch(L) {
    if (!L || typeof L!=='object') throw Error('Invalid latest launch');
    if (!L.id || !L.name || !Number.isFinite(Date.parse(L.liftoff))) throw Error('Invalid latest launch identity');
    if (!Number.isSafeInteger(L.satellites) || L.satellites<1) throw Error('Invalid latest launch satellite count');
    if (L.boosterFlight!=null && (!Number.isSafeInteger(L.boosterFlight) || L.boosterFlight<1)) throw Error('Invalid booster flight number');
    if (L.checked && !Number.isFinite(Date.parse(L.checked))) throw Error('Invalid latest launch checked date');
    if (!Array.isArray(L.sources) || !L.sources.length || L.sources.some(s=>!s || typeof s.href!=='string' || !s.href.startsWith('https://') || !s.label)) throw Error('Latest launch missing sources');
    return L;
  }
  function validate(d) {
    if (!d || d.schema !== 1 || !Number.isFinite(Date.parse(d.countsAt)) || !Number.isFinite(Date.parse(d.orbits.latest))) throw Error('Invalid Starlink snapshot dates');
    for (const key of ['launched','inOrbit','working','operational','down','failedToOrbit']) if (!Number.isSafeInteger(d.totals[key]) || d.totals[key]<0) throw Error('Invalid count: '+key);
    if (d.totals.launched-d.totals.down!==d.totals.inOrbit || d.totals.working>d.totals.inOrbit || d.totals.operational>d.totals.working) throw Error('Inconsistent constellation counts');
    for (const key of ['launched','inOrbit','working']) if (d.generations.reduce((n,g)=>n+g[key],0)+(d.other?.[key]||0)!==d.totals[key]) throw Error('Generation reconciliation: '+key);
    if (!Number.isSafeInteger(d.orbits.count) || d.orbits.count<1 || !Array.isArray(d.history) || d.history.some((h,i,a)=>!Number.isFinite(Date.parse(h.updated)) || (i && h.updated<=a[i-1].updated))) throw Error('Invalid orbit/history data');
    if (d.latestLaunch) validateLaunch(d.latestLaunch);
    return d;
  }
  function launchPending(d) {
    return !!(d.latestLaunch && Number.isFinite(Date.parse(d.latestLaunch.liftoff)) && Date.parse(d.latestLaunch.liftoff) > Date.parse(d.countsAt));
  }
  function freshness(stamp, now=Date.now(), hours=48) {
    const age=(now-Date.parse(stamp))/3600000;
    return !Number.isFinite(age)||age < -2?'unverified':age>hours?'older snapshot':'dated snapshot';
  }
  function safeCSV(rows) {return rows.map(r=>r.map(x=>'"'+String(x??'').replace(/^[=+@\-]/,'\t$&').replace(/"/g,'""')+'"').join(',')).join('\r\n');}
  function project(lon,lat,rotation=0,tilt=18) {
    const r=Math.PI/180,l=(lon+rotation)*r,p=lat*r,t=tilt*r;
    const x=Math.cos(p)*Math.sin(l),y=Math.sin(p)*Math.cos(t)-Math.cos(p)*Math.cos(l)*Math.sin(t),z=Math.sin(p)*Math.sin(t)+Math.cos(p)*Math.cos(l)*Math.cos(t);
    return {x,y,z};
  }
  const api={GEN,esc,fmt,day,validate,validateLaunch,launchPending,freshness,safeCSV,project};
  root.SDStarlink=api;
  if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
