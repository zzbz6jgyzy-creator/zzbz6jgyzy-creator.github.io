(() => {
  const data = window.STARLINK;
  if (!data) return;

  const $ = (sel) => document.querySelector(sel);
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const src = data.source || {};
  const totalOrbit = data.totals.inOrbit || 1;

  const stamp = $("#sl-updated");
  if (stamp) {
    stamp.innerHTML = `Updated <time datetime="${data.updated}">${data.updatedLabel}</time> · ${data.asOf}`;
  }

  const kpis = [
    ["#sl-orbit", data.totals.inOrbit, "in orbit"],
    ["#sl-working", data.totals.working, "working"],
    ["#sl-launched", data.totals.launched, "launched"],
    ["#sl-down", data.totals.down, "already down"],
  ];
  kpis.forEach(([id, value]) => {
    const el = $(id);
    if (el) el.textContent = fmt(value);
  });
  const capCount = document.querySelector("[data-sl-count]");
  if (capCount) capCount.textContent = fmt(data.totals.inOrbit);

  const extra = $("#sl-extra");
  if (extra) {
    extra.textContent = `${fmt(data.totals.operational)} in a finished shell · ${fmt(data.totals.ascent)} still climbing · ${fmt(data.totals.failedToOrbit)} failed to reach orbit`;
  }

  const stack = $("#sl-stack");
  const keys = $("#sl-stack-keys");
  if (stack && keys) {
    stack.innerHTML = data.generations
      .map((g) => `<i style="width:${(g.inOrbit / totalOrbit) * 100}%;background:${g.color}" title="${g.name}: ${fmt(g.inOrbit)}"></i>`)
      .join("");
    keys.innerHTML = data.generations
      .map((g) => `<li><i style="background:${g.color}"></i>${g.name} <b>${fmt(g.inOrbit)}</b></li>`)
      .join("");
  }

  const gens = $("#sl-gens");
  if (gens) {
    gens.innerHTML = data.generations
      .map((g) => {
        const share = ((g.inOrbit / totalOrbit) * 100).toFixed(1);
        return `<article class="sl-card" id="${g.id}">
          <p class="sl-card-k">${g.aka}</p>
          <h3>${g.name}</h3>
          <p class="sl-n" style="color:${g.color === "#f4f4f0" ? "#fff" : g.color}">${fmt(g.inOrbit)}</p>
          <div class="sl-bar" aria-hidden="true"><span style="width:${share}%;background:${g.color}"></span></div>
          <p>${g.blurb}</p>
          <ul>${g.facts.map((f) => `<li style="--dot:${g.color}">${f}</li>`).join("")}</ul>
        </article>`;
      })
      .join("");
  }

  const retired = $("#sl-retired");
  if (retired) {
    retired.innerHTML = data.retired
      .map(
        (r) => `<article class="sl-note"><h3>${r.name}</h3><p>${fmt(r.launched)} launched · ${fmt(r.inOrbit)} in orbit. ${r.note}</p></article>`
      )
      .join("");
  }

  const notes = $("#sl-notes");
  if (notes) notes.innerHTML = data.notes.map((n) => `<li>${n}</li>`).join("");

  const watch = $("#sl-watch");
  if (watch) {
    watch.innerHTML = data.watch
      .map((w) => `<li>${w.text} <a href="${w.src}" target="_blank" rel="noopener">Source</a></li>`)
      .join("");
  }

  const credit = $("#sl-src");
  if (credit) {
    credit.innerHTML = `Figures: <a href="${src.url}" target="_blank" rel="noopener">${src.label}</a>, ${data.asOf}. Independent tracker. Not affiliated with SpaceX.`;
  }

  const svg = $("#sl-orbit-svg");
  if (svg) {
    const rings = data.generations.map((g, i) => {
      const r = 28 + i * 10.2;
      const n = Math.max(6, Math.min(36, Math.round(g.inOrbit / 180)));
      const dots = Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2 + i * 0.28;
        const rx = r * 1.55;
        const ry = r * 0.62;
        const x = 50 + rx * Math.cos(a);
        const y = 52 + ry * Math.sin(a);
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.85" fill="${g.color}" />`;
      }).join("");
      return `<ellipse cx="50" cy="52" rx="${(r * 1.55).toFixed(1)}" ry="${(r * 0.62).toFixed(1)}" fill="none" stroke="${g.color}" stroke-opacity="0.28" stroke-width="0.35" />${dots}`;
    }).join("");
    svg.innerHTML = `
      <defs>
        <radialGradient id="sl-earth" cx="38%" cy="34%" r="68%">
          <stop offset="0%" stop-color="#6f8fb8"/>
          <stop offset="42%" stop-color="#2c4a72"/>
          <stop offset="100%" stop-color="#0c121c"/>
        </radialGradient>
        <radialGradient id="sl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stop-color="rgba(80,140,220,0)"/>
          <stop offset="100%" stop-color="rgba(90,160,255,0.28)"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="19.2" fill="url(#sl-glow)"/>
      ${rings}
      <circle cx="50" cy="52" r="16.8" fill="url(#sl-earth)" stroke="#8eb4e0" stroke-width="0.45"/>
      <ellipse cx="43" cy="47" rx="5.4" ry="3.1" fill="#1d3a28" opacity="0.55"/>
      <ellipse cx="55" cy="51" rx="3.8" ry="2.2" fill="#1a3324" opacity="0.45"/>
      <ellipse cx="48" cy="58" rx="4.6" ry="2.4" fill="#24402c" opacity="0.4"/>
    `;
  }
})();
