(() => {
  const box = document.querySelector("[data-intel-optimus]");
  if (!box) return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  fetch("/data/promises.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    const rows = (d.promises || []).filter((p) => p.topic === "Optimus");
    const by = (s) => rows.filter((p) => p.status === s).length;
    box.innerHTML = `
      <div class="intel-grid">
        <div class="intel-card"><strong>${rows.length}</strong><span>Sourced Optimus promises</span></div>
        <div class="intel-card"><strong>${by("Missed")}</strong><span>Missed</span></div>
        <div class="intel-card"><strong>${by("In progress")}</strong><span>In progress</span></div>
        <div class="intel-card"><strong>${by("Delivered")}</strong><span>Delivered</span></div>
      </div>
      <p class="intel-note">A demonstration is not a commercial product, and a walking robot is not established autonomy. Remote assistance is treated as unknown unless a source disclosed it.</p>
      <div class="intel-compare"><table>
        <thead><tr><th>Promise</th><th>Said</th><th>Deadline</th><th>Status</th><th>Evidence</th></tr></thead>
        <tbody>${rows.map((p) => {
          const ev = (p.evidence && p.evidence[0]) || {};
          return `<tr id="${esc(p.id)}">
            <td><b>${esc(p.title)}</b><br><small>${esc(p.quote_type === "exact" ? "Exact quote" : "Paraphrase")}</small></td>
            <td>${esc(p.said_on)}</td>
            <td>${esc(p.deadline || "—")}</td>
            <td>${esc(p.status)}</td>
            <td>${esc(ev.text || "")}${ev.source && ev.source.url ? ` <a href="${esc(ev.source.url)}" rel="noopener">${esc(ev.source.outlet || "Source")}</a>` : ""}${p.source && p.source.url ? `<br><a href="${esc(p.source.url)}" rel="noopener">Original: ${esc(p.source.outlet)}</a>` : ""}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>`;
  }).catch(() => { box.innerHTML = '<p class="intel-empty">Could not load sourced Optimus promises.</p>'; });
})();
