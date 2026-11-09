/* Reading preferences stay on this browser. Reporting and account controls are untouched. */
(function(){'use strict';var article=document.querySelector('.rs-article'),bar=document.querySelector('.rs-tools');if(!article||!bar)return;
var controls=bar.querySelector('.rs-controls'),status=bar.querySelector('.rs-status'),focus=bar.querySelector('[data-rs-focus]'),size=0,key='sd-reader-text-v1',frame=false;
controls.hidden=false;
try{var saved=localStorage.getItem(key);if(['0','1','2'].includes(saved))size=Number(saved);}catch(e){}
function apply(){article.dataset.textSize=String(size);bar.querySelector('[data-rs-size="-1"]').disabled=size===0;bar.querySelector('[data-rs-size="1"]').disabled=size===2;}
bar.querySelectorAll('[data-rs-size]').forEach(function(b){b.onclick=function(){size=Math.max(0,Math.min(2,size+Number(b.dataset.rsSize)));apply();try{localStorage.setItem(key,String(size));status.textContent=['Standard','Larger','Largest'][size]+' article text · saved on this device';}catch(e){status.textContent='Text size changed for this visit';}};});apply();
function setFocus(on){document.body.classList.toggle('rs-focus',on);focus.setAttribute('aria-pressed',String(on));focus.textContent=on?'Exit focus':'Focus';status.textContent=on?'Focus mode. Press Escape or Exit focus to return.':'Full page restored.';}
focus.onclick=function(){setFocus(!document.body.classList.contains('rs-focus'));};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.body.classList.contains('rs-focus')&&!document.querySelector('dialog[open]')){setFocus(false);focus.focus({preventScroll:true});}});
document.addEventListener('click',function(e){if(e.target.closest('a[href="#comments"]')&&document.body.classList.contains('rs-focus'))setFocus(false);});
var copyBtn=bar.querySelector('[data-rs-copy]'),shareBtn=bar.querySelector('[data-rs-share]'),pageUrl=function(){return document.querySelector('link[rel=canonical]')?.href||location.href;};
if(copyBtn)copyBtn.onclick=async function(){try{await navigator.clipboard.writeText(pageUrl());status.textContent='Article link copied.';copyBtn.textContent='Link copied';setTimeout(function(){copyBtn.textContent='Copy link';},1800);}catch(e){status.textContent='Copy failed. Use your browser’s address bar.';}};
if(shareBtn&&navigator.share){shareBtn.hidden=false;shareBtn.onclick=async function(){try{await navigator.share({title:document.title,url:pageUrl()});status.textContent='Share menu opened.';}catch(e){status.textContent=e.name==='AbortError'?'Sharing cancelled.':'Use your browser’s share menu to share this article.';}};}
bar.querySelector('[data-rs-print]').onclick=function(){window.print();};
var progress=document.createElement('div');progress.className='rs-progress';progress.setAttribute('aria-hidden','true');var fill=document.createElement('span');progress.append(fill);document.body.append(progress);
function update(){frame=false;var r=article.getBoundingClientRect(),start=scrollY+r.top,end=start+article.offsetHeight-innerHeight,ratio=Math.max(0,Math.min(1,(scrollY-start)/Math.max(1,end-start)));fill.style.transform='scaleX('+ratio+')';}
function schedule(){if(!frame){frame=true;requestAnimationFrame(update);}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);if(window.ResizeObserver)new ResizeObserver(schedule).observe(article);update();
})();
