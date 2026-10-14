(() => {
  const nav = document.querySelector(".pn");
  if (!nav) return;
  const items = nav.querySelector(".pn-items");
  const kids = [...items.children];
  kids.forEach((el, i) => { el.style.setProperty("--i", i); el.style.setProperty("--n", kids.length); });
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
  const here = location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll(".pn a[href], .pn-sheet a[href]").forEach(a => {
    const p = a.getAttribute("href").replace(/index\.html$/, "");
    if (p === here) a.setAttribute("aria-current", "page");
  });
  if (app) { setExpanded(false); document.addEventListener("click", e => { if (expanded && !nav.contains(e.target)) setExpanded(false); }); }
  window.addEventListener("scroll", () => {
    if (app) return;
    const y = window.scrollY;
    if (expanded && y > last && y > 150) { setExpanded(false); collapseAt = y; }
    else if (!expanded && y < last && collapseAt - y > 80) setExpanded(true);
    last = y;
  }, { passive: true });
  nav.addEventListener("click", e => { if (!expanded) { e.preventDefault(); setExpanded(true); } }, true);
  nav.addEventListener("keydown", e => { if (!expanded && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setExpanded(true); } });

  nav.querySelectorAll(".pn-dd").forEach(dd => {
    const btn = dd.querySelector("button");
    const open = v => { if (v) closeAll(); dd.classList.toggle("open", v); btn.setAttribute("aria-expanded", String(v)); };
    let t;
    btn.addEventListener("click", () => open(!dd.classList.contains("open")));
    dd.addEventListener("mouseenter", () => { if (matchMedia("(hover:hover)").matches) { clearTimeout(t); open(true); } });
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

  const sheet = document.querySelector(".pn-sheet"), ov = document.querySelector(".pn-overlay"), mb = nav.querySelector(".pn-menu");
  const sheetOpen = v => {
    sheet.classList.toggle("open", v); ov.classList.toggle("open", v); document.body.classList.toggle("pn-lock", v);
    sheet.setAttribute("aria-hidden", String(!v)); mb.setAttribute("aria-expanded", String(v));
    if (v) sheet.querySelector(".pn-close").focus(); else mb.focus();
  };
  mb.addEventListener("click", e => { if (expanded) sheetOpen(true); });
  ov.addEventListener("click", () => sheetOpen(false));
  sheet.querySelector(".pn-close").addEventListener("click", () => sheetOpen(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); if (sheet.classList.contains("open")) sheetOpen(false); } });
  window.__pn = { setExpanded, sheetOpen };
})();
