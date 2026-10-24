(() => {
  "use strict";
  const root = document.getElementById("cs-app"), M = window.SDCalendarStudio, V = window.SDCalendarView;
  if (!root || !M || !V) return;
  let data;
  try {
    data = JSON.parse(document.getElementById("cs-data").textContent);
    if (data.version !== 1 || !Array.isArray(data.events) || !data.events.length) return;
  } catch {
    return;
  }
  const KEY = "sd-calendar-studio-v1";
  let raw = {}, storage = true;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    storage = false;
  }
  let state = M.preferences(raw), now = () => /* @__PURE__ */ new Date(), local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  state.zone = M.zone(raw.zone || local || "UTC");
  state.month = M.today(now(), state.zone).slice(0, 7);
  state.selected = M.today(now(), state.zone);
  const $ = (id) => document.getElementById(id), dialog = $("cs-dialog");
  let sourceFailed = false;
  let lastOpener = null, current = null;
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ view: state.view, zone: state.zone, group: state.group, range: state.range, saved: state.saved }));
    } catch {
      storage = false;
    }
    $("cs-storage").textContent = storage ? "Stars and preferences are saved on this browser." : "Browser storage is unavailable. Stars and preferences last only for this visit.";
  }
  function fresh(failed = sourceFailed) {
    const age = Date.now() - Date.parse(data.launchChecked), stale = !Number.isFinite(age) || age > 3 * 36e5;
    const text = Number.isFinite(age) ? new Intl.DateTimeFormat("en-GB", { timeZone: state.zone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(data.launchChecked)) : "unknown";
    $("cs-freshness").textContent = (failed ? "Using the saved page · " : stale ? "Older launch snapshot · " : "Launch source checked · ") + text + ". Hourly refresh; targets may change.";
    $("cs-freshness").classList.toggle("cs-stale", stale || failed);
  }
  function syncControls() {
    for (const key of ["group", "range", "category", "zone"]) $("cs-" + key).value = state[key];
    $("cs-search").value = state.query;
  }
  function draw() {
    const rows = M.filter(data.events, state, now());
    const visibleCount = state.view === "month" ? M.exportRows(data.events, state, now()).length : rows.length;
    $("cs-results").innerHTML = state.view === "month" ? V.month(rows, state, now()) : V.list(rows, state, now());
    root.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === state.view));
    $("cs-saved-count").textContent = state.saved.length;
    $("cs-result-count").textContent = (state.view === "planning" ? "Planning board · " : state.view === "saved" ? "Your shortlist · " : state.view === "month" ? "Dated schedule · " : "Agenda · ") + visibleCount + " " + (visibleCount === 1 ? "event" : "events") + (state.view === "planning" ? " · no firm day yet" : "");
    $("cs-range-label").hidden = state.view !== "agenda";
    $("cs-export").disabled = !M.exportRows(data.events, state, now()).length;
    $("cs-export").textContent = state.view === "planning" ? "Firm dates needed for export" : "Download this view ↓";
    persist();
    fresh();
  }
  function announce(text) {
    $("cs-message").textContent = text;
  }
  function save(id) {
    state.saved = state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id].slice(-200);
    draw();
    if (current === id) updateSave();
    announce(state.saved.includes(id) ? "Event saved to your shortlist." : "Event removed from your shortlist.");
  }
  function updateSave() {
    const b = $("cs-dialog-save"), yes = state.saved.includes(current);
    b.setAttribute("aria-pressed", yes);
    b.textContent = yes ? "★ Saved — remove" : "☆ Save event";
  }
  function download(events, name = "supercharged-daily.ics") {
    const valid = events.filter(M.dated);
    if (!valid.length) return announce("These events need a firm date before they can be exported.");
    const blob = new Blob([M.calendar(valid, data.launchChecked)], { type: "text/calendar;charset=utf-8" }), href = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1e3);
    announce("Calendar downloaded. This is a snapshot; subscribe for future updates.");
  }
  function open(id, opener) {
    const e = data.events.find((x) => x.id === id);
    if (!e) return;
    current = id;
    $("cs-dialog-message").textContent = "";
    lastOpener = opener || document.activeElement;
    $("cs-dialog-body").innerHTML = V.detail(e, state.zone, now());
    $("cs-dialog-export").hidden = !M.dated(e);
    updateSave();
    if (!dialog.open) dialog.showModal();
    const u = new URL(location.href);
    u.searchParams.set("event", id);
    history.replaceState(null, "", u);
  }
  function close() {
    if (dialog.open) dialog.close();
    current = null;
    const u = new URL(location.href);
    u.searchParams.delete("event");
    history.replaceState(null, "", u);
    if (lastOpener?.isConnected) lastOpener.focus();
  }
  root.classList.add("cs-enhanced");
  document.body.classList.add("cs-ready");
  if (!$("cs-zone").querySelector('option[value="' + CSS.escape(state.zone) + '"]')) $("cs-zone").add(new Option(state.zone.replace(/_/g, " "), state.zone));
  syncControls();
  $("cs-hero").innerHTML = V.hero(data, state, now());
  $("cs-week").innerHTML = V.week(data, state, now());
  draw();
  root.addEventListener("click", (ev) => {
    const b = ev.target.closest("button,a");
    if (!b) return;
    if (b.matches("a") && (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0)) return;
    if (b.dataset.open) {
      ev.preventDefault();
      open(b.dataset.open, b);
    }
    if (b.dataset.save) {
      save(b.dataset.save);
      const replacement = [...root.querySelectorAll("[data-save]")].find((x) => x.dataset.save === b.dataset.save);
      replacement?.focus();
    }
    if (b.dataset.view) {
      state.view = b.dataset.view;
      draw();
    }
    if (b.dataset.day) {
      state.view = "month";
      state.selected = b.dataset.day;
      state.month = b.dataset.day.slice(0, 7);
      draw();
      $("cs-workspace").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
    if (b.dataset.date) {
      state.selected = b.dataset.date;
      if (state.month !== state.selected.slice(0, 7)) state.month = state.selected.slice(0, 7);
      draw();
      root.querySelector('[data-date="' + state.selected + '"]').focus();
    }
    if (b.dataset.month !== void 0) {
      if (b.dataset.month === "0") {
        state.selected = M.today(now(), state.zone);
        state.month = state.selected.slice(0, 7);
      } else {
        const d = /* @__PURE__ */ new Date(state.month + "-01T12:00Z");
        d.setUTCMonth(d.getUTCMonth() + Number(b.dataset.month));
        state.month = d.toISOString().slice(0, 7);
        state.selected = state.month + "-01";
      }
      draw();
      root.querySelector('[data-month="' + b.dataset.month + '"]').focus();
    }
  });
  root.addEventListener("keydown", (ev) => {
    const b = ev.target.closest("[data-date]");
    if (!b) return;
    const n = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7, Home: -(((/* @__PURE__ */ new Date(b.dataset.date + "T12:00Z")).getUTCDay() + 6) % 7), End: 6 - ((/* @__PURE__ */ new Date(b.dataset.date + "T12:00Z")).getUTCDay() + 6) % 7 }[ev.key];
    if (n === void 0) return;
    ev.preventDefault();
    state.selected = M.shiftDay(b.dataset.date, n);
    state.month = state.selected.slice(0, 7);
    draw();
    root.querySelector('[data-date="' + state.selected + '"]').focus();
  });
  for (const key of ["group", "range", "category", "zone"]) $("cs-" + key).addEventListener("change", (ev) => {
    state[key] = ev.target.value;
    if (key === "zone") {
      state.month = M.today(now(), state.zone).slice(0, 7);
      state.selected = M.today(now(), state.zone);
      $("cs-hero").innerHTML = V.hero(data, state, now());
      $("cs-week").innerHTML = V.week(data, state, now());
    }
    draw();
  });
  $("cs-search").addEventListener("input", (ev) => {
    state.query = ev.target.value;
    draw();
  });
  $("cs-clear").addEventListener("click", () => {
    state.query = "";
    state.group = "all";
    state.category = "all";
    state.range = "upcoming";
    syncControls();
    draw();
  });
  $("cs-export").addEventListener("click", () => download(M.exportRows(data.events, state, now())));
  $("cs-dialog-close").addEventListener("click", close);
  dialog.addEventListener("cancel", (ev) => {
    ev.preventDefault();
    close();
  });
  dialog.addEventListener("click", (ev) => {
    if (ev.target === dialog) close();
  });
  $("cs-dialog-save").addEventListener("click", () => save(current));
  $("cs-dialog-export").addEventListener("click", () => download(data.events.filter((e) => e.id === current), current + ".ics"));
  $("cs-dialog-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      $("cs-dialog-message").textContent = "Event link copied.";
    } catch {
      $("cs-dialog-message").textContent = "Copy the event link from your browser’s address bar.";
    }
  });
  const deep = new URL(location.href).searchParams.get("event");
  if (deep) open(deep);
  fetch("/data/calendar-studio.json", { signal: AbortSignal.timeout(8e3) }).then((r) => {
    if (!r.ok) throw Error("Snapshot unavailable");
    return r.json();
  }).then((next) => {
    if (next.version !== 1 || !Array.isArray(next.events) || !next.events.length || next.events.some((e) => !e.id || !e.title || !Array.isArray(e.sources))) throw Error("Invalid snapshot");
    if (Date.parse(next.launchChecked) < Date.parse(data.launchChecked)) throw Error("Older snapshot");
    data = next;
    draw();
    $("cs-hero").innerHTML = V.hero(data, state, now());
    $("cs-week").innerHTML = V.week(data, state, now());
    if (current) open(current, lastOpener);
  }).catch(() => {
    sourceFailed = true;
    fresh();
  });
})();
