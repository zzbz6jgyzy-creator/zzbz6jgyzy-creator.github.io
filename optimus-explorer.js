// Supercharged Daily: full-screen Optimus explorer. Original code, adapted from the Cybertruck explorer. three.js r170 (MIT).
// Exterior: "Tesla Optimus Gen 3" by Michael (Sketchfab, CC BY 4.0), cut into parts at the joints by
// scripts/optimus-model-pipeline.mjs. It is fan-made, not Tesla CAD. Internals are illustrative, modelled here
// from the layout Tesla described at AI Day 2022 (14 rotary + 14 linear actuators, torso battery and computer).
import * as THREE from '/vendor/three/three.module.min.js';
import { initZoom } from '/m3x-zoom.js?v=1';
import { OrbitControls } from '/vendor/three/addons/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/addons/GLTFLoader.js';
import { DRACOLoader } from '/vendor/three/addons/DRACOLoader.js';
import { RoomEnvironment } from '/vendor/three/addons/RoomEnvironment.js';
import { PARTS, ORDER, PHOTOS } from './optimus-parts.js?v=20261027';

const MODEL = { url: '/assets/3d/optimus.glb?v=1', height: 1.73 }; // 2021 concept height; the model is scaled to it
const RED = 0xe11d2e;
let raf = 0, kickTimer = 0, frames = 0, t0 = performance.now(), visible = true;
const app = document.querySelector('[data-m3x]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const $ = (s) => app.querySelector(s);
const notify = (type, extra = {}) => { if (parent !== window) parent.postMessage({ type, ...extra }, location.origin); };
const fail = (msg) => { app.classList.add('m3x-failed'); $('.m3x-status').textContent = msg; notify('sd-optimus-failed'); };
const portrait = () => innerWidth < innerHeight;

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); if (!renderer.getContext()) throw 0; }
catch (e) { fail('Your browser can’t run 3D here, so this is a still image.'); throw e; }
let dpr = Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2);
renderer.setPixelRatio(dpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('.m3x-canvas').appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Interactive Optimus. Arrow keys orbit, plus and minus zoom, Home resets. Escape returns to the guide.');

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050506); scene.fog = new THREE.Fog(0x050506, 9, 22);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 0.7;
const camera = new THREE.PerspectiveCamera(34, 1, 0.03, 60);
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(2.5, 5, 3.5); key.castShadow = true;
key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 0.5, far: 14 }); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
const rim = new THREE.DirectionalLight(0xff5a66, 0.55); rim.position.set(-3, 1.6, -3.5);
const fill = new THREE.DirectionalLight(0xbfd2ff, 0.5); fill.position.set(-3, 2.2, 3.5);
scene.add(key, rim, fill, new THREE.HemisphereLight(0x9aa8ff, 0x100404, 0.3));
const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 96), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 1, metalness: 0, envMapIntensity: 0.1 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.003; scene.add(m); })();
const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.507, 180), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .45 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; scene.add(ring);
const grid = new THREE.PolarGridHelper(4, 16, 6, 96, 0x2a0a0e, 0x1a0b0d); grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, enablePan: false, enableZoom: true, minDistance: 0.6, maxDistance: 8, minPolarAngle: 0.12, maxPolarAngle: Math.PI / 2 - 0.02, rotateSpeed: coarse ? 0.85 : 0.65, zoomSpeed: 0.7 });
renderer.domElement.style.touchAction = 'none';
const HOME = { p: new THREE.Vector3(), t: new THREE.Vector3(0, 0.92, 0) };
const homePos = () => new THREE.Vector3(1.75, 1.3, 3.7).multiplyScalar(portrait() ? 1.02 : 1);

