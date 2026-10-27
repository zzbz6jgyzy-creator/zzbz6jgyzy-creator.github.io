(function(){'use strict';
// Progressive enhancement: the guide reads fully without this. It adds the timeline filter, the capacity slider and part highlighting.
const root=document.querySelector('.cg');if(!root)return;
const M=window.CybercabGuide;
const bar=root.querySelector('[data-filters]');
if(bar){
 bar.hidden=false;
 const buttons=[...bar.querySelectorAll('button')],events=[...root.querySelectorAll('.cg-event')],years=[...root.querySelectorAll('.cg-year')];
 const show=type=>{
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===type)));
  events.forEach(x=>{x.hidden=type!=='all'&&x.dataset.type!==type;});
  years.forEach(y=>{y.hidden=!y.querySelector('.cg-event:not([hidden])');});
 };
 buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.type)));
}
// Capacity: plain arithmetic from the same function the builder uses for the table.
const cap=root.querySelector('[data-cap]');
if(cap&&M){
 const box=cap.querySelector('[data-cap-control]'),input=cap.querySelector('input'),out=cap.querySelector('output'),read=cap.querySelector('[data-cap-read]');
 const c={yearly:+cap.dataset.yearly,target:+cap.dataset.target},nf=n=>n.toLocaleString('en-GB');
 const draw=()=>{const r=M.plan(+input.value,c);out.textContent=nf(r.weekly);read.textContent=`${nf(r.weekly)} a week is ${nf(r.yearly)} a year, ${r.pct}% of the installed capacity, and ${nf(r.weeks)} weeks to build ${nf(c.target)} cars.`;};
 input.addEventListener('input',draw);draw();box.hidden=false;
}
// Anatomy: hovering a listed part lights its marker on the drawing.
const parts=[...root.querySelectorAll('.cg-parts li')];
parts.forEach(li=>{
 const mark=root.querySelector(`.cg-mark[data-part="${li.dataset.part}"]`);if(!mark)return;
 const on=v=>()=>mark.classList.toggle('is-on',v);
 li.addEventListener('mouseenter',on(true));li.addEventListener('mouseleave',on(false));
});
})();
