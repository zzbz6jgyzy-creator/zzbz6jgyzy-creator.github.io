/* Roadster hub v3: photo hero, flight loop, reveals, count-ups, tabs, lazy embeds. Gallery uses wallpapers.js viewer. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("rd-js");
  var hasIO = "IntersectionObserver" in window;

  // Local event time, with zone label.
  d.querySelectorAll("[data-local-time]").forEach(function (el) {
    var t = new Date(el.getAttribute("data-local-time"));
    if (isNaN(t)) return;
    try {
      el.textContent = "Your time: " + t.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) + ".";
    } catch (e) {}
  });

  // Hero loop: only after load, never with reduced motion or data saver.
  var v = d.querySelector(".rd-hero-video");
  var saver = navigator.connection && navigator.connection.saveData;
  function startHero() {
    if (!v || reduce || saver) return;
    [["webm", "video/webm"], ["mp4", "video/mp4"]].forEach(function (s) {
      var src = d.createElement("source");
      src.src = v.getAttribute("data-src-" + s[0]); src.type = s[1]; v.appendChild(src);
    });
    v.load();
    v.addEventListener("playing", function () { v.classList.add("is-on"); }, { once: true });
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  // Flight loop sits below the photo hero: load it only as it nears the viewport.
  if (v && "IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { vio.disconnect(); startHero(); }
    }, { rootMargin: "300px 0px" });
    vio.observe(v);
  }

  // Count-up numbers. The source text in the HTML is the truth: we cache it once
  // and always end on it (reduced motion, interruption, background tab, bfcache).
  var counters = [].slice.call(d.querySelectorAll("[data-count]"));
  counters.forEach(function (el) { if (!el.hasAttribute("data-final")) el.setAttribute("data-final", el.textContent); });
  function finish(el) { el._cuDone = true; el.textContent = el.getAttribute("data-final"); }
  function finishAll() { counters.forEach(finish); }
  function countUp(el) {
    if (el._cuStarted) return;
    el._cuStarted = true;
    var final = el.getAttribute("data-final");
    var to = parseFloat(el.getAttribute("data-count")), from = parseFloat(el.getAttribute("data-from") || "0");
    var dec = +el.getAttribute("data-dec") || 0, pre = el.getAttribute("data-pre") || "", suf = el.getAttribute("data-suf") || "";
    if (reduce || !isFinite(to) || !isFinite(from)) return finish(el);
    var t0 = null, dur = 1400;
    setTimeout(function () { finish(el); }, dur + 300);
    function step(ts) {
      if (el._cuDone) return;
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) return finish(el);
      el.textContent = pre + String((from + (to - from) * e).toFixed(dec)) + suf;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  d.addEventListener("visibilitychange", function () { if (d.hidden) finishAll(); });
  addEventListener("pagehide", finishAll);
  addEventListener("pageshow", function (ev) { if (ev.persisted) finishAll(); });

  // Scroll reveal + count-ups.
  var rv = d.querySelectorAll(".rv");
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        e.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("in"); });

  // Parallax moments (transform only, rAF-throttled).
  var moments = [].slice.call(d.querySelectorAll(".rd-moment"));
  if (moments.length && !reduce) {
    var ticking = false;
    function para() {
      ticking = false;
      var vh = innerHeight;
      moments.forEach(function (m) {
        var r = m.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)));
        m.style.setProperty("--p", p.toFixed(3));
      });
    }
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(para); } }, { passive: true });
    para();
  }



  // Trim tabs.
  var tabs = [].slice.call(d.querySelectorAll('.rd-tabs [role="tab"]')), bar = d.querySelector(".rd-tabs");
  function pick(i, focus) {
    tabs.forEach(function (t, j) {
      var on = i === j, p = d.getElementById(t.getAttribute("aria-controls"));
      t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1;
      if (p) { p.hidden = !on; if (on) { p.classList.remove("is-in"); void p.offsetWidth; p.classList.add("is-in"); } }
    });
    if (bar) bar.style.setProperty("--t", i);
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { pick(i); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") pick((i + 1) % tabs.length, true);
      if (e.key === "ArrowLeft") pick((i - 1 + tabs.length) % tabs.length, true);
    });
  });

  // YouTube click-to-load facades.
  d.querySelectorAll(".rd-facade").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = d.createElement("iframe");
      f.src = b.getAttribute("data-yt"); f.title = b.getAttribute("aria-label").replace(/^Play: /, "");
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      f.referrerPolicy = "strict-origin-when-cross-origin"; f.allowFullscreen = true;
      b.replaceWith(f);
    });
  });

  // X embeds: load widgets.js only when the clips section is near.
  var xs = d.querySelector("[data-x-lazy]");
  function loadX() {
    if (d.getElementById("rd-xw")) return;
    var s = d.createElement("script"); s.id = "rd-xw"; s.async = true; s.src = "https://platform.twitter.com/widgets.js"; d.body.appendChild(s);
  }
  if (xs) {
    if (hasIO) {
      var xo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { loadX(); xo.disconnect(); } }, { rootMargin: "600px 0px" });
      xo.observe(xs);
    } else loadX();
  }

  // Overview (#top; legacy #intro on first load): scroll to the very top so the hero is visible.
  function goPageTop(smooth) {
    var rootEl = d.documentElement;
    // styles.css sets scroll-behavior:smooth on :root — defeat it for a true top jump
    if (reduce || !smooth) {
      rootEl.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  }
  function hashOf(href) {
    var i = (href || "").indexOf("#");
    return i < 0 ? "" : href.slice(i);
  }
  function sameRoadsterPage(path) {
    if (!path) return true;
    try {
      var u = new URL(path, location.href);
      return /\/roadster\.html$/.test(u.pathname) || u.pathname === location.pathname;
    } catch (e) { return false; }
  }
  d.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (hashOf(href) !== "#top") return;
    if (!sameRoadsterPage(href.split("#")[0])) return;
    e.preventDefault();
    if (location.hash !== "#top") history.pushState(null, "", "#top");
    goPageTop(false);
  });
  function lockTopFromHash(rewriteIntro) {
    var h = location.hash;
    if (h !== "#top" && h !== "#intro") return;
    goPageTop(false);
    if (rewriteIntro && h === "#intro") {
      try { history.replaceState(null, "", "#top"); } catch (e) {}
    }
  }
  // Browser may smooth-scroll to #intro/#top before our script; keep forcing top.
  if (location.hash === "#top" || location.hash === "#intro") {
    lockTopFromHash(true);
    var n = 0;
    var iv = setInterval(function () {
      lockTopFromHash(false);
      if (++n >= 30) clearInterval(iv);
    }, 16);
    addEventListener("load", function () {
      lockTopFromHash(false);
      setTimeout(function () { lockTopFromHash(false); }, 100);
      setTimeout(function () { lockTopFromHash(false); }, 400);
    });
  }
  addEventListener("hashchange", function () {
    if (location.hash === "#top") goPageTop(false);
  });
  addEventListener("popstate", function () {
    if (location.hash === "#top" || location.hash === "") goPageTop(false);
  });


})();
