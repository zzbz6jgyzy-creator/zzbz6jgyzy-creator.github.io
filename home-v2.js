(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDay = (d, o) => new Intl.DateTimeFormat(undefined, o || { day: "numeric", month: "short" }).format(d);
  const t = $("[data-hv-today]"); if (t) t.textContent = fmtDay(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Lead + supporting stories: newest cards on /dispatch.html (newest first), so new Dispatch posts show up automatically
  fetch("/dispatch.html", { cache: "no-cache" }).then((r) => r.text()).then((html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const cards = [...doc.querySelectorAll("a.story-card[href^='/dispatch/']")].map((a) => {
      const v = a.querySelector("video"), i = a.querySelector("img");
      return {
        href: a.getAttribute("href"),
        img: (v && v.getAttribute("poster")) || (i && i.getAttribute("src")) || "",
        tag: (a.querySelector(".tag") || {}).textContent || "Dispatch",
        h: (a.querySelector("h3") || {}).textContent || "",
        p: (a.querySelector(".story-copy p") || {}).textContent || "",
      };
    }).filter((c, k, arr) => c.h && arr.findIndex((x) => x.href === c.href) === k);
    if (!cards.length) return;
    const L = cards[0], el = $("[data-hv-lead]");
    el.href = L.href; $("[data-hv-tag]").textContent = L.tag.trim(); $("[data-hv-h]").textContent = L.h.trim(); $("[data-hv-p]").textContent = L.p.trim();
    // Lead image: card image, else the article's og:image / first image, else a licensed site image from another card
    const img = $("[data-hv-img]");
    const fallback = (cards.find((c) => c.img) || {}).img || "/assets/dispatch/cybercab-austin-poster.jpg";
    const setImg = (src) => { img.src = src; img.onerror = () => { img.onerror = null; img.src = fallback; }; };
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
    $("[data-hv-feed]").innerHTML = items.map((it) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="hv-f-t">${esc(lab[it.topic] || "News")}</span><span class="hv-f-h">${esc((it.title || "").replace(/\s+-\s+[^-]+$/, ""))}</span><span class="hv-f-m">${esc(it.source || "")} · ${ago(it.published)}</span></a></li>`).join("");
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
    (d.events || []).forEach((e) => { if (e.status !== "ended" && e.start) rows.push({ title: e.title, t: new Date(e.start).getTime(), href: "/calendar.html" }); });
  }).catch(() => {}).finally(() => { draw(); setInterval(draw, 30000); });
  });
})();
