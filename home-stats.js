(() => {
  const STATS_URL = "/home-stats.json";
  const CACHE_KEY = "aljr-home-stats-v1";
  const FETCH_MS = 6000;
  const KEYS = ["fsdCountries", "starlink", "directToPhone", "dragonFreedom"];
  const NON_EU_FSD = ["US", "CA", "MX", "PR", "CN", "AU", "NZ", "KR"];

  const known = (value) => Number.isFinite(value) && value > 0;

  const formatValue = (value) => Math.round(value).toLocaleString("en-US");

  const formatDay = (iso) => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "";
    return new Date(t).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const readInline = () => {
    const values = {};
    KEYS.forEach((key) => {
      const el = document.querySelector(`[data-home-stat="${key}"] [data-home-stat-value]`);
      const n = Number(el?.dataset.verified);
      if (known(n)) values[key] = n;
    });
    const updated = document.getElementById("home-stats-status")?.dataset.verifiedUpdated || "";
    return { values, updated, from: "inline" };
  };

  const readCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const values = {};
      KEYS.forEach((key) => {
        const n = Number(parsed?.values?.[key]);
        if (known(n)) values[key] = n;
      });
      if (!KEYS.some((key) => known(values[key]))) return null;
      return { values, updated: parsed.updated || "", from: "cache" };
    } catch {
      return null;
    }
  };

  const writeCache = (bundle) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          updated: bundle.updated || "",
          values: bundle.values,
          savedAt: Date.now(),
        })
      );
    } catch {
      /* private mode */
    }
  };

  const paint = (values, loading = false) => {
    KEYS.forEach((key) => {
      const el = document.querySelector(`[data-home-stat="${key}"] [data-home-stat-value]`);
      if (!el) return;
      const n = Number(values[key]);
      if (!known(n)) {
        el.classList.toggle("is-loading", loading);
        el.setAttribute("aria-busy", loading ? "true" : "false");
        if (!loading) el.textContent = "—";
        return;
      }
      el.classList.remove("is-loading");
      el.removeAttribute("aria-busy");
      el.textContent = formatValue(n);
    });
  };

  const setStatus = (text, state) => {
    const label = document.querySelector("[data-home-stats-label]");
    const dot = document.querySelector("[data-home-stats-dot]");
    if (label) label.textContent = text;
    if (dot) {
      dot.classList.toggle("is-live", state === "live");
      dot.classList.toggle("is-stale", state === "stale");
    }
  };

  const fetchJson = async (url) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const loadFsdEurope = () =>
    new Promise((resolve) => {
      if (window.FSD_EUROPE) {
        resolve(window.FSD_EUROPE);
        return;
      }
      const script = document.createElement("script");
      script.src = "/fsd-europe-data.js";
      script.onload = () => resolve(window.FSD_EUROPE || null);
      script.onerror = () => resolve(null);
      document.head.append(script);
    });

  const parseRemote = (data) => {
    const values = {};
    KEYS.forEach((key) => {
      const n = Number(data?.stats?.[key]?.value);
      if (known(n)) values[key] = n;
    });
    const markets = data?.stats?.fsdCountries?.markets;
    if (Array.isArray(markets) && markets.length) {
      const unique = new Set(markets.map((code) => String(code || "").toUpperCase()).filter(Boolean));
      if (unique.size > 0) values.fsdCountries = unique.size;
    }
    return { values, updated: data?.updated || "", from: "file" };
  };

  const enrichFsd = async (values) => {
    const next = { ...values };
    const data = await loadFsdEurope();
    const approved = (data?.countries || [])
      .filter((row) => row.status === "approved" && row.code)
      .map((row) => String(row.code).toUpperCase());
    if (!approved.length) return next;
    const markets = new Set([...NON_EU_FSD, ...approved]);
    if (markets.size > 0) next.fsdCountries = markets.size;
    return next;
  };

  const mergeKnown = (...bundles) => {
    const values = {};
    KEYS.forEach((key) => {
      for (const bundle of bundles) {
        const n = Number(bundle?.values?.[key]);
        if (known(n)) {
          values[key] = n;
          break;
        }
      }
    });
    const updated = bundles.find((bundle) => bundle?.updated)?.updated || "";
    return { values, updated };
  };

  const root = document.getElementById("home-stats");
  if (!root) return;

  const inline = readInline();
  const cached = readCache();
  const fallback = mergeKnown(cached, inline);

  if (KEYS.some((key) => known(fallback.values[key]))) {
    paint(fallback.values, false);
    const day = formatDay(fallback.updated);
    setStatus(day ? `Last verified ${day} · checking…` : "Last verified figures · checking…", "stale");
  } else {
    paint({}, true);
    setStatus("Checking last verified figures…", "");
  }

  (async () => {
    try {
      const remote = parseRemote(await fetchJson(STATS_URL));
      const enriched = { ...remote, values: await enrichFsd(remote.values) };
      const next = mergeKnown(enriched, fallback);
      if (!KEYS.some((key) => known(next.values[key]))) throw new Error("empty");
      paint(next.values, false);
      writeCache(next);
      const day = formatDay(next.updated);
      setStatus(day ? `Updated ${day}` : "Updated", "live");
    } catch {
      if (KEYS.some((key) => known(fallback.values[key]))) {
        const recovered = { ...fallback, values: await enrichFsd(fallback.values) };
        paint(recovered.values, false);
        const day = formatDay(recovered.updated);
        setStatus(day ? `Last verified ${day}` : "Last verified figures", "stale");
        return;
      }
      paint({}, false);
      setStatus("Figures unavailable", "stale");
    }
  })();
})();
