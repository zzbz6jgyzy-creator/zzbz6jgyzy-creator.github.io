// Original CSS 3D circular wallpaper carousel for Supercharged Daily (written from scratch).
// The static grid stays in the HTML as the no-JS / reduced-motion fallback and the source of truth.
(function(){
  var grid=document.querySelector('.wp-grid');if(!grid)return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(!(window.CSS&&CSS.supports&&CSS.supports('transform-style','preserve-3d')))return;
  var cards=[].slice.call(grid.querySelectorAll('.wp-card'));var n=cards.length;if(n<3)return;
  var wrap=document.createElement('div');wrap.className='wpr';
  wrap.innerHTML='<div class="wpr-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Wallpapers, use arrow keys to browse"><div class="wpr-ring"></div></div>'+
    '<div class="wpr-nav"><button type="button" class="wpr-arrow" data-d="-1" aria-label="Previous wallpaper">‹</button><span class="wpr-count" aria-live="polite"></span><button type="button" class="wpr-arrow" data-d="1" aria-label="Next wallpaper">›</button></div>'+
    '<div class="wpr-info"></div>';
  grid.parentNode.insertBefore(wrap,grid);grid.classList.add('wpr-hidden');
  var stage=wrap.querySelector('.wpr-stage'),ring=wrap.querySelector('.wpr-ring'),info=wrap.querySelector('.wpr-info'),count=wrap.querySelector('.wpr-count');
  var step=360/n,items=cards.map(function(c,i){
    var src=c.querySelector('.wp-thumb img'),b=document.createElement('button');
    b.type='button';b.className='wpr-item';b.dataset.i=i;b.setAttribute('aria-label','Preview '+c.querySelector('h3').textContent);
    b.innerHTML='<img alt="" decoding="async" width="480" height="1040"><span class="wpr-title">'+c.querySelector('h3').textContent+'</span>';
    b._src=src.getAttribute('src');ring.appendChild(b);return b;});
  var radius=0,angle=0,target=0,vel=0,raf=0;
  function size(){var w=items[0].offsetWidth||200;radius=Math.round(w/2/Math.tan(Math.PI/n)*1.18);
    items.forEach(function(b,i){b.style.transform='rotateY('+(i*step)+'deg) translateZ('+radius+'px)';});
    stage.style.setProperty('--r',radius+'px');render();}
  function active(){return ((Math.round(-angle/step)%n)+n)%n;}
  var last=-1;
  function render(){ring.style.transform='translateZ('+(-radius)+'px) rotateY('+angle+'deg)';
    var a=active();items.forEach(function(b,i){var d=Math.min(((i-a)%n+n)%n,((a-i)%n+n)%n);
      b.classList.toggle('is-active',i===a);b.style.opacity=d>3?0.15:1-d*.2;
      if(d<=2&&!b._loaded){b.querySelector('img').src=b._src;b._loaded=1;}});
    if(a!==last){last=a;count.textContent=(a+1)+' / '+n;var fc=cards[a].querySelector('figcaption').cloneNode(true);info.innerHTML='';info.appendChild(fc);}}
  function loop(){if(!drag){angle+=(target-angle)*.14;if(Math.abs(target-angle)<.05)angle=target;}render();if(drag||angle!==target)raf=requestAnimationFrame(loop);else raf=0;}
  function kick(){if(!raf)raf=requestAnimationFrame(loop);}
  function snap(){target=Math.round(target/step)*step;kick();}
  function go(d){target=Math.round(target/step)*step-d*step;kick();}
  wrap.querySelectorAll('.wpr-arrow').forEach(function(b){b.addEventListener('click',function(){go(+b.dataset.d);});});
  stage.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){go(1);e.preventDefault();}else if(e.key==='ArrowLeft'){go(-1);e.preventDefault();}else if(e.key==='Enter'){open(active());}});
  var wt;stage.addEventListener('wheel',function(e){var dx=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:(e.shiftKey?e.deltaY:0);
    if(!dx&&!stage.matches(':hover'))return;dx=dx||e.deltaY;e.preventDefault();target-=dx*.12;kick();clearTimeout(wt);wt=setTimeout(snap,140);},{passive:false});
  var drag=false,sx=0,sa=0,moved=0,lx=0,lt=0;
  stage.addEventListener('pointerdown',function(e){if(e.button)return;drag=true;moved=0;sx=lx=e.clientX;sa=angle;lt=performance.now();vel=0;try{stage.setPointerCapture(e.pointerId);}catch(_){}kick();});
  stage.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));var now=performance.now();vel=(e.clientX-lx)/Math.max(1,now-lt);lx=e.clientX;lt=now;angle=target=sa+dx*(180/(radius*Math.PI/1.2));});
  function up(){if(!drag)return;drag=false;target=angle+vel*160*(180/(radius*Math.PI/1.2));snap();}
  stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
  function open(i){var b=cards[i].querySelector('[data-wp-open]');if(b)b.click();}
  ring.addEventListener('click',function(e){var b=e.target.closest('.wpr-item');if(!b||moved>6)return;var i=+b.dataset.i;
    if(i===active())open(i);else{var cur=active(),d=((i-cur)%n+n)%n;go(d>n/2?d-n:d);}});
  addEventListener('resize',size);size();
})();
