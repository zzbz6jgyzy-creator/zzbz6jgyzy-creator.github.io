(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./spacex-studio-model.js'));else root.SpaceXStudioView=factory(root.SpaceXStudio);})(typeof window==='object'?window:globalThis,function(M){
  'use strict';
  const e=M.esc;
  const arrow='<svg class="sx-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
  function picture(base,alt,{hero=false,widths=[480,960,1600],ratio=[1600,900],sizes='(max-width:760px) 100vw, 600px'}={}) {
    return `<picture><source type="image/avif" srcset="${widths.map(w=>base+'-'+w+'w.avif '+w+'w').join(', ')}" sizes="${sizes}"/><img src="${base+'-'+widths[1]+'w.webp'}" srcset="${widths.map(w=>base+'-'+w+'w.webp '+w+'w').join(', ')}" sizes="${sizes}" alt="${e(alt)}" width="${ratio[0]}" height="${ratio[1]}" ${hero?'fetchpriority="high"':'loading="lazy"'} decoding="async"/></picture>`;
  }
  function reference(d,id){const s=d.sources.find(s=>s.id===id);return `<a class="sx-source" href="${e(s.url)}" target="_blank" rel="noopener">${e(s.name)} ${arrow}</a>`;}
  function launch(event, now, zone='UTC',saved=[]) {
    const group=M.family(event), precision=event.precision, source=event.sources?.find(s=>M.safeURL(s.href))?.href||event.href;
    return `<article class="sx-launch" data-sx-launch="${e(event.id)}"><div class="sx-launch-mark" aria-hidden="true">${{dragon:'DR',starship:'SS',heavy:'FH',falcon9:'F9'}[group]}</div><div class="sx-launch-copy"><div class="sx-launch-tags"><span>${e(event.status||'Target')}</span><span>${e(precision==='datetime'?'Launch window':precision==='day'?'Day target':precision==='unknown'?'Awaiting a date':precision+' target')}</span></div><h3>${e(event.title.replace('Falcon 9 Block 5 | ','Falcon 9 · '))}</h3><p class="sx-launch-date">${e(M.date(event,zone))}</p><p>${e(event.where||'Location not established in the shared record')}</p><p class="sx-fine">${e(event.note||'Check the linked schedule for changes.')}</p><div class="sx-launch-links">${source?`<a href="${e(source)}" target="_blank" rel="noopener">Schedule source ${arrow}</a>`:'<a href="/starship.html">Flight planning context →</a>'}<a href="/calendar.html">Full calendar →</a></div></div><button class="sx-save sx-interactive" type="button" data-sx-save="${e(event.id)}" aria-pressed="${saved.includes(event.id)}" aria-label="${saved.includes(event.id)?'Unsave':'Save'} ${e(event.title)}">${saved.includes(event.id)?'Saved ✓':'Save +'}</button></article>`;
  }
  function launches(d,now,filter='all',zone='UTC',saved=[],onlySaved=false) {
    const items=M.upcoming(d.events,now,filter).filter(x=>!onlySaved||saved.includes(x.id)).slice(0,5);
    return items.length?items.map(x=>launch(x,now,zone,saved)).join(''):'<div class="sx-empty"><h3>No matching upcoming records.</h3><p>Try another filter or open the full calendar. An elapsed schedule is not confirmation that a mission launched.</p><a href="/calendar.html">Open the calendar →</a></div>';
  }
  function next(d,now,zone='UTC') {
    const event=M.upcoming(d.events,now).find(x=>x.precision==='datetime');
    if(!event)return '<p class="sx-kicker">The launch board</p><strong>Keep looking up.</strong><p>No future timed opening remains in this saved schedule. Check the calendar for the latest record.</p><a href="#launches">Explore planning targets →</a>';
    return `<p class="sx-kicker">Next timed opening / shared calendar</p><strong>${e(event.title.replace('Falcon 9 Block 5 | ','Falcon 9 · '))}</strong><p>${e(M.date(event,zone))}</p><p class="sx-countdown">${e(M.countdown(event,now))}</p><a href="#launches">See the mission board ${arrow}</a>`;
  }
  function program(d,id) {
    const p=d.programs.find(p=>p.id===id)||d.programs[0];
    return `<div class="sx-program-copy"><p class="sx-kicker">${e(p.role)}</p><h3>${e(p.name)}</h3><p class="sx-program-tag">${e(p.tag)}</p>${p.paragraphs.map(t=>`<p>${e(t)}</p>`).join('')}<a class="sx-primary" href="${p.href}">${p.id==='starlink'?'Explore the observatory':p.id==='starship'?'Open the flight lab':p.id==='dragon'?'Read the reporting':'Explore upcoming missions'} ${arrow}</a>${reference(d,p.source)}</div><div class="sx-program-specs"><div class="sx-program-art">${craft(p.id)}<span>Editorial schematic / not to scale</span></div><dl>${[['Architecture',p.architecture],['Reference detail',p.headline],['Core system',p.system],['Recovery / reuse',p.reuse]].map(([k,v])=>`<div><dt>${k}</dt><dd>${e(v)}</dd></div>`).join('')}</dl></div>`;
  }
  function craft(id) {
    const common='fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"';
    let shape;
    if(id==='starlink')shape='<g transform="translate(170 150) rotate(-22)"><path d="M-48-18H48V18H-48Z" fill="currentColor" fill-opacity=".1"/><path d="M-155-38H-58V38H-155ZM58-38H155V38H58ZM-128-38V38M-100-38V38M-73-38V38M75-38V38M103-38V38M130-38V38M-155-12H-58M-155 12H-58M58-12H155M58 12H155M-20 18L-30 50M20 18L30 50"/></g><ellipse cx="170" cy="150" rx="155" ry="88" stroke-dasharray="3 9" opacity=".25"/>';
    else if(id==='dragon')shape='<path d="M100 168Q110 73 170 50Q230 73 240 168L220 210H120Z" fill="currentColor" fill-opacity=".08"/><path d="M120 210H220L230 248H110ZM133 104H207M143 105L140 129H200L197 105M110 168H230M149 55H191M145 210V248M170 210V248M195 210V248"/><path d="M110 168Q170 189 230 168"/>';
    else {const heavy=id==='heavy',star=id==='starship';shape=`<path d="M151 250V83Q153 50 170 28Q187 50 189 83V250Z" fill="currentColor" fill-opacity=".08"/><path d="M151 150H189M151 98H189M150 223L130 250H151M190 223L210 250H189M157 250L151 268H189L183 250M160 85H180"/>${heavy?'<path d="M111 250V112Q115 86 129 75Q143 86 147 112V250ZM193 250V112Q197 86 211 75Q225 86 229 112V250ZM110 250L103 268H155L148 250M193 250L186 268H237L230 250"/>':''}${star?'<path d="M151 89L133 114H151M189 89L207 114H189M151 196H189M157 105V190M183 105V190"/>':''}`;}
    return `<svg viewBox="0 0 340 300" role="img" aria-label="${e(id==='falcon9'?'Falcon 9':id)} conceptual illustration"><g ${common}>${shape}</g></svg>`;
  }
  function story(a) {
    const base=a.image.replace(/\.(jpg|jpeg|png|webp)$/i,''),fallback=a.image;
    // The data builder selects existing derivatives; do not invent image variants.
    const image=a.picture?picture(a.picture.base,a.title,{widths:a.picture.widths,ratio:a.picture.ratio}):`<picture><img src="${e(fallback)}" alt="${e(a.title)}" width="1200" height="675" loading="lazy" decoding="async"/></picture>`;
    return `<article class="sx-story" data-sx-story="${M.topic(a)}"><a class="sx-story-photo" href="${e(a.url)}">${image}</a><div><p class="sx-kicker">${e(a.tag||'SpaceX')} / <time datetime="${e(a.date)}">${e(a.date.slice(0,10))}</time></p><h3><a href="${e(a.url)}">${e(a.title)}</a></h3><p>${e(a.summary)}</p><a class="sx-text-link" href="${e(a.url)}">Read the story ${arrow}</a></div></article>`;
  }
  return {arrow,picture,reference,launches,next,program,craft,story};
});
