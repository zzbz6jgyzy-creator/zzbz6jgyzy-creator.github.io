(() => {
  const data = window.FSD_EUROPE;
  if (!data) return;

  const statusLabel = {
    approved: "Approved",
    review: "In review",
    none: "Not yet",
  };

  const formatDate = (iso, short = false) => {
    if (!iso) return "—";
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString("en-GB", short
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" });
  };

  const approved = data.countries.filter((c) => c.status === "approved");
  const review = data.countries.filter((c) => c.status === "review");
  const approvedPop = approved.reduce((sum, c) => sum + c.pop, 0);
  const reviewPop = review.reduce((sum, c) => sum + c.pop, 0);
  const popPct = (approvedPop / data.thresholds.euPopulationM) * 100;
  const potentialPct = ((approvedPop + reviewPop) / data.thresholds.euPopulationM) * 100;
  const byCode = new Map(data.countries.map((row) => [row.code, row]));

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  setText("fsd-updated", `Updated ${formatDate(data.updated)}`);
  setText("fsd-approved-count", String(approved.length));
  setText("fsd-states-bar-label", String(approved.length));
  setText("fsd-states-needed", String(Math.max(0, data.thresholds.statesNeeded - approved.length)));
  setText("fsd-pop-pct", `${popPct.toFixed(1)}%`);
  setText("fsd-pop-needed", `${Math.max(0, data.thresholds.populationNeeded - popPct).toFixed(1)}%`);
  setText("fsd-note", data.note);

  const statesBar = document.getElementById("fsd-states-bar");
  const statesPotential = document.getElementById("fsd-states-potential");
  const popBar = document.getElementById("fsd-pop-bar");
  const popPotential = document.getElementById("fsd-pop-potential");
  if (statesBar) statesBar.style.width = `${(approved.length / 27) * 100}%`;
  if (statesPotential) statesPotential.style.width = `${((approved.length + review.length) / 27) * 100}%`;
  if (popBar) popBar.style.width = `${Math.min(100, popPct)}%`;
  if (popPotential) popPotential.style.width = `${Math.min(100, potentialPct)}%`;

  const pathNote = document.getElementById("fsd-path-note");
  if (pathNote) {
    const open = data.countries
      .filter((c) => c.status !== "approved")
      .slice()
      .sort((a, b) => b.pop - a.pop)
      .slice(0, 4)
      .map((c) => c.name);
    pathNote.textContent =
      `Solid is approved. Faint is if every country in review also says yes. ` +
      `Fastest population path: ${open.join(", ")}.`;
  }

  const timeline = document.getElementById("fsd-timeline");
  if (timeline) {
    approved
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((country) => {
        const li = document.createElement("li");
        li.innerHTML = `<button type="button" class="fsd-rail-item" data-code="${country.code}"><time datetime="${country.date}">${formatDate(country.date, true)}</time><strong>${escapeHtml(country.name)}</strong></button>`;
        timeline.append(li);
      });
  }

  const list = document.getElementById("fsd-country-list");
  const filters = document.querySelectorAll("[data-fsd-filter]");
  const search = document.getElementById("fsd-search");
  const detail = document.getElementById("fsd-country-detail");
  let active = "approved";
  let query = "";
  let selected = null;

  const matchesQuery = (country) => {
    if (!query) return true;
    const hay = `${country.name} ${country.code}`.toLowerCase();
    return hay.includes(query);
  };

  const paintSelection = () => {
    document.querySelectorAll(".fsd-country.is-focus").forEach((el) => el.classList.remove("is-focus"));
    document.querySelectorAll(".fsd-map-country.is-focus, .fsd-map-pin.is-focus").forEach((el) => el.classList.remove("is-focus"));
    document.querySelectorAll(".fsd-rail-item.is-focus").forEach((el) => el.classList.remove("is-focus"));
    if (!selected) {
      if (detail) {
        detail.hidden = true;
        detail.innerHTML = "";
      }
      return;
    }
    document.getElementById(`fsd-row-${selected.code}`)?.classList.add("is-focus");
    document.querySelectorAll(`[data-code="${selected.code}"]`).forEach((el) => {
      if (el.classList.contains("fsd-map-country") || el.classList.contains("fsd-map-pin") || el.classList.contains("fsd-rail-item")) {
        el.classList.add("is-focus");
      }
    });
    if (detail) {
      detail.hidden = false;
      detail.innerHTML = `
        <div>
          <strong>${escapeHtml(selected.name)}</strong>
          <span class="fsd-status fsd-status-${selected.status}">${statusLabel[selected.status]}</span>
        </div>
        <p>${escapeHtml(selected.note)}</p>
      `;
    }
  };

  const selectCountry = (country, { scrollList = false, scrollMap = false } = {}) => {
    if (!country) return;
    selected = country;
    if (active !== "all" && country.status !== active) {
      active = country.status === "review" || country.status === "approved" ? country.status : "all";
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fsdFilter === active)));
      render();
    } else {
      paintSelection();
    }
    if (scrollList) {
      document.getElementById(`fsd-row-${country.code}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (scrollMap) {
      document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const render = () => {
    if (!list) return;
    list.replaceChildren();
    const rows = data.countries
      .filter((c) => (active === "all" || c.status === active) && matchesQuery(c))
      .slice()
      .sort((a, b) => {
        const rank = { approved: 0, review: 1, none: 2 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        if (a.status === "approved") return a.date.localeCompare(b.date);
        return b.pop - a.pop;
      });

    rows.forEach((country) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fsd-country";
      button.id = `fsd-row-${country.code}`;
      button.dataset.status = country.status;
      button.dataset.code = country.code;
      button.innerHTML = `
        <i class="fsd-country-dot is-${country.status}" aria-hidden="true"></i>
        <span class="fsd-code">${escapeHtml(country.code)}</span>
        <span class="fsd-country-name">${escapeHtml(country.name)}</span>
        <span class="fsd-country-meta">${country.status === "approved" ? formatDate(country.date, true) : statusLabel[country.status]} · ${country.pop.toFixed(1)}M</span>
      `;
      button.addEventListener("click", () => selectCountry(country));
      list.append(button);
    });

    setText("fsd-showing", `${rows.length} of ${data.countries.length}`);
    paintSelection();
  };

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.fsdFilter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      render();
    });
  });

  search?.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    if (query && active !== "all") {
      active = "all";
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fsdFilter === "all")));
    }
    render();
  });

  const showMapTip = (country, evt) => {
    const tip = document.getElementById("fsd-map-tip");
    const shell = document.querySelector(".fsd-map-shell");
    if (!tip || !shell || !country) return;
    tip.hidden = false;
    const extra = country.status === "approved" ? ` · ${formatDate(country.date, true)}` : "";
    tip.innerHTML = `<strong>${escapeHtml(country.name)}</strong><span>${statusLabel[country.status]}${extra}</span>`;
    const rect = shell.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    tip.style.left = `${Math.min(rect.width - 16, Math.max(16, x))}px`;
    tip.style.top = `${Math.max(16, y - 12)}px`;
  };

  const hideMapTip = () => {
    const tip = document.getElementById("fsd-map-tip");
    if (tip) tip.hidden = true;
  };

  const bindCountryShape = (node, country) => {
    if (!country) return;
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("data-code", country.code);
    node.setAttribute("aria-label", `${country.name}, ${statusLabel[country.status]}`);
    node.addEventListener("mouseenter", (event) => showMapTip(country, event));
    node.addEventListener("mousemove", (event) => showMapTip(country, event));
    node.addEventListener("mouseleave", hideMapTip);
    const open = () => selectCountry(country, { scrollList: true });
    node.addEventListener("click", open);
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
  };

  const paintMap = () => {
    const land = document.getElementById("fsd-map-land");
    const pins = document.getElementById("fsd-map-pins");
    if (!land) return;
    land.querySelectorAll(".fsd-map-country").forEach((path) => {
      const country = byCode.get(path.dataset.code);
      const status = country ? country.status : "out";
      path.setAttribute("class", `fsd-map-country is-${status}`);
      bindCountryShape(path, country);
      if (!country || !pins || country.status !== "approved") return;
      const tiny = new Set(["SI", "EE", "LT"]);
      if (!tiny.has(country.code)) return;
      const cx = Number(path.dataset.cx);
      const cy = Number(path.dataset.cy);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const pin = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pin.setAttribute("class", "fsd-map-pin is-approved");
      pin.setAttribute("cx", cx.toFixed(1));
      pin.setAttribute("cy", cy.toFixed(1));
      pin.setAttribute("r", "7");
      bindCountryShape(pin, country);
      pins.append(pin);
    });

    const names = approved.map((row) => row.name);
    setText(
      "fsd-map-caption",
      names.length
        ? `${names.length} approved · ${names.join(", ")}`
        : "No national recognitions on the file yet."
    );
    paintSelection();
  };

  const loadMap = async () => {
    const land = document.getElementById("fsd-map-land");
    if (!land || land.childElementCount) return;
    try {
      const res = await fetch("/assets/europe-fsd.svg", { cache: "force-cache" });
      if (!res.ok) return;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      doc.querySelectorAll("path[data-code]").forEach((path) => {
        const clone = document.createElementNS("http://www.w3.org/2000/svg", "path");
        clone.setAttribute("d", path.getAttribute("d"));
        clone.setAttribute("data-code", path.getAttribute("data-code"));
        clone.setAttribute("data-cx", path.getAttribute("data-cx") || "");
        clone.setAttribute("data-cy", path.getAttribute("data-cy") || "");
        clone.setAttribute("class", path.getAttribute("class") || "fsd-map-country");
        land.append(clone);
      });
      paintMap();
    } catch {
      setText("fsd-map-caption", "Map did not load. The country list still has the file.");
    }
  };

  timeline?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-code]");
    if (!button) return;
    const country = byCode.get(button.dataset.code);
    selectCountry(country, { scrollList: true, scrollMap: true });
  });

  render();
  loadMap();

  if (location.hash.startsWith("#fsd-row-")) {
    const code = location.hash.slice("#fsd-row-".length).toUpperCase();
    const country = byCode.get(code);
    if (country) selectCountry(country, { scrollList: true });
  }
})();
