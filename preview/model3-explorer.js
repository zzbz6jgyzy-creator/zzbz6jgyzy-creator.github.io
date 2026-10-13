// Supercharged Daily: full-screen Model 3 explorer. Original code. three.js r170 (MIT).
// Exterior: "Tesla Model 3" by David_Holiday (CC BY 4.0). Internal parts are stylised and modelled procedurally here.
import * as THREE from '/vendor/three/three.module.min.js';
import { OrbitControls } from '/vendor/three/addons/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/addons/GLTFLoader.js';
import { DRACOLoader } from '/vendor/three/addons/DRACOLoader.js';
import { RoomEnvironment } from '/vendor/three/addons/RoomEnvironment.js';
import { PARTS, ORDER } from './model3-parts.js?v=1';

// Swap this config to use a higher-detail exterior later. `classify` maps mesh names to part ids.
const EXTERIOR = {
  url: '/assets/3d/model3.glb?v=1', length: 4.72,
  classify(mesh) { const n = mesh.name, m = (mesh.material && mesh.material.name) || '';
    if (/^cal/.test(n)) return 'brakes'; if (/^wheel/.test(n)) return 'wheels';
    if (/Glass/i.test(n + m)) return 'glass'; if (/^int/.test(n)) return 'cabin'; return 'body'; },
  paint: /CAR.?PAINT/i
};
const RED = 0xe11d2e;
let raf = 0, frames = 0, t0 = performance.now(), visible = true; const clock = new THREE.Clock();
const app = document.querySelector('[data-m3x]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const $ = (s) => app.querySelector(s);
const fail = (msg) => { app.classList.add('m3x-failed'); $('.m3x-status').textContent = msg; };

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' }); if (!renderer.getContext()) throw 0; }
catch (e) { fail('Your browser can’t run 3D here, so this is a still image.'); throw e; }
let dpr = Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2);
renderer.setPixelRatio(dpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('.m3x-canvas').appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060607); scene.fog = new THREE.Fog(0x060607, 14, 30);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75;
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(5, 9, 4); key.castShadow = true;
key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 }); key.shadow.radius = 5; key.shadow.bias = -0.0005;
const rim = new THREE.DirectionalLight(RED, 2.2); rim.position.set(-6, 3, -6);
const warm = new THREE.PointLight(0xffb48a, 16, 14); warm.position.set(-3, 2.5, 4);
scene.add(key, rim, warm, new THREE.HemisphereLight(0x8899ff, 0x110505, 0.35));
const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 1, metalness: 0, envMapIntensity: 0.15 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.63, 160), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .4 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);

const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: true, minDistance: 1.2, maxDistance: 13, minPolarAngle: 0.1, maxPolarAngle: Math.PI / 2 - 0.03, rotateSpeed: coarse ? 0.9 : 0.7, zoomSpeed: 0.8 });
renderer.domElement.style.touchAction = 'none';
const HOME = { p: new THREE.Vector3(5.6, 2.6, 6.2), t: new THREE.Vector3(0, 0.75, 0) };


// ---------- part registry ----------
const parts = {}; // id -> { meshes:[], hits:[], off: Vector3, center: Vector3 }
const reg = (id) => (parts[id] = parts[id] || { meshes: [], hits: [], group: new THREE.Group(), off: new THREE.Vector3() });
const car = new THREE.Group(); scene.add(car);
const M = {
  alu: new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .9, roughness: .35 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b1c20, metalness: .5, roughness: .5 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: .1, roughness: .8 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb8733a, metalness: .9, roughness: .35 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe8701a, metalness: .2, roughness: .5 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x1f4f8f, metalness: .2, roughness: .6, envMapIntensity: .5 }),
  spring: new THREE.MeshStandardMaterial({ color: 0xc8c8cc, metalness: .8, roughness: .3 }),
  disc: new THREE.MeshStandardMaterial({ color: 0x6d6f74, metalness: .95, roughness: .3 }),
  glassLens: new THREE.MeshPhysicalMaterial({ color: 0x111827, metalness: .3, roughness: .05, clearcoat: 1 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x0b0d12, emissive: 0x1d3c7a, emissiveIntensity: .7, roughness: .2 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: .7 }),
  hvac: new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: .3, roughness: .6 })
};
function add(id, geo, mat, pos, rot, hitMin = 0.28) {
  const p = reg(id); const m = new THREE.Mesh(geo, mat); m.position.copy(pos); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = m.receiveShadow = true; m.userData.part = id; p.group.add(m); p.meshes.push(m);
  // invisible enlarged hit volume for small parts
  geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3());
  const hs = new THREE.Vector3(Math.max(s.x, hitMin), Math.max(s.y, hitMin), Math.max(s.z, hitMin));
  const hit = new THREE.Mesh(new THREE.BoxGeometry(hs.x, hs.y, hs.z), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.copy(pos); if (rot) hit.rotation.copy(m.rotation); hit.userData.part = id; hit.userData.hit = true; p.group.add(hit); p.hits.push(hit);
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r, l, seg = 32) => new THREE.CylinderGeometry(r, r, l, seg);

