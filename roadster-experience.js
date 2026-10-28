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
  if(btn){btn.setAttribute('aria-pressed',String(!on));$('.rx-motion-label',btn).textContent=on?'Pause motion':'Play motion';}
  if(persist)store(on?'on':'off');
  if(!on)$$('[data-rx-clip]').forEach(v=>{v.pause();v.classList.remove('is-playing');playing.delete(v);});
  else visible.forEach(v=>start(v));
 }
 root.dataset.motionReady='true';
 if(btn)btn.addEventListener('click',()=>setMotion(!motion,true));
 reduce.addEventListener?.('change',()=>{if(reduce.matches)setMotion(false,false);});

 // ---- Clips: start when near the viewport, pause when away, never more than two at once.
 const visible=new Set();
 function start(v){
  if(!motion||document.hidden)return;
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
  const bar=$('.rx-progress i');let tick=false;
  const upd=()=>{tick=false;const h=document.documentElement.scrollHeight-innerHeight;if(bar)bar.style.transform='scaleX('+(h>0?Math.min(1,scrollY/h):0)+')';};
  addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(upd);}},{passive:true});upd();
 }

 // ---- The pinned stage: the picture follows the step that is in the middle of the screen.
 const stage=$('.rx-stage');
 if(stage&&'IntersectionObserver'in window){
  const layers=new Map($$('[data-rx-layer]',stage).map(l=>[l.dataset.rxLayer,l]));
  const sio=new IntersectionObserver(items=>items.forEach(i=>{
   if(!i.isIntersecting)return;const id=i.target.dataset.rxStep;if(!id||!layers.has(id))return;
   layers.forEach((l,k)=>l.classList.toggle('is-active',k===id));
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
  film.addEventListener('volumechange',()=>{const on=!film.muted&&film.volume>0;sound.textContent='Soundtrack: '+(on?'on':'off');sound.setAttribute('aria-pressed',String(on));});
  cover.addEventListener('click',()=>load(film.readyState?film.currentTime:0));
  quality.addEventListener('change',()=>{if(active)load(film.currentTime||0,!film.paused);});
  sound.addEventListener('click',()=>{film.muted=!film.muted;});
  $$('[data-rx-chapter-time]').forEach(b=>b.addEventListener('click',()=>load(Number(b.dataset.rxChapterTime))));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!film.paused)film.pause();});
  if('IntersectionObserver'in window)new IntersectionObserver(i=>{if(!i[0].isIntersecting&&!film.paused)film.pause();},{threshold:.02}).observe(film);
 }

 // ---- Tesla's full event on YouTube: nothing is requested from YouTube until the reader presses play.
 $$('[data-rx-replay]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.rxReplay;if(!/^[\w-]{6,20}$/.test(id))return;
  const f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1';
  f.title='Tesla Roadster Event, full replay (YouTube)';f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';
  b.parentElement.appendChild(f);b.hidden=true;f.focus();
 }));
})();
