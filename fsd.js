(() => {
  const data = window.FSD_GLOBAL;
  if (!data) return;

  const LAND_URL = "/assets/world-land.svg";
  const MAP_W = 1000;
  const MAP_H = 500;
  const EUROPE_BOX = [435, 68, 170, 85];
  const MIN_VIEW_W = 48;
  const EUROPE_ZOOM = new Set([
    "IE", "GB", "DE", "FR", "NL", "BE", "IT", "ES", "PT", "AT", "CH", "DK",
    "NO", "SE", "FI", "PL", "CZ", "SK", "SI", "HR", "HU", "GR", "LT", "EE",
    "LU", "BG", "RO", "LV", "CY", "MT",
  ]);
  const WIDE_ZOOM = new Set(["US", "CA", "AU", "CN"]);
  const statusLabel = {
    live: "Live",
    limited: "Limited",
    review: "In review",
    watch: "Watch",
    none: "Not yet",
    wide: "Still on cars",
    expected: "Expected",
    done: "Done",
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    if (/^\d{4}-\d{2}$/.test(iso)) {
      const d = new Date(`${iso}-01T12:00:00Z`);
      return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    }
    if (/^\d{4}$/.test(iso)) return iso;
    const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const project = (lon, lat) => ({
    x: (lon + 180) * (MAP_W / 360),
    y: (90 - lat) * (MAP_H / 180),
  });

  const live = data.countries.filter((c) => c.status === "live" || c.status === "limited");
  const review = data.countries.filter((c) => c.status === "review");
  const regions = [...new Set(live.map((c) => c.region))];

  setText("fsd-updated", `Updated ${formatDate(data.updated)}`);
  setText("fsd-live-count", String(live.length));
  setText("fsd-review-count", String(review.length));
  setText("fsd-region-count", String(regions.length));
  setText("fsd-version-now", data.versions[0]?.id || "—");
  setText("fsd-note", data.note);

  const loadLand = async () => {
    const slot = document.getElementById("fsd-world-land");
    if (!slot || slot.childElementCount) return;
    try {
      const res = await fetch(LAND_URL, { cache: "force-cache" });
      if (!res.ok) return;
      const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
      const path = doc.querySelector("path");
      if (!path) return;
      const clone = document.createElementNS("http://www.w3.org/2000/svg", "path");
      clone.setAttribute("d", path.getAttribute("d"));
      clone.setAttribute("class", "updates-map-land");
      clone.setAttribute("fill-rule", path.getAttribute("fill-rule") || "evenodd");
      slot.append(clone);
    } catch {
      /* dots still work */
    }
  };

  const mapSvg = () => document.getElementById("fsd-world-map");
  const readViewBox = (svg = mapSvg()) =>
    (svg?.getAttribute("viewBox") || `0 0 ${MAP_W} ${MAP_H}`).trim().split(/\s+/).map(Number);
  const sameBox = (a, b, slack = 0.8) =>
    a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) < slack);
  const isNarrow = () => window.matchMedia("(max-width: 640px)").matches;
  const worldBox = () => (isNarrow() ? [55, 18, 890, 355] : [0, 0, MAP_W, MAP_H]);
  const clampBox = ([x, y, w]) => {
    const aspect = MAP_H / MAP_W;
    w = Math.min(MAP_W, Math.max(MIN_VIEW_W, w));
    let h = w * aspect;
    if (h > MAP_H) {
      h = MAP_H;
      w = h / aspect;
    }
    x = Math.max(0, Math.min(MAP_W - w, x));
    y = Math.max(0, Math.min(MAP_H - h, y));
    return [x, y, w, h];
  };
  const nearWorld = (svg = mapSvg()) => svg && sameBox(readViewBox(svg), worldBox(), 8);
  const nearEurope = (svg = mapSvg()) => svg && sameBox(readViewBox(svg), EUROPE_BOX, 12);

  let zoomFrame = 0;

  const sizePins = () => {
    const svg = mapSvg();
    const layer = document.getElementById("fsd-world-pins");
    if (!svg || !layer) return;
    const width = svg.getBoundingClientRect().width || MAP_W;
    const [, , vw] = readViewBox(svg);
    const px = width / vw;
    layer.querySelectorAll(".fsd-world-pin").forEach((g) => {
      const livePin = g.classList.contains("is-live");
      const coreR = Math.max(1.4, Math.min(5.4, (livePin ? 4.2 : 3.4) / px));
      const haloR = coreR * (livePin ? 2.15 : 2);
      g.querySelector(".fsd-world-halo")?.setAttribute("r", haloR.toFixed(2));
      g.querySelector(".fsd-world-core")?.setAttribute("r", coreR.toFixed(2));
    });
  };

  const syncZoomButtons = () => {
    document.querySelector('[data-fsd-zoom="europe"]')?.classList.toggle("is-on", nearEurope());
    document.querySelector('[data-fsd-zoom="world"]')?.classList.toggle("is-on", nearWorld());
    document.getElementById("fsd-world-shell")?.classList.toggle("is-zoomed", !nearWorld());
  };

  const applyView = (box, animate = false) => {
    const svg = mapSvg();
    if (!svg) return;
    const next = clampBox(box);
    const write = (value) => {
      svg.setAttribute("viewBox", value.map((n) => n.toFixed(2)).join(" "));
      sizePins();
      syncZoomButtons();
    };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!animate || reduce || sameBox(readViewBox(svg), next)) {
      cancelAnimationFrame(zoomFrame);
      write(next);
      return;
    }
    const from = readViewBox(svg);
    const start = performance.now();
    cancelAnimationFrame(zoomFrame);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 420);
      const e = 1 - (1 - t) ** 3;
      write(from.map((value, i) => value + (next[i] - value) * e));
      if (t < 1) zoomFrame = requestAnimationFrame(tick);
    };
    zoomFrame = requestAnimationFrame(tick);
  };

  const zoomBy = (factor, clientX, clientY, animate = false) => {
    const svg = mapSvg();
    if (!svg) return;
    const [vx, vy, vw, vh] = readViewBox(svg);
    const rect = svg.getBoundingClientRect();
    const cx = clientX == null ? vx + vw / 2 : vx + ((clientX - rect.left) / rect.width) * vw;
    const cy = clientY == null ? vy + vh / 2 : vy + ((clientY - rect.top) / rect.height) * vh;
    const nw = vw / factor;
    const nh = vh / factor;
    applyView([cx - (cx - vx) * (nw / vw), cy - (cy - vy) * (nh / vh), nw, nh], animate);
  };

  const countryScale = (code) => {
    if (WIDE_ZOOM.has(code)) return 1.85;
    if (EUROPE_ZOOM.has(code)) return 9.2;
    return 5.4;
  };

  const flyToCountry = (code) => {
    const country = data.countries.find((c) => c.code === code);
    if (!country || country.lon == null) return;
    const { x, y } = project(country.lon, country.lat);
    const scale = countryScale(code);
    const w = MAP_W / scale;
    applyView([x - w / 2, y - (w * MAP_H / MAP_W) / 2, w], true);
  };

  const list = document.getElementById("fsd-world-list");
  const search = document.getElementById("fsd-world-search");
  const detail = document.getElementById("fsd-world-detail");
  const pins = document.getElementById("fsd-world-pins");
  const caption = document.getElementById("fsd-world-caption");
  const filters = document.querySelectorAll("[data-fsd-world-filter]");
  let active = "live";
  let focused = "";

  const matches = (country, query) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    return (
      country.name.toLowerCase().includes(q) ||
      country.code.toLowerCase() === q ||
      country.region.toLowerCase().includes(q) ||
      String(country.version || "").toLowerCase().includes(q)
    );
  };

  const showDetail = (country) => {
    if (!detail || !country) {
      if (detail) detail.hidden = true;
      return;
    }
    detail.hidden = false;
    const src = country.source
      ? `<a href="${escapeHtml(country.source.url)}">${escapeHtml(country.source.label)} →</a>`
      : "";
    detail.innerHTML = `
      <p class="eyebrow">${escapeHtml(country.region)}</p>
      <h3>${escapeHtml(country.name)}</h3>
      <p><span class="fsd-status fsd-status-${country.status}">${statusLabel[country.status] || country.status}</span>
      ${country.date ? ` · ${escapeHtml(formatDate(country.date))}` : ""}</p>
      <p>${escapeHtml(country.version)} · ${escapeHtml(country.hardware)}</p>
      <p>${escapeHtml(country.note)}</p>
      <p class="fsd-track-link">${src}</p>
    `;
  };

  const drawPins = (rows) => {
    if (!pins) return;
    pins.replaceChildren();
    rows.forEach((country) => {
      if (country.lon == null) return;
      const { x, y } = project(country.lon, country.lat);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `fsd-world-pin is-${country.status}${focused === country.code ? " is-focus" : ""}`);
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `${country.name}, ${statusLabel[country.status]}`);
      g.dataset.code = country.code;
      const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("r", country.status === "live" ? "9" : "7");
      halo.setAttribute("class", "fsd-world-halo");
      const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      core.setAttribute("r", country.status === "live" ? "4.2" : "3.4");
      core.setAttribute("class", "fsd-world-core");
      g.append(halo, core);
      const pick = () => {
        focused = focused === country.code ? "" : country.code;
        render();
        if (focused) flyToCountry(focused);
      };
      g.addEventListener("click", (event) => {
        event.stopPropagation();
        if (nearWorld() && EUROPE_ZOOM.has(country.code)) {
          const nearby = data.countries.filter(
            (c) => EUROPE_ZOOM.has(c.code) && c.status !== "none" && c.lon != null,
          );
          if (nearby.length >= 2 && !focused) {
            applyView(EUROPE_BOX, true);
            focused = country.code;
            render();
            return;
          }
        }
        pick();
      });
      g.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          pick();
        }
      });
      pins.append(g);
    });
    sizePins();
  };

  const render = () => {
    const query = search?.value || "";
    const rows = data.countries
      .filter((c) => {
        if (active === "live") return c.status === "live" || c.status === "limited";
        if (active === "review") return c.status === "review" || c.status === "watch";
        if (active === "europe") return c.region === "Europe";
        return true;
      })
      .filter((c) => matches(c, query))
      .sort((a, b) => {
        const rank = { live: 0, limited: 1, review: 2, watch: 3, none: 4 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return a.name.localeCompare(b.name);
      });

    if (list) {
      list.replaceChildren();
      rows.forEach((country) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `fsd-country${focused === country.code ? " is-focus" : ""}`;
        btn.dataset.code = country.code;
        btn.innerHTML = `
          <i class="fsd-country-dot is-${country.status}" aria-hidden="true"></i>
          <span class="fsd-code">${escapeHtml(country.code)}</span>
          <span class="fsd-country-name">${escapeHtml(country.name)}</span>
          <span class="fsd-country-meta">${statusLabel[country.status]} · ${escapeHtml(country.version)}</span>
        `;
        btn.addEventListener("click", () => {
          focused = focused === country.code ? "" : country.code;
          render();
          if (focused) flyToCountry(focused);
        });
        list.append(btn);
      });
    }

    setText("fsd-world-showing", `${rows.length} ${rows.length === 1 ? "market" : "markets"}`);
    if (caption) {
      const hit = data.countries.find((c) => c.code === focused);
      caption.textContent = hit
        ? `${hit.name} · ${statusLabel[hit.status]} · ${hit.version}`
        : active === "live"
          ? `${live.length} markets live or limited`
          : active === "europe"
            ? "Europe — national yeses and the remaining vote"
            : "Country-by-country status";
    }
    showDetail(data.countries.find((c) => c.code === focused));
    drawPins(data.countries.filter((c) => c.status !== "none"));
  };

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.fsdWorldFilter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      if (active === "europe") applyView(EUROPE_BOX, true);
      else if (!focused) applyView(worldBox(), true);
      render();
    });
  });
  search?.addEventListener("input", render);

  const versions = document.getElementById("fsd-versions");
  if (versions) {
    data.versions.forEach((row) => {
      const article = document.createElement("article");
      article.className = "flagship-card";
      article.innerHTML = `
        <div class="flagship-card-head">
          <strong>${escapeHtml(row.id)}</strong>
          <span class="fsd-status fsd-status-${row.status}">${statusLabel[row.status] || row.status}</span>
        </div>
        <p class="starship-hw">${escapeHtml(row.region)} · ${escapeHtml(row.hardware)}${row.build ? ` · ${escapeHtml(row.build)}` : ""}</p>
        <p>${escapeHtml(row.note)}</p>
        <time datetime="${escapeHtml(row.date || "")}">${escapeHtml(formatDate(row.date))}</time>
      `;
      versions.append(article);
    });
  }

  const milestones = document.getElementById("fsd-milestones");
  if (milestones) {
    data.milestones.forEach((row) => {
      const li = document.createElement("li");
      li.className = `flagship-mile is-${row.status}`;
      li.innerHTML = `
        <time>${escapeHtml(row.date ? formatDate(row.date) : "Open")}</time>
        <div>
          <strong>${escapeHtml(row.label)}</strong>
          <p>${escapeHtml(row.detail)}</p>
          ${row.href ? `<p class="fsd-track-link"><a href="${escapeHtml(row.href)}">Open →</a></p>` : ""}
        </div>
      `;
      milestones.append(li);
    });
  }

  const sources = document.getElementById("fsd-sources");
  if (sources) {
    const seen = new Set();
    const links = [
      { label: "Tesla FSD support", url: data.teslaList },
      { label: "Europe tracker", url: "/fsd-europe.html" },
      { label: "TCMV log", url: "/tcmv.html" },
      ...data.countries.map((c) => c.source).filter(Boolean),
    ];
    links.forEach((src) => {
      if (!src?.url || seen.has(src.url)) return;
      seen.add(src.url);
      const li = document.createElement("li");
      li.innerHTML = `<a href="${escapeHtml(src.url)}">${escapeHtml(src.label)}</a>`;
      sources.append(li);
    });
  }

  const bindMapNav = () => {
    const shell = document.getElementById("fsd-world-shell");
    const svg = mapSvg();
    if (!shell || !svg) return;

    document.querySelectorAll("[data-fsd-zoom]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const how = button.dataset.fsdZoom;
        if (how === "in") zoomBy(1.4, null, null, true);
        else if (how === "out") zoomBy(1 / 1.4, null, null, true);
        else if (how === "europe") applyView(EUROPE_BOX, true);
        else applyView(worldBox(), true);
      });
    });

    shell.addEventListener("wheel", (event) => {
      if (event.target.closest("[data-fsd-zoom]")) return;
      if (nearWorld() && event.deltaY > 0) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.16 : 1 / 1.16, event.clientX, event.clientY, false);
    }, { passive: false });

    let drag = null;
    shell.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-fsd-zoom]")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const [vx, vy, vw, vh] = readViewBox(svg);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, vx, vy, vw, vh, moved: false, canPan: !nearWorld() };
    });
    window.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id || !drag.canPan) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((event.clientX - drag.x) / rect.width) * drag.vw;
      const dy = ((event.clientY - drag.y) / rect.height) * drag.vh;
      if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
      drag.moved = true;
      shell.classList.add("is-panning");
      applyView([drag.vx - dx, drag.vy - dy, drag.vw, drag.vh], false);
    });
    const endDrag = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      shell.classList.remove("is-panning");
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  };

  window.addEventListener("resize", () => {
    sizePins();
    syncZoomButtons();
  });

  bindMapNav();
  loadLand();
  render();
  applyView(worldBox(), false);
})();
