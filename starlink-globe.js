/* Starlink Tracker globe. Real CelesTrak orbits, GCAT hardware versions.
   Same Cesium + Esri stack as the software tracker. */
(() => {
  const ESRI_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
  const ESRI_CREDIT =
    "Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  const RE = 6378137;
  const HOME_RANGE = 2.05e7;
  const HOME_HEADING = 0.72;
  const HOME_PITCH = -18;
  const MIN_ZOOM = 1.2e5;
  const MAX_ZOOM = 4.4e7;
  const MODEL_SCALE = 1100;
  const MODEL_RANGE = 9.0e5;
  const MAX_MODELS = 36;
  const MAX_WIRES = 8;
  const TRACE_SAMPLES = 72;
  const GEN_IDS = ["v10", "v15", "v2m", "v2opt", "v2dtc", "v3"];
  const GEN_COLORS = {
    v10: "#8b909c",
    v15: "#b7bcc6",
    v2m: "#e2a06a",
    v2opt: "#e31937",
    v2dtc: "#5ad0ff",
    v3: "#f4f4f0",
  };

  const api = (window.StarlinkGlobe = window.StarlinkGlobe || {});
  let viewer = null;
  let started = false;
  let placed = 0;
  let spinning = false;
  let locked = false;
  let idleAt = 0;
  let points = null;
  let recs = [];
  let gens = [];
  let lastProp = 0;
  let lastModels = 0;
  let modelPool = [];
  let modelsOn = 0;
  let wires = null;
  const reduce = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const coarse = () => window.matchMedia?.("(pointer: coarse)")?.matches;
  const wrap = () => document.getElementById("sl-orbit-fig");
  const host = () => document.getElementById("sl-globe");
  const satlib = () => window.satellite;

  const hexColor = (hex, a = 0.96) => {
    const Cesium = window.Cesium;
    const c = (Cesium.Color.fromCssColorString(hex) || Cesium.Color.WHITE).clone();
    return c.withAlpha(a);
  };

  const parkPos = (i = 0) => {
    const Cesium = window.Cesium;
    return Cesium.Cartesian3.fromDegrees((i * 9.7) % 360, ((i * 13) % 60) - 30, 5.4e5);
  };

  const finite3 = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);

  const dotSize = (id) => {
    if (id === "v3") return coarse() ? 3.4 : 3.2;
    if (id === "v2dtc") return coarse() ? 2.3 : 2.15;
    if (id === "v10" || id === "v15") return coarse() ? 1.7 : 1.55;
    if (id === "v2m") return coarse() ? 1.9 : 1.75;
    return coarse() ? 1.55 : 1.45;
  };

  /* Hardware from public Starlink dimensions: V1 visor + single wing,
     V1.5 lasers, V2 Mini dual 12.8 m arrays, DTC honeycomb, V3 Starship bus. */
  const kindItems = (id) => {
    const bus = hexColor(GEN_COLORS[id], 1);
    const wing = hexColor("#8aa0bc", 0.95);
    const nadir = hexColor("#d7dde6", 0.9);
    const laser = hexColor("#c5ccd6", 1);
    if (id === "v10") {
      return [
        { size: [2.8, 1.33, 0.18], at: [0, 0, 0], color: bus },
        { size: [2.8, 8.1, 0.08], at: [0, 4.72, 0.04], color: wing },
        { size: [2.35, 1.05, 0.045], at: [0, 0, -0.13], color: nadir },
        { size: [2.7, 0.1, 0.52], at: [0, 0.72, 0.28], color: hexColor("#0b0d12", 1) },
        { size: [0.3, 0.3, 0.34], at: [1.2, 0, 0.2], color: laser },
      ];
    }
    if (id === "v15") {
      return [
        { size: [2.8, 1.33, 0.18], at: [0, 0, 0], color: bus },
        { size: [2.8, 8.1, 0.08], at: [0, 4.72, 0.04], color: wing },
        { size: [2.4, 1.1, 0.045], at: [0, 0, -0.13], color: nadir },
        { size: [0.22, 0.22, 0.22], at: [1.2, 0.42, 0.16], color: laser },
        { size: [0.22, 0.22, 0.22], at: [-1.2, 0.42, 0.16], color: laser },
        { size: [0.22, 0.22, 0.22], at: [1.2, -0.42, 0.16], color: laser },
        { size: [0.22, 0.22, 0.22], at: [-1.2, -0.42, 0.16], color: laser },
      ];
    }
    if (id === "v2m" || id === "v2opt") {
      const thick = id === "v2opt" ? 0.16 : 0.22;
      return [
        { size: [4.1, 2.7, thick], at: [0, 0, 0], color: bus },
        { size: [4.1, 12.8, 0.09], at: [0, 7.75, 0.05], color: wing },
        { size: [4.1, 12.8, 0.09], at: [0, -7.75, 0.05], color: wing },
        { size: [3.4, 2.1, 0.05], at: [0, 0, -0.14], color: nadir },
        { size: [0.28, 0.28, 0.28], at: [1.7, 1.05, 0.2], color: laser },
        { size: [0.28, 0.28, 0.28], at: [-1.7, 1.05, 0.2], color: laser },
        { size: [0.28, 0.28, 0.28], at: [1.7, -1.05, 0.2], color: laser },
        { size: [0.28, 0.28, 0.28], at: [-1.7, -1.05, 0.2], color: laser },
      ];
    }
    if (id === "v2dtc") {
      return [
        { size: [4.1, 2.7, 0.22], at: [0, 0, 0], color: bus },
        { size: [4.1, 12.8, 0.09], at: [0, 7.75, 0.05], color: wing },
        { size: [4.1, 12.8, 0.09], at: [0, -7.75, 0.05], color: wing },
        { size: [3.6, 2.2, 0.05], at: [0, 0, -0.14], color: nadir },
        { size: [3.5, 2.5, 0.2], at: [0, 0, -0.34], color: hexColor("#d4a84b", 1) },
        { size: [3.1, 2.0, 0.08], at: [0, 0, 0.22], color: hexColor("#5ad0ff", 0.95) },
        { size: [0.28, 0.28, 0.28], at: [1.7, 1.05, 0.2], color: laser },
        { size: [0.28, 0.28, 0.28], at: [-1.7, 1.05, 0.2], color: laser },
      ];
    }
    return [
      { size: [7.0, 3.4, 0.34], at: [0, 0, 0], color: bus },
        { size: [6.4, 18.0, 0.1], at: [0, 10.7, 0.06], color: wing },
        { size: [6.4, 18.0, 0.1], at: [0, -10.7, 0.06], color: wing },
      { size: [5.8, 2.8, 0.08], at: [0, 0, -0.22], color: nadir },
      { size: [5.2, 1.2, 0.22], at: [0, 0, 0.28], color: hexColor("#e6e8ee", 1) },
      { size: [0.4, 0.4, 0.4], at: [2.6, 1.2, 0.28], color: laser },
      { size: [0.4, 0.4, 0.4], at: [-2.6, 1.2, 0.28], color: laser },
      { size: [0.4, 0.4, 0.4], at: [2.6, -1.2, 0.28], color: laser },
    ];
  };

  const loadRecs = () => {
    const sat = satlib();
    const gp = window.STARLINK_GP;
    recs = [];
    gens = [];
    if (!sat || !gp?.tle) return 0;
    gp.tle.forEach((row) => {
      const gi = row[0];
      try {
        const rec = sat.twoline2satrec(row[1], row[2]);
        if (!rec || rec.error) return;
        recs.push(rec);
        gens.push(GEN_IDS[gi] || "v2opt");
      } catch {
        /* skip a bad TLE */
      }
    });
    return recs.length;
  };

  const ecef = (rec, date) => {
    const sat = satlib();
    const Cesium = window.Cesium;
    if (!sat || !Cesium) return null;
    try {
      const pv = sat.propagate(rec, date);
      if (!finite3(pv?.position) || !finite3(pv?.velocity)) return null;
      const gmst = sat.gstime(date);
      const p = sat.eciToEcf(pv.position, gmst);
      const v = sat.eciToEcf(pv.velocity, gmst);
      if (!finite3(p) || !finite3(v)) return null;
      const pos = new Cesium.Cartesian3(p.x * 1000, p.y * 1000, p.z * 1000);
      const vel = new Cesium.Cartesian3(v.x * 1000, v.y * 1000, v.z * 1000);
      const mag = Cesium.Cartesian3.magnitude(pos);
      if (mag < RE * 0.95 || mag > RE + 2.2e6) return null;
      if (Cesium.Cartesian3.magnitude(vel) < 200) return null;
      return { pos, vel };
    } catch {
      return null;
    }
  };

  const attitude = (pos, vel) => {
    const Cesium = window.Cesium;
    if (Cesium.Cartesian3.magnitude(pos) < 1 || Cesium.Cartesian3.magnitude(vel) < 1) {
      return Cesium.Quaternion.IDENTITY.clone();
    }
    const up = Cesium.Cartesian3.normalize(pos, new Cesium.Cartesian3());
    const along = Cesium.Cartesian3.normalize(vel, new Cesium.Cartesian3());
    const right = Cesium.Cartesian3.cross(along, up, new Cesium.Cartesian3());
    if (Cesium.Cartesian3.magnitudeSquared(right) < 1e-10) {
      return Cesium.Quaternion.IDENTITY.clone();
    }
    Cesium.Cartesian3.normalize(right, right);
    Cesium.Cartesian3.cross(up, right, along);
    Cesium.Cartesian3.normalize(along, along);
    const m = new Cesium.Matrix3();
    Cesium.Matrix3.setColumn(m, 0, along, m);
    Cesium.Matrix3.setColumn(m, 1, right, m);
    Cesium.Matrix3.setColumn(m, 2, Cesium.Cartesian3.negate(up, new Cesium.Cartesian3()), m);
    return Cesium.Quaternion.fromRotationMatrix(m);
  };

  const paintPoints = (date) => {
    const Cesium = window.Cesium;
    if (!viewer) return 0;
    if (!points) {
      points = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      const nearFar = new Cesium.NearFarScalar(4.8e4, 8.5, 1.95e7, 1);
      const fade = new Cesium.NearFarScalar(3.2e4, 1, 2.35e7, 0.9);
      recs.forEach((_, i) => {
        const id = gens[i];
        points.add({
          position: parkPos(i),
          color: hexColor(GEN_COLORS[id]),
          pixelSize: dotSize(id),
          scaleByDistance: nearFar,
          translucencyByDistance: fade,
          outlineColor: Cesium.Color.TRANSPARENT,
          outlineWidth: 0,
          disableDepthTestDistance: 0,
        });
      });
    }
    let n = 0;
    recs.forEach((rec, i) => {
      const pv = ecef(rec, date);
      const pt = points.get(i);
      if (!pv) {
        pt.show = false;
        rec._pos = null;
        rec._vel = null;
        return;
      }
      pt.show = true;
      pt.position = pv.pos;
      rec._pos = pv.pos;
      rec._vel = pv.vel;
      n += 1;
    });
    lastProp = performance.now();
    return n;
  };

  const setPositions = (prop, positions) => {
    if (!prop) return;
    if (typeof prop.setValue === "function") prop.setValue(positions);
    else if (prop.polyline) prop.polyline.positions = positions;
  };

  const localToWorld = (q, origin, local) => {
    const Cesium = window.Cesium;
    const off = new Cesium.Cartesian3(local[0], local[1], local[2]);
    const rot = Cesium.Matrix3.fromQuaternion(q);
    const worldOff = Cesium.Matrix3.multiplyByVector(rot, off, new Cesium.Cartesian3());
    return Cesium.Cartesian3.add(origin, worldOff, new Cesium.Cartesian3());
  };

  const rectLoop = (q, origin, size, at) => {
    const hx = (size[0] / 2) * MODEL_SCALE;
    const hy = (size[1] / 2) * MODEL_SCALE;
    const ax = at[0] * MODEL_SCALE;
    const ay = at[1] * MODEL_SCALE;
    const az = at[2] * MODEL_SCALE;
    return [
      [-hx + ax, -hy + ay, az],
      [hx + ax, -hy + ay, az],
      [hx + ax, hy + ay, az],
      [-hx + ax, hy + ay, az],
      [-hx + ax, -hy + ay, az],
    ].map((c) => localToWorld(q, origin, c));
  };

  const ensureModels = () => {
    if (modelPool.length) return;
    const Cesium = window.Cesium;
    wires = viewer.scene.primitives.add(new Cesium.PolylineCollection());
    const none = Cesium.ArcType?.NONE;
    for (let i = 0; i < MAX_MODELS; i++) {
      const parked = parkPos(i);
      const frame = [];
      for (let w = 0; w < MAX_WIRES; w++) {
        frame.push(
          wires.add({
            show: false,
            width: 2,
            material: Cesium.Material.fromType("Color", { color: Cesium.Color.WHITE }),
            positions: [parked, parkPos(i + 1)],
          })
        );
      }
      const trace = viewer.entities.add({
        show: false,
        polyline: {
          positions: [parked, parkPos(i + 3)],
          width: 1.4,
          material: hexColor("#ffffff", 0.45),
          clampToGround: false,
          arcType: none,
          shadows: Cesium.ShadowMode.DISABLED,
        },
      });
      modelPool.push({ frame, trace, rec: null, tracedAt: 0 });
    }
  };

  const hideModels = () => {
    modelPool.forEach((slot) => {
      slot.frame?.forEach((line) => {
        line.show = false;
      });
      if (slot.trace) slot.trace.show = false;
      slot.rec = null;
    });
    modelsOn = 0;
  };

  const applyKind = (slot, kindId, pos, vel) => {
    if (!finite3(pos) || !finite3(vel)) return;
    const q = attitude(pos, vel);
    const spec = kindItems(kindId);
    const paths = spec.map((item) => ({
      pts: rectLoop(q, pos, item.size, item.at),
      color: item.color,
      width: kindId === "v3" ? 2.6 : 2,
    }));
    if (spec.wings?.length > 1 || spec[1]) {
      const tips = [];
      spec.forEach((item, i) => {
        if (i === 0) return;
        if (item.size[1] > 6) {
          const hy = (item.size[1] / 2) * MODEL_SCALE;
          tips.push(localToWorld(q, pos, [item.at[0] * MODEL_SCALE, item.at[1] * MODEL_SCALE + hy, item.at[2] * MODEL_SCALE]));
          tips.push(localToWorld(q, pos, [item.at[0] * MODEL_SCALE, item.at[1] * MODEL_SCALE - hy, item.at[2] * MODEL_SCALE]));
        }
      });
      if (tips.length >= 2) {
        paths.push({ pts: [tips[0], tips[tips.length - 1]], color: hexColor("#1a2433", 0.9), width: 2.1 });
      }
    }
    slot.frame.forEach((line, i) => {
      const path = paths[i];
      if (!path || path.pts.length < 2 || path.pts.some((p) => !finite3(p))) {
        line.show = false;
        return;
      }
      line.positions = path.pts;
      if (line.material?.uniforms) line.material.uniforms.color = path.color;
      line.width = path.width;
      line.show = true;
    });
  };

  const orbitTrace = (rec, date) => {
    const Cesium = window.Cesium;
    const n = rec.no || rec.no_kozai || 0;
    if (!Number.isFinite(n) || n <= 0) return [];
    const periodMin = Math.min(140, Math.max(85, (2 * Math.PI) / n));
    const pts = [];
    let last = null;
    for (let i = 0; i <= TRACE_SAMPLES; i++) {
      const t = new Date(date.getTime() + (i / TRACE_SAMPLES - 0.5) * periodMin * 60000);
      const pv = ecef(rec, t);
      if (!pv) continue;
      if (last && Cesium.Cartesian3.distance(last, pv.pos) > 2.8e6) continue;
      pts.push(pv.pos);
      last = pv.pos;
    }
    return pts;
  };

  const updateModels = (date) => {
    const Cesium = window.Cesium;
    if (!viewer || !points) return;
    const cam = viewer.camera.positionWC;
    const cart = viewer.camera.positionCartographic;
    const height = cart && Number.isFinite(cart.height) ? cart.height : HOME_RANGE;
    if (height > 2.2e6) {
      hideModels();
      return;
    }
    ensureModels();
    const scored = [];
    recs.forEach((rec, i) => {
      if (!finite3(rec._pos)) return;
      const d = Cesium.Cartesian3.distance(cam, rec._pos);
      if (d < MODEL_RANGE) scored.push({ i, d, rec });
    });
    scored.sort((a, b) => a.d - b.d);
    const pick = scored.slice(0, MAX_MODELS);
    const modeled = new Set(pick.map((p) => p.i));
    modelsOn = pick.length;
    for (let i = 0; i < points.length; i++) {
      const pt = points.get(i);
      if (!pt || !recs[i]?._pos) continue;
      const d = Cesium.Cartesian3.distance(cam, recs[i]._pos);
      if (modeled.has(i) && d < 2.4e4) pt.show = false;
    }
    for (let s = 0; s < MAX_MODELS; s++) {
      const slot = modelPool[s];
      const hit = pick[s];
      if (!hit) {
        slot.frame?.forEach((line) => {
          line.show = false;
        });
        if (slot.trace) slot.trace.show = false;
        slot.rec = null;
        continue;
      }
      const id = gens[hit.i];
      applyKind(slot, id, hit.rec._pos, hit.rec._vel);
      const needPath = slot.rec !== hit.rec || !slot.tracedAt || date.getTime() - slot.tracedAt > 3000;
      if (needPath && slot.trace) {
        const path = orbitTrace(hit.rec, date);
        if (path.length > 8) {
          setPositions(slot.trace.polyline.positions, path);
          slot.trace.polyline.material = hexColor(GEN_COLORS[id], 0.55);
          slot.trace.polyline.width = id === "v3" ? 2.4 : id === "v2dtc" ? 1.7 : 1.35;
          slot.trace.show = true;
          slot.tracedAt = date.getTime();
        } else if (slot.trace) {
          slot.trace.show = false;
        }
      }
      slot.rec = hit.rec;
    }
  };

  // One clock for lighting and orbits: the Cesium scene clock (system time).
  const simNow = () => (viewer && window.Cesium ? window.Cesium.JulianDate.toDate(viewer.clock.currentTime) : new Date());
  const darkenNight = () => {
    const layers = viewer.imageryLayers;
    for (let i = 0; i < layers.length; i++) { const l = layers.get(i); l.dayAlpha = 1; l.nightAlpha = 0.35; }
  };

  async function addImagery() {
    const Cesium = window.Cesium;
    const layers = viewer.imageryLayers;
    layers.removeAll();
    try {
      if (Cesium.ArcGisMapServerImageryProvider?.fromUrl) {
        const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(ESRI_URL, {
          credit: ESRI_CREDIT,
          enablePickFeatures: false,
        });
        layers.addImageryProvider(provider);
        return;
      }
    } catch {
      /* OSM fallback */
    }
    layers.addImageryProvider(
      new Cesium.OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
        credit: "© OpenStreetMap contributors",
      })
    );
  }

  const setReset = (on) => {
    const btn = document.getElementById("sl-globe-reset");
    if (btn) btn.hidden = !on;
    wrap()?.classList.toggle("is-zoomed", on);
  };

  const setZoomLimits = () => {
    if (!viewer) return;
    const control = viewer.scene.screenSpaceCameraController;
    control.minimumZoomDistance = locked ? RE + MIN_ZOOM : MIN_ZOOM;
    control.maximumZoomDistance = MAX_ZOOM;
  };

  const lockHome = () => {
    const Cesium = window.Cesium;
    viewer.camera.lookAt(
      Cesium.Cartesian3.ZERO,
      new Cesium.HeadingPitchRange(HOME_HEADING, Cesium.Math.toRadians(HOME_PITCH), HOME_RANGE)
    );
    locked = true;
    spinning = !reduce();
    setZoomLimits();
    setReset(false);
    hideModels();
  };

  const unlock = () => {
    if (!viewer || !locked) return;
    viewer.camera.lookAtTransform(window.Cesium.Matrix4.IDENTITY);
    locked = false;
    spinning = false;
    setZoomLimits();
    setReset(true);
  };


  // Zoom pill (+ / vertical slider / −), log scale on camera height. Same look as the 3D explorers.
  const ZOOM_MIN_H = MIN_ZOOM, ZOOM_MAX_H = MAX_ZOOM - RE * 0.2;
  const bindZoomUI = (onUse) => {
    const Cesium = window.Cesium;
    const stage = wrap()?.querySelector(".sl-orbit-stage");
    if (!stage || stage.querySelector(".sl-zoom")) return;
    const el = document.createElement("div");
    el.className = "sl-zoom m3x-zoom";
    el.innerHTML = '<button type="button" class="m3x-zoom-in" aria-label="Zoom in">+</button>' +
      '<input type="range" class="m3x-zoom-range" min="0" max="100" step="0.5" value="0" aria-label="Globe zoom" aria-orientation="vertical" />' +
      '<button type="button" class="m3x-zoom-out" aria-label="Zoom out">\u2212</button>';
    stage.appendChild(el);
    const range = el.querySelector("input");
    const lo = Math.log(ZOOM_MIN_H), hi = Math.log(ZOOM_MAX_H);
    const height = () => { const c = viewer.camera.positionCartographic; return c && Number.isFinite(c.height) ? c.height : HOME_RANGE - RE; };
    const toVal = (h) => Math.min(100, Math.max(0, (100 * (hi - Math.log(Math.max(h, 1)))) / (hi - lo)));
    const toH = (v) => Math.exp(hi - (v / 100) * (hi - lo));
    let dragging = false;
    const sync = (force) => {
      if (dragging && !force) return;
      const v = Math.round(toVal(height()) * 2) / 2;
      if (+range.value !== v) range.value = v;
      range.setAttribute("aria-valuetext", Math.round(height() / 1000).toLocaleString() + " km altitude");
    };
    const setHeight = (h) => {
      h = Math.min(ZOOM_MAX_H, Math.max(ZOOM_MIN_H, h));
      onUse();
      const cam = viewer.camera;
      const cur = height();
      const p = Cesium.Cartesian3.clone(cam.positionWC);
      const mag = Cesium.Cartesian3.magnitude(p);
      const dest = Cesium.Cartesian3.multiplyByScalar(p, (mag + (h - cur)) / mag, new Cesium.Cartesian3());
      cam.setView({ destination: dest, orientation: { heading: cam.heading, pitch: cam.pitch, roll: cam.roll } });
      viewer.scene.requestRender();
      sync(true);
    };
    range.addEventListener("input", () => { dragging = true; setHeight(toH(+range.value)); });
    ["change", "pointerup", "blur"].forEach((t) => range.addEventListener(t, () => { dragging = false; }));
    el.querySelector(".m3x-zoom-in").addEventListener("click", () => setHeight(height() / 1.6));
    el.querySelector(".m3x-zoom-out").addEventListener("click", () => setHeight(height() * 1.6));
    ["pointerdown", "wheel", "touchstart"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation(), { passive: true }));
    viewer.camera.percentageChanged = 0.01;
    viewer.camera.changed.addEventListener(() => sync());
    viewer.camera.moveEnd.addEventListener(() => sync());
    let lastSync = 0;
    viewer.scene.postRender.addEventListener(() => { const n = performance.now(); if (n - lastSync > 200) { lastSync = n; sync(); } });
    sync(true);
  };
  const bindControls = () => {
    const Cesium = window.Cesium;
    const canvas = viewer.scene.canvas;
    const onUse = () => {
      unlock();
      idleAt = performance.now() + 10000;
    };
    canvas.addEventListener("pointerdown", onUse, { capture: true });
    canvas.addEventListener("wheel", onUse, { passive: true, capture: true });
    canvas.addEventListener("touchstart", onUse, { capture: true, passive: true });
    bindZoomUI(onUse);
    document.getElementById("sl-globe-reset")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      lockHome();
    });
    viewer.scene.preUpdate.addEventListener(() => {
      const frustum = viewer.camera.frustum;
      if (frustum && frustum.near !== undefined) {
        frustum.near = locked ? 1000 : 40;
        frustum.far = 8.0e7;
      }
      if (reduce() || !locked) return;
      if (!spinning && performance.now() > idleAt) spinning = true;
      if (!spinning) return;
      viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, coarse() ? -0.0007 : -0.00105);
    });
    viewer.scene.preRender.addEventListener(() => {
      try {
        const now = performance.now();
        const cart = viewer.camera.positionCartographic;
        const height = cart && Number.isFinite(cart.height) ? cart.height : HOME_RANGE;
        const interval = height < 2.2e6 ? 2500 : 10000;
        if (now - lastProp > interval) {
          placed = paintPoints(simNow());
        }
        if (!locked && now - lastModels > 140) {
          updateModels(simNow());
          lastModels = now;
        }
      } catch (err) {
        api.lastError = String(err && err.message ? err.message : err);
      }
    });
    if (viewer.scene.renderError) {
      viewer.scene.renderError.addEventListener((_scene, error) => {
        api.lastError = String(error && error.message ? error.message : error);
      });
    }
    spinning = !reduce();
  };

  const show = () => {
    const el = host();
    const box = wrap();
    if (!el || !box) return;
    box.classList.add("is-globe");
    box.removeAttribute("aria-hidden");
    const cap = document.getElementById("sl-globe-cap");
    const credit = document.getElementById("sl-globe-credit");
    if (cap) {
      const n = (placed || window.STARLINK_GP?.total || 0).toLocaleString("en-US");
      cap.querySelector("[data-sl-count]")?.replaceChildren(document.createTextNode(n));
    }
    if (credit) credit.hidden = false;
  };

  const sharpen = () => {
    const Cesium = window.Cesium;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse() ? 1.5 : 2);
    viewer.resolutionScale = dpr;
    viewer.scene.fxaa = true;
    viewer.scene.globe.maximumScreenSpaceError = coarse() ? 1.55 : 1.05;
    viewer.scene.globe.tileCacheSize = 400;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    if ("logarithmicDepthBuffer" in viewer.scene) {
      viewer.scene.logarithmicDepthBuffer = true;
    }
    viewer.scene.globe.preloadAncestors = true;
    viewer.scene.globe.preloadSiblings = true;
    if (viewer.scene.fog) {
      viewer.scene.fog.density = 2.2e-4;
      viewer.scene.fog.screenSpaceErrorFactor = 2;
    }
    const control = viewer.scene.screenSpaceCameraController;
    control.enableTilt = true;
    control.enableLook = true;
    control.enableRotate = true;
    control.enableTranslate = true;
    control.enableZoom = true;
    control.enableCollisionDetection = true;
    control.minimumZoomDistance = MIN_ZOOM;
    control.maximumZoomDistance = MAX_ZOOM;
    control.inertiaZoom = 0.82;
    control.inertiaSpin = 0.88;
    control.inertiaTranslate = 0.82;
    control.minimumZoomRate = 80;
    control.maximumZoomRate = 8.5e6;
    control.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH,
      Cesium.CameraEventType.RIGHT_DRAG,
    ];
  };

  async function boot() {
    if (started || !window.Cesium || !host() || !window.STARLINK) return;
    if (!satlib() || !window.STARLINK_GP) return;
    started = true;
    const Cesium = window.Cesium;
    if (Cesium.Ion) Cesium.Ion.defaultAccessToken = "";
    const creditHost = document.getElementById("sl-globe-cesium-credit");
    try {
      viewer = new Cesium.Viewer(host(), {
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        vrButton: false,
        infoBox: false,
        selectionIndicator: false,
        baseLayer: false,
        creditContainer: creditHost || undefined,
        msaaSamples: coarse() ? 2 : 4,
        requestRenderMode: false,
      });
    } catch {
      started = false;
      viewer = null;
      return;
    }
    viewer.targetFrameRate = coarse() ? 30 : 60;
    // Real-time day/night: the Sun position comes from the scene clock, which runs on the system clock
    // (same wall-clock time the SGP4 propagation uses via simNow()).
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK;
    viewer.clock.multiplier = 1;
    viewer.clock.shouldAnimate = true;
    viewer.clock.currentTime = Cesium.JulianDate.now();
    // Keep lighting and the darker night side at every zoom level (Cesium fades them out close in by default).
    viewer.scene.globe.dynamicAtmosphereLighting = true;
    viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
    viewer.scene.globe.lightingFadeOutDistance = 1;
    viewer.scene.globe.lightingFadeInDistance = 2;
    viewer.scene.globe.nightFadeOutDistance = 1;
    viewer.scene.globe.nightFadeInDistance = 2;
    viewer.scene.globe.show = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0c1620");
    viewer.scene.globe.undergroundColor = Cesium.Color.fromCssColorString("#07080c");
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#07080c");
    viewer.scene.globe.backFaceCulling = true;
    viewer.scene.fog.enabled = true;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.atmosphereLightIntensity = 18;
      viewer.scene.skyAtmosphere.saturationShift = -0.12;
      viewer.scene.skyAtmosphere.brightnessShift = -0.08;
    }
    if (viewer.scene.sun) viewer.scene.sun.show = true;
    if (viewer.scene.moon) viewer.scene.moon.show = false;
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
    sharpen();
    try {
      viewer.scene.morphTo3D(0);
    } catch {
      /* already 3D */
    }
    try {
      await addImagery();
      darkenNight();
    } catch {
      started = false;
      viewer.destroy();
      viewer = null;
      return;
    }
    loadRecs();
    placed = paintPoints(simNow());
    lockHome();
    bindControls();
    show();
    viewer.resize();
    requestAnimationFrame(() => viewer?.resize());
    api.ready = true;
  }

  api.ready = false;
  api.active = () => Boolean(viewer);
  api.count = () => placed;
  api.spinning = () => spinning;
  api.locked = () => locked;
  api.real = true;
  api.lastError = "";
  api.modelsOn = () => modelsOn;
  api.debugModels = () => {
    const Cesium = window.Cesium;
    if (!viewer || !modelPool.length) return { pool: modelPool.length, modelsOn };
    const cam = viewer.camera.positionWC;
    const first = modelPool[0];
    const shown = first.frame?.filter((l) => l.show).length || 0;
    const pos = first.frame?.[0]?.positions?.[0];
    const traceOn = Boolean(first.trace?.show);
    return {
      pool: modelPool.length,
      modelsOn,
      shown,
      posMag: pos ? Cesium.Cartesian3.magnitude(pos) : null,
      lookDot: pos
        ? Cesium.Cartesian3.dot(
            viewer.camera.directionWC,
            Cesium.Cartesian3.normalize(
              Cesium.Cartesian3.subtract(pos, cam, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            )
          )
        : null,
      camMag: Cesium.Cartesian3.magnitude(cam),
      entityCount: viewer.entities.values.length,
      near: viewer.camera.frustum?.near,
      far: viewer.camera.frustum?.far,
      traceOn,
      error: api.lastError,
    };
  };
  api.genCounts = () => {
    const out = {};
    GEN_IDS.forEach((id) => {
      out[id] = gens.filter((g) => g === id).length;
    });
    return out;
  };
  api.view = () => {
    if (!viewer) return null;
    const Cesium = window.Cesium;
    const cart = viewer.camera.positionCartographic;
    if (!cart) {
      return { locked, spinning, count: placed, modelsOn, real: true, error: api.lastError };
    }
    return {
      height: cart.height,
      range: Cesium.Cartesian3.magnitude(viewer.camera.positionWC),
      lon: Cesium.Math.toDegrees(cart.longitude),
      lat: Cesium.Math.toDegrees(cart.latitude),
      locked,
      spinning,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      count: placed,
      modelsOn,
      real: true,
      error: api.lastError,
    };
  };
  api.reset = () => lockHome();
  api.unlock = () => unlock();
  api.setHeight = (height, lon = 18, lat = 22, heading = 70, pitch = -16) => {
    if (!viewer) return;
    const Cesium = window.Cesium;
    unlock();
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0,
      },
    });
    placed = paintPoints(simNow());
    updateModels(simNow());
    lastModels = performance.now();
  };
  api.flyToNearest = (kind) => {
    if (!viewer || !recs.length) return null;
    const Cesium = window.Cesium;
    placed = paintPoints(simNow());
    let best = null;
    recs.forEach((rec, i) => {
      if (kind && gens[i] !== kind) return;
      if (!finite3(rec._pos)) return;
      const cart = Cesium.Cartographic.fromCartesian(rec._pos);
      if (!cart || !Number.isFinite(cart.longitude)) return;
      const score = Math.abs(Cesium.Math.toDegrees(cart.latitude) - 20);
      if (!best || score < best.score) best = { rec, i, cart, score };
    });
    if (!best) return null;
    const lon = Cesium.Math.toDegrees(best.cart.longitude);
    const lat = Cesium.Math.toDegrees(best.cart.latitude);
    const h = best.cart.height;
    unlock();
    const range = kind === "v3" ? 4.6e4 : kind === "v10" || kind === "v15" ? 3.2e4 : 3.8e4;
    const target = best.rec._pos;
    const radial = Cesium.Cartesian3.normalize(target, new Cesium.Cartesian3());
    const velN = Cesium.Cartesian3.normalize(best.rec._vel, new Cesium.Cartesian3());
    const right = Cesium.Cartesian3.cross(velN, radial, new Cesium.Cartesian3());
    if (Cesium.Cartesian3.magnitudeSquared(right) < 1e-10) {
      Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_X, radial, right);
    }
    Cesium.Cartesian3.normalize(right, right);
    const offset = new Cesium.Cartesian3();
    Cesium.Cartesian3.multiplyByScalar(right, range * 0.58, offset);
    Cesium.Cartesian3.add(
      offset,
      Cesium.Cartesian3.multiplyByScalar(radial, range * 0.48, new Cesium.Cartesian3()),
      offset
    );
    Cesium.Cartesian3.add(
      offset,
      Cesium.Cartesian3.multiplyByScalar(velN, -range * 0.48, new Cesium.Cartesian3()),
      offset
    );
    const camPos = Cesium.Cartesian3.add(target, offset, new Cesium.Cartesian3());
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(target, camPos, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    const camUp = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(
        radial,
        Cesium.Cartesian3.multiplyByScalar(
          direction,
          Cesium.Cartesian3.dot(radial, direction),
          new Cesium.Cartesian3()
        ),
        new Cesium.Cartesian3()
      ),
      new Cesium.Cartesian3()
    );
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    viewer.camera.setView({
      destination: camPos,
      orientation: { direction, up: camUp },
    });
    locked = false;
    spinning = false;
    setZoomLimits();
    setReset(true);
    placed = paintPoints(simNow());
    updateModels(simNow());
    lastModels = performance.now();
    return { kind: gens[best.i], height: h, lon, lat };
  };

  let tries = 0;
  const wait = () => {
    if (window.Cesium && host() && window.STARLINK && satlib() && window.STARLINK_GP) {
      boot();
      return;
    }
    if (++tries > 250) return;
    window.setTimeout(wait, 80);
  };
  // Cesium is loaded lazily (cesium-lazy.js): on the first interaction once the globe
  // is in view, or straight away when the "Load 3D globe" button is pressed.
  const start = () => {
    const btn = document.getElementById("sl-globe-load");
    if (btn) { btn.disabled = true; btn.textContent = "Loading 3D globe…"; }
    const satP = window.loadSatellite ? window.loadSatellite() : Promise.resolve();
    Promise.all([window.loadCesium(), satP]).then(() => { if (btn) btn.remove(); wait(); }).catch(() => {
      if (btn) { btn.disabled = false; btn.textContent = "Load 3D globe"; }
    });
  };
  const arm = () => {
    const el = document.getElementById("sl-orbit-fig") || host();
    const go = el && window.whenGlobeWanted ? window.whenGlobeWanted(el, start) : start;
    const btn = document.getElementById("sl-globe-load");
    if (btn) btn.addEventListener("click", go, { once: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arm, { once: true });
  } else {
    arm();
  }
  window.addEventListener("resize", () => {
    if (!viewer) return;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse() ? 1.5 : 2);
    viewer.resolutionScale = dpr;
    viewer.resize();
  });
})();
