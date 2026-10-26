/**
 * Cinematic Earth + instanced satellites.
 * Earth is texture-fixed (ECEF). The Sun and satellites follow the simulation clock.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { DerivedState, Geodetic, QualityTier, SourceFacts } from "../types";
import { ecefToScene, geodeticToEcef, orbitPolyline, sunEcefUnit } from "../orbit/math";
import { satrecFromFacts } from "../orbit/math";

export interface EngineHooks {
  onPick: (norad: number | null) => void;
  onHover: (norad: number | null, name: string | null, x: number, y: number) => void;
  announce: (msg: string) => void;
}

const DAY_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const DAY_FRAG = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D cloudMap;
uniform vec3 sunDir;
uniform float hasDay;
uniform float hasNight;
uniform float hasCloud;
uniform float cloudsOn;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 n = normalize(vNormal);
  float ndl = dot(n, normalize(sunDir));
  float dayF = smoothstep(-0.08, 0.18, ndl);
  vec3 dayC = hasDay > 0.5 ? texture2D(dayMap, vUv).rgb : vec3(0.07, 0.18, 0.38);
  vec3 nightC = hasNight > 0.5 ? texture2D(nightMap, vUv).rgb * 1.4 : vec3(0.01, 0.02, 0.05);
  vec3 base = mix(nightC + vec3(0.02, 0.03, 0.06), dayC, dayF);
  if (hasCloud > 0.5 && cloudsOn > 0.5) {
    float c = texture2D(cloudMap, vUv).r;
    base = mix(base, vec3(0.92, 0.95, 0.98), c * 0.55 * dayF);
  }
  float spec = pow(max(ndl, 0.0), 24.0) * 0.12 * dayF;
  float fres = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
  base += spec + vec3(0.05, 0.12, 0.2) * fres * 0.15;
  gl_FragColor = vec4(base, 1.0);
}
`;

export class OrbitalEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private earth = new THREE.Group();
  private clouds: THREE.Mesh | null = null;
  private atmo: THREE.Mesh | null = null;
  private sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  private markers: THREE.InstancedMesh | null = null;
  private markerIndex = new Map<number, number>();
  private indexNorad: number[] = [];
  private lastBuf: Float32Array | null = null;
  private lastBufAt = 0;
  private prevBuf: Float32Array | null = null;
  private prevBufAt = 0;
  private selected: number | null = null;
  private follow = false;
  private orbitLine: THREE.Line | null = null;
  private groundLine: THREE.Line | null = null;
  private observerMesh: THREE.Mesh | null = null;
  private pick = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private quality: QualityTier;
  private reducedMotion: boolean;
  private disposed = false;
  private texLoader = new THREE.TextureLoader();
  private earthMat: THREE.ShaderMaterial;
  private hoverNorad: number | null = null;
  private objects: SourceFacts[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: EngineHooks,
    quality: QualityTier,
    reducedMotion: boolean,
  ) {
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    const gl2 = canvas.getContext("webgl2", { antialias: quality !== "low", alpha: false, powerPreference: "high-performance" });
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl2 || undefined,
      antialias: quality !== "low",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x07111f, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 40);
    this.camera.position.set(0.2, 0.55, 2.6);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = !reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.15;
    this.controls.maxDistance = 8;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.7;
    this.controls.autoRotate = !reducedMotion;
    this.controls.autoRotateSpeed = 0.18;
    this.scene.fog = new THREE.FogExp2(0x07111f, 0.012);
    this.earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: null },
        nightMap: { value: null },
        cloudMap: { value: null },
        sunDir: { value: new THREE.Vector3(1, 0.2, 0.1) },
        hasDay: { value: 0 },
        hasNight: { value: 0 },
        hasCloud: { value: 0 },
        cloudsOn: { value: quality === "high" ? 1 : 0 },
      },
      vertexShader: DAY_VERT,
      fragmentShader: DAY_FRAG,
    });
    this.buildEarth();
    this.buildStars();
    this.sun.position.set(4, 1, 0.4);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0x6b99be, 0.18));
    this.resize();
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerdown", this.onDown);
    window.addEventListener("resize", this.resize);
    this.loadTextures();
  }

  setQuality(q: QualityTier): void {
    this.quality = q;
    this.earthMat.uniforms.cloudsOn.value = q === "high" ? 1 : 0;
    if (this.clouds) this.clouds.visible = q !== "low";
    if (this.atmo) this.atmo.visible = q !== "low";
    this.renderer.setPixelRatio(this.pixelRatio());
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    this.controls.enableDamping = !on;
    this.controls.autoRotate = !on && !this.follow && !this.selected;
  }

  private pixelRatio(): number {
    const dpr = window.devicePixelRatio || 1;
    if (this.quality === "low") return Math.min(1, dpr);
    if (this.quality === "balanced") return Math.min(1.5, dpr);
    return Math.min(2, dpr);
  }

  private buildEarth(): void {
    const seg = this.quality === "high" ? 96 : this.quality === "balanced" ? 64 : 32;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg), this.earthMat);
    this.earth.add(globe);
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.008, seg, seg),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }),
    );
    this.clouds.visible = this.quality !== "low";
    this.earth.add(this.clouds);
    this.atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.045, 48, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: { sunDir: { value: new THREE.Vector3(1, 0.2, 0) } },
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){ float f = pow(1.0 - abs(vN.z), 2.4); gl_FragColor = vec4(0.21, 0.84, 0.94, f * 0.55); }`,
      }),
    );
    this.atmo.visible = this.quality !== "low";
    this.earth.add(this.atmo);
    this.scene.add(this.earth);
  }

  private buildStars(): void {
    const n = this.quality === "low" ? 800 : 2200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const v = Math.random() * 2 - 1;
      const w = Math.random() * 2 - 1;
      const m = Math.hypot(u, v, w) || 1;
      pos[i * 3] = (u / m) * 18;
      pos[i * 3 + 1] = (v / m) * 18;
      pos[i * 3 + 2] = (w / m) * 18;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8f2fa, size: 0.018, sizeAttenuation: true, transparent: true, opacity: 0.7 })));
  }

  private loadTextures(): void {
    const base = import.meta.env.BASE_URL + "textures/";
    const day = this.quality === "high" ? "earth-day-2k.jpg" : "earth-day-1k.jpg";
    this.texLoader.load(
      base + day,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        this.earthMat.uniforms.dayMap.value = t;
        this.earthMat.uniforms.hasDay.value = 1;
      },
      undefined,
      () => this.hooks.announce("Earth day texture unavailable. Using the procedural globe."),
    );
    if (this.quality !== "low") {
      this.texLoader.load(base + "earth-night-1k.jpg", (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        this.earthMat.uniforms.nightMap.value = t;
        this.earthMat.uniforms.hasNight.value = 1;
      });
      this.texLoader.load(base + "earth-clouds-1k.jpg", (t) => {
        this.earthMat.uniforms.cloudMap.value = t;
        this.earthMat.uniforms.hasCloud.value = 1;
      });
    }
  }

  setObjects(objects: SourceFacts[], density: "full" | "reduced" | "sparse"): void {
    this.objects = objects;
    this.markerIndex.clear();
    this.indexNorad = [];
    if (this.markers) {
      this.scene.remove(this.markers);
      this.markers.geometry.dispose();
      (this.markers.material as THREE.Material).dispose();
      this.markers = null;
    }
    const cap = density === "full" ? 12000 : density === "reduced" ? 3500 : 900;
    const list = objects.length > cap ? stride(objects, cap) : objects;
    const geo = new THREE.SphereGeometry(this.quality === "low" ? 0.006 : 0.0045, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.markers = new THREE.InstancedMesh(geo, mat, list.length);
    this.markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const colors = new Float32Array(list.length * 3);
    list.forEach((o, i) => {
      this.markerIndex.set(o.norad, i);
      this.indexNorad[i] = o.norad;
      const c = colorFor(o);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      this.dummy.position.set(0, 0, 0);
      this.dummy.scale.setScalar(o.norad === 25544 ? 2.2 : 1);
      this.dummy.updateMatrix();
      this.markers!.setMatrixAt(i, this.dummy.matrix);
    });
    this.markers.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    this.scene.add(this.markers);
  }

  applyPositions(buffer: Float32Array, timeMs: number): void {
    this.prevBuf = this.lastBuf;
    this.prevBufAt = this.lastBufAt;
    this.lastBuf = buffer;
    this.lastBufAt = timeMs;
  }

  private sampleBuffer(buf: Float32Array, norad: number): { x: number; y: number; z: number } | null {
    for (let i = 0; i < buf.length; i += 8) {
      if (buf[i] === norad) return { x: buf[i + 1], y: buf[i + 2], z: buf[i + 3] };
    }
    return null;
  }

  interpolate(nowMs: number): void {
    if (!this.markers || !this.lastBuf) return;
    const a = this.prevBuf;
    const t0 = this.prevBufAt;
    const t1 = this.lastBufAt;
    const u = a && t1 > t0 ? Math.min(1, Math.max(0, (nowMs - t0) / (t1 - t0))) : 1;
    const count = this.markers.count;
    const map = new Map<number, number>();
    for (let i = 0; i < this.lastBuf.length; i += 8) map.set(this.lastBuf[i], i);
    const mapA = new Map<number, number>();
    if (a) for (let i = 0; i < a.length; i += 8) mapA.set(a[i], i);
    for (let i = 0; i < count; i++) {
      const norad = this.indexNorad[i];
      const j = map.get(norad);
      if (j == null) continue;
      let x = this.lastBuf[j + 1], y = this.lastBuf[j + 2], z = this.lastBuf[j + 3];
      const ja = mapA.get(norad);
      if (ja != null && a) {
        x = a[ja + 1] + (x - a[ja + 1]) * u;
        y = a[ja + 2] + (y - a[ja + 2]) * u;
        z = a[ja + 3] + (z - a[ja + 3]) * u;
      }
      const scale = norad === this.selected ? 2.8 : norad === 25544 ? 2.1 : 1;
      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.markers.setMatrixAt(i, this.dummy.matrix);
    }
    this.markers.instanceMatrix.needsUpdate = true;
  }

  setSun(date: Date): void {
    const s = sunEcefUnit(date);
    this.earthMat.uniforms.sunDir.value.set(s.x, s.y, s.z);
    this.sun.position.set(s.x * 6, s.y * 6, s.z * 6);
  }

  setSelected(norad: number | null, facts: SourceFacts | null, date: Date): void {
    this.selected = norad;
    this.controls.autoRotate = !this.reducedMotion && !norad && !this.follow;
    this.clearTrail();
    if (!norad || !facts) return;
    const rec = satrecFromFacts(facts);
    if (!rec) return;
    const path = orbitPolyline(rec, date, facts.meanMotionRevPerDay, facts.norad, 120);
    this.orbitLine = this.lineFrom(path, 0x36d5ef, false);
    this.scene.add(this.orbitLine);
  }

  showGroundTrack(facts: SourceFacts, date: Date): void {
    if (this.groundLine) {
      this.scene.remove(this.groundLine);
      this.groundLine.geometry.dispose();
      this.groundLine = null;
    }
    const rec = satrecFromFacts(facts);
    if (!rec) return;
    const path = orbitPolyline(rec, date, facts.meanMotionRevPerDay, facts.norad, 160).map((p) => ({
      ...p,
      altitudeKm: 0.012,
    }));
    this.groundLine = this.lineFrom(path, 0xf2a444, true);
    this.scene.add(this.groundLine);
  }

  private lineFrom(path: Geodetic[], hex: number, dashed: boolean): THREE.Line {
    const pts = path.map((p) => {
      const s = ecefToScene(geodeticToEcef(p.latitudeDeg, p.longitudeDeg, p.altitudeKm));
      return new THREE.Vector3(s.x, s.y, s.z);
    });
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = dashed
      ? new THREE.LineDashedMaterial({ color: hex, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.75 })
      : new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(g, m);
    if (dashed) line.computeLineDistances();
    return line;
  }

  private clearTrail(): void {
    if (this.orbitLine) {
      this.scene.remove(this.orbitLine);
      this.orbitLine.geometry.dispose();
      this.orbitLine = null;
    }
    if (this.groundLine) {
      this.scene.remove(this.groundLine);
      this.groundLine.geometry.dispose();
      this.groundLine = null;
    }
  }

  setObserver(obs: Geodetic | null): void {
    if (this.observerMesh) {
      this.scene.remove(this.observerMesh);
      this.observerMesh.geometry.dispose();
      (this.observerMesh.material as THREE.Material).dispose();
      this.observerMesh = null;
    }
    if (!obs) return;
    const s = ecefToScene(geodeticToEcef(obs.latitudeDeg, obs.longitudeDeg, 0.02));
    this.observerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 12), new THREE.MeshBasicMaterial({ color: 0x48c9a5 }));
    this.observerMesh.position.set(s.x, s.y, s.z);
    this.scene.add(this.observerMesh);
  }

  flyTo(state: DerivedState, instant: boolean): void {
    const s = ecefToScene(state.ecef);
    const target = new THREE.Vector3(s.x, s.y, s.z);
    const dest = target.clone().normalize().multiplyScalar(Math.max(1.45, target.length() + 0.35));
    this.controls.autoRotate = false;
    if (instant || this.reducedMotion) {
      this.camera.position.copy(dest);
      this.controls.target.copy(target);
      return;
    }
    const startP = this.camera.position.clone();
    const startT = this.controls.target.clone();
    const t0 = performance.now();
    const step = () => {
      if (this.disposed) return;
      const u = Math.min(1, (performance.now() - t0) / 900);
      const e = 1 - Math.pow(1 - u, 3);
      this.camera.position.lerpVectors(startP, dest, e);
      this.controls.target.lerpVectors(startT, target, e);
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  setFollow(on: boolean): void {
    this.follow = on;
    this.controls.autoRotate = !on && !this.reducedMotion && !this.selected;
  }

  followSelected(state: DerivedState | null): void {
    if (!this.follow || !state) return;
    const s = ecefToScene(state.ecef);
    const target = new THREE.Vector3(s.x, s.y, s.z);
    this.controls.target.lerp(target, this.reducedMotion ? 1 : 0.12);
    const dest = target.clone().normalize().multiplyScalar(Math.max(1.4, target.length() + 0.32));
    this.camera.position.lerp(dest, this.reducedMotion ? 1 : 0.08);
  }

  groundView(obs: Geodetic): void {
    const s = ecefToScene(geodeticToEcef(obs.latitudeDeg, obs.longitudeDeg, 0.02));
    const p = new THREE.Vector3(s.x, s.y, s.z);
    this.camera.position.copy(p.clone().normalize().multiplyScalar(1.08));
    this.controls.target.copy(p);
    this.controls.autoRotate = false;
  }

  resetCamera(): void {
    this.follow = false;
    this.camera.position.set(0.2, 0.55, 2.6);
    this.controls.target.set(0, 0, 0);
    this.controls.autoRotate = !this.reducedMotion;
  }

  cinematicOverview(): void {
    this.follow = false;
    this.camera.position.set(0.1, 1.4, 3.4);
    this.controls.target.set(0, 0, 0);
    this.controls.autoRotate = !this.reducedMotion;
  }

  private onMove = (e: PointerEvent): void => {
    const id = this.hit(e);
    const facts = id != null ? this.objects.find((o) => o.norad === id) : null;
    if (id !== this.hoverNorad) {
      this.hoverNorad = id;
      this.canvas.style.cursor = id ? "pointer" : "grab";
    }
    this.hooks.onHover(id, facts?.name ?? null, e.clientX, e.clientY);
  };

  private onDown = (e: PointerEvent): void => {
    const id = this.hit(e);
    if (id != null) this.hooks.onPick(id);
  };

  private hit(e: PointerEvent): number | null {
    if (!this.markers) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.pick.setFromCamera(this.ndc, this.camera);
    const hits = this.pick.intersectObject(this.markers);
    if (!hits.length || hits[0].instanceId == null) return null;
    return this.indexNorad[hits[0].instanceId] ?? null;
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize = (): void => {
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
  };

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}

function colorFor(o: SourceFacts): THREE.Color {
  if (o.norad === 25544) return new THREE.Color(0xf2a444);
  if (o.group === "starlink") return new THREE.Color(0x36d5ef);
  if (o.group === "stations") return new THREE.Color(0x48c9a5);
  if (o.group === "weather") return new THREE.Color(0x6b99be);
  return new THREE.Color(0xe8f2fa);
}

function stride<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const out: T[] = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