function buildInternals(d) {
  const { zf, zr, tw, R, front, rear, W, H } = d; const wb = zf - zr, mid = (zf + zr) / 2;
  // Battery pack under floor + module hint lines
  const bl = wb - 0.55, bw = 2 * tw - 0.42;
  add('battery', box(bw, 0.12, bl), M.dark, V(0, 0.2, mid + 0.05));
  for (let i = 0; i < 4; i++) add('battery', box(bw * 0.2, 0.03, bl - 0.1), M.blue, V(-bw * 0.36 + i * bw * 0.24, 0.275, mid + 0.05));
  // Rear drive unit: motor + gearbox, inverter on top
  add('rearMotor', cyl(0.14, 0.36), M.alu, V(-0.12, R, zr + 0.02), [0, 0, Math.PI / 2]);
  add('rearMotor', box(0.26, 0.3, 0.3), M.alu, V(0.16, R, zr + 0.02));
  add('rearMotor', cyl(0.035, 2 * tw - 0.3, 16), M.dark, V(0, R, zr), [0, 0, Math.PI / 2], 0.1);
  add('inverter', box(0.34, 0.08, 0.22), M.orange, V(-0.08, R + 0.19, zr + 0.06));
  // Front drive unit (Dual Motor)
  add('frontMotor', cyl(0.12, 0.3), M.alu, V(0.1, R, zf - 0.02), [0, 0, Math.PI / 2]);
  add('frontMotor', box(0.22, 0.26, 0.26), M.alu, V(-0.14, R, zf - 0.02));
  add('frontMotor', cyl(0.032, 2 * tw - 0.3, 16), M.dark, V(0, R, zf), [0, 0, Math.PI / 2], 0.1);
  add('inverter', box(0.26, 0.07, 0.18), M.orange, V(0.08, R + 0.16, zf - 0.02));
  // Heat pump / Octovalve (front, by the 12V battery)
  add('heatpump', box(0.2, 0.16, 0.14), M.hvac, V(0.28, R + 0.36, zf + 0.12));
  add('heatpump', cyl(0.06, 0.05), M.blue, V(0.28, R + 0.47, zf + 0.12));
  add('lv', box(0.2, 0.14, 0.12), M.black, V(-0.26, R + 0.34, zf + 0.14));
  add('lv', box(0.04, 0.02, 0.04), M.copper, V(-0.31, R + 0.42, zf + 0.14), null, 0.1);
  // Suspension
  for (const sx of [-1, 1]) {
    const x0 = sx * (tw - 0.55), x1 = sx * (tw - 0.14);
    for (const [dy, len] of [[-0.12, 0.42], [0.2, 0.32]]) add('suspFront', box(Math.abs(x1 - x0), 0.035, 0.24), M.dark, V((x0 + x1) / 2, R + dy, zf), null, 0.18);
    add('suspFront', new THREE.TorusKnotGeometry(0.05, 0.012, 64, 6, 6, 1), M.spring, V(sx * (tw - 0.35), R + 0.25, zf - 0.04), [Math.PI / 2, 0, 0], 0.18);
    add('suspFront', cyl(0.025, 0.42, 12), M.spring, V(sx * (tw - 0.35), R + 0.2, zf - 0.04), null, 0.18);
    for (const [dy, dz] of [[-0.1, 0.12], [-0.1, -0.12], [0.18, 0.06], [0.18, -0.1]]) add('suspRear', box(Math.abs(x1 - x0), 0.03, 0.04), M.dark, V((x0 + x1) / 2, R + dy, zr + dz), null, 0.15);
    add('suspRear', new THREE.TorusKnotGeometry(0.055, 0.012, 64, 6, 6, 1), M.spring, V(sx * (tw - 0.38), R + 0.2, zr - 0.05), [Math.PI / 2, 0, 0], 0.18);
    // brake discs (calipers come from the model)
    for (const z of [zf, zr]) add('brakes', cyl(R * 0.62, 0.03), M.disc, V(sx * (tw - 0.2), R, z), [0, 0, Math.PI / 2], 0.2);
  }
  // Charge port: left rear tail light (driver's left = +x when front is +z? car's left is +x here)
  add('chargePort', box(0.03, 0.08, 0.09), M.black, V(W / 2 - 0.06, H * 0.62, rear + 0.18), null, 0.25);
  add('chargePort', box(0.035, 0.04, 0.04), M.blue, V(W / 2 - 0.05, H * 0.62, rear + 0.18), null, 0.25);
  // Cameras
  const cam = (pos) => add('cameras', new THREE.SphereGeometry(0.03, 16, 12), M.glassLens, pos, null, 0.22);
  cam(V(0, H * 0.83, zf - 0.93)); cam(V(0.06, H * 0.83, zf - 0.93));
  for (const sx of [-1, 1]) { cam(V(sx * W * 0.47, H * 0.7, mid + 0.25)); cam(V(sx * W * 0.495, R * 1.55, zf - 0.32)); }
  cam(V(0, H * 0.52, rear + 0.05));
  // HVAC under dash
  add('hvac', box(0.7, 0.24, 0.3), M.hvac, V(0, R + 0.38, zf - 0.72));
  add('hvac', cyl(0.1, 0.12), M.dark, V(0.28, R + 0.38, zf - 0.72), [0, 0, Math.PI / 2]);
  // Seats + displays
  for (const sx of [-1, 1]) { add('cabin', box(0.5, 0.14, 0.5), M.seat, V(sx * 0.38, 0.5, mid + 0.15)); add('cabin', box(0.48, 0.62, 0.12), M.seat, V(sx * 0.38, 0.84, mid - 0.12), [-0.2, 0, 0]); }
  add('cabin', box(1.25, 0.14, 0.48), M.seat, V(0, 0.52, zr + 0.55)); add('cabin', box(1.25, 0.56, 0.12), M.seat, V(0, 0.82, zr + 0.3), [-0.25, 0, 0]);
  add('display', box(0.39, 0.25, 0.02), M.screen, V(0, H * 0.66, zf - 0.98), [-0.25, 0, 0], 0.3);
  add('display', box(0.18, 0.11, 0.02), M.screen, V(0, 0.62, mid - 0.32), [0.3, Math.PI, 0], 0.25);
  // Explode offsets (multi-level)
  const off = {
    body: V(0, 1.7, 0), glass: V(0, 2.5, 0), cameras: V(0, 1.7, 0), cabin: V(0, 0.95, 0), display: V(0, 1.15, 0), hvac: V(0, 1.0, 0.35),
    battery: V(0, -0.05, 0), rearMotor: V(0, 0.15, -0.95), frontMotor: V(0, 0.15, 0.9), inverter: V(0, 0.55, 0), heatpump: V(0.35, 0.75, 0.75), lv: V(-0.35, 0.75, 0.75),
    chargePort: V(0.7, 1.5, -0.3), wheels: null, brakes: null, suspFront: null, suspRear: null
  };
  Object.entries(off).forEach(([k, v]) => { if (v && parts[k]) parts[k].off.copy(v); });
}

