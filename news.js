(() => {
  const CACHE_KEY = "aljr-news-v1";
  const CACHE_MS = 10 * 60 * 1000;
  const MAX_AGE_MS = 36 * 60 * 60 * 1000;
  const PER_TOPIC = 12;
  const SNAPSHOT = "/news-data.json";
  const TOPICS = [
    { id: "tesla", label: "Tesla", query: "Tesla when:1d" },
    { id: "spacex", label: "SpaceX", query: "SpaceX when:1d" },
    { id: "grok", label: "Grok", query: "Grok xAI when:1d" },
  ];
  const LABELS = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]));

  const rssUrl = (query) =>
    "https://news.google.com/rss/search?" +
    new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" }).toString();

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const fetchJson = async (url, timeout = 10000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const fetchText = async (url, timeout = 10000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  };

  const stripHtml = (raw) => {
    const box = document.createElement("div");
    box.innerHTML = raw || "";
    return (box.textContent || "").replace(/\s+/g, " ").trim();
  };

  const splitTitle = (raw, source) => {
    let title = String(raw || "").trim();
    let src = String(source || "").trim();
    const dash = title.lastIndexOf(" - ");
    if (dash > 0) {
      const trail = title.slice(dash + 3).trim();
      if (!src) src = trail;
      if (trail && src && (trail.toLowerCase() === src.toLowerCase() || src.toLowerCase().includes(trail.toLowerCase()))) {
        title = title.slice(0, dash).trim();
      }
    }
    return { title, source: src };
  };

  const snippetFrom = (title, description) => {
    const text = stripHtml(description);
    if (!text || text.length < 48) return "";
    const head = title.toLowerCase().slice(0, 40);
    if (head && text.toLowerCase().startsWith(head)) return "";
    if (text.toLowerCase() === title.toLowerCase()) return "";
    return text.slice(0, 220).trim();
  };

  const toIso = (value) => {
    if (!value) return "";
    const t = Date.parse(value);
    return Number.isFinite(t) ? new Date(t).toISOString() : "";
  };

  const hashId = (topic, url) => {
    let h = 0;
    const s = `${topic}|${url}`;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, "0");
  };

  const normalizeItems = (rows, topic, now) => {
    const cutoff = now - MAX_AGE_MS;
    const seen = new Set();
    const out = [];
    for (const row of rows) {
      const { title, source } = splitTitle(row.title, row.source);
      const url = String(row.url || "").trim();
      if (!title || !url) continue;
      const published = toIso(row.published);
      if (published && Date.parse(published) < cutoff) continue;
      const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 80);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: row.id || hashId(topic, url),
        topic,
        title,
        source: source || "Google News",
        url,
        published,
        snippet: row.snippet || snippetFrom(title, row.description || ""),
      });
      if (out.length >= PER_TOPIC) break;
    }
    return out;
  };

  const parseRssXml = (xmlText, topic, now) => {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("xml");
    const rows = [...doc.querySelectorAll("item")].map((item) => ({
      title: (item.querySelector("title") || {}).textContent || "",
      url: (item.querySelector("link") || {}).textContent || "",
      published: (item.querySelector("pubDate") || {}).textContent || "",
      source: (item.querySelector("source") || {}).textContent || "",
      description: (item.querySelector("description") || {}).textContent || "",
    }));
    return normalizeItems(rows, topic, now);
  };

  const parseRss2Json = (data, topic, now) => {
    if (!data || data.status !== "ok" || !Array.isArray(data.items)) throw new Error("rss2json");
    const rows = data.items.map((item) => ({
      title: item.title || "",
      url: item.link || "",
      published: item.pubDate || "",
      source: item.author || "",
      description: item.description || item.content || "",
    }));
    return normalizeItems(rows, topic, now);
  };

  const fetchTopicLive = async (topic, now) => {
    const rss = rssUrl(topic.query);
    const encoded = encodeURIComponent(rss);
    try {
      const wrapped = await fetchJson(`https://api.allorigins.win/get?url=${encoded}`, 12000);
      if (wrapped && wrapped.contents) return parseRssXml(wrapped.contents, topic.id, now);
    } catch {
      /* next proxy */
    }
    try {
      const xml = await fetchText(`https://api.allorigins.win/raw?url=${encoded}`, 10000);
      return parseRssXml(xml, topic.id, now);
    } catch {
      /* next proxy */
    }
    const data = await fetchJson(`https://api.rss2json.com/v1/api.json?rss_url=${encoded}`, 10000);
    return parseRss2Json(data, topic.id, now);
  };

  const readCache = () => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items) || !parsed.fetchedAt) return null;
      if (Date.now() - parsed.fetchedAt > CACHE_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeCache = (items, source) => {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ fetchedAt: Date.now(), source, items })
      );
    } catch {
      /* private mode */
    }
  };

  const relTime = (iso, now) => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "";
    const mins = Math.round((now - t) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const formatStamp = (iso) => {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "";
    return new Date(t).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const mergeByTopic = (base, live) => {
    const liveTopics = new Set(live.map((item) => item.topic));
    return [...base.filter((item) => !liveTopics.has(item.topic)), ...live].sort(
      (a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0)
    );
  };

  const renderSkeletons = (list) => {
    list.replaceChildren();
    for (let i = 0; i < 6; i += 1) {
      list.append(el("div", "news-card is-skeleton"));
    }
  };

  const renderList = (list, items, filter, now) => {
    const slice = filter === "all" ? items : items.filter((item) => item.topic === filter);
    list.replaceChildren();
    if (!slice.length) {
      const empty =
        filter === "all"
          ? "Nothing on the wire yet. Hit refresh."
          : `Quiet ${LABELS[filter] || filter} day. Check All, or refresh.`;
      list.append(el("p", "news-empty", empty));
      return;
    }
    slice.forEach((item) => {
      const card = el("a", `news-card news-${item.topic}`);
      card.href = item.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      const meta = el("div", "news-meta");
      meta.append(el("span", "tag", LABELS[item.topic] || item.topic));
      const when = relTime(item.published, now);
      if (when) meta.append(el("span", "", when));
      if (item.source) meta.append(el("span", "", item.source));
      card.append(meta);
      card.append(el("h3", "", item.title));
      if (item.snippet) card.append(el("p", "", item.snippet));
      list.append(card);
    });
  };

  const setStatus = (root, text, state) => {
    const status = root.querySelector("[data-news-status]");
    const dot = root.querySelector("[data-news-dot]");
    if (status) status.textContent = text;
    if (dot) {
      dot.classList.remove("is-live", "is-stale", "is-off");
      dot.classList.add(state === "live" ? "is-live" : state === "stale" ? "is-stale" : "is-off");
    }
  };

  async function boot() {
    const root = document.querySelector("[data-news]");
    if (!root) return;
    const list = root.querySelector("[data-news-list]");
    const filters = root.querySelector("[data-news-filters]");
    const refreshBtn = root.querySelector("[data-news-refresh]");
    const now = Date.now();
    const hash = (location.hash || "").replace("#", "").toLowerCase();
    let filter = TOPICS.some((t) => t.id === hash) ? hash : "all";
    let items = [];
    let source = "empty";

    const paint = () => renderList(list, items, filter, Date.now());

    if (filters) {
      filters.querySelectorAll("[data-news-filter]").forEach((btn) => {
        btn.classList.toggle("is-on", btn.getAttribute("data-news-filter") === filter);
      });
      filters.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-news-filter]");
        if (!btn) return;
        filter = btn.getAttribute("data-news-filter") || "all";
        filters.querySelectorAll("[data-news-filter]").forEach((elBtn) => {
          elBtn.classList.toggle("is-on", elBtn === btn);
        });
        if (filter === "all") history.replaceState(null, "", location.pathname);
        else history.replaceState(null, "", `#${filter}`);
        paint();
      });
    }

    const loadSnapshot = async () => {
      const data = await fetchJson(SNAPSHOT, 8000);
      const rows = Array.isArray(data.items) ? data.items : [];
      const grouped = TOPICS.flatMap((topic) =>
        normalizeItems(
          rows.filter((row) => row.topic === topic.id),
          topic.id,
          now
        )
      );
      return {
        items: grouped.sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0)),
        updated: data.updated,
      };
    };

    const loadLive = async (base) => {
      const results = await Promise.allSettled(TOPICS.map((topic) => fetchTopicLive(topic, now)));
      const live = [];
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.length) live.push(...result.value);
      });
      if (!live.length) throw new Error("live-empty");
      return mergeByTopic(base, live);
    };

    const run = async (force) => {
      renderSkeletons(list);
      setStatus(root, "Checking the wire…", "off");
      const cached = !force ? readCache() : null;
      if (cached) {
        items = cached.items;
        source = cached.source;
        paint();
        setStatus(
          root,
          source === "live"
            ? `Live from Google News · ${formatStamp(new Date(cached.fetchedAt).toISOString())}`
            : `Last snapshot · ${formatStamp(new Date(cached.fetchedAt).toISOString())}`,
          source === "live" ? "live" : "stale"
        );
        return;
      }

      let snapshotItems = [];
      let snapshotUpdated = "";
      try {
        const snap = await loadSnapshot();
        snapshotItems = snap.items;
        snapshotUpdated = snap.updated || "";
        if (snapshotItems.length) {
          items = snapshotItems;
          source = "snapshot";
          paint();
          setStatus(
            root,
            `Snapshot · ${formatStamp(snapshotUpdated)} · checking live headlines…`,
            "stale"
          );
        }
      } catch {
        /* live may still work */
      }

      try {
        const liveItems = await loadLive(snapshotItems);
        items = liveItems;
        source = "live";
        writeCache(items, "live");
        paint();
        setStatus(root, `Live from Google News · ${formatStamp(new Date().toISOString())}`, "live");
      } catch {
        if (snapshotItems.length) {
          items = snapshotItems;
          source = "snapshot";
          writeCache(items, "snapshot");
          paint();
          setStatus(
            root,
            `Showing the last snapshot${snapshotUpdated ? ` · ${formatStamp(snapshotUpdated)}` : ""}. Refresh to try the live wire again.`,
            "stale"
          );
        } else {
          items = [];
          paint();
          setStatus(root, "Could not reach the wire. Try refresh.", "off");
        }
      }
    };

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        try {
          sessionStorage.removeItem(CACHE_KEY);
        } catch {
          /* ignore */
        }
        run(true);
      });
    }

    await run(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
