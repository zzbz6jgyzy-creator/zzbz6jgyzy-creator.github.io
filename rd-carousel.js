/* Roadster inline carousel: scroll-snap + arrows + counter + optional autoplay. */
(function () {
  var car = document.querySelector("[data-rd-car]");
  if (!car) return;
  var track = car.querySelector("[data-rd-track]");
  var slides = [].slice.call(track.querySelectorAll(".rd-slide"));
  var count = car.querySelector("[data-rd-count]");
  var play = car.querySelector("[data-rd-play]");
  var n = slides.length, idx = 0, timer = null;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function cur() { return Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / (track.clientWidth || 1)))); }
  function upd() { idx = cur(); if (count) count.textContent = (idx + 1) + " / " + n;
    slides.forEach(function (s, i) { s.setAttribute("aria-hidden", i === idx ? "false" : "true"); }); }
  function go(i) { idx = ((i % n) + n) % n; track.scrollTo({ left: idx * track.clientWidth, behavior: reduce ? "auto" : "smooth" }); if (count) count.textContent = (idx + 1) + " / " + n; }
  function stop() { if (timer) { clearInterval(timer); timer = null; } if (play) { play.setAttribute("aria-pressed", "false"); play.textContent = "Autoplay"; } }
  function start() { if (reduce) return; stop(); timer = setInterval(function () { go(cur() + 1); }, 4500); if (play) { play.setAttribute("aria-pressed", "true"); play.textContent = "Pause"; } }
  var t; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(upd, 80); }, { passive: true });
  car.querySelector("[data-rd-prev]").addEventListener("click", function () { stop(); go(cur() - 1); });
  car.querySelector("[data-rd-next]").addEventListener("click", function () { stop(); go(cur() + 1); });
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(cur() - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(cur() + 1); }
  });
  ["touchstart", "pointerdown", "wheel"].forEach(function (ev) { track.addEventListener(ev, stop, { passive: true }); });
  if (play) play.addEventListener("click", function () { timer ? stop() : start(); });
  window.addEventListener("resize", function () { track.scrollLeft = idx * track.clientWidth; });
  upd();
})();
