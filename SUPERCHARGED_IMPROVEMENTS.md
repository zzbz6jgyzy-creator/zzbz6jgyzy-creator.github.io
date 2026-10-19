# Supercharged Daily — production quality (19 Oct 2026)

Living progress log for this batch. Dark remains the default. No production deploy. No ads. No Beehiiv publish. No Worker deploy. `nav.json` untouched. Follow on X / `twitter:site` / referral untouched. `build-home.js` not run.

## Priority 1 — Launch data

**Status: Confirmed fixed** (merge + date alignment). Live Launch Library still overrides only when it is later or the flight has flown.

| Field | Detail |
|---|---|
| Initial problem | Bandwagon-5 could appear twice or on Mon 19 on some surfaces after SpaceX slipped it to Tue 20. Homepage, calendar, see-the-launch and Starship used three hand-edited clocks. |
| Evidence | `see-the-launch-data.js` still had `2026-10-19T10:30:00Z`. `blend()` took Launch Library whenever Δ > 3h, so a stale Mon 19 row rewound editorial Tue 20. IDs were `bandwagon-5` / `f9-bandwagon5` / `ll-bandwagon-5`. Live LL2 on 19 Oct 10:18 UTC already had Bandwagon at `2026-10-20T10:30:00Z`. |
| Root cause | `calendar-merge.js` preferred live start on any big slip. `live.js` only overlaid `events.json` `date`, not `start`. Fallback slate was not updated. |
| Files modified | `calendar-merge.js`, `calendar.js`, `see-the-launch-data.js`, `starship-data.js`, `live.js`, `scripts/live-home-pick.js`, pins on calendar / live / see-the-launch / starship pages |
| Fix implemented | Stable aliases (`bandwagon-5` ↔ `f9-bandwagon5`). `pickStart()` keeps the later slip unless LL2 status is flown. `events.json` `start`/`end` overlay homepage live cards. Bandwagon fallback is Tue 20. Flight 15 day-NET clocks aligned to `2026-11-08T12:00:00Z`. Day-precision calendar labels use UTC so the calendar day does not slip. |
| Tests executed | `node scripts/test-calendar-dedup.mjs` ALL_PASS. `node scripts/test-launch-consistency.mjs` ALL_PASS. `node scripts/test-production-quality.mjs` homepage + calendar Bandwagon once on Tue 20 with mocked stale LL2. `node scripts/test-build-home-lock.mjs` not re-run after pin-only HTML. |
| Verification result | One Bandwagon row. Calendar when-column `20 Oct · 10:30` even when LL2 still says 19 Oct. Homepage card `Tue, Oct 20`. |
| Remaining limitations | No server-side LL2 ingest. Curated `events.json` + `live-data.json` still need a human edit when SpaceX slips again. 14-day LL2 localStorage remains last-resort offline cache only. |

## Priority 2 — Site search

**Status: Confirmed fixed** for ranking / empty / keyboard / mobile queries tested.

| Field | Detail |
|---|---|
| Initial problem | Garbage queries (`xyznonexistent123`, `!!!`) still returned recent stories. Back/forward did not restore `?q=` / `?kind=`. |
| Evidence | `score()` added story/page/recency points with zero token hits. `tokens()` kept 1-char tokens. Only `replaceState`. |
| Root cause | Kind/recency bonuses applied before a match gate. |
| Files modified | `search.js`, `search.html`, `nav-pill.js` |
| Fix implemented | Tokens length > 1. Score returns 0 with no hits. `popstate` restores query and kind. Submit can `pushState`. |
| Tests executed | `node scripts/test-search.mjs` ALL_PASS — Roadster, FSD Europe, Starship, Tesla software, Optimus, Starlink, empty browse, no-results, punctuation, submit URL. |
| Verification result | Relevant hubs/stories appear. No false hits for nonsense queries. |
| Remaining limitations | Overlay still omits the wire (full `/search.html` has headlines). Optimus coverage is thin in the catalog — tesla.html + promise-tracker only. |

## Priority 3 — Dispatch filters

**Status: Confirmed fixed**

| Field | Detail |
|---|---|
| Initial problem | Oldest sort did not reverse same-day / undated cards. Multi-word search was a single substring. No chip counts. Grok/X stories only in All. No `popstate`. |
| Evidence | `dispatch-browse.js` tiebreaker always `a.i - b.i`. Regex topics ignored `articles.json` `topic`. |
| Root cause | Sort bug + topic source mismatch. |
| Files modified | `dispatch-browse.js`, `dispatch.html` pin |
| Fix implemented | Newest/oldest tiebreaker. Token-AND search. JSON `topic` merged onto cards. Grok / X chip. Chip counts. `popstate`. Cards stay in HTML. |
| Tests executed | `node scripts/test-dispatch-browse.mjs` ALL_PASS — Tesla, SpaceX, Roadster, Starship, Analysis, token search, sort, counts, More. |
| Verification result | Filters, search, sort and pagination work on a 390px viewport. |
| Remaining limitations | Full archive HTML still ships for SEO (by design). |

## Priority 4 — News editorial quality

**Status: Partially fixed** — ranking already existed; this batch adds original-desk boost, breaking eligibility, and future-date downrank.

