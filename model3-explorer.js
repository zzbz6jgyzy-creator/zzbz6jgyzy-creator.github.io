// Supercharged Daily: full-screen Model 3 explorer v2. Original code. three.js r170 (MIT).
// Exterior: "2024 Tesla Model 3 + Interior" by tonielpro520 (CC BY 4.0). Internal parts are illustrative, modelled here.
import * as THREE from '/vendor/three/three.module.min.js';
import { OrbitControls } from '/vendor/three/addons/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/addons/GLTFLoader.js';
import { DRACOLoader } from '/vendor/three/addons/DRACOLoader.js';
import { RoomEnvironment } from '/vendor/three/addons/RoomEnvironment.js';
import { mergeGeometries } from '/vendor/three/utils/BufferGeometryUtils.js';
import { PARTS, ORDER, PHOTOS } from './model3-parts.js?v=5';

// ---- Exterior config: swap this block to use another GLB ----
const NUM = (o) => +((o.name.match(/Object_(\d+)/) || [])[1] || -1);
const IDS = { body: [32, 33, 36, 37, 34, 8, 35, 12, 13, 3, 52], wheels: [31, 25, 28, 29, 26, 27], brakes: [9, 10], lights: [2, 14, 21, 22, 23, 30], mirrors: [24], display: [19], cabin: [43, 44, 45, 40, 6, 38, 42, 39, 4, 41, 49, 5, 46, 47, 48, 50, 51, 18, 16, 17], glass: [7, 15, 20], hide: [11] };
const EXTERIOR = {
  url: '/assets/3d/model3-2024.glb?v=1', length: 4.72,
  classify(o) { const n = NUM(o); for (const [k, v] of Object.entries(IDS)) if (v.includes(n)) return k; return 'body'; },
  frontProbe: (o) => [2, 14].includes(NUM(o)) // headlight glass marks the front
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
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('.m3x-canvas').appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050506); scene.fog = new THREE.Fog(0x050506, 12, 28);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 0.9;
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);
const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(4, 9, 5); key.castShadow = true;
key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 }); key.shadow.radius = 8; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
const rim = new THREE.DirectionalLight(0xff5a66, 1.25); rim.position.set(-6, 0.5, -6);
const fill = new THREE.DirectionalLight(0xbfd2ff, 0.5); fill.position.set(-5, 4, 6);
scene.add(key, rim, fill, new THREE.HemisphereLight(0x9aa8ff, 0x100404, 0.25));
// floor: dark matte + soft contact shadow + thin red ring + faint grid
const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 96), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 1, metalness: 0, envMapIntensity: 0.1 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const contact = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.003; scene.add(m); return m; })();
const ring = new THREE.Mesh(new THREE.RingGeometry(3.7, 3.72, 180), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .45 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; scene.add(ring);
const grid = new THREE.PolarGridHelper(8, 16, 6, 96, 0x2a0a0e, 0x1a0b0d); grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, enablePan: false, enableZoom: true, minDistance: 1.6, maxDistance: 14, minPolarAngle: 0.12, maxPolarAngle: Math.PI / 2 - 0.04, rotateSpeed: coarse ? 0.85 : 0.65, zoomSpeed: 0.7 });
renderer.domElement.style.touchAction = 'none';
const HOME = { p: new THREE.Vector3(), t: new THREE.Vector3(0, 0.7, 0) };
const homePos = () => new THREE.Vector3(5.4, 2.3, 6.0).multiplyScalar(portrait() ? 1.55 : 1);

// ---------- registry ----------
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
  hvac: S({ color: 0x34373d, metalness: .3, roughness: .6 }), blue: S({ color: 0x2a5d9b, roughness: .5 }), red: S({ color: RED, roughness: .45 })
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

