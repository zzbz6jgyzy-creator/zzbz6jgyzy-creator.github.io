/* Dispatch archive: topic chips, local search, incremental load, reading time.
   Cards stay in the HTML for SEO. This only shows, hides and annotates them. */
(() => {
  const grid = document.querySelector("[data-disp-grid]");
  if (!grid) return;
  const PAGE = 12;
  const CHIPS = [
    { id: "all", label: "All" },
    { id: "tesla", label: "Tesla", re: /tesla|robotaxi|fsd|software|powerwall|cybercab|model [3ysx]|optimus|headlight/i },
    { id: "spacex", label: "SpaceX", re: /spacex|starlink|dragon|falcon|starmind|starfall|bandwagon|boca|crs/i },
    { id: "roadster", label: "Roadster", re: /roadster/i },
    { id: "starship", label: "Starship", re: /starship|super heavy|raptor|\bship \d/i },
    { id: "analysis", label: "Analysis", re: /analysis/i },
  ];
  const chipsEl = document.querySelector("[data-disp-chips]");
  const qEl = document.querySelector("[data-disp-q]");
  const status = document.querySelector("[data-disp-status]");
  const more = document.querySelector("[data-disp-more]");
  const empty = document.querySelector("[data-disp-empty]");
  const form = document.querySelector("[data-disp-find]");

  const cards = [...grid.querySelectorAll("a.story-card")].map((el, i) => {
    const tag = ((el.querySelector(".tag") || {}).textContent || "").trim();
    const title = ((el.querySelector("h3") || {}).textContent || "").trim();
    const summary = ((el.querySelector(".story-copy p") || {}).textContent || "").trim();
    const href = el.getAttribute("href") || "";
    const hay = `${tag} ${title} ${summary} ${href}`;
    const topics = CHIPS.filter((c) => c.id !== "all" && c.re.test(hay)).map((c) => c.id);
    return { el, tag, title, summary, href, topics, i };
  });

  const present = new Set(cards.flatMap((c) => c.topics));
  const chips = CHIPS.filter((c) => c.id === "all" || present.has(c.id));
  const params = new URLSearchParams(location.search);
  let topic = chips.some((c) => c.id === params.get("topic")) ? params.get("topic") : "all";
  let query = params.get("dq") || "";
  let shown = PAGE;

  const paintChips = () => {
    if (!chipsEl) return;
    chipsEl.replaceChildren();
    chips.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sd-disp-chip" + (c.id === topic ? " is-on" : "");
      b.setAttribute("data-disp-topic", c.id);
      b.setAttribute("aria-pressed", String(c.id === topic));
      b.textContent = c.label;
      chipsEl.append(b);
    });
  };

  const writeUrl = () => {
    const url = new URL(location.href);
    if (topic && topic !== "all") url.searchParams.set("topic", topic);
    else url.searchParams.delete("topic");
    if (query) url.searchParams.set("dq", query);
    else url.searchParams.delete("dq");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  };

  const pool = () => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (topic !== "all" && !c.topics.includes(topic)) return false;
      if (!q) return true;
      return `${c.title} ${c.summary} ${c.tag}`.toLowerCase().includes(q);
    });
  };

  const paint = () => {
    const rows = pool();
    cards.forEach((c) => { c.el.hidden = true; });
    rows.slice(0, shown).forEach((c) => { c.el.hidden = false; });
    if (empty) empty.hidden = rows.length > 0;
    if (more) more.hidden = rows.length <= shown;
    if (status) {
      const label = chips.find((c) => c.id === topic);
      status.textContent = rows.length
        ? `${rows.length} ${rows.length === 1 ? "story" : "stories"}${topic === "all" ? "" : " in " + (label ? label.label : topic)}${query ? " matching “" + query + "”" : ""}`
        : "No Dispatch stories match that filter.";
    }
  };

  if (chipsEl) {
    chipsEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-disp-topic]");
      if (!b) return;
      topic = b.getAttribute("data-disp-topic") || "all";
      shown = PAGE;
      paintChips();
      writeUrl();
      paint();
      if (window.sdTrack) window.sdTrack("dispatch_filter");
    });
  }
  if (qEl) {
    qEl.value = query;
    qEl.addEventListener("input", () => {
      query = qEl.value;
      shown = PAGE;
      writeUrl();
      paint();
    });
  }
  if (form) form.addEventListener("submit", (e) => { e.preventDefault(); paint(); });
  if (more) more.addEventListener("click", () => { shown += PAGE; paint(); });

  fetch("/data/articles.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const by = new Map(((j && j.articles) || []).map((a) => [a.url, a]));
      cards.forEach((c) => {
        const a = by.get(c.href);
        if (!a) return;
        const copy = c.el.querySelector(".story-copy");
        if (!copy || copy.querySelector(".sd-disp-meta")) return;
        const bits = [];
        if (a.date) {
          const d = new Date(a.date);
          if (!Number.isNaN(d.getTime())) bits.push(d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
        }
        if (a.minutes) bits.push(a.minutes + " min read");
        if (!bits.length) return;
        const p = document.createElement("p");
        p.className = "sd-disp-meta";
        p.textContent = bits.join(" · ");
        copy.append(p);
      });
    })
    .catch(() => {});

  paintChips();
  paint();
})();
