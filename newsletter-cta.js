(() => {
  // One tasteful end-of-page newsletter block on Dispatch articles and tracker pages.
  // Uses the existing Beehiiv flow in /newsletter.js (no new form endpoint).
  const SUB = "https://alexs-newsletter-84b17e.beehiiv.com/";
  const p = location.pathname;
  const trackers = ["/starship.html", "/fsd-europe.html", "/starlink.html", "/cybercab.html", "/updates.html", "/fsd.html"];
  const isArticle = /^\/dispatch\/[^/]+\.html$/.test(p);
  const want = isArticle || trackers.includes(p);
  let block = document.getElementById("newsletter") || document.querySelector("[data-newsletter]:not(.sd-band):not(.sd-pop)");
  if (!block && want) {
    if (!document.querySelector('link[href^="/newsletter-cta.css"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/newsletter-cta.css?v=202610141830"; document.head.append(l);
    }
    const s = document.createElement("section");
    s.className = "nl-end"; s.id = "newsletter"; s.setAttribute("data-newsletter", isArticle ? "article-end" : "tracker-end");
    s.setAttribute("aria-labelledby", "nl-end-h");
    s.innerHTML =
      '<div class="nl-end-in">' +
      '<div class="nl-end-copy"><p class="nl-end-eye">Free newsletter · Every Sunday</p>' +
      '<h2 id="nl-end-h">' + (isArticle ? "Liked this? Get the week in one email." : "Get this tracker’s big moves every Sunday.") + '</h2>' +
      '<p class="nl-end-sub">Tesla, SpaceX, xAI and X: the week’s biggest stories and numbers, sourced. Free, no spam, unsubscribe anytime.</p></div>' +
      '<form class="newsletter-form nl-end-form" data-newsletter-form>' +
      '<label class="visually-hidden" for="nl-end-email">Email address</label>' +
      '<input id="nl-end-email" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="you@example.com" />' +
      '<input type="text" name="website" hidden tabindex="-1" autocomplete="off" />' +
      '<button type="submit">Subscribe free</button></form>' +
      '<p class="newsletter-status nl-end-status" data-newsletter-status role="status"></p></div>';
    const main = document.querySelector("main") || document.body;
    const art = isArticle && main.querySelector("article.article");
    if (art) art.after(s); else main.append(s);
    block = s;
    document.querySelectorAll(".sd-band").forEach((b) => b.remove()); // keep one signup block per page
    const js = document.createElement("script"); js.src = "/newsletter.js"; document.body.append(js);
  }
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