const parts = {};
const HIDDEN_UNTIL_EXPLODE = new Set(['cameras', 'computer', 'battery', 'neck', 'rotary', 'linear', 'hands', 'feet', 'harness']);
const reg = (id) => (parts[id] = parts[id] || { meshes: [], hits: [], group: new THREE.Group(), off: new THREE.Vector3() });
const car = new THREE.Group(); scene.add(car);
const S = (o) => new THREE.MeshStandardMaterial(o), P = (o) => new THREE.MeshPhysicalMaterial(o);
const M = {
  alu: S({ color: 0xb4b9c0, metalness: .95, roughness: .3 }), aluDark: S({ color: 0x5d6168, metalness: .9, roughness: .38 }),
  cast: S({ color: 0x8a8d92, metalness: .8, roughness: .5 }), steel: S({ color: 0x2b2d31, metalness: .7, roughness: .42 }),
  chrome: S({ color: 0xe6e9ee, metalness: 1, roughness: .12 }), black: S({ color: 0x0d0d0f, roughness: .8 }),
  copper: S({ color: 0xc27a3e, metalness: .95, roughness: .3 }), hv: S({ color: 0xff6a00, roughness: .55 }),
  cell: S({ color: 0x1e3f6e, metalness: .4, roughness: .45 }), cellTop: S({ color: 0xb9c0c8, metalness: .9, roughness: .3 }),
  pcb: S({ color: 0x12442e, roughness: .6 }), chip: S({ color: 0x15171b, roughness: .35, metalness: .3 }),
  lens: P({ color: 0x0b0f18, metalness: .2, roughness: .05, clearcoat: 1 }), tendon: S({ color: 0xd8dde4, metalness: .9, roughness: .25 }),
  red: S({ color: RED, roughness: .45 }),
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function addMesh(id, m, hitMin = 0.06) {
  const p = reg(id); m.castShadow = m.receiveShadow = true; m.userData.part = id; p.group.add(m); p.meshes.push(m);
  m.updateMatrix(); const bb = new THREE.Box3(); if (m.geometry) { m.geometry.computeBoundingBox(); bb.copy(m.geometry.boundingBox); if (m.isInstancedMesh) { m.computeBoundingBox(); bb.copy(m.boundingBox); } }
  const s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(s.x, hitMin), Math.max(s.y, hitMin), Math.max(s.z, hitMin)), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.copy(c).applyMatrix4(m.matrix); hit.quaternion.copy(m.quaternion); hit.userData = { part: id, hit: true }; p.group.add(hit); p.hits.push(hit); return m;
}
function add(id, geo, mat, pos, rot, hitMin) { const m = new THREE.Mesh(geo, mat); m.position.copy(pos); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); return addMesh(id, m, hitMin); }
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (r, l, s = 32, r2) => new THREE.CylinderGeometry(r, r2 ?? r, l, s);
function inst(id, geo, mat, list) { const im = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D(); list.forEach((p, i) => { o.position.copy(p.pos || p); if (p.quat) o.quaternion.copy(p.quat); else o.quaternion.identity(); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); return addMesh(id, im); }
const AXIS = { x: [0, 0, Math.PI / 2], y: null, z: [Math.PI / 2, 0, 0] };
const AXV = { x: V(1, 0, 0), y: V(0, 1, 0), z: V(0, 0, 1) };

const ACT = { rotary: 0, linear: 0 };
// Rotary actuator: housing, strain-wave ring, output flange with a bolt circle and a cable tab.
function rotary(pos, r, axis = 'x') {
  ACT.rotary++;
  const len = r * 0.95, a = AXV[axis], q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), a);
  add('rotary', cyl(r, len, 40), M.cast, pos, AXIS[axis], r * 2.2);
  add('rotary', new THREE.TorusGeometry(r * 1.01, r * 0.08, 8, 40), M.aluDark, pos.clone().addScaledVector(a, len * 0.18), axis === 'y' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, Math.PI / 2, 0] : null);
  add('rotary', cyl(r * 0.72, len * 0.25, 40), M.alu, pos.clone().addScaledVector(a, len * 0.6), AXIS[axis]);
  add('rotary', cyl(r * 0.24, len * 0.32, 20), M.chrome, pos.clone().addScaledVector(a, len * 0.72), AXIS[axis]);
  const bolts = []; const u = new THREE.Vector3(1, 0, 0); if (Math.abs(u.dot(a)) > .9) u.set(0, 0, 1); const w = new THREE.Vector3().crossVectors(a, u).normalize(); u.crossVectors(w, a).normalize();
  for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; bolts.push({ pos: pos.clone().addScaledVector(a, len * 0.74).addScaledVector(u, Math.cos(t) * r * 0.55).addScaledVector(w, Math.sin(t) * r * 0.55), quat: q }); }
  inst('rotary', cyl(r * 0.06, len * 0.08, 6), M.steel, bolts);
  add('rotary', box(r * 0.5, r * 0.3, r * 0.3), M.black, pos.clone().addScaledVector(w, r * 1.05), null, 0.03);
}
// Linear actuator: finned motor can, roller-screw nut, threaded screw, chrome rod and rod-end eyes.
function linear(a, b, r) {
  ACT.linear++;
  const d = b.clone().sub(a), L = d.length(), dir = d.clone().normalize(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
  const seg = (t0, t1, rad, mat, segs = 24) => { const m = new THREE.Mesh(cyl(rad, L * (t1 - t0), segs), mat); m.position.copy(a).addScaledVector(dir, L * (t0 + t1) / 2); m.quaternion.copy(q); return addMesh('linear', m, r * 2.4); };
  seg(0, .36, r, M.aluDark); seg(.36, .44, r * 0.86, M.cast);
  const fins = []; for (let i = 0; i < 6; i++) fins.push({ pos: a.clone().addScaledVector(dir, L * (0.04 + i * 0.055)), quat: q });
  inst('linear', cyl(r * 1.12, L * 0.012, 24), M.alu, fins);
  seg(.44, .66, r * 0.42, M.steel, 12);
  const thread = []; for (let i = 0; i < 14; i++) thread.push({ pos: a.clone().addScaledVector(dir, L * (0.45 + i * 0.015)), quat: q });
  inst('linear', cyl(r * 0.5, L * 0.005, 12), M.cast, thread);
  seg(.66, .96, r * 0.26, M.chrome, 12);
  const eye = (p) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r * 0.5, r * 0.16, 8, 20), M.alu); m.position.copy(p); m.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))); addMesh('linear', m, r * 2); };
  eye(b); eye(a.clone().addScaledVector(dir, -r * 0.4));
}
function tube(id, pts, r, mat) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(12, pts.length * 10), r, 6, false); return addMesh(id, new THREE.Mesh(g, mat), 0.02); }

