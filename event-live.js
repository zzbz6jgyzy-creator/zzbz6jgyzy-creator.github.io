/* Attributes are namespaced data-ev-*: script.js rewrites any [data-count] element as a number.
   Launch-day freshness for event pages (built by scripts/build-event-pages.mjs).
   While the page is open and visible in the week around the event, it re-reads the page's own data
   every two minutes. New Updates entries appear in the log straight away, and if the start time moves
   in data/events.json the countdown follows it, with a note to reload for the rest of the page.
   The saved HTML stays the source of truth without JavaScript; this only shortens the wait for the
   rebuild. No third-party requests. */
(function () {
  var log = document.querySelector("[data-ev-log]");
  if (!log || !window.fetch || !window.JSON) return;
  var fresh = document.querySelector("[data-ev-fresh]");
  var src = log.getAttribute("data-ev-src"), id = log.getAttribute("data-ev-event");
  var start = Date.parse(log.getAttribute("data-ev-start") || ""), D = 864e5, EVERY = 12e4;
  if (!src || !id || !isFinite(start)) return;
  var timer = 0;

  function active() { var n = Date.now(); return n > start - 7 * D && n < start + 3 * D; }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function stamp(u) { return u.time || u.date || ""; }
  function day(iso) { return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)); }
  function when(u) { return u.time ? day(u.time) + ", " + new Date(u.time).toISOString().slice(11, 16) + " UTC" : day(u.date + "T12:00:00Z"); }
  function li(u) {
    var kind = String(u.kind || "");
    var source = /^https:\/\//.test(u.source || "") ? ' <a href="' + esc(u.source) + '" target="_blank" rel="noopener">Source</a>' : "";
    return '<li><time datetime="' + esc(stamp(u)) + '">' + esc(when(u)) + '</time> <span class="ev-chip ev-chip-' + esc(kind.toLowerCase()) + '">' + esc(kind) + "</span> " + esc(u.text) + source + "</li>";
  }
  var notes = {}, needReload = false;
  function say(key, text, reload) {
    if (!fresh) return;
    notes[key] = text; needReload = needReload || reload;
    fresh.querySelector("span").textContent = [notes.log, notes.time].filter(Boolean).join(" ");
    fresh.querySelector("[data-ev-reload]").hidden = !needReload;
    fresh.hidden = false;
  }
  function get(url) {
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Math.floor(Date.now() / 6e4), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function check() {
    if (document.visibilityState === "hidden" || !active()) return;
    get(src).then(function (page) {
      var ups = (page.updates || []).filter(function (u) { return u && u.text && stamp(u); })
        .sort(function (a, b) { return stamp(b).localeCompare(stamp(a)); });
      var latest = ups.length ? stamp(ups[0]) : "";
      var had = Number(log.getAttribute("data-ev-count")) || 0;
      if (latest !== log.getAttribute("data-ev-latest") || ups.length !== had) {
        log.innerHTML = ups.map(li).join("");
        log.setAttribute("data-ev-latest", latest);
        log.setAttribute("data-ev-count", String(ups.length));
        var added = ups.length - had;
        say("log", added > 0 ? (added === 1 ? "1 new update" : added + " new updates") + " below." : "Updates revised below.", false);
      }
    }).catch(function () { /* keep the saved log */ });
    get("/data/events.json").then(function (data) {
      var ev = data && data.events && data.events[id];
      var s = ev && Date.parse(ev.start), e = ev && (Date.parse(ev.end || "") || s);
      if (!isFinite(s) || new Date(s).toISOString() === new Date(start).toISOString()) return;
      start = s;
      log.setAttribute("data-ev-start", new Date(s).toISOString());
      var cd = document.querySelector(".ev-hero [data-countdown]");
      if (cd) {
        cd.setAttribute("data-start", new Date(s).toISOString());
        cd.setAttribute("data-end", new Date(e).toISOString());
        if (window.SDCountdown) window.SDCountdown.tick();
      }
      say("time", "The launch time has changed and the countdown now follows it.", true);
    }).catch(function () { /* keep the saved time */ });
  }
  function schedule() { clearInterval(timer); if (active()) timer = setInterval(check, EVERY); }
  if (fresh) fresh.querySelector("[data-ev-reload]").addEventListener("click", function (e) { e.preventDefault(); location.reload(); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") check(); });
  schedule();
})();
