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
  // Ticking countdown driven by event-countdown.js. The saved markup carries no relative text,
  // so a page served from cache never shows a stale "in 1d 4h".
  function live(e) {
    if (e.net || e.timeTbc) return '';
    var s = Date.parse(e.start), en = Date.parse(e.end || '') || s;
    if (!Number.isFinite(s)) return '';
    return ' <span class="lh-next-countdown" data-countdown data-start="' + new Date(s).toISOString() + '" data-end="' + new Date(en).toISOString() + '"' +
      ' data-before-label="T−" data-open-label="Live now" data-open-prefix="Ends in " data-after-label="Ended">' +
      '<span class="lh-cd-label" data-cd-label></span> <span class="lh-cd-time" data-cd-time></span></span>';
  }
  function html(e, options) {
    var source = /^https:\/\//.test(e.source || '') ? e.source : '';
    var url = /^https:\/\//.test(options.url || '') ? options.url : '/calendar.html';
    return '<div class="lw lw-home-next"><span class="lh-next-label">Next livestream</span><h3 class="lw-title">' + esc(e.title) + '</h3>' +
      '<p class="lw-when"><time datetime="' + esc(e.start) + '">' + esc(options.dateText) + '</time> <span class="lv-tz">' + esc(options.chip) + '</span>' +
      live(e) + '</p>' +
      '<nav class="lh-next-links" aria-label="Livestream links"><a href="' + esc(url) + '" target="_blank" rel="noopener">Official coverage ↗</a>' +
      '<a href="/calendar.html">All events →</a>' + (source ? '<a href="' + esc(source) + '" target="_blank" rel="noopener">Source ↗</a>' : '') + '</nav></div>';
  }
  return { html: html, countdown: countdown, live: live };
});