// Internals in metres, body scaled to 1.73 m, front facing +Z, robot's left at +X.
function buildInternals() {
  // Battery: casing, exposed cell array, pack board on top.
  const bc = V(0, 1.30, -0.005);
  add('battery', box(0.27, 0.23, 0.012), M.aluDark, bc.clone().add(V(0, 0, -0.05)));
  for (const sx of [-1, 1]) add('battery', box(0.012, 0.23, 0.1), M.aluDark, bc.clone().add(V(sx * 0.135, 0, 0)));
  add('battery', box(0.27, 0.012, 0.1), M.aluDark, bc.clone().add(V(0, -0.115, 0)));
  const cells = [], tops = []; const qz = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(0, 0, 1));
  for (let r = 0; r < 9; r++) for (let c = 0; c < 11; c++) { const p = bc.clone().add(V(-0.115 + c * 0.023 + (r % 2) * 0.0115 - 0.005, -0.095 + r * 0.021, 0)); cells.push({ pos: p, quat: qz }); tops.push({ pos: p.clone().add(V(0, 0, 0.042)), quat: qz }); }
  inst('battery', cyl(0.0098, 0.08, 14), M.cell, cells); inst('battery', cyl(0.0085, 0.004, 14), M.cellTop, tops);
  add('battery', box(0.25, 0.022, 0.09), M.pcb, bc.clone().add(V(0, 0.126, 0)));
  for (let i = 0; i < 6; i++) add('battery', box(0.018 + (i % 3) * 0.008, 0.008, 0.016), M.chip, bc.clone().add(V(-0.1 + i * 0.04, 0.141, 0.01)), null, 0.02);
  const bus = []; for (let r = 0; r < 4; r++) bus.push(bc.clone().add(V(0, -0.084 + r * 0.05, 0.046))); inst('battery', box(0.24, 0.006, 0.003), M.copper, bus);
  // Central computer above the pack: board, SoC, memory, heat-spreader fins.
  const cc = V(0, 1.455, 0.0);
  add('computer', box(0.17, 0.06, 0.008), M.pcb, cc);
  add('computer', box(0.04, 0.04, 0.006), M.chip, cc.clone().add(V(-0.03, 0, 0.007)), null, 0.03);
  for (let i = 0; i < 4; i++) add('computer', box(0.014, 0.02, 0.004), M.chip, cc.clone().add(V(0.02 + (i % 2) * 0.02, i < 2 ? 0.012 : -0.012, 0.006)), null, 0.02);
  const fins = []; for (let i = 0; i < 10; i++) fins.push(cc.clone().add(V(-0.08 + i * 0.017, 0, -0.016))); inst('computer', box(0.003, 0.055, 0.022), M.alu, fins);
  // Cameras behind the face plate.
  for (const sx of [-1, 1]) { const p = V(sx * 0.022, 1.645, 0.055); add('cameras', box(0.026, 0.016, 0.02), M.black, p, null, 0.03); add('cameras', new THREE.SphereGeometry(0.0065, 14, 10), M.lens, p.clone().add(V(0, 0, 0.011)), null, 0.02); }
  add('cameras', box(0.07, 0.03, 0.004), M.pcb, V(0, 1.645, 0.042));
  // 2-DoF neck.
  const nk = (pos, axis) => { add('neck', cyl(0.026, 0.024, 32), M.cast, pos, AXIS[axis], 0.05); add('neck', cyl(0.018, 0.03, 24), M.alu, pos, AXIS[axis]); };
  nk(V(0, 1.50, 0), 'y'); nk(V(0, 1.535, 0), 'x');
  // 14 rotary actuators: shoulders 6, wrists 2, hips 4, waist 2.
  for (const s of [-1, 1]) {
    rotary(V(s * 0.198, 1.39, 0), 0.042, 'x'); rotary(V(s * 0.222, 1.335, 0), 0.034, 'z'); rotary(V(s * 0.23, 1.275, 0), 0.03, 'y');
    rotary(V(s * 0.234, 1.045, 0), 0.024, 'y');
    rotary(V(s * 0.1, 0.955, 0), 0.036, 'y'); rotary(V(s * 0.12, 0.895, 0), 0.04, 'z');
  }
  rotary(V(0, 1.15, 0), 0.05, 'y'); rotary(V(0, 1.075, 0), 0.044, 'x');
  // 14 linear actuators: elbows 2, wrists 4, hips 2, knees 2, ankles 4.
  for (const s of [-1, 1]) {
    linear(V(s * 0.222, 1.245, -0.012), V(s * 0.229, 1.105, -0.012), 0.016);
    linear(V(s * 0.226, 1.02, 0.012), V(s * 0.243, 0.905, 0.012), 0.011); linear(V(s * 0.226, 1.02, -0.014), V(s * 0.243, 0.905, -0.014), 0.011);
    linear(V(s * 0.082, 0.86, -0.022), V(s * 0.092, 0.63, -0.022), 0.017);
    linear(V(s * 0.135, 0.865, 0.012), V(s * 0.116, 0.49, 0.012), 0.022);
    linear(V(s * 0.088, 0.43, -0.012), V(s * 0.097, 0.135, -0.012), 0.013); linear(V(s * 0.124, 0.43, -0.012), V(s * 0.112, 0.135, -0.012), 0.013);
    // Joint axles carry the linear loads.
    add('linear', cyl(0.012, 0.06, 16), M.chrome, V(s * 0.229, 1.088, 0), AXIS.x, 0.04);
    add('linear', cyl(0.016, 0.075, 16), M.chrome, V(s * 0.111, 0.46, 0), AXIS.x, 0.05);
    add('linear', cyl(0.011, 0.06, 16), M.chrome, V(s * 0.104, 0.112, 0), AXIS.x, 0.04);
    add('linear', cyl(0.009, 0.05, 16), M.chrome, V(s * 0.243, 0.895, 0), AXIS.z, 0.04);
  }
  // Hands: six motors, controller, metal tendons to each finger.
  for (const s of [-1, 1]) {
    const hc = V(s * 0.252, 0.84, 0.0);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) add('hands', cyl(0.0065, 0.03, 14), M.copper, hc.clone().add(V(s * (-0.005 + r * 0.012), 0.02, -0.014 + c * 0.014)), null, 0.02);
    add('hands', box(0.01, 0.022, 0.034), M.pcb, hc.clone().add(V(-s * 0.012, -0.012, 0)), null, 0.03);
    for (let f = 0; f < 4; f++) tube('hands', [hc.clone().add(V(0, 0.005, -0.014 + f * 0.0095)), hc.clone().add(V(s * 0.006, -0.05, -0.02 + f * 0.013)), hc.clone().add(V(s * 0.01, -0.105, -0.022 + f * 0.014))], 0.0016, M.tendon);
    tube('hands', [hc.clone().add(V(0, 0.0, 0.016)), hc.clone().add(V(-s * 0.01, -0.03, 0.03)), hc.clone().add(V(-s * 0.016, -0.06, 0.036))], 0.0016, M.tendon);
  }
  // Feet: force/torque sensor plates and the toe hinge.
  for (const s of [-1, 1]) {
    add('feet', box(0.06, 0.012, 0.07), M.pcb, V(s * 0.104, 0.082, 0.01), null, 0.04);
    add('feet', cyl(0.022, 0.014, 24), M.alu, V(s * 0.104, 0.095, 0.01), null, 0.04);
    add('feet', cyl(0.007, 0.075, 12), M.chrome, V(s * 0.104, 0.025, 0.105), AXIS.x, 0.03);
  }
  // Power and data harness from the torso out to the limbs.
  const H = (pts) => tube('harness', pts, 0.0035, M.hv);
  for (const s of [-1, 1]) {
    H([V(0, 1.43, -0.03), V(s * 0.1, 1.42, -0.035), V(s * 0.19, 1.36, -0.03), V(s * 0.215, 1.2, -0.03), V(s * 0.232, 1.06, -0.03), V(s * 0.245, 0.9, -0.025)]);
    H([V(0, 1.03, -0.035), V(s * 0.06, 0.97, -0.04), V(s * 0.1, 0.8, -0.04), V(s * 0.108, 0.5, -0.035), V(s * 0.104, 0.2, -0.03), V(s * 0.104, 0.1, -0.02)]);
  }
  H([V(0, 1.42, -0.04), V(0, 1.25, -0.06), V(0, 1.03, -0.035)]);
  const off = { battery: V(0, 0, 0.16), computer: V(0, 0.06, 0.16), cameras: V(0, 0.15, 0.1), neck: V(0, 0.08, 0), hands: V(0, 0, 0), feet: V(0, 0, 0), rotary: V(0, 0, 0), linear: V(0, 0, 0), harness: V(0, 0, 0), head: V(0, 0.22, 0) };
  Object.entries(off).forEach(([k, v]) => { if (parts[k]) parts[k].off.copy(v); });
}

