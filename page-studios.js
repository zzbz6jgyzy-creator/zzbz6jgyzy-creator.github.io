/* Optional, device-only preparation checklist. Sign-in and site search retain their own controllers. */
(function(){'use strict';var list=document.querySelector('[data-ps-checklist]');if(!list)return;var key='sd-gear-preparation-v1',inputs=Array.from(list.querySelectorAll('input[type=checkbox]')),status=list.querySelector('[role=status]'),saved=[];
try{var raw=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(raw))saved=raw;}catch(e){}
inputs.forEach(function(input,index){input.checked=saved.includes(index);input.addEventListener('change',function(){var next=inputs.map(function(x,i){return x.checked?i:-1;}).filter(function(i){return i>=0;});try{localStorage.setItem(key,JSON.stringify(next));status.textContent=next.length+' of '+inputs.length+' checks complete · saved on this device';}catch(e){status.textContent='Checklist available for this visit · storage unavailable';}});});
})();
