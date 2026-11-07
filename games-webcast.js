/* Games hub: the featured card wears the same webcast HUD as the SpaceX games (decorative, simulated). */
(function () {
  var art = document.querySelector(".ac-feature-art");
  if (!art || !window.WebcastHud) return;
  var hud = window.WebcastHud.create(art, { mission: "Hot staging · Featured mission", milestones: ["Startup", "Liftoff", "Max Q", "Stage sep", "Fairing"], speedMax: 8000, altMax: 100, gMax: 4 });
  art.classList.add("wc-hub");
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches, t = 148;
  function draw() {
    var q = Math.min(1, (t - 148) / 60);
    hud.update({ visible: true, t: t, speed: 5120 + (t - 148) * 41, alt: 40 + q * 25, g: 1.1 + q * 2, engines: 1, milestone: q < 0.2 ? 1 : q < 0.8 ? 2 : 3 });
  }
  draw();
  if (!still) setInterval(function () { if (document.hidden) return; t = t >= 208 ? 148 : t + 1; draw(); }, 1000);
})();
