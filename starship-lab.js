(() => {
  const lab = window.STARSHIP_LAB;
  const catalog = window.STARSHIP;
  if (!lab || !catalog) {
    const detail = document.getElementById("slab-detail");
    if (detail) {
      detail.innerHTML = '<p class="slab-fine" data-slab-fail>Flight Lab data didn’t load. Refresh the page, or read the desk note above — times are a desk read of SpaceX pages, not live telemetry.</p>';
    }
    return;
  }

  const outcomeLabel = {
    worked: "Worked",
    partial: "Partial",
    failed: "Failed",
    next: "Next",
  };
  const resultLabel = {
    ok: "Worked",
    partial: "Partial",
    fail: "Failed",
    skip: "Not flown",
    pending: "Upcoming",
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const formatDate = (iso) => {
    if (!iso) return "—";
    const day = String(iso).slice(0, 10);
    const d = new Date(`${day}T12:00:00Z`);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const byNumber = new Map();
  (catalog.flights || []).forEach((flight) => byNumber.set(Number(flight.flight), flight));
  const nextMeta = {
    flight: catalog.next.flight,
    date: catalog.next.start,
    pad: catalog.next.pad,
    booster: catalog.next.booster,
    ship: catalog.next.ship,
    block: catalog.next.block,
    outcome: "next",
    headline: catalog.next.headline,
    tested: catalog.next.tested,
  };
  byNumber.set(Number(catalog.next.flight), nextMeta);

  const numbers = Array.from(byNumber.keys()).sort((a, b) => a - b);
  const defaultFlight = numbers.includes(14) ? 14 : numbers[numbers.length - 1];

  const rail = document.getElementById("slab-rail");
  const detail = document.getElementById("slab-detail");
  const watch = document.getElementById("slab-watch");
  const explore = document.getElementById("slab-explore");
  const compareBox = document.getElementById("slab-compare");
  const compareBody = document.getElementById("slab-compare-body");
  const pickA = document.getElementById("slab-pick-a");
  const pickB = document.getElementById("slab-pick-b");
  const modeButtons = document.querySelectorAll("[data-slab-mode]");

  let mode = "explore";
  let selected = defaultFlight;
  let compareA = 5;
  let compareB = 14;
  let activeClip = "";
  let persistHash = (location.hash || "").replace(/^#/, "").startsWith("lab");
  const comparePicks = document.getElementById("slab-compare-picks");
  const note = document.getElementById("slab-note");
  if (note) note.textContent = lab.note || "";

  const meta = (n) => byNumber.get(Number(n));
  const extra = (n) => (lab.flights && lab.flights[n]) || {};

  const xUrl = (q) =>
    "https://x.com/search?q=" + encodeURIComponent(q || "from:SpaceX Starship") + "&f=live";

  const clockKind = (tPlus) => {
    const t = String(tPlus || "").trim();
    if (!t || t === "—" || /^NET/i.test(t) || /^pending$/i.test(t)) return "pending";
    if (/^~/.test(t) || /^(splash|entry|coast|lost)$/i.test(t)) return "approx";
    if (/^T\+/i.test(t)) return "official";
    return "approx";
  };
  const clockLabel = { official: "SpaceX clock", approx: "Approx", pending: "No clock" };

  const ytThumb = (id) => "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";

  const writeHash = () => {
    if (!persistHash) return;
    const next =
      mode === "compare"
        ? `#lab/compare/${compareA}/${compareB}`
        : `#lab/${selected}`;
    if (location.hash !== next) history.replaceState(null, "", next);
  };

  const parseHash = () => {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw.startsWith("lab")) return false;
    const parts = raw.split("/");
    if (parts[1] === "compare") {
      mode = "compare";
      compareA = Number(parts[2]) || 5;
      compareB = Number(parts[3]) || 14;
      return true;
    }
    if (parts[1] && Number(parts[1])) {
      mode = "explore";
      selected = Number(parts[1]);
      return true;
    }
    mode = "explore";
    return true;
  };

  const fillSelect = (select, current) => {
    if (!select) return;
    select.replaceChildren();
    numbers.forEach((n) => {
      const row = meta(n);
      const opt = document.createElement("option");
      opt.value = String(n);
      opt.textContent = `Flight ${n} — ${row.headline}`;
      if (n === current) opt.selected = true;
      select.append(opt);
    });
  };

  const renderRail = () => {
    if (!rail) return;
    rail.replaceChildren();
    numbers.forEach((n) => {
      const row = meta(n);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "is-" + row.outcome;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(n === selected));
      button.setAttribute("aria-controls", "slab-explore");
      button.dataset.flight = String(n);
      button.innerHTML = `<b>F${escapeHtml(n)}</b><span>${escapeHtml(outcomeLabel[row.outcome])}</span>`;
      button.addEventListener("click", () => open(n, { mode: "explore" }));
      rail.append(button);
    });
    const current = rail.querySelector(`[data-flight="${selected}"]`);
    if (current && typeof current.scrollIntoView === "function") {
      current.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  };

  const phaseList = (n) => {
    const rows = extra(n).phases || [];
    if (!rows.length) return "<p class=\"slab-fine\">No phase notes yet.</p>";
    return `<ol class="slab-phases">${rows
      .map(
        (p) => `
      <li class="slab-phase is-${escapeHtml(p.result)}">
        <time>${escapeHtml(p.tPlus)}<i class="slab-clock slab-clock-${clockKind(p.tPlus)}">${clockLabel[clockKind(p.tPlus)]}</i></time>
        <span class="slab-dot" aria-hidden="true"></span>
        <div>
          <b>${escapeHtml(lab.phaseLabel[p.id] || p.id)}</b>
          <p>${escapeHtml(p.note)}</p>
        </div>
      </li>`
      )
      .join("")}</ol>`;
  };

  const listHtml = (items, cls) => {
    if (!items || !items.length) return "";
    return `<ul class="${cls}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  };

  const loadYoutube = (mount, id, title, start) => {
    const iframe = document.createElement("iframe");
    const startQ = Number(start) > 0 ? `&start=${Number(start)}` : "";
    iframe.src =
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(id) +
      "?autoplay=1&rel=0&modestbranding=1&playsinline=1" +
      startQ;
    iframe.title = title || "SpaceX video";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    mount.replaceChildren(iframe);
    mount.classList.add("is-playing");
  };

  const loadClip = (mount, clip) => {
    const video = document.createElement("video");
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.poster = clip.poster || "";
    const source = document.createElement("source");
    source.src = clip.src;
    source.type = "video/mp4";
    video.append(source);
    mount.replaceChildren(video);
    mount.classList.add("is-playing");
  };

  const posterButton = (src, label, onPlay) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slab-poster";
    button.innerHTML = `
      <img src="${escapeHtml(src)}" alt="" width="640" height="360" />
      <span class="slab-play" aria-hidden="true"></span>
      <span class="slab-poster-label">${escapeHtml(label)}</span>`;
    button.addEventListener("click", onPlay);
    return button;
  };

  const renderWatch = (n) => {
    if (!watch) return;
    const row = extra(n);
    const video = row.video;
    const clips = row.clips || [];
    watch.replaceChildren();

    const panel = document.createElement("div");
    panel.className = "slab-panel";
    const head = document.createElement("div");
    head.className = "slab-watch-head";
    const title = document.createElement("h3");
    title.textContent = "Official footage";
    const hint = document.createElement("p");
    hint.className = "slab-fine";
    hint.textContent =
      video && video.kind === "preflight"
        ? "SpaceX film from before the flight — not a recap of the test."
        : video
          ? "SpaceX recap. Short highlight edit, not the full webcast clock."
          : clips.length
            ? "Official SpaceX clips already hosted on this site."
            : "No official SpaceX recap posted for this flight yet.";
    head.append(title, hint);
    panel.append(head);

    const player = document.createElement("div");
    player.className = "slab-player";
    player.id = "slab-player";

    if (video && video.id) {
      player.append(
        posterButton(ytThumb(video.id), "SpaceX · YouTube", () => {
          activeClip = "yt";
          loadYoutube(player, video.id, video.title, 0);
          syncMoments();
        })
      );
    } else if (clips[0]) {
      player.append(
        posterButton(clips[0].poster, clips[0].title, () => {
          activeClip = clips[0].src;
          loadClip(player, clips[0]);
          syncMoments();
        })
      );
    } else {
      const empty = document.createElement("div");
      empty.className = "slab-empty";
      empty.innerHTML = `<p>Awaiting an official SpaceX webcast or recap. We do not embed third-party streams.</p>`;
      player.append(empty);
    }
    panel.append(player);

    const caption = document.createElement("p");
    caption.className = "slab-caption";
    if (video && video.id) {
      caption.innerHTML = `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(
        video.id
      )}" rel="noopener noreferrer" target="_blank">${escapeHtml(video.title)}</a> · SpaceX`;
    } else if (n === 15) {
      caption.textContent = "Flight 15 has no SpaceX clock and no webcast yet.";
    } else {
      caption.textContent = "Use the SpaceX flight page and @SpaceX until an official recap lands.";
    }
    panel.append(caption);

    if (clips.length) {
      const rowEl = document.createElement("div");
      rowEl.className = "slab-clips";
      clips.forEach((clip) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "slab-moment";
        chip.dataset.clip = clip.src;
        chip.textContent = clip.title;
        chip.addEventListener("click", () => {
          activeClip = clip.src;
          loadClip(player, clip);
          caption.textContent = clip.note || clip.title;
          syncMoments();
        });
        rowEl.append(chip);
      });
      panel.append(rowEl);
    }

    const links = document.createElement("p");
    links.className = "slab-links";
    const page = row.spacex || "https://www.spacex.com/launches";
    links.innerHTML = `
      <a href="${escapeHtml(page)}" rel="noopener noreferrer" target="_blank">SpaceX flight page</a>
      ·
      <a href="${escapeHtml(xUrl(row.xq))}" rel="noopener noreferrer" target="_blank">@SpaceX on X</a>
      ·
      <a href="https://www.youtube.com/@SpaceX" rel="noopener noreferrer" target="_blank">SpaceX on YouTube</a>`;
    panel.append(links);
    watch.append(panel);
  };

  const syncMoments = () => {
    document.querySelectorAll("#slab-watch .slab-moment").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.clip === activeClip));
    });
  };

  const renderDetail = (n) => {
    if (!detail) return;
    const row = meta(n);
    const more = extra(n);
    const when = row.outcome === "next" ? `NET ${formatDate(row.date)}` : formatDate(row.date);
    detail.innerHTML = `
      <p class="slab-kicker">Flight ${escapeHtml(n)} · ${escapeHtml(when)} · ${escapeHtml(
        outcomeLabel[row.outcome]
      )}</p>
      <h3>${escapeHtml(row.headline)}</h3>
      <p class="slab-hwline">${escapeHtml(row.block)} · ${escapeHtml(row.booster)} · ${escapeHtml(
        row.ship
      )} · ${escapeHtml(row.pad)}</p>
      <p>${escapeHtml(row.tested)}</p>
      <h4 class="slab-sub">Mission objectives</h4>
      ${listHtml(more.objectives, "slab-obj")}
      <h4 class="slab-sub">Flight phases</h4>
      ${phaseList(n)}
      <h4 class="slab-sub">Hardware</h4>
      <div class="slab-chips">${(more.hardware || [])
        .map((item) => `<span class="slab-chip">${escapeHtml(item)}</span>`)
        .join("")}</div>
      <h4 class="slab-sub">Anomalies &amp; outcomes</h4>
      ${listHtml(more.anomalies, "slab-anom")}
      <p class="slab-sources">
        <a href="${escapeHtml(more.spacex || "https://www.spacex.com/launches")}" rel="noopener noreferrer" target="_blank">SpaceX flight page</a>
        ·
        <a href="${escapeHtml(xUrl(more.xq))}" rel="noopener noreferrer" target="_blank">@SpaceX on X</a>
      </p>
      <p class="slab-fine">Phase times are a desk read of SpaceX pages and recaps. They are not live telemetry.</p>`;
  };

  const cell = (n, id) => {
    const phase = (extra(n).phases || []).find((p) => p.id === id);
    if (!phase) {
      return `<td class="slab-cell is-skip"><b>No data</b></td>`;
    }
    const kind = clockKind(phase.tPlus);
    return `<td class="slab-cell is-${escapeHtml(phase.result)}"><b>${escapeHtml(
      resultLabel[phase.result] || phase.result
    )}</b>${escapeHtml(phase.note)} <span class="slab-fine">${escapeHtml(phase.tPlus)} · ${clockLabel[kind]}</span></td>`;
  };

  const renderCompare = () => {
    if (!compareBody) return;
    const a = meta(compareA);
    const b = meta(compareB);
    const head = (n, row) => {
      const more = extra(n);
      return `<article class="slab-cmp-h">
        <p class="slab-kicker">Flight ${escapeHtml(n)} · ${escapeHtml(outcomeLabel[row.outcome])}</p>
        <h3>${escapeHtml(row.headline)}</h3>
        <p class="slab-hwline">${escapeHtml(row.block)} · ${escapeHtml(row.booster)} · ${escapeHtml(row.ship)}</p>
        <p class="slab-sources">
          <a href="${escapeHtml(more.spacex || "https://www.spacex.com/launches")}" rel="noopener noreferrer" target="_blank">SpaceX flight page</a>
        </p>
      </article>`;
    };
    compareBody.innerHTML = `
      <div class="slab-cmp-heads">${head(compareA, a)}${head(compareB, b)}</div>
      <div class="slab-table-wrap">
        <table class="slab-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Flight ${escapeHtml(compareA)} · ${escapeHtml(a.headline)}</th>
              <th>Flight ${escapeHtml(compareB)} · ${escapeHtml(b.headline)}</th>
            </tr>
          </thead>
          <tbody>
            ${(lab.phaseOrder || [])
              .map(
                (id) => `
              <tr>
                <td>${escapeHtml(lab.phaseLabel[id] || id)}</td>
                ${cell(compareA, id)}
                ${cell(compareB, id)}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="slab-fine" style="margin-top:0.85rem">Same ten phases on every flight. Skip means that flight never tried it. Times marked Approx are a desk read, not a SpaceX clock, and never live telemetry.</p>`;
  };

  const setModeUi = () => {
    modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.slabMode === mode));
    });
    if (explore) explore.hidden = mode !== "explore";
    if (compareBox) compareBox.hidden = mode !== "compare";
    if (rail) rail.hidden = mode !== "explore";
    if (comparePicks) comparePicks.hidden = mode !== "compare";
  };

  const render = () => {
    setModeUi();
    renderRail();
    renderDetail(selected);
    renderWatch(selected);
    renderCompare();
    fillSelect(pickA, compareA);
    fillSelect(pickB, compareB);
    writeHash();
  };

  const open = (n, opts = {}) => {
    persistHash = true;
    const flight = Number(n) || defaultFlight;
    if (opts.mode) mode = opts.mode;
    if (opts.compareWith) {
      mode = "compare";
      compareA = flight;
      compareB = Number(opts.compareWith) || 14;
    } else if (mode === "compare" && opts.as === "b") {
      compareB = flight;
    } else if (mode === "compare") {
      compareA = flight;
    } else {
      selected = flight;
      mode = "explore";
    }
    activeClip = "";
    render();
    const target = document.getElementById("lab");
    if (opts.scroll !== false && target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      persistHash = true;
      mode = button.dataset.slabMode === "compare" ? "compare" : "explore";
      render();
    });
  });

  if (pickA) {
    pickA.addEventListener("change", () => {
      persistHash = true;
      compareA = Number(pickA.value) || compareA;
      mode = "compare";
      render();
    });
  }
  if (pickB) {
    pickB.addEventListener("change", () => {
      persistHash = true;
      compareB = Number(pickB.value) || compareB;
      mode = "compare";
      render();
    });
  }

  window.StarshipLab = {
    open,
    selected: () => selected,
  };

  window.addEventListener("hashchange", () => {
    if (parseHash()) render();
  });

  parseHash();
  if (!numbers.includes(selected)) selected = defaultFlight;
  if (!numbers.includes(compareA)) compareA = numbers[0];
  if (!numbers.includes(compareB)) compareB = defaultFlight;
  render();
})();
