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
const find=v=>[...sel.options].find(o=>o.value===v&&v);
const apply=v=>{const o=find(v);out.textContent=o&&v?o.getAttribute('data-text'):'';};
// My Tesla's saved car (sd-my-tesla-garage-v2), read only: its country fills the picker when none is chosen here.
let car=null;try{const g=JSON.parse(localStorage.getItem('sd-my-tesla-garage-v2')||'null');if(g&&Array.isArray(g.cars))car=g.cars.find(c=>c&&c.id===g.activeId)||g.cars[0]||null;}catch(e){}
if(!saved&&car&&typeof car.cc==='string'&&find(car.cc))saved=car.cc;
// Only what the owner entered in My Tesla is shown. We never infer hardware from the model year (My Tesla does not either).
try{
 const carBox=document.getElementById('ft-car'),carOut=document.getElementById('ft-car-out');
 const NAMES={'3':'Model 3',Y:'Model Y',S:'Model S',X:'Model X',CT:'Cybertruck'},HW={hw1:'HW1',hw2:'HW2',hw25:'HW2.5',hw3:'HW3',hw4:'HW4 / AI4'};
 if(carBox&&carOut&&car&&Object.hasOwn(NAMES,car.model)&&Number.isInteger(car.year)){
  const label=Object.hasOwn(HW,car.hw)?HW[car.hw]:'';
  carOut.textContent=car.year+' '+NAMES[car.model]+(typeof car.name==='string'&&car.name?' ('+car.name.slice(0,40)+')':'')+': '+(label?'computer '+label+', as you confirmed in My Tesla.':'computer not confirmed in My Tesla (Controls → Software → Additional Vehicle Information shows it).')+' Whether FSD (Supervised) runs on a car depends on its hardware, its country and Tesla\'s rollout; the country line above is only Tesla\'s market list.';
  carBox.hidden=false;
 }
}catch(e){}
box.hidden=false;if(saved&&find(saved)){sel.value=saved;apply(saved);}
sel.addEventListener('change',()=>{apply(sel.value);try{sel.value?localStorage.setItem(KEY,sel.value):localStorage.removeItem(KEY);}catch(e){}});
})();

