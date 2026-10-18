(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDay = (d, o) => new Intl.DateTimeFormat(undefined, o || { day: "numeric", month: "short" }).format(d);
  const t = $("[data-hv-today]"); if (t) t.textContent = fmtDay(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Lead + supporting stories: newest cards on /dispatch.html (newest first), so new Dispatch posts show up automatically
  const pinP = fetch("/data/articles.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  Promise.all([fetch("/dispatch.html", { cache: "no-cache" }).then((r) => r.text()), pinP]).then(([html, aj]) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const cards = [...doc.querySelectorAll("a.story-card[href^='/dispatch/']")].map((a) => {
      const v = a.querySelector("video"), i = a.querySelector("img");
      return {
        href: a.getAttribute("href"),
        img: (v && (v.getAttribute("poster") || v.getAttribute("data-poster"))) || (i && i.getAttribute("src")) || "",
        tag: (a.querySelector(".tag") || {}).textContent || "Dispatch",
        h: (a.querySelector("h3") || {}).textContent || "",
        p: (a.querySelector(".story-copy p") || {}).textContent || "",
      };
    }).filter((c, k, arr) => c.h && arr.findIndex((x) => x.href === c.href) === k);
    // Pinned lead (data/articles.json pinned + pinUntil) beats the newest card until it expires
    const pin = aj && (aj.articles || []).find((a) => a.pinned && (!a.pinUntil || Date.parse(a.pinUntil) > Date.now()));
    if (pin) {
      const i = cards.findIndex((c) => c.href === pin.url);
      cards.unshift(i >= 0 ? cards.splice(i, 1)[0] : { href: pin.url, img: pin.image || "", tag: pin.tag || "Dispatch", h: pin.title, p: pin.summary || "" });
    }
    if (!cards.length) return;
    const L = cards[0], el = $("[data-hv-lead]");
    el.href = L.href; $("[data-hv-tag]").textContent = L.tag.trim(); $("[data-hv-h]").textContent = L.h.trim(); $("[data-hv-p]").textContent = L.p.trim();
    // Lead image: card image, else the article's og:image / first image, else a licensed site image from another card
    const img = $("[data-hv-img]");
    const fallback = (cards.find((c) => c.img) || {}).img || "/assets/dispatch/cybercab-austin-poster.jpg";
    const setImg = (src) => { if (img.getAttribute("src") === src) return; if (img.parentNode && img.parentNode.tagName === "PICTURE") img.parentNode.querySelectorAll("source").forEach((x) => x.remove()); img.alt = L.h.trim(); img.src = src; img.onerror = () => { img.onerror = null; img.src = fallback; }; };
    if (L.img) setImg(L.img);
    else fetch(L.href, { cache: "no-cache" }).then((r) => r.text()).then((h) => {
      const d = new DOMParser().parseFromString(h, "text/html");
      const og = d.querySelector('meta[property="og:image"]'), fi = d.querySelector("main img[src], article img[src]");
      setImg((og && og.getAttribute("content")) || (fi && fi.getAttribute("src")) || fallback);
    }).catch(() => setImg(fallback));
    $("[data-hv-supp]").innerHTML = cards.slice(1, 4).map((c) =>
      `<a class="hv-s" href="${esc(c.href)}">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" />` : ""}<div><span class="hv-tag">${esc(c.tag.trim())}</span><h3>${esc(c.h.trim())}</h3></div></a>`).join("");
  }).catch(() => {});

  // Trackers strip, read from each tracker's own data file
  const trk = [];
  const S = window.STARSHIP, F = window.FSD_EUROPE, C = window.CYBERCAB;
  const starship = () => {
    if (!(S && S.next)) return null;
    const d = new Date(S.next.start);
    return { href: "/starship.html", k: "Starship", v: "Flight " + S.next.flight, s: (S.next.precision === "day" ? "NET " : "") + fmtDay(d, { day: "numeric", month: "short", timeZone: S.next.precision === "day" ? "UTC" : undefined }) + " · " + (S.next.headline || "") };
  };
  const st0 = starship(); if (st0) trk.push(st0);
  if (F && F.countries) {
    const ok = F.countries.filter((c) => c.status === "approved");
    const pop = ok.reduce((a, c) => a + (c.pop || 0), 0), pct = F.thresholds ? Math.round((pop / F.thresholds.euPopulationM) * 100) : 0;
    trk.push({ href: "/fsd-europe.html", k: "FSD Europe", v: ok.length + " / " + (F.thresholds ? F.thresholds.statesNeeded : 15), s: "states recognise RDW approval · " + pct + "% of EU pop. (need " + (F.thresholds ? F.thresholds.populationNeeded : 65) + "%)" });
  }
  if (C && C.stats && C.stats[0]) trk.push({ href: "/cybercab.html", k: "Cybercab", v: C.stats[0].value, s: C.stats[0].label });
  const paint = () => { $("[data-hv-trk]").innerHTML = trk.map((x) => `<a class="hv-t" href="${x.href}"><span class="hv-t-k">${esc(x.k)}</span><strong>${esc(x.v)}</strong><span class="hv-t-s">${esc(x.s)}</span></a>`).join(""); };
  paint();
  // Shared dates (/data/events.json) override the starship-data.js fallback
  const evReady = fetch("/data/events.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    const ev = j && j.events && j.events["starship-flight-" + (S && S.next ? S.next.flight : "")];
    if (ev && ev.date && S && S.next) {
      S.next.start = ev.date + "T00:00:00Z"; if (ev.precision) S.next.precision = ev.precision;
      const i = trk.findIndex((x) => x.k === "Starship"), n = starship();
      if (n) { if (i >= 0) trk[i] = n; else trk.unshift(n); paint(); }
    }
  }).catch(() => {});
  fetch("/updates-live.json", { cache: "no-cache" }).then((r) => r.json()).then((u) => {
    const v = (u.versions || []).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
    const newest = (u.versions || []).filter((x) => x.count > 0).sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || ""))[0];
    if (!newest) return;
    trk.push({ href: "/updates.html", k: "Software updates", v: newest.id, s: "newest build reporting · most common: " + (v[0] ? v[0].id + " (" + v[0].percent + "%)" : "—") + " · Teslascope" });
    paint();
  }).catch(() => {});

  // Headlines feed
  fetch("/news-data.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    const seen = new Set(), lab = { tesla: "Tesla", spacex: "SpaceX", grok: "xAI", xai: "xAI", x: "X" };
    const items = (d.items || []).filter((it) => { const k = (it.title || "").toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return /^https:\/\//.test(it.url || ""); }).slice(0, 8);
    const ago = (s) => { const m = Math.round((Date.now() - new Date(s)) / 6e4); return m < 60 ? m + "m" : m < 1440 ? Math.round(m / 60) + "h" : Math.round(m / 1440) + "d"; };
    $("[data-hv-feed]").innerHTML = items.map((it) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="hv-f-t">${esc(lab[it.topic] || "News")}</span><span class="hv-f-h">${esc((it.title || "").replace(/\s+-\s+[^-]+$/, ""))}<span class="hv-f-ext" aria-hidden="true"> ↗</span></span><span class="hv-f-m">${esc(it.source || "")} · ${ago(it.published)}</span></a></li>`).join("");
  }).catch(() => {});

  // Countdowns: upcoming livestreams (live-data.json) + next Starship flight, shown in the visitor's own zone
  const cd = $("[data-hv-cd]"), rows = [];
  const draw = () => {
    const now = Date.now();
    cd.innerHTML = rows.filter((r) => r.t > now).sort((a, b) => a.t - b.t).slice(0, 4).map((r) => {
      const s = Math.max(0, (r.t - now) / 1e3), dd = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60);
      const when = r.day ? "NET " + fmtDay(new Date(r.t), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : fmtDay(new Date(r.t), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
      return `<a class="hv-c" href="${r.href}"><span class="hv-c-n">${esc(r.title)}</span><span class="hv-c-w">${esc(when)}</span><span class="hv-c-t">${r.day ? "~" + dd + "d" : (dd ? dd + "d " : "") + hh + "h " + String(mm).padStart(2, "0") + "m"}</span></a>`;
    }).join("") || '<p class="hv-c-none">No dated events right now.</p>';
  };
  evReady.then(() => { if (S && S.next) rows.push({ title: "Starship Flight " + S.next.flight, t: new Date(S.next.start).getTime(), day: S.next.precision === "day", href: "/starship.html" });
  fetch("/live-data.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    (d.events || []).forEach((e) => { if (e.status !== "ended" && e.start && !rows.some((r) => norm(r.title) === norm(e.title))) rows.push({ title: e.title, t: new Date(e.start).getTime(), href: e.url || e.href || "/calendar.html" }); });
  }).catch(() => {}).finally(() => { draw(); setInterval(draw, 30000); });
  });
})();

