(() => {
  // Referral card, end-of-page newsletter band and one-time scroll prompt.
  // Pages opt in with <script src="/grow.js" data-ref data-band data-pop defer>.
  const me = document.currentScript;
  const has = (k) => me && me.hasAttribute("data-" + k);
  const REF = "https://ts.la/alex474841";
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "/grow.css?v=202610152048"; document.head.appendChild(css);
  const footer = document.querySelector(".site-footer");
  const place = (el) => footer ? footer.before(el) : document.body.appendChild(el);
  const form = (id) => `<form class="sd-form" data-newsletter-form>
      <label class="visually-hidden" for="${id}">Email address</label>
      <input id="${id}" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="you@example.com" />
      <input type="text" name="website" hidden tabindex="-1" autocomplete="off" />
      <button class="sd-btn" type="submit">Subscribe</button></form>`;
  if (has("ref")) {
    const r = document.createElement("aside");
    r.className = "sd-ref"; r.setAttribute("aria-label", "Tesla referral link");
    r.innerHTML = `<div><p class="sd-ref-eb">Referral link</p><h2>Buying a Tesla?</h2>
      <p class="sd-ref-sub">Use my referral link when you order for any perks Tesla offers in your market. I may get credits too.</p></div>
      <a class="sd-btn" href="${REF}" target="_blank" rel="noopener noreferrer sponsored">Order with my referral ↗</a><span class="ref-note">Referral link: we may earn a reward</span>`;
    place(r);
  }
  if (has("band") && !document.querySelector("[data-band-slot] .sd-band") && !document.querySelector('.nl-end, #newsletter, [data-newsletter]:not(.sd-pop):not(.sd-band)')) {
    const b = document.createElement("section");
    b.className = "sd-band"; b.setAttribute("data-newsletter", "band"); b.setAttribute("aria-label", "Newsletter signup");
    b.innerHTML = `<div><h2>Get Supercharged Daily</h2><p>The week’s Tesla, SpaceX, xAI and X stories plus $TSLA and $SPCX moves. Free, every Sunday.</p></div>
      <div>${form("sd-band-email")}<p class="sd-fine">Free. No spam. Unsubscribe anytime. <a class="sd-latest" href="https://alexs-newsletter-84b17e.beehiiv.com/p/supercharged-daily-1?utm_source=website&utm_medium=site-band&utm_campaign=latest-issue" target="_blank" rel="noopener">Read the latest issue →</a></p><p class="newsletter-status" data-newsletter-status role="status"></p></div>`;
    const bs = document.querySelector("[data-band-slot]"); if (bs) bs.appendChild(b); else place(b);
  }
  const KEY = "sd-pop-seen";
  const store = { get(k){try{return localStorage.getItem(k)}catch(e){return "1"}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}} };
  const views = Number(sessionStorage.getItem("sd-views") || 0) + 1;
  try { sessionStorage.setItem("sd-views", views); } catch (e) {}
  const mobileFirst = matchMedia("(max-width:720px)").matches && views < 2;
  if (has("pop") && !store.get(KEY) && !mobileFirst) {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h <= 0 || scrollY / h < 0.5) return;
      removeEventListener("scroll", onScroll);
      store.set(KEY, "1");
      const p = document.createElement("div");
      p.className = "sd-pop"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Newsletter signup"); p.setAttribute("data-newsletter", "pop");
      p.innerHTML = `<button class="sd-x" type="button" aria-label="Close">×</button><h2>Enjoying this?</h2>
        <p>Get the week in Tesla, SpaceX and xAI in one free Sunday email.</p>${form("sd-pop-email")}
        <p class="newsletter-status" data-newsletter-status role="status"></p>`;
      document.body.appendChild(p);
      const close = () => p.remove();
      p.querySelector(".sd-x").addEventListener("click", close);
      addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add("is-in")));
      bindForms();
    };
    addEventListener("scroll", onScroll, { passive: true });
  }
  function bindForms() { if (!window.__sdTrack) { const t = document.createElement("script"); t.src = "/track.js?v=202610151900"; document.body.appendChild(t); }  const s = document.createElement("script"); s.src = "/newsletter.js?v=202610151900"; document.body.appendChild(s); }
  bindForms();
})();
