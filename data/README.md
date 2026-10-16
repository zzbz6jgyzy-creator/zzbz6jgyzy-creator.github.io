# data/articles.json — our own articles (News page + future homepage use)

One entry per Dispatch article, newest first:

```json
{"url": "/dispatch/slug.html", "title": "Headline", "date": "2026-10-14T17:18:43Z",
 "topic": "tesla", "tag": "Analysis", "image": "/assets/dispatch/slug-poster.jpg",
 "summary": "One-line standfirst.", "pinned": false}
```

- `topic` is one of `tesla`, `spacex`, `xai`, `x` (drives the filter chips).
- `date` is ISO 8601 UTC; the page groups by Today / Yesterday / date in the reader's own time zone.
- `pinned: true` holds a story as the featured lead (otherwise the newest leads). Add `"pinUntil": "<ISO UTC time>"` to auto-expire the pin; build-home.js and home-v2.js both ignore it after that time.

How to add an article:
1. Publish `/dispatch/<slug>.html` and put its `story-card` at the top of `/dispatch.html` (as before).
2. Either append the entry above to `data/articles.json` yourself, or run
   `python3 scripts/build-articles.py`, which adds any new dispatch card (date = the file's first git commit).
   Existing entries are never overwritten. (Not yet wired into a GitHub Action — the push token lacks `workflow` scope.)
3. Even before the JSON is updated, /news.html merges in any dispatch card it doesn't know yet.

---

# fsd-europe-data.js — FSD Europe tracker (/fsd-europe.html)

`window.FSD_EUROPE = { updated, note, thresholds, nextVote, countries: [...], changelog: [...] }`.
Also read by the homepage tracker strip (`home-stats.js`, `home-v2.js`), which only uses `status` and `pop`, so keep those.

One row per EU member state (all 27):

```js
{ code: "DE", name: "Germany", status: "review", date: null, pop: 83.4, note: "Short summary.",
  regulator: "KBA / BMV", stage: "review", position: "Supports EU-wide approval", nextStep: "TCMV vote",
  rolloutLive: false, sources: [{ label: "BMV", url: "https://…" }] }
```

- `status`: `approved` | `review` | `none`. Counts on the homepage and the map come from this.
- `date`: ISO day the national recognition was granted (approved only), else `null`. Drives the map replay.
- `pop`: millions; `thresholds.euPopulationM` is the EU total.
- `stage` (pipeline + "your country" card): `none` | `testing` | `review` | `announced` | `recognised` | `live`.
  `live` = public reports say the customer rollout has started (set `rolloutLive: true` too).
- `regulator`, `position`, `nextStep`: **leave `""` if unconfirmed**; the page shows "Unconfirmed" / "No statement found". Never guess.
  The what-if "stated supporters" scenario matches `position` containing support / positive / fast-track / announced recognition.
- `sources`: primary first (regulator, ministry, Reuters, Verge… never Electrek). Labels ending in ` †` are secondary trackers
  (notanfsdtracker.com, tad-tracker.eu), used to fill gaps.

`changelog` — newest first, one entry per dated move, each with a source:

```js
{ date: "2026-09-29", code: "HR", type: "approval", text: "One sentence.", source: "https://…" }
```

`type`: `approval` | `statement` | `tcmv` | `testing` | `rename`. `code` is `""` for EU-wide items.

When a country is approved: set `status: "approved"`, `date`, `stage` (`recognised` or `live`), add sources,
add a changelog entry, and bump `updated`. The TCMV countdown reads the first `outcome: "upcoming"` meeting in `tcmv-data.js`
(if its `dateLabel` has no day number, the page says the exact date is unpublished).
The map outline is `assets/europe-fsd-v2.svg`, built from Natural Earth 1:50m (public domain) by `scripts/build-europe-map.py`.

## LIVE NOW alert (site-wide)

`/live-now.js` (+ `/live-now.css`) is loaded on every page by `nav-pill.js`. It reads **`/live-data.json`**
(the same file `live.js` and the stream-watch routines already update, so there is one source of truth) and polls it every 60 s with cache busting.

An event shows the LIVE NOW alert when `status: "live"`, **or** it has an exact time (no `timeTbc`/`net`), `status` isn't `"ended"`, and `start <= now < end`.
It auto-hides once `end` passes (even if status is still `live`) or when status becomes `ended`. Visitors can dismiss it for their tab session.

- Homepage: big banner at the very top. Everywhere else: pulsing "LIVE NOW" pill bottom-right that expands into the player/link card.
- Embeddable (muted autoplay + "Tap to unmute"): `provider: "youtube"` with `embedId` = the 11-char video id.
- Everything else (`provider: "x"`, `"link"`, SpaceX.com, X broadcasts): badge + "Watch live on X / SpaceX / YouTube / <host>" button pointing at `fallbackUrl` (falls back to `postUrl`). Platform name is derived from the URL.

To flip a stream live, a routine edits that event in `live-data.json`:
```json
{ "id": "tesla-roadster-demo", "status": "live", "start": "<ISO>", "end": "<ISO est. end>",
  "provider": "youtube" | "x" | "link", "embedId": "<YouTube id or empty>",
  "fallbackUrl": "<direct stream URL>", "postUrl": "<official post>", "title": "…" }
```
Set `"status": "ended"` when it's over. Test locally with `?livedata=/some.json` (and optionally `&livenow=<ISO>`).

## Newsletter sign-up (always the sleek band)
Every page and article uses ONE sign-up: the sleek "Get Supercharged Daily" band from `grow.js`
(`<script src="/grow.js?v=…" data-band data-pop defer></script>`, which also keeps the scroll pop-up).
Do not add the old red inline box (`<section class="newsletter sd-nl">`, `.nl-end`, `.flagship-alert.newsletter`, `newsletter-hero`).
- `newsletter-cta.js` (loaded by `nav-pill.js`) no longer builds a red box: on Dispatch articles, trackers and
  Wallpapers without a band it inserts the same `.sd-band` markup, and it keeps one sign-up per page.
- New Daily analysis articles: copy an existing dispatch article (they're clean), end the article with the
  sources line, and include the grow.js tag above. `scripts/build-articles.py` strips any `.sd-nl` box from
  `dispatch/` and `guides/` and adds the grow.js band tag if missing, every time it runs.
- Pattern: commit 3fe2772 (buying guide) and the 15 Oct newsletter-sleek commit.

## Site event tracking (sign-ups, latest-issue clicks, Tesla referral clicks)

Privacy-friendly counters, no cookies, no IPs, no user IDs, no cookie banner needed.

- **What's counted** (`/track.js`, loaded by `script.js` and `grow.js` on every page):
  - `signup_submit`: a newsletter form with an email was submitted (sleek bar and any other form).
  - `latest_issue_click`: click on "Read the latest issue →" in the sleek bar (`a.sd-latest`).
  - `referral_click`: click on any `https://ts.la/…` Tesla referral link.
- **Where counts live**: Cloudflare Worker `sd-events` + KV namespace `sd-events` (id `57ee0b9c3c2647fe84176ca976aba17e`), account Superchargeddaily@gmail.com. Code: `workers/sd-events/`. Free tier.
- **Read the numbers**: `GET https://sd-events.superchargeddaily.workers.dev/stats?days=30` returns JSON
  `{ since, totals:{event:n}, byDay:{"YYYY-MM-DD":{event:n}}, topPages:{event:{path:n}} }` (UTC days; topPages all-time).
- **Beehiiv attribution**: sign-ups redirect to Beehiiv with `utm_source=website`, `utm_medium=site-band` (sleek bar) / `site-pop` (scroll prompt) / `site-form` (other), and `utm_campaign=<page path>`. The latest-issue link carries `utm_medium=site-band&utm_campaign=latest-issue`. See Beehiiv → Subscribers → acquisition source.
- **Pageviews** remain in Cloudflare Web Analytics (beacon on every page). No GA, Plausible or Zaraz on the site (the domain is DNS-only to GitHub Pages, so Zaraz can't run).
- Counts are approximate: ad blockers may drop beacons, and the Worker only accepts requests from superchargeddaily.com.

## Major events: homepage countdown (`"major": true` in data/events.json)

Any Roadster-reveal-level event (product reveals, Starship flights, major Tesla/SpaceX/xAI events such as earnings calls) gets `"major": true` in `data/events.json` → `events.<id>`.

- The homepage (`home-v2.js`) shows a big countdown card (days/hrs/mins/secs, visitor's local time + zone label) for every major event that starts **within 7 days**, just below the Live now slot and above the lead story (max 2, soonest first).
- It hides **30 min before start** (when live.js shows the Live now card at the top) or as soon as `live-data.json` has the same `id` with `status` `live` or `ended`. Use the **same id** in both files.
- Time: either `"start"`/`"end"` full ISO with offset (preferred for timed events; live.js leaves these alone), or `"date"` + `"precision": "day"` + `"tz"` for NET-day events (shown as "NET <date>").
- Required: `title`, `source` (real URL backing the date), optional `href` (page the card links to) and `summary`.
- The Monday event scan and any bot adding events must set `major` only when sourced. Currently flagged: `tesla-roadster-demo`, `tesla-q3-2026-earnings`, `starship-flight-15`.

## promises.json (Promise Tracker, preview)

Feeds `/promise-tracker.html`. One object per promise in `promises[]`. **Every quote, date and outcome must come from a source you actually opened.** If you can't confirm the exact words, set `quote_type: "paraphrase"` and use the outlet's wording, or leave the entry out. Never cite Electrek. Keep it neutral: no mocking language.

| field | meaning |
|---|---|
| `id` | unique kebab-case slug, used as the page anchor (`/promise-tracker.html#id`). Never change it once published. |
| `title` | short neutral headline |
| `company` | `Tesla` / `SpaceX` / `xAI` |
| `topic` | e.g. `FSD / autonomy`, `Robotaxi / Cybercab`, `Optimus`, `Roadster`, `Semi`, `Cybertruck`, `Starship`, `Mars`, `Grok / xAI` |
| `person`, `role` | who said it |
| `said_on` | `YYYY`, `YYYY-MM` or `YYYY-MM-DD` |
| `quote` | a short, exact quote, or the outlet's paraphrase |
| `quote_type` | `exact` or `paraphrase` |
| `source` | `{outlet, title, url, date}`: where the quote was read (original post, transcript, video timestamp or reputable outlet) |
| `deadline` | the promised date (end of a period = last day, e.g. `2025-12-31`) |
| `status` | one of `Delivered`, `Delivered late`, `In progress`, `Missed`, `Revised` (definitions are on the page) |
| `evidence[]` | `{text, source, date}`: what actually happened, each with its own source |
| `revisions[]` | `{date, text, source}`: later changes to the target, oldest first |
| `note` | optional caveats and judgment calls |
| `last_verified` | `YYYY-MM-DD` you last re-checked the status |

The summary stats on the page are computed from this file, so there are no counts to update by hand. Update `updated` at the top when you edit. Run `python3 -m json.tool data/promises.json` before committing.

- `outcome_date` (v2): when a Delivered / Delivered late promise actually happened (YYYY, YYYY-MM or YYYY-MM-DD). Used for the on-time rate, average delay and the timeline. Topics now include "Affordable car & batteries", "Energy" and "AI compute".