// Major-event countdown: any data/events.json entry with "major": true starting within 7 days.
// Hides 30 min before start (live.js shows the Live now card from then) or if live-data says live/ended.
(() => {
  const slot = document.querySelector("[data-major-slot]"); if (!slot) return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const qs = new URLSearchParams(location.search);
  Promise.all([
    fetch("/data/events.json", { cache: "no-cache" }).then((r) => r.json()),
    fetch(qs.get("livedata") || "/live-data.json", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
  ]).then(([j, ld]) => {
    const live = {}; (ld.events || []).forEach((e) => { live[e.id] = e; });
    const list = Object.entries(j.events || {}).filter(([, e]) => e.major).map(([id, e]) => {
      const day = !e.start && e.precision === "day";
      const t = new Date(e.start || (e.date + "T" + (e.time || "00:00") + ":00" + (e.tz || "Z"))).getTime();
      return { id, e, t, day };
    });
    const tick = () => {
      const now = Date.now();
      const show = list.filter((m) => {
        const l = live[m.id];
        if (l && (l.status === "live" || l.status === "ended")) return false;
        return m.t - now > 30 * 6e4 && m.t - now <= 7 * 864e5;
      }).sort((a, b) => a.t - b.t).slice(0, 2);
      slot.innerHTML = show.map((m) => {
        const s = Math.max(0, (m.t - now) / 1e3), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), mi = Math.floor((s % 3600) / 60), se = Math.floor(s % 60);
        const when = m.day ? "NET " + new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(m.t))
          : new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(m.t));
        const box = (v, l) => `<span class="mj-b"><strong>${String(v).padStart(2, "0")}</strong><small>${l}</small></span>`;
        return `<a class="mj" href="${esc(m.e.href || "/calendar.html")}"><span class="mj-eb"><i></i>Countdown · big event</span><span class="mj-t">${esc(m.e.title)}</span><span class="mj-w">${esc(when)}</span><span class="mj-c">${box(d, "days")}${box(h, "hrs")}${box(mi, "mins")}${box(se, "secs")}</span></a>`;
      }).join("");
    };
    tick(); setInterval(tick, 1000);
  }).catch(() => {});
})();
