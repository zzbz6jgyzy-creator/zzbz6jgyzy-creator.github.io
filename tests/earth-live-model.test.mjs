import assert from 'node:assert/strict';
import {solarPosition,geoVector,vectorGeo,sunAt,parsePlace,longitude,satelliteURL,weatherAge} from '../earth-live-model.js';
// Independent astronomical bounds: March equinox, June/December solstices, solar noon.
for(const [date,declination] of [['2026-03-20T14:46:00Z',0],['2026-06-21T08:24:00Z',23.44],['2026-12-21T20:50:00Z',-23.44]]){
  const sun=solarPosition(Date.parse(date));assert.ok(Math.abs(sun.lat-declination)<.2,JSON.stringify(sun));
  assert.equal(sunAt(sun.lat,sun.lon,Date.parse(date)).phase,'Daylight');
  assert.equal(sunAt(-sun.lat,longitude(sun.lon+180),Date.parse(date)).phase,'Night');
}
assert.ok(Math.abs(solarPosition(Date.parse('2026-03-20T12:00:00Z')).lon)<3,'Equinox solar noon should be near Greenwich');
for(const [lat,lon] of [[0,0],[90,0],[-45,179.99],[25,-179.99],[51.5,-.12]]){const point=vectorGeo(geoVector(lat,lon));assert.ok(Math.abs(point.lat-lat)<1e-8);assert.ok(Math.abs(longitude(point.lon-lon))<1e-8);}
assert.equal(longitude(-901),179);assert.equal(longitude(900),-180);
assert.equal(parsePlace('Tokyo').timeZone,'Asia/Tokyo');assert.equal(parsePlace('51.5, -0.12').lat,51.5);
for(const text of ['NaN, 1','90, 0','0, 181','<script>','hello'])assert.equal(parsePlace(text),null);
const url=new URL(satelliteURL(-33.8584,151.2124));assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('basemap'),'satellite');assert.equal(url.searchParams.get('api'),'1');assert.equal(url.searchParams.get('center'),'-33.858400,151.212400');
assert.throws(()=>satelliteURL(0,NaN));
const now=Date.parse('2026-10-29T12:00:00Z');assert.equal(weatherAge('2026-10-29T09:00:00Z',now).stale,false);assert.equal(weatherAge('2026-10-28T18:00:00Z',now).stale,true);assert.equal(weatherAge('2027-01-01',now).valid,false);assert.equal(weatherAge('bad',now).valid,false);
console.log('Earth solar, geography, safe coordinates and cloud-age checks passed.');
