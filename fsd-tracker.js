(function(){'use strict';
// Progressive enhancement: the page reads fully without this. It adds tooltips on the adoption bars.
const root=document.querySelector('.ft');if(!root)return;
const bars=[...root.querySelectorAll('.ft-bar')];if(!bars.length)return;
const tip=document.createElement('div');tip.className='ft-tip';tip.hidden=true;tip.setAttribute('aria-hidden','true');document.body.appendChild(tip);
const show=(bar,x,y)=>{tip.textContent=bar.getAttribute('aria-label');tip.hidden=false;const w=tip.offsetWidth;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+'px';tip.style.top=Math.max(8,y-tip.offsetHeight-14)+'px';};
const hide=()=>{tip.hidden=true;};
bars.forEach(b=>{
 b.addEventListener('mousemove',ev=>show(b,ev.clientX,ev.clientY));b.addEventListener('mouseleave',hide);
 b.addEventListener('focus',()=>{const r=b.getBoundingClientRect();show(b,r.left+r.width/2,r.top);});b.addEventListener('blur',hide);
});
addEventListener('keydown',ev=>{if(ev.key==='Escape')hide();});
})();

// "Your country": remembered on this device only. Text comes from the page, so the wording is the same as the build.
(function(){
const box=document.getElementById('ft-pick'),sel=document.getElementById('ft-pick-sel'),out=document.getElementById('ft-pick-out');if(!box||!sel||!out)return;
const KEY='sd-fsd-country';let saved='';try{saved=localStorage.getItem(KEY)||'';}catch(e){}
const apply=v=>{const o=sel.querySelector('option[value="'+v+'"]');out.textContent=o&&v?o.getAttribute('data-text'):'';};
box.hidden=false;if(saved&&sel.querySelector('option[value="'+saved+'"]')){sel.value=saved;apply(saved);}
sel.addEventListener('change',()=>{apply(sel.value);try{sel.value?localStorage.setItem(KEY,sel.value):localStorage.removeItem(KEY);}catch(e){}});
})();