// Each shell piece moves away from its joint: limbs outward, head up, torso covers forward.
const SHELL_OFF = {
  neck: V(0, 0.12, 0.05), chest: V(0, 0.08, 0.62), waist: V(0, 0, 0.46), pelvis: V(0, -0.04, 0.5),
  upperArmL: V(0.42, 0.06, 0), upperArmR: V(-0.42, 0.06, 0), forearmL: V(0.56, 0, 0.04), forearmR: V(-0.56, 0, 0.04), handL: V(0.68, -0.08, 0.06), handR: V(-0.68, -0.08, 0.06),
  thighL: V(0.26, -0.02, 0.3), thighR: V(-0.26, -0.02, 0.3), shinL: V(0.3, -0.12, 0.26), shinR: V(-0.3, -0.12, 0.26), footL: V(0.32, -0.08, 0.32), footR: V(-0.32, -0.08, 0.32),
};

const status = $('.m3x-status'); status.textContent = 'Loading Optimus…';
const bar = $('.m3x-loadbar');
new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/vendor/three/draco/')).load(MODEL.url, (gltf) => {
  const root = new THREE.Group(); root.add(gltf.scene); root.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(root);
  const k = MODEL.height / b.getSize(new THREE.Vector3()).y; root.scale.setScalar(k); root.updateMatrixWorld(true); b.setFromObject(root);
  const c = b.getCenter(new THREE.Vector3()); root.position.sub(V(c.x, b.min.y, 0)); root.updateMatrixWorld(true);
  const meshes = []; root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  meshes.forEach((o) => {
    const name = (o.name || o.parent?.name || '').replace(/_\d+$/, '');
    const id = name === 'head' ? 'head' : 'shell';
    o.userData.part = id; o.castShadow = o.receiveShadow = true;
    if (o.material) { o.material.envMapIntensity = 0.9; }
    const p = reg(id); p.group.attach(o); p.meshes.push(o);
    if (['neck', 'chest', 'waist', 'pelvis'].includes(name) && o.material) { o.material = o.material.clone(); o.userData.fade = true; }
    o.userData.orig = o.material;
    o.userData.base = o.position.clone(); o.userData.eo = SHELL_OFF[name] ? o.parent.worldToLocal(SHELL_OFF[name].clone()).sub(o.parent.worldToLocal(V(0, 0, 0))) : V(0, 0, 0);
  });
  buildInternals();
  Object.values(parts).forEach((p) => car.add(p.group));
  HIDDEN_UNTIL_EXPLODE.forEach((id) => { const p = parts[id]; if (p) p.group.visible = false; });
  if (/debug/.test(location.search)) window.__ctxDebug = { THREE, parts, car, camera, controls };
  buildList(); app.classList.add('m3x-ready'); notify('sd-optimus-ready'); status.textContent = ''; bar && (bar.style.opacity = 0); kick();
}, (e) => { if (bar && e.total) bar.style.transform = 'scaleX(' + (e.loaded / e.total) + ')'; }, () => fail('Couldn’t load the 3D model, so this is a still image.'));