function driveUnit(id, x, y, z, s, flip) { // stator housing w/ cooling ribs + end cap + gearbox
  const dir = flip ? -1 : 1;
  add(id, cyl(0.15 * s, 0.34 * s, 40), M.cast, V(x - 0.12 * s * dir, y, z), X90);
  for (let i = -2; i <= 2; i++) add(id, new THREE.TorusGeometry(0.152 * s, 0.008, 6, 40), M.aluDark, V(x - 0.12 * s * dir + i * 0.06 * s, y, z), [0, Math.PI / 2, 0], 0.1);
  add(id, cyl(0.11 * s, 0.03, 32), M.alu, V(x - 0.3 * s * dir, y, z), X90, 0.1);
  add(id, new THREE.BoxGeometry(0.24 * s, 0.34 * s, 0.32 * s), M.cast, V(x + 0.14 * s * dir, y - 0.01, z + 0.02));
  add(id, cyl(0.07 * s, 0.25 * s, 24), M.cast, V(x + 0.14 * s * dir, y + 0.09 * s, z - 0.1 * s), X90, 0.1);
}
function inverter(x, y, z, s) {
  add('inverter', box(0.34 * s, 0.07, 0.24 * s), M.aluDark, V(x, y, z));
  const fins = []; for (let i = 0; i < 10; i++) fins.push(V(x - 0.15 * s + i * 0.033 * s, y + 0.055, z)); inst('inverter', box(0.006, 0.04, 0.22 * s), M.alu, fins);
  add('inverter', box(0.06, 0.05, 0.05), M.hv, V(x + 0.19 * s, y, z), null, 0.12);
}

