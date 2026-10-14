/* Starlink Tracker globe. Same Cesium + Esri stack as the software tracker.
   One dot per satellite still in orbit. Example shells, not live tracks. */
(() => {
  const ESRI_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
  const ESRI_CREDIT =
    "Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  const RE = 6378137;
  const EXAG = 2.35;
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
    c.alpha = 0.95;
    return c;
  };

  const dotSize = (n) => {
    if (n >= 3000) return coarse() ? 1.35 : 1.2;
    if (n >= 1500) return coarse() ? 1.55 : 1.4;
    if (n >= 400) return coarse() ? 1.9 : 1.75;
    return coarse() ? 3.1 : 2.8;
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
            outlineColor: Cesium.Color.TRANSPARENT,
            outlineWidth: 0,
          });
          n += 1;
        });
      });
    });
    return n;
  };

  const look = () => {
    const Cesium = window.Cesium;
    viewer.camera.lookAt(
      Cesium.Cartesian3.ZERO,
      new Cesium.HeadingPitchRange(0.72, Cesium.Math.toRadians(-18), 2.05e7)
    );
  };

  const bindSpin = () => {
    const Cesium = window.Cesium;
    const canvas = viewer.scene.canvas;
    const pause = () => {
      spinning = false;
      idleAt = performance.now() + 4500;
    };
    canvas.addEventListener("pointerdown", pause);
    canvas.addEventListener("wheel", pause, { passive: true });
    viewer.scene.preUpdate.addEventListener(() => {
      if (reduce()) return;
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
        msaaSamples: coarse() ? 1 : 4,
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
    const control = viewer.scene.screenSpaceCameraController;
    control.enableTilt = true;
    control.enableLook = false;
    control.enableRotate = true;
    control.enableTranslate = false;
    control.enableZoom = true;
    control.minimumZoomDistance = 1.15e7;
    control.maximumZoomDistance = 3.6e7;
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
    look();
    bindSpin();
    show();
    viewer.resize();
    requestAnimationFrame(() => viewer?.resize());
    api.ready = true;
  }

  api.ready = false;
  api.active = () => Boolean(viewer);
  api.count = () => placed;
  api.spinning = () => spinning;

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
  window.addEventListener("resize", () => viewer?.resize());
})();
