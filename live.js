/* Supercharged Daily live banner. Data: /live-data.json. Page: <script src="/live.js" data-page="home|starship|tesla">.
   Preview overrides: ?livenow=ISO (fake clock), ?livedata=/path.json
   Rule: once a stream is live, fallbackUrl = the DIRECT stream URL (youtube.com/watch?v=… or x.com/i/broadcasts/…), postUrl = the official broadcast post. */
(function () {
  var me = document.currentScript || document.querySelector("script[data-page]") || document.querySelector("script[src*=\"live.js\"]"), page = (me && me.dataset.page) || 'home';
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
    if (e.timeTbc || e.net) { d = ownDay(e); o.timeZone = 'UTC'; } // date-only events: keep the event's own calendar day
    var s = new Intl.DateTimeFormat(undefined, o).format(d);
    if (e.net) return 'NET ' + s;
    if (e.timeTbc) return s + ' · time TBC';
    return s + ' · ' + new Intl.DateTimeFormat(undefined, {hour:'2-digit', minute:'2-digit'}).format(d) + ' ' + tzName(d);
  }
  // Every upcoming SpaceX launch from data/launches.json (LL2, refreshed hourly) becomes a live-card event.
  // Watch goes to SpaceX's own X account, never to the LL2 API. Starship stays on data/events.json.
  function ll2Events(L, have) {
    return ((L && L.results) || []).map(function (r) {
      var parts = String(r.name || '').split(' | '), rocket = (parts[0] || '').replace(/\s*Block \d+$/, ''), mission = parts[1] || parts[0] || '';
      var p = (r.net_precision && r.net_precision.abbrev) || '', s = (r.status && r.status.abbrev) || '';
      if (!r.net || /starship/i.test(r.name) || !/^(SEC|MIN|HR|HOUR|DAY)?$/.test(p) || /^(Success|Failure|Partial Failure)$/.test(s)) return null;
      var t = new Date(r.net).getTime();
      // scrubbed / on hold / TBD, already lifted off, or timed NET passed 30+ min without lift-off
      if (/^(Hold|TBD)$/.test(s) || (s === 'In Flight' && now - t >= 0) || (/^(SEC|MIN)?$/.test(p) && s !== 'In Flight' && now - t > H / 2)) return null;
      if (have.some(function (e) { return e.page === 'starship' && Math.abs(new Date(e.start) - t) < 6 * H; })) return null;
      var day = p === 'DAY';
      return { id: 'll2-' + r.id, page: 'starship', title: rocket + ' \u00b7 ' + mission.replace(/^Starlink Group /, 'Starlink '),
        start: day ? r.net.slice(0, 10) + 'T00:00:00Z' : r.net, end: day ? r.net.slice(0, 10) + 'T23:59:00Z' : new Date(t + H).toISOString(),
        net: day || undefined, timeTbc: (p === 'HR' || p === 'HOUR') || undefined, status: 'scheduled', provider: 'link',
        fallbackUrl: 'https://x.com/SpaceX', fallbackLabel: 'Webcast on X (@SpaceX)', source: 'https://thespacedevs.com/llapi',
        image: /falcon/i.test(rocket) ? '/assets/live/falcon9.jpg' : '', imageCredit: /falcon/i.test(rocket) ? 'Photo: U.S. Space Force/Senior Airman Samuel Becker, public domain' : '' };
    }).filter(Boolean);
  }
  // NET / date-only events: show the event's own calendar day (start string), not a shifted zone.
  function ownDay(e) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(e.start || ''); return m ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], 12)) : new Date(e.start); }
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
  function streamUrl(e) { // direct stream: official YouTube watch URL when set, else the official broadcast link
    if (e.provider === 'youtube' && /^[\w-]{6,20}$/.test(e.embedId || '')) return 'https://www.youtube.com/watch?v=' + e.embedId;
    return safeUrl(e.fallbackUrl || e.postUrl || '/calendar.html');
  }
  function liveThumb(src, title) {
    var s = src || '';
    if (/\/assets\/live\/falcon9\.(jpe?g|png|webp)$/i.test(s)) {
      return '<div class="lw-thumb" role="img" aria-label="' + esc(title) + '"><picture>' +
        '<source type="image/avif" srcset="/assets/live/falcon9-480w.avif 480w, /assets/live/falcon9-960w.avif 960w, /assets/live/falcon9-1200w.avif 1200w" sizes="(max-width:760px) 92vw, 360px" />' +
        '<source type="image/webp" srcset="/assets/live/falcon9-480w.webp 480w, /assets/live/falcon9-960w.webp 960w, /assets/live/falcon9-1200w.webp 1200w" sizes="(max-width:760px) 92vw, 360px" />' +
        '<img src="/assets/live/falcon9.jpg" alt="" width="1200" height="800" fetchpriority="high" decoding="async" /></picture></div>';
    }
    return s ? '<div class="lw-thumb" role="img" aria-label="' + esc(title) + '"><img src="' + esc(s) + '" alt="" width="1200" height="800" fetchpriority="high" decoding="async" /></div>' : '';
  }
  function render(slot, e, live, collapsed, slim) {
    var link = '<a class="lv-out" href="' + esc(streamUrl(e)) + '" target="_blank" rel="noopener">' + esc(e.fallbackLabel || 'Watch') + ' \u2197</a>';
    var canEmbed = e.provider === 'youtube' || e.provider === 'x';
    var tz = tzName(new Date(e.start));
    var dateTxt = e.timeTbc || e.net ? when(e).replace(' · time TBC', '').replace(/^NET /, '') : when(e).slice(0, -(tz.length + 1));
    var chip = e.timeTbc ? 'Time TBC' : e.net ? 'NET' : tz;
    var thumb = e.image ? liveThumb(e.thumb || e.image, e.title) : '';
    var credit = e.image && e.imageCredit ? '<small class="lw-cr">' + esc(e.imageCredit) + '</small>' : '';
    var head = function (txt) { return '<div class="lw-head"><span class="lw-dot"></span><span>' + txt + '</span><span class="lw-host">' + (canEmbed ? 'Streamed here on Supercharged Daily' : 'Direct link to the official stream') + '</span></div>'; };
    var meta = '<p class="lw-when">' + esc(dateTxt) + ' <span class="lv-tz">' + esc(chip) + '</span></p>';
    if (!live && page === 'home' && window.SDHomeNext) {
      slot.classList.add('lv-home-next');
      slot.innerHTML = window.SDHomeNext.html(e, {dateText: dateTxt, chip: chip, url: streamUrl(e), now: now});
      var count = slot.querySelector('.lh-next-countdown');
      if (count) setInterval(function () { count.textContent = window.SDHomeNext.countdown(e, Date.now()); }, 60000);
      return;
    }
    if (!live && slim) { // >72h out: slim one-line card (fixed 56px, see live.css .lw-slim)
      var days = function () { var ms = new Date(e.start) - Date.now(), dd = Math.round(ms / 864e5); return ms <= 0 ? 'today' : dd <= 1 ? 'in 1d' : 'in ' + dd + 'd'; };
      slot.innerHTML = '<a class="lw lw-slim" href="' + esc(streamUrl(e)) + '" target="_blank" rel="noopener"><span class="lw-dot"></span><span class="lws-txt"><b class="lws-t">' + esc(e.title) + '</b>' +
        '<span class="lws-m">' + esc(dateTxt) + ' <span class="lv-tz">' + esc(chip) + '</span> <span class="lws-cd">' + days() + '</span></span></span>' + (/^https:\/\/(www\.)?(spacex\.com\/launches|x\.com\/|youtube\.com\/watch)/.test(streamUrl(e)) ? '<span class="lws-go">Watch \u2197</span>' : '') + '</a>';
      setInterval(function () { var c = slot.querySelector('.lws-cd'); if (c) c.textContent = days(); }, 6e4);
      return;
    }
    if (!live) {
      var timed = !e.net, dayOnly = !!e.timeTbc;
      slot.innerHTML = '<div class="lw' + (reduce ? ' lv-still' : '') + '">' + head('Next live stream') + '<div class="lw-body">' + thumb +
        '<div class="lw-info"><h3 class="lw-title">' + esc(e.title) + '</h3>' + meta +
        (timed ? '<div class="lw-cd" aria-live="off"></div>' : '') +
        '<div class="lw-acts"><a class="lw-btn lw-btn-soft" href="' + esc(streamUrl(e)) + '" target="_blank" rel="noopener"><span class="lw-play"></span>' + 'Watch the live stream \u2197' + '</a>' +
        '<a class="lw-cal" href="/calendar.html">All events \u2192</a></div>' +
        (e.source ? '<small class="lw-cr">Source · ' + esc((e.source || '').replace(/^https?:\/\//, '').split('/')[0]) + '</small>' : '') +
        credit + '</div></div></div>';
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
      '<div class="lw-acts">' + '<a class="lw-btn" href="' + esc(streamUrl(e)) + '" target="_blank" rel="noopener"><span class="lw-play"></span>Watch live now \u2197</a>' +
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
  Promise.all([fetch(q.get('livedata') || '/live-data.json?t=' + Math.floor(Date.now() / 6e4), {cache: 'no-store'}).then(function (r) { return r.json(); }),
    fetch('/data/events.json', {cache: 'no-cache'}).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('/data/launches.json', {cache: 'no-cache'}).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })]).then(function (pair) {
    var d = pair[0], shared = pair[1] && pair[1].events || {};
    var sharedIds = { 'f9-bandwagon5': 'bandwagon-5', 'f9-ussf481': 'ussf-481', 'f9-crs35': 'crs35-docking' };
    (d.events || []).forEach(function (e) {
      var s = shared[e.id] || shared[sharedIds[e.id]];
      if (!s) return;
      if (s.start) e.start = s.start;
      if (s.end) e.end = s.end;
      if (s.date && !s.start) {
        var tz = s.tz || 'Z';
        e.start = s.date + 'T00:00:00' + tz;
        e.end = s.date + 'T23:59:00' + tz;
      }
    });
    now = q.get('livenow') ? now : Date.now();
    d.events = (d.events || []).concat(ll2Events(pair[2], (d.events || []).filter(function (e) { return e.status !== 'ended'; })));
    var ev = (d.events || []).filter(function (e) { return e.status !== 'ended' && new Date(e.end) > now && (page === 'home' || e.page === page || (page === 'spacex' && e.page === 'starship')); });
    // Home: keep timed Falcon/Dragon; drop NET Starship. Same rule as scripts/live-home-pick.js.
    if (page === 'home') ev = ev.filter(function (e) {
      if (e.page !== 'starship') return true;
      return !e.net && !e.timeTbc && e.status !== 'ended';
    });
    var live = ev.filter(function (e) { var s = new Date(e.start) - 0;
      return e.status === 'live' || (!e.timeTbc && !e.net && now >= s - H / 2); }).sort(function (a, b) { // several live: featured/major first, then latest start
        var pa = (a.featured || (shared[a.id] && shared[a.id].major)) ? 1 : 0, pb = (b.featured || (shared[b.id] && shared[b.id].major)) ? 1 : 0;
        return (pb - pa) || (new Date(b.start) - new Date(a.start)); })[0];
    var byStart = function (a, b) { return new Date(a.start) - new Date(b.start); };
    var future = ev.filter(function (e) { return new Date(e.start) > now; }).sort(byStart);
    var feat = ev.filter(function (e) { return e.featured && !live; })[0]; // featured event (e.g. Roadster) leads until it ends
    var next = feat || future.filter(function (e) { return !e.timeTbc && !e.net; })[0] || future[0]; // TBC/NET only if nothing timed
    var e = live || next;
    var pre = document.querySelector('section.lv[data-prebuilt]');
    var preTitle = pre && pre.querySelector('.lw-title');
    // Keep the prerendered homepage card when it is already the same next event.
    // Removing and remounting it is a layout shift on the 320px first screen.
    if (!live && pre && e && preTitle && preTitle.textContent === e.title) {
      var count = pre.querySelector('.lh-next-countdown');
      if (count && window.SDHomeNext) count.textContent = window.SDHomeNext.countdown(e, now);
      var leftover = document.querySelector('section.lv:not([data-prebuilt])'); if (leftover) leftover.remove();
      var stay = !e.timeTbc && !e.net ? new Date(e.start) - H / 2 - now : 0;
      if (stay > 0 && stay < 864e5 && !q.get('livenow')) setTimeout(run, stay + 1e3);
      return;
    }
    var old = document.querySelector('section.lv:not([data-prebuilt])'); if (old) old.remove();
    document.querySelectorAll('section.lv[data-prebuilt]').forEach(function (p) { p.remove(); });
    if (!e) return;
    var top = document.querySelector('[data-live-slot][data-live-only]'), rest = document.querySelector('[data-live-slot]:not([data-live-only])');
    var mount = live ? (top || rest) : rest; if (!mount && top) return; var slim = !live && new Date(e.start) - now > 72 * H; var slot = document.createElement('section'); slot.className = 'lv' + (mount ? ' lv-inhero' : '') + (live ? '' : ' lv-quiet') + (slim ? ' lv-slim' : ''); slot.setAttribute('aria-label', live ? 'Live now' : 'Next livestream');
    if (mount) mount.appendChild(slot); else { var main = document.querySelector('main'); main.parentNode.insertBefore(slot, main); }
    var collapsed = !!(mount && mount.hasAttribute('data-collapsed'));
    render(slot, e, !!live, collapsed, slim);
    var flip = live ? new Date(e.end) - now : slim && page !== 'home' ? new Date(e.start) - 72 * H - now : (!e.timeTbc && !e.net ? new Date(e.start) - H / 2 - now : 0); // home stays compact until go-live
    if (flip > 0 && flip < 864e5 && !q.get('livenow')) setTimeout(run, flip + 1e3);
  }).catch(function () {});
  }
  run();
})();