function buildInternals(d) {
  const { zf, zr, tw, R, rear, W, H } = d; const wb = zf - zr, mid = (zf + zr) / 2;
  // battery pack: tray, cooling plate, 4 module rows with cell tops, HV connector
  const bl = wb - 0.7, bw = 2 * tw - 0.62, by = 0.2;
  add('battery', box(bw + 0.04, 0.05, bl + 0.04), M.aluDark, V(0, by, mid));
  add('battery', box(bw - 0.04, 0.012, bl - 0.06), M.cool, V(0, by + 0.031, mid));
  const rowW = (bw - 0.1) / 4, cells = [];
  for (let r = 0; r < 4; r++) { const x = -bw / 2 + 0.05 + rowW * (r + .5);
    add('battery', box(rowW - 0.03, 0.09, bl - 0.12), M.cell, V(x, by + 0.083, mid));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 22; j++) cells.push(V(x - rowW * 0.33 + i * rowW * 0.22, by + 0.13, mid - (bl - 0.2) / 2 + j * (bl - 0.2) / 21)); }
  inst('battery', cyl(0.016, 0.006, 10), M.cellTop, cells);
  add('battery', box(0.14, 0.08, 0.08), M.hv, V(0, by + 0.06, mid - bl / 2 - 0.02), null, 0.15);
  // drive units + inverters + HV cables
  driveUnit('rearMotor', 0, R + 0.03, zr + 0.06, 0.88, false); inverter(-0.08, R + 0.22, zr + 0.06, 0.88);
  driveUnit('frontMotor', 0, R, zf - 0.03, 0.82, true); inverter(0.06, R + 0.18, zf - 0.03, 0.82);
  for (const z of [zr, zf]) add(z === zr ? 'rearMotor' : 'frontMotor', cyl(0.03, 2 * tw - 0.34, 12), M.steel, V(0, R, z), X90, 0.08);
  const cable = (a, b) => { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(b, .5).add(V(0, -0.05, 0)), b]), 20, 0.014, 8); return addMesh('battery', new THREE.Mesh(g, M.hv), 0.08); };
  cable(V(0, by + 0.06, mid - bl / 2 - 0.05), V(-0.08, R + 0.22, zr + 0.17)); cable(V(0.05, by + 0.06, mid + bl / 2), V(0.06, R + 0.18, zf - 0.16));
  // heat pump: Supermanifold block + Octovalve + pipes ; LV battery beside it
  const hp = V(0.24, R + 0.2, zf + 0.02);
  add('heatpump', box(0.22, 0.16, 0.12), M.hvac, hp); add('heatpump', cyl(0.055, 0.06, 24), M.blue, hp.clone().add(V(0, 0.11, 0)));
  for (let i = 0; i < 4; i++) add('heatpump', cyl(0.012, 0.06, 8), M.alu, hp.clone().add(V(-0.08 + i * 0.05, -0.1, 0.03)), null, 0.08);
  add('lv', box(0.19, 0.13, 0.11), M.black, V(-0.25, R + 0.2, zf + 0.04)); add('lv', cyl(0.012, 0.02, 8), M.red, V(-0.3, R + 0.275, zf + 0.04), null, 0.08); add('lv', cyl(0.012, 0.02, 8), M.steel, V(-0.2, R + 0.275, zf + 0.04), null, 0.08);
  // suspension: front double wishbone + coilover, rear multi-link + coilover
  for (const sx of [-1, 1]) {
    const hubF = V(sx * (tw - 0.16), R, zf), inF = sx * (tw - 0.58);
    arm('suspFront', V(inF, R - 0.1, zf + 0.16), hubF.clone().add(V(0, -0.11, 0))); arm('suspFront', V(inF, R - 0.1, zf - 0.16), hubF.clone().add(V(0, -0.11, 0)));
    arm('suspFront', V(inF + sx * 0.12, R + 0.2, zf + 0.1), hubF.clone().add(V(0, 0.17, 0)), 0.025); arm('suspFront', V(inF + sx * 0.12, R + 0.2, zf - 0.1), hubF.clone().add(V(0, 0.17, 0)), 0.025);
    add('suspFront', box(0.05, 0.3, 0.07), M.cast, hubF.clone().add(V(-sx * 0.02, 0.03, 0)), null, 0.15);
    const cF = V(sx * (tw - 0.36), R + 0.25, zf - 0.05); add('suspFront', coil(0.05, 0.22, 6, 0.008), M.red, cF, [0, 0, -sx * 0.25], 0.15); add('suspFront', cyl(0.022, 0.36, 12), M.spring, cF, [0, 0, -sx * 0.25], 0.12);
    const hubR = V(sx * (tw - 0.16), R, zr), inR = sx * (tw - 0.52);
    [[-0.1, 0.16], [-0.1, -0.12], [0.16, 0.1], [0.16, -0.08], [0.0, -0.22]].forEach(([dy, dz]) => arm('suspRear', V(inR, R + dy, zr + dz), hubR.clone().add(V(0, dy * 0.8, dz * 0.4)), 0.02));
    add('suspRear', box(0.05, 0.28, 0.09), M.cast, hubR.clone().add(V(-sx * 0.02, 0.02, 0)), null, 0.15);
    const cR = V(sx * (tw - 0.38), R + 0.22, zr - 0.06); add('suspRear', coil(0.05, 0.2, 6, 0.008), M.red, cR, [0, 0, -sx * 0.2], 0.15); add('suspRear', cyl(0.022, 0.32, 12), M.spring, cR, [0, 0, -sx * 0.2], 0.12);
    add('suspFront', cyl(0.012, 2 * tw - 0.9, 8), M.steel, V(0, R - 0.06, zf + 0.22), X90, 0.08);
  }
  // charge port (inset behind the left tail light) — car's left is +x here
  add('chargePort', box(0.06, 0.09, 0.1), M.black, V(W / 2 - 0.3, H * 0.6, rear + 0.5), null, 0.22);
  add('chargePort', cyl(0.012, 0.03, 8), M.blue, V(W / 2 - 0.26, H * 0.6, rear + 0.5), X90, 0.22);
  // cameras
  const cam = (pos) => { add('cameras', box(0.05, 0.035, 0.05), M.black, pos, null, 0.22); add('cameras', new THREE.SphereGeometry(0.012, 12, 8), M.lens, pos.clone().add(V(0, 0, 0.026)), null, 0.1); };
  cam(V(-0.03, H * 0.8, zf - 1.15)); cam(V(0.03, H * 0.8, zf - 1.15));
  for (const sx of [-1, 1]) { cam(V(sx * (W / 2 - 0.32), H * 0.6, mid + 0.2)); cam(V(sx * (W / 2 - 0.26), R * 1.9, zf - 0.5)); }
  cam(V(0, H * 0.55, rear + 0.3));
  // HVAC module behind dash
  add('hvac', box(0.62, 0.22, 0.28), M.hvac, V(0, R + 0.42, zf - 0.78)); add('hvac', cyl(0.1, 0.13, 24), M.aluDark, V(0.25, R + 0.42, zf - 0.78), X90); add('hvac', box(0.5, 0.05, 0.05), M.black, V(0, R + 0.56, zf - 0.7), null, 0.12);
  // explode offsets
  const off = { body: V(0, 1.8, 0), glass: V(0, 2.6, 0), lights: V(0, 1.8, 0), mirrors: V(0, 1.8, 0), cameras: V(0, 1.8, 0), cabin: V(0, 0.95, 0), display: V(0, 1.2, 0), hvac: V(0, 1.05, 0.35), battery: V(0, -0.02, 0), rearMotor: V(0, 0.18, -1.0), frontMotor: V(0, 0.18, 0.95), inverter: V(0, 0.6, 0), heatpump: V(0.35, 0.8, 0.8), lv: V(-0.35, 0.8, 0.8), chargePort: V(0.7, 1.6, -0.3) };
  Object.entries(off).forEach(([k, v]) => { if (parts[k]) parts[k].off.copy(v); });
}

