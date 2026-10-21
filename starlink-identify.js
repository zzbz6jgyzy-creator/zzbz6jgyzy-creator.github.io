(() => {
  "use strict";
  /* Point-and-identify on the Starlink tracker. Catalog is /data/starlink.json
     only — the browser never talks to CelesTrak. */
  const STARLINK_CATALOG = "/data/starlink.json?v=202610181148";
  const GEO = "https://geocoding-api.open-meteo.com/v1/search";
  const GEO_OPTS = { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 };
  const KEY = "sd-sl-identify-v1";
  const CONE_DEG = 10;
  const UP_MIN_EL = 15;
  const TICK_MS = 1600;
  const STALE_MS = 24 * 60 * 60 * 1000;
  const GEN = {
    v10: "V1.0",
    v15: "V1.5",
    v2m: "V2 Mini",
    v2opt: "V2 Mini Optimized",
    v2dtc: "V2 Mini Direct-to-Cell",
    v3: "V3",
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const toRad = (d) => (d * Math.PI) / 180;
  const wrap360 = (d) => ((d % 360) + 360) % 360;
  const compassShort = (deg) => {
    const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  };
  const isPhone = () => window.matchMedia("(pointer: coarse)").matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const inAppBrowser = () =>
    /Twitter|Tweetbot|FBAN|FBAV|FBIOS|FB_IAB|Instagram|Line\/|Snapchat|BytedanceWebview|musical_ly|TikTok|Pinterest|LinkedInApp/i.test(
      navigator.userAgent || ""
    ) || /; wv\)/i.test(navigator.userAgent || "");
  const geoFailHint = (err) => {
    if (inAppBrowser()) {
      return "This in-app browser will not share a location. Open in Safari or Chrome, or search a city.";
    }
    const code = err && err.code;
    if (code === 1) return "Location is off or blocked for this site. Search a city instead.";
    if (code === 3) return "Location timed out. Search a city instead.";
    if (code === 2) return "This device could not find you. Search a city instead.";
    return "Could not use this device’s location. Search a city instead.";
  };

  const skySep = (az1, el1, az2, el2) => {
    const e1 = toRad(el1);
    const e2 = toRad(el2);
    const dAz = toRad(az1 - az2);
    const c = Math.sin(e1) * Math.sin(e2) + Math.cos(e1) * Math.cos(e2) * Math.cos(dAz);
    return (Math.acos(clamp(c, -1, 1)) * 180) / Math.PI;
  };

  /* Phone flat (beta ≈ 0) → zenith. Phone upright (beta ≈ 90) → horizon. */
  const aimElevation = (beta) => {
    if (beta == null || !Number.isFinite(beta)) return null;
    return clamp(90 - beta, -20, 95);
  };

  const intlYear = (raw) => {
    if (!raw || raw.length < 5) return "";
    const yy = Number(raw.slice(0, 2));
    if (!Number.isFinite(yy)) return "";
    const year = yy >= 57 ? 1900 + yy : 2000 + yy;
    return `${year}-${raw.slice(2)}`;
  };

  const screenAngle = () => {
    if (screen.orientation && Number.isFinite(screen.orientation.angle)) return screen.orientation.angle;
    if (typeof window.orientation === "number") return window.orientation;
    return 0;
  };

  const headingFromEvent = (e) => {
    if (!e) return null;
    let h = null;
    if (typeof e.webkitCompassHeading === "number" && Number.isFinite(e.webkitCompassHeading)) h = e.webkitCompassHeading;
    else if (typeof e.alpha === "number" && Number.isFinite(e.alpha)) h = (360 - e.alpha) % 360;
    if (h == null) return null;
    return wrap360(h + screenAngle());
  };

  const state = { place: "", lat: null, lon: null };
  const sat = { ready: false, error: "", updated: "", count: 0, gens: GEN, visible: [], worker: null, timer: 0 };
  const live = {
    heading: null,
    beta: null,
    look: null,
    on: false,
    attached: false,
    gotAbsolute: false,
    raf: 0,
    pending: null,
    cue: "",
    onTarget: false,
    hint: "",
  };

  const readStore = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  };
  const writeStore = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ place: state.place, lat: state.lat, lon: state.lon }));
    } catch {
      /* private mode */
    }
  };

  const setStatus = (text, kind) => {
    const el = $("sl-id-status");
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle("is-warn", kind === "warn");
  };

  const paintAge = () => {
    const age = $("sl-id-age");
    const stale = $("sl-id-stale");
    if (!age) return;
    if (!sat.updated) {
      age.textContent = sat.error ? "Catalog failed to load" : "Loading Starlink catalog…";
      if (stale) stale.hidden = true;
      return;
    }
    const t = Date.parse(sat.updated);
    const ageMs = Number.isFinite(t) ? Date.now() - t : NaN;
    const hours = Number.isFinite(ageMs) ? Math.max(0, Math.round(ageMs / 36e5)) : null;
    const when = Number.isFinite(t)
      ? new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : sat.updated;
    age.textContent = `${sat.count.toLocaleString("en-US")} Starlinks · catalog ${when}${hours != null ? ` · ${hours}h old` : ""}`;
    if (stale) stale.hidden = !(Number.isFinite(ageMs) && ageMs > STALE_MS);
  };

  const card = (row, tag) => {
    const gen = sat.gens[row.gen] || GEN[row.gen] || row.gen;
    const launch = intlYear(row.intl);
    return `<article class="sl-id-card">
      <p class="sl-id-kicker">${esc(tag)}</p>
      <h3>${esc(row.name)}</h3>
      <p>NORAD ${esc(row.norad)}${gen ? ` · ${esc(gen)}` : ""}${launch ? ` · launch ${esc(launch)}` : ""}</p>
      <p>${esc(compassShort(row.az))} ${Math.round(row.az)}° · ${row.el.toFixed(0)}° up · ${Math.round(row.range)} km</p>
    </article>`;
  };

  const applyCompass = () => {
    const rose = document.querySelector("[data-sl-id-rose]");
    const needle = document.querySelector("[data-sl-id-needle]");
    const cue = document.querySelector("[data-sl-id-cue]");
    const hint = document.querySelector("[data-sl-id-hint]");
    const frame = document.querySelector(".sl-id-compass-frame");
    const heading = live.on && live.heading != null ? live.heading : 0;
    const needleAz = live.look != null ? live.look : heading;
    if (rose) rose.setAttribute("transform", `rotate(${(-heading).toFixed(1)} 50 50)`);
    if (needle) needle.setAttribute("transform", `rotate(${needleAz.toFixed(1)} 50 50)`);
    if (cue) {
      cue.textContent = live.cue || (isPhone() ? "Point your phone at the sky" : "Best on a phone");
      cue.classList.toggle("is-on", !!live.onTarget);
    }
    if (hint) {
      hint.textContent =
        live.hint ||
        (live.on
          ? "Lift the top of the phone toward the moving light. White mark is the top."
          : "On a phone, tap live compass and point at the sky.");
    }
    if (frame) frame.classList.toggle("is-on", !!live.onTarget);
  };

  const paintHits = (hits, aiming) => {
    const host = $("sl-id-hits");
    const msg = $("sl-id-msg");
    if (!host) return;
    if (!hits.length) {
      host.innerHTML = "";
      if (msg) {
        msg.textContent = aiming
          ? "Searching… keep the top of the phone on the moving light."
          : "Point your phone at the sky. We match Starlinks inside a 10° cone.";
      }
      return;
    }
    if (msg) msg.textContent = hits.length === 1 ? "This is the closest Starlink." : "Closest Starlinks in your cone.";
    host.innerHTML = hits.map((h, i) => card(h, i === 0 ? "Best match" : `Also in view · ${h.sep.toFixed(0)}° off`)).join("");
  };

  const paintUp = () => {
    const ul = $("sl-id-up");
    if (!ul) return;
    const rows = sat.visible.filter((s) => s.el >= UP_MIN_EL).slice(0, 8);
    if (!rows.length) {
      ul.innerHTML = `<li><p>None above ${UP_MIN_EL}° right now. Starlinks hug the horizon a lot — try again in a few minutes.</p></li>`;
      return;
    }
    ul.innerHTML = rows
      .map((s) => {
        const gen = sat.gens[s.gen] || GEN[s.gen] || "";
        return `<li data-az="${s.az.toFixed(1)}" data-el="${s.el.toFixed(1)}" data-name="${esc(s.name)}"><span>${esc(s.name)}</span><em>${esc(compassShort(s.az))} ${Math.round(s.az)}° · ${s.el.toFixed(0)}°${gen ? ` · ${esc(gen)}` : ""}</em></li>`;
      })
      .join("");
  };

  const matchAim = () => {
    const heading = live.heading;
    const elAim = aimElevation(live.beta);
    const pointing = !!(live.on && heading != null && elAim != null && isPhone());
    if (!pointing) {
      live.look = null;
      live.onTarget = false;
      live.cue = isPhone() ? "Point your phone at the sky" : "Best on a phone";
      live.hint = isPhone()
        ? "Tap the live compass, then lift the top of the phone toward the satellite."
        : "Use a phone for point-and-identify. The list below is still live from this location.";
      applyCompass();
      paintHits([], false);
      return;
    }
    const hits = sat.visible
      .filter((s) => s.el > 0)
      .map((s) => ({ ...s, sep: skySep(heading, elAim, s.az, s.el) }))
      .filter((s) => s.sep <= CONE_DEG)
      .sort((a, b) => a.sep - b.sep)
      .slice(0, 3);
    const best = hits[0];
    live.look = best ? best.az : heading;
    live.cue = best ? best.name : "Searching…";
    live.hint = best ? `${Math.round(best.sep)}° off · ${best.el.toFixed(0)}° up` : "Sweep slowly. We need heading and tilt.";
    live.onTarget = !!(best && best.sep <= 4);
    applyCompass();
    paintHits(hits, true);
  };

  const askLook = () => {
    if (!sat.ready || state.lat == null || !sat.worker) return;
    sat.worker.postMessage({ type: "look", lat: state.lat, lon: state.lon, now: Date.now() });
  };

  const startTick = () => {
    if (sat.timer) return;
    askLook();
    sat.timer = window.setInterval(askLook, TICK_MS);
  };

  const showDash = (on) => {
    const dash = $("sl-id-dash");
    if (dash) dash.hidden = !on;
  };

  const render = () => {
    const desk = $("sl-id-desk");
    if (desk) desk.hidden = isPhone();
    paintAge();
    if (!sat.ready && !sat.error) {
      setStatus("Loading Starlink catalog…");
      showDash(false);
      return;
    }
    if (sat.error) {
      setStatus("Could not load the cached catalog. Try a refresh — we do not fetch CelesTrak in the browser.", "warn");
      showDash(false);
      return;
    }
    if (state.lat == null) {
      setStatus("Pick a place first. Then we show which Starlinks are up, and a phone can point at them.");
      showDash(false);
      return;
    }
    setStatus("");
    showDash(true);
    startTick();
    paintUp();
    matchAim();
  };

  const onOrient = (e) => {
    if (e.type === "deviceorientationabsolute") live.gotAbsolute = true;
    if (e.type === "deviceorientation" && live.gotAbsolute && typeof e.webkitCompassHeading !== "number") return;
    live.pending = e;
    if (typeof e.beta === "number" && Number.isFinite(e.beta)) live.beta = e.beta;
    if (live.raf) return;
    live.raf = requestAnimationFrame(() => {
      live.raf = 0;
      const h = headingFromEvent(live.pending);
      if (h == null) return;
      live.heading = h;
      live.on = true;
      const arm = $("sl-id-arm");
      if (arm) arm.hidden = true;
      matchAim();
    });
  };

  const attachCompass = () => {
    if (live.attached) return;
    window.addEventListener("deviceorientationabsolute", onOrient, true);
    window.addEventListener("deviceorientation", onOrient, true);
    live.attached = true;
  };

  const startCompass = async () => {
    const arm = $("sl-id-arm");
    const cue = document.querySelector("[data-sl-id-cue]");
    if (arm) arm.textContent = "Waiting for the compass…";
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") {
          if (cue) cue.textContent = "Compass blocked. The list below still works.";
          if (arm) arm.textContent = "Click here to use live compass";
          return;
        }
      }
    } catch {
      if (cue) cue.textContent = "This browser will not share a heading.";
      if (arm) arm.textContent = "Click here to use live compass";
      return;
    }
    attachCompass();
    window.setTimeout(() => {
      if (live.on) return;
      if (cue) cue.textContent = "No compass on this device. Use the list below.";
      if (arm) arm.hidden = true;
    }, 2500);
  };

  const setPlace = (place, lat, lon) => {
    state.place = place;
    state.lat = lat;
    state.lon = lon;
    const q = $("sl-id-q");
    const hint = $("sl-id-hint");
    if (q) q.value = place;
    if (hint) hint.textContent = `${place} · ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    writeStore();
    render();
  };

  const searchPlace = (q) => {
    const box = $("sl-id-suggest");
    if (!box) return;
    if (!q || q.trim().length < 2) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    fetch(`${GEO}?name=${encodeURIComponent(q.trim())}&count=6&language=en&format=json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const rows = j?.results || [];
        if (!rows.length) {
          box.hidden = true;
          return;
        }
        box.hidden = false;
        box.innerHTML = rows
          .map((r) => {
            const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
            return `<li><button type="button" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${esc(label)}">${esc(label)}</button></li>`;
          })
          .join("");
      })
      .catch(() => {
        box.hidden = true;
      });
  };

  const bootWorker = () => {
    if (sat.worker || sat.ready) return;
    try {
      sat.worker = new Worker("/starlink-identify-worker.js");
    } catch (err) {
      sat.error = String(err);
      paintAge();
      render();
      return;
    }
    sat.worker.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.type === "ready") {
        sat.ready = true;
        sat.count = msg.count || 0;
        sat.updated = msg.tleAsOf || msg.updated || "";
        sat.gens = Object.assign({}, GEN, msg.gens || {});
        paintAge();
        render();
        askLook();
        return;
      }
      if (msg.type === "error") {
        sat.error = msg.error || "catalog error";
        paintAge();
        render();
        return;
      }
      if (msg.type === "look") {
        sat.visible = msg.visible || [];
        paintUp();
        matchAim();
      }
    };
    sat.worker.onerror = () => {
      sat.error = "Worker failed";
      paintAge();
      render();
    };
    sat.worker.postMessage({ type: "load", url: STARLINK_CATALOG });
  };

  const bind = () => {
    let suggestTimer = 0;
    $("sl-id-q")?.addEventListener("input", (e) => {
      clearTimeout(suggestTimer);
      suggestTimer = window.setTimeout(() => searchPlace(e.target.value), 280);
    });
    $("sl-id-q")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      $("sl-id-suggest")?.querySelector("button")?.click();
    });
    $("sl-id-suggest")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lat]");
      if (!btn) return;
      $("sl-id-suggest").hidden = true;
      setPlace(btn.getAttribute("data-name"), Number(btn.dataset.lat), Number(btn.dataset.lon));
    });
    $("sl-id-geo")?.addEventListener("click", () => {
      const hint = $("sl-id-hint");
      if (!navigator.geolocation) {
        if (hint) {
          hint.textContent = inAppBrowser()
            ? "This in-app browser will not share a location. Open in Safari or Chrome, or search a city."
            : "This browser will not share a location. Search a city instead.";
        }
        return;
      }
      if (hint) {
        hint.textContent = inAppBrowser()
          ? "Trying this browser… if it fails, open in Safari or Chrome, or search a city."
          : "Finding you…";
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => setPlace("Your location", pos.coords.latitude, pos.coords.longitude),
        (err) => {
          if (hint) hint.textContent = geoFailHint(err);
        },
        GEO_OPTS
      );
    });
    $("sl-id-clear")?.addEventListener("click", () => {
      state.place = "";
      state.lat = state.lon = null;
      if ($("sl-id-q")) $("sl-id-q").value = "";
      if ($("sl-id-hint")) $("sl-id-hint").textContent = "";
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      render();
    });
    $("sl-id-arm")?.addEventListener("click", () => startCompass());
    const canOrient = typeof DeviceOrientationEvent !== "undefined";
    if ($("sl-id-arm") && !isPhone()) $("sl-id-arm").hidden = true;
    if (canOrient) attachCompass();
    const saved = readStore();
    if (saved && saved.lat != null) setPlace(saved.place || "Saved place", saved.lat, saved.lon);
    const q = new URLSearchParams(location.search);
    if (q.get("lat") && q.get("lon")) {
      setPlace(q.get("place") || "Pinned location", Number(q.get("lat")), Number(q.get("lon")));
    }
    bootWorker();
    render();
    applyCompass();
  };

  const arm = () => {
    const el = document.getElementById("identify");
    if (el && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (es) => {
          if (es.some((x) => x.isIntersecting)) {
            io.disconnect();
            bind();
          }
        },
        { rootMargin: "400px" }
      );
      io.observe(el);
      return;
    }
    bind();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
  else arm();
})();
