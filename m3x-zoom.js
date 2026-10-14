// Shared zoom control for the Model 3 / Cybertruck explorers.
// Vertical slider + / − buttons mapped (log scale) to OrbitControls distance.
export function initZoom({ app, camera, controls, kick, cancelFly }) {
  const el = document.createElement('div');
  el.className = 'm3x-zoom';
  el.innerHTML = '<button type="button" class="m3x-zoom-in" aria-label="Zoom in">+</button>' +
    '<input type="range" class="m3x-zoom-range" min="0" max="100" step="0.5" value="50" aria-label="Zoom" aria-orientation="vertical" />' +
    '<button type="button" class="m3x-zoom-out" aria-label="Zoom out">−</button>';
  app.appendChild(el);
  const range = el.querySelector('input');
  const lo = () => Math.log(controls.minDistance), hi = () => Math.log(controls.maxDistance);
  const dist = () => camera.position.distanceTo(controls.target);
  const toVal = (d) => 100 * (hi() - Math.log(d)) / (hi() - lo()); // 100 = closest
  const toDist = (v) => Math.exp(hi() - (v / 100) * (hi() - lo()));
  let dragging = false;
  function setDist(d) {
    if (cancelFly) cancelFly();
    d = Math.min(controls.maxDistance, Math.max(controls.minDistance, d));
    const off = camera.position.clone().sub(controls.target);
    if (off.lengthSq() < 1e-6) return;
    camera.position.copy(controls.target).add(off.setLength(d));
    controls.update(); kick(); sync(true);
  }
  function sync(force) {
    if (dragging && !force) return;
    const v = Math.round(Math.min(100, Math.max(0, toVal(dist()))) * 2) / 2;
    if (+range.value !== v) range.value = v;
    range.setAttribute('aria-valuetext', Math.round(v) + '% zoom');
  }
  range.addEventListener('input', () => { dragging = true; setDist(toDist(+range.value)); });
  ['change', 'pointerup', 'blur'].forEach((t) => range.addEventListener(t, () => { dragging = false; }));
  el.querySelector('.m3x-zoom-in').addEventListener('click', () => setDist(dist() / 1.18));
  el.querySelector('.m3x-zoom-out').addEventListener('click', () => setDist(dist() * 1.18));
  controls.addEventListener('change', () => sync());
  sync(true);
  return { sync };
}
