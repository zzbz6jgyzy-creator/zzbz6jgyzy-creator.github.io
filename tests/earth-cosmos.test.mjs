import assert from 'node:assert/strict';
import * as M from '../earth-cosmos-model.js';
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
console.log('Current ephemerides, lunar orientation, IAU galactic axes, physical scales and bounded galaxy model verified.');
