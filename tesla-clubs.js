(() => {
  "use strict";
  const DATA = window.TESLA_CLUBS;
  if (!DATA) return;

  const $ = (id) => document.getElementById(id);
  const setHint = (msg, hold) => {
    const hint = $("tc-hint");
    if (!hint) return;
    hint.textContent = msg || "";
    hint.dataset.hold = hold ? "1" : "";
  };
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const GEO = "https://geocoding-api.open-meteo.com/v1/search";
  const BDC = "https://api.bigdatacloud.net/data/reverse-geocode-client";
  const PHOTON = "https://photon.komoot.io/reverse";
  const NOM = "https://nominatim.openstreetmap.org/reverse";
  const R = 6371;
  const KEY = "sd-tesla-clubs-v1";
  const ALIAS = {
    usa: "United States",
    "united states of america": "United States",
    uk: "United Kingdom",
    "great britain": "United Kingdom",
    "united kingdom of great britain and northern ireland": "United Kingdom",
    england: "United Kingdom",
    scotland: "United Kingdom",
    wales: "United Kingdom",
    "northern ireland": "United Kingdom",
    "czech republic": "Czechia",
    turkey: "Türkiye",
    "hong kong": "Hong Kong & Macau",
    macau: "Hong Kong & Macau",
    "hong kong sar": "Hong Kong & Macau",
    "republic of ireland": "Ireland",
    eire: "Ireland",
    "eire ireland": "Ireland",
  };
  const ISO = {
    ae: "United Arab Emirates",
    at: "Austria",
    au: "Australia",
    be: "Belgium",
    bg: "Bulgaria",
    br: "Brazil",
    ca: "Canada",
    ch: "Switzerland",
    cl: "Chile",
    co: "Colombia",
    cz: "Czechia",
    de: "Germany",
    dk: "Denmark",
    es: "Spain",
    fr: "France",
    gb: "United Kingdom",
    hk: "Hong Kong & Macau",
    hu: "Hungary",
    ie: "Ireland",
    il: "Israel",
    in: "India",
    it: "Italy",
    jp: "Japan",
    kr: "South Korea",
    mo: "Hong Kong & Macau",
    mx: "Mexico",
    my: "Malaysia",
    nl: "Netherlands",
    no: "Norway",
    nz: "New Zealand",
    ph: "Philippines",
    pl: "Poland",
    pt: "Portugal",
    ro: "Romania",
    rs: "Serbia",
    se: "Sweden",
    sg: "Singapore",
    si: "Slovenia",
    sk: "Slovakia",
    th: "Thailand",
    tr: "Türkiye",
    tw: "Taiwan",
    us: "United States",
  };
  const DIRECTORY_COUNTRIES = [
    ...new Set(DATA.clubs.map((c) => c.country).filter((c) => c && c !== "Global" && c !== "International")),
  ];

  const state = { place: "", country: "", admin1: "", lat: null, lon: null, q: "", chip: "" };
  let suggestTimer = 0;

  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const countryOf = (s, iso) => {
    const code = String(iso || "")
      .trim()
      .toLowerCase();
    if (ISO[code]) return ISO[code];
    const n = norm(s);
    if (!n) return "";
    if (ALIAS[n]) return ALIAS[n];
    const exact = DIRECTORY_COUNTRIES.find((c) => norm(c) === n);
    if (exact) return exact;
    const contained = DIRECTORY_COUNTRIES.filter((c) => {
      const cn = norm(c);
      if (!cn || !n.includes(cn)) return false;
      if (cn === "ireland" && n.includes("northern ireland") && !n.includes("republic")) return false;
      return true;
    }).sort((a, b) => norm(b).length - norm(a).length);
    return contained[0] || "";
  };
  const toRad = (d) => (d * Math.PI) / 180;
  const haversine = (aLat, aLon, bLat, bLon) => {
    const p1 = toRad(aLat),
      p2 = toRad(bLat);
    const dp = toRad(bLat - aLat),
      dl = toRad(bLon - aLon);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const placeLine = (c) => [c.region, c.country].filter(Boolean).join(", ");
  const IDLE = "Search a town or city to see what’s near you. The full directory stays hidden.";
  const isLabeledNational = (c) => /^(national|nationwide|online|worldwide)/i.test(c.region || "");
  const isNational = (c) => isLabeledNational(c);
  const hasSearch = () => !!(state.place && state.lat != null) || !!norm(state.q);
  const inferAdmin = (place, country, admin1) => {
    if (admin1) return admin1;
    const parts = String(place || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 2) return countryOf(parts[1]) === countryOf(country) ? "" : parts[1];
    if (parts.length >= 3) return countryOf(parts[parts.length - 1]) === countryOf(country) ? parts[parts.length - 2] : parts[1];
    return "";
  };
  const regionMatch = (clubRegion, admin1, place) => {
    if (!clubRegion) return false;
    const r = norm(clubRegion);
    if (admin1 && r === norm(admin1)) return true;
    const hay = norm(place || "");
    if (!hay) return false;
    if (hay.includes(r)) return true;
    const city = hay.split(" ")[0];
    return !!(city && city.length >= 3 && (r === city || r.includes(` ${city} `) || r.endsWith(` ${city}`) || r.startsWith(`${city} `)));
  };
  const nameTouchesPlace = (c, admin1, place) => {
    const hay = norm([c.name, c.parent].join(" "));
    const city = norm(String(place || "").split(",")[0]);
    if (city && city.length >= 4 && hay.includes(city)) return true;
    if (!c.region && admin1) {
      const a = norm(admin1);
      if (a && a.length >= 4 && hay.includes(a)) return true;
    }
    return false;
  };

  const countries = DIRECTORY_COUNTRIES.slice().sort((a, b) => a.localeCompare(b));

  const inferCountryFromCoords = (lat, lon) => {
    let best = null;
    DATA.clubs.forEach((c) => {
      if (c.lat == null || !c.country || c.country === "Global" || c.country === "International") return;
      const d = haversine(lat, lon, c.lat, c.lon);
      if (!best || d < best.d) best = { country: c.country, d };
    });
    return best && best.d < 600 ? best.country : "";
  };

  const jsonOk = (r) => (r && r.ok ? r.json() : null);

  const fromBdc = (j) => {
    if (!j || (!j.countryName && !j.countryCode)) return null;
    const country = countryOf(j.countryName, j.countryCode);
    if (!country) return null;
    const city = j.city || j.locality || j.principalSubdivision || "";
    const admin1 = j.principalSubdivision || "";
    const place = [city, admin1, country].filter((v, i, a) => v && a.indexOf(v) === i).join(", ") || country;
    return { place, country, admin1 };
  };

  const fromPhoton = (j) => {
    const p = j?.features?.[0]?.properties;
    if (!p) return null;
    const country = countryOf(p.country, p.countrycode);
    if (!country) return null;
    const city = p.city || p.town || p.village || p.county || p.name || "";
    const admin1 = p.state || p.county || "";
    const place = [city, admin1, country].filter((v, i, a) => v && a.indexOf(v) === i).join(", ") || country;
    return { place, country, admin1 };
  };

  const fromNominatim = (j) => {
    const a = j?.address;
    if (!a) return null;
    const country = countryOf(a.country, a.country_code);
    if (!country) return null;
    const city = a.city || a.town || a.village || a.municipality || a.county || "";
    const admin1 = a.state || a.region || "";
    const place = [city, admin1, country].filter((v, i, a) => v && a.indexOf(v) === i).join(", ") || country;
    return { place, country, admin1 };
  };

  const resolveCoords = (lat, lon) =>
    fetch(`${BDC}?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
      .then(jsonOk)
      .then(fromBdc)
      .catch(() => null)
      .then(
        (hit) =>
          hit ||
          fetch(`${PHOTON}?lat=${lat}&lon=${lon}`)
            .then(jsonOk)
            .then(fromPhoton)
            .catch(() => null)
      )
      .then(
        (hit) =>
          hit ||
          fetch(`${NOM}?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=en`)
            .then(jsonOk)
            .then(fromNominatim)
            .catch(() => null)
      )
      .then((hit) => {
        if (hit) return hit;
        const country = inferCountryFromCoords(lat, lon);
        return {
          place: country ? `Your location, ${country}` : "Your location",
          country,
          admin1: "",
        };
      });

  const writeQuery = () => {
    const u = new URL(location.href);
    const set = (k, v) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    set("place", state.place);
    set("country", state.chip || state.country);
    set("q", state.q);
    if (state.lat != null) {
      u.searchParams.set("lat", String(state.lat));
      u.searchParams.set("lon", String(state.lon));
    } else {
      u.searchParams.delete("lat");
      u.searchParams.delete("lon");
    }
    history.replaceState(null, "", u.search ? `${u.pathname}${u.search}` : u.pathname);
  };

  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ place: state.place, country: state.country, admin1: state.admin1, lat: state.lat, lon: state.lon }));
    } catch {
      /* ignore */
    }
  };

  const matchesText = (c, q) => {
    if (!q) return true;
    const hay = norm([c.name, c.country, c.region, c.parent, c.kind].join(" "));
    return q.split(/\s+/).every((w) => hay.includes(w));
  };

  const scoreClub = (c) => {
    const q = norm(state.q);
    if (!matchesText(c, q)) return null;
    if (state.chip && c.country !== state.chip && c.country !== "Global" && c.country !== "International") return null;
    const located = state.lat != null;
    const hereCountry = countryOf(state.country);
    const sameCountry = hereCountry && countryOf(c.country) === hereCountry;
    const sameRegion = regionMatch(c.region, state.admin1, state.place);
    let dist = null;
    if (located && c.lat != null) dist = haversine(state.lat, state.lon, c.lat, c.lon);
    const worldwide = c.country === "Global" || c.country === "International";
    if (located) {
      if (worldwide) return null;
      if (hereCountry && !sameCountry) return null;
      if (!hereCountry && (dist == null || dist > 400)) return null;
      const namedHere = nameTouchesPlace(c, state.admin1, state.place);
      const nearby = dist != null && dist < (c.section === "club" ? 350 : 140);
      if (c.section === "chapter" && !sameRegion && !namedHere && !nearby) return null;
      if (c.section === "club") {
        const countryClub = isLabeledNational(c) || (!c.region && c.country !== "United States");
        if (!sameRegion && !countryClub && !namedHere && !nearby) return null;
      }
      if (c.section === "community" && !sameRegion && !namedHere && !isLabeledNational(c) && !( !c.region && sameCountry) && !nearby) return null;
    }
    let score = 0;
    if (sameCountry) score += 1200;
    if (sameRegion) score += 600;
    if (dist != null) score += Math.max(0, 400 - dist / 8);
    return { ...c, score, dist, sameCountry, sameRegion };
  };

  const ranked = (section) =>
    DATA.clubs
      .filter((c) => c.section === section)
      .map(scoreClub)
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const distLabel = (row) => {
    if (row.sameRegion) return "This region";
    if (row.sameCountry && isNational(row)) return "Nationwide";
    if (row.dist != null && row.dist < 25 && !isNational(row)) return `${Math.round(row.dist)} km`;
    if (row.dist != null && row.sameCountry && !isNational(row)) return `${Math.round(row.dist)} km`;
    if (row.sameCountry) return "This country";
    if (row.dist != null && row.dist < 400 && !isNational(row)) return `${Math.round(row.dist)} km`;
    return "";
  };

  const card = (c) => {
    const near = distLabel(c);
    const links = [];
    if (c.website) {
      const label = c.channel || "Website";
      links.push(`<a href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`);
    }
    if (c.email) links.push(`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`);
    if (c.x && c.xUrl) links.push(`<a href="${esc(c.xUrl)}" target="_blank" rel="noopener noreferrer">@${esc(c.x)}</a>`);
    return `<article class="tc-item">
      <h3>${esc(c.name)}</h3>
      <p class="tc-place">${esc(placeLine(c) || "Worldwide")}</p>
      ${c.parent ? `<p class="tc-parent">${esc(c.parent)}</p>` : ""}
      <div class="tc-meta">
        <span class="tc-pill">${esc(c.kind)}</span>
        ${near ? `<span class="tc-pill near">${esc(near)}</span>` : ""}
      </div>
      ${links.length ? `<p class="tc-links">${links.join("")}</p>` : ""}
    </article>`;
  };

  const fillSection = (id, secId, rows) => {
    const host = $(id);
    const wrap = $(secId);
    if (!host || !wrap) return;
    if (!rows.length) {
      wrap.hidden = true;
      host.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    host.innerHTML = rows.map(card).join("");
  };

  const fillCountries = () => {
    const sel = $("tc-cc");
    if (!sel || sel.dataset.ready) return;
    sel.innerHTML =
      `<option value="">All countries</option>` + countries.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    sel.dataset.ready = "1";
  };

  const render = () => {
    const idle = $("tc-idle");
    const now = $("tc-now");
    if (!hasSearch()) {
      if (idle) {
        idle.hidden = false;
        idle.textContent = IDLE;
      }
      if (now) {
        now.hidden = true;
        now.innerHTML = "";
      }
      ["tc-sec-club", "tc-sec-chapter", "tc-sec-community"].forEach((id) => {
        const el = $(id);
        if (el) el.hidden = true;
      });
      ["tc-clubs", "tc-chapters", "tc-communities"].forEach((id) => {
        const el = $(id);
        if (el) el.innerHTML = "";
      });
      const live = $("tc-live");
      if (live) live.textContent = `Search a town to see clubs · ${DATA.updated}`;
      const hint = $("tc-hint");
      if (hint && !hint.dataset.hold) hint.textContent = "Pick a city. We only then show clubs for that place.";
      const sel = $("tc-cc");
      if (sel && sel.value !== state.chip) sel.value = state.chip;
      writeQuery();
      return;
    }
    if (idle) idle.hidden = true;
    const clubs = ranked("club");
    const chapters = ranked("chapter");
    const communities = ranked("community");
    const n = clubs.length + chapters.length + communities.length;
    if (now) {
      now.hidden = false;
      now.innerHTML = `
      <div class="tc-tile"><span>Owners clubs</span><b>${clubs.length}</b><small>For this search.</small></div>
      <div class="tc-tile"><span>Chapters</span><b>${chapters.length}</b><small>Regional groups here.</small></div>
      <div class="tc-tile"><span>Communities</span><b>${communities.length}</b><small>Independent groups here.</small></div>
      <div class="tc-tile"><span>Matches</span><b>${n}</b><small>${state.place ? esc(state.place) : state.chip || "Name filter"}.</small></div>`;
    }
    fillSection("tc-clubs", "tc-sec-club", clubs);
    fillSection("tc-chapters", "tc-sec-chapter", chapters);
    fillSection("tc-communities", "tc-sec-community", communities);
    if (!n && idle) {
      idle.hidden = false;
      idle.textContent = "Nothing in the directory for that place.";
    }
    const live = $("tc-live");
    if (live) live.textContent = `${n} near ${state.place || state.chip || state.q} · ${DATA.updated}`;
    const hint = $("tc-hint");
    if (hint && !hint.dataset.hold) {
      hint.textContent = state.place
        ? `Only clubs for ${state.place}.`
        : state.chip
          ? `Only clubs in ${state.chip}.`
          : "Only clubs matching that name.";
    }
    const sel = $("tc-cc");
    if (sel && sel.value !== state.chip) sel.value = state.chip;
    writeQuery();
  };

  const setPlace = (place, lat, lon, country, admin1) => {
    state.place = place;
    state.lat = lat;
    state.lon = lon;
    state.country = countryOf(country) || (lat != null ? inferCountryFromCoords(lat, lon) : "");
    state.admin1 = inferAdmin(place, state.country, admin1);
    $("tc-q").value = place;
    $("tc-suggest").hidden = true;
    $("tc-hint").dataset.hold = "";
    persist();
    render();
  };

  const searchPlace = (q) => {
    const box = $("tc-suggest");
    if (!q || q.trim().length < 2) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    fetch(`${GEO}?name=${encodeURIComponent(q.trim())}&count=6&language=en&format=json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) {
          box.hidden = true;
          box.innerHTML = "";
          setHint("Couldn't look up that city. Try again.", true);
          return;
        }
        const rows = j.results || [];
        if (!rows.length) {
          box.hidden = true;
          box.innerHTML = "";
          setHint("No matching city. Try another spelling.", true);
          return;
        }
        setHint("", false);
        box.hidden = false;
        box.innerHTML = rows
          .map((r) => {
            const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
            return `<li><button type="button" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${esc(label)}" data-cc="${esc(
              r.country || ""
            )}" data-admin="${esc(r.admin1 || "")}">${esc(label)}</button></li>`;
          })
          .join("");
      })
      .catch(() => {
        box.hidden = true;
        box.innerHTML = "";
        setHint("Couldn't look up that city. Try again.", true);
      });
  };

  const clearPlace = () => {
    state.place = "";
    state.country = "";
    state.admin1 = "";
    state.lat = null;
    state.lon = null;
    state.chip = "";
    state.q = "";
    $("tc-q").value = "";
    $("tc-name").value = "";
    $("tc-suggest").hidden = true;
    $("tc-hint").dataset.hold = "";
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    render();
  };

  const bind = () => {
    $("tc-q").addEventListener("input", (e) => {
      clearTimeout(suggestTimer);
      suggestTimer = setTimeout(() => searchPlace(e.target.value), 280);
    });
    $("tc-q").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = $("tc-suggest").querySelector("button");
        if (first) first.click();
      }
    });
    $("tc-name").addEventListener("input", (e) => {
      state.q = e.target.value.trim();
      render();
    });
    $("tc-suggest").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lat]");
      if (!btn) return;
      setPlace(btn.getAttribute("data-name"), Number(btn.dataset.lat), Number(btn.dataset.lon), btn.dataset.cc, btn.dataset.admin);
    });
    $("tc-geo").addEventListener("click", () => {
      if (!navigator.geolocation) {
        setHint("This browser will not share a location. Search a city instead.", true);
        return;
      }
      setHint("Finding you…", true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude,
            lon = pos.coords.longitude;
          resolveCoords(lat, lon)
            .then((hit) => setPlace(hit.place, lat, lon, hit.country, hit.admin1))
            .catch(() => {
              const country = inferCountryFromCoords(lat, lon);
              setPlace(country ? `Your location, ${country}` : "Your location", lat, lon, country, "");
            });
        },
        () => {
          setHint("Location blocked. Search a city instead.", true);
        }
      );
    });
    $("tc-clear").addEventListener("click", clearPlace);
    $("tc-cc").addEventListener("change", (e) => {
      state.chip = e.target.value || "";
      render();
    });
  };

  const boot = () => {
    fillCountries();
    const u = new URL(location.href);
    const qPlace = u.searchParams.get("place") || "";
    const qLat = Number(u.searchParams.get("lat"));
    const qLon = Number(u.searchParams.get("lon"));
    const qName = u.searchParams.get("q") || "";
    const qCountry = u.searchParams.get("country") || "";
    if (qName) {
      state.q = qName;
      $("tc-name").value = qName;
    }
    if (qCountry && countries.includes(qCountry)) state.chip = qCountry;
    if (Number.isFinite(qLat) && Number.isFinite(qLon) && qPlace) {
      setPlace(qPlace, qLat, qLon, qCountry, "");
      bind();
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved?.place && typeof saved.lat === "number") {
        setPlace(saved.place, saved.lat, saved.lon, saved.country || "", saved.admin1 || "");
        bind();
        return;
      }
    } catch {
      /* ignore */
    }
    render();
    bind();
  };

  boot();
})();
