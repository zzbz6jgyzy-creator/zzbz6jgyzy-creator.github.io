// Supercharged Daily: full-screen Cybertruck explorer. Original code. three.js r170 (MIT).
// Exterior: "Tesla Cybertruck" by Sketcher (CC BY 4.0). Internal parts are illustrative, modelled here.
import * as THREE from '/vendor/three/three.module.min.js';
import { OrbitControls } from '/vendor/three/addons/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/addons/GLTFLoader.js';
import { DRACOLoader } from '/vendor/three/addons/DRACOLoader.js';
import { RoomEnvironment } from '/vendor/three/addons/RoomEnvironment.js';
import { PARTS, ORDER, PHOTOS } from './cybertruck-parts.js?v=1';

const EXTERIOR = {
  url: '/assets/3d/cybertruck.glb?v=2',
  length: 5.682,
  classify(o) {
    const n = ((o.name || '') + ' ' + ((o.material && o.material.name) || '')).toLowerCase();
    if (n.includes('glass')) return 'glass';
    if (n.includes('wheel')) return 'wheels';
    if (n.includes('light')) return 'lights';
    if (n.includes('cabin')) return 'cabin';
    return 'body';
  },
  // Cabin sits in the front half. Lights are a weak probe: the same mesh
  // includes the tail bar, so its bbox centre can sit on the rear.
  frontProbe: (o) => /cabin/i.test(o.name || '') || /cabin/i.test((o.material && o.material.name) || ''),
};
const RED = 0xe11d2e;
let raf = 0, kickTimer = 0, frames = 0, t0 = performance.now(), visible = true;
const app = document.querySelector('[data-m3x]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const $ = (s) => app.querySelector(s);
const fail = (msg) => { app.classList.add('m3x-failed'); $('.m3x-status').textContent = msg; };
const portrait = () => innerWidth < innerHeight;

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); if (!renderer.getContext()) throw 0; }
catch (e) { fail('Your browser can’t run 3D here, so this is a still image.'); throw e; }
let dpr = Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2);
renderer.setPixelRatio(dpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('.m3x-canvas').appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050506); scene.fog = new THREE.Fog(0x050506, 16, 38);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 1.05;
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 90);
const key = new THREE.DirectionalLight(0xffffff, 2.15); key.position.set(5, 10, 6); key.castShadow = true;
key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); key.shadow.radius = 8; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
const rim = new THREE.DirectionalLight(0xff5a66, 1.15); rim.position.set(-7, 0.6, -7);
const fill = new THREE.DirectionalLight(0xbfd2ff, 0.55); fill.position.set(-6, 4, 7);
scene.add(key, rim, fill, new THREE.HemisphereLight(0x9aa8ff, 0x100404, 0.25));
const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 96), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 1, metalness: 0, envMapIntensity: 0.1 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const contact = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 8.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.003; scene.add(m); return m; })();
const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 4.52, 180), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .45 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; scene.add(ring);
const grid = new THREE.PolarGridHelper(10, 16, 6, 96, 0x2a0a0e, 0x1a0b0d); grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, enablePan: false, enableZoom: true, minDistance: 2.2, maxDistance: 18, minPolarAngle: 0.12, maxPolarAngle: Math.PI / 2 - 0.04, rotateSpeed: coarse ? 0.85 : 0.65, zoomSpeed: 0.7 });
renderer.domElement.style.touchAction = 'none';
const HOME = { p: new THREE.Vector3(), t: new THREE.Vector3(0, 0.85, 0) };
const homePos = () => new THREE.Vector3(7.2, 2.8, 8.0).multiplyScalar(portrait() ? 1.55 : 1);

