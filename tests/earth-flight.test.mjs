// Flight maths for the Earth-to-Milky-Way explorer: springs, speed scaling, floors, autopilot, cancel, keyframes.
import assert from 'node:assert/strict';
import { PerformanceObserver } from 'node:perf_hooks';
import * as F from '../earth-flight.js';
import * as M from '../earth-cosmos-model.js';

assert.equal(F.AU, M.AU); assert.equal(F.LY, M.LY); assert.equal(F.KPC, M.KPC); assert.equal(F.PC, M.PC); assert.equal(F.EARTH_RADIUS, M.EARTH_RADIUS);
const eph = M.ephemeris(new Date('2026-10-29T00:00:00Z'));
const galaxyPos = M.galToEq(M.SUN_GALACTIC.map(v => -v * M.KPC));
const positions = { ...eph.positions, Galaxy: galaxyPos };
const FLOOR_EARTH = 6371 + 2500;
function makeFlight() {
  const f = F.createFlight({ earthFloor: FLOOR_EARTH, bodies: [...M.BODIES.map(b => ({ id: b.id, radius: b.radius })), { id: 'Galaxy', radius: M.KPC, skipOffer: true }] });
  f.setPositionProvider((id, out) => { const p = positions[id]; out[0] = p[0]; out[1] = p[1]; out[2] = p[2]; });
  return f;
}
const len = v => Math.hypot(v[0], v[1], v[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function camera(f) { return f.worldOf([0, 0, 0]); }
function run(f, seconds, fps, each) { const dt = 1 / fps, n = Math.round(seconds * fps); for (let i = 0; i < n; i++) { f.step(dt); each?.(i); } }
function clearances(f) { const c = camera(f); return f.bodies.map(b => ({ id: b.id, d: len(sub(c, b.pos)), r: b.radius, floor: b.floor })); }

// ---- quaternions
{
  const q = new Float64Array(4), v = new Float64Array(3);
  F.qLook(q, 0, 0, -1, 0, 1, 0); assert.ok(Math.abs(q[3] - 1) < 1e-12, 'looking down -Z with +Y up is the identity');
  F.qLook(q, 1, 0, 0, 0, 1, 0); F.qRot(v, q, 0, 0, -1); assert.ok(Math.abs(v[0] - 1) < 1e-12 && Math.abs(v[2]) < 1e-12, 'camera forward points at the target');
  F.qRot(v, q, 0, 1, 0); assert.ok(Math.abs(v[1] - 1) < 1e-12, 'up stays up');
  F.qLook(q, 0, 1, 0, 0, 1, 0); assert.ok(Number.isFinite(q[0] + q[1] + q[2] + q[3]) && Math.abs(Math.hypot(...q) - 1) < 1e-12, 'looking along up does not degenerate');
  const a = new Float64Array([0, 0, 0, 1]), b = F.qFromAxisAngle(new Float64Array(4), 0, 1, 0, 2.5), m = new Float64Array(4);
  F.qSlerp(m, a, b, .5); F.qToRotVec(v, m); assert.ok(Math.abs(v[1] - 1.25) < 1e-9);
  F.qFromRotVec(m, 0, 0, 3); F.qToRotVec(v, m); assert.ok(Math.abs(v[2] - 3) < 1e-9, 'rotation vector round trip');
}

// ---- spring: exact, frame-rate independent, no overshoot
{
  const results = [];
  for (const fps of [15, 30, 60, 144]) {
    const x = new Float64Array([0]), v = new Float64Array([0]); let prev = -1, max = 0;
    const n = fps * 2;
    for (let i = 0; i < n; i++) { F.springStep(x, v, 0, 1, 6, 1 / fps); assert.ok(x[0] >= prev - 1e-12, 'monotone, no overshoot'); prev = x[0]; max = Math.max(max, x[0]); }
    results.push(x[0]); assert.ok(max <= 1 + 1e-12);
  }
  const exact = 1 - (1 + 6 * 2) * Math.exp(-12);
  for (const r of results) assert.ok(Math.abs(r - exact) < 1e-9, 'spring matches the closed form at every frame rate: ' + r + ' vs ' + exact);
  // stable for absurd steps too
  const x = new Float64Array([5]), v = new Float64Array([100]); F.springStep(x, v, 0, 0, 10, 100); assert.ok(Number.isFinite(x[0]) && Math.abs(x[0]) < 1e-6);
}

// ---- free flight: same distance at every frame rate, at every scale
{
  const cases = [['Earth floor', () => ({ anchor: 'Earth', distance: FLOOR_EARTH * 1.2 })], ['1 AU from the Sun', () => ({ anchor: 'Sun', distance: M.AU })], ['Moon', () => ({ anchor: 'Moon', distance: 1737.4 * 8 })], ['100 ly out', () => ({ anchor: 'Sun', distance: 100 * M.LY })]];
  for (const [name, setup] of cases) {
    const travelled = [];
    for (const fps of [15, 30, 60, 144]) {
      const f = makeFlight(); f.jump(setup()); f.enterFree(); f.step(.001); const start = camera(f), cruise = f.state.cruise;
      f.setMove(0, 0, -1); run(f, 2, fps); f.setMove(0, 0, 0); run(f, 2.5, fps);
      travelled.push({ fps, d: len(sub(camera(f), start)), cruise });
    }
    const ref = travelled.at(-1).d; assert.ok(ref > 0, name + ' moved');
    for (const t of travelled) assert.ok(Math.abs(t.d - ref) / ref < .03, name + ': distance flown at ' + t.fps + ' fps differs by more than 3% (' + t.d + ' vs ' + ref + ')');
    // it must be a sensible fraction of the local altitude: a few altitudes after two seconds of cruising
    assert.ok(ref / travelled[0].cruise > .8 && ref / travelled[0].cruise < 8, name + ': speed is not consistent with the cruise rule');
  }
}

// ---- speed scales with distance to the nearest surface (log scale, metres/s to light-years/s)
{
  const a = F.cruiseSpeed(1), b = F.cruiseSpeed(1e3), c = F.cruiseSpeed(M.LY);
  assert.ok(Math.abs(b / a - 1e3) < 1e-6 && Math.abs(c / a - M.LY) / M.LY < 1e-9, 'linear in altitude, so uniform on a log scale');
  assert.equal(F.formatSpeed(.5), '500 m/s'); assert.match(F.formatSpeed(1200), /km\/s/); assert.match(F.formatSpeed(M.AU * 3), /AU\/s/); assert.match(F.formatSpeed(M.LY * 3), /light-years\/s/);
  assert.equal(F.cruiseSpeed(10, 2, true), F.cruiseSpeed(10) * 2 * F.BOOST);
  const f = makeFlight(); f.jump({ anchor: 'Earth', distance: FLOOR_EARTH }); f.step(.01); const near = f.state.cruise;
  f.jump({ anchor: 'Sun', distance: M.AU * 3 }); f.step(.01); const far = f.state.cruise;
  assert.ok(far / near > 1e3, 'far from every body the camera is much faster than at the Earth floor: ' + far / near);
  f.jump({ anchor: 'Sun', distance: 5000 * M.LY }); f.step(.01); assert.ok(f.state.cruise > M.LY * .1, 'light-years per second between the stars');
}

// ---- floors: nothing can be flown, zoomed or autopiloted below them
{
  for (const id of ['Earth', 'Moon', 'Mars', 'Jupiter', 'Sun', 'Saturn']) {
    const f = makeFlight(), body = f.bodyOf(id); f.jump({ anchor: id, distance: body.floor * 6 });
    f.setBoost(true); f.enterFree(); f.setMove(0, 0, -1); // straight at the body, boosted, at 15 fps (the worst case for tunnelling)
    // aim at the centre
    F.qLook(f.state.qt, -f.state.off[0], -f.state.off[1], -f.state.off[2], 0, 1, 0); F.qCopy(f.state.q, f.state.qt);
    let min = Infinity; run(f, 40, 15, () => { const d = len(sub(camera(f), body.pos)); if (d < min) min = d; assert.ok(Number.isFinite(d)); });
    assert.ok(min >= body.floor * (1 - 1e-9), id + ' free flight crossed its floor: ' + min + ' < ' + body.floor);
    assert.ok(min < body.floor * 1.01, id + ' flight should reach the floor and slide along it');
    const g = makeFlight(); g.jump({ anchor: id, distance: body.floor * 3 }); g.setAnimated(false);
    g.setDistance(1); assert.ok(Math.abs(g.distance() - body.floor) < 1e-6 * body.floor, id + ' setDistance clamps to the floor');
    g.setAnimated(true); for (let i = 0; i < 80; i++) g.zoomBy(.5); run(g, 4, 60); assert.ok(g.distance() >= body.floor * (1 - 1e-9) && g.distance() < body.floor * 1.001, id + ' wheel zoom settles on the floor: ' + g.distance() / body.floor);
  }
  assert.equal(makeFlight().floorOf('Earth'), FLOOR_EARTH); assert.equal(makeFlight().floorOf('Mars'), 3389.5 * 1.4);
  const f = makeFlight(); f.jump({ anchor: 'Earth', distance: 1e6 }); f.setAnimated(false); f.zoomBy(1e30); assert.ok(f.distance() <= F.MAX_RANGE * (1 + 1e-12), 'range is bounded');
}

// ---- orbit mode: drag momentum decays; zoom is smooth and monotone
{
  const f = makeFlight(); f.jump({ anchor: 'Earth', distance: 6371 * 3.4 }); const q0 = Float64Array.from(f.state.q);
  f.dragStart(0); const q = new Float64Array(4); let t = 0;
  for (let i = 1; i <= 8; i++) { t = i * .016; F.qMul(q, F.qFromAxisAngle(new Float64Array(4), 0, 1, 0, .02 * i), q0); f.setOrbitQuaternion(q, t); }
  f.dragEnd(t + .01); assert.ok(Math.hypot(...f.state.w) > .5, 'release keeps momentum');
  const speeds = []; run(f, 3, 60, () => speeds.push(Math.hypot(...f.state.w)));
  for (let i = 1; i < speeds.length; i++) assert.ok(speeds[i] <= speeds[i - 1] + 1e-9, 'momentum only decays');
  assert.ok(speeds.at(-1) < 1e-4 && !f.active(), 'settles to rest');
  assert.ok(Math.abs(f.distance() - 6371 * 3.4) < 1e-6, 'orbit keeps its distance while spinning');
  const p = makeFlight(); p.jump({ anchor: 'Earth', distance: 6371 * 3.4 }); p.setAnimated(false); p.dragStart(0); p.setOrbitQuaternion(q, .01); p.dragEnd(.02); assert.equal(Math.hypot(...p.state.w), 0, 'no inertia when paused or reduced motion');
  const z = makeFlight(); z.jump({ anchor: 'Earth', distance: 6371 * 3.4 }); z.zoomBy(.5); const ds = []; run(z, 2, 60, () => ds.push(z.distance()));
  for (let i = 1; i < ds.length; i++) assert.ok(ds[i] <= ds[i - 1] + 1e-9, 'zoom in is monotone');
  assert.ok(Math.abs(ds.at(-1) / (6371 * 3.4) - .5) < 1e-4, 'zoom factor honoured');
}

// ---- autopilot
const AUTOPILOT_TARGETS = [['Mars', 6.5], ['Saturn', 12], ['Jupiter', 6.5], ['Sun', 20], ['Moon', 6.5], ['Neptune', 6.5], ['Mercury', 6.5], ['Earth', 3.4]];
function direction(i) { const a = i * 2.399963, z = Math.cos(i * 1.3); const s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; }
function bodiesClear(f, startClear) {
  const c = camera(f); let worst = Infinity;
  for (const b of f.bodies) { const need = Math.min(b.floor, startClear.get(b.id) ?? Infinity) * .995, d = len(sub(c, b.pos)); worst = Math.min(worst, d - need); assert.ok(d > b.radius, 'inside ' + b.id); }
  return worst;
}
{
  let n = 0, pairs = 0;
  for (const startId of ['Earth', 'Moon', 'Sun', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Neptune']) {
    for (const [target, factor] of AUTOPILOT_TARGETS) {
      if (target === startId) continue;
      for (const k of [0, 1]) {
        const f = makeFlight(), sb = f.bodyOf(startId), d = sb.floor * (1.05 + k * 4), dir = direction(n++);
        f.jump({ anchor: startId, distance: d, q: F.qLook(new Float64Array(4), -dir[0], -dir[1], -dir[2], 0, 1, 0) });
        // a start offset along dir: rebuild the offset from the orbit quaternion convention instead
        const startClear = new Map(f.bodies.map(b => [b.id, len(sub(camera(f), b.pos))]));
        const tb = f.bodyOf(target), endQ = F.qLook(new Float64Array(4), -.5, -.6, -.62, 0, 1, 0);
        let arrived = false; assert.equal(f.flyTo(target, { distance: tb.radius * factor, q: endQ, onDone: () => { arrived = true; } }), true);
        const seg = f.state.auto.seg; assert.ok(seg.margin >= 0, `${startId}->${target}: planner found no clear path (margin ${seg.margin})`);
        assert.ok(seg.duration >= 2 && seg.duration <= 6.5, 'a few seconds: ' + seg.duration);
        let frames = 0, minStep = Infinity, prev = camera(f), lastSteps = [];
        { // exact geometry: walk the planned path finely (frames are too coarse at cruise speed, one frame can span a body)
          const p = new Float64Array(3), qq = new Float64Array(4), tgt = f.bodyOf(target).pos;
          for (let i = 0; i <= 20000; i++) { F.evalSegment(seg, i / 20000, p, qq); for (const b of f.bodies) { const need = Math.min(b.floor, startClear.get(b.id)) * .995, d = Math.hypot(p[0] + tgt[0] - b.pos[0], p[1] + tgt[1] - b.pos[1], p[2] + tgt[2] - b.pos[2]); assert.ok(d >= need, `${startId}->${target} at ${i / 200}%: inside ${b.id} clearance (${d} < ${need})`); } }
        }
        while (f.state.mode === 'auto' && frames < 60 * 12) {
          f.step(1 / 60); frames++;
          const c = camera(f); const step = len(sub(c, prev)); prev = c; assert.ok(Number.isFinite(step));
          for (const b of f.bodies) assert.ok(len(sub(c, b.pos)) > b.radius, `${startId}->${target} frame ${frames}: inside ${b.id}`);
          if (f.state.mode === 'auto') lastSteps.push(step);
        }
        assert.ok(arrived && f.state.mode === 'orbit' && f.state.anchor === target, `${startId}->${target} arrives in orbit around the target`);
        assert.ok(Math.abs(f.distance() / (tb.radius * factor) - 1) < 1e-6 || f.distance() >= tb.floor, 'framing distance reached');
        assert.ok(Math.abs(f.distance() / Math.max(tb.radius * factor, tb.floor * 1.001) - 1) < 1e-6, `${startId}->${target} framing: ${f.distance()} vs ${tb.radius * factor}`);
        assert.ok(frames / 60 >= 1.9 && frames / 60 <= 6.6, 'duration ' + frames / 60);
        // graceful deceleration: the last 10% of the time covers far less distance than the middle
        const tail = lastSteps.slice(-Math.floor(lastSteps.length * .1)).reduce((s, v) => s + v, 0), mid = lastSteps.slice(Math.floor(lastSteps.length * .45), Math.floor(lastSteps.length * .55)).reduce((s, v) => s + v, 0);
        if (seg.r0 / seg.r1 > 20) assert.ok(tail < mid, `${startId}->${target}: decelerates (${tail} < ${mid})`);
        pairs++;
      }
    }
  }
  assert.ok(pairs > 90, 'many start/target pairs were checked: ' + pairs);
}
// Earth to Saturn and Earth to Mars specifically, in the real browser units
{
  const f = makeFlight(); f.jump({ anchor: 'Earth', distance: FLOOR_EARTH * 1.1 }); f.flyTo('Saturn', { distance: 58232 * 12, q: F.qLook(new Float64Array(4), -.5, -.5, -.7, 0, 1, 0) });
  assert.ok(f.state.auto.seg.duration > 2.5 && f.state.auto.seg.duration < 6.5, 'Earth to Saturn takes a few seconds: ' + f.state.auto.seg.duration);
  run(f, 7, 60); assert.equal(f.state.anchor, 'Saturn'); assert.equal(f.state.mode, 'orbit');
}
// Sun in the way: Earth and a body on the far side of the Sun must arc around it
{
  const saved = positions.Mars; const sun = positions.Sun;
  positions.Mars = sun.map(v => v * 2); // the Sun lies exactly on the straight line from Earth to Mars
  try {
    const f = makeFlight(); f.jump({ anchor: 'Earth', distance: FLOOR_EARTH * 1.1 }); f.flyTo('Mars', { distance: 3389.5 * 6.5 }); const seg = f.state.auto.seg;
    assert.ok(seg.swing > 0, 'the planner swings sideways when the Sun is on the straight line');
    const p = new Float64Array(3), qq = new Float64Array(4); let minSun = Infinity; for (let i = 0; i <= 20000; i++) { F.evalSegment(seg, i / 20000, p, qq); minSun = Math.min(minSun, Math.hypot(p[0] + positions.Mars[0] - sun[0], p[1] + positions.Mars[1] - sun[1], p[2] + positions.Mars[2] - sun[2])); }
    assert.ok(minSun > 695700 * 1.39, 'clears the Sun by its floor distance: ' + minSun / 695700);
  } finally { positions.Mars = saved; }
}
// Cancel on input: every input cancels cleanly, the camera coasts to a stop, with no jump
{
  const inputs = { move: f => f.setMove(0, 0, -1), look: f => f.lookBy(.05, 0), drag: f => f.dragStart(0), zoom: f => f.zoomBy(.8), orbitKey: f => f.setOrbitInput(1, 0), cancel: f => f.cancelAutopilot(), free: f => f.enterFree(), orbit: f => f.enterOrbit('Earth') };
  for (const [name, act] of Object.entries(inputs)) {
    const f = makeFlight(); f.jump({ anchor: 'Earth', distance: FLOOR_EARTH * 1.2 }); f.flyTo('Mars', { distance: 3389.5 * 6.5 }); run(f, 1.5, 60);
    assert.equal(f.state.mode, 'auto'); const before = camera(f), speed0 = len(f.state.pathVel); f.step(1 / 60); const v0 = len(sub(camera(f), before));
    act(f); assert.equal(f.state.auto, null, name + ' cancels the autopilot'); assert.notEqual(f.state.mode, 'auto');
    if (name === 'enterOrbit' || name === 'orbit') continue;
    f.setMove(0, 0, 0); f.setOrbitInput(0, 0); const after = camera(f); f.step(1 / 60); const v1 = len(sub(camera(f), after));
    assert.ok(v1 < v0 * 3 + 1 && v1 > 0, name + ': no sudden jump when cancelling (' + v0 + ' -> ' + v1 + ')');
    let c = camera(f), last = Infinity, moved = true; run(f, 8, 60); const e = len(f.state.vel); assert.ok(e < speed0 * 1e-3 + 1e-6 || name === 'move', name + ': coasts to rest (' + e + ')');
    assert.equal(f.state.auto, null);
  }
}
// Reduced motion / paused: instant arrival
{
  const f = makeFlight(); f.setAnimated(false); f.jump({ anchor: 'Earth', distance: FLOOR_EARTH * 1.2 }); let done = false; assert.equal(f.flyTo('Jupiter', { distance: 69911 * 6.5, onDone: () => { done = true; } }), false);
  assert.ok(done && f.state.anchor === 'Jupiter' && f.state.mode === 'orbit' && Math.abs(f.distance() - 69911 * 6.5) < 1e-3);
}

// ---- keyframe paths
{
  assert.throws(() => F.normalizeKeyframes([]), TypeError); assert.throws(() => F.normalizeKeyframes([{ target: 'Mars' }]), TypeError); assert.throws(() => F.normalizeKeyframes([{ target: 'Mars', distance: 5, easing: 'wobble' }]), TypeError);
  const f = makeFlight(); f.jump({ anchor: 'Earth', distance: 6371 * 3.4 }); const seen = []; let done = false;
  f.playPath(F.DEMO_PATH, { onDone: () => { done = true; }, onKeyframe: i => seen.push(i) });
  let t = 0; while (!done && t < 30) { f.step(1 / 60); t += 1 / 60; }
  assert.ok(done, 'the demo path finishes'); assert.deepEqual(seen, [0, 1, 2]); assert.equal(f.state.anchor, 'Earth'); assert.ok(Math.abs(f.distance() / (6371 * 3.4) - 1) < 1e-6);
  assert.ok(t > 4 && t < 14, 'demo path duration ' + t);
  const g = makeFlight(); g.setAnimated(false); g.jump({ anchor: 'Earth', distance: 6371 * 3.4 }); let d2 = false; g.playPath(F.DEMO_PATH, { onDone: () => { d2 = true; } }); assert.ok(d2 && g.state.anchor === 'Earth');
  const h = makeFlight(); h.jump({ anchor: 'Earth', distance: 6371 * 3.4 }); h.playPath(F.DEMO_PATH); run(h, .5, 60); h.setMove(1, 0, 0); assert.ok(!h.state.path && h.state.mode !== 'auto', 'input stops a path');
  assert.throws(() => h.playPath([{ target: 'Pluto', distance: 5 }]), RangeError);
}

// ---- no per-frame allocation in step()
{
  const f = makeFlight(); f.jump({ anchor: 'Earth', distance: FLOOR_EARTH * 2 }); f.enterFree(); f.setMove(.3, .2, -1); f.setLook(.1, .05, .02); f.setBoost(true);
  run(f, 1, 60); let gcs = 0; const obs = new PerformanceObserver(list => { gcs += list.getEntries().length; }); obs.observe({ entryTypes: ['gc'] });
  const dt = 1 / 60; for (let i = 0; i < 200000; i++) f.step(dt);
  gcs += obs.takeRecords().length; obs.disconnect();
  assert.ok(gcs <= 1, 'free-flight step() allocates nothing that triggers garbage collection: ' + gcs + ' collections over 200k frames');
  const g = makeFlight(); g.jump({ anchor: 'Earth', distance: FLOOR_EARTH * 2 }); g.setOrbitInput(1, .5); run(g, 1, 60);
  let gc2 = 0; const o2 = new PerformanceObserver(list => { gc2 += list.getEntries().length; }); o2.observe({ entryTypes: ['gc'] }); for (let i = 0; i < 200000; i++) g.step(dt); gc2 += o2.takeRecords().length; o2.disconnect();
  assert.ok(gc2 <= 1, 'orbit step() allocates nothing: ' + gc2);
}
console.log('Flight maths verified: springs at 15/30/60/144 fps, log-scale speed, floors, autopilot clearance and arrival, cancel, keyframes.');
