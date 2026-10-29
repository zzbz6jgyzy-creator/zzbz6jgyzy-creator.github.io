/* Supercharged Daily Earth preview. Local Three.js r170 (MIT), no external runtime requests. */
import * as THREE from '/vendor/three/three.module.min.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const SURFACE = `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uCloud;
  uniform vec3 uSun;
  uniform float uCloudOffset;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSun);
    float mu = dot(N, L);
    float facing = clamp(dot(N, V), 0.0, 1.0);
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float clouds = dot(texture2D(uCloud, vec2(vUv.x + uCloudOffset + 0.0014, vUv.y - 0.001)).rgb, vec3(0.3333));
    float cloudShadow = smoothstep(0.15, 0.78, clouds) * 0.16;
    float daylight = max(mu, 0.0);
    float nightSide = 1.0 - smoothstep(-0.16, 0.06, mu);
    vec3 ambient = vec3(0.003, 0.007, 0.015);
    vec3 sunlight = vec3(1.05, 1.005, 0.94);
    vec3 color = day * (ambient + sunlight * daylight * 1.18 * (1.0 - cloudShadow));
    // Exclude the cool land background in the Black Marble visual composite.
    float lightStrength = max(0.0, min(night.r, night.g) - night.b * 0.7);
    vec3 cityLights = pow(max(night, vec3(0.0)), vec3(0.88));
    cityLights *= smoothstep(0.008, 0.12, lightStrength);
    color += cityLights * vec3(1.13, 0.91, 0.68) * nightSide * 1.15;
    float ocean = 1.0 - smoothstep(0.55, 0.92, (day.r + day.g) / max(day.b * 2.0, 0.002));
    float specular = pow(max(dot(reflect(-L, N), V), 0.0), 130.0);
    float fresnel = 0.035 + 0.965 * pow(1.0 - facing, 5.0);
    color += vec3(1.0, 0.93, 0.78) * specular * ocean * (0.22 + fresnel) * daylight * 1.35;
    float limb = pow(1.0 - facing, 3.3);
    float sunwardHaze = smoothstep(-0.23, 0.45, mu);
    color += vec3(0.055, 0.21, 0.48) * limb * (0.05 + sunwardHaze * 0.4);
    color += vec3(0.32, 0.078, 0.012) * limb * exp(-abs(mu) * 18.0) * 0.35;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const CLOUDS = `
  uniform sampler2D uCloud;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    float coverage = dot(texture2D(uCloud, vUv).rgb, vec3(0.3333));
    coverage = smoothstep(0.1, 0.76, coverage);
    float mu = dot(N, normalize(uSun));
    float day = max(mu, 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    vec3 color = vec3(1.06, 1.035, 0.98) * (0.015 + day * 1.25);
    color += vec3(0.025, 0.065, 0.12) * rim * smoothstep(-0.16, 0.3, mu);
    float alpha = coverage * 0.84 * smoothstep(0.0, 0.11, dot(N, V));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const ATMOSPHERE = `
  uniform vec3 uSun;
  varying vec3 vWorldPosition;
  void main() {
    vec3 origin = cameraPosition;
    vec3 ray = normalize(vWorldPosition - origin);
    float b = dot(origin, ray);
    float disc = b * b - dot(origin, origin) + 1.071225;
    if (disc <= 0.0) discard;
    float nearT = max(0.0, -b - sqrt(disc));
    float farT = -b + sqrt(disc);
    float stepLength = (farT - nearT) / 8.0;
    vec3 light = normalize(uSun);
    vec3 scatter = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      vec3 p = origin + ray * (nearT + (float(i) + 0.5) * stepLength);
      float r = length(p);
      float height = clamp((r - 1.0) / 0.035, 0.0, 1.0);
      float density = exp(-height * 7.0);
      float mu = dot(p / r, light);
      float horizon = -sqrt(max(0.0, 1.0 - 1.0 / (r * r)));
      float sunVisible = smoothstep(horizon - 0.035, horizon + 0.025, mu);
      vec3 tint = mix(vec3(0.78, 0.23, 0.055), vec3(0.095, 0.32, 0.86), smoothstep(horizon + 0.015, horizon + 0.19, mu));
      scatter += tint * density * (sunVisible + 0.006) * stepLength;
    }
    float phase = 0.75 * (1.0 + pow(dot(ray, light), 2.0));
    gl_FragColor = vec4(scatter * phase * 4.1, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.a = clamp(max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)), 0.0, 1.0);
  }
