(() => {
  const nav = document.querySelector(".pn");
  if (!nav || nav.dataset.pnReady) return;
  nav.dataset.pnReady = "1";
  const items = nav.querySelector(".pn-items");
  const sheet = document.querySelector(".pn-sheet");
  const ov = document.querySelector(".pn-overlay");
  const mb = nav.querySelector(".pn-menu");
  const mobile = () => window.matchMedia("(max-width: 899px)").matches;

  // Utilities are generated as real links. Normalize older cached markup once, without duplicates.
  let utilities = nav.querySelector(".pn-utilities");
  if (!utilities) {
    utilities = document.createElement("div");
    utilities.className = "pn-utilities";
    nav.insertBefore(utilities, mb || null);
  }
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const dailyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';
  const ensureLink = (root, selector, cls, href, label, icon = "") => {
    const matches = [...root.querySelectorAll(selector)];
    const link = matches.shift() || document.createElement("a");
    matches.forEach((extra) => extra.remove());
    link.className = cls;
    link.href = href;
    link.innerHTML = icon + "<span>" + label + "</span>";
    return link;
  };
  utilities.append(
    ensureLink(nav, ".pn-search", "pn-link pn-search", "/search.html", "Search", searchIcon),
    ensureLink(nav, '.pn-daily, a[href="/daily.html"]', "pn-link pn-daily", "/daily.html", "Your Daily", dailyIcon),
    ensureLink(nav, ".pn-sub", "pn-sub pn-cta", "/#newsletter", "Free briefing")
  );
  if (sheet) {
    const home = [...sheet.querySelectorAll('a[href="/"]')].find((a) => a.textContent.trim() === "Home");
    const search = ensureLink(sheet, ".pn-search-sheet, .pn-search", "pn-search pn-search-sheet", "/search.html", "Search", searchIcon);
    const daily = ensureLink(sheet, '.pn-daily-sheet, a[href="/daily.html"]', "pn-daily pn-daily-sheet", "/daily.html", "Your Daily", dailyIcon);
    const subscribe = ensureLink(sheet, ".pn-sub-sheet", "pn-sub pn-sub-sheet", "/#newsletter", "Free briefing");
    (home || sheet.querySelector(".pn-sheet-head"))?.after(search, daily);
    if (!subscribe.parentNode) sheet.append(subscribe);
  }
  if (mb && !mb.querySelector("span")) {
    const label = document.createElement("span");
    label.textContent = "Menu";
    mb.append(label);
  }
  // Retain the public hook used by older pages, while every state now stays expanded.
  const setExpanded = () => {
    nav.classList.remove("collapsed");
    nav.removeAttribute("data-start-collapsed");
    nav.style.removeProperty("--pn-w");
    nav.setAttribute("aria-label", "Primary");
  };
  setExpanded();
  const closeNests = (root) => {
    (root || nav).querySelectorAll(".pn-nest.open").forEach((n) => {
      if (n.querySelector("a[aria-current=page]")) return;
      n.classList.remove("open");
      const b = n.querySelector(".pn-nest-t");
      const p = n.querySelector(".pn-nest-panel");
      if (b) b.setAttribute("aria-expanded", "false");
      if (p) p.hidden = true;
    });
  };
  const setNest = (nest, open) => {
    const panel = nest.closest(".pn-panel");
    // Close only the groups below this one. Closing one above shifts this group (and the pointer on it) up, out from under
    // the cursor, which used to collapse the whole menu before "Company" could be clicked.
    if (open && panel) { let below = false; panel.querySelectorAll(".pn-nest").forEach((n) => { if (n === nest) below = true; else if (below && n.classList.contains("open")) setNest(n, false); }); }
    nest.classList.toggle("open", open);
    const b = nest.querySelector(".pn-nest-t");
    const p = nest.querySelector(".pn-nest-panel");
    if (b) b.setAttribute("aria-expanded", String(open));
    if (p) p.hidden = !open;
  };
  const closeAll = () => nav.querySelectorAll(".pn-dd.open").forEach(d => { d.classList.remove("open"); d.querySelector("button").setAttribute("aria-expanded", "false"); closeNests(d); });
  const here = location.pathname.replace(/index\.html$/, "") || "/";
  const hash = location.hash || "";
  document.querySelectorAll(".pn a[href], .pn-sheet a[href]").forEach(a => {
    const raw = a.getAttribute("href") || "";
    const path = (raw.split("#")[0] || "/").replace(/index\.html$/, "") || "/";
    const aHash = raw.includes("#") ? raw.slice(raw.indexOf("#")) : "";
    const pathMatch = path === here;
    const hashMatch = !aHash || aHash === hash || (aHash === "#top" && !hash);
    if (pathMatch && hashMatch) a.setAttribute("aria-current", "page");
  });
  document.querySelectorAll(".pn-dd").forEach((dd) => {
    if (dd.querySelector("a[aria-current=page]")) {
      const btn = dd.querySelector("button");
      if (btn) btn.setAttribute("aria-current", "true");
    }
  });
  nav.querySelectorAll(".pn-dd").forEach(dd => {
    const btn = dd.querySelector("button");
    const open = v => { if (v) closeAll(); dd.classList.toggle("open", v); btn.setAttribute("aria-expanded", String(v)); if (!v) closeNests(dd); };
    let t, hov = 0;
    btn.addEventListener("click", () => { if (matchMedia("(hover:hover)").matches && Date.now() - hov < 600) { open(true); return; } open(!dd.classList.contains("open")); });
    dd.addEventListener("mouseenter", () => { if (matchMedia("(hover:hover)").matches) { clearTimeout(t); if (!dd.classList.contains("open")) hov = Date.now(); open(true); } });
    dd.addEventListener("mouseleave", () => { t = setTimeout(() => open(false), 160); });
    dd.addEventListener("keydown", e => {
      const links = [...dd.querySelectorAll(".pn-panel a, .pn-nest-t")].filter((el) => !el.closest(".pn-nest-panel")?.hidden);
      if (e.key === "Escape") { open(false); btn.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); if (!dd.classList.contains("open")) open(true); const i = links.indexOf(document.activeElement); (links[i + 1] || links[0]).focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); const i = links.indexOf(document.activeElement); (links[i - 1] || links[links.length - 1]).focus(); }
      else if ((e.key === "Enter" || e.key === " ") && document.activeElement.classList.contains("pn-nest-t")) {
        e.preventDefault();
        const nest = document.activeElement.closest(".pn-nest");
        if (nest) setNest(nest, !nest.classList.contains("open"));
      }
    });
    dd.addEventListener("focusout", e => { if (!dd.contains(e.relatedTarget)) open(false); });
  });
  nav.querySelectorAll(".pn-nest").forEach((nest) => {
    const nestBtn = nest.querySelector(".pn-nest-t");
    if (!nestBtn) return;
    let nestTimer;
    nestBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setNest(nest, !nest.classList.contains("open"));
    });
    // Hover opens a group only after the pointer rests on it, so moving past it to reach a lower item does not expand it and
    // push that item away. Leaving never collapses it (that shrank the panel under the pointer); the dropdown closing does.
    nest.addEventListener("mouseenter", () => {
      if (matchMedia("(hover:hover)").matches) { clearTimeout(nestTimer); nestTimer = setTimeout(() => setNest(nest, true), 220); }
    });
    nest.addEventListener("mouseleave", () => { clearTimeout(nestTimer); });
    if (nest.querySelector("a[aria-current=page]")) {
      setNest(nest, true);
      nestBtn.setAttribute("aria-current", "true");
    }
  });
  document.addEventListener("click", e => { if (!nav.contains(e.target)) closeAll(); });

  // Phone sheet: fold each section under its red heading so the major sections fit on one screen.
  // All sections start folded. Without JS every link stays visible.
  (() => {
    const sh = document.querySelector(".pn-sheet");
    if (!sh || sh.dataset.grouped) return;
    sh.dataset.grouped = "1";
    const stop = (n) => !n || n.tagName === "H3" || n.matches(".pn-cta, .pn-sub-sheet, .pn-search-sheet, .pn-daily-sheet, .pn-theme-sheet");
    const onPage = (el) => {
      if (el.matches?.("[aria-current]")) return true;
      return [...(el.querySelectorAll ? el.querySelectorAll("a") : []), el.tagName === "A" ? el : null].filter(Boolean).some((l) => {
        try { const u = new URL(l.href, location.href); return u.pathname === location.pathname && u.pathname !== "/"; } catch { return false; }
      });
    };
    [...sh.querySelectorAll("h3")].forEach((h, i) => {
      const kids = [];
      for (let n = h.nextElementSibling; n && !stop(n); n = n.nextElementSibling) kids.push(n);
      if (!kids.length) return;
      const id = "pn-grp-" + i;
      const box = document.createElement("div");
      box.className = "pn-grp"; box.id = id;
      h.after(box); kids.forEach((l) => box.appendChild(l));
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "pn-grp-t"; btn.setAttribute("aria-controls", id);
      btn.innerHTML = h.innerHTML + '<span class="pn-grp-c" aria-hidden="true"></span>';
      h.textContent = ""; h.appendChild(btn);
      const set = (open) => { box.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
      set(onPage(box));
      btn.addEventListener("click", () => set(box.hidden));
      [...box.querySelectorAll("h4")].forEach((h4) => {
        const links = [];
        for (let n = h4.nextElementSibling; n && n.tagName === "A"; n = n.nextElementSibling) links.push(n);
        if (!links.length) return;
        const slab = document.createElement("div");
        slab.className = "pn-slab";
        h4.before(slab);
        slab.appendChild(h4);
        links.forEach((l) => slab.appendChild(l));
      });
    });
  })();
  const visibleFocusable = (root) => [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.closest("[hidden], [inert]") && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
  let previousFocus;
  const sheetOpen = (open, restoreFocus = true) => {
    if (!sheet || !ov || !mb || open === sheet.classList.contains("open")) return;
    if (open) { previousFocus = document.activeElement; closeAll(); }
    sheet.classList.toggle("open", open);
    ov.classList.toggle("open", open);
    document.body.classList.toggle("pn-lock", open);
    sheet.setAttribute("aria-hidden", String(!open));
    sheet.inert = !open;
    mb.setAttribute("aria-expanded", String(open));
    if (open) sheet.querySelector(".pn-close")?.focus({ preventScroll: true });
    else if (restoreFocus) {
      const target = previousFocus?.isConnected && previousFocus.getClientRects().length ? previousFocus : (mobile() ? mb : nav.querySelector(".pn-logo"));
      target?.focus({ preventScroll: true });
    }
  };
  mb?.addEventListener("click", (e) => { e.preventDefault(); sheetOpen(true); });
  ov?.addEventListener("click", () => sheetOpen(false));
  sheet?.querySelector(".pn-close")?.addEventListener("click", () => sheetOpen(false));
  sheet?.addEventListener("click", (e) => {
    // Let search and newsletter handlers move focus to their own destination.
    const link = e.target.closest("a[href]");
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) sheetOpen(false, false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAll();
      if (sheet?.classList.contains("open")) { e.preventDefault(); sheetOpen(false); }
    }
    if (e.key === "Tab" && sheet?.classList.contains("open")) {
      const controls = visibleFocusable(sheet);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) return;
      if (e.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    }
  });
  window.addEventListener("resize", () => {
    closeAll();
    if (!mobile()) sheetOpen(false);
  });
  window.__pn = { setExpanded, sheetOpen };
  if (window.sdWireNewsletterCTA) window.sdWireNewsletterCTA();
  else if (!window.__sdNewsletterCta) {
    const nl = document.createElement("script"); nl.src = "/newsletter-cta.js?v=202610271100"; document.body.append(nl);
  }
})();
// Site-wide LIVE NOW alert (reads /live-data.json; shows nothing unless a stream is live)
(() => { if (window.__sdLiveNow || document.querySelector('script[src*="live-now.js"]')) return; const s = document.createElement("script"); s.src = "/live-now.js?v=202610152135"; s.defer = true; document.head.appendChild(s); })();
(() => { if (window.__sdFind || document.querySelector('script[src*="search.js"]')) return; const s = document.createElement("script"); s.src = "/search.js?v=202610192400"; s.defer = true; document.head.appendChild(s); })();
(() => { if (window.__sdTheme || document.querySelector('script[src*="theme.js"]')) return; const s = document.createElement("script"); s.src = "/theme.js?v=202610190630"; s.defer = true; document.head.appendChild(s); })();
