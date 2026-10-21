(() => {
  const LL2 =
    "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?lsp__name=SpaceX&limit=16";

  const GROUPS = {
    tesla: "Tesla",
    spacex: "SpaceX",
    xai: "xAI",
  };

  const CURATED = [
    {
      id: "tesla-roadster-unveil-2026",
      title: "Tesla Roadster reveal",
      start: "2026-10-16T00:55:00Z",
      end: "2026-10-16T01:26:00Z",
      featured: false,
      image: "/assets/live/roadster.jpg",
      imageCredit: "2020 Roadster prototype · Photo: Smnt, Wikimedia Commons, CC BY-SA 4.0",
      group: "tesla",
      where: "SpaceX test site, McGregor, Texas · replay on YouTube and X",
      note: "Past event. Tesla revealed the next-generation Roadster live on 15 Oct (01:55 on 16 Oct Irish time); the stream ran about 30 minutes. Read what happened and watch the full replay on the Dispatch.",
      href: "/dispatch/roadster-reveal-2026.html",
      status: "done",
      precision: "datetime",
    },
    {
      id: "spacex-q3-2026-earnings",
      title: "SpaceX Q3 earnings",
      start: "2026-10-20T20:30:00Z",
      group: "spacex",
      where: "Audio-only webcast · 3:30 p.m. CT / 4:30 p.m. ET · also on X @SpaceX",
      note: "Past event. SpaceX reported Q3 2026 revenue of $14.58B and net income of $4.40B. Replay on ir.spacex.com; read the write-up on the Dispatch.",
      href: "/dispatch/spacex-q3-2026-results.html",
      status: "done",
      precision: "datetime",
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
      id: "starship-f15",
      title: "Starship Flight 15",
      start: "2026-11-08T12:00:00Z",
      group: "spacex",
      where: "Starbase · Pad 2",
      note: "FAA planning target NET 8 Nov — SpaceX has not set an official time. On the 20 Oct earnings call Musk said SpaceX expects it next month and will try to catch both the booster and the ship.",
      href: "https://www.spacex.com/launches/starship-flight-15",
      status: "net",
      precision: "day",
      source: "curated",
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
      start: "2026-10-10T10:31:25Z",
      note: "Launched 10 Oct — SpaceX confirmed the fourth SDA Tranche 1 transport launch on X.",
      group: "spacex",
      where: "Vandenberg · SLC-4E",
      href: "https://x.com/SpaceX/status/2108867994206216214",
      status: "done",
      precision: "day",
      source: "fallback",
    },
    {
      id: "ll-starlink-15-25",
      title: "Falcon 9 · Starlink Group 15-25",
      start: "2026-10-13T02:31:16Z",
      note: "Launched 13 Oct (UTC) — SpaceX confirmed 27 Starlink satellites from California on X.",
      group: "spacex",
      where: "Vandenberg · SLC-4E",
      href: "https://x.com/SpaceX/status/2109834323989774835",
      status: "done",
      precision: "day",
      source: "fallback",
    },
    {
      id: "ll-crs-35",
      title: "Falcon 9 · Dragon CRS-2 SpX-35",
      start: "2026-10-13T12:56:56Z",
      note: "Launched 13 Oct — SpaceX confirmed the CRS-35 launch on X; Dragon docked on 15 Oct.",
      group: "spacex",
      where: "Cape Canaveral · SLC-40",
      href: "https://x.com/SpaceX/status/2109991777361101135",
      status: "done",
      precision: "day",
      source: "fallback",
    },
    {
      id: "crs35-docking",
      title: "Dragon · CRS-35 docked with the ISS",
      start: "2026-10-15T14:27:00Z",
      group: "spacex",
      where: "ISS · Harmony zenith",
      note: "Docked 10:27 a.m. EDT (14:27 UTC) to Harmony’s space-facing port — about 30 minutes early. NASA space station blog.",
      href: "https://blogs.nasa.gov/spacestation/2026/10/15/spacex-dragon-docks-with-science-supplies-and-roll-out-solar-arrays/",
      status: "done",
      precision: "datetime",
      source: "curated",
    },
    {
      id: "ll-ussf-481",
      title: "Falcon 9 · USSF-481",
      start: "2026-10-16T05:08:15Z",
      group: "spacex",
      where: "Vandenberg · SLC-4E",
      note: "Launched — SpaceX confirmed USSF-481 to orbit from SLC-4E on X.",
      href: "https://x.com/SpaceX/status/2110960995703341477",
      status: "done",
      precision: "day",
      source: "curated",
    },
    {
      id: "spcx-q3-lockup-release",
      title: "SpaceX lock-up release · up to 1.3B shares",
      start: "2026-10-22T12:00:00Z",
      group: "spacex",
      where: "Nasdaq · SPCX",
      note: "Second full trading day after Q3 results: up to 1.3 billion shares (28% of the 180-day pool) can be sold, per SpaceX's prospectus.",
      href: "/dispatch/musk-earnings-week-q3-2026.html",
      status: "confirmed",
      precision: "day",
      source: "curated",
    },
    {
      id: "ll-bandwagon-5",
      title: "Falcon 9 · Bandwagon-5",
      start: "2026-10-20T10:30:00Z",
      group: "spacex",
      where: "Cape Canaveral · SLC-40",
      note: "NET Tue 20 Oct (moved from Mon for recovery weather). Window opens 6:30 a.m. ET; backup Wed 21 Oct. Rideshare with Varda W-7 and SpaceX's second Starfall demo.",
      href: "/dispatch/bandwagon5-starfall-second-demo.html",
      status: "go",
      precision: "datetime",
      source: "curated",
    },
    {
      id: "starship-f14",
      title: "Starship Flight 14",
      start: "2026-09-28T12:00:00Z",
      group: "spacex",
      where: "Starbase · OLP-2",
      note: "Flown 28 Sep. Starship flight log: first orbit and 26 Starlink V3. Not live telemetry.",
      href: "https://www.spacex.com/launches/starship-flight-14",
      status: "done",
      precision: "day",
      source: "curated",
    },
    {
      id: "starship-f13",
      title: "Starship Flight 13",
      start: "2026-07-24T12:00:00Z",
      group: "spacex",
      where: "Starbase · OLP-2",
      note: "Flown 24 Jul. Starship flight log: first real Starlink V3s. Not live telemetry. Full read on Mission Control.",
      href: "/starship.html",
      status: "done",
      precision: "day",
      source: "curated",
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
      note: "Expected after 4.8. Still unannounced.",
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
      return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }
    if (event.precision === "day") {
      const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
      return event.status === "net" || event.status === "tbd" ? `NET ${day}` : day;
    }
    if (event.status === "net") {
      return `NET ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
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

  function isRecentPast(event, now) {
    const t = parseStart(event.start);
    if (!Number.isFinite(t)) return false;
    if (isUpcoming(event, now)) return false;
    return t > now.getTime() - 21 * 864e5;
  }

  function isArchivePast(event, now) {
    const t = parseStart(event.start);
    if (!Number.isFinite(t)) return false;
    if (isUpcoming(event, now) || isRecentPast(event, now)) return false;
    return t <= now.getTime();
  }

  function eventHay(event) {
    return [event.title, event.where, event.note, event.status, event.group, GROUPS[event.group]]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function matchQuery(event, q) {
    if (!q) return true;
    return eventHay(event).indexOf(q) !== -1;
  }

  const Merge = window.SDCalendarMerge || {
    launchKey(name) {
      return String(name || "")
        .toLowerCase()
        .replace(/falcon (9|heavy)( block 5)?/g, "")
        .replace(/\b(rideshare|mission|launch|demo)\b/g, "")
        .replace(/[^a-z0-9]+/g, "");
    },
    mergeEvents(curated, live) {
      return (curated || []).concat(live || []);
    },
  };
  const launchKey = (name) => Merge.launchKey(name);

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
      ll2Id: String(row.id),
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
    return Merge.mergeEvents(CURATED, live);
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
    const done = until === "Done" || event.status === "done";
    const stamp = el("span", `cal-status ${done ? "is-done" : "is-" + event.status}`, done ? "Done" : event.status === "go" ? "Go" : event.status);
    row.append(when, body, stamp);
    return row;
  }

  let cdTimer = 0;
  const tzShort = (d) => { try { return (new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(d).find((x) => x.type === "timeZoneName") || {}).value || ""; } catch { return ""; } };
  function renderCountdown(root, upcoming) {
    const now = Date.now();
    const feat = upcoming.filter((e) => e.featured && parseStart(e.end || e.start) > now);
    const timed = feat.concat(upcoming.filter((e) => !e.featured && e.precision === "datetime" && e.status !== "net" && parseStart(e.start) > now)).slice(0, feat.length ? 4 : 3);
    root.replaceChildren();
    const cells = timed.map((event) => {
      const card = el(event.href ? "a" : "div", `cal-next-card cal-${event.group}${event.featured ? " is-featured" : ""}`);
      if (event.featured && event.image) {
        const fig = el("figure", "cal-feat-img");
        const im = el("img"); im.src = event.image; im.alt = event.title; im.loading = "lazy"; im.decoding = "async";
        fig.append(im);
        if (event.imageCredit) fig.append(el("figcaption", "cal-feat-cr", event.imageCredit));
        card.append(fig);
      }
      if (event.href) { card.href = event.href; if (/^https?:/.test(event.href)) { card.target = "_blank"; card.rel = "noopener noreferrer"; } }
      card.append(el("span", `cal-chip chip-${event.group}`, GROUPS[event.group] || event.group), el("h3", "", event.title));
      const d = new Date(parseStart(event.start));
      const dayOnly = event.precision === "day";
      const when = el("p", "cal-next-when");
      when.append(el("span", "cal-when-txt", dayOnly
        ? new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "America/Los_Angeles" }).format(d)
        : new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(d) + " · " + new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d)),
        el("span", "cal-tz", dayOnly ? "Time TBC" : tzShort(d)));
      card.append(when);
      if (event.featured && event.note) card.append(el("p", "cal-feat-note", event.note));
      const clock = el("div", "cal-next-clock");
      const units = {};
      ["d", "h", "m", "s"].forEach((u) => {
        const tile = el("span", `cal-tile u-${u}`);
        const num = el("b", "", "--");
        tile.append(num, el("small", "", { d: "days", h: "hrs", m: "min", s: "sec" }[u]));
        clock.append(tile); units[u] = { tile, num };
      });
      card.append(clock);
      if (dayOnly) card.append(el("p", "cal-to", "Counting to the start of the day, US Pacific"));
      root.append(card);
      return { t: parseStart(event.start), clock, units, dayOnly, last: -1 };
    });
    const tick = () => {
      const n = Date.now();
      cells.forEach((c) => {
        if (c.dayOnly && c.t <= n) { c.clock.innerHTML = '<span class="cal-today">Today · start time TBC</span>'; return; }
        let s = Math.max(0, Math.floor((c.t - n) / 1000));
        const dd = Math.floor(s / 86400); s %= 86400;
        const hh = Math.floor(s / 3600); s %= 3600;
        const mm = Math.floor(s / 60); const ss = s % 60;
        c.units.d.tile.hidden = !dd;
        const sn = window.sdNum || ((e, v) => { e.textContent = v; });
        sn(c.units.d.num, String(dd)); sn(c.units.h.num, pad(hh));
        sn(c.units.m.num, pad(mm)); sn(c.units.s.num, pad(ss));
        if (c.last !== ss) { const t = c.units.s.tile; t.classList.remove("tick"); void t.offsetWidth; t.classList.add("tick"); c.last = ss; }
      });
    };
    clearInterval(cdTimer); tick(); cdTimer = setInterval(tick, 1000);
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

  const LL2_CACHE = "sd-ll2-spacex";
  async function fetchLaunches() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(LL2, { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      try { localStorage.setItem(LL2_CACHE, JSON.stringify({ t: Date.now(), results })); } catch {}
      return { results, t: Date.now(), cached: false };
    } catch (err) {
      try {
        const c = JSON.parse(localStorage.getItem(LL2_CACHE) || "null");
        if (c && Array.isArray(c.results) && Date.now() - c.t < 14 * 864e5) return { results: c.results, t: c.t, cached: true };
      } catch {}
      throw err;
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
    const countdown = document.querySelector("[data-calendar-countdown]");
    const earnings = document.querySelector("[data-tsla-earnings]");
    const nextTesla = document.querySelector("[data-tsla-next]");
    const spxEarnings = document.querySelectorAll("[data-spx-earnings]");
    if (!list && !preview && !earnings && !nextTesla && !countdown && !spxEarnings.length) return;

    const now = new Date();
    let events = mergeEvents([]);
    let filter = "all";
    let query = "";
    const search = document.querySelector("[data-calendar-search]");

    const paintWatch = () => {
      if (!watch) return;
      watch.replaceChildren();
      const slice = WATCHING.filter((item) => {
        if (filter !== "all" && item.group !== filter) return false;
        return matchQuery(item, query);
      });
      if (!slice.length) {
        watch.append(el("p", "cal-empty", query ? "No watched items match this search." : "Nothing in this slice."));
        return;
      }
      slice.forEach((item) => {
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
    };

    const paint = () => {
      const upcoming = events.filter((e) => isUpcoming(e, now));
      const recent = events
        .filter((e) => isRecentPast(e, now))
        .sort((a, b) => parseStart(b.start) - parseStart(a.start));
      const archive = events
        .filter((e) => isArchivePast(e, now))
        .sort((a, b) => parseStart(b.start) - parseStart(a.start))
        .slice(0, 12);
      if (list) {
        const pool = query ? upcoming.concat(recent, archive) : upcoming;
        const slice = pool.filter((e) => (filter === "all" || e.group === filter) && matchQuery(e, query));
        const empty = query
          ? "No events match this search."
          : filter === "xai"
            ? "Grok ships sit under No date yet until xAI puts a clock on them."
            : "Nothing in this slice.";
        renderList(list, slice, now, empty);
      }
      const recentRoot = document.querySelector("[data-calendar-recent]");
      if (recentRoot) {
        if (query) {
          recentRoot.replaceChildren();
          recentRoot.append(el("p", "cal-empty", "Matching recent flights are listed with upcoming results above."));
        } else {
          const slice = recent.filter((e) => filter === "all" || e.group === filter);
          renderList(recentRoot, slice, now, "Nothing flown in the last three weeks in this slice.");
        }
      }
      const archiveRoot = document.querySelector("[data-calendar-archive]");
      if (archiveRoot) {
        if (query) {
          archiveRoot.replaceChildren();
          archiveRoot.append(el("p", "cal-empty", "Matching earlier flights are listed with upcoming results above."));
        } else {
          const slice = archive.filter((e) => filter === "all" || e.group === filter);
          renderList(archiveRoot, slice, now, "No dated rows older than three weeks in this slice.");
        }
      }
      paintWatch();
      if (countdown) renderCountdown(countdown, upcoming);
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
      if (spxEarnings.length) {
        const spx = upcoming.find((e) => e.id === "spacex-q3-2026-earnings");
        spxEarnings.forEach((n) => {
          if (!spx) { n.textContent = "Webcast ended · replay on ir.spacex.com"; return; }
          const tz = tzShort(new Date(parseStart(spx.start)));
          n.textContent = `${formatWhen(spx, now)}${tz ? ` ${tz}` : ""} your time · ${formatUntil(spx, now)}`;
        });
      }
      if (earnings) {
        const call = upcoming.find((e) => e.id === "tesla-q3-2026-earnings") || upcoming.find((e) => e.group === "tesla");
        if (call) {
          earnings.textContent = `${formatWhen(call, now)} · ${formatUntil(call, now)}`;
        }
      }
    };

    paint();

    try {
      const r = await fetch("/data/events.json", { cache: "no-cache" });
      const j = r.ok ? await r.json() : null;
      if (j && j.events) {
        const idMap = {
          "starship-flight-15": "starship-f15",
          "ussf-481": "ll-ussf-481",
          "bandwagon-5": "ll-bandwagon-5",
          "crs35-docking": "crs35-docking",
          "tesla-q3-2026-earnings": "tesla-q3-2026-earnings",
          "spacex-q3-2026-earnings": "spacex-q3-2026-earnings",
        };
        Object.keys(j.events).forEach((eid) => {
          if (eid === "tesla-roadster-demo") return;
          const ev = j.events[eid];
          const cid = idMap[eid] || eid;
          let cur = CURATED.find((e) => e.id === cid || launchKey(e.title) === launchKey(ev.title || ""));
          if (!cur && (ev.href || ev.start || ev.date)) {
            cur = {
              id: cid,
              title: ev.title || eid,
              start: ev.start || `${ev.date}T12:00:00Z`,
              group: /tesla|earnings|roadster/i.test(ev.title || eid) ? "tesla" : "spacex",
              where: "",
              note: ev.summary || "",
              href: ev.href || "",
              status: ev.status === "done" ? "go" : (ev.status || "go"),
              precision: ev.precision || (ev.time || ev.start ? "datetime" : "day"),
              source: "curated",
            };
            CURATED.push(cur);
          }
          if (!cur) return;
          if (ev.title) cur.title = ev.title;
          if (ev.start) cur.start = ev.start;
          else if (ev.date && ev.time && ev.tz) cur.start = `${ev.date}T${ev.time}:00${ev.tz}`;
          else if (ev.date) cur.start = `${ev.date}T12:00:00Z`;
          if (ev.href) cur.href = ev.href;
          if (ev.summary) cur.note = ev.summary;
          if (ev.precision) cur.precision = ev.precision;
          if (ev.status) cur.status = ev.status;
          cur.source = "curated";
        });
        events = mergeEvents([]);
        paint();
      }
    } catch {}

    paintWatch();

    bindFilters(filters, (next) => {
      filter = next;
      paint();
    });
    if (search) {
      search.addEventListener("input", () => {
        query = String(search.value || "").trim().toLowerCase();
        paint();
      });
    }

    if (!list && !preview && !countdown) return; // hooks-only pages (e.g. SpaceX earnings line) skip Launch Library
    if (status) status.textContent = "Checking Launch Library 2…";
    try {
      const live = await fetchLaunches();
      events = mergeEvents(live.results);
      paint();
      if (status) {
        const d = new Date(live.t);
        const when = `${d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ${tzShort(d)}`.trim();
        status.textContent = live.cached
          ? `Falcon dates from Launch Library 2 · last updated ${when}`
          : `Falcon dates from Launch Library 2 · updated ${when}`;
      }
    } catch {
      if (status) {
        status.textContent = "Showing curated dates. Falcon dates from Launch Library 2 will appear when it responds.";
      }
    }
  }

  window.SDCalendar = {
    isUpcoming,
    isRecentPast,
    isArchivePast,
    RECENT_DAYS: 21,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
