// Fires the repo's refresh workflows on a steady clock. GitHub's own `schedule:` runs
// every 4 to 8 hours under load; a Cloudflare cron trigger is on time. Each workflow
// already has a workflow_dispatch trigger and shares the `data-push-main` concurrency
// group, so a dispatch that overlaps a GitHub-scheduled run just queues behind it.
//
// Secret: GITHUB_TOKEN (fine-grained PAT, this repo only, "Actions: read and write").
// Set it with `wrangler secret put GITHUB_TOKEN`. It is never stored in the repo.

const REPO = "zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io";
const REF = "main";

// cron string (must match wrangler.toml) -> workflow files to dispatch
const JOBS = {
  "*/30 * * * *": ["updates-snapshot.yml", "news-snapshot.yml"],
  "5 * * * *": ["launches-refresh.yml"],
  "10 */4 * * *": ["starlink-refresh.yml"],
  "35 5,17 * * *": ["robotaxi-refresh.yml"],
};

async function dispatch(env, file) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${file}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sd-refresh-worker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: REF }),
  });
  // 204 = accepted. Anything else is logged so `wrangler tail` shows why.
  if (res.status !== 204) console.error(file, res.status, (await res.text()).slice(0, 300));
  return { file, status: res.status };
}

export default {
  async scheduled(event, env, ctx) {
    if (!env.GITHUB_TOKEN) { console.error("GITHUB_TOKEN secret is not set"); return; }
    const files = JOBS[event.cron] || [];
    ctx.waitUntil(Promise.all(files.map((f) => dispatch(env, f))));
  },
  // Open the Worker URL to see it is alive. It never triggers anything on a request.
  async fetch() {
    return new Response(JSON.stringify({ ok: true, jobs: JOBS }, null, 2), { headers: { "content-type": "application/json" } });
  },
};
