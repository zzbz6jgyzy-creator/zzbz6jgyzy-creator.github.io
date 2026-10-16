(() => {
  const D = window.EXPLAINERS;
  if (!D) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const stamp = document.querySelector("[data-vx-updated]");
  if (stamp) {
    stamp.textContent = D.updatedLabel;
    stamp.setAttribute("datetime", D.updated);
  }

  function shareUrl(id) {
    return `https://superchargeddaily.com/explainers.html#${id}`;
  }
  function tweet(id, text) {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl(id))}`;
  }

  function player(root, { duration = 9000, onTick, labels }) {
    const play = root.querySelector("[data-vx-play]");
    const range = root.querySelector("[data-vx-range]");
    const out = root.querySelector("[data-vx-readout]");
    let t = 0;
    let running = false;
    let last = 0;
    const set = (p, fromUser) => {
      t = Math.max(0, Math.min(1, p));
      if (range && !fromUser) range.value = String(Math.round(t * 1000));
      onTick(t);
      if (out && labels) out.textContent = labels(t);
    };
    const loop = (now) => {
      if (!running) return;
      if (!last) last = now;
      t += (now - last) / duration;
      last = now;
      if (t >= 1) t = 0;
      set(t);
      requestAnimationFrame(loop);
    };
    play?.addEventListener("click", () => {
      running = !running;
      play.textContent = running ? "Pause" : "Play";
      play.setAttribute("aria-pressed", running ? "true" : "false");
      last = 0;
      if (running) requestAnimationFrame(loop);
    });
    range?.addEventListener("input", () => {
      running = false;
      if (play) {
        play.textContent = "Play";
        play.setAttribute("aria-pressed", "false");
      }
      set(Number(range.value) / 1000, true);
    });
    set(reduce ? 0.55 : 0);
    if (!reduce && play) {
      running = true;
      play.textContent = "Pause";
      play.setAttribute("aria-pressed", "true");
      requestAnimationFrame(loop);
    }
    return { set, stop: () => { running = false; } };
  }

  function hotSvg() {
    return `<svg viewBox="0 0 400 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Starship stack during hot staging">
      <rect width="400" height="480" fill="#070d14"/>
      <g opacity=".4" fill="#d7dde4">
        <circle cx="36" cy="28" r="1.2"/><circle cx="88" cy="54" r="1"/><circle cx="310" cy="36" r="1.3"/>
        <circle cx="348" cy="78" r="1"/><circle cx="70" cy="110" r="1.1"/><circle cx="260" cy="22" r="1"/>
      </g>
      <g data-hot-stack>
        <g data-hot-booster>
          <rect x="166" y="212" width="68" height="168" fill="#b7bec6"/>
          <rect x="172" y="212" width="10" height="168" fill="#dfe3e8"/>
          <g fill="#2f333a">
            <rect x="178" y="232" width="12" height="36" rx="1"/>
            <rect x="210" y="232" width="12" height="36" rx="1"/>
            <rect x="178" y="292" width="12" height="36" rx="1"/>
            <rect x="210" y="292" width="12" height="36" rx="1"/>
          </g>
          <text x="248" y="300" fill="#8b939c" font-size="11" font-family="IBM Plex Mono,monospace">SUPER HEAVY</text>
          <g data-hot-grid>
            ${[-36, -18, 0, 18, 36].map((a) => `<g transform="translate(200 380) rotate(${a})"><rect x="-3" y="0" width="6" height="28" rx="1" fill="#d7dbe0"/></g>`).join("")}
          </g>
          <g data-hot-booster-plumes>
            <path d="M172 380 l10 72 l12-72z" fill="#ff9a2a"/>
            <path d="M188 380 l10 88 l14-88z" fill="#ffe38a"/>
            <path d="M208 380 l10 80 l12-80z" fill="#ff7a1a"/>
          </g>
        </g>
        <g data-hot-ring>
          <rect x="154" y="192" width="92" height="20" rx="4" fill="#d4a017"/>
          <rect x="160" y="196" width="80" height="6" rx="2" fill="#f0d36a"/>
          <text x="254" y="206" fill="#d4a017" font-size="11" font-family="IBM Plex Mono,monospace">RING</text>
          <g data-hot-vents opacity="0">
            <path d="M154 198 l-78 4 78 16z" fill="#ff8a2a"/>
            <path d="M246 198 l78 4 -78 16z" fill="#ff8a2a"/>
            <path d="M154 202 l-58 2 58 10z" fill="#ffe08a"/>
            <path d="M246 202 l58 2 -58 10z" fill="#ffe08a"/>
          </g>
        </g>
        <g data-hot-ship>
          <path d="M200 28 l32 58 v108 h-64 v-108 z" fill="#c8ced6"/>
          <path d="M168 28 l32 0 32 58 h-64 z" fill="#e8eaee"/>
          <path d="M168 86 l-28 22 v36 l28-12z" fill="#9aa3ad"/>
          <path d="M232 86 l28 22 v36 l-28-12z" fill="#9aa3ad"/>
          <rect x="186" y="78" width="28" height="10" rx="2" fill="#2b3038"/>
          <text x="248" y="78" fill="#8b939c" font-size="11" font-family="IBM Plex Mono,monospace">SHIP</text>
          <g data-hot-ship-plumes opacity="0">
            <path d="M178 194 l8 70 l12-70z" fill="#ffb020"/>
            <path d="M194 194 l8 86 l12-86z" fill="#ffe38a"/>
            <path d="M210 194 l8 70 l12-70z" fill="#ff7a1a"/>
          </g>
        </g>
      </g>
      <text x="18" y="462" fill="#6f7780" font-size="11" font-family="IBM Plex Mono,monospace">Original diagram · not to scale</text>
    </svg>`;
  }

  function catchSvg() {
    return `<svg viewBox="0 0 520 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Super Heavy approaching the chopsticks">
      <rect width="520" height="400" fill="#070d14"/>
      <rect x="0" y="372" width="520" height="28" fill="#12161c"/>
      <g opacity=".35" fill="#d7dde4">
        <circle cx="200" cy="24" r="1.2"/><circle cx="320" cy="48" r="1"/><circle cx="460" cy="30" r="1.3"/>
      </g>
      <g data-catch-tower>
        <rect x="36" y="18" width="32" height="354" fill="#2a3038"/>
        <rect x="40" y="18" width="8" height="354" fill="#3a424c"/>
        <rect x="28" y="12" width="48" height="16" fill="#c9cfd6"/>
        <text x="78" y="36" fill="#8b939c" font-size="11" font-family="IBM Plex Mono,monospace">TOWER</text>
        <g data-catch-arms>
          <rect data-arm="l" x="68" y="148" width="150" height="14" rx="4" fill="#e2c48a"/>
          <rect data-arm="r" x="68" y="198" width="150" height="14" rx="4" fill="#e2c48a"/>
        </g>
        <text x="78" y="246" fill="#e2c48a" font-size="11" font-family="IBM Plex Mono,monospace">CHOPSTICKS</text>
      </g>
      <g data-catch-booster transform="translate(430 90) rotate(-16)">
        <path d="M0 -108 l24 20 v164 h-48 v-164 z" fill="#c4cad2"/>
        <path d="M-24 -88 l24 -20 24 20 v20 h-48z" fill="#e6eaee"/>
        <rect x="-18" y="-70" width="8" height="140" fill="#dfe3e8"/>
        <rect x="-34" y="-10" width="14" height="22" rx="1" fill="#e31937"/>
        <rect x="20" y="-10" width="14" height="22" rx="1" fill="#e31937"/>
        <g transform="translate(0 76)">
          <rect x="-28" y="0" width="8" height="22" fill="#9aa3ad"/>
          <rect x="20" y="0" width="8" height="22" fill="#9aa3ad"/>
        </g>
        <text x="36" y="-48" fill="#8b939c" font-size="11" font-family="IBM Plex Mono,monospace">B12</text>
        <g data-catch-plumes opacity="0">
          <path d="M-16 76 l10 78 l12-78z" fill="#ff9a2a"/>
          <path d="M2 76 l10 92 l12-92z" fill="#ffe38a"/>
        </g>
      </g>
      <text x="18" y="390" fill="#6f7780" font-size="11" font-family="IBM Plex Mono,monospace">Original diagram · not to scale</text>
    </svg>`;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }
  function span(t, a, b) { return clamp01((t - a) / (b - a)); }

  function mountHot(section) {
    const board = section.querySelector("[data-vx-diagram]");
    const modeBtn = section.querySelector("[data-vx-mode]");
    board.innerHTML = hotSvg();
    let hot = true;
    const ship = board.querySelector("[data-hot-ship]");
    const stack = board.querySelector("[data-hot-stack]");
    const ring = board.querySelector("[data-hot-ring]");
    const vents = board.querySelector("[data-hot-vents]");
    const shipPlumes = board.querySelector("[data-hot-ship-plumes]");
    const boosterPlumes = board.querySelector("[data-hot-booster-plumes]");
    const booster = board.querySelector("[data-hot-booster]");
    const tick = (t) => {
      if (hot) {
        const shipOn = span(t, 0.3, 0.46);
        const sep = span(t, 0.48, 0.72);
        const flip = span(t, 0.7, 1);
        const boost = 1 - span(t, 0.2, 0.4) * 0.35;
        shipPlumes.setAttribute("opacity", String(shipOn));
        vents.setAttribute("opacity", String(span(t, 0.22, 0.38)));
        boosterPlumes.setAttribute("opacity", String(0.35 + boost * 0.65));
        ship.setAttribute("transform", `translate(0 ${(-sep * 42).toFixed(1)})`);
        ring.setAttribute("transform", `translate(0 ${(-sep * 8).toFixed(1)})`);
        booster.setAttribute("transform", `rotate(${(-flip * 22).toFixed(1)} 200 340)`);
        stack.setAttribute("transform", `translate(0 ${(-t * 8).toFixed(1)})`);
      } else {
        const cut = span(t, 0.22, 0.34);
        const gap = span(t, 0.4, 0.58);
        const light = span(t, 0.58, 0.74);
        shipPlumes.setAttribute("opacity", String(light));
        vents.setAttribute("opacity", "0");
        boosterPlumes.setAttribute("opacity", String(1 - cut));
        ship.setAttribute("transform", `translate(0 ${(-gap * 36).toFixed(1)})`);
        ring.setAttribute("transform", "translate(0 0)");
        booster.setAttribute("transform", `rotate(${(-span(t, 0.7, 1) * 14).toFixed(1)} 200 340)`);
        stack.setAttribute("transform", `translate(0 ${(-t * 6).toFixed(1)})`);
      }
      syncSteps(section, D.hot.steps, t);
    };
    const ctl = player(section, {
      onTick: tick,
      labels: (t) => (hot ? "Hot staging" : "Cold staging") + " · " + Math.round(t * 100) + "%",
    });
    modeBtn?.addEventListener("click", () => {
      hot = !hot;
      modeBtn.textContent = hot ? "Show cold staging" : "Show hot staging";
      modeBtn.setAttribute("aria-pressed", hot ? "false" : "true");
      ctl.set(hot ? 0.44 : 0.66);
    });
    wireSteps(section, D.hot.steps, ctl);
    if (reduce) ctl.set(0.44);
  }

  function mountCatch(section) {
    const board = section.querySelector("[data-vx-diagram]");
    board.innerHTML = catchSvg();
    const booster = board.querySelector("[data-catch-booster]");
    const plumes = board.querySelector("[data-catch-plumes]");
    const armL = board.querySelector('[data-arm="l"]');
    const armR = board.querySelector('[data-arm="r"]');
    const tick = (t) => {
      const x = lerp(430, 196, span(t, 0.08, 0.82));
      const y = lerp(90, 180, span(t, 0, 0.86));
      const rot = lerp(-16, 0, span(t, 0.28, 0.62));
      const burn = span(t, 0.42, 0.58) * (1 - span(t, 0.78, 0.92));
      const close = span(t, 0.8, 0.96);
      booster.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
      plumes.setAttribute("opacity", String(burn));
      armL.setAttribute("transform", `translate(${(close * 18).toFixed(1)} 0)`);
      armR.setAttribute("transform", `translate(${(close * 18).toFixed(1)} 0)`);
      syncSteps(section, D.catch.steps, t);
    };
    const ctl = player(section, {
      onTick: tick,
      labels: (t) => (t < 0.35 ? "Boostback" : t < 0.7 ? "Landing burn" : "Catch") + " · " + Math.round(t * 100) + "%",
    });
    wireSteps(section, D.catch.steps, ctl);
    if (reduce) ctl.set(0.72);
  }

  function syncSteps(section, steps, t) {
    let idx = 0;
    steps.forEach((s, i) => { if (t >= s.at - 0.08) idx = i; });
    section.querySelectorAll("[data-vx-step]").forEach((el, i) => el.classList.toggle("is-on", i === idx));
  }
  function wireSteps(section, steps, ctl) {
    section.querySelectorAll("[data-vx-step]").forEach((el, i) => {
      el.addEventListener("click", () => ctl.set(steps[i].at));
    });
  }

  function mountFsd(section) {
    const a = section.querySelector("[data-vx-a]");
    const b = section.querySelector("[data-vx-b]");
    const flags = section.querySelector("[data-vx-flags]");
    const note = section.querySelector("[data-vx-stack-note]");
    const stacks = D.fsd.stacks;
    const fill = (sel, picked) => {
      sel.innerHTML = stacks.map((s) => `<option value="${esc(s.id)}"${s.id === picked ? " selected" : ""}>${esc(s.label)} · ${esc(s.version)}</option>`).join("");
    };
    fill(a, "us-hw4");
    fill(b, "eu");
    const render = () => {
      const left = stacks.find((s) => s.id === a.value);
      const right = stacks.find((s) => s.id === b.value);
      if (!left || !right) return;
      flags.innerHTML =
        `<div class="vx-flag vx-flag-h"><span>Feature</span><span>${esc(left.short)}</span><span>${esc(right.short)}</span></div>` +
        D.fsd.flags.map((f) => {
          const L = left.features[f.id];
          const R = right.features[f.id];
          return `<div class="vx-flag"><span>${esc(f.label)}</span>
            <span class="vx-pill ${L ? "on" : "off"}">${L ? "On" : "Off"}</span>
            <span class="vx-pill ${R ? "on" : "off"}">${R ? "On" : "Off"}</span></div>`;
        }).join("");
      note.innerHTML = `<p><strong>${esc(left.name)}</strong> — ${esc(left.text)} <a href="${esc(left.src)}" rel="noopener">Source</a></p>
        <p><strong>${esc(right.name)}</strong> — ${esc(right.text)} <a href="${esc(right.src)}" rel="noopener">Source</a></p>`;
    };
    a.addEventListener("change", render);
    b.addEventListener("change", render);
    render();
  }

  function wireShare(section, item) {
    const copy = section.querySelector("[data-vx-copy]");
    copy?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrl(item.id));
        copy.textContent = "Copied";
        setTimeout(() => { copy.textContent = "Copy link"; }, 1400);
      } catch {
        copy.textContent = "Copy failed";
      }
    });
  }

  document.querySelectorAll("[data-vx-piece]").forEach((section) => {
    const id = section.getAttribute("data-vx-piece");
    const item = D.items.find((x) => x.id === id);
    if (!item) return;
    if (id === "hot-staging") mountHot(section);
    if (id === "catch") mountCatch(section);
    if (id === "fsd") mountFsd(section);
    wireShare(section, item);
  });

  const jumps = document.querySelectorAll(".vx-jump a");
  const pieces = [...document.querySelectorAll("[data-vx-piece]")];
  const mark = () => {
    const y = window.scrollY + 140;
    let on = pieces[0]?.id;
    pieces.forEach((p) => { if (p.offsetTop <= y) on = p.id; });
    jumps.forEach((a) => a.classList.toggle("is-on", a.getAttribute("href") === "#" + on));
  };
  window.addEventListener("scroll", mark, { passive: true });
  mark();
  const goHash = () => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    el?.scrollIntoView({ block: "start" });
    mark();
  };
  window.addEventListener("hashchange", goHash);
  goHash();
})();
