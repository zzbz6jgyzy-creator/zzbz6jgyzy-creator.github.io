// World boards for Catch, Hot Staging, and Robotaxi Boss.
// Live: https://aljr-boards.superchargeddaily.workers.dev
// KV binding BOARDS → aljr-game-boards.

const GAMES = ["catch", "staging", "robotaxi"];
const MAX_ROWS = 20;
const MAX_SCORE = 9999999;
const RATE_MS = 8000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function sanitizeName(raw) {
  const name = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 _.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);
  return name || "PILOT";
}

function gameFromPath(pathname) {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last === "boards" || last === "api") return "";
  return last;
}

async function readBoard(env, game) {
  const raw = await env.BOARDS.get(game, "json");
  return Array.isArray(raw) ? raw : [];
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const game = gameFromPath(url.pathname);

    if (request.method === "GET" && !game) {
      const all = {};
      for (const id of GAMES) all[id] = await readBoard(env, id);
      return json({ boards: all });
    }

    if (!GAMES.includes(game)) {
      return json({ error: "unknown game" }, 404);
    }

    if (request.method === "GET") {
      return json({ game, rows: await readBoard(env, game) });
    }

    if (request.method !== "POST") {
      return json({ error: "method" }, 405);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "0";
    const rlKey = `rl:${game}:${ip}`;
    const last = Number((await env.BOARDS.get(rlKey)) || 0);
    if (last && Date.now() - last < RATE_MS) {
      return json({ error: "slow down" }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad json" }, 400);
    }

    const score = Math.round(Number(body.score));
    const flights = Math.round(Number(body.flights ?? body.rides) || 0);
    if (!Number.isFinite(score) || score < 1 || score > MAX_SCORE) {
      return json({ error: "bad score" }, 400);
    }

    const entry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: sanitizeName(body.name),
      score,
      flights: Math.max(0, Math.min(flights, 999)),
      at: Date.now(),
    };

    const rows = await readBoard(env, game);
    rows.push(entry);
    rows.sort((a, b) => b.score - a.score || a.at - b.at);
    const top = rows.slice(0, MAX_ROWS);
    await env.BOARDS.put(game, JSON.stringify(top));
    await env.BOARDS.put(rlKey, String(Date.now()), { expirationTtl: 60 });
    return json({ game, rows: top, id: entry.id });
  },
};