// ---------- load exterior ----------
const draco = new DRACOLoader().setDecoderPath('/vendor/three/draco/');
const status = $('.m3x-status'); status.textContent = 'Loading Model 3…';
new GLTFLoader().setDRACOLoader(draco).load(EXTERIOR.url, (gltf) => {
  const m = gltf.scene; const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3());
  const k = EXTERIOR.length / Math.max(s.x, s.z); m.scale.setScalar(k); b.setFromObject(m); const c = b.getCenter(new THREE.Vector3());
  m.position.sub(V(c.x, b.min.y, c.z)); m.updateMatrixWorld(true); b.setFromObject(m);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x9a0a18, metalness: .25, roughness: .35, clearcoat: 1, clearcoatRoughness: .04 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x05070a, metalness: .2, roughness: .02, transparent: true, opacity: .82, clearcoat: 1 });
  const meshes = []; m.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const wheelBoxes = {};
  meshes.forEach((o) => {
    o.castShadow = o.receiveShadow = true; const id = EXTERIOR.classify(o), mn = (o.material && o.material.name) || '';
    const om = o.material, col = om.color ? om.color.clone() : new THREE.Color(0x111111), lum = col.r + col.g + col.b;
    if (EXTERIOR.paint.test(mn)) o.material = paint; else if (id === 'glass') o.material = glass;
    else if (id === 'brakes') o.material = new THREE.MeshStandardMaterial({ color: RED, metalness: .3, roughness: .4 });
    else if (id === 'wheels') o.material = lum > 1 ? new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, metalness: .75, roughness: .28, clearcoat: .6 }) : new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: .92 });
    else if (/chrome/i.test(mn)) o.material = new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 1, roughness: .18 });
    else if (/LED|PHARE/i.test(o.name)) o.material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdde6ff, emissiveIntensity: 1.5 });
    else { o.material = om.clone(); o.material.roughness = Math.min(om.roughness, .55); }
    o.material.side = THREE.DoubleSide; o.userData.part = id;
    if (id === 'wheels') { const key = (o.parent && o.parent.name) || o.name; const wb = new THREE.Box3().setFromObject(o); wheelBoxes[key] = wheelBoxes[key] ? wheelBoxes[key].union(wb) : wb; }
  });
  // measure layout from the wheels
  const centers = Object.values(wheelBoxes).map((bx) => ({ c: bx.getCenter(new THREE.Vector3()), r: bx.getSize(new THREE.Vector3()).y / 2 }));
  const zs = centers.map((w) => w.c.z), xs = centers.map((w) => Math.abs(w.c.x));
  const d = { zf: Math.max(...zs), zr: Math.min(...zs), tw: xs.reduce((a, v) => a + v, 0) / xs.length, R: centers.reduce((a, w) => a + w.r, 0) / centers.length, front: b.max.z, rear: b.min.z, W: b.max.x - b.min.x, H: b.max.y };
  if (!isFinite(d.zf) || centers.length < 4) { d.zf = 1.4; d.zr = -1.45; d.tw = 0.8; d.R = 0.34; }
  // move exterior meshes into part groups (keeping world transforms)
  meshes.forEach((o) => { const p = reg(o.userData.part); p.group.attach(o); p.meshes.push(o); });
  buildInternals(d);
  // wheels/brakes/suspension move outward per side
  ['wheels', 'brakes', 'suspFront', 'suspRear'].forEach((id) => { const p = parts[id]; if (!p) return; p.split = { wheels: 0.95, brakes: 0.8, suspFront: 0.45, suspRear: 0.45 }[id]; });
  Object.values(parts).forEach((p) => { car.add(p.group); p.box = new THREE.Box3().setFromObject(p.group); });
  // per-side splitting: put each mesh/hit in a side subgroup
  Object.entries(parts).forEach(([id, p]) => { if (!p.split) return; const L = new THREE.Group(), Rg = new THREE.Group(); p.group.add(L, Rg);
    [...p.meshes, ...p.hits].forEach((o) => { const wp = o.getWorldPosition(new THREE.Vector3()); (wp.x < 0 ? L : Rg).attach(o); }); p.sides = [L, Rg]; });
  buildList(); app.classList.add('m3x-ready'); status.textContent = ''; setExplode(reduce ? 0 : 0); kick();
}, undefined, () => fail('Couldn’t load the 3D model, so this is a still image.'));

