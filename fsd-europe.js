(() => {
  const data = window.FSD_EUROPE;
  if (!data) return;

  const statusLabel = {
    approved: "Approved",
    review: "In review",
    none: "No approval",
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const approved = data.countries.filter((c) => c.status === "approved");
  const review = data.countries.filter((c) => c.status === "review");
  const approvedPop = approved.reduce((sum, c) => sum + c.pop, 0);
  const reviewPop = review.reduce((sum, c) => sum + c.pop, 0);
  const popPct = (approvedPop / data.thresholds.euPopulationM) * 100;
  const potentialPct = ((approvedPop + reviewPop) / data.thresholds.euPopulationM) * 100;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("fsd-updated", `Updated ${formatDate(data.updated)}`);
  setText("fsd-approved-count", String(approved.length));
  setText("fsd-approved-count-copy", String(approved.length));
  setText("fsd-states-bar-label", String(approved.length));
  setText("fsd-review-count", String(review.length));
  setText("fsd-states-needed", String(Math.max(0, data.thresholds.statesNeeded - approved.length)));
  setText("fsd-pop-pct", `${popPct.toFixed(1)}%`);
  setText("fsd-pop-needed", `${Math.max(0, data.thresholds.populationNeeded - popPct).toFixed(1)}%`);
  setText("fsd-vote-detail", data.nextVote.detail);
  setText("fsd-note", data.note);

  const statesBar = document.getElementById("fsd-states-bar");
  const statesPotential = document.getElementById("fsd-states-potential");
  const popBar = document.getElementById("fsd-pop-bar");
  const popPotential = document.getElementById("fsd-pop-potential");
  if (statesBar) statesBar.style.width = `${(approved.length / 27) * 100}%`;
  if (statesPotential) statesPotential.style.width = `${((approved.length + review.length) / 27) * 100}%`;
  if (popBar) popBar.style.width = `${Math.min(100, popPct)}%`;
  if (popPotential) popPotential.style.width = `${Math.min(100, potentialPct)}%`;

  const timeline = document.getElementById("fsd-timeline");
  if (timeline) {
    approved
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((country) => {
        const li = document.createElement("li");
        li.innerHTML = `<time datetime="${country.date}">${formatDate(country.date)}</time><div><strong>${country.name}</strong><span>${country.note}</span></div>`;
        timeline.append(li);
      });
  }

  const tbody = document.getElementById("fsd-table-body");
  const filters = document.querySelectorAll("[data-fsd-filter]");
  let active = "all";

  const render = () => {
    if (!tbody) return;
    tbody.replaceChildren();
    const rows = data.countries
      .filter((c) => active === "all" || c.status === active)
      .slice()
      .sort((a, b) => {
        const rank = { approved: 0, review: 1, none: 2 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        if (a.status === "approved") return a.date.localeCompare(b.date);
        return b.pop - a.pop;
      });

    rows.forEach((country) => {
      const tr = document.createElement("tr");
      tr.id = `fsd-row-${country.code}`;
      tr.dataset.status = country.status;
      tr.innerHTML = `
        <td><span class="fsd-code">${country.code}</span> ${country.name}</td>
        <td><span class="fsd-status fsd-status-${country.status}">${statusLabel[country.status]}</span></td>
        <td>${formatDate(country.date)}</td>
        <td class="fsd-num">${country.pop.toFixed(1)}M</td>
        <td class="fsd-note-cell">${country.note}</td>
      `;
      tbody.append(tr);
    });

    setText("fsd-showing", `${rows.length} of ${data.countries.length} countries`);
  };

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.fsdFilter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      render();
    });
  });

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const showMapTip = (country, evt) => {
    const tip = document.getElementById("fsd-map-tip");
    const shell = document.querySelector(".fsd-map-shell");
    if (!tip || !shell || !country) return;
    tip.hidden = false;
    tip.innerHTML = `<strong>${escapeHtml(country.name)}</strong><span>${statusLabel[country.status]}</span>`;
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
    node.setAttribute("aria-label", `${country.name}, ${statusLabel[country.status]}`);
    node.addEventListener("mouseenter", (event) => showMapTip(country, event));
    node.addEventListener("mousemove", (event) => showMapTip(country, event));
    node.addEventListener("mouseleave", hideMapTip);
    const open = () => {
      const row = document.getElementById(`fsd-row-${country.code}`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.querySelectorAll(".fsd-table tr.is-focus").forEach((tr) => tr.classList.remove("is-focus"));
      row?.classList.add("is-focus");
    };
    node.addEventListener("click", open);
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
  };

  const paintMap = () => {
    const byCode = new Map(data.countries.map((row) => [row.code, row]));
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
      setText("fsd-map-caption", "Map did not load. The country table below still has the list.");
    }
  };

  render();
  loadMap();
})();
