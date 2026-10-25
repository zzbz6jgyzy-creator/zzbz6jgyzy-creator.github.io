#!/usr/bin/env node
// Prebuild tracker records into the HTML inside <noscript>, so the trackers can be read
// without JavaScript (and by crawlers that skip JS). JS visitors never see this block;
// the interactive tracker is unchanged. Re-run whenever the data files change.
import fs from "node:fs";
import vm from "node:vm";
import { buildReviewsStudio } from "./build-reviews-studio.mjs";
import { buildBuyingStudio } from "./build-buying-studio.mjs";
import { buildFSDEurope } from "./build-fsd-europe.mjs";
import { buildAutonomyEvidence } from "./build-autonomy-evidence.mjs";
import { buildTrackerSnapshots } from "./build-tracker-snapshots.mjs";
import { buildStarshipStudio } from "./build-starship-studio.mjs";
import { buildCalendarStudio } from "./build-calendar-studio.mjs";
import { buildLaunchViewing } from "./build-launch-viewing.mjs";
import { buildTeslaOverview } from "./build-tesla-overview.mjs";
const root = new URL("..", import.meta.url).pathname;
const read = (f) => fs.readFileSync(root + f, "utf8");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const loadWin = (f) => { const ctx = { window: {} }; vm.runInNewContext(read(f), ctx); return ctx.window; };
const S = 'style="max-width:1100px;margin:24px auto;padding:0 20px;color:#e6e6e6;font:15px/1.55 Inter,system-ui,sans-serif"';
const T = 'style="width:100%;border-collapse:collapse;font-size:14px"';
const td = (x) => `<td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.1);vertical-align:top">${x}</td>`;
const th = (x) => `<th style="text-align:left;padding:8px;border-bottom:1px solid #e31937;color:#e31937;font:600 11px/1.2 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase">${x}</th>`;
const link = (s) => (s && s.url ? `<a href="${esc(s.url)}" style="color:#fff" rel="noopener">${esc(s.label || s.outlet || "Source")}</a>` : "");

function inject(file, tag, html) {
  let s = read(file);
  const block = `<!--ns:${tag}--><noscript><section ${S} aria-label="Tracker records">${html}</section></noscript><!--/ns:${tag}-->`;
  const re = new RegExp(`<!--ns:${tag}-->[\\s\\S]*?<!--/ns:${tag}-->`);
  if (re.test(s)) s = s.replace(re, block);
  else s = s.replace("</main>", `${block}\n      </main>`);
  fs.writeFileSync(root + file, s);
}

// Promise Tracker
{
  const d = JSON.parse(read("data/promises.json"));
  const rows = d.promises.map((p) => `<tr>${td(`<b>${esc(p.title)}</b><br><small>${esc(p.person || "")}${p.said_on ? ", " + esc(p.said_on) : ""}</small>`)}${td(esc(p.status))}${td(esc(p.deadline || "—"))}${td(link(p.source))}</tr>`).join("");
  inject("promise-tracker.html", "promises", `<h2>All ${d.promises.length} promises (updated ${esc(d.updated)})</h2><div style="overflow-x:auto"><table ${T}><thead><tr>${th("Promise")}${th("Status")}${th("Deadline")}${th("Source")}</tr></thead><tbody>${rows}</tbody></table></div>`);
}
// FSD Europe has complete saved HTML from the same model as the browser.
buildBuyingStudio(root);
buildReviewsStudio(root);
buildFSDEurope(root);
buildAutonomyEvidence(root);
// Starship now has complete semantic saved HTML, shared with the browser.
buildStarshipStudio(root);
buildCalendarStudio(root);
buildLaunchViewing(root);
buildTeslaOverview(root);
console.log("noscript blocks written");
buildTrackerSnapshots(root);