let ex = 0, exT = 0, exAnim = null; const slider = $('.m3x-slider'), exBtn = $('.m3x-explode');
function syncEx() { slider.value = Math.round(exT * 100); exBtn.textContent = exT > 0.5 ? 'Assemble' : 'Explode'; exBtn.setAttribute('aria-pressed', exT > 0.5); slider.style.setProperty('--p', slider.value + '%'); }
function setExplode(v) {
  exT = v;
  if (reduce) { ex = v; exAnim = null; }
  else exAnim = { from: ex, to: v, start: performance.now(), dur: 1400 };
  syncEx(); kick();
}
slider.addEventListener('input', () => { exT = ex = slider.value / 100; exAnim = null; syncEx(); kick(); });
exBtn.addEventListener('click', () => {
  const v = exT > 0.5 ? 0 : 1;
  setExplode(v);
  idle();
  // Keep the user's orbit. A scripted fly after a drag is what slung the camera off.
  snapOrbit();
});
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function applyExplode() {
  const e = ease(ex);
  Object.values(parts).forEach((p) => { p.group.position.copy(p.off).multiplyScalar(e); if (p.sides) { p.sides[0].position.x = -p.split * e; p.sides[1].position.x = p.split * e; } });
  [...(parts.shell ? parts.shell.meshes : []), ...(parts.head ? parts.head.meshes : [])].forEach((o) => {
    if (o.userData.eo) o.position.copy(o.userData.base).addScaledVector(o.userData.eo, e);
    // Torso covers turn to a translucent ghost as they open, so the pack and computer read from the front.
    if (o.userData.fade && !o.userData.ghost && o.material === o.userData.orig) { const op = 1 - 0.72 * e; o.material.transparent = op < 0.99; o.material.opacity = op; o.material.depthWrite = op > 0.6; }
  });
  const showInside = e > 0.05 || Boolean(selected && HIDDEN_UNTIL_EXPLODE.has(selected)); // three.js only skips visible === false
  HIDDEN_UNTIL_EXPLODE.forEach((id) => {
    const p = parts[id];
    if (!p) return;
    p.group.visible = showInside;
    p.meshes.forEach((o) => { o.visible = showInside; });
  });
}

let selected = null; const card = $('.m3x-card');
['pointerdown', 'pointerup', 'click'].forEach((type) => card.addEventListener(type, (e) => e.stopPropagation()));
const hl = S({ color: RED, emissive: RED, emissiveIntensity: .5, metalness: .4, roughness: .35 });
function setLook(id) { Object.entries(parts).forEach(([pid, p]) => p.meshes.forEach((o) => { o.userData.orig = o.userData.orig || o.material;
  if (!id) { o.material = o.userData.orig; o.userData.ghost = false; return; }
  if (pid === id) { o.material = hl; o.userData.ghost = false; return; }
  if (!o.userData.dim) { const dm = o.userData.orig.clone(); dm.transparent = true; dm.opacity = .06; dm.depthWrite = false; o.userData.dim = dm; } o.material = o.userData.dim; o.userData.ghost = true; })); }