// Highland-style 3D wheels (hand-built): 10 twisted, bevelled spokes + thin lip, dark barrel and centre cap
function buildWheels(d) {
  const { R, zf, zr } = d, cy = d.cy || R, tx = d.tx || d.tw + 0.12, rr = R * 0.7, r0 = rr * 0.25, r1 = rr * 0.99, N = 10, k = 0.38;
  const sh = new THREE.Shape(), L = [], Rt = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12, r = r0 + (r1 - r0) * t, a = k * t * t, hw = rr * (0.055 + 0.035 * t) / r;
    L.push([Math.cos(a + hw) * r, Math.sin(a + hw) * r]); Rt.push([Math.cos(a - hw) * r, Math.sin(a - hw) * r]); }
  sh.moveTo(...L[0]); L.slice(1).forEach((p) => sh.lineTo(...p)); Rt.reverse().forEach((p) => sh.lineTo(...p)); sh.closePath();
  const one = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.006, bevelSegments: 2, curveSegments: 1 });
  one.rotateY(Math.PI / 2); // extrusion -> +x (outward face)
  const pa = one.attributes.position; for (let i = 0; i < pa.count; i++) { const r = Math.hypot(pa.getY(i), pa.getZ(i)); pa.setX(i, pa.getX(i) - 0.035 * (r / rr)); } // dished: hub proud, rim recessed
  one.computeVertexNormals();
  const spokes = []; for (let i = 0; i < N; i++) spokes.push(one.clone().rotateX(i * Math.PI * 2 / N));
  const lip = new THREE.TorusGeometry(rr, 0.014, 8, 72).rotateY(Math.PI / 2).translate(-0.022, 0, 0);
  const silverG = mergeGeometries([...spokes.map((g) => g.toNonIndexed()), lip.toNonIndexed()].map((g) => { g.deleteAttribute('uv'); return g; }));
  const barrel = new THREE.CylinderGeometry(rr * 0.985, rr * 0.985, 0.2, 56, 1, true).rotateZ(Math.PI / 2).translate(-0.13, 0, 0);
  const cap = new THREE.CylinderGeometry(r0 * 0.9, r0 * 1.06, 0.035, 36).rotateZ(-Math.PI / 2).translate(-0.004, 0, 0);
  const darkG = mergeGeometries([barrel.toNonIndexed(), cap.toNonIndexed()].map((g) => { g.deleteAttribute('uv'); return g; }));
  const silver = P({ color: 0xd2d5da, metalness: 1, roughness: .2, clearcoat: .6, clearcoatRoughness: .12 }), dark = S({ color: 0x0c0d0f, metalness: .4, roughness: .55, side: THREE.DoubleSide });
  const face = tx - 0.056;
  for (const z of [zf, zr]) for (const side of [0, 1]) { const sx = side ? 1 : -1;
    [[silverG, silver], [darkG, dark]].forEach(([g, m]) => { const o = new THREE.Mesh(g, m); o.position.set(sx * face, cy, z); o.scale.x = sx; o.castShadow = o.receiveShadow = true; o.userData = { part: 'wheels', side }; reg('wheels').meshes.push(o); }); }
}

// keep only triangles close to a hub centre (used to keep the T logo from the rim mesh)
function keepNearHub(mesh, d) { const g = mesh.geometry, pos = g.attributes.position, v = new THREE.Vector3(), keep = [], lim = d.R * 0.17;
  for (let t = 0; t < pos.count; t += 3) { let y = 0, z = 0; for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, t + k).applyMatrix4(mesh.matrix); y += v.y / 3; z += v.z / 3; }
    const zc = Math.abs(z - d.zf) < Math.abs(z - d.zr) ? d.zf : d.zr; if (Math.hypot(y - (d.cy || d.R), z - zc) < lim) keep.push(t); }
  if (!keep.length) return null; const ng = new THREE.BufferGeometry();
  for (const name of Object.keys(g.attributes)) { const a = g.attributes[name], n = a.itemSize, arr = new a.array.constructor(keep.length * 3 * n); keep.forEach((t, i) => arr.set(a.array.subarray(t * n, (t + 3) * n), i * 3 * n)); ng.setAttribute(name, new THREE.BufferAttribute(arr, n, a.normalized)); }
  mesh.geometry = ng; return mesh; }