const parts = {};
const reg = (id) => (parts[id] = parts[id] || { meshes: [], hits: [], group: new THREE.Group(), off: new THREE.Vector3() });
const car = new THREE.Group(); scene.add(car);
const S = (o) => new THREE.MeshStandardMaterial(o), P = (o) => new THREE.MeshPhysicalMaterial(o);
const M = {
  alu: S({ color: 0xa4a9b0, metalness: .95, roughness: .32 }), aluDark: S({ color: 0x5d6168, metalness: .9, roughness: .4 }),
  cast: S({ color: 0x8a8d92, metalness: .8, roughness: .55 }), steel: S({ color: 0x2b2d31, metalness: .7, roughness: .45 }),
  black: S({ color: 0x0d0d0f, roughness: .85 }), rubber: S({ color: 0x111112, roughness: .95 }),
  copper: S({ color: 0xc27a3e, metalness: .95, roughness: .3 }), hv: S({ color: 0xff6a00, roughness: .55 }),
  cell: S({ color: 0x1e3f6e, metalness: .4, roughness: .45 }), cellTop: S({ color: 0xb9c0c8, metalness: .9, roughness: .3 }),
  cool: S({ color: 0x3f6f8f, metalness: .8, roughness: .35 }), spring: S({ color: 0xd9dadd, metalness: .85, roughness: .25 }),
  disc: S({ color: 0x777a80, metalness: .95, roughness: .28 }), lens: P({ color: 0x0b0f18, metalness: .2, roughness: .05, clearcoat: 1 }),
  hvac: S({ color: 0x34373d, metalness: .3, roughness: .6 }), blue: S({ color: 0x2a5d9b, roughness: .5 }), red: S({ color: RED, roughness: .45 }),
  stainless: P({ color: 0xb7bbc0, metalness: .96, roughness: .18, clearcoat: .28, clearcoatRoughness: .22, envMapIntensity: 1.15 }),
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function addMesh(id, m, hitMin = 0.26) {
  const p = reg(id); m.castShadow = m.receiveShadow = true; m.userData.part = id; p.group.add(m); p.meshes.push(m);
  m.updateMatrix(); const bb = new THREE.Box3(); if (m.geometry) { m.geometry.computeBoundingBox(); bb.copy(m.geometry.boundingBox); if (m.isInstancedMesh) { m.computeBoundingBox(); bb.copy(m.boundingBox); } }
  const s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(s.x, hitMin), Math.max(s.y, hitMin), Math.max(s.z, hitMin)), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.copy(c).applyMatrix4(m.matrix); hit.quaternion.copy(m.quaternion); hit.userData = { part: id, hit: true }; p.group.add(hit); p.hits.push(hit); return m;
}
function add(id, geo, mat, pos, rot, hitMin) { const m = new THREE.Mesh(geo, mat); m.position.copy(pos); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); return addMesh(id, m, hitMin); }
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (r, l, s = 32, r2) => new THREE.CylinderGeometry(r, r2 ?? r, l, s);
const X90 = [0, 0, Math.PI / 2];
function inst(id, geo, mat, list) { const im = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D(); list.forEach((p, i) => { o.position.copy(p); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); return addMesh(id, im); }
function coil(r, h, turns, tube) { const pts = []; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(V(Math.cos(a) * r, -h / 2 + h * i / (turns * 24), Math.sin(a) * r)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, tube, 6, false); }
function arm(id, a, b, t = 0.03, mat = M.steel) { const d = b.clone().sub(a), m = new THREE.Mesh(cyl(t, d.length(), 10), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return addMesh(id, m, 0.16); }

function driveUnit(id, x, y, z, s, flip) {
  const dir = flip ? -1 : 1;
  add(id, cyl(0.16 * s, 0.38 * s, 40), M.cast, V(x - 0.12 * s * dir, y, z), X90);
  for (let i = -2; i <= 2; i++) add(id, new THREE.TorusGeometry(0.162 * s, 0.008, 6, 40), M.aluDark, V(x - 0.12 * s * dir + i * 0.06 * s, y, z), [0, Math.PI / 2, 0], 0.1);
  add(id, cyl(0.12 * s, 0.03, 32), M.alu, V(x - 0.32 * s * dir, y, z), X90, 0.1);
  add(id, new THREE.BoxGeometry(0.26 * s, 0.36 * s, 0.34 * s), M.cast, V(x + 0.14 * s * dir, y - 0.01, z + 0.02));
  add(id, cyl(0.075 * s, 0.26 * s, 24), M.cast, V(x + 0.14 * s * dir, y + 0.1 * s, z - 0.1 * s), X90, 0.1);
}
function inverter(x, y, z, s) {
  add('inverter', box(0.36 * s, 0.075, 0.26 * s), M.aluDark, V(x, y, z));
  const fins = []; for (let i = 0; i < 10; i++) fins.push(V(x - 0.16 * s + i * 0.035 * s, y + 0.058, z)); inst('inverter', box(0.006, 0.042, 0.24 * s), M.alu, fins);
  add('inverter', box(0.06, 0.05, 0.05), M.hv, V(x + 0.2 * s, y, z), null, 0.12);
}

function buildInternals(d) {
  const { zf, zr, tw, R, rear, W, H, front } = d; const wb = zf - zr, mid = (zf + zr) / 2;
  const bl = wb - 0.55, bw = 2 * tw - 0.7, by = 0.22;
  add('battery', box(bw + 0.05, 0.055, bl + 0.05), M.aluDark, V(0, by, mid));
  add('battery', box(bw - 0.04, 0.014, bl - 0.08), M.cool, V(0, by + 0.034, mid));
  const rowW = (bw - 0.12) / 4, cells = [];
  for (let r = 0; r < 4; r++) { const x = -bw / 2 + 0.06 + rowW * (r + .5);
    add('battery', box(rowW - 0.03, 0.1, bl - 0.14), M.cell, V(x, by + 0.09, mid));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 26; j++) cells.push(V(x - rowW * 0.33 + i * rowW * 0.22, by + 0.145, mid - (bl - 0.22) / 2 + j * (bl - 0.22) / 25)); }
  inst('battery', cyl(0.016, 0.006, 10), M.cellTop, cells);
  add('battery', box(0.16, 0.09, 0.09), M.hv, V(0, by + 0.07, mid - bl / 2 - 0.03), null, 0.15);
  driveUnit('rearMotor', 0, R + 0.04, zr + 0.08, 1.02, false); inverter(-0.1, R + 0.26, zr + 0.08, 1.02);
  driveUnit('frontMotor', 0, R, zf - 0.04, 0.92, true); inverter(0.08, R + 0.2, zf - 0.04, 0.92);
  for (const z of [zr, zf]) add(z === zr ? 'rearMotor' : 'frontMotor', cyl(0.034, 2 * tw - 0.36, 12), M.steel, V(0, R, z), X90, 0.08);
  const cable = (a, b) => { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(b, .5).add(V(0, -0.06, 0)), b]), 20, 0.016, 8); return addMesh('battery', new THREE.Mesh(g, M.hv), 0.08); };
  cable(V(0, by + 0.07, mid - bl / 2 - 0.06), V(-0.1, R + 0.26, zr + 0.2)); cable(V(0.06, by + 0.07, mid + bl / 2), V(0.08, R + 0.2, zf - 0.18));
  // 48V MV battery + heat-pump block in the frunk bay
  add('lv', box(0.22, 0.14, 0.13), M.black, V(-0.28, R + 0.28, zf + 0.18));
  add('lv', cyl(0.014, 0.022, 8), M.red, V(-0.34, R + 0.36, zf + 0.18), null, 0.08);
  add('lv', cyl(0.014, 0.022, 8), M.steel, V(-0.22, R + 0.36, zf + 0.18), null, 0.08);
  const hp = V(0.28, R + 0.26, zf + 0.16);
  add('hvac', box(0.24, 0.17, 0.14), M.hvac, hp); add('hvac', cyl(0.06, 0.07, 24), M.blue, hp.clone().add(V(0, 0.12, 0)));
  add('hvac', box(0.7, 0.24, 0.3), M.hvac, V(0, R + 0.48, zf - 0.95));
  add('hvac', cyl(0.11, 0.14, 24), M.aluDark, V(0.28, R + 0.48, zf - 0.95), X90);
  // steer-by-wire rack + rear actuators
  add('steer', cyl(0.028, 2 * tw - 0.7, 12), M.alu, V(0, R + 0.08, zf + 0.18), X90, 0.16);
  add('steer', box(0.16, 0.1, 0.12), M.cast, V(0, R + 0.12, zf + 0.18), null, 0.2);
  for (const sx of [-1, 1]) add('steer', box(0.1, 0.08, 0.14), M.aluDark, V(sx * (tw - 0.28), R + 0.06, zr), null, 0.18);
  // vault tonneau + underfloor bin
  const vaultZ = (zr + rear) / 2 - 0.05;
  add('vault', box(bw + 0.15, 0.045, Math.max(1.55, zr - rear - 0.15)), M.stainless, V(0, H * 0.72, vaultZ));
  add('vault', box(bw - 0.1, 0.16, Math.max(1.2, zr - rear - 0.45)), M.black, V(0, H * 0.58, vaultZ));
  add('vault', box(0.55, 0.08, 0.7), M.aluDark, V(0, by + 0.12, vaultZ), null, 0.2);
  // frunk tub
  add('frunk', box(0.72, 0.16, 0.55), M.black, V(0, R + 0.42, front - 0.55));
  add('frunk', box(0.68, 0.02, 0.5), M.stainless, V(0, R + 0.51, front - 0.55), null, 0.18);
  // air springs (Premium / Beast) + control arms
  for (const sx of [-1, 1]) {
    const hubF = V(sx * (tw - 0.18), R, zf), inF = sx * (tw - 0.62);
    arm('susp', V(inF, R - 0.12, zf + 0.18), hubF.clone().add(V(0, -0.12, 0))); arm('susp', V(inF, R - 0.12, zf - 0.18), hubF.clone().add(V(0, -0.12, 0)));
    arm('susp', V(inF + sx * 0.12, R + 0.22, zf + 0.12), hubF.clone().add(V(0, 0.18, 0)), 0.028);
    add('susp', box(0.055, 0.32, 0.08), M.cast, hubF.clone().add(V(-sx * 0.02, 0.03, 0)), null, 0.15);
    add('susp', cyl(0.07, 0.16, 18), M.black, V(sx * (tw - 0.4), R + 0.28, zf), null, 0.18);
    add('susp', cyl(0.055, 0.1, 16), M.alu, V(sx * (tw - 0.4), R + 0.38, zf), null, 0.14);
    const hubR = V(sx * (tw - 0.18), R, zr), inR = sx * (tw - 0.55);
    [[-0.12, 0.18], [-0.12, -0.14], [0.18, 0.12], [0.18, -0.1]].forEach(([dy, dz]) => arm('susp', V(inR, R + dy, zr + dz), hubR.clone().add(V(0, dy * 0.8, dz * 0.4)), 0.022));
    add('susp', box(0.055, 0.3, 0.1), M.cast, hubR.clone().add(V(-sx * 0.02, 0.02, 0)), null, 0.15);
    add('susp', cyl(0.07, 0.15, 18), M.black, V(sx * (tw - 0.4), R + 0.26, zr), null, 0.18);
    add('brakes', cyl(0.16, 0.028, 36), M.disc, V(sx * (tw - 0.14), R, zf), X90, 0.2);
    add('brakes', cyl(0.16, 0.028, 36), M.disc, V(sx * (tw - 0.14), R, zr), X90, 0.2);
  }
  add('chargePort', box(0.07, 0.1, 0.12), M.black, V(W / 2 - 0.28, H * 0.55, rear + 0.55), null, 0.24);
  add('chargePort', cyl(0.014, 0.035, 8), M.blue, V(W / 2 - 0.24, H * 0.55, rear + 0.55), X90, 0.22);
  const cam = (pos) => { add('cameras', box(0.055, 0.038, 0.055), M.black, pos, null, 0.22); add('cameras', new THREE.SphereGeometry(0.013, 12, 8), M.lens, pos.clone().add(V(0, 0, 0.028)), null, 0.1); };
  cam(V(-0.04, H * 0.78, zf - 1.25)); cam(V(0.04, H * 0.78, zf - 1.25));
  for (const sx of [-1, 1]) { cam(V(sx * (W / 2 - 0.34), H * 0.62, mid + 0.15)); cam(V(sx * (W / 2 - 0.28), R * 1.95, zf - 0.45)); }
  cam(V(0, H * 0.58, rear + 0.25));
  add('display', box(0.46, 0.28, 0.03), S({ color: 0x111216, roughness: .25, metalness: .2, emissive: 0x151820, emissiveIntensity: .35 }), V(0.12, R + 0.62, zf - 0.88), null, 0.28);
  add('display', box(0.42, 0.24, 0.008), S({ color: 0x0a1220, roughness: .15, emissive: 0x1a3050, emissiveIntensity: .4 }), V(0.12, R + 0.62, zf - 0.865), null, 0.2);
  const off = {
    body: V(0, 2.05, 0), glass: V(0, 2.85, 0), lights: V(0, 2.05, 0.15), wheels: V(0, 0, 0), brakes: V(0, 0, 0),
    cameras: V(0, 2.05, 0), cabin: V(0, 1.05, 0), display: V(0, 1.35, 0.15), hvac: V(0, 1.15, 0.4),
    battery: V(0, -0.02, 0), rearMotor: V(0, 0.2, -1.15), frontMotor: V(0, 0.2, 1.1), inverter: V(0, 0.65, 0),
    lv: V(-0.45, 0.95, 0.95), steer: V(0, 0.55, 0.2), vault: V(0, 1.55, -0.85), frunk: V(0, 1.15, 1.15),
    susp: V(0, 0, 0), chargePort: V(0.75, 1.7, -0.35),
  };
  Object.entries(off).forEach(([k, v]) => { if (parts[k]) parts[k].off.copy(v); });
}