function cardHTML(id) {
  const P0 = PARTS[id], ph = PHOTOS[id], srcs = [P0.src, P0.src2, P0.src3].filter(Boolean);
  const specs = P0.specs || [];
  return '<button class="m3x-x" type="button" aria-label="Close">×</button>' +
    (ph ? '<figure class="m3x-photo"><img src="' + ph.src + '" alt="' + ph.alt + '" loading="lazy" decoding="async"><figcaption>Photo: <a href="' + ph.url + '" target="_blank" rel="noopener">' + ph.by + '</a>, <a href="' + ph.licUrl + '" target="_blank" rel="noopener">' + ph.lic + '</a></figcaption></figure>' : '') +
    '<div class="m3x-cbody"><p class="m3x-var">' + P0.variant + '</p><h2>' + P0.name + '</h2>' +
    '<p class="m3x-desc">' + P0.desc + '</p>' +
    (specs.length ? '<h3>At a glance</h3><dl class="m3x-specs">' + specs.map((row) => '<div><dt>' + row[0] + '</dt><dd>' + row[1] + '</dd></div>').join('') + '</dl>' : '') +
    (P0.how ? '<h3>How it works</h3><p class="m3x-how">' + P0.how + '</p>' : '') +
    (P0.facts.length ? '<h3>Key facts</h3><ul>' + P0.facts.map((f) => '<li>' + f + '</li>').join('') + '</ul>' : '') +
    (srcs.length ? '<p class="m3x-src">Sources: ' + srcs.map((s) => '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.label + '</a>').join(' · ') + '</p>' : '') + '</div>';
}
let restoreView = null;
let ignorePickUntil = 0;
const snapView = () => ({ p: camera.position.clone(), t: controls.target.clone() });
function select(id, opts = {}) {
  const flyIt = opts.fly !== false;
  const snapBack = opts.snapBack !== false;
  if (id && !selected) restoreView = snapView();
  selected = id; setLook(id); app.classList.toggle('m3x-has-card', !!id);
  app.querySelectorAll('.m3x-list button').forEach((b) => b.setAttribute('aria-current', b.dataset.part === id));
  if (!id) {
    ignorePickUntil = performance.now() + 450;
    card.hidden = true; label.hidden = true; frame();
    const back = restoreView;
    restoreView = null;
    if (snapBack) startFly((back && back.p) ? back.p.clone() : homePos(), (back && back.t) ? back.t.clone() : HOME.t.clone());
    idle();
    kick();
    return;
  }
  card.innerHTML = cardHTML(id); card.hidden = false; card.scrollTop = 0;
  card.querySelector('.m3x-x').onclick = (e) => { e.preventDefault(); e.stopPropagation(); select(null); };
  if (HIDDEN_UNTIL_EXPLODE.has(id) && exT < 0.2) setExplode(1);
  label.textContent = PARTS[id].name; label.hidden = false; frame(); if (flyIt) flyTo(id); idle(); kick();
}
function frame() { const w = innerWidth, h = app.clientHeight;
  if (selected && portrait()) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  else if (selected && w > 900) camera.setViewOffset(w, h, -((460 + w - 286) / 2 - w / 2), 0, w, h);
  else camera.clearViewOffset(); camera.updateProjectionMatrix(); }
function partBox(id, atTarget) {
  const saved = ex;
  if (atTarget) ex = Math.max(ex, exT);
  applyExplode(); car.updateMatrixWorld(true);
  const bx = new THREE.Box3();
  const p = parts[id];
  if (p && p.group.visible) p.meshes.forEach((o) => { if (o.visible) bx.expandByObject(o); });
  if (atTarget) { ex = saved; applyExplode(); }
  return bx;
}
let fly = null;
function camRadius() {
  const r = camera.position.distanceTo(controls.target);
  return (isFinite(r) && r > 0.4) ? r : homePos().distanceTo(HOME.t);
}
function orbitOffset(pos, target) {
  const off = pos.clone().sub(target);
  if (!isFinite(off.lengthSq()) || off.lengthSq() < 0.16) off.copy(homePos().sub(HOME.t));
  return off;
}
function poseOnRay(radius, target) {
  const t = target.clone();
  const r = THREE.MathUtils.clamp(radius, controls.minDistance + 0.05, controls.maxDistance - 0.05);
  return { p: t.clone().add(orbitOffset(camera.position, controls.target).setLength(r)), t };
}
function snapOrbit() {
  controls.autoRotate = false;
  controls.state = -1;
  if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0);
  if (controls._panOffset) controls._panOffset.set(0, 0, 0);
  controls._scale = 1;
  camera.lookAt(controls.target);
  controls.update();
}
function dollyAlongView(scale, lift = 0) {
  const t = controls.target.clone();
  t.y += lift;
  return poseOnRay(camRadius() * scale, t);
}
function flyTo(id) { const sd = parts[id] && parts[id].sides; const bx = partBox(id, true), c = bx.getCenter(new THREE.Vector3()), r = bx.getSize(new THREE.Vector3()).length() / 2;
  const dir = orbitOffset(camera.position, controls.target).normalize(); dir.y = Math.max(dir.y, 0.12); dir.normalize();
  const fit = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (portrait() ? 2.4 : 2.1);
  const dist = THREE.MathUtils.clamp(fit, portrait() ? 1.5 : 1.1, 6); if (sd) { const next = dollyAlongView(exT > .5 ? 1.2 : 1, 0); startFly(next.p, next.t); return; }
  if (!isFinite(c.x) || !isFinite(r) || r < 0.01) { const next = dollyAlongView(exT > .5 ? 1.2 : 1, 0); startFly(next.p, next.t); return; }
  startFly(c.clone().add(dir.multiplyScalar(dist)), c); }
function flyK(f) { return !f || f.dur <= 0 ? 1 : Math.min(1, (performance.now() - f.start) / f.dur); }
function shortestTheta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}
function startFly(p, t) {
  if (!p || !t || !isFinite(p.x + p.y + p.z + t.x + t.y + t.z)) return;
  snapOrbit();
  const t1 = t.clone();
  const off1 = orbitOffset(p, t1);
  const r1 = THREE.MathUtils.clamp(off1.length(), controls.minDistance, controls.maxDistance);
  const p1 = t1.clone().add(off1.setLength(r1));
  const s0 = new THREE.Spherical().setFromVector3(orbitOffset(camera.position, controls.target));
  const s1 = new THREE.Spherical().setFromVector3(p1.clone().sub(t1));
  s0.phi = THREE.MathUtils.clamp(s0.phi, controls.minPolarAngle, controls.maxPolarAngle);
  s1.phi = THREE.MathUtils.clamp(s1.phi, controls.minPolarAngle, controls.maxPolarAngle);
  s0.makeSafe(); s1.makeSafe();
  s1.theta = shortestTheta(s0.theta, s1.theta);
  const len = p1.distanceTo(camera.position) + t1.distanceTo(controls.target);
  fly = { t0: controls.target.clone(), t1, s0, s1, p1, start: performance.now(), dur: reduce ? 0 : THREE.MathUtils.clamp(0.55 + len * 0.07, 0.55, 1.35) * 1000 };
  controls.enabled = false;
  kick();
}
function applyFly(k) {
  const e = ease(k);
  const s = new THREE.Spherical(
    THREE.MathUtils.lerp(fly.s0.radius, fly.s1.radius, e),
    THREE.MathUtils.lerp(fly.s0.phi, fly.s1.phi, e),
    THREE.MathUtils.lerp(fly.s0.theta, fly.s1.theta, e)
  );
  s.makeSafe();
  controls.target.lerpVectors(fly.t0, fly.t1, e);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
  camera.lookAt(controls.target);
}
function endFly() {
  if (!fly) return;
  applyFly(1);
  fly = null;
  snapOrbit();
  controls.enabled = true;
}
$('.m3x-reset').addEventListener('click', () => { restoreView = null; select(null, { snapBack: false }); setExplode(0); startFly(homePos(), HOME.t.clone()); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); if (selected) { select(null); return; } notify('sd-optimus-exit'); } });
renderer.domElement.addEventListener('keydown', (e) => {
 if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key)) return;
 e.preventDefault(); idle(); fly = null;
 if (e.key === 'Home') { select(null, {fly:false,snapBack:false}); camera.position.copy(homePos()); controls.target.copy(HOME.t); }
 else { const offset = camera.position.clone().sub(controls.target), sphere = new THREE.Spherical().setFromVector3(offset);
 if (e.key === 'ArrowLeft') sphere.theta -= .12; if (e.key === 'ArrowRight') sphere.theta += .12;
 if (e.key === 'ArrowUp') sphere.phi -= .10; if (e.key === 'ArrowDown') sphere.phi += .10;
 if (e.key === '+' || e.key === '=') sphere.radius *= .88; if (e.key === '-') sphere.radius *= 1.12;
 sphere.radius = THREE.MathUtils.clamp(sphere.radius, controls.minDistance, controls.maxDistance); sphere.phi = THREE.MathUtils.clamp(sphere.phi,controls.minPolarAngle,controls.maxPolarAngle);
 camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere)); }
 controls.update(); kick();
});



