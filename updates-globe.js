/* Software Update Tracker globe.
   Keyless Esri / OSM imagery follows the same stack as God's Eye View
   (MIT, Copyright (c) 2026 Bilawal Sidhu, https://github.com/bilawalsidhu/gods-eye-view).
   CesiumJS Apache-2.0. Esri World Imagery remains Esri's; attribution required. */
(() => {
  const ESRI_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
  const ESRI_CREDIT =
    "Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  const WORLD = { lon: -8, lat: 22, height: 1.78e7, pitch: -87 };
  const EUROPE = { lon: 10.2, lat: 49, height: 3.55e6, pitch: -74 };
  const COLORS = {
    hot: [227, 25, 55, 255],
    warm: [255, 138, 76, 255],
    cool: [140, 158, 178, 230],
  };

  const api = (window.UpdatesGlobe = window.UpdatesGlobe || {});
  let viewer = null;
  let mode = "world";
  let flying = false;
  let queued = null;
  let started = false;

  const reduce = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const shell = () => document.querySelector(".updates-map-shell");
  const host = () => document.getElementById("updates-globe");

  const duration = (animate) => (animate && !reduce() ? 1.05 : 0);

  const color = (heat) => {
    const Cesium = window.Cesium;
    const c = COLORS[heat] || COLORS.cool;
    return Cesium.Color.fromBytes(c[0], c[1], c[2], c[3]);
  };

  const setMode = (next) => {
    mode = next;
    shell()?.classList.toggle("is-zoomed", next !== "world");
  };

  const doneFly = () => {
    flying = false;
  };

  const lookAt = (pose, animate) => {
    if (!viewer) return;
    flying = true;
    const Cesium = window.Cesium;
    const dest = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, pose.height);
    const orientation = {
      heading: 0,
      pitch: Cesium.Math.toRadians(pose.pitch ?? -78),
      roll: 0,
    };
    if (!animate || reduce()) {
      viewer.camera.setView({ destination: dest, orientation });
      doneFly();
      return;
    }
    viewer.camera.flyTo({ destination: dest, orientation, duration: duration(true), complete: doneFly, cancel: doneFly });
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
      /* OSM fallback below */
    }
    layers.addImageryProvider(
      new Cesium.OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
        credit: "© OpenStreetMap contributors",
      })
    );
  }

  const paint = (payload) => {
    if (!viewer || !payload) return;
    const Cesium = window.Cesium;
    const { spots, focus } = payload;
    const keep = new Set();
    (spots || []).forEach((spot) => {
      const ll = payload.points?.[spot.code];
      if (!ll) return;
      keep.add(spot.code);
      const id = `hot-${spot.code}`;
      const on = focus === spot.code;
      const size = Math.min(on ? 20 : 15, (on ? 10 : 7.5) + Math.sqrt(Math.min(spot.count || 1, 64)) * 1.05);
      const position = Cesium.Cartesian3.fromDegrees(ll[0], ll[1], 18000);
      let ent = viewer.entities.getById(id);
      if (!ent) {
        ent = viewer.entities.add({
          id,
          name: spot.code,
          position,
        });
      } else {
        ent.position = position;
      }
      ent.point = {
        pixelSize: size,
        color: color(spot.heat),
        outlineColor: on ? Cesium.Color.WHITE : Cesium.Color.fromBytes(12, 13, 16, 220),
        outlineWidth: on ? 3 : 1.4,
        scaleByDistance: new Cesium.NearFarScalar(6.0e5, 1.45, 2.2e7, 0.72),
        disableDepthTestDistance: 0,
      };
      const inEurope = ll[0] > -12 && ll[0] < 32 && ll[1] > 34 && ll[1] < 72;
      const few = (spots || []).length <= 16;
      const showLabel =
        on ||
        few ||
        spot.heat === "hot" ||
        (mode === "europe" && inEurope);
      ent.label = {
        text: spot.code,
        font: "600 12px IBM Plex Mono, monospace",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromBytes(8, 9, 12, 220),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: 0,
        show: showLabel,
      };
    });
    [...viewer.entities.values].forEach((ent) => {
      const code = String(ent.id || "").replace(/^hot-/, "");
      if (!keep.has(code)) viewer.entities.remove(ent);
    });
  };

  const bindPicks = () => {
    const Cesium = window.Cesium;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      const raw = picked?.id?.id || picked?.id;
      const code = typeof raw === "string" && raw.startsWith("hot-") ? raw.slice(4) : "";
      if (code && typeof api.onPick === "function") api.onPick(code);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewer.camera.moveEnd.addEventListener(() => {
      if (flying) return;
      const cart = viewer.camera.positionCartographic;
      if (!cart) return;
      const lon = Cesium.Math.toDegrees(cart.longitude);
      const lat = Cesium.Math.toDegrees(cart.latitude);
      const height = cart.height;
      if (height > 1.2e7) setMode("world");
      else if (lon > -14 && lon < 34 && lat > 33 && lat < 73 && height < 4.8e6) setMode("europe");
      else setMode("free");
      if (typeof api.onView === "function") api.onView();
    });
  };

  const showGlobe = () => {
    const el = host();
    const wrap = shell();
    if (!el || !wrap) return;
    el.removeAttribute("hidden");
    wrap.classList.add("is-globe");
    document.getElementById("updates-map")?.setAttribute("aria-hidden", "true");
    document.getElementById("updates-globe-credit")?.removeAttribute("hidden");
  };

  async function boot() {
    if (started || !window.Cesium || !host()) return;
    started = true;
    const Cesium = window.Cesium;
    if (Cesium.Ion) Cesium.Ion.defaultAccessToken = "";
    const creditHost = document.getElementById("updates-globe-cesium-credit");
    const credit = document.getElementById("updates-globe-credit");
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
        msaaSamples: 4,
      });
    } catch {
      started = false;
      viewer = null;
      return;
    }
    viewer.targetFrameRate = 60;
    viewer.clock.shouldAnimate = false;
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2026-06-21T14:00:00Z");
    viewer.scene.globe.show = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0c1620");
    if (viewer.scene.globe.translucency) viewer.scene.globe.translucency.enabled = false;
    viewer.scene.fog.enabled = true;
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#07080c");
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
    control.enableTranslate = true;
    control.enableZoom = true;
    control.minimumZoomDistance = 4.5e5;
    control.maximumZoomDistance = 3.8e7;
    if (credit) credit.hidden = false;
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
      if (credit) credit.hidden = true;
      return;
    }
    bindPicks();
    showGlobe();
    lookAt(WORLD, false);
    setMode("world");
    if (queued) paint(queued);
    viewer.resize();
    api.ready = true;
    if (typeof api.onReady === "function") api.onReady();
  }

  api.ready = false;
  api.active = () => Boolean(viewer);
  api.mode = () => mode;
  api.sceneMode = () => viewer?.scene?.mode;
  api.setSpots = (spots, focus, points) => {
    queued = { spots, focus, points };
    paint(queued);
  };
  api.highlight = (code) => {
    if (!queued) return;
    queued.focus = code || "";
    paint(queued);
  };
  api.flyWorld = (animate = true) => {
    setMode("world");
    lookAt(WORLD, animate);
    if (queued) paint(queued);
  };
  api.flyEurope = (animate = true) => {
    setMode("europe");
    lookAt(EUROPE, animate);
    if (queued) paint(queued);
  };
  api.flyCountry = (code) => {
    api.highlight(code);
  };
  api.zoomBy = (factor) => {
    if (!viewer) return;
    const Cesium = window.Cesium;
    const cart = viewer.camera.positionCartographic;
    if (!cart) return;
    const height = Math.max(4.5e5, Math.min(2.4e7, cart.height / factor));
    setMode("free");
    lookAt(
      {
        lon: Cesium.Math.toDegrees(cart.longitude),
        lat: Cesium.Math.toDegrees(cart.latitude),
        height,
        pitch: Cesium.Math.toDegrees(viewer.camera.pitch),
      },
      true
    );
  };
  api.resize = () => viewer?.resize();

  let tries = 0;
  const wait = () => {
    if (window.Cesium && host()) {
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
  window.addEventListener("resize", () => api.resize());
})();
