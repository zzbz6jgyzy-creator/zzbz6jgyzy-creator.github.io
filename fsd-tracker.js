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
const carBox=document.getElementById('ft-car'),carOut=document.getElementById('ft-car-out');let hw=null;try{hw=JSON.parse(document.getElementById('ft-hw').textContent);}catch(e){}
const m=car&&hw&&hw.models[car.model];
if(m&&Number.isInteger(car.year)&&carBox&&carOut){
 const h=m.hw.find(r=>(r.from===null||car.year>=r.from)&&(r.to===null||car.year<=r.to));
 if(h){carOut.textContent=car.year+' '+m.name+(car.name?' ('+String(car.name).slice(0,40)+')':'')+': '+h.label+'. '+(hw.fsdHw.includes(h.id)?'My Tesla lists FSD (Supervised) for this hardware. Which version it runs differs by hardware and country.':hw.noHw);carBox.hidden=false;}
}
box.hidden=false;if(saved&&find(saved)){sel.value=saved;apply(saved);}
sel.addEventListener('change',()=>{apply(sel.value);try{sel.value?localStorage.setItem(KEY,sel.value):localStorage.removeItem(KEY);}catch(e){}});
})();

// "Save image": draws a chart, its title, key and source line into a 1200x630 PNG for sharing. Uses the chart already on the page.
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
const wrap=(ctx,text,max)=>{const out=[];let line='';for(const w of text.split(/\s+/)){const t=line?line+' '+w:w;if(ctx.measureText(t).width>max&&line){out.push(line);line=w;}else line=t;}if(line)out.push(line);return out;};
async function save(card,svg,name,btn){
 btn.disabled=true;
 try{
  const font=getComputedStyle(document.body).fontFamily,mono="'IBM Plex Mono',ui-monospace,monospace";
  const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');
  x.fillStyle='#080a0e';x.fillRect(0,0,1200,630);
  x.fillStyle='#ff3e60';x.font='500 17px '+mono;x.fillText('SUPERCHARGED DAILY · FSD BY THE NUMBERS',56,58);
  const title=(card.querySelector('h3')||card.closest('section').querySelector('h2')).textContent.trim();
  x.fillStyle='#f3f4f7';x.font='600 38px '+font;wrap(x,title,1088).slice(0,2).forEach((l,i)=>x.fillText(l,56,108+i*44));
  const key=[...card.querySelectorAll('.ft-key li, .ft-maplegend li')];
  const box={x:56,y:150,w:key.length?760:1088,h:380};
  const d=svgData(svg),img=new Image();img.src=d.url;await img.decode();
  const k=Math.min(box.w/d.w,box.h/d.h),dw=d.w*k,dh=d.h*k;x.drawImage(img,box.x+(box.w-dw)/2,box.y+(box.h-dh)/2,dw,dh);
  key.slice(0,8).forEach((li,i)=>{const sw=li.querySelector('i'),y=box.y+16+i*42;x.fillStyle=sw?getComputedStyle(sw).backgroundColor:'#fff';x.fillRect(848,y-12,14,14);x.fillStyle='#d5dbe4';x.font='500 15px '+mono;wrap(x,[...li.children].map(n=>n.textContent.trim()).filter(Boolean).join(' · ')||li.textContent.trim(),296).slice(0,2).forEach((l,j)=>x.fillText(l,872,y+j*18));});
  const cap=(card.querySelector('figcaption, .ft-event-foot')||{}).textContent||'';
  x.fillStyle='#a6aeba';x.font='400 15px '+font;wrap(x,cap.replace(/\s+/g,' ').replace(/ →/g,'').trim(),1088).slice(0,2).forEach((l,i)=>x.fillText(l,56,560+i*20));
  x.fillStyle='#ffffff';x.font='500 15px '+mono;x.textAlign='right';x.fillText('SUPERCHARGEDDAILY.COM/FSD-TRACKER',1144,612);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('no image');
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='supercharged-daily-'+name+'.png';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
  btn.textContent='Image saved';
 }catch(e){btn.textContent='Could not make the image';}
 finally{btn.disabled=false;setTimeout(()=>{btn.textContent='Save image';},2500);}
}
root.querySelectorAll('.ft-fig').forEach(card=>{
 const svg=card.querySelector('.ft-desk svg.ft-chart')||card.querySelector('svg.ft-map:not(.ft-map-eu)');if(!svg)return;
 const id=card.closest('section').id+(card.querySelector('h3')?'-'+card.querySelector('h3').textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'');
 const b=document.createElement('button');b.type='button';b.className='ft-save';b.textContent='Save image';
 b.setAttribute('aria-label','Save image of this chart (PNG, 1200 by 630 pixels)');
 b.addEventListener('click',()=>save(card,svg,id,b));card.appendChild(b);
});
})();
