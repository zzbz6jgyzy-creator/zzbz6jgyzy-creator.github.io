(() => {
  const data = window.STARSHIP;
  if (!data) return;

  const outcomeLabel = {
    worked: "Worked",
    partial: "Partial",
    failed: "Failed",
    next: "Next",
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const day = iso.slice(0, 10);
    const d = new Date(`${day}T12:00:00Z`);
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

  const flown = data.flights;
  const worked = flown.filter((f) => f.outcome === "worked").length;
  const partial = flown.filter((f) => f.outcome === "partial").length;
  const failed = flown.filter((f) => f.outcome === "failed").length;

  setText("starship-updated", `Updated ${formatDate(data.updated)}`);
  setText("starship-flown-count", String(flown.length));
  setText("starship-worked-count", String(worked));
  setText("starship-partial-count", String(partial));
  setText("starship-failed-count", String(failed));
  setText("starship-note", data.note);
  setText("starship-next-flight", `Flight ${data.next.flight}`);
  setText("starship-next-headline", data.next.headline);
  setText("starship-next-tested", data.next.tested);
  setText("starship-next-hw", `${data.next.block} · ${data.next.booster} · ${data.next.ship} · ${data.next.pad}`);
  setText("starship-next-date", `NET ${formatDate(data.next.start)}`);

  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

  const renderCountdown = () => {
    const target = Date.parse(data.next.start);
    const daysEl = document.getElementById("starship-cd-days");
    const hoursEl = document.getElementById("starship-cd-hours");
    const minsEl = document.getElementById("starship-cd-mins");
    const secsEl = document.getElementById("starship-cd-secs");
    const statusEl = document.getElementById("starship-cd-status");
    if (!daysEl || !Number.isFinite(target)) return;

    const diff = target - Date.now();
    if (diff <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minsEl.textContent = "00";
      secsEl.textContent = "00";
      if (statusEl) {
        statusEl.textContent =
          "The current planning target has passed. Flight 15 is still NET — SpaceX has not set an official clock.";
      }
      return;
    }

    const total = Math.floor(diff / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minsEl.textContent = pad(mins);
    secsEl.textContent = pad(secs);
    if (statusEl) {
      statusEl.textContent = `Counts down to 00:00 UTC on ${formatDate(data.next.start)}. Day precision only.`;
    }
  };

  const objectives = document.getElementById("starship-objectives");
  if (objectives) {
    (data.next.objectives || []).forEach((text) => {
      const li = document.createElement("li");
      li.className = "starship-objective";
      li.textContent = text;
      objectives.append(li);
    });
  }

  const coverage = document.getElementById("starship-coverage");
  if (coverage) {
    (data.next.coverage || []).forEach((link) => {
      const a = document.createElement("a");
      a.href = link.url;
      a.textContent = link.label;
      if (/^https?:/.test(link.url)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      coverage.append(a);
    });
  }

  const changes = document.getElementById("starship-changes");
  if (changes) {
    (data.schedule || []).forEach((row) => {
      const article = document.createElement("article");
      article.className = "starship-change";
      article.innerHTML = `
        <div class="starship-change-head">
          <time datetime="${escapeHtml(row.date)}">${escapeHtml(formatDate(row.date))}</time>
          <span class="fsd-status ${row.confirmed ? "fsd-status-done" : "fsd-status-watch"}">${
            row.confirmed ? "Confirmed work" : "Planning"
          }</span>
        </div>
        <p>${escapeHtml(row.change)}</p>
      `;
      changes.append(article);
    });
  }

  renderCountdown();
  window.setInterval(renderCountdown, 1000);

  const list = document.getElementById("starship-list");
  const filters = document.querySelectorAll("[data-starship-filter]");
  let active = "all";

  const upcomingCard = () => {
    const article = document.createElement("article");
    article.className = "starship-flight is-next";
    article.dataset.outcome = "next";
    article.innerHTML = `
      <div class="starship-flight-head">
        <span class="starship-flight-num">Flight ${escapeHtml(data.next.flight)}</span>
        <time datetime="${escapeHtml(data.next.start)}">NET ${escapeHtml(formatDate(data.next.start))}</time>
        <span class="fsd-status starship-status-next">${outcomeLabel.next}</span>
      </div>
      <p class="starship-hw">${escapeHtml(data.next.block)} · ${escapeHtml(data.next.booster)} · ${escapeHtml(data.next.ship)} · ${escapeHtml(data.next.pad)}</p>
      <h3>${escapeHtml(data.next.headline)}</h3>
      <p>${escapeHtml(data.next.tested)}</p>
    `;
    return article;
  };

  const flightCard = (flight) => {
    const article = document.createElement("article");
    article.className = "starship-flight";
    article.dataset.outcome = flight.outcome;
    article.innerHTML = `
      <div class="starship-flight-head">
        <span class="starship-flight-num">Flight ${escapeHtml(flight.flight)}</span>
        <time datetime="${escapeHtml(flight.date)}">${escapeHtml(formatDate(flight.date))}</time>
        <span class="fsd-status starship-status-${flight.outcome}">${outcomeLabel[flight.outcome]}</span>
      </div>
      <p class="starship-hw">${escapeHtml(flight.block)} · ${escapeHtml(flight.booster)} · ${escapeHtml(flight.ship)} · ${escapeHtml(flight.pad)}</p>
      <h3>${escapeHtml(flight.headline)}</h3>
      <p>${escapeHtml(flight.tested)}</p>
    `;
    return article;
  };

  const render = () => {
    if (!list) return;
    list.replaceChildren();
    const showNext = active === "all" || active === "next";
    const rows = flown.filter((f) => active === "all" || f.outcome === active);
    if (showNext) list.append(upcomingCard());
    rows.forEach((flight) => list.append(flightCard(flight)));
    const total = flown.length + 1;
    const showing = rows.length + (showNext ? 1 : 0);
    setText("starship-showing", `${showing} of ${total} flights`);
  };

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.starshipFilter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      render();
    });
  });

  render();
})();
