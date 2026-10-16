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

  const kickerEl = document.querySelector("[data-vx-kicker]");
  const ledeEl = document.querySelector("[data-vx-lede]");
  const players = [];

  function shareUrl(id) {
    return `https://superchargeddaily.com/explainers.html#${id}`;
  }

  function player(root, { onTick, labels, initial = 0.42 }) {
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
      t += (now - last) / 9000;
      last = now;
      if (t >= 1) t = 0;
      set(t);
      requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (play) {
        play.textContent = "Play";
        play.setAttribute("aria-pressed", "false");
      }
    };
    play?.addEventListener("click", () => {
      running = !running;
      play.textContent = running ? "Pause" : "Play";
      play.setAttribute("aria-pressed", running ? "true" : "false");
      last = 0;
      if (running) requestAnimationFrame(loop);
    });
    range?.addEventListener("input", () => {
      stop();
      set(Number(range.value) / 1000, true);
    });
    set(initial);
    const ctl = { set, stop, root };
    players.push(ctl);
    return ctl;
  }

  function chip(x, y, label, tone = "#c4b8a4") {
    const w = Math.max(40, String(label).length * 6.6 + 16);
    return `<g transform="translate(${x} ${y})">
      <rect width="${w}" height="17" rx="4" fill="rgba(8,10,14,.74)" stroke="rgba(255,255,255,.12)"/>
      <text x="8" y="12.2" fill="${tone}" font-size="9.5" font-family="IBM Plex Mono,ui-monospace,monospace">${label}</text>
    </g>`;
  }

  function steelDefs(p) {
    return `<linearGradient id="${p}-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#2a2620"/><stop offset=".28" stop-color="#6a6458"/>
        <stop offset=".46" stop-color="#e8e2d4"/><stop offset=".55" stop-color="#fff8ec"/>
        <stop offset=".68" stop-color="#9a9284"/><stop offset="1" stop-color="#2c2822"/>
      </linearGradient>
      <linearGradient id="${p}-plume" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff8dc"/><stop offset=".12" stop-color="#b4dcff"/>
        <stop offset=".42" stop-color="#ffb040"/><stop offset="1" stop-color="rgba(255,50,8,0)"/>
      </linearGradient>
      <linearGradient id="${p}-bell" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#24180f"/><stop offset=".35" stop-color="#8a5328"/>
        <stop offset=".5" stop-color="#e0b068"/><stop offset=".75" stop-color="#7a4a24"/><stop offset="1" stop-color="#1a120c"/>
      </linearGradient>
      <filter id="${p}-glow" x="-60%" y="-30%" width="220%" height="180%">
        <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
  }

  function raptorBell(cx, cy, s, fill) {
    return `<g transform="translate(${cx} ${cy}) scale(${s})">
      <path d="M-2.8 -1.6 L-5.6 8.4 Q0 10.8 5.6 8.4 L2.8 -1.6 Z" fill="${fill}"/>
      <ellipse cx="0" cy="8" rx="2.4" ry="1.1" fill="#0e0a08"/>
    </g>`;
  }

  function gridFin(x, y, rot, flip) {
    const sx = flip ? -1 : 1;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sx} 1)">
      <path d="M4 -4 H36 L39 20 H4 Z" fill="#7a7468"/>
      <path d="M7 -1 H34 L36 17 H7 Z" fill="#2a2620"/>
      <path d="M10 3 H33 M10 8 H33 M10 13 H33 M14 -1 V17 M19 -1 V17 M24 -1 V17 M29 -1 V17" stroke="#c4b8a4" stroke-width=".85"/>
      <rect x="-2" y="2" width="10" height="10" rx="1" fill="#5a544c"/>
    </g>`;
  }

  function hotSvg() {
    const stars = [
      [22, 18, 1.1], [58, 42, 0.8], [88, 14, 1.4], [128, 34, 0.7],
      [176, 10, 1], [236, 26, 1.3], [292, 12, 0.8], [332, 40, 1.1],
      [368, 18, 0.7], [44, 74, 0.6], [304, 66, 1], [354, 86, 0.7],
      [16, 116, 0.5], [394, 124, 0.7], [72, 154, 0.5], [404, 188, 0.55],
      [110, 28, 0.5], [210, 48, 0.6], [268, 8, 0.9], [390, 56, 0.5],
    ];
    const tiles = Array.from({ length: 18 }, (_, row) =>
      Array.from({ length: 6 }, (_, col) => {
        const x = 169 + col * 3.4 + (row % 2) * 1.6;
        const y = 86 + row * 5.6;
        return `<rect x="${x}" y="${y}" width="3" height="4.9" rx=".3" fill="rgba(0,0,0,.5)"/>`;
      }).join("")
    ).join("");
    const welds = Array.from({ length: 12 }, (_, i) => {
      const y = 228 + i * 13.2;
      return `<path d="M171 ${y} H229" stroke="rgba(10,8,6,.48)" stroke-width="1.05"/>`;
    }).join("");
    return `<svg viewBox="0 0 420 520" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Starship stack during hot staging">
      <defs>
        <linearGradient id="vx-hot-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#02050a"/><stop offset=".46" stop-color="#0a1420"/>
          <stop offset=".78" stop-color="#1a2432"/><stop offset="1" stop-color="#4a2e22"/>
        </linearGradient>
        ${steelDefs("vx-hot")}
        <linearGradient id="vx-hot-soot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(12,10,8,0)"/><stop offset="1" stop-color="rgba(10,8,6,.42)"/>
        </linearGradient>
        <linearGradient id="vx-hot-tile" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#14110d"/><stop offset=".72" stop-color="#2a241c"/><stop offset="1" stop-color="rgba(24,20,16,0)"/>
        </linearGradient>
        <radialGradient id="vx-hot-ringg" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="rgba(255,210,140,.62)"/><stop offset=".42" stop-color="rgba(255,120,36,.28)"/><stop offset="1" stop-color="rgba(255,30,0,0)"/>
        </radialGradient>
        <radialGradient id="vx-hot-limb" cx="50%" cy="100%" r="70%">
          <stop offset="0" stop-color="rgba(232,160,96,.28)"/><stop offset=".55" stop-color="rgba(80,40,24,.08)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="420" height="520" fill="url(#vx-hot-sky)"/>
      <rect width="420" height="520" fill="url(#vx-hot-limb)"/>
      ${stars.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${r > 1 ? "#fff4d4" : "#d8e4ff"}" opacity=".62"/>`).join("")}
      <ellipse cx="210" cy="528" rx="320" ry="46" fill="#14100e"/>
      <ellipse cx="210" cy="510" rx="230" ry="18" fill="#c47850" opacity=".22"/>
      <path d="M-20 498 Q210 470 440 498 L440 530 L-20 530 Z" fill="#1a1410"/>
      <g data-hot-stack>
        <g data-hot-booster>
          <path d="M170 214 H230 L236 392 Q200 412 164 392 Z" fill="url(#vx-hot-steel)"/>
          ${welds}
          <path d="M200 218 V394" stroke="rgba(16,14,12,.22)" stroke-width=".8"/>
          <rect x="218" y="220" width="6" height="172" fill="rgba(10,8,6,.44)"/>
          <rect x="166" y="314" width="68" height="82" fill="url(#vx-hot-soot)"/>
          ${gridFin(168, 236, -8, true)}${gridFin(232, 236, 8, false)}
          ${gridFin(168, 268, -4, true)}${gridFin(232, 268, 4, false)}
          ${[-18, -9, 0, 9, 18].map((dx, i) => raptorBell(200 + dx, 396 + Math.abs(dx) * 0.15, 1.15 + (i === 2 ? 0.12 : 0), "url(#vx-hot-bell)")).join("")}
          <g data-hot-booster-plumes filter="url(#vx-hot-glow)">
            <ellipse class="vx-flicker" cx="200" cy="418" rx="48" ry="20" fill="rgba(255,180,80,.38)"/>
            <path d="M162 408 L238 408 L216 512 L184 512 Z" fill="url(#vx-hot-plume)"/>
            <path class="vx-flicker" d="M184 408 L216 408 L208 504 L192 504 Z" fill="url(#vx-hot-plume)" opacity=".92"/>
            <path d="M192 408 L208 408 L205 478 L195 478 Z" fill="#fff8dc" opacity=".35"/>
          </g>
          ${chip(258, 292, "SUPER HEAVY")}
          ${chip(258, 314, "33 RAPTORS", "#8a8074")}
        </g>
        <g data-hot-ring>
          <ellipse cx="200" cy="208" rx="62" ry="18" fill="url(#vx-hot-ringg)"/>
          <rect x="158" y="196" width="84" height="20" rx="7" fill="#6a4a18"/>
          <rect x="162" y="199" width="76" height="7" rx="2" fill="#e2c48a"/>
          <g fill="#3a2a10">
            ${[166, 180, 194, 208, 222].map((x) => `<rect x="${x}" y="209" width="9" height="6" rx="1"/>`).join("")}
          </g>
          ${chip(258, 200, "RING", "#e2c48a")}
          <g data-hot-vents opacity="0" filter="url(#vx-hot-glow)">
            <path d="M158 208 L96 198 L102 212 L158 214 Z" fill="#ff8a28" opacity=".7"/>
            <path d="M262 208 L324 198 L318 212 L262 214 Z" fill="#ff8a28" opacity=".7"/>
            <path d="M158 210 L118 204 L122 214 L158 213 Z" fill="#ffb040" opacity=".8"/>
            <path d="M262 210 L302 204 L298 214 L262 213 Z" fill="#ffb040" opacity=".8"/>
            <path class="vx-flicker" d="M158 211 L130 208 L132 214 L158 213 Z" fill="#ffe08a"/>
            <path class="vx-flicker" d="M262 211 L290 208 L288 214 L262 213 Z" fill="#ffe08a"/>
          </g>
        </g>
        <g data-hot-ship>
          <path d="M168 138 L132 160 L138 178 L168 164 Z" fill="#6a6458"/>
          <path d="M252 138 L288 160 L282 178 L252 164 Z" fill="#6a6458"/>
          <path d="M170 140 L140 160 L144 168 L170 156 Z" fill="#2a261e"/>
          <path d="M250 140 L280 160 L276 168 L250 156 Z" fill="#2a261e"/>
          <path d="M174 88 L148 104 L154 116 L174 106 Z" fill="#8a8274"/>
          <path d="M246 88 L272 104 L266 116 L246 106 Z" fill="#8a8274"/>
          <path d="M200 28 C226 28 232 54 232 80 L232 196 H168 L168 80 C168 54 174 28 200 28 Z" fill="url(#vx-hot-steel)"/>
          <path d="M168 84 L198 78 L198 184 L168 178 Z" fill="url(#vx-hot-tile)"/>
          ${tiles}
          <rect x="192" y="66" width="16" height="11" rx="1.6" fill="#101216"/>
          <rect x="194" y="68" width="12" height="7" rx="1" fill="#8ec8ff" opacity=".78"/>
          ${[-10, 0, 10].map((dx) => raptorBell(200 + dx, 196, 0.95, "url(#vx-hot-bell)")).join("")}
          <g data-hot-ship-plumes opacity="0" filter="url(#vx-hot-glow)">
            <path d="M176 198 L224 198 L214 286 L186 286 Z" fill="url(#vx-hot-plume)"/>
            <path class="vx-flicker" d="M188 198 L212 198 L208 274 L192 274 Z" fill="url(#vx-hot-plume)"/>
          </g>
          ${chip(258, 68, "SHIP")}
          ${chip(258, 90, "6 RAPTORS", "#8a8074")}
        </g>
      </g>
      <g data-hot-coast opacity="0">
        <rect x="168" y="166" width="64" height="22" rx="5" fill="#3a2424" stroke="#c98a8a"/>
        <text x="180" y="181" fill="#e8b0b0" font-size="11" font-family="IBM Plex Mono,ui-monospace,monospace">COAST</text>
      </g>
      <text x="16" y="508" fill="#8a8074" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">Original diagram · not to scale · F14 clocks</text>
    </svg>`;
  }

  function catchSvg() {
    const braces = Array.from({ length: 16 }, (_, i) => {
      const y = 22 + i * 18.6;
      return `<path d="M38 ${y} L82 ${y + 18} M82 ${y} L38 ${y + 18} M38 ${y} H82" stroke="#7a848e" stroke-width="1.45"/>`;
    }).join("");
    const farBraces = Array.from({ length: 10 }, (_, i) => {
      const y = 168 + i * 14;
      return `<path d="M468 ${y} L488 ${y + 14} M488 ${y} L468 ${y + 14}" stroke="#6a727c" stroke-width="1.15"/>`;
    }).join("");
    const chev = (y) => Array.from({ length: 10 }, (_, i) =>
      `<rect x="${82 + i * 15}" y="${y + 2}" width="13" height="12" fill="${i % 2 ? "#161614" : "#e2c04a"}"/>`
    ).join("");
    const ripples = Array.from({ length: 10 }, (_, i) =>
      `<path d="M0 ${322 + i * 6.2} H560" stroke="rgba(210,180,130,${0.04 + (i % 3) * 0.018})" stroke-width="1.1"/>`
    ).join("");
    return `<svg viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Super Heavy approaching the chopsticks">
      <defs>
        <linearGradient id="vx-ca-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a2230"/><stop offset=".4" stop-color="#3a3848"/>
          <stop offset=".7" stop-color="#c47850"/><stop offset="1" stop-color="#e8a070"/>
        </linearGradient>
        <linearGradient id="vx-ca-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#6a4a3a"/><stop offset=".32" stop-color="#2a2830"/><stop offset="1" stop-color="#121018"/>
        </linearGradient>
        ${steelDefs("vx-ca")}
        <linearGradient id="vx-ca-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8a8680"/><stop offset=".4" stop-color="#4a4844"/><stop offset="1" stop-color="#1c1c1a"/>
        </linearGradient>
        <radialGradient id="vx-ca-sun" cx="78%" cy="70%" r="58%">
          <stop offset="0" stop-color="rgba(255,210,140,.55)"/><stop offset=".16" stop-color="rgba(255,160,80,.2)"/><stop offset="1" stop-color="rgba(255,120,40,0)"/>
        </radialGradient>
      </defs>
      <rect width="560" height="400" fill="url(#vx-ca-sky)"/>
      <rect width="560" height="400" fill="url(#vx-ca-sun)"/>
      <circle cx="436" cy="286" r="7" fill="rgba(255,236,200,.88)"/>
      <ellipse cx="120" cy="92" rx="70" ry="10" fill="#efe4d4" opacity=".14"/>
      <ellipse cx="340" cy="70" rx="90" ry="12" fill="#efe4d4" opacity=".1"/>
      <ellipse cx="500" cy="108" rx="50" ry="8" fill="#efe4d4" opacity=".12"/>
      <rect x="0" y="318" width="560" height="82" fill="url(#vx-ca-water)"/>
      <path d="M0 318 H560" stroke="rgba(255,220,180,.3)" stroke-width="1.3"/>
      <ellipse cx="430" cy="318" rx="96" ry="6" fill="rgba(255,200,140,.14)"/>
      ${ripples}
      <g opacity=".9">
        <rect x="466" y="164" width="24" height="154" fill="#1a1c20"/>
        <rect x="466" y="164" width="4" height="154" fill="#2c3036"/>
        <rect x="486" y="164" width="4" height="154" fill="#2c3036"/>
        ${farBraces}
        <rect x="462" y="158" width="32" height="7" fill="#2a2c30"/>
      </g>
      <ellipse cx="196" cy="316" rx="170" ry="16" fill="#2a2822"/>
      <rect x="40" y="308" width="210" height="3" fill="rgba(236,220,160,.1)"/>
      <rect x="126" y="309" width="16" height="2" fill="rgba(200,16,46,.4)"/>
      <rect x="148" y="309" width="16" height="2" fill="rgba(200,16,46,.4)"/>
      <g opacity=".95">
        <rect x="214" y="262" width="18" height="52" rx="8" fill="#2a2c26"/>
        <rect x="238" y="248" width="16" height="66" rx="8" fill="#3a3c36"/>
        <rect x="260" y="270" width="20" height="44" rx="9" fill="#2a2c26"/>
      </g>
      <g data-catch-tower>
        <rect x="36" y="12" width="50" height="306" fill="#1c2026"/>
        <rect x="38" y="12" width="8" height="306" fill="#2c3036"/>
        <rect x="76" y="12" width="8" height="306" fill="#2c3036"/>
        ${braces}
        <rect x="32" y="8" width="58" height="10" fill="#2c3036"/>
        <rect x="54" y="0" width="14" height="10" fill="#c8102e"/>
        <circle cx="61" cy="-2" r="2.5" fill="#ff3a3a"/>
        <g>
          <circle cx="44" cy="68" r="2.2" fill="#ffe6be"/>
          <circle cx="78" cy="138" r="2.2" fill="#ffe6be"/>
          <circle cx="44" cy="208" r="2.2" fill="#ffe6be"/>
          <ellipse cx="44" cy="68" rx="28" ry="22" fill="rgba(255,220,150,.16)"/>
          <ellipse cx="78" cy="138" rx="28" ry="22" fill="rgba(255,220,150,.12)"/>
          <ellipse cx="44" cy="208" rx="28" ry="22" fill="rgba(255,220,150,.1)"/>
        </g>
        ${chip(96, 22, "TOWER")}
        <g data-catch-arms>
          <g data-arm="l">
            <rect x="72" y="142" width="176" height="20" fill="url(#vx-ca-arm)"/>
            <rect x="72" y="142" width="176" height="3" fill="rgba(236,228,210,.26)"/>
            <rect x="76" y="139" width="158" height="3" fill="#2a2824"/>
            ${chev(142)}
            <rect x="236" y="140" width="16" height="24" fill="#5a5852"/>
          </g>
          <g data-arm="r">
            <rect x="72" y="192" width="176" height="20" fill="url(#vx-ca-arm)"/>
            <rect x="72" y="192" width="176" height="3" fill="rgba(236,228,210,.26)"/>
            <rect x="76" y="189" width="158" height="3" fill="#2a2824"/>
            ${chev(192)}
            <rect x="236" y="190" width="16" height="24" fill="#5a5852"/>
          </g>
        </g>
        ${chip(96, 236, "CHOPSTICKS", "#e2c48a")}
      </g>
      <g data-catch-booster transform="translate(430 90) rotate(-16)">
        <path d="M0 -118 C16 -118 24 -96 24 -72 L26 78 Q0 96 -26 78 L-24 -72 C-24 -96 -16 -118 0 -118 Z" fill="url(#vx-ca-steel)"/>
        <path d="M0 -110 V76" stroke="rgba(20,18,16,.22)" stroke-width=".8"/>
        ${Array.from({ length: 11 }, (_, i) => `<path d="M-22 ${-74 + i * 13.2} H22" stroke="rgba(20,18,16,.2)" stroke-width=".55"/>`).join("")}
        <rect x="10" y="-70" width="8" height="136" fill="rgba(10,8,6,.36)"/>
        ${gridFin(-22, -78, -6, true)}${gridFin(22, -78, 6, false)}
        <rect x="-42" y="-14" width="18" height="9" rx="1" fill="#e2c04a"/>
        <rect x="24" y="-14" width="18" height="9" rx="1" fill="#e2c04a"/>
        <rect x="-42" y="-14" width="18" height="2.2" fill="rgba(255,255,220,.42)"/>
        <rect x="24" y="-14" width="18" height="2.2" fill="rgba(255,255,220,.42)"/>
        ${chip(36, -8, "PINS", "#e2c04a")}
        ${chip(30, -62, "B12")}
        ${[-8, 0, 8].map((dx) => raptorBell(dx, 82, 0.85, "url(#vx-ca-bell)")).join("")}
        <g data-catch-plumes opacity="0" filter="url(#vx-ca-glow)">
          <ellipse class="vx-flicker" cx="0" cy="94" rx="24" ry="11" fill="rgba(255,180,80,.42)"/>
          <path d="M-16 84 L16 84 L8 176 L-8 176 Z" fill="url(#vx-ca-plume)"/>
        </g>
      </g>
      ${chip(318, 374, "MISS → CONTROLLED SPLASH")}
      <text x="16" y="392" fill="#8a8074" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">Original diagram · not to scale · F5 clocks</text>
    </svg>`;
  }

  function teslaBody(prefix, x, y, { dark = false, sensors = false, scale = 1 } = {}) {
    const paint = dark ? ["#2a3038", "#5a646e", "#14181c"] : ["#b4bcc4", "#e8eef2", "#6a727a"];
    const handle = dark ? "#3a424c" : "#d8dee4";
    return `<g transform="translate(${x} ${y}) scale(${scale})">
      <defs>
        <linearGradient id="vx-${prefix}-paint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${paint[1]}"/><stop offset=".42" stop-color="${paint[0]}"/><stop offset="1" stop-color="${paint[2]}"/>
        </linearGradient>
        <linearGradient id="vx-${prefix}-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9ad0ff"/><stop offset=".55" stop-color="#2a4a62"/><stop offset="1" stop-color="#0c1822"/>
        </linearGradient>
        <radialGradient id="vx-${prefix}-beam" cx="0%" cy="50%" r="90%">
          <stop offset="0" stop-color="rgba(255,240,210,.32)"/><stop offset="1" stop-color="rgba(255,220,160,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="104" cy="70" rx="94" ry="6" fill="#000" opacity=".4"/>
      ${sensors ? `<path d="M196 36 L268 12 L274 56 L196 48 Z" fill="url(#vx-${prefix}-beam)"/>` : ""}
      <path d="M10 50
        C14 40 26 34 42 32
        C58 22 78 14 104 12
        C132 10 154 16 170 24
        C184 30 194 38 200 46
        L206 50 L206 58
        C206 61 202 63 194 63
        H176
        C172 63 166 54 158 54
        C150 54 144 63 140 63
        H68
        C64 63 58 54 50 54
        C42 54 36 63 32 63
        H16
        C8 63 6 60 6 56
        C6 53 8 50 10 50 Z" fill="url(#vx-${prefix}-paint)"/>
      <path d="M62 30 C80 16 118 14 152 24 C160 28 166 34 170 40 H66 C63 36 62 32 62 30 Z" fill="#0c1218"/>
      <path d="M68 31 C86 18 120 16 148 25 C154 28 158 33 160 38 H72 C69 35 68 33 68 31 Z" fill="url(#vx-${prefix}-glass)" opacity=".7"/>
      <path d="M108 14 V40" stroke="rgba(8,10,14,.55)" stroke-width="1.6"/>
      <path d="M18 49 H188" stroke="${dark ? "#1a2026" : "#9aa3ad"}" stroke-width="1.1" opacity=".4"/>
      <rect x="86" y="42" width="12" height="2.4" rx="1" fill="${handle}"/>
      <rect x="128" y="42" width="12" height="2.4" rx="1" fill="${handle}"/>
      <path d="M58 34 L50 28 L54 34 Z" fill="${dark ? "#1c2228" : "#c4ccd4"}"/>
      <g>
        <circle cx="50" cy="58" r="15.5" fill="#0a0c0e"/>
        <circle cx="50" cy="58" r="10.2" fill="#2c3036"/>
        <circle cx="50" cy="58" r="4" fill="#8a9098"/>
        <path d="M50 48 V68 M40 58 H60" stroke="#4a5058" stroke-width="1.1"/>
        <circle cx="158" cy="58" r="15.5" fill="#0a0c0e"/>
        <circle cx="158" cy="58" r="10.2" fill="#2c3036"/>
        <circle cx="158" cy="58" r="4" fill="#8a9098"/>
        <path d="M158 48 V68 M148 58 H168" stroke="#4a5058" stroke-width="1.1"/>
      </g>
      <rect x="188" y="44" width="18" height="5" rx="1.5" fill="#f6f1e4"/>
      <rect x="8" y="46" width="16" height="4.2" rx="1.2" fill="#e31937"/>
      <path d="M190 42 C200 39 210 44 214 49" stroke="#f6f1e4" stroke-width="1.8" fill="none" opacity=".75"/>
    </g>`;
  }

  function cityWindows(x, y, cols, rows) {
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        if ((r * 5 + c * 3) % 4 === 0) return "";
        const lit = (r + c) % 3 !== 1;
        return `<rect x="${x + c * 5}" y="${y + r * 7}" width="3" height="4.2" fill="${lit ? ((r + c) % 5 === 0 ? "#f0d080" : "#9ec8ff") : "#1a222c"}" opacity="${lit ? 0.55 : 0.25}"/>`;
      }).join("")
    ).join("");
  }

  function evasionSvg() {
    return `<svg viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Collision Evasion: HW4 can re-engage Supervised FSD">
      <defs>
        <linearGradient id="vx-ev-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#070b12"/><stop offset=".62" stop-color="#121820"/><stop offset="1" stop-color="#1a222c"/>
        </linearGradient>
        <linearGradient id="vx-ev-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a3038"/><stop offset="1" stop-color="#12161c"/>
        </linearGradient>
        <linearGradient id="vx-ev-wet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(255,240,210,.08)"/><stop offset="1" stop-color="rgba(255,240,210,0)"/>
        </linearGradient>
        <radialGradient id="vx-ev-lamp" cx="50%" cy="0%" r="70%">
          <stop offset="0" stop-color="rgba(255,220,150,.2)"/><stop offset="1" stop-color="rgba(255,200,120,0)"/>
        </radialGradient>
      </defs>
      <rect width="560" height="400" fill="url(#vx-ev-sky)"/>
      <rect x="18" y="78" width="36" height="168" fill="#141820"/>
      <rect x="62" y="118" width="28" height="128" fill="#10141a"/>
      <rect x="168" y="64" width="48" height="182" fill="#161c24"/>
      <rect x="226" y="96" width="32" height="150" fill="#10161c"/>
      <rect x="340" y="72" width="40" height="174" fill="#141820"/>
      <rect x="388" y="108" width="26" height="138" fill="#10141a"/>
      <rect x="470" y="86" width="44" height="160" fill="#161c24"/>
      ${cityWindows(22, 86, 6, 14)}
      ${cityWindows(172, 72, 8, 16)}
      ${cityWindows(344, 80, 6, 14)}
      ${cityWindows(476, 94, 7, 13)}
      <g>
        <rect x="118" y="196" width="3" height="50" fill="#2a3038"/>
        <circle cx="119.5" cy="194" r="4" fill="#ffe6be"/>
        <ellipse cx="120" cy="210" rx="28" ry="40" fill="url(#vx-ev-lamp)"/>
        <rect x="292" y="188" width="3" height="58" fill="#2a3038"/>
        <circle cx="293.5" cy="186" r="4" fill="#ffe6be"/>
        <ellipse cx="294" cy="206" rx="32" ry="44" fill="url(#vx-ev-lamp)"/>
        <rect x="508" y="200" width="3" height="46" fill="#2a3038"/>
        <circle cx="509.5" cy="198" r="4" fill="#ffe6be"/>
      </g>
      <rect x="0" y="246" width="560" height="154" fill="url(#vx-ev-road)"/>
      <path d="M0 246 H560" stroke="#4a525c" stroke-width="3"/>
      <path d="M0 248 H560" stroke="#1a1e24" stroke-width="1"/>
      <path d="M18 318 H542" stroke="#c4b060" stroke-width="3.2" stroke-dasharray="24 18"/>
      <path d="M0 388 H560" stroke="#3a424c" stroke-width="2"/>
      <rect x="0" y="250" width="560" height="70" fill="url(#vx-ev-wet)"/>
      <g data-ev-threat>
        ${teslaBody("th", 332, 236, { dark: true })}
        ${chip(352, 224, "AHEAD", "#e2c48a")}
      </g>
      <g data-ev-car>
        ${teslaBody("me", 28, 248, { sensors: true })}
        <g data-ev-driver transform="translate(146 274)">
          <ellipse rx="7" ry="8" fill="#1a1c20"/>
          <ellipse cy="14" rx="9" ry="8" fill="#2a3038"/>
        </g>
        <g data-ev-badge>
          <rect x="132" y="226" width="54" height="18" rx="9" fill="#1b3d2a"/>
          <text x="142" y="239" fill="#7dcea0" font-size="11" font-family="IBM Plex Mono,ui-monospace,monospace">FSD</text>
        </g>
      </g>
      <text x="16" y="386" fill="#8a8074" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">Original diagram · not a crash test · SAE Level 2</text>
    </svg>`;
  }

  function fsdSvg() {
    return `<svg viewBox="0 0 560 200" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Three FSD stacks: HW4, HW3 Lite, Europe">
      <defs>
        <linearGradient id="vx-fsd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#080c12"/><stop offset="1" stop-color="#161b22"/>
        </linearGradient>
        <linearGradient id="vx-fsd-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#222830"/><stop offset="1" stop-color="#101418"/>
        </linearGradient>
      </defs>
      <rect width="560" height="200" fill="url(#vx-fsd-sky)"/>
      <rect x="0" y="128" width="560" height="72" fill="url(#vx-fsd-road)"/>
      <path d="M0 128 H560" stroke="#3a424c" stroke-width="2"/>
      <path d="M16 168 H544" stroke="#c4b060" stroke-width="2" stroke-dasharray="16 14" opacity=".55"/>
      <g>
        ${chip(24, 10, "HW4 NA")}
        ${teslaBody("f1", 10, 68, { sensors: true, scale: 0.72 })}
        <rect x="24" y="172" width="72" height="16" rx="8" fill="#1b3d2a"/>
        <text x="34" y="184" fill="#7dcea0" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">EVASION</text>
      </g>
      <g>
        ${chip(204, 10, "HW3 LITE")}
        ${teslaBody("f2", 196, 68, { dark: true, scale: 0.72 })}
        <rect x="204" y="172" width="48" height="16" rx="8" fill="#3a3030"/>
        <text x="218" y="184" fill="#c98a8a" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">NO</text>
      </g>
      <g>
        ${chip(386, 10, "EUROPE")}
        ${teslaBody("f3", 382, 68, { dark: true, scale: 0.72 })}
        <rect x="386" y="172" width="88" height="16" rx="8" fill="#3a3030"/>
        <text x="398" y="184" fill="#c98a8a" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">14.2 ONLY</text>
      </g>
    </svg>`;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }
  function span(t, a, b) { return clamp01((t - a) / (b - a)); }

  function stepAt(steps, t) {
    let idx = 0;
    steps.forEach((s, i) => { if (t >= s.at - 0.08) idx = i; });
    return steps[idx];
  }
  function syncSteps(section, steps, t) {
    const s = stepAt(steps, t);
    section.querySelectorAll("[data-vx-step]").forEach((el, i) => el.classList.toggle("is-on", steps[i] === s));
    const cap = section.querySelector("[data-vx-caption]");
    const call = section.querySelector("[data-vx-callout]");
    const clock = section.querySelector("[data-vx-clock]");
    if (cap && s) cap.textContent = s.caption;
    if (call && s) call.textContent = s.callout;
    if (clock && s) clock.textContent = s.clock || "";
  }
  function fillSteps(section, steps) {
    section.querySelectorAll("[data-vx-step]").forEach((el, i) => {
      const s = steps[i];
      if (!s) return;
      const b = el.querySelector("b");
      const span = el.querySelector("span");
      if (b) b.textContent = s.title;
      if (span) span.textContent = s.text;
    });
  }
  function wireSteps(section, steps, ctl) {
    fillSteps(section, steps);
    section.querySelectorAll("[data-vx-step]").forEach((el, i) => {
      el.addEventListener("click", () => ctl.set(steps[i].at));
    });
  }

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
    const coast = board.querySelector("[data-hot-coast]");
    const tick = (t) => {
      if (hot) {
        const shipOn = span(t, 0.3, 0.46);
        const sep = span(t, 0.48, 0.72);
        const flip = span(t, 0.7, 1);
        const boost = 1 - span(t, 0.2, 0.4) * 0.35;
        shipPlumes.setAttribute("opacity", String(shipOn));
        vents.setAttribute("opacity", String(span(t, 0.22, 0.38)));
        boosterPlumes.setAttribute("opacity", String(0.35 + boost * 0.65));
        coast?.setAttribute("opacity", "0");
        ship.setAttribute("transform", `translate(0 ${(-sep * 56).toFixed(1)})`);
        ring.setAttribute("transform", `translate(0 ${(-sep * 10).toFixed(1)})`);
        booster.setAttribute("transform", `rotate(${(-flip * 20).toFixed(1)} 200 400)`);
        stack.setAttribute("transform", `translate(0 ${(-t * 8).toFixed(1)})`);
      } else {
        const cut = span(t, 0.22, 0.34);
        const gap = span(t, 0.4, 0.58);
        const light = span(t, 0.58, 0.74);
        shipPlumes.setAttribute("opacity", String(light));
        vents.setAttribute("opacity", "0");
        boosterPlumes.setAttribute("opacity", String(1 - cut));
        coast?.setAttribute("opacity", String(gap * (1 - light)));
        ship.setAttribute("transform", `translate(0 ${(-gap * 36).toFixed(1)})`);
        ring.setAttribute("transform", "translate(0 0)");
        booster.setAttribute("transform", `rotate(${(-span(t, 0.7, 1) * 14).toFixed(1)} 200 400)`);
        stack.setAttribute("transform", `translate(0 ${(-t * 6).toFixed(1)})`);
      }
      syncSteps(section, D.hot.steps, t);
    };
    const ctl = player(section, {
      onTick: tick,
      initial: 0.44,
      labels: (t) => {
        const s = stepAt(D.hot.steps, t);
        return (hot ? "Hot staging" : "Cold staging") + (s?.clock ? " · " + s.clock : "") + " · " + Math.round(t * 100) + "%";
      },
    });
    modeBtn?.addEventListener("click", () => {
      hot = !hot;
      modeBtn.textContent = hot ? "Show cold staging" : "Show hot staging";
      modeBtn.setAttribute("aria-pressed", hot ? "false" : "true");
      ctl.set(hot ? 0.44 : 0.66);
    });
    wireSteps(section, D.hot.steps, ctl);
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
      initial: 0.72,
      labels: (t) => {
        const s = stepAt(D.catch.steps, t);
        return (s?.clock || (t < 0.35 ? "Boostback" : t < 0.7 ? "Landing burn" : "Catch")) + " · " + Math.round(t * 100) + "%";
      },
    });
    wireSteps(section, D.catch.steps, ctl);
  }

  function mountFsd(section) {
    const a = section.querySelector("[data-vx-a]");
    const b = section.querySelector("[data-vx-b]");
    const flags = section.querySelector("[data-vx-flags]");
    const note = section.querySelector("[data-vx-stack-note]");
    const stacks = D.fsd.stacks;
    const art = section.querySelector("[data-vx-fsd]");
    if (art) art.innerHTML = fsdSvg();
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

  function mountEvasion(section) {
    const board = section.querySelector("[data-vx-diagram]");
    board.innerHTML = evasionSvg();
    const car = board.querySelector("[data-ev-car]");
    const threat = board.querySelector("[data-ev-threat]");
    const driver = board.querySelector("[data-ev-driver]");
    const badge = board.querySelector("[data-ev-badge] rect");
    const badgeT = board.querySelector("[data-ev-badge] text");
    let mode = "hw4";
    const can = () => mode === "hw4";
    const tick = (t) => {
      const drop = span(t, 0.28, 0.4);
      const close = span(t, 0.45, 0.78);
      const save = can() ? span(t, 0.7, 0.9) : 0;
      car.setAttribute("transform", `translate(${(close * 70 + save * 36).toFixed(1)} ${(-save * 6).toFixed(1)}) rotate(${(-save * 4).toFixed(1)})`);
      threat.setAttribute("transform", `translate(${(-close * 40).toFixed(1)} 0)`);
      driver.setAttribute("transform", `translate(146 274) rotate(${(drop * 28 - save * 28).toFixed(1)})`);
      const on = t < 0.32 || save > 0.15;
      if (!can() && t >= 0.62) {
        badge.setAttribute("fill", "#3a3030");
        badgeT.setAttribute("fill", "#c98a8a");
        badgeT.textContent = "NO";
      } else {
        badge.setAttribute("fill", on ? "#1b3d2a" : "#3a3030");
        badgeT.setAttribute("fill", on ? "#7dcea0" : "#c98a8a");
        badgeT.textContent = on ? "FSD" : "OFF";
      }
      syncSteps(section, D.evasion.steps, t);
    };
    const note = section.querySelector("[data-vx-mode-note]");
    const setNote = () => {
      const m = D.evasion.modes.find((x) => x.id === mode);
      if (note && m) note.textContent = m.id === "hw4"
        ? "HW4 in North America (14.3.11 / 14.3.12) can re-engage Supervised FSD for an imminent frontal crash, or an unintentional drop."
        : m.id === "hw3"
          ? "HW3 Lite: parking, unparking, start-from-park. Distilled from HW4. No Collision Evasion — the re-engage step does not exist."
          : "Europe 14.2: Assisted Driving Basic on 2026.33.100. Same week as US 14.3.11, still on 14.2. Collision Evasion is North America only.";
    };
    const ctl = player(section, {
      onTick: tick,
      initial: 0.76,
      labels: (t) => {
        const name = D.evasion.modes.find((m) => m.id === mode);
        const s = stepAt(D.evasion.steps, t);
        return (name ? name.label : mode) + (s?.clock ? " · " + s.clock : "") + " · " + Math.round(t * 100) + "%";
      },
    });
    setNote();
    section.querySelectorAll("[data-vx-hw]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.getAttribute("data-vx-hw");
        section.querySelectorAll("[data-vx-hw]").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        setNote();
        ctl.set(0.76);
      });
    });
    wireSteps(section, D.evasion.steps, ctl);
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
    if (id === "evasion") mountEvasion(section);
    wireShare(section, item);
  });

  let currentTab = "spacex";
  function setTab(name, { scrollId } = {}) {
    currentTab = name === "tesla" ? "tesla" : "spacex";
    const meta = D.tabs[currentTab];
    if (kickerEl) kickerEl.textContent = meta.kicker;
    if (ledeEl) ledeEl.textContent = meta.lede;
    document.documentElement.setAttribute("data-vx-tab", currentTab);
    document.querySelectorAll("button[data-vx-tab]").forEach((btn) => {
      const on = btn.getAttribute("data-vx-tab") === currentTab;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");
    });
    document.querySelectorAll("[data-vx-pane]").forEach((pane) => {
      const on = pane.getAttribute("data-vx-pane") === currentTab;
      pane.hidden = !on;
    });
    document.querySelectorAll("[data-vx-jump]").forEach((nav) => {
      nav.hidden = nav.getAttribute("data-vx-jump") !== currentTab;
    });
    document.querySelectorAll("[data-vx-cards]").forEach((el) => {
      el.hidden = el.getAttribute("data-vx-cards") !== currentTab;
    });
    players.forEach((p) => {
      const pane = p.root.closest("[data-vx-pane]");
      if (pane && pane.hidden) p.stop();
    });
    mark();
    if (scrollId) {
      const el = document.getElementById(scrollId);
      el?.scrollIntoView({ block: "start" });
    }
  }

  function tabOf(hash) {
    const id = String(hash || "").replace(/^#/, "");
    if (id === "tesla" || id === "spacex") return id;
    const item = D.items.find((x) => x.id === id);
    return item ? item.tab : "spacex";
  }

  const jumps = () => document.querySelectorAll("[data-vx-jump]:not([hidden]) a");
  const mark = () => {
    const pane = document.querySelector(`[data-vx-pane="${currentTab}"]`);
    const pieces = pane ? [...pane.querySelectorAll("[data-vx-piece]")] : [];
    const y = window.scrollY + 140;
    let on = pieces[0]?.id;
    pieces.forEach((p) => { if (p.offsetTop <= y) on = p.id; });
    jumps().forEach((a) => a.classList.toggle("is-on", a.getAttribute("href") === "#" + on));
  };
  window.addEventListener("scroll", mark, { passive: true });

  document.querySelectorAll("button[data-vx-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-vx-tab");
      if (location.hash.replace("#", "") !== name) location.hash = name;
      else setTab(name);
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const next = currentTab === "spacex" ? "tesla" : "spacex";
      if (location.hash.replace("#", "") !== next) location.hash = next;
      else setTab(next);
      document.querySelector(`button[data-vx-tab="${next}"]`)?.focus();
    });
  });

  const goHash = () => {
    const raw = location.hash.replace("#", "");
    const tab = tabOf(location.hash);
    const isPiece = D.items.some((x) => x.id === raw);
    setTab(tab, { scrollId: isPiece ? raw : null });
    if (!raw || raw === "spacex" || raw === "tesla") {
      document.querySelector(".vx-tabs")?.scrollIntoView({ block: "start" });
    }
  };
  window.addEventListener("hashchange", goHash);
  goHash();
})();
