# Orbital Command — deployment and operations

## How it ships

GitHub Pages serves the repo root. The built app is the committed directory `orbital-command/` (`base: /orbital-command/`).

```bash
cd apps/orbital-command
npm ci
npm test
npm run build    # writes ../../orbital-command
```

Preview the whole site: `python3 -m http.server 4173` from the repo root, then open `/orbital-command/`.

No production deploy is performed by this agent. The owner merges to `main`.

## CI

| Workflow | Role |
|---|---|
| `.github/workflows/orbital-command-refresh.yml` | 01:40 / 09:40 / 17:40 UTC + manual. Fetches CelesTrak GP for stations / visual / weather / featured. Validates, writes `data/orbital-command/`. On failure, keeps last good files. Offset 15 minutes from the Starlink job so the two do not stampede CelesTrak. |
| `.github/workflows/orbital-command-checks.yml` | PR: unit tests, ingestion tests, production build, Playwright smokes. |

Starlink GP remains the existing `starlink-refresh.yml`. Do not add a second Starlink download.

## Rollback

1. Revert the merge commit on `main` (or revert the `orbital-command/` and `data/orbital-command/` trees).
2. Homepage promo, `nav.json`, sitemap glob and `track.js` names are the only shared touchpoints — revert those files if needed. Pill-menu HTML on other pages is unchanged until someone runs `sync-nav.py` / `nav-sync.yml` after merge.
3. Last-good GP snapshots stay in git history.

## Cloudflare Worker (optional, not deployed)

A Worker is **not required**. Snapshots in git are enough. If CelesTrak ever blocks Actions persistently, a **free-tier** Worker could fetch on a cron and write to KV or a public JSON URL.

Do not deploy it from this PR. No credentials are added.

Sketch (for a later owner decision):

- `wrangler.toml` on a subdomain, cron 3×/day.
- Fetch CelesTrak, validate with the same Python/JS schema, put JSON in KV.
- Static app reads that URL with the git snapshot as fallback.
- Stay on the free tier; no secrets in the client.

## Observability

- Ingestion: Action logs + `data/orbital-command/status.json` (`ok` / `stale`, last success, last error class).
- Client: `sdTrack` events (no coordinates, no query text). Rendering failures surface in the UI live region.
- Existing Cloudflare analytics covers page views.

There is no APM stack on this static site. Do not add one.

## Privacy

- Precise observer coordinates stay in `localStorage` only after the visitor saves a location. Analytics never send lat/lon.
- No cookies for Orbital Command itself.
- Deep-link `lat`/`lon` are query parameters the visitor chose to share.

## Supabase leaderboards (later)

Project: `https://luidcuzdrcvmzdxpiiwf.supabase.co`.

v1 scores stay local (`sd-orbital-command-progress`). A later table could be:

```
orbital_scores (day_utc date, challenge_id text, score int, created_at timestamptz)
```

with RLS for anonymous inserts of **score + challenge id + UTC day only** — no location, no name unless the visitor opts in. Do not add keys to this repo.
