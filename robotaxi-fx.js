/* Robotaxi Boss: living-city renderer (Canvas 2D). Pure presentation: robotaxi.js owns all rules and
   passes data in through set() / playDay(). Exposes window.SDTaxiFX.create(canvas, opts). */
(() => {
  const TAU = Math.PI * 2;
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };

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

  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* Node positions and arterial roads as fractions of the canvas. */
  const NODES = {
    depot: [0.5, 0.84],
    downtown: [0.3, 0.45],
    airport: [0.8, 0.2],
    stadium: [0.81, 0.71],
    hills: [0.15, 0.76],
  };
  const ROADS = [
    ["depot", "downtown", [[0.5, 0.84], [0.5, 0.7], [0.3, 0.7], [0.3, 0.45]]],
    ["depot", "stadium", [[0.5, 0.84], [0.66, 0.84], [0.81, 0.84], [0.81, 0.71]]],
    ["depot", "hills", [[0.5, 0.84], [0.33, 0.9], [0.15, 0.9], [0.15, 0.76]]],
    ["downtown", "airport", [[0.3, 0.45], [0.5, 0.45], [0.5, 0.2], [0.8, 0.2]]],
    ["downtown", "stadium", [[0.3, 0.45], [0.66, 0.45], [0.81, 0.45], [0.81, 0.71]]],
    ["stadium", "airport", [[0.81, 0.71], [0.81, 0.45], [0.8, 0.2]]],
  ];
  const ZONE_IDS = ["downtown", "airport", "stadium", "hills"];

  function create(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const reduced = !!opts.reduced;
    const seed = hashSeed(opts.seed || "robotaxi");
    let w = 800;
    let h = 450;
    let dpr = 1;
    let u = 1;
    let ui = 1;
    let layer = null;
    let lights = null;
    let roadPx = [];
    let nodePx = {};
    let clock = 0;
    let data = null;
    const cabs = new Map();
    const floats = [];
    const smoke = [];
    const ripples = [];
    const dots = {};
    let play = null;
    let cashShown = 0;
    let plane = null;
    let holdHour = null;

    /* ---------- geometry ---------- */
    function px(f) {
      return [f[0] * w, f[1] * h];
    }

    function polyLen(pts) {
      let d = 0;
      for (let i = 1; i < pts.length; i += 1) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return d;
    }

    function distToRoad(x, y) {
      let best = 1e9;
      roadPx.forEach((r) => {
        const pts = r.pts;
        for (let i = 1; i < pts.length; i += 1) {
          const [ax, ay] = pts[i - 1];
          const [bx, by] = pts[i];
          const dx = bx - ax;
          const dy = by - ay;
          const l2 = dx * dx + dy * dy || 1;
          const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
          best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
        }
      });
      return best;
    }

    function route(from, to) {
      if (from === to) return [nodePx[from]];
      const names = Object.keys(NODES);
      const dist = {};
      const prev = {};
      names.forEach((n) => (dist[n] = 1e9));
      dist[from] = 0;
      const done = new Set();
      while (done.size < names.length) {
        let cur = null;
        names.forEach((n) => {
          if (!done.has(n) && (cur === null || dist[n] < dist[cur])) cur = n;
        });
        if (cur === null || dist[cur] >= 1e9) break;
        done.add(cur);
        roadPx.forEach((r) => {
          const other = r.a === cur ? r.b : r.b === cur ? r.a : null;
          if (other && dist[cur] + r.len < dist[other]) {
            dist[other] = dist[cur] + r.len;
            prev[other] = { from: cur, road: r };
          }
        });
      }
      const chain = [];
      let at = to;
      while (at !== from && prev[at]) {
        chain.unshift(prev[at]);
        at = prev[at].from;
      }
      const pts = [nodePx[from]];
      chain.forEach((step) => {
        const seg = step.road.a === step.from ? step.road.pts : [...step.road.pts].reverse();
        seg.slice(1).forEach((p) => pts.push(p));
      });
      return pts;
    }

    function slotFor(node, index) {
      const [nx, ny] = nodePx[node];
      if (node === "depot") {
        const col = index % 6;
        const row = Math.floor(index / 6);
        return [nx - 52 * u + col * 20 * u, ny + 18 * u + row * 16 * u];
      }
      const a = (index / 6) * TAU + 0.6;
      return [nx + Math.cos(a) * 36 * u, ny + Math.sin(a) * 30 * u];
    }

    /* ---------- static layer ---------- */
    function buildLayer() {
      const c = document.createElement("canvas");
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext("2d");
      g.scale(dpr, dpr);
      const rnd = prng(seed);
      const win = [];
      const lamps = [];

      const ground = g.createLinearGradient(0, 0, w, h);
      ground.addColorStop(0, "#27384a");
      ground.addColorStop(0.5, "#2d4350");
      ground.addColorStop(1, "#223645");
      g.fillStyle = ground;
      g.fillRect(0, 0, w, h);

      for (let i = 0; i < 60; i += 1) {
        g.fillStyle = `rgba(80,130,100,${0.05 + rnd() * 0.06})`;
        g.beginPath();
        g.ellipse(rnd() * w, rnd() * h, (20 + rnd() * 70) * u, (10 + rnd() * 30) * u, rnd() * 3, 0, TAU);
        g.fill();
      }

      /* river */
      g.strokeStyle = "#17566d";
      g.lineWidth = 34 * u;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(-10, h * 0.3);
      g.bezierCurveTo(w * 0.2, h * 0.2, w * 0.42, h * 0.5, w * 0.58, h * 1.05);
      g.stroke();
      g.strokeStyle = "#1c7089";
      g.lineWidth = 24 * u;
      g.stroke();
      g.strokeStyle = "rgba(160,225,240,0.25)";
      g.lineWidth = 2;
      g.setLineDash([12 * u, 16 * u]);
      g.stroke();
      g.setLineDash([]);

      /* hills: contour lines, houses, trees */
      const [hx, hy] = nodePx.hills;
      for (let k = 0; k < 7; k += 1) {
        g.strokeStyle = `rgba(150,190,120,${0.22 - k * 0.02})`;
        g.lineWidth = 1.2;
        g.beginPath();
        for (let a = 0; a <= TAU + 0.05; a += 0.2) {
          const r = (26 + k * 17) * u * (1 + Math.sin(a * 3 + k) * 0.08);
          const x = hx - 10 * u + Math.cos(a) * r * 1.5;
          const y = hy - 10 * u + Math.sin(a) * r;
          if (a === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      for (let i = 0; i < 26; i += 1) {
        const a = rnd() * TAU;
        const r = (20 + rnd() * 110) * u;
        const x = hx - 10 * u + Math.cos(a) * r * 1.5;
        const y = hy - 10 * u + Math.sin(a) * r;
        if (x < 6 || x > w - 6 || y < 6 || y > h - 6 || distToRoad(x, y) < 14 * u) continue;
        if (i % 3 === 0) {
          g.fillStyle = "#1f4a33";
          g.beginPath();
          g.arc(x, y, (5 + rnd() * 4) * u, 0, TAU);
          g.fill();
        } else {
          g.fillStyle = "#5a4a40";
          g.fillRect(x - 5 * u, y - 4 * u, 10 * u, 8 * u);
          g.fillStyle = "#8a4f45";
          g.fillRect(x - 5.5 * u, y - 6 * u, 11 * u, 3.5 * u);
          win.push([x - 2 * u, y - 1 * u, 3 * u, 2.5 * u]);
        }
      }

      /* roads */
      const roadWidth = 11 * u;
      g.lineJoin = "round";
      g.lineCap = "round";
      roadPx.forEach((r) => {
        g.strokeStyle = "#10171f";
        g.lineWidth = roadWidth + 4;
        g.beginPath();
        r.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.stroke();
      });
      roadPx.forEach((r) => {
        g.strokeStyle = "#2a323d";
        g.lineWidth = roadWidth;
        g.beginPath();
        r.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.stroke();
        g.strokeStyle = "rgba(230,200,110,0.55)";
        g.lineWidth = 1.2;
        g.setLineDash([8 * u, 9 * u]);
        g.beginPath();
        r.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.stroke();
        g.setLineDash([]);
        let d = 0;
        for (let i = 1; i < r.pts.length; i += 1) {
          const [ax, ay] = r.pts[i - 1];
          const [bx, by] = r.pts[i];
          const l = Math.hypot(bx - ax, by - ay);
          for (let s = 20 * u; s < l; s += 46 * u) lamps.push([ax + ((bx - ax) * s) / l, ay + ((by - ay) * s) / l]);
          d += l;
        }
      });

      /* downtown: streets and towers (2.5D) */
      const [dx, dy] = nodePx.downtown;
      g.strokeStyle = "#232b35";
      g.lineWidth = 6 * u;
      for (let i = -3; i <= 3; i += 1) {
        g.beginPath();
        g.moveTo(dx + i * 40 * u, dy - 110 * u);
        g.lineTo(dx + i * 40 * u, dy + 110 * u);
        g.stroke();
      }
      for (let j = -3; j <= 3; j += 1) {
        g.beginPath();
        g.moveTo(dx - 150 * u, dy + j * 36 * u);
        g.lineTo(dx + 150 * u, dy + j * 36 * u);
        g.stroke();
      }
      const towers = [];
      for (let i = -3; i < 3; i += 1) {
        for (let j = -3; j < 3; j += 1) {
          const bx = dx + i * 40 * u + 20 * u;
          const by = dy + j * 36 * u + 18 * u;
          if (distToRoad(bx, by) < 13 * u) continue;
          const hgt = (8 + rnd() * rnd() * 40) * u;
          towers.push({ x: bx, y: by, w: (22 + rnd() * 8) * u, d: (17 + rnd() * 5) * u, h: hgt });
        }
      }
      towers.sort((a, b) => a.y - b.y);
      towers.forEach((t) => {
        g.fillStyle = "rgba(0,0,0,0.28)";
        g.beginPath();
        g.moveTo(t.x - t.w / 2, t.y + t.d / 2);
        g.lineTo(t.x + t.w / 2, t.y + t.d / 2);
        g.lineTo(t.x + t.w / 2 + t.h * 0.5, t.y + t.d / 2 + t.h * 0.35);
        g.lineTo(t.x - t.w / 2 + t.h * 0.5, t.y + t.d / 2 + t.h * 0.35);
        g.closePath();
        g.fill();
        g.fillStyle = "#32404f";
        g.fillRect(t.x - t.w / 2, t.y - t.d / 2 - t.h, t.w, t.d + t.h);
        g.fillStyle = "#26323f";
        g.fillRect(t.x + t.w / 2 - t.w * 0.28, t.y - t.d / 2 - t.h, t.w * 0.28, t.d + t.h);
        g.fillStyle = "#4b5d70";
        g.fillRect(t.x - t.w / 2, t.y - t.d / 2 - t.h, t.w, t.d * 0.4);
        const rows = Math.floor(t.h / (5 * u));
        for (let r = 0; r < rows; r += 1) {
          for (let cx = 0; cx < 3; cx += 1) {
            if (rnd() < 0.55) win.push([t.x - t.w / 2 + 2 * u + cx * (t.w / 3.4), t.y + t.d / 2 - t.h + r * 5 * u + 1, 2.2 * u, 2.4 * u]);
          }
        }
      });

      /* airport */
      const [ax, ay] = nodePx.airport;
      g.save();
      g.translate(ax, ay - 8 * u);
      g.rotate(-0.28);
      g.fillStyle = "#1a2029";
      g.fillRect(-130 * u, -10 * u, 260 * u, 20 * u);
      g.strokeStyle = "rgba(255,255,255,0.55)";
      g.lineWidth = 1.4;
      g.setLineDash([12 * u, 10 * u]);
      g.beginPath();
      g.moveTo(-120 * u, 0);
      g.lineTo(120 * u, 0);
      g.stroke();
      g.setLineDash([]);
      for (let s = -120; s <= 120; s += 20) lamps.push([ax + (s * u) * Math.cos(-0.28) + 0, ay - 8 * u + (s * u) * Math.sin(-0.28) + 11 * u, "rw"]);
      g.restore();
      g.fillStyle = "#3b4a5b";
      g.fillRect(ax - 70 * u, ay + 30 * u, 120 * u, 26 * u);
      g.fillStyle = "#5f7d95";
      g.fillRect(ax - 70 * u, ay + 30 * u, 120 * u, 7 * u);
      for (let s = 0; s < 8; s += 1) win.push([ax - 64 * u + s * 14 * u, ay + 41 * u, 8 * u, 4 * u]);
      [[-40, 4], [-6, 8], [28, 4]].forEach(([gx, gy]) => {
        g.fillStyle = "#9aa8b6";
        g.beginPath();
        g.ellipse(ax + gx * u, ay + (60 + gy) * u, 11 * u, 3.2 * u, 0, 0, TAU);
        g.fill();
        g.beginPath();
        g.moveTo(ax + gx * u - 11 * u, ay + (60 + gy) * u);
        g.lineTo(ax + gx * u - 2 * u, ay + (60 + gy) * u - 12 * u);
        g.lineTo(ax + gx * u + 3 * u, ay + (60 + gy) * u);
        g.fill();
      });

      /* stadium */
      const [sx, sy] = nodePx.stadium;
      g.fillStyle = "#212a33";
      g.beginPath();
      g.ellipse(sx, sy + 8 * u, 64 * u, 46 * u, 0, 0, TAU);
      g.fill();
      for (let k = 0; k < 3; k += 1) {
        g.fillStyle = ["#3a4654", "#2f3946", "#4b5867"][k];
        g.beginPath();
        g.ellipse(sx, sy, (56 - k * 9) * u, (40 - k * 7) * u, 0, 0, TAU);
        g.fill();
      }
      g.fillStyle = "#2f7a46";
      g.beginPath();
      g.ellipse(sx, sy, 28 * u, 18 * u, 0, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.6)";
      g.lineWidth = 1.2;
      g.strokeRect(sx - 20 * u, sy - 12 * u, 40 * u, 24 * u);
      g.beginPath();
      g.moveTo(sx, sy - 12 * u);
      g.lineTo(sx, sy + 12 * u);
      g.stroke();
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([qx, qy]) => {
        const tx = sx + qx * 60 * u;
        const ty = sy + qy * 40 * u;
        g.fillStyle = "#5c6b7a";
        g.fillRect(tx - 2 * u, ty - 2 * u, 4 * u, 4 * u);
        lamps.push([tx, ty, "fl"]);
      });

      /* depot */
      const [ox, oy] = nodePx.depot;
      g.fillStyle = "#29343f";
      g.fillRect(ox - 66 * u, oy - 20 * u, 132 * u, 64 * u);
      g.strokeStyle = "rgba(120,220,170,0.6)";
      g.lineWidth = 1.4;
      g.strokeRect(ox - 66 * u, oy - 20 * u, 132 * u, 64 * u);
      g.strokeStyle = "rgba(255,255,255,0.18)";
      for (let c = 0; c < 6; c += 1) {
        g.beginPath();
        g.moveTo(ox - 54 * u + c * 20 * u, oy + 10 * u);
        g.lineTo(ox - 54 * u + c * 20 * u, oy + 40 * u);
        g.stroke();
      }

      layer = c;
      lights = { win, lamps };
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(280, Math.round(rect.width || 800));
      h = Math.max(200, Math.round(rect.height || 450));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      u = Math.max(0.5, Math.min(w / 1000, h / 560) * 1.12);
      ui = clamp(w / 760, 0.88, 1.35);
      Object.keys(NODES).forEach((k) => (nodePx[k] = px(NODES[k])));
      roadPx = ROADS.map(([a, b, pts]) => {
        const p = pts.map(px);
        return { a, b, pts: p, len: polyLen(p) };
      });
      buildLayer();
      cabs.forEach((c) => {
        c.path = null;
        const slot = slotFor(c.node, c.slot || 0);
        c.x = slot[0];
        c.y = slot[1];
      });
    }

    /* ---------- cabs ---------- */
    function cabFor(id) {
      let c = cabs.get(id);
      if (!c) {
        const slot = slotFor("depot", id);
        c = { id, node: "depot", slot: id, x: slot[0], y: slot[1], hx: 1, hy: 0, path: null, pi: 0, speed: 0, occupied: 0, trip: null, broken: 0 };
        cabs.set(id, c);
      }
      return c;
    }

    function sendCab(c, toNode, slotIdx, speed) {
      const target = slotFor(toNode, slotIdx);
      const pts = route(c.node, toNode);
      pts.push(target);
      c.path = [[c.x, c.y], ...pts];
      c.pi = 0;
      c.speed = speed;
      c.dest = toNode;
      c.slot = slotIdx;
    }

    function stepCab(c, dt) {
      if (!c.path) return;
      let move = c.speed * u * dt;
      while (move > 0 && c.path && c.path.length > 1) {
        const [tx, ty] = c.path[1];
        const dx = tx - c.x;
        const dy = ty - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.0001) {
          c.hx = lerp(c.hx, dx / dist, 0.25);
          c.hy = lerp(c.hy, dy / dist, 0.25);
        }
        if (dist <= move) {
          c.x = tx;
          c.y = ty;
          move -= dist;
          c.path.shift();
        } else {
          c.x += (dx / dist) * move;
          c.y += (dy / dist) * move;
          move = 0;
        }
      }
      if (c.path && c.path.length <= 1) {
        c.path = null;
        c.node = c.dest || c.node;
        c.speed = 0;
        if (c.trip && c.trip.back) {
          const t = c.trip;
          c.trip = null;
          c.occupied = 0;
          if (t.after) t.after();
        } else if (c.trip && !c.trip.back) {
          c.trip.back = true;
          c.occupied = 0;
          sendCab(c, c.trip.home, c.slot, 150);
        }
      }
    }

    function syncCabs() {
      if (!data) return;
      const perNode = {};
      data.cars.forEach((car) => {
        const c = cabFor(car.id);
        c.charge = car.charge;
        c.night = car.night;
        c.isBroken = car.broken;
        const want = car.zone || "depot";
        const idx = (perNode[want] = (perNode[want] || 0) + 1) - 1;
        if (c.trip) return;
        if (!c.path && (c.node !== want || c.slot !== idx)) {
          if (reduced || !canvas.isConnected) {
            const s = slotFor(want, idx);
            c.x = s[0];
            c.y = s[1];
            c.node = want;
            c.slot = idx;
          } else sendCab(c, want, idx, play ? 150 : 260);
        } else if (!c.path) c.slot = idx;
      });
      cabs.forEach((c, id) => {
        if (!data.cars.some((x) => x.id === id)) cabs.delete(id);
      });
    }

    /* ---------- day playback ---------- */
    function playDay(report, { duration = 10000, hourFrom = 6, hourTo = 22, onDone, onProgress } = {}) {
      const rnd = prng(hashSeed(`${opts.seed}|day|${report.day}`));
      const events = [];
      const curve = (p) => 0.5 + 0.5 * Math.sin(p * Math.PI * 2 - 1.2) + 0.25 * Math.sin(p * Math.PI * 4);
      const pick = (count, weightFn) => {
        const out = [];
        for (let i = 0; i < count; i += 1) {
          let p;
          let tries = 0;
          do {
            p = rnd();
            tries += 1;
          } while (rnd() * 1.3 > weightFn(p) && tries < 12);
          out.push(p);
        }
        return out.sort((a, b) => a - b);
      };
      report.zones.forEach((z) => {
        const weekdayDowntown = z.id === "downtown" && report.weekday;
        const wf = (p) => (weekdayDowntown ? (Math.exp(-Math.pow((p - 0.18) / 0.08, 2)) + Math.exp(-Math.pow((p - 0.62) / 0.09, 2)) + 0.3) : z.id === "stadium" && report.concert ? Math.exp(-Math.pow((p - 0.86) / 0.1, 2)) + 0.1 : Math.max(0.15, curve(p)));
        const per = z.served ? z.revenue / z.served : 0;
        pick(z.served, wf).forEach((p) => events.push({ p, kind: "ride", zone: z.id, fare: per }));
        pick(z.missed, wf).forEach((p) => events.push({ p, kind: "miss", zone: z.id }));
      });
      report.breakdowns.forEach((b, i) => events.push({ p: 0.3 + 0.12 * i + rnd() * 0.1, kind: "break", carId: b.carId, zone: b.zone }));
      if (report.bonus) events.push({ p: 0.97, kind: "bonus", amount: report.bonus });
      events.sort((a, b) => a.p - b.p);
      play = { t: 0, duration, events, i: 0, report, onDone, onProgress, served: {}, cash: report.cashBefore, done: false, hourFrom, hourTo };
      holdHour = null;
      cashShown = report.cashBefore;
    }

    function fireEvent(ev) {
      const [nx, ny] = nodePx[ev.zone] || [w / 2, h / 2];
      if (ev.kind === "ride") {
        play.cash += ev.fare;
        play.served[ev.zone] = (play.served[ev.zone] || 0) + 1;
        const key = `f${ev.zone}`;
        play.acc = play.acc || {};
        play.acc[key] = (play.acc[key] || 0) + ev.fare;
        if (!play.accT) play.accT = {};
        if ((play.accT[key] || 0) <= clock) {
          floats.push({ x: nx + (Math.random() - 0.5) * 26 * u, y: ny - 34 * u, text: `+$${Math.round(play.acc[key])}`, t: 0, life: 1.1, color: "#ffd77a" });
          if (opts.onEvent) opts.onEvent("cash", { amount: play.acc[key] });
          play.acc[key] = 0;
          play.accT[key] = clock + 0.35;
        }
        const idle = [...cabs.values()].find((c) => c.node === ev.zone && !c.path && !c.trip && !c.isBroken && c.charge >= 18 && data.cars.find((x) => x.id === c.id && x.zone === ev.zone));
        if (idle && !reduced) {
          const dests = ZONE_IDS.filter((z) => z !== ev.zone);
          const to = dests[Math.floor(Math.random() * dests.length)];
          idle.trip = { home: ev.zone, back: false };
          idle.occupied = 1;
          sendCab(idle, to, 6 + (idle.id % 4), 230);
        }
        const d = dots[ev.zone];
        if (d && d.length) d.pop();
      } else if (ev.kind === "miss") {
        play.missAcc = play.missAcc || {};
        play.missT = play.missT || {};
        play.missAcc[ev.zone] = (play.missAcc[ev.zone] || 0) + 1;
        if ((play.missT[ev.zone] || 0) <= clock) {
          floats.push({ x: nx + 26 * u, y: ny + 6 * u, text: `${play.missAcc[ev.zone]} missed`, t: 0, life: 1.1, color: "#ff8a7a", small: true });
          play.missAcc[ev.zone] = 0;
          play.missT[ev.zone] = clock + 0.9;
        }
      } else if (ev.kind === "break") {
        play.cash -= play.report.repair || 0;
        const c = cabs.get(ev.carId);
        if (c) {
          c.broken = 1;
          smoke.push({ x: c.x, y: c.y, t: 0, life: 3, car: c });
        }
        floats.push({ x: nx, y: ny - 44 * u, text: "Cab down -$320", t: 0, life: 1.8, color: "#ff6a5a" });
        if (opts.onEvent) opts.onEvent("break", ev);
      } else if (ev.kind === "bonus") {
        play.cash += ev.amount;
        floats.push({ x: w / 2, y: h * 0.4, text: `Contract +$${ev.amount}`, t: 0, life: 2.2, color: "#7dffc4", big: true });
        if (opts.onEvent) opts.onEvent("bonus", ev);
      }
    }

    function skip() {
      if (!play) return;
      play = null;
      cabs.forEach((c) => {
        c.trip = null;
        c.occupied = 0;
        c.path = null;
        c.broken = 0;
      });
      smoke.length = 0;
      floats.length = 0;
      syncCabs();
    }

    /* ---------- state in ---------- */
    function set(next) {
      data = next;
      if (!play) cashShown = next.cash;
      syncCabs();
      ZONE_IDS.forEach((id) => {
        const z = next.zones.find((q) => q.id === id);
        const want = z ? clamp(Math.round(z.demand / 3.2), 0, 16) : 0;
        const list = (dots[id] = dots[id] || []);
        while (list.length < want) list.push({ a: Math.random() * TAU, r: (14 + Math.random() * 20) * (id === "airport" ? 1.1 : 1), ph: Math.random() * TAU });
        while (list.length > want) list.pop();
      });
    }

    function hourNow() {
      if (!data) return 7;
      if (play) return play.hourFrom + (play.hourTo - play.hourFrom) * clamp(play.t / play.duration, 0, 1);
      if (holdHour != null) return holdHour;
      if (data.mode === "night") return 22.5;
      if (data.mode === "deploy") return 7.2;
      return 20.5;
    }

    /* ---------- frame ---------- */
    function update(dtMs) {
      const dt = Math.min(0.05, dtMs / 1000);
      clock += dt;
      if (play) {
        play.t += dt * 1000;
        while (play.i < play.events.length && play.events[play.i].p * play.duration <= play.t) fireEvent(play.events[play.i++]);
        cashShown = lerp(cashShown, play.cash, 0.25);
        if (play.onProgress) play.onProgress(clamp(play.t / play.duration, 0, 1), cashShown);
        if (play.t >= play.duration && !play.done) {
          play.done = true;
          const done = play.onDone;
          cashShown = play.report.cashAfter;
          holdHour = play.hourTo;
          play = null;
          if (done) done();
        }
      }
      cabs.forEach((c) => stepCab(c, dt));
      for (let i = floats.length - 1; i >= 0; i -= 1) {
        const f = floats[i];
        f.t += dt;
        f.y -= dt * 22 * u;
        if (f.t > f.life) floats.splice(i, 1);
      }
      for (let i = smoke.length - 1; i >= 0; i -= 1) {
        smoke[i].t += dt;
        if (smoke[i].t > smoke[i].life) smoke.splice(i, 1);
      }
      if (data?.rain && Math.random() < 0.25) ripples.push({ x: Math.random() * w, y: Math.random() * h, t: 0 });
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        ripples[i].t += dt;
        if (ripples[i].t > 0.7) ripples.splice(i, 1);
      }
      if (!plane && !reduced && Math.random() < 0.004) plane = { t: 0 };
      if (plane) {
        plane.t += dt;
        if (plane.t > 6) plane = null;
      }
    }

    function light(level) {
      return level;
    }

    function draw() {
      if (!layer || !data) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(layer, 0, 0, w, h);
      const hr = hourNow();
      const day = smooth((hr - 5.6) / 2.2) * (1 - smooth((hr - 17.8) / 2.6));
      const night = 1 - day;
      const dusk = Math.max(0, 1 - Math.abs(hr - 18.6) / 1.4) + Math.max(0, 1 - Math.abs(hr - 6.4) / 1);

      /* river shimmer */
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(150,220,240,${0.12 + 0.06 * Math.sin(clock * 2)})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i += 1) {
        const t = (i / 6 + clock * 0.02) % 1;
        const yy = lerp(h * 0.25, h * 1.02, t);
        const xx = lerp(0, w * 0.58, Math.pow(t, 1.1));
        ctx.beginPath();
        ctx.moveTo(xx - 10 * u, yy);
        ctx.lineTo(xx + 10 * u, yy + 3);
        ctx.stroke();
      }
      ctx.restore();

      /* ambient tint */
      ctx.fillStyle = `rgba(4,10,34,${0.62 * night + (data.rain ? 0.12 : 0)})`;
      ctx.fillRect(0, 0, w, h);
      if (dusk > 0.01) {
        ctx.fillStyle = `rgba(255,130,60,${0.1 * dusk})`;
        ctx.fillRect(0, 0, w, h);
      }

      /* lights */
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const nl = clamp(night * 1.15 - 0.1, 0, 1);
      if (nl > 0.02) {
        ctx.fillStyle = `rgba(255,214,140,${0.5 * nl})`;
        const flick = (i) => (Math.sin(clock * 0.7 + i * 12.9) > -0.85 ? 1 : 0.4);
        lights.win.forEach((q, i) => {
          ctx.globalAlpha = 0.5 * nl * flick(i);
          ctx.fillRect(q[0], q[1], q[2], q[3]);
        });
        ctx.globalAlpha = 1;
        lights.lamps.forEach((q) => {
          const rw = q[2] === "rw";
          const fl = q[2] === "fl";
          if (fl && !(data.concert && night > 0.25)) return;
          const r = (fl ? 26 : rw ? 4 : 7) * u;
          const g2 = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
          g2.addColorStop(0, fl ? `rgba(255,250,220,${0.8 * nl})` : rw ? `rgba(120,200,255,${0.8 * nl})` : `rgba(255,200,120,${0.55 * nl})`);
          g2.addColorStop(1, "rgba(255,200,120,0)");
          ctx.fillStyle = g2;
          ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
        });
        if (data.concert) {
          const [sx, sy] = nodePx.stadium;
          const g3 = ctx.createRadialGradient(sx, sy, 6 * u, sx, sy, 70 * u);
          g3.addColorStop(0, `rgba(190,120,255,${0.45 * nl * (0.8 + 0.2 * Math.sin(clock * 3))})`);
          g3.addColorStop(1, "rgba(120,60,255,0)");
          ctx.fillStyle = g3;
          ctx.fillRect(sx - 80 * u, sy - 70 * u, 160 * u, 140 * u);
        }
        const [ox, oy] = nodePx.depot;
        data.cars.forEach((car) => {
          const c = cabs.get(car.id);
          if (!c || c.node !== "depot" || c.path) return;
          const k = clamp(car.charge / 100, 0, 1);
          ctx.fillStyle = car.night ? `rgba(110,255,180,${0.5 + 0.3 * Math.sin(clock * 4)})` : `rgba(120,200,255,${0.25 * k})`;
          ctx.fillRect(c.x - 8 * u, c.y + 6 * u, 16 * u * k, 2.5 * u);
        });
        void ox;
        void oy;
      }
      ctx.restore();

      /* wet roads */
      if (data.rain) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(120,170,230,0.14)";
        ctx.lineWidth = 8 * u;
        ctx.lineJoin = "round";
        roadPx.forEach((r) => {
          ctx.beginPath();
          r.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.stroke();
        });
        ctx.restore();
        ctx.strokeStyle = "rgba(190,220,255,0.35)";
        ctx.lineWidth = 1;
        ripples.forEach((r) => {
          ctx.globalAlpha = 1 - r.t / 0.7;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, 3 + r.t * 14, (3 + r.t * 14) * 0.45, 0, 0, TAU);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      /* plane */
      if (plane) {
        const [ax, ay] = nodePx.airport;
        const t = plane.t / 6;
        const ang = -0.28;
        const dist = lerp(-120 * u, 220 * u, t * t * 1.4);
        const px2 = ax + Math.cos(ang) * dist;
        const py2 = ay - 8 * u + Math.sin(ang) * dist - Math.max(0, t - 0.55) * 80 * u;
        const sc = 1 + Math.max(0, t - 0.5) * 0.9;
        ctx.save();
        ctx.translate(px2, py2);
        ctx.rotate(ang);
        ctx.scale(sc, sc);
        ctx.fillStyle = "#d9e2ec";
        ctx.beginPath();
        ctx.ellipse(0, 0, 13 * u, 3 * u, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-2 * u, 0);
        ctx.lineTo(-6 * u, -11 * u);
        ctx.lineTo(2 * u, 0);
        ctx.lineTo(-6 * u, 11 * u);
        ctx.fill();
        ctx.fillStyle = `rgba(255,70,70,${0.4 + 0.6 * (Math.sin(clock * 8) > 0 ? 1 : 0)})`;
        ctx.fillRect(-14 * u, -1 * u, 2 * u, 2 * u);
        ctx.restore();
      }

      /* zones: passengers, coverage ring, labels */
      const contractZone = data.contract?.zone;
      data.zones.forEach((z) => {
        const [nx, ny] = nodePx[z.id];
        const list = dots[z.id] || [];
        list.forEach((d) => {
          const a = d.a + clock * 0.05;
          const pulse = 0.6 + 0.4 * Math.sin(clock * 3 + d.ph);
          ctx.fillStyle = z.id === contractZone ? `rgba(255,215,120,${0.9 * pulse})` : `rgba(235,245,255,${0.85 * pulse})`;
          ctx.beginPath();
          ctx.arc(nx + Math.cos(a) * d.r * u * 1.4, ny + Math.sin(a) * d.r * u, (2 + pulse) * Math.max(u, 0.8), 0, TAU);
          ctx.fill();
        });
        const cover = z.demand ? clamp(z.cap / z.demand, 0, 1) : 1;
        const ringCol = cover >= 0.85 ? "#7dffc4" : cover >= 0.45 ? "#ffd27a" : "#ff7a6a";
        const rr = 46 * Math.max(u, 0.8);
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 3 * Math.max(u, 0.8);
        ctx.beginPath();
        ctx.arc(nx, ny, rr, 0, TAU);
        ctx.stroke();
        if (!play || data.mode !== "resolve") {
          ctx.strokeStyle = ringCol;
          ctx.beginPath();
          ctx.arc(nx, ny, rr, -Math.PI / 2, -Math.PI / 2 + TAU * cover);
          ctx.stroke();
        } else {
          const served = play.served[z.id] || 0;
          const tot = z.demand || 1;
          ctx.strokeStyle = "#7dffc4";
          ctx.beginPath();
          ctx.arc(nx, ny, rr, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(served / tot, 0, 1));
          ctx.stroke();
        }
        const label = z.name.toUpperCase();
        const sub = play ? `${play.served[z.id] || 0}/${z.demand} rides` : `${z.n} cab${z.n === 1 ? "" : "s"} · ${z.demand} rides`;
        ctx.font = `600 ${10.5 * ui}px ${MONO}`;
        const tw = Math.max(ctx.measureText(label).width, ctx.measureText(sub).width) + 14 * ui;
        const onRight = nx > w * 0.55;
        const bx = clamp(onRight ? nx - rr - 8 - tw : nx + rr + 8, 4, w - tw - 4);
        const byy = clamp(ny - 14 * ui, 48 * ui, h - 78 * ui);
        ctx.fillStyle = "rgba(6,12,22,0.72)";
        ctx.fillRect(bx, byy, tw, 28 * ui);
        ctx.fillStyle = z.id === contractZone ? "#ffd77a" : "#f1f6fb";
        ctx.textAlign = "left";
        ctx.fillText(label, bx + 7 * ui, byy + 11.5 * ui);
        ctx.font = `500 ${9.5 * ui}px ${MONO}`;
        ctx.fillStyle = "rgba(210,225,240,0.82)";
        ctx.fillText(sub, bx + 7 * ui, byy + 23 * ui);
      });

      /* cabs */
      const cu = Math.max(u, 0.8);
      cabs.forEach((c) => {
        const ang = Math.atan2(c.hy, c.hx);
        const moving = !!c.path;
        const col = c.isBroken || c.broken ? "#ff5a4a" : c.charge < 18 ? "#ff9a4a" : c.occupied ? "#ffd16a" : c.night ? "#6dffb4" : "#9fe8ff";
        if (nl_ok(night) && moving) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.translate(c.x, c.y);
          ctx.rotate(ang);
          const g4 = ctx.createLinearGradient(0, 0, 38 * cu, 0);
          g4.addColorStop(0, "rgba(255,240,200,0.4)");
          g4.addColorStop(1, "rgba(255,240,200,0)");
          ctx.fillStyle = g4;
          ctx.beginPath();
          ctx.moveTo(6 * cu, -2 * cu);
          ctx.lineTo(40 * cu, -12 * cu);
          ctx.lineTo(40 * cu, 12 * cu);
          ctx.lineTo(6 * cu, 2 * cu);
          ctx.fill();
          ctx.restore();
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(ang);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11 * cu, 6 * cu, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#e8eef4";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-7 * cu, -3.4 * cu, 14 * cu, 6.8 * cu, 3 * cu) : ctx.rect(-7 * cu, -3.4 * cu, 14 * cu, 6.8 * cu);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.fillRect(-1 * cu, -2.6 * cu, 6 * cu, 5.2 * cu);
        ctx.fillStyle = "#fff6d8";
        ctx.fillRect(6 * cu, -2.6 * cu, 1.4 * cu, 1.4 * cu);
        ctx.fillRect(6 * cu, 1.2 * cu, 1.4 * cu, 1.4 * cu);
        ctx.restore();
      });

      /* smoke, floats */
      smoke.forEach((s) => {
        const k = s.t / s.life;
        for (let i = 0; i < 3; i += 1) {
          ctx.fillStyle = `rgba(190,190,200,${0.35 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(s.car.x + Math.sin(clock * 2 + i) * 4 * u, s.car.y - (6 + i * 7 + k * 20) * u, (3 + i * 2 + k * 5) * u, 0, TAU);
          ctx.fill();
        }
      });
      floats.forEach((f) => {
        const k = f.t / f.life;
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
        ctx.font = `700 ${(f.big ? 17 : f.small ? 10 : 13) * ui}px ${MONO}`;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillText(f.text, f.x + 1, f.y + 1);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.globalAlpha = 1;

      /* rain streaks */
      if (data.rain) {
        ctx.strokeStyle = "rgba(190,215,255,0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 90; i += 1) {
          const sx = ((i * 97.3 + clock * 420) % (w + 80)) - 40;
          const sy = ((i * 53.1 + clock * 880) % (h + 40)) - 20;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - 5, sy + 13);
        }
        ctx.stroke();
      }

      /* vignette */
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.38)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      drawHud(hr, night);
    }

    function nl_ok(night) {
      return night > 0.35;
    }

    function drawHud(hr, night) {
      const hh = Math.floor(hr);
      const mm = Math.floor((hr - hh) * 60);
      const clockText = `${String(hh % 24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      const dayInfo = data.dayInfo || {};
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(6,12,22,0.66)";
      ctx.fillRect(8 * ui, 8 * ui, 152 * ui, 34 * ui);
      ctx.fillStyle = "#ffd77a";
      ctx.font = `700 ${15 * ui}px ${MONO}`;
      ctx.fillText(clockText, 16 * ui, 31 * ui);
      ctx.fillStyle = "rgba(220,232,246,0.85)";
      ctx.font = `500 ${10 * ui}px ${MONO}`;
      ctx.fillText(`${(dayInfo.name || "").toUpperCase()}`, 70 * ui, 22 * ui);
      const tags = [];
      if (dayInfo.rain) tags.push("RAIN");
      if (dayInfo.concert) tags.push("CONCERT");
      if (dayInfo.airportDelay) tags.push("DELAYS");
      ctx.fillStyle = tags.length ? "#9fd2ff" : "rgba(220,232,246,0.55)";
      ctx.fillText(tags.length ? tags.join(" · ") : night > 0.5 ? "CLEAR NIGHT" : "CLEAR", 70 * ui, 35 * ui);

      const cash = `$${Math.round(cashShown).toLocaleString()}`;
      ctx.font = `700 ${16 * ui}px ${MONO}`;
      const cw = ctx.measureText(cash).width + 20 * ui;
      ctx.fillStyle = "rgba(6,12,22,0.66)";
      ctx.fillRect(w - cw - 8 * ui, 8 * ui, cw, 34 * ui);
      ctx.fillStyle = "#7dffc4";
      ctx.textAlign = "right";
      ctx.fillText(cash, w - 18 * ui, 31 * ui);
      ctx.fillStyle = "rgba(220,232,246,0.55)";
      ctx.font = `500 ${8.5 * ui}px ${MONO}`;
      ctx.fillText("CASH", w - 18 * ui, 19 * ui);

      const ct = data.contract;
      if (ct) {
        const served = (ct.served || 0) + (play ? play.served[ct.zone] || 0 : 0);
        const k = clamp(served / Math.max(1, ct.rides), 0, 1);
        const r = 15 * ui;
        const cx = 8 * ui + r + 4;
        const cy = h - 8 * ui - r - 4;
        ctx.fillStyle = "rgba(6,12,22,0.66)";
        ctx.fillRect(8 * ui, h - 8 * ui - 2 * r - 8, 210 * ui, 2 * r + 8);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 3.5 * ui;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = k >= 1 ? "#7dffc4" : "#ffd77a";
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * k);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillStyle = "#f1f6fb";
        ctx.font = `700 ${8.5 * ui}px ${MONO}`;
        ctx.fillText(`${Math.round(k * 100)}%`, cx, cy + 3 * ui);
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffd77a";
        ctx.font = `600 ${10 * ui}px ${MONO}`;
        ctx.fillText(ct.label.toUpperCase(), cx + r + 9 * ui, cy - 2 * ui);
        ctx.fillStyle = "rgba(220,232,246,0.8)";
        ctx.font = `500 ${9.5 * ui}px ${MONO}`;
        ctx.fillText(`${served}/${ct.rides} rides · $${ct.bonus}`, cx + r + 9 * ui, cy + 10 * ui);
      }
    }

    function zoneRect(id) {
      const [x, y] = NODES[id];
      return [x, y];
    }

    resize();
    return { resize, set, update, draw, playDay, skip, zoneRect, hold(h) { holdHour = h; }, get playing() { return !!play; }, get cashShown() { return cashShown; } };
  }

  window.SDTaxiFX = { create, prng, nodes: NODES };
})();
