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
  const hudSpeed = root.querySelector("[data-hud-speed]");
  const hudScore = root.querySelector("[data-hud-score]");
  const hudBuff = root.querySelector("[data-hud-buff]");
  const boardList = root.querySelector("[data-board-list]");
  const boardNow = root.querySelector("[data-board-now]");
  const nameInput = root.querySelector("[data-cab-name]");
  const muteBtn = root.querySelector("[data-cab-mute]");
  const nitroBtn = root.querySelector("[data-hold='nitro']");

  const STORE = "aljr.goldcab.best";
  const BOARD_STORE = "aljr.goldcab.board";
  const NAME_STORE = "aljr.goldcab.name";
  const SHARE_URL = "https://zzbz6jgyzy-creator.github.io/goldcab.html";
  const BOARD_MAX = 8;
  const LANES = 3;
  const LANE_X = [-0.66, 0, 0.66];
  const PLAYER_Z = 1.12;
  const HIT_Z = 0.42;
  const HIT_X = 0.34;
  const POWERS = [
    { id: "shield", label: "Shield", color: "#7ad7ff" },
    { id: "slow", label: "Slow", color: "#c9a6ff" },
    { id: "gold", label: "Gold ×2", color: "#e6c36a" },
    { id: "nitro", label: "Nitro", color: "#ff7a4a" },
  ];

  const held = { left: false, right: false, nitro: false };
  const padPointers = new Map();
  const padButtons = {};
  const particles = [];
  const buildings = [];
  const stars = [];

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
  let sprites = { cab: null, waymo: null };

  let game = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  for (let i = 0; i < 70; i += 1) {
    stars.push({
      x: Math.random(),
      y: Math.random() * 0.42,
      r: Math.random() * 1.3 + 0.2,
      a: Math.random() * 0.55 + 0.15,
    });
  }
  for (let i = 0; i < 18; i += 1) {
    buildings.push({
      side: i % 2 === 0 ? -1 : 1,
      z: i * 0.7 + Math.random() * 0.4,
      w: rand(0.18, 0.42),
      h: rand(0.35, 1.15),
      lit: Math.random(),
    });
  }

  function punch(img, crop) {
    if (!img) return null;
    const sx = Math.floor(img.width * crop.x);
    const sy = Math.floor(img.height * crop.y);
    const sw = Math.floor(img.width * crop.w);
    const sh = Math.floor(img.height * crop.h);
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    const x = c.getContext("2d");
    x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const g = x.createRadialGradient(sw * 0.5, sh * 0.48, sw * 0.16, sw * 0.5, sh * 0.5, sw * 0.52);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.62, "rgba(0,0,0,0.92)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.globalCompositeOperation = "destination-in";
    x.fillStyle = g;
    x.fillRect(0, 0, sw, sh);
    return c;
  }

  function loadImg(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  Promise.all([
    loadImg("/assets/goldcab/cybercab-rear.jpg"),
    loadImg("/assets/goldcab/waymo.jpg"),
  ]).then(([cab, waymo]) => {
    sprites.cab = punch(cab, { x: 0.28, y: 0.1, w: 0.66, h: 0.82 });
    sprites.waymo = punch(waymo, { x: 0.2, y: 0.04, w: 0.6, h: 0.86 });
  });

  function callsign() {
    const raw = (nameInput?.value || localStorage.getItem(NAME_STORE) || "Cab").trim();
    return (raw || "Cab").slice(0, 12).toUpperCase();
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
    best = n;
    localStorage.setItem(STORE, String(n));
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
          ? `This run  ·  ${score.toLocaleString()}  ·  ${kmOf(game).toFixed(1)} km`
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
      km: kmOf(game),
      dodged: game?.dodged || 0,
      at: Date.now(),
    };
    rows.push(entry);
    rows.sort((a, b) => b.score - a.score || a.at - b.at);
    saveBoard(rows);
    freshId = entry.id;
    if (score > best) setBest(score);
    renderBoard();
  }

  function shareHref() {
    const km = kmOf(game).toFixed(1);
    const text = `Gold Cab · ${score.toLocaleString()} · ${km} km · ${game?.dodged || 0} Waymos dodged. Beat me: ${SHARE_URL}`;
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
      } else {
        shareBtn.hidden = true;
      }
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
      loot: [],
      spawnIn: 1.15,
      lootIn: 6.5,
      dodged: 0,
      near: 0,
      shield: false,
      slow: 0,
      gold: 0,
      nitro: 0,
      nitroStock: 0,
      grace: 0.7,
      dead: false,
    };
    score = 0;
    particles.length = 0;
    shake = 0;
    flash = 0;
  }

  function difficulty() {
    const t = game.time;
    return {
      speed: 5.4 + t * 0.072,
      oncoming: 2.4 + t * 0.04,
      spawn: Math.max(0.4, 1.45 - t * 0.016),
      double: t > 16,
      pack: t > 38,
      weaver: t > 20,
      rain: t > 28,
    };
  }

  function openLanes(z0, z1) {
    const blocked = new Set();
    game.cars.forEach((c) => {
      if (c.z >= z0 && c.z <= z1) blocked.add(c.lane);
    });
    return [0, 1, 2].filter((l) => !blocked.has(l));
  }

  function spawnWave() {
    const d = difficulty();
    const far = openLanes(6.2, 10);
    const pool = far.length ? far : [0, 1, 2];
    if (pool.length <= 1) return;
    let count = 1;
    if (d.double && Math.random() < 0.48) count = 2;
    if (d.pack && Math.random() < 0.42) count = 2;
    count = Math.min(count, 2, pool.length - 1);
    const lanes = pool.slice().sort(() => Math.random() - 0.5);
    const keep = lanes[0];
    lanes
      .filter((l) => l !== keep)
      .slice(0, count)
      .forEach((lane) => addCar(lane, d));
  }

  function addCar(lane, d) {
    game.cars.push({
      lane,
      x: LANE_X[lane],
      z: rand(8.2, 9.6),
      weave: d.weaver && Math.random() < 0.34,
      weaved: false,
      lid: Math.random() * Math.PI * 2,
    });
  }

  function spawnLoot() {
    const free = openLanes(7, 10);
    const lane = pick(free.length ? free : [0, 1, 2]);
    game.loot.push({
      lane,
      x: LANE_X[lane],
      z: rand(7.6, 9.2),
      kind: pick(POWERS).id,
      spin: Math.random() * Math.PI * 2,
    });
  }

  function burst(x, y, color, n, size) {
    for (let i = 0; i < n; i += 1) {
      particles.push({
        x,
        y,
        vx: rand(-1.6, 1.6),
        vy: rand(-2.4, 0.4),
        life: rand(0.25, 0.7),
        max: 0.7,
        color,
        size: size || rand(1.2, 3.2),
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
    if (audio?.master) audio.master.gain.setTargetAtTime(muted ? 0 : 0.72, audio.currentTime, 0.04);
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
    master.gain.value = muted ? 0 : 0.72;
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
    osc.frequency.value = 42;
    const oscFilter = audio.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.value = 90;
    const oscGain = audio.createGain();
    oscGain.gain.value = 0;
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);

    brown.start();
    osc.start();
    engine = { noiseGain, noiseFilter, oscGain, osc, master };
    applyMute();
  }

  function setEngine(amount) {
    if (!engine || !audio) return;
    const t = audio.currentTime;
    const a = muted ? 0 : clamp(amount, 0, 1);
    engine.noiseGain.gain.setTargetAtTime(a * 0.12, t, 0.05);
    engine.oscGain.gain.setTargetAtTime(a * 0.035, t, 0.06);
    engine.noiseFilter.frequency.setTargetAtTime(140 + a * 480, t, 0.08);
    engine.osc.frequency.setTargetAtTime(38 + a * 28, t, 0.1);
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
    const zSafe = Math.max(0.18, z);
    const scale = 1 / (zSafe * 0.2 + 0.78);
    const curveOff = (game?.curve || 0) * zSafe * zSafe * 0.055;
    const horizon = cssH * 0.38;
    const y = horizon + (cssH - horizon) * (1 - scale) * 1.12;
    const roadW = cssW * 0.96 * scale;
    const x = cssW * 0.5 + curveOff * cssW + (worldX - (game?.x || 0)) * roadW * 0.52;
    return { x, y, scale, roadW };
  }

  function steer(dir) {
    if (!game || state !== "run" || laneCool > 0) return;
    const next = clamp(game.lane + dir, 0, LANES - 1);
    if (next === game.lane) return;
    game.lane = next;
    laneCool = 0.14;
    tone(220, 140, 0.05, 0.08, "triangle");
  }

  function fireNitro() {
    if (!game || state !== "run" || game.nitroStock < 1 || game.nitro > 0) return;
    game.nitroStock -= 1;
    game.nitro = 1.2;
    game.grace = Math.max(game.grace, 1.05);
    flash = 0.45;
    tone(180, 520, 0.08, 0.22, "sawtooth");
    noiseBurst(0.18, 900, 0.12);
    updateNitroPad();
  }

  function updateNitroPad() {
    if (!nitroBtn) return;
    const ready = Boolean(game && game.nitroStock > 0 && state === "run");
    nitroBtn.disabled = !ready;
    nitroBtn.classList.toggle("is-ready", ready);
    nitroBtn.textContent = ready ? `Nitro ×${game.nitroStock}` : "Nitro";
  }

  function collect(kind) {
    if (kind === "shield") game.shield = true;
    if (kind === "slow") game.slow = 4.2;
    if (kind === "gold") game.gold = 6.5;
    if (kind === "nitro") {
      game.nitroStock = Math.min(2, game.nitroStock + 1);
      updateNitroPad();
    }
    const bonus = kind === "gold" ? 180 : 90;
    score += bonus;
    tone(kind === "nitro" ? 240 : 420, 880, 0.07, 0.18, "sine");
    tone(660, 990, 0.04, 0.12, "triangle");
  }

  function crash() {
    if (game.dead) return;
    if (game.shield) {
      game.shield = false;
      game.grace = 0.85;
      flash = 0.5;
      shake = 7;
      noiseBurst(0.16, 500, 0.14);
      tone(90, 40, 0.1, 0.2, "sawtooth");
      return;
    }
    game.dead = true;
    state = "dead";
    shake = 14;
    flash = 0.9;
    setEngine(0);
    noiseBurst(0.4, 280, 0.22);
    tone(120, 40, 0.12, 0.45, "sawtooth");
    submitRun();
    const km = kmOf(game).toFixed(1);
    showOverlay(
      "Crash",
      `${score.toLocaleString()} · ${km} km`,
      `${game.dodged} Waymos dodged, ${game.near} near-misses. The highway got faster. Run it again.`,
      "Play again",
      true
    );
    if (hud) hud.hidden = true;
    updateNitroPad();
  }

  function step(dt) {
    const t = dt / 1000;
    clock += dt;
    laneCool = Math.max(0, laneCool - t);
    if (state !== "run" || !game) return;

    if (held.left) steer(-1);
    if (held.right) steer(1);
    if (held.nitro) fireNitro();

    const d = difficulty();
    let speed = d.speed;
    if (game.nitro > 0) speed *= 1.38;
    if (game.slow > 0) speed *= 0.82;
    game.dist += speed * t * 18;
    game.time += t;
    game.grace = Math.max(0, game.grace - t);
    game.slow = Math.max(0, game.slow - t);
    game.gold = Math.max(0, game.gold - t);
    game.nitro = Math.max(0, game.nitro - t);

    const mult = game.gold > 0 ? 2 : 1;
    score += Math.round(speed * t * 7 * mult);

    game.curveTo = Math.sin(game.dist * 0.0022) * Math.min(1.05, game.time / 36) * 0.85;
    game.curve = lerp(game.curve, game.curveTo, 0.04);
    game.x = lerp(game.x, LANE_X[game.lane], 0.16);

    const zSpeed = (speed + d.oncoming * (game.slow > 0 ? 0.42 : 1) + (game.nitro > 0 ? 3 : 0)) * t * 0.85;

    game.spawnIn -= t;
    if (game.spawnIn <= 0) {
      spawnWave();
      game.spawnIn = d.spawn * rand(0.86, 1.14);
    }
    game.lootIn -= t;
    if (game.lootIn <= 0) {
      spawnLoot();
      game.lootIn = rand(6.2, 9.4);
    }

    const p = project(game.x, PLAYER_Z);

    game.cars.forEach((c) => {
      c.z -= zSpeed;
      c.lid += t * 6;
      if (c.weave && !c.weaved && c.z < 5.4 && c.z > 2.6) {
        const opts = [0, 1, 2].filter((l) => l !== c.lane);
        c.lane = pick(opts);
        c.weaved = true;
      }
      c.x = lerp(c.x, LANE_X[c.lane], 0.08);
      if (c.z < PLAYER_Z + HIT_Z && c.z > PLAYER_Z - 0.2 && !c.passed) {
        const dx = Math.abs(c.x - game.x);
        if (dx < HIT_X && game.grace <= 0) crash();
        else if (dx < 0.72 && dx >= HIT_X) {
          c.passed = true;
          game.near += 1;
          score += 40 * (game.gold > 0 ? 2 : 1);
          const s = project(c.x, c.z);
          burst(s.x, s.y, "#fff6d8", 8, 2);
          tone(740, 220, 0.04, 0.09, "square");
        }
      }
      if (c.z < 0.35 && !c.cleared) {
        c.cleared = true;
        game.dodged += 1;
        score += 12;
      }
    });
    game.cars = game.cars.filter((c) => c.z > 0.12);

    game.loot.forEach((l) => {
      l.z -= zSpeed * 0.96;
      l.spin += t * 3;
      l.x = LANE_X[l.lane];
      if (Math.abs(l.z - PLAYER_Z) < 0.38 && Math.abs(l.x - game.x) < 0.32) {
        l.got = true;
        collect(l.kind);
        burst(p.x, p.y - 20, POWERS.find((k) => k.id === l.kind).color, 14, 2.4);
      }
    });
    game.loot = game.loot.filter((l) => l.z > 0.2 && !l.got);

    buildings.forEach((b) => {
      b.z -= speed * t * 0.12;
      if (b.z < 0.4) {
        b.z += 12;
        b.h = rand(0.35, 1.2);
        b.w = rand(0.18, 0.45);
      }
    });

    const want = clamp(speed / 14, 0.25, 1);
    setEngine(want);
    if (d.rain && Math.random() < 0.4) {
      particles.push({
        x: rand(0, cssW),
        y: rand(-10, cssH * 0.4),
        vx: -1.8,
        vy: 14,
        life: 0.45,
        max: 0.45,
        color: "rgba(190,214,255,0.35)",
        size: 1.1,
        rain: true,
      });
    }
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

  function drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, "#070814");
    g.addColorStop(0.38, "#14182a");
    g.addColorStop(0.62, "#2a2030");
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

    const moonX = cssW * 0.82;
    const moonY = cssH * 0.14;
    const moon = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, 70);
    moon.addColorStop(0, "rgba(255,236,200,0.85)");
    moon.addColorStop(0.18, "rgba(255,220,160,0.18)");
    moon.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = moon;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function drawCity(ctx) {
    const horizon = cssH * 0.38;
    buildings.forEach((b) => {
      const p = project(b.side * 1.55, b.z);
      const w = b.w * p.roadW * 0.7;
      const h = b.h * (cssH * 0.28) * p.scale * 3.2;
      const x = p.x + b.side * (p.roadW * 0.62);
      ctx.fillStyle = b.side < 0 ? "#12141c" : "#10131a";
      ctx.fillRect(x - w / 2, p.y - h, w, h);
      ctx.fillStyle = `rgba(230,195,106,${0.08 + b.lit * 0.12})`;
      for (let wy = 6; wy < h - 8; wy += 7) {
        for (let wx = 4; wx < w - 6; wx += 6) {
          if ((wx + wy + Math.floor(b.lit * 8)) % 5 !== 0) continue;
          ctx.fillRect(x - w / 2 + wx, p.y - h + wy, 2.2, 2.2);
        }
      }
    });
    const haze = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 8);
    haze.addColorStop(0, "rgba(20,16,28,0)");
    haze.addColorStop(1, "rgba(42,32,48,0.55)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - 40, cssW, 50);
  }

  function drawRoad(ctx) {
    const segs = 42;
    for (let i = segs; i >= 0; i -= 1) {
      const zA = i * 0.22;
      const zB = (i + 1) * 0.22;
      const a = project(0, zA);
      const b = project(0, zB);
      const stripe = Math.floor((zA + (game?.dist || 0) * 0.04) / 0.45) % 2;
      ctx.fillStyle = stripe ? "#0e1016" : "#12141c";
      ctx.beginPath();
      ctx.moveTo(a.x - a.roadW * 1.35, a.y);
      ctx.lineTo(a.x + a.roadW * 1.35, a.y);
      ctx.lineTo(b.x + b.roadW * 1.35, b.y);
      ctx.lineTo(b.x - b.roadW * 1.35, b.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1a1d26";
      ctx.beginPath();
      ctx.moveTo(a.x - a.roadW * 0.5, a.y);
      ctx.lineTo(a.x + a.roadW * 0.5, a.y);
      ctx.lineTo(b.x + b.roadW * 0.5, b.y);
      ctx.lineTo(b.x - b.roadW * 0.5, b.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = stripe ? "#c81a2e" : "#f2efe6";
      ctx.beginPath();
      ctx.moveTo(a.x - a.roadW * 0.52, a.y);
      ctx.lineTo(a.x - a.roadW * 0.48, a.y);
      ctx.lineTo(b.x - b.roadW * 0.48, b.y);
      ctx.lineTo(b.x - b.roadW * 0.52, b.y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(a.x + a.roadW * 0.48, a.y);
      ctx.lineTo(a.x + a.roadW * 0.52, a.y);
      ctx.lineTo(b.x + b.roadW * 0.52, b.y);
      ctx.lineTo(b.x + b.roadW * 0.48, b.y);
      ctx.closePath();
      ctx.fill();

      if (stripe) {
        ctx.fillStyle = "rgba(230,195,106,0.55)";
        [-0.165, 0.165].forEach((off) => {
          ctx.beginPath();
          ctx.moveTo(a.x + a.roadW * off - 1.2 * a.scale, a.y);
          ctx.lineTo(a.x + a.roadW * off + 1.2 * a.scale, a.y);
          ctx.lineTo(b.x + b.roadW * off + 1.2 * b.scale, b.y);
          ctx.lineTo(b.x + b.roadW * off - 1.2 * b.scale, b.y);
          ctx.closePath();
          ctx.fill();
        });
      }
    }
  }

  function drawProcCab(ctx, s, nitro) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createLinearGradient(-30, -36, 30, 12);
    body.addColorStop(0, "#8a6a32");
    body.addColorStop(0.45, "#e6c36a");
    body.addColorStop(1, "#6a5228");
    ctx.fillStyle = body;
    roundRect(ctx, -26, -34, 52, 38, 12);
    ctx.fill();
    ctx.fillStyle = "#14161c";
    roundRect(ctx, -18, -32, 36, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#e23b48";
    ctx.fillRect(-18, -2, 36, 3);
    ctx.fillStyle = "#1a1408";
    ctx.beginPath();
    ctx.ellipse(-20, 6, 7, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(20, 6, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (nitro) {
      ctx.fillStyle = "rgba(255,140,60,0.8)";
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(0, 22 + Math.sin(clock * 0.04) * 4);
      ctx.lineTo(8, 8);
      ctx.fill();
    }
  }

  function drawProcWaymo(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createLinearGradient(0, -40, 0, 14);
    body.addColorStop(0, "#f6f7fa");
    body.addColorStop(1, "#c8ccd4");
    ctx.fillStyle = body;
    roundRect(ctx, -28, -28, 56, 36, 10);
    ctx.fill();
    ctx.fillStyle = "#141820";
    roundRect(ctx, -22, -24, 44, 14, 6);
    ctx.fill();
    ctx.fillStyle = "#2a3038";
    roundRect(ctx, -6, -38, 12, 12, 4);
    ctx.fill();
    ctx.fillStyle = "#d8dde4";
    ctx.beginPath();
    ctx.arc(0, -34, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -34, 7, clock * 0.01, clock * 0.01 + 1.2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,244,210,0.95)";
    ctx.beginPath();
    ctx.ellipse(-16, -6, 6, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(16, -6, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpriteCar(ctx, img, x, y, w, h, fallback) {
    ctx.save();
    ctx.translate(x, y);
    if (img) {
      ctx.drawImage(img, -w / 2, -h, w, h);
    } else {
      const s = w / 64;
      ctx.scale(s, s);
      fallback(ctx);
    }
    ctx.restore();
  }

  function drawWorld(ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ox = shake ? rand(-shake, shake) : 0;
    const oy = shake ? rand(-shake, shake) * 0.4 : 0;
    ctx.translate(ox, oy);
    drawSky(ctx);
    drawCity(ctx);
    drawRoad(ctx);

    const items = [];
    if (game) {
      game.loot.forEach((l) => items.push({ z: l.z, kind: "loot", l }));
      game.cars.forEach((c) => items.push({ z: c.z, kind: "car", c }));
      items.push({ z: PLAYER_Z, kind: "player" });
    }
    items.sort((a, b) => b.z - a.z);

    items.forEach((it) => {
      if (it.kind === "loot") {
        const p = project(it.l.x, it.l.z);
        const spec = POWERS.find((k) => k.id === it.l.kind);
        const r = 16 * p.scale * 2.2;
        ctx.save();
        ctx.translate(p.x, p.y - r);
        ctx.rotate(Math.sin(it.l.spin) * 0.2);
        ctx.fillStyle = spec.color;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#0b0c10";
        ctx.font = `600 ${Math.max(8, 10 * p.scale * 2)}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(spec.id === "gold" ? "×2" : spec.id === "nitro" ? "N" : spec.id === "slow" ? "S" : "O", 0, 1);
        ctx.restore();
      } else if (it.kind === "car") {
        const p = project(it.c.x, it.c.z);
        const w = 92 * p.scale * 2.05;
        const h = 58 * p.scale * 2.05;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(255,236,190,0.18)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - h * 0.35, w * 0.7, h * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawSpriteCar(ctx, sprites.waymo, p.x, p.y, w, h, drawProcWaymo);
      } else {
        const p = project(game.x, PLAYER_Z);
        const lean = (LANE_X[game.lane] - game.x) * 0.25 + game.curve * 0.04;
        const w = 150 * p.scale * 1.55;
        const h = 92 * p.scale * 1.55;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(lean);
        if (game.shield) {
          ctx.strokeStyle = "rgba(122,215,255,0.85)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, -h * 0.45, w * 0.55, h * 0.58, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (sprites.cab) {
          ctx.drawImage(sprites.cab, -w / 2, -h, w, h);
        } else {
          ctx.save();
          ctx.scale(w / 64, w / 64);
          drawProcCab(ctx, 1, game.nitro > 0);
          ctx.restore();
        }
        if (game.nitro > 0) {
          ctx.fillStyle = "rgba(255,140,60,0.55)";
          ctx.beginPath();
          ctx.moveTo(-12, 4);
          ctx.lineTo(0, 28 + Math.sin(clock * 0.05) * 6);
          ctx.lineTo(12, 4);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      if (p.rain) {
        ctx.fillRect(p.x, p.y, 1.2, 8);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vig = ctx.createRadialGradient(cssW * 0.5, cssH * 0.55, cssW * 0.2, cssW * 0.5, cssH * 0.5, cssW * 0.78);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cssW, cssH);

    if (game?.slow > 0) {
      ctx.fillStyle = `rgba(80,40,120,${0.08 + Math.sin(clock * 0.01) * 0.03})`;
      ctx.fillRect(0, 0, cssW, cssH);
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,236,210,${flash * 0.28})`;
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  function updateHud() {
    if (!game || !hud || hud.hidden) return;
    const spd = Math.round((80 + game.time * 2.1) * (game.nitro > 0 ? 1.25 : 1));
    if (hudKm) hudKm.textContent = `${kmOf(game).toFixed(1)} km`;
    if (hudSpeed) hudSpeed.textContent = `${spd} km/h`;
    if (hudScore) hudScore.textContent = score.toLocaleString();
    const buffs = [];
    if (game.shield) buffs.push("Shield");
    if (game.slow > 0) buffs.push("Slow");
    if (game.gold > 0) buffs.push("×2");
    if (game.nitro > 0) buffs.push("Nitro");
    if (hudBuff) hudBuff.textContent = buffs.join(" · ");
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
    updateNitroPad();
    renderBoard();
  }

  function pause() {
    if (state !== "run") return;
    state = "pause";
    setEngine(0);
    showOverlay("Paused", "Hold", "The Waymos wait. Resume when you are ready.", "Resume");
  }

  function resume() {
    if (state !== "pause") return;
    state = "run";
    hideOverlay();
    if (hud) hud.hidden = false;
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
    padPointers.clear();
    setHeld("left", false);
    setHeld("right", false);
    setHeld("nitro", false);
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
        /* capture is best-effort */
      }
      setHeld(key, true);
      if (key === "left") steer(-1);
      if (key === "right") steer(1);
      if (key === "nitro") fireNitro();
      if (state === "attract" || state === "dead") startPlay();
    };
    const up = (e) => releasePointer(e.pointerId);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  root.querySelectorAll("[data-hold]").forEach((el) => {
    bindHold(el, el.getAttribute("data-hold"));
  });

  function typingInField(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return Boolean(el.closest?.("input, textarea, select, [contenteditable='true'], [data-cab-name]"));
  }

  function typingNow(e) {
    if (keysLocked) return true;
    if (e?.isComposing || e?.keyCode === 229) return true;
    if (nameInput && document.activeElement === nameInput) return true;
    if (typingInField(e?.target) || typingInField(document.activeElement)) return true;
    return false;
  }

  if (nameInput) {
    const savedName = localStorage.getItem(NAME_STORE);
    if (savedName) nameInput.value = savedName.slice(0, 12);
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
    if (e.key === " " || e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
      e.preventDefault();
      fireNitro();
      if (state === "attract" || state === "dead") startPlay();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (typingNow(e)) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setHeld("left", false);
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setHeld("right", false);
    if (e.key === " " || e.key === "w" || e.key === "W" || e.key === "ArrowUp") setHeld("nitro", false);
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (state === "attract" || state === "dead") {
      startPlay();
      return;
    }
    if (state !== "run") return;
    swipeX = e.clientX;
    swipeY = e.clientY;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
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
    const ctx = canvas.getContext("2d");
    drawWorld(ctx);
    updateHud();
    requestAnimationFrame(frame);
  }

  if (!loadBoard().length && best > 0) {
    saveBoard([{ id: "best", name: callsign(), score: best, km: 0, at: Date.now() }]);
  }

  resize();
  renderBoard();
  updateNitroPad();
  requestAnimationFrame(frame);

  window.GoldCabGame = {
    play: startPlay,
    state: () => state,
    score: () => score,
    km: () => kmOf(game),
    game: () => game,
    steer,
    fireNitro,
    board: () => visibleBoard(),
  };
})();
