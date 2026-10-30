import assert from 'node:assert/strict';
import * as M from '../earth-cosmos-model.js';
import * as L from '../earth-live-model.js';
const date=new Date('2026-10-29T00:00:00Z'),e=M.ephemeris(date);
assert.ok(M.length(e.positions.Moon)>350000&&M.length(e.positions.Moon)<405000);
assert.ok(M.length(e.positions.Sun)/M.AU>.98&&M.length(e.positions.Sun)/M.AU<1.02);
assert.ok(M.length(e.positions.Neptune)/M.AU>28&&M.length(e.positions.Neptune)/M.AU<32);
assert.ok(e.moonPhase>=0&&e.moonPhase<360);
// IAU Galactic-centre sight line: RA 266.4051°, Dec −28.936175°.
const a=266.4051*Math.PI/180,b=-28.936175*Math.PI/180;
const gc=M.eqToGal([Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)]);
assert.ok(gc[0]>.99999&&Math.abs(gc[1])<.0001&&Math.abs(gc[2])<.0001);
for(const v of [[1,0,0],[0,1,0],[0,0,1],[.3,-.7,.2]]){const r=M.galToEq(M.eqToGal(v));assert.ok(r.every((n,i)=>Math.abs(n-v[i])<1e-10));}
// The lunar prime meridian must face Earth to within its real libration.
const prime=M.bodyAxes('Moon',date)[0],towardsEarth=e.positions.Moon.map(n=>-n/M.length(e.positions.Moon));assert.ok(prime.reduce((v,n,i)=>v+n*towardsEarth[i],0)>.98);
for(const id of M.BODIES.map(b=>b.id)){const axes=M.bodyAxes(id,date);for(const a of axes)assert.ok(Math.abs(M.length(a)-1)<1e-10);const dot=axes[0].reduce((n,v,i)=>n+v*axes[1][i],0);assert.ok(Math.abs(dot)<1e-10);}
assert.equal(M.levelFor(24000),'earth');assert.equal(M.levelFor(1e6,'Moon'),'lunar');assert.equal(M.levelFor(M.AU*95,'Sun'),'solar');assert.equal(M.levelFor(M.LY*180000,'Galaxy'),'galaxy');
const pop=M.galaxyPopulation(4000);assert.equal(pop.positions.length,12000);assert.equal(pop.model,true);assert.equal(pop.diameterLy,100000);assert.ok(M.length(M.SUN_GALACTIC)>8&&M.length(M.SUN_GALACTIC)<8.4);
for(const v of pop.positions)assert.ok(Number.isFinite(v));
assert.equal(M.unitFor(24000),M.EARTH_RADIUS);assert.equal(M.scalePreset('solar').focus,'Sun');assert.throws(()=>M.scalePreset('garbage'));
// The full galactic disk must fit the narrower field of view of a portrait phone.
for(const [w,h] of [[1440,900],[390,844],[280,1000]]){
 const vertical=42*Math.PI/180,horizontal=2*Math.atan(Math.tan(vertical/2)*w/h),fit=1/Math.sin(Math.min(vertical,horizontal)*(w/h<1.1?.98:.8)/2);
 const distance=M.scalePreset('galaxy',fit).distance;
 const projectedRadius=15.5*M.KPC/distance*h/(2*Math.tan(vertical/2));
 assert.ok(projectedRadius<w*.47&&distance<M.MAX_RANGE,[w,h,projectedRadius,distance]);
}
console.log('Current ephemerides, lunar orientation, IAU galactic axes, physical scales and bounded galaxy model verified.');

