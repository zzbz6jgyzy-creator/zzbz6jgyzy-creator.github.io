(() => {
  const LL2 =
    "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?lsp__name=SpaceX&limit=16";

  const GROUPS = {
    tesla: "Tesla",
    spacex: "SpaceX",
    xai: "xAI",
    macro: "Fed / CPI",
  };

  const CURATED = [
    {
      id: "cpi-2026-10",
      title: "US CPI (September)",
      start: "2026-10-14T12:30:00Z",
      group: "macro",
      where: "BLS · 8:30 a.m. ET",
      note: "Inflation print that usually shoves the whole tape, Tesla included.",
      href: "https://www.bls.gov/cpi/",
      status: "confirmed",
      precision: "datetime",
    },
    {
      id: "tesla-roadster-unveil-2026",
      title: "Roadster unveiling",
      start: "2026-10-15T17:00:00Z",
      group: "tesla",
      where: "Waco / McGregor, Texas · outdoors",
      note: "Tesla moved it from 1 October after calling weather on an outdoor-only demo. Time and stream still TBA.",
      href: "https://x.com/Tesla/status/2104647484169728442",
      status: "confirmed",
      precision: "day",
    },
    {
      id: "tesla-q3-2026-earnings",
      title: "Tesla Q3 earnings",
      start: "2026-10-21T21:30:00Z",
      group: "tesla",
      where: "Webcast · 4:30 p.m. CT / 5:30 p.m. ET",
      note: "Results after the close. Update deck and Q&A on ir.tesla.com.",
      href: "https://ir.tesla.com",
      status: "confirmed",
      precision: "datetime",
    },
    {
      id: "fomc-2026-10",
      title: "FOMC decision",
      start: "2026-10-28T18:00:00Z",
      group: "macro",
      where: "Federal Reserve · 2:00 p.m. ET",
      note: "Oct 27–28 meeting. Statement and press conference on the 28th. No dot plot.",
      href: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      status: "confirmed",
      precision: "datetime",
    },
    {
      id: "starship-f15",
      title: "Starship Flight 15",
      start: "2026-10-19T00:00:00Z",
      group: "spacex",
      where: "Starbase · Pad 2",
      note: "Planning target only — SpaceX has not set an official time. First serious Ship catch attempt is the story.",
      href: "https://www.spacex.com/launches/starship-flight-15",
      status: "net",
      precision: "day",
      source: "curated",
    },
    {
      id: "cpi-2026-11",
      title: "US CPI (October)",
      start: "2026-11-10T13:30:00Z",
      group: "macro",
      where: "BLS · 8:30 a.m. ET",
      note: "Next inflation print after the October FOMC.",
      href: "https://www.bls.gov/cpi/",
      status: "confirmed",
      precision: "datetime",
    },
    {
      id: "fomc-2026-12",
      title: "FOMC decision + dots",
      start: "2026-12-09T19:00:00Z",
      group: "macro",
      where: "Federal Reserve · 2:00 p.m. ET",
      note: "Dec 8–9 meeting. Summary of Economic Projections and the last 2026 rate call.",
      href: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      status: "confirmed",
      precision: "datetime",
    },
    {
      id: "cpi-2026-12",
      title: "US CPI (November)",
      start: "2026-12-10T13:30:00Z",
      group: "macro",
      where: "BLS · 8:30 a.m. ET",
      note: "Last CPI of the year, the morning after the December FOMC.",
      href: "https://www.bls.gov/cpi/",
      status: "confirmed",
      precision: "datetime",
    },
    {
      id: "tesla-q4-deliveries",
      title: "Tesla Q4 deliveries",
      start: "2027-01-03T14:00:00Z",
      group: "tesla",
      where: "Tesla IR · early January",
      note: "Not dated yet. Tesla usually posts production, deliveries and energy storage in the first days of January.",
      href: "https://ir.tesla.com",
      status: "expected",
      precision: "month",
    },
    {
      id: "ll-sda-t1a",
      title: "Falcon 9 · SDA Tranche 1 Transport Layer A",
      start: "2026-10-10T07:29:00Z",
      group: "spacex",
      where: "Vandenberg · SLC-4E",
      status: "go",
      precision: "datetime",
      source: "fallback",
    },
    {
      id: "ll-starlink-15-25",
      title: "Falcon 9 · Starlink Group 15-25",
      start: "2026-10-12T23:00:00Z",
      group: "spacex",
      where: "Vandenberg · SLC-4E",
      status: "go",
      precision: "datetime",
      source: "fallback",
    },
    {
      id: "ll-crs-35",
      title: "Falcon 9 · Dragon CRS-2 SpX-35",
      start: "2026-10-13T10:33:44Z",
      group: "spacex",
      where: "Cape Canaveral · SLC-40",
      status: "go",
      precision: "datetime",
      source: "fallback",
    },
    {
      id: "ll-ussf-481",
      title: "Falcon 9 · USSF-481",
      start: "2026-10-15T23:44:00Z",
      group: "spacex",
      where: "Vandenberg · SLC-4E",
      status: "go",
      precision: "datetime",
      source: "fallback",
    },
  ];

  const WATCHING = [
    {
      title: "Grok 4.8",
      group: "xai",
      note: "Next in Musk’s September 2026 roadmap. Grok 4.7 shipped 21 Sep. No date.",
    },
    {
      title: "Grok 4.9",
      group: "xai",
      note: "Queued after 4.8. Still unannounced.",
    },
    {
      title: "Grok 5",
      group: "xai",
      note: "xAI says it is in training. Musk has aimed at “within 2026”. Not a date.",
    },
    {
      title: "Starship Flight 16 / Starlink 30-1",
      group: "spacex",
      note: "Provisional KSC 39A planning target after Flight 15. Pad licensing is still the limiter.",
    },
  ];

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const pad = (n) => String(n).padStart(2, "0");

  function parseStart(iso) {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : NaN;
  }

  function formatWhen(event, now) {
    const t = parseStart(event.start);
    if (!Number.isFinite(t)) return "Date TBA";
    const d = new Date(t);
    if (event.precision === "month") {
      return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (event.precision === "day") {
      const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
      return event.status === "net" || event.status === "tbd" ? `NET ${day}` : day;
    }
    if (event.status === "net") {
      return `NET ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    const day = `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
    return `${day} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatUntil(event, now) {
    const t = parseStart(event.start);
    if (!Number.isFinite(t)) return "";
    if (event.precision === "month" || event.status === "net" || event.status === "expected") {
      return event.status === "net" ? "Planning" : "Expected";
    }
    const ms = t - now.getTime();
    if (ms < -36e5) return "Done";
    if (ms < 0) return "Now";
    const mins = Math.round(ms / 6e4);
    if (mins < 90) return `${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  }

  function isUpcoming(event, now) {
    const t = parseStart(event.start);
    if (!Number.isFinite(t)) return true;
    if (event.precision === "month") return t > now.getTime() - 20 * 864e5;
    return t > now.getTime() - 6 * 36e5;
  }

  function launchKey(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/falcon (9|heavy)( block 5)?/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function mapLaunch(row) {
    const net = row.net;
    const t = parseStart(net);
    if (!Number.isFinite(t)) return null;
    const d = new Date(t);
    const statusName = row.status?.name || "";
    const placeholder = d.getMonth() === 11 && d.getDate() === 31 && /to be determined|tbd/i.test(statusName);
    if (placeholder) return null;
    const rawLoc = row.pad?.location?.name || "";
    const loc = /vandenberg/i.test(rawLoc)
      ? "Vandenberg"
      : /cape canaveral/i.test(rawLoc)
        ? "Cape Canaveral"
        : /kennedy/i.test(rawLoc)
          ? "KSC"
          : /starbase/i.test(rawLoc)
            ? "Starbase"
            : rawLoc.replace(/, United States$/, "").replace(/, USA$/, "");
    const padName = (row.pad?.name || "")
      .replace("Space Launch Complex ", "SLC-")
      .replace("Launch Complex ", "LC-");
    const where = [loc, padName].filter(Boolean).join(" · ");
    const go = /go for launch|in flight|hold/i.test(statusName);
    const statusAbbrev = row.status?.abbrev || "";
    return {
      id: `ll-${row.id}`,
      title: row.name.replace(/^Falcon 9 Block 5 \| /, "Falcon 9 · ").replace(/^Falcon Heavy \| /, "Falcon Heavy · "),
      start: net,
      group: "spacex",
      where,
      note: "",
      href: row.url || "https://ll.thespacedevs.com",
      status: go ? "go" : statusAbbrev.toLowerCase() === "tbd" ? "tbd" : "net",
      precision: /go|hold|in flight/i.test(statusName) ? "datetime" : "day",
      source: "ll2",
    };
  }

  function mergeEvents(liveLaunches) {
    const live = (liveLaunches || []).map(mapLaunch).filter(Boolean);
    const liveKeys = new Set(live.map((e) => launchKey(e.title)));
    const curated = CURATED.filter((e) => {
      if (e.source === "fallback" && liveKeys.has(launchKey(e.title))) return false;
      if (e.id === "starship-f15" && live.some((l) => /starship.*flight 15|flight 15/i.test(l.title))) return false;
      return true;
    });
    return [...curated, ...live].sort((a, b) => parseStart(a.start) - parseStart(b.start) || a.title.localeCompare(b.title));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderRow(event, now) {
    const row = el("article", `cal-row cal-${event.group}`);
    const when = el("div", "cal-when");
    when.append(el("strong", "", formatWhen(event, now)));
    const until = formatUntil(event, now);
    if (until) when.append(el("span", "", until));
    const body = el("div", "cal-body");
    body.append(el("p", "eyebrow", GROUPS[event.group] || event.group));
    const title = event.href ? el("a", "cal-title", event.title) : el("h3", "cal-title", event.title);
    if (event.href) {
      title.href = event.href;
      if (/^https?:/.test(event.href)) {
        title.target = "_blank";
        title.rel = "noopener noreferrer";
      }
    }
    body.append(title);
    if (event.where) body.append(el("p", "cal-where", event.where));
    if (event.note) body.append(el("p", "cal-note", event.note));
    const stamp = el("span", `cal-status is-${event.status}`, event.status === "go" ? "Go" : event.status);
    row.append(when, body, stamp);
    return row;
  }

  function renderList(root, events, now, emptyCopy) {
    root.replaceChildren();
    if (!events.length) {
      root.append(el("p", "cal-empty", emptyCopy || "Nothing in this slice."));
      return;
    }
    events.forEach((event) => root.append(renderRow(event, now)));
  }

  function bindFilters(nav, onChange) {
    if (!nav) return;
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cal-filter]");
      if (!btn) return;
      nav.querySelectorAll("[data-cal-filter]").forEach((elBtn) => {
        elBtn.classList.toggle("is-on", elBtn === btn);
      });
      onChange(btn.getAttribute("data-cal-filter"));
    });
  }

  async function fetchLaunches() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(LL2, { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      return Array.isArray(data.results) ? data.results : [];
    } finally {
      clearTimeout(timer);
    }
  }

  async function boot() {
    const list = document.querySelector("[data-calendar-list]");
    const preview = document.querySelector("[data-calendar-next]");
    const watch = document.querySelector("[data-calendar-watch]");
    const status = document.querySelector("[data-calendar-status]");
    const filters = document.querySelector("[data-calendar-filters]");
    const earnings = document.querySelector("[data-tsla-earnings]");
    const nextTesla = document.querySelector("[data-tsla-next]");
    if (!list && !preview && !earnings && !nextTesla) return;

    const now = new Date();
    let events = mergeEvents([]);
    let filter = "all";

    const paint = () => {
      const upcoming = events.filter((e) => isUpcoming(e, now));
      if (list) {
        const slice = filter === "all" ? upcoming : upcoming.filter((e) => e.group === filter);
        renderList(
          list,
          slice,
          now,
          filter === "xai" ? "Grok ships sit under No date yet until xAI puts a clock on them." : "Nothing in this slice."
        );
      }
      if (preview) {
        renderList(preview, upcoming.slice(0, 5), now);
      }
      if (nextTesla) {
        const tesla =
          upcoming.find((e) => e.id === "tesla-q3-2026-earnings") ||
          upcoming.find((e) => e.group === "tesla");
        if (tesla) {
          nextTesla.textContent = `${tesla.title} · ${formatWhen(tesla, now)}`;
        }
      }
      if (earnings) {
        const call = upcoming.find((e) => e.id === "tesla-q3-2026-earnings") || upcoming.find((e) => e.group === "tesla");
        if (call) {
          earnings.textContent = `${formatWhen(call, now)} · ${formatUntil(call, now)}`;
        }
      }
    };

    paint();

    if (watch) {
      watch.replaceChildren();
      WATCHING.forEach((item) => {
        const row = el("article", `cal-row cal-${item.group} is-watch`);
        const when = el("div", "cal-when");
        when.append(el("strong", "", "No date"));
        when.append(el("span", "", "Watching"));
        const body = el("div", "cal-body");
        body.append(el("p", "eyebrow", GROUPS[item.group] || item.group));
        body.append(el("h3", "cal-title", item.title));
        body.append(el("p", "cal-note", item.note));
        row.append(when, body, el("span", "cal-status is-watching", "TBA"));
        watch.append(row);
      });
    }

    bindFilters(filters, (next) => {
      filter = next;
      paint();
    });

    try {
      const live = await fetchLaunches();
      events = mergeEvents(live);
      paint();
      if (status) {
        status.textContent = `Falcon dates from Launch Library 2 · ${now.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
      }
    } catch {
      if (status) {
        status.textContent = "Launch Library did not load. Showing the last known Falcon slate plus curated dates.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
