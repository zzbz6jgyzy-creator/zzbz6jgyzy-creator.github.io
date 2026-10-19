/* Supercharged Daily site search. Index: /data/articles.json + /data/pages.json.
   Overlay (⌘K / nav Search) on pages that load this file; full page on /search.html. */
(() => {
  if (window.__sdFind) return;
  const V = "202610192300";
  const PAGE = /\/search\.html$/.test(location.pathname);
  const LIMIT = PAGE ? 60 : 24;
  const LATEST = PAGE ? 12 : 8;
  const OVERLAY_PAGES = ["/", "/news.html", "/dispatch.html", "/tesla.html", "/optimus.html", "/production.html", "/autonomy.html", "/my-tesla.html", "/daily.html", "/roadster.html", "/spacex.html", "/starship.html", "/calendar.html", "/starlink.html", "/fsd-europe.html", "/updates.html", "/cybercab.html", "/reviews/index.html"];
  const MAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  if (!document.querySelector('link[href^="/search.css"]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/search.css?v=" + V;
    document.head.appendChild(l);
  }

  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pathOnly = (url) => {
    const p = String(url || "").split("#")[0].replace(/\/index\.html$/, "/");
    return p.replace(/\/$/, "") || "/";
  };
  const compact = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const tokens = (q) => String(q || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter((t) => t.length > 1);
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  const mark = (text, toks) => {
    let out = esc(text);
    const parts = [...toks].filter((t) => t.length > 1).sort((a, b) => b.length - a.length);
    for (const t of parts) {
      const re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      out = out.replace(re, "<mark>$1</mark>");
    }
    return out;
  };

  const ALIAS = {
    fsd: ["fsd", "full self driving", "supervised", "assisted driving"],
    software: ["software", "update", "firmware", "teslascope"],
    starlink: ["starlink", "satellite"],
    starship: ["starship", "super heavy", "flight lab"],
    roadster: ["roadster", "halo"],
    optimus: ["optimus", "humanoid"],
    production: ["production", "deliveries"],
    tesla: ["tesla"],
    spacex: ["spacex"],
    calendar: ["calendar", "launch"],
  };
  function expandToks(toks) {
    const out = new Set(toks);
    toks.forEach((t) => {
      (ALIAS[t] || []).forEach((a) => a.split(/\s+/).forEach((w) => { if (w.length > 1) out.add(w); }));
    });
    if (toks.includes("fsd") && toks.includes("europe")) out.add("rdw");
    if (toks.includes("tesla") && toks.includes("software")) ["update", "firmware", "teslascope"].forEach((w) => out.add(w));
    return [...out];
  }
  function recencyBoost(item) {
    if (item.kind !== "story" && item.kind !== "wire") return 0;
    const t = Date.parse(item.date || "");
    if (!Number.isFinite(t)) return 0;
    const days = (Date.now() - t) / 864e5;
    if (days < 3) return 18;
    if (days < 14) return 10;
    if (days < 45) return 4;
    return 0;
  }
  function score(item, q, toks) {
    const title = (item.title || "").toLowerCase();
    const summary = (item.summary || "").toLowerCase();
    const tag = (item.tag || item.topic || "").toLowerCase();
    const raw = q.toLowerCase().trim();
    if (!raw) return item.kind === "story" ? 10 : item.kind === "wire" ? 4 : 50;
    if (!toks.length) return 0;
    let s = 0;
    let hits = 0;
    if (title === raw) { s += 220; hits += 1; }
    if (title.startsWith(raw)) { s += 140; hits += 1; }
    if (title.includes(raw)) { s += 90; hits += 1; }
    const ct = compact(title), cq = compact(raw);
    if (cq.length >= 4 && ct.includes(cq)) { s += 50; hits += 1; }
    const expanded = expandToks(toks);
    for (const t of expanded) {
      let hit = false;
      if (title === t) { s += 70; hit = true; }
      else if (title.startsWith(t) || title.split(/\s+/).includes(t)) { s += 45; hit = true; }
      else if (title.includes(t)) { s += 28; hit = true; }
      if (tag === t || tag.includes(t)) { s += 22; hit = true; }
      if (summary.includes(t)) { s += 10; hit = true; }
      if (hit) hits += 1;
    }
    if (!hits) return 0;
    if (item.kind === "story") s += 8;
    if (item.kind === "page") s += 4;
    if (toks.includes("tesla") && toks.includes("software") && /updates\.html/.test(item.url || "")) s += 40;
    if (toks.includes("optimus") && /\/optimus\.html/.test(item.url || "")) s += 48;
    if (toks.includes("optimus") && /promise-tracker|tesla\.html/.test(item.url || "")) s += 16;
    if ((toks.includes("production") || toks.includes("deliveries")) && /production\.html/.test(item.url || "")) s += 40;
    if ((toks.includes("autonomy") || (toks.includes("robotaxi") && toks.includes("evidence"))) && /autonomy\.html/.test(item.url || "")) s += 36;
    if (toks.includes("calendar") && /calendar\.html/.test(item.url || "")) s += 30;
    s += recencyBoost(item);
    return s;
  }

  let catalog = null, loadErr = "";
  async function load() {
    if (catalog) return catalog;
    try {
      const [arts, pages] = await Promise.all([
        fetch("/data/articles.json").then((r) => { if (!r.ok) throw new Error("articles"); return r.json(); }),
        fetch("/data/pages.json").then((r) => { if (!r.ok) throw new Error("pages"); return r.json(); }),
      ]);
      const items = [];
      const storyPaths = new Set();
      for (const a of arts.articles || []) {
        const url = a.url || "";
        if (!url) continue;
        storyPaths.add(pathOnly(url));
        items.push({
          url,
          title: a.title || "",
          summary: a.summary || "",
          tag: a.tag || "",
          topic: a.topic || "",
          date: a.date || "",
          image: a.image || "",
          kind: "story",
        });
      }
      for (const p of pages.pages || []) {
        const url = p.url || "";
        if (!url) continue;
        if (!url.includes("#") && storyPaths.has(pathOnly(url))) continue;
        items.push({
          url,
          title: p.title || "",
          summary: p.summary || "",
          tag: p.tag || "",
          topic: p.topic || "",
          date: "",
          image: "",
          kind: "page",
        });
      }
      if (PAGE) {
        try {
          const news = await fetch("/news-data.json").then((r) => (r.ok ? r.json() : null));
          (news && news.items || []).forEach((n) => {
            if (!n || !n.url || !n.title) return;
            items.push({
              url: n.url,
              title: n.title,
              summary: n.snippet || n.source || "",
              tag: n.source || n.topic || "Wire",
              topic: n.topic || "",
              date: n.published || "",
              image: n.image || "",
              kind: "wire",
            });
          });
        } catch {
          /* wire is optional */
        }
      }
      catalog = items;
      return catalog;
    } catch (err) {
      loadErr = "Search index did not load.";
      catalog = [];
      return catalog;
    }
  }

  function activeKind() {
    const on = document.querySelector("[data-sd-kind].is-on");
    return (on && on.getAttribute("data-sd-kind")) || "all";
  }
  function queryItems(q) {
    const raw = String(q || "").trim();
    const toks = tokens(raw);
    const kind = PAGE ? activeKind() : "all";
    const all = (catalog || []).filter((i) => kind === "all" || i.kind === kind);
    if (!raw) {
      const stories = all.filter((i) => i.kind === "story").slice(0, LATEST);
      let pages = all.filter((i) => i.kind === "page");
      const wires = PAGE ? all.filter((i) => i.kind === "wire").slice(0, 8) : [];
      if (PAGE) pages = pages.sort((a, b) => a.title.localeCompare(b.title));
      else {
        const want = new Map(OVERLAY_PAGES.map((u, i) => [u, i]));
        pages = pages.filter((p) => want.has(p.url)).sort((a, b) => want.get(a.url) - want.get(b.url));
      }
      return { grouped: true, pages, stories, wires, n: pages.length + stories.length + wires.length };
    }
    const ranked = all
      .map((item) => ({ item, s: score(item, raw, toks) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || String(b.item.date).localeCompare(String(a.item.date)))
      .slice(0, LIMIT)
      .map((x) => x.item);
    return { grouped: false, items: ranked, n: ranked.length, toks };
  }

  function hitHtml(item, toks, i) {
    const img = item.image
      ? `<span class="sd-find-media"><img src="${esc(item.image)}" alt="" width="112" height="70" loading="lazy" onerror="this.parentNode.hidden=true" /></span>`
      : "";
    const when = fmtDate(item.date);
    const kind = item.kind === "story" ? "Story" : item.kind === "wire" ? "Headline" : "Page";
    return `<a class="sd-find-hit${item.image ? "" : " no-img"}" role="option" id="sd-find-opt-${i}" href="${esc(item.url)}" data-i="${i}">
      ${img}
      <span>
        <span class="sd-find-k"><span class="sd-find-tag">${esc(item.tag || kind)}</span><span>${esc(kind)}</span>${when ? `<span>${esc(when)}</span>` : ""}</span>
        <h3>${mark(item.title, toks)}</h3>
        ${item.summary ? `<p>${mark(item.summary, toks)}</p>` : ""}
      </span>
    </a>`;
  }

  function render(box, q) {
    const status = box.querySelector("[data-sd-status]");
    const hits = box.querySelector("[data-sd-hits]");
    if (!hits) return;
    if (loadErr) {
      if (status) status.textContent = loadErr;
      hits.innerHTML = `<p class="sd-find-empty">${esc(loadErr)} Browse <a href="/news.html">News</a> or <a href="/dispatch.html">Dispatch</a>.</p>`;
      return 0;
    }
    if (!catalog) {
      if (status) status.textContent = "Loading…";
      hits.innerHTML = `<p class="sd-find-empty">Loading the index…</p>`;
      return 0;
    }
    const res = queryItems(q);
    const toks = res.toks || [];
    if (status) {
      status.textContent = q.trim()
        ? (res.n ? res.n + (res.n === 1 ? " match" : " matches") : "No matches")
        : "Pages and latest stories";
    }
    if (!res.n) {
      hits.innerHTML = `<p class="sd-find-empty">No matches on this site for “${esc(q.trim())}”. Try <a href="/search.html?q=Roadster">Roadster</a>, <a href="/search.html?q=Starship">Starship</a>, <a href="/search.html?q=FSD+Europe">FSD Europe</a> or <a href="/search.html?q=Starlink">Starlink</a>.</p>`;
      return 0;
    }
    if (res.grouped) {
      const storyBlock = res.stories.length
        ? `<p class="sd-find-sec">Latest stories</p>` + res.stories.map((item, i) => hitHtml(item, toks, i)).join("")
        : "";
      const pageBlock = res.pages.length
        ? `<p class="sd-find-sec">Pages</p>` + res.pages.map((item, i) => hitHtml(item, toks, res.stories.length + i)).join("")
        : "";
      const wireBlock = (res.wires || []).length
        ? `<p class="sd-find-sec">Headlines</p>` + res.wires.map((item, i) => hitHtml(item, toks, res.stories.length + res.pages.length + i)).join("")
        : "";
      hits.innerHTML = storyBlock + pageBlock + wireBlock;
    } else {
      hits.innerHTML = res.items.map((item, i) => hitHtml(item, toks, i)).join("");
    }
    return res.n;
  }

  function bindList(box, getQ) {
    let active = -1;
    const hits = () => [...box.querySelectorAll(".sd-find-hit")];
    const setOn = (i) => {
      const list = hits();
      list.forEach((el) => el.classList.remove("is-on"));
      if (!list.length) { active = -1; return; }
      active = (i + list.length) % list.length;
      list[active].classList.add("is-on");
      list[active].scrollIntoView({ block: "nearest" });
    };
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setOn(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setOn(active - 1); }
      else if (e.key === "Enter") {
        const list = hits();
        const go = (active >= 0 && list[active]) || list[0];
        if (go && document.activeElement && document.activeElement.matches("input,textarea")) {
          e.preventDefault();
          if (window.sdTrack) window.sdTrack("search_go");
          location.href = go.href;
        }
      }
    });
    box.addEventListener("mousemove", (e) => {
      const a = e.target.closest(".sd-find-hit");
      if (!a) return;
      hits().forEach((el) => el.classList.remove("is-on"));
      a.classList.add("is-on");
      active = Number(a.dataset.i);
    });
    return { reset: () => { active = -1; } };
  }

  /* —— overlay —— */
  let root, overlayInput, overlayNav, lastFocus = null;
  function ensureOverlay() {
    if (root) return;
    root = document.createElement("div");
    root.className = "sd-find-root";
    root.hidden = true;
    root.innerHTML = `<div class="sd-find-box" role="dialog" aria-modal="true" aria-labelledby="sd-find-title">
      <h2 id="sd-find-title" class="visually-hidden">Search Supercharged Daily</h2>
      <div class="sd-find-bar">
        ${MAG}
        <input class="sd-find-q" id="sd-find-q" type="search" placeholder="Search stories, trackers and pages" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="sd-find-hits" />
        <button class="sd-find-x" type="button" aria-label="Close search">✕</button>
      </div>
      <p class="sd-find-status" data-sd-status></p>
      <div class="sd-find-hits" id="sd-find-hits" data-sd-hits role="listbox"></div>
      <p class="sd-find-hint">↑↓ to move · Enter to open · Esc to close</p>
    </div>`;
    document.body.appendChild(root);
    overlayInput = root.querySelector("#sd-find-q");
    const box = root.querySelector(".sd-find-box");
    overlayNav = bindList(box, () => overlayInput.value);
    let t = 0;
    overlayInput.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { render(box, overlayInput.value); overlayNav.reset(); }, 60);
    });
    root.querySelector(".sd-find-x").addEventListener("click", close);
    root.addEventListener("click", (e) => { if (e.target === root) close(); });
  }

  async function open(seed) {
    if (PAGE) {
      const input = document.getElementById("sd-search-q");
      if (input) { if (seed != null) input.value = seed; input.focus(); input.select(); paintPage(); }
      return;
    }
    ensureOverlay();
    lastFocus = document.activeElement;
    await load();
    root.hidden = false;
    document.body.classList.add("sd-find-lock");
    overlayInput.value = seed != null ? seed : "";
    render(root.querySelector(".sd-find-box"), overlayInput.value);
    overlayNav.reset();
    overlayInput.focus();
    overlayInput.select();
    if (window.sdTrack) window.sdTrack("search_open");
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove("sd-find-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function isOpen() { return root && !root.hidden; }

  /* —— /search.html —— */
  function paintPage(opts) {
    const box = document.querySelector("[data-sd-page]");
    if (!box) return;
    render(box, (document.getElementById("sd-search-q") || {}).value || "");
    if (opts && opts.skipUrl) return;
    const q = ((document.getElementById("sd-search-q") || {}).value || "").trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    const next = url.pathname + url.search + url.hash;
    if (next === location.pathname + location.search + location.hash) return;
    if (opts && opts.push) history.pushState(null, "", next);
    else history.replaceState(null, "", next);
  }

  async function bootPage() {
    const form = document.querySelector(".sd-search-form");
    const input = document.getElementById("sd-search-q");
    const box = document.querySelector("[data-sd-page]");
    if (!form || !input || !box) return;
    const start = new URLSearchParams(location.search).get("q") || "";
    input.value = start;
    bindList(box, () => input.value);
    await load();
    paintPage();
    let t = 0;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(paintPage, 60);
    });
    form.addEventListener("submit", (e) => { e.preventDefault(); paintPage({ push: true }); });
    const kinds = document.querySelector("[data-sd-kinds]");
    if (kinds) {
      const startKind = new URLSearchParams(location.search).get("kind") || "all";
      kinds.querySelectorAll("[data-sd-kind]").forEach((b) => {
        b.classList.toggle("is-on", b.getAttribute("data-sd-kind") === startKind);
      });
      kinds.addEventListener("click", (e) => {
        const b = e.target.closest("[data-sd-kind]");
        if (!b) return;
        kinds.querySelectorAll("[data-sd-kind]").forEach((x) => x.classList.toggle("is-on", x === b));
        const url = new URL(location.href);
        const k = b.getAttribute("data-sd-kind") || "all";
        if (k === "all") url.searchParams.delete("kind");
        else url.searchParams.set("kind", k);
        history.pushState(null, "", url.pathname + url.search + url.hash);
        paintPage({ skipUrl: true });
      });
    }
    window.addEventListener("popstate", () => {
      const p = new URLSearchParams(location.search);
      input.value = p.get("q") || "";
      const startKind = p.get("kind") || "all";
      if (kinds) {
        kinds.querySelectorAll("[data-sd-kind]").forEach((b) => {
          b.classList.toggle("is-on", b.getAttribute("data-sd-kind") === startKind);
        });
      }
      paintPage({ skipUrl: true });
    });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.pn-search");
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    if (window.__pn && window.__pn.sheetOpen) window.__pn.sheetOpen(false);
    open();
  });

  document.addEventListener("keydown", (e) => {
    if (e.isComposing) return;
    if (e.key === "Escape") {
      if (isOpen()) { e.preventDefault(); close(); }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (isOpen()) overlayInput && overlayInput.focus();
      else open();
    }
  });

  window.__sdFind = { open, close };
  if (PAGE) bootPage();
})();