// split a merged geometry into left/right meshes by triangle centroid x
function splitLR(mesh) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry; const pos = g.attributes.position; const out = [[], []];
  const v = new THREE.Vector3(), m = mesh.matrixWorld;
  for (let t = 0; t < pos.count; t += 3) { let cx = 0; for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, t + k).applyMatrix4(m); cx += v.x; } out[cx < 0 ? 0 : 1].push(t); }
  return out.map((tris) => { if (!tris.length) return null; const ng = new THREE.BufferGeometry(); for (const name of Object.keys(g.attributes)) { const a = g.attributes[name], arr = new a.array.constructor(tris.length * 3 * a.itemSize); tris.forEach((t, i) => { for (let k = 0; k < 3 * a.itemSize; k++) arr[i * 3 * a.itemSize + k] = a.array[t * a.itemSize + k]; }); ng.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized)); }
    const nm = new THREE.Mesh(ng, mesh.material); nm.name = mesh.name; nm.matrixAutoUpdate = false; nm.matrix.copy(mesh.matrixWorld); nm.matrixWorldNeedsUpdate = true; return nm; });
}

// ---------- load ----------
const status = $('.m3x-status'); status.textContent = 'Loading Model 3…';
const bar = $('.m3x-loadbar');
new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/vendor/three/draco/')).load(EXTERIOR.url, (gltf) => {
  const root = new THREE.Group(); root.add(gltf.scene); root.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3());
  if (s.x > s.z) root.rotation.y = Math.PI / 2; root.updateMatrixWorld(true);
  const fb = new THREE.Box3(); root.traverse((o) => { if (o.isMesh && EXTERIOR.frontProbe(o)) fb.expandByObject(o); }); b.setFromObject(root);
  if (!fb.isEmpty() && fb.getCenter(new THREE.Vector3()).z < b.getCenter(new THREE.Vector3()).z) root.rotation.y += Math.PI;
  root.updateMatrixWorld(true); b.setFromObject(root); s = b.getSize(new THREE.Vector3());
  const k = EXTERIOR.length / s.z; root.scale.setScalar(k); root.updateMatrixWorld(true); b.setFromObject(root);
  const c = b.getCenter(new THREE.Vector3()); root.position.sub(V(c.x, b.min.y, c.z)); root.updateMatrixWorld(true); b.setFromObject(root);
  const paint = P({ color: 0xeeeae2, metalness: .05, roughness: .28, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .85 });
  const meshes = []; root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const tyres = [];
  meshes.forEach((o) => {
    const id = EXTERIOR.classify(o), n = NUM(o); o.userData.part = id; o.castShadow = o.receiveShadow = true;
    if (id === 'hide') { o.visible = false; return; }
    const mn = (o.material && o.material.name) || '';
    if (/carpaint/i.test(mn) && !/black/i.test(mn)) o.material = paint;
    else if (n === 7 || n === 15 || n === 20) o.material = P({ color: 0x0a0d12, metalness: 0, roughness: .05, specularIntensity: .35, specularColor: 0xffffff, transparent: true, opacity: n === 7 ? .7 : .38, clearcoat: 0, depthWrite: false, side: THREE.DoubleSide });
    else if (n === 2 || n === 14) o.material = P({ color: 0xffffff, metalness: 0, roughness: .02, transparent: true, opacity: .18, clearcoat: 1, depthWrite: false });
    else if (n === 10) o.material = S({ color: RED, metalness: .3, roughness: .4 });
    else if (n === 9) o.material = M.disc;
    else if (n === 25) o.material = P({ color: 0x3a3d42, metalness: 1, roughness: .12, clearcoat: 1 }); // T logo medallion: dark gloss so the embossed T catches the light (outer rim tabs are trimmed off at registration)
    else if (n === 27) o.material = S({ color: 0x15171a, metalness: .6, roughness: .4 }); // centre cap
    else if (n === 29) o.material = S({ color: 0x141518, metalness: .6, roughness: .35 }); // motion-blur spoke cards smear the face
    else if (n === 31) o.material = S({ color: 0x0c0c0d, metalness: 0, roughness: .85 });
    else if (n === 22) o.material = S({ color: 0xffffff, emissive: 0xffe8e8, emissiveIntensity: 1.2 });
    if (n === 31) tyres.push(o);
  });
  // layout from tyres (4 clusters)
  const pts = []; const v = new THREE.Vector3(); tyres.forEach((t) => { const p = t.geometry.attributes.position; for (let i = 0; i < p.count; i += 7) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(t.matrixWorld).clone()); });
  const q = { fl: [], fr: [], rl: [], rr: [] }; pts.forEach((p) => q[(p.z > 0 ? 'f' : 'r') + (p.x > 0 ? 'l' : 'r')].push(p));
  const cen = (a) => { const bb = new THREE.Box3().setFromPoints(a); return { c: bb.getCenter(new THREE.Vector3()), r: bb.getSize(new THREE.Vector3()).y / 2 }; };
  let d;
  try { const W4 = Object.values(q).map(cen); d = { zf: (W4[0].c.z + W4[1].c.z) / 2, zr: (W4[2].c.z + W4[3].c.z) / 2, tw: W4.reduce((a, w) => a + Math.abs(w.c.x), 0) / 4, R: W4.reduce((a, w) => a + w.r, 0) / 4, cy: W4.reduce((a, w) => a + w.c.y, 0) / 4, tx: pts.reduce((a, p) => Math.max(a, Math.abs(p.x)), 0) }; if (!isFinite(d.zf)) throw 0; }
  catch (e) { d = { zf: 1.45, zr: -1.43, tw: 0.8, R: 0.34 }; }
  Object.assign(d, { front: b.max.z, rear: b.min.z, W: b.max.x - b.min.x, H: b.max.y });
  // register exterior meshes; wheels/brakes split L/R
  meshes.forEach((o) => { const id = o.userData.part; if (id === 'hide') return;
    if (id === 'wheels' && [26, 27, 28, 29].includes(NUM(o))) { o.visible = false; return; } // replaced by built 3D wheels
    if (id === 'wheels' || id === 'brakes') { splitLR(o).forEach((nm, i) => { if (nm && NUM(o) === 25) nm = keepNearHub(nm, d); if (!nm) return; nm.castShadow = nm.receiveShadow = true; nm.userData = { part: id, side: i }; reg(id).meshes.push(nm); }); return; }
    const p = reg(id); p.group.attach(o); p.meshes.push(o); });
  buildInternals(d); if (/debug/.test(location.search)) window.__m3x = { THREE, parts, car, camera, controls, kick, d, getRestore: () => restoreView, getFly: () => fly && { k: flyK(fly), p1: fly.p1.toArray(), t1: fly.t1.toArray() }, getSelected: () => selected };
  buildWheels(d);
  // body panels drift apart slightly (outward from their own centres) on top of the lift
  (parts.body ? parts.body.meshes : []).forEach((o) => { const cc = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); o.userData.base = o.position.clone(); o.userData.eo = o.parent.worldToLocal(cc.clone().add(V(cc.x * 0.12, 0.03, cc.z * 0.04))).sub(o.parent.worldToLocal(cc.clone())); });
  // side groups for outward explode
  const SPLIT = { wheels: 0.95, brakes: 0.8, suspFront: 0.45, suspRear: 0.45 };
  Object.entries(SPLIT).forEach(([id, amt]) => { const p = parts[id]; if (!p) return; const L = new THREE.Group(), Rg = new THREE.Group(); p.group.add(L, Rg); p.split = amt;
    [...p.meshes, ...p.hits].forEach((o) => { if (o.userData.side !== undefined) (o.userData.side ? Rg : L).add(o); else { const wp = o.getWorldPosition(new THREE.Vector3()); (wp.x < 0 ? L : Rg).attach(o); } }); p.sides = [L, Rg]; });
  // hit volumes for small real parts (mirrors, lights, display)
  ['mirrors', 'display', 'lights', 'brakes'].forEach((id) => { const p = parts[id]; if (!p) return; p.meshes.forEach((o) => { const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3()), cc = bb.getCenter(new THREE.Vector3());
    if (Math.max(sz.x, sz.y, sz.z) > 1.2) return; const h = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sz.x, .2), Math.max(sz.y, .2), Math.max(sz.z, .2)), new THREE.MeshBasicMaterial({ visible: false })); h.position.copy(cc); h.userData = { part: id, hit: true, side: o.userData.side };
    const parent = p.sides && o.parent && o.parent !== p.group ? o.parent : p.group; parent.attach ? parent.attach(h) : p.group.add(h); p.hits.push(h); }); });
  Object.values(parts).forEach((p) => car.add(p.group));
  buildList(); app.classList.add('m3x-ready'); status.textContent = ''; bar && (bar.style.opacity = 0); kick();
}, (e) => { if (bar && e.total) bar.style.transform = 'scaleX(' + (e.loaded / e.total) + ')'; }, () => fail('Couldn’t load the 3D model, so this is a still image.'));

