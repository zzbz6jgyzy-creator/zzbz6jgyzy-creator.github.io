/* Shared markup for the homepage's upcoming stream; actual live players stay in live.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SDHomeNext = api;
})(typeof window !== 'undefined' ? window : this, function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function countdown(e, now) {
    if (e.net || e.timeTbc) return '';
    var minutes = Math.max(0, Math.ceil((Date.parse(e.start) - now) / 60000));
    if (!Number.isFinite(minutes)) return '';
    if (!minutes) return 'Starting now';
    if (minutes >= 1440) return 'in ' + Math.floor(minutes / 1440) + 'd ' + Math.floor(minutes % 1440 / 60) + 'h';
    return 'in ' + (minutes >= 60 ? Math.floor(minutes / 60) + 'h ' : '') + minutes % 60 + 'm';
  }
  function html(e, options) {
    var count = countdown(e, options.now), source = /^https:\/\//.test(e.source || '') ? e.source : '';
    var url = /^https:\/\//.test(options.url || '') ? options.url : '/calendar.html';
    return '<div class="lw lw-home-next"><span class="lh-next-label">Next livestream</span><h3 class="lw-title">' + esc(e.title) + '</h3>' +
      '<p class="lw-when"><time datetime="' + esc(e.start) + '">' + esc(options.dateText) + '</time> <span class="lv-tz">' + esc(options.chip) + '</span>' +
      (count ? ' <span class="lh-next-countdown">' + esc(count) + '</span>' : '') + '</p>' +
      '<nav class="lh-next-links" aria-label="Livestream links"><a href="' + esc(url) + '" target="_blank" rel="noopener">Official coverage ↗</a>' +
      '<a href="/calendar.html">All events →</a>' + (source ? '<a href="' + esc(source) + '" target="_blank" rel="noopener">Source ↗</a>' : '') + '</nav></div>';
  }
  return { html: html, countdown: countdown };
});
