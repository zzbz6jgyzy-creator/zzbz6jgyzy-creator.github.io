# data/articles.json — our own articles (News page + future homepage use)

One entry per Dispatch article, newest first:

```json
{"url": "/dispatch/slug.html", "title": "Headline", "date": "2026-10-14T17:18:43Z",
 "topic": "tesla", "tag": "Analysis", "image": "/assets/dispatch/slug-poster.jpg",
 "summary": "One-line standfirst.", "pinned": false}
```

- `topic` is one of `tesla`, `spacex`, `xai`, `x` (drives the filter chips).
- `date` is ISO 8601 UTC; the page groups by Today / Yesterday / date in the reader's own time zone.
- `pinned: true` holds a story as the featured lead (otherwise the newest leads).

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
- `sources`: primary first (regulator, ministry, Reuters, Electrek…). Labels ending in ` †` are secondary trackers
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
