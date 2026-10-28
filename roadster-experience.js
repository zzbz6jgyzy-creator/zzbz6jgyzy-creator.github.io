/* Roadster experience: progressive enhancement. The page reads fully without this file. It adds: the chapter rail, the pinned stage,
   video loops that play only when they are on screen and motion is allowed, the film player and the click-to-load replay. */
(()=>{
 'use strict';
 const root=document.querySelector('[data-rx]');if(!root)return;
 const $=(s,r=root)=>r.querySelector(s),$$=(s,r=root)=>[...r.querySelectorAll(s)];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const saveData=!!(navigator.connection&&navigator.connection.saveData);
 const KEY='sd-rx-motion';
 let stored='';try{stored=localStorage.getItem(KEY)||'';}catch(e){}
 const store=v=>{try{localStorage.setItem(KEY,v);}catch(e){}};

 // ---- Motion: off for reduced-motion users, Save-Data and anyone who paused it. Stills carry the page when it is off.
 let motion=!(reduce.matches||saveData||stored==='off');
 const btn=$('#rx-motion');
 const playing=new Set();
 function setMotion(on,persist){
  motion=on;root.dataset.motion=on?'on':'off';
  if(btn){btn.setAttribute('aria-pressed',String(!on));}
  if(persist)store(on?'on':'off');
  if(!on)$$('[data-rx-clip]').forEach(v=>{v.pause();v.classList.remove('is-playing');playing.delete(v);});
  else visible.forEach(v=>start(v));
 }
 root.dataset.motionReady='true';
 if(btn)btn.addEventListener('click',()=>setMotion(!motion,true));
 reduce.addEventListener?.('change',()=>{if(reduce.matches)setMotion(false,false);});

 // ---- Clips: start when near the viewport, pause when away, never more than two at once.
 const visible=new Set();
 // A loop inside a pinned-stage layer plays only while its layer is the active one.
 const wanted=v=>{const l=v.closest('[data-rx-layer]');return !l||l.classList.contains('is-active');};
 function start(v){
  if(!motion||document.hidden||!wanted(v))return;
  while(playing.size>=2){const oldest=playing.values().next().value;oldest.pause();oldest.classList.remove('is-playing');playing.delete(oldest);}
  v.muted=true;const p=v.play();
  if(p&&p.then)p.then(()=>{if(visible.has(v)&&motion){v.classList.add('is-playing');playing.add(v);}else v.pause();}).catch(()=>{});
 }
 function stop(v){v.pause();v.classList.remove('is-playing');playing.delete(v);}
 if('IntersectionObserver'in window){
  const io=new IntersectionObserver(items=>items.forEach(i=>{const v=i.target;if(i.isIntersecting){visible.add(v);start(v);}else{visible.delete(v);stop(v);}}),{rootMargin:'200px 0px'});
  $$('[data-rx-clip]').forEach(v=>{v.addEventListener('error',()=>v.classList.remove('is-playing'));io.observe(v);});
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)$$('[data-rx-clip]').forEach(stop);else visible.forEach(start);});
 setMotion(motion,false);

 // ---- Chapter rail and progress bar. The bar is pure CSS where scroll-driven animations exist.
 const chapters=$$('[data-rx-chapter]'),links=new Map($$('[data-rx-rail]').map(a=>[a.dataset.rxRail,a]));
 const setCurrent=id=>links.forEach((a,k)=>{if(k===id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
 if('IntersectionObserver'in window&&chapters.length){
  const cio=new IntersectionObserver(items=>items.forEach(i=>{if(i.isIntersecting)setCurrent(i.target.dataset.rxChapter);}),{rootMargin:'-45% 0px -50% 0px'});
  chapters.forEach(c=>cio.observe(c));
 }
 if(!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline: scroll()'))){
  const bar=$('.rx-progress i'),hero=$('.rx-hero');let tick=false;
  const upd=()=>{tick=false;const h=document.documentElement.scrollHeight-innerHeight;if(bar)bar.style.transform='scaleX('+(h>0?Math.min(1,scrollY/h):0)+')';
   if(hero&&motion)hero.style.setProperty('--rx-hp',Math.min(1,Math.max(0,scrollY/innerHeight)).toFixed(3));};
  addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd);}},{passive:true});upd();
 }

 // ---- Reveal on scroll where CSS view() timelines are missing, and the count-up on the hero numbers. Both are skipped when motion is off.
 if(motion&&'IntersectionObserver'in window){
  if(!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline: view()'))){
   const els=$$('.rx-fact,.rx-card,.rx-number,.rx-config,.rx-cockpit-card,.rx-engineer-card,.rx-spine li,.rx-head,.rx-faq details,.rx-physics');
   const rio=new IntersectionObserver(items=>items.forEach(i=>{if(i.isIntersecting){i.target.classList.add('rx-in');rio.unobserve(i.target);}}),{rootMargin:'0px 0px -8% 0px'});
   els.forEach(e=>{if(e.getBoundingClientRect().top>innerHeight*.9){e.classList.add('rx-pre');rio.observe(e);}});root.classList.add('rx-js-in');
  }
  const nio=new IntersectionObserver(items=>items.forEach(i=>{
   if(!i.isIntersecting)return;const el=i.target;nio.unobserve(el);if(!motion)return;
   const m=el.textContent.match(/^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/);if(!m)return;
   const end=parseFloat(m[2].replace(/,/g,'')),dec=(m[2].split('.')[1]||'').length,comma=m[2].includes(','),t0=performance.now(),full=el.textContent;
   const fmt=n=>comma?n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}):n.toFixed(dec);
   const tick=t=>{const k=Math.min(1,(t-t0)/1100),e=1-Math.pow(1-k,3);el.textContent=k<1?m[1]+fmt(end*e)+m[3]:full;if(k<1&&motion)requestAnimationFrame(tick);else el.textContent=full;};
   requestAnimationFrame(tick);
  }),{threshold:.6});
  $$('[data-rx-count]').forEach(el=>nio.observe(el));
 }

 // ---- The pinned stage: the picture follows the step that is in the middle of the screen.
 const stage=$('.rx-stage');
 if(stage&&'IntersectionObserver'in window){
  const layers=new Map($$('[data-rx-layer]',stage).map(l=>[l.dataset.rxLayer,l]));
  const sio=new IntersectionObserver(items=>items.forEach(i=>{
   if(!i.isIntersecting)return;const id=i.target.dataset.rxStep;if(!id||!layers.has(id))return;
   layers.forEach((l,k)=>l.classList.toggle('is-active',k===id));
   $$('[data-rx-clip]',stage).forEach(v=>{if(wanted(v)&&visible.has(v))start(v);else stop(v);});
   // Fetch the next layer's loop a step ahead so it is ready when its step arrives.
   const keys=[...layers.keys()],next=layers.get(keys[keys.indexOf(id)+1]),nv=next&&next.querySelector('video');
   if(nv&&motion&&!nv.dataset.warm){nv.dataset.warm='1';nv.preload='auto';nv.load();}
  }),{rootMargin:'-45% 0px -45% 0px'});
  $$('[data-rx-step]',stage).forEach(s=>sio.observe(s));
 }

 // ---- The film: loads only on press, starts muted, offers 720p and 1080p, and pauses when it leaves the screen.
 const film=$('#rx-film'),cover=$('#rx-film-cover'),quality=$('#rx-film-quality'),sound=$('#rx-film-sound'),status=$('#rx-film-status');
 if(film&&cover){
  film.muted=true;film.volume=.7;quality.value=innerWidth>=1100&&!saveData?'1080':'720';
  const version=(film.dataset.version||'');let active='',pending=false,wantPlay=true,wantTime=0;
  const load=(time=0,play=true)=>{
   wantTime=time;wantPlay=play;
   const src='/assets/roadster-studio/roadster-film-'+quality.value+'.mp4'+(version?'?v='+encodeURIComponent(version):'');
   if(active===src&&film.readyState>=1){film.currentTime=Math.min(time,Math.max(0,film.duration-.2));if(play)film.play().catch(()=>{status.textContent='Press the video’s play control to begin.';});return;}
   if(active===src&&pending)return;
   active=src;pending=true;status.textContent='Loading the film…';film.src=src;film.load();
  };
  film.addEventListener('loadedmetadata',()=>{pending=false;film.currentTime=Math.min(wantTime,Math.max(0,film.duration-.2));if(wantPlay)film.play().catch(()=>{status.textContent='Press the video’s play control to begin.';});});
  film.addEventListener('playing',()=>{cover.hidden=true;film.controls=true;status.textContent='Playing. Tesla imagery, music by Scott Buckley, edit by Supercharged Daily.';});
  film.addEventListener('pause',()=>{if(film.readyState>0&&!film.ended)status.textContent='Paused. Use the controls or choose a chapter.';});
  film.addEventListener('ended',()=>{status.textContent='Film complete. Choose a chapter to replay it.';});
  film.addEventListener('error',()=>{pending=false;active='';cover.hidden=false;status.textContent='The film could not be loaded. Try again, or save it with the link on the right.';});
  film.addEventListener('timeupdate',()=>{let cur=null;$$('[data-rx-chapter-time]').forEach(b=>{if(film.currentTime>=Number(b.dataset.rxChapterTime))cur=b;});$$('[data-rx-chapter-time]').forEach(b=>{if(b===cur)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});});
  film.addEventListener('volumechange',()=>{const on=!film.muted&&film.volume>0;sound.textContent='Soundtrack: '+(on?'on':'off');});
  cover.addEventListener('click',()=>load(film.readyState?film.currentTime:0));
  quality.addEventListener('change',()=>{if(active)load(film.currentTime||0,!film.paused);});
  sound.addEventListener('click',()=>{film.muted=!film.muted;});
  $$('[data-rx-chapter-time]').forEach(b=>b.addEventListener('click',()=>load(Number(b.dataset.rxChapterTime))));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!film.paused)film.pause();});
  if('IntersectionObserver'in window)new IntersectionObserver(i=>{if(!i[0].isIntersecting&&!film.paused)film.pause();},{threshold:.02}).observe(film);
 }


 // ---- Chapters added in part 3. Everything below enhances markup that already reads fine without script.
 let data={configs:[],tech:[],gallery:[]};try{data=JSON.parse($('#rx-data').textContent);}catch(e){}
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 // Gallery: collections, the arrows, and the full-screen viewer.
 const shots=$$('.rx-shot'),filters=$$('[data-rx-filter]'),reel=$('.rx-reel');
 let group='all';
 const visibleShots=()=>shots.filter(s=>!s.hidden);
 function filter(next){group=next;shots.forEach(s=>{s.hidden=next!=='all'&&s.dataset.rxGroup!==next;});filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rxFilter===next)));
  const n=visibleShots().length;const c=$('#rx-gallery-count');if(c)c.textContent=n+' picture'+(n===1?'':'s')+(next==='all'?'':' in '+({exterior:'Exterior',interior:'Interior',engineering:'Engineering',reveal:'The reveal'}[next]||next));if(reel)reel.scrollTo({left:0,behavior:'auto'});}
 filters.forEach(b=>b.addEventListener('click',()=>filter(b.dataset.rxFilter)));
 $$('[data-rx-reel]').forEach(b=>b.addEventListener('click',()=>{if(!reel)return;const w=(visibleShots()[0]||{offsetWidth:600}).offsetWidth+24;reel.scrollBy({left:Number(b.dataset.rxReel)*w,behavior:motion?'smooth':'auto'});}));
 const dialog=$('#rx-photo-dialog'),big=$('#rx-photo-image');let opener=null,at=0;
 function show(i){at=i;const g=data.gallery[i];if(!g||!big)return;big.src='/assets/'+(g.legacy?'roadster':'roadster-studio')+'/'+g.id+'-1920w.webp';big.alt=g.alt;$('#rx-photo-title').textContent=g.title;
  const vis=visibleShots().map(s=>Number(s.querySelector('[data-rx-photo]').dataset.rxPhoto)),pos=Math.max(0,vis.indexOf(i));$('#rx-photo-caption').textContent=(pos+1)+' / '+vis.length+' · '+g.description+' · '+g.credit+'.';}
 const step=d=>{const vis=visibleShots().map(s=>Number(s.querySelector('[data-rx-photo]').dataset.rxPhoto));if(!vis.length)return;show(vis[(Math.max(0,vis.indexOf(at))+d+vis.length)%vis.length]);};
 if(dialog&&typeof dialog.showModal==='function'){
  $$('[data-rx-photo]').forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();opener=a;show(Number(a.dataset.rxPhoto));dialog.showModal();$('#rx-photo-close').focus();}));
  $('#rx-photo-close').addEventListener('click',()=>dialog.close());$('#rx-photo-prev').addEventListener('click',()=>step(-1));$('#rx-photo-next').addEventListener('click',()=>step(1));
  dialog.addEventListener('keydown',ev=>{if(ev.key==='ArrowLeft'){ev.preventDefault();step(-1);}if(ev.key==='ArrowRight'){ev.preventDefault();step(1);}});
  dialog.addEventListener('click',ev=>{if(ev.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{if(opener)opener.focus({preventScroll:true});});
 }

 // Cockpit: the numbered hotspots select a card.
 const hotspots=$$('[data-rx-hotspot]'),cards=$$('[data-rx-cockpit]');
 hotspots.forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.rxHotspot);cards.forEach((c,k)=>c.classList.toggle('is-selected',k===i));hotspots.forEach((h,k)=>h.setAttribute('aria-pressed',String(k===i)));if(innerWidth<760&&cards[i])cards[i].scrollIntoView({behavior:motion?'smooth':'auto',block:'center'});}));

 // Engineering: the diagram and the reading panel follow the system you choose; arrow keys move between systems.
 const systems=$$('[data-rx-system]'),panels=$$('[data-rx-tech-panel]'),eng=$('.rx-engineering');
 function system(id,focus){panels.forEach(p=>{p.hidden=p.dataset.rxTechPanel!==id;});systems.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rxSystem===id)));if(eng)eng.dataset.rxDiagram=id;
  const t=data.tech.find(x=>x.id===id),n=$('#rx-system-name');if(t&&n)n.textContent=t.name;if(focus)systems.find(b=>b.dataset.rxSystem===id).focus();}
 if(systems.length)system(systems[0].dataset.rxSystem);
 systems.forEach((b,i)=>{b.addEventListener('click',()=>system(b.dataset.rxSystem));b.addEventListener('keydown',ev=>{let n=i;if(ev.key==='ArrowRight'||ev.key==='ArrowDown')n=(i+1)%systems.length;else if(ev.key==='ArrowLeft'||ev.key==='ArrowUp')n=(i-1+systems.length)%systems.length;else return;ev.preventDefault();system(systems[n].dataset.rxSystem,true);});});

 // The physics behind the stage run: average acceleration from elapsed time, plain arithmetic.
 $$('[data-rx-physics]').forEach(b=>b.addEventListener('click',()=>{
  const s=Number(b.dataset.rxPhysics),g=(60*0.44704)/s/9.80665,demo=s===0.81;
  $('#rx-g-value').textContent=(demo?'≈':'> ')+g.toFixed(2);
  $('#rx-physics-caption').textContent=demo?'From Tesla’s claimed 0.81-second run. This is a calculation from elapsed time, not measured acceleration, and 0 to 60 mph is 0 to 96.6 km/h, not 0 to 100.':'A threshold calculated from an “under '+s+' s” target, not an achieved or independently verified result.';
  $$('[data-rx-physics]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  const x=65+Math.min(s,1.6)/1.6*470;$('#rx-physics-line').setAttribute('d','M65 285L'+x+' 55');$('#rx-physics-area').setAttribute('d','M65 285L'+x+' 55V285Z');$('#rx-physics-dot').setAttribute('cx',x);
 }));

 // Trims: add up to three to a side-by-side comparison; units switch between miles and kilometres.
 const chosen=new Set(),box=$('#rx-compare');
 function compare(){if(!box)return;box.hidden=!chosen.size;
  $$('[data-rx-compare]').forEach(b=>{const on=chosen.has(b.dataset.rxCompare);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Selected, remove':'Add to comparison +';});
  const sel=data.configs.filter(c=>chosen.has(c.id));
  $('#rx-compare-content').innerHTML=sel.length?'<table><caption>Tesla’s descriptions and October targets. '+sel.length+' selected.</caption><thead><tr><th scope="col">What</th>'+sel.map(c=>'<th scope="col">'+esc(c.name)+'</th>').join('')+'</tr></thead><tbody>'+[['Positioning',c=>c.tag],['Seats',c=>c.seats],['0 to 60 mph target',c=>c.target+', unverified'],['Availability',c=>c.availability],['Road use',c=>c.id==='rocket'?'Not approved for public road use':'Check final certification and market terms']].map(([l,f])=>'<tr><th scope="row">'+l+'</th>'+sel.map(c=>'<td>'+esc(f(c))+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'';}
 $$('[data-rx-compare]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.rxCompare;chosen.has(id)?chosen.delete(id):chosen.add(id);compare();}));
 const clear=$('#rx-compare-clear');if(clear)clear.addEventListener('click',()=>{chosen.clear();compare();});
 $$('[data-rx-unit]').forEach(b=>b.addEventListener('click',()=>{const metric=b.dataset.rxUnit==='metric';$$('[data-rx-unit]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  const d=$('[data-rx-distance]'),sp=$('[data-rx-speed]');if(d)d.textContent=metric?'483 km (converted)':'300 miles';if(sp)sp.textContent=metric?'370 km/h (converted)':'230 mph';}));

 // ---- Tesla's full event on YouTube: nothing is requested from YouTube until the reader presses play.
 $$('[data-rx-replay]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.rxReplay;if(!/^[\w-]{6,20}$/.test(id))return;
  const f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1';
  f.title='Tesla Roadster Event, full replay (YouTube)';f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';
  b.parentElement.appendChild(f);b.hidden=true;f.focus();
 }));
})();
