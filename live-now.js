/* Supercharged Daily site-wide LIVE NOW alert. Loaded on every page by nav-pill.js.
   Source of truth: /live-data.json (same file live.js uses). An event is LIVE when
   status === "live", or when it has an exact time (no timeTbc/net), status isn't "ended" and start <= now < end.
   Embeds: provider "youtube" + embedId -> muted autoplay player with Unmute button.
   Anything else (x, link, spacex) -> pulsing badge + "Watch live on …" button to fallbackUrl.
   Polls every 60s. Dismiss = this tab session only. Preview: ?livedata=/path.json&livenow=ISO */
(function () {
  if (window.__sdLiveNow) return; window.__sdLiveNow = 1;
  var q = new URLSearchParams(location.search), V = '202610152125';
  var home = location.pathname === '/' || /\/index\.html$/.test(location.pathname);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/live-now.css?v=' + V; document.head.appendChild(css);
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : ''; }
  function nowMs() { return q.get('livenow') ? new Date(q.get('livenow')).getTime() : Date.now(); }
  function isLive(e, t) {
    if (!e || e.status === 'ended') return false;
    var s = new Date(e.start).getTime(), en = new Date(e.end || e.start).getTime() || s + 3 * 36e5;
    if (t >= en) return false; // auto-hide after end, even if a routine forgot to flip status
    if (e.status === 'live') return true;
    return !e.timeTbc && !e.net && t >= s;
  }
  function plat(e) {
    var u = e.fallbackUrl || e.postUrl || '';
    if (e.provider === 'youtube' || /youtube\.com|youtu\.be/.test(u)) return 'YouTube';
    if (/spacex\.com/.test(u)) return 'SpaceX';
    if (e.provider === 'x' || /(^|\/\/)(x|twitter)\.com/.test(u)) return 'X';
    if (/tesla\.com/.test(u)) return 'Tesla';
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (err) { return 'the official site'; }
  }
  function embeddable(e) { return e.provider === 'youtube' && /^[\w-]{6,20}$/.test(e.embedId || ''); }
  var root, curId = null, pid = 0;
  function key(e) { return 'sdLiveDismiss:' + e.id; }
  function clear() { if (root) root.remove(); root = null; curId = null; document.documentElement.classList.remove('sdln-on'); }
  function playerHtml(e) {
    var id = 'sdln-yt' + (++pid);
    return '<div class="sdln-player"><iframe id="' + id + '" src="https://www.youtube-nocookie.com/embed/' + e.embedId +
      '?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1&origin=' + encodeURIComponent(location.origin) + '" title="' + esc(e.title) +
      '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
      '<button class="sdln-unmute" type="button" aria-label="Unmute stream">\uD83D\uDD0A Tap to unmute</button></div>';
  }
  function wire(box, e) {
    var b = box.querySelector('.sdln-unmute'); if (!b) return;
    b.onclick = function () {
      var f = box.querySelector('iframe'); if (!f) return;
      ['unMute', 'playVideo'].forEach(function (fn) { f.contentWindow.postMessage(JSON.stringify({event: 'command', func: fn, args: []}), '*'); });
      b.remove();
    };
  }
  function render(e) {
    clear(); curId = e.id;
    var emb = embeddable(e), p = plat(e), url = safe(e.fallbackUrl) || safe(e.postUrl) || (emb ? 'https://www.youtube.com/watch?v=' + e.embedId : '');
    var watch = url ? '<a class="sdln-btn" href="' + esc(url) + '" target="_blank" rel="noopener">Watch live on ' + esc(p) + ' \u2197</a>' : '';
    var badge = '<span class="sdln-badge"><span class="sdln-dot" aria-hidden="true"></span>LIVE NOW</span>';
    root = document.createElement('div');
    root.className = 'sdln' + (reduce ? ' sdln-still' : '') + (home ? ' sdln-home' : ' sdln-mini');
    root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'Live now: ' + (e.title || 'stream'));
    var x = '<button class="sdln-x" type="button" aria-label="Dismiss live alert">\u00D7</button>';
    var head = '<div class="sdln-head">' + badge + '<div class="sdln-txt"><strong>' + esc(e.title) + '</strong><small>' +
      (emb ? 'Streaming now \u00B7 playing muted' : 'Streaming now on ' + esc(p)) + '</small></div>' + watch + x + '</div>';
    if (home) {
      root.innerHTML = '<div class="sdln-in">' + head + (emb ? playerHtml(e) : '') + '</div>';
      document.body.insertBefore(root, document.body.firstChild);
      if (emb) wire(root, e);
    } else {
      root.innerHTML = '<button class="sdln-pill" type="button" aria-expanded="false">' + badge + '<span class="sdln-pt">' + esc(e.title) + '</span></button>' +
        '<div class="sdln-card" hidden>' + head + '<div class="sdln-slot"></div></div>';
      document.body.appendChild(root);
      var pill = root.querySelector('.sdln-pill'), card = root.querySelector('.sdln-card'), slot = root.querySelector('.sdln-slot');
      pill.onclick = function () {
        var open = card.hidden; card.hidden = !open; pill.setAttribute('aria-expanded', open); root.classList.toggle('sdln-open', open);
        if (open && emb && !slot.firstChild) { slot.innerHTML = playerHtml(e); wire(slot, e); }
        if (!open) slot.innerHTML = '';
      };
    }
    document.documentElement.classList.add('sdln-on');
    root.querySelector('.sdln-x').onclick = function () { try { sessionStorage.setItem(key(e), '1'); } catch (err) {} clear(); };
  }
  function tick() {
    fetch((q.get('livedata') || '/live-data.json') + (q.get('livedata') ? '' : '?t=' + Math.floor(Date.now() / 6e4)), {cache: 'no-store'})
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var t = nowMs(), e = ((d && d.events) || []).filter(function (x) { return isLive(x, t); }).sort(function (a, b) { // several live: featured/major first, then latest start
          return ((b.featured || b.major ? 1 : 0) - (a.featured || a.major ? 1 : 0)) || (new Date(b.start) - new Date(a.start)); })[0];
        var dism = false; try { dism = e && sessionStorage.getItem(key(e)); } catch (err) {}
        if (!e || dism) { if (curId) clear(); return; }
        if (e.id !== curId) render(e);
      }).catch(function () {});
  }
  tick(); setInterval(tick, 6e4);
})();
