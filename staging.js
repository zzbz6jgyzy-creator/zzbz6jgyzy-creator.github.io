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

  const GAME = "staging";
  const STORE = "sd.arcade.staging.best.v2";
  const BOARD_STORE = "sd.arcade.staging.runs.v2";
  const NAME_STORE = "aljr.staging.name";
  const BOARD_MAX = 8;
  const T0 = 148;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const FLIGHTS = [
    { name: "Flight 7", climb: 8.8, window: 1.2, wind: 0.006, engineOut: 0, failAngle: 0.44, stageAngle: 0.2 },
    { name: "Flight 8", climb: 8.4, window: 1.1, wind: 0.009, engineOut: 0, failAngle: 0.42, stageAngle: 0.19 },
    { name: "Flight 10", climb: 7.9, window: 1.0, wind: 0.012, engineOut: 1, failAngle: 0.4, stageAngle: 0.18 },
    { name: "Flight 11", climb: 7.4, window: 0.92, wind: 0.014, engineOut: 2, failAngle: 0.4, stageAngle: 0.175 },
  ];

  const HOLD_RISE = 0.0036;
  const HOLD_FALL = 0.006;
  const GIMBAL = 0.00028;
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

  const held = { left: false, right: false, stage: false };
  const hold = { left: 0, right: 0, stage: 0 };
  const padPointers = new Map();
  const padButtons = {};
  const cam = { x: 0, y: 0, zoom: 1, punch: 0 };
  const stars = [];
  const flakes = [];
  const particles = [];

  let dpr = 1;
  let cssW = 800;
  let cssH = 500;
  let state = "attract";
  let flight = 0;
  let score = 0;
  let best = Number(window.SDArcade.storage.getItem(STORE) || 0);
  let muted = true;
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
      tw: rand(0.004, 0.02),
    });
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
    };
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
    hold.left = 0;
    hold.right = 0;
    hold.stage = 0;
  }

  function showOverlay(kicker, title, copy, action) {
    if (!overlay) return;
    overlay.hidden = false;
    clearAllHolds();
    if (overlayKicker) overlayKicker.textContent = kicker;
    if (overlayTitle) overlayTitle.textContent = title;
    if (overlayCopy) overlayCopy.textContent = copy;
    if (playBtn) playBtn.textContent = action;
  }

  function hideOverlay() {
    if (overlay) overlay.hidden = true;
  }

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
    master.connect(audio.destination);
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
    ensureAudio();
    if (audio && audio.state === "suspended") audio.resume();
    demo=false;clearAllHolds();accumulator=0;last=0;
    const fromSuccess = state === "success";
    if (!fromSuccess) {
      const c=arcade.loadCheckpoint();score=c.score;flight=c.flight;
    } else {
      flight += 1;
    }
    resetStack(false);
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
    stack.alive = false;
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
    if(!demo)arcade.record({score,missions:flight,complete:false,medal:flight>=2?'silver':'bronze',title:'Launch review',copy:kind==='early'?'You fired before the ignition window opened. Wait for the Stage cue.':kind==='late'?'The ignition window expired. Stage as soon as the cue appears; aim for its midpoint.':kind==='walk'?'The stack leaned too far. Use shorter counter-steering taps and monitor the attitude instrument.':'The stack was too tilted at ignition. Level it before staging. Campaign retries preserve your checkpoint.'});
    arcade.live('Launch ended. Read the debrief, then retry your mission.');
    submitRun();
    sfxFail(kind);
    const titles = {
      walk: "Walked",
      early: "Early light",
      late: "Window closed",
      rud: "RUD",
    };
    const lines = {
      walk: "The stack leaned past recover. Super Heavy does not forgive a walk.",
      early: "Ship lit in the dark. The booster bells were still in the way.",
      late: "The window closed. One vehicle, too long, still stacked.",
      rud: "Tilted in the fire. The bells ate each other.",
    };
    showOverlay("No stage", titles[kind] || "RUD", lines[kind] || lines.rud, "Try again");
    if (cue) cue.hidden = true;
  }

  function beginSep() {
    if (state !== "boost" && state !== "window" && state !== "attract") return;
    state = state === "attract" ? "attract-sep" : "sep";
    sepT = 0;
    shock = 0.02;
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
    const gained = Math.round(1000 + timing * 420 + upright * 300 + flight * 130 + (perfect ? 260 : 0));
    score += gained;
    if (!demo && score > best) setBest(score);
    const limit=arcade.mode==='daily'?3:arcade.mode==='training'?1:6,complete=flight+1>=limit;
    if(demo){state='complete';score=0;showOverlay('Training demonstration','Now you try.','Counter the drift, watch for the cue, then stage near the middle of the window. Demonstrations do not save scores.','Take the controls');return;}
    state=complete?'complete':'success';
    arcade.checkpoint(complete?0:flight+1,complete?0:score);
    arcade.record({score,missions:flight+1,complete,medal:perfect?'gold':timing>.45?'silver':'bronze',title:complete?'Mission set complete':'Separation confirmed',copy:'Timing '+Math.round(timing*100)+'% · attitude '+Math.round(upright*100)+'%. '+(complete?'Bring that precision to another mode.':'Your next campaign checkpoint is saved.')});
    arcade.live(complete?'Mission set complete. Your score is saved.':'Separation confirmed. Advance to your next mission.');
    renderBoard();
    showOverlay(
      s.name,
      complete ? "Mission complete" : perfect ? "Clean light" : "Hot stage",
      `Ship is flying. +${gained.toLocaleString()}  ·  Run ${score.toLocaleString()}`,
      complete ? "Fly again" : "Next mission"
    );
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
    stack.av += steer * gimbal * dt;
    if (wind) {
      stack.av += (s.wind * windGust * WIND_AV + stack.outBias * s.engineOut * ENGINE_AV) * dt;
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
    applyAttitude(dt);

    stack.vx += Math.sin(stack.angle) * 0.0034 * dt + s.wind * windGust * 0.0011 * dt;
    stack.vx *= Math.pow(0.994, dt * 0.06);
    stack.x += stack.vx * dt * 0.06;
    stack.x = clamp(stack.x, -86, 86);
    stack.alt += stack.vy * dt * 0.00105;
    tPlay += dt / 1000;

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

  function stepParticles() {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.kind === "smoke" ? 0.012 : 0.04;
      p.vx *= p.kind === "smoke" ? 0.985 : 0.995;
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
    if (particles.length > 240) particles.splice(0, particles.length - 240);
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

  function drawStack(ctx, originX, originY, scale) {
    const night = spaceT();
    const lod = clamp(scale, 0, 1.4);
    const flicker = stack.alive ? 0.84 + Math.sin(clock * 0.08) * 0.16 : 0;
    const sep = state === "sep" || state === "attract-sep" || (state === "success" && sepT > 0);
    ctx.save();
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);
    ctx.rotate(stack.angle);

    if (!sep || sepT < 0.98) {
      const spool = state === "count" ? ignite : 1;
      if (stack.alive && (!stack.shipLit || sepT < 0.35) && spool > 0.04) {
        drawBoosterPlume(ctx, flicker * spool);
      }
      drawBooster(ctx, lod, night, sep ? stack.boostOff : 0);
    }
    if (sep) {
      drawHotRing(ctx, 1, -80 + sepT * 10);
      if (stack.shipLit) {
        ctx.save();
        ctx.translate(0, -138 - stack.shipOff);
        drawShipPlume(ctx, flicker);
        ctx.restore();
      }
      drawShipBody(ctx, lod, night, -138 - stack.shipOff, stack.shipLit);
    } else {
      drawHotRing(ctx, heatAmt(), -80);
      if (state === "window" && stack.alive) drawWindowTimer(ctx, -80);
      drawShipBody(ctx, lod, night, -138, false);
    }

    flakes.forEach((f) => {
      ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
      ctx.fillStyle = "#e8e4dc";
      ctx.fillRect(f.x - stack.x, f.y, f.size, f.size);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawEarth(ctx) {
    const space = spaceT();
    const r = Math.max(cssW, cssH) * 1.55;
    const cx = cssW * 0.5 + (stack?.x || 0) * 0.08;
    const cy = cssH + r * 0.72 - space * cssH * 0.18;
    ctx.save();
    const ocean = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.55, r * 0.1, cx, cy, r);
    ocean.addColorStop(0, rgb(mix(96, 36, space), mix(140, 64, space), mix(190, 110, space)));
    ocean.addColorStop(0.4, rgb(mix(36, 14, space), mix(72, 32, space), mix(120, 70, space)));
    ocean.addColorStop(1, "#081018");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = ocean;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = `rgba(40,70,42,${0.28 - space * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.28, cy - r * 0.62, r * 0.22, r * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.18, cy - r * 0.55, r * 0.16, r * 0.05, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(230,230,236,${0.16 + space * 0.04})`;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(i * 1.7) * r * 0.35, cy - r * 0.58 + i * 10, r * 0.18, 7, i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const halo = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.08);
    halo.addColorStop(0, "rgba(140,190,255,0)");
    halo.addColorStop(0.45, `rgba(140,200,255,${0.42 + space * 0.18})`);
    halo.addColorStop(1, "rgba(80,140,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
    ctx.fill();
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
    const sunY = cssH * 0.18;
    const sun = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, cssW * 0.7);
    sun.addColorStop(0, `rgba(255,228,190,${0.55 - space * 0.15})`);
    sun.addColorStop(0.08, `rgba(255,170,80,${0.16})`);
    sun.addColorStop(0.4, `rgba(255,90,40,${0.05})`);
    sun.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = `rgba(255,240,210,${0.85})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    stars.forEach((st) => {
      const tw = 0.7 + Math.sin(clock * st.tw) * 0.3;
      ctx.globalAlpha = st.a * (0.08 + space * 0.85) * tw;
      ctx.fillStyle = st.r > 1.1 ? "#fff4d4" : "#d8e4ff";
      ctx.beginPath();
      ctx.arc(st.x * cssW, st.y * cssH * 0.72, st.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    drawEarth(ctx);

    const ox = (shake ? rand(-shake, shake) : 0) + cam.x;
    const oy = (shake ? rand(-shake, shake) : 0) + cam.y;
    const portrait = cssH > cssW * 1.05;
    const base = Math.min(cssW / 340, cssH / (portrait ? 430 : 400));
    const scale = base * cam.zoom * (portrait ? 0.94 : 1);
    const lookY =
      state === "sep" || state === "attract-sep" || (state === "success" && sepT > 0)
        ? -96 + sepT * 6
        : state === "count"
          ? -30
          : -52;
    const originX = cssW * 0.5 + (stack?.x || 0) * 0.45 + ox;
    const originY = cssH * 0.5 - lookY * scale + oy + Math.sin(clock * 0.012) * 1.2;

    particles.forEach((p) => {
      if (p.kind !== "spark") return;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(originX + p.x * scale, originY + p.y * scale, p.size * scale * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (stack) drawStack(ctx, originX, originY, scale);

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
      if (p.kind === "spark") return;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.5;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(originX + p.x * scale, originY + p.y * scale, p.size * scale, 0, Math.PI * 2);
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

    drawCallouts(ctx);
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

    if (state === "boost" && stack.alive) {
      const left = spec().climb - tPlay;
      if (left <= 3.2 && left > 0) {
        ctx.shadowColor = "rgba(255,90,20,0.7)";
        ctx.shadowBlur = reduceMotion ? 0 : 16;
        ctx.fillStyle = "rgba(255,214,150,0.95)";
        ctx.font = `600 ${Math.round(cssW * 0.048)}px ${mono}`;
        ctx.fillText(`STAGE IN ${left.toFixed(1)}`, cssW * 0.5, cssH * 0.155);
        ctx.shadowBlur = 0;
      }
    }

    if (state === "window" && stack.alive) {
      const s = spec();
      const left = Math.max(0, s.climb + s.window - tPlay);
      const frac = clamp(left / s.window, 0, 1);
      const cx = cssW * 0.5;
      const cy = Math.max(36, cssH * 0.08);
      const r = Math.max(28, cssW * 0.038);
      ctx.strokeStyle = "rgba(255,180,80,0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,210,130,0.95)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.fillStyle = "#ffe7c2";
      ctx.font = `600 ${Math.round(cssW * 0.032)}px ${mono}`;
      ctx.fillText("STAGE", cx, cy - 1);
      ctx.font = `500 ${Math.round(cssW * 0.02)}px ${mono}`;
      ctx.fillStyle = "rgba(255,230,190,0.86)";
      ctx.fillText(left.toFixed(1), cx, cy + r * 0.42);
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
    if(stack){const s=spec(),remaining=s.climb-tPlay,open=tPlay>=s.climb&&tPlay<=s.climb+s.window;
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
    else if (state === "window") wantZoom = 1.1;
    else if (sep) wantZoom = 1.02 + sepT * 0.1;
    cam.zoom = lerp(cam.zoom + cam.punch, wantZoom, 0.08);
    cam.punch *= 0.84;
    cam.x = lerp(cam.x, -(stack?.x || 0) * 0.18, 0.06);
    const wantY = state === "count" ? 16 : sep ? -(stack?.shipOff || 0) * 0.2 : 0;
    cam.y = lerp(cam.y, wantY, 0.08);
  }

  function frame(now) {
    if(!last)last=now;const elapsed=Math.max(0,Math.min(100,now-last));last=now;
    if(state!=="pause" && !document.hidden){accumulator+=elapsed;while(accumulator>=1000/60){const dt=1000/60;clock+=dt;step(dt);stepParticles();followCam();shake*=.86;flash*=.9;accumulator-=dt;}}
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
      muted = !muted;
      applyMute();
      return;
    }
    const mapped = keyMap[e.key];
    if (!mapped) return;
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
    muted = !muted;
    applyMute();
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
  const arcade=window.SDArcade.mount('staging',{reset(){demo=false;clearAllHolds();setEngine(0);beginAttract();},restart(){state='ready';startPlay();},pause:arcadePause,sound(){ensureAudio();muted=!muted;applyMute();return muted;},demo(){startPlay();demo=true;auto=true;arcade.live('Autopilot demonstration. Watch the timing and attitude; no score will be saved.');}});
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
 