// ---------- explode ----------
let ex = 0, exT = 0;
const slider = $('.m3x-slider');
function setExplode(v) { exT = v; slider.value = Math.round(v * 100); $('.m3x-explode').setAttribute('aria-pressed', v > 0.5); $('.m3x-explode').textContent = v > 0.5 ? 'Assemble' : 'Explode'; if (reduce) ex = v; kick(); }
slider.addEventListener('input', () => { exT = slider.value / 100; ex = exT; kick(); $('.m3x-explode').textContent = exT > 0.5 ? 'Assemble' : 'Explode'; });
$('.m3x-explode').addEventListener('click', () => setExplode(exT > 0.5 ? 0 : 1));
function applyExplode() {
  const e = ex * ex * (3 - 2 * ex);
  Object.values(parts).forEach((p) => { p.group.position.copy(p.off).multiplyScalar(e); if (p.sides) { p.sides[0].position.x = -p.split * e; p.sides[1].position.x = p.split * e; } });
}

// ---------- selection ----------
let selected = null; const card = $('.m3x-card');
const highlight = new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: .55, metalness: .3, roughness: .4 });
function setLook(id) {
  Object.entries(parts).forEach(([pid, p]) => p.meshes.forEach((o) => {
    if (!o.userData.orig) o.userData.orig = o.material;
    if (!id) { o.material = o.userData.orig; o.userData.ghost = false; return; }
    if (pid === id) { o.material = highlight; o.userData.ghost = false; }
    else { if (!o.userData.dim) { o.userData.dim = o.userData.orig.clone(); o.userData.dim.transparent = true; o.userData.dim.opacity = .07; o.userData.dim.depthWrite = false; } o.material = o.userData.dim; o.userData.ghost = true; }
  }));
}
function select(id, fly = true) {
  selected = id; setLook(id);
  app.querySelectorAll('.m3x-list button').forEach((b) => b.setAttribute('aria-current', b.dataset.part === id));
  if (!id) { card.hidden = true; $('.m3x-label').hidden = true; offsetView(); return; }
  const P = PARTS[id]; const srcs = [P.src, P.src2].filter(Boolean);
  card.innerHTML = '<button class="m3x-x" type="button" aria-label="Close">×</button><p class="m3x-var">' + P.variant + '</p><h2>' + P.name + '</h2><p>' + P.desc + '</p><ul>' + P.facts.map((f) => '<li>' + f + '</li>').join('') + '</ul><p class="m3x-src">Source: ' + srcs.map((s) => '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.label + '</a>').join(' · ') + '</p>';
  card.hidden = false; card.querySelector('.m3x-x').onclick = () => select(null);
  $('.m3x-label').textContent = P.name; $('.m3x-label').hidden = false;
  offsetView(); if (fly) flyTo(id); idle(); kick();
}
function partCenter(id) { applyExplode(); car.updateMatrixWorld(true); const bx = new THREE.Box3(); parts[id].meshes.forEach((o) => bx.expandByObject(o)); return { c: bx.getCenter(new THREE.Vector3()), r: bx.getSize(new THREE.Vector3()).length() / 2 }; }
let fly = null;
function flyTo(id) {
  const { c, r } = partCenter(id); const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.45) dir.y = 0.55; dir.normalize();
  const dist = Math.min(7, Math.max(camera.aspect < 1 ? 3.4 : 1.8, r * (camera.aspect < 1 ? 4.5 : 2.8)));
  startFly(c.clone().add(dir.multiplyScalar(dist)), c);
}
function startFly(p, t) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, k: reduce ? 1 : 0 }; kick(); }
$('.m3x-reset').addEventListener('click', () => { select(null); setExplode(0); startFly(HOME.p.clone(), HOME.t.clone()); });

