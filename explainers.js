/* Native HTML is the lesson. Enhance controls without hiding the no-JS explanation. */
(() => {
  if(document.querySelector('[data-explainers-hub]')){
    const legacy={'hot-staging':'hot-staging',catch:'booster-catch',fsd:'fsd',evasion:'collision-evasion'};
    const redirect=()=>{const key=location.hash.slice(1);if(Object.prototype.hasOwnProperty.call(legacy,key))location.replace('/explainers/'+legacy[key]+'.html');};
    addEventListener('hashchange',redirect);redirect();
  }
  const lab=document.querySelector('[data-lesson-lab]');
  if(lab){
    let stages;try{stages=JSON.parse(lab.querySelector('[data-lesson-stages]').textContent);}catch{return;}
    if(!Array.isArray(stages)||!stages.length)return;
    const figure=lab.querySelector('[data-lesson-figure]'),controls=lab.querySelector('[data-lesson-controls]'),current=lab.querySelector('[data-current]');
    const steps=[...lab.querySelectorAll('.lx-step')],buttons=[...lab.querySelectorAll('[data-step-target]')];
    const slider=lab.querySelector('[data-scrub]'),play=lab.querySelector('[data-play]');let index=0,mode='hot',timer=null;
    const stop=()=>{clearInterval(timer);timer=null;play.textContent='Play steps';play.setAttribute('aria-pressed','false');};
    const render=value=>{
      index=Math.max(0,Math.min(stages.length-1,Number(value)||0));const stage=stages[index],stageTitle=mode==='cold'&&stage.coldTitle?stage.coldTitle:stage.title;figure.dataset.step=String(index);figure.dataset.mode=mode;
      for(const group of figure.querySelectorAll('[data-show],[data-mode-only]')){const shown=(!group.dataset.show||group.dataset.show.split(' ').includes(String(index)))&&(!group.dataset.modeOnly||group.dataset.modeOnly===mode);group.setAttribute('opacity',shown?'1':'0');}
      for(const group of figure.querySelectorAll('[data-poses]')){try{const positions=JSON.parse(mode==='cold'&&group.dataset.coldPoses?group.dataset.coldPoses:group.dataset.poses);group.setAttribute('transform',positions[index]||positions[0]);}catch{/* keep the static drawing */}}
      steps.forEach((step,i)=>{step.toggleAttribute('data-active',i===index);buttons[i].setAttribute('aria-current',i===index?'step':'false');const title=mode==='cold'&&stages[i].coldTitle?stages[i].coldTitle:stages[i].title;buttons[i].setAttribute('aria-label',`Step ${i+1}: ${title}`);buttons[i].querySelector('.lx-step-name').textContent=title;});
      slider.value=String(index);slider.setAttribute('aria-valuetext',`Step ${index+1}: ${stageTitle}`);
      lab.querySelector('[data-step-status]').textContent=`Step ${index+1} of ${stages.length}`;
      lab.querySelector('[data-current-number]').textContent=(mode==='cold'?'Cold staging · ':'')+`Step ${index+1} of ${stages.length}`;
      lab.querySelector('[data-current-title]').textContent=stageTitle;const target=lab.querySelector('[data-current-text]');
      if(mode==='cold'&&stage.cold)target.textContent=stage.cold;else target.replaceChildren(...[...steps[index].querySelector('p').childNodes].map(node=>node.cloneNode(true)));
      lab.querySelector('[data-previous]').disabled=index===0;lab.querySelector('[data-next]').disabled=index===stages.length-1;
    };
    controls.hidden=false;current.hidden=false;lab.classList.add('lx-enhanced');
    for(const button of buttons){button.hidden=false;button.closest('h3').querySelector('.lx-step-static').hidden=true;button.addEventListener('click',()=>{stop();render(button.dataset.stepTarget);});button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=Math.min(index+1,stages.length-1);else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=Math.max(index-1,0);else if(event.key==='Home')next=0;else if(event.key==='End')next=stages.length-1;else return;event.preventDefault();stop();render(next);buttons[next].focus();});}
    slider.max=String(stages.length-1);slider.addEventListener('input',()=>{stop();render(slider.value);});
    lab.querySelector('[data-previous]').addEventListener('click',()=>{stop();render(index-1);});lab.querySelector('[data-next]').addEventListener('click',()=>{stop();render(index+1);});lab.querySelector('[data-restart]').addEventListener('click',()=>{stop();render(0);});
    play.addEventListener('click',()=>{if(timer){stop();return;}if(index===stages.length-1)render(0);play.textContent='Pause';play.setAttribute('aria-pressed','true');timer=setInterval(()=>{if(index>=stages.length-1){stop();return;}render(index+1);if(index===stages.length-1)stop();},4500);});
    for(const button of lab.querySelectorAll('button[data-mode]'))button.addEventListener('click',()=>{stop();mode=button.dataset.mode;lab.querySelectorAll('button[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render(index);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(lab);render(0);
  }
  const compare=document.querySelector('[data-comparison]');
  if(compare){try{
    const data=JSON.parse(compare.textContent),live=window.FSD_GLOBAL;
    if(live&&/^\d{4}-\d{2}-\d{2}$/.test(live.updated)&&live.updated>=data.updated&&Array.isArray(live.versions)){
      const pick=(region,hardware)=>live.versions.filter(v=>region(String(v.region||'').toLowerCase())&&String(v.hardware||'').includes(hardware)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];const north=s=>['united states','north america','canada'].some(x=>s.includes(x));
      const options={'na-hw3':pick(north,'HW3'),'na-hw4':pick(north,'HW4'),'europe':pick(s=>s.includes('europe'),'HW')};data.configs.forEach(c=>{if(options[c.id])c.version=options[c.id];});data.updated=live.updated;
    }
    document.querySelector('[data-compare-controls]').hidden=false;
    const update=()=>{
      for(const select of document.querySelectorAll('[data-compare]')){const key=select.dataset.compare,config=data.configs.find(c=>c.id===select.value);if(!config)continue;document.querySelector(`[data-compare-head="${key}"]`).textContent=config.label;for(const cell of document.querySelectorAll(`[data-compare-cell^="${key}:"]`)){const field=cell.dataset.compareCell.split(':')[1];cell.textContent=field==='hardware'?config.hardware:config.version[field]||'Not reported';}}
      for(const row of document.querySelectorAll('.lx-compare tbody tr')){const cells=row.querySelectorAll('td');row.classList.toggle('is-different',cells.length===2&&cells[0].textContent!==cells[1].textContent);}
      document.querySelector('[data-tracker-stamp]').textContent=`Tracker snapshot · ${data.updated}. Reported versions, not confirmation for your VIN.`;
    };
    document.querySelectorAll('[data-compare]').forEach(select=>select.addEventListener('change',update));update();
  }catch{/* retain the complete dated table */}}
})();
