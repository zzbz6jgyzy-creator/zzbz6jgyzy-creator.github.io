/* Progressive enhancement. No location, account, VIN or model API access. */
(()=>{
 'use strict';
 const M=window.SDFGlobal,V=window.SDFGlobalView;let d;
 try{d=M.validate(JSON.parse(document.getElementById('fg-data').textContent));}catch{return;}
 const $=id=>document.getElementById(id),KEY='sd-fsd-global-v1';let saved={country:null};
 try{saved=M.preferences(d,localStorage.getItem(KEY));}catch{}
 let savedPersisted=!!saved.country;
 let selected=M.countryFromURL(d,location.href)||saved.country||'US';
 let filter={query:'',status:'',region:''};
 const all=(sel)=>[...document.querySelectorAll(sel)];
 all('[data-fg-interactive]').forEach(el=>el.hidden=false);
 let box=M.regionBoxes.World.slice();
 function applyBox(next){let [x,y,w,h]=next;w=Math.max(80,Math.min(1000,w));h=Math.max(70,Math.min(500,h));x=Math.max(0,Math.min(1000-w,x));y=Math.max(0,Math.min(500-h,y));box=[x,y,w,h];$('fg-map').setAttribute('viewBox',box.join(' '));}
 function mapSelection(c,fly=false){
  const x=(c.lon+180)*1000/360,y=(90-c.lat)*500/180;const halo=$('fg-selected-halo');halo.setAttribute('cx',x);halo.setAttribute('cy',y);halo.hidden=false;halo.removeAttribute('hidden');
  all('#fg-land path[data-code]').forEach(el=>el.classList.toggle('fg-selected',el.dataset.code===c.code));
  all('[data-fg-country]').forEach(el=>{if(el.dataset.fgCountry===c.code)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});
  $('fg-map-caption').textContent=c.name.toUpperCase()+' / '+M.labels[c.availability.status].toUpperCase();
  if(fly){const w=['US','CA','AU','CN','BR'].includes(c.code)?420:c.region==='Europe'?160:230;applyBox([x-w/2,y-w*.36,w,w*.72]);all('[data-fg-region]').forEach(el=>el.setAttribute('aria-pressed','false'));}
 }
 function banner(){
  const el=$('fg-my-country');el.hidden=!saved.country;
  if(saved.country)el.innerHTML='<span>My country <a href="'+M.countryURL(saved.country)+'" data-fg-country="'+saved.country+'">'+M.esc(M.byCode(d,saved.country).name)+' →</a><small>'+(savedPersisted?'Remembered in this browser':'For this visit · storage unavailable')+'</small></span><button type="button" id="fg-forget" class="fg-text-link">Forget country</button>';
 }
 function updateAdvice(){const c=M.byCode(d,selected);$('fg-car-advice').textContent=M.carAdvice(c,$('fg-hardware').value);$('fg-advice-country').textContent='Guidance for '+c.name;}
 function paintCountry(code,fly=false){const c=M.byCode(d,code);if(!c)return;selected=c.code;$('fg-dossier').innerHTML=V.dossier(d,c);all('#fg-dossier [data-fg-interactive]').forEach(el=>el.hidden=false);$('fg-save').textContent=saved.country===code?'My country ✓':'Set as my country';mapSelection(c,fly);updateAdvice();}
 function openCountry(code){if(!M.byCode(d,code))return;const u=new URL(location.href);u.searchParams.set('country',code);u.hash='map';history.pushState(null,'',u);paintCountry(code,true);$('fg-country').scrollIntoView({block:'start',behavior:'instant'});$('fg-country').setAttribute('tabindex','-1');$('fg-country').focus({preventScroll:true});}
 function paintList(){const rows=M.filtered(d,filter);$('fg-list').innerHTML=V.countryList(d,{...filter,selected});$('fg-count').textContent=rows.length+' / '+d.countries.length;$('fg-list-status').textContent=rows.length+' matching country records';}
 function paintChanges(){$('fg-changes').innerHTML=V.changes(d,{country:$('fg-change-country').value,type:$('fg-change-type').value});}
 function paintCompare(){$('fg-comparison').innerHTML=V.compare(d,M.byCode(d,$('fg-compare-a').value),M.byCode(d,$('fg-compare-b').value));}
 document.querySelector('main.fg').addEventListener('click',async ev=>{
  const countryLink=ev.target.closest('[data-fg-country]');
  if(countryLink){if(ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey)return;ev.preventDefault();openCountry(countryLink.dataset.fgCountry);return;}
  const land=ev.target.closest('#fg-land [data-code]');if(land&&M.byCode(d,land.dataset.code)){openCountry(land.dataset.code);return;}
  if(ev.target.closest('#fg-save')){saved={country:selected};let stored=true;try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{stored=false;}savedPersisted=stored;$('fg-save').textContent='My country ✓';$('fg-save-status').textContent=stored?'Saved. We’ll open this country when you return in this browser.':'Selected for this visit. Browser storage is unavailable, so this cannot be remembered after you leave.';banner();return;}
  if(ev.target.closest('#fg-forget')){saved={country:null};let cleared=true;try{localStorage.removeItem(KEY);}catch{cleared=false;}banner();$('fg-save').textContent='Set as my country';$('fg-save-status').textContent=cleared?'Saved country removed.':'Cleared for this visit. Your browser did not allow the stored preference to be removed.';return;}
  if(ev.target.closest('#fg-share')){const link=new URL(M.countryURL(selected),location.origin).href;try{await navigator.clipboard.writeText(link);$('fg-save-status').textContent='Country link copied.';}catch{$('fg-save-status').innerHTML='<label for="fg-copy-link">Copy this country link</label><input id="fg-copy-link" readonly value="'+M.esc(link)+'">';$('fg-copy-link').focus();$('fg-copy-link').select();}return;}
  const region=ev.target.closest('[data-fg-region]');if(region){const name=region.dataset.fgRegion;applyBox(M.regionBoxes[name]);all('[data-fg-region]').forEach(el=>el.setAttribute('aria-pressed',String(el===region)));filter.region=name==='World'?'':name;$('fg-region').value=filter.region;paintList();return;}
  const zoom=ev.target.closest('[data-fg-zoom]');if(zoom){const action=zoom.dataset.fgZoom;if(action==='reset'){applyBox(M.regionBoxes.World);all('[data-fg-region]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.fgRegion==='World')));}else{const f=action==='in'?.72:1/.72;applyBox([box[0]+box[2]*(1-f)/2,box[1]+box[3]*(1-f)/2,box[2]*f,box[3]*f]);}return;}
 });
 $('fg-search').addEventListener('input',ev=>{filter.query=ev.target.value;paintList();});
 $('fg-status').addEventListener('change',ev=>{filter.status=ev.target.value;paintList();});
 $('fg-region').addEventListener('change',ev=>{filter.region=ev.target.value;applyBox(M.regionBoxes[filter.region||'World']);all('[data-fg-region]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.fgRegion===(filter.region||'World'))));paintList();});
 $('fg-reset').addEventListener('click',()=>{filter={query:'',status:'',region:''};$('fg-search').value='';$('fg-status').value='';$('fg-region').value='';applyBox(M.regionBoxes.World);all('[data-fg-region]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.fgRegion==='World')));paintList();});
 for(const id of ['fg-change-country','fg-change-type'])$(id).addEventListener('change',paintChanges);
 for(const id of ['fg-compare-a','fg-compare-b'])$(id).addEventListener('change',paintCompare);
 $('fg-hardware').addEventListener('change',updateAdvice);
 window.addEventListener('popstate',()=>paintCountry(M.countryFromURL(d,location.href)||saved.country||'US',true));
 paintCountry(selected);banner();
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){all('.fg-nav a').forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-15% 0px -65% 0px'});all('.fg-section').forEach(el=>observer.observe(el));}
})();
