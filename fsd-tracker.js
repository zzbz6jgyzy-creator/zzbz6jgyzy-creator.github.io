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