const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e) { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObject(car, true).filter((h) => h.object.userData.part && !h.object.userData.ghost && h.object.userData.part !== 'hide' && (h.object.visible || h.object.userData.hit));
  if (!hits.length) return null;
  const real = hits.find((h) => !h.object.userData.hit && !(h.object.material && h.object.material.transparent && h.object.material.opacity < .5));
  const hit = hits.find((h) => h.object.userData.hit);
  if (hit && (!real || hit.distance <= real.distance + 0.05)) return hit.object.userData.part;
  return real ? real.object.userData.part : hits[0].object.userData.part; }
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; idle(); });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return;
  const tap = Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8 && performance.now() - down[2] < 600;
  down = null;
  if (!tap || performance.now() < ignorePickUntil) return;
  const id = pick(e);
  if (id) select(id);
  else if (selected) select(null);
});
const tip = $('.m3x-tip');
renderer.domElement.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || e.buttons) { tip.hidden = true; return; } const id = pick(e);
  if (id) { tip.hidden = false; tip.textContent = PARTS[id].name; tip.style.transform = 'translate(' + (e.clientX + 14) + 'px,' + (e.clientY + 12) + 'px)'; renderer.domElement.style.cursor = 'pointer'; } else { tip.hidden = true; renderer.domElement.style.cursor = 'grab'; } });

