(() => {
  // Paint live sd-events totals. No invented numbers. Zeros stay zeros.
  const LIVE = "https://sd-events.superchargeddaily.workers.dev/stats?days=30";
  const EVENTS = [
    ["signup_submit", "Newsletter handoffs", "Forms continued to Beehiiv, not confirmed subscribers"],
    ["latest_issue_click", "Latest issue", "Clicks on Read the latest issue"],
    ["referral_click", "Tesla referral", "ts.la referral clicks"],
    ["tesmag_click", "TESMAG", "TESMAG affiliate clicks"],
    ["search_open", "Search opened", "⌘K or the Search button"],
    ["search_go", "Search go", "Search submitted — path only"],
    ["theme_toggle", "Theme toggles", "Light / Dark clicks"],
    ["dispatch_filter", "Dispatch filters", "Topic chips, not the search box"],
  ];
  const LABELS = Object.fromEntries(EVENTS.map(([id, label]) => [id, label]));
  const hint = document.getElementById("sd-counts-hint");
  const status = document.getElementById("sd-counts-status");
  const daysEl = document.getElementById("sd-counts-days");
  const pagesEl = document.getElementById("sd-counts-pages");
  const refresh = document.getElementById("sd-counts-refresh");
  const statsUrl = () => {
    const q = new URLSearchParams(location.search).get("stats");
    return q && q.startsWith("/") ? q : LIVE;
  };
  const setHint = (text, err) => {
    if (!hint) return;
    hint.textContent = text;
    hint.classList.toggle("is-err", !!err);
  };
  const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—");
  const dayLabel = (iso) => {
    const t = Date.parse(iso + "T00:00:00Z");
    if (!Number.isFinite(t)) return iso;
    return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  };
  const paintTiles = (totals, ready) => {
    EVENTS.forEach(([id]) => {
      const el = document.querySelector('[data-sd-ev="' + id + '"] [data-sd-ev-n]');
      if (!el) return;
      const n = Number(totals?.[id]);
      el.textContent = ready && Number.isFinite(n) ? fmt(n) : "—";
    });
  };
  const paintDays = (byDay) => {
    if (!daysEl) return;
    const days = Object.keys(byDay || {}).sort().reverse();
    const rows = days.map((d) => {
      const chips = EVENTS.map(([id]) => [id, Number((byDay[d] || {})[id]) || 0]).filter(([, n]) => n > 0);
      if (!chips.length) return "";
      return '<li class="sd-counts-row"><time datetime="' + d + '">' + dayLabel(d) + '</time><ul class="sd-counts-chips">' +
        chips.map(([id, n]) => "<li>" + LABELS[id] + " <b>" + fmt(n) + "</b></li>").join("") +
        "</ul></li>";
    }).filter(Boolean);
    daysEl.innerHTML = rows.join("");
  };
  const paintPages = (topPages) => {
    if (!pagesEl) return;
    const rows = [];
    EVENTS.forEach(([id]) => {
      Object.entries(topPages?.[id] || {}).forEach(([path, n]) => {
        const c = Number(n) || 0;
        if (c > 0) rows.push({ id, path: path || "/", n: c });
      });
    });
    rows.sort((a, b) => b.n - a.n || a.path.localeCompare(b.path));
    pagesEl.innerHTML = rows.slice(0, 12).map((r) =>
      '<li class="sd-counts-row"><span class="sd-counts-path">' + r.path + "</span>" +
      LABELS[r.id] + " <b>" + fmt(r.n) + "</b></li>"
    ).join("");
  };
  const load = async () => {
    setHint("");
    if (status) status.textContent = "Loading last 30 days…";
    paintTiles(null, false);
    try {
      const res = await fetch(statsUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error("stats " + res.status);
      const data = await res.json();
      const totals = data.totals || {};
      paintTiles(totals, true);
      paintDays(data.byDay || {});
      paintPages(data.topPages || {});
      const sum = EVENTS.reduce((n, [id]) => n + (Number(totals[id]) || 0), 0);
      if (status) status.textContent = "Last 30 days · UTC" + (data.since ? " · since " + dayLabel(data.since) : "");
      if (!sum) setHint("No actions recorded in the last 30 days. Ad blockers drop some. These are not unique visitors.");
      else setHint("Approximate. Ad blockers drop some. No cookies, no IPs. Not unique visitors.");
    } catch (e) {
      paintTiles(null, false);
      if (daysEl) daysEl.innerHTML = "";
      if (pagesEl) pagesEl.innerHTML = "";
      if (status) status.textContent = "Counts unavailable";
      setHint("Could not load counts. The Worker may be blocked.", true);
    }
  };
  if (refresh) refresh.addEventListener("click", () => { load(); });
  load();
})();
