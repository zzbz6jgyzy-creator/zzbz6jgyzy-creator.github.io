(() => {
  'use strict';
  const root=document.querySelector('[data-earth-preview]');if(!root)return;
  const $=id=>document.getElementById(id), canvas=$('earth-canvas');
  const managed=[...root.querySelectorAll('[data-earth-view],[data-earth-zoom],#earth-motion,#earth-reset,#earth-quality')];
  const dialogs=[$('earth-about-dialog'),$('earth-search-dialog')];
  let viewer,weather,ground,model,place,zoneAnchor,groundTarget,mode='earth',attempt=0,groundAttempt=0,wasPaused=false,clockTimer,dead=false;
  const viewLabels={live:'ILLUMINATION / RIGHT NOW',daylight:'DAY STUDY / ARTISTIC LIGHT',night:'NIGHT STUDY / ARTISTIC LIGHT'};
  const message=text=>{const n=$('earth-note');n.textContent=text;n.hidden=!text;};
  function paint(state={}){
    root.dataset.quality=state.quality||$('earth-quality').value;root.dataset.paused=String(!!state.paused);
    $('earth-motion').setAttribute('aria-pressed',String(!!state.paused));
    $('earth-motion').setAttribute('aria-label',state.paused?'Resume rotation':'Pause rotation');
    $('earth-motion-label').textContent=state.paused?'Play':'Pause';
    $('earth-pause-icon').toggleAttribute('hidden',!!state.paused);$('earth-play-icon').toggleAttribute('hidden',!state.paused);
    for(const b of root.querySelectorAll('[data-earth-view]'))b.setAttribute('aria-pressed',String(b.dataset.earthView===(state.view||'live')));
    $('earth-view-label').textContent=viewLabels[state.view]||viewLabels.live;
    $('earth-clock-label').textContent=state.view==='live'?'CURRENT SUNLIGHT':'ARTISTIC LIGHT';
    if(state.textureWidth)$('earth-resolution').textContent=Math.round(state.textureWidth/1024)+'K SURFACE DETAIL';
    if(state.quality)$('earth-quality').value=state.quality;
    if(state.detailMessage)message(state.detailMessage);
  }
  function clocks(){
    if(dead||document.hidden)return;
    const now=new Date();$('earth-utc').dateTime=now.toISOString();
    $('earth-utc').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now)+' UTC';
    if(!place||!model)return;
    const zone=place.timeZone||'UTC';
    $('earth-local').dateTime=now.toISOString();$('earth-local').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
    $('earth-local-label').textContent=place.timeZone?(place.deviceTime?'DEVICE TIME':'LOCAL TIME'):'UTC TIME';
    $('earth-place-sun').textContent=model.sunAt(place.lat,place.lon,now.getTime()).phase;
  }
  function renderPlace(){
    if(!place)return;
    $('earth-place-name').textContent=place.name;$('earth-place-country').textContent=place.country;
    $('earth-coordinates').textContent=model.coordinates(place.lat,place.lon);
    $('earth-place-eyebrow').textContent=mode==='ground'?'YOUR GROUND VIEW':'A PLACE TO EXPLORE';
    const url=model.satelliteURL(place.lat,place.lon);$('earth-satellite').href=url;$('ground-fallback-link').href=url;
    $('earth-change-place').textContent=mode==='ground'?'Choose somewhere else →':'Explore this place ↗';
    clocks();
  }
  function unavailable(){root.dataset.state='fallback';$('earth-fallback').hidden=false;managed.forEach(b=>b.disabled=true);}
  function weatherPaint(state){
    $('earth-weather-refresh').disabled=!!state.loading;$('earth-weather-refresh').setAttribute('aria-busy',String(!!state.loading));
    $('earth-weather').dataset.state=!state.available?'fallback':state.stale?'older':'available';
    $('earth-weather-label').textContent=state.loading?'Checking latest cloud image…':state.available?(state.refreshFailed?'Cloud refresh unavailable · previous image':state.stale?(state.at?'Older satellite cloud image':'Latest clouds · age not confirmed'):'Latest satellite clouds'):'Illustrative clouds · latest feed unavailable';
    if(state.at){const date=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(state.at));$('earth-weather-date').textContent=(state.stale?'Older image · ':'')+date+' UTC · '+state.label.toLowerCase();}
    else $('earth-weather-date').textContent=state.available?'Update time not supplied · source refreshes about every 3h':'Source refreshes about every 3h · tap ↻ to retry';
  }
  async function boot(){
    const token=++attempt;viewer?.dispose();weather?.dispose();viewer=null;weather=null;window.__earthPreview=null;
    root.dataset.state='loading';$('earth-fallback').hidden=true;managed.forEach(b=>b.disabled=true);message('');
    try{
      const {initEarth}=await import('/earth-renderer.js?v=20261029-live1');
      const result=await initEarth({canvas,view:'live',textureBase:'/assets/earth/',
        onStatus:s=>{if(token===attempt)$('earth-status').textContent=s;},
        onGroundRequest:point=>{if(mode!=='earth'||token!==attempt)return;place={...point,id:'point',name:'Your chosen place',country:model.coordinates(point.lat,point.lon),zoom:14.5,pitch:58};zoneAnchor=null;openGround();},
        onSelect:point=>{if(token!==attempt||mode!=='earth')return;place={...point,id:'point',name:'Your chosen place',country:model.coordinates(point.lat,point.lon),zoom:14.5,pitch:58};viewer.focusLocation(point.lat,point.lon);renderPlace();},
        onChange:state=>{if(token!==attempt)return;paint(state);if(viewer&&root.dataset.state==='fallback'&&state.ready&&!state.contextLost){root.dataset.state='ready';$('earth-fallback').hidden=true;managed.forEach(b=>b.disabled=false);}},
        onError:()=>{if(token===attempt)unavailable();},
      });
      if(token!==attempt||dead){result.dispose();return;}
      viewer=result;window.__earthPreview=result;if(!result.getState().ready)throw new Error('First frame unavailable');
      root.dataset.state='ready';$('earth-fallback').hidden=true;managed.forEach(b=>b.disabled=false);paint(viewer.getState());
      const module=await import('/earth-weather.js?v=20261029-live1');
      if(token!==attempt||dead)return;
      weather=module.createWeather({viewer,onChange:weatherPaint});window.__earthWeather=weather;
      if(mode==='ground')viewer.setActive(false);
    }catch{if(token===attempt&&!dead)unavailable();}
  }
  function groundPaint(state){
    if(dead)return;
    $('ground-terrain').setAttribute('aria-pressed',String(state.terrain));$('ground-buildings').setAttribute('aria-pressed',String(state.buildings));
    if(state.ready){root.dataset.groundState='ready';$('ground-fallback').hidden=true;}
    if(!place||!model)return;
    if(groundTarget){const distance=Math.hypot(state.lat-groundTarget.lat,model.longitude(state.lon-groundTarget.lon));if(distance>.001)return;place={...groundTarget,lat:state.lat,lon:state.lon};groundTarget=null;renderPlace();}
    const delta=Math.hypot(state.lat-place.lat,model.longitude(state.lon-place.lon)*Math.cos(state.lat*Math.PI/180));
    const moving=delta>.0001;
    if(moving){place={...place,lat:state.lat,lon:state.lon};const distanceFromZone=zoneAnchor?Math.hypot(state.lat-zoneAnchor.lat,model.longitude(state.lon-zoneAnchor.lon)*Math.cos(state.lat*Math.PI/180)):Infinity;if(distanceFromZone>.5){place.name='Your map view';place.country='Follow your curiosity';place.timeZone=null;}renderPlace();}
    $('ground-detail').textContent='ZOOM '+state.zoom.toFixed(1)+' / '+(Number.isFinite(state.elevation)?Math.round(state.elevation)+' M TERRAIN':'OPEN MAP');
  }
  async function openGround(){
    if(!place)return;
    const destination={...place,lat:model.clamp(place.lat,-85,85)};groundTarget=destination;
    mode='ground';root.dataset.mode=mode;root.dataset.groundState='loading';
    for(const b of root.querySelectorAll('[data-earth-mode]'))b.setAttribute('aria-pressed',String(b.dataset.earthMode===mode));
    $('earth-stage').hidden=true;$('ground-stage').hidden=false;
    root.querySelector('.earth-controls').hidden=true;root.querySelector('.ground-controls').hidden=false;
    $('earth-loading').hidden=true;$('earth-fallback').hidden=true;
    if(viewer){wasPaused=viewer.getState().paused;viewer.setActive(false);}
    renderPlace();
    if(ground){ground.resize();place={...destination};renderPlace();ground.flyTo(destination);if(ground.getState().ready)root.dataset.groundState='ready';return;}
    const token=++groundAttempt;$('ground-fallback').hidden=true;$('ground-status').textContent='Preparing the streets below…';
    try{
      if(!document.querySelector('[data-map-css]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/maplibre/6.16.0/maplibre-gl.css';css.dataset.mapCss='true';document.head.append(css);}
      const {createGround}=await import('/earth-ground.js?v=20261029-live1');
      if(dead||token!==groundAttempt)return;
      const result=await createGround({container:$('ground-map'),place:destination,onInteract:()=>{groundTarget=null;},onChange:groundPaint,onStatus:s=>{$('ground-status').textContent=s;},onError:s=>{if(dead||token!==groundAttempt)return;root.dataset.groundState='fallback';$('ground-error').textContent=s;$('ground-fallback').hidden=false;}});
      if(dead||token!==groundAttempt){result.dispose();return;}
      ground=result;window.__earthGround=ground;
    }catch{if(token===groundAttempt&&!dead){root.dataset.groundState='fallback';$('ground-error').textContent='The ground map could not start. Retry it, or explore this place in satellite imagery.';$('ground-fallback').hidden=false;}}
  }
  function openEarth(){
    mode='earth';root.dataset.mode=mode;$('earth-stage').hidden=false;$('ground-stage').hidden=true;
    root.querySelector('.earth-controls').hidden=false;root.querySelector('.ground-controls').hidden=true;$('earth-loading').hidden=false;
    for(const b of root.querySelectorAll('[data-earth-mode]'))b.setAttribute('aria-pressed',String(b.dataset.earthMode===mode));
    if(viewer){viewer.setActive(true);viewer.focusLocation(place.lat,place.lon);if(wasPaused)viewer.pause();}
    if(root.dataset.state==='fallback')$('earth-fallback').hidden=false;
    renderPlace();
  }
  function finder(){if(!model)return;$('earth-search-error').hidden=true;$('earth-search-dialog').showModal();}
  async function choose(next){place={...next};zoneAnchor=next.timeZone?{lat:next.lat,lon:next.lon}:null;for(const dialog of dialogs)dialog.close();renderPlace();viewer?.focusLocation(place.lat,place.lon);root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});await openGround();}
  for(const b of root.querySelectorAll('[data-earth-mode]'))b.addEventListener('click',()=>{if(b.dataset.earthMode===mode)return;b.dataset.earthMode==='ground'?openGround():openEarth();});
  $('earth-explore').addEventListener('click',finder);$('earth-change-place').addEventListener('click',()=>mode==='ground'?finder():openGround());$('earth-ground-open').addEventListener('click',openGround);
  $('ground-retry').addEventListener('click',()=>{groundAttempt++;ground?.dispose();ground=null;window.__earthGround=null;openGround();});
  $('ground-terrain').addEventListener('click',()=>ground?.setTerrain($('ground-terrain').getAttribute('aria-pressed')!=='true'));
  $('ground-buildings').addEventListener('click',()=>ground?.setBuildings($('ground-buildings').getAttribute('aria-pressed')!=='true'));
  $('ground-flat').addEventListener('click',()=>ground?.reset());
  for(const b of root.querySelectorAll('[data-place]'))b.addEventListener('click',()=>{const p=model?.PLACES.find(p=>p.id===b.dataset.place);if(p)choose(p);});
  $('earth-search-form').addEventListener('submit',e=>{e.preventDefault();const p=model?.parsePlace($('earth-search').value);if(p)choose(p);else{$('earth-search-error').textContent='Choose one of the featured places, or enter latitude, longitude (for example 51.5, -0.12).';$('earth-search-error').hidden=false;}});
  $('earth-locate').addEventListener('click',()=>{
    const button=$('earth-locate'),error=$('earth-search-error');
    if(!navigator.geolocation){error.textContent='Location is unavailable in this browser. Choose a place or enter coordinates.';error.hidden=false;return;}
    button.disabled=true;error.textContent='Waiting for your location permission…';error.hidden=false;
    navigator.geolocation.getCurrentPosition(p=>{button.disabled=false;if(dead)return;error.hidden=true;choose({id:'location',name:'Your location',country:'Your device location · approximate',lat:model.clamp(p.coords.latitude,-85,85),lon:p.coords.longitude,zoom:16,pitch:55,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,deviceTime:true});},e=>{button.disabled=false;error.textContent=e.code===1?'Location permission was declined. You can still choose a place or enter coordinates.':'Your location could not be found. Choose a place or enter coordinates instead.';error.hidden=false;},{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  });
  $('earth-motion').addEventListener('click',()=>viewer?.togglePause());$('earth-reset').addEventListener('click',()=>viewer?.reset());
  for(const b of root.querySelectorAll('[data-earth-view]'))b.addEventListener('click',()=>viewer?.setView(b.dataset.earthView));
  for(const b of root.querySelectorAll('[data-earth-zoom]'))b.addEventListener('click',()=>viewer?.zoomBy(b.dataset.earthZoom==='in'?.15:-.15));
  $('earth-quality').addEventListener('change',async()=>{if(!viewer)return;const quality=$('earth-quality');quality.disabled=true;message('Loading your selected surface detail…');try{await viewer.setQuality(quality.value);message('');paint(viewer.getState());weather?.refresh(quality.value);}finally{quality.disabled=false;}});
  $('earth-retry').addEventListener('click',boot);$('earth-weather-refresh').addEventListener('click',()=>weather?.refresh(viewer.getState().quality));
  $('earth-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else message('Fullscreen is not available in this browser. You can keep exploring here.');}catch{message('Your browser could not enter fullscreen. You can keep exploring here.');}});
  document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('earth-fullscreen').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');ground?.resize();});
  $('earth-about').addEventListener('click',()=>$('earth-about-dialog').showModal());
  for(const b of root.querySelectorAll('[data-close]'))b.addEventListener('click',() => $(b.dataset.close).close());
  for(const dialog of dialogs)dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  window.addEventListener('pagehide',()=>{dead=true;attempt++;groundAttempt++;clearInterval(clockTimer);weather?.dispose();viewer?.dispose();ground?.dispose();ground=null;});
  window.addEventListener('pageshow',event=>{if(event.persisted){dead=false;clockTimer=setInterval(clocks,1000);boot();if(mode==='ground')openGround();}});
  async function start(){
    try{model=await import('/earth-live-model.js?v=20261029-live1');place={...model.PLACES[1]};zoneAnchor={lat:place.lat,lon:place.lon};
      for(const p of model.PLACES){const b=document.createElement('button');b.type='button';const name=document.createElement('span'),country=document.createElement('small');name.textContent=p.name;country.textContent=p.country;b.append(name,country);b.addEventListener('click',()=>choose(p));$('earth-place-list').append(b);}
      renderPlace();clocks();clockTimer=setInterval(clocks,1000);
      await boot();
    }catch{unavailable();}
  }
  start();
})();
