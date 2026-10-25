(() => {
  "use strict";
  const M = window.SDLaunchViewing, V = window.SDLaunchViewingView, C = window.SDCalendarStudio, $ = (id) => document.getElementById(id), root = $("lv-app");
  if (!root || !M || !V) return;
  let data, world;
  try {
    data = JSON.parse($("lv-data").textContent);
    world = JSON.parse($("lv-world").textContent);
    if (data.version !== 1 || !data.launches.length) return;
  } catch {
    return;
  }
  const KEY = "sd-launch-viewing-v2";
  let raw = {}, storage = true;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || "null") || JSON.parse(localStorage.getItem("sd-see-launch-v1") || "{}") || {};
  } catch {
    storage = false;
  }
  let state = { ...M.readPreferences(raw), map: "globe", site: "all", sort: "time" }, sourceFailed = false, cityRows = null, cityPromise = null, suggestions = [], active = 0, wx = null, wxLoading = false, wxError = "", wxAbort = null, geoSequence = 0, fieldHeading = null, compassAttached = false, compassTimer = null, searchSeq = 0;
  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "identify" || location.hash === "#identify") {
    location.replace("/starlink.html#identify");
    return;
  }
  if (params.has("lat") && params.has("lon")) {
    const shared = M.location({ lat: params.get("lat"), lon: params.get("lon"), name: params.get("place") || "Shared approximate location" });
    if (shared) state.place = shared;
  }
  if (params.get("launch")) state.launchId = params.get("launch");
  const hash = location.hash.replace("#lv-", "");
  if (["sky", "launches", "guide", "method"].includes(hash)) state.view = hash;
  if (hash === "compass-card") state.view = "sky";
  const rows = () => M.upcoming(data), selected = () => rows().find((e) => e.id === state.launchId) || rows().find((e) => e.pad) || rows()[0];
  function observer() {
    if (state.place) return state.place;
    const e = selected();
    return data.presets.find((p) => p.name === (e?.pad?.coast === "west" ? "Santa Barbara" : e?.pad?.short === "Starbase" ? "South Padre Island" : "Cocoa Beach")) || data.presets[0];
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ place: state.place, launchId: state.launchId, view: state.view, units: state.units, horizon: state.horizon, altitude: state.altitude, downrange: state.downrange }));
    } catch {
      storage = false;
    }
    $("lv-storage").textContent = storage ? "Preferences saved on this browser. City search stays local. Location is excluded from shared links unless you include it." : "Browser storage is unavailable. Preferences last for this visit only.";
  }
  let messageTimer;
  function message(text) {
    $("lv-message").textContent = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => $("lv-message").textContent = "", 6e3);
  }
  function fresh() {
    const age = Date.now() - Date.parse(data.checked), stale = !Number.isFinite(age) || age > 3 * 36e5;
    $("lv-freshness").textContent = (sourceFailed || stale ? "Launch times may be out of date · as of " : "Launch times as of ") + (v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Dublin'})+' Irish time':String(v||''))(data.checked) + ". Targets may change.";
    $("lv-freshness").classList.toggle("lv-stale", stale || sourceFailed);
  }
  function resetWeather() {
    wxAbort?.abort();
    wxAbort = null;
    wx = null;
    wxLoading = false;
    wxError = "";
  }
  function closeSuggestions() {
    $("lv-suggestions").hidden = true;
    $("lv-location").setAttribute("aria-expanded", "false");
    $("lv-location").removeAttribute("aria-activedescendant");
  }
  function setPlace(place) {
    const valid = M.location(place);
    if (!valid) return;
    state.place = valid;
    compassNote = "";
    fieldHeading = null;
    geoSequence++;
    resetWeather();
    $("lv-location").value = M.cityLabel(valid);
    closeSuggestions();
    draw();
    message("Viewing location set to " + valid.name + ".");
  }
  function controls() {
    const e = selected();
    if (e) state.launchId = e.id;
    $("lv-launch").innerHTML = rows().map((e2) => '<option value="' + M.esc(e2.id) + '">' + M.esc(M.shortTitle(e2)) + "</option>").join("");
    $("lv-launch").value = state.launchId;
    for (const key of ["units", "horizon", "altitude", "downrange"]) $("lv-" + key).value = state[key];
  }
  function showView(view, scroll = false) {
    if (view !== "sky" && (compassAttached || compassMode === "requesting")) stopCompass();
    state.view = view;
    root.querySelectorAll("[data-panel]").forEach((e) => e.hidden = e.dataset.panel !== view);
    root.querySelectorAll("[data-view]").forEach((e) => {
      if (e.dataset.view === view) e.setAttribute("aria-current", "page");
      else e.removeAttribute("aria-current");
    });
    persist();
    if (scroll) $("lv-" + view).scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  function launchList() {
    const p = observer();
    let list = rows().filter((e) => state.site === "all" || state.site === "west" && e.pad?.coast === "west" || state.site === "starbase" && /sb|starbase/.test(e.pad?.id || "") || state.site === "cape" && /slc40|lc39a|cape/.test(e.pad?.id || ""));
    if (state.sort === "distance") list.sort((a, b) => (a.pad ? M.distance(p, a.pad) : Infinity) - (b.pad ? M.distance(p, b.pad) : Infinity));
    $("lv-launch-list").innerHTML = list.length ? list.map((e) => V.launchCard(e, p, state, !state.place)).join("") : '<div class="lv-empty"><h3>No dated targets in this filter.</h3><p>Try another launch site or explore the Calendar for unconfirmed plans.</p></div>';
  }
  function weatherPanel() {
    const e = selected(), p = observer(), button = $("lv-weather");
    button.disabled = !state.place || e?.precision !== "datetime" || wxLoading;
    button.textContent = wxLoading ? "Checking NWS…" : !state.place ? "Set your location to check weather" : e?.precision !== "datetime" ? "Wait for a timed target" : "Check NWS cloud forecast ↗";
    if (wxLoading) {
      $("lv-weather-result").innerHTML = '<p class="lv-weather-empty">Checking the forecast interval…</p>';
      return;
    }
    if (wxError) {
      $("lv-weather-result").innerHTML = '<p class="lv-weather-empty">' + M.esc(wxError) + '</p><p class="lv-small">Unknown weather does not mean clear skies. You can retry the check.</p>';
      return;
    }
    if (!wx) {
      $("lv-weather-result").innerHTML = '<p class="lv-weather-empty">No forecast checked.</p><p class="lv-small">NWS receives the selected coordinates only when you check. Day-only targets and seasonal outlooks have no launch-hour forecast.</p>';
      return;
    }
    if (!wx.available) {
      $("lv-weather-result").innerHTML = '<p class="lv-weather-empty">Outside the available forecast.</p><p class="lv-small">' + M.esc(wx.reason) + "</p>";
      return;
    }
    $("lv-weather-result").innerHTML = '<div class="lv-weather-stats"><div><span>Forecast cloud cover</span><b>' + Math.round(wx.cloud) + "<small>%</small></b></div><div><span>Precipitation chance</span><b>" + (wx.rain === null ? "—" : Math.round(wx.rain) + "<small>%</small>") + '</b></div></div><p class="lv-small">' + (wx.stale ? "Older forecast · " : "Updated ") + M.esc(wx.updated) + ' · <a href="https://forecast.weather.gov/MapClick.php?lat=' + p.lat.toFixed(3) + "&lon=" + p.lon.toFixed(3) + '">National Weather Service ↗</a></p><p class="lv-small">Valid for this launch target. Ground-level grid forecast; cloud along the complete line of sight and launch clearance are not assessed.</p>';
  }
  function draw() {
    const e = selected(), p = observer();
    if (!e) {
      $("lv-brief").innerHTML = "<h2>No dated upcoming launches in the cache.</h2><p>Check the Calendar for planning targets and source updates.</p>";
      $("lv-launch-list").innerHTML = "<p>No dated upcoming targets.</p>";
      return;
    }
    state.launchId = e.id;
    const a = V.analysis(data, e, p, state, !state.place, world);
    $("lv-map").innerHTML = a.map;
    $("lv-metrics").innerHTML = a.metrics;
    $("lv-brief").innerHTML = a.copy;
    $("lv-sky-visual").innerHTML = a.sky;
    $("lv-compass").innerHTML = a.compass;
    $("lv-direction-text").innerHTML = a.scenario ? "<b>" + Math.round(a.scenario.bearing) + "° true</b><p>" + M.compass(a.scenario.bearing) + " · toward the pad</p>" : "<b>Pad unknown</b>";
    $("lv-launch-info").innerHTML = "<b>" + M.esc(e.title) + "</b><p>" + M.esc(M.when(e, p.zone)) + "</p><span>" + M.esc(e.pad?.name || "Pad unconfirmed") + "</span>";
    $("lv-location-status").textContent = state.place ? M.cityLabel(p) + " · " + p.lat.toFixed(2) + "°, " + p.lon.toFixed(2) + "° · " + p.zone : "Example view · " + p.name + ". Set your location for your own briefing.";
    $("lv-location-status").classList.toggle("lv-example", !state.place);
    root.querySelectorAll("[data-map]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.map === state.map));
    $("lv-source-content").innerHTML = "<p>" + M.esc(e.note) + "</p>" + V.sources(e);
    $("lv-field-open").disabled = !state.place || !a.scenario;
    $("lv-copy-brief").disabled = !state.place;
    $("lv-share-open").disabled = !e;
    launchList();
    weatherPanel();
    fresh();
    persist();
    compassPaint();
    if ($("lv-field").open) fieldDraw();
  }
  function paintSuggestions(items) {
    suggestions = items;
    active = 0;
    const box = $("lv-suggestions"), input = $("lv-location");
    box.hidden = !items.length;
    input.setAttribute("aria-expanded", String(!!items.length));
    box.innerHTML = items.map((p, i) => '<li role="option" id="lv-option-' + i + '" aria-selected="' + (i === active) + '"><button type="button" tabindex="-1" data-suggestion="' + i + '"><b>' + M.esc(p.name) + "</b><span>" + M.esc([p.region, p.country, p.zone].filter(Boolean).join(" · ")) + "</span></button></li>").join("");
    if (items.length) input.setAttribute("aria-activedescendant", "lv-option-0");
    else input.removeAttribute("aria-activedescendant");
  }
  async function search() {
    const input = $("lv-location"), q = input.value.trim(), seq = ++searchSeq, pin = M.coordinates(q);
    if (pin) {
      paintSuggestions([pin]);
      return;
    }
    if (q.length < 2) {
      closeSuggestions();
      return;
    }
    const local = data.presets.filter((p) => M.cityLabel(p).toLowerCase().includes(q.toLowerCase()));
    paintSuggestions(local.slice(0, 8));
    if (!cityRows) {
      if (!cityPromise) cityPromise = fetch("/data/viewing/cities.json", { signal: AbortSignal.timeout(12e3) }).then((r) => {
        if (!r.ok) throw Error("City list unavailable");
        return r.json();
      }).then((d) => {
        if (d.version !== 1 || !Array.isArray(d.cities)) throw Error("Bad city data");
        cityRows = d.cities;
        return cityRows;
      }).catch(() => {
        cityPromise = null;
        return null;
      });
      await cityPromise;
    }
    if (seq !== searchSeq || input.value.trim() !== q) return;
    if (cityRows) {
      const all = M.searchCities(q, cityRows), seen = new Set(local.map((p) => p.lat.toFixed(3) + "," + p.lon.toFixed(3)));
      paintSuggestions([...local, ...all.filter((p) => !seen.has(p.lat.toFixed(3) + "," + p.lon.toFixed(3)))].slice(0, 8));
    }
    if (!suggestions.length) $("lv-location-status").textContent = "No city match. Try city and country code, a launch-region preset, or latitude, longitude.";
  }
  let searchTimer;
  $("lv-location").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(search, 180);
  });
  $("lv-search").addEventListener("click", async () => {
    const p = M.coordinates($("lv-location").value);
    if (p) return setPlace(p);
    await search();
    if (suggestions.length === 1) setPlace(suggestions[0]);
  });
  $("lv-location").addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") return closeSuggestions();
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (suggestions[active]) setPlace(suggestions[active]);
      else {
        const p = M.coordinates(ev.target.value);
        if (p) setPlace(p);
        else search();
      }
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(ev.key) || !suggestions.length) return;
    ev.preventDefault();
    active = (active + (ev.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length;
    root.querySelectorAll("[role=option]").forEach((e, i) => e.setAttribute("aria-selected", i === active));
    ev.target.setAttribute("aria-activedescendant", "lv-option-" + active);
    $("lv-option-" + active).scrollIntoView({ block: "nearest" });
  });
  $("lv-suggestions").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-suggestion]");
    if (b) setPlace(suggestions[Number(b.dataset.suggestion)]);
  });
  $("lv-geo").addEventListener("click", () => {
    if (!navigator.geolocation) {
      $("lv-location-status").textContent = "This browser cannot share a location. Search a city or enter coordinates.";
      return;
    }
    const seq = ++geoSequence;
    $("lv-location-status").textContent = "Finding your location…";
    $("lv-compass-status").textContent = "Finding your observing spot…";
    navigator.geolocation.getCurrentPosition((pos) => {
      if (seq !== geoSequence) return;
      setPlace({ name: "Your location", lat: pos.coords.latitude, lon: pos.coords.longitude, zone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    }, (err) => {
      if (seq !== geoSequence) return;
      $("lv-compass-status").textContent = $("lv-location-status").textContent = /Twitter|FBAN|Instagram|LinkedInApp/i.test(navigator.userAgent) ? "This in-app browser may block location. Open in Safari or Chrome, or search a city." : err.code === 1 ? "Location access is blocked. Search a city or enter coordinates." : "Location could not be found. Search a city or enter coordinates.";
    }, { enableHighAccuracy: false, timeout: 12e3, maximumAge: 6e4 });
  });
  $("lv-forget").addEventListener("click", () => {
    state.place = null;
    geoSequence++;
    searchSeq++;
    resetWeather();
    stopCompass();
    closeSuggestions();
    $("lv-location").value = "";
    try {
      localStorage.removeItem("sd-see-launch-v1");
    } catch {
    }
    draw();
    message("Location forgotten on this browser.");
  });
  root.addEventListener("click", (ev) => {
    const b = ev.target.closest("button,a");
    if (!b) return;
    if (b.matches("a") && (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || ev.button !== 0)) return;
    if (b.dataset.view) {
      ev.preventDefault();
      showView(b.dataset.view, true);
    }
    if (b.matches('a[href="#lv-guide"]')) {
      ev.preventDefault();
      showView("guide", true);
    }
    if (b.matches('a[href="#lv-sky"]')) {
      ev.preventDefault();
      showView("sky", true);
    }
    if (b.dataset.place) {
      const p = data.presets.find((p2) => p2.name === b.dataset.place);
      if (p) setPlace(p);
    }
    if (b.dataset.pick) {
      ev.preventDefault();
      state.launchId = b.dataset.pick;
      resetWeather();
      controls();
      draw();
      showView("sky", true);
    }
    if (b.dataset.map) {
      state.map = b.dataset.map;
      draw();
    }
  });
  $("lv-launch").addEventListener("change", (ev) => {
    state.launchId = ev.target.value;
    resetWeather();
    draw();
  });
  for (const key of ["units", "horizon", "altitude", "downrange"]) $("lv-" + key).addEventListener("change", (ev) => {
    state[key] = key === "units" ? ev.target.value : Number(ev.target.value);
    draw();
  });
  for (const key of ["site", "sort"]) $("lv-" + key).addEventListener("change", (ev) => {
    state[key] = ev.target.value;
    launchList();
  });
  const weatherCache = /* @__PURE__ */ new Map();
  $("lv-weather").addEventListener("click", async () => {
    const e = selected(), p = state.place;
    if (!p || e?.precision !== "datetime") return;
    resetWeather();
    if (Date.parse(e.start) - Date.now() > 7 * 864e5) {
      wxError = "This target is beyond the seven-day forecast window.";
      weatherPanel();
      return;
    }
    if (p.country && p.country !== "US") {
      wxError = "NWS forecasts do not cover this selected country.";
      weatherPanel();
      return;
    }
    wxLoading = true;
    weatherPanel();
    const controller = new AbortController();
    wxAbort = controller;
    const timeout = setTimeout(() => controller.abort(), 16e3), id = e.id, pointKey = p.lat.toFixed(3) + "," + p.lon.toFixed(3), valid = () => state.place && selected()?.id === id && selected()?.start === e.start && state.place.lat.toFixed(3) + "," + state.place.lon.toFixed(3) === pointKey;
    try {
      let grid = weatherCache.get(pointKey);
      if (!grid || Date.now() - grid.t > 15 * 6e4) {
        const get = async (link) => {
          if (!/^https:\/\/api\.weather\.gov\//.test(link)) throw Error("Unexpected forecast link");
          const r = await fetch(link, { signal: controller.signal, headers: { Accept: "application/geo+json" } });
          if (!r.ok) throw Error(r.status === 404 ? "Outside NWS coverage" : "Forecast unavailable");
          return r.json();
        };
        const point = await get("https://api.weather.gov/points/" + pointKey), url = point?.properties?.forecastGridData;
        if (!url) throw Error("Outside NWS coverage");
        grid = { t: Date.now(), data: await get(url) };
        weatherCache.set(pointKey, grid);
      }
      if (valid() && !controller.signal.aborted) {
        wx = M.weather(grid.data, e.start);
        if (!wx) throw Error("No usable cloud forecast");
      }
    } catch (error) {
      if (valid() && wxAbort === controller) wxError = controller.signal.aborted ? "Forecast request timed out." : String(error.message).includes("coverage") ? "NWS does not cover this point. Check your local forecast." : "Forecast unavailable. Try again later.";
    } finally {
      clearTimeout(timeout);
      if (wxAbort === controller) {
        wxLoading = false;
        wxAbort = null;
        weatherPanel();
      }
    }
  });
  async function copy(text, status) {
    try {
      await navigator.clipboard.writeText(text);
      status("Copied.");
    } catch {
      status("Copy is unavailable here. Select the link or text below.");
    }
  }
  $("lv-copy-brief").addEventListener("click", () => {
    const p = observer(), e = selected();
    copy(M.brief(e, p, M.scenario(e, p, state)), (text) => {
      message(text);
      if (text !== "Copied.") {
        $("lv-share-text").value = M.brief(e, p, M.scenario(e, p, state));
        $("lv-share-location").checked = false;
        $("lv-share").showModal();
      }
    });
  });
  function shareLink() {
    const u = new URL("/see-the-launch.html", location.origin);
    u.searchParams.set("launch", selected()?.id || "");
    if ($("lv-share-location").checked && state.place) {
      u.searchParams.set("lat", state.place.lat.toFixed(2));
      u.searchParams.set("lon", state.place.lon.toFixed(2));
      u.searchParams.set("place", "Shared approximate location");
    }
    return u.href;
  }
  $("lv-share-open").addEventListener("click", () => {
    $("lv-share-location").checked = false;
    $("lv-share-location").disabled = !state.place;
    $("lv-share-status").textContent = "";
    $("lv-share-text").value = shareLink();
    $("lv-share").showModal();
  });
  $("lv-share-location").addEventListener("change", () => $("lv-share-text").value = shareLink());
  $("lv-share-copy").addEventListener("click", () => copy($("lv-share-text").value, (text) => $("lv-share-status").textContent = text));
  $("lv-share-close").addEventListener("click", () => $("lv-share").close());
  // One explicit sensor session drives both the visible card and the full-screen field view.
  const Compass = window.SDLaunchCompass;
  let compassMode = 'off', compassNote = '', lastRaw = null, lastValid = 0, sensorWatch = null, permissionSequence = 0, northCorrection = null;
  function geometry() { return M.scenario(selected(), observer(), state); }
  function sensorAngle() { return Number.isFinite(screen.orientation?.angle) ? screen.orientation.angle : Number.isFinite(window.orientation) ? window.orientation : 0; }
  function compassPaint() {
    const s = geometry(), hasPlace = !!state.place, live = compassMode === 'live' && fieldHeading !== null && hasPlace && !!s;
    const messages = {
      off: hasPlace ? 'Ready. Hold the device nearly flat and tap Start live compass.' : 'Choose your observing spot first. The example location is not your position.',
      requesting: 'Allow Motion & Orientation access when your browser asks.',
      waiting: 'Waiting for a compass reading. Hold the device nearly flat and gently turn it.',
      live: 'Live device heading · corrected to approximate true north with WMM2025.',
      blocked: 'Compass access was denied or blocked. Allow Motion & Orientation in your browser’s site settings, then try again. In an in-app browser, open this page in Safari or Chrome.',
      unsupported: 'This browser or device has no usable compass API. Try a sensor-equipped phone or tablet in Safari or Chrome. The north-up pad bearing still works.',
      insecure: 'Live compass requires HTTPS. Open https://superchargeddaily.com/see-the-launch.html in Safari or Chrome.',
      timeout: 'No absolute compass reading arrived. Try gently turning the device, check motion-sensor permission, or open in Safari or Chrome. Some tablets have no compass hardware.',
      level: 'Hold the screen flatter, face up. An upright screen cannot give a reliable top-edge direction.',
      calibrating: 'Compass accuracy is low. Move away from magnets, metal cases and vehicles; gently move the device in a figure eight, then hold it flat.',
      stale: 'The heading has stopped updating. Gently turn the device to get a fresh reading; the arrow is not currently live.',
      model: 'True-north correction is unavailable for this location or date. Use the static true-north bearing with a separate compass.',
      paused: 'Compass paused while this page was hidden. Tap Start live compass to resume.'
    };
    const labels = { off:'North-up view',requesting:'Permission needed',waiting:'Finding heading',live:'Live compass',blocked:'Access blocked',unsupported:'Sensor unavailable',insecure:'HTTPS required',timeout:'No heading received',level:'Hold flatter',calibrating:'Check accuracy',stale:'Reading paused',model:'Static bearing',paused:'Paused' };
    const cue = !hasPlace ? 'Set your location to get your own pad direction.' : !s ? 'Choose a launch with a known pad.' : live ? Compass.turn(s.bearing,fieldHeading).text : compassMode === 'level' ? 'Hold the device flatter to continue.' : compassMode === 'calibrating' ? 'Calibrate before following the arrow.' : compassMode === 'stale' ? 'Move the device to refresh the heading.' : 'North-up reference · start the compass to turn toward the pad.';
    const headingText = live ? Math.round(fieldHeading)+'° true · your screen’s top edge'+(northCorrection?.accuracy!==null&&northCorrection?.accuracy!==undefined?' · sensor ±'+Math.round(northCorrection.accuracy)+'°':'') : 'Device heading is not currently live.';
    const text = compassNote || messages[compassMode] || messages.off;
    $('lv-compass-state').textContent = labels[compassMode] || labels.off;
    root.querySelector('.lv-compass-top').textContent = live ? 'TOP OF YOUR SCREEN' : 'NORTH-UP / NOT LIVE';
    $('lv-compass-card').dataset.live = String(live);
    $('lv-compass-card').dataset.aligned = String(live && Compass.turn(s.bearing,fieldHeading).aligned);
    $('lv-field').dataset.live = String(live);
    $('lv-compass-cue').textContent = cue;
    $('lv-device-heading').textContent = headingText;
    $('lv-compass-status').textContent = text;
    $('lv-field-cue').textContent = cue;
    $('lv-field-heading').textContent = headingText;
    $('lv-field-sensor').textContent = text;
    for (const id of ['lv-compass-start','lv-sensor']) {
      const button=$(id);button.textContent=compassMode==='requesting'?'Allow compass access…':compassAttached?'Stop live compass':['blocked','timeout','unsupported'].includes(compassMode)?'Try compass again':'Start live compass';
      button.setAttribute('aria-pressed',String(compassAttached));button.disabled=compassMode==='requesting';
    }
    for (const id of ['lv-compass','lv-field-compass']) {
      const svg=$(id).querySelector('svg'),dial=svg?.querySelector('[data-lv-compass-dial]');
      dial?.setAttribute('transform','rotate('+(live?-fieldHeading:0)+' 110 110)');
      if(svg&&s)svg.setAttribute('aria-label','Pad bearing '+Math.round(s.bearing)+' degrees true. '+(live?headingText+'. '+cue:'North-up reference. '+cue));
    }
  }
  function fieldDraw() {
    const e=selected(),p=observer(),s=geometry();if(!e||!s)return;
    $('lv-field-title').textContent=e.title;$('lv-field-bearing').textContent=Math.round(s.bearing)+'°';
    $('lv-field-direction').textContent=M.compass(s.bearing)+' · pad bearing · true north';
    $('lv-field-compass').innerHTML=V.compass(s,'field');
    $('lv-field-time').textContent=M.when(e,p.zone);$('lv-field-place').textContent=M.cityLabel(p)+' · '+M.km(s.padDistance,state.units)+' from pad';
    compassPaint();
  }
  function processHeading(ev,rotation=false) {
    if(!compassAttached||!Compass)return;
    const reading=Compass.sample(ev,sensorAngle());
    if(!reading){if(typeof ev.webkitCompassAccuracy==='number'&&ev.webkitCompassAccuracy<0){compassMode='calibrating';fieldHeading=null;compassPaint();}return;}
    if(!rotation)lastRaw=ev;
    if(reading.tilted){compassMode='level';fieldHeading=null;compassPaint();return;}
    if(reading.accuracy!==null&&reading.accuracy>25){compassMode='calibrating';fieldHeading=null;compassPaint();return;}
    const corrected=Compass.corrected(reading,state.place);
    if(!corrected){compassMode='model';fieldHeading=null;compassPaint();return;}
    clearTimeout(compassTimer);northCorrection=corrected;
    fieldHeading=Compass.smooth(rotation?null:fieldHeading,corrected.heading);
    if(!rotation)lastValid=Date.now();compassMode='live';compassNote='';compassPaint();
  }
  function orientation(ev) {
    if(!compassAttached)return;
    if(typeof ev.webkitCompassHeading!=='number'&&ev.absolute!==true)return;
    // Update immediately: a device may emit only one reading for a small movement.
    // The SVG dial transform changes in place; its tick marks are not rebuilt.
    lastRaw=ev;
    processHeading(ev);
  }
  function screenChanged(){fieldHeading=null;if(lastRaw)processHeading(lastRaw,true);}
  function stopCompass(mode='off',note='') {
    permissionSequence++;
    window.removeEventListener('deviceorientationabsolute',orientation,true);window.removeEventListener('deviceorientation',orientation,true);
    screen.orientation?.removeEventListener?.('change',screenChanged);window.removeEventListener('orientationchange',screenChanged);
    compassAttached=false;fieldHeading=null;lastRaw=null;northCorrection=null;
    clearTimeout(compassTimer);clearInterval(sensorWatch);
    compassMode=mode;compassNote=note;compassPaint();
  }
  async function toggleCompass() {
    if(compassAttached){stopCompass();return;}
    if(!state.place){compassNote='Choose your actual observing spot before starting. Search a city, enter coordinates, or tap Use my location.';compassPaint();showView('sky');$('lv-location').scrollIntoView({block:'center'});$('lv-location').focus({preventScroll:true});return;}
    if(!geometry()){compassNote='Choose a launch with a known pad before starting.';compassPaint();return;}
    if(!window.isSecureContext){stopCompass('insecure');return;}
    if(typeof window.DeviceOrientationEvent==='undefined'||!Compass){stopCompass('unsupported');return;}
    const seq=++permissionSequence;compassMode='requesting';compassNote='';compassPaint();
    try {
      // This call stays directly in the click handler, before any unrelated await.
      if(typeof window.DeviceOrientationEvent.requestPermission==='function'){
        const result=await window.DeviceOrientationEvent.requestPermission(true);
        if(seq!==permissionSequence)return;if(result!=='granted'){stopCompass('blocked');return;}
      }
      if(seq!==permissionSequence)return;
      window.addEventListener('deviceorientationabsolute',orientation,true);window.addEventListener('deviceorientation',orientation,true);
      screen.orientation?.addEventListener?.('change',screenChanged);window.addEventListener('orientationchange',screenChanged);
      compassAttached=true;compassMode='waiting';compassPaint();
      compassTimer=setTimeout(()=>{if(fieldHeading===null&&!['calibrating','level','model'].includes(compassMode))stopCompass('timeout');},10000);
      sensorWatch=setInterval(()=>{if(compassMode==='live'&&Date.now()-lastValid>20000){compassMode='stale';fieldHeading=null;compassPaint();}},1000);
    }catch{if(seq===permissionSequence)stopCompass('blocked');}
  }
  function openCompass() {
    showView('sky');$('lv-compass-card').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('lv-compass-card').focus({preventScroll:true});
    history.replaceState(null,'',location.pathname+location.search+'#lv-compass-card');
  }
  root.querySelectorAll('[data-compass-jump]').forEach(a=>a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openCompass();}));
  $('lv-compass-start').addEventListener('click',toggleCompass);$('lv-sensor').addEventListener('click',toggleCompass);
  $('lv-compass-location').addEventListener('click',()=>{compassNote='';$('lv-geo').click();});
  function openField() {
    if(!state.place){openCompass();compassNote='Set your observing location first to open your own full-screen compass.';compassPaint();return;}
    $('lv-field').classList.remove('lv-night');$('lv-night').setAttribute('aria-pressed','false');fieldDraw();$('lv-field').showModal();
  }
  $('lv-field-open').addEventListener('click',openField);$('lv-compass-expand').addEventListener('click',openField);
  $('lv-field-close').addEventListener('click',()=>$('lv-field').close());
  $('lv-field').addEventListener('close',()=>stopCompass());
  $('lv-night').addEventListener('click',()=>{const on=$('lv-field').classList.toggle('lv-night');$('lv-night').setAttribute('aria-pressed',on);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(compassAttached||compassMode==='requesting'))stopCompass('paused');});
  window.addEventListener('pagehide',()=>stopCompass());
  for (const id of ["lv-share", "lv-field"]) $(id).addEventListener("click", (ev) => {
    if (ev.target === $(id)) $(id).close();
  });
  root.classList.add("lv-enhanced");
  controls();
  if (state.place) $("lv-location").value = M.cityLabel(state.place);
  draw();
  showView(state.view);
  if (hash === "compass-card") openCompass();
  const query = new URL(location.href);
  query.searchParams.delete("lat");
  query.searchParams.delete("lon");
  query.searchParams.delete("place");
  history.replaceState(null, "", query);
  fetch("/data/launch-viewing.json", { signal: AbortSignal.timeout(8e3) }).then((r) => {
    if (!r.ok) throw Error("No fresh snapshot");
    return r.json();
  }).then((next) => {
    if (next.version !== 1 || !Array.isArray(next.launches) || !next.launches.length || !Array.isArray(next.presets) || next.launches.some((e) => !e || typeof e.id !== "string" || typeof e.title !== "string" || !Array.isArray(e.sources) || e.pad && !M.location(e.pad)) || Date.parse(next.checked) < Date.parse(data.checked)) throw Error("Invalid or older snapshot");
    const previous = selected();
    data = next;
    if (previous?.start !== selected()?.start || previous?.id !== selected()?.id) resetWeather();
    controls();
    draw();
  }).catch(() => {
    sourceFailed = true;
    fresh();
  });
})();
