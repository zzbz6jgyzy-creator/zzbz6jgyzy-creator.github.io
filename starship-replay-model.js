/* Flight 14: one deterministic clock for every camera and stage. Units: seconds, km. */
import { SHIP_POSITIONS } from './starship-replay-positions.js';
export const FLIGHT = Object.freeze({
  name: 'Starship Flight 14', date: '28 September 2026',
  launchUTC: '2026-09-28T12:48:59Z', ship: 'S41', booster: 'B21',
  duration: 11324.4, staging: 142, boosterLanding: 421,
  sources: [
    { name: 'SpaceX · Flight 14 mission', url: 'https://www.spacex.com/launches/starship-flight-14' },
    { name: 'SpaceX · flight broadcast', url: 'https://x.com/i/broadcasts/1qxvvenMPMQxB' },
    { name: 'Launch Library 2 · hardware and outcomes', url: 'https://spacelaunchnow.app/launch/7d1afb26-6f9c-429b-9ccf-29012fd1e519/' },
    { name: 'AIAA · post-flight report', url: 'https://aerospaceamerica.aiaa.org/spacex-shortens-starships-first-orbital-flight-but-achieves-other-objectives/' },
    { name: 'SpaceX position feed · archived by StarDash', url: 'https://stardash.live/?replay=14' },
  ],
});

export const CHAPTERS = Object.freeze([
  { id: 'launch', t: 0, title: 'Leave Earth.', short: 'Liftoff', camera: 'cinema', kicker: '01 / STARBASE', text: 'Thirty-three Raptors. Two stages. One first orbital mission. Lift off from Pad 2 with Booster 21 and Ship 41.' },
  { id: 'staging', t: 142, title: 'Two paths begin.', short: 'Hot-staging', camera: 'cinema', kicker: '02 / SEPARATION', text: 'The Ship lights its engines while the stages are still together. Super Heavy turns back; Ship 41 continues towards orbit.' },
  { id: 'boostback', t: 160, title: 'Turn for home.', short: 'Boostback', camera: 'booster', kicker: '03 / SUPER HEAVY', text: 'The booster reverses course. Its boostback burn sets up an offshore return to the Gulf, rather than a tower catch.' },
  { id: 'booster', t: 402, title: 'Back to the water.', short: 'Booster landing', camera: 'booster', kicker: '04 / GULF RETURN', text: 'Super Heavy relights for its landing burn and makes a controlled ocean splashdown. The Ship’s journey carries on above.' },
  { id: 'orbit', t: 1517, title: 'An orbital first.', short: 'Orbit', camera: 'earth', kicker: '05 / LOW EARTH ORBIT', text: 'An in-space burn establishes Starship’s first orbital mission. The globe reveals the scale of a journey roughly 275 kilometres above Earth.' },
  { id: 'payload', t: 2140, title: 'A constellation begins.', short: 'Deploy', camera: 'ship', kicker: '06 / 26 STARLINK V3', text: 'Ship 41 releases the first operational batch of Starlink V3 satellites. The satellite separation pattern is an illustration, rather than a measured deployment geometry.' },
  { id: 'deorbit', t: 7938, title: 'The way back.', short: 'Deorbit', camera: 'earth', kicker: '07 / EARLY RETURN', text: 'An ascent engine shutdown led to a shorter mission. A deorbit burn sends the Ship towards the North Pacific after about two orbits.' },
  { id: 'entry', t: 10024, title: 'Into the fire.', short: 'Reentry', camera: 'ship', kicker: '08 / ATMOSPHERIC ENTRY', text: 'Heat-shield first, Ship 41 meets the atmosphere. A luminous plasma envelope illustrates entry heating; its colour and intensity are cinematic.' },
  { id: 'landing', t: 11293, title: 'One final manoeuvre.', short: 'Ship landing', camera: 'ship', kicker: '09 / NORTH PACIFIC', text: 'The Ship flips upright and fires its landing engines. The replay ends at the water; post-flight reporting records a loss shortly after splashdown.' },
]);

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const ARCHIVE = Object.freeze({count:SHIP_POSITIONS.length,first:SHIP_POSITIONS[0][0],last:SHIP_POSITIONS.at(-1)[0],maxGap:Math.max(...SHIP_POSITIONS.slice(1).map((r,i)=>r[0]-SHIP_POSITIONS[i][0]))});

