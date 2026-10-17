(() => {
  "use strict";
  /* Identify Starlink mode. Uses the shared location + compass from see-the-launch.js
     and the cached /data/starlink.json catalog. No CelesTrak from the browser. */
  const STARLINK_CATALOG = "/data/starlink.json?v=202610172320";
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
  const compassShort = (deg) => {
    const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  };
  const isPhone = () => window.matchMedia("(pointer: coarse)").matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  /* Angular distance on the sky between two az/el pairs, in degrees. */
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

  const sat = {
    mode: "launch",
    ready: false,
    error: "",
    updated: "",
    count: 0,
    gens: GEN,
    visible: [],
    worker: null,
    timer: 0,
    lastLook: 0,
  };

  const sensors = () => window.SEE || null;

  const setStatus = (text, kind) => {
    const el = $("see-sat-status");
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle("is-warn", kind === "warn");
  };

  const paintAge = () => {
    const age = $("see-sat-age");
    const stale = $("see-sat-stale");
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
    return `<article class="see-sat-card">
      <p class="see-sat-kicker">${esc(tag)}</p>
      <h3>${esc(row.name)}</h3>
      <p class="see-sub">NORAD ${esc(row.norad)}${gen ? ` · ${esc(gen)}` : ""}${launch ? ` · launch ${esc(launch)}` : ""}</p>
      <p>${esc(compassShort(row.az))} ${Math.round(row.az)}° · ${row.el.toFixed(0)}° up · ${Math.round(row.range)} km</p>
    </article>`;
  };

  const paintHits = (hits, aiming) => {
    const host = $("see-sat-hits");
    const msg = $("see-sat-msg");
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
    const ul = $("see-sat-up");
    if (!ul) return;
    const rows = sat.visible.filter((s) => s.el >= UP_MIN_EL).slice(0, 8);
    if (!rows.length) {
      ul.innerHTML = `<li><p class="see-sub">None above ${UP_MIN_EL}° right now. Starlinks hug the horizon a lot — try again in a few minutes.</p></li>`;
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
    const see = sensors();
    const aim = see && see.aim ? see.aim() : {};
    const heading = aim.heading;
    const elAim = aimElevation(aim.beta);
    const pointing = !!(aim.on && heading != null && elAim != null && isPhone());
    if (!pointing) {
      if (see && see.setLook) see.setLook(null);
      if (see && see.setSatCue) {
        see.setSatCue({
          text: isPhone() ? "Point your phone at the sky" : "Best on a phone",
          hint: isPhone()
            ? "Tap the live compass, then lift the top of the phone toward the satellite."
            : "Use a phone for point-and-identify. The list below is still live from this location.",
          onTarget: false,
        });
      }
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
    if (see && see.setLook) see.setLook(best ? best.az : heading);
    if (see && see.setSatCue) {
      see.setSatCue({
        text: best ? best.name : "Searching…",
        hint: best
          ? `${Math.round(best.sep)}° off · ${best.el.toFixed(0)}° up`
          : "Sweep slowly. We need heading and tilt.",
        onTarget: !!(best && best.sep <= 4),
      });
    }
    paintHits(hits, true);
  };

  const askLook = () => {
    if (sat.mode !== "sat" || !sat.ready) return;
    const loc = sensors() && sensors().location ? sensors().location() : {};
    if (loc.lat == null || !sat.worker) return;
    sat.worker.postMessage({ type: "look", lat: loc.lat, lon: loc.lon, now: Date.now() });
  };

  const startTick = () => {
    if (sat.timer) return;
    askLook();
    sat.timer = window.setInterval(askLook, TICK_MS);
  };

  const stopTick = () => {
    if (sat.timer) window.clearInterval(sat.timer);
    sat.timer = 0;
  };

  const showDash = (on) => {
    const dash = $("see-sat-dash");
    const empty = $("see-sat-empty");
    if (dash) dash.hidden = !on;
    if (empty) empty.hidden = on;
  };

  const renderSat = () => {
    if (sat.mode !== "sat") return;
    const loc = sensors() && sensors().location ? sensors().location() : {};
    const desk = $("see-sat-desk");
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
    if (loc.lat == null) {
      setStatus("Pick a place first. Then we show which Starlinks are up, and a phone can point at them.");
      showDash(false);
      return;
    }
    setStatus("");
    showDash(true);
    const host = $("see-sat-compass");
    const see = sensors();
    if (see && see.moveCompass && host) see.moveCompass(host);
    if (see && see.setCueMode) see.setCueMode("sat");
    startTick();
    paintUp();
    matchAim();
  };

  const setMode = (mode) => {
    sat.mode = mode === "sat" ? "sat" : "launch";
    const launch = $("see-mode-launch");
    const satEl = $("see-mode-sat");
    const tabL = $("see-tab-launch");
    const tabS = $("see-tab-sat");
    if (launch) launch.hidden = sat.mode !== "launch";
    if (satEl) satEl.hidden = sat.mode !== "sat";
    if (tabL) {
      tabL.classList.toggle("is-on", sat.mode === "launch");
      tabL.setAttribute("aria-selected", sat.mode === "launch" ? "true" : "false");
    }
    if (tabS) {
      tabS.classList.toggle("is-on", sat.mode === "sat");
      tabS.setAttribute("aria-selected", sat.mode === "sat" ? "true" : "false");
    }
    const see = sensors();
    if (sat.mode === "sat") {
      bootWorker();
      renderSat();
      const u = new URL(location.href);
      if (u.searchParams.get("mode") !== "identify") {
        u.searchParams.set("mode", "identify");
        history.replaceState(null, "", `${u.pathname}${u.search}${u.hash || "#identify"}`);
      }
    } else {
      stopTick();
      if (see && see.setCueMode) see.setCueMode("launch");
      const host = $("see-compass-col");
      if (see && see.moveCompass && host) see.moveCompass(host);
      const u = new URL(location.href);
      if (u.searchParams.get("mode") === "identify") {
        u.searchParams.delete("mode");
        history.replaceState(null, "", `${u.pathname}${u.search}${u.hash === "#identify" ? "" : u.hash}`);
      }
    }
  };

  const bootWorker = () => {
    if (sat.worker || sat.ready) return;
    try {
      sat.worker = new Worker("/see-the-launch-sat-worker.js");
    } catch (err) {
      sat.error = String(err);
      paintAge();
      renderSat();
      return;
    }
    sat.worker.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.type === "ready") {
        sat.ready = true;
        sat.count = msg.count || 0;
        sat.updated = msg.updated || "";
        sat.gens = Object.assign({}, GEN, msg.gens || {});
        paintAge();
        renderSat();
        askLook();
        return;
      }
      if (msg.type === "error") {
        sat.error = msg.error || "catalog error";
        paintAge();
        renderSat();
        return;
      }
      if (msg.type === "look") {
        sat.visible = msg.visible || [];
        sat.lastLook = msg.at || Date.now();
        if (sat.mode === "sat") {
          paintUp();
          matchAim();
        }
      }
    };
    sat.worker.onerror = () => {
      sat.error = "Worker failed";
      paintAge();
      renderSat();
    };
    sat.worker.postMessage({ type: "load", url: STARLINK_CATALOG });
  };

  const bind = () => {
    $("see-tab-launch")?.addEventListener("click", () => setMode("launch"));
    $("see-tab-sat")?.addEventListener("click", () => setMode("sat"));
    const see = sensors();
    if (see && see.onLocation) see.onLocation(() => renderSat());
    if (see && see.onAim) see.onAim(() => sat.mode === "sat" && matchAim());
    const q = new URLSearchParams(location.search);
    if (q.get("mode") === "identify" || location.hash === "#identify") setMode("sat");
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
