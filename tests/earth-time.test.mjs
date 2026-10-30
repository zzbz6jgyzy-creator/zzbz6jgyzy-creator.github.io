// Simulated UTC clock: live tracking, speeds, reverse, freeze, date picking, eclipse jumps.
import assert from 'node:assert/strict';
import { createClock, SPEEDS, toUtcInput, fromUtcInput, formatSimLabel } from '../earth-time.js';

assert.deepEqual([...SPEEDS], [-10000, -1000, -100, -10, -1, 0, 1, 10, 100, 1000, 10000]);
assert.ok(Object.isFrozen(SPEEDS));

{
  const d = fromUtcInput('2024-04-08T18:17');
  assert.equal(d.toISOString(), '2024-04-08T18:17:00.000Z');
  assert.equal(toUtcInput(d.getTime()), '2024-04-08T18:17');
  assert.equal(fromUtcInput('2024-04-08T18:17:30Z').toISOString(), '2024-04-08T18:17:30.000Z');
  assert.equal(fromUtcInput('garbage'), null);
  assert.equal(fromUtcInput('0050-06-01T00:00'), null);
  assert.equal(formatSimLabel(Date.parse('2024-04-08T18:17:00Z')), '18:17 UTC 8 Apr 2024');
}

{
  let t = 1_700_000_000_000;
  const clock = createClock({ now: () => t });
  let s = clock.getState();
  assert.equal(s.live, true);
  assert.equal(s.speed, 1);
  assert.equal(s.ms, t);
  t += 5000;
  clock.tick();
  assert.equal(clock.ms(), t, 'live tracks the wall clock');
}

{
  let t = 1_700_000_000_000;
  const clock = createClock({ now: () => t });
  clock.setSpeed(1000);
  clock.tick();
  t += 1000;
  const start = clock.ms();
  t += 1000;
  clock.tick();
  assert.equal(clock.ms() - start, 1_000_000, '1000× advances 1000 s in 1 s of wall time');
  assert.equal(clock.getState().live, false);
  assert.equal(clock.moving(), true);
}
{
  let t = 1_700_000_000_000;
  const clock = createClock({ now: () => t });
  clock.setSpeed(1000);
  t += 500;
  clock.tick();
  t += 500;
  const mid = clock.ms();
  t += 1000;
  clock.tick();
  assert.equal(clock.ms() - mid, 1_000_000, 'tick() and ms() share one wall cursor, so elapsed time is counted once');
}

{
  let t = 1_700_000_000_000;
  const clock = createClock({ now: () => t });
  clock.setSpeed(-100);
  clock.tick();
  t += 1000;
  const start = clock.ms();
  t += 1000;
  clock.tick();
  assert.equal(clock.ms() - start, -100_000, 'reverse 100× goes backwards');
}

{
  let t = 1_700_000_000_000;
  const clock = createClock({ now: () => t });
  clock.setDate('2024-04-08T18:17');
  const s = clock.getState();
  assert.equal(s.live, false);
  assert.equal(s.speed, 0);
  assert.equal(s.moving, false);
  assert.equal(s.at, '2024-04-08T18:17:00.000Z');
  t += 10_000;
  clock.tick();
  assert.equal(clock.ms(), Date.parse('2024-04-08T18:17:00Z'), 'frozen date does not drift');
}

{
  let t = 1_700_000_000_000;
  const clock = createClock({ now: () => t });
  clock.setDate('2024-04-08T18:17');
  clock.setSpeed(10);
  clock.tick();
  const start = clock.ms();
  t += 1000;
  clock.tick();
  assert.equal(clock.ms() - start, 10_000, 'a speed after a date plays from that instant');
  clock.setLive();
  t += 1;
  const live = clock.getState();
  assert.equal(live.live, true);
  assert.equal(live.speed, 1);
  assert.equal(live.ms, t);
}

{
  const clock = createClock({ now: () => 1_700_000_000_000 });
  clock.reverse();
  assert.equal(clock.speed(), -1);
  clock.setSpeed(1000);
  clock.reverse();
  assert.equal(clock.speed(), -1000);
  clock.reverse();
  assert.equal(clock.speed(), 1000);
  assert.throws(() => clock.setSpeed(7), /Speed must be/);
  assert.throws(() => clock.setDate('not-a-date'), /valid UTC/);
}

{
  const clock = createClock({ now: () => Date.parse('2024-04-01T00:00:00Z') });
  const solar = await clock.jumpSolar();
  assert.equal(solar.type, 'solar');
  assert.equal(solar.kind, 'total');
  const peak = new Date(solar.peak);
  assert.equal(peak.toISOString().slice(0, 10), '2024-04-08', 'next solar after 1 Apr 2024 is 8 Apr 2024');
  assert.ok(Math.abs(peak.getTime() - Date.parse('2024-04-08T18:18:00Z')) < 15 * 60000, 'peak within 15 min of 18:18 UTC: ' + solar.peak);
  assert.equal(clock.getState().live, false);
  assert.equal(clock.getState().at, solar.peak);
  // A second jump from the peak itself must skip this eclipse.
  const next = await clock.jumpSolar();
  assert.ok(new Date(next.peak).getTime() > peak.getTime() + 86400000, 'next solar after the 8 Apr peak is a later eclipse');
}

{
  const clock = createClock({ now: () => Date.parse('2025-03-01T00:00:00Z') });
  const lunar = await clock.jumpLunar();
  assert.equal(lunar.type, 'lunar');
  assert.equal(lunar.kind, 'total');
  const peak = new Date(lunar.peak);
  assert.equal(peak.toISOString().slice(0, 10), '2025-03-14', 'next lunar after 1 Mar 2025 is 14 Mar 2025');
  assert.ok(Math.abs(peak.getTime() - Date.parse('2025-03-14T06:59:00Z')) < 20 * 60000, 'peak near 06:59 UTC: ' + lunar.peak);
}

console.log('Simulated clock, speeds, freeze, UTC picker and eclipse jumps verified.');
