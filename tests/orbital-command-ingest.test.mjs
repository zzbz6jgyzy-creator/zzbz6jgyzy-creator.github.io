import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'build-orbital-command-gp.py');
const TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

const TLE_BODY = [
  'ISS (ZARYA)',
  TLE1,
  TLE2,
  'HST',
  TLE1.replace('25544', '20580'),
  TLE2.replace('25544', '20580'),
  'CSS (TIANHE)',
  TLE1.replace('25544', '48274'),
  TLE2.replace('25544', '48274'),
].join('\n');

const OMM = [
  {OBJECT_NAME: 'ISS (ZARYA)', NORAD_CAT_ID: 25544, EPOCH: '2026-10-26T09:00:00', BSTAR: 1e-5, OBJECT_TYPE: 'PAYLOAD'},
  {OBJECT_NAME: 'HST', NORAD_CAT_ID: 20580, EPOCH: '2026-10-26T09:00:00', BSTAR: 1e-5, OBJECT_TYPE: 'PAYLOAD'},
  {OBJECT_NAME: 'CSS', NORAD_CAT_ID: 48274, EPOCH: '2026-10-26T09:00:00', BSTAR: 1e-5, OBJECT_TYPE: 'PAYLOAD'},
];

function localScript(dir) {
  const script = fs.readFileSync(SCRIPT, 'utf8').replace(
    'ROOT = Path(__file__).resolve().parents[1]',
    `ROOT = Path(${JSON.stringify(dir)})`,
  );
  const dest = path.join(dir, 'build.py');
  fs.writeFileSync(dest, script);
  return dest;
}

test('successful fixture fetch writes a validated snapshot', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gp-'));
  const dataDir = path.join(dir, 'data', 'orbital-command');
  fs.mkdirSync(dataDir, {recursive: true});
  const tlePath = path.join(dir, 'fixture.tle');
  const jsonPath = path.join(dir, 'fixture.json');
  fs.writeFileSync(tlePath, TLE_BODY);
  fs.writeFileSync(jsonPath, JSON.stringify(OMM));
  execFileSync('python3', [localScript(dir)], {
    env: {
      ...process.env,
      CELESTRAK_BASE: 'http://fixtures.test/gp',
      OC_GP_FIXTURE_TLE: tlePath,
      OC_GP_FIXTURE_JSON: jsonPath,
    },
    encoding: 'utf8',
  });
  const snap = JSON.parse(fs.readFileSync(path.join(dataDir, 'snapshot.json'), 'utf8'));
  assert.equal(snap.schema, 'orbital-command.snapshot.v1');
  assert.equal(snap.stale, false);
  assert.ok(snap.objects.length >= 3);
  assert.ok(snap.objects.every((o) => o.norad && o.tle1 && o.epoch && o.retrievedAt));
  assert.equal(new Set(snap.objects.map((o) => o.norad)).size, snap.objects.length);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('upstream failure keeps the last valid snapshot', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gp-bad-'));
  const dataDir = path.join(dir, 'data', 'orbital-command');
  fs.mkdirSync(dataDir, {recursive: true});
  const last = {
    schema: 'orbital-command.snapshot.v1',
    retrievedAt: '2026-10-25T00:00:00Z',
    source: {name: 'CelesTrak', url: 'x', attribution: 'x'},
    stale: false,
    lastSuccessAt: '2026-10-25T00:00:00Z',
    error: null,
    objects: [{norad: 25544, name: 'ISS', tle1: TLE1, tle2: TLE2, epoch: '2026-10-25T00:00:00Z', retrievedAt: '2026-10-25T00:00:00Z'}],
  };
  fs.writeFileSync(path.join(dataDir, 'snapshot.json'), JSON.stringify(last));
  const out = execFileSync('python3', [localScript(dir)], {
    env: {
      ...process.env,
      CELESTRAK_BASE: 'http://127.0.0.1:1/nope',
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
    },
    encoding: 'utf8',
  });
  const snap = JSON.parse(fs.readFileSync(path.join(dataDir, 'snapshot.json'), 'utf8'));
  assert.match(out, /kept last-good/);
  assert.equal(snap.stale, true);
  assert.equal(snap.objects[0].norad, 25544);
  assert.equal(snap.retrievedAt, '2026-10-25T00:00:00Z');
  fs.rmSync(dir, {recursive: true, force: true});
});
