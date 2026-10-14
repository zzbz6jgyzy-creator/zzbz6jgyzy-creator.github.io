/* Software Update Tracker globe.
   Keyless Esri / OSM imagery follows the same stack as God's Eye View
   (MIT, Copyright (c) 2026 Bilawal Sidhu, https://github.com/bilawalsidhu/gods-eye-view).
   CesiumJS Apache-2.0. Esri World Imagery remains Esri's; attribution required. */
(() => {
  const ESRI_URL = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
  const ESRI_CREDIT =
    "Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  const WORLD = { lon: 8, lat: 18, height: 1.85e7 };
  const EUROPE = { lon: 10.2, lat: 51.2, height: 4.35e6 };
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

  const lookAt = (pose, animate) => {
    if (!viewer) return;
    flying = true;
    const Cesium = window.Cesium;
    const dest = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, pose.height);
    const orientation = {
      heading: 0,
      pitch: Cesium.Math.toRadians(pose.pitch ?? -88),
      roll: 0,
    };
    const done = () => {
      flying = false;
    };
    if (!animate || reduce()) {
      viewer.camera.setView({ destination: dest, orientation });
      done();
      return;
    }
    viewer.camera.flyTo({ destination: dest, orientation, duration: duration(true), complete: done, cancel: done });
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
      const size = (on ? 14 : 9) + Math.sqrt(spot.count || 1) * 1.6;
      let ent = viewer.entities.getById(id);
      if (!ent) {
        ent = viewer.entities.add({
          id,
          name: spot.code,
          position: Cesium.Cartesian3.fromDegrees(ll[0], ll[1]),
        });
      } else {
        ent.position = Cesium.Cartesian3.fromDegrees(ll[0], ll[1]);
      }
      ent.point = {
        pixelSize: size,
        color: color(spot.heat),
        outlineColor: on ? Cesium.Color.WHITE : Cesium.Color.fromBytes(12, 13, 16, 220),
        outlineWidth: on ? 3 : 1.4,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(4.0e5, 1.35, 1.6e7, 0.55),
      };
      const showLabel = mode !== "world" || on || spot.latest;
      ent.label = {
        text: spot.code,
        font: "600 12px IBM Plex Mono, monospace",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromBytes(8, 9, 12, 220),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
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
      if (mode !== "country") {
        if (height > 1.45e7) setMode("world");
        else if (lon > -12 && lon < 32 && lat > 34 && lat < 72 && height < 6.2e6 && height > 2.2e6) {
          setMode("europe");
        } else {
          setMode("free");
        }
      }
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
        creditContainer: credit || undefined,
        msaaSamples: 4,
      });
    } catch {
      started = false;
      viewer = null;
      return;
    }
    viewer.targetFrameRate = 60;
    viewer.scene.globe.show = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#07080c");
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.atmosphereLightIntensity = 18;
      viewer.scene.skyAtmosphere.saturationShift = -0.12;
      viewer.scene.skyAtmosphere.brightnessShift = -0.08;
    }
    if (viewer.scene.sun) viewer.scene.sun.show = true;
    if (credit) credit.hidden = false;
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
  api.setSpots = (spots, focus, points) => {
    queued = { spots, focus, points };
    paint(queued);
  };
  api.flyWorld = (animate = true) => {
    setMode("world");
    lookAt(WORLD, animate);
    if (queued) paint(queued);
  };
  api.flyEurope = (animate = true) => {
    setMode("europe");
    lookAt({ ...EUROPE, pitch: -78 }, animate);
    if (queued) paint(queued);
  };
  api.flyCountry = (code, lon, lat, scale = 5) => {
    setMode("country");
    const height = Math.max(7.5e5, Math.min(5.5e6, 1.05e7 / scale));
    lookAt({ lon, lat, height, pitch: -58 }, true);
    if (queued) {
      queued.focus = code;
      paint(queued);
    }
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
