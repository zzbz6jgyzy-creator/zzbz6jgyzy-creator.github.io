/* Isolated replay bootstrap; no account, analytics or third-party runtime calls. */
(() => {
  'use strict';
  const root=document.querySelector('[data-flight-replay]');if(!root)return;
  const $=id=>document.getElementById(id);
  let viewer,model,playing=false,speed='tour',tour=0,time=0,raf=0,last=0,uiLast=0,lastChapter='',autoCamera=true,booting=false,disposed=false;
  const controls=[...root.querySelectorAll('[data-camera],#play,#restart,#timeline,#speed,#quality,#watch,#reset-view')];
  const showFailure=error=>{playing=false;cancelAnimationFrame(raf);raf=0;root.dataset.state='fallback';$('fallback').hidden=false;$('fallback-message').textContent=error?.message||'The graphics could not start on this device. Explore the mission summary and sources below.';controls.forEach(c=>c.disabled=true);updatePlay();};
  function updatePlay(){
    $('play').setAttribute('aria-label',playing?'Pause replay':'Play replay');
    $('play-icon').toggleAttribute('hidden',playing);$('pause-icon').toggleAttribute('hidden',!playing);
  }
  function updateUI(){
    if(!model)return;const s=model.sampleFlight(time),v=viewer?.getState();
    $('scene-clock').textContent=model.clock(time);$('transport-clock').textContent=model.clock(time);
    $('timeline').value=String(Math.round(time));$('timeline').style.setProperty('--progress',(time/model.FLIGHT.duration*100)+'%');
    $('timeline').setAttribute('aria-valuetext',model.clock(time)+', '+s.chapter.short);
    const booster=v?.camera==='booster';
    $('vehicle-name').textContent=booster?'SUPER HEAVY / B21':s.separated?'STARSHIP / S41':'FULL STACK / B21 + S41';
    $('phase-label').textContent=booster&&s.boosterLanded?'BOOSTER SPLASHDOWN':s.shipLanded?'SHIP SPLASHDOWN':s.chapter.short.toUpperCase();
    $('altitude-value').textContent=Math.round(booster?s.boosterAltitude:s.shipAltitude).toLocaleString('en');
    $('altitude-kind').textContent=booster?'KM · MODELLED BOOSTER':'KM · INTERPOLATED SHIP';
    $('payload-value').replaceChildren(document.createTextNode(String(s.deployed)),Object.assign(document.createElement('span'),{textContent:'/26'}));
    if(lastChapter!==s.chapter.id){
      lastChapter=s.chapter.id;
      $('chapter-kicker').textContent=s.chapter.kicker;$('chapter-title').textContent=s.chapter.title;$('chapter-text').textContent=s.chapter.text;
      for(const button of $('chapters').children)button.setAttribute('aria-current',String(button.dataset.chapter===s.chapter.id));
      if(autoCamera&&viewer){viewer.setCamera(s.chapter.camera);updateCamera();}
    }
    $('watch').hidden=time>2||playing;
    if(v){$('resolution').textContent=(v.textureWidth>=8192?'8K':v.textureWidth>=4096?'4K':'2K')+' NASA EARTH · ORIGINAL 3D VEHICLES';$('detail-note').hidden=!v.detail;$('detail-note').textContent=v.detail;}
    $('playback-note').textContent=playing?(speed==='tour'?'Guided cut · mission time advances between key moments.':speed+'× mission time · choose any chapter to pause and inspect.'):'Paused · choose a chapter or press play to explore.';
    updatePlay();
  }
  function updateCamera(){const current=viewer?.getState().camera;for(const b of root.querySelectorAll('[data-camera]'))b.setAttribute('aria-pressed',String(b.dataset.camera===current));}
  function pause(){playing=false;if(raf)cancelAnimationFrame(raf);raf=0;last=0;updateUI();}
  function tourAt(t){let lo=0,hi=150;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(model.cinematicTime(mid)<t)lo=mid;else hi=mid;}return(lo+hi)/2;}
  function seek(t){pause();time=model.clamp(Number(t)||0,0,model.FLIGHT.duration);tour=tourAt(time);lastChapter='';viewer?.setTime(time);updateUI();}
  function frame(now){
    raf=0;if(!playing||disposed||document.hidden)return;
    const dt=last?Math.min((now-last)/1000,.12):0;last=now;
    if(speed==='tour'){tour=Math.min(150,tour+dt);time=model.cinematicTime(tour);}else{time=Math.min(model.FLIGHT.duration,time+dt*Number(speed));tour=tourAt(time);}
    // At most 30 rendered frames per second; keep UI updates lighter.
    if(now-uiLast>=33){viewer?.setTime(time);updateUI();uiLast=now;}
    if(time>=model.FLIGHT.duration){time=model.FLIGHT.duration;playing=false;viewer?.setTime(time);updateUI();return;}
    raf=requestAnimationFrame(frame);
  }
  function play(){if(!viewer||root.dataset.state!=='ready')return;if(time>=model.FLIGHT.duration){time=0;tour=0;lastChapter='';}playing=true;last=0;uiLast=0;updateUI();raf=requestAnimationFrame(frame);}
  function jump(chapter){seek(chapter.t);autoCamera=false;viewer?.setCamera(chapter.camera);updateCamera();updateUI();}
  function expose(){window.__starshipReplay={getState:()=>({...viewer.getState(),playing,speed,tour}),seek,jump:id=>{const c=model.CHAPTERS.find(c=>c.id===id);if(c)jump(c);},play,pause,setCamera:value=>{autoCamera=false;viewer.setCamera(value);updateCamera();updateUI();}};}
  async function boot(){
    if(booting)return;booting=true;disposed=false;root.dataset.state='loading';$('fallback').hidden=true;$('load-status').textContent='Preparing the flight…';
    try{
      [model]=await Promise.all([import('/starship-replay-model.js')]);
      if(!$('chapters').children.length)for(const[cIndex,c]of model.CHAPTERS.entries()){
        const b=document.createElement('button');b.type='button';b.className='chapter';b.dataset.chapter=c.id;b.setAttribute('aria-current',String(cIndex===0));b.setAttribute('aria-label','Jump to '+c.short+', approximately '+model.clock(c.t));
        for(const[cls,value]of[['chapter-no',String(cIndex+1).padStart(2,'0')+' /'],['chapter-name',c.short],['chapter-time','~ '+model.clock(c.t)]]){const span=document.createElement('span');span.className=cls;span.textContent=value;b.append(span);}
        b.addEventListener('click',()=>{jump(c);root.querySelector('.viewer').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});$('chapters').append(b);
      }
      const renderer=await import('/starship-replay-renderer.js');
      if(disposed)return;
      viewer=await renderer.initReplay({canvas:$('flight-canvas'),onStatus:text=>$('load-status').textContent=text,onError:showFailure,onChange:()=>{updateCamera();updateUI();}});
      if(disposed){viewer.dispose();viewer=null;return;}
      root.dataset.state='ready';controls.forEach(c=>c.disabled=false);viewer.setTime(time);updateUI();expose();
    }catch(e){showFailure(e);}finally{booting=false;}
  }
  $('play').addEventListener('click',()=>playing?pause():play());
  $('watch').addEventListener('click',()=>{seek(0);speed='tour';$('speed').value='tour';autoCamera=true;lastChapter='';play();});
  $('restart').addEventListener('click',()=>{autoCamera=true;seek(0);viewer?.setCamera('cinema');updateCamera();});
  $('timeline').addEventListener('input',e=>{autoCamera=false;seek(e.target.value);});
  $('speed').addEventListener('change',e=>{speed=e.target.value;tour=tourAt(time);updateUI();});
  for(const b of root.querySelectorAll('[data-camera]'))b.addEventListener('click',()=>{autoCamera=false;viewer?.setCamera(b.dataset.camera);updateCamera();updateUI();});
  $('quality').addEventListener('change',async e=>{const select=e.target;select.disabled=true;try{await viewer?.setQuality(select.value);updateUI();}catch{$('detail-note').hidden=false;$('detail-note').textContent='Higher detail could not load. The existing imagery is still available.';}finally{if(root.dataset.state==='ready')select.disabled=false;}});
  $('reset-view').addEventListener('click',()=>viewer?.resetView());
  $('flight-canvas').addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();playing?pause():play();}});
  $('retry').addEventListener('click',()=>{if(viewer?.getState().contextLost){location.reload();return;}viewer?.dispose();viewer=null;boot();});
  const dialog=$('about');let opener;
  for(const id of ['sources','keyboard-help'])$(id).addEventListener('click',()=>{opener=$(id);dialog.showModal();});
  for(const id of ['close-about','done-about'])$(id).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else{$('detail-note').hidden=false;$('detail-note').textContent='Fullscreen is not available in this browser. The replay remains fully interactive.';}}catch{$('detail-note').hidden=false;$('detail-note').textContent='Fullscreen could not start in this browser.';}});
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&playing)pause();}).observe($('flight-canvas'));
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches)pause();});
  window.addEventListener('pagehide',()=>{pause();disposed=true;viewer?.dispose();viewer=null;delete window.__starshipReplay;});
  window.addEventListener('pageshow',e=>{if(e.persisted&&!viewer)boot();});
  boot();
})();