// "Save image": draws a chart, its title, key and source line into a 1200x630 PNG for sharing. Uses the chart already on the page.
// A card only gets a button if it has a source line, so no image leaves the page without its source and date.
(function(){
const root=document.querySelector('.ft');if(!root||!window.HTMLCanvasElement||!window.XMLSerializer)return;
const PROPS=['fill','fill-opacity','stroke','stroke-width','stroke-dasharray','stroke-opacity','stroke-linecap','stroke-linejoin','opacity','font-family','font-size','font-weight','letter-spacing','text-anchor','dominant-baseline','paint-order'];
const inline=(from,to)=>{const a=[from,...from.querySelectorAll('*')],b=[to,...to.querySelectorAll('*')];a.forEach((el,i)=>{const cs=getComputedStyle(el);b[i].setAttribute('style',PROPS.map(p=>p+':'+cs.getPropertyValue(p)).join(';'));});};
function svgData(svg){
 const clone=svg.cloneNode(true);inline(svg,clone);
 clone.querySelectorAll('use').forEach((u,i)=>{const ref=(u.getAttribute('href')||u.getAttribute('xlink:href')||'');const src=ref.startsWith('#')&&document.getElementById(ref.slice(1));
  const orig=svg.querySelectorAll('use')[i];if(!src){u.remove();return;}const c=src.cloneNode(true);inline(src,c);c.removeAttribute('id');
  const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('style',orig?PROPS.map(p=>p+':'+getComputedStyle(orig).getPropertyValue(p)).join(';'):'');g.appendChild(c);u.replaceWith(g);});
 clone.querySelectorAll('title,desc').forEach(n=>n.remove());
 const vb=(svg.getAttribute('viewBox')||'0 0 800 400').split(/[\s,]+/).map(Number);
 clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width',vb[2]*2);clone.setAttribute('height',vb[3]*2);
 return {url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone)),w:vb[2],h:vb[3]};
}
const load=async svg=>{const d=svgData(svg),img=new Image();img.src=d.url;await img.decode();return {img,w:d.w,h:d.h};};
const wrap=(ctx,text,max)=>{const out=[];let line='';for(const w of text.split(/\s+/)){const t=line?line+' '+w:w;if(ctx.measureText(t).width>max&&line){out.push(line);line=w;}else line=t;}if(line)out.push(line);return out;};
const clean=t=>(t||'').replace(/\s+/g,' ').replace(/ →/g,'').trim();
const sourceOf=card=>clean((card.querySelector('figcaption')||card.querySelector('.ft-event-foot')||{}).textContent);
let busy=false;
async function save(card,svg,name,btn,msg){
 if(busy)return;busy=true;btn.setAttribute('aria-disabled','true');msg.textContent='';
 try{
  const font=getComputedStyle(document.body).fontFamily,mono="'IBM Plex Mono',ui-monospace,monospace";
  const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');
  x.fillStyle='#080a0e';x.fillRect(0,0,1200,630);
  x.fillStyle='#ff3e60';x.font='500 17px '+mono;x.fillText('SUPERCHARGED DAILY · FSD BY THE NUMBERS',56,52);
  const title=card.getAttribute('data-share-title')||(card.querySelector('h3')||card.closest('section').querySelector('h2')).textContent.trim();
  x.fillStyle='#f3f4f7';x.font='600 36px '+font;x.fillText(title,56,98);
  // The card's own description (sample, units, dates) travels with the picture.
  const desc=card.hasAttribute('data-share-note')?card.getAttribute('data-share-note'):clean((card.querySelector('.ft-muted')||{}).textContent);
  x.fillStyle='#a6aeba';x.font='400 15px '+font;const dl=desc?wrap(x,desc,1088).slice(0,3):[];dl.forEach((l,i)=>x.fillText(l,56,128+i*20));
  const top=140+dl.length*20,key=[...card.querySelectorAll('.ft-key li, .ft-maplegend li')];
  const box={x:56,y:top,w:key.length?760:1088,h:560-top-10};
  const main=await load(svg),k=Math.min(box.w/main.w,box.h/main.h),dw=main.w*k,dh=main.h*k;x.drawImage(main.img,box.x+(box.w-dw)/2,box.y+(box.h-dh)/2,dw,dh);
  key.slice(0,8).forEach((li,i)=>{const sw=li.querySelector('i'),y=top+16+i*38;x.fillStyle=sw?getComputedStyle(sw).backgroundColor:'#fff';x.fillRect(848,y-12,14,14);x.fillStyle='#d5dbe4';x.font='500 14px '+mono;wrap(x,[...li.children].map(n=>n.textContent.trim()).filter(Boolean).join(' · ')||li.textContent.trim(),296).slice(0,2).forEach((l,j)=>x.fillText(l,872,y+j*17));});
  const eu=card.querySelector('svg.ft-map-eu');if(eu){const e2=await load(eu),kk=Math.min(330/e2.w,200/e2.h);x.drawImage(e2.img,848,key.length>=4?top+key.length*38+8:top+170,e2.w*kk,e2.h*kk);x.fillStyle='#a6aeba';x.font='500 12px '+mono;x.fillText('Europe, enlarged',848,(key.length>=4?top+key.length*38+8:top+170)-6);}
  const src=sourceOf(card);
  x.fillStyle='#a6aeba';x.font='400 15px '+font;wrap(x,src,1088).slice(0,3).forEach((l,i)=>x.fillText(l,56,570+i*19));
  x.fillStyle='#ffffff';x.font='500 15px '+mono;x.textAlign='right';x.fillText('SUPERCHARGEDDAILY.COM/FSD-TRACKER',1144,52);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('no image');
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='supercharged-daily-'+name+'.png';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
  msg.textContent='Image saved';
 }catch(e){msg.textContent='Could not make the image';}
 finally{busy=false;btn.removeAttribute('aria-disabled');setTimeout(()=>{msg.textContent='';},4000);}
}
root.querySelectorAll('.ft-fig').forEach(card=>{
 const svg=card.querySelector('.ft-desk svg.ft-chart')||card.querySelector('svg.ft-map:not(.ft-map-eu)');if(!svg||!sourceOf(card))return;
 const heading=card.getAttribute('data-share-title')||(card.querySelector('h3')?card.querySelector('h3').textContent.trim():card.closest('section').querySelector('h2').textContent.trim());
 const id=card.closest('section').id+(card.querySelector('h3')?'-'+card.querySelector('h3').textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'');
 const b=document.createElement('button');b.type='button';b.className='ft-save';b.textContent='Save image';
 const hid=document.createElement('span');hid.className='visually-hidden';hid.textContent=' of '+heading;b.appendChild(hid);
 const msg=document.createElement('span');msg.className='ft-save-msg';msg.setAttribute('role','status');
 b.addEventListener('click',()=>save(card,svg,id,b,msg));card.appendChild(b);card.appendChild(msg);
});
})();
