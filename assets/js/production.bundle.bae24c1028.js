(()=>{const a=document.querySelector("[data-intel-production]");if(!a)return;const i=o=>String(o==null?"":o).replace(/[&<>"]/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[n]);fetch("/data/production.json",{cache:"no-cache"}).then(o=>o.json()).then(o=>{const n=o.quarters||[],d=n[n.length-1];if(!d){a.innerHTML='<p class="intel-empty">No official quarter on file.</p>';return}const c=e=>{const t=String(e).match(/^(Q[1-4])\s+(\d{4})$/);return t?t[1]+" "+(Number(t[2])-1):""},h=e=>n.find(t=>t.id===c(e.id)),s=(e,t)=>{if(!t)return"";const l=(e-t)/t*100;return(l>0?"+":"")+l.toFixed(1)+"%"},g=Math.max.apply(null,n.map(e=>Math.max(e.production,e.deliveries))),p=e=>Math.max(4,Math.round(e/g*100)),r=e=>Number(e).toLocaleString("en-US"),u=n.map(e=>({q:e,p:h(e)})).filter(e=>e.p),v=(e,t)=>!Number.isFinite(e.energyGwh)||!Number.isFinite(t.energyGwh)?"":`; energy ${i(s(e.energyGwh,t.energyGwh))} (${i(String(e.energyGwh))} vs ${i(String(t.energyGwh))} GWh)`,y=u.length?u.map(({q:e,p:t})=>`<p class="intel-yoy">${i(e.id)} vs ${i(t.id)} (both Tesla IR): deliveries ${i(s(e.deliveries,t.deliveries))} (${r(e.deliveries)} vs ${r(t.deliveries)}); production ${i(s(e.production,t.production))} (${r(e.production)} vs ${r(t.production)})${v(e,t)}.</p>`).join(""):`<p class="intel-note">No opened IR table for ${i(c(d.id)||"the year-ago quarter")} \u2014 no invented year-over-year count.</p>`;a.innerHTML=`
      <div class="intel-grid">
        <div class="intel-card"><strong>${r(d.deliveries)}</strong><span>${i(d.id)} deliveries \xB7 Tesla IR</span></div>
        <div class="intel-card"><strong>${r(d.production)}</strong><span>${i(d.id)} production \xB7 Tesla IR</span></div>
        <div class="intel-card"><strong>${i(String(d.energyGwh))} GWh</strong><span>Energy storage deployed</span></div>
      </div>
      <p class="intel-note">${i(o.note)}</p>
      ${y}
      <div class="intel-chart" role="img" aria-label="Quarterly production and deliveries">
        ${n.map(e=>`
          <div class="intel-barrow"><b>${i(e.id)}</b><i style="width:${p(e.deliveries)}%"></i><span>${r(e.deliveries)} del.</span></div>
          <div class="intel-barrow"><b></b><i style="width:${p(e.production)}%;opacity:.55"></i><span>${r(e.production)} prod.</span></div>
        `).join("")}
      </div>
      <div class="intel-compare"><table>
        <thead><tr><th>Quarter</th><th>Production</th><th>Deliveries</th><th>YoY del.</th><th>Model 3/Y del.</th><th>Other del.</th><th>Energy</th><th>YoY energy</th><th>Source</th></tr></thead>
        <tbody>${n.map(e=>{const t=h(e),l=t&&Number.isFinite(e.energyGwh)&&Number.isFinite(t.energyGwh)?i(s(e.energyGwh,t.energyGwh)):"\u2014";return`<tr>
          <td>${i(e.id)}</td>
          <td>${r(e.production)}</td>
          <td>${r(e.deliveries)}</td>
          <td>${t?i(s(e.deliveries,t.deliveries)):"\u2014"}</td>
          <td>${r(e.model3yDeliveries)}</td>
          <td>${r(e.otherDeliveries)}</td>
          <td>${i(String(e.energyGwh))} GWh</td>
          <td>${l}</td>
          <td><a href="${i(e.sourceUrl)}" rel="noopener">Tesla IR</a></td>
        </tr>`}).join("")}</tbody>
      </table></div>`}).catch(()=>{a.innerHTML='<p class="intel-empty">Could not load official production table.</p>'})})();
