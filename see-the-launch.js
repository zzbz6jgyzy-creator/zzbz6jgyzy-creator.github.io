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

  const compassSvg = (deg) => {
    const rot = deg;
    return `<svg class="see-compass" viewBox="0 0 100 100" role="img" aria-label="Look ${esc(compass(deg))}">
      <circle cx="50" cy="50" r="46" fill="#121417" stroke="rgba(255,255,255,.12)"/>
      <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,.08)"/>
      <text x="50" y="14" text-anchor="middle" fill="#9aa3ad" font-size="7" font-family="IBM Plex Mono,monospace">N</text>
      <text x="50" y="96" text-anchor="middle" fill="#9aa3ad" font-size="7" font-family="IBM Plex Mono,monospace">S</text>
      <text x="8" y="53" fill="#9aa3ad" font-size="7" font-family="IBM Plex Mono,monospace">W</text>
      <text x="88" y="53" fill="#9aa3ad" font-size="7" font-family="IBM Plex Mono,monospace">E</text>
      <g transform="rotate(${rot.toFixed(1)} 50 50)">
        <polygon points="50,16 55,52 50,46 45,52" fill="#e31937"/>
        <polygon points="50,84 55,52 50,58 45,52" fill="rgba(255,255,255,.28)"/>
      </g>
      <circle cx="50" cy="50" r="3" fill="#fff"/>
    </svg>`;
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
      $("see-brief").innerHTML = "";
      $("see-alerts").innerHTML = "";
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
      <div class="see-tile"><span>Look</span><b>${esc(lookTxt)}</b><small>${
        s ? `Toward the pad at ${Math.round(s.padBrg)}°, then along the climb.` : "Direction appears once you pick a place."
      }</small></div>
      <div class="see-tile"><span>Your sky</span><b>${esc(s && s.cloud != null ? `${Math.round(s.cloud)}%` : "—")}</b><small>${esc(
        cloudTxt
      )}</small></div>
      <div class="see-tile"><span>This flight</span><b>${esc(pad.short)}</b><small>${esc(formatWhen(launch))} · typical azimuth ${s ? Math.round(s.az) : pad.az}°</small></div>`;

    $("see-brief").innerHTML = s
      ? `${compassSvg(s.look)}
        <div>
          <h2>${esc(launch.title)}</h2>
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
          <p>Look ${esc(compass(s.look))} (${Math.round(s.look)}°). Peak plume sits around ${Math.max(0, s.elev80).toFixed(0)}° above the horizon if the vehicle reaches 80 km on this heading.</p>
        </div>`
      : "";

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
    fetch(LL2)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        launches = mergeLaunches(j?.results || []);
        const live = $("see-live");
        if (live) live.textContent = `Saved on this device · Launch Library ${new Date().toISOString().slice(0, 16)}Z`;
        if (state.lat != null) loadWeather();
        else render();
      })
      .catch(() => {
        launches = mergeLaunches([]);
        if (state.lat != null) loadWeather();
        else render();
      });
    if (state.lat != null) loadWeather();
  };

  boot();
})();
