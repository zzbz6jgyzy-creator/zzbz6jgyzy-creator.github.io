# sd-refresh: on-time data refresh

GitHub's scheduled workflows drift by hours. This Worker dispatches them from a Cloudflare cron instead.

| Cron (UTC) | Workflows |
|---|---|
| every 30 min | `updates-snapshot`, `news-snapshot` |
| hourly at :05 | `launches-refresh` |
| every 4 h at :10 | `starlink-refresh` |
| 05:35 and 17:35 | `robotaxi-refresh` |

## Set up (one time, about 5 minutes)
1. GitHub, Settings, Developer settings, Fine-grained tokens: new token, resource owner = you, **only this repository**, permission **Actions: Read and write**, 1-year expiry. Copy it.
2. In `workers/sd-refresh/`: `npx wrangler login`, then `npx wrangler secret put GITHUB_TOKEN` and paste the token, then `npx wrangler deploy`.
3. Check: `npx wrangler tail`, wait for a cron, and look for the runs in the repo's Actions tab ("workflow_dispatch").

The token never enters the repo. Do not put it in `wrangler.toml`.

## Notes
- The GitHub `schedule:` triggers stay as a fallback. Both share the `data-push-main` concurrency group (one running, one queued), so overlaps do not double-write.
- Put the token's expiry date in your calendar; when it lapses the Worker logs 401 and the site falls back to GitHub's slow schedule.
- To change a cadence, edit `JOBS` and `crons` together.
