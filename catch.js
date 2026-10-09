(() => {
  const canvas = document.querySelector("[data-catch-canvas]");
  const stage = document.querySelector("[data-catch-stage]");
  const overlay = document.querySelector("[data-catch-overlay]");
  const hud = document.querySelector("[data-catch-hud]");
  if (!canvas || !stage) return;

  const overlayKicker = document.querySelector("[data-overlay-kicker]");
  const overlayTitle = document.querySelector("[data-overlay-title]");
  const overlayCopy = document.querySelector("[data-overlay-copy]");
  const playBtn = document.querySelector("[data-catch-play]");
  const bestEl = document.querySelector("[data-catch-best]");
  const hudFlight = document.querySelector("[data-hud-flight]");
  const hudFuel = document.querySelector("[data-hud-fuel]");
  const hudSpeed = document.querySelector("[data-hud-speed]");
  const hudScore = document.querySelector("[data-hud-score]");
  const boardList = document.querySelector("[data-board-list]");
  const boardNow = document.querySelector("[data-board-now]");
  const nameInput = document.querySelector("[data-catch-name]");
  const muteBtn = document.querySelector("[data-catch-mute]");

  const STORE = "aljr.catch.best";
  const BOARD_STORE = "aljr.catch.board";
  const NAME_STORE = "aljr.catch.name";
  const BOARD_MAX = 8;
  const WORLD_W = 1000;
  const GROUND = 860;
  const SHORE = 340;
  const TOWER_X = 720;
  const ARM_Y = 640;
  const CATCH_X = TOWER_X - 96;

  const FLIGHTS = [
    { name: "Flight 1", wind: 0, fuel: 100, gap: 46, catchVy: 2.35, night: 0 },
    { name: "Flight 2", wind: 0.007, fuel: 88, gap: 40, catchVy: 2.05, night: 0.28 },
    { name: "Flight 3", wind: 0.012, fuel: 78, gap: 34, catchVy: 1.8, night: 0.55 },
    { name: "Flight 4", wind: 0.018, fuel: 70, gap: 30, catchVy: 1.6, night: 0.8 },
  ];

  const held = { left: false, right: false, thrust: false };
  const hold = { left: 0, right: 0, thrust: 0 };
  const padPointers = new Map();
  const padButtons = {};
  const cam = { x: 120, y: 40 };
  const stars = [];
  const clouds = [];
  const particles = [];

  let dpr = 1;
  let cssW = 800;
  let cssH = 500;
  let viewW = 640;
  let viewH = 500;
  let state = "attract";
  let flight = 0;
  let score = 0;
  let best = Number(localStorage.getItem(STORE) || 0);
  let muted = false;
  let audio;
  let engine = null;
  let wasBurning = false;
  let freshId = "";
  let last = 0;
  let shake = 0;
  let flash = 0;
  let result = "";
  let auto = true;
  let ship;
  let windGust = 0;
  let clock = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;

  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: Math.random() * WORLD_W,
      y: Math.random() * (GROUND - 220),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.7 + 0.15,
    });
  }

  for (let i = 0; i < 4; i += 1) {
    clouds.push({
      x: rand(40, WORLD_W - 40),
      y: rand(260, 520),
      w: rand(140, 260),
      h: rand(6, 11),
      a: rand(0.04, 0.09),
    });
  }

  function spec() {
    const base = FLIGHTS[Math.min(flight, FLIGHTS.length - 1)];
    if (flight < FLIGHTS.length) return { ...base };
    const extra = flight - FLIGHTS.length + 1;
    return {
      name: `Flight ${flight + 1}`,
      wind: 0.02 + extra * 0.004,
      fuel: Math.max(56, 70 - extra * 3),
      gap: Math.max(26, 30 - extra),
      catchVy: Math.max(1.35, 1.6 - extra * 0.05),
      night: 0.85,
    };
  }

  function resetShip(autopilot) {
    const s = spec();
    auto = autopilot;
    windGust = 0;
    ship = {
      x: 390 + rand(-28, 36),
      y: 210 + rand(-10, 14),
      vx: rand(-0.18, 0.24),
      vy: 0.2,
      angle: rand(-0.08, 0.08),
      av: 0,
      fuel: s.fuel,
      w: 24,
      h: 136,
      thrusting: false,
      alive: true,
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
    setHeld("thrust", false);
    hold.left = 0;
    hold.right = 0;
    hold.thrust = 0;
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
    localStorage.setItem(STORE, String(n));
    if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;
  }

  if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;

  function callsign() {
    const raw = (nameInput?.value || localStorage.getItem(NAME_STORE) || "Pilot").trim();
    return (raw || "Pilot").slice(0, 12);
  }

  function loadBoard() {
    try {
      const raw = JSON.parse(localStorage.getItem(BOARD_STORE) || "[]");
      return Array.isArray(raw) ? raw.filter((row) => row && typeof row.score === "number") : [];
    } catch {
      return [];
    }
  }

  function saveBoard(rows) {
    localStorage.setItem(BOARD_STORE, JSON.stringify(rows.slice(0, BOARD_MAX)));
  }

  function visibleBoard() {
    const stored = loadBoard();
    const live =
      score > 0 && (state === "fly" || state === "caught" || state === "pause")
        ? [
            {
              id: "live",
              name: callsign(),
              score,
              flights: flight + 1,
              live: true,
            },
          ]
        : [];
    return [...stored, ...live].sort((a, b) => b.score - a.score || (a.live ? -1 : 1)).slice(0, BOARD_MAX);
  }

  function renderBoard() {
    if (boardNow) {
      boardNow.textContent =
        state === "fly" || state === "caught" || state === "pause"
          ? `This run  ·  ${score.toLocaleString()}  ·  ${spec().name}`
          : "This run  ·  on the pad";
    }
    if (!boardList) return;
    boardList.replaceChildren();
    const rows = visibleBoard();
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "is-empty";
      empty.textContent = "No catches on this pad yet.";
      boardList.append(empty);
      return;
    }
    rows.forEach((row, i) => {
      const li = document.createElement("li");
      if (row.live) li.classList.add("is-live");
      if (row.id && row.id === freshId) li.classList.add("is-fresh");
      const rank = document.createElement("span");
      rank.className = "catch-board-rank";
      rank.textContent = String(i + 1);
      const who = document.createElement("span");
      who.className = "catch-board-who";
      who.textContent = row.live ? `${row.name} · live` : row.name;
      const pts = document.createElement("span");
      pts.className = "catch-board-pts";
      pts.textContent = row.score.toLocaleString();
      li.append(rank, who, pts);
      boardList.append(li);
    });
  }

  function submitRun() {
    if (score <= 0) {
      renderBoard();
      return;
    }
    const rows = loadBoard();
    const entry = {
      id: `${Date.now()}-${score}`,
      name: callsign(),
      score,
      flights: flight + 1,
      at: Date.now(),
    };
    rows.push(entry);
    rows.sort((a, b) => b.score - a.score || a.at - b.at);
    saveBoard(rows);
    freshId = entry.id;
    if (score > best) setBest(score);
    renderBoard();
  }

  if (nameInput) {
    const savedName = localStorage.getItem(NAME_STORE);
    if (savedName) nameInput.value = savedName.slice(0, 12);
    nameInput.addEventListener("input", () => {
      localStorage.setItem(NAME_STORE, callsign());
      renderBoard();
    });
  }

  if (!loadBoard().length && best > 0) {
    saveBoard([{ id: "best", name: callsign(), score: best, flights: 1, at: Date.now() }]);
  }

  function makeNoise(ctx, seconds, color) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  function applyMute() {
    if (!audio?.master) return;
    audio.master.gain.setTargetAtTime(muted ? 0 : 0.82, audio.currentTime, 0.04);
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
    master.gain.value = muted ? 0 : 0.82;
    master.connect(audio.destination);
    audio.master = master;

    const brown = audio.createBufferSource();
    brown.buffer = makeNoise(audio, 2.4, "brown");
    brown.loop = true;
    const noiseFilter = audio.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 160;
    noiseFilter.Q.value = 0.65;
    const noiseGain = audio.createGain();
    noiseGain.gain.value = 0;
    brown.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    const hissSrc = audio.createBufferSource();
    hissSrc.buffer = makeNoise(audio, 1.6, "white");
    hissSrc.loop = true;
    const hissFilter = audio.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 1800;
    hissFilter.Q.value = 0.7;
    const hissGain = audio.createGain();
    hissGain.gain.value = 0;
    hissSrc.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(master);

    const oscA = audio.createOscillator();
    oscA.type = "sawtooth";
    oscA.frequency.value = 36;
    const oscB = audio.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = 49.5;
    const oscFilter = audio.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.value = 88;
    const oscGain = audio.createGain();
    oscGain.gain.value = 0;
    oscA.connect(oscFilter);
    oscB.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);

    const windSrc = audio.createBufferSource();
    windSrc.buffer = makeNoise(audio, 2, "white");
    windSrc.loop = true;
    const windFilter = audio.createBiquadFilter();
    windFilter.type = "highpass";
    windFilter.frequency.value = 700;
    const windGain = audio.createGain();
    windGain.gain.value = 0.012;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);

    brown.start();
    hissSrc.start();
    oscA.start();
    oscB.start();
    windSrc.start();

    engine = { noiseGain, noiseFilter, hissGain, oscGain, oscFilter, oscA, oscB, windGain, master };
    applyMute();
  }

  function setEngine(amount) {
    if (!engine) return;
    const t = audio.currentTime;
    const a = muted ? 0 : clamp(amount, 0, 1);
    engine.noiseGain.gain.setTargetAtTime(a * 0.14, t, 0.045);
    engine.hissGain.gain.setTargetAtTime(a * 0.04, t, 0.03);
    engine.oscGain.gain.setTargetAtTime(a * 0.05, t, 0.05);
    engine.noiseFilter.frequency.setTargetAtTime(150 + a * 520, t, 0.08);
    engine.oscFilter.frequency.setTargetAtTime(80 + a * 70, t, 0.08);
    engine.oscA.frequency.setTargetAtTime(34 + a * 10, t, 0.1);
    engine.oscB.frequency.setTargetAtTime(47 + a * 8, t, 0.1);
  }

  function setRumble(on) {
    const amt = on ? clamp(Math.max(hold.thrust, held.thrust ? 0.42 : 0.2), 0, 1) : 0;
    setEngine(amt);
  }

  function tone(freq, end, gain, dur, type) {
    if (!audio || muted) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), audio.currentTime + dur);
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    o.connect(g);
    g.connect(audio.master);
    o.start();
    o.stop(audio.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, freq, gain, q) {
    if (!audio || muted) return;
    const src = audio.createBufferSource();
    src.buffer = makeNoise(audio, Math.max(0.08, dur), "white");
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, audio.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.25), audio.currentTime + dur);
    filter.Q.value = q || 0.6;
    const g = audio.createGain();
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(audio.master);
    src.start();
    src.stop(audio.currentTime + dur + 0.02);
  }

  function sfxIgnite() {
    if (!audio || muted) return;
    noiseBurst(0.12, 1400, 0.07, 0.8);
    tone(90, 48, 0.05, 0.16, "sine");
  }

  function sfxCatch() {
    if (!audio || muted) return;
    tone(62, 34, 0.16, 0.32, "sine");
    tone(190, 70, 0.06, 0.22, "triangle");
    tone(620, 210, 0.035, 0.18, "square");
    noiseBurst(0.28, 2400, 0.045, 0.9);
  }

  function sfxFail(kind) {
    if (!audio || muted) return;
    if (kind === "splash") {
      noiseBurst(0.5, 900, 0.12, 0.5);
      tone(110, 36, 0.07, 0.38, "triangle");
      return;
    }
    if (kind === "tower") {
      tone(150, 48, 0.12, 0.28, "sawtooth");
      tone(420, 90, 0.05, 0.2, "square");
      noiseBurst(0.22, 700, 0.09, 0.7);
      return;
    }
    noiseBurst(0.55, 380, 0.2, 0.45);
    tone(78, 22, 0.16, 0.42, "sine");
    tone(210, 40, 0.05, 0.24, "sawtooth");
  }

  function blip(kind) {
    if (kind === "catch") sfxCatch();
    else sfxFail(result || kind);
  }

  function burst(x, y, n, color, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.4, speed);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(18, 42),
        max: 42,
        size: rand(1.2, 3.4),
        color,
        kind: "spark",
      });
    }
  }

  function startPlay() {
    ensureAudio();
    if (audio && audio.state === "suspended") audio.resume();
    score = state === "caught" ? score : 0;
    if (state !== "caught") flight = 0;
    else flight += 1;
    resetShip(false);
    state = "fly";
    result = "";
    hideOverlay();
    if (hud) hud.hidden = false;
    wasBurning = false;
    renderBoard();
  }

  function beginAttract() {
    flight = 0;
    resetShip(true);
    state = "attract";
    if (hud) hud.hidden = true;
    showOverlay(
      "Starbase",
      "Catch the Ship",
      "Tap to nudge, hold to bank. Hold throttle to kill speed. Get the pins onto the arms — not the ocean, not the tower.",
      "Play"
    );
    renderBoard();
  }

  function fail(kind) {
    if (state !== "fly" && state !== "attract") return;
    ship.alive = false;
    setRumble(false);
    shake = 14;
    flash = 1;
    burst(ship.x, ship.y + ship.h * 0.3, 42, "#ff7a2a", 4.2);
    burst(ship.x, ship.y, 18, "#e8e4dc", 2.4);
    if (state === "attract") {
      window.setTimeout(beginAttract, 1400);
      state = "attract-hold";
      return;
    }
    result = kind;
    state = "fail";
    submitRun();
    blip(kind);
    const lines = {
      splash: "The ocean again. The holy grail is still a catch.",
      rud: "Too fast, too tilted, or the pad. Rapid unscheduled disassembly.",
      tower: "The tower does not move. The Ship does.",
    };
    showOverlay("No catch", kind === "splash" ? "Splashdown" : kind === "tower" ? "Tower strike" : "RUD", lines[kind], "Try again");
  }

  function succeed() {
    if (state !== "fly" && state !== "attract") return;
    setRumble(false);
    const s = spec();
    const precision = clamp(1 - Math.abs(ship.x - CATCH_X) / 40, 0, 1);
    const soft = clamp(1 - Math.abs(ship.vy) / s.catchVy, 0, 1);
    const gained = Math.round(900 + ship.fuel * 7 + precision * 280 + soft * 220);
    shake = 7;
    flash = 0.45;
    burst(ship.x, ARM_Y, 28, "#f4d27a", 2.8);
    if (state === "attract") {
      window.setTimeout(beginAttract, 1600);
      state = "attract-hold";
      return;
    }
    score += gained;
    if (score > best) setBest(score);
    state = "caught";
    renderBoard();
    blip("catch");
    showOverlay(
      s.name,
      "Caught",
      `Pins on the arms. +${gained.toLocaleString()}  ·  Run ${score.toLocaleString()}`,
      "Next flight"
    );
  }

  function tiltCurve(t) {
    const x = clamp(t, 0, 1);
    return x * x;
  }

  function steerAuto() {
    const errX = ship.x - CATCH_X;
    const pinY = ship.y - 4;
    const alt = ARM_Y - pinY;
    const wantAngle = clamp(-errX * 0.0022 - ship.vx * 0.1, -0.16, 0.16);
    const errA = ship.angle - wantAngle;
    hold.left = errA > 0.012 ? clamp((errA - 0.01) / 0.1, 0, 1) : 0;
    hold.right = errA < -0.012 ? clamp((-errA - 0.01) / 0.1, 0, 1) : 0;
    const upright = Math.abs(ship.angle) < 0.2;
    const wantVy = alt > 280 ? 1.15 : alt > 120 ? 0.68 : alt > 22 ? 0.34 : 0.08;
    const wantThrust = ship.fuel > 1 && upright && (ship.vy > wantVy || (alt < 50 && Math.abs(errX) > 8 && ship.vy > 0.08));
    hold.thrust = wantThrust ? 1 : 0;
  }

  function emitExhaust() {
    const ex = ship.x + Math.sin(ship.angle) * (ship.h * 0.46);
    const ey = ship.y + Math.cos(ship.angle) * (ship.h * 0.46);
    if (Math.random() < 0.72) {
      particles.push({
        x: ex + rand(-5, 5),
        y: ey,
        vx: ship.vx * 0.18 + Math.sin(ship.angle) * rand(1.1, 2.4),
        vy: ship.vy * 0.18 + Math.cos(ship.angle) * rand(1.3, 3.1),
        life: rand(12, 24),
        max: 24,
        size: rand(1.6, 3.4),
        color: Math.random() > 0.4 ? "#ff8a2a" : "#ffd27a",
        kind: "spark",
      });
    }
    if (Math.random() < 0.45) {
      particles.push({
        x: ex + rand(-6, 6),
        y: ey + rand(4, 12),
        vx: rand(-0.25, 0.25) + ship.vx * 0.05,
        vy: rand(0.15, 0.55),
        life: rand(50, 90),
        max: 90,
        size: rand(4, 9),
        color: "rgba(92, 82, 72, 0.28)",
        kind: "smoke",
      });
    }
  }

  function step(dt) {
    const s = spec();
    if (auto && (state === "attract" || state === "fly")) steerAuto();
    if (state !== "fly" && state !== "attract") {
      setRumble(false);
      return;
    }

    windGust = lerp(windGust, rand(-s.wind, s.wind) * 28, 0.02);
    const wind = s.wind * 0.55 + windGust * 0.012;

    if (!(auto && (state === "attract" || state === "fly"))) {
      const rise = 0.0026;
      const fall = 0.0075;
      ["left", "right", "thrust"].forEach((k) => {
        hold[k] = held[k] ? Math.min(1, hold[k] + rise * dt) : Math.max(0, hold[k] - fall * dt);
      });
    }

    const steer = tiltCurve(hold.right) - tiltCurve(hold.left);
    ship.av += steer * 0.00022 * dt;
    if (Math.abs(steer) < 0.05) ship.av -= ship.angle * 0.000032 * dt;
    ship.av *= Math.pow(0.88, dt * 0.08);
    ship.angle = clamp(ship.angle + ship.av * dt, -0.52, 0.52);

    const burning = (held.thrust || hold.thrust > 0.08) && ship.fuel > 0;
    ship.thrusting = burning;
    if (burning) {
      ship.fuel = Math.max(0, ship.fuel - 0.0075 * dt);
      const thrust = 0.0052 * dt;
      ship.vx += Math.sin(ship.angle) * thrust;
      ship.vy -= Math.cos(ship.angle) * thrust;
      emitExhaust();
    }
    if (burning && !wasBurning && state === "fly") sfxIgnite();
    wasBurning = Boolean(burning && state === "fly");
    setRumble(burning && state === "fly");

    ship.vy += 0.00185 * dt;
    ship.vx += wind * dt * 0.06;
    ship.vx *= Math.pow(0.9992, dt);
    ship.x += ship.vx * dt * 0.06;
    ship.y += ship.vy * dt * 0.06;

    const nose = ship.y - ship.h * 0.48;
    const tail = ship.y + ship.h * 0.48;
    const pinY = ship.y - 4;
    const half = s.gap * 0.5;
    const armLeft = TOWER_X - 168;
    const overArms = ship.x > armLeft + 22 && ship.x < TOWER_X - 36;
    const inSlot = pinY > ARM_Y - half + 2 && pinY < ARM_Y + half - 2;
    const upright = Math.abs(ship.angle) < 0.26;
    const soft = Math.abs(ship.vy) < s.catchVy + 0.25 && Math.abs(ship.vx) < 1.7;

    if (overArms && inSlot && upright && soft && tail < GROUND - 8) {
      ship.vx *= 0.35;
      ship.vy *= 0.15;
      ship.av *= 0.2;
      ship.angle *= 0.7;
      ship.x = lerp(ship.x, CATCH_X, 0.2);
      succeed();
      return;
    }

    if (ship.x > TOWER_X - 16 && ship.x < TOWER_X + 24 && tail > ARM_Y - 240 && nose < GROUND - 4) {
      fail("tower");
      return;
    }

    if (overArms && !soft && ((pinY < ARM_Y - half + 3 && tail > ARM_Y - half - 8) || (nose < ARM_Y + half + 8 && pinY > ARM_Y + half - 3)) && Math.abs(ship.vy) > s.catchVy + 0.9) {
      fail("rud");
      return;
    }

    if (tail >= GROUND - 2) {
      fail(ship.x < SHORE ? "splash" : "rud");
    }
  }

  function stepParticles() {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.kind === "smoke" ? 0.004 : 0.03;
      p.vx *= p.kind === "smoke" ? 0.99 : 1;
      p.life -= 1;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (particles.length > 160) particles.splice(0, particles.length - 160);
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    cssW = Math.max(320, rect.width);
    cssH = Math.max(280, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  function worldScale() {
    return cssW / viewW;
  }

  function updateView() {
    if (!ship) {
      viewW = 640;
      viewH = 500;
      return;
    }
    const alt = Math.max(0, ARM_Y - (ship.y - 4));
    const t = clamp(1 - (alt - 18) / 480, 0, 1);
    const e = t * t;
    viewW = lerp(560, 340, e);
    viewH = lerp(480, 240, e);
  }

  function mix(a, b, t) {
    return Math.round(lerp(a, b, t));
  }

  function rgb(r, g, b) {
    return `rgb(${r},${g},${b})`;
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

  function drawRaptor(ctx, x, y, scale, lit) {
    ctx.save();
    ctx.translate(x, y);
    const bell = ctx.createLinearGradient(-6 * scale, 0, 6 * scale, 0);
    bell.addColorStop(0, "#2a1c12");
    bell.addColorStop(0.28, "#7a4a28");
    bell.addColorStop(0.5, "#d4a060");
    bell.addColorStop(0.72, "#7a4a28");
    bell.addColorStop(1, "#22160e");
    ctx.fillStyle = bell;
    ctx.beginPath();
    ctx.moveTo(-3.1 * scale, -2 * scale);
    ctx.lineTo(-5.8 * scale, 9 * scale);
    ctx.quadraticCurveTo(0, 11.4 * scale, 5.8 * scale, 9 * scale);
    ctx.lineTo(3.1 * scale, -2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#140e0a";
    ctx.beginPath();
    ctx.ellipse(0, 8.4 * scale, 2.6 * scale, 1.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      const glow = ctx.createRadialGradient(0, 9 * scale, 0, 0, 9 * scale, 7 * scale);
      glow.addColorStop(0, "rgba(255,245,220,0.85)");
      glow.addColorStop(0.35, "rgba(255,170,70,0.35)");
      glow.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 9 * scale, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlume(ctx, h, flicker) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const outer = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.42 + 92);
    outer.addColorStop(0, `rgba(255,168,64,${0.42 * flicker})`);
    outer.addColorStop(0.4, `rgba(255,72,18,${0.22 * flicker})`);
    outer.addColorStop(1, "rgba(255,30,0,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(-13, h * 0.44);
    ctx.lineTo(13, h * 0.44);
    ctx.lineTo(Math.sin(clock * 0.045) * 6, h * 0.44 + 90);
    ctx.closePath();
    ctx.fill();

    [-7.2, 0, 7.2].forEach((ox, i) => {
      const len = 44 + i * 2;
      const core = ctx.createLinearGradient(ox, h * 0.43, ox, h * 0.43 + len);
      core.addColorStop(0, `rgba(255,255,245,${0.9 * flicker})`);
      core.addColorStop(0.18, `rgba(170,210,255,${0.55 * flicker})`);
      core.addColorStop(0.55, `rgba(255,170,70,${0.28 * flicker})`);
      core.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(ox - 3.2, h * 0.44);
      ctx.lineTo(ox + 3.2, h * 0.44);
      ctx.lineTo(ox + Math.sin(clock * 0.08 + i) * 1.8, h * 0.44 + len);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  function drawShip(ctx, lod) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    const h = ship.h;
    const w = ship.w;
    const flicker = ship.thrusting ? 0.86 + Math.sin(clock * 0.09) * 0.14 : 0;
    const night = spec().night;

    if (ship.thrusting) drawPlume(ctx, h, flicker);

    const flapSteel = ctx.createLinearGradient(0, 0, 0, 10);
    flapSteel.addColorStop(0, "#6a6458");
    flapSteel.addColorStop(1, "#2e2a24");
    ctx.fillStyle = flapSteel;
    drawFlap(ctx, -w * 0.46, h * 0.05, -18, 10, 3);
    drawFlap(ctx, w * 0.46, h * 0.05, 18, 10, 3);
    ctx.fillStyle = "#2a2620";
    drawFlap(ctx, -w * 0.46, h * 0.07, -15, 4, 2);
    drawFlap(ctx, w * 0.46, h * 0.07, 15, 4, 2);

    ctx.fillStyle = "#6a6458";
    drawFlap(ctx, -w * 0.4, -h * 0.27, -13, 6, -2);
    drawFlap(ctx, w * 0.4, -h * 0.27, 13, 6, -2);
    ctx.fillStyle = "#2a2620";
    drawFlap(ctx, -w * 0.4, -h * 0.255, -11, 2.4, -1);
    drawFlap(ctx, w * 0.4, -h * 0.255, 11, 2.4, -1);

    const specShift = clamp(0.4 + ship.angle * 0.28, 0.24, 0.62);
    const steel = ctx.createLinearGradient(-w * 0.55, 0, w * 0.55, 0);
    steel.addColorStop(0, "#1c1a16");
    steel.addColorStop(specShift - 0.14, "#4a463c");
    steel.addColorStop(specShift, night > 0.55 ? "#7a7468" : "#9a9284");
    steel.addColorStop(specShift + 0.08, "#5a564c");
    steel.addColorStop(1, "#24221c");
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.5);
    ctx.bezierCurveTo(w * 0.16, -h * 0.5, w * 0.48, -h * 0.36, w * 0.48, -h * 0.16);
    ctx.lineTo(w * 0.48, h * 0.33);
    ctx.quadraticCurveTo(w * 0.34, h * 0.47, 0, h * 0.49);
    ctx.quadraticCurveTo(-w * 0.34, h * 0.47, -w * 0.48, h * 0.33);
    ctx.lineTo(-w * 0.48, -h * 0.16);
    ctx.bezierCurveTo(-w * 0.48, -h * 0.36, -w * 0.16, -h * 0.5, 0, -h * 0.5);
    ctx.closePath();
    ctx.fill();

    if (lod > 0.2) {
      ctx.strokeStyle = "rgba(20,18,16,0.22)";
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.42);
      ctx.lineTo(0, h * 0.4);
      ctx.stroke();
      for (let i = 0; i < 11; i += 1) {
        const yy = -h * 0.2 + i * 7.6;
        ctx.beginPath();
        ctx.moveTo(-w * 0.47, yy);
        ctx.lineTo(w * 0.47, yy);
        ctx.stroke();
      }
    }

    const shield = ctx.createLinearGradient(-w * 0.5, 0, w * 0.02, 0);
    shield.addColorStop(0, "#16120e");
    shield.addColorStop(0.72, "#2c261e");
    shield.addColorStop(1, "rgba(30,26,20,0)");
    ctx.fillStyle = shield;
    ctx.beginPath();
    ctx.moveTo(-w * 0.48, -h * 0.18);
    ctx.lineTo(-w * 0.04, -h * 0.22);
    ctx.lineTo(-w * 0.04, h * 0.36);
    ctx.lineTo(-w * 0.48, h * 0.32);
    ctx.closePath();
    ctx.fill();

    if (lod > 0.35) {
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      for (let row = 0; row < 16; row += 1) {
        const yy = -h * 0.17 + row * 4.15;
        for (let col = 0; col < 5; col += 1) {
          ctx.fillRect(-w * 0.46 + col * 2.05 + (row % 2) * 1.0, yy, 1.7, 3.5);
        }
      }
    }

    const soot = ctx.createLinearGradient(0, h * 0.12, 0, h * 0.5);
    soot.addColorStop(0, "rgba(20,16,12,0)");
    soot.addColorStop(1, "rgba(12,10,8,0.42)");
    ctx.fillStyle = soot;
    ctx.fillRect(-w * 0.48, h * 0.12, w * 0.96, h * 0.36);

    ctx.fillStyle = "#111216";
    ctx.fillRect(-3.6, -h * 0.3, 7.2, 7);
    const glass = ctx.createLinearGradient(-3, -h * 0.3, 3, -h * 0.24);
    glass.addColorStop(0, "#8ec8ff");
    glass.addColorStop(1, "#1a3a58");
    ctx.fillStyle = glass;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(-2.6, -h * 0.292, 5.2, 3.8);
    ctx.globalAlpha = 1;

    const pin = ctx.createLinearGradient(0, -4, 0, 2);
    pin.addColorStop(0, "#f0d878");
    pin.addColorStop(1, "#6a5420");
    ctx.fillStyle = pin;
    ctx.fillRect(-w * 0.78, -3.5, 13, 5);
    ctx.fillRect(w * 0.24, -3.5, 13, 5);
    ctx.fillStyle = "rgba(255,255,220,0.35)";
    ctx.fillRect(-w * 0.78, -3.5, 13, 1.3);
    ctx.fillRect(w * 0.24, -3.5, 13, 1.3);

    drawRaptor(ctx, -7.6, h * 0.45, 1.18, ship.thrusting);
    drawRaptor(ctx, 0, h * 0.48, 1.28, ship.thrusting);
    drawRaptor(ctx, 7.6, h * 0.45, 1.18, ship.thrusting);

    ctx.restore();
  }

  function drawTank(ctx, x, y, r, hgt, night) {
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, night > 0.5 ? "#121410" : "#2a2c26");
    g.addColorStop(0.4, night > 0.5 ? "#3a3c36" : "#6a6c62");
    g.addColorStop(0.55, night > 0.5 ? "#6a6c64" : "#9a9c90");
    g.addColorStop(1, night > 0.5 ? "#1a1c18" : "#3a3c36");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - hgt, r * 2, hgt);
    ctx.beginPath();
    ctx.ellipse(x, y - hgt, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#10120e";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y - (hgt / 4) * i, r, r * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawLattice(ctx, x, top, bot, w, night) {
    const h = bot - top;
    const chord = 7.5;
    const steel = night > 0.5 ? "#1a1c20" : "#2c3036";
    const brace = night > 0.5 ? "rgba(18,20,24,0.9)" : "rgba(32,36,42,0.8)";
    ctx.fillStyle = steel;
    ctx.fillRect(x, top, chord, h);
    ctx.fillRect(x + w - chord, top, chord, h);
    ctx.fillRect(x - 3, top - 7, w + 6, 8);
    ctx.strokeStyle = brace;
    ctx.lineWidth = 1.7;
    const cell = 20;
    for (let yy = top + 2; yy < bot - 6; yy += cell) {
      ctx.beginPath();
      ctx.moveTo(x + 1, yy);
      ctx.lineTo(x + w - 1, yy + cell);
      ctx.moveTo(x + w - 1, yy);
      ctx.lineTo(x + 1, yy + cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }
  }

  function drawChopstick(ctx, x, y, len, thick) {
    const g = ctx.createLinearGradient(0, y, 0, y + thick);
    g.addColorStop(0, "#8a8680");
    g.addColorStop(0.35, "#4a4844");
    g.addColorStop(1, "#1c1c1a");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, len, thick);
    ctx.fillStyle = "rgba(236,228,210,0.16)";
    ctx.fillRect(x, y, len, 1.8);
    ctx.fillStyle = "#2a2824";
    ctx.fillRect(x + 3, y - 2.6, len - 16, 2.6);
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#e2c04a" : "#161614";
      ctx.fillRect(x + 10 + i * 8, y + 2, 7, thick - 4);
    }
    ctx.fillStyle = "#5a5852";
    ctx.fillRect(x + len - 9, y - 2, 11, thick + 4);
  }

  function drawMechazilla(ctx, night, gap) {
    const towerLeft = TOWER_X - 26;
    const top = ARM_Y - 310;
    drawLattice(ctx, towerLeft, top, GROUND - 8, 54, night);

    ctx.fillStyle = "#c8102e";
    ctx.fillRect(towerLeft + 19, top - 16, 16, 11);
    ctx.fillStyle = night > 0.4 ? "#ff3a3a" : "#a01020";
    ctx.beginPath();
    ctx.arc(towerLeft + 27, top - 20, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = night > 0.5 ? "#2a2c30" : "#3a3e44";
    ctx.fillRect(towerLeft - 22, ARM_Y - 74, 26, 8);
    ctx.fillRect(towerLeft - 6, ARM_Y - 74, 6, 56);

    const half = gap * 0.5;
    ctx.strokeStyle = night > 0.5 ? "#3a3c40" : "#5a5c60";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(towerLeft + 4, ARM_Y - 36);
    ctx.lineTo(TOWER_X - 108, ARM_Y - half + 2);
    ctx.moveTo(towerLeft + 4, ARM_Y + 28);
    ctx.lineTo(TOWER_X - 108, ARM_Y + half + 2);
    ctx.stroke();

    drawChopstick(ctx, TOWER_X - 190, ARM_Y - half - 11, 178, 14);
    drawChopstick(ctx, TOWER_X - 190, ARM_Y + half - 3, 178, 14);

    if (night > 0.25) {
      const glow = 0.5 + Math.sin(clock * 0.01) * 0.14;
      [
        [towerLeft + 8, ARM_Y - 230],
        [towerLeft + 36, ARM_Y - 150],
        [towerLeft + 8, ARM_Y - 70],
      ].forEach(([lx, ly]) => {
        const rad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 52);
        rad.addColorStop(0, `rgba(255,220,150,${0.2 * glow})`);
        rad.addColorStop(0.45, `rgba(255,180,70,${0.05 * glow})`);
        rad.addColorStop(1, "rgba(255,160,40,0)");
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(lx, ly, 52, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,236,190,${0.8 * glow})`;
        ctx.beginPath();
        ctx.arc(lx, ly, 2.1, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function drawWorld(ctx) {
    const s = spec();
    const night = s.night;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sky = ctx.createLinearGradient(0, 0, 0, cssH);
    sky.addColorStop(0, rgb(mix(58, 8, night), mix(68, 10, night), mix(86, 22, night)));
    sky.addColorStop(0.42, rgb(mix(120, 16, night), mix(108, 18, night), mix(118, 32, night)));
    sky.addColorStop(0.72, rgb(mix(198, 48, night), mix(150, 42, night), mix(120, 40, night)));
    sky.addColorStop(1, rgb(mix(220, 70, night), mix(148, 58, night), mix(98, 42, night)));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cssW, cssH);

    const sunX = cssW * 0.78;
    const sunY = cssH * 0.72;
    const sun = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, cssW * 0.62);
    sun.addColorStop(0, `rgba(255,210,140,${0.55 - night * 0.4})`);
    sun.addColorStop(0.12, `rgba(255,160,80,${0.22 - night * 0.12})`);
    sun.addColorStop(0.45, `rgba(255,110,50,${0.08 - night * 0.04})`);
    sun.addColorStop(1, "rgba(20,8,4,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, cssW, cssH);
    if (night < 0.7) {
      ctx.fillStyle = `rgba(255,236,200,${0.9 - night})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 7 - night * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const sc = worldScale();
    const ox = shake ? rand(-shake, shake) : 0;
    const oy = shake ? rand(-shake, shake) : 0;
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, (-cam.x + ox) * sc * dpr, (-cam.y + oy) * sc * dpr);

    stars.forEach((st) => {
      ctx.globalAlpha = st.a * (0.12 + night * 0.75);
      ctx.fillStyle = st.r > 1.05 ? "#fff6d8" : "#dce6ff";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    clouds.forEach((c) => {
      ctx.globalAlpha = c.a * (1 - night * 0.55);
      ctx.fillStyle = night > 0.5 ? "#3a3c44" : "#efe4d4";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const waterTop = GROUND - 16;
    const water = ctx.createLinearGradient(0, waterTop - 30, 0, GROUND + 110);
    water.addColorStop(0, night > 0.5 ? "#1a2832" : "#3a5360");
    water.addColorStop(0.4, night > 0.5 ? "#0e1a22" : "#243844");
    water.addColorStop(1, "#070e14");
    ctx.fillStyle = water;
    ctx.fillRect(-280, waterTop, SHORE + 300, 220);

    ctx.save();
    ctx.globalAlpha = 0.18 - night * 0.08;
    const glitter = ctx.createLinearGradient(TOWER_X + 40, waterTop, TOWER_X + 40, GROUND + 40);
    glitter.addColorStop(0, "rgba(255,210,150,0.55)");
    glitter.addColorStop(1, "rgba(255,180,100,0)");
    ctx.fillStyle = glitter;
    ctx.fillRect(TOWER_X - 30, waterTop, 140, 70);
    ctx.restore();

    for (let i = 0; i < 12; i += 1) {
      ctx.fillStyle = `rgba(210,180,130,${0.05 + (i % 3) * 0.015})`;
      const y = waterTop + 3 + i * 6 + Math.sin(clock * 0.0035 + i * 0.7) * 1.4;
      ctx.fillRect(-280, y, SHORE + 300, 1.15);
    }

    ctx.fillStyle = night > 0.5 ? "#1a1814" : "#3a3428";
    ctx.fillRect(SHORE - 36, GROUND - 20, WORLD_W, 200);
    ctx.fillStyle = night > 0.5 ? "#2a2418" : "#6a5a40";
    ctx.fillRect(SHORE - 48, GROUND - 14, 70, 16);

    const pad = ctx.createLinearGradient(TOWER_X - 200, 0, TOWER_X + 90, 0);
    pad.addColorStop(0, "#2a2822");
    pad.addColorStop(0.5, night > 0.5 ? "#3a3830" : "#5a564c");
    pad.addColorStop(1, "#26241e");
    ctx.fillStyle = pad;
    ctx.beginPath();
    ctx.ellipse(TOWER_X - 36, GROUND - 8, 168, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(236,220,160,0.08)";
    ctx.fillRect(TOWER_X - 150, GROUND - 15, 210, 2);
    ctx.fillStyle = "rgba(200,16,46,0.35)";
    ctx.fillRect(TOWER_X - 70, GROUND - 14, 18, 3);
    ctx.fillRect(TOWER_X - 40, GROUND - 14, 18, 3);

    drawTank(ctx, SHORE + 70, GROUND - 18, 15, 56, night);
    drawTank(ctx, SHORE + 108, GROUND - 18, 13, 70, night);
    drawTank(ctx, SHORE + 146, GROUND - 18, 17, 48, night);
    ctx.fillStyle = night > 0.5 ? "#1c1c18" : "#2c2a24";
    ctx.fillRect(SHORE + 178, GROUND - 44, 26, 26);
    ctx.fillRect(SHORE + 210, GROUND - 60, 20, 42);

    drawLattice(ctx, TOWER_X + 168, ARM_Y - 80, GROUND - 8, 28, night);
    ctx.fillStyle = night > 0.5 ? "#1a1c20" : "#2a2c30";
    ctx.fillRect(TOWER_X + 164, ARM_Y - 88, 36, 8);

    drawMechazilla(ctx, night, s.gap);

    if (ship) {
      const altG = GROUND - (ship.y + ship.h * 0.48);
      if (altG < 220 && altG > -20) {
        ctx.fillStyle = `rgba(0,0,0,${0.2 * clamp(1 - altG / 220, 0, 1)})`;
        ctx.beginPath();
        ctx.ellipse(ship.x, GROUND - 9, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * (p.kind === "smoke" ? 0.55 : 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.kind === "smoke" ? 0.9 : 0.6), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (ship) drawShip(ctx, clamp((560 - viewW) / 220, 0, 1));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const haze = ctx.createLinearGradient(0, cssH * 0.58, 0, cssH);
    haze.addColorStop(0, "rgba(12,10,14,0)");
    haze.addColorStop(1, `rgba(28,16,12,${0.16 + night * 0.12})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, cssW, cssH);

    const vig = ctx.createRadialGradient(cssW * 0.5, cssH * 0.46, cssW * 0.2, cssW * 0.5, cssH * 0.5, cssW * 0.78);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cssW, cssH);

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,236,210,${flash * 0.2})`;
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  function updateHud() {
    if (!ship || !hud || hud.hidden) return;
    const s = spec();
    const spd = Math.hypot(ship.vx, ship.vy);
    if (hudFlight) hudFlight.textContent = s.name;
    if (hudFuel) hudFuel.textContent = `Fuel ${Math.round(ship.fuel)}`;
    if (hudSpeed) hudSpeed.textContent = `${spd.toFixed(1)} m/s`;
    if (hudScore) hudScore.textContent = score.toLocaleString();
  }

  function followCam() {
    if (!ship) return;
    updateView();
    const near = clamp(1 - Math.abs(ARM_Y - ship.y) / 360, 0, 1);
    const lookX = lerp(ship.x, CATCH_X + 24, 0.2 + near * 0.22);
    const lookY = lerp(ship.y, ARM_Y, 0.26);
    let targetX = lookX - viewW * 0.44;
    let targetY = lookY - viewH * 0.38;
    const pad = 18;
    const shipTop = ship.y - ship.h * 0.55;
    const shipBot = ship.y + ship.h * 0.62;
    if (targetY > shipTop - pad) targetY = shipTop - pad;
    if (targetY + viewH < shipBot + pad) targetY = shipBot + pad - viewH;
    targetX = clamp(targetX, 0, WORLD_W - viewW);
    targetY = clamp(targetY, 0, GROUND + 50 - viewH);
    const k = state === "fly" || state === "attract" ? 0.075 : 0.05;
    cam.x = lerp(cam.x, targetX, k);
    cam.y = lerp(cam.y, targetY, k);
  }

  function frame(now) {
    if (!last) last = now;
    const dt = clamp(now - last, 8, 34);
    last = now;
    if (state !== "pause") {
      clock += dt;
      step(dt);
      stepParticles();
      followCam();
      shake *= 0.86;
      flash *= 0.9;
    }
    const ctx = canvas.getContext("2d");
    drawWorld(ctx);
    updateHud();
    requestAnimationFrame(frame);
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
      if (state === "attract" || state === "attract-hold" || state === "fail" || state === "caught") {
        if (key === "thrust") startPlay();
      }
    };
    const up = (e) => {
      releasePointer(e.pointerId);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
  }

  document.querySelectorAll("[data-hold]").forEach((el) => {
    bindHold(el, el.getAttribute("data-hold"));
  });

  const pad = document.querySelector("[data-catch-pad]");
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
        setHeld("thrust", false);
      }
    },
    { passive: true }
  );

  const keyMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "thrust",
    a: "left",
    d: "right",
    w: "thrust",
    A: "left",
    D: "right",
    W: "thrust",
    " ": "thrust",
  };

  function startPlayResume() {
    if (state === "pause") {
      hideOverlay();
      state = "fly";
      if (hud) hud.hidden = false;
      return;
    }
    startPlay();
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") {
      if (state === "fly") {
        state = "pause";
        setRumble(false);
        showOverlay("Paused", "Hold", "Ship is waiting on the chopsticks.", "Resume");
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
    if ((state === "attract" || state === "attract-hold" || state === "ready") && mapped === "thrust") startPlay();
  });

  window.addEventListener("keyup", (e) => {
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
      if (state === "fly") {
        state = "pause";
        setRumble(false);
        showOverlay("Paused", "Hold", "Ship is waiting on the chopsticks.", "Resume");
      }
    }
  });

  window.addEventListener("resize", resize);
  resize();
  beginAttract();
  renderBoard();
  requestAnimationFrame(frame);

  window.CatchGame = {
    play: startPlay,
    state: () => state,
    ship: () => ship,
    score: () => score,
    hold: () => ({ ...hold }),
    held: () => ({ ...held }),
    clearHolds: clearAllHolds,
    board: () => visibleBoard(),
    storedBoard: () => loadBoard(),
    submitRun,
    renderBoard,
    muted: () => muted,
    audio: () =>
      audio
        ? { state: audio.state, muted, engine: Boolean(engine), voices: engine ? 5 : 0 }
        : null,
    autopilot(on) {
      auto = Boolean(on);
    },
  };
})();
