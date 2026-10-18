(() => {
  const nav = document.querySelector(".pn");
  if (!nav) return;
  const items = nav.querySelector(".pn-items");
  // Subscribe entry (desktop pill + phone sheet); newsletter-cta.js points it at the page's signup block
  if (!nav.querySelector(".pn-sub")) {
    const mk = (cls) => { const a = document.createElement("a"); a.className = cls; a.href = "/#newsletter"; a.textContent = "Subscribe"; return a; };
    const cta = items.querySelector(".pn-cta"); items.insertBefore(mk("pn-link pn-sub"), cta);
    const sh = document.querySelector(".pn-sheet"), shCta = sh && sh.querySelector(".pn-cta");
    if (shCta) sh.insertBefore(mk("pn-sub pn-sub-sheet"), shCta);
  }
  // Search — same inject pattern as Subscribe; search.js opens the overlay (or /search.html)
  if (!nav.querySelector(".pn-search")) {
    const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    const mk = (cls) => { const a = document.createElement("a"); a.className = cls; a.href = "/search.html"; a.innerHTML = icon + "<span>Search</span>"; return a; };
    const sub = items.querySelector(".pn-sub");
    const cta = items.querySelector(".pn-cta");
    items.insertBefore(mk("pn-link pn-search"), sub || cta);
    const sh = document.querySelector(".pn-sheet");
    const shHome = sh && [...sh.querySelectorAll('a[href="/"]')].find((a) => a.textContent.trim() === "Home");
    const shSub = sh && sh.querySelector(".pn-sub-sheet");
    const shCta = sh && sh.querySelector(".pn-cta");
    if (shHome) shHome.after(mk("pn-search pn-search-sheet"));
    else if (shSub || shCta) (shSub || shCta).before(mk("pn-search pn-search-sheet"));
  }
  const kids = [...items.children];
  kids.forEach((el, i) => { el.style.setProperty("--i", i); el.style.setProperty("--n", kids.length); });
  let sheet, ov, mb, sheetOpen;
  const app = nav.hasAttribute("data-start-collapsed");
  let expanded = true, last = window.scrollY, collapseAt = 0;
  const setW = () => { if (!expanded) return; nav.style.setProperty("--pn-w", "auto"); const w = nav.scrollWidth; nav.style.setProperty("--pn-w", w + "px"); };
  const closeAll = () => nav.querySelectorAll(".pn-dd.open").forEach(d => { d.classList.remove("open"); d.querySelector("button").setAttribute("aria-expanded", "false"); });
  const setExpanded = v => {
    expanded = v; nav.classList.toggle("collapsed", !v); nav.setAttribute("aria-label", v ? "Primary" : "Open navigation");
    if (v) setW(); else closeAll();
  };
  requestAnimationFrame(setW); window.addEventListener("resize", setW);
  document.fonts && document.fonts.ready.then(setW);
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
  if (app) { setExpanded(false); document.addEventListener("click", e => { if (expanded && !nav.contains(e.target)) setExpanded(false); }); }
  const mobile = () => window.matchMedia("(max-width: 899px)").matches;
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    if (app) return;
    const y = Math.max(0, window.scrollY);
    if (mobile()) {
      // phones: circle while scrolled, full pill only near the top (ignores rubber-band / momentum bounces)
      if (expanded && y > 150) setExpanded(false);
      else if (!expanded && y < 150) setExpanded(true);
    } else {
      if (expanded && y > last && y > 150) { setExpanded(false); collapseAt = y; }
      else if (!expanded && (y < 150 || (y < last && collapseAt - y > 80))) setExpanded(true);
    }
    last = y;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(onScroll));
  let lock = 0;
  nav.addEventListener("click", e => {
    if (expanded) return;
    e.preventDefault(); e.stopPropagation();
    const now = Date.now(); if (now - lock < 450) return; lock = now;
    if (mobile()) sheetOpen(true); else setExpanded(true);
  }, true);
  nav.addEventListener("keydown", e => { if (!expanded && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setExpanded(true); } });

  nav.querySelectorAll(".pn-dd").forEach(dd => {
    const btn = dd.querySelector("button");
    const open = v => { if (v) closeAll(); dd.classList.toggle("open", v); btn.setAttribute("aria-expanded", String(v)); };
    let t, hov = 0;
    btn.addEventListener("click", () => { if (matchMedia("(hover:hover)").matches && Date.now() - hov < 600) { open(true); return; } open(!dd.classList.contains("open")); });
    dd.addEventListener("mouseenter", () => { if (matchMedia("(hover:hover)").matches) { clearTimeout(t); if (!dd.classList.contains("open")) hov = Date.now(); open(true); } });
    dd.addEventListener("mouseleave", () => { t = setTimeout(() => open(false), 160); });
    dd.addEventListener("keydown", e => {
      const links = [...dd.querySelectorAll(".pn-panel a")];
      if (e.key === "Escape") { open(false); btn.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); if (!dd.classList.contains("open")) open(true); const i = links.indexOf(document.activeElement); (links[i + 1] || links[0]).focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); const i = links.indexOf(document.activeElement); (links[i - 1] || links[links.length - 1]).focus(); }
    });
    dd.addEventListener("focusout", e => { if (!dd.contains(e.relatedTarget)) open(false); });
  });
  document.addEventListener("click", e => { if (!nav.contains(e.target)) closeAll(); });

  // Phone sheet: fold each section under its red heading so the major sections fit on one screen.
  // The section holding the current page starts open. Without JS every link stays visible.
  (() => {
    const sh = document.querySelector(".pn-sheet");
    if (!sh || sh.dataset.grouped) return;
    sh.dataset.grouped = "1";
    [...sh.querySelectorAll("h3")].forEach((h, i) => {
      const links = [];
      for (let n = h.nextElementSibling; n && n.tagName === "A" && !n.classList.contains("pn-cta") && !n.classList.contains("pn-sub-sheet") && !n.classList.contains("pn-search-sheet"); n = n.nextElementSibling) links.push(n);
      if (!links.length) return;
      const id = "pn-grp-" + i;
      const box = document.createElement("div");
      box.className = "pn-grp"; box.id = id;
      h.after(box); links.forEach((l) => box.appendChild(l));
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "pn-grp-t"; btn.setAttribute("aria-controls", id);
      btn.innerHTML = h.innerHTML + '<span class="pn-grp-c" aria-hidden="true"></span>';
      h.textContent = ""; h.appendChild(btn);
      const set = (open) => { box.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
      set(!!box.querySelector("[aria-current]") || links.some((l) => { try { const u = new URL(l.href, location.href); return u.pathname === location.pathname && u.pathname !== "/"; } catch { return false; } }));
      btn.addEventListener("click", () => set(box.hidden));
    });
  })();
  sheet = document.querySelector(".pn-sheet"), ov = document.querySelector(".pn-overlay"), mb = nav.querySelector(".pn-menu");
  sheetOpen = v => {
    if (v === sheet.classList.contains("open")) return;
    sheet.classList.toggle("open", v); ov.classList.toggle("open", v); document.body.classList.toggle("pn-lock", v);
    sheet.setAttribute("aria-hidden", String(!v)); sheet.inert = !v; mb.setAttribute("aria-expanded", String(v));
    if (v) sheet.querySelector(".pn-close").focus({ preventScroll: true }); else (expanded ? mb : nav).focus({ preventScroll: true });
  };
  mb.addEventListener("click", () => { if (Date.now() - lock < 450) return; lock = Date.now(); sheetOpen(true); });
  ov.addEventListener("click", () => sheetOpen(false));
  sheet.querySelector(".pn-close").addEventListener("click", () => sheetOpen(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); if (sheet.classList.contains("open")) sheetOpen(false); } });
  window.__pn = { setExpanded, sheetOpen };
  const nl = document.createElement("script"); nl.src = "/newsletter-cta.js?v=2026101520481"; document.body.append(nl);
})();
// Site-wide LIVE NOW alert (reads /live-data.json; shows nothing unless a stream is live)
(() => { if (document.querySelector('script[src*="live-now.js"]')) return; const s = document.createElement("script"); s.src = "/live-now.js?v=202610152135"; s.defer = true; document.head.appendChild(s); })();
(() => { if (document.querySelector('script[src*="search.js"]')) return; const s = document.createElement("script"); s.src = "/search.js?v=202610190400"; s.defer = true; document.head.appendChild(s); })();
(() => { if (document.querySelector('script[src*="theme.js"]')) return; const s = document.createElement("script"); s.src = "/theme.js?v=202610190015"; s.defer = true; document.head.appendChild(s); })();
