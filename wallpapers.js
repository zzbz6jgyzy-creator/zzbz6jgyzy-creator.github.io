(function(){var box=document.querySelector('[data-wp-box]');if(!box)return;
var img=box.querySelector('[data-wp-img]'),t=box.querySelector('[data-wp-title]'),ph=box.querySelector('[data-wp-phone]'),dk=box.querySelector('[data-wp-desk]'),tg=box.querySelector('[data-wp-toggle]'),cur=null,isPhone=false;
function show(){if(cur.hasAttribute('data-no-desktop'))isPhone=true;img.src=isPhone?cur.dataset.phone:cur.dataset.full;img.alt=cur.dataset.title+(isPhone?' (phone)':' (desktop)');tg.textContent=isPhone?'Show desktop':'Show phone';tg.style.display=cur.hasAttribute('data-no-desktop')?'none':'';}
document.querySelectorAll('[data-wp-open]').forEach(function(b){b.addEventListener('click',function(){cur=b;isPhone=window.innerWidth<window.innerHeight;t.textContent=b.dataset.title;
var slug=b.dataset.full.split('/').pop().replace('-desktop.jpg','');ph.href=b.dataset.phone;ph.setAttribute('download','supercharged-'+slug+'-phone.jpg');dk.style.display=b.hasAttribute('data-no-desktop')?'none':'';dk.href=b.dataset.full;dk.setAttribute('download','supercharged-'+slug+'-desktop.jpg');show();
if(box.showModal)box.showModal();else box.setAttribute('open','');});});
tg.addEventListener('click',function(){isPhone=!isPhone;show();});
box.querySelector('[data-wp-close]').addEventListener('click',function(){box.close();});
box.addEventListener('click',function(e){if(e.target===box)box.close();});})();
