(() => {
  "use strict";
  const DATA = window.SEE_LAUNCH;
  if (!DATA) return;

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const KEY = "sd-see-launch-v1";
  const LL2 = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?lsp__name=SpaceX&limit=16";
  const GEO = "https://geocoding-api.open-meteo.com/v1/search";
  const WX = "https://api.open-meteo.com/v1/forecast";
  const R = 6371;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const state = { place: "", lat: null, lon: null, launchId: "" };
  let launches = [];
  let wxHere = null;
  let wxPad = {};
  let suggestTimer = 0;
  const live = {
    look: null,
    heading: null,
    on: false,
    attached: false,
    gotAbsolute: false,
    raf: 0,
    pending: null,
    bucket: "",
  };

  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const angDiff = (a, b) => {
    const d = Math.abs(((a - b + 540) % 360) - 180);
    return d;
  };
  const compass = (deg) => {
    const names = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
    return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  };
  const compassShort = (deg) => {
    const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  };

  const haversine = (aLat, aLon, bLat, bLon) => {
    const p1 = toRad(aLat),
      p2 = toRad(bLat);
    const dp = toRad(bLat - aLat),
      dl = toRad(bLon - aLon);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const bearing = (aLat, aLon, bLat, bLon) => {
    const p1 = toRad(aLat),
      p2 = toRad(bLat);
    const dl = toRad(bLon - aLon);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };
  const destPoint = (lat, lon, brng, km) => {
    const δ = km / R,
      θ = toRad(brng);
    const φ1 = toRad(lat),
      λ1 = toRad(lon);
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
    return { lat: toDeg(φ2), lon: ((toDeg(λ2) + 540) % 360) - 180 };
  };
  const elevation = (hKm, dKm) => {
    if (dKm < 1) return 90;
    const elev = Math.atan(hKm / dKm - dKm / (2 * R));
    return toDeg(elev);
  };

  const padOf = (launch) => DATA.pads[launch.pad] || DATA.pads.cape;
  const vehicleOf = (title, cfg) => {
    const t = `${title} ${cfg || ""}`.toLowerCase();
    if (/starship|super heavy/.test(t)) return "starship";
    if (/falcon heavy/.test(t)) return "heavy";
    return "falcon";
  };
  const padFromRow = (row) => {
    const name = `${row.pad?.name || ""} ${row.pad?.location?.name || ""}`;
    if (/starbase|boca chica/i.test(name)) return /pad\s*2|orbital pad 2/i.test(name) ? "sb2" : "starbase";
    if (/39a|kennedy/i.test(name)) return "lc39a";
    if (/4e|vandenberg/i.test(name)) return "slc4e";
    if (/40|cape canaveral/i.test(name)) return "slc40";
    if (/vandenberg/i.test(name)) return "vafb";
    return "cape";
  };
  const azimuthOf = (launch) => {
    const pad = padOf(launch);
    const t = `${launch.title} ${launch.orbit || ""}`.toLowerCase();
    if (launch.vehicle === "starship") return 97;
    if (/gto|geo|geostationary|transfer/.test(t)) return pad.coast === "west" ? 186 : 95;
    if (/iss|dragon|cygnus|crs|crew/.test(t)) return 45;
    if (/polar|sso|sun-synchronous|starlink group 1[1-9]|vandenberg/.test(t) || pad.id === "slc4e" || pad.id === "vafb")
      return 186;
    if (/starlink/.test(t)) return pad.coast === "west" ? 186 : 48;
    return pad.az;
  };

  const rangesFor = (vehicle, night) => {
    const table = {
      falcon: night ? { good: 280, maybe: 480 } : { good: 90, maybe: 180 },
      heavy: night ? { good: 320, maybe: 520 } : { good: 110, maybe: 200 },
      starship: night ? { good: 420, maybe: 650 } : { good: 160, maybe: 280 },
    };
    return table[vehicle] || table.falcon;
  };

  const wmoText = (code) => {
    const n = Number(code);
    if (n === 0) return "Clear";
    if (n <= 3) return "Partly cloudy";
    if (n <= 48) return "Fog";
    if (n <= 67) return "Rain";
    if (n <= 77) return "Snow";
    if (n <= 82) return "Showers";
    if (n <= 99) return "Thunderstorms";
    return "Cloud";
  };

  const pickHour = (wx, when) => {
    if (!wx?.hourly?.time?.length) return null;
    const t = when.getTime();
    let best = 0,
      gap = Infinity;
    wx.hourly.time.forEach((iso, i) => {
      const d = Math.abs(Date.parse(iso) - t);
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    if (gap > 36e5 * 20) return null;
    return {
      cloud: wx.hourly.cloud_cover?.[best],
      vis: wx.hourly.visibility?.[best],
      rain: wx.hourly.precipitation?.[best],
      code: wx.hourly.weather_code?.[best],
      day: wx.hourly.is_day?.[best],
      time: wx.hourly.time[best],
    };
  };

  const scoreLaunch = (launch) => {
    if (state.lat == null) return null;
    const pad = padOf(launch);
    const dist = haversine(state.lat, state.lon, pad.lat, pad.lon);
    const padBrg = bearing(state.lat, state.lon, pad.lat, pad.lon);
    const az = azimuthOf(launch);
    const climb = destPoint(pad.lat, pad.lon, az, 120);
    const climbBrg = bearing(state.lat, state.lon, climb.lat, climb.lon);
    const look = dist > 80 ? climbBrg : padBrg;
    const toObs = bearing(pad.lat, pad.lon, state.lat, state.lon);
    const align = angDiff(az, toObs);
    const night = (() => {
      const hour = pickHour(wxHere, new Date(launch.start));
      if (hour && hour.day != null) return hour.day === 0;
      const h = new Date(launch.start).getHours();
      return h < 6 || h >= 19;
    })();
    const rng = rangesFor(launch.vehicle, night);
    const away = align > 120;
    const toward = align < 60;
    const farAway = away && dist > 150;
    const good = rng.good * (toward ? 1.15 : farAway ? 0.78 : 1);
    const maybe = rng.maybe * (toward ? 1.12 : farAway ? 0.82 : 1);
    const elev80 = elevation(80, dist);
    const hour = pickHour(wxHere, new Date(launch.start));
    const cloud = hour?.cloud;
    const rain = hour?.rain;
    let key = "maybe";
    if (elev80 < 1.5 || dist > maybe * 1.35) key = "no";
    else if (dist <= good && (cloud == null || cloud < 55) && (rain == null || rain < 0.4) && elev80 > 4) key = "likely";
    else if (dist <= maybe && (cloud == null || cloud < 82)) key = "maybe";
    else key = "unlikely";
    if (cloud != null && cloud >= 85 && key === "likely") key = "maybe";
    if (cloud != null && cloud >= 92 && key !== "no") key = "unlikely";
    return {
      dist,
      padBrg,
      climbBrg,
      look,
      az,
      align,
      away,
      toward,
      night,
      elev80,
      cloud,
      rain,
      code: hour?.code,
      key,
      pad,
    };
  };

  const verdictLabel = { likely: "Likely", maybe: "Maybe", unlikely: "Unlikely", no: "No" };

  const formatWhen = (launch) => {
    const t = Date.parse(launch.start);
    if (!Number.isFinite(t)) return "Date TBA";
    const d = new Date(t);
    if (launch.precision === "day" || launch.status === "net") return `NET ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
    } catch {}
  };
  const writeQuery = () => {
    const q = new URLSearchParams();
    if (state.lat != null) {
      q.set("lat", state.lat.toFixed(4));
      q.set("lon", state.lon.toFixed(4));
    }
    if (state.place) q.set("place", state.place);
    if (state.launchId) q.set("launch", state.launchId);
    const qs = q.toString();
    const next = location.pathname + (qs ? "?" + qs : "") + location.hash;
    if (location.search !== (qs ? "?" + qs : "")) history.replaceState(null, "", next);
  };

  const setPlace = (place, lat, lon) => {
    state.place = place;
    state.lat = lat;
    state.lon = lon;
    $("see-q").value = place;
    $("see-hint").textContent = `${place} · ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    writeStore();
    state.launchId = "";
    loadWeather();
    render();
  };

  const mapLl2 = (row) => {
    const net = row.net;
    const t = Date.parse(net);
    if (!Number.isFinite(t)) return null;
    const d = new Date(t);
    const statusName = row.status?.name || "";
    if (d.getMonth() === 11 && d.getDate() === 31 && /to be determined|tbd/i.test(statusName)) return null;
    const padId = padFromRow(row);
    const pad = DATA.pads[padId];
    const lat = Number(row.pad?.latitude);
    const lon = Number(row.pad?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && pad) {
      pad.lat = lat;
      pad.lon = lon;
    }
    const go = /go for launch|in flight|hold/i.test(statusName);
    return {
      id: `ll-${row.id}`,
      title: (row.name || "")
        .replace(/^Falcon 9 Block 5 \| /, "Falcon 9 · ")
        .replace(/^Falcon Heavy \| /, "Falcon Heavy · "),
      start: net,
      pad: padId,
      vehicle: vehicleOf(row.name, row.rocket?.configuration?.name),
      orbit: row.mission?.type || row.mission?.orbit?.name || "",
      status: /in flight/i.test(statusName) ? "live" : go ? "go" : /hold/i.test(statusName) ? "hold" : "net",
      precision: /go|hold|in flight/i.test(statusName) ? "datetime" : "day",
      href: row.url || "https://www.spacex.com/launches",
      note: row.mission?.description || row.weather_concerns || "",
      weather: row.weather_concerns || "",
      windowStart: row.window_start,
      windowEnd: row.window_end,
    };
  };

  const launchKey = (title) =>
    String(title || "")
      .toLowerCase()
      .replace(/falcon (9|heavy)/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z0-9]+/g, "");

  const mergeLaunches = (live) => {
    const mapped = (live || []).map(mapLl2).filter(Boolean);
    const keys = new Set(mapped.map((l) => launchKey(l.title)));
    const extra = DATA.fallback.filter((f) => {
      const k = launchKey(f.title);
      if (keys.has(k) || [...keys].some((x) => x.includes(k) || k.includes(x))) return false;
      if (/starship.*15/.test(f.title) && mapped.some((l) => /starship.*15|flight 15/i.test(l.title))) return false;
      return Date.parse(f.start) > Date.now() - 12 * 36e5;
    });
    return [...mapped, ...extra]
      .filter((l) => Date.parse(l.start) > Date.now() - 8 * 36e5)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  };

  const bestLaunchId = () => {
    const rank = { likely: 0, maybe: 1, unlikely: 2, no: 3 };
    const stale = (l) => l.status === "live" || Date.parse(l.start) < Date.now() - 36e5;
    const rows = launches.map((l) => ({ l, s: scoreLaunch(l) }));
    rows.sort((a, b) => {
      const pa = stale(a.l) ? 1 : 0;
      const pb = stale(b.l) ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return (rank[a.s?.key] ?? 9) - (rank[b.s?.key] ?? 9) || Date.parse(a.l.start) - Date.parse(b.l.start);
    });
    return rows[0]?.l.id || "";
  };

  const wrap360 = (d) => ((d % 360) + 360) % 360;
  const signedDelta = (from, to) => ((to - from + 540) % 360) - 180;
  const screenAngle = () => {
    if (screen.orientation && Number.isFinite(screen.orientation.angle)) return screen.orientation.angle;
    if (typeof window.orientation === "number") return window.orientation;
    return 0;
  };
  const headingFromEvent = (e) => {
    if (!e) return null;
    let h = null;
    if (typeof e.webkitCompassHeading === "number" && Number.isFinite(e.webkitCompassHeading)) {
      h = e.webkitCompassHeading;
    } else if (typeof e.alpha === "number" && Number.isFinite(e.alpha)) {
      h = (360 - e.alpha) % 360;
    }
    if (h == null) return null;
    return wrap360(h + screenAngle());
  };

  const polar = (deg, r) => {
    const rad = (deg * Math.PI) / 180;
    return [50 + r * Math.sin(rad), 50 - r * Math.cos(rad)];
  };
  const pt = (deg, r) => {
    const [x, y] = polar(deg, r);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const compassRose = () => {
    const ticks = Array.from({ length: 72 }, (_, i) => {
      const a = i * 5;
      const major = a % 30 === 0;
      const mid = a % 10 === 0;
      const r1 = 43.7;
      const r2 = major ? 37 : mid ? 39.4 : 41.5;
      const [x1, y1] = polar(a, r1);
      const [x2, y2] = polar(a, r2);
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${
        major ? "#ecd9b0" : mid ? "rgba(236,217,176,.5)" : "rgba(255,255,255,.2)"
      }" stroke-width="${major ? 1.4 : mid ? 0.9 : 0.5}" stroke-linecap="round"/>`;
    }).join("");
    const pips = [0, 90, 180, 270]
      .map(
        (a) =>
          `<polygon points="${pt(a, 36.6)} ${pt(a - 3.5, 32.2)} ${pt(a + 3.5, 32.2)}" fill="${a === 0 ? "#e8c36a" : "#c9c2b3"}"/>`
      )
      .join("");
    const cards = [
      [0, "N", 8.4, "#fff"],
      [90, "E", 7.1, "#d7dde3"],
      [180, "S", 7.1, "#d7dde3"],
      [270, "W", 7.1, "#d7dde3"],
    ]
      .map(([a, t, s, c]) => {
        const [x, y] = polar(a, 23.6);
        return `<text x="${x.toFixed(2)}" y="${(y + s * 0.36).toFixed(2)}" text-anchor="middle" fill="${c}" font-size="${s}" font-weight="700" font-family="IBM Plex Mono,ui-monospace,monospace">${t}</text>`;
      })
      .join("");
    const inter = [
      [45, "NE"],
      [135, "SE"],
      [225, "SW"],
      [315, "NW"],
    ]
      .map(([a, t]) => {
        const [x, y] = polar(a, 27.6);
        return `<text x="${x.toFixed(2)}" y="${(y + 1.55).toFixed(2)}" text-anchor="middle" fill="#8b949e" font-size="3.5" font-weight="500" font-family="IBM Plex Mono,ui-monospace,monospace">${t}</text>`;
      })
      .join("");
    const nums = [30, 60, 120, 150, 210, 240, 300, 330]
      .map((a) => {
        const [x, y] = polar(a, 32.4);
        return `<text x="${x.toFixed(2)}" y="${(y + 1.45).toFixed(2)}" text-anchor="middle" fill="#b7aa91" font-size="4" font-family="IBM Plex Mono,ui-monospace,monospace">${a}</text>`;
      })
      .join("");
    return `<circle cx="50" cy="50" r="43.95" fill="none" stroke="rgba(232,195,106,.2)" stroke-width=".45"/>${ticks}${pips}${nums}${inter}${cards}`;
  };

  const compassCaseTicks = () =>
    Array.from({ length: 12 }, (_, i) => {
      if (i === 0) return "";
      const a = i * 30;
      const [x1, y1] = polar(a, 47.9);
      const [x2, y2] = polar(a, 46.15);
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="rgba(255,255,255,.38)" stroke-width="1" stroke-linecap="round"/>`;
    }).join("");

  const cueFor = (look, heading, on) => {
    if (look == null) return { text: "Pick a place to get a bearing.", bucket: "none", onTarget: false };
    if (!on || heading == null) {
      return {
        text: `Look ${compass(look)} · ${Math.round(look)}°`,
        bucket: "static",
        onTarget: false,
      };
    }
    const d = signedDelta(heading, look);
    const ad = Math.abs(d);
    if (ad <= 12) return { text: "You're pointing at it", bucket: "on", onTarget: true };
    if (d > 0) return { text: `Turn right ${Math.round(ad)}°`, bucket: "right", onTarget: false };
    return { text: `Turn left ${Math.round(ad)}°`, bucket: "left", onTarget: false };
  };

  const applyCompass = () => {
    const rose = document.querySelector("[data-see-rose]");
    const needle = document.querySelector("[data-see-needle]");
    const cue = document.querySelector("[data-see-cue]");
    const cueLive = document.querySelector("[data-see-cue-live]");
    const hint = document.querySelector("[data-see-hint]");
    const frame = document.querySelector(".see-compass-frame");
    const svg = document.querySelector(".see-compass");
    const lookB = document.querySelector("[data-see-look-b]");
    const lookS = document.querySelector("[data-see-look-s]");
    const look = live.look;
    if (look == null) return;
    const heading = live.on && live.heading != null ? live.heading : 0;
    if (rose) rose.setAttribute("transform", `rotate(${(-heading).toFixed(1)} 50 50)`);
    if (needle) needle.setAttribute("transform", `rotate(${look.toFixed(1)} 50 50)`);
    const cueInfo = cueFor(look, live.heading, live.on);
    if (cue) {
      cue.textContent = cueInfo.text;
      cue.classList.toggle("is-on", cueInfo.onTarget);
    }
    if (cueLive && cueInfo.bucket !== live.bucket) {
      cueLive.textContent = cueInfo.text;
      live.bucket = cueInfo.bucket;
    }
    if (frame) frame.classList.toggle("is-on", cueInfo.onTarget);
    if (svg) {
      svg.setAttribute(
        "aria-label",
        live.on && live.heading != null
          ? `${cueInfo.text}. Launch is ${compass(look)}.`
          : `Look ${compass(look)}`
      );
    }
    if (live.on && live.heading != null) {
      if (lookB) lookB.textContent = cueInfo.onTarget ? "This way" : cueInfo.text;
      if (lookS) lookS.textContent = `Phone ${Math.round(live.heading)}° · launch ${compassShort(look)} ${Math.round(look)}°`;
    }
    if (hint) {
      hint.textContent = live.on
        ? "Hold the phone flat, screen up. The white mark is the top of the phone."
        : "North is up. On a phone, point it to turn this into a live compass.";
    }
  };

  const onOrient = (e) => {
    if (e.type === "deviceorientationabsolute") live.gotAbsolute = true;
    if (e.type === "deviceorientation" && live.gotAbsolute && typeof e.webkitCompassHeading !== "number") return;
    live.pending = e;
    if (live.raf) return;
    live.raf = requestAnimationFrame(() => {
      live.raf = 0;
      const h = headingFromEvent(live.pending);
      if (h == null) return;
      live.heading = h;
      live.on = true;
      const arm = document.querySelector("[data-see-arm]");
      if (arm) arm.hidden = true;
      applyCompass();
    });
  };

  const attachCompass = () => {
    window.addEventListener("deviceorientationabsolute", onOrient, true);
    window.addEventListener("deviceorientation", onOrient, true);
    screen.orientation?.addEventListener?.("change", applyCompass);
    live.attached = true;
  };

  const startCompass = async () => {
    const arm = document.querySelector("[data-see-arm]");
    const cue = document.querySelector("[data-see-cue]");
    if (arm) arm.textContent = "Waiting for the compass…";
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") {
          if (cue) cue.textContent = "Compass blocked. Keep using the static bearing.";
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
      if (cue) cue.textContent = "No compass on this device. The needle still shows the bearing.";
      if (arm) arm.hidden = true;
    }, 2500);
  };

  const ensureCompass = () => {
    const host = $("see-compass-col");
    if (!host) return;
    if (!host.querySelector(".see-compass")) {
      const canOrient = typeof DeviceOrientationEvent !== "undefined";
      const needsTap = typeof DeviceOrientationEvent.requestPermission === "function";
      const onPhone = window.matchMedia("(pointer: coarse)").matches || /iPhone|iPad|iPod/.test(navigator.userAgent);
      const showArm = canOrient && (needsTap || onPhone);
      host.innerHTML = `<div class="see-compass-frame">
        <div class="see-compass-well">
        <svg class="see-compass" viewBox="0 0 100 100" role="img" aria-label="Look direction">
          <defs>
            <radialGradient id="see-cmp-face" cx="46%" cy="36%" r="64%">
              <stop offset="0%" stop-color="#2a3846"/>
              <stop offset="42%" stop-color="#151b22"/>
              <stop offset="100%" stop-color="#07090c"/>
            </radialGradient>
            <radialGradient id="see-cmp-vignette" cx="50%" cy="50%" r="50%">
              <stop offset="62%" stop-color="rgba(0,0,0,0)"/>
              <stop offset="100%" stop-color="rgba(0,0,0,.5)"/>
            </radialGradient>
            <linearGradient id="see-cmp-needle" x1="50" y1="10" x2="50" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#ff5d6c"/>
              <stop offset="100%" stop-color="#c0102a"/>
            </linearGradient>
            <linearGradient id="see-cmp-glass" x1="50" y1="4" x2="50" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="rgba(255,255,255,.16)"/>
              <stop offset="55%" stop-color="rgba(255,255,255,0)"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="49.4" fill="#14171c"/>
          <circle cx="50" cy="50" r="46.5" fill="url(#see-cmp-face)"/>
          <circle cx="50" cy="50" r="46.5" fill="none" stroke="rgba(232,195,106,.28)" stroke-width=".7"/>
          <circle cx="50" cy="50" r="44.15" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="2.2"/>
          ${compassCaseTicks()}
          <polygon points="50,1.2 54.4,9.5 45.6,9.5" fill="#f7f8fa"/>
          <rect x="49.2" y="8.6" width="1.6" height="8" rx=".7" fill="#fff"/>
          <g data-see-rose>
            ${compassRose()}
            <g data-see-needle>
              <polygon points="50,7.6 57.8,51.4 50,44.8 42.2,51.4" fill="#e31937" opacity=".28"/>
              <polygon points="50,8.8 55.8,51.3 50,45.2 44.2,51.3" fill="url(#see-cmp-needle)"/>
              <polygon points="50,8.8 52.35,49.6 50,45.2 47.65,49.6" fill="#ff9aa3" opacity=".55"/>
              <polygon points="50,90.6 56.8,51.3 50,57.6 43.2,51.3" fill="#5f6872"/>
              <polygon points="50,90.6 52.55,52.2 50,57.6 47.45,52.2" fill="#d5dbe2" opacity=".4"/>
            </g>
          </g>
          <circle cx="50" cy="50" r="46.5" fill="url(#see-cmp-glass)"/>
          <circle cx="50" cy="50" r="46.5" fill="url(#see-cmp-vignette)"/>
          <circle cx="50" cy="50" r="6.15" fill="#101318" stroke="#e8c36a" stroke-width=".55"/>
          <circle cx="50" cy="50" r="4.15" fill="#2c333c"/>
          <circle cx="50" cy="50" r="2.15" fill="#f4f6f8"/>
        </svg>
        </div>
        <p class="see-compass-cue" data-see-cue></p>
        <p class="visually-hidden" data-see-cue-live aria-live="polite"></p>
        <button type="button" class="see-compass-arm" data-see-arm ${showArm ? "" : "hidden"}>Click here to use live compass</button>
        <p class="see-compass-hint" data-see-hint></p>
      </div>`;
      host.querySelector("[data-see-arm]")?.addEventListener("click", () => {
        startCompass();
      });
      if (canOrient) attachCompass();
    }
    applyCompass();
  };

  const renderEmpty = () => {
    $("see-empty").hidden = false;
    $("see-dash").hidden = true;
  };

  const renderList = () => {
    const ul = $("see-launches");
    const rows = launches.map((l) => ({ l, s: scoreLaunch(l) }));
    rows.sort((a, b) => {
      const rank = { likely: 0, maybe: 1, unlikely: 2, no: 3 };
      const da = a.s ? rank[a.s.key] : 9;
      const db = b.s ? rank[b.s.key] : 9;
      return da - db || Date.parse(a.l.start) - Date.parse(b.l.start);
    });
    if (!rows.length) {
      ul.innerHTML = `<li><p class="see-sub">No upcoming SpaceX launches in the slate. The calendar still has Tesla and Grok dates.</p></li>`;
      return;
    }
    ul.innerHTML = rows
      .map(({ l, s }) => {
        const on = l.id === state.launchId ? " is-on" : "";
        const pill = s ? `<span class="see-pill ${s.key}">${verdictLabel[s.key]}</span>` : "";
        return `<li><button type="button" class="see-launch${on}" data-id="${esc(l.id)}">
          <span class="see-when">${esc(formatWhen(l))}</span>
          <span><strong>${esc(l.title)}</strong><em>${esc(padOf(l).name)}${s ? ` · ${Math.round(s.dist)} km` : ""}</em></span>
          ${pill}
        </button></li>`;
      })
      .join("");
  };

  const renderBrief = () => {
    if (!state.launchId || !launches.some((l) => l.id === state.launchId)) state.launchId = bestLaunchId();
    const launch = launches.find((l) => l.id === state.launchId);
    if (!launch) {
      $("see-now").innerHTML = "";
      const copy = $("see-brief-copy");
      if (copy) copy.innerHTML = "";
      $("see-alerts").innerHTML = "";
      live.look = null;
      return;
    }
    if (!state.launchId) state.launchId = launch.id;
    const s = scoreLaunch(launch);
    const pad = padOf(launch);
    const wxP = pickHour(wxPad[pad.id], new Date(launch.start));
    const lookTxt = s ? `${compassShort(s.look)} · ${compass(s.look)}` : "—";
    const cloudTxt =
      s && s.cloud != null ? `${Math.round(s.cloud)}% cloud${s.code != null ? ` · ${wmoText(s.code)}` : ""}` : "Weather loading";
    const alignTxt = !s
      ? ""
      : s.toward
        ? "The rocket climbs toward your side of the sky."
        : s.away && s.dist > 150
          ? "It flies away from you after liftoff — the plume shrinks faster."
          : s.away
            ? "It climbs out over the water in front of you. That is the usual viewing geometry."
            : "It crosses your sky rather than coming straight at you.";

    $("see-now").innerHTML = `
      <div class="see-tile see-tile-${s?.key || "maybe"}"><span>From here</span><b>${s ? verdictLabel[s.key] : "—"}</b><small>${
        s ? `${s.night ? "Night" : "Day"} launch · ${Math.round(s.dist)} km from the pad.` : "Pick a place first."
      }</small></div>
      <div class="see-tile"><span>Look</span><b data-see-look-b>${esc(lookTxt)}</b><small data-see-look-s>${
        s ? `Toward the pad at ${Math.round(s.padBrg)}°, then along the climb.` : "Direction appears once you pick a place."
      }</small></div>
      <div class="see-tile"><span>Your sky</span><b>${esc(s && s.cloud != null ? `${Math.round(s.cloud)}%` : "—")}</b><small>${esc(
        cloudTxt
      )}</small></div>
      <div class="see-tile"><span>This flight</span><b>${esc(pad.short)}</b><small>${esc(formatWhen(launch))} · typical azimuth ${s ? Math.round(s.az) : pad.az}°</small></div>`;

    live.look = s ? s.look : null;
    live.bucket = "";
    const copy = $("see-brief-copy");
    if (copy) {
      copy.innerHTML = s
        ? `<h2>${esc(launch.title)}</h2>
          <p class="see-sub">${esc(pad.name)} · ${esc(formatWhen(launch))}</p>
          <p>${
            s.key === "likely"
              ? `A decent chance from ${esc(state.place)}. ${alignTxt}`
              : s.key === "maybe"
                ? `Possible, not a lock. ${alignTxt}`
                : s.key === "unlikely"
                  ? `A faint chance at best. ${alignTxt}`
                  : `Treat this as a webcast night. ${alignTxt}`
          }</p>
          <p>Look ${esc(compass(s.look))} (${Math.round(s.look)}°). Peak plume sits around ${Math.max(0, s.elev80).toFixed(0)}° above the horizon if the vehicle reaches 80 km on this heading.</p>`
        : "";
    }
    if (s) ensureCompass();
    else applyCompass();

    const alerts = [];
    if (launch.status === "live") alerts.push(`<li><b>This one is already flying</b><p>If you can still see a plume, look ${s ? compass(s.look) : "toward the pad"} now.</p></li>`);
    if (launch.status === "hold") alerts.push(`<li><b>Hold</b><p>Launch Library has this in a hold. Times can slip by hours.</p></li>`);
    if (launch.status === "net" || launch.precision === "day")
      alerts.push(`<li><b>No official T-0 yet</b><p>Visibility swings with the hour. Recheck when SpaceX sets a clock. NET dates are planning, not a promise.</p></li>`);
    if (launch.weather) alerts.push(`<li><b>Launch Library weather note</b><p>${esc(launch.weather)}</p></li>`);
    if (wxP && wxP.cloud >= 75)
      alerts.push(`<li><b>Ugly at the pad</b><p>${Math.round(wxP.cloud)}% cloud${wxP.rain > 0.2 ? " and rain" : ""} near ${esc(pad.short)} around T-0. Scrub risk, not just a viewing problem.</p></li>`);
    if (s && s.cloud >= 80)
      alerts.push(`<li><b>Cloud over you</b><p>${Math.round(s.cloud)}% cover at ${esc(state.place)}. Even a close night launch hides behind that.</p></li>`);
    if (s && s.rain >= 0.5) alerts.push(`<li><b>Rain on your end</b><p>Precipitation around T-0. Stay home if it is a maybe already.</p></li>`);
    if (launch.vehicle === "falcon" && /starlink/i.test(launch.title))
      alerts.push(`<li><b>Booster lands at sea</b><p>Starlink first stages usually find a droneship. You are watching ascent, not the landing.</p></li>`);
    if (launch.vehicle === "starship")
      alerts.push(`<li><b>Catch attempt, not a cruise</b><p>Flight 15 is the first serious Ship catch. If you are on the Brownsville side you may see tower activity as well as the climb.</p></li>`);
    alerts.push(
      `<li><b>Webcast</b><p><a href="${esc(launch.href)}" ${/^https?:/.test(launch.href) ? 'target="_blank" rel="noopener noreferrer"' : ""}>Official / Launch Library page</a> · <a href="/calendar.html">Full calendar</a>${
        launch.vehicle === "starship" ? ' · <a href="/starship.html">Starship flight lab</a>' : ""
      }</p></li>`
    );
    $("see-alerts").innerHTML = alerts.join("");
  };

  const render = () => {
    if (state.lat == null) {
      renderEmpty();
      writeQuery();
      return;
    }
    $("see-empty").hidden = true;
    $("see-dash").hidden = false;
    renderList();
    renderBrief();
    writeQuery();
    const stamp = $("see-live");
    if (stamp) stamp.textContent = `Saved on this device · launches ${DATA.updated}`;
  };

  const loadWeather = () => {
    if (state.lat == null) return;
    const hours = "cloud_cover,visibility,precipitation,weather_code,is_day";
    fetch(`${WX}?latitude=${state.lat}&longitude=${state.lon}&hourly=${hours}&forecast_days=16&timezone=auto`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        wxHere = j;
        render();
      })
      .catch(() => {});
    const pads = [...new Set(launches.map((l) => l.pad).concat(["sb2", "slc40", "slc4e"]))];
    pads.forEach((id) => {
      const p = DATA.pads[id];
      if (!p) return;
      fetch(`${WX}?latitude=${p.lat}&longitude=${p.lon}&hourly=${hours}&forecast_days=16&timezone=auto`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          wxPad[id] = j;
          render();
        })
        .catch(() => {});
    });
  };

  const searchPlace = (q) => {
    const box = $("see-suggest");
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

  const bind = () => {
    $("see-q").addEventListener("input", (e) => {
      clearTimeout(suggestTimer);
      suggestTimer = setTimeout(() => searchPlace(e.target.value), 280);
    });
    $("see-q").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = $("see-suggest").querySelector("button");
        if (first) first.click();
      }
    });
    $("see-suggest").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lat]");
      if (!btn) return;
      $("see-suggest").hidden = true;
      setPlace(btn.getAttribute("data-name"), Number(btn.dataset.lat), Number(btn.dataset.lon));
    });
    $("see-geo").addEventListener("click", () => {
      if (!navigator.geolocation) {
        $("see-hint").textContent = "This browser will not share a location. Search a city instead.";
        return;
      }
      $("see-hint").textContent = "Finding you…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude,
            lon = pos.coords.longitude;
          fetch(`${GEO}?name=${encodeURIComponent(lat.toFixed(2) + " " + lon.toFixed(2))}&count=1`)
            .then(() => setPlace(`Your location`, lat, lon))
            .catch(() => setPlace("Your location", lat, lon));
        },
        () => {
          $("see-hint").textContent = "Location blocked. Search a city — we will not guess one.";
        }
      );
    });
    $("see-chips").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-city]");
      if (!btn) return;
      const city = DATA.cities.find((c) => c.name === btn.dataset.city);
      if (!city) return;
      $("see-chips").querySelectorAll(".see-chip").forEach((c) => c.classList.toggle("is-on", c === btn));
      setPlace(`${city.name}, ${city.region}`, city.lat, city.lon);
    });
    $("see-launches").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      state.launchId = btn.dataset.id;
      render();
    });
    $("see-clear").addEventListener("click", () => {
      state.place = "";
      state.lat = state.lon = null;
      state.launchId = "";
      $("see-q").value = "";
      $("see-hint").textContent = "";
      $("see-chips").querySelectorAll(".see-chip").forEach((c) => c.classList.remove("is-on"));
      try {
        localStorage.removeItem(KEY);
      } catch {}
      render();
    });
  };

  const boot = () => {
    const q = new URLSearchParams(location.search);
    const saved = readStore() || {};
    if (q.get("lat") && q.get("lon")) {
      state.lat = Number(q.get("lat"));
      state.lon = Number(q.get("lon"));
      state.place = q.get("place") || "Pinned location";
    } else if (saved.lat != null) {
      state.lat = saved.lat;
      state.lon = saved.lon;
      state.place = saved.place || "Saved place";
    }
    if (q.get("launch")) state.launchId = q.get("launch");
    if (state.lat != null) {
      $("see-q").value = state.place;
      $("see-hint").textContent = `${state.place} · ${state.lat.toFixed(2)}°, ${state.lon.toFixed(2)}°`;
    }
    $("see-chips").innerHTML = DATA.cities
      .map((c) => `<button type="button" class="see-chip" data-city="${esc(c.name)}">${esc(c.name)}</button>`)
      .join("");
    const note = $("see-note");
    if (note) note.textContent = DATA.note;
    launches = mergeLaunches([]);
    bind();
    render();
    const LLC = "sd-ll2-see";
    const stampLive = (t) => {
      const live = $("see-live");
      if (!live) return;
      const d = new Date(t);
      let tz = "";
      try { tz = (new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(d).find((x) => x.type === "timeZoneName") || {}).value || ""; } catch {}
      live.textContent = `Saved on this device · Launch Library updated ${d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ${tz}`.trim();
    };
    fetch(LL2)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((j) => {
        launches = mergeLaunches(j?.results || []);
        try { localStorage.setItem(LLC, JSON.stringify({ t: Date.now(), results: j?.results || [] })); } catch {}
        stampLive(Date.now());
        if (state.lat != null) loadWeather();
        else render();
      })
      .catch(() => {
        let c = null;
        try { c = JSON.parse(localStorage.getItem(LLC) || "null"); } catch {}
        if (c && Array.isArray(c.results) && Date.now() - c.t < 14 * 864e5) { launches = mergeLaunches(c.results); stampLive(c.t); }
        else launches = mergeLaunches([]);
        if (state.lat != null) loadWeather();
        else render();
      });
    if (state.lat != null) loadWeather();
  };

  boot();
})();
