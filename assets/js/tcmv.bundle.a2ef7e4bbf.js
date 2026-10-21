window.TCMV_MEETINGS={updated:"2026-10-08",note:"Based on published TCMV draft agendas and public reporting on the Dutch Art. 39 request for FSD (Supervised). Committee minutes are not always public. Not affiliated with Tesla or the European Commission.",thresholds:{statesNeeded:15,populationNeeded:65},meetings:[{id:"119",number:119,date:"2026-10-06",title:"119th TCMV meeting",place:"Brussels",time:"10:00 \u2013 15:00",fsdItem:"Continuation of discussions on request of the Netherlands for an Art. 39 authorisation",slot:"11:45 \u2013 12:10 (25 minutes)",outcome:"discussion",outcomeLabel:"No vote",summary:"Third time the Dutch request was on the agenda. Draft agenda listed only a continuation of discussions \u2014 no vote item. After the meeting, reporting pointed to December as the earliest apparent vote window.",agendaHighlights:["Approval of the draft agenda","Approval of draft minutes from the 118th meeting (30 June 2026)","Euro 7 implementation update","Exchange of views on a Swedish implementing decision for non-road engines","Continuation of discussions on the Netherlands Art. 39 request (FSD Supervised)","Heavy-duty CO\u2082 and trailer performance draft amendments","AOB on large-series ADS secondary legislation and AI Act alignment"],whatWasDiscussed:["Netherlands request to authorise EU-wide recognition of the provisional Art. 39 type approval for FSD (Supervised)","No implementing-decision vote was scheduled or taken","Same day, German transport minister Steffen Bilger publicly pushed for EU-wide approval and said Germany may need to discuss a national path if the EU route fails"],sources:[{label:"Commission draft agenda (119th TCMV)",url:"https://ec.europa.eu/transparency/comitology-register/core/api/integration/ers/546233/118164/1/attachment"},{label:"Reuters \u2014 vote pushed back",url:"https://www.streetinsider.com/Reuters/EU+vote+on+Teslas+supervised+self-driving+system+pushed+back/27104594.html"}]},{id:"118",number:118,date:"2026-06-30",title:"118th TCMV meeting",place:"Brussels",time:"Full-day session",fsdItem:"Continuation of discussions on request of the Netherlands for an Art. 39 authorisation",slot:"14:40 \u2013 15:30 (50 minutes)",outcome:"discussion",outcomeLabel:"No vote",summary:"Follow-up to the May presentation. The Dutch request was scheduled as a continuation of talks, not a final examination. No EU-wide decision was taken; the file rolled into the autumn session.",agendaHighlights:["Standard committee business and other vehicle-regulation items","Continuation of discussions on the Netherlands Art. 39 authorisation request"],whatWasDiscussed:["Further member-state and Commission discussion of the RDW Art. 39 file for FSD (Supervised)","No vote and no implementing act","National recognitions of the Dutch approval continued in parallel outside the committee"],sources:[{label:"Comitology register \u2014 30 June 2026 meeting",url:"https://ec.europa.eu/transparency/comitology-register/screen/documents/116206/1"},{label:"eletric-vehicles.com \u2014 June agenda omits vote",url:"https://eletric-vehicles.com/tesla/tesla-fsd-faces-more-eu-delay-as-june-30-brings-no-vote/"},{label:"Reuters explainer (30 June)",url:"https://www.reuters.com/business/finance/teslas-road-full-self-driving-approval-europe-2026-06-30/"}]},{id:"117",number:117,date:"2026-05-05",title:"117th TCMV meeting",place:"Brussels",time:"Three-hour morning session",fsdItem:"Presentation by the Netherlands on an update on article 39",slot:"12:00 \u2013 12:20 (20 minutes)",outcome:"briefing",outcomeLabel:"Briefing only",summary:"First committee appearance of the Dutch Art. 39 file after the RDW\u2019s 10 April provisional approval. The Netherlands briefed member states. No vote was on the agenda.",agendaHighlights:["Seven agenda items in a three-hour session","Item five: Presentation by the Netherlands on an update on Article 39"],whatWasDiscussed:["RDW presentation of the provisional type approval issued for FSD (Supervised) under Art. 39 of Regulation (EU) 2018/858 / UN R171 context","Informational briefing for the 27 member states ahead of later examination","No vote; earliest realistic vote window after this session was the 30 June meeting"],sources:[{label:"eletric-vehicles.com \u2014 May 5 agenda",url:"https://eletric-vehicles.com/tesla/eu-sets-no-tesla-fsd-vote-for-may-5-dutch-to-brief-in-20-minute-slot/"}]},{id:"upcoming-dec",number:null,date:"2026-12-01",dateLabel:"December 2026",title:"Next scheduled TCMV window",place:"Brussels (expected)",time:"Date and agenda not yet published",fsdItem:"Possible Art. 39 authorisation vote (not confirmed)",slot:"TBD",outcome:"upcoming",outcomeLabel:"Upcoming",summary:"After the 6 October meeting listed discussions only, public reporting and the committee calendar point to December as the earliest apparent opportunity for a qualified-majority vote. Confirm against the published draft agenda when it appears.",agendaHighlights:["Draft agenda not yet published","A vote requires at least 15 of 27 states representing 65% of the EU population"],whatWasDiscussed:["Nothing yet \u2014 agenda not published","Watch for whether the Dutch Art. 39 request appears as a vote item or another continuation of discussions"],sources:[{label:"Reuters \u2014 earliest vote not before December",url:"https://www.streetinsider.com/Reuters/EU+vote+on+Teslas+supervised+self-driving+system+pushed+back/27104594.html"}]}]},(()=>{const i=window.TCMV_MEETINGS;if(!i)return;const u=(t,s)=>s||(t?new Date(`${t}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"\u2014"),o=(t,s)=>{const e=document.getElementById(t);e&&(e.textContent=s)},c=i.meetings.filter(t=>t.outcome!=="upcoming"),m=i.meetings.filter(t=>t.outcome==="upcoming"),d=c.filter(t=>t.outcome==="vote").length,h=m[0],y=h?new Date(`${h.date}T12:00:00Z`).toLocaleDateString("en-GB",{month:"short",year:"numeric"}):"\u2014";o("tcmv-updated",`Updated ${u(i.updated)}`),o("tcmv-held-count",String(c.length)),o("tcmv-vote-count",String(d)),o("tcmv-upcoming-count",String(m.length)),o("tcmv-next-label",y),o("tcmv-note",i.note);const r=document.getElementById("tcmv-list"),p=document.querySelectorAll("[data-tcmv-filter]");let l="all",f=!1;const v=()=>{if(!r)return;r.replaceChildren();const t=i.meetings.filter(e=>l==="all"||e.outcome===l).slice().sort((e,a)=>a.date.localeCompare(e.date)),s=r.hasAttribute("data-tcmv-compact");if(t.forEach(e=>{const a=document.createElement("article");a.className="tcmv-card reveal is-visible",a.id=`meeting-${e.id}`;const g=e.number?`#${e.number}`:"Next",b=u(e.date,e.dateLabel);if(s){a.classList.add("tcmv-card-compact"),a.innerHTML=`
          <header class="tcmv-card-head">
            <div>
              <p class="eyebrow">${g} \xB7 ${e.place}</p>
              <h3>${e.title}</h3>
              <p class="tcmv-meta">
                <time datetime="${e.date}">${b}</time>
              </p>
            </div>
            <span class="tcmv-status tcmv-status-${e.outcome}">${e.outcomeLabel}</span>
          </header>
          <p class="tcmv-summary">${e.summary}</p>
          <p class="tcmv-more"><a href="/tcmv.html#meeting-${e.id}">Full note</a></p>
        `,r.append(a);return}const w=(e.agendaHighlights||[]).map(n=>`<li>${n}</li>`).join(""),$=(e.whatWasDiscussed||[]).map(n=>`<li>${n}</li>`).join(""),D=(e.sources||[]).map(n=>`<li><a href="${n.url}" rel="noopener noreferrer" target="_blank">${n.label}</a></li>`).join("");a.innerHTML=`
        <header class="tcmv-card-head">
          <div>
            <p class="eyebrow">${g} \xB7 ${e.place}</p>
            <h3>${e.title}</h3>
            <p class="tcmv-meta">
              <time datetime="${e.date}">${b}</time>
              <span>${e.time}</span>
            </p>
          </div>
          <span class="tcmv-status tcmv-status-${e.outcome}">${e.outcomeLabel}</span>
        </header>
        <p class="tcmv-summary">${e.summary}</p>
        <div class="tcmv-grid">
          <div>
            <h3>FSD agenda item</h3>
            <p>${e.fsdItem}</p>
            <p class="tcmv-slot">Slot: ${e.slot}</p>
          </div>
          <div>
            <h3>What was discussed</h3>
            <ul>${$}</ul>
          </div>
        </div>
        <details class="tcmv-details">
          <summary>Full agenda highlights</summary>
          <ul>${w}</ul>
        </details>
        <details class="tcmv-details">
          <summary>Sources</summary>
          <ul>${D}</ul>
        </details>
      `,r.append(a)}),o("tcmv-showing",l==="all"?`${c.length} sessions \xB7 ${d} vote${d===1?"":"s"} taken`:`${t.length} meeting${t.length===1?"":"s"}`),!f&&location.hash.startsWith("#meeting-")){f=!0;const e=document.getElementById(location.hash.slice(1));e&&requestAnimationFrame(()=>e.scrollIntoView())}};p.forEach(t=>{t.addEventListener("click",()=>{l=t.dataset.tcmvFilter,p.forEach(s=>s.setAttribute("aria-pressed",String(s===t))),v()})}),v()})();
