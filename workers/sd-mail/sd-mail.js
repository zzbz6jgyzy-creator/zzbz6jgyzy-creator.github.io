// Per-car mail hook for superchargeddaily.com / My Tesla.
// POST /mail  — upsert Beehiiv custom fields (no public API key).
// POST /scan  — Teslascope newest-per-country delta → API-enroll if automation is live.
// GET  /health — capture/delivery flags. Never claims mail is live when the automation is draft.
// KV MAIL holds last-seen firmware ids only. No emails, no IPs.
import { newestByCountry, deltas, matchSoftware } from "./newest.mjs";

const TAGS = ["my-tesla", "tesla-software"];
const MODELS = new Set(["3", "Y", "S", "X", "CT"]);
const HWS = new Set(["hw25", "hw3", "hw4"]);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const originOk = (req) => {
  const ref = req.headers.get("Origin") || req.headers.get("Referer") || "";
  if (!ref) return true;
  return /superchargeddaily\.com|github\.io|localhost|127\.0\.0\.1/.test(ref);
};

const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;

const bee = async (env, method, path, body) => {
  const r = await fetch("https://api.beehiiv.com/v2" + path, {
    method,
    headers: {
      Authorization: "Bearer " + env.BEEHIIV_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}
  return { ok: r.ok, status: r.status, data, text };
};

const pub = (env) => env.BEEHIIV_PUBLICATION_ID;
const aut = (env) => env.BEEHIIV_AUTOMATION_ID;

const fieldsOf = (body) => {
  const model = MODELS.has(body.model) ? body.model : "";
  const hw = HWS.has(body.hw) ? body.hw : "";
  const year = String(body.year || "").replace(/\D/g, "").slice(0, 4);
  const y = year && Number(year) >= 2012 && Number(year) <= 2027 ? year : "";
  const software = /^[\d.]+$/.test(String(body.software || "")) ? String(body.software) : "";
  const country = /^[A-Za-z]{2}$/.test(String(body.country || "")) ? String(body.country).toUpperCase() : "";
  const n = body.notify || {};
  return [
    { name: "tesla_model", value: model },
    { name: "tesla_year", value: y },
    { name: "tesla_hw", value: hw },
    { name: "tesla_software", value: software },
    { name: "tesla_country", value: country },
    { name: "tesla_notify_software", value: !!n.software },
    { name: "tesla_notify_recall", value: !!n.recall },
    { name: "tesla_notify_compat", value: !!n.compat },
    { name: "tesla_notify_news", value: !!n.news },
  ];
};

const automationState = async (env) => {
  const r = await bee(env, "GET", `/publications/${pub(env)}/automations/${aut(env)}`);
  const state = r.data?.data?.state || r.data?.state || "";
  return { ok: r.ok, state, live: state === "live" };
};

const upsert = async (env, email, custom_fields) => {
  const path = `/publications/${pub(env)}/subscriptions`;
  const created = await bee(env, "POST", path, {
    email,
    reactivate_existing: true,
    send_welcome_email: false,
    utm_source: "website",
    utm_medium: "my-tesla",
    utm_campaign: "/my-tesla.html",
    utm_content: "tesla-software",
    referring_site: "https://superchargeddaily.com/my-tesla.html",
    custom_fields,
  });
  let sub = created.data?.data || created.data;
  if (!created.ok) {
    const updated = await bee(env, "PUT", `${path}/by_email/${encodeURIComponent(email)}`, { custom_fields });
    if (!updated.ok) return { ok: false, status: updated.status, error: "beehiiv_upsert" };
    sub = updated.data?.data || updated.data;
  } else {
    await bee(env, "PUT", `${path}/by_email/${encodeURIComponent(email)}`, { custom_fields });
  }
  const id = sub?.id;
  if (id) await bee(env, "POST", `${path}/${id}/tags`, { tags: TAGS });
  return { ok: true, id: id || null };
};

const listActive = async (env) => {
  const out = [];
  let page = 1;
  for (;;) {
    const q = `/publications/${pub(env)}/subscriptions?status=active&limit=100&page=${page}&expand[]=custom_fields`;
    const r = await bee(env, "GET", q);
    if (!r.ok) return { ok: false, status: r.status, subs: out };
    const rows = r.data?.data || [];
    out.push(...rows);
    const pages = r.data?.total_pages || page;
    if (page >= pages || !rows.length || page >= 50) break;
    page += 1;
  }
  return { ok: true, subs: out };
};

const enroll = async (env, subscriptionId) => {
  const r = await bee(env, "POST", `/publications/${pub(env)}/automations/${aut(env)}/journeys`, {
    subscription_id: subscriptionId,
  });
  return { ok: r.ok, status: r.status };
};

const scan = async (env, snapshot) => {
  if (!env.BEEHIIV_API_KEY) return { ok: false, delivery: "unconfigured", reason: "no_secret" };
  const live = snapshot || (await fetch(env.SNAPSHOT_URL || "https://superchargeddaily.com/updates-live.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));
  if (!live) return { ok: false, delivery: "unconfigured", reason: "no_snapshot" };
  const current = newestByCountry(live);
  const seen = JSON.parse((await env.MAIL.get("seen")) || "{}");
  const changed = deltas(current, seen);
  const auto = await automationState(env);
  const delivery = auto.live ? "ready" : "not_live";
  const pending = JSON.parse((await env.MAIL.get("pending")) || "[]");
  if (!changed.length) {
    await env.MAIL.put("last_scan", new Date().toISOString());
    return { ok: true, delivery, changed: 0, enrolled: 0, skipped: 0 };
  }
  if (!auto.live) {
    const at = new Date().toISOString();
    const next = [...pending];
    for (const d of changed) {
      if (!next.some((p) => p.cc === d.cc && p.id === d.id)) next.push({ cc: d.cc, id: d.id, n: d.n, firstSeen: d.firstSeen, at });
    }
    await env.MAIL.put("pending", JSON.stringify(next.slice(-200)));
    await env.MAIL.put("last_scan", at);
    return { ok: true, delivery: "not_live", changed: changed.length, enrolled: 0, pending: next.length, note: "Automation is draft. Nothing sent." };
  }
  const listed = await listActive(env);
  if (!listed.ok) return { ok: false, delivery, reason: "list_failed", status: listed.status };
  let enrolled = 0;
  let skipped = 0;
  const nextSeen = { ...seen };
  for (const d of changed) {
    const hits = listed.subs.filter((s) => matchSoftware(s, d.cc, d.id));
    for (const s of hits) {
      if (enrolled >= 50) break;
      const j = await enroll(env, s.id);
      if (j.ok) enrolled += 1;
      else if (j.status === 429) return { ok: false, delivery, reason: "rate_limited", enrolled, changed: changed.length };
      else skipped += 1;
    }
    nextSeen[d.cc] = { id: d.id, n: d.n, firstSeen: d.firstSeen };
  }
  await env.MAIL.put("seen", JSON.stringify(nextSeen));
  await env.MAIL.put("pending", "[]");
  await env.MAIL.put("last_scan", new Date().toISOString());
  return { ok: true, delivery, changed: changed.length, enrolled, skipped };
};

const handleMail = async (req, env) => {
  if (!originOk(req)) return json({ ok: false }, 403);
  if (!env.BEEHIIV_API_KEY) return json({ ok: false, delivery: "unconfigured", reason: "no_secret" }, 503);
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "bad_json" }, 400);
  }
  if (body.website) return json({ ok: true, ignored: true, delivery: "not_live" });
  const email = String(body.email || "").trim().toLowerCase();
  if (!emailOk(email)) return json({ ok: false, reason: "email" }, 400);
  const notify = body.notify || {};
  if (notify.software && !/^[A-Za-z]{2}$/.test(String(body.country || ""))) {
    return json({ ok: false, reason: "country" }, 400);
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const rl = await env.MAIL.get("rl:" + hex);
  if (rl) return json({ ok: false, reason: "rate" }, 429);
  await env.MAIL.put("rl:" + hex, "1", { expirationTtl: 30 });
  const up = await upsert(env, email, fieldsOf(body));
  if (!up.ok) return json({ ok: false, reason: "beehiiv" }, 502);
  const auto = await automationState(env);
  return json({
    ok: true,
    saved: true,
    delivery: auto.live ? "ready" : "not_live",
    note: auto.live
      ? "Car saved. Software mail fires when Teslascope newest-reporting changes in that country. Not Tesla’s owner email."
      : "Car saved. Software mail waits on a published Beehiiv automation — nothing is sent yet.",
  });
};

const handleScan = async (req, env) => {
  const hdr = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.SCAN_SECRET || hdr !== env.SCAN_SECRET) return json({ ok: false }, 401);
  let snapshot = null;
  try {
    const body = await req.json();
    if (body && Array.isArray(body.versions)) snapshot = body;
  } catch {}
  return json(await scan(env, snapshot));
};

const handleHealth = async (env) => {
  const configured = !!env.BEEHIIV_API_KEY;
  let delivery = configured ? "not_live" : "unconfigured";
  if (configured) {
    const auto = await automationState(env);
    delivery = auto.live ? "ready" : "not_live";
  }
  return json({
    ok: true,
    capture: configured,
    delivery,
    endpoints: ["/mail", "/scan", "/health"],
    note: "Delivery is not live until BEEHIIV_API_KEY is set and the My Tesla · software reporting automation is published.",
  });
};

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (u.pathname === "/health" && req.method === "GET") return handleHealth(env);
    if (u.pathname === "/mail" && req.method === "POST") return handleMail(req, env);
    if (u.pathname === "/scan" && req.method === "POST") return handleScan(req, env);
    return json({ ok: true, endpoints: ["/mail", "/scan", "/health"] });
  },
  async scheduled(_event, env) {
    await scan(env, null);
  },
};
