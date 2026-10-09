(() => {
  const root = document.querySelector("[data-cab]");
  const canvas = root?.querySelector("[data-cab-canvas]");
  const stage = root?.querySelector("[data-cab-stage]");
  const overlay = root?.querySelector("[data-cab-overlay]");
  const hud = root?.querySelector("[data-cab-hud]");
  if (!root || !canvas || !stage) return;

  const overlayKicker = root.querySelector("[data-overlay-kicker]");
  const overlayTitle = root.querySelector("[data-overlay-title]");
  const overlayCopy = root.querySelector("[data-overlay-copy]");
  const playBtn = root.querySelector("[data-cab-play]");
  const heroPlay = root.querySelector("[data-cab-hero-play]");
  const shareBtn = root.querySelector("[data-cab-share]");
  const bestEl = root.querySelector("[data-cab-best]");
  const hudKm = root.querySelector("[data-hud-km]");
  const hudBatt = root.querySelector("[data-hud-batt]");
  const hudBattFill = root.querySelector("[data-hud-batt-fill]");
  const hudBattWrap = root.querySelector("[data-hud-batt-wrap]");
  const hudPax = root.querySelector("[data-hud-pax]");
  const hudStreak = root.querySelector("[data-hud-streak]");
  const hudScore = root.querySelector("[data-hud-score]");
  const boardList = root.querySelector("[data-board-list]");
  const boardNow = root.querySelector("[data-board-now]");
  const nameInput = root.querySelector("[data-cab-name]");
  const muteBtn = root.querySelector("[data-cab-mute]");
  const statusBtn = root.querySelector("[data-cab-status]");

  const STORE = "aljr.cybercab.best";
  const BOARD_STORE = "aljr.cybercab.board";
  const NAME_STORE = "aljr.cybercab.name";
  const SHARE_URL = "https://zzbz6jgyzy-creator.github.io/cybercab.html";
  const BOARD_MAX = 8;
  const LANE_X = [-0.86, 0, 0.86];
  const PLAYER_Z = 0.56;
  const HIT_Z = 0.36;
  const HIT_X = 0.24;
  const CITY_WRAP = 14;
  const DROPS = ["Airport", "Hotel", "Downtown", "The Hills", "Station", "Harbor"];
  const SIGNS = ["BAY ST", "35", "AIRPT", "VALET", "NO PARK", "A1", "RUSH", "MAIN", "HOTEL"];

  const held = { left: false, right: false };
  const padPointers = new Map();
  const padButtons = {};
  const particles = [];
  const popups = [];
  const stars = [];
  const city = [];

  let dpr = 1;
  let cssW = 800;
  let cssH = 450;
  let state = "attract";
  let score = 0;
  let best = Number(localStorage.getItem(STORE) || 0);
  let muted = false;
  let audio = null;
  let engine = null;
  let keysLocked = false;
  let last = 0;
  let clock = 0;
  let shake = 0;
  let flash = 0;
  let freshId = "";
  let swipeX = null;
  let swipeY = null;
  let laneCool = 0;
  let game = null;

  const sprites = {
    cab: loadImg("/assets/cybercab/cybercab-drive.png"),
    waymo: loadImg("/assets/cybercab/waymo.png"),
    palm: loadImg("/assets/cybercab/palm.png"),
    light: loadImg("/assets/cybercab/streetlight.png"),
    pax: loadImg("/assets/cybercab/passenger.png"),
    charger: loadImg("/assets/cybercab/charger.png"),
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const hash01 = (n) => {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  function loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
  }
  function ready(img) {
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: Math.random(), y: Math.random() * 0.48, r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.5 + 0.12 });
  }

  for (let i = 0; i < 20; i += 1) {
    const z = i * 0.7;
    [-1, 1].forEach((side, si) => {
      if (i % 2 === si) {
        city.push({
          kind: "build",
          side,
          z: z + si * 0.18,
          w: rand(0.16, 0.3),
          h: rand(0.28, 0.82),
          tone: Math.random(),
          seed: i * 19 + si * 7,
        });
      }
      if (i % 2 === si) city.push({ kind: "light", side, z: z + 0.22 });
      if (i % 3 === si) city.push({ kind: "palm", side, z: z + 0.38 });
      if (i % 5 === si) {
        city.push({
          kind: "sign",
          side,
          z: z + 0.44,
          label: SIGNS[(i + si) % SIGNS.length],
        });
      }
      if (i % 7 === 3) city.push({ kind: "traffic", side, z: z + 0.5 });
    });
  }

  function callsign() {
    const raw = (nameInput?.value || localStorage.getItem(NAME_STORE) || "Rush").trim();
    return (raw || "Rush").slice(0, 12).toUpperCase();
  }

  function loadBoard() {
    try {
      const rows = JSON.parse(localStorage.getItem(BOARD_STORE) || "[]");
      return Array.isArray(rows) ? rows.filter((row) => row && typeof row.score === "number") : [];
    } catch {
      return [];
    }
  }
  function saveBoard(rows) {
    localStorage.setItem(BOARD_STORE, JSON.stringify(rows.slice(0, BOARD_MAX)));
  }
  function setBest(n) {
    best = Math.round(n);
    localStorage.setItem(STORE, String(best));
    if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;
  }
  if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;

  function kmOf(g) {
    return (g?.dist || 0) * 0.008;
  }

  function visibleBoard() {
    const stored = loadBoard();
    const live =
      score > 0 && (state === "run" || state === "pause")
        ? [{ id: "live", name: callsign(), score, km: kmOf(game), live: true }]
        : [];
    return [...stored, ...live].sort((a, b) => b.score - a.score || (a.live ? -1 : 1)).slice(0, BOARD_MAX);
  }

  function renderBoard() {
    if (boardNow) {
      boardNow.textContent =
        state === "run" || state === "pause"
          ? `This run  ·  ${Math.round(score).toLocaleString()}  ·  ${game?.rides || 0} rides  ·  ${kmOf(game).toFixed(1)} km`
          : "This run  ·  on the pad";
    }
    if (!boardList) return;
    boardList.replaceChildren();
    const rows = visibleBoard();
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "is-empty";
      empty.textContent = "No runs on this road yet.";
      boardList.append(empty);
      return;
    }
    rows.forEach((row, i) => {
      const li = document.createElement("li");
      if (row.live) li.classList.add("is-live");
      if (row.id && row.id === freshId) li.classList.add("is-fresh");
      const rank = document.createElement("span");
      rank.className = "cab-board-rank";
      rank.textContent = String(i + 1);
      const who = document.createElement("span");
      who.className = "cab-board-who";
      who.textContent = row.live ? `${row.name} · live` : row.name;
      const pts = document.createElement("span");
      pts.textContent = Math.round(row.score).toLocaleString();
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
      score: Math.round(score),
      km: kmOf(game),
      rides: game?.rides || 0,
      at: Date.now(),
    };
    rows.push(entry);
    rows.sort((a, b) => b.score - a.score || a.at - b.at);
    saveBoard(rows);
    freshId = entry.id;
    if (Math.round(score) > best) setBest(score);
    renderBoard();
  }

  function shareHref() {
    const km = kmOf(game).toFixed(1);
    const text = `Cybercab Rush · ${Math.round(score).toLocaleString()} · ${game?.rides || 0} rides · ${km} km. Beat me: ${SHARE_URL}`;
    return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  }

  function showOverlay(kicker, title, copy, playLabel, share) {
    if (overlayKicker) overlayKicker.textContent = kicker;
    if (overlayTitle) overlayTitle.textContent = title;
    if (overlayCopy) overlayCopy.textContent = copy;
    if (playBtn) playBtn.textContent = playLabel || "Play";
    if (heroPlay) {
      heroPlay.hidden = false;
      heroPlay.textContent = playLabel || "Play";
    }
    if (shareBtn) {
      if (share) {
        shareBtn.hidden = false;
        shareBtn.href = shareHref();
      } else shareBtn.hidden = true;
    }
    overlay.hidden = false;
  }
  function hideOverlay() {
    overlay.hidden = true;
    if (shareBtn) shareBtn.hidden = true;
    if (heroPlay) heroPlay.hidden = true;
  }

  function resetGame() {
    game = {
      dist: 0,
      time: 0,
      lane: 1,
      x: 0,
      curve: 0,
      curveTo: 0,
      cars: [],
      pax: null,
      drop: null,
      charges: [],
      onboard: null,
      rides: 0,
      missed: 0,
      dodged: 0,
      near: 0,
      batt: 100,
      spawnIn: 1.9,
      paxIn: 2.2,
      chargeIn: 4.2,
      grace: 0.85,
      streak: 0,
      boost: 0,
      dead: false,
    };
    score = 0;
    particles.length = 0;
    popups.length = 0;
    shake = 0;
    flash = 0;
  }

  function difficulty() {
    const t = game.time;
    return {
      speed: 5.1 + t * 0.064,
      oncoming: 1.45 + t * 0.03,
      spawn: Math.max(0.55, 1.72 - t * 0.01),
      double: t > 24,
      pack: t > 50,
      weaver: t > 30,
    };
  }

  function openLanes(z0, z1) {
    const blocked = new Set();
    game.cars.forEach((c) => {
      if (c.z >= z0 && c.z <= z1) blocked.add(c.lane);
    });
    if (game.pax && game.pax.z >= z0 && game.pax.z <= z1) blocked.add(game.pax.lane);
    if (game.drop && game.drop.z >= z0 && game.drop.z <= z1) blocked.add(game.drop.lane);
    game.charges.forEach((c) => {
      if (c.z >= z0 && c.z <= z1) blocked.add(c.lane);
    });
    return [0, 1, 2].filter((l) => !blocked.has(l));
  }

  function spawnWave() {
    const d = difficulty();
    let pool = openLanes(7.4, 12);
    if (game.time < 14) pool = pool.filter((l) => l !== game.lane);
    if (pool.length <= 1) return;
    let count = 1;
    if (game.time >= 8 && d.double && Math.random() < 0.48) count = 2;
    if (d.pack && Math.random() < 0.42) count = 2;
    const keep = pool.includes(game.lane) ? game.lane : pool[0];
    const choices = pool.filter((l) => l !== keep);
    choices
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(count, choices.length))
      .forEach((lane) => {
        game.cars.push({
          lane,
          x: LANE_X[lane],
          z: rand(9.4, 11.4),
          weave: d.weaver && Math.random() < 0.3,
          weaved: false,
        });
      });
  }

  function spawnPassenger() {
    if (game.pax || game.onboard) return;
    const pool = openLanes(8, 12);
    if (!pool.length) return;
    const lane = pick(pool);
    game.pax = {
      lane,
      x: LANE_X[lane],
      z: rand(8.6, 10.6),
      dest: pick(DROPS),
    };
  }

  function spawnCharge() {
    const pool = openLanes(8, 12);
    if (!pool.length) return;
    const lane = pick(pool);
    game.charges.push({
      lane,
      x: LANE_X[lane],
      z: rand(8.8, 10.8),
      super: Math.random() < 0.28,
    });
  }

  function burst(x, y, color, n, size) {
    for (let i = 0; i < n; i += 1) {
      particles.push({
        x,
        y,
        vx: rand(-1.8, 1.8),
        vy: rand(-2.6, 0.5),
        life: rand(0.22, 0.65),
        max: 0.65,
        color,
        size: size || rand(1.2, 3.4),
      });
    }
  }

  function makeNoise(ctx, seconds, color) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastN = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === "brown") {
        lastN = (lastN + 0.02 * white) / 1.02;
        data[i] = lastN * 3.2;
      } else data[i] = white;
    }
    return buffer;
  }

  function applyMute() {
    if (audio?.master) audio.master.gain.setTargetAtTime(muted ? 0 : 0.7, audio.currentTime, 0.04);
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
    master.gain.value = muted ? 0 : 0.7;
    master.connect(audio.destination);
    audio.master = master;
    const brown = audio.createBufferSource();
    brown.buffer = makeNoise(audio, 2.2, "brown");
    brown.loop = true;
    const noiseFilter = audio.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 180;
    const noiseGain = audio.createGain();
    noiseGain.gain.value = 0;
    brown.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 40;
    const oscFilter = audio.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.value = 88;
    const oscGain = audio.createGain();
    oscGain.gain.value = 0;
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);
    brown.start();
    osc.start();
    engine = { noiseGain, noiseFilter, oscGain, osc };
    applyMute();
  }

  function setEngine(amount) {
    if (!engine || !audio) return;
    const t = audio.currentTime;
    const a = muted ? 0 : clamp(amount, 0, 1);
    engine.noiseGain.gain.setTargetAtTime(a * 0.11, t, 0.05);
    engine.oscGain.gain.setTargetAtTime(a * 0.03, t, 0.06);
    engine.noiseFilter.frequency.setTargetAtTime(140 + a * 460, t, 0.08);
    engine.osc.frequency.setTargetAtTime(36 + a * 26, t, 0.1);
  }

  function tone(freq, end, gain, dur, type) {
    if (!audio || muted) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, end), audio.currentTime + dur);
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    o.connect(g);
    g.connect(audio.master);
    o.start();
    o.stop(audio.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, freq, gain) {
    if (!audio || muted) return;
    const src = audio.createBufferSource();
    src.buffer = makeNoise(audio, Math.max(0.08, dur), "white");
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const g = audio.createGain();
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(audio.master);
    src.start();
    src.stop(audio.currentTime + dur + 0.02);
  }

  function project(worldX, z) {
    const zFar = 13.5;
    const t = clamp(z / zFar, 0, 1);
    const ease = t ** 0.82;
    const scale = lerp(1.22, 0.12, ease);
    const y = lerp(cssH * 0.96, cssH * 0.5, ease);
    const curveOff = (game?.curve || 0) * ease * ease;
    const roadW = cssW * lerp(2.18, 0.36, ease);
    const x = cssW * 0.5 + curveOff * cssW * 0.34 + (worldX - (game?.x || 0)) * roadW * 0.36;
    return { x, y, scale, roadW, ease };
  }

  function steer(dir) {
    if (!game || state !== "run" || laneCool > 0) return;
    const next = clamp(game.lane + dir, 0, 2);
    if (next === game.lane) return;
    game.lane = next;
    laneCool = 0.11;
    tone(220, 140, 0.045, 0.07, "triangle");
  }

  function endRun(kicker, title, copy) {
    if (game.dead) return;
    game.dead = true;
    state = "dead";
    setEngine(0);
    submitRun();
    showOverlay(kicker, title, copy, "Play again", true);
    if (hud) hud.hidden = true;
  }

  function crash() {
    shake = 14;
    flash = 0.9;
    noiseBurst(0.4, 280, 0.2);
    tone(110, 40, 0.12, 0.4, "sawtooth");
    const km = kmOf(game).toFixed(1);
    endRun(
      "Crash",
      `${Math.round(score).toLocaleString()} · ${km} km`,
      `${game.rides} ${game.rides === 1 ? "ride" : "rides"}, ${game.dodged} Waymos dodged. A Waymo took the lane.`
    );
  }

  function outOfCharge() {
    shake = 6;
    flash = 0.4;
    tone(90, 40, 0.1, 0.5, "sine");
    const km = kmOf(game).toFixed(1);
    endRun(
      "Pack empty",
      `${Math.round(score).toLocaleString()} · ${km} km`,
      `${game.rides} ${game.rides === 1 ? "ride" : "rides"}. Hit the charge pads and Superchargers next time.`
    );
  }

  function pickUp() {
    const p = game.pax;
    if (!p) return;
    game.onboard = p.dest;
    game.pax = null;
    const lanePool = [0, 1, 2].filter((l) => l !== game.lane);
    const lane = pick(lanePool.length ? lanePool : [0, 1, 2]);
    game.drop = { lane, x: LANE_X[lane], z: rand(7.2, 9.2), dest: p.dest };
    const s = project(game.x, PLAYER_Z);
    popup("RIDER ON", s.x, s.y - 64, "#7ad7ff");
    tone(520, 880, 0.07, 0.16, "sine");
    flash = 0.22;
  }

  function popup(text, x, y, color) {
    popups.push({ text, x, y, vy: -38, life: 0.95, color: color || "#f4f6fa" });
  }

  function dropOff() {
    const dest = game.drop?.dest || game.onboard;
    game.drop = null;
    game.onboard = null;
    game.rides += 1;
    game.streak += 1;
    const bonus = 240 + game.streak * 90;
    score += bonus;
    game.boost = Math.max(game.boost, 1.7);
    game.paxIn = rand(1.2, 2.1);
    const s = project(game.x, PLAYER_Z);
    popup(game.streak > 1 ? `${game.streak}× ${dest}` : dest, s.x, s.y - 78, "#3dcea0");
    if (game.streak >= 2) popup(`+${bonus}`, s.x, s.y - 108, "#e6c36a");
    tone(660, 990, 0.06, 0.18, "triangle");
    tone(440, 220, 0.04, 0.12, "sine");
    flash = 0.34;
  }

  function takeCharge(ch) {
    const add = ch.super ? 58 : 32;
    game.batt = clamp(game.batt + add, 0, 100);
    score += ch.super ? 40 : 18;
    const s = project(game.x, PLAYER_Z);
    popup(ch.super ? "SUPER +58" : "CHARGE", s.x, s.y - 58, "#7dffb0");
    tone(ch.super ? 280 : 360, 720, 0.07, 0.16, "sine");
  }

  function step(dt) {
    const t = dt / 1000;
    clock += dt;
    laneCool = Math.max(0, laneCool - t);
    if (state !== "run" || !game) return;
    if (held.left) steer(-1);
    if (held.right) steer(1);

    const d = difficulty();
    game.boost = Math.max(0, game.boost - t);
    const speed = d.speed * (game.boost > 0 ? 1.38 : 1);
    game.dist += speed * t * 18;
    game.time += t;
    game.grace = Math.max(0, game.grace - t);
    game.curveTo = Math.sin(game.dist * 0.0016) * Math.min(0.72, game.time / 36) * 0.7;
    game.curve = lerp(game.curve, game.curveTo, 0.04);
    game.x = lerp(game.x, LANE_X[game.lane], 0.2);

    const drain = (2.2 + speed * 0.16) * t * (game.onboard ? 1.06 : 1);
    game.batt = Math.max(0, game.batt - drain);
    if (game.batt <= 0) {
      outOfCharge();
      return;
    }

    score += speed * t * (8 + game.streak * 1.6);
    if (game.boost > 0 && Math.random() < 0.55) {
      const s = project(game.x, PLAYER_Z);
      particles.push({
        x: s.x + rand(-36, 36),
        y: s.y - rand(8, 46),
        vx: rand(-0.4, 0.4),
        vy: rand(1.2, 3.4),
        life: rand(0.18, 0.4),
        max: 0.4,
        color: Math.random() > 0.5 ? "#e6c36a" : "#f4f6fa",
        size: rand(1.2, 2.6),
      });
    }
    const zSpeed = (speed + d.oncoming) * t * 0.5;
    const scenerySpeed = speed * t * 0.5;

    game.spawnIn -= t;
    if (game.spawnIn <= 0) {
      spawnWave();
      game.spawnIn = d.spawn * rand(0.88, 1.12);
    }
    game.paxIn -= t;
    if (game.paxIn <= 0) {
      spawnPassenger();
      game.paxIn = rand(3.2, 5.5);
    }
    game.chargeIn -= t;
    if (game.chargeIn <= 0) {
      spawnCharge();
      game.chargeIn = rand(5.4, 8.2);
    }

    game.cars.forEach((c) => {
      c.z -= zSpeed;
      if (c.weave && !c.weaved && c.z < 5.2 && c.z > 2.8) {
        c.lane = pick([0, 1, 2].filter((l) => l !== c.lane));
        c.weaved = true;
      }
      c.x = lerp(c.x, LANE_X[c.lane], 0.08);
      if (c.z < PLAYER_Z + HIT_Z && c.z > PLAYER_Z - 0.28 && !c.passed) {
        const dx = Math.abs(c.x - game.x);
        if (dx < HIT_X && game.grace <= 0) crash();
        else if (dx < 0.78 && dx >= HIT_X) {
          c.passed = true;
          game.near += 1;
          score += 40 + game.streak * 8;
          const s = project(c.x, c.z);
          burst(s.x, s.y, "#fff6d8", 9, 2);
          popup("CLOSE", s.x, s.y - 40, "#fff6d8");
          tone(740, 220, 0.035, 0.08, "square");
        }
      }
      if (c.z < 0.32 && !c.cleared) {
        c.cleared = true;
        game.dodged += 1;
        score += 10;
      }
    });
    game.cars = game.cars.filter((c) => c.z > 0.12);
    if (game.dead) return;

    if (game.pax) {
      game.pax.z -= zSpeed * 0.96;
      if (Math.abs(game.pax.z - PLAYER_Z) < 0.4 && Math.abs(LANE_X[game.pax.lane] - game.x) < 0.34) {
        const s = project(game.x, PLAYER_Z);
        burst(s.x, s.y - 24, "#7ad7ff", 14, 2.2);
        pickUp();
      } else if (game.pax.z < 0.35) {
        game.missed += 1;
        game.streak = 0;
        const s = project(game.x, PLAYER_Z);
        popup("MISSED", s.x, s.y - 56, "#e23a3a");
        game.pax = null;
        game.paxIn = rand(1.4, 2.4);
      }
    }
    if (game.drop) {
      game.drop.z -= zSpeed * 0.96;
      game.drop.x = LANE_X[game.drop.lane];
      if (Math.abs(game.drop.z - PLAYER_Z) < 0.4 && Math.abs(game.drop.x - game.x) < 0.34) {
        const s = project(game.x, PLAYER_Z);
        burst(s.x, s.y - 20, "#3dcea0", 16, 2.4);
        dropOff();
      } else if (game.drop.z < 0.35) {
        game.missed += 1;
        game.streak = 0;
        const s = project(game.x, PLAYER_Z);
        popup("MISSED DROP", s.x, s.y - 56, "#e23a3a");
        game.drop = null;
        game.onboard = null;
        game.paxIn = rand(1.2, 2.2);
      }
    }
    game.charges.forEach((ch) => {
      ch.z -= zSpeed * 0.96;
      if (!ch.got && Math.abs(ch.z - PLAYER_Z) < 0.4 && Math.abs(LANE_X[ch.lane] - game.x) < 0.34) {
        ch.got = true;
        const s = project(game.x, PLAYER_Z);
        burst(s.x, s.y - 18, "#7dffb0", 12, 2);
        takeCharge(ch);
      }
    });
    game.charges = game.charges.filter((ch) => ch.z > 0.2 && !ch.got);

    city.forEach((item) => {
      item.z -= scenerySpeed;
      if (item.z < 0.4) item.z += CITY_WRAP;
    });

    setEngine(clamp(speed / 13, 0.28, 1));
  }

  function stepParticles(dt) {
    const t = dt / 1000;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= t;
      p.x += p.vx * 60 * t;
      p.y += p.vy * 60 * t;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = popups.length - 1; i >= 0; i -= 1) {
      const p = popups[i];
      p.life -= t;
      p.y += p.vy * t;
      if (p.life <= 0) popups.splice(i, 1);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawBillboard(ctx, img, x, y, h) {
    if (!ready(img) || h < 2) return;
    const w = h * (img.naturalWidth / img.naturalHeight);
    ctx.drawImage(img, x - w / 2, y - h, w, h);
  }

  function drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, "#050814");
    g.addColorStop(0.28, "#10172c");
    g.addColorStop(0.48, "#2a2436");
    g.addColorStop(0.58, "#3a2a32");
    g.addColorStop(1, "#0b0c10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
    stars.forEach((s) => {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#e8e4d8";
      ctx.beginPath();
      ctx.arc(s.x * cssW, s.y * cssH, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const moonX = cssW * 0.78;
    const moonY = cssH * 0.11;
    const moon = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, 70);
    moon.addColorStop(0, "rgba(255,236,200,0.85)");
    moon.addColorStop(0.18, "rgba(255,220,160,0.18)");
    moon.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = moon;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function drawSkyline(ctx) {
    const hy = cssH * 0.498;
    const fog = ctx.createLinearGradient(0, hy - cssH * 0.3, 0, hy);
    fog.addColorStop(0, "rgba(8,12,24,0)");
    fog.addColorStop(0.5, "rgba(12,16,30,0.4)");
    fog.addColorStop(1, "rgba(14,18,32,0.94)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, hy - cssH * 0.32, cssW, cssH * 0.32);
    for (let i = 0; i < 38; i += 1) {
      const u = hash01(i * 17 + 3);
      const v = hash01(i * 29 + 8);
      const w = cssW * (0.026 + u * 0.046);
      const h = cssH * (0.055 + v * 0.2);
      const x = (i / 38) * cssW * 1.1 - cssW * 0.05;
      ctx.fillStyle = `rgb(${8 + u * 10},${10 + v * 10},${16 + u * 16})`;
      ctx.fillRect(x, hy - h, w, h);
      const cols = 2 + ((i * 3) % 4);
      const rows = 3 + ((i * 5) % 6);
      for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
          if (hash01(i * 11 + row * 13 + col) < 0.32) continue;
          const tw = Math.sin(clock * 0.0014 + i + row) > -0.72;
          if (!tw) continue;
          ctx.fillStyle = hash01(i + col) > 0.5 ? "rgba(255,214,140,0.5)" : "rgba(170,210,255,0.38)";
          ctx.fillRect(
            x + (w * col) / (cols + 1),
            hy - h + (h * row) / (rows + 1),
            Math.max(1.1, w * 0.07),
            Math.max(1.3, h * 0.055)
          );
        }
      }
    }
    const glow = ctx.createRadialGradient(cssW * 0.5, hy, 4, cssW * 0.5, hy, cssW * 0.58);
    glow.addColorStop(0, "rgba(255,168,88,0.14)");
    glow.addColorStop(1, "rgba(255,140,60,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, hy - 48, cssW, 56);
  }

  function drawRoad(ctx) {
    const segs = 50;
    for (let i = segs; i >= 0; i -= 1) {
      const zA = i * 0.22;
      const zB = (i + 1) * 0.22;
      const a = project(0, zA);
      const b = project(0, zB);
      const stripe = Math.floor((zA + (game?.dist || 0) * 0.04) / 0.42) % 2;
      const walk = Math.floor((zA + (game?.dist || 0) * 0.04) / 3.4) % 9 === 0;
      ctx.fillStyle = stripe ? "#161a22" : "#12161e";
      ctx.beginPath();
      ctx.moveTo(a.x - a.roadW * 1.02, a.y);
      ctx.lineTo(a.x + a.roadW * 1.02, a.y);
      ctx.lineTo(b.x + b.roadW * 1.02, b.y);
      ctx.lineTo(b.x - b.roadW * 1.02, b.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = stripe ? "#2c323c" : "#262c34";
      ctx.beginPath();
      ctx.moveTo(a.x - a.roadW * 0.66, a.y);
      ctx.lineTo(a.x - a.roadW * 0.52, a.y);
      ctx.lineTo(b.x - b.roadW * 0.52, b.y);
      ctx.lineTo(b.x - b.roadW * 0.66, b.y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(a.x + a.roadW * 0.52, a.y);
      ctx.lineTo(a.x + a.roadW * 0.66, a.y);
      ctx.lineTo(b.x + b.roadW * 0.66, b.y);
      ctx.lineTo(b.x + b.roadW * 0.52, b.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1a1f28";
      ctx.beginPath();
      ctx.moveTo(a.x - a.roadW * 0.52, a.y);
      ctx.lineTo(a.x + a.roadW * 0.52, a.y);
      ctx.lineTo(b.x + b.roadW * 0.52, b.y);
      ctx.lineTo(b.x - b.roadW * 0.52, b.y);
      ctx.closePath();
      ctx.fill();

      if (walk) {
        ctx.fillStyle = "rgba(236,236,220,0.28)";
        for (let k = -4; k <= 4; k += 1) {
          const off = k * 0.1;
          ctx.beginPath();
          ctx.moveTo(a.x + a.roadW * off - 4 * a.scale, a.y);
          ctx.lineTo(a.x + a.roadW * off + 4 * a.scale, a.y);
          ctx.lineTo(b.x + b.roadW * off + 4 * b.scale, b.y);
          ctx.lineTo(b.x + b.roadW * off - 4 * b.scale, b.y);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.fillStyle = stripe ? "#c81a2e" : "#f2efe6";
      [-0.52, 0.52].forEach((edge) => {
        ctx.beginPath();
        ctx.moveTo(a.x + a.roadW * edge - 1.4 * a.scale, a.y);
        ctx.lineTo(a.x + a.roadW * edge + 1.4 * a.scale, a.y);
        ctx.lineTo(b.x + b.roadW * edge + 1.4 * b.scale, b.y);
        ctx.lineTo(b.x + b.roadW * edge - 1.4 * b.scale, b.y);
        ctx.closePath();
        ctx.fill();
      });
      if (stripe) {
        ctx.fillStyle = "rgba(236,236,220,0.62)";
        [-0.175, 0.175].forEach((off) => {
          ctx.beginPath();
          ctx.moveTo(a.x + a.roadW * off - 1.1 * a.scale, a.y);
          ctx.lineTo(a.x + a.roadW * off + 1.1 * a.scale, a.y);
          ctx.lineTo(b.x + b.roadW * off + 1.1 * b.scale, b.y);
          ctx.lineTo(b.x + b.roadW * off - 1.1 * b.scale, b.y);
          ctx.closePath();
          ctx.fill();
        });
      }
    }
    const shine = ctx.createLinearGradient(0, cssH * 0.5, 0, cssH);
    shine.addColorStop(0, "rgba(190,210,240,0.05)");
    shine.addColorStop(0.42, "rgba(120,140,170,0.05)");
    shine.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = shine;
    ctx.fillRect(0, cssH * 0.5, cssW, cssH * 0.5);
  }

  function drawBuilding(ctx, item) {
    const p = project(0, item.z);
    if (p.scale < 0.05 || item.z < 3.4) return;
    const w = item.w * p.roadW * 0.4;
    const h = item.h * cssH * 0.2 * p.scale * 2.05;
    const x = p.x + item.side * p.roadW * 1.42;
    const y = p.y;
    const style = item.seed % 3;
    const glass = style === 0;
    const hotel = style === 1;
    const face = glass ? [26, 32, 48] : hotel ? [38, 26, 24] : [28, 26, 34];
    ctx.fillStyle = `rgb(${face[0]},${face[1]},${face[2]})`;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = `rgb(${face[0] - 10},${face[1] - 8},${face[2] - 6})`;
    const sideW = w * 0.2;
    ctx.beginPath();
    if (item.side < 0) {
      ctx.moveTo(x + w / 2, y - h);
      ctx.lineTo(x + w / 2 + sideW, y - h * 0.9);
      ctx.lineTo(x + w / 2 + sideW, y);
      ctx.lineTo(x + w / 2, y);
    } else {
      ctx.moveTo(x - w / 2, y - h);
      ctx.lineTo(x - w / 2 - sideW, y - h * 0.9);
      ctx.lineTo(x - w / 2 - sideW, y);
      ctx.lineTo(x - w / 2, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(6,8,14,0.9)";
    ctx.fillRect(x - w / 2, y - h - 5 * p.scale, w, 6 * p.scale);
    if (p.scale > 0.08) {
      const cols = glass ? 5 + (item.seed % 2) : 3 + (item.seed % 3);
      const rows = 6 + (item.seed % 5);
      const gapX = w / (cols + 1);
      const gapY = h / (rows + 1.7);
      const winW = Math.max(1.3, (glass ? 4.2 : 3.1) * p.scale);
      const winH = Math.max(1.5, (glass ? 5.2 : 4.2) * p.scale);
      for (let row = 1; row <= rows; row += 1) {
        for (let col = 1; col <= cols; col += 1) {
          const lit = (item.seed + row * 3 + col * 7) % 5 !== 0;
          if (glass) ctx.fillStyle = lit ? "rgba(186,220,255,0.55)" : "rgba(40,60,90,0.35)";
          else if (hotel) ctx.fillStyle = lit ? "rgba(255,196,120,0.62)" : "rgba(70,50,40,0.3)";
          else ctx.fillStyle = lit ? "rgba(255,220,140,0.58)" : "rgba(60,70,95,0.3)";
          ctx.fillRect(x - w / 2 + col * gapX - winW / 2, y - h + row * gapY, winW, winH);
        }
      }
    }
    if (p.scale > 0.1) {
      ctx.fillStyle = "rgba(255, 206, 130, 0.3)";
      ctx.fillRect(x - w * 0.42, y - h * 0.15, w * 0.84, h * 0.13);
      ctx.fillStyle = hotel ? "#8a2030" : glass ? "#1a3c72" : "#2a3038";
      ctx.fillRect(x - w * 0.46, y - h * 0.175, w * 0.92, 5 * p.scale);
    }
  }

  function drawSign(ctx, item) {
    const p = project(0, item.z);
    if (p.scale < 0.06) return;
    const h = 38 * p.scale * 1.7;
    const x = p.x + item.side * p.roadW * 0.88;
    const y = p.y;
    ctx.fillStyle = "#3a4048";
    ctx.fillRect(x - 1.5 * p.scale, y - h, 3 * p.scale, h);
    const green = item.label === "35" || item.label.length <= 3;
    ctx.fillStyle = green ? "#1f6b3a" : "#1c3a78";
    const sw = Math.max(20, (green ? 28 : 44) * p.scale);
    const sh = Math.max(12, 18 * p.scale);
    roundRect(ctx, x - sw / 2, y - h - sh, sw, sh, 2);
    ctx.fill();
    ctx.fillStyle = "#f4f6fa";
    ctx.font = `700 ${Math.max(7, 9 * p.scale * 1.55)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.label, x, y - h - sh / 2);
  }

  function drawTraffic(ctx, item) {
    const p = project(0, item.z);
    if (p.scale < 0.08) return;
    const x = p.x + item.side * p.roadW * 0.72;
    const y = p.y;
    const h = 70 * p.scale * 1.7;
    ctx.fillStyle = "#2a3038";
    ctx.fillRect(x - 1.6 * p.scale, y - h, 3.2 * p.scale, h);
    ctx.fillStyle = "#1a1c20";
    roundRect(ctx, x - 6 * p.scale, y - h - 22 * p.scale, 12 * p.scale, 24 * p.scale, 2);
    ctx.fill();
    const phase = Math.floor(clock / 900 + item.z) % 3;
    ["#e23a3a", "#e6c36a", "#3dcea0"].forEach((color, i) => {
      ctx.fillStyle = i === phase ? color : "rgba(40,44,50,0.9)";
      ctx.beginPath();
      ctx.arc(x, y - h - 17 * p.scale + i * 7 * p.scale, 2.4 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawPad(ctx, x, y, scale, color, label, sub) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 36 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = Math.max(1, 1.4 * scale);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0b0c10";
    ctx.font = `700 ${Math.max(8, 11 * scale)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y - 4);
    if (sub) {
      ctx.fillStyle = "#f4f6fa";
      ctx.font = `600 ${Math.max(7, 9 * scale)}px Inter, sans-serif`;
      ctx.fillText(sub, x, y - 22 * scale);
    }
    ctx.restore();
  }

  function drawPool(ctx, x, y, scale, color) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBeams(ctx, x, y, scale, incoming) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    if (incoming) {
      const g = ctx.createRadialGradient(x, y - 26 * scale, 2 * scale, x, y + 36 * scale, 78 * scale);
      g.addColorStop(0, "rgba(255,248,230,0.55)");
      g.addColorStop(0.35, "rgba(255,230,180,0.16)");
      g.addColorStop(1, "rgba(255,220,160,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 16 * scale, y - 24 * scale);
      ctx.lineTo(x + 16 * scale, y - 24 * scale);
      ctx.lineTo(x + 86 * scale, y + 70 * scale);
      ctx.lineTo(x - 86 * scale, y + 70 * scale);
      ctx.closePath();
      ctx.fill();
    } else {
      const g = ctx.createLinearGradient(x, y - 8, x, y - cssH * 0.4);
      g.addColorStop(0, "rgba(220,232,255,0.2)");
      g.addColorStop(1, "rgba(220,232,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 34 * scale, y - 8);
      ctx.lineTo(x + 34 * scale, y - 8);
      ctx.lineTo(x + 12 * scale, y - cssH * 0.38);
      ctx.lineTo(x - 12 * scale, y - cssH * 0.38);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWorld(ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ox = shake ? rand(-shake, shake) : 0;
    const oy = shake ? rand(-shake, shake) * 0.35 : 0;
    ctx.translate(ox, oy);
    drawSky(ctx);
    drawSkyline(ctx);
    drawRoad(ctx);

    const layer = {
      build: 0,
      palm: 1,
      light: 1,
      sign: 1,
      traffic: 1,
      pax: 2,
      charge: 2,
      drop: 2,
      car: 3,
      player: 3,
    };
    const items = city.map((item) => ({ z: item.z, kind: item.kind, item }));
    if (game) {
      game.charges.forEach((ch) => items.push({ z: ch.z, kind: "charge", ch }));
      if (game.pax) items.push({ z: game.pax.z, kind: "pax" });
      if (game.drop) items.push({ z: game.drop.z, kind: "drop" });
      game.cars.forEach((c) => items.push({ z: c.z, kind: "car", c }));
      items.push({ z: PLAYER_Z, kind: "player" });
    }
    items.sort((a, b) => b.z - a.z || (layer[a.kind] || 0) - (layer[b.kind] || 0));

    items.forEach((it) => {
      if (it.kind === "build") {
        drawBuilding(ctx, it.item);
      } else if (it.kind === "palm") {
        const p = project(0, it.item.z);
        drawBillboard(ctx, sprites.palm, p.x + it.item.side * p.roadW * 1.08, p.y, 210 * p.scale);
      } else if (it.kind === "light") {
        const p = project(0, it.item.z);
        const x = p.x + it.item.side * p.roadW * 0.7;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(255,210,120,0.2)";
        ctx.beginPath();
        ctx.ellipse(x, p.y - 96 * p.scale, 24 * p.scale, 32 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawPool(ctx, x, p.y, p.scale * 1.4, "rgba(255,200,110,0.22)");
        drawBillboard(ctx, sprites.light, x, p.y, 138 * p.scale);
      } else if (it.kind === "sign") {
        drawSign(ctx, it.item);
      } else if (it.kind === "traffic") {
        drawTraffic(ctx, it.item);
      } else if (it.kind === "charge") {
        const p = project(LANE_X[it.ch.lane], it.ch.z);
        drawPad(
          ctx,
          p.x,
          p.y,
          p.scale,
          it.ch.super ? "rgba(61,206,160,0.82)" : "rgba(125,255,176,0.72)",
          it.ch.super ? "100" : "CHG",
          it.ch.super ? "Supercharger" : "Charge"
        );
        drawPool(ctx, p.x, p.y, p.scale, "rgba(125,255,176,0.28)");
        const side = it.ch.lane === 2 ? 1 : -1;
        const curb = project(LANE_X[it.ch.lane] + side * 0.55, it.ch.z);
        drawBillboard(ctx, sprites.charger, curb.x, curb.y, Math.max(32, 96 * p.scale));
      } else if (it.kind === "pax") {
        const p = project(LANE_X[game.pax.lane], game.pax.z);
        drawPad(ctx, p.x, p.y, p.scale, "rgba(122,215,255,0.82)", "PICK", game.pax.dest);
        const side = game.pax.lane === 0 ? -1 : 1;
        const curb = project(LANE_X[game.pax.lane] + side * 0.52, game.pax.z);
        drawBillboard(ctx, sprites.pax, curb.x, curb.y, Math.max(40, 132 * p.scale));
      } else if (it.kind === "drop") {
        const p = project(LANE_X[game.drop.lane], game.drop.z);
        drawPad(ctx, p.x, p.y, p.scale, "rgba(230,195,106,0.88)", "DROP", game.drop.dest);
      } else if (it.kind === "car") {
        const p = project(it.c.x, it.c.z);
        drawBeams(ctx, p.x, p.y, p.scale, true);
        drawPool(ctx, p.x, p.y, p.scale, "rgba(255,236,190,0.18)");
        drawBillboard(ctx, sprites.waymo, p.x, p.y, 88 * p.scale);
      } else if (it.kind === "player" && game) {
        const p = project(game.x, PLAYER_Z);
        const s = p.scale;
        const bounce = Math.sin(clock * 0.018) * 1.6 * s;
        const lean = (LANE_X[game.lane] - game.x) * 0.14 + game.curve * 0.025;
        drawBeams(ctx, p.x, p.y, s * (game.boost > 0 ? 1.25 : 1), false);
        ctx.save();
        ctx.translate(p.x, p.y + bounce);
        ctx.rotate(lean);
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        ctx.beginPath();
        ctx.ellipse(0, 10, 92 * s, 14 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const glow = ctx.createRadialGradient(26 * s, -58 * s, 4 * s, 18 * s, -52 * s, 78 * s);
        glow.addColorStop(0, "rgba(255,52,48,0.7)");
        glow.addColorStop(0.45, "rgba(255,40,40,0.22)");
        glow.addColorStop(1, "rgba(255,20,20,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(22 * s, -54 * s, 78 * s, 20 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawBillboard(ctx, sprites.cab, 0, 0, 152 * s);
        ctx.restore();
      }
    });

    particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    popups.forEach((p) => {
      const a = clamp(p.life / 0.95, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.font = `800 ${Math.max(15, 22 * (0.85 + a * 0.2))}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(8,10,16,0.55)";
      ctx.lineWidth = 4;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vig = ctx.createRadialGradient(cssW * 0.5, cssH * 0.58, cssW * 0.42, cssW * 0.5, cssH * 0.52, cssW * 0.92);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.14)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cssW, cssH);
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,236,210,${flash * 0.26})`;
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  function updateHud() {
    if (!game || !hud || hud.hidden) return;
    if (hudKm) hudKm.textContent = `${kmOf(game).toFixed(1)} km`;
    if (hudScore) hudScore.textContent = Math.round(score).toLocaleString();
    const batt = Math.round(game.batt);
    if (hudBatt) hudBatt.textContent = `${batt}%`;
    if (hudBattFill) hudBattFill.style.width = `${batt}%`;
    if (hudBattWrap) {
      hudBattWrap.classList.toggle("is-low", batt < 34 && batt >= 16);
      hudBattWrap.classList.toggle("is-dead", batt < 16);
    }
    let pax = "Empty";
    if (game.onboard && game.drop) pax = `Drop · ${game.drop.dest}`;
    else if (game.pax) pax = `Pick · ${game.pax.dest}`;
    if (hudPax) hudPax.textContent = pax;
    if (hudStreak) {
      if (game.streak > 0) {
        hudStreak.hidden = false;
        hudStreak.textContent = `${game.streak}× streak`;
      } else hudStreak.hidden = true;
    }
    if (statusBtn) statusBtn.textContent = game.onboard ? "Drop" : game.pax ? "Pick up" : "Empty";
    if (!game._boardAt || game.time - game._boardAt > 0.28) {
      game._boardAt = game.time;
      renderBoard();
    }
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    cssW = Math.max(320, rect.width);
    cssH = Math.max(280, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  function startPlay() {
    ensureAudio();
    resetGame();
    state = "run";
    hideOverlay();
    if (hud) hud.hidden = false;
    renderBoard();
  }
  function pause() {
    if (state !== "run") return;
    state = "pause";
    setEngine(0);
    showOverlay("Paused", "Hold", "The city waits. Resume when you are ready.", "Resume");
  }
  function resume() {
    if (state !== "pause") return;
    state = "run";
    hideOverlay();
    if (hud) hud.hidden = false;
  }

  function setHeld(key, on) {
    held[key] = on;
    padButtons[key]?.classList.toggle("is-held", on);
  }
  function releasePointer(id) {
    const key = padPointers.get(id);
    if (!key) return;
    padPointers.delete(id);
    if (![...padPointers.values()].some((k) => k === key)) setHeld(key, false);
  }
  function clearAllHolds() {
    padPointers.clear();
    setHeld("left", false);
    setHeld("right", false);
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
        /* ignore */
      }
      setHeld(key, true);
      if (key === "left") steer(-1);
      if (key === "right") steer(1);
      if (state === "attract" || state === "dead") startPlay();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", (e) => releasePointer(e.pointerId));
    el.addEventListener("pointercancel", (e) => releasePointer(e.pointerId));
  }
  root.querySelectorAll("[data-hold]").forEach((el) => bindHold(el, el.getAttribute("data-hold")));

  function typingInField(el) {
    if (!el || el === document.body) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return Boolean(el.closest?.("input, textarea, select, [data-cab-name]"));
  }
  function typingNow(e) {
    if (keysLocked) return true;
    if (e?.isComposing || e?.keyCode === 229) return true;
    if (nameInput && document.activeElement === nameInput) return true;
    return typingInField(e?.target) || typingInField(document.activeElement);
  }

  if (nameInput) {
    const saved = localStorage.getItem(NAME_STORE);
    if (saved) nameInput.value = saved.slice(0, 12);
    nameInput.addEventListener("input", () => {
      localStorage.setItem(NAME_STORE, callsign());
      renderBoard();
    });
    nameInput.addEventListener("focus", () => {
      keysLocked = true;
      clearAllHolds();
    });
    nameInput.addEventListener("blur", () => {
      keysLocked = false;
    });
    ["keydown", "keyup", "keypress"].forEach((type) => {
      nameInput.addEventListener(type, (e) => e.stopPropagation(), true);
    });
  }

  window.addEventListener("keydown", (e) => {
    if (typingNow(e)) return;
    if (e.key === "p" || e.key === "P") {
      if (state === "run") pause();
      else if (state === "pause") resume();
      return;
    }
    if (e.key === "m" || e.key === "M") {
      muted = !muted;
      applyMute();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      setHeld("left", true);
      steer(-1);
      if (state === "attract" || state === "dead") startPlay();
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      setHeld("right", true);
      steer(1);
      if (state === "attract" || state === "dead") startPlay();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (typingNow(e)) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setHeld("left", false);
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setHeld("right", false);
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (state === "attract" || state === "dead") {
      startPlay();
      return;
    }
    if (state !== "run") return;
    swipeX = e.clientX;
    swipeY = e.clientY;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (swipeX == null || state !== "run") return;
    const dx = e.clientX - swipeX;
    const dy = e.clientY - swipeY;
    swipeX = null;
    swipeY = null;
    if (Math.abs(dx) < 28 && Math.abs(dy) < 28) {
      const rect = canvas.getBoundingClientRect();
      steer(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1);
  });

  playBtn?.addEventListener("click", () => {
    ensureAudio();
    if (state === "pause") resume();
    else startPlay();
  });
  heroPlay?.addEventListener("click", () => {
    ensureAudio();
    if (state === "pause") resume();
    else startPlay();
  });
  muteBtn?.addEventListener("click", () => {
    ensureAudio();
    muted = !muted;
    applyMute();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearAllHolds();
      if (state === "run") pause();
    }
  });
  window.addEventListener("blur", clearAllHolds);
  window.addEventListener("resize", resize);

  function frame(now) {
    if (!last) last = now;
    const dt = clamp(now - last, 8, 34);
    last = now;
    if (state !== "pause") {
      step(dt);
      stepParticles(dt);
      shake *= 0.86;
      flash *= 0.9;
    }
    drawWorld(canvas.getContext("2d"));
    updateHud();
    requestAnimationFrame(frame);
  }

  if (!loadBoard().length && best > 0) {
    saveBoard([{ id: "best", name: callsign(), score: best, km: 0, rides: 0, at: Date.now() }]);
  }
  resize();
  renderBoard();
  requestAnimationFrame(frame);

  window.CybercabGame = {
    play: startPlay,
    state: () => state,
    score: () => score,
    km: () => kmOf(game),
    game: () => game,
    steer,
  };
})();