function splitLR(mesh) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry; const pos = g.attributes.position; const out = [[], []];
  const v = new THREE.Vector3(), m = mesh.matrixWorld;
  for (let t = 0; t < pos.count; t += 3) { let cx = 0; for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, t + k).applyMatrix4(m); cx += v.x; } out[cx < 0 ? 0 : 1].push(t); }
  return out.map((tris) => { if (!tris.length) return null; const ng = new THREE.BufferGeometry(); for (const name of Object.keys(g.attributes)) { const a = g.attributes[name], arr = new a.array.constructor(tris.length * 3 * a.itemSize); tris.forEach((t, i) => { for (let k = 0; k < 3 * a.itemSize; k++) arr[i * 3 * a.itemSize + k] = a.array[t * a.itemSize + k]; }); ng.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized)); }
    const nm = new THREE.Mesh(ng, mesh.material); nm.name = mesh.name; nm.matrixAutoUpdate = false; nm.matrix.copy(mesh.matrixWorld); nm.matrixWorldNeedsUpdate = true; return nm; });
}

const status = $('.m3x-status'); status.textContent = 'Loading Cybertruck…';
const bar = $('.m3x-loadbar');
new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/vendor/three/draco/')).load(EXTERIOR.url, (gltf) => {
  const root = new THREE.Group(); root.add(gltf.scene); root.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3());
  if (s.x > s.z) root.rotation.y = Math.PI / 2; root.updateMatrixWorld(true);
  // Pointed nose vs vertical tailgate: the wedge tip has a much lower max Y
  // at its extreme Z than the tailgate. Put that tip at +Z so the home 3/4
  // shows the light bar, not the tonneau.
  const samp = new THREE.Vector3();
  let zMin = Infinity, zMax = -Infinity;
  const zy = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    if (EXTERIOR.classify(o) === 'wheels') return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 600));
    for (let i = 0; i < pos.count; i += step) {
      samp.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      zMin = Math.min(zMin, samp.z); zMax = Math.max(zMax, samp.z);
      zy.push(samp.z, samp.y);
    }
  });
  const band = Math.max(0.02, (zMax - zMin) * 0.07);
  let yAtMaxZ = -Infinity, yAtMinZ = -Infinity;
  for (let i = 0; i < zy.length; i += 2) {
    const z = zy[i], y = zy[i + 1];
    if (z > zMax - band) yAtMaxZ = Math.max(yAtMaxZ, y);
    if (z < zMin + band) yAtMinZ = Math.max(yAtMinZ, y);
  }
  const fb = new THREE.Box3(); root.traverse((o) => { if (o.isMesh && EXTERIOR.frontProbe(o)) fb.expandByObject(o); });
  b.setFromObject(root);
  let flipped = false;
  if (isFinite(yAtMaxZ) && isFinite(yAtMinZ) && yAtMaxZ >= yAtMinZ - 1e-4) {
    root.rotation.y += Math.PI; flipped = true;
  } else if (!isFinite(yAtMaxZ) && !fb.isEmpty() && fb.getCenter(new THREE.Vector3()).z < b.getCenter(new THREE.Vector3()).z) {
    root.rotation.y += Math.PI; flipped = true;
  }
  globalThis.__ctxFace = { yAtMaxZ, yAtMinZ, zMin, zMax, flipped, cabinZ: fb.isEmpty() ? null : fb.getCenter(new THREE.Vector3()).z };
  root.updateMatrixWorld(true); b.setFromObject(root); s = b.getSize(new THREE.Vector3());
  const k = EXTERIOR.length / s.z; root.scale.setScalar(k); root.updateMatrixWorld(true); b.setFromObject(root);
  const c = b.getCenter(new THREE.Vector3()); root.position.sub(V(c.x, b.min.y, c.z)); root.updateMatrixWorld(true); b.setFromObject(root);
  const meshes = []; root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const tyres = [];
  meshes.forEach((o) => {
    const id = EXTERIOR.classify(o); o.userData.part = id; o.castShadow = o.receiveShadow = true;
    if (id === 'body') o.material = M.stainless;
    else if (id === 'glass') o.material = P({ color: 0x0a0d12, metalness: 0, roughness: .04, specularIntensity: .4, specularColor: 0xffffff, transparent: true, opacity: .34, clearcoat: 0, depthWrite: false, side: THREE.DoubleSide });
    else if (id === 'lights') o.material = P({ color: 0xf4f7ff, metalness: 0.15, roughness: .06, emissive: 0xdde8ff, emissiveIntensity: 0.85, transparent: true, opacity: .55, depthWrite: false });
    else if (id === 'cabin') o.material = S({ color: 0x16171b, metalness: .12, roughness: .72 });
    else if (id === 'wheels') { o.material = S({ color: 0x141518, metalness: .4, roughness: .62 }); tyres.push(o); }
  });
  const pts = []; const v = new THREE.Vector3(); tyres.forEach((t) => { const p = t.geometry.attributes.position; const step = Math.max(1, Math.floor(p.count / 400)); for (let i = 0; i < p.count; i += step) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(t.matrixWorld).clone()); });
  const q = { fl: [], fr: [], rl: [], rr: [] }; pts.forEach((p) => q[(p.z > 0 ? 'f' : 'r') + (p.x > 0 ? 'l' : 'r')].push(p));
  const cen = (a) => { const bb = new THREE.Box3().setFromPoints(a); return { c: bb.getCenter(new THREE.Vector3()), r: bb.getSize(new THREE.Vector3()).y / 2 }; };
  let d;
  try { const W4 = Object.values(q).map(cen); d = { zf: (W4[0].c.z + W4[1].c.z) / 2, zr: (W4[2].c.z + W4[3].c.z) / 2, tw: W4.reduce((a, w) => a + Math.abs(w.c.x), 0) / 4, R: W4.reduce((a, w) => a + w.r, 0) / 4, cy: W4.reduce((a, w) => a + w.c.y, 0) / 4, tx: pts.reduce((a, p) => Math.max(a, Math.abs(p.x)), 0) }; if (!isFinite(d.zf) || !isFinite(d.R) || d.R < 0.2) throw 0; }
  catch (e) { d = { zf: 1.82, zr: -1.82, tw: 0.95, R: 0.46 }; }
  Object.assign(d, { front: b.max.z, rear: b.min.z, W: b.max.x - b.min.x, H: b.max.y, size: [s.x, s.y, s.z] });
  globalThis.__ctxD = d;
  meshes.forEach((o) => {
    const id = o.userData.part;
    if (id === 'wheels') { splitLR(o).forEach((nm, i) => { if (!nm) return; nm.castShadow = nm.receiveShadow = true; nm.userData = { part: id, side: i }; reg(id).meshes.push(nm); }); o.visible = false; return; }
    const p = reg(id); p.group.attach(o); p.meshes.push(o);
  });
  buildInternals(d);
  if (/debug/.test(location.search)) window.__ctx = { THREE, parts, car, camera, controls, d };
  (parts.body ? parts.body.meshes : []).forEach((o) => { const cc = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); o.userData.base = o.position.clone(); o.userData.eo = o.parent.worldToLocal(cc.clone().add(V(cc.x * 0.1, 0.03, cc.z * 0.04))).sub(o.parent.worldToLocal(cc.clone())); });
  const SPLIT = { wheels: 1.05, brakes: 0.85, susp: 0.5 };
  Object.entries(SPLIT).forEach(([id, amt]) => { const p = parts[id]; if (!p) return; const L = new THREE.Group(), Rg = new THREE.Group(); p.group.add(L, Rg); p.split = amt;
    [...p.meshes, ...p.hits].forEach((o) => { if (o.userData.side !== undefined) (o.userData.side ? Rg : L).add(o); else { const wp = o.getWorldPosition(new THREE.Vector3()); (wp.x < 0 ? L : Rg).attach(o); } }); p.sides = [L, Rg]; });
  ['lights', 'display', 'brakes', 'chargePort', 'frunk'].forEach((id) => { const p = parts[id]; if (!p) return; p.meshes.forEach((o) => { const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3()), cc = bb.getCenter(new THREE.Vector3());
    if (Math.max(sz.x, sz.y, sz.z) > 1.4) return; const h = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sz.x, .22), Math.max(sz.y, .22), Math.max(sz.z, .22)), new THREE.MeshBasicMaterial({ visible: false })); h.position.copy(cc); h.userData = { part: id, hit: true, side: o.userData.side };
    const parent = p.sides && o.parent && o.parent !== p.group ? o.parent : p.group; parent.attach ? parent.attach(h) : p.group.add(h); p.hits.push(h); }); });
  Object.values(parts).forEach((p) => car.add(p.group));
  buildList(); app.classList.add('m3x-ready'); status.textContent = ''; bar && (bar.style.opacity = 0); kick();
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
exBtn.addEventListener('click', () => { const v = exT > 0.5 ? 0 : 1; setExplode(v); if (!selected) startFly(v ? homePos().multiplyScalar(1.22).add(V(0, 0.7, 0)) : homePos(), v ? V(0, 1.25, 0) : HOME.t.clone()); });
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function applyExplode() { const e = ease(ex); Object.values(parts).forEach((p) => { p.group.position.copy(p.off).multiplyScalar(e); if (p.sides) { p.sides[0].position.x = -p.split * e; p.sides[1].position.x = p.split * e; } }); (parts.body ? parts.body.meshes : []).forEach((o) => { if (o.userData.eo) o.position.copy(o.userData.base).addScaledVector(o.userData.eo, e); }); }

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
  label.textContent = PARTS[id].name; label.hidden = false; frame(); if (flyIt) flyTo(id); idle(); kick();
}
function frame() { const w = innerWidth, h = app.clientHeight;
  if (selected && portrait()) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  else if (selected && w > 900) camera.setViewOffset(w, h, -((460 + w - 286) / 2 - w / 2), 0, w, h);
  else camera.clearViewOffset(); camera.updateProjectionMatrix(); }
