(() => {
  const box = document.querySelector("[data-intel-production]");
  if (!box) return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  fetch("/data/production.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    const qs = d.quarters || [];
    const last = qs[qs.length - 1];
    if (!last) {
      box.innerHTML = '<p class="intel-empty">No official quarter on file.</p>';
      return;
    }
    const priorId = (() => {
      const m = String(last.id).match(/^(Q[1-4])\s+(\d{4})$/);
      return m ? m[1] + " " + (Number(m[2]) - 1) : "";
    })();
    const prior = qs.find((q) => q.id === priorId);
    const pct = (now, then) => {
      if (!then) return "";
      const n = ((now - then) / then) * 100;
      const sign = n > 0 ? "+" : "";
      return sign + n.toFixed(1) + "%";
    };
    const max = Math.max.apply(null, qs.map((q) => Math.max(q.production, q.deliveries)));
    const bar = (n) => Math.max(4, Math.round((n / max) * 100));
    const num = (n) => Number(n).toLocaleString("en-US");
    const yoy = prior
      ? `<p class="intel-yoy">${esc(last.id)} vs ${esc(prior.id)} (both Tesla IR): deliveries ${esc(pct(last.deliveries, prior.deliveries))} (${num(last.deliveries)} vs ${num(prior.deliveries)}); production ${esc(pct(last.production, prior.production))} (${num(last.production)} vs ${num(prior.production)}).</p>`
      : `<p class="intel-note">No opened IR table for ${esc(priorId || "the year-ago quarter")} — no invented year-over-year count.</p>`;
    box.innerHTML = `
      <div class="intel-grid">
        <div class="intel-card"><strong>${num(last.deliveries)}</strong><span>${esc(last.id)} deliveries · Tesla IR</span></div>
        <div class="intel-card"><strong>${num(last.production)}</strong><span>${esc(last.id)} production · Tesla IR</span></div>
        <div class="intel-card"><strong>${esc(String(last.energyGwh))} GWh</strong><span>Energy storage deployed</span></div>
      </div>
      <p class="intel-note">${esc(d.note)}</p>
      ${yoy}
      <div class="intel-chart" role="img" aria-label="Quarterly production and deliveries">
        ${qs.map((q) => `
          <div class="intel-barrow"><b>${esc(q.id)}</b><i style="width:${bar(q.deliveries)}%"></i><span>${num(q.deliveries)} del.</span></div>
          <div class="intel-barrow"><b></b><i style="width:${bar(q.production)}%;opacity:.55"></i><span>${num(q.production)} prod.</span></div>
        `).join("")}
      </div>
      <div class="intel-compare"><table>
        <thead><tr><th>Quarter</th><th>Production</th><th>Deliveries</th><th>Model 3/Y del.</th><th>Other del.</th><th>Energy</th><th>Source</th></tr></thead>
        <tbody>${qs.map((q) => `<tr>
          <td>${esc(q.id)}</td>
          <td>${num(q.production)}</td>
          <td>${num(q.deliveries)}</td>
          <td>${num(q.model3yDeliveries)}</td>
          <td>${num(q.otherDeliveries)}</td>
          <td>${esc(String(q.energyGwh))} GWh</td>
          <td><a href="${esc(q.sourceUrl)}" rel="noopener">Tesla IR</a></td>
        </tr>`).join("")}</tbody>
      </table></div>`;
  }).catch(() => { box.innerHTML = '<p class="intel-empty">Could not load official production table.</p>'; });
})();