// Immersive viewer structure (stage 1): intro overlay, HUD, slide-out panel, hooks the script relies on.
import { readFileSync, existsSync } from 'node:fs';
const html = readFileSync(new URL('../mission-control.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../earth-preview.js', import.meta.url), 'utf8');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const used = new Set([...js.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(m => m[1]));
for (const id of used) assert.ok(ids.has(id), 'earth-preview.js uses #' + id + ' but the page has no such id');
assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'exactly one h1');
const hud = html.slice(html.indexOf('id="earth-hud"'), html.indexOf('id="cosmos-labels"'));
for (const id of ['earth-motion', 'earth-fullscreen', 'earth-menu']) assert.ok(hud.includes('id="' + id + '"'), id + ' belongs in the HUD');
const panel = html.slice(html.indexOf('<dialog class="earth-panel"'), html.indexOf('</dialog>', html.indexOf('<dialog class="earth-panel"')));
for (const hook of ['data-earth-scale', 'data-earth-zoom', 'earth-reset', 'cosmos-deep-sky', 'earth-quality', 'earth-labels-toggle', 'earth-location', 'earth-explore', 'earth-fly-here', 'earth-utc', 'cosmos-distance', 'earth-weather-refresh', 'earth-about', '/starship-replay.html', 'EUMETSAT', 'Brunier', 'cosmos-sky-credit'])
  assert.ok(panel.includes(hook), hook + ' must be in the panel');
assert.ok(!html.includes('earth-copy') && !html.includes('earth-controls') && !html.includes('earth-bottom'), 'no text or dock layers over the canvas');
assert.ok(/<div class="earth-intro-overlay" id="earth-intro" role="dialog" aria-modal="true"/.test(html) && html.includes('id="earth-enter"'), 'intro overlay with Enter');
assert.ok(html.includes("sessionStorage.getItem('sd-earth-intro')") && js.includes("sessionStorage.setItem('sd-earth-intro'"), 'intro dismissal is remembered for the session, guarded by try/catch');
assert.ok(/try\{[^}]*sd-earth-labels/.test(js.replace(/\s/g, '')) || js.includes("localStorage.getItem('sd-earth-labels')"), 'label choice persists');
assert.ok(html.includes('data-labels="off"'), 'labels are off by default');
assert.ok(html.includes('id="earth-live"') && /id="earth-live" role="status"/.test(html), 'live region announces the view');
for (const m of html.matchAll(/(?:earth-[a-z-]+\.(?:js|css)|\/earth-[a-z-]+\.js)\?v=([\w-]+)/g)) assert.equal(m[1], '20261030-noground1', 'consistent ?v= token');
// No ground mode: owner decision 30 Oct 2026. Nothing for the street map may come back.
for (const banned of ['ground-stage', 'ground-map', 'data-earth-mode', 'earth-return', 'earth-ground-open', 'ground-terrain', 'ground-buildings', 'earth-satellite', 'maplibre', 'openfreemap', 'openstreetmap', 'OpenMapTiles'])
  assert.ok(!html.toLowerCase().includes(banned.toLowerCase()) && !js.toLowerCase().includes(banned.toLowerCase()), banned + ' must not appear in the page or its script');
for (const gone of ['earth-ground.js', 'vendor/maplibre']) assert.ok(!existsSync(new URL('../' + gone, import.meta.url)), gone + ' was removed');
// Zoom floor: one named constant, a soft approach and a hard guarantee.
assert.equal(L.MIN_ORBIT_ALTITUDE_KM, 400, 'floor is a realistic low orbit (ISS ~400 km)');
{
  let alt = 20000;
  for (let i = 0; i < 200; i++) { alt = L.easeToAltitudeFloor(alt, alt - 900); assert.ok(alt >= L.MIN_ORBIT_ALTITUDE_KM, 'never below the floor: ' + alt); }
  assert.equal(alt, L.MIN_ORBIT_ALTITUDE_KM, 'repeated zoom-in settles exactly on the floor');
  assert.equal(L.easeToAltitudeFloor(400, -5000), 400); assert.equal(L.easeToAltitudeFloor(400, 100), 400);
  assert.equal(L.easeToAltitudeFloor(5000, 8000), 8000, 'zooming out is not eased');
  // Approach is monotone and geometric: no overshoot, no oscillation.
  let a = 1000, last = a; for (let i = 0; i < 12; i++) { a = L.easeToAltitudeFloor(a, 0); assert.ok(a <= last && a >= 400); last = a; }
  assert.ok(L.easeToAltitudeFloor(1000, 900) === 900, 'ordinary steps well above the floor are untouched');
}
const rend = readFileSync(new URL('../earth-renderer.js', import.meta.url), 'utf8');
assert.ok(rend.includes('MIN_ORBIT_ALTITUDE_KM') && rend.includes('earthMaxZoom'), 'renderer enforces the floor');
console.log('Immersive viewer structure, hooks, credits-in-panel and session/label persistence verified.');
