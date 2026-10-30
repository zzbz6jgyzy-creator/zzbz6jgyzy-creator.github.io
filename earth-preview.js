(() => {
  'use strict';
  const root=document.querySelector('[data-earth-preview]');if(!root)return;
  const $=id=>document.getElementById(id), canvas=$('earth-canvas');
  const managed=[...root.querySelectorAll('[data-earth-view],[data-earth-zoom],#earth-motion,#earth-reset,#earth-quality,#earth-time-live,#earth-time-reverse,[data-earth-speed],#earth-time-when,#earth-time-solar,#earth-time-lunar')];
  const dialogs=[$('earth-about-dialog'),$('earth-search-dialog'),$('cosmos-places-dialog'),$('earth-panel')];
  let weatherState=null,cosmicModel,cosmicKey='',lastScene='earth',lastDetail='',lastWeatherKey='',noteTimer,focusTimer,liveTimer,distanceText='',firstCosmic=true;const labels=new Map();
  const world=$('earth-world'),intro=$('earth-intro'),panel=$('earth-panel'),menuButton=$('earth-menu'),hud=$('earth-hud');
  const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let viewer,weather,model,place,attempt=0,clockTimer,dead=false;
  const viewLabels={live:'ILLUMINATION / RIGHT NOW',daylight:'DAY STUDY / ARTISTIC LIGHT',night:'NIGHT STUDY / ARTISTIC LIGHT'};
  const message=(text,{sticky=false}={})=>{const n=$('earth-note');clearTimeout(noteTimer);n.textContent=text;n.hidden=!text;if(text&&!sticky)noteTimer=setTimeout(()=>{n.hidden=true;},7000);};
  function paint(state={}){
    paintCosmos(state);
    root.dataset.quality=state.quality||$('earth-quality').value;root.dataset.paused=String(!!state.paused);
    $('earth-motion').setAttribute('aria-pressed',String(!!state.paused));
    $('earth-motion').setAttribute('aria-label',state.paused?'Resume rotation':'Pause rotation');
    $('earth-motion-label').textContent=state.paused?'Play':'Pause';
    $('earth-pause-icon').toggleAttribute('hidden',!!state.paused);$('earth-play-icon').toggleAttribute('hidden',!state.paused);
    for(const b of root.querySelectorAll('[data-earth-view]'))b.setAttribute('aria-pressed',String(b.dataset.earthView===(state.view||'live')));
    if((state.scene||'earth')==='earth')$('earth-view-label').textContent=state.time&&!state.time.live?'EPHEMERIS / SIMULATED UTC':viewLabels[state.view]||viewLabels.live;
    const sim=state.time&&!state.time.live;
    $('earth-clock-label').textContent=sim?(state.scene&&state.scene!=='earth'?'SIMULATED TIME':'SIMULATED SUNLIGHT'):state.scene&&state.scene!=='earth'?'CURRENT TIME':state.view==='live'?'CURRENT SUNLIGHT':'ARTISTIC LIGHT';
    paintTime(state);
    if(state.textureWidth&&(state.scene||'earth')==='earth')$('earth-resolution').textContent=Math.round(state.textureWidth/1024)+'K SURFACE DETAIL';
    if(state.quality)$('earth-quality').value=state.quality;
    $('earth-quality').querySelector('option[value=studio]').disabled=!state.studioSupported;
    if(state.detailMessage&&state.detailMessage!==lastDetail)message(state.detailMessage);lastDetail=state.detailMessage||'';
  }
  function simDate(){
    const t=viewer?.getState().time;
    return t?new Date(t.at):new Date();
  }
  function clocks(){
    if(dead||document.hidden)return;
    const state=viewer?.getState();
    if(state)paintTime(state);
    const now=simDate();$('earth-utc').dateTime=now.toISOString();
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
    $('earth-place-eyebrow').textContent='A PLACE TO EXPLORE';
    clocks();
  }
  function unavailable(){root.dataset.state='fallback';paintProvenance();$('earth-fallback').hidden=false;managed.forEach(b=>b.disabled=true);}
  function weatherPaint(state){
    weatherState=state;paintProvenance();
    $('earth-weather-refresh').disabled=!!state.loading;$('earth-weather-refresh').setAttribute('aria-busy',String(!!state.loading));
    $('earth-weather').dataset.state=!state.available?'fallback':state.stale?'older':'available';
    const weatherKey=state.loading?'loading':!state.available?'fallback':state.refreshFailed?'failed':state.stale?'older':'ok';
    if(weatherKey!==lastWeatherKey){lastWeatherKey=weatherKey;const text={loading:'Requesting the latest satellite clouds…',fallback:'Satellite clouds unavailable. Showing illustrative clouds.',failed:'Cloud refresh unavailable. Showing the previous image.',older:'Showing an older satellite cloud frame.'}[weatherKey];if(text)message(text);}
    $('earth-weather-label').textContent=state.loading?(state.available?'Refreshing satellite frame · previous image':'Illustrative clouds · requesting satellite frame…'):state.available?(state.refreshFailed?'Cloud refresh unavailable · previous image':state.stale?'Older satellite infrared frame':'Satellite infrared · timestamped'):'Illustrative clouds · latest feed unavailable';
    const sim=viewer?.getState().time&&!viewer.getState().time.live;
    if(state.at){const date=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(state.at));$('earth-weather-date').textContent=(state.stale?'Older image · ':'')+date+' UTC · frame time · ~3h composites'+(sim?' · not for this time':'');}
    else $('earth-weather-date').textContent=state.available?(state.checkedAt?'Feed checked '+new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit'}).format(new Date(state.checkedAt))+' UTC · image time unavailable · ~3h updates':'Image time unavailable · ~3h source updates')+(sim?' · not for this time':''):'Source refreshes about every 3h · tap ↻ to retry';
    if(sim&&!state.loading)$('earth-weather-label').textContent=(state.available?'Satellite infrared · not for this time':'Illustrative clouds · not for this time');
  }

  // Flight section of the panel: mode, readout, "orbit nearest" offer, and a spoken note when the mode changes.
  let lastMode='orbit',modeTimer;
  function paintFlight(state){
    const f=state.flight;if(!f)return;const mode=f.mode;
    $('flight-orbit').setAttribute('aria-pressed',String(mode==='orbit'));$('flight-free').setAttribute('aria-pressed',String(mode==='free'));
    const dist=km=>km<1e6?Math.round(km).toLocaleString('en-GB')+' km':km<9.46e10?(km/149597870.7).toLocaleString('en-GB',{maximumFractionDigits:2})+' AU':(km/9460730472580.8).toLocaleString('en-GB',{maximumFractionDigits:1})+' light-years';
    const text=mode==='autopilot'?'Autopilot to '+f.autopilot+' · any movement key, scroll or touch takes over':mode==='free'?'Free flight · cruise '+f.speedText+' · '+dist(f.altitudeKm)+' above '+f.nearest:'Orbit · '+f.anchor+' · drag to turn it, scroll to zoom';
    if($('flight-readout').textContent!==text)$('flight-readout').textContent=text;
    const offer=mode==='free'&&f.offer;$('flight-offer').hidden=!offer;if(offer){const t='Orbit '+f.offer;const label=$('flight-offer').firstChild;if(label&&label.textContent!==t+' ')label.textContent=t+' ';}
    if(mode!==lastMode){const prev=lastMode;lastMode=mode;clearTimeout(modeTimer);
      modeTimer=setTimeout(()=>{$('earth-live').textContent=mode==='free'?(matchMedia('(pointer:coarse)').matches?'Free flight. Drag to look, drag with two fingers to move, pinch to change speed.':'Free flight. W A S D move, Q and E go down and up, arrow keys look, Shift boosts.'):mode==='autopilot'?'Flying to '+f.autopilot+'.':prev==='autopilot'?'Arrived. Orbiting '+f.anchor+'.':'Orbiting '+f.anchor+'.';},300);}
  }
  function paintCosmos(state){
    paintFlight(state);
    const scene=state.scene||'earth',focus=state.focus||'Earth';root.dataset.scene=scene;lastScene=scene;paintProvenance();
    $('cosmos-sky-credit').hidden=!(state.skyReady&&state.distanceKm<9460730472580.8*.4);
    $('cosmos-distance').hidden=scene==='earth';
    if(state.distanceKm){const d=state.distanceKm;const text=d<1e6?Math.round(d).toLocaleString('en-GB')+' km':d<9.46e10?(d/149597870.7).toLocaleString('en-GB',{maximumFractionDigits:2})+' AU':(d/9460730472580.8).toLocaleString('en-GB',{maximumFractionDigits:d<94607304725800?2:0})+' light-years';$('cosmos-distance-value').textContent=text;distanceText=text;}
    if(scene!=='earth')$('earth-resolution').textContent=scene==='moon'?'LRO SURFACE / 4K':scene==='planet'?'PLANET MAP / 2K':scene==='galaxy'?'SCHEMATIC STELLAR POPULATION':scene==='neighbourhood'?'HYG / '+(state.cosmos?.starsCount||0).toLocaleString('en-GB')+' STARS':'DISTANCES TO SCALE';
    $('cosmos-distance-note').textContent=state.travelling?'Travelling · drag or zoom to take control':scene==='galaxy'?'Structural model · Sun’s position marked':scene==='neighbourhood'?'HYG catalogue positions · distances uncertain':state.time&&!state.time.live?'Physical distances · simulated UTC':'Physical distances · enlarged labels';
    const key=scene+':'+focus;
    for(const b of root.querySelectorAll('[data-earth-scale]')){const id=b.dataset.earthScale;const active=id==='earth'?scene==='earth':id==='moon'?scene==='moon'||scene==='lunar':id==='solar'?scene==='solar'||scene==='planet':scene==='galaxy'||scene==='neighbourhood';b.setAttribute('aria-pressed',String(active));}
    if(key===cosmicKey)return;cosmicKey=key;
    const info=sceneInfo(scene,focus);
    $('earth-explore').innerHTML=scene==='earth'?'Fly to a place <span aria-hidden="true">↗</span>':'Choose a world <span aria-hidden="true">↗</span>';
    if(scene!=='earth')$('earth-view-label').textContent=scene==='galaxy'?'MILKY WAY / STRUCTURAL MODEL':scene==='neighbourhood'?'STARS / CATALOGUE POSITIONS':state.time&&!state.time.live?'EPHEMERIS / SIMULATED UTC':'EPHEMERIS / CURRENT UTC';
    // Visible captions are gone from the canvas. The change is spoken instead, and
    // one soft name fades in for a moment. Debounced so a flight announces once.
    if(firstCosmic){firstCosmic=false;return;}
    clearTimeout(liveTimer);liveTimer=setTimeout(()=>{$('earth-live').textContent=info.name+'. '+info.desc+(distanceText?' Viewing distance: '+distanceText+'.':'');showFocusName(info.name);},500);
  }
  function sceneInfo(scene,focus){
    if(scene==='earth')return{name:'Earth',desc:'The light changes. The clouds move.'};
    if(scene==='galaxy')return{name:'The Milky Way',desc:'A hundred thousand light-years across, shown as a structural model with the Sun’s position marked.'};
    if(scene==='neighbourhood')return{name:'Our stellar neighbourhood',desc:'Catalogue star positions; distances are uncertain.'};
    if(scene==='solar')return{name:'Our Solar System',desc:'Eight planets and one star at their calculated positions, right now.'};
    if(scene==='lunar')return{name:'Earth and the Moon',desc:'Our nearest neighbour at its calculated position and distance.'};
    return{name:focus==='Moon'?'The Moon':focus,desc:focus==='Moon'?'NASA lunar imagery in its current light.':'Historical surface imagery, current position and sunlight.'};
  }
  function showFocusName(text){
    const n=$('cosmos-focus-name');clearTimeout(focusTimer);n.textContent=text;n.classList.add('is-visible');
    focusTimer=setTimeout(()=>n.classList.remove('is-visible'),3200);
  }
  function setLabels(on,save){
    root.dataset.labels=on?'on':'off';$('earth-labels-toggle').checked=on;
    if(save)try{localStorage.setItem('sd-earth-labels',on?'1':'0');}catch{}
  }
  function paintProvenance(){
    const el=$('earth-provenance');let text='';
    if(root.dataset.state==='ready'){
      const w=weatherState,hhmm=t=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(t))+' UTC';
      const time=viewer?.getState().time,sim=time&&!time.live;
      if(sim){
        text='Simulated time · '+(time.label||'');
        if(lastScene==='galaxy')text+=' · structural model';
        else if(lastScene==='neighbourhood')text+=' · distances approximate';
        else if(lastScene==='earth'||lastScene==='lunar')text+=!w||!w.available?' · illustrative clouds':' · clouds not for this time';
      }else if(lastScene==='galaxy')text='Illustration · structural model';
      else if(lastScene==='neighbourhood')text='Catalogue positions · distances approximate';
      else if(lastScene==='earth'||lastScene==='lunar'){
        if(!w)text='Illustrative clouds · requesting satellite frame';
        else if(!w.available)text=w.loading?'Illustrative clouds · requesting satellite frame':'Illustrative clouds · live feed unavailable';
        else if(w.refreshFailed)text='Satellite clouds · '+(w.at?hhmm(w.at):'time unknown')+' · refresh failed';
        else if(w.stale||!w.at||Date.now()-Date.parse(w.at)>200*60000)text='Satellite clouds · '+(w.at?hhmm(w.at):'time unknown');
      }
    }
    if(el.textContent!==text)el.textContent=text;el.hidden=!text;
  }
  function paintTime(state){
    const t=state?.time;if(!t||!$('earth-time-live'))return;
    root.dataset.time=t.live?'live':'sim';
    $('earth-time-live').setAttribute('aria-pressed',String(!!t.live));
    $('earth-time-reverse').setAttribute('aria-pressed',String(t.speed<0));
    const mag=Math.abs(t.speed);
    for(const b of root.querySelectorAll('[data-earth-speed]'))b.setAttribute('aria-pressed',String(!t.live&&mag===Number(b.dataset.earthSpeed)));
    const picker=$('earth-time-when');
    if(t.utcInput&&document.activeElement!==picker)picker.value=t.utcInput;
    const note=t.live?'Live · sunlight and positions follow UTC now':t.speed===0?'Frozen · '+t.label+' · clouds not for this time':(t.speed<0?'Reverse ':'')+mag.toLocaleString('en-GB')+'× · '+t.label+' · clouds not for this time';
    if($('earth-time-note').textContent!==note)$('earth-time-note').textContent=note;
    if(weatherState)weatherPaint(weatherState);
    else paintProvenance();
  }
  function paintLabels(rows){
    const active=new Set();for(const row of rows){active.add(row.id);let button=labels.get(row.id);if(!button){button=document.createElement('button');button.type='button';button.className='cosmos-object-label';const dot=document.createElement('i'),name=document.createElement('span');dot.className='cosmos-dot';dot.setAttribute('aria-hidden','true');name.className='cosmos-name';name.textContent=row.id;button.append(dot,name);if(row.id==='Galactic centre'||row.id==='Sun · Solar System')button.classList.add('is-marker');button.addEventListener('click',()=>{const id=row.id==='Sun · Solar System'?'solar':row.id==='Galactic centre'?'galaxy':row.id;viewer?.setScale(id);});$('cosmos-labels').append(button);labels.set(row.id,button);}button.hidden=false;button.style.transform='translate('+row.x+'px,'+row.y+'px)';button.style.setProperty('--object-color',row.color);}
    for(const[id,b]of labels)if(!active.has(id))b.hidden=true;
  }
  async function worldFinder(){
    if(!cosmicModel){cosmicModel=await import('/earth-cosmos-model.js?v=20261030-bodies1');for(const body of cosmicModel.BODIES){const b=document.createElement('button');b.type='button';const name=document.createElement('span'),detail=document.createElement('small');name.textContent=body.id;detail.textContent=body.parent?body.radius.toLocaleString('en-GB')+' km mean radius · moon of '+body.parent:body.radius.toLocaleString('en-GB')+' km mean radius';b.append(name,detail);b.addEventListener('click',()=>{$('cosmos-places-dialog').close();panel.close();viewer?.setScale(body.id);});$('cosmos-places-list').append(b);}}
    $('cosmos-places-dialog').showModal();
  }
  function announceEclipse(info,kind){
    if(!info)return;
    const when=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(info.peak));
    const text='Next '+(info.kind||'')+' '+kind+' eclipse, '+when+' UTC.';
    $('earth-live').textContent=text;message(text.replace(/\.$/, ''));
  }
  $('earth-time-live').addEventListener('click',()=>viewer?.setTimeLive());
  $('earth-time-reverse').addEventListener('click',()=>viewer?.reverseTime());
  for(const b of root.querySelectorAll('[data-earth-speed]'))b.addEventListener('click',()=>viewer?.setTimeSpeed(Number(b.dataset.earthSpeed)));
  $('earth-time-when').addEventListener('change',()=>{try{viewer?.setTimeDate($('earth-time-when').value);}catch{message('Choose a UTC date and time.');}});
  $('earth-time-solar').addEventListener('click',async()=>{try{announceEclipse(await viewer?.jumpSolarEclipse(),'solar');}catch{message('Could not find the next solar eclipse.');}});
  $('earth-time-lunar').addEventListener('click',async()=>{try{announceEclipse(await viewer?.jumpLunarEclipse(),'lunar');}catch{message('Could not find the next lunar eclipse.');}});
  for(const b of root.querySelectorAll('[data-flight-turn]'))b.addEventListener('click',()=>viewer?.turn(b.dataset.flightTurn));
  $('flight-orbit').addEventListener('click',()=>viewer?.setFlightMode('orbit'));$('flight-free').addEventListener('click',()=>{viewer?.setFlightMode('free');panel.close();});$('flight-offer').addEventListener('click',()=>viewer?.setFlightMode('orbit'));
  for(const b of root.querySelectorAll('[data-earth-scale]'))b.addEventListener('click',()=>{viewer?.setScale(b.dataset.earthScale);if(matchMedia('(max-width:699px)').matches)panel.close();});
  $('cosmos-deep-sky').addEventListener('click',()=>{const b=$('cosmos-deep-sky'),value=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(value));viewer?.setDeepSky(value);});

  async function boot(){
    const token=++attempt;viewer?.dispose();weather?.dispose();viewer=null;weather=null;window.__earthPreview=null;
    root.dataset.state='loading';$('earth-fallback').hidden=true;managed.forEach(b=>b.disabled=true);message('');
    try{
      const {initEarth}=await import('/earth-renderer.js?v=20261030-bodies1');
      const result=await initEarth({canvas,view:'live',textureBase:'/assets/earth/',
        onLabels:paintLabels,onStatus:s=>{if(token===attempt)$('earth-status').textContent=s;},
        onSelect:point=>{if(token!==attempt)return;place={...point,id:'point',name:'Your chosen place',country:model.coordinates(point.lat,point.lon)};viewer.focusLocation(point.lat,point.lon,{center:false});renderPlace();},
        onChange:state=>{if(token!==attempt)return;paint(state);if(viewer&&root.dataset.state==='fallback'&&state.ready&&!state.contextLost){root.dataset.state='ready';$('earth-fallback').hidden=true;managed.forEach(b=>b.disabled=false);}},
        onError:()=>{if(token===attempt)unavailable();},
      });
      if(token!==attempt||dead){result.dispose();return;}
      viewer=result;window.__earthPreview=result;if(!result.getState().ready)throw new Error('First frame unavailable');
      root.dataset.state='ready';$('earth-fallback').hidden=true;managed.forEach(b=>b.disabled=false);paint(viewer.getState());
      const module=await import('/earth-weather.js?v=20261030-bodies1');
      if(token!==attempt||dead)return;
      weather=module.createWeather({viewer,onChange:weatherPaint});window.__earthWeather=weather;
    }catch{if(token===attempt&&!dead)unavailable();}
  }
  function finder(){if((viewer?.getState().scene||'earth')!=='earth'){worldFinder();return;}if(!model)return;$('earth-search-error').hidden=true;$('earth-search-dialog').showModal();}
  function choose(next){place={...next};for(const dialog of dialogs)dialog.close();renderPlace();viewer?.viewLocation(place.lat,place.lon);root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  $('earth-explore').addEventListener('click',finder);$('earth-fly-here').addEventListener('click',()=>{if(place)viewer?.viewLocation(place.lat,place.lon);panel.close();});
  for(const b of root.querySelectorAll('[data-place]'))b.addEventListener('click',()=>{const p=model?.PLACES.find(p=>p.id===b.dataset.place);if(p)choose(p);});
  $('earth-search-form').addEventListener('submit',e=>{e.preventDefault();const p=model?.parsePlace($('earth-search').value);if(p)choose(p);else{$('earth-search-error').textContent='Choose one of the featured places, or enter latitude, longitude (for example 51.5, -0.12).';$('earth-search-error').hidden=false;}});
  $('earth-locate').addEventListener('click',()=>{
    const button=$('earth-locate'),error=$('earth-search-error');
    if(!navigator.geolocation){error.textContent='Location is unavailable in this browser. Choose a place or enter coordinates.';error.hidden=false;return;}
    button.disabled=true;error.textContent='Waiting for your location permission…';error.hidden=false;
    navigator.geolocation.getCurrentPosition(p=>{button.disabled=false;if(dead)return;error.hidden=true;choose({id:'location',name:'Your location',country:'Your device location · approximate',lat:model.clamp(p.coords.latitude,-85,85),lon:p.coords.longitude,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,deviceTime:true});},e=>{button.disabled=false;error.textContent=e.code===1?'Location permission was declined. You can still choose a place or enter coordinates.':'Your location could not be found. Choose a place or enter coordinates instead.';error.hidden=false;},{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  });
  $('earth-motion').addEventListener('click',()=>viewer?.togglePause());$('earth-reset').addEventListener('click',()=>viewer?.reset());
  for(const b of root.querySelectorAll('[data-earth-view]'))b.addEventListener('click',()=>viewer?.setView(b.dataset.earthView));
  for(const b of root.querySelectorAll('[data-earth-zoom]'))b.addEventListener('click',()=>viewer?.zoomBy(b.dataset.earthZoom==='in'?.15:-.15));
  $('earth-quality').addEventListener('change',async()=>{if(!viewer)return;const quality=$('earth-quality');quality.disabled=true;message('Loading your selected surface detail…',{sticky:true});try{await viewer.setQuality(quality.value);message('');paint(viewer.getState());weather?.refresh(quality.value);}finally{quality.disabled=false;}});
  $('earth-retry').addEventListener('click',boot);$('earth-weather-refresh').addEventListener('click',()=>weather?.refresh(viewer.getState().quality));
  $('earth-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else message('Fullscreen is not available in this browser. You can keep exploring here.');}catch{message('Your browser could not enter fullscreen. You can keep exploring here.');}});
  document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('earth-fullscreen').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');});
  $('earth-about').addEventListener('click',()=>$('earth-about-dialog').showModal());
  for(const b of root.querySelectorAll('[data-close]'))b.addEventListener('click',() => $(b.dataset.close).close());
  for(const dialog of dialogs)dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  window.addEventListener('pagehide',()=>{dead=true;attempt++;clearInterval(clockTimer);weather?.dispose();viewer?.dispose();});
  window.addEventListener('pageshow',event=>{if(event.persisted){dead=false;clockTimer=setInterval(clocks,1000);boot();}});
  async function start(){
    try{model=await import('/earth-live-model.js?v=20261030-bodies1');place={...model.PLACES[1]};
      for(const p of model.PLACES){const b=document.createElement('button');b.type='button';const name=document.createElement('span'),country=document.createElement('small');name.textContent=p.name;country.textContent=p.country;b.append(name,country);b.addEventListener('click',()=>choose(p));$('earth-place-list').append(b);}
      renderPlace();clocks();clockTimer=setInterval(clocks,1000);
      await boot();
    }catch{unavailable();}
  }
  // Opening screen, panel, auto-hiding controls, labels.
  let entered=false;try{entered=sessionStorage.getItem('sd-earth-intro')==='1';}catch{}
  const discover=$('earth-discover');
  const lockPage=on=>{discover.inert=on;document.documentElement.style.overflow=on?'hidden':'';};
  function enter(pointer){
    if(intro.hidden)return;lockPage(false);
    try{sessionStorage.setItem('sd-earth-intro','1');}catch{}
    world.inert=false;canvas.focus(pointer?{preventScroll:true,focusVisible:false}:{preventScroll:true});hudWake();
    if(reducedMotion()){intro.hidden=true;return;}
    intro.classList.add('is-leaving');setTimeout(()=>{intro.hidden=true;},750);
  }
  if(entered)intro.hidden=true;else{world.inert=true;lockPage(true);$('earth-enter').focus({preventScroll:true});}
  $('earth-enter').addEventListener('click',e=>enter(e.detail>0));
  intro.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();$('earth-enter').focus();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!intro.hidden&&!intro.classList.contains('is-leaving')){e.preventDefault();enter();}});
  menuButton.addEventListener('click',()=>{panel.showModal();menuButton.setAttribute('aria-expanded','true');});
  panel.addEventListener('close',()=>{menuButton.setAttribute('aria-expanded','false');if(!document.activeElement||document.activeElement===document.body)menuButton.focus({preventScroll:true});});
  for(const a of panel.querySelectorAll('a[href^="#"]'))a.addEventListener('click',()=>panel.close());
  $('earth-labels-toggle').addEventListener('change',e=>setLabels(e.target.checked,true));
  let storedLabels=null;try{storedLabels=localStorage.getItem('sd-earth-labels');}catch{}
  setLabels(storedLabels==='1',false);
  // Controls fade after 2.5 s without activity. They stay in the accessibility tree,
  // never hide while keyboard focus is in them, a dialog is open or the intro is up.
  let hudAt=performance.now();
  function hudWake(){hudAt=performance.now();if(root.dataset.hud!=='active')root.dataset.hud='active';}
  for(const type of ['pointermove','pointerdown','keydown','wheel','touchstart'])document.addEventListener(type,hudWake,{passive:true});
  hud.addEventListener('focusin',hudWake);
  const hudTimer=setInterval(()=>{
    if(document.hidden)return;
    const focused=hud.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');
    if(!intro.hidden||dialogs.some(d=>d.open)||focused){hudAt=performance.now();if(root.dataset.hud!=='active')root.dataset.hud='active';return;}
    if(performance.now()-hudAt>2500&&root.dataset.hud!=='idle')root.dataset.hud='idle';
  },250);
  window.addEventListener('pagehide',()=>clearInterval(hudTimer));
  // On-screen keyboard: iOS keeps the layout viewport and shrinks only the visual viewport, so pin open dialogs to it.
  const vv=window.visualViewport;
  if(vv){
    const html=document.documentElement;let vvFrame=0;
    const syncVV=()=>{vvFrame=0;const keyboard=vv.scale<=1.01&&innerHeight-vv.height>120&&dialogs.some(d=>d.open);
      html.classList.toggle('kb-open',keyboard);
      if(keyboard){html.style.setProperty('--vv-h',vv.height+'px');html.style.setProperty('--vv-top',vv.offsetTop+'px');}
      else{html.style.removeProperty('--vv-h');html.style.removeProperty('--vv-top');}};
    const queue=()=>{if(!vvFrame)vvFrame=requestAnimationFrame(syncVV);};
    vv.addEventListener('resize',queue);vv.addEventListener('scroll',queue);
    for(const d of dialogs)d.addEventListener('close',syncVV);
    document.addEventListener('focusin',e=>{if(e.target.matches?.('input,select,textarea')&&e.target.closest('dialog'))setTimeout(()=>{if(html.classList.contains('kb-open'))e.target.scrollIntoView({block:'center',behavior:'instant'});},300);});
  }
  start();
})();
