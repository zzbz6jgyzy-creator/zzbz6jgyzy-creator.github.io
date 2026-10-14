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
