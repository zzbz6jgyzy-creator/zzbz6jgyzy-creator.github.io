(() => {
  const curated = window.TESLA_UPDATES;
  if (!curated) return;

  const LIVE_URL = "/updates-live.json";
  const LAND_URL = "/assets/world-land.svg";
  const STALE_MS = 90 * 60 * 1000;
  const MAP_W = 1000;
  const MAP_H = 500;
  const MAP_PAD_Y = 10;
  const MAP_DRAW_H = 470;

  const POINTS = {
    US: [-98, 39.5],
    CA: [-106, 56],
    GB: [-2.2, 53.8],
    IE: [-7.8, 53.2],
    DE: [10.4, 51.2],
    FR: [2.3, 46.6],
    NL: [5.3, 52.1],
    BE: [4.5, 50.5],
    IT: [12.6, 42.8],
    ES: [-3.7, 40.4],
    PT: [-8.2, 39.6],
    AT: [14.6, 47.5],
    CH: [8.2, 46.8],
    DK: [9.5, 56],
    NO: [8.8, 60.5],
    SE: [15.2, 62.2],
    FI: [26, 64],
    PL: [19.4, 52],
    CZ: [15.5, 49.8],
    SK: [19.7, 48.7],
    SI: [14.8, 46.1],
    HR: [15.2, 45.1],
    HU: [19.5, 47.2],
    GR: [22, 39.2],
    LT: [23.9, 55.2],
    EE: [25.5, 58.6],
    AU: [134.5, -25.3],
    NZ: [172.6, -41.3],
    TW: [121, 23.7],
    HK: [114.2, 22.3],
    SG: [103.8, 1.35],
    MY: [102, 3.8],
    TH: [101, 15.5],
    PH: [122, 12.4],
    AE: [54.3, 24.3],
    QA: [51.2, 25.3],
    IL: [34.8, 31.4],
    TR: [35.2, 39],
    MA: [-6.3, 31.8],
    CO: [-73.1, 4.6],
    UA: [31.2, 48.4],
    MX: [-102.5, 23.6],
    PR: [-66.5, 18.2],
    KR: [127.8, 36.4],
    JP: [138, 36.2],
    BG: [25.5, 42.7],
    RO: [25, 45.9],
    IS: [-19, 64.8],
    LU: [6.1, 49.75],
    BR: [-51, -14],
    CL: [-71, -33.5],
    ZA: [24.7, -29],
    KW: [47.5, 29.3],
    SA: [45, 24],
  };

  const WIDE_ZOOM = new Set(["US", "CA", "AU", "BR", "RU", "CN", "ZA"]);

  const statusLabel = {
    early: "Early wave",
    rolling: "Rolling out",
    wide: "On cars now",
    limited: "Limited",
  };

  const kindLabel = {
    cabin: "Cabin",
    fsd: "FSD",
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(/T/.test(iso) ? iso : `${iso}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatStamp = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const norm = (s) => String(s || "").trim().toLowerCase();

  const countryName = (code) => {
    const row = curated.countries.find((c) => c.code === code);
    return row ? row.name : code;
  };

  const matchCountry = (query) => {
    const q = norm(query);
    if (!q) return null;
    return (
      curated.countries.find((c) => {
        if (norm(c.code) === q || norm(c.name) === q) return true;
        return (c.aliases || []).some((a) => norm(a) === q || norm(a).includes(q) || q.includes(norm(a)));
      }) ||
      curated.countries.find((c) => norm(c.name).includes(q) || q.includes(norm(c.code)))
    );
  };

  const matchVersion = (version, query) => {
    const q = norm(query).replace(/^v/, "");
    if (!q) return true;
    const id = norm(version.id);
    const family = norm(version.family);
    const fsd = norm(version.fsd || "").replace(/^v/, "");
    if (id === q || family === q) return true;
    if (id.startsWith(q) || family.startsWith(q)) return true;
    if (q.length >= 4 && (id.includes(q) || family.includes(q))) return true;
    if (q.length >= 4 && fsd.includes(q)) return true;
    return false;
  };

  const featureText = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    const title = item.title || "";
    const text = item.text || "";
    if (title && text && !text.toLowerCase().startsWith(title.toLowerCase())) {
      return `${title} — ${text}`;
    }
    return text || title;
  };

  const featureTitle = (item) => {
    const line = featureText(item);
    return line.split(" — ")[0].split(":")[0].trim();
  };

  const mergeFeatures = (base, live) => {
    const out = [...(base || [])];
    const blob = out.join(" ").toLowerCase();
    (live || []).forEach((item) => {
      const title = typeof item === "string" ? item : item.title || "";
      const line = featureText(item);
      if (!line) return;
      if (title && blob.includes(title.toLowerCase())) return;
      if (out.some((existing) => norm(existing) === norm(line))) return;
      out.push(line);
    });
    return out.slice(0, 8);
  };

  const isFsdRow = (row, features) => {
    if (row.fsd || row.fsdHw3 || row.fsdHw4) return true;
    return (features || []).some((line) => /fsd|full self-driving/i.test(line));
  };

  const fsdLabel = (row) => {
    const parts = [row.fsdHw4, row.fsdHw3, row.fsd].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  };

  const liveStatus = (row) => {
    const percent = Number(row.percent) || 0;
    const countries = row.countries || [];
    const first = Date.parse(row.firstSeen || row.date || "");
    const ageDays = Number.isNaN(first) ? 99 : (Date.now() - first) / 86400000;
    if (countries.length <= 2 && percent < 8) return "limited";
    if (percent < 3 || ageDays <= 2) return "early";
    if (percent < 12) return "rolling";
    return "wide";
  };

  const reachedFromLive = (row) => {
    const names = (row.countries || []).slice(0, 8).map(countryName);
    const extra = (row.countries || []).length - names.length;
    const where = names.length ? names.join(", ") + (extra > 0 ? ` +${extra}` : "") : "a small tracked slice";
    const pending = row.pending ? ` ${row.pending} more waiting to install.` : "";
    return `${row.count} of ${row.fleet} tracked cars (${row.percent}%). Seen in ${where}.${pending}`;
  };

  const fromLive = (row, base) => {
    const liveFeatures = (row.features || []).map(featureText).filter(Boolean);
    const features = mergeFeatures(base?.features, row.features);
    const fsd = base?.fsd || fsdLabel(row);
    const kind = base?.kind || (isFsdRow(row, liveFeatures) ? "fsd" : "cabin");
    return {
      id: row.id,
      family: base?.family || row.id.split(".").slice(0, 2).join("."),
      date: row.date || base?.date || "",
      kind,
      status: row.count != null ? liveStatus(row) : base?.status || "rolling",
      headline: base?.headline || liveFeatures[0]?.split(" — ")[0] || `Build ${row.id}`,
      summary:
        base?.summary ||
        (fsd ? `FSD ${fsd} on ${row.id}.` : `Cabin build ${row.id}, from Tesla’s public notes as cars report in.`),
      features,
      fsd,
      reached: row.count != null ? reachedFromLive(row) : base?.reached || "",
      countries: row.countries?.length ? row.countries : base?.countries || [],
      live: {
        count: row.count,
        percent: row.percent,
        lastSeen: row.lastSeen,
      },
    };
  };

  const mergeData = (live) => {
    const curatedMap = new Map(curated.versions.map((row) => [row.id, row]));
    const liveRows = live?.versions || [];
    const versions = [];
    const seen = new Set();
    liveRows.forEach((row) => {
      versions.push(fromLive(row, curatedMap.get(row.id)));
      seen.add(row.id);
    });
    curated.versions.forEach((row) => {
      if (seen.has(row.id)) return;
      versions.push({ ...row, live: null });
    });
    versions.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
    return { live, versions };
  };

  const setStatus = (live) => {
    const line = document.getElementById("updates-updated");
    if (!line) return;
    const stamp = live?.updated ? formatStamp(live.updated) : formatDate(curated.updated);
    const age = live?.updated ? Date.now() - Date.parse(live.updated) : Infinity;
    const fresh = Number.isFinite(age) && age < STALE_MS;
    line.innerHTML = "";
    const dot = document.createElement("span");
    dot.className = `news-dot${fresh ? " is-live" : " is-stale"}`;
    const text = document.createElement("span");
    text.textContent = live
      ? `${fresh ? "Live" : "Snapshot"} · ${stamp} · ${live.fleet.toLocaleString("en-GB")} cars`
      : `Desk notes · ${stamp}`;
    line.append(dot, text);
  };

  const fillStats = (bundle) => {
    const versions = bundle.versions;
    const raw = bundle.live?.versions || [];
    const latest = bundle.live?.latest
      ? versions.find((row) => row.id === bundle.live.latest) || versions[0]
      : versions[0];
    const widest = raw.slice().sort((a, b) => (b.percent || 0) - (a.percent || 0) || (b.count || 0) - (a.count || 0))[0];
    const na = raw.find((row) => row.fsdHw4);
    const europeCodes = new Set(["NL", "BE", "DE", "FR", "IE", "GB", "IT", "ES", "PT", "AT", "CH", "DK", "NO", "SE", "FI", "PL", "CZ", "SK", "SI", "LT", "EE", "HR", "HU", "GR"]);
    const europe = raw.find((row) => {
      const feats = (row.features || []).map(featureText);
      const eu = (row.countries || []).some((code) => europeCodes.has(code));
      return isFsdRow(row, feats) && eu && !row.fsdHw4;
    });
    setText("stat-latest", latest?.id || "—");
    setText("stat-wide", widest?.id || "—");
    setText("stat-fsd-na", na?.fsdHw4 || "—");
    setText("stat-fsd-eu", europe?.id || "—");
    const ids = {
      latest: latest?.id || "",
      wide: widest?.id || "",
      na: na?.id || "",
      eu: europe?.id || "",
    };
    document.querySelectorAll("[data-updates-stat]").forEach((btn) => {
      btn.dataset.version = ids[btn.dataset.updatesStat] || "";
    });
    syncStatButtons();
    const now = document.getElementById("updates-now");
    if (now) {
      if (na?.fsdHw4 && europe?.id) {
        now.textContent = `North America is on ${na.fsdHw4}. Europe is still on ${europe.id}.`;
      } else {
        now.textContent = curated.fsdNow?.lines?.[3] || "";
      }
    }
  };

  const project = (lon, lat) => ({
    x: (lon + 180) * (MAP_W / 360),
    y: MAP_PAD_Y + (90 - lat) * (MAP_DRAW_H / 180),
  });

  const drawGrid = (svg) => {
    const grid = document.getElementById("updates-map-grid");
    if (!grid || grid.childElementCount) return;
    for (let lon = -150; lon <= 150; lon += 30) {
      const { x } = project(lon, 0);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x.toFixed(1));
      line.setAttribute("x2", x.toFixed(1));
      line.setAttribute("y1", "0");
      line.setAttribute("y2", String(MAP_H));
      grid.append(line);
    }
    for (let lat = -60; lat <= 80; lat += 30) {
      const { y } = project(0, lat);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("y1", y.toFixed(1));
      line.setAttribute("y2", y.toFixed(1));
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(MAP_W));
      grid.append(line);
    }
  };

  const loadLand = async () => {
    const slot = document.getElementById("updates-map-land");
    if (!slot || slot.childElementCount) return;
    try {
      const res = await fetch(LAND_URL, { cache: "force-cache" });
      if (!res.ok) return;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const path = doc.querySelector("path");
      if (!path) return;
      const clone = document.createElementNS("http://www.w3.org/2000/svg", "path");
      clone.setAttribute("d", path.getAttribute("d"));
      clone.setAttribute("class", "updates-map-land");
      slot.append(clone);
    } catch {
      /* map still works with hotspots only */
    }
  };

  const heatOf = (row, latestId) => {
    if (row.id === latestId) return "hot";
    const first = Date.parse(row.firstSeen || row.date || "");
    const ageDays = Number.isNaN(first) ? 99 : (Date.now() - first) / 86400000;
    if (ageDays <= 5) return "warm";
    return "cool";
  };

  const collectHotspots = (bundle) => {
    const liveRows = (bundle.live?.versions || []).slice().sort((a, b) => {
      return String(b.date || "").localeCompare(String(a.date || "")) || String(b.id).localeCompare(String(a.id));
    });
    const scoped = versionQuery ? liveRows.filter((row) => matchVersion(row, versionQuery)) : liveRows;
    const latestId = bundle.live?.latest || scoped[0]?.id;
    const spots = new Map();
    scoped.forEach((row) => {
      (row.countries || []).forEach((code) => {
        if (spots.has(code)) return;
        spots.set(code, {
          code,
          id: row.id,
          count: row.countryCounts?.[code] || 0,
          heat: heatOf(row, latestId),
          latest: row.id === latestId,
        });
      });
    });
    return [...spots.values()];
  };

  const showTip = (spot, evt) => {
    const tip = document.getElementById("updates-map-tip");
    const shell = document.querySelector(".updates-map-shell");
    if (!tip || !shell) return;
    tip.hidden = false;
    tip.innerHTML = `<strong>${escapeHtml(countryName(spot.code))}</strong><span>${escapeHtml(spot.id)}</span><em>${spot.count || "—"} tracked</em>`;
    const rect = shell.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    tip.style.left = `${Math.min(rect.width - 16, Math.max(16, x))}px`;
    tip.style.top = `${Math.max(16, y - 12)}px`;
  };

  const hideTip = () => {
    const tip = document.getElementById("updates-map-tip");
    if (tip) tip.hidden = true;
  };

  const heatLabel = (heat) => {
    if (heat === "hot") return "New wave";
    if (heat === "warm") return "Rolling";
    return "On cars";
  };

  let zoomFrame = 0;

  const readViewBox = (svg) =>
    (svg.getAttribute("viewBox") || `0 0 ${MAP_W} ${MAP_H}`).trim().split(/\s+/).map(Number);

  const animateViewBox = (svg, next) => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      svg.setAttribute("viewBox", next.map((n) => n.toFixed(1)).join(" "));
      return;
    }
    const from = readViewBox(svg);
    const start = performance.now();
    cancelAnimationFrame(zoomFrame);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 520);
      const e = 1 - (1 - t) ** 3;
      const box = from.map((value, i) => value + (next[i] - value) * e);
      svg.setAttribute("viewBox", box.map((n) => n.toFixed(1)).join(" "));
      if (t < 1) zoomFrame = requestAnimationFrame(tick);
    };
    zoomFrame = requestAnimationFrame(tick);
  };

  const sameBox = (a, b) => a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) < 0.6);

  const isNarrow = () => window.matchMedia("(max-width: 640px)").matches;

  const worldBox = () => (isNarrow() ? [55, 18, 890, 355] : [0, 0, MAP_W, MAP_H]);

  const focusStage = (code) => {
    const svg = document.getElementById("updates-map");
    if (!svg) return;
    if (!code || !POINTS[code]) {
      const world = worldBox();
      if (!sameBox(readViewBox(svg), world)) animateViewBox(svg, world);
      svg.classList.remove("is-focused");
      return;
    }
    const { x, y } = project(POINTS[code][0], POINTS[code][1]);
    const scale = WIDE_ZOOM.has(code) ? 1.7 : 2.85;
    const w = MAP_W / scale;
    const h = MAP_H / scale;
    const next = [
      Math.max(0, Math.min(MAP_W - w, x - w / 2)),
      Math.max(0, Math.min(MAP_H - h, y - h / 2)),
      w,
      h,
    ];
    if (!sameBox(readViewBox(svg), next)) animateViewBox(svg, next);
    svg.classList.add("is-focused");
  };

  const renderFocus = (bundle, spots) => {
    const el = document.getElementById("updates-focus");
    if (!el) return;
    if (!countryCode) {
      el.hidden = true;
      el.replaceChildren();
      return;
    }
    const spot = spots.find((s) => s.code === countryCode);
    const here = (bundle.live?.versions || []).filter((row) => (row.countries || []).includes(countryCode));
    const rows = here
      .slice()
      .sort((a, b) => (b.countryCounts?.[countryCode] || 0) - (a.countryCounts?.[countryCode] || 0))
      .slice(0, 4)
      .map((row) => {
        const n = row.countryCounts?.[countryCode] || 0;
        return `<li><b>${escapeHtml(row.id)}</b><span>${n ? `${n} tracked` : "seen"}</span></li>`;
      })
      .join("");
    el.hidden = false;
    el.innerHTML = `
      <div>
        <strong>${escapeHtml(countryName(countryCode))}</strong>
        <span class="fsd-status updates-status-${spot?.heat === "hot" ? "early" : spot?.heat === "warm" ? "rolling" : "wide"}">${
          spot ? heatLabel(spot.heat) : "No report"
        }</span>
      </div>
      <p>${
        spot
          ? `${escapeHtml(spot.id)} · ${spot.count || "—"} tracked car${spot.count === 1 ? "" : "s"}`
          : "Teslascope has not reported this country on the current snapshot."
      }</p>
      ${rows ? `<ul class="updates-focus-list">${rows}</ul>` : ""}
    `;
  };

  const renderMap = (bundle) => {
    const layer = document.getElementById("updates-hotspots");
    if (!layer) return;
    layer.replaceChildren();
    const spots = collectHotspots(bundle);
    const max = Math.max(1, ...spots.map((s) => s.count || 1));
    spots.forEach((spot) => {
      const ll = POINTS[spot.code];
      if (!ll) return;
      const { x, y } = project(ll[0], ll[1]);
      const r = (isNarrow() ? 12 : 6) + Math.sqrt((spot.count || 1) / max) * (isNarrow() ? 11 : 8);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `updates-hot${spot.latest ? " is-new" : ""} is-${spot.heat}${countryCode === spot.code ? " is-focus" : ""}`);
      g.setAttribute("data-country", spot.code);
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `${countryName(spot.code)}, ${spot.id}`);
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hit.setAttribute("r", String(Math.max(r * 2.1, isNarrow() ? 22 : 14)));
      hit.setAttribute("fill", "transparent");
      g.append(hit);
      const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("class", "updates-hot-halo");
      halo.setAttribute("r", (r * 1.85).toFixed(1));
      g.append(halo);
      if (spot.latest || spot.heat === "hot") {
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("class", "updates-hot-ring");
        ring.setAttribute("r", r.toFixed(1));
        g.append(ring);
      }
      const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      core.setAttribute("class", "updates-hot-core");
      core.setAttribute("r", r.toFixed(1));
      g.append(core);
      g.addEventListener("mouseenter", (event) => showTip(spot, event));
      g.addEventListener("mousemove", (event) => showTip(spot, event));
      g.addEventListener("mouseleave", hideTip);
      g.addEventListener("click", () => {
        const next = countryCode === spot.code ? "" : spot.code;
        setCountry(next, true);
        rerender();
      });
      g.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        g.dispatchEvent(new Event("click"));
      });
      layer.append(g);
    });

    focusStage(countryCode);

    const latestId = bundle.live?.latest;
    const liveLatest = bundle.live?.versions.find((row) => row.id === latestId);
    const hotCountries = (liveLatest?.countries || []).slice(0, 8).map(countryName);
    const caption = document.getElementById("updates-map-caption");
    if (caption) {
      if (versionQuery && countryCode) {
        caption.textContent = `${versionQuery} in ${countryName(countryCode)}`;
      } else if (versionQuery) {
        caption.textContent = `${spots.length} countries on ${versionQuery}`;
      } else if (countryCode) {
        const hit = spots.find((s) => s.code === countryCode);
        caption.textContent = hit ? `${countryName(countryCode)} · ${hit.id}` : `${countryName(countryCode)} · no tracked build`;
      } else {
        caption.textContent = latestId
          ? `New wave ${latestId} · ${hotCountries.slice(0, 5).join(", ")}${hotCountries.length > 5 ? "…" : ""}`
          : "Live wave";
      }
    }

    const badge = document.getElementById("updates-map-badge");
    if (badge) {
      const shown = versionQuery || latestId;
      badge.hidden = !shown;
      badge.innerHTML = shown
        ? `<em>${versionQuery ? "Search" : "New wave"}</em><strong>${escapeHtml(shown)}</strong>`
        : "";
    }

    const clear = document.getElementById("updates-clear");
    if (clear) clear.hidden = !(countryCode || versionQuery);

    renderFocus(bundle, spots);

    const list = document.getElementById("updates-hot-list");
    if (list) {
      list.replaceChildren();
      const wave = spots
        .filter((s) => versionQuery || spotFilter === "all" || s.latest)
        .sort((a, b) => (b.count || 0) - (a.count || 0));
      if (!wave.length) {
        const emptySpots = document.createElement("p");
        emptySpots.className = "updates-empty";
        emptySpots.textContent = versionQuery
          ? "No tracked country matches that version."
          : "No tracked countries on this filter.";
        list.append(emptySpots);
      }
      wave.forEach((spot) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `fsd-country${countryCode === spot.code ? " is-focus" : ""}`;
        btn.dataset.country = spot.code;
        const n = spot.count ? `${spot.count}` : "—";
        const meta = versionQuery || spotFilter === "all"
          ? `${escapeHtml(spot.id)} · ${n}`
          : n;
        btn.innerHTML = `
          <i class="fsd-country-dot is-${spot.heat}" aria-hidden="true"></i>
          <span class="fsd-code">${escapeHtml(spot.code)}</span>
          <span class="fsd-country-name">${escapeHtml(countryName(spot.code))}</span>
          <span class="fsd-country-meta">${meta}</span>
        `;
        btn.addEventListener("click", () => {
          const next = countryCode === spot.code ? "" : spot.code;
          setCountry(next, true);
          rerender();
        });
        list.append(btn);
      });
      setText("updates-spot-count", `${wave.length} ${wave.length === 1 ? "country" : "countries"}`);
    }
  };

  const list = document.getElementById("updates-list");
  const search = document.getElementById("updates-search");
  const versionInput = document.getElementById("updates-version");
  const lookup = document.getElementById("updates-lookup");
  const kindButtons = document.querySelectorAll("[data-updates-kind]");
  const empty = document.getElementById("updates-empty");

  let countryCode = "";
  let kind = "all";
  let versionQuery = "";
  let spotFilter = "wave";
  let current = { live: null, versions: curated.versions };

  const syncStatButtons = () => {
    document.querySelectorAll("[data-updates-stat]").forEach((btn) => {
      const on = Boolean(versionQuery && btn.dataset.version && norm(btn.dataset.version) === norm(versionQuery));
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  };

  const setCountry = (code, fillQuery) => {
    countryCode = code || "";
    if (fillQuery && search) {
      const row = curated.countries.find((c) => c.code === countryCode);
      search.value = row ? row.name : "";
    }
  };

  const availability = (version, country) => {
    if (!country) return { key: "any", label: "" };
    if (version.countries.includes(country.code)) {
      const count = current.live?.versions.find((row) => row.id === version.id)?.countryCounts?.[country.code];
      return {
        key: "here",
        label: count ? `Seen in ${country.name} · ${count} tracked car${count === 1 ? "" : "s"}` : `Seen in ${country.name}`,
      };
    }
    if (version.countries.length <= 2 && version.countries.every((c) => c === "US" || c === "CA")) {
      return { key: "away", label: `Not in ${country.name} — North America only` };
    }
    return { key: "away", label: `Not seen in ${country.name} yet` };
  };

  const renderList = (bundle) => {
    current = bundle;
    renderMap(bundle);
    if (!list) return;
    list.replaceChildren();
    const country = countryCode ? curated.countries.find((c) => c.code === countryCode) : null;

    const rows = bundle.versions
      .filter((v) => kind === "all" || v.kind === kind)
      .filter((v) => matchVersion(v, versionQuery))
      .map((v) => ({ version: v, avail: availability(v, country) }))
      .sort((a, b) => {
        if (versionQuery) {
          const aExact = norm(a.version.id) === norm(versionQuery);
          const bExact = norm(b.version.id) === norm(versionQuery);
          if (aExact !== bExact) return aExact ? -1 : 1;
        }
        if (country && a.avail.key !== b.avail.key) return a.avail.key === "here" ? -1 : 1;
        return String(b.version.date).localeCompare(String(a.version.date));
      });

    rows.forEach(({ version, avail }) => {
      const article = document.createElement("article");
      const on = versionQuery && norm(version.id) === norm(versionQuery);
      article.className = `updates-row${avail.key === "away" ? " is-away" : ""}${on ? " is-on" : ""}`;
      article.id = `build-${version.id.replace(/\./g, "-")}`;
      const places = (version.countries || []).slice(0, 5).map(countryName);
      const extra = (version.countries || []).length - places.length;
      const fleet = version.live?.percent != null ? `${version.live.percent}%` : "—";
      article.innerHTML = `
        <button type="button" class="updates-row-btn" data-version="${escapeHtml(version.id)}">
          <span class="updates-card-id">${escapeHtml(version.id)}</span>
          <span class="updates-row-share">${fleet}</span>
          <span class="updates-row-status fsd-status updates-status-${version.status}">${statusLabel[version.status] || version.status}</span>
          <span class="updates-row-kind fsd-status updates-kind-${version.kind}">${kindLabel[version.kind] || version.kind}</span>
          <strong class="updates-row-title">${escapeHtml(version.headline)}</strong>
          <span class="updates-row-foot">
            <span class="updates-row-date">${escapeHtml(formatDate(version.date))}</span>
            <span class="updates-row-geo">${escapeHtml(places.join(" · "))}${extra > 0 ? ` +${extra}` : ""}</span>
            ${avail.label ? `<span class="updates-avail updates-avail-${avail.key}">${escapeHtml(avail.label)}</span>` : ""}
          </span>
        </button>
      `;
      article.querySelector("button")?.addEventListener("click", () => {
        versionQuery = version.id;
        if (versionInput) versionInput.value = version.id;
        rerender();
        document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      list.append(article);
    });

    const hereCount = country ? rows.filter((r) => r.avail.key === "here").length : rows.length;
    if (versionQuery && rows.length === 1) {
      setText("updates-showing", `${rows[0].version.id}`);
    } else if (country && versionQuery) {
      setText("updates-showing", `${rows.length} matching ${versionQuery} · ${country.name}`);
    } else if (country) {
      setText("updates-showing", `${hereCount} of ${rows.length} in ${country.name}`);
    } else if (versionQuery) {
      setText("updates-showing", `${rows.length} matching ${versionQuery}`);
    } else {
      setText("updates-showing", `${rows.length} current builds`);
    }
    if (empty) empty.hidden = rows.length > 0;
    syncStatButtons();
  };

  const rerender = () => renderList(current);

  const boot = async () => {
    drawGrid();
    const landTask = loadLand();
    let live = null;
    try {
      const res = await fetch(LIVE_URL, { cache: "no-store" });
      if (res.ok) live = await res.json();
    } catch {
      live = null;
    }
    const bundle = mergeData(live);
    setStatus(live);
    setText("updates-note", curated.note);
    fillStats(bundle);
    renderList(bundle);
    await landTask;
  };

  window.addEventListener("resize", () => {
    if (!countryCode) focusStage("");
  });

  kindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      kind = button.dataset.updatesKind;
      kindButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      rerender();
    });
  });

  document.querySelectorAll("[data-updates-spots]").forEach((button) => {
    button.addEventListener("click", () => {
      spotFilter = button.dataset.updatesSpots;
      document.querySelectorAll("[data-updates-spots]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b === button));
      });
      rerender();
    });
  });

  document.querySelectorAll("[data-updates-stat]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.version;
      if (!id) return;
      if (norm(versionQuery) === norm(id)) {
        versionQuery = "";
        if (versionInput) versionInput.value = "";
      } else {
        versionQuery = id;
        if (versionInput) versionInput.value = id;
      }
      rerender();
      document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (search) {
    search.addEventListener("input", () => {
      const found = matchCountry(search.value);
      setCountry(found ? found.code : "", false);
      rerender();
    });
  }

  if (versionInput) {
    versionInput.addEventListener("input", () => {
      versionQuery = versionInput.value.trim();
      rerender();
    });
  }

  if (lookup) {
    lookup.addEventListener("submit", (event) => {
      event.preventDefault();
      document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const clearBtn = document.getElementById("updates-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      versionQuery = "";
      if (versionInput) versionInput.value = "";
      setCountry("", true);
      hideTip();
      rerender();
    });
  }

  const hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (hash && /^\d{4}\.\d+/.test(hash)) {
    versionQuery = hash;
    if (versionInput) versionInput.value = hash;
  }

  boot();
})();
