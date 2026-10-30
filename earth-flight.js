/* Camera flight for the Earth-to-Milky-Way explorer: a 6-DOF camera with quaternion orientation, critically damped
 * springs, log-scale speed, an orbit mode, a free-flight mode, a curved autopilot and a keyframe path player.
 * Pure maths: no DOM and no three.js, so it runs in node tests and never allocates inside step().
 *
 * Frames and units. Everything is in kilometres, in the scene frame (the Earth-fixed frame the renderer uses), as doubles.
 * The camera is stored as (anchor body, offset from that body). The anchor is the nearest body, so the offset stays small
 * next to whatever is in view and the floating origin keeps float32 precision at every scale. Orientation is a quaternion
 * [x, y, z, w]; the camera looks along local -Z with +Y up (the three.js convention). */
export const AU = 149597870.7, LY = 9460730472580.8, PC = AU * 206264.80624709636, KPC = 1000 * PC, EARTH_RADIUS = 6371;
export const MAX_RANGE = 600000 * LY;
/** Altitude floor for every body but Earth, as a fraction of its radius (Earth uses its own, passed in as earthFloor). */
export const FLOOR_FRACTION = 0.4;
/** Sphere of influence, in radii. Inside it the camera may be put into orbit around the body. */
export const SOI_RADII = 40;
/** Cruise speed in nearest-surface altitudes per second at speed multiplier 1. */
export const CRUISE_RATE = 0.35;
export const SPEED_MULT_MIN = 1 / 32, SPEED_MULT_MAX = 32, BOOST = 4;
/** Spring rates (rad/s of the critically damped response). */
export const OMEGA = Object.freeze({ move: 4.2, look: 16, zoom: 11, orbit: 5.5, settle: 7 });

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const smooth01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

// Easings take t in [0, 1]. Names are what a keyframe may say.
export const EASINGS = Object.freeze({
  linear: t => t,
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  smooth: t => t * t * t * (t * (t * 6 - 15) + 10),
});

/* ---------- quaternions: Float64Array(4) [x, y, z, w] ---------- */
export function qMul(o, a, b) {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3], bx = b[0], by = b[1], bz = b[2], bw = b[3];
  o[0] = aw * bx + ax * bw + ay * bz - az * by; o[1] = aw * by - ax * bz + ay * bw + az * bx;
  o[2] = aw * bz + ax * by - ay * bx + az * bw; o[3] = aw * bw - ax * bx - ay * by - az * bz; return o;
}
export function qNorm(q) { const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1; q[0] /= n; q[1] /= n; q[2] /= n; q[3] /= n; return q; }
export function qCopy(o, q) { o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; o[3] = q[3]; return o; }
export function qConj(o, q) { o[0] = -q[0]; o[1] = -q[1]; o[2] = -q[2]; o[3] = q[3]; return o; }
/** Rotate the vector (x, y, z) by q into o. */
export function qRot(o, q, x, y, z) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  o[0] = x + qw * tx + (qy * tz - qz * ty); o[1] = y + qw * ty + (qz * tx - qx * tz); o[2] = z + qw * tz + (qx * ty - qy * tx); return o;
}
export function qFromRotVec(o, x, y, z) {
  const a = Math.sqrt(x * x + y * y + z * z);
  if (a < 1e-12) { o[0] = x / 2; o[1] = y / 2; o[2] = z / 2; o[3] = 1; return o; }
  const s = Math.sin(a / 2) / a; o[0] = x * s; o[1] = y * s; o[2] = z * s; o[3] = Math.cos(a / 2); return o;
}
/** Shortest-way rotation vector (axis * angle) of q. */
export function qToRotVec(o, q) {
  const s = q[3] < 0 ? -1 : 1, x = q[0] * s, y = q[1] * s, z = q[2] * s, w = q[3] * s, sh = Math.sqrt(x * x + y * y + z * z);
  if (sh < 1e-12) { o[0] = 2 * x; o[1] = 2 * y; o[2] = 2 * z; return o; }
  const k = 2 * Math.atan2(sh, w) / sh; o[0] = x * k; o[1] = y * k; o[2] = z * k; return o;
}
export function qFromAxisAngle(o, x, y, z, angle) {
  const n = Math.sqrt(x * x + y * y + z * z) || 1, s = Math.sin(angle / 2) / n; o[0] = x * s; o[1] = y * s; o[2] = z * s; o[3] = Math.cos(angle / 2); return o;
}
export function qSlerp(o, a, b, t) {
  let bx = b[0], by = b[1], bz = b[2], bw = b[3], c = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (c < 0) { c = -c; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  let s0, s1;
  if (c > .9995) { s0 = 1 - t; s1 = t; } else { const th = Math.acos(c), sn = Math.sin(th); s0 = Math.sin((1 - t) * th) / sn; s1 = Math.sin(t * th) / sn; }
  o[0] = a[0] * s0 + bx * s1; o[1] = a[1] * s0 + by * s1; o[2] = a[2] * s0 + bz * s1; o[3] = a[3] * s0 + bw * s1; return qNorm(o);
}
/** Orientation that looks along f with up u. Degenerate up falls back to any perpendicular. */
export function qLook(o, fx, fy, fz, ux, uy, uz) {
  let n = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; const zx = -fx / n, zy = -fy / n, zz = -fz / n;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx; n = Math.sqrt(xx * xx + xy * xy + xz * xz);
  if (n < 1e-9) { // up parallel to the view: pick the axis least aligned with it
    const ax = Math.abs(zx), ay = Math.abs(zy), az = Math.abs(zz);
    const px = ax <= ay && ax <= az ? 1 : 0, py = ay < ax && ay <= az ? 1 : 0, pz = px || py ? 0 : 1;
    xx = py * zz - pz * zy; xy = pz * zx - px * zz; xz = px * zy - py * zx; n = Math.sqrt(xx * xx + xy * xy + xz * xz);
  }
  xx /= n; xy /= n; xz /= n;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const m00 = xx, m01 = yx, m02 = zx, m10 = xy, m11 = yy, m12 = zy, m20 = xz, m21 = yz, m22 = zz, tr = m00 + m11 + m22;
  if (tr > 0) { const s = .5 / Math.sqrt(tr + 1); o[3] = .25 / s; o[0] = (m21 - m12) * s; o[1] = (m02 - m20) * s; o[2] = (m10 - m01) * s; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); o[3] = (m21 - m12) / s; o[0] = .25 * s; o[1] = (m01 + m10) / s; o[2] = (m02 + m20) / s; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); o[3] = (m02 - m20) / s; o[0] = (m01 + m10) / s; o[1] = .25 * s; o[2] = (m12 + m21) / s; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); o[3] = (m10 - m01) / s; o[0] = (m02 + m20) / s; o[1] = (m12 + m21) / s; o[2] = .25 * s; }
  return qNorm(o);
}

/* ---------- springs ---------- */
/** Exact critically damped spring step for x[i] with velocity v[i], for any dt (frame-rate independent, never overshoots a still target). */
export function springStep(x, v, i, target, omega, dt) {
  const d = x[i] - target, c = v[i] + omega * d, e = Math.exp(-omega * dt);
  x[i] = target + (d + c * dt) * e; v[i] = (v[i] - omega * c * dt) * e;
}
export function spring3(x, v, tx, ty, tz, omega, dt) { springStep(x, v, 0, tx, omega, dt); springStep(x, v, 1, ty, omega, dt); springStep(x, v, 2, tz, omega, dt); }

