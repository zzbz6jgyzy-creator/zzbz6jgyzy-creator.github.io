(() => {
  const bar = document.querySelector(".topbar");
  const onScroll = () => bar && bar.classList.toggle("is-solid", window.scrollY > 40);
  onScroll(); addEventListener("scroll", onScroll, { passive: true });

  // Live ticker (TradingView ticker tape, same provider as markets.js)
  const t = document.querySelector("[data-home-ticker]");
  if (t) {
    const mount = () => {
      const wrap = document.createElement("div");
      wrap.className = "tradingview-widget-container";
      const inner = document.createElement("div");
      inner.className = "tradingview-widget-container__widget";
      const s = document.createElement("script");
      s.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
      s.async = true;
      s.textContent = JSON.stringify({
        symbols: [
          { proName: "NASDAQ:TSLA", title: "Tesla" },
          { proName: "NASDAQ:SPCX", title: "SpaceX" },
        ],
        showSymbolLogo: true, isTransparent: true, displayMode: "adaptive",
        colorTheme: "dark", locale: "en",
      });
      wrap.append(inner, s);
      t.replaceChildren(wrap);
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { io.disconnect(); mount(); } }, { rootMargin: "400px" });
      io.observe(t);
    } else mount();
  }

  // Today's top story from news-data.json (falls back to static Dispatch card)
  const card = document.querySelector("[data-top-story]");
  const more = document.querySelector("[data-top-more]");
  if (!card) return;
  const label = { tesla: "Tesla", spacex: "SpaceX", grok: "xAI", xai: "xAI", x: "X" };
  const clean = (s) => (s || "").replace(/\s+-\s+[^-]+$/, "").trim();
  fetch("/news-data.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const seen = new Set();
      const items = ((d && d.items) || []).filter((it) => { const k = clean(it.title).toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
      if (!items.length) return;
      // Lead with the newest of the top 5 that has its own image, so the picture matches the story
      const lead = items.slice(0, 5).findIndex((it) => /^https:\/\//.test(it.image || ""));
      if (lead > 0) items.unshift(items.splice(lead, 1)[0]);
      const top = items[0];
      card.href = top.url; card.target = "_blank"; card.rel = "noopener noreferrer";
      card.querySelector("[data-top-tag]").textContent = label[top.topic] || "News";
      card.querySelector("[data-top-title]").textContent = clean(top.title);
      card.querySelector("[data-top-desc]").textContent = top.snippet || "The story everyone’s talking about today. Read the full report at the source.";
      card.querySelector("[data-top-source]").textContent = top.source || "News";
      // Story's own image (from news-data.json, refreshed by scripts/snapshot-news.py); topic photo if none or it fails
      const fallback = { tesla: "/assets/dispatch/cybercab-austin-poster.jpg", spacex: "/assets/ship40.jpg", grok: "/assets/starmind.jpg", xai: "/assets/starmind.jpg", x: "/assets/starmind.jpg" }[top.topic] || "/assets/dispatch/cybercab-austin-poster.jpg";
      const own = /^https:\/\//.test(top.image || "") ? top.image : "";
      const pic = card.querySelector("[data-top-img]");
      pic.onerror = () => { pic.onerror = null; pic.src = fallback; };
      pic.referrerPolicy = "no-referrer";
      pic.src = own || fallback;
      pic.alt = clean(top.title);
      if (more) {
        more.replaceChildren(...items.slice(1, 4).map((it) => {
          const a = document.createElement("a");
          a.href = it.url; a.target = "_blank"; a.rel = "noopener noreferrer";
          const sm = document.createElement("small"); sm.textContent = label[it.topic] || "News";
          a.append(sm, document.createTextNode(clean(it.title)));
          return a;
        }));
      }
    })
    .catch(() => {});
})();
