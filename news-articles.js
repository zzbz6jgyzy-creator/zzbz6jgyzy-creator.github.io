/* Supercharged Daily — News page: our own Dispatch articles, from /data/articles.json
   (format documented in scripts/build-articles.py and data/README.md). Any card on
   /dispatch.html not yet in the JSON is merged in too, so a new post shows at once. */
(() => {
  const root = document.querySelector("[data-articles]");
  if (!root) return;
  const PAGE = 24;
  const TOPICS = { tesla: "Tesla", spacex: "SpaceX", xai: "xAI", x: "X" };
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lead = root.querySelector("[data-art-lead]"), list = root.querySelector("[data-art-list]"),
    more = root.querySelector("[data-art-more]"), chips = root.querySelector("[data-art-filters]"), count = root.querySelector("[data-art-count]");
  let all = [], topic = "all", shown = PAGE;

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const groupLabel = (d) => {
    const now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (dayKey(d) === dayKey(now)) return "Today";
    if (dayKey(d) === dayKey(y)) return "Yesterday";
    const o = { weekday: "long", day: "numeric", month: "long" };
    if (d.getFullYear() !== now.getFullYear()) o.year = "numeric";
    return new Intl.DateTimeFormat(undefined, o).format(d);
  };
  const time = (d) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  const card = (a) => `<a class="art-card art-${esc(a.topic)}" href="${esc(a.url)}">
      <div class="art-media">${a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy" decoding="async" />` : ""}</div>
      <div class="art-copy"><p class="art-meta"><span class="art-tag">${esc(a.tag || TOPICS[a.topic] || "Dispatch")}</span><time datetime="${esc(a.date)}">${esc(time(new Date(a.date)))}</time></p>
      <h3>${esc(a.title)}</h3>${a.summary ? `<p>${esc(a.summary)}</p>` : ""}</div></a>`;

  // Signup box lives inside the story list as a full-width break after the first row.
  const nl = document.getElementById("newsletter"), nlSec = nl && nl.closest("section");
  if (nl) { nl.classList.add("art-nl"); if (nlSec) nlSec.hidden = true; } // stays in the DOM so grow.js/newsletter-cta see it
  function placeNl() {
    if (!nl) return;
    const cards = list.querySelectorAll(".art-grid > *");
    let n = 3;
    if (!matchMedia("(max-width:720px)").matches) {
      const g = list.querySelector(".art-grid");
      const cols = g ? getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length : 3;
      n = Math.max(3, Math.min(4, cols));
    }
    const after = cards[Math.min(n, cards.length) - 1];
    if (after) after.after(nl); else list.append(nl);
  }
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(placeNl, 150); });
  function render() {
    if (nl && nlSec && list.contains(nl)) nlSec.append(nl);
    const pool = all.filter((a) => topic === "all" || a.topic === topic);
    const L = pool.find((a) => a.pinned) || pool[0];
    if (!L) { lead.innerHTML = ""; list.innerHTML = '<p class="art-empty">No stories in this topic yet.</p>'; more.hidden = true; placeNl(); return; }
    const d = new Date(L.date);
    lead.innerHTML = `<a class="art-lead art-${esc(L.topic)}" href="${esc(L.url)}">
      <div class="art-lead-media">${L.image ? `<img src="${esc(L.image)}" alt="" decoding="async" fetchpriority="high" />` : ""}</div>
      <div class="art-lead-copy"><p class="art-meta"><span class="art-tag">${esc(L.tag || TOPICS[L.topic])}</span><span>Latest</span><time datetime="${esc(L.date)}">${esc(groupLabel(d))} · ${esc(time(d))}</time></p>
      <h2>${esc(L.title)}</h2>${L.summary ? `<p>${esc(L.summary)}</p>` : ""}<span class="art-read">Read the story →</span></div></a>`;
    const rest = pool.filter((a) => a !== L), page = rest.slice(0, shown);
    let html = "", g = null;
    page.forEach((a) => {
      const label = groupLabel(new Date(a.date));
      if (label !== g) { if (g !== null) html += "</div>"; g = label; html += `<h3 class="art-day">${esc(label)}</h3><div class="art-grid">`; }
      html += card(a);
    });
    if (g !== null) html += "</div>";
    list.innerHTML = html;
    placeNl();
    more.hidden = rest.length <= shown;
    if (count) count.textContent = `${pool.length} ${pool.length === 1 ? "story" : "stories"}`;
  }

  chips.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-art-filter]"); if (!b) return;
    topic = b.dataset.artFilter; shown = PAGE;
    chips.querySelectorAll("button").forEach((x) => x.classList.toggle("is-on", x === b));
    render();
  });
  more.addEventListener("click", () => { shown += PAGE; render(); });

  const fromDispatch = () => fetch("/dispatch.html", { cache: "no-cache" }).then((r) => r.text()).then((h) => {
    const doc = new DOMParser().parseFromString(h, "text/html");
    return [...doc.querySelectorAll("a.story-card[href^='/dispatch/']")].map((a) => {
      const v = a.querySelector("video"), i = a.querySelector("img"), tg = a.querySelector(".tag");
      const tag = tg ? tg.textContent.trim() : "Dispatch", title = ((a.querySelector("h3") || {}).textContent || "").trim();
      const s = (tag + " " + title).toLowerCase();
      return { url: a.getAttribute("href"), title, tag, summary: ((a.querySelector(".story-copy p") || {}).textContent || "").trim(),
        image: (v && v.getAttribute("poster")) || (i && i.getAttribute("src")) || "",
        topic: /\bgrok\b|\bxai\b/.test(s) ? "xai" : tg && tg.className.includes("spacex") ? "spacex" : "tesla" };
    }).filter((c) => c.title);
  }).catch(() => []);

  Promise.all([
    fetch("/data/articles.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : { articles: [] })).catch(() => ({ articles: [] })),
    fromDispatch(),
  ]).then(([j, cards]) => {
    const known = new Set((j.articles || []).map((a) => a.url)), now = new Date().toISOString();
    const extra = cards.filter((c, k, arr) => !known.has(c.url) && arr.findIndex((x) => x.url === c.url) === k).map((c) => ({ ...c, date: now }));
    all = extra.concat(j.articles || []).filter((a) => a.url && a.title && !isNaN(new Date(a.date)))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    render();
  });
})();