/* ---------- scale rules ---------- */
/** Floor distance from a body's centre. Earth passes an explicit floor (R + MIN_ORBIT_ALTITUDE_KM). */
export const floorDistance = (radius, explicit) => explicit || radius * (1 + FLOOR_FRACTION);
/** Cruise speed in km/s: proportional to the altitude above the nearest surface, so every scale feels the same. */
export function cruiseSpeed(altitudeKm, mult = 1, boost = false) { return CRUISE_RATE * Math.max(altitudeKm, 1e-3) * mult * (boost ? BOOST : 1); }
export function formatSpeed(kmPerS) {
  const v = Math.abs(kmPerS), f = (n, d = 1) => n.toLocaleString('en-GB', { maximumFractionDigits: n < 10 ? d : 0 });
  if (v < 1) return f(v * 1000) + ' m/s';
  if (v < AU / 50) return f(v) + ' km/s';
  if (v < LY / 100) return f(v / AU, 2) + ' AU/s';
  return f(v / LY, 2) + ' light-years/s';
}
/** How far the orbit pivot has slid from the focus to the galactic centre (the explorer's far-zoom behaviour). */
export const galaxyBlend = rangeKm => smooth01((rangeKm / LY - 3000) / (70000 - 3000));

/* ---------- scratch (module level: step() allocates nothing) ---------- */
const S = {
  a: new Float64Array(3), b: new Float64Array(3), c: new Float64Array(3), d: new Float64Array(3),
  q1: new Float64Array(4), q2: new Float64Array(4), q3: new Float64Array(4), r: new Float64Array(3), e: new Float64Array(3), zx: new Float64Array(1), zv: new Float64Array(1), p: new Float64Array(3),
};

/* ---------- autopilot segments ----------
 * A segment flies the camera from its current pose to a pose around a target body, along a curve and at a pace chosen
 * separately.
 *   Curve: a cubic Bezier from the start to the end, leaving radially away from the nearest body and arriving radially
 *   towards the target, plus a sideways swing (searched until every other body is cleared), so a trip past the Sun arcs
 *   around it instead of through it.
 *   Pace: the ratio of "distance travelled plus start altitude" to "distance left plus end altitude" moves linearly (eased)
 *   in log space. The camera therefore leaves a world exponentially, crosses the gap quickly and decelerates
 *   exponentially into the target, at every scale, with a smooth speed all the way. */
const TABLE = 256;
function perpendicular(o, x, y, z) { // any unit vector perpendicular to (x, y, z)
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let px = 0, py = 0, pz = 0; if (ax <= ay && ax <= az) px = 1; else if (ay <= az) py = 1; else pz = 1;
  const cx = py * z - pz * y, cy = pz * x - px * z, cz = px * y - py * x, n = Math.hypot(cx, cy, cz) || 1; o[0] = cx / n; o[1] = cy / n; o[2] = cz / n; return o;
}
function bezierPoint(seg, t, out) {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t, p = seg.ctrl, w = seg.swing * seg.chord * Math.sin(Math.PI * t);
  for (let k = 0; k < 3; k++) out[k] = a * p[k] + b * p[3 + k] + c * p[6 + k] + d * p[9 + k] + w * seg.n[k];
  return out;
}
function buildTable(seg) {
  const pts = seg.pts, cum = seg.cum; bezierPoint(seg, 0, S.e); pts[0] = S.e[0]; pts[1] = S.e[1]; pts[2] = S.e[2]; cum[0] = 0;
  for (let i = 1; i <= TABLE; i++) {
    bezierPoint(seg, i / TABLE, S.e); pts[i * 3] = S.e[0]; pts[i * 3 + 1] = S.e[1]; pts[i * 3 + 2] = S.e[2];
    cum[i] = cum[i - 1] + Math.hypot(pts[i * 3] - pts[i * 3 - 3], pts[i * 3 + 1] - pts[i * 3 - 2], pts[i * 3 + 2] - pts[i * 3 - 1]);
  }
  seg.length = cum[TABLE];
}
function curveAt(seg, len, out) { // point at arc length len
  const cum = seg.cum, pts = seg.pts; len = clamp(len, 0, seg.length);
  let lo = 0, hi = TABLE; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= len) lo = mid; else hi = mid; }
  const span = cum[hi] - cum[lo], t = span > 0 ? (len - cum[lo]) / span : 0;
  for (let k = 0; k < 3; k++) out[k] = pts[lo * 3 + k] + (pts[hi * 3 + k] - pts[lo * 3 + k]) * t;
  return out;
}
/** Distance travelled along the path at normalised time tau. */
function travelled(seg, tau) {
  if (tau <= 0) return 0; if (tau >= 1) return seg.length;
  const e = seg.easing(tau);
  if (!seg.logPace) return seg.length * e;
  const lnR = seg.lnR0 + (seg.lnR1 - seg.lnR0) * e, share = 1 / (1 + Math.exp(-lnR)); // R / (1 + R)
  return clamp(seg.total * share - seg.a0, 0, seg.length);
}
/** Smallest margin (distance beyond the clearance a body needs, km) along the path, measured against the exact polyline the
 * camera follows (not against frames), so a fast move cannot step over a body between samples. Positive means clear. */
function pathMargin(seg) {
  let worst = Infinity; const pts = seg.pts, bodies = seg.obstacles;
  for (let i = 0; i < TABLE; i++) {
    const ax = pts[i * 3], ay = pts[i * 3 + 1], az = pts[i * 3 + 2], dx = pts[i * 3 + 3] - ax, dy = pts[i * 3 + 4] - ay, dz = pts[i * 3 + 5] - az, dd = dx * dx + dy * dy + dz * dz;
    for (let j = 0; j < bodies.length; j++) {
      const b = bodies[j], t = dd > 0 ? clamp(((b.x - ax) * dx + (b.y - ay) * dy + (b.z - az) * dz) / dd, 0, 1) : 0;
      const m = Math.hypot(ax + dx * t - b.x, ay + dy * t - b.y, az + dz * t - b.z) - b.need; if (m < worst) worst = m;
    }
  }
  return worst;
}
/**
 * Plan a segment. Vectors are relative to the target body's centre, in km.
 * @param {{start:number[], end:number[], startCentre:number[]|null, startAltitude:number, q0:ArrayLike<number>, upRef:number[],
 * obstacles:{x:number,y:number,z:number,need:number}[], duration?:number, easing?:string, targetFloor:number, targetRadius:number}} o
 * startCentre is the centre of the nearest body at the start (the camera leaves radially away from it).
 */
