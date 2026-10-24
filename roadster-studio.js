/* The Roadster studio progressively enhances saved editorial content. */
(()=>{
 'use strict';
 const root=document.querySelector('.rs-studio'),M=window.RoadsterStudio,$=id=>document.getElementById(id);if(!root||!M)return;let data;try{data=M.validate(JSON.parse($('rs-studio-data').textContent));}catch{return;}
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),esc=M.esc;
 root.dataset.enhanced='true';
 const film=$('rs-film'),cover=$('rs-film-cover'),quality=$('rs-film-quality'),sound=$('rs-film-ambient'),filmStatus=$('rs-film-status');
 film.muted=true;film.volume=.7;quality.value=innerWidth>=1100&&!navigator.connection?.saveData?'1080':'720';
 let requestedTime=0,loadPending=false,playAfterLoad=true,activeFile='';
 function loadFilm(time=0,play=true){
  requestedTime=time;playAfterLoad=play;
  const src='/assets/roadster-studio/roadster-film-'+quality.value+'.mp4';
  if(activeFile===src&&film.readyState>=1){film.currentTime=Math.min(time,Math.max(0,film.duration-.2));if(play)film.play().catch(()=>{filmStatus.textContent='Press the video’s play control to begin. The direct film link is available below.';});return;}
  if(activeFile===src&&loadPending)return;
  activeFile=src;loadPending=true;filmStatus.textContent='Loading the film…';cover.querySelector('span:last-child').firstChild.textContent='LOADING THE FILM';film.src=src;film.load();
 }
 film.addEventListener('loadedmetadata',()=>{loadPending=false;film.currentTime=Math.min(requestedTime,Math.max(0,film.duration-.2));root.dataset.filmLoaded='true';if(playAfterLoad)film.play().catch(()=>{filmStatus.textContent='The film is ready. Press the native play control.';cover.hidden=true;});});
 film.addEventListener('playing',()=>{cover.hidden=true;filmStatus.textContent='Playing A New Dimension. Tesla imagery, Supercharged Daily edit and original ambient score.';});
 film.addEventListener('pause',()=>{if(film.readyState>0)filmStatus.textContent='Film paused. Use the controls or choose a chapter.';});
 film.addEventListener('error',()=>{loadPending=false;activeFile='';cover.hidden=false;cover.querySelector('span:last-child').firstChild.textContent='RETRY THE FILM';filmStatus.textContent='The film could not load. Retry, choose 720p, or use “Save the film” to open the file directly.';});
 film.addEventListener('ended',()=>{filmStatus.textContent='Film complete. Replay a chapter or explore the design below.';});
 film.addEventListener('timeupdate',()=>{let current=0;data.film.chapters.forEach((c,i)=>{if(film.currentTime>=c.start)current=i;});document.querySelectorAll('[data-rs-chapter]').forEach((b,i)=>{if(i===current)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});});
 film.addEventListener('volumechange',()=>{const enabled=!film.muted&&film.volume>0;sound.textContent='Ambient sound: '+(enabled?'on':'off');sound.setAttribute('aria-pressed',String(enabled));});
 cover.onclick=()=>loadFilm(film.readyState?film.currentTime:0);
 document.querySelectorAll('[data-rs-play]').forEach(a=>a.onclick=ev=>{ev.preventDefault();$('video').scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'});loadFilm(0);});
 quality.onchange=()=>{if(activeFile)loadFilm(film.currentTime||0,!film.paused);};
 sound.onclick=()=>{film.muted=!film.muted;};
 document.querySelectorAll('[data-rs-chapter]').forEach(b=>b.onclick=()=>loadFilm(Number(b.dataset.rsChapter)));
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!film.paused)film.pause();});
 if('IntersectionObserver'in window)new IntersectionObserver(items=>{if(!items[0].isIntersecting&&!film.paused)film.pause();},{threshold:.02}).observe(film);
 let group='exterior';
 const filterButtons=[...document.querySelectorAll('[data-rs-gallery]')],cards=[...document.querySelectorAll('[data-rs-group]')];
 function filterGallery(next){group=next;let count=0;for(const card of cards){card.hidden=next!=='all'&&card.dataset.rsGroup!==next;if(!card.hidden)count++;}for(const b of filterButtons)b.setAttribute('aria-pressed',String(b.dataset.rsGallery===next));$('rs-gallery-status').textContent=count+' images in '+(next==='all'?'all collections':next)+'. Open an image for full screen.';}
 filterButtons.forEach(b=>b.onclick=()=>filterGallery(b.dataset.rsGallery));filterGallery(group);
 let photoIndex=0,opener=null;const dialog=$('rs-photo-dialog'),photo=$('rs-photo-image');
 const visiblePhotos=()=>data.gallery.map((g,i)=>({g,i})).filter(x=>group==='all'||x.g.group===group);
 function showPhoto(index){photoIndex=index;const g=data.gallery[index];photo.src='/assets/'+(g.legacy?'roadster':'roadster-studio')+'/'+g.id+'-1920w.webp';photo.alt=g.alt;$('rs-photo-title').textContent=g.title;const collection=visiblePhotos(),position=collection.findIndex(x=>x.i===index);$('rs-photo-caption').textContent=(position+1)+' / '+collection.length+' · '+g.description+' · '+g.credit+'.';}
 document.querySelectorAll('[data-rs-photo]').forEach(a=>a.onclick=ev=>{if(typeof dialog.showModal!=='function')return;ev.preventDefault();opener=a;showPhoto(Number(a.dataset.rsPhoto));dialog.showModal();$('rs-photo-close').focus();});
 const movePhoto=step=>{const collection=visiblePhotos(),at=collection.findIndex(x=>x.i===photoIndex);showPhoto(collection[(at+step+collection.length)%collection.length].i);};
 $('rs-photo-close').onclick=()=>dialog.close();$('rs-photo-prev').onclick=()=>movePhoto(-1);$('rs-photo-next').onclick=()=>movePhoto(1);
 dialog.addEventListener('keydown',ev=>{if(ev.key==='ArrowLeft'){ev.preventDefault();movePhoto(-1);}if(ev.key==='ArrowRight'){ev.preventDefault();movePhoto(1);}});dialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
 const cockpit=[...document.querySelectorAll('[data-rs-cockpit]')],hotspots=[...document.querySelectorAll('[data-rs-hotspot]')];
 function selectCockpit(index){cockpit.forEach((a,i)=>a.classList.toggle('is-selected',i===index));hotspots.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));if(innerWidth<760)cockpit[index].scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'center'});}
 hotspots.forEach(b=>b.onclick=()=>selectCockpit(Number(b.dataset.rsHotspot)));cockpit[0].classList.add('is-selected');
 const systems=[...document.querySelectorAll('[data-rs-system]')],panels=[...document.querySelectorAll('[data-rs-tech-panel]')];
 function selectSystem(id){for(const p of panels)p.hidden=p.dataset.rsTechPanel!==id;for(const b of systems)b.setAttribute('aria-pressed',String(b.dataset.rsSystem===id));document.querySelector('.rs-engineering-stage').dataset.rsDiagram=id;$('rs-system-name').textContent=data.tech.find(t=>t.id===id).name;}
 systems.forEach((b,i)=>{b.onclick=()=>selectSystem(b.dataset.rsSystem);b.onkeydown=ev=>{let next=i;if(ev.key==='ArrowRight'||ev.key==='ArrowDown')next=(i+1)%systems.length;else if(ev.key==='ArrowLeft'||ev.key==='ArrowUp')next=(i-1+systems.length)%systems.length;else if(ev.key==='Home')next=0;else if(ev.key==='End')next=systems.length-1;else return;ev.preventDefault();systems[next].focus();selectSystem(systems[next].dataset.rsSystem);};});selectSystem('suction');
 document.querySelectorAll('[data-rs-physics]').forEach(b=>b.onclick=()=>{const seconds=Number(b.dataset.rsPhysics),p=M.physics(seconds),demo=seconds===data.demonstration.seconds;$('rs-g-value').textContent=(demo?'≈':'> ')+p.g.toFixed(2);$('rs-physics-caption').textContent=demo?'Calculated from Tesla’s reported 0.81-second run. This is not measured acceleration telemetry.':'Threshold calculated from an “under '+seconds+' s” manufacturer target, not an achieved or independently verified result.';for(const x of document.querySelectorAll('[data-rs-physics]'))x.setAttribute('aria-pressed',String(x===b));const x=65+Math.min(seconds,1.6)/1.6*470;$('rs-physics-line').setAttribute('d','M65 285L'+x+' 55');$('rs-physics-area').setAttribute('d','M65 285L'+x+' 55V285Z');$('rs-physics-dot').setAttribute('cx',x);});
 document.querySelector('[data-rs-physics="0.81"]')?.click();
 const chosen=new Set();
 function compare(){const box=$('rs-compare');box.hidden=!chosen.size;for(const b of document.querySelectorAll('[data-rs-compare]')){const yes=chosen.has(b.dataset.rsCompare);b.setAttribute('aria-pressed',String(yes));b.textContent=yes?'Selected — remove':'Add to comparison +';}const selected=data.configs.filter(c=>chosen.has(c.id));$('rs-compare-content').innerHTML=selected.length?'<table><caption>Manufacturer descriptions and October targets. '+selected.length+' selected.</caption><thead><tr><th scope="col">Attribute</th>'+selected.map(c=>'<th scope="col">'+esc(c.name)+'</th>').join('')+'</tr></thead><tbody>'+[['Positioning',c=>c.tag],['Seats',c=>c.seats],['0–60 mph target',c=>c.target+' / unverified'],['Availability',c=>c.availability],['Road-use note',c=>c.id==='rocket'?'Not approved for public road use':'Check final certification and market terms']].map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+selected.map(c=>'<td>'+esc(value(c))+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'';}
 document.querySelectorAll('[data-rs-compare]').forEach(b=>b.onclick=()=>{const id=b.dataset.rsCompare;chosen.has(id)?chosen.delete(id):chosen.add(id);compare();});$('rs-compare-clear').onclick=()=>{chosen.clear();compare();};
 document.querySelectorAll('[data-rs-unit]').forEach(b=>b.onclick=()=>{const metric=b.dataset.rsUnit==='metric';for(const x of document.querySelectorAll('[data-rs-unit]'))x.setAttribute('aria-pressed',String(x===b));document.querySelector('[data-rs-distance]').textContent=metric?'483 km (converted)':'300 miles';document.querySelector('[data-rs-speed]').textContent=metric?'370 km/h (converted)':'230 mph';});
 const nav=document.querySelector('.rs-nav'),setActive=id=>{for(const a of nav.querySelectorAll('a'))if(a.hash==='#'+id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');};nav.onclick=ev=>{const a=ev.target.closest('a');if(a)setActive(a.hash.slice(1));};
 if('IntersectionObserver'in window){const spy=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting)setActive(item.target.id);},{rootMargin:'-150px 0px -50% 0px'});for(const id of ['video','gallery','cockpit','tech','trims','evidence'])spy.observe($(id));}
})();
