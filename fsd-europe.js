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

  render();
})();
