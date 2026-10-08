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

  const STORE = "aljr.catch.best";
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

  const input = { left: false, right: false, thrust: false };
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
  let rumble;
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

  function showOverlay(kicker, title, copy, action) {
    if (!overlay) return;
    overlay.hidden = false;
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

  function ensureAudio() {
    if (audio || muted) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
    rumble = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    rumble.type = "sawtooth";
    rumble.frequency.value = 46;
    filter.type = "lowpass";
    filter.frequency.value = 140;
    gain.gain.value = 0;
    rumble.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    rumble.start();
    rumble.gainNode = gain;
  }

  function setRumble(on) {
    if (!audio || !rumble || muted) return;
    const g = rumble.gainNode.gain;
    g.cancelScheduledValues(audio.currentTime);
    g.linearRampToValueAtTime(on ? 0.045 : 0, audio.currentTime + 0.05);
  }

  function blip(kind) {
    if (!audio || muted) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    if (kind === "catch") {
      o.type = "triangle";
      o.frequency.value = 220;
      o.frequency.exponentialRampToValueAtTime(880, audio.currentTime + 0.18);
      g.gain.value = 0.08;
    } else {
      o.type = "sawtooth";
      o.frequency.value = 90;
      o.frequency.exponentialRampToValueAtTime(30, audio.currentTime + 0.35);
      g.gain.value = 0.1;
    }
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.4);
    o.start();
    o.stop(audio.currentTime + 0.42);
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
  }

  function beginAttract() {
    flight = 0;
    resetShip(true);
    state = "attract";
    if (hud) hud.hidden = true;
    showOverlay(
      "Starbase",
      "Catch the Ship",
      "Tilt left and right. Hold throttle to kill speed. Get the pins onto the arms — not the ocean, not the tower.",
      "Play"
    );
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
    blip("fail");
    result = kind;
    state = "fail";
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
    blip("catch");
    state = "caught";
    showOverlay(
      s.name,
      "Caught",
      `Pins on the arms. +${gained.toLocaleString()}  ·  Run ${score.toLocaleString()}`,
      "Next flight"
    );
  }

  function steerAuto() {
    const errX = ship.x - CATCH_X;
    const pinY = ship.y - 4;
    const alt = ARM_Y - pinY;
    const wantAngle = clamp(-errX * 0.0022 - ship.vx * 0.1, -0.16, 0.16);
    input.left = ship.angle > wantAngle + 0.025;
    input.right = ship.angle < wantAngle - 0.025;
    const upright = Math.abs(ship.angle) < 0.2;
    const wantVy = alt > 280 ? 1.15 : alt > 120 ? 0.68 : alt > 22 ? 0.34 : 0.08;
    input.thrust = ship.fuel > 1 && upright && (ship.vy > wantVy || (alt < 50 && Math.abs(errX) > 8 && ship.vy > 0.08));
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

    if (input.left) ship.av -= 0.00016 * dt;
    if (input.right) ship.av += 0.00016 * dt;
    ship.av *= Math.pow(0.9, dt * 0.08);
    ship.angle = clamp(ship.angle + ship.av * dt, -0.52, 0.52);

    const burning = input.thrust && ship.fuel > 0;
    ship.thrusting = burning;
    if (burning) {
      ship.fuel = Math.max(0, ship.fuel - 0.0075 * dt);
      const thrust = 0.0052 * dt;
      ship.vx += Math.sin(ship.angle) * thrust;
      ship.vy -= Math.cos(ship.angle) * thrust;
      emitExhaust();
    }
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
    const down = (e) => {
      e.preventDefault();
      input[key] = true;
      el.classList.add("is-held");
      if (state === "attract" || state === "attract-hold" || state === "fail" || state === "caught") {
        if (key === "thrust") startPlay();
      }
    };
    const up = () => {
      input[key] = false;
      el.classList.remove("is-held");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  }

  document.querySelectorAll("[data-hold]").forEach((el) => {
    bindHold(el, el.getAttribute("data-hold"));
  });

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
      setRumble(false);
      return;
    }
    const mapped = keyMap[e.key];
    if (!mapped) return;
    e.preventDefault();
    input[mapped] = true;
    if ((state === "attract" || state === "attract-hold" || state === "ready") && mapped === "thrust") startPlay();
  });

  window.addEventListener("keyup", (e) => {
    const mapped = keyMap[e.key];
    if (mapped) input[mapped] = false;
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
    if (document.hidden && state === "fly") {
      state = "pause";
      setRumble(false);
      showOverlay("Paused", "Hold", "Ship is waiting on the chopsticks.", "Resume");
    }
  });

  window.addEventListener("resize", resize);
  resize();
  beginAttract();
  requestAnimationFrame(frame);

  window.CatchGame = {
    play: startPlay,
    state: () => state,
    ship: () => ship,
    score: () => score,
    autopilot(on) {
      auto = Boolean(on);
    },
  };
})();
