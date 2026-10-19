(() => {
  const box = document.querySelector("[data-intel-autonomy]");
  if (!box) return;
  const I = window.SDIntel;
  const FSD = window.FSD_GLOBAL;
  const EU = window.FSD_EUROPE;
  const CC = window.CYBERCAB;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const layer = (kind, flags) => (I && I.autonomyLayer ? I.autonomyLayer(kind, flags) : { layer: "unconfirmed", label: "Unconfirmed", note: "" });
  const pill = (row) => `<span class="intel-layer intel-layer-${esc(row.layer)}">${esc(row.label)}</span>`;

  const live = ((FSD && FSD.countries) || []).filter((c) => c.status === "live");
  const limited = ((FSD && FSD.countries) || []).filter((c) => c.status === "limited");
  const eu = (EU && EU.countries) || [];
  const euLive = eu.filter((c) => c.rolloutLive);
  const euYes = eu.filter((c) => c.status === "approved" && !c.rolloutLive);
  const cities = (CC && CC.cities) || [];

  const cityFlags = (c) => {
    if (c.status === "live") return { commercial: true };
    if (c.status === "next") return { namedNext: true };
    if (c.status === "staging") return { staging: true };
    return {};
  };

  fetch("/data/promises.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    const promises = (d.promises || []).filter((p) => /FSD|autonomy|Robotaxi|Cybercab/i.test(p.topic));
    box.innerHTML = `
      <div class="intel-grid">
        <div class="intel-card"><strong>${live.length}</strong><span>Markets Tesla lists as live for supervised FSD</span></div>
        <div class="intel-card"><strong>${euLive.length}</strong><span>EU states with reported customer use</span></div>
        <div class="intel-card"><strong>${euYes.length}</strong><span>EU states recognised, rollout not confirmed</span></div>
        <div class="intel-card"><strong>${cities.filter((c) => c.status === "live").length}</strong><span>Cities with sourced paid Cybercab rides</span></div>
      </div>
      <p class="intel-note">${esc((FSD && FSD.note) || "")} Supervised FSD is not unsupervised autonomy. A Texas registration is not a ride. A ministry yes is not a customer rollout.</p>

      <h2>Where things stand</h2>
      <div class="intel-compare"><table>
        <thead><tr><th>Layer</th><th>Means</th><th>Does not mean</th></tr></thead>
        <tbody>
          <tr><td>${pill(layer("fsd-supervised"))}</td><td>Driver must supervise. SAE Level 2.</td><td>Unsupervised robotaxi. Hands-off legal duty.</td></tr>
          <tr><td>${pill(layer("eu", { approved: true }))}</td><td>A regulator recognised a file.</td><td>Owners have the software.</td></tr>
          <tr><td>${pill(layer("eu", { rolloutLive: true }))}</td><td>Recognition plus reported customer use.</td><td>Unsupervised driving.</td></tr>
          <tr><td>${pill(layer("robotaxi", { permit: true }))}</td><td>Authorisation to operate or test.</td><td>Paid public rides everywhere.</td></tr>
          <tr><td>${pill(layer("robotaxi", { commercial: true }))}</td><td>Sourced paid public rides in a city.</td><td>The same as a DMV registration count.</td></tr>
        </tbody>
      </table></div>

      <h2>Supervised FSD markets</h2>
      <p class="intel-note">From our global FSD tracker. “Live” means Tesla lists it and sources confirm it — still supervised.</p>
      <div class="intel-compare"><table>
        <thead><tr><th>Market</th><th>Layer</th><th>Version</th><th>Note</th><th>Source</th></tr></thead>
        <tbody>${live.concat(limited).map((c) => {
          const row = layer("fsd-supervised");
          return `<tr><td>${esc(c.name)}</td><td>${pill(row)}</td><td>${esc(c.version || "—")}</td><td>${esc(c.note || "")}</td><td>${c.source && c.source.url ? `<a href="${esc(c.source.url)}" rel="noopener">${esc(c.source.label || "Source")}</a>` : "—"}</td></tr>`;
        }).join("")}</tbody>
      </table></div>

      <h2>Europe: approval vs recognition vs live</h2>
      <p class="intel-note">${esc((EU && EU.note) || "")} Slovakia is the current recognised-not-live case: a ministry yes is not the same as owners receiving the software.</p>
      <div class="intel-compare"><table>
        <thead><tr><th>State</th><th>Layer</th><th>Date</th><th>Note</th><th>Source</th></tr></thead>
        <tbody>${eu.filter((c) => c.status === "approved" || c.rolloutLive || c.stage === "testing" || c.stage === "review").map((c) => {
          const row = layer("eu", {
            rolloutLive: !!c.rolloutLive,
            approved: c.status === "approved",
            recognised: c.stage === "recognised",
            testing: c.stage === "testing",
            review: c.status === "review" || c.stage === "review",
          });
          const src = (c.sources && c.sources[0]) || {};
          return `<tr><td>${esc(c.name)}</td><td>${pill(row)}</td><td>${esc(c.date || "—")}</td><td>${esc(c.note || "")}</td><td>${src.url ? `<a href="${esc(src.url)}" rel="noopener">${esc(src.label || "Source")}</a>` : "—"}</td></tr>`;
        }).join("")}</tbody>
      </table></div>

      <h2>Robotaxi cities</h2>
      <p class="intel-note">Austin paid rides are not Dallas. Dallas named next is a company claim. Houston staging is not public service. Texas Cybercab registrations are a count, not a city.</p>
      <div class="intel-compare"><table>
        <thead><tr><th>City</th><th>Layer</th><th>What the source says</th><th>Source</th></tr></thead>
        <tbody>${cities.map((c) => {
          const row = layer("robotaxi", cityFlags(c));
          return `<tr><td>${esc(c.name)}</td><td>${pill(row)}</td><td>${esc(c.note || "")}</td><td>${c.src ? `<a href="${esc(c.src)}" rel="noopener">Source</a>` : "—"}</td></tr>`;
        }).join("")}</tbody>
      </table></div>

      <h2>Sourced autonomy promises</h2>
      <p class="intel-note">From the Promise Tracker. Each status is our judgement against the sourced quote, not a score.</p>
      <div class="intel-compare"><table>
        <thead><tr><th>Promise</th><th>Topic</th><th>Deadline</th><th>Status</th><th>Source</th></tr></thead>
        <tbody>${promises.map((p) => `<tr>
          <td><a href="/promise-tracker.html#${esc(p.id)}">${esc(p.title)}</a></td>
          <td>${esc(p.topic)}</td>
          <td>${esc(p.deadline || "—")}</td>
          <td>${esc(p.status)}</td>
          <td>${p.source && p.source.url ? `<a href="${esc(p.source.url)}" rel="noopener">${esc(p.source.outlet || "Source")}</a>` : "—"}</td>
        </tr>`).join("")}</tbody>
      </table></div>
      <p class="intel-note">Related: <a href="/fsd.html">FSD global</a>, <a href="/fsd-europe.html">FSD Europe</a>, <a href="/cybercab.html">Cybercab tracker</a>, <a href="/tcmv.html">TCMV</a>, <a href="/promise-tracker.html">Promise tracker</a>.</p>
    `;
  }).catch(() => {
    box.innerHTML = '<p class="intel-empty">Could not load sourced autonomy files.</p>';
  });
})();
