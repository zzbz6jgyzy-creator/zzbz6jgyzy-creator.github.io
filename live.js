/* Supercharged Daily live banner. Data: /live-data.json. Page: <script src="/live.js" data-page="home|starship|tesla">.
   Preview overrides: ?livenow=ISO (fake clock), ?livedata=/path.json
   Rule: once a stream is live, fallbackUrl = the DIRECT stream URL (youtube.com/watch?v=… or x.com/i/broadcasts/…), postUrl = the official broadcast post. */
(function () {
  var me = document.currentScript || document.querySelector("script[src*=\"live.js\"]"), page = (me && me.dataset.page) || 'home';
  var q = new URLSearchParams(location.search), H = 36e5;
  var now = q.get('livenow') ? new Date(q.get('livenow')).getTime() : Date.now();
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function safeUrl(u) { return /^https:\/\//.test(u || '') ? u : '#'; }
  function tzName(d) { // visitor's own zone, short form (BST, EDT, CET…)
    try { var p = new Intl.DateTimeFormat(undefined, {timeZoneName:'short'}).formatToParts(d).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return p ? p.value : ''; } catch (err) { return ''; }
  }
  function when(e) {
    var d = new Date(e.start), o = {weekday:'short', day:'numeric', month:'short'};
    if (e.timeTbc || e.net) o.timeZone = 'America/Los_Angeles'; // date-only events: keep the event's own calendar day
    var s = new Intl.DateTimeFormat(undefined, o).format(d);
    if (e.net) return 'NET ' + s;
    if (e.timeTbc) return s + ' · time TBC';
    return s + ' · ' + new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit'}).format(d) + ' ' + tzName(d);
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
    var canEmbed = e.provider === 'youtube' || e.provider === 'x';
    var tz = tzName(new Date(e.start));
    var dateTxt = e.timeTbc || e.net ? when(e).replace(' · time TBC', '').replace(/^NET /, '') : when(e).slice(0, -(tz.length + 1));
    var chip = e.timeTbc ? 'Time TBC' : e.net ? 'NET' : tz;
    var thumb = e.image ? '<div class="lw-thumb" style="background-image:url(\'' + esc(e.image) + '\')" role="img" aria-label="' + esc(e.title) + '"></div>' : '';
    var credit = e.image && e.imageCredit ? '<small class="lw-cr">' + esc(e.imageCredit) + '</small>' : '';
    var head = function (txt) { return '<div class="lw-head"><span class="lw-dot"></span><span>' + txt + '</span><span class="lw-host">' + (canEmbed ? 'Streamed here on Supercharged Daily' : 'Direct link to the official stream') + '</span></div>'; };
    var meta = '<p class="lw-when">' + esc(dateTxt) + ' <span class="lv-tz">' + esc(chip) + '</span></p>';
    if (!live) {
      var timed = !e.net, dayOnly = !!e.timeTbc;
      slot.innerHTML = '<div class="lw' + (reduce ? ' lv-still' : '') + '">' + head('Next live stream') + '<div class="lw-body">' + thumb +
        '<div class="lw-info"><h3 class="lw-title">' + esc(e.title) + '</h3>' + meta +
        (timed ? '<div class="lw-cd" aria-live="off"></div>' : '') +
        '<div class="lw-acts"><a class="lw-btn lw-btn-soft" href="' + (canEmbed ? '/calendar.html' : esc(safeUrl(e.fallbackUrl))) + '"' + (canEmbed ? '' : ' target="_blank" rel="noopener"') + '><span class="lw-play"></span>' + (canEmbed ? 'Watch here when live' : esc(e.fallbackLabel || 'Stream link')) + '</a>' +
        '<a class="lw-cal" href="/calendar.html">All events \u2192</a></div>' + credit + '</div></div></div>';
      var c = slot.querySelector('.lw-cd'); if (c && dayOnly && new Date(e.start) <= Date.now()) { c.innerHTML = '<span class="lw-today">Today</span>'; c = null; }
      if (c) { var tile = function (n, l) { return '<span class="lw-tile"><b>' + n + '</b><i>' + l + '</i></span>'; };
        var t1 = function () { var sec = Math.max(0, Math.floor((new Date(e.start) - Date.now()) / 1e3)), dd = Math.floor(sec / 86400), p2 = function (n) { return String(n).padStart(2, '0'); };
          var html = tile(dd, dd === 1 ? 'day' : 'days') + tile(p2(Math.floor(sec % 86400 / 3600)), 'hrs') + tile(p2(Math.floor(sec % 3600 / 60)), 'mins') + (dd ? '' : tile(p2(sec % 60), 'secs')) + (dayOnly ? '<small class="lw-note">to the day</small>' : '');
          if (window.sdRoll && !reduce) window.sdRoll(c, html); else c.innerHTML = html; };
        t1(); setInterval(t1, 1e3); }
      return;
    }
    var info = '<div class="lv-card">' + (e.image ? '<div class="lv-img" style="background-image:url(\'' + esc(e.image) + '\')">' + (e.imageCredit ? '<span class="lv-cr">' + esc(e.imageCredit) + '</span>' : '') + '</div>' : '') + '<div class="lv-ov">' +
      '<span class="lv-tag">' + (e.provider === 'x' ? 'ON X' : e.provider === 'youtube' ? 'ON YOUTUBE' : 'WEBCAST') + '</span><h3>' + esc(e.title) + '</h3>' +
      '<p class="lv-t">' + esc(when(e)) + ' · <span class="lv-cdl"></span></p>' + (e.description ? '<p class="lv-d">' + esc(e.description) + '</p>' : '') +
      '<div class="lv-acts">' + (canEmbed ? '<button class="lv-load" type="button"><span class="lv-play"></span>Load stream</button>' : '') + link + '</div>' +
      (canEmbed ? '<small class="lv-note">Loads ' + (e.provider === 'youtube' ? 'YouTube' : 'X') + ' content, which may set cookies</small>' : '') +
      '</div></div>';
    slot.innerHTML = '<div class="lw lw-live' + (reduce ? ' lv-still' : '') + '">' + head('Live now') + '<div class="lw-body">' + thumb +
      '<div class="lw-info"><h3 class="lw-title">' + esc(e.title) + '</h3>' + meta +
      '<div class="lw-acts">' + (canEmbed ? '<button class="lw-btn lw-watch" type="button"><span class="lw-play"></span>Watch live now</button>' : '<a class="lw-btn" href="' + esc(safeUrl(e.fallbackUrl)) + '" target="_blank" rel="noopener"><span class="lw-play"></span>Watch live now \u2197</a>') +
      '<button class="lv-open lw-cal" type="button" aria-expanded="' + !collapsed + '">' + (collapsed ? 'Mission info' : 'Hide') + '</button></div>' + credit + '</div></div></div><div class="lv-panel"' + (collapsed ? ' hidden' : '') + '>' + info + '</div>';
    var tick = function () { var c = slot.querySelector('.lv-cdl'); if (!c) return; var ms = new Date(e.start) - Date.now();
      c.textContent = ms > 0 ? 'T−' + cd(ms) : 'underway'; }; tick(); setInterval(tick, 3e4);
    var open = slot.querySelector('.lv-open'), panel = slot.querySelector('.lv-panel');
    if (open) open.onclick = function () { var x = panel.hidden; panel.hidden = !x; open.setAttribute('aria-expanded', x); open.textContent = x ? 'Hide' : (collapsed ? 'Mission info' : 'Show'); };
    var load = function () { panel.hidden = false; panel.innerHTML = player(e); panel.classList.add('lv-loaded'); if (open) open.remove(); panel.scrollIntoView({block: 'nearest', behavior: reduce ? 'auto' : 'smooth'}); };
    var ld = panel && panel.querySelector('.lv-load'); if (ld) ld.onclick = load;
    var wb = slot.querySelector('.lw-watch'); if (wb) wb.onclick = load;
  }
  function run() {
  fetch(q.get('livedata') || '/live-data.json?t=' + Math.floor(Date.now() / 6e4), {cache: 'no-store'}).then(function (r) { return r.json(); }).then(function (d) {
    now = q.get('livenow') ? now : Date.now();
    var ev = (d.events || []).filter(function (e) { return e.status !== 'ended' && new Date(e.end) > now && (page === 'home' || e.page === page); });
    var live = ev.filter(function (e) { var s = new Date(e.start) - 0;
      return e.status === 'live' || (!e.timeTbc && !e.net && now >= s - H / 2); })[0];
    var byStart = function (a, b) { return new Date(a.start) - new Date(b.start); };
    var future = ev.filter(function (e) { return new Date(e.start) > now; }).sort(byStart);
    var feat = ev.filter(function (e) { return e.featured && !live; })[0]; // featured event (e.g. Roadster) leads until it ends
    var next = feat || future.filter(function (e) { return !e.timeTbc && !e.net; })[0] || future[0]; // TBC/NET only if nothing timed
    var e = live || next;
    var old = document.querySelector('section.lv'); if (old) old.remove();
    if (!e) return;
    var mount = document.querySelector('[data-live-slot]'), slot = document.createElement('section'); slot.className = 'lv' + (mount ? ' lv-inhero' : '') + (live ? '' : ' lv-quiet'); slot.setAttribute('aria-label', live ? 'Live now' : 'Next livestream');
    if (mount) mount.appendChild(slot); else { var main = document.querySelector('main'); main.parentNode.insertBefore(slot, main); }
    var collapsed = !!(mount && mount.hasAttribute('data-collapsed'));
    render(slot, e, !!live, collapsed);
    var flip = live ? new Date(e.end) - now : (!e.timeTbc && !e.net ? new Date(e.start) - H / 2 - now : 0); // re-check at go-live / end
    if (flip > 0 && flip < 864e5 && !q.get('livenow')) setTimeout(run, flip + 1e3);
  }).catch(function () {});
  }
  run();
})();
