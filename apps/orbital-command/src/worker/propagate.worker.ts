/**
 * SGP4 off the main thread. The renderer interpolates between ticks.
 * Selected-object inspector should re-propagate on the main thread for accuracy.
 */
import * as satellite from "satellite.js";

interface InitMsg {
  type: "init";
  objects: { norad: number; tle1: string; tle2: string; meanMotion: number }[];
}

interface TickMsg {
  type: "tick";
  timeMs: number;
  norads?: number[];
}

type InMsg = InitMsg | TickMsg;

interface RecRow {
  norad: number;
  rec: ReturnType<typeof satellite.twoline2satrec>;
  meanMotion: number;
}

const recs: RecRow[] = [];
const byNorad = new Map<number, RecRow>();

function geodeticToScene(lat: number, lon: number, altKm: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  const r = 1 + altKm / 6371;
  const c = Math.cos(la);
  return [r * c * Math.cos(lo), r * Math.sin(la), -r * c * Math.sin(lo)];
}

self.onmessage = (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (msg.type === "init") {
    recs.length = 0;
    byNorad.clear();
    for (const o of msg.objects) {
      try {
        const rec = satellite.twoline2satrec(o.tle1, o.tle2);
        if (!rec || rec.error) continue;
        const row = { norad: o.norad, rec, meanMotion: o.meanMotion };
        recs.push(row);
        byNorad.set(o.norad, row);
      } catch {
        /* skip bad TLE */
      }
    }
    self.postMessage({ type: "ready", count: recs.length });
    return;
  }
  if (msg.type === "tick") {
    const date = new Date(msg.timeMs);
    const gmst = satellite.gstime(date);
    const list = msg.norads ? msg.norads.map((n) => byNorad.get(n)).filter((x): x is RecRow => !!x) : recs;
    const buf = new Float32Array(list.length * 8);
    let w = 0;
    for (const row of list) {
      const pv = satellite.propagate(row.rec, date);
      const position = pv.position;
      if (!position || position === true) continue;
      const geo = satellite.eciToGeodetic(position, gmst);
      const lat = satellite.degreesLat(geo.latitude);
      const lon = satellite.degreesLong(geo.longitude);
      const alt = geo.height;
      if (![lat, lon, alt].every(Number.isFinite)) continue;
      const [x, y, z] = geodeticToScene(lat, lon, alt);
      const i = w * 8;
      buf[i] = row.norad;
      buf[i + 1] = x;
      buf[i + 2] = y;
      buf[i + 3] = z;
      buf[i + 4] = lat;
      buf[i + 5] = lon;
      buf[i + 6] = alt;
      const vel = pv.velocity && pv.velocity !== true ? pv.velocity : null;
      buf[i + 7] = vel ? Math.hypot(vel.x, vel.y, vel.z) : 0;
      w += 1;
    }
    const packed = buf.slice(0, w * 8);
    (self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
      { type: "positions", timeMs: msg.timeMs, count: w, buffer: packed.buffer },
      [packed.buffer],
    );
  }
};