// picking
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObject(car, true).filter((h) => h.object.userData.part && !h.object.userData.ghost);
  if (!hits.length) return null;
  // prefer real surfaces in front; small hidden parts win if their hit volume is the first thing after a ghosted/glass layer
  const first = hits[0]; if (first.object.userData.hit) return first.object.userData.part;
  const realFirst = hits.find((h) => !h.object.userData.hit);
  return realFirst ? realFirst.object.userData.part : first.object.userData.part;
}
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; idle(); });
renderer.domElement.addEventListener('pointerup', (e) => { if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); if (moved < 8 && performance.now() - down[2] < 600) { const id = pick(e); select(id || null, !!id); } down = null; });
const tip = $('.m3x-tip');
renderer.domElement.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || e.buttons) { tip.hidden = true; return; } const id = pick(e); if (id) { tip.hidden = false; tip.textContent = PARTS[id].name; tip.style.transform = 'translate(' + (e.clientX + 14) + 'px,' + (e.clientY + 12) + 'px)'; renderer.domElement.style.cursor = 'pointer'; } else { tip.hidden = true; renderer.domElement.style.cursor = 'grab'; } });

// parts list
function buildList() {
  const ul = $('.m3x-list'); ul.innerHTML = ORDER.filter((id) => parts[id]).map((id) => '<li><button type="button" data-part="' + id + '">' + PARTS[id].name + '</button></li>').join('');
  ul.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (coarse) app.classList.remove('m3x-list-open'); select(b.dataset.part); }));
}
$('.m3x-parts').addEventListener('click', () => { app.classList.toggle('m3x-list-open'); $('.m3x-parts').setAttribute('aria-expanded', app.classList.contains('m3x-list-open')); });