function partBox(id) { applyExplode(); car.updateMatrixWorld(true); const bx = new THREE.Box3(); parts[id].meshes.forEach((o) => { if (o.visible) bx.expandByObject(o); }); return bx; }
let fly = null;
function flyTo(id) { const sd = parts[id] && parts[id].sides; const bx = partBox(id), c = bx.getCenter(new THREE.Vector3()), r = bx.getSize(new THREE.Vector3()).length() / 2;
  const dir = camera.position.clone().sub(controls.target).normalize(); dir.y = Math.max(dir.y, 0.42); dir.normalize();
  const fit = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (portrait() ? 1.25 : 0.95);
  const dist = THREE.MathUtils.clamp(fit, portrait() ? 3.6 : (sd ? 4.0 : 2.3), 13); if (sd) { startFly(homePos().multiplyScalar(ex > .5 ? 1.25 : 1.05).add(V(0, ex > .5 ? 0.45 : 0, 0)), V(0, 0.55, 0)); return; } startFly(c.clone().add(dir.multiplyScalar(dist)), c); }
function flyK(f) { return !f || f.dur <= 0 ? 1 : Math.min(1, (performance.now() - f.start) / f.dur); }
function startFly(p, t) {
  const len = p.distanceTo(camera.position) + t.distanceTo(controls.target);
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone(), t1: t.clone(), start: performance.now(), dur: reduce ? 0 : THREE.MathUtils.clamp(0.7 + len * 0.08, 0.8, 1.6) * 1000 };
  kick();
}
$('.m3x-reset').addEventListener('click', () => { restoreView = null; select(null, { snapBack: false }); setExplode(0); startFly(homePos(), HOME.t.clone()); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected) select(null); });

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

