(() => {
  const d = window.CYBERCAB; if (!d) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const src = (u) => `<a class="cc-src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`;
  const q = (s) => document.querySelector(s);
  const up = q("[data-cc-updated]"); if (up) { up.textContent = d.updatedLabel; up.setAttribute("datetime", d.updated); }
  q("[data-cc-stats]").innerHTML = d.stats.map((s) => `<div class="cc-stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span>${src(s.src)}</div>`).join("");
  const tag = { live: "Live", next: "Next", staging: "Staging" };
  q("[data-cc-cities]").innerHTML = d.cities.map((c) => `<div class="cc-city is-${esc(c.status)}"><p class="cc-badge">${tag[c.status] || esc(c.status)}</p><h3>${esc(c.name)}</h3><p>${esc(c.note)}</p>${src(c.src)}</div>`).join("");
  q("[data-cc-timeline]").innerHTML = d.milestones.slice().sort((a, b) => b.date.localeCompare(a.date)).map((m) => `<li><time datetime="${esc(m.date)}">${esc(m.label)}</time><p>${esc(m.text)} ${src(m.src)}</p></li>`).join("");
  q("[data-cc-watch]").innerHTML = d.watch.map((w) => `<li>${esc(w.text)} ${src(w.src)}</li>`).join("");
})();
