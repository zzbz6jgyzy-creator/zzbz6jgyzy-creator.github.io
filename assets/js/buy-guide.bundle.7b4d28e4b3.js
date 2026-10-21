(()=>{const c=document.querySelector("[data-buy-calc]");if(!c)return;const R="14 Oct 2026",l={m3:{id:"m3",name:"Model 3 RWD",sticker:36990,fees:1640},my:{id:"my",name:"Model Y RWD",sticker:39990,fees:1640},ct:{id:"ct",name:"Cybertruck AWD",sticker:74990,fees:2245}},p={none:{price:0,label:"No home charger"},mobile:{price:300,label:"Mobile Connector"},wall:{price:585,label:"Wall Connector"},universal:{price:660,label:"Universal Wall Connector"}},U=99,n=a=>(a<0?"\u2212":"")+Math.round(Math.abs(a)).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}),o=(a,e)=>{const t=parseFloat(String(a.value||"").replace(/[^0-9.-]/g,""));return Number.isFinite(t)?t:e},s=a=>c.querySelector(a),b=[...c.querySelectorAll("[data-car]")],f=s("[name=fees]"),v=s("[name=tax]"),S=s("[name=rebate]"),m=s("[name=charger]"),g=s("[name=install]"),$=s("[name=fsd]"),y=s("[name=months]"),q=s("[data-install-hint]");let i=l[new URLSearchParams(location.search).get("car")]?new URLSearchParams(location.search).get("car"):"m3";function u(a,e){if(!l[a])return;i=a,b.forEach(r=>r.setAttribute("aria-pressed",String(r.dataset.car===a))),e&&(f.value=String(l[a].fees));const t=new URL(location.href);t.searchParams.set("car",a),history.replaceState(null,"",t.pathname+t.search+t.hash)}function x(a,e){const t=Math.max(0,o(v,0)),r=Math.max(0,o(S,0)),M=p[m.value]||p.none,E=Math.max(0,o(g,0)),w=$.value==="on",D=Math.max(0,Math.min(120,Math.round(o(y,12)))),h=a.sticker+e,C=Math.round(h*(t/100)),L=Math.max(0,h+C-r),k=M.price+E,F=L+k,A=w?U*D:0;return{car:a,fees:e,taxPct:t,tax:C,rebate:r,charger:M,install:E,fsdOn:w,months:D,taxable:h,vehicle:L,extras:k,driveAway:F,fsd:A,total:F+A}}function d(){const a=l[i],e=x(a,Math.max(0,o(f,a.fees)));q.hidden=m.value!=="wall",s("[data-result]").innerHTML=`<dl class="sd-calc-out">
        <div class="sd-calc-total"><dt>Cash outlay</dt><dd>${n(e.total)}</dd></div>
      </dl>
      <ul class="sd-calc-rows">
        <li><span>List price (${e.car.name})</span><b>${n(e.car.sticker)}</b></li>
        <li><span>Destination &amp; order fees</span><b>${n(e.fees)}</b></li>
        <li><span>Sales tax (${e.taxPct}%)</span><b>${n(e.tax)}</b></li>
        <li><span>Your rebate</span><b>${n(-e.rebate)}</b></li>
        <li><span>${e.charger.label}</span><b>${n(e.charger.price)}</b></li>
        <li><span>Charger install</span><b>${n(e.install)}</b></li>
        <li><span>Drive-away before registration</span><b>${n(e.driveAway)}</b></li>
        <li><span>FSD Supervised${e.fsdOn?` \xD7 ${e.months} mo`:""}</span><b>${n(e.fsd)}</b></li>
      </ul>
      <p class="sd-note sd-calc-src">US list price, destination &amp; order fees, charger prices and FSD at $99/month from Tesla, checked ${R}. Tax, rebate, install and how many months of FSD are yours. Confirm the car in Tesla\u2019s checkout. Not a quote and not advice. Federal new-car credit ended 30 Sept 2025.</p>`,s("[data-compare]").innerHTML=Object.values(l).map(t=>{const r=x(t,t.fees);return`<div class="sd-calc-cmp-card${t.id===i?" is-on":""}">
          <span>${t.name}</span>
          <strong>${n(r.total)}</strong>
          <small>${n(r.driveAway)} before FSD</small>
        </div>`}).join("")}b.forEach(a=>a.addEventListener("click",()=>{u(a.dataset.car,!0),d()})),c.addEventListener("input",d),c.addEventListener("change",d),s("[data-reset]").addEventListener("click",()=>{v.value="0",S.value="0",m.value="none",g.value="0",$.value="off",y.value="12",u(i,!0),d()}),u(i,!0),d()})();