export function planSegment(o) {
  const s0 = o.start, r0 = Math.hypot(s0[0], s0[1], s0[2]) || 1, e0 = o.end, r1Raw = Math.hypot(e0[0], e0[1], e0[2]) || 1, r1 = Math.max(r1Raw, o.targetFloor * 1.001);
  const start = new Float64Array(s0), end = new Float64Array([e0[0] * r1 / r1Raw, e0[1] * r1 / r1Raw, e0[2] * r1 / r1Raw]);
  const seg = {
    start, end, r0, r1, chord: Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]), ctrl: new Float64Array(12), n: new Float64Array(3), swing: 0,
    pts: new Float64Array((TABLE + 1) * 3), cum: new Float64Array(TABLE + 1), length: 0, easing: EASINGS[o.easing] || EASINGS.inOut,
    q0: new Float64Array(o.q0), upRef: new Float64Array(o.upRef), obstacles: o.obstacles, duration: 0, margin: 0, kMul: 0,
    a0: Math.max(o.startAltitude || 1, 1e-3), b1: Math.max(r1 - (o.targetRadius || 0), 1e-3), total: 0, lnR0: 0, lnR1: 0, logPace: false,
  };
  const L = Math.max(seg.chord, 1e-6);
  // departure direction: radially away from the nearest body when we are near one, else along the chord
  let ox = (end[0] - start[0]) / L, oy = (end[1] - start[1]) / L, oz = (end[2] - start[2]) / L, startScale = L;
  if (o.startCentre) {
    const dx = start[0] - o.startCentre[0], dy = start[1] - o.startCentre[1], dz = start[2] - o.startCentre[2], dl = Math.hypot(dx, dy, dz) || 1;
    ox = dx / dl; oy = dy / dl; oz = dz / dl; startScale = dl;
  }
  const ax = end[0] / r1, ay = end[1] / r1, az = end[2] / r1; // arrival: radially in, along -a
  // Reference frame for the sideways swing: perpendicular to the chord, "above" (the reference up) first.
  const cx = (end[0] - start[0]) / L, cy = (end[1] - start[1]) / L, cz = (end[2] - start[2]) / L, up = o.upRef, ud = up[0] * cx + up[1] * cy + up[2] * cz;
  let e1 = [up[0] - cx * ud, up[1] - cy * ud, up[2] - cz * ud], el = Math.hypot(e1[0], e1[1], e1[2]);
  if (el < 1e-6) { perpendicular(S.b, cx, cy, cz); e1 = [S.b[0], S.b[1], S.b[2]]; el = 1; }
  e1 = [e1[0] / el, e1[1] / el, e1[2] / el];
  const e2 = [cy * e1[2] - cz * e1[1], cz * e1[0] - cx * e1[2], cx * e1[1] - cy * e1[0]];
  const headings = [0, 180, 90, 270, 45, 315, 135, 225].map(a => { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s]; });
  const shape = (kMul, m, h) => {
    const k0 = Math.min(.45 * L, kMul * startScale), k1 = Math.min(.45 * L, kMul * r1), p = seg.ctrl;
    p[0] = start[0]; p[1] = start[1]; p[2] = start[2]; p[3] = start[0] + ox * k0; p[4] = start[1] + oy * k0; p[5] = start[2] + oz * k0;
    p[6] = end[0] + ax * k1; p[7] = end[1] + ay * k1; p[8] = end[2] + az * k1; p[9] = end[0]; p[10] = end[1]; p[11] = end[2];
    seg.swing = m; if (h) { seg.n[0] = h[0]; seg.n[1] = h[1]; seg.n[2] = h[2]; } seg.kMul = kMul;
    buildTable(seg);
    // pace: R = (travelled + a0) / (remaining + b1), eased linearly in log space
    seg.total = seg.length + seg.a0 + seg.b1; seg.logPace = seg.length > 4 * (seg.a0 + seg.b1);
    seg.lnR0 = Math.log(seg.a0 / (seg.length + seg.b1)); seg.lnR1 = Math.log((seg.length + seg.a0) / seg.b1);
  };
  let best = null;
  search: for (const kMul of [5, 14, 40]) {
    for (const m of [0, .03, .08, .16, .3, .5, .85, 1.4]) {
      for (const h of m === 0 ? [headings[0]] : headings) {
        shape(kMul, m, h); const g = seg.obstacles.length ? pathMargin(seg) : Infinity;
        if (!best || g > best.g) best = { g, kMul, m, h };
        if (g >= 0) break search;
      }
    }
  }
  shape(best.kMul, best.m, best.h); seg.margin = best.g;
  seg.duration = o.duration || clamp(1.5 + .32 * Math.abs(Math.log10(Math.max(seg.length, 1) / Math.max(seg.a0 + seg.b1, 1))) + .3 * Math.min(2, seg.length > 0 ? seg.chord / seg.length : 1), 2, 6.5);
  return seg;
}
/** Position (target-relative) and orientation along the segment at normalised time tau in [0, 1]. */
export function evalSegment(seg, tau, pos, quat) {
  tau = clamp(tau, 0, 1); curveAt(seg, travelled(seg, tau), pos);
  const w = smooth01(tau / .55);
  qLook(S.q3, -pos[0], -pos[1], -pos[2], seg.upRef[0], seg.upRef[1], seg.upRef[2]);
  qSlerp(quat, seg.q0, S.q3, w); return quat;
}

/* ---------- keyframes (the Cinema mode contract) ---------- */
/** A keyframe: {target:'Mars', distance:km from the centre, yaw:deg, pitch:deg, duration:s, easing:'inOut', hold?:s}.
 * yaw is measured about the scene +Y axis from +Z, pitch up from the X-Z plane, both of the camera's offset from the target. */
export function normalizeKeyframes(keys) {
  if (!Array.isArray(keys) || !keys.length) throw new TypeError('A path needs at least one keyframe.');
  return keys.map((k, i) => {
    if (!k || typeof k.target !== 'string') throw new TypeError('Keyframe ' + i + ' needs a target body.');
    if (!(k.distance > 0)) throw new TypeError('Keyframe ' + i + ' needs a positive distance in km.');
    const easing = k.easing || 'inOut'; if (!EASINGS[easing]) throw new TypeError('Keyframe ' + i + ' has an unknown easing.');
    return { target: k.target, distance: +k.distance, yaw: +k.yaw || 0, pitch: clamp(+k.pitch || 0, -89, 89), duration: k.duration > 0 ? +k.duration : 0, easing, hold: k.hold > 0 ? +k.hold : 0 };
  });
}
export const keyframeDirection = (yawDeg, pitchDeg, out) => {
  const y = yawDeg * DEG, p = pitchDeg * DEG; out[0] = Math.cos(p) * Math.sin(y); out[1] = Math.sin(p); out[2] = Math.cos(p) * Math.cos(y); return out;
};
/** A short Earth, Moon, Earth tour. Test hook only; not exposed in the interface yet. */
export const DEMO_PATH = Object.freeze([
  { target: 'Earth', distance: EARTH_RADIUS * 3.4, yaw: 20, pitch: 12, duration: 1.2, easing: 'smooth' },
  { target: 'Moon', distance: 1737.4 * 7, yaw: 60, pitch: 18, duration: 3, easing: 'inOut' },
  { target: 'Earth', distance: EARTH_RADIUS * 3.4, yaw: -40, pitch: 10, duration: 3, easing: 'inOut', hold: .4 },
]);

