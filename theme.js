(() => {
  const KEY = "sd-theme";
  const root = document.documentElement;
  const sun = '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>';
  const moon = '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M16.5 13.5A6.5 6.5 0 1 1 10.5 7.5 5.2 5.2 0 0 0 16.5 13.5z"/></svg>';

  const get = () => (root.getAttribute("data-theme") === "light" ? "light" : "dark");

  const wordmarks = (theme) => {
    const src = theme === "light" ? "/assets/brand/wordmark-ink.svg" : "/assets/brand/wordmark.svg";
    document.querySelectorAll("img.pn-word, .pn-sheet-head > img").forEach((img) => {
      if ((img.getAttribute("src") || "").includes("wordmark")) img.src = src;
    });
  };

  const tweets = (theme) => {
    document.querySelectorAll("blockquote.twitter-tweet").forEach((el) => el.setAttribute("data-theme", theme));
  };

  const syncBtn = (btn) => {
    const light = get() === "light";
    btn.setAttribute("aria-pressed", String(light));
    btn.setAttribute("aria-label", light ? "Use dark theme" : "Use light theme");
    btn.title = light ? "Dark theme" : "Light theme";
    const lab = btn.querySelector("[data-theme-label]");
    if (lab) lab.textContent = light ? "Dark" : "Light";
  };

  const apply = (theme) => {
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    wordmarks(theme);
    tweets(theme);
    document.querySelectorAll(".pn-theme").forEach(syncBtn);
  };

  const mk = (cls, labeled) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.innerHTML = sun + moon + (labeled
      ? '<span data-theme-label>Light</span>'
      : '<span class="visually-hidden" data-theme-label>Light</span>');
    b.addEventListener("click", () => apply(get() === "light" ? "dark" : "light"));
    return b;
  };

  const nav = document.querySelector(".pn");
  if (nav && !nav.querySelector(".pn-theme")) {
    const items = nav.querySelector(".pn-items");
    const search = items && items.querySelector(".pn-search");
    const sub = items && items.querySelector(".pn-sub");
    const cta = items && items.querySelector(".pn-cta");
    if (items) items.insertBefore(mk("pn-theme", false), search || sub || cta);
    const sh = document.querySelector(".pn-sheet");
    const shSearch = sh && sh.querySelector(".pn-search-sheet");
    const shSub = sh && sh.querySelector(".pn-sub-sheet");
    const shCta = sh && sh.querySelector(".pn-cta");
    if (shSearch) shSearch.after(mk("pn-theme pn-theme-sheet", true));
    else if (shSub || shCta) (shSub || shCta).before(mk("pn-theme pn-theme-sheet", true));
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  apply(get());
  const pinTheme = () => {
    const link = document.querySelector('link[href*="/theme.css"]');
    if (link && link !== document.head.lastElementChild) document.head.appendChild(link);
  };
  pinTheme();
  new MutationObserver(pinTheme).observe(document.head, { childList: true });
  window.__sdTheme = { apply, get };
})();
