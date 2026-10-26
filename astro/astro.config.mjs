// @ts-check
import { defineConfig } from 'astro/config';

// The existing site lives at the repo root and is copied into ./.legacy by scripts/prepare-legacy.mjs, which Astro serves
// as its public dir. Pages are ported into src/pages one at a time and listed in ported.json so the copy skips them.
export default defineConfig({
  site: 'https://superchargeddaily.com',
  output: 'static',
  publicDir: './.legacy',
  // Keep today's URLs: /tesla.html, /dispatch/<slug>.html. Never /tesla/.
  build: { format: 'file' },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
});
