/* Gear: highlight the sticky quick-nav link for the section in view. Progressive enhancement; the page works without it. */
(function () {
  'use strict';
  var links = Array.prototype.slice.call(document.querySelectorAll('.gx-subnav a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var visible = {};
  function paint() {
    var current = -1;
    targets.forEach(function (t, i) { if (t && visible[t.id]) current = i; });
    links.forEach(function (a, i) { if (i === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    paint();
  }, { rootMargin: '-30% 0px -55% 0px' });
  targets.forEach(function (t) { if (t) io.observe(t); });
})();
