/* Simulated UTC clock for the Earth-to-Milky-Way explorer.
 * Pure maths: no DOM and no three.js, so it runs in node tests. Astronomy Engine is loaded only when
 * jumping to an eclipse, so the Starship replay never downloads it.
 * Live follows the wall clock. Any other speed or a picked date is simulated time; clouds stay the live
 * satellite frame and must be labelled not-for-this-time on screen. */
export const SPEEDS = Object.freeze([-10000, -1000, -100, -10, -1, 0, 1, 10, 100, 1000, 10000]);
const SPEED_SET = new Set(SPEEDS);

export function pad2(n) { return String(n).padStart(2, '0'); }

/** Format a millisecond timestamp as a UTC datetime-local value (no zone; the picker is labelled UTC). */
export function toUtcInput(ms) {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  const y = d.getUTCFullYear();
  if (y < 1000 || y > 9999) return '';
  return String(y).padStart(4, '0') + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) + 'T' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes());
}

/** Parse a datetime-local / ISO value as UTC. Returns a Date or null. Years 1000–9999 only (datetime-local). */
export function fromUtcInput(value) {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z)?$/);
  if (!m) return null;
  const year = +m[1];
  if (year < 1000) return null;
  const ms = Date.UTC(year, +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime()) || d.getUTCFullYear() !== year) return null;
  return d;
}

/** Short UTC label for the provenance chip and the panel note: "18:17 UTC 8 Apr 2024". */
export function formatSimLabel(ms, locales = 'en-GB') {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  const time = new Intl.DateTimeFormat(locales, { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const day = new Intl.DateTimeFormat(locales, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  return time + ' UTC ' + day;
}

function peakDate(info) {
  const peak = info?.peak;
  const d = peak instanceof Date ? peak : peak?.date;
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) throw new TypeError('Eclipse peak time unavailable.');
  return d;
}

function packSolar(info) {
  const peak = peakDate(info);
  return { type: 'solar', kind: String(info.kind || ''), peak: peak.toISOString(), ms: peak.getTime(), distanceKm: info.distance, lat: info.latitude, lon: info.longitude };
}

function packLunar(info) {
  const peak = peakDate(info);
  return { type: 'lunar', kind: String(info.kind || ''), peak: peak.toISOString(), ms: peak.getTime() };
}

/**
 * @param {{now?: () => number}} options  `now` is Date.now, injectable for tests.
 */
export function createClock({ now = Date.now } = {}) {
  if (typeof now !== 'function') throw new TypeError('now must be a function.');
  let live = true, speed = 1, sim = now(), wall = sim;

  function sync(wallMs = now()) {
    const w = Number(wallMs);
    if (!Number.isFinite(w)) throw new TypeError('A valid wall time is required.');
    if (live) sim = w;
    else sim += (w - wall) * speed;
    wall = w;
    return sim;
  }

  function state() {
    sync();
    return {
      live, speed, moving: !live && speed !== 0, at: new Date(sim).toISOString(), ms: sim,
      utcInput: toUtcInput(sim), label: formatSimLabel(sim),
    };
  }

  function setLive() {
    live = true; speed = 1; sim = now(); wall = sim; return state();
  }

  function setSpeed(value) {
    const s = Number(value);
    if (!SPEED_SET.has(s)) throw new TypeError('Speed must be one of ' + SPEEDS.join(', ') + '.');
    sync();
    live = false;
    speed = s;
    return state();
  }

  function setDate(value) {
    const d = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : fromUtcInput(value) || new Date(value);
    const ms = d instanceof Date ? d.getTime() : NaN;
    if (!Number.isFinite(ms)) throw new TypeError('A valid UTC time is required.');
    live = false;
    speed = 0;
    sim = ms;
    wall = now();
    return state();
  }

  function reverse() {
    const s = state();
    if (s.live || s.speed === 0) return setSpeed(-1);
    return setSpeed(-s.speed);
  }

  function tick() { return sync(); }

  async function jumpSolar() {
    const A = await import('./vendor/astronomy/astronomy.js');
    const start = new Date(sync());
    let info = A.SearchGlobalSolarEclipse(start);
    if (peakDate(info).getTime() <= sim + 60000) info = A.NextGlobalSolarEclipse(info.peak);
    setDate(peakDate(info));
    return packSolar(info);
  }

  async function jumpLunar() {
    const A = await import('./vendor/astronomy/astronomy.js');
    const start = new Date(sync());
    let info = A.SearchLunarEclipse(start);
    if (peakDate(info).getTime() <= sim + 60000) info = A.NextLunarEclipse(info.peak);
    setDate(peakDate(info));
    return packLunar(info);
  }

  return {
    tick, setLive, setSpeed, setDate, reverse, jumpSolar, jumpLunar, getState: state,
    isLive: () => live, speed: () => speed, moving: () => !live && speed !== 0, ms: () => sync(),
    date: () => new Date(sync()),
  };
}
