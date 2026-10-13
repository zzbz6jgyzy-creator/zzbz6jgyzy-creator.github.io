// Vanilla ports of 21st.dev MIT components: NumberFlow (barvian), Magic Card + Blur Fade (Magic UI).
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function col(d){var h='';for(var i=0;i<10;i++)h+='<span>'+i+'</span>';return '<span class="nf-d"><span class="nf-c" style="transform:translateY(-'+d+'em)">'+h+'</span></span>';}
  // Set a number on element el, rolling changed digits.
  window.sdNum=function(el,v){v=String(v);
    if(reduce||!/^\d+$/.test(v)){el.textContent=v;delete el.dataset.v;return;}
    if(el.dataset.v===v)return;
    var cs=el.querySelectorAll('.nf-c');
    if(!el.dataset.v||cs.length!==v.length){el.innerHTML='<span class="nf" aria-hidden="true">'+v.split('').map(col).join('')+'</span>';}
    else v.split('').forEach(function(d,j){cs[j].style.transform='translateY(-'+d+'em)';});
    el.dataset.v=v;el.setAttribute('aria-label',v);};
  // Live card: reuse tiles in place.
  window.sdRoll=function(c,html){
    var t=document.createElement('div');t.innerHTML=html;
    var nb=t.querySelectorAll('.lw-tile'),ob=c.querySelectorAll('.lw-tile');
    var same=nb.length&&nb.length===ob.length&&[].every.call(nb,function(n,i){return n.querySelector('i').textContent===ob[i].querySelector('i').textContent;});
    if(!same){c.innerHTML=html;ob=c.querySelectorAll('.lw-tile');}
    [].forEach.call(nb,function(n,i){window.sdNum(ob[i].querySelector('b'),n.querySelector('b').textContent);});
  };
  document.addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest('.hx-tile');if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');},{passive:true});
  // Blur Fade for list items added at any time.
  if(reduce||!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('bf-in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -5% 0px'});
  var SEL='.news-card:not(.is-skeleton),.cal-row';
  function scan(){[].forEach.call(document.querySelectorAll(SEL),function(n){if(n.dataset.bf)return;n.dataset.bf=1;var r=n.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)return;n.classList.add('bf');io.observe(n);});}
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',scan);
})();
