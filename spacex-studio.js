(() => {
  'use strict';
  const root=document.querySelector('.sx-studio'), M=window.SpaceXStudio, V=window.SpaceXStudioView;
  if(!root||!M||!V)return;
  const $=id=>document.getElementById(id);
  let data;
  try {data=M.validate(JSON.parse($('sx-data').textContent));} catch {return;}
  root.dataset.enhanced='true';
  const storageKey='sd-spacex-desk-v1';
  let state=M.clean({pins:['starship','starlink']},data), storage=true;
  try {const raw=localStorage.getItem(storageKey); if(raw)state=M.clean(JSON.parse(raw),data);} catch {storage=false;}
  let launchFilter='all', storyFilter='all', savedOnly=false, zone='UTC';
  const message=text=>$('sx-message').textContent=text;
  function persist(){
    try {localStorage.setItem(storageKey,JSON.stringify(state));storage=true;message('Saved in this browser.');}
    catch {storage=false;message('Storage is unavailable. Your choices will last while this page stays open.');}
  }
  function drawPins(){
    $('sx-pins').innerHTML=state.pins.length?state.pins.map(id=>{const t=data.tools.find(t=>t.id===id);return `<a href="${t.href}">${M.esc(t.name)} ${V.arrow}</a>`;}).join(''):'<p>Pin a tool below to keep your own SpaceX desk here.</p>';
    document.querySelectorAll('[data-sx-pin]').forEach(b=>{const yes=state.pins.includes(b.dataset.sxPin);b.setAttribute('aria-pressed',String(yes));b.textContent=yes?'Pinned ✓':'Pin to my desk +';});
  }
  function drawLaunches(){
    const now=Date.now();
    $('sx-launch-list').innerHTML=V.launches(data,now,launchFilter,zone,state.saved,savedOnly);
    $('sx-next').innerHTML=V.next(data,now,zone);
    const count=M.upcoming(data.events,now,launchFilter).filter(e=>!savedOnly||state.saved.includes(e.id)).length;
    $('sx-launch-count').textContent=Math.min(5,count)+' matching records shown'+(count>5?' · more in the calendar':'');
    $('sx-saved').textContent='Saved launches ('+state.saved.length+')';
    const age=now-Date.parse(data.scheduleAsOf);
    $('sx-age').textContent=age>48*3600000?'This saved schedule is over 48 hours old. Check the source for changes.':'Dates are targets and can change. A reached window is not a launch confirmation.';
  }
  root.addEventListener('click',event=>{
    const pin=event.target.closest('[data-sx-pin]');
    if(pin){const id=pin.dataset.sxPin;state.pins=state.pins.includes(id)?state.pins.filter(x=>x!==id):[...state.pins,id];persist();drawPins();}
    const save=event.target.closest('[data-sx-save]');
    if(save){const id=save.dataset.sxSave;if(!state.saved.includes(id)&&state.saved.length>=30){message('Your watchlist has 30 launches. Remove one before adding another.');return;}state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];persist();drawLaunches();const fresh=root.querySelector('[data-sx-save="'+id+'"]');fresh?.focus({preventScroll:true});}
  });
  document.querySelectorAll('[data-sx-filter]').forEach(b=>b.onclick=()=>{
    launchFilter=b.dataset.sxFilter;
    document.querySelectorAll('[data-sx-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    drawLaunches();
  });
  $('sx-zone').onchange=()=>{zone=$('sx-zone').value;drawLaunches();};
  $('sx-saved').onclick=()=>{savedOnly=!savedOnly;$('sx-saved').setAttribute('aria-pressed',String(savedOnly));drawLaunches();};
  $('sx-clear-saved').onclick=()=>{state.saved=[];savedOnly=false;$('sx-saved').setAttribute('aria-pressed','false');persist();drawLaunches();};
  const programmeButtons=[...root.querySelectorAll('[data-sx-program]')];
  function selectProgram(id){
    root.querySelectorAll('[data-sx-program-panel]').forEach(p=>p.hidden=p.dataset.sxProgramPanel!==id);
    programmeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sxProgram===id)));
  }
  function keys(buttons,select){buttons.forEach((b,i)=>b.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(i+1)%buttons.length;
    if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(i-1+buttons.length)%buttons.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=buttons.length-1;
    if(next===undefined)return;event.preventDefault();buttons[next].focus();select(buttons[next]);
  }));}
  programmeButtons.forEach(b=>b.onclick=()=>selectProgram(b.dataset.sxProgram));
  keys(programmeButtons,b=>selectProgram(b.dataset.sxProgram));selectProgram('falcon9');
  const steps=[...root.querySelectorAll('[data-sx-step]')];
  function selectStep(id){
    root.querySelectorAll('[data-sx-step-panel]').forEach(p=>p.hidden=p.dataset.sxStepPanel!==id);
    steps.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sxStep===id)));
    $('sx-flight-art').dataset.stage=id;
  }
  steps.forEach(b=>b.onclick=()=>selectStep(b.dataset.sxStep));keys(steps,b=>selectStep(b.dataset.sxStep));selectStep('launch');
  function filterStories(){
    let count=0;
    root.querySelectorAll('[data-sx-story]').forEach(a=>{a.hidden=storyFilter!=='all'&&a.dataset.sxStory!==storyFilter;if(!a.hidden)count++;});
    $('sx-story-count').textContent=count+' stories in this collection';$('sx-stories-empty').hidden=count!==0;
  }
  root.querySelectorAll('[data-sx-topic]').forEach(b=>b.onclick=()=>{storyFilter=b.dataset.sxTopic;root.querySelectorAll('[data-sx-topic]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));filterStories();});
  const video=$('sx-film');
  video.muted=true;
  const filmError=()=>{$('sx-film-status').textContent='This clip could not load. Open the original SpaceX reference below.';};
  video.addEventListener('error',filmError);
  video.querySelectorAll('source').forEach(s=>s.addEventListener('error',filmError));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!video.paused)video.pause();});
  if('IntersectionObserver'in window){
    new IntersectionObserver(items=>{if(!items[0].isIntersecting&&!video.paused)video.pause();},{threshold:.05}).observe(video);
    const links=[...root.querySelectorAll('.sx-nav a')];
    const observer=new IntersectionObserver(items=>{for(const entry of items)if(entry.isIntersecting)links.forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});},{rootMargin:'-140px 0px -55% 0px'});
    ['launches','fleet','engineering','stories'].forEach(id=>observer.observe($(id)));
  }
  window.addEventListener('storage',event=>{if(event.key!==storageKey)return;try{state=M.clean(JSON.parse(event.newValue||'{}'),data);drawPins();drawLaunches();message('Your SpaceX desk was updated in another tab.');}catch{}});
  drawPins();drawLaunches();filterStories();
  if(!storage)message('Storage is unavailable. You can still use the page.');
  // Only the displayed schedule changes; no time-based outcome is invented.
  setInterval(()=>{if(!document.hidden)drawLaunches();},60000);
})();
