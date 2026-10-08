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
  const WORLD_W = 1100;
  const GROUND = 1480;
  const SHORE = 500;
  const TOWER_X = 820;
  const ARM_Y = 1210;
  const VIEW_W = 440;
  const VIEW_H = 290;

  const FLIGHTS = [
    { name: "Flight 1", wind: 0, fuel: 100, gap: 46, catchVy: 2.35, night: 0 },
    { name: "Flight 2", wind: 0.007, fuel: 88, gap: 40, catchVy: 2.05, night: 0.25 },
    { name: "Flight 3", wind: 0.012, fuel: 78, gap: 34, catchVy: 1.8, night: 0.55 },
    { name: "Flight 4", wind: 0.018, fuel: 70, gap: 30, catchVy: 1.6, night: 0.8 },
  ];

  const input = { left: false, right: false, thrust: false };
  const cam = { x: 200, y: 0 };
  const stars = [];
  const particles = [];

  let dpr = 1;
  let cssW = 800;
  let cssH = 500;
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

  for (let i = 0; i < 160; i += 1) {
    stars.push({
      x: Math.random() * WORLD_W,
      y: Math.random() * (GROUND - 40),
      r: Math.random() * 1.5 + 0.25,
      a: Math.random() * 0.85 + 0.2,
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
      x: 410 + rand(-40, 50),
      y: 240 + rand(-12, 18),
      vx: rand(-0.2, 0.28),
      vy: 0.2,
      angle: rand(-0.08, 0.08),
      av: 0,
      fuel: s.fuel,
      w: 26,
      h: 128,
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
      "Left and right to tilt. Hold throttle to kill speed. Get the pins onto the arms — not the ocean, not the tower.",
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
      const precision = clamp(1 - Math.abs(ship.x - (TOWER_X - 96)) / 40, 0, 1);
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
    const targetX = TOWER_X - 96;
    const errX = ship.x - targetX;
    const pinY = ship.y - 4;
    const alt = ARM_Y - pinY;
    const wantAngle = clamp(-errX * 0.0018 - ship.vx * 0.1, -0.16, 0.16);
    input.left = ship.angle > wantAngle + 0.025;
    input.right = ship.angle < wantAngle - 0.025;
    const upright = Math.abs(ship.angle) < 0.2;
    const wantVy = alt > 400 ? 1.2 : alt > 160 ? 0.7 : alt > 24 ? 0.36 : 0.08;
    input.thrust = ship.fuel > 1 && upright && (ship.vy > wantVy || (alt < 55 && Math.abs(errX) > 8 && ship.vy > 0.08));
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
    }
    setRumble(burning && state === "fly");

    ship.vy += 0.00185 * dt;
    ship.vx += wind * dt * 0.06;
    ship.vx *= Math.pow(0.9992, dt);
    ship.x += ship.vx * dt * 0.06;
    ship.y += ship.vy * dt * 0.06;

    if (burning && Math.random() < 0.7) {
      const ex = ship.x + Math.sin(ship.angle) * (ship.h * 0.46);
      const ey = ship.y + Math.cos(ship.angle) * (ship.h * 0.46);
      particles.push({
        x: ex + rand(-4, 4),
        y: ey,
        vx: ship.vx * 0.2 + Math.sin(ship.angle) * rand(1.2, 2.6),
        vy: ship.vy * 0.2 + Math.cos(ship.angle) * rand(1.4, 3.2),
        life: rand(10, 22),
        max: 22,
        size: rand(1.4, 3.2),
        color: Math.random() > 0.45 ? "#ff8a2a" : "#ffd27a",
      });
    }

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
      ship.x = lerp(ship.x, TOWER_X - 96, 0.2);
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
      p.vy += 0.03;
      p.life -= 1;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (particles.length > 140) particles.splice(0, particles.length - 140);
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
    return (canvas.width / dpr) / VIEW_W;
  }

  function drawFlap(ctx, x, y, len, thick, sweep) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + sweep);
    ctx.lineTo(x + len, y + sweep + thick);
    ctx.lineTo(x, y + thick + 1);
    ctx.closePath();
    ctx.fill();
  }

  function drawRaptor(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    const bell = ctx.createLinearGradient(-6 * scale, 0, 6 * scale, 0);
    bell.addColorStop(0, "#2a2218");
    bell.addColorStop(0.35, "#6a4a2c");
    bell.addColorStop(0.5, "#c48a48");
    bell.addColorStop(0.65, "#6a4a2c");
    bell.addColorStop(1, "#241c14");
    ctx.fillStyle = bell;
    ctx.beginPath();
    ctx.moveTo(-3.2 * scale, -2 * scale);
    ctx.lineTo(-5.6 * scale, 8 * scale);
    ctx.quadraticCurveTo(0, 10.5 * scale, 5.6 * scale, 8 * scale);
    ctx.lineTo(3.2 * scale, -2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 210, 140, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 7.2 * scale, 3.4 * scale, 1.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShip(ctx) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    const h = ship.h;
    const w = ship.w;
    const flicker = ship.thrusting ? 0.85 + Math.sin(clock * 0.08) * 0.15 : 0;

    if (ship.thrusting) {
      const outer = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.42 + 88);
      outer.addColorStop(0, `rgba(255,168,64,${0.55 * flicker})`);
      outer.addColorStop(0.35, `rgba(255,70,16,${0.32 * flicker})`);
      outer.addColorStop(1, "rgba(255,30,0,0)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.moveTo(-11, h * 0.44);
      ctx.lineTo(11, h * 0.44);
      ctx.lineTo(Math.sin(clock * 0.04) * 5, h * 0.44 + 86);
      ctx.closePath();
      ctx.fill();
      const core = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.42 + 46);
      core.addColorStop(0, `rgba(255,255,245,${0.95 * flicker})`);
      core.addColorStop(0.2, `rgba(180,220,255,${0.7 * flicker})`);
      core.addColorStop(0.55, `rgba(255,170,70,${0.35 * flicker})`);
      core.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(-5, h * 0.44);
      ctx.lineTo(5, h * 0.44);
      ctx.lineTo(Math.sin(clock * 0.07) * 2, h * 0.44 + 48);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#8d8880";
    drawFlap(ctx, -w * 0.48, h * 0.02, -26, 9, 4);
    drawFlap(ctx, w * 0.48, h * 0.02, 26, 9, 4);
    ctx.fillStyle = "#4a4640";
    drawFlap(ctx, -w * 0.48, h * 0.04, -22, 4, 3);
    drawFlap(ctx, w * 0.48, h * 0.04, 22, 4, 3);

    ctx.fillStyle = "#c8c3ba";
    drawFlap(ctx, -w * 0.42, -h * 0.3, -18, 6, -2);
    drawFlap(ctx, w * 0.42, -h * 0.3, 18, 6, -2);

    const steel = ctx.createLinearGradient(-w * 0.55, 0, w * 0.55, 0);
    steel.addColorStop(0, "#4a4844");
    steel.addColorStop(0.18, "#8a8680");
    steel.addColorStop(0.42, "#f4f0e6");
    steel.addColorStop(0.52, "#ffffff");
    steel.addColorStop(0.68, "#c8c4bc");
    steel.addColorStop(1, "#6a6862");
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.5);
    ctx.bezierCurveTo(w * 0.18, -h * 0.5, w * 0.5, -h * 0.34, w * 0.5, -h * 0.14);
    ctx.lineTo(w * 0.5, h * 0.34);
    ctx.quadraticCurveTo(w * 0.36, h * 0.47, 0, h * 0.48);
    ctx.quadraticCurveTo(-w * 0.36, h * 0.47, -w * 0.5, h * 0.34);
    ctx.lineTo(-w * 0.5, -h * 0.14);
    ctx.bezierCurveTo(-w * 0.5, -h * 0.34, -w * 0.18, -h * 0.5, 0, -h * 0.5);
    ctx.closePath();
    ctx.fill();

    const shield = ctx.createLinearGradient(-w * 0.5, 0, -w * 0.02, 0);
    shield.addColorStop(0, "#1a1612");
    shield.addColorStop(0.7, "#3a3228");
    shield.addColorStop(1, "rgba(40,34,28,0)");
    ctx.fillStyle = shield;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.16);
    ctx.lineTo(-w * 0.08, -h * 0.2);
    ctx.lineTo(-w * 0.08, h * 0.36);
    ctx.lineTo(-w * 0.5, h * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    for (let row = 0; row < 12; row += 1) {
      const yy = -h * 0.16 + row * 5.2;
      for (let col = 0; col < 4; col += 1) {
        ctx.fillRect(-w * 0.48 + col * 2.6 + (row % 2) * 1.1, yy, 2.2, 4.4);
      }
    }

    ctx.strokeStyle = "rgba(30,28,26,0.28)";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 9; i += 1) {
      const yy = -h * 0.18 + i * 8.4;
      ctx.beginPath();
      ctx.moveTo(-w * 0.48, yy);
      ctx.lineTo(w * 0.48, yy);
      ctx.stroke();
    }

    ctx.fillStyle = "#111216";
    ctx.fillRect(-3.4, -h * 0.32, 6.8, 8);
    const glass = ctx.createLinearGradient(-3, -h * 0.32, 3, -h * 0.24);
    glass.addColorStop(0, "#8ec8ff");
    glass.addColorStop(1, "#1a3a58");
    ctx.fillStyle = glass;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(-2.4, -h * 0.31, 4.8, 4.2);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#d8c27a";
    ctx.fillRect(-w * 0.72, -4, 11, 5);
    ctx.fillRect(w * 0.3, -4, 11, 5);
    ctx.fillStyle = "#6a5a28";
    ctx.fillRect(-w * 0.72, -4, 11, 1.4);
    ctx.fillRect(w * 0.3, -4, 11, 1.4);

    drawRaptor(ctx, -7.2, h * 0.46, 0.95);
    drawRaptor(ctx, 0, h * 0.49, 1);
    drawRaptor(ctx, 7.2, h * 0.46, 0.95);

    ctx.restore();
  }

  function drawTank(ctx, x, y, r, hgt) {
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0, "#1a1c18");
    g.addColorStop(0.4, "#5a5c52");
    g.addColorStop(0.55, "#9a9c90");
    g.addColorStop(1, "#2a2c26");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - hgt, r * 2, hgt);
    ctx.beginPath();
    ctx.ellipse(x, y - hgt, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#151612";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawArm(ctx, x, y, len, thick) {
    const g = ctx.createLinearGradient(0, y, 0, y + thick);
    g.addColorStop(0, "#d8d4cc");
    g.addColorStop(0.35, "#8a8680");
    g.addColorStop(1, "#3a3834");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, len, thick);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x, y, len, 1.4);
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 6; i += 1) {
      const xx = x + (len / 6) * i;
      ctx.beginPath();
      ctx.moveTo(xx, y);
      ctx.lineTo(xx, y + thick);
      ctx.stroke();
    }
    ctx.fillStyle = "#e6c24a";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(x + 6 + i * 10, y + 1, 5, thick - 2);
    }
    ctx.fillStyle = "#1a1a16";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(x + 11 + i * 10, y + 1, 5, thick - 2);
    }
    ctx.fillStyle = "#6a6862";
    ctx.fillRect(x + len - 10, y - 2, 12, thick + 4);
  }

  function drawWorld(ctx) {
    const s = spec();
    const night = s.night;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, cssH);
    sky.addColorStop(0, `rgb(${6 + night}, ${8 + night}, ${22 + night * 8})`);
    sky.addColorStop(0.42, `rgb(${18}, ${16}, ${38})`);
    sky.addColorStop(0.72, `rgb(${62 - night * 20}, ${32 - night * 8}, ${48})`);
    sky.addColorStop(1, `rgb(${198 - night * 130}, ${92 - night * 40}, ${48 - night * 8})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cssW, cssH);

    const sun = ctx.createRadialGradient(cssW * 0.78, cssH * 0.78, 4, cssW * 0.78, cssH * 0.78, cssW * 0.55);
    sun.addColorStop(0, `rgba(255,180,90,${0.28 - night * 0.16})`);
    sun.addColorStop(0.35, `rgba(255,110,40,${0.1 - night * 0.05})`);
    sun.addColorStop(1, "rgba(20,8,4,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, cssW, cssH);

    const sc = worldScale();
    const ox = shake ? rand(-shake, shake) : 0;
    const oy = shake ? rand(-shake, shake) : 0;
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, (-cam.x + ox) * sc * dpr, (-cam.y + oy) * sc * dpr);

    stars.forEach((st) => {
      ctx.globalAlpha = st.a * (0.45 + night * 0.5);
      ctx.fillStyle = st.r > 1.1 ? "#fff6d8" : "#dce6ff";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const waterTop = GROUND - 14;
    const water = ctx.createLinearGradient(0, waterTop - 20, 0, GROUND + 90);
    water.addColorStop(0, "#1a3a4c");
    water.addColorStop(0.35, "#0e2432");
    water.addColorStop(1, "#070e14");
    ctx.fillStyle = water;
    ctx.fillRect(-240, waterTop, SHORE + 260, 240);
    ctx.fillStyle = "rgba(210,170,110,0.08)";
    for (let i = 0; i < 10; i += 1) {
      const y = waterTop + 4 + i * 7 + Math.sin(clock * 0.004 + i) * 1.2;
      ctx.fillRect(-240, y, SHORE + 260, 1.1);
    }

    ctx.fillStyle = "#16140f";
    ctx.fillRect(SHORE - 30, GROUND - 18, WORLD_W, 180);
    const pad = ctx.createLinearGradient(TOWER_X - 180, 0, TOWER_X + 80, 0);
    pad.addColorStop(0, "#2a2822");
    pad.addColorStop(0.5, "#4a463c");
    pad.addColorStop(1, "#26241e");
    ctx.fillStyle = pad;
    ctx.beginPath();
    ctx.ellipse(TOWER_X - 40, GROUND - 8, 150, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(TOWER_X - 160, GROUND - 16, 220, 2);

    drawTank(ctx, SHORE + 86, GROUND - 18, 16, 58);
    drawTank(ctx, SHORE + 128, GROUND - 18, 14, 72);
    drawTank(ctx, SHORE + 168, GROUND - 18, 18, 50);
    ctx.fillStyle = "#2c2a24";
    ctx.fillRect(SHORE + 200, GROUND - 46, 28, 28);
    ctx.fillRect(SHORE + 236, GROUND - 62, 22, 44);

    const towerLeft = TOWER_X - 22;
    const towerH = GROUND - (ARM_Y - 320);
    const tw = ctx.createLinearGradient(towerLeft, 0, towerLeft + 48, 0);
    tw.addColorStop(0, "#141518");
    tw.addColorStop(0.4, "#3a3e46");
    tw.addColorStop(1, "#1a1c20");
    ctx.fillStyle = tw;
    ctx.fillRect(towerLeft, ARM_Y - 320, 48, towerH);
    ctx.fillStyle = "#5a6068";
    ctx.fillRect(towerLeft + 8, ARM_Y - 308, 6, 300);
    ctx.fillRect(towerLeft + 34, ARM_Y - 308, 6, 300);
    ctx.strokeStyle = "rgba(180,186,196,0.35)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 12; i += 1) {
      const yy = ARM_Y - 300 + i * 24;
      ctx.beginPath();
      ctx.moveTo(towerLeft + 8, yy);
      ctx.lineTo(towerLeft + 40, yy + 12);
      ctx.moveTo(towerLeft + 40, yy);
      ctx.lineTo(towerLeft + 8, yy + 12);
      ctx.stroke();
    }
    ctx.fillStyle = "#c8102e";
    ctx.fillRect(towerLeft + 16, ARM_Y - 332, 16, 12);

    const half = s.gap * 0.5;
    drawArm(ctx, TOWER_X - 188, ARM_Y - half - 8, 176, 10);
    drawArm(ctx, TOWER_X - 188, ARM_Y + half - 2, 176, 10);

    const glow = 0.55 + Math.sin(clock * 0.01) * 0.12;
    [
      [towerLeft + 10, ARM_Y - 250],
      [towerLeft + 38, ARM_Y - 170],
      [towerLeft + 10, ARM_Y - 90],
    ].forEach(([lx, ly]) => {
      const rad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 46);
      rad.addColorStop(0, `rgba(255,220,140,${0.22 * glow})`);
      rad.addColorStop(0.4, `rgba(255,180,70,${0.06 * glow})`);
      rad.addColorStop(1, "rgba(255,160,40,0)");
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(lx, ly, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,236,180,${0.85 * glow})`;
      ctx.beginPath();
      ctx.arc(lx, ly, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });

    particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (ship) drawShip(ctx);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const haze = ctx.createLinearGradient(0, cssH * 0.55, 0, cssH);
    haze.addColorStop(0, "rgba(12,10,14,0)");
    haze.addColorStop(1, `rgba(28,16,12,${0.22 + night * 0.08})`);
    ctx.fillStyle = haze;
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
    if (hudSpeed) hudSpeed.textContent = `${spd.toFixed(1)} vel`;
    if (hudScore) hudScore.textContent = score.toLocaleString();
  }

  function followCam() {
    if (!ship) return;
    const targetX = clamp(ship.x - VIEW_W * 0.42, 0, WORLD_W - VIEW_W);
    const targetY = clamp(ship.y - VIEW_H * 0.4, 0, GROUND + 80 - VIEW_H);
    const k = state === "fly" || state === "attract" ? 0.08 : 0.05;
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

  function startPlayResume() {
    if (state === "pause") {
      hideOverlay();
      state = "fly";
      if (hud) hud.hidden = false;
      return;
    }
    startPlay();
  }

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
