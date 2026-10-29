import test from 'node:test';
import assert from 'node:assert/strict';
import {FLIGHT,CHAPTERS,ARCHIVE,sampleFlight,shipPosition,cinematicTime,clock} from '../starship-replay-model.js';
import {SHIP_POSITIONS} from '../starship-replay-positions.js';

test('Replay follows the early-return mission, not the abandoned ten-hour plan',()=>{
  assert.ok(FLIGHT.duration>3*3600&&FLIGHT.duration<3.2*3600);
  assert.equal(FLIGHT.ship,'S41');assert.equal(FLIGHT.booster,'B21');
  assert.equal(sampleFlight(FLIGHT.duration).deployed,26);
  assert.ok(CHAPTERS.find(c=>c.id==='deorbit').t<3*3600);
});
test('Stage and mission boundaries are finite, continuous and bounded during scrubbing',()=>{
  let lastAltitude=0;
  for(let t=-1;t<FLIGHT.duration+2;t+=.7){
    const s=sampleFlight(t);
    assert.ok(Number.isFinite(s.shipAltitude)&&s.shipAltitude>=0&&s.shipAltitude<=280);
    assert.ok(Number.isFinite(s.boosterAltitude)&&s.boosterAltitude>=0&&s.boosterAltitude<=110);
    assert.ok(Math.abs(s.shipAltitude-lastAltitude)<3,'altitude discontinuity at '+t);
    assert.ok(s.shipEngine>=0&&s.shipEngine<=1&&s.boosterEngine>=0&&s.boosterEngine<=1);
    assert.ok(s.deployed>=0&&s.deployed<=26);
    lastAltitude=s.shipAltitude;
  }
  assert.equal(sampleFlight(141.9).separated,false);assert.equal(sampleFlight(142).separated,true);
  assert.equal(sampleFlight(422).boosterLanded,true);assert.equal(sampleFlight(422).shipLanded,false);
  assert.equal(sampleFlight(FLIGHT.duration).shipAltitude,0);
});
test('Guided cut is monotonic and reaches the real end without inventing an extended coast',()=>{
  let last=0;for(let s=0;s<=150;s+=.25){const t=cinematicTime(s);assert.ok(t>=last&&t<=FLIGHT.duration);last=t;}
  assert.equal(cinematicTime(150),FLIGHT.duration);assert.equal(clock(7938),'T+02:12:18');
  for(let i=1;i<CHAPTERS.length;i++)assert.ok(CHAPTERS[i].t>CHAPTERS[i-1].t);
});

test('Recorded positions retain their cadence and end in the North Pacific, with dateline-safe interpolation',()=>{
  assert.equal(ARCHIVE.count,373);assert.ok(ARCHIVE.maxGap<41);
  assert.ok(ARCHIVE.first<0&&ARCHIVE.last>=FLIGHT.duration);
  for(let i=0;i<SHIP_POSITIONS.length;i++){
    const row=SHIP_POSITIONS[i];assert.ok(row.every(Number.isFinite));
    if(i)assert.ok(row[0]>SHIP_POSITIONS[i-1][0]);
    assert.ok(Math.abs(row[2])<=90&&Math.abs(row[3])<=180);
    if(row[0]>=0&&row[0]<=FLIGHT.duration){const p=shipPosition(row[0]);assert.ok(Math.abs(p.lat-row[2])<1e-6);assert.ok(Math.abs(p.lon-row[3])<1e-6);}
  }
  const end=shipPosition(FLIGHT.duration);assert.ok(Math.abs(end.lat-25.499295)<.01&&Math.abs(end.lon+155.427536)<.01);
  for(let t=1;t<FLIGHT.duration;t++){
    const a=shipPosition(t-1),b=shipPosition(t),delta=((b.lon-a.lon+540)%360)-180;
    assert.ok(Math.abs(delta)<.15,'longitude jump at '+t);
  }
});