let paused = reduce, last = performance.now(); const pauseBtn = $('.m3x-pause');
function idle() { last = performance.now(); }
function syncPause() { pauseBtn.textContent = paused ? 'Play' : 'Pause'; pauseBtn.setAttribute('aria-pressed', paused); }
pauseBtn.addEventListener('click', () => { paused = !paused; syncPause(); kick(); }); syncPause();
controls.addEventListener('start', () => { idle(); }); controls.addEventListener('change', () => kick());

const label = $('.m3x-label');
function placeLabel() { if (!selected) return; const c = partBox(selected).getCenter(new THREE.Vector3()).project(camera); label.style.transform = 'translate(' + ((c.x + 1) / 2 * innerWidth) + 'px,' + ((1 - c.y) / 2 * app.clientHeight) + 'px)'; label.style.opacity = c.z < 1 ? 1 : 0; }

function resize() { const w = innerWidth, h = app.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 50 : 34; frame(); kick(); }
addEventListener('resize', resize); resize(); HOME.p.copy(homePos()); camera.position.copy(HOME.p); controls.target.copy(HOME.t);
document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
function kick() {
  if (!raf) raf = requestAnimationFrame(tick);
  // Wall-clock explode/fly still need a pump if rAF is throttled (SwiftShader / background).
  if ((exAnim || fly) && !kickTimer) kickTimer = setTimeout(() => { kickTimer = 0; if (exAnim || fly) { raf = 0; tick(); } }, 50);
}
function tick() {
  raf = 0; const now = performance.now(); let busy = false;
  if (exAnim) {
    const k = Math.min(1, (now - exAnim.start) / exAnim.dur);
    ex = exAnim.from + (exAnim.to - exAnim.from) * k;
    if (k >= 1) { ex = exAnim.to; exAnim = null; }
    busy = true;
  } else ex = exT;
  applyExplode();
  if (fly) {
    const k = flyK(fly), e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) {
      camera.position.copy(fly.p1);
      controls.target.copy(fly.t1);
      if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0);
      if (controls._panOffset) controls._panOffset.set(0, 0, 0);
      controls._scale = 1;
      fly = null;
    }
    busy = true;
  }
  else {
    controls.autoRotate = !paused && !selected && now - last > 6500; controls.autoRotateSpeed = 0.45;
    if (controls.update() || controls.autoRotate) busy = true;
  }
  renderer.render(scene, camera); placeLabel();
  frames++; if (now - t0 > 1500) { const fps = frames * 1000 / (now - t0); if (fps < 32 && dpr > 1) { dpr = Math.max(1, dpr - 0.4); renderer.setPixelRatio(dpr); resize(); } frames = 0; t0 = now; }
  if (busy) kick();
}

globalThis.__ctx = {
  selected: () => selected,
  ex: () => ex,
  exT: () => exT,
  face: () => globalThis.__ctxFace,
  view: () => ({
    selected,
    x: camera.position.x, y: camera.position.y, z: camera.position.z,
    tx: controls.target.x, ty: controls.target.y, tz: controls.target.z,
    flying: Boolean(fly),
    ex, exT,
  }),
};
