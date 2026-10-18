/* Supercharged Daily site search. Index: /data/articles.json + /data/pages.json.
   Overlay (⌘K / nav Search) on pages that load this file; full page on /search.html. */
(() => {
  if (window.__sdFind) return;
  const V = "202610182231";
  const PAGE = /\/search\.html$/.test(location.pathname);
  const LIMIT = PAGE ? 60 : 24;
  const LATEST = PAGE ? 12 : 8;
  const OVERLAY_PAGES = ["/", "/news.html", "/dispatch.html", "/tesla.html", "/roadster.html", "/spacex.html", "/starship.html", "/starlink.html", "/fsd-europe.html", "/updates.html", "/cybercab.html", "/reviews/index.html"];
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
  const tokens = (q) => String(q || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(Boolean);
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

  function score(item, q, toks) {
    const title = (item.title || "").toLowerCase();
    const summary = (item.summary || "").toLowerCase();
    const tag = (item.tag || item.topic || "").toLowerCase();
    const raw = q.toLowerCase().trim();
    if (!raw) return item.kind === "story" ? 10 : 50;
    let s = 0;
    if (title === raw) s += 220;
    if (title.startsWith(raw)) s += 140;
    if (title.includes(raw)) s += 90;
    const ct = compact(title), cq = compact(raw);
    if (cq.length >= 4 && ct.includes(cq)) s += 50;
    for (const t of toks) {
      if (title === t) s += 70;
      else if (title.startsWith(t) || title.split(/\s+/).includes(t)) s += 45;
      else if (title.includes(t)) s += 28;
      if (tag === t || tag.includes(t)) s += 22;
      if (summary.includes(t)) s += 10;
    }
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
      catalog = items;
      return catalog;
    } catch (err) {
      loadErr = "Search index did not load.";
      catalog = [];
      return catalog;
    }
  }

  function queryItems(q) {
    const raw = String(q || "").trim();
    const toks = tokens(raw);
    const all = catalog || [];
    if (!raw) {
      const stories = all.filter((i) => i.kind === "story").slice(0, LATEST);
      let pages = all.filter((i) => i.kind !== "story");
      if (PAGE) pages = pages.sort((a, b) => a.title.localeCompare(b.title));
      else {
        const want = new Map(OVERLAY_PAGES.map((u, i) => [u, i]));
        pages = pages.filter((p) => want.has(p.url)).sort((a, b) => want.get(a.url) - want.get(b.url));
      }
      return { grouped: true, pages, stories, n: pages.length + stories.length };
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
    const kind = item.kind === "story" ? "Story" : "Page";
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
    const res = queryItems(q);
    const toks = res.toks || [];
    if (status) {
      status.textContent = q.trim()
        ? (res.n ? res.n + (res.n === 1 ? " match" : " matches") : "No matches")
        : "Pages and latest stories";
    }
    if (!res.n) {
      hits.innerHTML = `<p class="sd-find-empty">No matches on this site for “${esc(q.trim())}”.</p>`;
      return 0;
    }
    if (res.grouped) {
      const storyBlock = res.stories.length
        ? `<p class="sd-find-sec">Latest stories</p>` + res.stories.map((item, i) => hitHtml(item, toks, i)).join("")
        : "";
      const pageBlock = res.pages.length
        ? `<p class="sd-find-sec">Pages</p>` + res.pages.map((item, i) => hitHtml(item, toks, res.stories.length + i)).join("")
        : "";
      hits.innerHTML = storyBlock + pageBlock;
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
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove("sd-find-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function isOpen() { return root && !root.hidden; }

  /* —— /search.html —— */
  function paintPage() {
    const box = document.querySelector("[data-sd-page]");
    if (!box) return;
    render(box, (document.getElementById("sd-search-q") || {}).value || "");
    const q = ((document.getElementById("sd-search-q") || {}).value || "").trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
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
    form.addEventListener("submit", (e) => { e.preventDefault(); paintPage(); });
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
