(() => {
  // Referral card, end-of-page newsletter band and one-time scroll prompt.
  // Pages opt in with <script src="/grow.js" data-ref data-band data-pop data-bar defer>.
  const me = document.currentScript;
  const has = (k) => me && me.hasAttribute("data-" + k);
  const REF = "https://ts.la/alex474841";
  if (!document.querySelector('link[href^="/grow.css"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "/grow.css?v=202610210800"; document.head.appendChild(css);
  }
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
      <a class="sd-btn" href="${REF}" target="_blank" rel="noopener noreferrer sponsored">Order with my Tesla link ↗</a><span class="ref-note">Referral link: we may earn a reward</span>`;
    place(r);
  }
  const bandCopy = () => {
    const path = (location.pathname || "").toLowerCase();
    let topic = "website";
    if (/roadster/.test(path)) topic = "roadster";
    else if (/my-tesla|\/updates|fsd|tcmv|cybercab|robotaxi/.test(path)) topic = "tesla-software";
    else if (/starship|starlink|spacex|falcon|dragon|see-the-launch|\/calendar/.test(path)) topic = "spacex";
    else if (/tesla|\/reviews|buying-guide|\/gear\.html/.test(path)) topic = "tesla";
    else {
      const section = (document.querySelector('meta[property="article:section"]')?.content || "").toLowerCase();
      const tag = (document.querySelector(".art-tag")?.textContent || "").toLowerCase();
      const hay = `${section} ${tag}`;
      if (/roadster/.test(hay)) topic = "roadster";
      else if (/fsd|software|update|cybercab|robotaxi/.test(hay)) topic = "tesla-software";
      else if (/starship|starlink|spacex|falcon|dragon/.test(hay)) topic = "spacex";
      else if (/tesla/.test(hay)) topic = "tesla";
    }
    if (topic === "roadster") return ["roadster", "Roadster on Supercharged Daily", "Reveal clocks, thruster notes and the latest Tesla news — one free Sunday email."];
    if (topic === "tesla-software") return ["tesla-software", "Tesla software on Supercharged Daily", "FSD, software updates and My Tesla notes — free, every Sunday."];
    if (topic === "spacex") return ["spacex", "SpaceX on Supercharged Daily", "Starship flights, Starlink and Falcon dates — the week in one Sunday email."];
    if (topic === "tesla") return ["tesla", "Tesla on Supercharged Daily", "Reviews, buying notes and the latest Tesla news — free, every Sunday."];
    return ["website", "Get Supercharged Daily", "The week’s Tesla, SpaceX, xAI and X stories plus $TSLA and $SPCX moves. Free, every Sunday."];
  };
  if (has("band") && !document.querySelector("[data-band-slot] .sd-band") && !document.querySelector('.nl-end, #newsletter, [data-newsletter]:not(.sd-pop):not(.sd-band)')) {
    const [topic, heading, blurb] = bandCopy();
    const b = document.createElement("section");
    b.className = "sd-band"; b.id = "newsletter"; b.setAttribute("data-newsletter", "band"); b.setAttribute("data-band-topic", topic); b.setAttribute("aria-label", "Newsletter signup");
    b.innerHTML = `<div><h2>${heading}</h2><p>${blurb}</p></div>
      <div>${form("sd-band-email")}<p class="sd-fine">Free. No spam. Unsubscribe anytime. <a class="sd-latest" href="https://alexs-newsletter-84b17e.beehiiv.com/p/supercharged-daily-goodbye-cybertruck-hello-friday-the-13th?utm_source=website&utm_medium=site-band&utm_campaign=latest-issue" target="_blank" rel="noopener">Read the latest issue →</a></p><p class="newsletter-status" data-newsletter-status role="status"></p></div>`;
    const bs = document.querySelector("[data-band-slot]"); if (bs) bs.appendChild(b); else place(b);
  }
  const KEY = "sd-pop-seen";
  const SUBKEY = "sd-nl-sub";
  const store = { get(k){try{return localStorage.getItem(k)}catch(e){return "1"}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}} };
  try {
    const views = Number(sessionStorage.getItem("sd-views") || 0) + 1;
    sessionStorage.setItem("sd-views", views);
  } catch (e) { /* Signup and navigation still work when storage is unavailable. */ }
  // One nag per visit: skip the scroll popup when an inline signup is already on
  // the page, the reader already subscribed in this browser, or grow.js was asked
  // not to pop (data-pop omitted). There is no Beehiiv subscriber cookie on this
  // custom grow.js — respect sd-nl-sub the same way a grow embed would hide for subscribers.
  const hasInline = !!document.querySelector("[data-newsletter]:not(.sd-pop), #newsletter, .sd-band");
  const skipPop = matchMedia("(max-width:720px)").matches || hasInline || store.get(SUBKEY) === "1";
  if (has("pop") && !store.get(KEY) && !skipPop) {
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
  // Slim phone bar (data-bar, homepage only): appears once the hero signup has scrolled out of view,
  // hides again while any signup form is on screen, and jumps back to the one main form instead of
  // adding a second. Closing it keeps it away for 14 days; subscribers never see it.
  const BARKEY = "sd-bar-closed";
  const main = document.getElementById("newsletter");
  if (has("bar") && main && "IntersectionObserver" in window && matchMedia("(max-width:720px)").matches
      && store.get(SUBKEY) !== "1" && !(Number(store.get(BARKEY)) > Date.now())) {
    const bar = document.createElement("aside");
    bar.className = "sd-bar"; bar.hidden = true; bar.setAttribute("aria-label", "Newsletter signup");
    bar.innerHTML = `<p><b>Free Sunday briefing</b><span>Tesla, SpaceX and xAI in one email.</span></p>
      <a class="sd-btn" href="#newsletter" data-bar-go>Sign up</a>
      <button class="sd-x" type="button" aria-label="Close newsletter bar">×</button>`;
    document.body.appendChild(bar);
    const seen = new Set();
    let closed = false, queued = false;
    // Show only below the hero form (its bottom edge above the screen), never while a form is visible.
    const sync = () => {
      queued = false;
      const show = !closed && seen.size === 0 && main.getBoundingClientRect().bottom < 0 && store.get(SUBKEY) !== "1";
      if (bar.hidden === show) bar.hidden = !show;
      document.documentElement.classList.toggle("has-sd-bar", show);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
    const io = new IntersectionObserver((es) => {
      for (const e of es) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); }
      queue();
    });
    addEventListener("scroll", queue, { passive: true });
    document.querySelectorAll("[data-newsletter-form]").forEach((f) => io.observe(f));
    io.observe(main);
    bar.querySelector("[data-bar-go]").addEventListener("click", (e) => {
      e.preventDefault();
      main.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      const input = main.querySelector("input[type=email]");
      if (input) input.focus({ preventScroll: true });
    });
    bar.querySelector(".sd-x").addEventListener("click", () => {
      closed = true; store.set(BARKEY, String(Date.now() + 14 * 864e5)); io.disconnect();
      removeEventListener("scroll", queue); sync(); bar.remove();
    });
  }
  function bindForms() { if (!window.__sdTrack) { const t = document.createElement("script"); t.src = "/track.js?v=202610190630"; document.body.appendChild(t); }  if (!window.__sdNewsletter && !document.querySelector('script[src^="/newsletter.js"]')) { const s = document.createElement("script"); s.src = "/newsletter.js?v=202610210800"; document.body.appendChild(s); } }
  bindForms();
})();
