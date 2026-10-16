(() => {
  "use strict";
  const DATA = window.TESLA_CLUBS;
  if (!DATA) return;

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const GEO = "https://geocoding-api.open-meteo.com/v1/search";
  const REV = "https://geocoding-api.open-meteo.com/v1/reverse";
  const R = 6371;
  const KEY = "sd-tesla-clubs-v1";
  const ALIAS = {
    usa: "United States",
    "united states of america": "United States",
    uk: "United Kingdom",
    "great britain": "United Kingdom",
    "czech republic": "Czechia",
    turkey: "Türkiye",
    "hong kong": "Hong Kong & Macau",
    macau: "Hong Kong & Macau",
    "hong kong sar": "Hong Kong & Macau",
  };

  const state = { place: "", country: "", admin1: "", lat: null, lon: null, q: "", chip: "" };
  let suggestTimer = 0;

  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const countryOf = (s) => ALIAS[norm(s)] || s || "";
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
  const isNational = (c) => !c.region || /^(national|nationwide|online|worldwide)/i.test(c.region);

  const countries = [...new Set(DATA.clubs.map((c) => c.country).filter((c) => c && c !== "Global" && c !== "International"))].sort(
    (a, b) => a.localeCompare(b)
  );

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
    let score = 0;
    const hereCountry = countryOf(state.country);
    const sameCountry = hereCountry && countryOf(c.country) === hereCountry;
    const sameRegion = state.admin1 && c.region && (norm(c.region).includes(norm(state.admin1)) || norm(state.admin1).includes(norm(c.region)));
    let dist = null;
    if (state.lat != null && c.lat != null) dist = haversine(state.lat, state.lon, c.lat, c.lon);
    if (sameCountry) score += 1200;
    if (sameRegion) score += 600;
    if (dist != null) score += Math.max(0, 400 - dist / 8);
    if (c.country === "Global" || c.country === "International") score += state.lat != null ? 40 : 80;
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

  const fillSection = (id, secId, rows, empty) => {
    const host = $(id);
    const wrap = $(secId);
    if (!host || !wrap) return;
    wrap.hidden = false;
    host.innerHTML = rows.length ? rows.map(card).join("") : `<p class="tc-empty">${esc(empty)}</p>`;
  };

  const fillCountries = () => {
    const sel = $("tc-cc");
    if (!sel || sel.dataset.ready) return;
    sel.innerHTML =
      `<option value="">All countries</option>` + countries.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    sel.dataset.ready = "1";
  };

  const render = () => {
    const clubs = ranked("club");
    const chapters = ranked("chapter");
    const communities = ranked("community");
    const n = clubs.length + chapters.length + communities.length;
    $("tc-now").innerHTML = `
      <div class="tc-tile"><span>Owners clubs</span><b>${clubs.length}</b><small>${state.place || state.chip ? "Matching this search." : `${DATA.counts.club} in the active list.`}</small></div>
      <div class="tc-tile"><span>Chapters</span><b>${chapters.length}</b><small>${state.place || state.chip ? "Regional groups nearby or matching." : `${DATA.counts.chapter} regional chapters.`}</small></div>
      <div class="tc-tile"><span>Communities</span><b>${communities.length}</b><small>${state.place || state.chip ? "Independent groups in view." : `${DATA.counts.community} independent communities.`}</small></div>
      <div class="tc-tile"><span>Held out</span><b>${DATA.counts.excluded}</b><small>Historical, duplicate or unresolved — not listed.</small></div>`;
    const none = state.place || state.chip || state.q ? "Nothing matches this search." : "No listings in this section.";
    fillSection("tc-clubs", "tc-sec-club", clubs, none);
    fillSection("tc-chapters", "tc-sec-chapter", chapters, none);
    fillSection("tc-communities", "tc-sec-community", communities, none);
    const live = $("tc-live");
    if (live) live.textContent = `Active directory · ${DATA.updated} · ${n} listed`;
    const hint = $("tc-hint");
    if (hint && !hint.dataset.hold) {
      hint.textContent = state.place
        ? `Showing clubs near ${state.place}.`
        : state.chip
          ? `Showing ${state.chip}.`
          : "Search a city to rank clubs by how close they are.";
    }
    const sel = $("tc-cc");
    if (sel && sel.value !== state.chip) sel.value = state.chip;
    writeQuery();
  };

  const setPlace = (place, lat, lon, country, admin1) => {
    state.place = place;
    state.lat = lat;
    state.lon = lon;
    state.country = countryOf(country);
    state.admin1 = admin1 || "";
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
        const rows = j?.results || [];
        if (!rows.length) {
          box.hidden = true;
          return;
        }
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
        $("tc-hint").textContent = "This browser will not share a location. Search a city instead.";
        $("tc-hint").dataset.hold = "1";
        return;
      }
      $("tc-hint").textContent = "Finding you…";
      $("tc-hint").dataset.hold = "1";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude,
            lon = pos.coords.longitude;
          fetch(`${REV}?latitude=${lat}&longitude=${lon}&language=en&format=json`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
              const r = j?.results?.[0];
              const label = r ? [r.name, r.admin1, r.country].filter(Boolean).join(", ") : "Your location";
              setPlace(label, lat, lon, r?.country || "", r?.admin1 || "");
            })
            .catch(() => setPlace("Your location", lat, lon, "", ""));
        },
        () => {
          $("tc-hint").textContent = "Location blocked. Search a city instead.";
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