export function shipPosition(value) {
  const t=clamp(Number(value)||0,SHIP_POSITIONS[0][0],SHIP_POSITIONS.at(-1)[0]);
  let lo=0,hi=SHIP_POSITIONS.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(SHIP_POSITIONS[mid][0]<=t)lo=mid;else hi=mid;}
  const a=SHIP_POSITIONS[lo],b=SHIP_POSITIONS[hi],span=b[0]-a[0];
  // A known liftoff anchor avoids interpolating upward movement before launch.
  const f=a[0]<0&&b[0]>0?(t<=0?0:clamp(t/b[0],0,1)):span?clamp((t-a[0])/span,0,1):0;
  const deltaLon=((b[3]-a[3]+540)%360)-180;
  return {lat:mix(a[2],b[2],f),lon:((a[3]+deltaLon*f+540)%360)-180,altitude:Math.max(0,mix(a[1],b[1],f)/1000),sampleBefore:a[0],sampleAfter:b[0],gap:span>60,kind:'interpolated-archive'};
}

export function clock(t) {
  const n = Math.floor(Math.max(0, Number(t) || 0));
  return 'T+' + [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60].map(v => String(v).padStart(2, '0')).join(':');
}

// The booster envelope is illustrative. The Ship path uses archived position samples.
const boosterEnvelope = [[0, 0], [20, .4], [58, 10], [142, 68], [187, 93], [245, 99], [310, 70], [365, 25], [396, 4], [415, .3], [421, 0]];

function interpolate(knots, t) {
  if (t <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (t <= knots[i][0]) return mix(knots[i - 1][1], knots[i][1], smooth(knots[i - 1][0], knots[i][0], t));
  }
  return knots.at(-1)[1];
}

export function sampleFlight(value) {
  const t = clamp(Number(value) || 0, 0, FLIGHT.duration);
  const chapter = [...CHAPTERS].reverse().find(c => t >= c.t) || CHAPTERS[0];
  const separated = t >= FLIGHT.staging;
  const position=shipPosition(t);
  const shipAltitude = t>=FLIGHT.duration?0:position.altitude;
  const boosterAltitude = t<=142?shipAltitude:Math.max(0,interpolate(boosterEnvelope,t)+(shipPosition(142).altitude-68)*(1-smooth(142,245,t)));
  const shipEngine = t < 140 ? 0 : t < 491 ? 1 : t >= 1517 && t <= 1538 ? .48 : t >= 7938 && t <= 7946 ? .3 : t >= 11293 && t < FLIGHT.duration ? .76 : 0;
  const boosterEngine = t < 140 ? 1 : t >= 147 && t < 187 ? .8 : t >= 396 && t < 421 ? mix(.95, .25, smooth(396, 421, t)) : 0;
  const entry = smooth(9920, 10330, t) * (1 - smooth(10980, 11290, t));
  const deploy = clamp((t - 2047) / (3879 - 2047), 0, 1);
  return {
    t, chapter, separated, shipAltitude, boosterAltitude, shipEngine, boosterEngine,position,
    entry, deploy, deployed: Math.floor(deploy * 26),
    shipLanded: t >= FLIGHT.duration, boosterLanded: t >= FLIGHT.boosterLanding,
    // A two-body-inspired overview, not recovered GPS coordinates.
    orbitalAngle: Math.max(0, t - 250) * Math.PI * 2 / 5400,
    earthRotation: t * Math.PI * 2 / 86164,
    separation: smooth(142, 156, t),
    flip: smooth(11295, 11303, t),
  };
}

export function cinematicTime(realSeconds) {
  // A 150-second guided cut. Every chapter still has its real mission clock.
  const cuts = [[0,0],[20,140],[33,160],[44,396],[57,421],[65,1517],[85,2140],[99,3879],[111,7938],[125,10024],[143,11293],[150,FLIGHT.duration]];
  return interpolate(cuts, clamp(realSeconds, 0, 150));
}
