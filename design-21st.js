// Ports of 21st.dev MIT components (NumberFlow by barvian; Magic Card by Magic UI). Vanilla JS.
(function(){
  function col(d){var h='';for(var i=0;i<10;i++)h+='<span>'+i+'</span>';return '<span class="nf-d"><span class="nf-c" style="transform:translateY(-'+d+'em)">'+h+'</span></span>';}
  window.sdRoll=function(c,html){
    var t=document.createElement('div');t.innerHTML=html;
    var nb=t.querySelectorAll('.lw-tile'),ob=c.querySelectorAll('.lw-tile');
    var same=nb.length===ob.length&&[].every.call(nb,function(n,i){return n.querySelector('i').textContent===ob[i].querySelector('i').textContent&&n.querySelector('b').textContent.length===ob[i].querySelector('b').dataset.v.length;});
    if(!same||!ob.length){[].forEach.call(t.querySelectorAll('.lw-tile b'),function(b){var v=b.textContent;b.dataset.v=v;b.setAttribute('aria-label',v);b.innerHTML=v.split('').map(col).join('');});c.innerHTML=t.innerHTML;return;}
    [].forEach.call(nb,function(n,i){var v=n.querySelector('b').textContent,b=ob[i].querySelector('b');if(b.dataset.v===v)return;b.dataset.v=v;b.setAttribute('aria-label',v);
      var cs=b.querySelectorAll('.nf-c');v.split('').forEach(function(d,j){cs[j].style.transform='translateY(-'+d+'em)';});});
  };
  document.addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest('.hx-tile');if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');},{passive:true});
})();
