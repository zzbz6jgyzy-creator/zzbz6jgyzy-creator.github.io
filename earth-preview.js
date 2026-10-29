(() => {
  'use strict';
  const root = document.querySelector('[data-earth-preview]');
  if (!root) return;
  const canvas = document.getElementById('earth-canvas');
  const status = document.getElementById('earth-status');
  const fallback = document.getElementById('earth-fallback');
  const note = document.getElementById('earth-note');
  const quality = document.getElementById('earth-quality');
  const motion = document.getElementById('earth-motion');
  const managed = [...root.querySelectorAll('[data-earth-view], [data-earth-zoom], #earth-motion, #earth-reset, #earth-quality')];
  const viewLabels = { sunrise: 'THE DAY–NIGHT BOUNDARY', daylight: 'THE BLUE PLANET', night: 'THE WORLD AFTER DARK' };
  let viewer, attempt = 0;
  function paint(state = {}) {
    root.dataset.quality = state.quality || quality.value;
    root.dataset.paused = String(!!state.paused);
    motion.setAttribute('aria-pressed', String(!!state.paused));
    motion.setAttribute('aria-label', state.paused ? 'Resume rotation' : 'Pause rotation');
    document.getElementById('earth-motion-label').textContent = state.paused ? 'Play' : 'Pause';
    document.getElementById('earth-pause-icon').hidden = !!state.paused;
    document.getElementById('earth-play-icon').hidden = !state.paused;
    for (const b of root.querySelectorAll('[data-earth-view]')) b.setAttribute('aria-pressed', String(b.dataset.earthView === (state.view || 'sunrise')));
    document.getElementById('earth-view-label').textContent = viewLabels[state.view] || viewLabels.sunrise;
    if (state.textureWidth) document.getElementById('earth-resolution').textContent = Math.round(state.textureWidth / 1024) + 'K SURFACE DETAIL';
    if (state.quality && [...quality.options].some(o => o.value === state.quality)) quality.value = state.quality;
    if (state.detailMessage) { note.textContent=state.detailMessage; note.hidden=false; }
  }
  function unavailable(message) {
    root.dataset.state = 'fallback';
    fallback.hidden = false;
    managed.forEach(b => b.disabled = true);
    document.getElementById('earth-fallback-message').textContent = message || 'The interactive Earth could not start on this device. You can still enjoy the image.';
  }
  async function boot() {
    const token = ++attempt;
    viewer?.dispose(); viewer = null; window.__earthPreview = null;
    root.dataset.state = 'loading'; fallback.hidden = true; note.hidden = true;
    managed.forEach(b => b.disabled = true);
    status.textContent = 'Preparing your view…';
    try {
      const { initEarth } = await import('/earth-renderer.js?v=20261029-1' + (attempt > 1 ? '&retry=' + attempt : ''));
      const result = await initEarth({canvas, textureBase:'/assets/earth/', onStatus:message => { if (token === attempt && typeof message === 'string') status.textContent = message; }, onChange:state => { if (token !== attempt) return; paint(state); if (viewer && root.dataset.state==='fallback' && state.ready && !state.contextLost) { root.dataset.state='ready'; fallback.hidden=true; managed.forEach(b=>b.disabled=false); } }, onError:error => { if (token === attempt) unavailable(typeof error === 'string' ? error : undefined); }});
      if (token !== attempt) { result.dispose(); return; }
      viewer = result; window.__earthPreview = viewer;
      if (!viewer.getState().ready) throw Error('The first frame was unavailable.');
      paint(viewer.getState()); root.dataset.state = 'ready'; fallback.hidden = true;
      managed.forEach(b => b.disabled = false);
    } catch (error) { if (token === attempt) unavailable(); }
  }
  motion.addEventListener('click', () => { viewer?.togglePause(); if (viewer) paint(viewer.getState()); });
  document.getElementById('earth-reset').addEventListener('click', () => { viewer?.reset(); if (viewer) paint(viewer.getState()); });
  for (const b of root.querySelectorAll('[data-earth-view]')) b.addEventListener('click', () => { viewer?.setView(b.dataset.earthView); if (viewer) paint(viewer.getState()); });
  for (const b of root.querySelectorAll('[data-earth-zoom]')) b.addEventListener('click', () => {
    canvas.focus({preventScroll:true});
    viewer?.zoomBy(b.dataset.earthZoom === 'in' ? .15 : -.15);
  });
  quality.addEventListener('change', async () => {
    if (!viewer) return;
    quality.disabled = true; note.textContent='Loading your selected surface detail…'; note.hidden=false;
    try { await viewer.setQuality(quality.value); note.hidden=true; paint(viewer.getState()); }
    catch { note.textContent = 'That detail level could not load. Your current Earth view is still available.'; note.hidden = false; paint(viewer.getState()); }
    finally { quality.disabled = false; }
  });
  document.getElementById('earth-retry').addEventListener('click', boot);
  const fs = document.getElementById('earth-fullscreen');
  fs.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.requestFullscreen) await root.requestFullscreen();
      else { note.textContent = 'Fullscreen is not available in this browser. The Earth view already fills the page.'; note.hidden = false; }
    } catch { note.textContent = 'Your browser could not enter fullscreen. You can keep exploring here.'; note.hidden = false; }
  });
  document.addEventListener('fullscreenchange', () => { const active=!!document.fullscreenElement; fs.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');fs.title=active?'Exit fullscreen':'Fullscreen'; });
  const dialog = document.getElementById('earth-about-dialog');
  document.getElementById('earth-about').addEventListener('click', () => dialog.showModal());
  document.getElementById('earth-about-close').addEventListener('click', () => dialog.close());
  document.getElementById('earth-about-done').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  window.addEventListener('pagehide', () => viewer?.dispose());
  window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
  boot();
})();
