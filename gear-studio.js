/* Gear page enhancements. The page works without this file: the filter chips are radio buttons styled in CSS.
   Here: a "Showing N of M" count, #daily / #upgrades deep links that pick the matching filter, and the sticky nav highlight. */
(function () {
  'use strict';
  var radios = Array.prototype.slice.call(document.querySelectorAll('.gx-filters input'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.gx-card'));
  var count = document.querySelector('.gx-count');

  function visible() { return cards.filter(function (c) { return c.offsetParent !== null; }).length; }
  function paint() {
    if (!count) return;
    var on = radios.filter(function (r) { return r.checked; })[0];
    count.textContent = on && on.id !== 'gx-f-all' ? 'Showing ' + visible() + ' of ' + cards.length : '';
  }
  radios.forEach(function (r) { r.addEventListener('change', paint); });
  function fromHash() {
    var id = location.hash.slice(1), r = id && radios.filter(function (x) { return x.id === id; })[0];
    if (r) { r.checked = true; paint(); var s = document.getElementById('gear'); if (s) s.scrollIntoView(); }
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();

  var links = Array.prototype.slice.call(document.querySelectorAll('.gx-subnav a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var seen = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
    var cur = -1;
    targets.forEach(function (t, i) { if (t && seen[t.id]) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }, { rootMargin: '-25% 0px -55% 0px' });
  targets.forEach(function (t) { if (t) io.observe(t); });
})();