function buildList() { const ul = $('.m3x-list'); ul.innerHTML = ORDER.filter((id) => parts[id]).map((id) => '<li><button type="button" data-part="' + id + '"><span class="m3x-dot"></span>' + PARTS[id].name + (PHOTOS[id] ? '<i title="Has photo">◉</i>' : '') + '</button></li>').join('');
  ul.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (portrait() || innerWidth <= 900) closeList(); select(b.dataset.part); })); }
const closeList = () => { app.classList.remove('m3x-list-open'); $('.m3x-parts').setAttribute('aria-expanded', false); };
$('.m3x-parts').addEventListener('click', () => { app.classList.toggle('m3x-list-open'); $('.m3x-parts').setAttribute('aria-expanded', app.classList.contains('m3x-list-open')); });
$('.m3x-close').addEventListener('click', closeList);

let paused = true, last = performance.now(); const pauseBtn = $('.m3x-pause');
function idle() { last = performance.now(); paused = true; syncPause(); }
function syncPause() { pauseBtn.textContent = paused ? 'Rotate' : 'Stop'; pauseBtn.setAttribute('aria-pressed', String(!paused)); }
pauseBtn.addEventListener('click', () => { paused = !paused; syncPause(); kick(); }); syncPause();
controls.addEventListener('start', () => { idle(); if (!fly) return; /* keep a scripted snap/zoom */ }); controls.addEventListener('change', () => kick());

const label = $('.m3x-label');
function placeLabel() { if (!selected) return; const c = partBox(selected).getCenter(new THREE.Vector3()).project(camera); label.style.transform = 'translate(' + ((c.x + 1) / 2 * innerWidth) + 'px,' + ((1 - c.y) / 2 * app.clientHeight) + 'px)'; label.style.opacity = c.z < 1 ? 1 : 0; }

function resize() { const w = innerWidth, h = app.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 50 : 34; frame(); kick(); }
addEventListener('resize', resize); resize(); HOME.p.copy(homePos()); camera.position.copy(HOME.p); controls.target.copy(HOME.t);
var zoomUI = initZoom({ app, camera, controls, kick, cancelFly: () => { fly = null; } });
let parentVisible = true;
const syncVisibility = () => { visible = parentVisible && !document.hidden; if (visible) kick(); else { cancelAnimationFrame(raf); raf = 0; clearTimeout(kickTimer); kickTimer = 0; } };
document.addEventListener('visibilitychange', syncVisibility);
addEventListener('message', (event) => {
 if (event.origin !== location.origin || event.source !== parent) return;
 const msg = event.data;
 if (msg?.type === 'sd-optimus-visible') { parentVisible = Boolean(msg.visible); syncVisibility(); }
 if (msg?.type === 'sd-optimus-select' && Object.hasOwn(PARTS, msg.part) && parts[msg.part]) select(msg.part);
});
function kick() {
  if (!visible) return;
  if (!raf) raf = requestAnimationFrame(tick);
  if ((exAnim || fly) && !kickTimer) kickTimer = setTimeout(() => { kickTimer = 0; if (exAnim || fly) { raf = 0; tick(); } }, 50);
}
function tick() {
  raf = 0; if (!visible) return; const now = performance.now(); let busy = false;
  if (exAnim) {
    const k = Math.min(1, (now - exAnim.start) / exAnim.dur);
    ex = exAnim.from + (exAnim.to - exAnim.from) * k;
    if (k >= 1) { ex = exAnim.to; exAnim = null; }
    busy = true;
  } else ex = exT;
  applyExplode();
  if (fly) {
    const k = flyK(fly);
    applyFly(k);
    if (k >= 1) endFly();
    busy = true;
  }
  else {
    controls.autoRotate = !paused && !selected; controls.autoRotateSpeed = 0.6;
    if (controls.update() || controls.autoRotate) busy = true;
  }
  renderer.render(scene, camera); placeLabel(); zoomUI && zoomUI.sync();
  frames++; if (now - t0 > 1500) { const fps = frames * 1000 / (now - t0); if (fps < 32 && dpr > 1) { dpr = Math.max(1, dpr - 0.4); renderer.setPixelRatio(dpr); resize(); } frames = 0; t0 = now; }
  if (busy) kick();
}

globalThis.__ctx = {
  actuators: () => ({ ...ACT }),
  shell: () => (parts.shell ? parts.shell.meshes.length : 0) + (parts.head ? parts.head.meshes.length : 0),
  selected: () => selected,
  ex: () => ex,
  exT: () => exT,
  face: () => globalThis.__ctxFace,
  vis: () => Object.fromEntries(Object.entries(parts).map(([k, p]) => [k, !!p.group.visible])),
  view: () => ({
    selected,
    x: camera.position.x, y: camera.position.y, z: camera.position.z,
    tx: controls.target.x, ty: controls.target.y, tz: controls.target.z,
    radius: camera.position.distanceTo(controls.target),
    theta: Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z),
    flying: Boolean(fly),
    ex, exT, visible,
  }),
};