/* ---------- the flight controller ---------- */
export function createFlight(cfg = {}) {
  const earthFloor = cfg.earthFloor || EARTH_RADIUS + 2500;
  const bodies = [], index = new Map();
  let provider = null;
  const st = {
    mode: 'orbit', anchor: 'Earth', animated: true, time: 0, speedMult: 1, boost: false,
    off: new Float64Array([0, 0, EARTH_RADIUS * 3.4]), q: new Float64Array([0, 0, 0, 1]), qt: new Float64Array([0, 0, 0, 1]), rotErr: new Float64Array(3), rotErrV: new Float64Array(3),
    vel: new Float64Array(3), acc: new Float64Array(3), lz: 0, lzv: 0, lzt: 0, w: new Float64Array(3), wv: new Float64Array(3), wTarget: new Float64Array(3),
    move: new Float64Array(3), look: new Float64Array(3), orbitIn: new Float64Array(2), zoomKey: 0,
    zoomHit: new Float64Array(3), zoomHitUntil: -1, drag: { t: 0, active: false, w: new Float64Array(3) },
    nearestId: 'Earth', altitude: 0, cruise: 0, offer: null, auto: null, path: null, pathIndex: 0, pathHold: 0, pathDone: null, lastP: new Float64Array(3), pathVel: new Float64Array(3),
    inertia: true, version: 0, errMag: 0, cancelled: 0,
  };
  qCopy(st.q, [0, 0, 0, 1]);

  function setBodies(list) {
    const prior = new Map(bodies.map(b => [b.id, b])); bodies.length = 0; index.clear();
    for (const row of list) {
      const old = prior.get(row.id), b = old || { id: row.id, pos: new Float64Array(3), d: 0 };
      b.radius = row.radius; b.floor = floorDistance(row.radius, row.id === 'Earth' ? earthFloor : row.floor); b.soi = row.soi || row.radius * SOI_RADII; b.skipOffer = !!row.skipOffer;
      bodies.push(b); index.set(row.id, b);
    }
    if (!index.has(st.anchor)) { st.anchor = bodies[0]?.id || 'Earth'; }
  }
  setBodies(cfg.bodies || [{ id: 'Earth', radius: EARTH_RADIUS }]);
  function setPositionProvider(fn) { provider = fn; refresh(); }
  function refresh() { if (provider) for (let i = 0; i < bodies.length; i++) provider(bodies[i].id, bodies[i].pos); }
  const anchorBody = () => index.get(st.anchor) || bodies[0];
  const org = new Float64Array(3);
  /** Pivot slide (orbit mode only, far out): the vector from the anchor to the point the camera orbits, which moves towards the galactic centre. */
  function pivotVec(out, id, range) {
    out[0] = out[1] = out[2] = 0; const g = index.get('Galaxy'), a = index.get(id);
    if (!g || !a || id === 'Galaxy') return out; const t = galaxyBlend(range); if (t <= 0) return out;
    out[0] = (g.pos[0] - a.pos[0]) * t; out[1] = (g.pos[1] - a.pos[1]) * t; out[2] = (g.pos[2] - a.pos[2]) * t; return out;
  }
  /** The point offsets are measured from: the anchor, plus the pivot slide in orbit mode. */
  function syncOrg() {
    const a = anchorBody(); org[0] = a.pos[0]; org[1] = a.pos[1]; org[2] = a.pos[2];
    if (st.mode === 'orbit') { pivotVec(S.p, st.anchor, Math.hypot(st.off[0], st.off[1], st.off[2])); org[0] += S.p[0]; org[1] += S.p[1]; org[2] += S.p[2]; }
    return org;
  }
  /** st.off holds the camera's real offset from the anchor; make it the orbit-mode offset: off + pivot(|off|) = real. */
  function solvePivot() {
    S.e[0] = st.off[0]; S.e[1] = st.off[1]; S.e[2] = st.off[2];
    for (let i = 0; i < 40; i++) { pivotVec(S.p, st.anchor, Math.hypot(st.off[0], st.off[1], st.off[2])); st.off[0] = S.e[0] - S.p[0]; st.off[1] = S.e[1] - S.p[1]; st.off[2] = S.e[2] - S.p[2]; }
  }
  /** Move the anchor without moving the camera. */
  function reanchor(id) {
    const to = index.get(id); if (!to || id === st.anchor) return; syncOrg();
    S.e[0] = st.off[0] + org[0] - to.pos[0]; S.e[1] = st.off[1] + org[1] - to.pos[1]; S.e[2] = st.off[2] + org[2] - to.pos[2]; st.anchor = id;
    st.off[0] = S.e[0]; st.off[1] = S.e[1]; st.off[2] = S.e[2];
    if (st.mode === 'orbit') solvePivot();
  }
  const dist = () => Math.hypot(st.off[0], st.off[1], st.off[2]);
  function bodyDistances() { // fills b.d (centre distance); returns nothing
    syncOrg();
    for (let i = 0; i < bodies.length; i++) { const b = bodies[i]; b.d = Math.hypot(st.off[0] + org[0] - b.pos[0], st.off[1] + org[1] - b.pos[1], st.off[2] + org[2] - b.pos[2]); }
  }
  function nearest() {
    let best = null, bs = Infinity, offer = null, os = Infinity;
    for (let i = 0; i < bodies.length; i++) { const b = bodies[i], s = b.d - b.radius; if (s < bs) { bs = s; best = b; } if (!b.skipOffer && b.d < b.soi && b.d < os) { os = b.d; offer = b; } }
    st.nearestId = best.id; st.altitude = Math.max(bs, 0); st.offer = offer ? offer.id : null; return best;
  }
  /** Free flight and autopilot: the anchor follows the nearest body (with hysteresis) so the offset stays small and precise. */
  function followNearest() {
    const cur = anchorBody(); let best = cur, bs = cur.d - cur.radius;
    let solarNearest = Infinity, solar = null;
    for (let i = 0; i < bodies.length; i++) { const b = bodies[i]; if (b.id === 'Galaxy') continue; const s = b.d - b.radius; if (s < solarNearest) { solarNearest = s; solar = b; } }
    const galaxy = index.get('Galaxy');
    if (galaxy) {
      const wantGalaxy = st.anchor === 'Galaxy' ? solarNearest > 1500 * LY : solarNearest > 2000 * LY;
      if (wantGalaxy) { if (st.anchor !== 'Galaxy') reanchor('Galaxy'); return; }
      if (st.anchor === 'Galaxy') { reanchor(solar.id); return; }
    }
    for (let i = 0; i < bodies.length; i++) { const b = bodies[i]; if (b.id === 'Galaxy') continue; const s = b.d - b.radius; if (s < bs * .5) { best = b; bs = s; } }
    if (best !== cur) reanchor(best.id);
  }
  /** Keep the camera out of every floor sphere, sliding along the surface and dropping the inward velocity. */
  function constrain() {
    syncOrg();
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      let rx = st.off[0] + org[0] - b.pos[0], ry = st.off[1] + org[1] - b.pos[1], rz = st.off[2] + org[2] - b.pos[2], d = Math.hypot(rx, ry, rz);
      if (d >= b.floor) continue;
      if (d < 1e-9) { rx = 0; ry = 0; rz = 1; d = 1; }
      const k = b.floor / d; rx *= k; ry *= k; rz *= k;
      st.off[0] = rx - org[0] + b.pos[0]; st.off[1] = ry - org[1] + b.pos[1]; st.off[2] = rz - org[2] + b.pos[2];
      const nx = rx / b.floor, ny = ry / b.floor, nz = rz / b.floor, vn = st.vel[0] * nx + st.vel[1] * ny + st.vel[2] * nz;
      if (vn < 0) { st.vel[0] -= nx * vn; st.vel[1] -= ny * vn; st.vel[2] -= nz * vn; st.acc.fill(0); }
      if (st.lzv < 0 && st.mode === 'orbit' && b.id === st.anchor) st.lzv = 0;
    }
  }
  function clampRange() {
    const d = dist(); if (d > MAX_RANGE) { const k = MAX_RANGE / d; st.off[0] *= k; st.off[1] *= k; st.off[2] *= k; }
  }
  const orbitFloor = () => anchorBody().floor;
  const lnClamp = v => clamp(v, Math.log(orbitFloor()), Math.log(MAX_RANGE));

  /* ----- orientation ----- */
  /** Rotate the whole orbit (position and orientation) by the scene-frame rotation r. */
  function rotateOrbit(r) {
    qRot(S.a, r, st.off[0], st.off[1], st.off[2]); st.off[0] = S.a[0]; st.off[1] = S.a[1]; st.off[2] = S.a[2];
    qNorm(qMul(S.q1, r, st.q)); qCopy(st.q, S.q1); qNorm(qMul(S.q1, r, st.qt)); qCopy(st.qt, S.q1);
    qRot(S.a, r, st.vel[0], st.vel[1], st.vel[2]); st.vel[0] = S.a[0]; st.vel[1] = S.a[1]; st.vel[2] = S.a[2];
  }
  /** Spring the current orientation q towards the target orientation qt. */
  function followTarget(omega, dt) {
    qConj(S.q1, st.qt); qMul(S.q2, S.q1, st.q); qToRotVec(S.r, S.q2);
    spring3(S.r, st.rotErrV, 0, 0, 0, omega, dt);
    st.errMag = Math.abs(S.r[0]) + Math.abs(S.r[1]) + Math.abs(S.r[2]) + Math.abs(st.rotErrV[0]) + Math.abs(st.rotErrV[1]) + Math.abs(st.rotErrV[2]);
    qFromRotVec(S.q1, S.r[0], S.r[1], S.r[2]); qNorm(qMul(S.q2, st.qt, S.q1)); qCopy(st.q, S.q2);
  }
  /** Orbit quaternion that looks from the offset at the body centre, keeping the current up as far as possible. */
  function lookAtCentre(out) { qRot(S.b, st.q, 0, 1, 0); return qLook(out, -st.off[0], -st.off[1], -st.off[2], S.b[0], S.b[1], S.b[2]); }

  /* ----- modes ----- */
  function enterOrbit(id) {
    cancelAuto(true); st.path = null;
    const target = id || st.offer || st.nearestId; if (!index.has(target)) return false;
    const previous = st.mode; reanchor(target); if (previous !== 'orbit') { st.mode = 'orbit'; solvePivot(); }
    const d = clamp(dist(), orbitFloor(), MAX_RANGE); if (d !== dist()) { const k = d / (dist() || 1); st.off[0] *= k; st.off[1] *= k; st.off[2] *= k; }
    lookAtCentre(S.q1); qCopy(st.qt, S.q1); if (!st.animated) { qCopy(st.q, S.q1); st.rotErrV.fill(0); }
    st.lz = Math.log(d); st.lzt = st.lz; st.lzv = 0; st.w.fill(0); st.wv.fill(0); st.vel.fill(0); st.acc.fill(0); st.version++;
    return true;
  }
  function enterFree() {
    cancelAuto(true); st.path = null;
    if (st.mode === 'free') return;
    if (st.mode === 'orbit') { syncOrg(); const a = anchorBody(); st.off[0] += org[0] - a.pos[0]; st.off[1] += org[1] - a.pos[1]; st.off[2] += org[2] - a.pos[2]; }
    st.mode = 'free'; qCopy(st.qt, st.q);
    // keep any orbital momentum as a drift that the spring then brakes
    st.vel[0] = st.w[1] * st.off[2] - st.w[2] * st.off[1]; st.vel[1] = st.w[2] * st.off[0] - st.w[0] * st.off[2]; st.vel[2] = st.w[0] * st.off[1] - st.w[1] * st.off[0];
    st.acc.fill(0); st.w.fill(0); st.wv.fill(0); st.lzv = 0; st.version++;
  }
  function setMode(mode) { if (mode === 'free') enterFree(); else if (mode === 'orbit') return enterOrbit(); return true; }

  /* ----- direct setters (jumps) ----- */
  /** Jump: anchor body, distance from its centre (km), and an orbit quaternion (camera sits on +Z of it, looking at the centre). */
  function jump({ anchor = st.anchor, distance, q }) {
    cancelAuto(true); st.path = null; if (index.has(anchor)) { st.anchor = anchor; }
    const d = clamp(distance ?? dist(), orbitFloor(), MAX_RANGE);
    if (q) { qCopy(st.qt, q); qNorm(st.qt); }
    else lookAtCentre(st.qt);
    qRot(S.a, st.qt, 0, 0, d); st.off[0] = S.a[0]; st.off[1] = S.a[1]; st.off[2] = S.a[2];
    qCopy(st.q, st.qt); st.rotErrV.fill(0); st.mode = 'orbit'; st.lz = Math.log(d); st.lzt = st.lz; st.lzv = 0; st.vel.fill(0); st.acc.fill(0); st.w.fill(0); st.wv.fill(0); st.version++;
  }
  /** Replace the orbit orientation (arcball drag, focus on a place) without changing the distance. Orbit mode only. */
  function setOrbitQuaternion(q, now = st.time) {
    if (st.mode !== 'orbit') return;
    const d = dist();
    if (st.drag.active && st.animated && st.inertia) { // angular velocity from the change, smoothed
      qConj(S.q1, st.q); qMul(S.q2, q, S.q1); qToRotVec(S.r, S.q2); const dt = now - st.drag.t;
      if (dt > 1e-3) { const a = .45; for (let i = 0; i < 3; i++) st.drag.w[i] = st.drag.w[i] * (1 - a) + S.r[i] / dt * a; }
      st.drag.t = now;
    }
    qCopy(st.q, q); qNorm(st.q); qCopy(st.qt, st.q); st.rotErrV.fill(0);
    qRot(S.a, st.q, 0, 0, d); st.off[0] = S.a[0]; st.off[1] = S.a[1]; st.off[2] = S.a[2];
  }
  function dragStart(now = st.time) { cancelAuto(); st.w.fill(0); st.wv.fill(0); st.drag.active = true; st.drag.t = now; st.drag.w.fill(0); }
  function dragEnd(now = st.time) {
    const drag = st.drag; if (!drag.active) return; drag.active = false;
    if (!st.animated || !st.inertia || st.mode !== 'orbit' || now - drag.t > .09) return;
    const s = Math.hypot(drag.w[0], drag.w[1], drag.w[2]); if (s < .05) return;
    const k = Math.min(1, 5 / s); for (let i = 0; i < 3; i++) { st.w[i] = drag.w[i] * k; st.wv[i] = 0; }
  }
  /** Spin the orbit about a scene-frame axis (the idle drift). */
  function spinOrbit(ax, ay, az, angle) { if (st.mode === 'orbit') rotateOrbit(qFromAxisAngle(S.q3, ax, ay, az, angle)); }
  /** Local rotation of the orbit by yaw (about camera Y) and pitch (about camera X), radians. Keyboard steps when not animating. */
  function orbitStep(yaw, pitch) {
    if (st.mode === 'free') { lookBy(yaw, pitch); return; }
    qFromRotVec(S.q3, 0, yaw, 0); qFromRotVec(S.q1, -pitch, 0, 0); qMul(S.q2, S.q3, S.q1); // local rotation: yaw about camera Y, then pitch about X
    qMul(S.q1, st.q, S.q2); qCopy(S.q3, S.q1); setOrbitQuaternion(S.q3);
  }
  /** Free look: rotate the target orientation by yaw/pitch/roll radians about the camera's own axes. */
  function lookBy(yaw, pitch, roll = 0) {
    cancelAuto();
    if (st.mode !== 'free') enterFree();
    qFromRotVec(S.q1, pitch, yaw, roll); qNorm(qMul(S.q2, st.qt, S.q1)); qCopy(st.qt, S.q2);
    if (!st.animated) { qCopy(st.q, st.qt); st.rotErrV.fill(0); }
  }
  function setDistance(d, immediate = true) {
    cancelAuto();
    if (st.mode === 'orbit') {
      const t = lnClamp(Math.log(d)); st.lzt = t;
      if (immediate || !st.animated) { st.lz = t; st.lzv = 0; const k = Math.exp(t) / (dist() || 1); st.off[0] *= k; st.off[1] *= k; st.off[2] *= k; }
    } else { const k = clamp(d, orbitFloor(), MAX_RANGE) / (dist() || 1); st.off[0] *= k; st.off[1] *= k; st.off[2] *= k; }
  }
  /** Multiplicative zoom (wheel, pinch). hit is an optional unit vector (scene frame) from the body centre to the point under the cursor. */
  function zoomBy(factor, hit) {
    if (!(factor > 0)) return; cancelAuto();
    if (st.mode === 'free') { speedBy(factor < 1 ? 1.25 : 1 / 1.25); return; }
    st.lzt = lnClamp(st.lzt + Math.log(factor));
    if (hit) { st.zoomHit[0] = hit[0]; st.zoomHit[1] = hit[1]; st.zoomHit[2] = hit[2]; st.zoomHitUntil = st.time + .4; }
    if (!st.animated) { st.lz = st.lzt; st.lzv = 0; const k = Math.exp(st.lzt) / (dist() || 1); st.off[0] *= k; st.off[1] *= k; st.off[2] *= k; }
  }
  /** Free flight: dolly forward (positive) or back along the view by a fraction of the nearest-surface altitude. */
  function dolly(fraction) {
    cancelAuto(); if (st.mode !== 'free') enterFree();
    qRot(S.a, st.q, 0, 0, -1); const step = fraction * Math.max(st.altitude, 1);
    st.off[0] += S.a[0] * step; st.off[1] += S.a[1] * step; st.off[2] += S.a[2] * step; bodyDistances(); constrain(); nearest();
  }
  /** Move a fixed amount along the camera axes (keyboard steps when the loop is not running: paused or reduced motion). */
  function nudge(x, y, z, seconds = .25) {
    cancelAuto(); if (st.mode !== 'free') enterFree();
    qRot(S.a, st.q, x, y, z); const l = Math.hypot(S.a[0], S.a[1], S.a[2]) || 1, k = cruiseSpeed(st.altitude, st.speedMult, st.boost) * seconds / Math.max(l, 1);
    st.off[0] += S.a[0] * k; st.off[1] += S.a[1] * k; st.off[2] += S.a[2] * k; bodyDistances(); constrain(); bodyDistances(); followNearest(); bodyDistances(); nearest();
  }
  function speedBy(factor) { st.speedMult = clamp(st.speedMult * factor, SPEED_MULT_MIN, SPEED_MULT_MAX); }

  /* ----- inputs held over time ----- */
  function setMove(x, y, z) { st.move[0] = x; st.move[1] = y; st.move[2] = z; if (x || y || z) { cancelAuto(); } }
  function setLook(yaw, pitch, roll) { st.look[0] = yaw; st.look[1] = pitch; st.look[2] = roll; if (yaw || pitch || roll) cancelAuto(); }
  function setOrbitInput(h, v, zoom = 0) { st.orbitIn[0] = h; st.orbitIn[1] = v; st.zoomKey = zoom; if (h || v || zoom) cancelAuto(); }
  const setBoost = on => { st.boost = !!on; };

  /* ----- autopilot and paths ----- */
  function cancelAuto(silent) {
    if (!st.auto) { st.path = null; return false; }
    // carry the path's velocity so the camera coasts to a stop instead of freezing
    st.vel[0] = st.pathVel[0]; st.vel[1] = st.pathVel[1]; st.vel[2] = st.pathVel[2]; st.acc.fill(0);
    st.auto = null; st.path = null; st.mode = 'free'; qCopy(st.qt, st.q); st.rotErrV.fill(0); st.w.fill(0); st.wv.fill(0); st.version++;
    if (!silent) st.cancelled = (st.cancelled || 0) + 1;
    return true;
  }
  function worldOf(out) { syncOrg(); out[0] = org[0] + st.off[0]; out[1] = org[1] + st.off[1]; out[2] = org[2] + st.off[2]; return out; }
  /** Build a segment from the current camera to a pose around target. dir is the unit offset direction at the end.
   * Far out (orbit mode beyond ~3,000 light-years) the point the camera orbits has slid towards the galactic centre, so the path
   * is planned to that point and the arrival matches what orbit mode will draw. */
  function segmentTo({ target, distance, dir, q, duration, easing }) {
    const t = index.get(target); if (!t) throw new RangeError('Unknown body ' + target);
    const r1 = Math.max(distance, t.floor * 1.001); pivotVec(S.p, target, r1);
    const tpt = [t.pos[0] + S.p[0], t.pos[1] + S.p[1], t.pos[2] + S.p[2]];
    const start = [0, 0, 0]; worldOf(S.c); start[0] = S.c[0] - tpt[0]; start[1] = S.c[1] - tpt[1]; start[2] = S.c[2] - tpt[2];
    const end = [dir[0] * r1, dir[1] * r1, dir[2] * r1];
    bodyDistances(); const near = nearest(), startCentre = [near.pos[0] - tpt[0], near.pos[1] - tpt[1], near.pos[2] - tpt[2]];
    const obstacles = [];
    for (const b of bodies) {
      const x = b.pos[0] - tpt[0], y = b.pos[1] - tpt[1], z = b.pos[2] - tpt[2];
      const startD = Math.hypot(start[0] - x, start[1] - y, start[2] - z), endD = Math.hypot(end[0] - x, end[1] - y, end[2] - z);
      obstacles.push({ x, y, z, need: Math.min(b.floor * 1.04, startD * .999, endD * .999) });
    }
    qRot(S.d, q, 0, 1, 0);
    const seg = planSegment({ start, end, startCentre, startAltitude: st.altitude, q0: st.q, upRef: [S.d[0], S.d[1], S.d[2]], obstacles, duration, easing, targetFloor: t.floor, targetRadius: t.radius });
    seg.tpt = new Float64Array(tpt); return seg;
  }
  /**
   * Fly to a body on a curved path. Returns false (and jumps) when not animated.
   * @param {string} target body id
   * @param {{distance?:number, q?:ArrayLike<number>, duration?:number, easing?:string, onDone?:Function}} o  q is the final orbit
   * quaternion (the camera sits on its +Z axis looking at the centre).
   */
  function flyTo(target, o = {}) {
    const t = index.get(target); if (!t) return false;
    const distance = clamp(o.distance || t.floor * 3, t.floor * 1.001, MAX_RANGE);
    const q = o.q ? qCopy(new Float64Array(4), o.q) : (() => { const out = new Float64Array(4); lookAtCentre(out); return out; })();
    if (!st.animated) { jump({ anchor: target, distance, q }); o.onDone?.(); return false; }
    cancelAuto(true); st.path = null;
    qRot(S.a, q, 0, 0, 1); const dir = [S.a[0], S.a[1], S.a[2]];
    const seg = segmentTo({ target, distance, dir, q, duration: o.duration, easing: o.easing });
    startSegment(seg, target, o.onDone); return true;
  }
  function startSegment(seg, target, onDone) {
    st.mode = 'auto'; st.auto = { seg, target, t: 0, onDone, q: qNorm(qLook(new Float64Array(4), -seg.end[0], -seg.end[1], -seg.end[2], seg.upRef[0], seg.upRef[1], seg.upRef[2])) };
    st.w.fill(0); st.wv.fill(0); st.vel.fill(0); st.acc.fill(0); st.pathVel.fill(0); st.version++;
  }
  function finishAuto() {
    const a = st.auto, seg = a.seg, t = index.get(a.target); st.auto = null;
    reanchor(a.target); st.mode = 'orbit';
    st.off[0] = seg.end[0]; st.off[1] = seg.end[1]; st.off[2] = seg.end[2];
    qCopy(st.q, a.q); qCopy(st.qt, a.q); st.rotErrV.fill(0); st.lz = Math.log(dist()); st.lzt = st.lz; st.lzv = 0; st.vel.fill(0); st.acc.fill(0); st.version++;
    if (t) { bodyDistances(); nearest(); }
    a.onDone?.();
  }
  function stepAuto(dt) {
    const a = st.auto, seg = a.seg, t = index.get(a.target);
    a.t += dt / seg.duration; const done = a.t >= 1;
    evalSegment(seg, done ? 1 : a.t, S.a, st.q); qCopy(st.qt, st.q);
    if (dt > 0) { st.pathVel[0] = (S.a[0] - st.lastP[0]) / dt; st.pathVel[1] = (S.a[1] - st.lastP[1]) / dt; st.pathVel[2] = (S.a[2] - st.lastP[2]) / dt; }
    st.lastP[0] = S.a[0]; st.lastP[1] = S.a[1]; st.lastP[2] = S.a[2];
    // target-relative to anchor-relative
    // blend from the planned target position to its live one: the scene frame turns with the Earth, so the target moves while we fly
    pivotVec(S.p, a.target, seg.r1); const an = anchorBody(), tp = S.c, pl = seg.tpt, span = Math.log(seg.r0 / seg.r1), frac = Math.abs(span) > .3 ? clamp(Math.log(seg.r0 / (Math.hypot(S.a[0], S.a[1], S.a[2]) || 1)) / span, 0, 1) : a.t, w = smooth01(frac * 1.8);
    tp[0] = pl[0] + (t.pos[0] + S.p[0] - pl[0]) * w; tp[1] = pl[1] + (t.pos[1] + S.p[1] - pl[1]) * w; tp[2] = pl[2] + (t.pos[2] + S.p[2] - pl[2]) * w;
    st.off[0] = S.a[0] + tp[0] - an.pos[0]; st.off[1] = S.a[1] + tp[1] - an.pos[1]; st.off[2] = S.a[2] + tp[2] - an.pos[2];
    bodyDistances(); followNearest(); bodyDistances(); constrain();
    if (done) finishAuto();
  }
  /** Play a keyframe path. Each keyframe is one autopilot segment (with obstacle avoidance); hold pauses on the pose. */
  function playPath(keys, { onDone, onKeyframe } = {}) {
    const frames = normalizeKeyframes(keys);
    for (const k of frames) if (!index.has(k.target)) throw new RangeError('Unknown body ' + k.target);
    cancelAuto(true); st.path = { frames, onDone, onKeyframe }; st.pathIndex = 0; st.pathHold = 0; runKeyframe();
    return { stop: () => { st.path = null; cancelAuto(true); } };
  }
  function runKeyframe() {
    const p = st.path, k = p.frames[st.pathIndex], t = index.get(k.target);
    keyframeDirection(k.yaw, k.pitch, S.d); const dir = [S.d[0], S.d[1], S.d[2]];
    const r = Math.max(k.distance, t.floor * 1.001);
    qLook(S.q1, -dir[0], -dir[1], -dir[2], 0, 1, 0); const q = qCopy(new Float64Array(4), S.q1);
    p.onKeyframe?.(st.pathIndex, k);
    if (!st.animated) { jump({ anchor: k.target, distance: r, q }); st.path = p; st.pathIndex++; if (st.pathIndex < p.frames.length) runKeyframe(); else { st.path = null; p.onDone?.(); } return; }
    const seg = segmentTo({ target: k.target, distance: r, dir, q, duration: k.duration || undefined, easing: k.easing });
    const keep = st.path; startSegment(seg, k.target, null); st.path = keep; st.auto.pathStep = true;
  }
  function advanceKeyframe() {
    const p = st.path; if (!p) return;
    const k = p.frames[st.pathIndex]; st.pathHold = k.hold || 0; st.pathIndex++;
    if (st.pathIndex >= p.frames.length) { const done = p.onDone; if (st.pathHold > 0) { st.path = { ...p, finishing: true }; return; } st.path = null; done?.(); }
  }

  /* ----- the per-frame step ----- */
  function step(dt) {
    dt = Math.min(Math.max(dt, 0), .25); st.time += dt;
    refresh(); bodyDistances();
    if (st.mode === 'auto') {
      stepAuto(dt);
      if (st.mode === 'orbit' && st.path) { const p = st.path; advanceKeyframe(); if (st.path === p && st.pathIndex < p.frames.length && st.pathHold <= 0) runKeyframe(); }
    } else {
      if (st.path && st.pathHold > 0) { st.pathHold -= dt; if (st.pathHold <= 0) { const p = st.path; if (p.finishing) { st.path = null; p.onDone?.(); } else if (st.pathIndex < p.frames.length) runKeyframe(); } }
      if (st.mode === 'orbit') stepOrbit(dt); else stepFree(dt);
      bodyDistances(); constrain(); if (st.mode === 'free') { bodyDistances(); followNearest(); }
    }
    bodyDistances(); nearest();
    st.cruise = cruiseSpeed(st.altitude, st.speedMult, st.boost);
    return st;
  }
  function stepOrbit(dt) {
    const d = dist();
    // keyboard orbit: a scene-frame angular rate from the camera-local arrow input, scaled so a screen-sized move takes the same time near and far
    const rate = .9 * clamp((d / anchorBody().radius - 1) / 2, .18, 1);
    qRot(S.a, st.q, -st.orbitIn[1] * rate, st.orbitIn[0] * rate, 0);
    if (st.drag.active) { st.wTarget.fill(0); } else { st.wTarget[0] = S.a[0]; st.wTarget[1] = S.a[1]; st.wTarget[2] = S.a[2]; }
    if (!st.drag.active) {
      spring3(st.w, st.wv, st.wTarget[0], st.wTarget[1], st.wTarget[2], OMEGA.orbit, dt);
      const ws = Math.hypot(st.w[0], st.w[1], st.w[2]);
      if (ws < 1e-5 && !(st.orbitIn[0] || st.orbitIn[1])) { st.w.fill(0); st.wv.fill(0); }
      else { qFromRotVec(S.q3, st.w[0] * dt, st.w[1] * dt, st.w[2] * dt); rotateOrbit(S.q3); }
    }
    // zoom spring on log distance; held zoom keys move the target
    if (st.zoomKey) st.lzt = lnClamp(st.lzt - st.zoomKey * 1.1 * dt);
    const before = Math.log(d); st.lz = before;
    S.zx[0] = st.lz; S.zv[0] = st.lzv; springStep(S.zx, S.zv, 0, st.lzt, OMEGA.zoom, dt); st.lz = S.zx[0]; st.lzv = S.zv[0];
    const lo = Math.log(orbitFloor()); if (st.lz < lo) { st.lz = lo; if (st.lzv < 0) st.lzv = 0; }
    if (Math.abs(st.lz - st.lzt) < 2e-6 && Math.abs(st.lzv) < 2e-5) { st.lz = st.lzt; st.lzv = 0; }
    const k = Math.exp(st.lz) / d; st.off[0] *= k; st.off[1] *= k; st.off[2] *= k;
    // zoom towards the point under the cursor: turn the orbit a fraction of the way to it as the distance closes
    const dl = st.lz - before;
    if (dl < 0 && st.time < st.zoomHitUntil) {
      const n = Math.hypot(st.off[0], st.off[1], st.off[2]) || 1, cx = st.off[0] / n, cy = st.off[1] / n, cz = st.off[2] / n, h = st.zoomHit;
      const dot = clamp(cx * h[0] + cy * h[1] + cz * h[2], -1, 1), ang = Math.acos(dot);
      if (ang > 1e-4 && ang < 3) {
        const ax = cy * h[2] - cz * h[1], ay = cz * h[0] - cx * h[2], az = cx * h[1] - cy * h[0];
        // rotating the orbit by +ang about (c x h) carries c onto h; go a fraction of the way
        rotateOrbit(qFromAxisAngle(S.q3, ax, ay, az, ang * Math.min(.9, -dl * .6)));
      }
    }
    // a pending change of orientation (entering orbit from free flight) turns smoothly
    followTarget(OMEGA.settle, dt);
    if (!st.animated) { qCopy(st.q, st.qt); }
    clampRange();
  }
  function stepFree(dt) {
    // look: keyboard rates turn the target orientation, the spring follows
    if (st.look[0] || st.look[1] || st.look[2]) { qFromRotVec(S.q1, st.look[1] * dt, st.look[0] * dt, st.look[2] * dt); qNorm(qMul(S.q2, st.qt, S.q1)); qCopy(st.qt, S.q2); }
    followTarget(OMEGA.look, dt);
    // move: velocity spring towards the camera-relative input at the cruise speed
    let mx = st.move[0], my = st.move[1], mz = st.move[2]; const ml = Math.hypot(mx, my, mz); if (ml > 1) { mx /= ml; my /= ml; mz /= ml; }
    const speed = cruiseSpeed(st.altitude, st.speedMult, st.boost);
    qRot(S.a, st.q, mx, my, mz);
    spring3(st.vel, st.acc, S.a[0] * speed, S.a[1] * speed, S.a[2] * speed, OMEGA.move, dt);
    const sp = Math.hypot(st.vel[0], st.vel[1], st.vel[2]);
    if (sp < 1e-9 * Math.max(speed, 1e-6) && !ml) { st.vel.fill(0); st.acc.fill(0); }
    // sub-steps so a boosted move cannot tunnel through a body: at most 0.35 altitudes per sub-step
    const travel = sp * dt, n = clamp(Math.ceil(travel / (.35 * Math.max(st.altitude, 1e-3))), 1, 24), h = dt / n;
    for (let i = 0; i < n; i++) {
      st.off[0] += st.vel[0] * h; st.off[1] += st.vel[1] * h; st.off[2] += st.vel[2] * h;
      if (i < n - 1) { bodyDistances(); constrain(); }
    }
    clampRange();
  }

  /** Whether the next frame will change anything (the renderer keeps its loop running at full rate while this is true). */
  const active = () => st.mode === 'auto' || !!st.path || !!(st.move[0] || st.move[1] || st.move[2] || st.look[0] || st.look[1] || st.look[2] || st.orbitIn[0] || st.orbitIn[1] || st.zoomKey)
    || Math.abs(st.vel[0]) + Math.abs(st.vel[1]) + Math.abs(st.vel[2]) > 1e-9 || Math.abs(st.w[0]) + Math.abs(st.w[1]) + Math.abs(st.w[2]) > 1e-5
    || Math.abs(st.lz - st.lzt) > 1e-6 || st.errMag > 1e-5;
  const orbitQuaternion = () => st.mode === 'free' ? st.q : st.qt;
  /** Snapshot for tests and the interface (allocates; not for the hot path). */
  const state = () => ({
    mode: st.mode === 'auto' ? 'autopilot' : st.mode, anchor: st.anchor, distanceKm: dist(), nearest: st.nearestId, altitudeKm: st.altitude, cruiseKmS: st.cruise, speedMult: st.speedMult,
    offer: st.offer, autopilot: st.auto ? st.auto.target : null, autopilotProgress: st.auto ? clamp(st.auto.t, 0, 1) : 0, path: !!st.path, speed: Math.hypot(st.vel[0], st.vel[1], st.vel[2]),
    offset: Array.from(st.off), q: Array.from(st.q), version: st.version,
  });

  return {
    state: st, bodies, setBodies, setPositionProvider, refresh, step, active, snapshot: state, orbitQuaternion,
    nudge, jump, flyTo, cancelAutopilot: () => cancelAuto(), enterOrbit, enterFree, setMode, playPath, planTo: segmentTo,
    setOrbitQuaternion, dragStart, dragEnd, spinOrbit, orbitStep, lookBy, setDistance, zoomBy, dolly, speedBy, setMove, setLook, setOrbitInput, setBoost,
    /** Recompute distances, nearest world, offer and cruise speed (the renderer calls this when frames are not stepping). */
    measure() { refresh(); bodyDistances(); nearest(); st.cruise = cruiseSpeed(st.altitude, st.speedMult, st.boost); },
    distance: dist, worldOf, reanchor, floorOf: id => index.get(id)?.floor, bodyOf: id => index.get(id),
    setAnimated(on) { st.animated = !!on; if (!on) { st.w.fill(0); st.wv.fill(0); st.vel.fill(0); st.acc.fill(0); st.rotErrV.fill(0); st.lz = Math.log(dist()); st.lzt = st.lz; st.lzv = 0; qCopy(st.q, st.qt); st.drag.active = false; } },
    setInertia(on) { st.inertia = !!on; },
    scaleDistance(k) { if (!(k > 0)) return; st.off[0] *= k; st.off[1] *= k; st.off[2] *= k; st.lz = Math.log(dist()); st.lzt = st.lz; constrain(); },
    /** Intersect a scene-frame ray (from the camera) with the anchor sphere; writes the unit direction from the centre into out, or returns false. */
    rayHit(dx, dy, dz, out) {
      const r = anchorBody().radius, ox = st.off[0], oy = st.off[1], oz = st.off[2], b = ox * dx + oy * dy + oz * dz, c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c;
      if (disc < 0 || c <= 0) return false; const t = -b - Math.sqrt(disc); if (t <= 0) return false;
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, n = Math.hypot(x, y, z) || 1; out[0] = x / n; out[1] = y / n; out[2] = z / n; return true;
    },
  };
}
