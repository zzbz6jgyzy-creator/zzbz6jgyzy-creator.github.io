(() => {
  const data = window.TCMV_MEETINGS;
  if (!data) return;

  const formatDate = (iso, label) => {
    if (label) return label;
    if (!iso) return "—";
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const held = data.meetings.filter((m) => m.outcome !== "upcoming");
  const upcoming = data.meetings.filter((m) => m.outcome === "upcoming");
  const votes = held.filter((m) => m.outcome === "vote").length;

  const next = upcoming[0];
  const nextLabel = next
    ? new Date(`${next.date}T12:00:00Z`).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "—";

  setText("tcmv-updated", `Updated ${formatDate(data.updated)}`);
  setText("tcmv-held-count", String(held.length));
  setText("tcmv-vote-count", String(votes));
  setText("tcmv-upcoming-count", String(upcoming.length));
  setText("tcmv-next-label", nextLabel);
  setText("tcmv-note", data.note);

  const list = document.getElementById("tcmv-list");
  const filters = document.querySelectorAll("[data-tcmv-filter]");
  let active = "all";
  let didHashScroll = false;

  const render = () => {
    if (!list) return;
    list.replaceChildren();

    const rows = data.meetings
      .filter((m) => active === "all" || m.outcome === active)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));

    rows.forEach((meeting) => {
      const article = document.createElement("article");
      article.className = "tcmv-card reveal is-visible";
      article.id = `meeting-${meeting.id}`;

      const numberLabel = meeting.number ? `#${meeting.number}` : "Next";
      const dateLabel = formatDate(meeting.date, meeting.dateLabel);

      const highlights = (meeting.agendaHighlights || [])
        .map((item) => `<li>${item}</li>`)
        .join("");
      const discussed = (meeting.whatWasDiscussed || [])
        .map((item) => `<li>${item}</li>`)
        .join("");
      const sources = (meeting.sources || [])
        .map((s) => `<li><a href="${s.url}" rel="noopener noreferrer" target="_blank">${s.label}</a></li>`)
        .join("");

      article.innerHTML = `
        <header class="tcmv-card-head">
          <div>
            <p class="eyebrow">${numberLabel} · ${meeting.place}</p>
            <h3>${meeting.title}</h3>
            <p class="tcmv-meta">
              <time datetime="${meeting.date}">${dateLabel}</time>
              <span>${meeting.time}</span>
            </p>
          </div>
          <span class="tcmv-status tcmv-status-${meeting.outcome}">${meeting.outcomeLabel}</span>
        </header>
        <p class="tcmv-summary">${meeting.summary}</p>
        <div class="tcmv-grid">
          <div>
            <h3>FSD agenda item</h3>
            <p>${meeting.fsdItem}</p>
            <p class="tcmv-slot">Slot: ${meeting.slot}</p>
          </div>
          <div>
            <h3>What was discussed</h3>
            <ul>${discussed}</ul>
          </div>
        </div>
        <details class="tcmv-details">
          <summary>Full agenda highlights</summary>
          <ul>${highlights}</ul>
        </details>
        <details class="tcmv-details">
          <summary>Sources</summary>
          <ul>${sources}</ul>
        </details>
      `;
      list.append(article);
    });

    setText(
      "tcmv-showing",
      active === "all"
        ? `${held.length} sessions · ${votes} vote${votes === 1 ? "" : "s"} taken`
        : `${rows.length} meeting${rows.length === 1 ? "" : "s"}`
    );

    if (!didHashScroll && location.hash.startsWith("#meeting-")) {
      didHashScroll = true;
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        requestAnimationFrame(() => target.scrollIntoView());
      }
    }
  };

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.tcmvFilter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      render();
    });
  });

  render();
})();
