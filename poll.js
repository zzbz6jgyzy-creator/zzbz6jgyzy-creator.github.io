// Weekly TSLA poll. Votes are counted by Abacus (abacus.jasoncameron.dev),
// a free, no-key public counter. One vote per browser (localStorage), so it's
// a fun reader poll, not a scientific one. Keys roll over each ISO week.
(() => {
  const root = document.querySelector("[data-tsla-poll]"); if (!root) return;
  const API = "https://abacus.jasoncameron.dev";
  const NS = "superchargeddaily";
  const now = new Date();
  const t = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
  const week = `${t.getUTCFullYear()}-w${String(wk).padStart(2, "0")}`;
  const key = (c) => `tsla-${week}-${c}`;
  const store = `sd-poll-${week}`;
  const status = root.querySelector("[data-poll-status]");
  const btns = root.querySelectorAll("[data-vote]");
  const get = (c) => fetch(`${API}/get/${NS}/${key(c)}`).then((r) => r.ok ? r.json() : { value: 0 }).then((j) => j.value || 0).catch(() => null);
  const show = (up, down, mine) => {
    if (up === null || down === null) { status.textContent = "Couldn’t load the vote count right now."; return; }
    const tot = up + down, pu = tot ? Math.round((up / tot) * 100) : 0;
    root.querySelector("[data-bar-up]").style.width = (tot ? pu : 50) + "%";
    root.querySelector("[data-pct-up]").textContent = tot ? pu + "%" : "–";
    root.querySelector("[data-pct-down]").textContent = tot ? 100 - pu + "%" : "–";
    status.textContent = `${tot} vote${tot === 1 ? "" : "s"} this week` + (mine ? ` · you said ${mine}` : "") + ". Result revealed in Sunday’s newsletter.";
  };
  const refresh = (mine) => Promise.all([get("up"), get("down")]).then(([u, d]) => show(u, d, mine));
  const voted = localStorage.getItem(store);
  if (voted) { root.classList.add("is-voted"); btns.forEach((b) => (b.disabled = true)); }
  refresh(voted);
  btns.forEach((b) => b.addEventListener("click", () => {
    const c = b.dataset.vote; if (localStorage.getItem(store)) return;
    btns.forEach((x) => (x.disabled = true));
    fetch(`${API}/hit/${NS}/${key(c)}`).then((r) => { if (!r.ok) throw 0; localStorage.setItem(store, c); root.classList.add("is-voted"); refresh(c); })
      .catch(() => { btns.forEach((x) => (x.disabled = false)); status.textContent = "Vote didn’t go through. Try again."; });
  }));
})();
