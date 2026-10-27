(() => {
  const canvas = document.querySelector("[data-staging-canvas]");
  const stage = document.querySelector("[data-staging-stage]");
  const overlay = document.querySelector("[data-staging-overlay]");
  const hud = document.querySelector("[data-staging-hud]");
  const cue = document.querySelector("[data-staging-cue]");
  if (!canvas || !stage) return;

  const overlayKicker = document.querySelector("[data-overlay-kicker]");
  const overlayTitle = document.querySelector("[data-overlay-title]");
  const overlayCopy = document.querySelector("[data-overlay-copy]");
  const playBtn = document.querySelector("[data-staging-play]");
  const bestEl = document.querySelector("[data-staging-best]");
  const hudFlight = document.querySelector("[data-hud-flight]");
  const hudClock = document.querySelector("[data-hud-clock]");
  const hudAlt = document.querySelector("[data-hud-alt]");
  const hudScore = document.querySelector("[data-hud-score]");
  const cueLabel = document.querySelector("[data-cue-label]");
  const cueClock = document.querySelector("[data-cue-clock]");
  const boardList = document.querySelector("[data-board-list]");
  const boardNow = document.querySelector("[data-board-now]");
  const nameInput = document.querySelector("[data-staging-name]");
  const muteBtn = document.querySelector("[data-staging-mute]");
  const padEl = document.querySelector("[data-staging-pad]");
  const resultsEl = document.querySelector("[data-staging-results]");
  const medalEl = document.querySelector("[data-results-medal]");
  const scoreEl = document.querySelector("[data-results-score]");
  const rowsEl = document.querySelector("[data-results-rows]");
  const pbEl = document.querySelector("[data-results-pb]");
  const shareBtn = document.querySelector("[data-staging-share]");
  const thrBtn = document.querySelector('[data-hold="throttle"]');

  const GAME = "staging";
  const STORE = "sd.arcade.staging.best.v2";
  const BOARD_STORE = "sd.arcade.staging.runs.v2";
  const NAME_STORE = "aljr.staging.name";
  const BOARD_MAX = 8;
  const T0 = 148;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const fx = window.SDStagingFX;
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';

  const FLIGHTS = [
    { name: "Flight 7", climb: 8.8, window: 1.2, wind: 0.006, engineOut: 0, failAngle: 0.44, stageAngle: 0.2 },
    { name: "Flight 8", climb: 8.4, window: 1.1, wind: 0.009, engineOut: 0, failAngle: 0.42, stageAngle: 0.19 },
    { name: "Flight 10", climb: 7.9, window: 1.0, wind: 0.012, engineOut: 1, failAngle: 0.4, stageAngle: 0.18 },
    { name: "Flight 11", climb: 7.4, window: 0.92, wind: 0.014, engineOut: 2, failAngle: 0.4, stageAngle: 0.175 },
  ];

  const HOLD_RISE = 0.0036;
  const HOLD_FALL = 0.006;
  const GIMBAL = 0.00028;
  const GUST_AV = 0.0000052 * 3;
  const MAXQ_FROM = 0.34;
  const MAXQ_TO = 0.62;
  const WIND_AV = 0.000055;
  const ENGINE_AV = 0.0000052;
  const RESTORE_IDLE = 0.000048;
  const RESTORE_STEER = 0.000024;
  const AV_DAMP = 0.86;

  const ENGINES = (() => {
    const pos = [];
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      pos.push({ x: Math.cos(a) * 4.1, y: Math.sin(a) * 3.4, s: 0.78 });
    }
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      pos.push({ x: Math.cos(a) * 8.5, y: Math.sin(a) * 6.6, s: 0.7 });
    }
    for (let i = 0; i < 20; i += 1) {
      const a = (i / 20) * Math.PI * 2 + 0.07;
      pos.push({ x: Math.cos(a) * 13.2, y: Math.sin(a) * 10.2, s: 0.62 });
    }
    return pos;
  })();

  const SHIP_ENGINES = [
    { x: -5.4, y: 0, s: 0.92 },
    { x: 0, y: 0, s: 1 },
    { x: 5.4, y: 0, s: 0.92 },
    { x: -9.2, y: 1.2, s: 0.78 },
    { x: 0, y: 2.2, s: 0.8 },
    { x: 9.2, y: 1.2, s: 0.78 },
  ];

  const held = { left: false, right: false, stage: false, throttle: false };
  const hold = { left: 0, right: 0, stage: 0, throttle: 0 };
  const padPointers = new Map();
  const padButtons = {};
  const cam = { x: 0, y: 0, zoom: 1, punch: 0 };
  const stars = [];
  const flakes = [];
  const particles = [];
  const debris = [];
  const booms = [];
  const streaks = [];

  let dpr = 1;
  let cssW = 800;
  let cssH = 500;
  let state = "attract";
  let flight = 0;
  let score = 0;
  let best = Number(window.SDArcade.storage.getItem(STORE) || 0);
  let muted = true; // stays true until the first Play press (browsers need a gesture before audio)
  let muteChoice = null; // "1" = player muted, "0" = player unmuted, null = never chosen
  try { muteChoice = window.SDArcade.storage.getItem("sd.arcade.muted"); } catch { muteChoice = null; }
  let slowTarget = 1;
  let timeScale = 1;
  let freezeUntil = 0;
  let callout = { text: "", t: 0 };
  let calloutAt = 0;
  let gusts = [];
  let evt = null;
  let load = 0;
  let thrTime = 0;
  let streak = 0;
  let loadWarnTick = 0;
  let pingTick = 0;
  let gustSaid = -1;
  let maxqSaid = false;
  let hintStep = 0;
  let dyn = false;
  let autoThr = false;
  const thrOn = () => dyn && (auto ? autoThr : held.throttle);
  let audio;
  let engine = null;
  let freshId = "";
  let last = 0;
  let accumulator = 0;
  let demo = false;
  let simRandom = () => 0.5;
  const M = window.SDArcadeModel;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let shake = 0;
  let flash = 0;
  let result = "";
  let auto = true;
  let stack;
  let windGust = 0;
  let clock = 0;
  let tPlay = 0;
  let sepT = 0;
  let windowChimed = false;
  let keysLocked = false;
  let lastStageAt = -9;
  let countT = 0;
  let countMark = 0;
  let ignite = 0;
  let shock = 0;
  let warnMark = 4;
  let pausedFrom = "";
  let scrollX = 0;
  let starDrift = 0;
  let burstT = 99;
  let failT = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };

  for (let i = 0; i < 140; i += 1) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.35 + 0.15,
      a: Math.random() * 0.75 + 0.12,
      z: 0.25 + Math.random() * 1.1,
      tw: rand(0.004, 0.02),
    });
  }

  for (let i = 0; i < 30; i += 1) {
    streaks.push({ x: Math.random(), y: Math.random(), len: rand(26, 90), sp: rand(0.7, 1.7), a: rand(0.03, 0.11) });
  }

  function baseSpec() {
    const base = FLIGHTS[Math.min(flight, FLIGHTS.length - 1)];
    if (flight < FLIGHTS.length) return { ...base };
    const extra = flight - FLIGHTS.length + 1;
    return {
      name: `Flight ${11 + extra}`,
      climb: Math.max(6.4, 7.4 - extra * 0.14),
      window: Math.max(0.62, 0.92 - extra * 0.03),
      wind: Math.min(0.02, 0.014 + extra * 0.0016),
      engineOut: Math.min(3, 2 + extra),
      failAngle: Math.max(0.34, 0.4 - extra * 0.01),
      stageAngle: Math.max(0.14, 0.175 - extra * 0.006),
    };
  }

  function spec() { return M.flightSpec("staging", arcade.mode, flight, baseSpec(), arcade.day); }

  function pickOut(n) {
    const idxs = ENGINES.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i -= 1) {
      const j = Math.floor(simRandom() * (i + 1));
      const tmp = idxs[i];
      idxs[i] = idxs[j];
      idxs[j] = tmp;
    }
    const out = new Set(idxs.slice(0, n));
    let bias = 0;
    out.forEach((i) => {
      bias += ENGINES[i].x;
    });
    return { out, bias: bias === 0 ? (simRandom() > 0.5 ? 1 : -1) : Math.sign(bias) };
  }

  function resetStack(autopilot) {
    simRandom = arcade.rng(flight);
    const sim = (a,b) => a + simRandom()*(b-a);
    const s = spec();
    auto = autopilot;
    windGust = 0;
    tPlay = 0;
    sepT = 0;
    windowChimed = false;
    lastStageAt = -9;
    ignite = 0;
    shock = 0;
    warnMark = 4;
    const dead = pickOut(s.engineOut);
    stack = {
      x: sim(-10, 10),
      vx: sim(-0.04, 0.04),
      angle: sim(-0.05, 0.05),
      av: 0,
      alt: 61.4 + sim(-0.4, 0.5),
      vy: 1.08,
      alive: true,
      shipLit: false,
      out: dead.out,
      outBias: dead.bias,
      shipOff: 0,
      boostOff: 0,
      broken: false,
      flipDir: 1,
      evOn: false,
      evBias: 0,
    };
    debris.length = 0;
    booms.length = 0;
    failT = 0;
    burstT = 99;
    dyn = arcade.mode !== "training" && !autopilot;
    gusts = [];
    evt = null;
    load = 0;
    thrTime = 0;
    gustSaid = -1;
    maxqSaid = false;
    loadWarnTick = 0;
    pingTick = 0;
    autoThr = false;
    if (dyn) {
      const n = 1 + Math.floor(flight / 2) + (arcade.mode === "daily" ? 1 : 0);
      for (let i = 0; i < n; i += 1) {
        gusts.push({ t: 1.6 + simRandom() * Math.max(1, s.climb - 3.4), dir: simRandom() > 0.5 ? 1 : -1, str: 0.9 + simRandom() * 0.8, dur: 1.3, said: false });
      }
      if (flight >= 1) {
        gusts.push({ t: s.climb * 0.47, dir: simRandom() > 0.5 ? 1 : -1, str: 1 + simRandom() * 0.6, dur: 1.3, said: false });
      }
      if (flight >= 2) {
        gusts.push({ t: s.climb - 0.9, dir: simRandom() > 0.5 ? 1 : -1, str: 1 + simRandom() * 0.6, dur: 1.3, said: false });
      }
      gusts.sort((a, b) => a.t - b.t);
      if (flight >= 1 || arcade.mode === "daily") {
        let idx = 13 + Math.floor(simRandom() * 20);
        for (let k = 0; k < 40 && stack.out.has(idx); k += 1) idx = 13 + ((idx - 12) % 20);
        evt = { t: s.climb * (0.62 + simRandom() * 0.18), idx, done: false };
      }
    }
    if (thrBtn) thrBtn.hidden = !dyn;
    if (padEl) padEl.classList.toggle("has-throttle", dyn);
  }

  function setHeld(key, on) {
    held[key] = on;
    const el = padButtons[key];
    if (el) el.classList.toggle("is-held", on);
  }

  function releasePointer(id) {
    const key = padPointers.get(id);
    if (!key) return;
    padPointers.delete(id);
    const still = [...padPointers.values()].some((k) => k === key);
    if (!still) setHeld(key, false);
  }

  function clearAllHolds() {
    padPointers.forEach((key, id) => {
      try {
        padButtons[key]?.releasePointerCapture(id);
      } catch {
        /* already released */
      }
    });
    padPointers.clear();
    setHeld("left", false);
    setHeld("right", false);
    setHeld("stage", false);
    setHeld("throttle", false);
    hold.left = 0;
    hold.right = 0;
    hold.stage = 0;
  }

  function showOverlay(kicker, title, copy, action) {
    if (!overlay) return;
    overlay.hidden = false;
    if (padEl) padEl.classList.add("is-idle");
    clearAllHolds();
    if (overlayKicker) overlayKicker.textContent = kicker;
    if (overlayTitle) overlayTitle.textContent = title;
    if (overlayCopy) overlayCopy.textContent = copy;
    if (playBtn) playBtn.textContent = action;
  }

  function hideOverlay() {
    if (overlay) overlay.hidden = true;
    if (padEl) padEl.classList.remove("is-idle");
    hideResults();
  }

  const MEDAL = { gold: "#ffcf5a", silver: "#cfd6e2", bronze: "#d49066", fail: "#ff6a5a" };
  let lastResult = null;

  function medalSvg(kind) {
    const c = MEDAL[kind] || MEDAL.bronze;
    const mark = kind === "fail"
      ? '<path d="M-14 -14 L14 14 M14 -14 L-14 14" stroke="#1b0b0b" stroke-width="7" stroke-linecap="round"/>'
      : '<polygon points="0,-22 6.5,-7 22,-6 10,5 13.5,21 0,12.5 -13.5,21 -10,5 -22,-6 -6.5,-7" fill="#18202c"/>';
    return `<svg viewBox="-40 -40 80 80" aria-hidden="true"><circle r="34" fill="${c}" opacity="0.18"/><circle r="30" fill="none" stroke="${c}" stroke-width="3"/><circle r="24" fill="${c}"/>${mark}</svg>`;
  }

  function hideResults() {
    if (resultsEl) resultsEl.hidden = true;
    if (shareBtn) shareBtn.hidden = true;
    if (overlayCopy) overlayCopy.hidden = false;
  }

  /* r: { medal, gained, total, rows: [[label, value]], pb, share } */
  function showResults(r) {
    lastResult = r;
    if (!resultsEl) return;
    resultsEl.hidden = false;
    if (overlayCopy) overlayCopy.hidden = true;
    if (medalEl) medalEl.innerHTML = medalSvg(r.medal);
    if (rowsEl) {
      rowsEl.textContent = "";
      r.rows.forEach(([k, v]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = k;
        dd.textContent = v;
        rowsEl.append(dt, dd);
      });
    }
    if (pbEl) {
      pbEl.textContent = r.pb || "";
      pbEl.hidden = !r.pb;
    }
    if (shareBtn) {
      shareBtn.hidden = !r.share;
      shareBtn.textContent = "Share result";
    }
    if (scoreEl) {
      scoreEl.parentElement.hidden = r.gained == null;
      const target = r.gained || 0;
      if (reduced || !target) scoreEl.textContent = `+${target.toLocaleString()}`;
      else {
        const t0 = performance.now();
        const tick = (now) => {
          const k = Math.min(1, (now - t0) / 900);
          scoreEl.textContent = `+${Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString()}`;
          if (k < 1 && resultsEl && !resultsEl.hidden) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }
  }

  function buildShareCard(r) {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 630;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 0, 630);
    bg.addColorStop(0, "#04070d");
    bg.addColorStop(1, "#0d2142");
    g.fillStyle = bg;
    g.fillRect(0, 0, 1200, 630);
    const rnd = fx ? fx.prng(4242) : Math.random;
    for (let i = 0; i < 120; i += 1) {
      g.fillStyle = `rgba(220,232,255,${0.2 + rnd() * 0.6})`;
      g.fillRect(rnd() * 1200, rnd() * 420, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
    }
    const earth = g.createRadialGradient(840, 1270, 380, 840, 1270, 760);
    earth.addColorStop(0, "#1d4f8c");
    earth.addColorStop(0.9, "#2f6aa8");
    earth.addColorStop(1, "rgba(140,200,255,0.9)");
    g.fillStyle = earth;
    g.beginPath();
    g.arc(840, 1270, 760, 0, Math.PI * 2);
    g.fill();
    const mc = MEDAL[r.medal] || MEDAL.bronze;
    g.fillStyle = mc;
    g.beginPath();
    g.arc(1010, 215, 92, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#18202c";
    g.font = '700 110px "IBM Plex Mono", ui-monospace, monospace';
    g.textAlign = "center";
    g.fillText(r.medal === "gold" ? "1" : r.medal === "silver" ? "2" : "3", 1010, 252);
    g.textAlign = "left";
    g.fillStyle = "#ffb454";
    g.font = '600 26px "IBM Plex Mono", ui-monospace, monospace';
    g.fillText("HOT STAGING  /  SUPERCHARGED DAILY ARCADE", 70, 96);
    g.fillStyle = "#f4f7fb";
    g.font = '700 84px Inter, system-ui, sans-serif';
    g.fillText(r.title, 70, 210);
    g.font = '600 150px "IBM Plex Mono", ui-monospace, monospace';
    g.fillText(r.total.toLocaleString(), 70, 380);
    g.fillStyle = "rgba(220,232,246,0.78)";
    g.font = '500 30px "IBM Plex Mono", ui-monospace, monospace';
    g.fillText(r.sub, 70, 440);
    g.fillStyle = "#ffffff";
    g.font = '600 30px "IBM Plex Mono", ui-monospace, monospace';
    g.fillText("superchargeddaily.com/staging.html", 70, 570);
    return new Promise((resolve) => c.toBlob(resolve, "image/png"));
  }

  async function shareResult() {
    if (!lastResult || !shareBtn) return;
    const modeName = arcade.mode === "daily" ? `daily ${arcade.day}` : arcade.mode;
    const text = `I scored ${lastResult.total.toLocaleString()} in Hot Staging (${modeName}). Can you beat it?`;
    const url = `${location.origin}/staging.html${arcade.mode === "daily" ? `?mode=daily&day=${arcade.day}` : ""}`;
    const copied = async () => {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        shareBtn.textContent = "Copied";
        arcade.live("Result copied to the clipboard.");
      } catch {
        shareBtn.textContent = "Copy failed";
      }
      window.setTimeout(() => { shareBtn.textContent = "Share result"; }, 2000);
    };
    try {
      const blob = await buildShareCard(lastResult);
      const file = blob && new File([blob], "hot-staging.png", { type: "image/png" });
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, url });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await copied();
    } catch (err) {
      if (err && err.name === "AbortError") return;
      await copied();
    }
  }

  shareBtn?.addEventListener("click", shareResult);

  function setBest(n) {
    best = n;
    window.SDArcade.storage.setItem(STORE, String(n));
    if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;
  }

  if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;

  function callsign() {
    const raw = (nameInput?.value || window.SDArcade.storage.getItem(NAME_STORE) || "Pilot").trim();
    return (raw || "Pilot").slice(0, 12);
  }

  function loadBoard() {
    try {
      const raw = JSON.parse(window.SDArcade.storage.getItem(BOARD_STORE) || "[]");
      return Array.isArray(raw) ? raw.filter((row) => row && typeof row.score === "number") : [];
    } catch {
      return [];
    }
  }

  function saveBoard(rows) {
    window.SDArcade.storage.setItem(BOARD_STORE, JSON.stringify(rows.slice(0, BOARD_MAX)));
  }

  function storedRows() {
    const local = loadBoard();
    const world = window.AljrBoard?.rows?.(GAME) || [];
    if (!world.length) return local;
    const seen = new Set(world.map((row) => `${String(row.name || "").toUpperCase()}|${row.score}`));
    const extra = local.filter((row) => !seen.has(`${String(row.name || "").toUpperCase()}|${row.score}`));
    return [...world, ...extra]
      .sort((a, b) => b.score - a.score || (a.at || 0) - (b.at || 0))
      .slice(0, BOARD_MAX);
  }

  function liveStates() {
    return (
      state === "count" ||
      state === "boost" ||
      state === "window" ||
      state === "sep" ||
      state === "pause" ||
      state === "success"
    );
  }

  function visibleBoard() {
    const stored = storedRows();
    const live =
      score > 0 && liveStates()
        ? [{ id: "live", name: callsign(), score, flights: flight + 1, live: true }]
        : [];
    return [...stored, ...live].sort((a, b) => b.score - a.score || (a.live ? -1 : 1)).slice(0, BOARD_MAX);
  }

  function renderBoard() {
    if (boardNow) {
      boardNow.textContent = liveStates()
        ? `This run  ·  ${score.toLocaleString()}  ·  ${spec().name}`
        : "This run  ·  on the pad";
    }
    if (!boardList) return;
    boardList.replaceChildren();
    const rows = visibleBoard();
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "is-empty";
      empty.textContent = "No hot stages on this pad yet.";
      boardList.append(empty);
      return;
    }
    rows.forEach((row, i) => {
      const li = document.createElement("li");
      if (row.live) li.classList.add("is-live");
      if (row.id && row.id === freshId) li.classList.add("is-fresh");
      const rank = document.createElement("span");
      rank.className = "staging-board-rank";
      rank.textContent = String(i + 1);
      const who = document.createElement("span");
      who.className = "staging-board-who";
      who.textContent = row.live ? `${row.name} · live` : row.name;
      const pts = document.createElement("span");
      pts.textContent = row.score.toLocaleString();
      li.append(rank, who, pts);
      boardList.append(li);
    });
  }

  function submitRun() {
    // Edition 02 records are local and versioned; legacy public boards keep their original rules.
    return;
  }

  function lockGameKeys() {
    keysLocked = true;
    clearAllHolds();
  }

  function unlockGameKeys() {
    keysLocked = false;
  }

  if (nameInput) {
    const savedName = window.SDArcade.storage.getItem(NAME_STORE);
    if (savedName) nameInput.value = savedName.slice(0, 12);
    nameInput.addEventListener("input", () => {
      window.SDArcade.storage.setItem(NAME_STORE, callsign());
      renderBoard();
    });
    nameInput.addEventListener("focus", lockGameKeys);
    nameInput.addEventListener("focusin", lockGameKeys);
    nameInput.addEventListener("blur", unlockGameKeys);
    ["keydown", "keyup", "keypress", "beforeinput"].forEach((type) => {
      nameInput.addEventListener(
        type,
        (e) => {
          e.stopPropagation();
        },
        true
      );
    });
  }

  if (!loadBoard().length && best > 0) {
    saveBoard([{ id: "best", name: callsign(), score: best, flights: 1, at: Date.now() }]);
  }

  function makeNoise(ctx, seconds, color) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    let pink = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === "brown") {
        brown = (brown + 0.02 * white) / 1.02;
        data[i] = brown * 3.4;
      } else if (color === "pink") {
        pink = 0.97 * pink + 0.03 * white;
        data[i] = (white * 0.35 + pink * 0.65) * 1.4;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  function setMuted(v) {
    muted = v;
    muteChoice = v ? "1" : "0";
    try { window.SDArcade.storage.setItem("sd.arcade.muted", muteChoice); } catch { /* storage is best-effort */ }
    applyMute();
  }

  function buzz(pattern) {
    if (muted || reduced || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch { /* unsupported */ }
  }

  function say(text, ms = 2400, force = false) {
    const now = performance.now();
    if (!force && now - calloutAt < 1400) return;
    calloutAt = now;
    callout = { text, t: ms };
    arcade.live(text);
  }

  function applyMute() {
    if (!audio?.master) return;
    audio.master.gain.setTargetAtTime(muted ? 0 : 0.78, audio.currentTime, 0.04);
    if (muteBtn) {
      muteBtn.textContent = muted ? "Sound off" : "Sound on";
      muteBtn.classList.toggle("is-off", muted);
    }
  }

  function ensureAudio() {
    if (audio) {
      if (audio.state === "suspended") audio.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
    const master = audio.createGain();
    master.gain.value = muted ? 0 : 0.78;
    const comp = audio.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master.connect(comp);
    comp.connect(audio.destination);
    audio.master = master;

    const brown = audio.createBufferSource();
    brown.buffer = makeNoise(audio, 2.6, "brown");
    brown.loop = true;
    const noiseFilter = audio.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 140;
    noiseFilter.Q.value = 0.7;
    const noiseGain = audio.createGain();
    noiseGain.gain.value = 0;
    brown.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    const crackleSrc = audio.createBufferSource();
    crackleSrc.buffer = makeNoise(audio, 1.8, "pink");
    crackleSrc.loop = true;
    const crackleFilter = audio.createBiquadFilter();
    crackleFilter.type = "bandpass";
    crackleFilter.frequency.value = 1100;
    crackleFilter.Q.value = 0.85;
    const crackleGain = audio.createGain();
    crackleGain.gain.value = 0;
    crackleSrc.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(master);

    const hissSrc = audio.createBufferSource();
    hissSrc.buffer = makeNoise(audio, 1.5, "white");
    hissSrc.loop = true;
    const hissFilter = audio.createBiquadFilter();
    hissFilter.type = "highpass";
    hissFilter.frequency.value = 2200;
    hissFilter.Q.value = 0.55;
    const hissGain = audio.createGain();
    hissGain.gain.value = 0;
    hissSrc.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(master);

    const oscA = audio.createOscillator();
    oscA.type = "sawtooth";
    oscA.frequency.value = 32;
    const oscB = audio.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = 46;
    const oscC = audio.createOscillator();
    oscC.type = "sine";
    oscC.frequency.value = 24;
    const oscFilter = audio.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.value = 72;
    const oscGain = audio.createGain();
    oscGain.gain.value = 0;
    oscA.connect(oscFilter);
    oscB.connect(oscFilter);
    oscC.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);

    const windSrc = audio.createBufferSource();
    windSrc.buffer = makeNoise(audio, 2.1, "white");
    windSrc.loop = true;
    const windFilter = audio.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 780;
    windFilter.Q.value = 0.6;
    const windGain = audio.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);

    brown.start();
    crackleSrc.start();
    hissSrc.start();
    oscA.start();
    oscB.start();
    oscC.start();
    windSrc.start();

    engine = {
      noiseGain,
      noiseFilter,
      crackleGain,
      crackleFilter,
      hissGain,
      hissFilter,
      oscGain,
      oscFilter,
      oscA,
      oscB,
      oscC,
      windGain,
      windFilter,
      master,
    };
    applyMute();
  }

  function setEngine(amount, mode) {
    if (!engine) return;
    const t = audio.currentTime;
    const a = muted ? 0 : clamp(amount, 0, 1);
    const ship = mode === "ship";
    engine.noiseGain.gain.setTargetAtTime(a * (ship ? 0.07 : 0.16), t, 0.05);
    engine.crackleGain.gain.setTargetAtTime(a * (ship ? 0.03 : 0.055), t, 0.04);
    engine.hissGain.gain.setTargetAtTime(a * (ship ? 0.07 : 0.045), t, 0.035);
    engine.oscGain.gain.setTargetAtTime(a * (ship ? 0.035 : 0.062), t, 0.06);
    engine.noiseFilter.frequency.setTargetAtTime(ship ? 220 + a * 280 : 130 + a * 420, t, 0.09);
    engine.crackleFilter.frequency.setTargetAtTime(ship ? 1600 : 900 + a * 700, t, 0.1);
    engine.hissFilter.frequency.setTargetAtTime(ship ? 2800 : 1900, t, 0.1);
    engine.oscFilter.frequency.setTargetAtTime(ship ? 110 : 68 + a * 50, t, 0.1);
    engine.oscA.frequency.setTargetAtTime(ship ? 48 : 30 + a * 8, t, 0.12);
    engine.oscB.frequency.setTargetAtTime(ship ? 67 : 44 + a * 9, t, 0.12);
    engine.oscC.frequency.setTargetAtTime(ship ? 36 : 22 + a * 6, t, 0.12);
  }

  function toneAt(when, freq, end, gain, dur, type) {
    if (!audio || muted) return;
    const t = Math.max(audio.currentTime, when);
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(audio.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseAt(when, dur, freq, gain, q, color) {
    if (!audio || muted) return;
    const t = Math.max(audio.currentTime, when);
    const src = audio.createBufferSource();
    src.buffer = makeNoise(audio, Math.max(0.08, dur), color || "white");
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(50, freq * 0.22), t + dur);
    filter.Q.value = q || 0.6;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(audio.master);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  function sfxCount(n) {
    if (!audio || muted) return;
    const t = audio.currentTime;
    const freq = n <= 1 ? 880 : 480 + (4 - n) * 90;
    toneAt(t, freq, freq * 0.94, 0.07, 0.14, "sine");
    toneAt(t, freq * 2, freq * 1.55, 0.028, 0.1, "triangle");
  }

  function sfxIgnition() {
    if (!audio || muted) return;
    const t = audio.currentTime;
    noiseAt(t, 0.42, 520, 0.2, 0.45, "brown");
    noiseAt(t, 0.18, 2400, 0.12, 0.55, "white");
    toneAt(t, 42, 26, 0.2, 0.72, "sine");
    toneAt(t, 68, 34, 0.1, 0.48, "triangle");
    toneAt(t + 0.04, 210, 70, 0.05, 0.28, "sawtooth");
  }

  function sfxWarn() {
    if (!audio || muted) return;
    const t = audio.currentTime;
    toneAt(t, 640, 500, 0.04, 0.08, "sine");
    toneAt(t + 0.03, 980, 720, 0.025, 0.07, "triangle");
  }

  function sfxWindow() {
    if (!audio || muted) return;
    const t = audio.currentTime;
    toneAt(t, 740, 520, 0.045, 0.1, "sine");
    toneAt(t + 0.04, 1180, 840, 0.03, 0.09, "triangle");
    toneAt(t + 0.08, 1480, 1100, 0.022, 0.12, "sine");
  }

  function sfxGust() {
    if (!audio || muted) return;
    const t = audio.currentTime;
    noiseAt(t, 0.9, 900, 0.07, 0.5, "pink");
    toneAt(t, 300, 180, 0.02, 0.7, "sine");
  }

  function sfxEngineOut() {
    if (!audio || muted) return;
    const t = audio.currentTime;
    noiseAt(t, 0.5, 500, 0.2, 0.5, "brown");
    toneAt(t, 160, 40, 0.14, 0.6, "sawtooth");
    toneAt(t + 0.05, 880, 880, 0.04, 0.12, "square");
  }

  function sfxPing(closeness) {
    if (!audio || muted) return;
    const f = 520 + clamp(closeness, 0, 1) * 700;
    toneAt(audio.currentTime, f, f, 0.028, 0.06, "sine");
  }

  function sfxStage() {
    if (!audio || muted) return;
    const t = audio.currentTime;
    noiseAt(t, 0.16, 3200, 0.18, 0.55, "white");
    noiseAt(t, 0.55, 380, 0.16, 0.4, "brown");
    noiseAt(t + 0.05, 0.28, 1400, 0.08, 0.8, "pink");
    toneAt(t, 78, 26, 0.22, 0.62, "sine");
    toneAt(t, 46, 18, 0.14, 0.8, "triangle");
    toneAt(t + 0.02, 210, 55, 0.07, 0.32, "sawtooth");
    toneAt(t + 0.03, 2100, 160, 0.04, 0.2, "square");
    toneAt(t + 0.08, 920, 140, 0.05, 0.26, "triangle");
    noiseAt(t + 0.12, 0.38, 1900, 0.09, 0.7, "white");
    toneAt(t + 0.14, 120, 64, 0.07, 0.42, "sine");
  }

  function sfxFail(kind) {
    if (!audio || muted) return;
    const t = audio.currentTime;
    noiseAt(t, 0.7, 420, 0.22, 0.4, "brown");
    noiseAt(t, 0.32, 1600, 0.12, 0.55, "white");
    toneAt(t, 70, 18, 0.18, 0.55, "sine");
    toneAt(t + 0.04, 190, 36, 0.07, 0.3, "sawtooth");
    if (kind === "early" || kind === "late") {
      toneAt(t + 0.08, 340, 80, 0.04, 0.22, "square");
    }
  }

  function burst(x, y, n, color, speed, kind) {
    for (let i = 0; i < n; i += 1) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.35, speed);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(16, 48),
        max: 48,
        size: rand(1.1, 3.6),
        color,
        kind: kind || "spark",
      });
    }
  }

  function emitClimbFx() {
    if (stack.alive && Math.random() < 0.85) {
      particles.push({
        x: stack.x + rand(-7, 7),
        y: 96,
        vx: rand(-0.25, 0.25) + stack.vx * 0.15,
        vy: rand(2.4, 4),
        life: rand(36, 66),
        max: 66,
        size: rand(5, 9),
        color: "#cdd7e6",
        kind: "trail",
      });
    }
    if (Math.random() < 0.35) {
      flakes.push({
        x: stack.x + rand(-18, 18),
        y: rand(-90, 40),
        vx: rand(-0.15, 0.15) + stack.vx * 0.2,
        vy: rand(0.6, 1.6),
        life: rand(28, 70),
        max: 70,
        size: rand(0.7, 1.6),
      });
    }
    if (Math.random() < 0.55) {
      particles.push({
        x: stack.x + rand(-16, 16),
        y: 92 + rand(0, 30),
        vx: stack.vx * 0.2 + rand(-0.4, 0.4),
        vy: rand(1.6, 3.8),
        life: rand(14, 28),
        max: 28,
        size: rand(1.4, 3.2),
        color: Math.random() > 0.45 ? "#ff8a2a" : "#ffe08a",
        kind: "spark",
      });
    }
  }

  function inPlay() {
    return state === "boost" || state === "window" || state === "attract";
  }

  function windowOpen() {
    const s = spec();
    return tPlay >= s.climb && tPlay <= s.climb + s.window;
  }

  function heatAmt() {
    const s = spec();
    if (state === "count") return ignite * 0.4;
    if (state === "sep" || state === "success") return 1;
    if (tPlay >= s.climb) return 1;
    return clamp((tPlay - (s.climb - 1.35)) / 1.35, 0, 1);
  }

  function beginAttract() {
    flight = 0;
    resetStack(true);
    state = "attract";
    if (hud) hud.hidden = true;
    if (cue) cue.hidden = true;
    showOverlay(
      "Starbase",
      "Light the Ship",
      "Count, then climb. A/D keeps the stack pointed. When the clock hits, Stage.",
      "Play"
    );
    renderBoard();
  }

  function startPlay() {
    const retry = state === "fail";
    if (muted && muteChoice !== "1") muted = false;
    ensureAudio();
    if (audio && audio.state === "suspended") audio.resume();
    applyMute();
    window.SDArcade.event(retry ? "game_retry" : "game_start");
    window.SDArcade.visit();
    slowTarget = 1;
    timeScale = 1;
    demo=false;clearAllHolds();accumulator=0;last=0;
    const fromSuccess = state === "success";
    if (!fromSuccess) {
      const c=arcade.loadCheckpoint();score=c.score;flight=c.flight;streak=0;
    } else {
      flight += 1;
    }
    resetStack(false);
    hintStep = -1;
    if (dyn) {
      const bits = [];
      if (gusts.length) bits.push(`${gusts.length} gust${gusts.length > 1 ? "s" : ""}`);
      if (evt) bits.push("a Raptor-out risk");
      bits.push("Max-Q");
      say(`Ahead: ${bits.join(", ")}.`, 4200, true);
    } else if (flight === 0) {
      let seen = 0;
      try { seen = Number(window.SDArcade.storage.getItem("sd.arcade.staging.hints")) || 0; } catch { seen = 0; }
      if (seen < 3) {
        hintStep = 1;
        say("Tap A or D to keep the stack level. Short taps are enough.", 5000, true);
        try { window.SDArcade.storage.setItem("sd.arcade.staging.hints", String(seen + 1)); } catch { /* best-effort */ }
      }
    }
    result = "";
    countT = fromSuccess ? 2 : 3;
    countMark = Math.ceil(countT) + 1;
    ignite = 0;
    shock = 0;
    warnMark = 4;
    tPlay = 0;
    state = "count";
    hideOverlay();
    if (hud) hud.hidden = false;
    if (cue) cue.hidden = true;
    sfxCount(Math.ceil(countT));
    countMark = Math.ceil(countT);
    arcade.markPlayed();arcade.focus();renderBoard();
  }

  function fail(kind) {
    if (state !== "boost" && state !== "window" && state !== "attract") return;
    if (state !== "attract" && !demo) {
      window.SDArcade.event(`game_fail_${kind}`);
      buzz([120, 40, 160]);
    }
    if (!reduced) freezeUntil = performance.now() + 110;
    slowTarget = 1;
    timeScale = 1;
    stack.alive = false;
    stack.flipDir = stack.angle >= 0 ? 1 : -1;
    stack.broken = kind !== "late";
    spawnBreakup(kind);
    failT = 0;
    setEngine(0);
    shake = 16;
    flash = 1;
    burst(stack.x, -40, 52, "#ff7a2a", 5.2);
    burst(stack.x, -80, 22, "#e8e4dc", 2.8);
    burst(stack.x, 20, 18, "#3a2a22", 1.6, "smoke");
    if (state === "attract") {
      window.setTimeout(()=>{if(state==='attract-hold')beginAttract();}, 1400);
      state = "attract-hold";
      return;
    }
    result = kind;
    state = "fail";
    if(!demo)arcade.record({score,missions:flight,complete:false,medal:flight>=2?'silver':'bronze',title:'Launch review',copy:kind==='maxq'?'The structure passed its load limit in Max-Q. Hold Throttle through the band, then release.':kind==='early'?'You fired before the ignition window opened. Wait for the Stage cue.':kind==='late'?'The ignition window expired. Stage as soon as the cue appears; aim for its midpoint.':kind==='walk'?'The stack leaned too far. Use shorter counter-steering taps and monitor the attitude instrument.':'The stack was too tilted at ignition. Level it before staging. Campaign retries preserve your checkpoint.'});
    arcade.live('Launch ended. Read the debrief, then retry your mission.');
    submitRun();
    sfxFail(kind);
    const titles = {
      walk: "Walked",
      early: "Early light",
      late: "Window closed",
      rud: "RUD",
      maxq: "Max-Q breakup",
    };
    const lines = {
      walk: "The stack leaned past recover. Super Heavy does not forgive a walk. Tip: short taps, steer against gusts.",
      early: "Ship lit in the dark. The booster bells were still in the way. Tip: wait for STAGE NOW.",
      late: "The window closed. One vehicle, too long, still stacked. Tip: stage as the needle enters the green.",
      rud: "Tilted in the fire. The bells ate each other. Tip: level the stack before you stage.",
      maxq: "The load passed the limit. Tip: hold Throttle (S) through Max-Q, then let go.",
    };
    const showDebrief = () => {
      if (state !== "fail") return;
      showOverlay("No stage", titles[kind] || "RUD", lines[kind] || lines.rud, "Try again");
      showResults({
        medal: "fail",
        gained: null,
        total: score,
        title: titles[kind] || "RUD",
        sub: `${spec().name} · ${arcade.mode}`,
        rows: [["Result", titles[kind] || "RUD"], ["Mission", spec().name], ["Run score", score.toLocaleString()]],
        pb: best ? `Personal best ${best.toLocaleString()}` : "",
        share: false,
      });
      if (overlayCopy) overlayCopy.hidden = false;
    };
    if (reduced || !stack.broken) showDebrief();
    else window.setTimeout(showDebrief, 1200);
    if (cue) cue.hidden = true;
  }

  function beginSep() {
    if (state !== "boost" && state !== "window" && state !== "attract") return;
    if (!demo && state !== "attract") {
      buzz([40, 30, 90]);
    }
    slowTarget = 1;
    timeScale = 1;
    if (!reduced) freezeUntil = performance.now() + 110;
    state = state === "attract" ? "attract-sep" : "sep";
    sepT = 0;
    shock = 0.02;
    burstT = 0;
    stack.flipDir = stack.angle >= 0 ? 1 : -1;
    stack.shipLit = true;
    shake = 18;
    flash = 1;
    cam.punch = 0.34;
    sfxStage();
    burst(stack.x, -80, 52, "#ffb040", 5.2);
    burst(stack.x, -80, 28, "#fff4d0", 3.4);
    burst(stack.x, -72, 16, "#9ec8ff", 2.8);
    burst(stack.x, -40, 14, "#3a2a22", 1.4, "smoke");
    if (cue) cue.hidden = true;
  }

  function succeed() {
    const s = spec();
    const center = s.climb + s.window * 0.5;
    const timing = clamp(1 - Math.abs(lastStageAt - center) / (s.window * 0.55), 0, 1);
    const upright = clamp(1 - Math.abs(stack.angle) / s.stageAngle, 0, 1);
    const perfect = timing > 0.82 && upright > 0.78;
    const prevBest = best;
    streak = perfect ? streak + 1 : 0;
    const bonuses = [];
    let bonus = 0;
    if (perfect && streak > 1) {
      const b = Math.min(streak - 1, 4) * 100;
      bonus += b;
      bonuses.push(`streak x${streak} +${b}`);
    }
    if (dyn && thrTime > 0 && load < 0.9) {
      bonus += 150;
      bonuses.push("Max-Q managed +150");
    }
    if (evt && evt.done) {
      bonus += 120;
      bonuses.push("Raptor-out saved +120");
    }
    const bonusText = bonuses.length ? ` ${bonuses.join(" · ")}.` : "";
    const gained = Math.round(1000 + timing * 420 + upright * 300 + flight * 130 + (perfect ? 260 : 0)) + bonus;
    score += gained;
    if (!demo && score > best) setBest(score);
    const limit=arcade.mode==='daily'?3:arcade.mode==='training'?1:6,complete=flight+1>=limit;
    if(demo){state='complete';score=0;showOverlay('Training demonstration','Now you try.','Counter the drift, watch for the cue, then stage near the middle of the window. Demonstrations do not save scores.','Take the controls');return;}
    state=complete?'complete':'success';
    window.SDArcade.event('game_complete');
    arcade.checkpoint(complete?0:flight+1,complete?0:score);
    arcade.record({score,missions:flight+1,complete,medal:perfect?'gold':timing>.45?'silver':'bronze',title:complete?'Mission set complete':'Separation confirmed',copy:'Timing '+Math.round(timing*100)+'% · attitude '+Math.round(upright*100)+'%.'+bonusText+' '+(complete?'Bring that precision to another mode.':'Your next campaign checkpoint is saved.')});
    arcade.live(complete?'Mission set complete. Your score is saved.':'Separation confirmed. Advance to your next mission.');
    renderBoard();
    const title = complete ? "Mission complete" : perfect ? "Clean light" : "Hot stage";
    showOverlay(s.name, title, `Ship is flying. +${gained.toLocaleString()}  ·  Run ${score.toLocaleString()}${bonusText}`, complete ? "Fly again" : "Next mission");
    const rows = [["Timing", `${Math.round(timing * 100)}%`], ["Attitude", `${Math.round(upright * 100)}%`]];
    bonuses.forEach((b) => {
      const m = b.match(/^(.*?) \+?(\d+)$/);
      rows.push(m ? [m[1], `+${m[2]}`] : [b, ""]);
    });
    rows.push(["Run total", score.toLocaleString()]);
    showResults({
      medal: perfect ? "gold" : timing > 0.45 ? "silver" : "bronze",
      gained,
      total: score,
      title,
      sub: `${s.name} · ${arcade.mode}`,
      rows,
      pb: score > prevBest ? `New personal best: ${score.toLocaleString()}${prevBest ? ` (+${(score - prevBest).toLocaleString()})` : ""}` : `Personal best ${best.toLocaleString()}`,
      share: true,
    });
  }

  function tryStage() {
    if (state !== "boost" && state !== "window" && state !== "attract") return;
    const s = spec();
    if (tPlay < s.climb - 0.8) return;
    lastStageAt = tPlay;
    if (tPlay < s.climb) {
      fail("early");
      return;
    }
    if (tPlay > s.climb + s.window) {
      fail("late");
      return;
    }
    if (Math.abs(stack.angle) > s.stageAngle) {
      fail("rud");
      return;
    }
    beginSep();
  }

  function tiltCurve(t) {
    const x = clamp(t, 0, 1);
    return Math.pow(x, 1.35);
  }

  function tickHold(dt) {
    ["left", "right"].forEach((k) => {
      hold[k] = held[k] ? Math.min(1, hold[k] + HOLD_RISE * dt) : Math.max(0, hold[k] - HOLD_FALL * dt);
    });
  }

  function applyAttitude(dt, { wind = true, gimbal = GIMBAL, angleCap = 0.7 } = {}) {
    const s = spec();
    const steer = tiltCurve(hold.right) - tiltCurve(hold.left);
    stack.av += steer * gimbal * (thrOn() ? 0.65 : 1) * dt;
    if (wind) {
      stack.av += (s.wind * windGust * WIND_AV + stack.outBias * s.engineOut * ENGINE_AV) * dt;
      if (stack.evOn) stack.av += stack.evBias * ENGINE_AV * 1.1 * dt;
    }
    const restore = Math.abs(steer) < 0.06 ? RESTORE_IDLE : RESTORE_STEER;
    stack.av -= stack.angle * restore * dt;
    stack.av *= Math.pow(AV_DAMP, dt * 0.08);
    stack.angle = clamp(stack.angle + stack.av * dt, -angleCap, angleCap);
    return steer;
  }

  function steerAuto() {
    const want = clamp(-stack.x * 0.012 - stack.vx * 0.18 - stack.angle * 1.6 - stack.av * 8, -1, 1);
    hold.left = want < -0.04 ? clamp((-want - 0.02) / 0.55, 0, 1) : 0;
    hold.right = want > 0.04 ? clamp((want - 0.02) / 0.55, 0, 1) : 0;
    const s = spec();
    const q = tPlay / s.climb;
    autoThr = dyn && q >= MAXQ_FROM && q <= MAXQ_TO && load > 0.3;
    if ((state === "window" || state === "attract") && tPlay >= s.climb + s.window * 0.46 && tPlay <= s.climb + s.window) {
      tryStage();
    }
  }

  function tickAudio() {
    const counting = state === "count";
    const climbing =
      counting ||
      state === "boost" ||
      state === "window" ||
      state === "attract" ||
      state === "sep" ||
      state === "attract-sep";
    const shipMode = (state === "sep" || state === "attract-sep") && stack?.shipLit;
    const space = stack ? clamp((stack.alt - 58) / 16, 0, 1) : 0;
    if (!engine) return;
    const amount = counting ? ignite * 0.74 : climbing && stack?.alive ? (shipMode ? 0.72 : 0.96) : 0;
    setEngine(amount, shipMode ? "ship" : "boost");
    const t = audio.currentTime;
    const wind = climbing ? 0.028 * (1 - space * 0.82) : 0.004;
    engine.windGain.gain.setTargetAtTime(muted ? 0 : wind, t, 0.12);
    engine.windFilter.frequency.setTargetAtTime(620 + space * 900, t, 0.2);
    if (climbing && stack?.alive && Math.random() < 0.1) {
      const now = audio.currentTime;
      engine.crackleGain.gain.setTargetAtTime(muted ? 0 : 0.09, now, 0.01);
      engine.crackleGain.gain.setTargetAtTime(muted ? 0 : 0.04, now + 0.05, 0.04);
    }
  }

  function stepCount(dt) {
    if (!stack) return;
    countT = Math.max(0, countT - dt / 1000);
    const n = Math.ceil(countT);
    if (n >= 1 && n < countMark) {
      countMark = n;
      sfxCount(n);
      flash = 0.32;
      cam.punch = 0.1;
    }
    ignite = countT <= 1.15 ? clamp((1.15 - countT) / 0.55, 0, 1) : 0;
    if (!auto) tickHold(dt);
    applyAttitude(dt, { wind: false, gimbal: GIMBAL * 0.7, angleCap: 0.35 });
    stack.x += stack.vx * dt * 0.02;
    if (ignite > 0.3) emitClimbFx();
    tickAudio();
    if (countT <= 0) {
      state = "boost";
      tPlay = 0;
      ignite = 1;
      sfxIgnition();
      shake = 11;
      flash = 0.72;
      cam.punch = 0.22;
      burst(stack.x, 70, 26, "#ff9a3a", 3.4);
      burst(stack.x, 80, 12, "#fff0c0", 2.2);
    }
  }

  function step(dt) {
    if (!stack) return;
    if (state === "sep" || state === "attract-sep") {
      sepT = clamp(sepT + dt / 2360, 0, 1);
      shock = Math.min(1.35, shock + dt / 480);
      stack.shipOff = ease(sepT) * 128;
      stack.boostOff = ease(sepT) * 78;
      stack.alt += 0.00062 * dt;
      stack.x += stack.vx * dt * 0.02;
      emitClimbFx();
      if (Math.random() < 0.82) {
        burst(stack.x + rand(-8, 8), 4 - sepT * 20, 3, "#ff9a3a", 2.6);
      }
      if (Math.random() < 0.28) {
        burst(stack.x + rand(-4, 4), -80 - stack.shipOff * 0.4, 2, "#fff0c8", 1.8);
      }
      tickAudio();
      if (sepT >= 1) {
        if (state === "attract-sep") {
          state = "attract-hold";
          setEngine(0);
          window.setTimeout(()=>{if(state==='attract-hold')beginAttract();}, 1500);
        } else {
          setEngine(0);
          succeed();
        }
      }
      return;
    }

    if (state === "count") {
      stepCount(dt);
      return;
    }

    if (!inPlay()) {
      setEngine(0);
      return;
    }

    const s = spec();
    if (auto) steerAuto();
    else tickHold(dt);

    windGust = lerp(windGust, (-1 + simRandom()*2), 0.018);
    if (dyn && (state === "boost" || state === "window")) {
      gusts.forEach((g) => {
        const u = tPlay - g.t;
        if (u >= 0 && u <= g.dur) stack.av += g.dir * g.str * Math.sin((Math.PI * u) / g.dur) * GUST_AV * dt;
      });
    }
    applyAttitude(dt);

    stack.vx += Math.sin(stack.angle) * 0.0034 * dt + s.wind * windGust * 0.0011 * dt;
    stack.vx *= Math.pow(0.994, dt * 0.06);
    stack.x += stack.vx * dt * 0.06;
    stack.x = clamp(stack.x, -86, 86);
    stack.alt += stack.vy * dt * 0.00105;
    tPlay += (dt / 1000) * (thrOn() ? 0.6 : 1);
    if (stepEvents(dt)) return;

    emitClimbFx();
    tickAudio();

    if (state === "boost") {
      const left = s.climb - tPlay;
      if (left <= 3 && left > 0) {
        const tick = Math.ceil(left);
        if (tick < warnMark) {
          warnMark = tick;
          sfxWarn();
        }
      }
    }
    if (state === "boost" && tPlay >= s.climb) {
      state = state === "attract" ? "attract" : "window";
      if (!windowChimed && state === "window") {
        windowChimed = true;
        sfxWindow();
        buzz(18);
        cam.punch = 0.16;
        flash = Math.max(flash, 0.45);
        shake = Math.max(shake, 6);
      }
    }
    if (state === "attract" && tPlay >= s.climb && !windowChimed) {
      windowChimed = true;
    }

    if (Math.abs(stack.angle) > s.failAngle) {
      fail("walk");
      return;
    }

    if ((state === "window" || state === "attract") && tPlay > s.climb + s.window + 0.02) {
      fail("late");
    }
  }

  /* Gust telegraphs, Raptor-out, Max-Q load, proximity pings and coaching hints.
     Returns true if the run ended this tick. */
  function stepEvents(dt) {
    if (state !== "boost" && state !== "window") return false;
    const s = spec();
    if (dyn) {
      gusts.forEach((g) => {
        const lead = g.t - tPlay;
        if (!g.said && lead <= 1.25 && lead > 0) {
          g.said = true;
          sfxGust();
          say(`Gust pushing ${g.dir > 0 ? "right" : "left"}. Steer ${g.dir > 0 ? "left" : "right"}.`, 2600, true);
        }
      });
      if (evt && !evt.done && tPlay >= evt.t) {
        evt.done = true;
        stack.out.add(evt.idx);
        stack.evOn = true;
        stack.evBias = ENGINES[evt.idx].x >= 0 ? 1 : -1;
        shake = Math.max(shake, 8);
        flash = Math.max(flash, 0.5);
        sfxEngineOut();
        buzz([40, 30, 40]);
        say(`Raptor out. It pulls the stack ${stack.evBias > 0 ? "right" : "left"}. Counter-steer.`, 3600, true);
      }
      const q = tPlay / s.climb;
      const band = state === "boost" && q >= MAXQ_FROM && q <= MAXQ_TO;
      const thr = thrOn();
      load = clamp(load + (band ? (thr ? 0.05 : 0.46) : -0.14) * (dt / 1000), 0, 1.2);
      if (thr) thrTime += dt / 1000;
      if (!maxqSaid && q >= MAXQ_FROM - 0.06) {
        maxqSaid = true;
        say("Max-Q ahead. Hold Throttle (S) to cut the load.", 4200, true);
      }
      if (band && load > 0.72) {
        loadWarnTick += 1;
        if (loadWarnTick >= 16) {
          loadWarnTick = 0;
          sfxWarn();
          buzz(12);
        }
        say("Load high. Throttle down!", 1800);
      }
      if (load >= 1) {
        fail("maxq");
        return true;
      }
    }
    if (hintStep === 1 && state === "boost" && tPlay >= 2.5) {
      hintStep = 2;
      say("Watch the meter at the top. Stage inside the green zone.", 5000, true);
    }
    if (state === "window" && !demo && audio && !muted) {
      const c = clamp(1 - Math.abs(tPlay - (s.climb + s.window * 0.5)) / (s.window * 0.5), 0, 1);
      pingTick += 1;
      if (pingTick >= Math.round(16 - 11 * c)) {
        pingTick = 0;
        sfxPing(c);
      }
    }
    return false;
  }

  function stepParticles() {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      const soft = p.kind === "smoke" || p.kind === "trail";
      p.vy += soft ? 0.012 : 0.04;
      p.vx *= soft ? 0.985 : 0.995;
      p.life -= 1;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = flakes.length - 1; i >= 0; i -= 1) {
      const f = flakes[i];
      f.x += f.vx;
      f.y += f.vy;
      f.life -= 1;
      if (f.life <= 0) flakes.splice(i, 1);
    }
    if (particles.length > 320) particles.splice(0, particles.length - 320);
    if (flakes.length > 70) flakes.splice(0, flakes.length - 70);
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    cssW = Math.max(320, rect.width);
    cssH = Math.max(280, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  function mix(a, b, t) {
    return Math.round(lerp(a, b, t));
  }

  function rgb(r, g, b) {
    return `rgb(${r},${g},${b})`;
  }

  function spaceT() {
    return stack ? clamp((stack.alt - 58) / 16, 0, 1) : 0.35;
  }

  function drawRaptor(ctx, x, y, scale, lit) {
    ctx.save();
    ctx.translate(x, y);
    const bell = ctx.createLinearGradient(-6 * scale, 0, 6 * scale, 0);
    bell.addColorStop(0, "#24180f");
    bell.addColorStop(0.3, "#8a5328");
    bell.addColorStop(0.5, "#e0b068");
    bell.addColorStop(0.72, "#7a4a24");
    bell.addColorStop(1, "#1a120c");
    ctx.fillStyle = bell;
    ctx.beginPath();
    ctx.moveTo(-2.8 * scale, -1.6 * scale);
    ctx.lineTo(-5.4 * scale, 8.2 * scale);
    ctx.quadraticCurveTo(0, 10.4 * scale, 5.4 * scale, 8.2 * scale);
    ctx.lineTo(2.8 * scale, -1.6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0e0a08";
    ctx.beginPath();
    ctx.ellipse(0, 7.8 * scale, 2.3 * scale, 1.05 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      const glow = ctx.createRadialGradient(0, 8.2 * scale, 0, 0, 8.6 * scale, 7.4 * scale);
      glow.addColorStop(0, "rgba(255,248,220,0.9)");
      glow.addColorStop(0.3, "rgba(255,170,70,0.4)");
      glow.addColorStop(1, "rgba(255,70,10,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 8.4 * scale, 7.4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBoosterPlume(ctx, flicker) {
    const lit = ENGINES.filter((_, i) => !stack.out.has(i)).length / ENGINES.length;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const disc = ctx.createRadialGradient(0, 86, 2, 0, 92, 36);
    disc.addColorStop(0, `rgba(255,236,190,${0.55 * flicker * lit})`);
    disc.addColorStop(0.28, `rgba(255,150,50,${0.38 * flicker * lit})`);
    disc.addColorStop(1, "rgba(255,60,10,0)");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 90, 36, 0, Math.PI * 2);
    ctx.fill();

    const outer = ctx.createLinearGradient(0, 78, 0, 78 + 280);
    outer.addColorStop(0, `rgba(255,200,110,${0.48 * flicker * lit})`);
    outer.addColorStop(0.16, `rgba(255,120,36,${0.32 * flicker * lit})`);
    outer.addColorStop(0.48, `rgba(255,50,10,${0.14 * flicker * lit})`);
    outer.addColorStop(1, "rgba(255,20,0,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(-42, 82);
    ctx.lineTo(42, 82);
    ctx.lineTo(Math.sin(clock * 0.04) * 14, 82 + 270);
    ctx.closePath();
    ctx.fill();

    [-18, -8, 0, 8, 18].forEach((ox, i) => {
      const len = 120 + i * 12 + Math.sin(clock * 0.07 + i) * 8;
      const core = ctx.createLinearGradient(ox, 78, ox, 78 + len);
      core.addColorStop(0, `rgba(255,255,245,${0.62 * flicker})`);
      core.addColorStop(0.1, `rgba(180,220,255,${0.38 * flicker})`);
      core.addColorStop(0.38, `rgba(255,176,64,${0.22 * flicker})`);
      core.addColorStop(1, "rgba(255,60,10,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(ox - 6.5, 82);
      ctx.lineTo(ox + 6.5, 82);
      ctx.lineTo(ox + Math.sin(clock * 0.09 + i) * 3, 82 + len);
      ctx.closePath();
      ctx.fill();
    });

    for (let d = 0; d < 6; d += 1) {
      const yy = 108 + d * 22 + Math.sin(clock * 0.05 + d) * 3;
      ctx.fillStyle = `rgba(255,236,200,${0.18 * flicker * (1 - d / 6)})`;
      ctx.beginPath();
      ctx.ellipse(Math.sin(clock * 0.03 + d) * 2, yy, 10 - d, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawShipPlume(ctx, flicker) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const len = 96 + (state === "sep" || state === "attract-sep" || state === "success" ? sepT * 28 : 0);
    const g = ctx.createLinearGradient(0, 42, 0, 42 + len);
    g.addColorStop(0, `rgba(255,248,220,${0.95 * flicker})`);
    g.addColorStop(0.14, `rgba(160,205,255,${0.6 * flicker})`);
    g.addColorStop(0.48, `rgba(255,150,50,${0.36 * flicker})`);
    g.addColorStop(1, "rgba(255,50,10,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-15, 44);
    ctx.lineTo(15, 44);
    ctx.lineTo(Math.sin(clock * 0.08) * 5, 44 + len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFlap(ctx, x, y, len, thick, sweep) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + sweep);
    ctx.lineTo(x + len * 0.96, y + sweep + thick);
    ctx.lineTo(x, y + thick + 1);
    ctx.closePath();
    ctx.fill();
  }

  function steelFill(ctx, w, night) {
    const specShift = clamp(0.38 + (stack?.angle || 0) * 0.32, 0.2, 0.7);
    const g = ctx.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, "#2a2620");
    g.addColorStop(specShift - 0.18, "#6a6458");
    g.addColorStop(specShift - 0.04, night > 0.7 ? "#b8b0a0" : "#e8e2d4");
    g.addColorStop(specShift, "#fff8ec");
    g.addColorStop(specShift + 0.08, "#9a9284");
    g.addColorStop(1, "#2c2822");
    return g;
  }

  function drawBooster(ctx, lod, night, yOff) {
    ctx.save();
    ctx.translate(0, yOff);
    const w = 20;
    const h = 168;
    ctx.fillStyle = steelFill(ctx, w, night);
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.48);
    ctx.lineTo(w, -h * 0.48);
    ctx.lineTo(w * 1.05, h * 0.42);
    ctx.quadraticCurveTo(0, h * 0.5, -w * 1.05, h * 0.42);
    ctx.closePath();
    ctx.fill();

    if (lod > 0.25) {
      ctx.strokeStyle = "rgba(16,14,12,0.28)";
      ctx.lineWidth = 0.55;
      for (let i = 0; i < 14; i += 1) {
        const yy = -h * 0.44 + i * 11.2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.98, yy);
        ctx.lineTo(w * 0.98, yy);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.46);
      ctx.lineTo(0, h * 0.4);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(10,8,6,0.45)";
    ctx.fillRect(w * 0.42, -h * 0.46, 3.1, h * 0.86);

    const soot = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.48);
    soot.addColorStop(0, "rgba(12,10,8,0)");
    soot.addColorStop(1, "rgba(10,8,6,0.32)");
    ctx.fillStyle = soot;
    ctx.fillRect(-w * 1.05, h * 0.12, w * 2.1, h * 0.36);

    ctx.fillStyle = "#6a6458";
    [
      [-w - 5, -h * 0.28],
      [w + 1, -h * 0.28],
      [-w - 5, -h * 0.08],
      [w + 1, -h * 0.08],
    ].forEach(([fx, fy]) => {
      ctx.fillRect(fx, fy, 4.2, 11);
    });

    ENGINES.forEach((e, i) => {
      const spool = state === "count" ? ignite > 0.38 : true;
      const lit = stack.alive && !stack.out.has(i) && (!stack.shipLit || sepT < 0.32) && spool;
      if (lod > 0.35) drawRaptor(ctx, e.x, h * 0.46 + e.y * 0.15, e.s, lit && state !== "fail");
    });
    ctx.restore();
  }

  function drawShipBody(ctx, lod, night, yOff, lit) {
    ctx.save();
    ctx.translate(0, yOff);
    const w = 18;
    const h = 118;
    ctx.fillStyle = "#6a6458";
    drawFlap(ctx, -w, h * 0.22, -11, 8, 3);
    drawFlap(ctx, w, h * 0.22, 11, 8, 3);
    ctx.fillStyle = "#2a261e";
    drawFlap(ctx, -w, h * 0.24, -9, 3, 2);
    drawFlap(ctx, w, h * 0.24, 9, 3, 2);
    ctx.fillStyle = "#8a8274";
    drawFlap(ctx, -w * 0.85, -h * 0.08, -8, 5, -1.5);
    drawFlap(ctx, w * 0.85, -h * 0.08, 8, 5, -1.5);

    ctx.fillStyle = steelFill(ctx, w, night);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.5);
    ctx.bezierCurveTo(w * 0.45, -h * 0.5, w, -h * 0.4, w, -h * 0.26);
    ctx.lineTo(w, h * 0.48);
    ctx.lineTo(-w, h * 0.48);
    ctx.lineTo(-w, -h * 0.26);
    ctx.bezierCurveTo(-w, -h * 0.4, -w * 0.45, -h * 0.5, 0, -h * 0.5);
    ctx.closePath();
    ctx.fill();

    const shield = ctx.createLinearGradient(-w, 0, w * 0.08, 0);
    shield.addColorStop(0, "#14110d");
    shield.addColorStop(0.72, "#2a241c");
    shield.addColorStop(1, "rgba(24,20,16,0)");
    ctx.fillStyle = shield;
    ctx.beginPath();
    ctx.moveTo(-w, -h * 0.2);
    ctx.lineTo(-w * 0.04, -h * 0.24);
    ctx.lineTo(-w * 0.04, h * 0.4);
    ctx.lineTo(-w, h * 0.36);
    ctx.closePath();
    ctx.fill();

    if (lod > 0.4) {
      ctx.fillStyle = "rgba(0,0,0,0.34)";
      for (let row = 0; row < 16; row += 1) {
        const yy = -h * 0.18 + row * 4.1;
        for (let col = 0; col < 5; col += 1) {
          ctx.fillRect(-w * 0.96 + col * 2.05 + (row % 2) * 1.0, yy, 1.7, 3.4);
        }
      }
    }

    ctx.fillStyle = "#101216";
    ctx.fillRect(-3.1, -h * 0.26, 6.2, 5.6);
    const glass = ctx.createLinearGradient(-3, -h * 0.26, 3, -h * 0.2);
    glass.addColorStop(0, "#8ec8ff");
    glass.addColorStop(1, "#163450");
    ctx.fillStyle = glass;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(-2.3, -h * 0.252, 4.6, 3.2);
    ctx.globalAlpha = 1;

    if (lit) {
      SHIP_ENGINES.forEach((e) => {
        drawRaptor(ctx, e.x, h * 0.46 + e.y, e.s * 0.92, true);
      });
    }
    ctx.restore();
  }

  function drawHotRing(ctx, heat, y) {
    if (heat <= 0.02) return;
    ctx.save();
    ctx.translate(0, y);
    ctx.globalCompositeOperation = "lighter";
    const hot = state === "window" || state === "sep" || state === "attract-sep";
    const pulse = 0.68 + Math.sin(clock * (hot ? 0.07 : 0.03)) * (hot ? 0.32 : 0.28);
    const grow = hot ? 1.18 : 1;
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, (48 + heat * 22) * grow);
    g.addColorStop(0, `rgba(255,200,120,${0.48 * heat * pulse})`);
    g.addColorStop(0.28, `rgba(255,120,36,${0.42 * heat * pulse})`);
    g.addColorStop(0.62, `rgba(255,60,12,${0.18 * heat})`);
    g.addColorStop(1, "rgba(255,30,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, (50 + heat * 18) * grow, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,170,80,${0.78 * heat * pulse})`;
    ctx.lineWidth = 2.6 + heat * (hot ? 2.6 : 1.8);
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 + heat * 3, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,210,140,${0.22 * heat * pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWindowTimer(ctx, y) {
    const s = spec();
    const left = Math.max(0, s.climb + s.window - tPlay);
    const frac = clamp(left / s.window, 0, 1);
    ctx.save();
    ctx.translate(0, y);
    ctx.strokeStyle = "rgba(255,180,80,0.28)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,220,150,0.95)";
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 12, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();
  }

  function viewScale() {
    const portrait = cssH > cssW * 1.05;
    const base = Math.min(cssW / 340, cssH / (portrait ? 430 : 400));
    return base * cam.zoom * (portrait ? 0.8 : 0.88);
  }

  function uiScale() {
    return clamp(Math.min(cssW, cssH) / 520, 1, 1.55);
  }

  function fxSpeed() {
    if (state === "count") return 0.12 + ignite * 0.3;
    if (state === "sep" || state === "attract-sep") return 1.1 + ease(sepT) * 1.6;
    if (state === "fail" || state === "attract-hold") return 0.25;
    if (state === "success" || state === "complete") return 1.6;
    return 1;
  }

  function stepFx(dt) {
    const sp = fxSpeed();
    scrollX += dt * 0.03 * sp;
    starDrift += dt * 0.012 * sp;
    burstT += dt / 1000;
    if (stack && (state === "fail" || state === "attract-hold") && !stack.alive) failT += dt / 1000;
    for (let i = booms.length - 1; i >= 0; i -= 1) {
      booms[i].t += dt / 1000;
      if (booms[i].t > 1.8) booms.splice(i, 1);
    }
    debris.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.012;
      p.vx *= 0.995;
      p.rot += p.vr;
      p.hot = Math.max(0, p.hot - 0.004);
      if (p.smoke && Math.random() < 0.55) {
        particles.push({ x: p.x + rand(-6, 6), y: p.y + rand(-6, 6), vx: rand(-0.3, 0.3), vy: rand(-0.2, 0.3), life: rand(30, 60), max: 60, size: rand(3, 8), color: p.hot > 0.1 ? "#3a2a22" : "#8a8f98", kind: "smoke" });
      }
    });
  }

  function spawnBreakup(kind) {
    debris.length = 0;
    booms.length = 0;
    if (!stack) return;
    const a = stack.angle;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const dir = a >= 0 ? 1 : -1;
    const add = (type, lx, ly, vx, vy, vr, hot, smoke) => {
      debris.push({ type, x: lx * ca - ly * sa, y: lx * sa + ly * ca, vx, vy, rot: a, vr, hot, smoke, size: 3 });
    };
    if (kind === "late") return;
    if (kind === "early") {
      add("ship", 0, -138, dir * 0.7, -1.6, dir * 0.035, 1, true);
      add("boostTop", 0, -45, -dir * 0.5, 0.2, -dir * 0.045, 0.9, true);
      add("boostBot", 0, 40, -dir * 0.9, 1.3, -dir * 0.07, 1, true);
      booms.push({ x: 0, y: -80, t: 0, s: 1.2 });
    } else if (kind === "rud") {
      add("ship", 0, -138, dir * 0.4, -2.3, dir * 0.02, 0.4, false);
      add("boostTop", 0, -45, -dir * 0.3, -0.6, -dir * 0.03, 0.8, true);
      add("boostBot", 0, 40, dir * 0.9, 1.7, dir * 0.08, 1, true);
      booms.push({ x: 0, y: 60, t: 0, s: 1.35 });
    } else {
      add("ship", 0, -138, dir * 1.7, -1.1, dir * 0.06, 0.5, true);
      add("boost", 0, 0, -dir * 0.4, 0.7, -dir * 0.03, 0.4, true);
      booms.push({ x: 0, y: -80, t: 0, s: 0.9 });
    }
    for (let i = 0; i < 18; i += 1) {
      const ang = rand(0, Math.PI * 2);
      const v = rand(0.8, 3.6);
      debris.push({
        type: "shard",
        x: rand(-16, 16),
        y: rand(-140, 50),
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v - 0.4,
        rot: rand(0, 6),
        vr: rand(-0.16, 0.16),
        hot: rand(0.4, 1),
        smoke: i % 3 === 0,
        size: rand(3, 8),
      });
    }
  }

  function drawDebris(ctx, originX, originY, scale) {
    const night = spaceT();
    const lod = clamp(scale, 0, 1.4);
    debris.forEach((p) => {
      if (p.type === "shard") {
        ctx.save();
        ctx.translate(originX, originY);
        fx.drawShard(ctx, p, scale);
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.translate(originX + p.x * scale, originY + p.y * scale);
      ctx.scale(scale, scale);
      ctx.rotate(p.rot);
      if (p.type === "ship") {
        drawShipBody(ctx, lod, night, 0, false);
      } else if (p.type === "boost") {
        drawBooster(ctx, lod, night, 0);
      } else {
        const top = p.type === "boostTop";
        const cy = top ? -45 : 40;
        ctx.translate(0, -cy);
        ctx.beginPath();
        ctx.rect(-40, top ? -100 : -4, 80, top ? 96 : 100);
        ctx.clip();
        drawBooster(ctx, lod, night, 0);
        ctx.translate(0, cy);
      }
      if (p.hot > 0.05) {
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
        g.addColorStop(0, `rgba(255,160,70,${0.5 * p.hot})`);
        g.addColorStop(1, "rgba(255,80,20,0)");
        ctx.fillStyle = g;
        ctx.fillRect(-50, -50, 100, 100);
      }
      ctx.restore();
    });
  }

  function drawCollar(ctx) {
    if (state !== "boost" || !stack.alive) return;
    const q = tPlay / Math.max(1, spec().climb);
    const k = Math.max(0, 1 - Math.abs(q - 0.46) / 0.16);
    if (k <= 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pulse = 0.85 + Math.sin(clock * 0.05) * 0.15;
    const g = ctx.createRadialGradient(0, -122, 4, 0, -122, 56);
    g.addColorStop(0, `rgba(235,246,255,${0.34 * k * pulse})`);
    g.addColorStop(0.6, `rgba(170,214,255,${0.14 * k})`);
    g.addColorStop(1, "rgba(150,200,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -118, 58, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(235,246,255,${0.55 * k})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -118, 30 + k * 10, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -184);
    ctx.lineTo(-44 - k * 12, -118 + 30);
    ctx.moveTo(4, -184);
    ctx.lineTo(44 + k * 12, -118 + 30);
    ctx.stroke();
    ctx.restore();
  }

  function drawStack(ctx, originX, originY, scale) {
    const night = spaceT();
    const lod = clamp(scale, 0, 1.4);
    const flicker = stack.alive ? 0.84 + Math.sin(clock * 0.08) * 0.16 : 0;
    const sep = state === "sep" || state === "attract-sep" || (state === "success" && sepT > 0);
    ctx.save();
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);
    ctx.rotate(stack.angle);

    if (sep) {
      const e = ease(sepT);
      const shipY = -138 - e * 250;
      const boostY = e * e * 230 + e * 24;
      const flip = stack.flipDir || 1;
      ctx.save();
      ctx.translate(0, boostY);
      ctx.rotate(e * Math.PI * 0.92 * flip);
      const shrink = 1 - 0.22 * e * e;
      ctx.scale(shrink, shrink);
      if (sepT > 0.45 && sepT < 0.98) {
        ctx.save();
        ctx.scale(0.5, 0.5);
        drawBoosterPlume(ctx, 0.5 + Math.sin(clock * 0.12) * 0.15);
        ctx.restore();
      } else if (sepT <= 0.45) {
        drawBoosterPlume(ctx, flicker * (1 - sepT / 0.45));
      }
      drawBooster(ctx, lod, night, 0);
      ctx.restore();
      drawHotRing(ctx, Math.max(0, 1 - sepT * 1.6), -80 - e * 40);
      if (burstT < 0.6) fx.drawStarburst(ctx, 0, -80, burstT, 1);
      if (stack.shipLit) {
        ctx.save();
        ctx.translate(0, shipY);
        ctx.scale(1, 1 + e * 1.1);
        drawShipPlume(ctx, flicker);
        ctx.restore();
      }
      drawShipBody(ctx, lod, night, shipY, stack.shipLit);
    } else if (!stack.broken) {
      let fallY = 0;
      if (!stack.alive && failT > 0) {
        fallY = failT * failT * 38;
        ctx.translate(0, fallY);
        ctx.rotate((stack.flipDir || 1) * failT * 0.16);
      }
      const spool = state === "count" ? ignite : 1;
      if (stack.alive && (!stack.shipLit || sepT < 0.35) && spool > 0.04) {
        drawBoosterPlume(ctx, flicker * spool * (thrOn() ? 0.62 : 1));
      }
      drawBooster(ctx, lod, night, 0);
      drawHotRing(ctx, heatAmt(), -80);
      drawCollar(ctx);
      if (state === "window" && stack.alive) drawWindowTimer(ctx, -80);
      drawShipBody(ctx, lod, night, -138, false);
      flakes.forEach((f) => {
        ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
        ctx.fillStyle = "#e8e4dc";
        ctx.fillRect(f.x - stack.x, f.y, f.size, f.size);
      });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawStreaks(ctx, intensity) {
    if (intensity <= 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = "#cfe2ff";
    const span = cssH + 160;
    for (let i = 0; i < streaks.length; i += 1) {
      const s = streaks[i];
      const len = s.len * (0.5 + intensity * 0.9);
      const y = ((s.y * span + starDrift * 38 * s.sp) % span) - 120;
      ctx.globalAlpha = s.a * intensity;
      ctx.beginPath();
      ctx.moveTo(s.x * cssW, y);
      ctx.lineTo(s.x * cssW, y + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGust(ctx) {
    if (!dyn || !stack || (state !== "boost" && state !== "window")) return;
    let best = null;
    for (const g of gusts) {
      const lead = g.t - tPlay;
      if (lead > -g.dur && lead <= 1.25) {
        const k = lead > 0 ? 1 - lead / 1.25 : 1;
        if (!best || k > best.k) best = { g, k, active: lead <= 0 };
      }
    }
    if (!best) return;
    const { g, k, active } = best;
    const dir = g.dir;
    const ui = uiScale();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x0 = dir > 0 ? 0 : cssW;
    const x1 = dir > 0 ? cssW * 0.34 : cssW * 0.66;
    const tint = ctx.createLinearGradient(x0, 0, x1, 0);
    tint.addColorStop(0, `rgba(255,200,120,${0.3 * k})`);
    tint.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = tint;
    ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), cssH);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = active ? "#ffffff" : "#ffd9a0";
    ctx.lineWidth = 2 * ui;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i += 1) {
      const y = cssH * (0.24 + 0.5 * ((i * 0.618) % 1));
      const ph = (clock * 0.0016 * (active ? 1.7 : 1) + i * 0.37) % 1;
      const x = dir > 0 ? ph * cssW : (1 - ph) * cssW;
      const len = (26 + (i % 3) * 14) * ui;
      ctx.globalAlpha = Math.min(1, k) * (0.2 + 0.5 * Math.sin(ph * Math.PI));
      ctx.beginPath();
      ctx.moveTo(x - dir * len, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - dir * 6 * ui, y - 5 * ui);
      ctx.lineTo(x, y);
      ctx.lineTo(x - dir * 6 * ui, y + 5 * ui);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  function drawCalloutPill(ctx) {
    if (callout.t <= 0 || !callout.text) return;
    const ui = uiScale();
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = Math.min(1, callout.t / 400);
    ctx.font = `600 ${12.5 * ui}px ${MONO}`;
    ctx.textAlign = "left";
    const maxW = Math.min(cssW * (cssW < 600 ? 0.36 : 0.46), 330 * ui);
    const lines = [];
    let cur = "";
    callout.text.split(" ").forEach((word) => {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && ctx.measureText(next).width > maxW) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    });
    if (cur) lines.push(cur);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24 * ui;
    const h = 12 * ui + lines.length * 18 * ui;
    const x = 12 * ui;
    const y = cssH * 0.7 + 8 * ui;
    ctx.fillStyle = "rgba(8,14,24,0.74)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ffb454";
    ctx.fillRect(x, y, 3 * ui, h);
    ctx.fillStyle = "#e9f6fa";
    lines.forEach((l, i) => ctx.fillText(l, x + 12 * ui, y + 8 * ui + (i + 1) * 17 * ui - 4 * ui));
    ctx.restore();
  }

  function drawHud(ctx) {
    if (!stack || !fx) return;
    if (!(state === "count" || state === "boost" || state === "window" || state === "sep" || state === "pause")) return;
    const ui = uiScale();
    const s = spec();
    const tapeH = clamp(cssH * 0.42, 120, 300);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.drawAltTape(ctx, { x: 12 * ui, y: cssH * 0.2, hgt: tapeH, alt: stack.alt, ui });
    const r = 54 * ui;
    fx.drawAttitude(ctx, { cx: cssW - r - 20 * ui, cy: cssH - 50 * ui, r, angle: stack.angle, stage: s.stageAngle, fail: s.failAngle, ui });
    const sepNow = state === "sep";
    const kmh = Math.round(5120 + tPlay * 41 + (sepNow ? ease(sepT) * 1400 : 0));
    ctx.textAlign = "right";
    ctx.font = `600 ${12 * ui}px ${MONO}`;
    ctx.fillStyle = "#ffe8c8";
    ctx.fillText(`${kmh.toLocaleString()} KM/H`, cssW - 14 * ui, cssH * 0.2 + 4 * ui);
    ctx.font = `500 ${8.5 * ui}px ${MONO}`;
    ctx.fillStyle = "rgba(220,232,246,0.6)";
    ctx.fillText("VELOCITY", cssW - 14 * ui, cssH * 0.2 - 8 * ui);
    if (dyn && (state === "boost" || state === "window") && stack.alive) {
      const q = tPlay / s.climb;
      if (load > 0.02 || (q > MAXQ_FROM - 0.16 && q < MAXQ_TO + 0.12)) {
        fx.drawLoadBar(ctx, { x: cssW - 14 * ui - 118 * ui, y: cssH * 0.2 + 34 * ui, wd: 118 * ui, load, ui, thr: thrOn(), band: q >= MAXQ_FROM && q <= MAXQ_TO });
      }
    }
    if ((state === "boost" || state === "window") && stack.alive) {
      fx.drawWindowMeter(ctx, {
        cx: cssW * 0.5,
        y: Math.max(48 * ui, cssH * 0.1),
        wd: Math.min(cssW * 0.6, 560),
        t: tPlay,
        climb: s.climb,
        win: s.window,
        ui,
        clock,
        open: state === "window",
      });
    }
    ctx.restore();
  }

  function drawWorld(ctx) {
    const space = spaceT();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, cssH);
    sky.addColorStop(0, rgb(mix(16, 4, space), mix(20, 6, space), mix(42, 12, space)));
    sky.addColorStop(0.4, rgb(mix(32, 8, space), mix(34, 10, space), mix(68, 18, space)));
    sky.addColorStop(0.74, rgb(mix(64, 16, space), mix(42, 16, space), mix(78, 28, space)));
    sky.addColorStop(1, rgb(mix(118, 28, space), mix(62, 24, space), mix(58, 28, space)));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cssW, cssH);

    const sunX = cssW * 0.78;
    const sunY = cssH * (0.2 - space * 0.05);
    const sun = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, cssW * 0.7);
    sun.addColorStop(0, `rgba(255,228,190,${0.55 - space * 0.15})`);
    sun.addColorStop(0.08, "rgba(255,170,80,0.16)");
    sun.addColorStop(0.4, "rgba(255,90,40,0.05)");
    sun.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, cssW, cssH);

    const sky72 = cssH * 0.72;
    stars.forEach((st) => {
      const tw = 0.7 + Math.sin(clock * st.tw) * 0.3;
      ctx.globalAlpha = st.a * (0.08 + space * 0.85) * tw;
      ctx.fillStyle = st.r > 1.1 ? "#fff4d4" : "#d8e4ff";
      ctx.beginPath();
      ctx.arc(st.x * cssW, (st.y * sky72 + starDrift * st.z * 6) % sky72, st.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const plan = fx.drawPlanet(ctx, { w: cssW, h: cssH, space, scroll: scrollX, px: stack?.x || 0 });
    fx.drawAurora(ctx, { w: cssW, top: plan.top + cssH * 0.04, space, clock, reduced: reduceMotion });

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flare = ctx.createLinearGradient(0, 0, cssW, 0);
    flare.addColorStop(0, "rgba(255,190,120,0)");
    flare.addColorStop(0.5, `rgba(255,214,160,${0.1 + flash * 0.2})`);
    flare.addColorStop(1, "rgba(255,190,120,0)");
    ctx.fillStyle = flare;
    ctx.fillRect(0, sunY - 1.5, cssW, 3);
    [[0.62, 14, 0.05], [0.42, 26, 0.04], [0.2, 40, 0.03]].forEach(([k, rad, a]) => {
      const gx = sunX + (cssW * 0.5 - sunX) * (1 - k) * 1.6;
      const gy = sunY + (cssH * 0.5 - sunY) * (1 - k) * 1.6;
      ctx.fillStyle = `rgba(190,220,255,${a})`;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle = "rgba(255,240,210,0.85)";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    const climbing = state === "boost" || state === "window" || state === "attract" || state === "sep" || state === "attract-sep" || state === "success" || state === "complete";
    drawStreaks(ctx, climbing ? (state === "sep" || state === "attract-sep" ? 0.6 + ease(sepT) * 0.9 : 0.55) : state === "count" ? ignite * 0.15 : 0);

    const rumble = state === "boost" || state === "window" ? 0.5 : 0;
    const ox = (shake ? rand(-shake, shake) : 0) + (reduceMotion ? 0 : rand(-rumble, rumble)) + cam.x;
    const oy = (shake ? rand(-shake, shake) : 0) + (reduceMotion ? 0 : rand(-rumble, rumble)) + cam.y;
    const scale = viewScale();
    const lookY =
      state === "sep" || state === "attract-sep" || (state === "success" && sepT > 0)
        ? -96 + sepT * 6
        : state === "count"
          ? -30
          : -52;
    const originX = cssW * 0.5 + (stack?.x || 0) * 0.45 + ox;
    const originY = cssH * 0.53 - lookY * scale + oy + Math.sin(clock * 0.012) * 1.2;

    particles.forEach((p) => {
      if (p.kind !== "trail") return;
      const k = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = k * 0.3;
      ctx.fillStyle = k > 0.75 ? "#ffe2b8" : "#cdd7e6";
      ctx.beginPath();
      ctx.arc(originX + p.x * scale, originY + p.y * scale, p.size * scale * (1 + (1 - k) * 1.8), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    particles.forEach((p) => {
      if (p.kind !== "spark") return;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(originX + p.x * scale, originY + p.y * scale, p.size * scale * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (stack) {
      drawStack(ctx, originX, originY, scale);
      if (debris.length) drawDebris(ctx, originX, originY, scale);
      booms.forEach((b) => fx.drawFireball(ctx, originX + b.x * scale, originY + b.y * scale, b.t, scale * b.s, true));
    }

    if (shock > 0 && shock < 1.25 && stack) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const ringR = (18 + shock * 210) * scale;
      const fade = 1 - shock / 1.25;
      ctx.strokeStyle = `rgba(255,210,140,${0.55 * fade})`;
      ctx.lineWidth = 3.2 * fade + 1;
      ctx.beginPath();
      ctx.arc(originX, originY - 80 * scale, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(160,200,255,${0.22 * fade})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(originX, originY - 80 * scale, ringR * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    particles.forEach((p) => {
      if (p.kind === "spark" || p.kind === "trail") return;
      const k = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = k * (p.kind === "smoke" ? 0.24 : 0.5);
      ctx.fillStyle = p.kind === "smoke" ? "#5d626c" : p.color;
      ctx.beginPath();
      ctx.arc(originX + p.x * scale, originY + p.y * scale, p.size * scale * (p.kind === "smoke" ? 1 + (1 - k) * 1.6 : 1), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vig = ctx.createRadialGradient(cssW * 0.5, cssH * 0.46, cssW * 0.18, cssW * 0.5, cssH * 0.5, cssW * 0.82);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(0,0,0,${0.18 + space * 0.1})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cssW, cssH);

    const heat = heatAmt();
    if (heat > 0.05 && (state === "window" || state === "boost" || state === "attract" || state === "sep" || state === "count")) {
      const rim = ctx.createRadialGradient(cssW * 0.5, cssH * 0.5, cssW * 0.22, cssW * 0.5, cssH * 0.55, cssW * 0.7);
      rim.addColorStop(0, "rgba(255,80,10,0)");
      rim.addColorStop(1, `rgba(255,80,16,${0.18 * heat})`);
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, cssW, cssH);
    }

    if (!reduceMotion) {
      ctx.fillStyle = "rgba(255,255,255,0.028)";
      for (let i = 0; i < 18; i += 1) {
        ctx.fillRect(Math.random() * cssW, Math.random() * cssH, 1, 1);
      }
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,232,200,${flash * 0.22})`;
      ctx.fillRect(0, 0, cssW, cssH);
    }

    drawGust(ctx);
    drawHud(ctx);
    drawCallouts(ctx);
    drawCalloutPill(ctx);
  }

  function drawCallouts(ctx) {
    if (!stack) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const mono = '"IBM Plex Mono", ui-monospace, monospace';

    if (state === "count") {
      const ignition = countT <= 0.42;
      const label = ignition ? "IGNITION" : String(Math.max(1, Math.ceil(countT)));
      const pulse = ignition ? 1 : 0.78 + Math.sin(clock * 0.1) * 0.12;
      ctx.shadowColor = "rgba(255,140,40,0.9)";
      ctx.shadowBlur = reduceMotion ? 0 : 28;
      ctx.fillStyle = `rgba(255,236,210,${pulse})`;
      ctx.font = `600 ${Math.round(cssW * (ignition ? 0.068 : 0.2))}px ${mono}`;
      ctx.fillText(label, cssW * 0.5, cssH * 0.17);
      ctx.shadowBlur = 0;
      ctx.font = `500 ${Math.round(Math.max(11, cssW * 0.018))}px ${mono}`;
      ctx.fillStyle = "rgba(236,236,232,0.58)";
      ctx.fillText(spec().name.toUpperCase(), cssW * 0.5, cssH * 0.17 + (ignition ? 28 : 46));
    }

    ctx.restore();
  }

  function formatT(sec) {
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    const whole = Math.floor(s);
    const frac = (s - whole).toFixed(1).slice(1);
    return `T+ ${m}:${String(whole).padStart(2, "0")}${frac}`;
  }

  function updateHud() {
    if(stack){const s=spec(),remaining=s.climb-tPlay,open=(state==='boost'||state==='window')&&tPlay>=s.climb&&tPlay<=s.climb+s.window;
    arcade.telemetry({primary:open?'OPEN · '+Math.max(0,s.climb+s.window-tPlay).toFixed(1)+'s':remaining>0?'In '+remaining.toFixed(1)+'s':'Closed',secondary:(stack.angle*180/Math.PI).toFixed(1)+'° / '+(s.stageAngle*180/Math.PI).toFixed(0)+'° limit',state:state==='pause'?'Paused':state==='count'?'Countdown':state==='boost'?'Climbing':state==='window'?'STAGE NOW':state==='sep'?'Separation':state==='success'||state==='complete'?'Complete':'Ready',guidance:open?'Stage now. The midpoint gives the best timing score.':Math.abs(stack.angle)>s.stageAngle*.75?'Counter the lean before ignition. Short taps are enough.':'Keep the stack level, then watch for the ignition window.',sound:muted?'Sound off':'Sound on'});}

    if (!stack) return;
    const s = spec();
    const showCue = (state === "window" || state === "attract") && windowOpen() && stack.alive;
    if (cue) cue.hidden = !showCue;
    if (cueLabel) cueLabel.textContent = "Stage";
    if (cueClock) cueClock.textContent = "";
    if (!hud || hud.hidden) return;
    if (hudFlight) hudFlight.textContent = s.name;
    if (hudClock) {
      hudClock.textContent = state === "count" ? `T- ${countT.toFixed(1)}` : formatT(T0 + tPlay);
    }
    if (hudAlt) hudAlt.textContent = `${stack.alt.toFixed(1)} km`;
    if (hudScore) hudScore.textContent = score.toLocaleString();
  }

  function followCam() {
    const sep = state === "sep" || state === "attract-sep" || (state === "success" && sepT > 0);
    let wantZoom = 1;
    if (state === "count") wantZoom = 1.14;
    else if (state === "window") wantZoom = 1.12;
    else if (sep) wantZoom = 1.04 + ease(sepT) * 0.08;
    else if ((state === "fail" || state === "attract-hold") && stack && !stack.alive) wantZoom = stack.broken ? 0.9 : 1.04;
    cam.zoom = lerp(cam.zoom + cam.punch, wantZoom, 0.08);
    cam.punch *= 0.84;
    cam.x = lerp(cam.x, -(stack?.x || 0) * 0.18, 0.06);
    const e = sep ? ease(sepT) : 0;
    const wantY = state === "count" ? 16 : sep ? e * 250 * viewScale() * 0.86 : 0;
    cam.y = lerp(cam.y, wantY, 0.08);
  }

  function frame(now) {
    if(!last)last=now;const elapsed=Math.max(0,Math.min(100,now-last));last=now;
    timeScale+=(slowTarget-timeScale)*0.15;if(callout.t>0)callout.t-=elapsed;
    if(state!=="pause" && !document.hidden){accumulator+=performance.now()<freezeUntil?0:elapsed*timeScale;while(accumulator>=1000/60){const dt=1000/60;clock+=dt;step(dt);slowTarget=(!reduced&&!demo&&state==="window")?0.62:1;stepParticles();stepFx(dt);followCam();shake*=.86;flash*=.9;accumulator-=dt;}}
    else accumulator=0;
    if(reduced){shake=0;flash=0;}
    drawWorld(canvas.getContext("2d"));updateHud();requestAnimationFrame(frame);
  }

  function bindHold(el, key) {
    padButtons[key] = el;
    const down = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      padPointers.set(e.pointerId, key);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort on older WebViews */
      }
      setHeld(key, true);
      if (key === "stage") {
        if (state === "attract" || state === "attract-hold" || state === "fail" || state === "success") startPlay();
        else tryStage();
      }
    };
    const up = (e) => {
      releasePointer(e.pointerId);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener('click', e=>{if(e.detail!==0)return;if(key==='stage'){tryStage();return;}setHeld(key,true);setTimeout(()=>setHeld(key,false),180);});
  }

  document.querySelectorAll("[data-hold]").forEach((el) => {
    bindHold(el, el.getAttribute("data-hold"));
  });

  const pad = document.querySelector("[data-staging-pad]");
  pad?.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("pointerup", (e) => releasePointer(e.pointerId));
  window.addEventListener("pointercancel", (e) => releasePointer(e.pointerId));
  window.addEventListener("blur", clearAllHolds);
  window.addEventListener(
    "touchend",
    (e) => {
      if (e.touches.length === 0) {
        padPointers.clear();
        setHeld("left", false);
        setHeld("right", false);
        setHeld("stage", false);
      }
    },
    { passive: true }
  );

  const keyMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    a: "left",
    d: "right",
    A: "left",
    D: "right",
    " ": "stage",
    ArrowDown: "throttle",
    s: "throttle",
    S: "throttle",
  };

  function startPlayResume() {
    if (state === "pause") {
      hideOverlay();
      if (["count","sep"].includes(pausedFrom)) state = pausedFrom;
      else state = tPlay >= spec().climb ? "window" : "boost";
      if (hud) hud.hidden = false;
      accumulator=0;last=0;arcade.focus();
      return;
    }
    startPlay();
  }

  function typingInField(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return Boolean(el.closest?.("input, textarea, select, [contenteditable='true'], [data-staging-name]"));
  }

  function typingNow(e) {
    if (keysLocked) return true;
    if (e?.isComposing || e?.keyCode === 229) return true;
    if (nameInput && document.activeElement === nameInput) return true;
    if (typingInField(e?.target) || typingInField(document.activeElement)) return true;
    return false;
  }

  window.addEventListener("keydown", (e) => {
    if (typingNow(e) || e.target?.closest?.("button,a,summary")) return;
    if (e.key === "p" || e.key === "P") {
      if (state === "boost" || state === "window" || state === "count") {
        pausedFrom = state;
        state = "pause";
        setEngine(0);
        showOverlay("Paused", "Hold", "The stack is waiting on the climb.", "Resume");
      } else if (state === "pause") startPlayResume();
      return;
    }
    if (e.key === "m" || e.key === "M") {
      ensureAudio();
      setMuted(!muted);
      return;
    }
    if ((e.key === "r" || e.key === "R") && (state === "fail" || state === "success" || state === "complete")) {
      startPlay();
      return;
    }
    const mapped = keyMap[e.key];
    if (!mapped) return;
    if (mapped === "throttle" && !(dyn && (state === "count" || state === "boost" || state === "window"))) return;
    e.preventDefault();
    setHeld(mapped, true);
    if (mapped === "stage") {
      if (
        state === "attract" ||
        state === "attract-hold" ||
        state === "ready" ||
        state === "fail" ||
        state === "success"
      ) {
        startPlay();
      } else tryStage();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (typingNow(e)) return;
    const mapped = keyMap[e.key];
    if (mapped) setHeld(mapped, false);
  });

  muteBtn?.addEventListener("click", () => {
    ensureAudio();
    setMuted(!muted);
  });

  playBtn?.addEventListener("click", () => {
    ensureAudio();
    if (state === "pause") startPlayResume();
    else startPlay();
  });

  canvas.addEventListener("pointerdown", () => {
    if (state === "attract" || state === "attract-hold") startPlay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearAllHolds();
      if (state === "boost" || state === "window" || state === "count") {
        pausedFrom = state;
        state = "pause";
        setEngine(0);
        showOverlay("Paused", "Hold", "The stack is waiting on the climb.", "Resume");
      }
    }
  });

  window.addEventListener("blur", ()=>{clearAllHolds();if(["count","boost","window","sep"].includes(state))arcadePause();});
  function arcadePause(){if(state==='pause')startPlayResume();else if(['count','boost','window','sep'].includes(state)){pausedFrom=state;clearAllHolds();state='pause';setEngine(0);showOverlay('Paused','Mission on hold.','Your launch is paused. Resume when you are ready.','Resume');}}
  const arcade=window.SDArcade.mount('staging',{autoFocus:true,reset(){demo=false;clearAllHolds();setEngine(0);beginAttract();},restart(){state='ready';startPlay();},pause:arcadePause,sound(){ensureAudio();setMuted(!muted);return muted;},demo(){startPlay();demo=true;auto=true;arcade.live('Autopilot demonstration. Watch the timing and attitude; no score will be saved.');}});
  window.addEventListener("resize", resize);
  resize();
  beginAttract();
  if (window.AljrBoard) {
    window.AljrBoard.onChange((id) => {
      if (id === GAME) renderBoard();
    });
    window.AljrBoard.load(GAME);
  }
  renderBoard();
  requestAnimationFrame(frame);

  window.StagingGame = {
    play: startPlay,
    mode: () => arcade.mode,
    restart: () => {state="ready";startPlay();},
    pause: arcadePause,
    demo: () => demo,
    currentSpec: spec,
    state: () => state,
    stack: () => stack,
    score: () => score,
    hold: () => ({ ...hold }),
    held: () => ({ ...held }),
    clearHolds: clearAllHolds,
    board: () => visibleBoard(),
    storedBoard: () => storedRows(),
    submitRun,
    renderBoard,
    muted: () => muted,
    load: () => load,
    gusts: () => gusts.map((g) => ({ t: g.t, dir: g.dir })),
    event: () => (evt ? { t: evt.t, done: evt.done } : null),
    keysLocked: () => keysLocked,
    typing: () => typingNow({}),
    spec,
    tPlay: () => tPlay,
    flight: () => flight,
    countT: () => countT,
    tryStage,
    audio: () =>
      audio
        ? { state: audio.state, muted, engine: Boolean(engine), voices: engine ? 7 : 0 }
        : null,
    autopilot(on) {
      auto = Boolean(on);
    },
  };
})();
 
