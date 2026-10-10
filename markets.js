(() => {
  const hero = document.querySelector("[data-markets-hero]");
  if (!hero) return;

  const brands = {
    tsla: {
      title: "TSLA — Supercharged Daily",
      href: "https://www.tradingview.com/symbols/NASDAQ-TSLA/",
      lede: "Live Tesla share price, the next print, and last deliveries. SPCX is the other tab.",
      widget: "NASDAQ:TSLA",
    },
    spcx: {
      title: "SPCX — Supercharged Daily",
      href: "https://www.tradingview.com/symbols/NASDAQ-SPCX/",
      lede: "SPCX is the SpaceX vehicle on Nasdaq. Switch back to TSLA for Tesla.",
      widget: "NASDAQ:SPCX",
    },
  };

  const widgetOptions = {
    lineWidth: 2,
    lineType: 0,
    chartType: "area",
    fontColor: "rgb(167, 169, 174)",
    gridLineColor: "rgba(236, 236, 232, 0.08)",
    volumeUpColor: "rgba(34, 171, 148, 0.5)",
    volumeDownColor: "rgba(200, 16, 46, 0.5)",
    backgroundColor: "#14151a",
    widgetFontColor: "#ecece8",
    upColor: "#22ab94",
    downColor: "#c8102e",
    borderUpColor: "#22ab94",
    borderDownColor: "#c8102e",
    wickUpColor: "#22ab94",
    wickDownColor: "#c8102e",
    colorTheme: "dark",
    isTransparent: false,
    locale: "en",
    chartOnly: false,
    scalePosition: "right",
    scaleMode: "Normal",
    fontFamily: "Inter, sans-serif",
    valuesTracking: "1",
    changeMode: "price-and-percent",
    dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
    fontSize: "10",
    headerFontSize: "medium",
    autosize: true,
    width: "100%",
    height: "100%",
    noTimeScale: false,
    hideDateRanges: false,
    hideMarketStatus: false,
    hideSymbolLogo: false,
  };

  const lede = document.querySelector("[data-markets-lede]");
  const chartLink = document.querySelector("[data-markets-chart-link]");
  const tabs = document.querySelectorAll("[data-markets-tab]");
  const panes = document.querySelectorAll("[data-markets-chart]");
  const quotes = document.querySelectorAll("[data-markets-quote]");
  let active = "tsla";

  const mountWidget = (pane, symbol) => {
    if (!pane || pane.dataset.mounted === "true") return;
    pane.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container";
    wrap.style.height = "100%";
    wrap.style.width = "100%";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "calc(100% - 32px)";
    inner.style.width = "100%";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.textContent = JSON.stringify({
      ...widgetOptions,
      symbols: [[`${symbol}|1D`]],
    });
    wrap.append(inner, script);
    pane.append(wrap);
    pane.dataset.mounted = "true";
  };

  const mountQuote = (pane, symbol) => {
    if (!pane || pane.dataset.mounted === "true") return;
    pane.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
    script.async = true;
    script.textContent = JSON.stringify({
      symbol,
      width: "100%",
      colorTheme: "dark",
      isTransparent: true,
      locale: "en",
    });
    wrap.append(inner, script);
    pane.append(wrap);
    pane.dataset.mounted = "true";
  };

  const setSymbol = (id, { persistHash = true } = {}) => {
    if (!brands[id]) id = "tsla";
    active = id;
    hero.dataset.marketsActive = id;
    document.title = brands[id].title;
    if (lede) lede.textContent = brands[id].lede;
    if (chartLink) {
      chartLink.href = brands[id].href;
    }

    document.querySelectorAll("[data-markets-brand]").forEach((el) => {
      const on = el.dataset.marketsBrand === id;
      el.hidden = !on;
    });

    quotes.forEach((pane) => {
      const on = pane.dataset.marketsQuote === id;
      pane.classList.toggle("is-on", on);
      pane.setAttribute("aria-hidden", String(!on));
    });

    tabs.forEach((tab) => {
      const on = tab.dataset.marketsTab === id;
      tab.setAttribute("aria-selected", String(on));
      tab.classList.toggle("is-on", on);
    });

    panes.forEach((pane) => {
      const on = pane.dataset.marketsChart === id;
      pane.classList.toggle("is-on", on);
      if (on) mountWidget(pane, brands[id].widget);
    });

    if (persistHash) {
      history.replaceState(null, "", id === "tsla" ? location.pathname : `${location.pathname}#spcx`);
    }
  };

  const fromHash = () => (location.hash === "#spcx" ? "spcx" : "tsla");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setSymbol(tab.dataset.marketsTab));
  });

  window.addEventListener("hashchange", () => setSymbol(fromHash(), { persistHash: false }));

  setSymbol(fromHash(), { persistHash: false });
  Object.keys(brands).forEach((id) => {
    mountQuote(document.querySelector(`[data-markets-quote="${id}"]`), brands[id].widget);
  });
  const other = active === "tsla" ? "spcx" : "tsla";
  const otherPane = document.querySelector(`[data-markets-chart="${other}"]`);
  if (otherPane && "requestIdleCallback" in window) {
    requestIdleCallback(() => mountWidget(otherPane, brands[other].widget));
  } else if (otherPane) {
    setTimeout(() => mountWidget(otherPane, brands[other].widget), 1200);
  }
})();
