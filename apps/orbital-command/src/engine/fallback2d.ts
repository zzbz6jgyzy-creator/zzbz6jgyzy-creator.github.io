import type { DerivedState, Observer, SourceFacts } from "../types";

/** Equirectangular list + map for no-WebGL and screen-reader users. */
export function renderFallback(el: HTMLElement, objects: SourceFacts[], states: Map<number, DerivedState>, observer: Observer | null): void {
  const rows = objects.slice(0, 80).map((o) => {
    const s = states.get(o.norad);
    const pos = s
      ? `${s.latitudeDeg.toFixed(2)}°, ${s.longitudeDeg.toFixed(2)}° · ${s.altitudeKm.toFixed(0)} km`
      : "Position not yet calculated";
    return `<tr><th scope="row">${escape(o.name)}</th><td>${o.norad}</td><td>${escape(o.group)}</td><td>${escape(o.epoch)}</td><td>${escape(pos)}</td></tr>`;
  }).join("");
  const obs = observer
    ? `<p>Observer: ${escape(observer.label)} (${observer.latitudeDeg.toFixed(3)}°, ${observer.longitudeDeg.toFixed(3)}°).</p>`
    : `<p>No observer set. Use What’s above me with a city or coordinates — location permission is optional.</p>`;
  el.innerHTML = `
    <div class="oc-fallback-inner">
      <h2>Satellite directory (2D)</h2>
      <p>This view does not need WebGL. Positions are SGP4 calculations from dated CelesTrak elements, not live telemetry.</p>
      ${obs}
      <div class="oc-map2d" role="img" aria-label="Equirectangular sketch of calculated positions">${drawDots(states)}</div>
      <table class="oc-table">
        <caption>Loaded objects</caption>
        <thead><tr><th>Name</th><th>NORAD</th><th>Group</th><th>Epoch</th><th>Calculated position</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5">No orbital snapshot is available. The last good file may be missing.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function drawDots(states: Map<number, DerivedState>): string {
  const dots = [...states.values()].slice(0, 400).map((s) => {
    const x = ((s.longitudeDeg + 180) / 360) * 100;
    const y = ((90 - s.latitudeDeg) / 180) * 100;
    const fill = s.norad === 25544 ? "#F2A444" : "#36D5EF";
    return `<circle cx="${x}" cy="${y}" r="${s.norad === 25544 ? 1.2 : 0.45}" fill="${fill}" />`;
  }).join("");
  return `<svg viewBox="0 0 100 50" preserveAspectRatio="none">${dots}</svg>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}
