import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const modules = dirname(dirname(require.resolve('esbuild/package.json')));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function fixture(root) {
  mkdirSync(join(root, 'scripts'), { recursive: true });
  copyFileSync(join(ROOT, 'scripts/build-js.mjs'), join(root, 'scripts/build-js.mjs'));
  writeFileSync(join(root, 'scripts/js-bundles.json'), JSON.stringify({ outDir: 'assets/js', bundles: { core: ['core.js'], updates: ['updates.js'] } }));
  writeFileSync(join(root, 'core.js'), 'window.coreReady = true;');
  writeFileSync(join(root, 'updates.js'), 'window.updatesReady = true;');
  writeFileSync(join(root, 'clock.cjs'), "Date.prototype.toISOString = () => process.env.BUNDLE_TEST_STAMP;");
  writeFileSync(join(root, '.gitignore'), 'node_modules\n');
  writeFileSync(join(root, 'index.html'), '<h1>Original homepage</h1>');
}

function build(root, stamp) {
  execFileSync(process.execPath, ['--require', join(root, 'clock.cjs'), join(root, 'scripts/build-js.mjs')], {
    cwd: root, env: { ...process.env, BUNDLE_TEST_STAMP: stamp }, stdio: 'pipe',
  });
  return Object.fromEntries(readdirSync(join(root, 'assets/js')).sort().map(name => [name, readFileSync(join(root, 'assets/js', name), 'utf8')]));
}

function connectModules(root) { symlinkSync(modules, join(root, 'node_modules'), 'dir'); }
function identity(root) { git(root, 'config', 'user.name', 'Bundle regression test'); git(root, 'config', 'user.email', 'bundle-test@example.invalid'); }

test('identical builds at different times are byte-identical; changed sources change only their bundle', () => {
  const root = mkdtempSync(join(tmpdir(), 'sd-bundle-build-'));
  try {
    fixture(root); connectModules(root);
    const first = build(root, '2026-10-23T01:00:00Z');
    assert.deepEqual(build(root, '2026-10-24T22:00:00Z'), first);
    const before = JSON.parse(first['manifest.json']);
    assert.equal('generated' in before, false);
    writeFileSync(join(root, 'updates.js'), 'window.updatesReady = "changed";');
    const next = build(root, '2027-01-01T00:00:00Z');
    const after = JSON.parse(next['manifest.json']);
    assert.deepEqual(after.bundles.core, before.bundles.core);
    assert.notEqual(after.bundles.updates.file, before.bundles.updates.file);
    assert.equal(next[before.bundles.core.file.split('/').at(-1)], first[before.bundles.core.file.split('/').at(-1)]);
    assert.equal(before.bundles.updates.file.split('/').at(-1) in next, false, 'stale output is removed');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('concurrent homepage and bundle jobs rebase cleanly from the old timestamped manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'sd-bundle-race-'));
  try {
    const remote = join(root, 'remote.git'), home = join(root, 'home'), bundle = join(root, 'bundle');
    git(root, 'init', '--bare', '--initial-branch=main', remote);
    git(root, 'clone', remote, home); identity(home); fixture(home); connectModules(home);
    const files = build(home, '2026-10-23T00:00:00Z');
    const manifest = JSON.parse(files['manifest.json']);
    writeFileSync(join(home, 'assets/js/manifest.json'), JSON.stringify({ generated: '2026-10-22T00:00:00Z', ...manifest }, null, 2) + '\n');
    git(home, 'add', '.'); git(home, 'commit', '-m', 'Old timestamped build'); git(home, 'push', 'origin', 'main');
    git(root, 'clone', remote, bundle); identity(bundle); connectModules(bundle);
    build(home, '2026-10-23T01:00:00Z');
    writeFileSync(join(home, 'index.html'), '<h1>New homepage headlines</h1>');
    git(home, 'add', '.'); git(home, 'commit', '-m', 'Homepage rebuild');
    build(bundle, '2026-10-23T01:00:09Z');
    git(bundle, 'add', '.'); git(bundle, 'commit', '-m', 'Bundle rebuild'); git(bundle, 'push', 'origin', 'main');
    git(home, 'pull', '--rebase'); git(home, 'push', 'origin', 'main');
    assert.equal(git(root, '--git-dir', remote, 'show', 'main:index.html'), '<h1>New homepage headlines</h1>');
    assert.deepEqual(JSON.parse(git(root, '--git-dir', remote, 'show', 'main:assets/js/manifest.json')), manifest);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
