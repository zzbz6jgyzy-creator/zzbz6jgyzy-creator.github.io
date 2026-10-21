(()=>{const i=document.querySelector("[data-intel-optimus]"),r=document.querySelector("[data-intel-demos]");if(!i&&!r)return;const t=n=>String(n==null?"":n).replace(/[&<>"]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[s]),$={unknown:"Unknown",not_established:"Not established",disclosed_no:"Disclosed: no",disclosed_yes:"Disclosed: yes"},v={announcement:"Announcement",prototype:"Prototype",stage_prop:"Stage appearance",static_display:"Static display"},c=n=>{const s=(n||[]).map(a=>`<li>${t(a)}</li>`).join("");return s?`<ul>${s}</ul>`:"<p>None listed in the source.</p>"},g=n=>n?new Date(`${n.slice(0,10)}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"\u2014",w=n=>{if(!r)return;const s=n.demos||[],a=s.filter(e=>(e.shown||[]).length).length;r.innerHTML=`
      <div class="intel-grid">
        <div class="intel-card"><strong>${s.length}</strong><span>Sourced demonstrations</span></div>
        <div class="intel-card"><strong>${a}</strong><span>With what was shown and what wasn\u2019t</span></div>
        <div class="intel-card"><strong>0</strong><span>Where autonomy was established</span></div>
      </div>
      <p class="intel-note">${t(n.note||"")}</p>
      <div class="intel-demos">${s.map(e=>{const o=e.source||{},p=e.video,l=e.laterNote,h=e.related,d=e.autonomy||{},u=e.remoteAssistance||{},m=e.companyClaims||[];return`<article class="intel-demo" id="${t(e.id)}">
          <p class="intel-k">${t(v[e.kind]||e.kind)} \xB7 <time datetime="${t(e.date)}">${t(g(e.date))}</time></p>
          <h3>${t(e.title)}</h3>
          <p class="intel-s">${t(e.lede||"")}</p>
          <p class="intel-m">${t(e.event||"")}${e.generation?` \xB7 ${t(e.generation)}`:""}</p>
          <div class="intel-demo-cols">
            <div><h4>Shown</h4>${c(e.shown)}</div>
            <div><h4>Not shown</h4>${c(e.notShown)}</div>
          </div>
          <p><span class="intel-ev intel-ev-${t(d.state||"unknown")}">Autonomy: ${t($[d.state]||d.state||"Unknown")}</span> ${t(d.note||"")}</p>
          <p><span class="intel-ev intel-ev-${t(u.state||"unknown")}">Remote assistance: ${t($[u.state]||u.state||"Unknown")}</span> ${t(u.note||"")}</p>
          ${e.uncertain&&e.uncertain.length?`<h4>Still uncertain</h4>${c(e.uncertain)}`:""}
          ${m.length?`<h4>Company claims \u2014 not verified specs</h4>${c(m)}`:""}
          <p class="intel-m">${o.url?`<a href="${t(o.url)}" rel="noopener">${t(o.outlet||"Source")}</a>`:t(o.outlet||"")}${o.title?` \u2014 ${t(o.title)}`:""}${p?` \xB7 <a href="${t(p.url)}" rel="noopener">${t(p.label||"Video")}</a>`:""}${h?` \xB7 <a href="${t(h.url)}">${t(h.label)}</a>`:""}</p>
          ${l?`<p class="intel-note">Later: ${t(l.text)} ${l.url?`<a href="${t(l.url)}" rel="noopener">${t(l.outlet||"Source")}</a>`:""}</p>`:""}
        </article>`}).join("")}</div>`},y=n=>{if(!i)return;const s=(n.promises||[]).filter(e=>e.topic==="Optimus"),a=e=>s.filter(o=>o.status===e).length;i.innerHTML=`
      <div class="intel-grid">
        <div class="intel-card"><strong>${s.length}</strong><span>Sourced Optimus promises</span></div>
        <div class="intel-card"><strong>${a("Missed")}</strong><span>Missed</span></div>
        <div class="intel-card"><strong>${a("In progress")}</strong><span>In progress</span></div>
        <div class="intel-card"><strong>${a("Delivered")}</strong><span>Delivered</span></div>
      </div>
      <p class="intel-note">A demo isn\u2019t a product on sale, and a walking robot doesn\u2019t show it can work on its own. We only mention remote help when a source says so.</p>
      <div class="intel-compare"><table>
        <thead><tr><th>Promise</th><th>Said</th><th>Deadline</th><th>Status</th><th>Evidence</th></tr></thead>
        <tbody>${s.map(e=>{const o=e.evidence&&e.evidence[0]||{};return`<tr id="${t(e.id)}">
            <td><b>${t(e.title)}</b><br><small>${t(e.quote_type==="exact"?"Exact quote":"Paraphrase")}</small></td>
            <td>${t(e.said_on)}</td>
            <td>${t(e.deadline||"\u2014")}</td>
            <td>${t(e.status)}</td>
            <td>${t(o.text||"")}${o.source&&o.source.url?` <a href="${t(o.source.url)}" rel="noopener">${t(o.source.outlet||"Source")}</a>`:""}${e.source&&e.source.url?`<br><a href="${t(e.source.url)}" rel="noopener">Original: ${t(e.source.outlet)}</a>`:""}</td>
          </tr>`}).join("")}</tbody>
      </table></div>`};Promise.all([fetch("/data/promises.json",{cache:"no-cache"}).then(n=>n.json()),fetch("/data/optimus-demos.json",{cache:"no-cache"}).then(n=>n.json())]).then(([n,s])=>{w(s),y(n)}).catch(()=>{r&&(r.innerHTML='<p class="intel-empty">Could not load the sourced demonstration archive.</p>'),i&&(i.innerHTML='<p class="intel-empty">Could not load sourced Optimus promises.</p>')})})();