// ---------- explode ----------
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
  snapOrbit();
});
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function applyExplode() { const e = ease(ex); Object.values(parts).forEach((p) => { p.group.position.copy(p.off).multiplyScalar(e); if (p.sides) { p.sides[0].position.x = -p.split * e; p.sides[1].position.x = p.split * e; } }); (parts.body ? parts.body.meshes : []).forEach((o) => { if (o.userData.eo) o.position.copy(o.userData.base).addScaledVector(o.userData.eo, e); }); }

// ---------- selection & card ----------
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
// keep the part visible beside/above the card using a view offset
function frame() { const w = innerWidth, h = app.clientHeight;
  if (selected && portrait()) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  else if (selected && w > 900) camera.setViewOffset(w, h, -((460 + w - 286) / 2 - w / 2), 0, w, h);
  else camera.clearViewOffset(); camera.updateProjectionMatrix(); }
function partBox(id) { applyExplode(); car.updateMatrixWorld(true); const bx = new THREE.Box3(); parts[id].meshes.forEach((o) => { if (o.visible) bx.expandByObject(o); }); return bx; }
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
function flyTo(id) { const sd = parts[id] && parts[id].sides; const bx = partBox(id), c = bx.getCenter(new THREE.Vector3()), r = bx.getSize(new THREE.Vector3()).length() / 2;
  const dir = orbitOffset(camera.position, controls.target).normalize(); dir.y = Math.max(dir.y, 0.42); dir.normalize();
  const fit = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (portrait() ? 1.25 : 0.95);
  const dist = THREE.MathUtils.clamp(fit, portrait() ? 3.2 : (sd ? 3.4 : 2.0), 11); if (sd) { const next = dollyAlongView(exT > .5 ? 1.2 : 1, 0); startFly(next.p, next.t); return; }
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
  fly = { t0: controls.target.clone(), t1, s0, s1, p1, start: performance.now(), dur: reduce ? 0 : THREE.MathUtils.clamp(0.7 + len * 0.08, 0.8, 1.6) * 1000 };
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
addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected) select(null); });

