// Shared helpers for the audit scripts: tool install, browser lookup, optional local server.
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TOOLS = process.env.SD_AUDIT_TOOLS || path.join(os.homedir(), '.cache', 'sd-audit');

/** Install the audit toolchain once (playwright-core, axe, lighthouse); no browser download. */
export function tools() {
  fs.mkdirSync(TOOLS, { recursive: true });
  const marker = path.join(TOOLS, 'node_modules', 'lighthouse', 'package.json');
  if (!fs.existsSync(marker)) {
    fs.writeFileSync(path.join(TOOLS, 'package.json'), '{"private":true,"name":"sd-audit-tools"}');
    console.error('Installing audit tools into ' + TOOLS + ' (one time)…');
    execFileSync('npm', ['i', '--no-audit', '--no-fund', 'playwright-core', '@axe-core/playwright', 'lighthouse'], { cwd: TOOLS, stdio: 'inherit' });
  }
  return createRequire(path.join(TOOLS, 'package.json'));
}

/** Chrome/Chromium for Playwright and Lighthouse. */
export function chromePath() {
  const env = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE || process.env.CHROME_BIN;
  if (env && fs.existsSync(env)) return env;
  const pw = '/opt/pw-browsers';
  if (fs.existsSync(pw)) {
    for (const d of fs.readdirSync(pw).filter((n) => /^chromium-\d+/.test(n)).sort().reverse()) {
      const p = path.join(pw, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  for (const n of ['google-chrome', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [n]).toString().trim(); } catch { /* next */ }
  }
  throw new Error('No Chrome/Chromium found. Set CHROMIUM_PATH.');
}

/** Proxy for Chromium when auditing a live https site from the cloud sandbox. */
export function proxyFor(url) {
  return /^https:/.test(url) && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
}

/** Turn a path ("/starship.html") or URL into { base, url, stop() }; serves the repo locally for paths. */
export async function target(arg, { live = false } = {}) {
  if (/^https?:\/\//.test(arg)) {
    const u = new URL(arg);
    return { base: u.origin, url: arg, local: false, stop() {} };
  }
  const p = arg.startsWith('/') ? arg : '/' + arg;
  if (live) return { base: 'https://superchargeddaily.com', url: 'https://superchargeddaily.com' + p, local: false, stop() {} };
  const port = 4300 + Math.floor(Math.random() * 500);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  return { base: `http://127.0.0.1:${port}`, url: `http://127.0.0.1:${port}${p}`, local: true, stop() { srv.kill(); } };
}

export const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];
export const SCHEMES = ['light', 'dark'];

/** Block third-party requests on local audits so results don't depend on the network. */
export async function isolate(ctx, local) {
  if (local) await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
}
