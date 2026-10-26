(function(){
  'use strict';
  const root=document.querySelector('.pr-studio'),M=window.SDPromiseModel,V=window.SDPromiseView;
  if(!root||!M||!V)return;
  const $=id=>document.getElementById(id),KEY='sd-promise-ledger-v1';let d,prefs,storage=true;
  try{const payload=JSON.parse($('pr-data').textContent);d=M.normalize(payload.raw,payload.guide);}catch{return;}
  try{prefs=M.preferences(JSON.parse(localStorage.getItem(KEY)||'{}'),d);}catch{prefs=M.preferences({},d);storage=false;}
  let saved=prefs.saved,state=M.state(prefs.filters,d),previousFocus;
  const params=new URLSearchParams(location.search);
  if([...params].some(([k])=>['company','topic','status','q','view','sort'].includes(k)))state=M.state(Object.fromEntries(params),d);
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify({saved,filters:{company:state.company,topic:state.topic,status:state.status,view:state.view,sort:state.sort}}));storage=true;}catch{storage=false;}$('pr-storage-note').textContent=storage?'':'Browser storage is unavailable. Your watchlist will last for this page visit.';};
  function render(){
    state=M.state(state,d);const rows=M.filtered(d,state,saved),pages=Math.max(1,Math.ceil(rows.length/12));state.page=Math.min(state.page,pages);const start=(state.page-1)*12;
    $('pr-query').value=state.q;$('pr-company').value=state.company;$('pr-topic').value=state.topic;$('pr-sort').value=state.sort;
    root.querySelectorAll('[data-pr-status]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.prStatus===state.status));root.querySelectorAll('[data-pr-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.prView===state.view));
    $('pr-saved-only').setAttribute('aria-pressed',state.savedOnly);$('pr-saved-count').textContent=saved.length;$('pr-nav-saved').textContent=saved.length;
    $('pr-result-count').innerHTML=`<b>${rows.length}</b> ${rows.length===1?'record':'records'}${rows.length&&state.view==='cards'?' <span>/ '+(start+1)+'–'+Math.min(start+12,rows.length)+' shown</span>':''}`;
    const empty=`<div class="pr-empty"><span>☆</span><h3>${state.savedOnly&&!saved.length?'Your watchlist starts with one claim.':'No records match this view.'}</h3><p>${state.savedOnly&&!saved.length?'Save a record using its star, then return to its evidence and revisions in this browser.':'Try another project, include all statuses or remove a filter.'}</p><button type="button" data-pr-reset class="pr-button">Explore the full ledger ${V.arrow}</button></div>`;
    $('pr-results').innerHTML=!rows.length?empty:state.view==='timeline'?V.timeline(d,rows):'<div class="pr-record-grid">'+rows.slice(start,start+12).map(p=>V.card(p,d,saved)).join('')+'</div>';
    if(state.view==='cards')for(const article of $('pr-results').querySelectorAll('[data-pr-record]')){const p=d.records.find(p=>p.id===article.dataset.prRecord);if(p.status==='In progress'&&M.target(p,d).end!==null&&Date.now()>=M.target(p,d).end)article.insertAdjacentHTML('afterbegin','<p class="pr-review-needed">Target window passed · editorial status awaits review</p>');}
    $('pr-pagination').innerHTML=rows.length>12&&state.view==='cards'?`<button type="button" data-pr-page="${state.page-1}" ${state.page===1?'disabled':''}>← Previous</button><span>Page ${state.page} of ${pages}</span><button type="button" data-pr-page="${state.page+1}" ${state.page===pages?'disabled':''}>Next →</button>`:'';
    const active=[['company',state.company],['topic',state.topic],['status',state.status],['q',state.q],['savedOnly',state.savedOnly?'Your watchlist':'']].filter(x=>x[1]);$('pr-active-filters').innerHTML=active.map(([k,v])=>`<button type="button" data-pr-clear="${k}" aria-label="Remove ${M.esc(v)} filter">${M.esc(v)} <span>×</span></button>`).join('');
    persist();
  }
  function change(patch,scroll=false){state={...state,...patch,page:1};render();if(scroll)$('pr-controls').scrollIntoView({block:'start',behavior:'auto'});}
  function reset(){change({company:'',topic:'',status:'',q:'',savedOnly:false,view:'cards',sort:'recent'});}
  function save(id){const p=d.records.find(p=>p.id===id);if(!p)return;const focused=document.activeElement;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];render();for(const b of root.querySelectorAll('[data-pr-save="'+id+'"]')){const on=saved.includes(id);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',(on?'Unsave ':'Save ')+p.title);const label=b.querySelector('.pr-save-label');if(label)label.textContent=on?'Saved':'Save';}if(focused?.isConnected)focused.focus({preventScroll:true});else root.querySelector('[data-pr-save="'+id+'"]')?.focus({preventScroll:true});}
  function openRecord(id){const p=d.records.find(p=>p.id===id);if(!p)return;const dialog=$('pr-dialog');if(!dialog.open)previousFocus=document.activeElement;$('pr-dialog-body').innerHTML=V.dossier(p,d,{dialog:true,saved});if(p.status==='In progress'&&M.target(p,d).end!==null&&Date.now()>=M.target(p,d).end)$('pr-dialog-body').insertAdjacentHTML('afterbegin','<p class="pr-review-needed">This target window has passed since the recorded review. The saved status has not been reassessed here.</p>');if(!dialog.open)dialog.showModal();$('pr-close').focus({preventScroll:true});}
  function showRecord(id){if(location.hash!=='#'+id)history.pushState(null,'','#'+id);openRecord(id);}
  function route(){const id=location.hash.slice(1),record=d.records.find(p=>p.id===id);if(record)openRecord(record.id);else{if($('pr-dialog').open)$('pr-dialog').close();if(id==='watchlist')change({company:'',topic:'',status:'',q:'',savedOnly:true},true);}}
  $('pr-dialog').addEventListener('close',()=>{if(d.records.some(p=>location.hash==='#'+p.id))history.replaceState(null,'',location.pathname+location.search+'#explore');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});else $('pr-query').focus({preventScroll:true});});
  $('pr-dialog').addEventListener('click',ev=>{if(ev.target!==$('pr-dialog'))return;const r=ev.target.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)$('pr-dialog').close();});
  async function copy(text,target){try{if(!navigator.clipboard?.writeText)throw Error('Unavailable');await navigator.clipboard.writeText(text);target.textContent='Link copied.';}catch{target.textContent='Copy this link: '+text;}}
  root.addEventListener('click',ev=>{
    const t=ev.target.closest('button,a[data-pr-open],a[data-pr-topic]');if(!t)return;const a=t.dataset;
    if(a.prOpen){ev.preventDefault();showRecord(a.prOpen);return;}if(a.prSave){save(a.prSave);return;}if(t.id==='pr-close'){$('pr-dialog').close();return;}
    if(a.prCopy){copy(M.share(state,a.prCopy),$('pr-dialog-status'));return;}
    if('prStatus'in a){change({status:a.prStatus});return;}if('prView'in a){change({view:a.prView});return;}
    if(a.prTopic){ev.preventDefault();change({topic:a.prTopic,company:'',status:'',q:'',savedOnly:false},true);return;}
    if('prWatchlist'in a||t.id==='pr-saved-only'){change({company:'',topic:'',status:'',q:'',savedOnly:t.id==='pr-saved-only'?!state.savedOnly:true},true);return;}
    if(a.prPage){state.page=Number(a.prPage);render();$('pr-result-count').scrollIntoView({block:'center'});return;}
    if(a.prClear){change({[a.prClear]:a.prClear==='savedOnly'?false:''});return;}
    if('prReset'in a||t.id==='pr-reset'){reset();return;}if(t.id==='pr-copy-search')copy(M.share(state),$('pr-share-status'));
  });
  $('pr-query').addEventListener('input',ev=>change({q:ev.target.value}));$('pr-company').addEventListener('change',ev=>change({company:ev.target.value}));$('pr-topic').addEventListener('change',ev=>change({topic:ev.target.value}));$('pr-sort').addEventListener('change',ev=>change({sort:ev.target.value}));
  for(const selector of ['[data-pr-status]','[data-pr-view]']){const buttons=[...root.querySelectorAll(selector)];for(const button of buttons)button.addEventListener('keydown',ev=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;ev.preventDefault();const i=buttons.indexOf(button),n=ev.key==='Home'?0:ev.key==='End'?buttons.length-1:(i+(ev.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[n].focus();buttons[n].click();});}
  function updateWindows(){const rows=M.upcoming(d);$('pr-watch-next').innerHTML=rows.length?rows.map(p=>`<article class="pr-highlight"><div><span class="pr-status pr-status-${M.statusClass(p.status)}">${M.esc(p.status)}</span><span class="pr-kicker">${M.esc(p.company)}</span></div><p class="pr-highlight-date">${M.esc(M.target(p,d).label)}</p><h3><a href="#${p.id}" data-pr-open="${p.id}">${M.esc(p.title)}</a></h3><p class="pr-fine">Recorded target window; not a confirmed launch or availability date.</p><a class="pr-text-link" href="#${p.id}" data-pr-open="${p.id}">Read the evidence ${V.arrow}</a></article>`).join(''):'<p>No future In progress target window remains in this saved collection. Check the underlying sources for newer statements.</p>';const elapsed=d.records.filter(p=>p.status==='In progress'&&M.target(p,d).end!==null&&M.target(p,d).end<=Date.now()).length;const age=(Date.now()-Date.parse(d.updated+'T12:00:00Z'))/86400000;$('pr-runtime-status').textContent=elapsed?elapsed+' open target windows have passed since the saved review. Their editorial statuses need checking.':age>120?'This saved source snapshot is over 120 days old. Check the original sources for newer statements.':'';}
  window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
  root.dataset.enhanced='true';updateWindows();render();route();
})();