`;

/**
 * @param {{canvas:HTMLCanvasElement, textureBase?:string, quality?:string,
 * onStatus?:(message:string)=>void, onReady?:(viewer:object)=>void,
 * onError?:(error:Error)=>void, onChange?:(state:object)=>void}} options
 */
export async function initEarth(options = {}) {
  const { canvas, onStatus = () => {}, onReady = () => {}, onError = () => {}, onChange = () => {} } = options;
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('An Earth canvas is required.');
  const textureBase = (options.textureBase || '/assets/earth').replace(/\/$/, '');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (error) {
    onError(error);
    throw error;
  }
  renderer.setClearColor(0x030509, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.debug.onShaderError = () => { throw new Error('The Earth graphics could not start on this device.'); };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
  const globe = new THREE.Group();
  globe.rotation.y = -1.92;
  globe.rotation.z = -0.07;
  scene.add(globe);
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  black.needsUpdate = true;
  const sun = new THREE.Vector3(-0.92, 0.28, 0.43).normalize();
  const targetSun = sun.clone();
  const uniforms = { uDay: { value: black }, uNight: { value: black }, uCloud: { value: black }, uSun: { value: sun }, uCloudOffset: { value: 0 } };
  const sphere = new THREE.SphereGeometry(1, 160, 112);
  const surface = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: SURFACE, uniforms }));
  globe.add(surface);
  const cloudMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: CLOUDS, uniforms: { uCloud: uniforms.uCloud, uSun: uniforms.uSun }, transparent: true, depthWrite: false });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.009, 144, 96), cloudMaterial);
  clouds.renderOrder = 2;
  globe.add(clouds);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.035, 112, 80), new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: ATMOSPHERE, uniforms: { uSun: uniforms.uSun }, transparent: true, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.BackSide, depthWrite: false }));
  atmosphere.renderOrder = 3;
  scene.add(atmosphere);

  let seed = 14419;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const starPositions = [], starSizes = [], starColors = [];
  for (let i = 0; i < 840; i++) {
    const azimuth = random() * TAU, z = random() * 2 - 1, r = Math.sqrt(1 - z * z), brightness = 0.12 + Math.pow(random(), 3) * 0.55;
    starPositions.push(48 * r * Math.cos(azimuth), 48 * z, 48 * r * Math.sin(azimuth));
    starSizes.push(0.7 + random() * 1.1);
    starColors.push(brightness * 0.8, brightness * 0.89, brightness);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(starSizes, 1));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } }, transparent: true, depthWrite: false, vertexColors: true,
    vertexShader: 'attribute float aSize; uniform float uPixelRatio; varying vec3 vColor; void main(){vColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=aSize*uPixelRatio;}',
    fragmentShader: 'varying vec3 vColor; void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;gl_FragColor=vec4(vColor,1.0-smoothstep(0.12,0.5,d));#include <colorspace_fragment>}',
  });
  // Shader includes must start on their own line.
  starMaterial.fragmentShader = starMaterial.fragmentShader.replace('#include', '\n#include').replace('>}', '>\n}');
  scene.add(new THREE.Points(starGeometry, starMaterial));

  const maps = { day: null, night: null, clouds: null };
  const pointers = new Map();
  let width = 1, height = 1, fitDistance = 3.3, zoom = 1, yaw = 0, pitch = 0.10;
  let targetYaw = yaw, targetPitch = pitch, cloudAngle = 0, pinchDistance = 0;
  let paused = motion.matches, visible = true, disposed = false, contextLost = false, ready = false;
  let quality = ['auto', 'high', 'ultra'].includes(options.quality) ? options.quality : 'auto';
  let qualityToken = 0, frames = 0, raf = 0, lastTime = 0, lastRender = 0, interactionUntil = 0;
  let currentView = 'sunrise', appliedTier = '2k', detailMessage = '';
  const maxTexture = renderer.capabilities.maxTextureSize;
  const cleanups = [];
  const bind = (target, type, handler, opts) => { target.addEventListener(type, handler, opts); cleanups.push(() => target.removeEventListener(type, handler, opts)); };
  const running = () => ready && !paused && visible && !document.hidden && !disposed && !contextLost;
  const notify = () => { if (!disposed) onChange(getState()); };

  function getState() {
    return { ready, frames, running: running(), paused, reducedMotion: motion.matches, quality, view: currentView, rotation: globe.rotation.y, zoom, cameraYaw: yaw, cameraPitch: pitch, textureCount: Object.values(maps).filter(Boolean).length, textureWidth: maps.day?.image?.width || 0, textureTier: appliedTier.toUpperCase(), maxTextureSize: maxTexture, contextLost, detailMessage };
  }
  function updateCamera() {
    const distance = fitDistance / zoom;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }
  function draw() {
    if (!ready || disposed || contextLost || !visible || document.hidden) return;
    updateCamera();
    renderer.render(scene, camera);
    frames++;
  }
  function frame(now) {
    raf = 0;
    if (!running()) return;
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;
    const rate = pointers.size ? 60 : 30;
    if (now - lastRender >= 1000 / rate - 0.5) {
      const dt = lastRender ? Math.min((now - lastRender) / 1000, 0.12) : elapsed;
      lastRender = now;
      const ease = 1 - Math.exp(-dt * 9);
      yaw += (targetYaw - yaw) * ease;
      pitch += (targetPitch - pitch) * ease;
      sun.lerp(targetSun, 1 - Math.exp(-dt * 4)).normalize();
      if (now > interactionUntil && !pointers.size) globe.rotation.y += dt * 0.012;
      cloudAngle += dt * 0.0024;
      clouds.rotation.y = cloudAngle;
      uniforms.uCloudOffset.value = -cloudAngle / TAU;
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    if (running() && !raf) { lastTime = 0; lastRender = 0; raf = requestAnimationFrame(frame); }
    else if (!running() && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function renderDemand() {
    if (paused) { yaw = targetYaw; pitch = targetPitch; sun.copy(targetSun); }
    draw(); schedule(); notify();
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    const compact = width / height < 1.1;
    const ultraBudget = quality === 'ultra' && !(navigator.deviceMemory && navigator.deviceMemory <= 4);
    const maxPixels = compact ? 2400000 : ultraBudget ? 8300000 : 4200000;
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(maxPixels / (width * height)));
    renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
    starMaterial.uniforms.uPixelRatio.value = dpr;
    camera.aspect = width / height;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    fitDistance = 1 / Math.sin(Math.min(verticalFov, horizontalFov) * (compact ? 0.98 : 0.80) / 2);
    camera.setViewOffset(width, height, -width * (compact ? 0.03 : 0.14), -height * (compact ? 0.03 : 0.015), width, height);
    camera.updateProjectionMatrix(); renderDemand();
  }
  function loadTexture(file, color = true) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => { settled = true; reject(new Error('Earth imagery took too long to load.')); }, 18000);
      new THREE.TextureLoader().load(textureBase + '/' + file, texture => {
        if (settled || disposed) { texture.dispose(); if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Earth view closed.')); } return; }
        settled = true; clearTimeout(timer);
        texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        resolve(texture);
      }, undefined, () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Earth imagery could not load.')); } });
    });
  }
  function applyMap(key, map) {
    const previous = maps[key]; maps[key] = map;
    uniforms[{ day: 'uDay', night: 'uNight', clouds: 'uCloud' }[key]].value = map;
    previous?.dispose();
  }
  function tierFor(requested) {
    const saving = navigator.connection?.saveData;
    const mobile = width < 800 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    if (requested === 'ultra' && maxTexture >= 8192 && !(navigator.deviceMemory && navigator.deviceMemory <= 4)) return '8k';
    if (maxTexture >= 4096 && (requested !== 'auto' || (!saving && !mobile))) return '4k';
    return '2k';
  }
  async function setQuality(requested = 'auto') {
    if (!['auto', 'high', 'ultra'].includes(requested) || disposed) return getState();
    quality = requested;
    const token = ++qualityToken, tier = tierFor(requested);
    const detail = tier === '8k' ? '4k' : '2k';
    const detailWidth = detail === '4k' ? 4096 : 2048;
    detailMessage = requested === 'ultra' && tier !== '8k' ? 'Ultra detail is limited to ' + tier.toUpperCase() + ' on this device.' : requested === 'high' && tier === '2k' ? 'High detail is limited to 2K on this device.' : '';
    if (tier === appliedTier && ['night', 'clouds'].every(key => maps[key]?.image?.width === detailWidth)) { resize(); notify(); return getState(); }
    onStatus('Loading ' + tier.toUpperCase() + ' Earth detail…'); notify();
    try {
      if (tier !== appliedTier) {
        const day = await loadTexture('earth-day-' + tier + '.webp');
        if (disposed || token !== qualityToken) { day.dispose(); return getState(); }
        applyMap('day', day); appliedTier = tier; renderDemand();
      }
      for (const key of ['night', 'clouds']) {
        if ((maps[key]?.image?.width || 0) !== detailWidth) {
          try {
            const texture = await loadTexture('earth-' + key + '-' + detail + '.webp', key !== 'clouds');
            if (disposed || token !== qualityToken) { texture.dispose(); return getState(); }
            applyMap(key, texture); renderDemand();
          } catch { /* Keep the already loaded lower-resolution layer. */ }
        }
      }
      if (!disposed && token === qualityToken) onStatus(appliedTier.toUpperCase() + ' Earth detail ready.');
    } catch {
      if (!disposed && token === qualityToken) {
        detailMessage = 'Higher detail could not load. Showing ' + appliedTier.toUpperCase() + ' imagery.';
        onStatus(detailMessage);
      }
    }
    if (!disposed && token === qualityToken) { resize(); notify(); }
    return getState();
  }
  function pause() { paused = true; yaw = targetYaw; pitch = targetPitch; sun.copy(targetSun); schedule(); draw(); notify(); }
  function resume() { paused = false; schedule(); notify(); }
  function togglePause() { paused ? resume() : pause(); return paused; }
  function setView(view) {
    const views = { sunrise: [-0.92, 0.28, 0.43], daylight: [-0.35, 0.5, 1.0], night: [-1.0, 0.20, -0.58] };
    if (!views[view] || disposed) return;
    currentView = view; targetSun.set(...views[view]).normalize();
    renderDemand();
  }
  function setZoom(value) { if (!Number.isFinite(value) || disposed) return; zoom = clamp(value, 0.65, 1.65); interactionUntil = performance.now() + 2500; renderDemand(); }
  function zoomBy(delta) { setZoom(zoom + delta); }
  function stepOrbit(dx = 0, dy = 0) { targetYaw += dx; targetPitch = clamp(targetPitch + dy, -0.85, 0.85); interactionUntil = performance.now() + 2500; renderDemand(); }
  function reset() {
    targetYaw = 0; targetPitch = 0.10; zoom = 1; globe.rotation.y = -1.92; cloudAngle = 0; clouds.rotation.y = 0; uniforms.uCloudOffset.value = 0;
    setView('sunrise'); renderDemand();
  }
  function pointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { canvas.setPointerCapture(event.pointerId); } catch { /* A cancelled gesture has no capture. */ }
    canvas.style.cursor = 'grabbing'; interactionUntil = performance.now() + 2500;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDistance = Math.hypot(a.x - b.x, a.y - b.y); }
  }
  function pointerMove(event) {
    const previous = pointers.get(event.pointerId); if (!previous) return;
    const next = { x: event.clientX, y: event.clientY }; pointers.set(event.pointerId, next);
    if (pointers.size === 1) stepOrbit(-(next.x - previous.x) * 0.005, (next.y - previous.y) * 0.004);
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) setZoom(zoom * distance / pinchDistance); pinchDistance = distance;
    }
  }
  function pointerUp(event) { pointers.delete(event.pointerId); pinchDistance = 0; if (!pointers.size) canvas.style.cursor = 'grab'; interactionUntil = performance.now() + 2500; }
  function dispose() {
    if (disposed) return; disposed = true; qualityToken++; if (raf) cancelAnimationFrame(raf);
    resizeObserver.disconnect(); intersectionObserver?.disconnect(); cleanups.forEach(fn => fn());
    for (const map of Object.values(maps)) map?.dispose(); black.dispose();
    scene.traverse(object => { object.geometry?.dispose(); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose()); });
    renderer.dispose(); pointers.clear();
  }
  const api = { getState, pause, resume, togglePause, setView, setQuality, setZoom, zoomBy, stepOrbit, reset, dispose };
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  bind(canvas, 'pointerdown', pointerDown); bind(canvas, 'pointermove', pointerMove);
  bind(canvas, 'pointerup', pointerUp); bind(canvas, 'pointercancel', pointerUp); bind(canvas, 'lostpointercapture', pointerUp);
  bind(canvas, 'keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const actions = { ArrowLeft: () => stepOrbit(-0.14, 0), ArrowRight: () => stepOrbit(0.14, 0), ArrowUp: () => stepOrbit(0, 0.10), ArrowDown: () => stepOrbit(0, -0.10), '+': () => zoomBy(0.12), '=': () => zoomBy(0.12), '-': () => zoomBy(-0.12), '_': () => zoomBy(-0.12), Home: reset, ' ': togglePause };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  });
  bind(canvas, 'wheel', event => { if (!event.ctrlKey) { event.preventDefault(); setZoom(zoom * Math.exp(-event.deltaY * 0.001)); } }, { passive: false });
  bind(document, 'visibilitychange', () => { schedule(); if (!document.hidden) draw(); notify(); });
  bind(motion, 'change', () => { if (motion.matches) pause(); notify(); });
  bind(canvas, 'webglcontextlost', event => { event.preventDefault(); contextLost = true; schedule(); onError(new Error('The graphics connection was interrupted.')); notify(); });
  bind(canvas, 'webglcontextrestored', () => { contextLost = false; renderDemand(); onReady(api); });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
  const intersectionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); schedule(); if (visible) draw(); notify(); }, { threshold: 0.01 }) : null;
  intersectionObserver?.observe(canvas);
  onStatus('Loading Earth imagery…');
  try {
    const day = await loadTexture('earth-day-2k.webp');
    if (disposed) { day.dispose(); return api; }
    applyMap('day', day);
    const layers = await Promise.allSettled([loadTexture('earth-night-2k.webp'), loadTexture('earth-clouds-2k.webp', false)]);
    layers.forEach((result, i) => { if (result.status === 'fulfilled') applyMap(i === 0 ? 'night' : 'clouds', result.value); });
    if (disposed) return api;
    ready = true; resize(); draw(); schedule();
    onStatus('Earth ready.'); onReady(api); notify();
    if (tierFor(quality) !== '2k') void setQuality(quality);
    return api;
  } catch (error) {
    onError(error); dispose(); throw error;
  }
}
