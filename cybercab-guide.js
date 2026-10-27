(function(){'use strict';
// Progressive enhancement: the guide reads fully without this. It only adds the timeline filter.
const root=document.querySelector('.cg');if(!root)return;
const bar=root.querySelector('[data-filters]');if(!bar)return;
bar.hidden=false;
const buttons=[...bar.querySelectorAll('button')],events=[...root.querySelectorAll('.cg-event')],years=[...root.querySelectorAll('.cg-year')];
function show(type){
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===type)));
 events.forEach(x=>{x.hidden=type!=='all'&&x.dataset.type!==type;});
 years.forEach(y=>{y.hidden=!y.querySelector('.cg-event:not([hidden])');});
}
buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.type)));
})();
