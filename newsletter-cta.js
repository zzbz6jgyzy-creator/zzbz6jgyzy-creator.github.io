(() => {
  window.__sdNewsletterCta = 1;
  // Wire the nav Subscribe control to the page's signup block.
  // Inline article/tracker blocks are injected at build time (<!--nl:start-->).
  // grow.js still adds a footer band only when no inline block exists.
  const SUB = "https://alexs-newsletter-84b17e.beehiiv.com/";
  let block = document.getElementById("newsletter") || document.querySelector("[data-newsletter]:not(.sd-pop)");
  if (block && block.classList.contains("sd-pop")) block = document.querySelector("[data-newsletter]:not(.sd-pop)");
  // Root-cause guard: if the page already has its own signup block, drop any extra sitewide band.
  if (block) document.querySelectorAll(".sd-band").forEach((b) => { if (b !== block) b.remove(); });
  else { const bands = document.querySelectorAll(".sd-band"); bands.forEach((b, i) => { if (i) b.remove(); }); }
  if (!block) block = document.querySelector(".sd-band");
  if (block && !document.getElementById("newsletter")) block.id = "newsletter";
  if (block && !window.__sdNewsletter && !document.querySelector('script[src^="/newsletter.js"]')) {
    const js = document.createElement("script"); js.src = "/newsletter.js?v=202610210800"; document.body.append(js);
  }
  document.querySelectorAll("a.pn-sub").forEach((a) => {
    if (block) a.href = "#newsletter";
    else { a.href = SUB + "?utm_source=website&utm_medium=nav"; a.rel = "noopener"; }
    if (block) a.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.__pn) window.__pn.sheetOpen(false);
      block.scrollIntoView({ behavior: "smooth", block: "center" });
      const i = block.querySelector("input[type=email]"); if (i) setTimeout(() => i.focus({ preventScroll: true }), 500);
    });
  });
})();
