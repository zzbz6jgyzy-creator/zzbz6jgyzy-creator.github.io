/* Starlink Tracker globe. Same Cesium + Esri stack as the software tracker.
   One marker per satellite still in orbit. Example shells, not live tracks. */
(() => {
  const ESRI_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
  const ESRI_CREDIT =
    "Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  const RE = 6378137;
  const EXAG = 2.35;
  const HOME_RANGE = 2.05e7;
  const HOME_HEADING = 0.72;
  const HOME_PITCH = -18;
  const MIN_ZOOM = 1.2e5;
  const MAX_ZOOM = 4.4e7;
  const SHELLS = {
    v10: [
      { inc: 53, alt: 550, w: 0.78 },
      { inc: 70, alt: 570, w: 0.22 },
    ],
    v15: [
      { inc: 53, alt: 550, w: 0.5 },
      { inc: 43, alt: 560, w: 0.25 },
      { inc: 70, alt: 570, w: 0.25 },
    ],
    v2m: [
      { inc: 53, alt: 530, w: 0.5 },
      { inc: 43, alt: 535, w: 0.3 },
      { inc: 70, alt: 560, w: 0.2 },
    ],
    v2opt: [
      { inc: 53, alt: 530, w: 0.4 },
      { inc: 43, alt: 535, w: 0.25 },
      { inc: 70, alt: 560, w: 0.2 },
      { inc: 97, alt: 575, w: 0.15 },
    ],
    v2dtc: [
      { inc: 53, alt: 530, w: 0.6 },
      { inc: 43, alt: 535, w: 0.4 },
    ],
    v3: [{ inc: 53, alt: 780, w: 1 }],
  };

  const api = (window.StarlinkGlobe = window.StarlinkGlobe || {});
  let viewer = null;
  let started = false;
  let placed = 0;
  let spinning = false;
  let locked = false;
  let idleAt = 0;
  const reduce = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const coarse = () => window.matchMedia?.("(pointer: coarse)")?.matches;
  const wrap = () => document.getElementById("sl-orbit-fig");
  const host = () => document.getElementById("sl-globe");

  const split = (n, weights) => {
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map((w) => (w / sum) * n);
    const out = raw.map(Math.floor);
    let rem = n - out.reduce((a, b) => a + b, 0);
    raw
      .map((v, i) => ({ i, f: v - Math.floor(v) }))
      .sort((a, b) => b.f - a.f)
      .forEach((row) => {
        if (rem > 0) {
          out[row.i] += 1;
          rem -= 1;
        }
      });
    return out;
  };

  const walker = (n, incDeg, altM, phase) => {
    const P = Math.max(1, Math.round(Math.sqrt(n)));
    const S = Math.ceil(n / P);
    const inc = (incDeg * Math.PI) / 180;
    const r = RE + altM * EXAG;
    const pts = [];
    let k = 0;
    for (let p = 0; p < P && k < n; p++) {
      const raan = phase + (p / P) * Math.PI * 2;
      const cosO = Math.cos(raan);
      const sinO = Math.sin(raan);
      const cosI = Math.cos(inc);
      const sinI = Math.sin(inc);
      for (let s = 0; s < S && k < n; s++) {
        const u = ((s + p * 0.37) / S) * Math.PI * 2;
        const cu = Math.cos(u);
        const su = Math.sin(u);
        const x = cu;
        const y = su * cosI;
        const z = su * sinI;
        pts.push(new window.Cesium.Cartesian3((x * cosO - y * sinO) * r, (x * sinO + y * cosO) * r, z * r));
        k += 1;
      }
    }
    return pts;
  };

  const hexColor = (hex) => {
    const Cesium = window.Cesium;
    const c = Cesium.Color.fromCssColorString(hex) || Cesium.Color.WHITE;
    c.alpha = 0.96;
    return c;
  };

  const dotSize = (n) => {
    if (n >= 3000) return coarse() ? 1.55 : 1.45;
    if (n >= 1500) return coarse() ? 1.8 : 1.65;
    if (n >= 400) return coarse() ? 2.2 : 2.05;
    return coarse() ? 3.4 : 3.15;
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

  const paint = () => {
    const data = window.STARLINK;
    const Cesium = window.Cesium;
    if (!viewer || !data) return 0;
    const collection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    const nearFar = new Cesium.NearFarScalar(4.8e4, 9.5, 1.95e7, 1);
    const fade = new Cesium.NearFarScalar(3.2e4, 1, 2.35e7, 0.9);
    let n = 0;
    data.generations.forEach((g, gi) => {
      const shells = SHELLS[g.id] || [{ inc: 53, alt: 550, w: 1 }];
      const counts = split(g.inOrbit, shells.map((s) => s.w));
      const color = hexColor(g.color);
      const size = dotSize(g.inOrbit);
      shells.forEach((shell, si) => {
        walker(counts[si], shell.inc, shell.alt * 1000, gi * 0.41 + si * 0.17).forEach((position) => {
          collection.add({
            position,
            color,
            pixelSize: size,
            scaleByDistance: nearFar,
            translucencyByDistance: fade,
            outlineColor: Cesium.Color.TRANSPARENT,
            outlineWidth: 0,
            disableDepthTestDistance: 0,
          });
          n += 1;
        });
      });
    });
    return n;
  };

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
  };

  const unlock = () => {
    if (!viewer || !locked) return;
    viewer.camera.lookAtTransform(window.Cesium.Matrix4.IDENTITY);
    locked = false;
    spinning = false;
    setZoomLimits();
    setReset(true);
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
    canvas.addEventListener("touchstart", onUse, { passive: true, capture: true });
    document.getElementById("sl-globe-reset")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      lockHome();
    });
    viewer.scene.preUpdate.addEventListener(() => {
      if (reduce() || !locked) return;
      if (!spinning && performance.now() > idleAt) spinning = true;
      if (!spinning) return;
      viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, coarse() ? -0.0007 : -0.00105);
    });
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
      const n = (window.STARLINK?.totals?.inOrbit || placed).toLocaleString("en-US");
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
    viewer.clock.shouldAnimate = false;
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2026-06-21T14:00:00Z");
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
    } catch {
      started = false;
      viewer.destroy();
      viewer = null;
      return;
    }
    placed = paint();
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
  api.view = () => {
    if (!viewer) return null;
    const Cesium = window.Cesium;
    const cart = viewer.camera.positionCartographic;
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
  };

  let tries = 0;
  const wait = () => {
    if (window.Cesium && host() && window.STARLINK) {
      boot();
      return;
    }
    if (++tries > 200) return;
    window.setTimeout(wait, 80);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wait, { once: true });
  } else {
    wait();
  }
  window.addEventListener("resize", () => {
    if (!viewer) return;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse() ? 1.5 : 2);
    viewer.resolutionScale = dpr;
    viewer.resize();
  });
})();
