(() => {
  const d = window.CYBERCAB;
  if (!d) return;

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const src = (u) =>
    `<a class="cc-src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`;
  const q = (sel) => document.querySelector(sel);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const up = q("[data-cc-updated]");
  if (up) {
    up.textContent = d.updatedLabel;
    up.setAttribute("datetime", d.updated);
  }

  const statsEl = q("[data-cc-stats]");
  const renderStats = () => {
    if (!statsEl) return;
    statsEl.innerHTML = d.stats
      .map((s) => `<div class="cc-stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span>${src(s.src)}</div>`)
      .join("");
  };
  renderStats();

  const tag = { live: "Live", next: "Next", staging: "Staging" };
  const citiesEl = q("[data-cc-cities]");
  if (citiesEl) {
    citiesEl.innerHTML = d.cities
      .map(
        (c) =>
          `<div class="cc-city is-${esc(c.status)}" data-cc-city="${esc(c.name)}"><p class="cc-badge">${
            tag[c.status] || esc(c.status)
          }</p><h3>${esc(c.name)}</h3><p>${esc(c.note)}</p>${src(c.src)}</div>`
      )
      .join("");
  }

  const timelineEl = q("[data-cc-timeline]");
  if (timelineEl) {
    timelineEl.innerHTML = d.milestones
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((m) => `<li><time datetime="${esc(m.date)}">${esc(m.label)}</time><p>${esc(m.text)} ${src(m.src)}</p></li>`)
      .join("");
  }

  const watchEl = q("[data-cc-watch]");
  if (watchEl) {
    watchEl.innerHTML = d.watch.map((w) => `<li>${esc(w.text)} ${src(w.src)}</li>`).join("");
  }

  function setReadout(point) {
    const el = q("[data-cc-chart-readout]");
    if (!el || !point) return;
    el.textContent = `${point.value.toLocaleString()} · ${point.label}`;
  }

  function renderChart(mount, series) {
    if (!mount || !series?.length) return;
    const w = 720;
    const h = 248;
    const L = 42;
    const R = 16;
    const T = 16;
    const B = 36;
    const max = Math.max(...series.map((p) => p.value), 1);
    const top = Math.max(50, Math.ceil(max / 50) * 50);
    const xAt = (i) => L + (series.length === 1 ? 0 : (i / (series.length - 1)) * (w - L - R));
    const yAt = (v) => T + (1 - v / top) * (h - T - B);
    const line = series.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
    const lastX = xAt(series.length - 1);
    const area = `${line} L${lastX.toFixed(1)},${(h - B).toFixed(1)} L${xAt(0).toFixed(1)},${(h - B).toFixed(1)} Z`;
    const ticks = [0, top / 2, top];
    const grid = ticks
      .map((v) => {
        const y = yAt(v);
        return `<line class="cc-chart-grid" x1="${L}" y1="${y.toFixed(1)}" x2="${w - R}" y2="${y.toFixed(1)}" /><text class="cc-chart-axis" x="4" y="${(y + 4).toFixed(1)}">${v}</text>`;
      })
      .join("");
    const labels = series
      .map((p, i) => `<text class="cc-chart-axis" text-anchor="middle" x="${xAt(i).toFixed(1)}" y="${h - 10}">${esc(p.label)}</text>`)
      .join("");
    const dots = series
      .map((p, i) => {
        const on = i === series.length - 1 ? " is-on" : "";
        return `<circle class="cc-chart-dot${on}" tabindex="0" role="listitem" data-i="${i}" cx="${xAt(i).toFixed(1)}" cy="${yAt(p.value).toFixed(1)}" r="5"><title>${esc(p.label)}: ${p.value} registered</title></circle>`;
      })
      .join("");
    const last = series[series.length - 1];
    mount.innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="cc-chart-h">
      <title>Registered Cybercabs on the Texas DMV list</title>
      <defs>
        <linearGradient id="ccFleetFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E31937" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#E31937" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      ${grid}
      <path class="cc-chart-area" d="${area}" />
      <path class="cc-chart-line" d="${line}" />
      ${labels}
      <g role="list">${dots}</g>
    </svg>`;
    setReadout(last);
    const srcEl = document.createElement("p");
    srcEl.style.margin = "0.45rem 0 0";
    srcEl.innerHTML = src(last.src);
    mount.after(srcEl);

    const lineEl = mount.querySelector(".cc-chart-line");
    if (lineEl && !reduce) {
      const len = lineEl.getTotalLength();
      lineEl.style.strokeDasharray = `${len}`;
      lineEl.style.strokeDashoffset = `${len}`;
      requestAnimationFrame(() => {
        lineEl.style.transition = "stroke-dashoffset 1s ease";
        lineEl.style.strokeDashoffset = "0";
      });
    }

    const show = (i) => {
      mount.querySelectorAll(".cc-chart-dot").forEach((dot, idx) => dot.classList.toggle("is-on", idx === i));
      setReadout(series[i]);
    };
    mount.querySelectorAll(".cc-chart-dot").forEach((dot) => {
      const i = Number(dot.getAttribute("data-i"));
      dot.addEventListener("mouseenter", () => show(i));
      dot.addEventListener("focus", () => show(i));
    });
  }

  function renderShare(mount, share) {
    if (!mount || !share) return;
    const pct = Math.round((share.cybercab / share.total) * 100);
    const r = 54;
    const c = 2 * Math.PI * r;
    const cab = (pct / 100) * c;
    mount.innerHTML = `<svg viewBox="0 0 140 140" role="img" aria-labelledby="cc-share-h">
      <title>Cybercabs are ${pct} percent of Tesla’s registered Texas robotaxis</title>
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(236,236,232,0.12)" stroke-width="14" />
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#E31937" stroke-width="14"
        stroke-dasharray="${cab.toFixed(1)} ${(c - cab).toFixed(1)}" stroke-dashoffset="${(c * 0.25).toFixed(1)}" stroke-linecap="round" />
      <text class="cc-share-num" x="70" y="74" text-anchor="middle">${pct}%</text>
      <text class="cc-share-sub" x="70" y="92" text-anchor="middle">Cybercab</text>
    </svg>
    <ul class="cc-share-legend">
      <li class="is-cab"><i></i>${share.cybercab.toLocaleString()} Cybercab</li>
      <li class="is-other"><i></i>${(share.total - share.cybercab).toLocaleString()} Robotaxi (Model Y)</li>
    </ul>
    <p style="margin:0">${src(share.src)}</p>`;
  }

  const PINS = {
    "Austin, TX": { x: 128, y: 150, label: "Austin" },
    "Dallas, TX": { x: 162, y: 86, label: "Dallas" },
    "Houston, TX": { x: 176, y: 176, label: "Houston" },
  };

  function renderMap(mount, cities) {
    if (!mount || !cities?.length) return;
    const pins = cities
      .map((c) => {
        const pin = PINS[c.name];
        if (!pin) return "";
        const ty = pin.y < 90 ? pin.y - 14 : pin.y + 20;
        return `<g class="cc-tx-pin is-${esc(c.status)}" tabindex="0" data-cc-city="${esc(c.name)}" role="listitem">
          <circle cx="${pin.x}" cy="${pin.y}" r="7" />
          <text text-anchor="middle" x="${pin.x}" y="${ty}">${esc(pin.label)}</text>
        </g>`;
      })
      .join("");
    mount.innerHTML = `<svg viewBox="0 0 250 240" role="img" aria-labelledby="cc-cities-h">
      <title>Cybercab cities in Texas</title>
      <path class="cc-tx-land" d="M150 8 H188 V44 H216 V76 H230 L198 164 176 202 138 226 104 212 78 176 48 160 24 128 20 92 34 58 40 44 H150 V8 Z" />
      <g role="list">${pins}</g>
    </svg>`;

    const light = (name, on) => {
      document.querySelectorAll(`[data-cc-city="${CSS.escape(name)}"]`).forEach((el) => el.classList.toggle("is-on", on));
    };
    mount.querySelectorAll("[data-cc-city]").forEach((el) => {
      const name = el.getAttribute("data-cc-city");
      el.addEventListener("mouseenter", () => light(name, true));
      el.addEventListener("mouseleave", () => light(name, false));
      el.addEventListener("focus", () => light(name, true));
      el.addEventListener("blur", () => light(name, false));
    });
    citiesEl?.querySelectorAll("[data-cc-city]").forEach((el) => {
      const name = el.getAttribute("data-cc-city");
      el.addEventListener("mouseenter", () => light(name, true));
      el.addEventListener("mouseleave", () => light(name, false));
    });
  }

  renderChart(q("[data-cc-chart]"), d.fleet);
  renderShare(q("[data-cc-share]"), d.share);

  // Live VIN-split counts (refreshed twice a day) replace the hand-entered figures.
  fetch("/data/robotaxi-tx.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((tx) => {
      const last = tx.history?.[tx.history.length - 1];
      if (!last || !last.cybercab) return;
      const total = last.cybercab + last.modelY;
      const when = new Date(last.date + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      const pct = Math.round((last.cybercab / total) * 100);
      d.share = { cybercab: last.cybercab, total, src: tx.source.url };
      d.stats.forEach((s) => {
        if (s.live === "cybercab") Object.assign(s, { value: String(last.cybercab), label: `Cybercabs on the Texas DMV automated-vehicle registry (${when})`, src: tx.source.url });
        if (s.live === "share") Object.assign(s, { value: `${pct}%`, label: `Share of Tesla’s ${total} registered Texas robotaxis that are Cybercabs (${when})`, src: tx.source.url });
      });
      renderStats();
      renderShare(q("[data-cc-share]"), d.share);
      const lastFleet = d.fleet[d.fleet.length - 1];
      if (last.date > lastFleet.date && last.cybercab !== lastFleet.value) {
        const chart = q("[data-cc-chart]");
        chart?.nextElementSibling?.matches("p") && chart.nextElementSibling.remove();
        renderChart(chart, d.fleet.concat({ date: last.date, label: when.replace(/,? \d{4}$/, ""), value: last.cybercab, src: tx.source.url }));
      }
    })
    .catch(() => {});
  renderMap(q("[data-cc-map]"), d.cities);
})();