| Field | Detail |
|---|---|
| Initial problem | Wire ranking existed (`news-keep.js`) but did not boost original Dispatch or gate “breaking”. |
| Evidence | `scripts/test-news-keep.mjs` already covered finance/accessory/speculation/dedupe. |
| Root cause | Missing original + breaking helpers. |
| Files modified | `news-keep.js` |
| Fix implemented | `isOriginal`, `breakingEligible`, `validPublished`. Rank +6 original, +4 breaking, −8 invalid/future timestamps. Titles are never rewritten. |
| Tests executed | `node scripts/test-news-keep.mjs` ALL_PASS including new cases. |
| Verification result | Launch / FSD / regulatory still outrank accessory and stock bait. |
| Remaining limitations | Homepage eight is still a client rank of the current `news-data.json` snapshot. No new editorial content published. |

## Priority 5 — Homepage

**Status: Partially fixed**

| Field | Detail |
|---|---|
| Initial problem | Needed confirmation that the next-event card and calendar agree after the Bandwagon slip. |
| Evidence | Prebuilt card already said Tue 20. Live overlay now also reads `events.json` `start`. |
| Files modified | `live.js`, `scripts/live-home-pick.js`, `index.html` pin |
| Tests executed | `test-production-quality.mjs` home Bandwagon Tue, no horizontal scroll at 390px. |
| Verification result | Homepage card matches calendar Tuesday. |
| Remaining limitations | `build-home.js` not re-run (picture-lock rule). Prebuilt HTML was already correct. |

## Priority 6 — My Tesla

**Status: Partially fixed** — personalisation already existed; copy and notify honesty checked.

| Field | Detail |
|---|---|
| Initial problem | Empty state still said “we will not guess Ireland, the UK”. Mail is capture-only. |
| Evidence | `my-tesla.js` already distinguishes vehicle-specific Teslascope/FSD rows from general Dispatch. Notify stamps say mail is not live. |
| Files modified | `my-tesla.html`, `my-tesla.js` |
| Fix implemented | Empty / country-first copy no longer names Ireland/UK. No default country. Notify copy unchanged and still honest. |
| Tests executed | Production-quality test: empty copy + “not live” body text. |
| Remaining limitations | No recall feed. No live push/email until Worker + Beehiiv software automation are approved and deployed. Do not claim notifications are live. |

## Priority 7 — Mobile QA

**Status: Partially fixed**

| Field | Detail |
|---|---|
| Initial problem | Needed interaction tests, not screenshots only. |
| Evidence | Search, Dispatch, homepage, leftover-copy Tesla 390px already exercised. |
| Tests executed | 390px search + dispatch + homepage overflow. leftover-copy Tesla no overflow. |
| Remaining limitations | Not every tool (3D explorers, games, globe) was re-walked this batch. No computerUse pass (quota). |

## Priority 8 — Core Web Vitals

**Status: Not yet tested** this batch.

| Field | Detail |
|---|---|
| Initial problem | Mission asked for LCP/INP/CLS targets. |
| Evidence | Previous production measure was 19 Oct 2026 ~09:12 UTC. This batch did not re-query CrUX/PSI. |
| Fix implemented | None. No invented numbers. No lab-LCP chase. |
| Remaining limitations | Report prior field numbers only if asked; do not claim a new CWV win. |

## Priority 9 — Newsletter

**Status: Partially fixed** / verified existing hook.

| Field | Detail |
|---|---|
| Initial problem | Confirm forms are real Beehiiv, not decorative. |
| Evidence | `newsletter.js` posts to `https://alexs-newsletter-84b17e.beehiiv.com/` with allowlisted `utm_content`. Homepage form `required`. Unsubscribe is Beehiiv’s. |
| Tests executed | Form present + required + grow/newsletter scripts on homepage. |
| Remaining limitations | Did not complete a live Beehiiv subscribe (would create a real subscriber). Tag automations already live from a prior human publish — not reopened. |

## Priority 10 — Technical SEO

**Status: Partially fixed** / verified.

| Field | Detail |
|---|---|
| Initial problem | Confirm canonical, twitter:site, sitemap, robots. |
| Evidence | Key pages have canonical + `@ALJR86`. `robots.txt` allows `/`, disallows `/preview/`, points at sitemap. `/search.html` is `noindex,follow` and correctly **absent** from `sitemap.xml`. |
| Fix implemented | No URL changes. Search stays out of the sitemap. |
| Remaining limitations | Did not crawl every dispatch article’s JSON-LD this batch. |

## Priority 11 — Sitewide data reliability

**Status: Partially fixed** via launch SSOT + existing desk honesty.

| Field | Detail |
|---|---|
| Remaining limitations | Starlink TLE, Teslascope sample, FSD Europe rows, promise tracker are compiled stamps — not live telemetry. No fabricated fills. |

## Priority 12 — Automated tests

**Status: Confirmed fixed** for the suites run below.

Executed and passing:

- `scripts/test-calendar-dedup.mjs`
- `scripts/test-launch-consistency.mjs`
- `scripts/test-news-keep.mjs`
- `scripts/test-search.mjs`
- `scripts/test-dispatch-browse.mjs`
- `scripts/test-see-location.mjs`
- `scripts/test-leftover-copy.mjs`
- `scripts/test-production-quality.mjs`

Not re-run: leftover-polish (unrelated stale style pins), PSI/CrUX, full broken-link crawl, axe.

No typecheck/lint toolchain in this static repo.

## Outstanding (blocked or not this batch)

- Deploy `sd-mail` Worker / publish My Tesla software automation — **needs approval**.
- Ads — **needs approval**.
- Production deploy — **needs approval**.
- New CWV field measure — not run.
- 3D explorers / games / Starlink globe — not re-walked.
