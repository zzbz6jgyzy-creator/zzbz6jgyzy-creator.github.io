(() => {
  const box = document.querySelector("[data-intel-optimus]");
  const demosBox = document.querySelector("[data-intel-demos]");
  if (!box && !demosBox) return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const stateLabel = {
    unknown: "Unknown",
    not_established: "Not established",
    disclosed_no: "Disclosed: no",
    disclosed_yes: "Disclosed: yes",
  };
  const kindLabel = {
    announcement: "Announcement",
    prototype: "Prototype",
    stage_prop: "Stage appearance",
    static_display: "Static display",
  };
  const list = (items) => {
    const rows = (items || []).map((x) => `<li>${esc(x)}</li>`).join("");
    return rows ? `<ul>${rows}</ul>` : "<p>None listed from the opened source.</p>";
  };
  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderDemos = (data) => {
    if (!demosBox) return;
    const demos = data.demos || [];
    const shown = demos.filter((d) => (d.shown || []).length).length;
    demosBox.innerHTML = `
      <div class="intel-grid">
        <div class="intel-card"><strong>${demos.length}</strong><span>Sourced demonstrations</span></div>
        <div class="intel-card"><strong>${shown}</strong><span>With a shown / not-shown split</span></div>
        <div class="intel-card"><strong>0</strong><span>Where autonomy was established</span></div>
      </div>
      <p class="intel-note">${esc(data.note || "")}</p>
      <div class="intel-demos">${demos.map((d) => {
        const src = d.source || {};
        const video = d.video;
        const later = d.laterNote;
        const related = d.related;
        const auto = d.autonomy || {};
        const remote = d.remoteAssistance || {};
        const claims = d.companyClaims || [];
        return `<article class="intel-demo" id="${esc(d.id)}">
          <p class="intel-k">${esc(kindLabel[d.kind] || d.kind)} · <time datetime="${esc(d.date)}">${esc(fmtDate(d.date))}</time></p>
          <h3>${esc(d.title)}</h3>
          <p class="intel-s">${esc(d.lede || "")}</p>
          <p class="intel-m">${esc(d.event || "")}${d.generation ? ` · ${esc(d.generation)}` : ""}</p>
          <div class="intel-demo-cols">
            <div><h4>Shown</h4>${list(d.shown)}</div>
            <div><h4>Not shown</h4>${list(d.notShown)}</div>
          </div>
          <p><span class="intel-ev intel-ev-${esc(auto.state || "unknown")}">Autonomy: ${esc(stateLabel[auto.state] || auto.state || "Unknown")}</span> ${esc(auto.note || "")}</p>
          <p><span class="intel-ev intel-ev-${esc(remote.state || "unknown")}">Remote assistance: ${esc(stateLabel[remote.state] || remote.state || "Unknown")}</span> ${esc(remote.note || "")}</p>
          ${d.uncertain && d.uncertain.length ? `<h4>Still uncertain</h4>${list(d.uncertain)}` : ""}
          ${claims.length ? `<h4>Company claims — not verified specs</h4>${list(claims)}` : ""}
          <p class="intel-m">${src.url ? `<a href="${esc(src.url)}" rel="noopener">${esc(src.outlet || "Source")}</a>` : esc(src.outlet || "")}${src.title ? ` — ${esc(src.title)}` : ""}${video ? ` · <a href="${esc(video.url)}" rel="noopener">${esc(video.label || "Video")}</a>` : ""}${related ? ` · <a href="${esc(related.url)}">${esc(related.label)}</a>` : ""}</p>
          ${later ? `<p class="intel-note">Later: ${esc(later.text)} ${later.url ? `<a href="${esc(later.url)}" rel="noopener">${esc(later.outlet || "Source")}</a>` : ""}</p>` : ""}
        </article>`;
      }).join("")}</div>`;
  };

  const renderPromises = (d) => {
    if (!box) return;
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
  };

  Promise.all([
    fetch("/data/promises.json", { cache: "no-cache" }).then((r) => r.json()),
    fetch("/data/optimus-demos.json", { cache: "no-cache" }).then((r) => r.json()),
  ]).then(([promises, demos]) => {
    renderDemos(demos);
    renderPromises(promises);
  }).catch(() => {
    if (demosBox) demosBox.innerHTML = '<p class="intel-empty">Could not load the sourced demonstration archive.</p>';
    if (box) box.innerHTML = '<p class="intel-empty">Could not load sourced Optimus promises.</p>';
  });
})();
