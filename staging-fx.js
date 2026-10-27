/* Hot Staging visual effects: pure drawing helpers (planet, aurora, gauges, debris, fireballs).
   No game state lives here; staging.js passes everything in. Exposes window.SDStagingFX. */
(() => {
  const TAU = Math.PI * 2;
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function prng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mk(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  /* ---------- planet textures (built once, wrap horizontally) ---------- */
  let TEX = null;
  const TW = 1024;
  const TH = 256;

  function wrap(x, fn) {
    fn(x);
    if (x < 280) fn(x + TW);
    if (x > TW - 280) fn(x - TW);
  }

  function blob(g, x, y, rx, ry, rot, c0, c1) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(1, ry / rx);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, rx, 0, TAU);
    g.fill();
    g.restore();
  }

  function textures() {
    if (TEX) return TEX;
    const rnd = prng(90210);
    const land = mk(TW, TH);
    const cloud = mk(TW, TH);
    const city = mk(TW, TH);
    const g = land.getContext("2d");
    const sea = g.createLinearGradient(0, 0, 0, TH);
    sea.addColorStop(0, "#3a78b4");
    sea.addColorStop(0.5, "#235a96");
    sea.addColorStop(1, "#17406f");
    g.fillStyle = sea;
    g.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 150; i += 1) {
      const x = rnd() * TW;
      const y = rnd() * TH;
      const dark = rnd() > 0.5;
      wrap(x, (px) => blob(g, px, y, 30 + rnd() * 70, 8 + rnd() * 16, 0, dark ? "rgba(8,34,80,0.16)" : "rgba(90,160,210,0.10)", "rgba(0,0,0,0)"));
    }
    const clusters = [];
    const greens = ["#3d6a36", "#4c7a3d", "#6a7f47", "#8b7d52", "#c5b88a"];
    for (let c = 0; c < 7; c += 1) {
      const cx = rnd() * TW;
      const cy = 38 + rnd() * 180;
      clusters.push([cx, cy]);
      for (let k = 0; k < 8; k += 1) {
        const x = cx + (rnd() - 0.5) * 160;
        const y = cy + (rnd() - 0.5) * 46;
        const rx = 14 + rnd() * 34;
        const ry = 6 + rnd() * 13;
        wrap(x, (px) => {
          blob(g, px, y, rx * 1.35, ry * 1.35, 0, "rgba(96,190,205,0.30)", "rgba(96,190,205,0)");
          blob(g, px, y, rx, ry, rnd() * 3, greens[Math.floor(rnd() * greens.length)], "rgba(60,90,50,0.55)");
        });
      }
    }
    const k = cloud.getContext("2d");
    for (let i = 0; i < 95; i += 1) {
      const x = rnd() * TW;
      const y = rnd() * TH;
      const rx = 26 + rnd() * 80;
      const ry = 5 + rnd() * 14;
      const rot = (rnd() - 0.5) * 0.6;
      wrap(x, (px) => blob(k, px, y, rx, ry, rot, `rgba(255,255,255,${0.35 + rnd() * 0.35})`, "rgba(255,255,255,0)"));
    }
    const u = city.getContext("2d");
    clusters.forEach(([cx, cy]) => {
      for (let n = 0; n < 22; n += 1) {
        const x = cx + (rnd() - 0.5) * 130;
        const y = cy + (rnd() - 0.5) * 40;
        wrap(x, (px) => {
          blob(u, px, y, 5, 5, 0, "rgba(255,200,110,0.28)", "rgba(255,200,110,0)");
          u.fillStyle = "rgba(255,226,160,0.95)";
          u.fillRect(px, y, 1.4, 1.4);
        });
      }
    });
    TEX = { land, cloud, city };
    return TEX;
  }

  function strip(ctx, img, sx, sy, sw, sh, dy, dh, w) {
    sx = ((sx % TW) + TW) % TW;
    if (sx + sw <= TW) {
      ctx.drawImage(img, sx, sy, sw, sh, 0, dy, w, dh);
      return;
    }
    const first = TW - sx;
    const fw = (first / sw) * w;
    ctx.drawImage(img, sx, sy, first, sh, 0, dy, fw, dh);
    ctx.drawImage(img, 0, sy, sw - first, sh, fw, dy, w - fw, dh);
  }

  /* The surface is rendered at half resolution into a cache canvas (cheap fill), then blitted;
     the bright limb is drawn at full resolution on top. v: { w, h, space, scroll, px } */
  let PCV = null;
  function drawPlanet(ctx, v) {
    const sw = Math.ceil(v.w / 2);
    const sh = Math.ceil(v.h / 2);
    if (!PCV || PCV.width !== sw || PCV.height !== sh) PCV = mk(sw, sh);
    const g = PCV.getContext("2d");
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    g.clearRect(0, 0, v.w, v.h);
    const geo = planetBody(g, v);
    ctx.drawImage(PCV, 0, 0, sw, sh, 0, 0, v.w, v.h);
    planetLimb(ctx, v, geo);
    return geo;
  }

  function planetBody(ctx, v) {
    const T = textures();
    const { w, h, space } = v;
    const r = Math.max(w, h) * 1.55;
    const cx = w * 0.5 + v.px * 0.08;
    const cy = h + r * 0.72 - space * h * 0.18;
    const mix = (a, b) => Math.round(lerp(a, b, space));
    ctx.save();
    const ocean = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.55, r * 0.1, cx, cy, r);
    ocean.addColorStop(0, `rgb(${mix(96, 36)},${mix(140, 64)},${mix(190, 110)})`);
    ocean.addColorStop(0.4, `rgb(${mix(36, 14)},${mix(72, 32)},${mix(120, 70)})`);
    ocean.addColorStop(1, "#081018");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fillStyle = ocean;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    const top = Math.max(0, cy - r);
    const bandH = h - top;
    if (bandH > 8) {
      const N = 26;
      ctx.globalAlpha = 0.92;
      for (let i = 0; i < N; i += 1) {
        const y0 = top + bandH * Math.pow(i / N, 1.85);
        const y1 = top + bandH * Math.pow((i + 1) / N, 1.85) + 1;
        const near = (i + 0.5) / N;
        const d = 0.9 - 0.55 * near;
        strip(ctx, T.land, v.scroll - (w / 2) * d, i * (TH / N), w * d, TH / N, y0, y1 - y0, w);
      }
      ctx.globalAlpha = (0.62 - space * 0.14) * 0.95;
      for (let i = 1; i < N; i += 3) {
        const y0 = top + bandH * Math.pow(i / N, 1.85);
        const y1 = top + bandH * Math.pow((i + 3) / N, 1.85) + 1;
        const near = (i + 1.5) / N;
        const d = (0.9 - 0.55 * near) * 0.72;
        strip(ctx, T.cloud, v.scroll * 1.5 - (w / 2) * d, i * (TH / N), w * d, (TH / N) * 3, y0, y1 - y0, w);
      }
      ctx.globalAlpha = 1;
      const haze = ctx.createLinearGradient(0, top, 0, top + bandH * 0.45);
      haze.addColorStop(0, `rgba(170,214,255,${0.55 - space * 0.18})`);
      haze.addColorStop(1, "rgba(170,214,255,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, top, w, bandH * 0.45);
      const dn = ctx.createLinearGradient(0, 0, w, 0);
      dn.addColorStop(0, `rgba(2,6,18,${0.84})`);
      dn.addColorStop(0.46, "rgba(4,10,26,0.5)");
      dn.addColorStop(0.62, "rgba(255,150,70,0.06)");
      dn.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = dn;
      ctx.fillRect(0, top, w, bandH);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 2; i < N; i += 3) {
        const y0 = top + bandH * Math.pow(i / N, 1.85);
        const y1 = top + bandH * Math.pow((i + 3) / N, 1.85) + 1;
        const near = (i + 1.5) / N;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y0, w * 0.52, y1 - y0);
        ctx.clip();
        ctx.globalAlpha = (0.35 + space * 0.55) * 0.85;
        const d = 0.9 - 0.55 * near;
        strip(ctx, T.city, v.scroll - (w / 2) * d, i * (TH / N), w * d, (TH / N) * 3, y0, y1 - y0, w);
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
    return { cx, cy, r, top };
  }

  function planetLimb(ctx, v, geo) {
    const { cx, cy, r } = geo;
    const { w, space } = v;
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, r * 0.97, cx, cy, r * 1.09);
    halo.addColorStop(0, "rgba(140,190,255,0)");
    halo.addColorStop(0.42, `rgba(140,200,255,${0.4 + space * 0.2})`);
    halo.addColorStop(1, "rgba(80,140,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.09, 0, TAU);
    ctx.fill();
    const limb = ctx.createLinearGradient(0, 0, w, 0);
    limb.addColorStop(0, "rgba(90,140,255,0.15)");
    limb.addColorStop(0.5, "rgba(130,190,255,0.5)");
    limb.addColorStop(0.78, "rgba(255,196,130,0.95)");
    limb.addColorStop(1, "rgba(150,200,255,0.4)");
    ctx.strokeStyle = limb;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 3 + (1 - space) * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /* Aurora curtains hugging the horizon in the dark half. v: { w, top, space, clock, reduced } */
  let AURORA = null;
  function drawAurora(ctx, v) {
    const a = clamp((v.space - 0.35) / 0.4, 0, 1);
    if (a <= 0.02) return;
    const h = Math.max(60, v.w * 0.16);
    if (!AURORA || AURORA.h !== h) {
      const c = mk(2, Math.round(h));
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(90,255,190,0)");
      grad.addColorStop(0.55, "rgba(90,255,190,0.55)");
      grad.addColorStop(0.85, "rgba(150,120,255,0.45)");
      grad.addColorStop(1, "rgba(90,255,190,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, h);
      AURORA = { h, c };
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const step = 14;
    for (let x = 0; x < v.w * 0.58; x += step) {
      const t = v.reduced ? 0 : v.clock * 0.0016;
      const k = 0.55 + 0.45 * Math.sin(x * 0.021 + t * 3.1) * Math.sin(x * 0.0087 - t * 1.7);
      const fade = clamp(1 - x / (v.w * 0.58), 0, 1);
      ctx.globalAlpha = 0.16 * a * k * fade;
      const hh = AURORA.h * (0.55 + 0.45 * k);
      ctx.drawImage(AURORA.c, 0, 0, 2, AURORA.h, x, v.top - hh * 0.7 + Math.sin(x * 0.012 + t * 2) * 6, step + 1, hh);
    }
    ctx.restore();
  }

  /* ---------- HUD instruments (all take a ui scale so they stay legible on phones) ---------- */
  function text(ctx, s, x, y, size, color, align, weight) {
    ctx.font = `${weight || 500} ${size}px ${MONO}`;
    ctx.textAlign = align || "left";
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  function drawAttitude(ctx, o) {
    const { cx, cy, r, angle, stage, fail, ui } = o;
    const span = Math.PI * 0.44;
    const max = fail * 1.12;
    const map = (a) => -Math.PI / 2 + clamp(a / max, -1, 1) * span;
    ctx.save();
    ctx.fillStyle = "rgba(6,12,22,0.55)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r + 10 * ui, -Math.PI / 2 - span - 0.2, -Math.PI / 2 + span + 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 7 * ui;
    ctx.lineCap = "butt";
    const arc = (a0, a1, color) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, map(a0), map(a1));
      ctx.stroke();
    };
    arc(-max, max, "rgba(255,92,76,0.85)");
    arc(-fail, fail, "rgba(255,196,96,0.9)");
    arc(-stage, stage, "rgba(110,240,184,0.95)");
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i += 1) {
      const a = map((i / 4) * max);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 9 * ui), cy + Math.sin(a) * (r - 9 * ui));
      ctx.lineTo(cx + Math.cos(a) * (r - 14 * ui), cy + Math.sin(a) * (r - 14 * ui));
      ctx.stroke();
    }
    const abs = Math.abs(angle);
    const col = abs <= stage ? "#7dffc4" : abs <= fail ? "#ffd27a" : "#ff6a5a";
    const na = map(angle);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4 * ui;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * (r - 3 * ui), cy + Math.sin(na) * (r - 3 * ui));
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, 4 * ui, 0, TAU);
    ctx.fill();
    text(ctx, `${(angle * 57.2958).toFixed(1)}°`, cx, cy + 17 * ui, 11.5 * ui, col, "center", 600);
    text(ctx, "ATTITUDE", cx, cy + 29 * ui, 8.5 * ui, "rgba(220,232,246,0.6)", "center");
    ctx.restore();
  }

  function drawAltTape(ctx, o) {
    const { x, y, hgt, alt, ui } = o;
    const pxKm = hgt / 4.4;
    const wd = 56 * ui;
    ctx.save();
    ctx.fillStyle = "rgba(6,12,22,0.5)";
    ctx.fillRect(x, y, wd, hgt);
    ctx.beginPath();
    ctx.rect(x, y, wd, hgt);
    ctx.clip();
    ctx.lineWidth = 1;
    for (let k = Math.floor((alt - 2.4) * 4) / 4; k <= alt + 2.4; k += 0.25) {
      const yy = y + hgt / 2 - (k - alt) * pxKm;
      const major = Math.abs(k - Math.round(k)) < 0.001;
      ctx.strokeStyle = major ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.moveTo(x + wd, yy);
      ctx.lineTo(x + wd - (major ? 14 : 7) * ui, yy);
      ctx.stroke();
      if (major) text(ctx, String(Math.round(k)), x + 6 * ui, yy + 3.5 * ui, 10 * ui, "rgba(220,232,246,0.78)");
    }
    ctx.restore();
    const my = y + hgt / 2;
    ctx.fillStyle = "#ffd9a0";
    ctx.beginPath();
    ctx.moveTo(x + wd + 2, my);
    ctx.lineTo(x + wd + 10 * ui, my - 5 * ui);
    ctx.lineTo(x + wd + 10 * ui, my + 5 * ui);
    ctx.closePath();
    ctx.fill();
    text(ctx, `${alt.toFixed(1)} KM`, x, y + hgt + 15 * ui, 11.5 * ui, "#ffe8c8", "left", 600);
    text(ctx, "ALTITUDE", x, y - 7 * ui, 8.5 * ui, "rgba(220,232,246,0.6)");
  }

  /* Staging window as a timeline: sweet spot in green, needle for "now". */
  function drawWindowMeter(ctx, o) {
    const { cx, y, wd, t, climb, win, ui, clock, open } = o;
    const t0 = climb - 4.2;
    const t1 = climb + win + 0.9;
    const X = (tt) => cx - wd / 2 + ((tt - t0) / (t1 - t0)) * wd;
    const hh = 10 * ui;
    ctx.save();
    ctx.fillStyle = "rgba(6,12,22,0.55)";
    ctx.fillRect(cx - wd / 2 - 8, y - 22 * ui, wd + 16, hh + 38 * ui);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(cx - wd / 2, y, wd, hh);
    const pulse = open ? 0.75 + Math.sin(clock * 0.012) * 0.25 : 1;
    ctx.fillStyle = `rgba(255,184,84,${0.55 * pulse})`;
    ctx.fillRect(X(climb), y, X(climb + win) - X(climb), hh);
    ctx.fillStyle = `rgba(110,240,184,${0.9 * pulse})`;
    const mid = climb + win * 0.5;
    ctx.fillRect(X(mid - win * 0.14), y, X(mid + win * 0.14) - X(mid - win * 0.14), hh);
    ctx.fillStyle = "#fff";
    const nx = X(clamp(t, t0, t1));
    ctx.beginPath();
    ctx.moveTo(nx, y - 5 * ui);
    ctx.lineTo(nx + 5 * ui, y - 11 * ui);
    ctx.lineTo(nx - 5 * ui, y - 11 * ui);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(nx - 1, y - 5 * ui, 2, hh + 10 * ui);
    text(ctx, open ? "STAGE NOW" : "STAGING WINDOW", cx, y + hh + 17 * ui, (open ? 13 : 10) * ui, open ? "#ffe3a6" : "rgba(220,232,246,0.7)", "center", 600);
    ctx.restore();
  }

  /* Structural load during Max-Q. o: { x, y, wd, load, ui, thr, band } */
  function drawLoadBar(ctx, o) {
    const { x, y, wd, load, ui, thr, band } = o;
    const hh = 9 * ui;
    ctx.save();
    ctx.fillStyle = "rgba(6,12,22,0.55)";
    ctx.fillRect(x - 6, y - 17 * ui, wd + 12, hh + 36 * ui);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x, y, wd, hh);
    const k = clamp(load, 0, 1);
    ctx.fillStyle = k < 0.6 ? "#7dffc4" : k < 0.85 ? "#ffd27a" : "#ff6a5a";
    ctx.fillRect(x, y, wd * k, hh);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(x + wd * 0.72, y - 3, 1.5, hh + 6);
    text(ctx, "STRUCTURAL LOAD", x, y - 6 * ui, 8.5 * ui, "rgba(220,232,246,0.65)");
    text(ctx, thr ? "THROTTLE DOWN" : band ? "MAX-Q" : "NOMINAL", x, y + hh + 14 * ui, 10 * ui, thr ? "#7dffc4" : band ? "#ffd27a" : "rgba(220,232,246,0.6)", "left", 600);
    ctx.restore();
  }

  /* ---------- explosions and debris ---------- */
  function drawFireball(ctx, x, y, t, scale, tint) {
    const life = clamp(t / 1.7, 0, 1);
    if (life >= 1) return;
    const r = (26 + 150 * easeOut(life)) * scale;
    const a = 1 - life;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,250,225,${0.95 * a})`);
    g.addColorStop(0.22, `rgba(255,${tint ? 220 : 190},110,${0.75 * a})`);
    g.addColorStop(0.55, `rgba(255,100,28,${0.4 * a})`);
    g.addColorStop(1, "rgba(120,20,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawStarburst(ctx, x, y, t, scale) {
    const life = clamp(t / 0.55, 0, 1);
    if (life >= 1) return;
    const a = 1 - life;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(x, y);
    for (let i = 0; i < 14; i += 1) {
      const ang = (i / 14) * TAU + 0.2;
      const len = (60 + (i % 3) * 38) * scale * (0.5 + easeOut(life));
      const g = ctx.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
      g.addColorStop(0, `rgba(255,240,200,${0.55 * a})`);
      g.addColorStop(1, "rgba(255,160,60,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = (3 - (i % 3)) * scale;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShard(ctx, p, scale) {
    ctx.save();
    ctx.translate(p.x * scale, p.y * scale);
    ctx.rotate(p.rot);
    const s = p.size * scale;
    ctx.fillStyle = p.hot > 0.1 ? "#b8886a" : "#8e939b";
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.35);
    ctx.lineTo(s * 0.9, -s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.6);
    ctx.lineTo(-s * 0.7, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(20,18,16,0.4)";
    ctx.fillRect(-s * 0.2, -s * 0.2, s * 0.6, s * 0.3);
    if (p.hot > 0.05) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255,140,50,${p.hot * 0.6})`;
      ctx.fillRect(-s, -s * 0.4, s * 1.8, s * 0.9);
    }
    ctx.restore();
  }

  window.SDStagingFX = { prng, drawPlanet, drawAurora, drawAttitude, drawAltTape, drawWindowMeter, drawLoadBar, drawFireball, drawStarburst, drawShard, textures };
})();