// pause / idle auto-rotate
let paused = reduce, last = performance.now();
const pauseBtn = $('.m3x-pause');
function idle() { last = performance.now(); }
function syncPause() { pauseBtn.textContent = paused ? 'Play' : 'Pause'; pauseBtn.setAttribute('aria-pressed', paused); }
pauseBtn.addEventListener('click', () => { paused = !paused; syncPause(); kick(); }); syncPause();
controls.addEventListener('start', () => { idle(); fly = null; });
controls.addEventListener('change', () => kick());

// label anchored to selected part
const label = $('.m3x-label');
function placeLabel() { if (!selected) return; const { c } = partCenterCached(); const v = c.clone().project(camera); const r = renderer.domElement.getBoundingClientRect(); label.style.transform = 'translate(' + ((v.x + 1) / 2 * r.width) + 'px,' + ((1 - v.y) / 2 * r.height) + 'px)'; label.style.opacity = v.z < 1 ? 1 : 0; }
function partCenterCached() { const bx = new THREE.Box3(); parts[selected].meshes.forEach((o) => bx.expandByObject(o)); return { c: bx.getCenter(new THREE.Vector3()) }; }

// sizing, visibility, adaptive quality
function resize() { const w = innerWidth, h = app.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 52 : 35; HOME.p.set(5.6, 2.6, 6.2).multiplyScalar(w < h ? 1.45 : 1); offsetView(); kick(); }
function offsetView() { const w = innerWidth, h = app.clientHeight; if (selected && w < h) camera.setViewOffset(w, h, 0, h * 0.2, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); camera.position.copy(HOME.p); controls.target.copy(HOME.t);
document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });

function kick() { if (!raf && visible) raf = requestAnimationFrame(tick); }
function tick() {
  raf = 0; const dt = Math.min(clock.getDelta(), 0.05), now = performance.now(); let busy = false;
  if (Math.abs(exT - ex) > 0.001) { ex += (exT - ex) * Math.min(1, dt * 3.2); busy = true; } else ex = exT;
  applyExplode();
  if (fly) { fly.k = Math.min(1, fly.k + dt / 1.2); const k = 1 - Math.pow(1 - fly.k, 3); camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k); if (fly.k >= 1) fly = null; busy = true; }
  controls.autoRotate = !paused && !selected && now - last > 6500; controls.autoRotateSpeed = 0.5;
  if (controls.update() || controls.autoRotate) busy = true;
  renderer.render(scene, camera); placeLabel();
  frames++; if (now - t0 > 1500) { const fps = frames * 1000 / (now - t0); if (fps < 35 && dpr > 1) { dpr = Math.max(1, dpr - 0.4); renderer.setPixelRatio(dpr); resize(); } frames = 0; t0 = now; }
  if (busy) kick();
}
$('.m3x-close').addEventListener('click', () => { app.classList.remove('m3x-list-open'); $('.m3x-parts').setAttribute('aria-expanded', false); });
