// Tiny privacy-friendly event counter for superchargeddaily.com.
// No cookies, no IPs, no user IDs stored: only per-day counts per event (+ page path).
// POST/GET /e?n=<event>&p=<path>  -> increments  day:<YYYY-MM-DD>:<event>  and  page:<event>:<path>
// GET  /stats?days=30             -> JSON totals by event, by day and top pages
// KV binding EVENTS -> sd-events. Live: https://sd-events.superchargeddaily.workers.dev
const EVENTS = [
  "signup_submit",
  "latest_issue_click",
  "referral_click",
  "search_open",
  "search_go",
  "theme_toggle",
  "dispatch_filter",
  "tesmag_click",
  "game_start",
  "game_retry",
  "game_complete",
  "game_fail_tower",
  "game_fail_splash",
  "game_fail_rud",
  "game_fail_walk",
  "game_fail_early",
  "game_fail_late",
  "game_fail_maxq",
  "game_fail_bankrupt",
  "game_return_d1",
];
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Cache-Control": "no-store" };
const json = (d, s = 200) => new Response(JSON.stringify(d, null, 1), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const bump = async (kv, k) => { const v = parseInt((await kv.get(k)) || "0", 10) + 1; await kv.put(k, String(v)); };
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (u.pathname === "/e") {
      const n = u.searchParams.get("n"), p = (u.searchParams.get("p") || "/").replace(/[^a-z0-9/._-]/gi, "").slice(0, 80) || "/";
      if (!EVENTS.includes(n)) return json({ ok: false }, 400);
      const ref = req.headers.get("Origin") || req.headers.get("Referer") || "";
      if (ref && !/superchargeddaily\.com|localhost/.test(ref)) return json({ ok: false }, 403);
      const day = new Date().toISOString().slice(0, 10);
      await Promise.all([bump(env.EVENTS, `day:${day}:${n}`), bump(env.EVENTS, `page:${n}:${p}`)]);
      return new Response(null, { status: 204, headers: cors });
    }
    if (u.pathname === "/stats") {
      const days = Math.min(90, parseInt(u.searchParams.get("days") || "30", 10) || 30);
      const since = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10);
      const out = { since, totals: Object.fromEntries(EVENTS.map((e) => [e, 0])), byDay: {}, topPages: {} };
      for (const pre of ["day:", "page:"]) {
        let cur;
        do {
          const l = await env.EVENTS.list({ prefix: pre, cursor: cur }); cur = l.list_complete ? null : l.cursor;
          for (const k of l.keys) {
            const v = parseInt((await env.EVENTS.get(k.name)) || "0", 10), parts = k.name.split(":");
            if (pre === "day:") { const [, d, e] = parts; if (d < since) continue; out.totals[e] = (out.totals[e] || 0) + v; (out.byDay[d] ||= {})[e] = v; }
            else { const [, e, ...p] = parts; (out.topPages[e] ||= {})[p.join(":")] = v; }
          }
        } while (cur);
      }
      out.note = "topPages are all-time; totals/byDay cover the last " + days + " days (UTC days).";
      return json(out);
    }
    return json({ ok: true, endpoints: ["/e?n=<event>&p=<path>", "/stats?days=30"] });
  },
};
