/* Supercharged Daily live banner. Data: /live-data.json. Page: <script src="/live.js" data-page="home|starship|tesla">.
   Preview overrides: ?livenow=ISO (fake clock), ?livedata=/path.json */
(function () {
  var me = document.currentScript || document.querySelector("script[src*=\"live.js\"]"), page = (me && me.dataset.page) || 'home';
  var q = new URLSearchParams(location.search), H = 36e5;
  var now = q.get('livenow') ? new Date(q.get('livenow')).getTime() : Date.now();
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function safeUrl(u) { return /^https:\/\//.test(u || '') ? u : '#'; }
  function when(e) {
    var d = new Date(e.start), o = {weekday:'short', day:'numeric', month:'short', timeZone:'Europe/Dublin'};
    var s = d.toLocaleDateString('en-IE', o);
    if (e.net) return 'NET ' + s;
    if (e.timeTbc) return s + ' · time TBC';
    return s + ' · ' + d.toLocaleTimeString('en-IE', {hour:'2-digit', minute:'2-digit', timeZone:'Europe/Dublin'}) + ' Irish time';
  }
  function cd(ms) { var h = Math.floor(ms / H), m = Math.floor(ms % H / 6e4); return (h ? h + 'h ' : '') + m + 'm'; }
  function player(e) {
    if (e.provider === 'youtube' && /^[\w-]{6,20}$/.test(e.embedId || ''))
      return '<iframe src="https://www.youtube-nocookie.com/embed/' + e.embedId + '?rel=0" title="' + esc(e.title) +
        '" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>';
    if (e.provider === 'x' && /^https:\/\/(x|twitter)\.com\/\w+\/status\/\d+/.test(e.postUrl || '')) {
      setTimeout(function () { var s = document.createElement('script'); s.src = 'https://platform.twitter.com/widgets.js'; s.async = true; document.body.appendChild(s); });
      return '<blockquote class="twitter-tweet" data-theme="dark" data-dnt="true"><a href="' + esc(e.postUrl) + '"></a></blockquote>';
    }
    return '<p class="lv-none">This stream can\u2019t be embedded. Use the link below.</p>';
  }
  function render(slot, e, live, collapsed) {
    var link = '<a class="lv-out" href="' + esc(safeUrl(e.fallbackUrl)) + '" target="_blank" rel="noopener">' + esc(e.fallbackLabel || 'Watch') + ' \u2197</a>';
    if (!live) {
      slot.innerHTML = '<div class="lv-next"><span class="lv-chip">Up next</span><b>' + esc(e.title) + '</b><span class="lv-cd">in ' +
        cd(new Date(e.start) - now) + '</span><span class="lv-when">' + esc(when(e)) + '</span>' + link + '</div>';
      return;
    }
    var canEmbed = e.provider === 'youtube' || e.provider === 'x';
    var info = '<div class="lv-card">' + (e.image ? '<div class="lv-img" style="background-image:url(\'' + esc(e.image) + '\')">' + (e.imageCredit ? '<span class="lv-cr">' + esc(e.imageCredit) + '</span>' : '') + '</div>' : '') + '<div class="lv-ov">' +
      '<span class="lv-tag">' + (e.provider === 'x' ? 'ON X' : e.provider === 'youtube' ? 'ON YOUTUBE' : 'WEBCAST') + '</span><h3>' + esc(e.title) + '</h3>' +
      '<p class="lv-t">' + esc(when(e)) + ' · <span class="lv-cdl"></span></p>' + (e.description ? '<p class="lv-d">' + esc(e.description) + '</p>' : '') +
      '<div class="lv-acts">' + (canEmbed ? '<button class="lv-load" type="button"><span class="lv-play"></span>Load stream</button>' : '') + link + '</div>' +
      (canEmbed ? '<small class="lv-note">Loads ' + (e.provider === 'youtube' ? 'YouTube' : 'X') + ' content, which may set cookies</small>' : '') +
      '</div></div>';
    slot.innerHTML = '<div class="lv-bar' + (reduce ? ' lv-still' : '') + '"><span class="lv-dot"></span><span class="lv-tag">LIVE NOW</span><b>' + esc(e.title) + '</b>' +
      '<button class="lv-open" type="button" aria-expanded="' + !collapsed + '">' + (collapsed ? 'Mission info' : 'Hide') + '</button>' + link + '</div><div class="lv-panel"' + (collapsed ? ' hidden' : '') + '>' + info + '</div>';
    var tick = function () { var c = slot.querySelector('.lv-cdl'); if (!c) return; var ms = new Date(e.start) - Date.now();
      c.textContent = ms > 0 ? 'T−' + cd(ms) : 'underway'; }; tick(); setInterval(tick, 3e4);
    var open = slot.querySelector('.lv-open'), panel = slot.querySelector('.lv-panel');
    if (open) open.onclick = function () { var x = panel.hidden; panel.hidden = !x; open.setAttribute('aria-expanded', x); open.textContent = x ? 'Hide' : (collapsed ? 'Mission info' : 'Show'); };
    var ld = panel && panel.querySelector('.lv-load'); if (ld) ld.onclick = function () { panel.innerHTML = player(e); panel.classList.add('lv-loaded'); };
  }
  fetch(q.get('livedata') || '/live-data.json', {cache: 'no-store'}).then(function (r) { return r.json(); }).then(function (d) {
    var ev = (d.events || []).filter(function (e) { return e.status !== 'ended' && (page === 'home' || e.page === page); });
    var live = ev.filter(function (e) { var s = new Date(e.start) - 0, en = new Date(e.end) - 0;
      return now < en && (e.status === 'live' || (!e.timeTbc && !e.net && now >= s - H / 2)); })[0];
    var next = ev.filter(function (e) { var s = new Date(e.start) - now; return !e.timeTbc && !e.net && s > 0 && s < 24 * H; })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); })[0];
    var e = live || next; if (!e) return;
    var mount = document.querySelector('[data-live-slot]'), slot = document.createElement('section'); slot.className = 'lv' + (mount ? ' lv-inhero' : ''); slot.setAttribute('aria-label', 'Live events');
    if (mount) mount.appendChild(slot); else { var main = document.querySelector('main'); main.parentNode.insertBefore(slot, main); }
    var collapsed = !!(mount && mount.hasAttribute('data-collapsed'));
    render(slot, e, !!live, collapsed);
    setTimeout(function () { slot.remove(); }, Math.max(0, new Date(e.end) - now) || 1); // auto-hide at end
  }).catch(function () {});
})();
