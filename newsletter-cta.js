(() => {
  // One tasteful end-of-page newsletter block on Dispatch articles and tracker pages.
  // Uses the existing Beehiiv flow in /newsletter.js (no new form endpoint).
  const SUB = "https://alexs-newsletter-84b17e.beehiiv.com/";
  const p = location.pathname;
  const trackers = ["/starship.html", "/fsd-europe.html", "/starlink.html", "/cybercab.html", "/updates.html", "/fsd.html", "/wallpapers.html"];
  const isArticle = /^\/dispatch\/[^/]+\.html$/.test(p);
  const want = isArticle || trackers.includes(p);
  let block = document.getElementById("newsletter") || document.querySelector("[data-newsletter]:not(.sd-band):not(.sd-pop)");
  if (!block && want) {
    // Always the sleek sitewide "Get Supercharged Daily" band (same markup as grow.js data-band).
    // The old red end-of-article box (.nl-end) is retired. grow.js adds this band itself on pages
    // that load it with data-band; this only fills in on pages that don't.
    block = document.querySelector(".sd-band");
    if (!block) {
      if (!document.querySelector('link[href^="/grow.css?v=202610151845"]')) {
        const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/grow.css?v=202610151845"; document.head.append(l);
      }
      const s = document.createElement("section");
      s.className = "sd-band"; s.setAttribute("data-newsletter", "band"); s.setAttribute("aria-label", "Newsletter signup");
      s.innerHTML = '<div><h2>Get Supercharged Daily</h2><p>The week’s Tesla, SpaceX, xAI and X stories plus $TSLA and $SPCX moves. Free, every Sunday.</p></div>' +
        '<div><form class="sd-form" data-newsletter-form><label class="visually-hidden" for="sd-band-email">Email address</label>' +
        '<input id="sd-band-email" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="you@example.com" />' +
        '<input type="text" name="website" hidden tabindex="-1" autocomplete="off" />' +
        '<button class="sd-btn" type="submit">Subscribe</button></form>' +
        '<p class="sd-fine">Free. No spam. Unsubscribe anytime.</p><p class="newsletter-status" data-newsletter-status role="status"></p></div>';
      const footer = document.querySelector(".site-footer");
      if (footer) footer.before(s); else (document.querySelector("main") || document.body).append(s);
      block = s;
      const js = document.createElement("script"); js.src = "/newsletter.js"; document.body.append(js);
    }
  }
  // Root-cause guard: if the page already has its own signup block, drop any extra sitewide band.
  if (block) document.querySelectorAll(".sd-band").forEach((b) => { if (b !== block) b.remove(); });
  else { const bands = document.querySelectorAll(".sd-band"); bands.forEach((b, i) => { if (i) b.remove(); }); }
  if (!block) block = document.querySelector(".sd-band");
  if (block && !document.getElementById("newsletter")) block.id = "newsletter";
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
