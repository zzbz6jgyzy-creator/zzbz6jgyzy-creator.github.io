/* Supercharged Daily navigation studio. Native links/disclosures are the baseline. */
(() => {
  "use strict";
  const nav = document.querySelector(".pn[data-nav-studio]");
  if (!nav || nav.dataset.nsReady) return;
  nav.dataset.nsReady = "true";
  const sheet = document.querySelector(".pn-sheet[data-nav-studio]");
  const menu = nav.querySelector(".pn-menu");
  const overlay = document.querySelector(".pn-overlay[data-nav-studio]");
  const desktop = [...nav.querySelectorAll(".ns-dropdown")];
  const mobileSections = [...sheet.querySelectorAll(".ns-mobile-section")];
  const narrow = () => matchMedia("(max-width:1079px)").matches;
  const modified = e => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1;
  const focusable = root => [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),summary,[tabindex="0"]')]
    .filter(el => !el.closest("[inert],[hidden]") && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
  const closeAll = except => desktop.forEach(d => { if (d !== except) d.open = false; });
  let lastFocus, inertNodes = [], openState = false;
  function isolate() {
    let node = sheet;
    while (node.parentElement && node.parentElement !== document.documentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && !["SCRIPT","STYLE","LINK"].includes(sibling.tagName)) {
          inertNodes.push([sibling, sibling.inert]); sibling.inert = true;
        }
      }
      node = node.parentElement;
    }
  }
  function release() { inertNodes.forEach(([el, before]) => { el.inert = before; }); inertNodes = []; }
  function sheetOpen(open, restore = true) {
    if (open === openState) return;
    openState = open;
    if (open) { lastFocus = nav.contains(document.activeElement) ? document.activeElement : menu; closeAll(); sheet.inert = false; }
    sheet.classList.toggle("open", open);
    overlay?.classList.toggle("open", open);
    sheet.setAttribute("aria-hidden", String(!open));
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    menu.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("pn-lock", open);
    if (open) {
      sheet.scrollTop = 0; isolate();
      sheet.querySelector(".pn-close").focus({ preventScroll:true });
      window.__sdFind?.mount?.(sheet.querySelector(".ns-mobile-search"));
    } else {
      release(); sheet.inert = true;
      if (location.hash === "#pn-sheet") history.replaceState(null, "", location.pathname + location.search);
      if (restore) (lastFocus?.isConnected && lastFocus.getClientRects().length ? lastFocus : menu).focus({ preventScroll:true });
    }
  }
  sheet.dataset.nsReady = "true";
  sheet.inert = true;
  sheet.setAttribute("aria-hidden", "true");
  menu.setAttribute("role", "button");
  menu.setAttribute("aria-expanded", "false");
  menu.addEventListener("click", e => { e.preventDefault(); sheetOpen(true); });
  menu.addEventListener("keydown", e => { if (e.key === " ") { e.preventDefault(); sheetOpen(true); } });
  sheet.querySelector(".pn-close").addEventListener("click", e => { e.preventDefault(); sheetOpen(false); });
  overlay?.addEventListener("click", () => sheetOpen(false));
  sheet.addEventListener("click", e => {
    const link = e.target.closest("a[href]");
    if (link && !link.classList.contains("pn-close") && !modified(e)) sheetOpen(false, false);
  });
  sheet.addEventListener("keydown", e => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); sheetOpen(false); }
    if (e.key === "Tab") {
      const controls = focusable(sheet), first = controls[0], last = controls.at(-1);
      if (e.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
    }
  });
  const canonical = new Map();
  function mark(root) {
    for (const a of root.querySelectorAll("a[href]")) {
      const u = new URL(a.href, location.href);
      const path = u.pathname.replace(/index\.html$/, "") || "/";
      const here = location.pathname.replace(/index\.html$/, "") || "/";
      if (u.origin !== location.origin || path !== here) continue;
      if (u.hash && u.hash !== "#top" && u.hash !== location.hash) continue;
      if (u.search && u.search !== location.search) continue;
      a.setAttribute("aria-current", "page");
      const d = a.closest(".ns-dropdown, .ns-mobile-section");
      if (d && path !== "/daily.html" && !canonical.has(root)) { d.querySelector("summary").setAttribute("aria-current", "true"); canonical.set(root, d); }
    }
  }
  mark(nav); mark(sheet);
  desktop.forEach(d => {
    const summary = d.querySelector("summary");
    let enter, leave;
    d.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", String(d.open));
      if (d.open) closeAll(d);
    });
    d.addEventListener("pointerenter", () => {
      if (!matchMedia("(hover:hover)").matches) return;
      clearTimeout(leave); enter = setTimeout(() => { closeAll(d); d.open = true; }, 300);
    });
    d.addEventListener("pointerleave", () => {
      clearTimeout(enter); leave = setTimeout(() => { if (!d.contains(document.activeElement)) d.open = false; }, 220);
    });
    summary.addEventListener("click", () => { clearTimeout(enter); clearTimeout(leave); });
    d.addEventListener("focusout", e => { if (!d.contains(e.relatedTarget)) d.open = false; });
    d.addEventListener("keydown", e => {
      const links = [...d.querySelectorAll(".ns-panel a[href]")].filter(a => a.getClientRects().length);
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); d.open = false; summary.focus(); }
      else if (["ArrowDown","ArrowUp"].includes(e.key)) {
        e.preventDefault(); closeAll(d); d.open = true;
        const all = [...d.querySelectorAll(".ns-panel a[href]")];
        const i = all.indexOf(document.activeElement);
        const n = i < 0 ? (e.key === "ArrowDown" ? 0 : all.length - 1) : (i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length;
        all[n]?.focus();
      }
    });
    d.addEventListener("click", e => { if (e.target.closest("a[href]") && !modified(e)) closeAll(); });
  });
  mobileSections.forEach(d => d.addEventListener("toggle", () => {
    if (d.open) mobileSections.forEach(other => { if (other !== d) other.open = false; });
  }));
  document.addEventListener("click", e => { if (!nav.contains(e.target)) closeAll(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !openState) closeAll(); });
  window.addEventListener("resize", () => { closeAll(); if (!narrow()) sheetOpen(false); });
  function arrangeUtilities() {
    const theme = nav.querySelector(".pn-theme");
    const utilities = nav.querySelector(".pn-utilities");
    if (theme && theme.parentElement !== utilities) utilities.prepend(theme);
    const mobileTheme = sheet.querySelector(".pn-theme-sheet"), mobileUtilities = sheet.querySelector(".ns-mobile-utilities");
    if (mobileTheme && mobileTheme.parentElement !== mobileUtilities) mobileUtilities.append(mobileTheme);
    const account = sheet.querySelector("[data-ns-account]");
    if (!account.hasAttribute("data-member-nav")) account.href = "/members.html?return=" + encodeURIComponent(location.pathname + location.search + location.hash);
  }
  const hint = nav.querySelector("kbd");
  if (hint) hint.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
  arrangeUtilities();
  new MutationObserver(arrangeUtilities).observe(nav, { childList:true, subtree:true });
  new MutationObserver(arrangeUtilities).observe(sheet, { childList:true, subtree:true });
  window.__pn = { setExpanded() {}, sheetOpen };
  if (location.hash === "#pn-sheet") sheetOpen(true);
  window.__sdFind?.mount?.(sheet.querySelector(".ns-mobile-search"));
  if (window.sdWireNewsletterCTA) window.sdWireNewsletterCTA();
})();
(() => {
  for (const [key,file] of [["__sdLiveNow","live-now.js?v=202610152135"],["__sdFind","search.js?v=20261028-studio"],["__sdTheme","theme.js?v=202610190630"]]) {
    const base = file.split("?")[0];
    if (window[key] || document.querySelector('script[src*="' + base + '"]')) continue;
    const s = document.createElement("script"); s.src = "/" + file; s.defer = true; document.head.append(s);
  }
})();