// picking (ghosted surfaces ignored; enlarged hit volumes for small parts)
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
controls.addEventListener('start', () => { idle(); if (!fly) return; /* keep a scripted snap/zoom */ }); controls.addEventListener('change', () => kick());

const label = $('.m3x-label');
function placeLabel() { if (!selected) return; const c = partBox(selected).getCenter(new THREE.Vector3()).project(camera); label.style.transform = 'translate(' + ((c.x + 1) / 2 * innerWidth) + 'px,' + ((1 - c.y) / 2 * app.clientHeight) + 'px)'; label.style.opacity = c.z < 1 ? 1 : 0; }

function resize() { const w = innerWidth, h = app.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 50 : 34; frame(); kick(); }
addEventListener('resize', resize); resize(); HOME.p.copy(homePos()); camera.position.copy(HOME.p); controls.target.copy(HOME.t);
document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
function kick() {
  if (!raf) raf = requestAnimationFrame(tick);
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
    const k = flyK(fly);
    applyFly(k);
    if (k >= 1) endFly();
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

globalThis.__m3x = {
  selected: () => selected,
  ex: () => ex,
  exT: () => exT,
  view: () => ({
    selected,
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
    radius: camera.position.distanceTo(controls.target),
    theta: Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z),
    flying: Boolean(fly),
    ex, exT,
  }),
};
