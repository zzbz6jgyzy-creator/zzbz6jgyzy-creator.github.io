// Supercharged Daily: interactive Model 3 viewer. Original code (inspired by the behaviour of 21st.dev "agentic-factory-3d").
// three.js r170 (MIT) vendored in /vendor/three. Model: "Tesla Model 3" by David_Holiday, CC BY 4.0 (Sketchfab).
import * as THREE from '/vendor/three/three.module.min.js';
import { OrbitControls } from '/vendor/three/addons/OrbitControls.js';
import { GLTFLoader } from '/vendor/three/addons/GLTFLoader.js';
import { DRACOLoader } from '/vendor/three/addons/DRACOLoader.js';
import { RoomEnvironment } from '/vendor/three/addons/RoomEnvironment.js';

const root = document.querySelector('[data-m3d]');
const RED = 0xe11d2e;
if (root) start(root);

function start(root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true, raf = 0;
  const stage = root.querySelector('.m3d-stage'), tip = root.querySelector('.m3d-tip'), status = root.querySelector('.m3d-status');
  const fail = (msg) => { root.classList.add('m3d-failed'); if (status) status.textContent = msg || ''; };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return fail('3D needs WebGL, so here is a still.'); }
  const touch = matchMedia('(pointer: coarse)').matches;
  let dpr = Math.min(devicePixelRatio || 1, touch ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.7;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(4.9, 1.6, 5.3);

  // Lights: key, rim (brand red), warm fill
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(5, 8, 4); key.castShadow = true;
  key.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); key.shadow.radius = 6; key.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(RED, 3.2); rim.position.set(-6, 3, -5);
  const warm = new THREE.PointLight(0xffb48a, 18, 14); warm.position.set(-3, 2.5, 4);
  scene.add(key, rim, warm, new THREE.HemisphereLight(0x8899ff, 0x110505, 0.35));

  // Floor: shadow catcher + soft red contact glow
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(0,0,0,.85)'); r.addColorStop(.55, 'rgba(20,0,4,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.6), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002; scene.add(contact);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.43, 128), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .35 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003; scene.add(ring);

  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, enablePan: false, enableZoom: false, minPolarAngle: 0.15, maxPolarAngle: Math.PI / 2 - 0.04, rotateSpeed: 0.7 });
  if (touch) { controls.enableRotate = false; renderer.domElement.style.touchAction = 'pan-y'; } // embed: page keeps scrolling on phones
  controls.target.set(0, 0.6, 0);

  // Cutaway clipping plane (cuts away the near side of body + glass)
  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10);

  const parts = {}; // name -> {group, base, offset, label}
  const car = new THREE.Group(); scene.add(car);
  const labels = {
    wheels: ['Wheels & brakes', 'Aero wheels with red brake calipers.'],
    glass: ['Glass roof', 'One-piece tinted glass canopy over the cabin.'],
    cabin: ['Cabin', 'Minimal interior built around the centre touchscreen.'],
    lights: ['Lights', 'Slim LED headlights and tail lights.'],
    body: ['Body', 'Aluminium and steel body, painted Ultra Red here.']
  };
  const draco = new DRACOLoader().setDecoderPath('/vendor/three/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  status.textContent = 'Loading Model 3…';
  loader.load('/assets/3d/model3.glb?v=1', (gltf) => {
    const m = gltf.scene;
    // normalise to ~4.7 m long, sitting on the floor
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
    const s = 4.7 / Math.max(size.x, size.z); m.scale.setScalar(s);
    box.setFromObject(m); const c = box.getCenter(new THREE.Vector3());
    m.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
    car.add(m);
    const paint = new THREE.MeshPhysicalMaterial({ color: 0x9a0a18, metalness: 0.25, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.2, roughness: 0.02, transparent: true, opacity: 0.82, clearcoat: 1, envMapIntensity: 1.6 });
    const groups = { wheels: [], glass: [], cabin: [], lights: [], body: [] };
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const n = o.name, mat = (o.material && o.material.name) || '';
      let g = 'body';
      if (/^(wheel|cal)/.test(n)) g = 'wheels'; else if (/Glass/i.test(n) || /Glass/i.test(mat)) g = 'glass';
      else if (/^int/.test(n)) g = 'cabin'; else if (/LED|PHARE/i.test(n)) g = 'lights';
      if (/CAR.?PAINT/i.test(mat)) o.material = paint;
      else if (g === 'glass') o.material = glass;
      else if (/^cal/.test(n)) o.material = new THREE.MeshStandardMaterial({ color: RED, metalness: .3, roughness: .4 });
      else {
        const om = o.material, col = om.color ? om.color.clone() : new THREE.Color(0x111111), lum = col.r + col.g + col.b;
        if (g === 'wheels') o.material = lum > 1 ? new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, metalness: .75, roughness: .28, clearcoat: .6 }) : new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0, roughness: .92 });
        else if (/chrome/i.test(mat)) o.material = new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 1, roughness: .18 });
        else if (g === 'lights') o.material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdde6ff, emissiveIntensity: 1.6, roughness: .2 });
        else { o.material = om.clone(); o.material.roughness = lum > 1.5 ? .4 : Math.min(om.roughness, .55); if (col.r > .5 && col.g < .1) { o.material.emissive = new THREE.Color(0x550008); } }
      }
      if (g === 'body' || g === 'glass' || g === 'lights') o.material.clippingPlanes = [clip];
      o.material.side = THREE.DoubleSide;
      o.userData.part = g; groups[g].push(o);
    });
    // exploded offsets (world units)
    const off = { wheels: null, glass: new THREE.Vector3(0, 0.9, 0), cabin: new THREE.Vector3(0, 0.35, 0), lights: new THREE.Vector3(0, 0.55, 0), body: new THREE.Vector3(0, 0.55, 0) };
    Object.keys(groups).forEach((k) => groups[k].forEach((o) => {
      o.userData.base = o.position.clone();
      const wp = o.getWorldPosition(new THREE.Vector3());
      let w = off[k] ? off[k].clone() : new THREE.Vector3(Math.sign(wp.x || 1) * 0.8, 0, 0);
      o.userData.off = o.parent.worldToLocal(o.getWorldPosition(new THREE.Vector3()).add(w)).sub(o.position);
      parts[o.uuid] = o;
    }));
    root.classList.add('m3d-ready'); status.textContent = '';
    car.userData.groups = groups;
    setMode('assembled'); kick();
  }, undefined, () => fail('Could not load the 3D model, so here is a still.'));

  // Modes & presets
  let mode = 'assembled', explode = 0, explodeT = 0, cut = 10, cutT = 10;
  function setMode(m) { mode = m; explodeT = m === 'stations' ? 1 : 0; cutT = m === 'cutaway' ? 0.05 : 10; root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m)); if (reduce) { explode = explodeT; cut = cutT; } kick(); }
  const presets = { overview: [4.9, 1.6, 5.3, 0.55], side: [0, 1, 7.2, 0.65], top: [0.01, 9, 0.01, 0], detail: [3.4, 0.9, 2.6, 0.5], front: [-6.5, 1.4, 1.2, 0.7] };
  let camFrom = null, camTo = null, camT = 1;
  function goPreset(p) { const v = presets[p]; if (!v) return; camFrom = { p: camera.position.clone(), t: controls.target.clone() }; camTo = { p: new THREE.Vector3(v[0], v[1], v[2]), t: new THREE.Vector3(0, v[3], 0) }; camT = reduce ? 1 : 0; if (reduce) { camera.position.copy(camTo.p); controls.target.copy(camTo.t); } idle(); kick(); }
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => goPreset(b.dataset.view)));
  // touch: rotate with arrow buttons since one-finger drag scrolls the page
  root.querySelectorAll('[data-spin]').forEach((b) => b.addEventListener('click', () => { const a = +b.dataset.spin * Math.PI / 6, p = camera.position.clone().sub(controls.target); p.applyAxisAngle(new THREE.Vector3(0, 1, 0), a); camFrom = { p: camera.position.clone(), t: controls.target.clone() }; camTo = { p: p.add(controls.target), t: controls.target.clone() }; camT = reduce ? 1 : 0; idle(); kick(); }));

  // Idle auto-rotate after 6.5 s, pause button
  let paused = reduce, lastInput = performance.now();
  const pauseBtn = root.querySelector('[data-pause]');
  function idle() { lastInput = performance.now(); controls.autoRotate = false; }
  function syncPause() { if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', paused); pauseBtn.textContent = paused ? 'Play' : 'Pause'; } }
  if (pauseBtn) pauseBtn.addEventListener('click', () => { paused = !paused; syncPause(); kick(); }); syncPause();
  controls.addEventListener('start', idle);

  // Hover tooltips + click-to-focus
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let hover = null;
  function pick(e) { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); const h = ray.intersectObject(car, true).find((i) => !(i.object.material.clippingPlanes && i.object.material.clippingPlanes.length && clip.distanceToPoint(i.point) < 0)); return h ? h : null; }
  renderer.domElement.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const h = pick(e); const g = h && h.object.userData.part; if (g !== hover) { hover = g; renderer.domElement.style.cursor = g ? 'pointer' : 'grab'; } if (g) { const r = root.getBoundingClientRect(); tip.hidden = false; tip.innerHTML = '<b>' + labels[g][0] + '</b><span>' + labels[g][1] + '</span>'; tip.style.transform = 'translate(' + (e.clientX - r.left + 14) + 'px,' + (e.clientY - r.top + 14) + 'px)'; } else tip.hidden = true; kick(); });
  renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; });
  let downAt = null; renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('click', (e) => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return; const h = pick(e); if (!h) return; const g = h.object.userData.part; const p = h.point.clone(); const dir = camera.position.clone().sub(controls.target).normalize(); camFrom = { p: camera.position.clone(), t: controls.target.clone() }; camTo = { p: p.clone().add(dir.multiplyScalar(g === 'body' ? 5 : 3.2)), t: p }; camT = reduce ? 1 : 0; const lb = root.querySelector('.m3d-focus'); if (lb) { lb.hidden = false; lb.innerHTML = '<b>' + labels[g][0] + '</b> ' + labels[g][1]; } idle(); kick(); });

  // Resize + adaptive pixel ratio
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 600 ? 40 : 32; camera.updateProjectionMatrix(); kick(); }
  new ResizeObserver(resize).observe(stage); resize();
  let frames = 0, t0 = performance.now();

  // Render loop, paused offscreen
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0.05 }).observe(root);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick); }
  const clock = new THREE.Clock();
  function tick() {
    raf = 0; const dt = Math.min(clock.getDelta(), 0.05), now = performance.now();
    let moving = false;
    if (camT < 1) { camT = Math.min(1, camT + dt / 1.1); const k = 1 - Math.pow(1 - camT, 3); camera.position.lerpVectors(camFrom.p, camTo.p, k); controls.target.lerpVectors(camFrom.t, camTo.t, k); moving = true; }
    if (Math.abs(explodeT - explode) > 1e-3) { explode += (explodeT - explode) * Math.min(1, dt * 4); moving = true; } else explode = explodeT;
    if (Math.abs(cutT - cut) > 1e-3) { cut += (cutT - cut) * Math.min(1, dt * 3); moving = true; } else cut = cutT;
    clip.constant = cut;
    Object.values(parts).forEach((o) => { o.position.copy(o.userData.base).addScaledVector(o.userData.off, explode); });
    controls.autoRotate = !paused && !reduce && now - lastInput > 6500; controls.autoRotateSpeed = 0.6;
    if (controls.update() || controls.autoRotate) moving = true;
    renderer.render(scene, camera);
    // adaptive DPR: drop if slow during first ~2s
    frames++; if (now - t0 > 2000) { const fps = frames * 1000 / (now - t0); if (fps < 40 && dpr > 1) { dpr = Math.max(1, dpr - 0.5); renderer.setPixelRatio(dpr); resize(); } frames = 0; t0 = now; }
    if (moving || hover) kick();
  }
  controls.addEventListener('change', kick);
}
