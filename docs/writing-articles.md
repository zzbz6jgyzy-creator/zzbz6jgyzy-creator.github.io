# Writing a Dispatch article in Markdown

Publishing is one file: add `content/dispatch/<slug>.md` and merge it. CI (`home-build.yml`) renders it to `dispatch/<slug>.html`,
adds the story card and `data/articles.json` entry, then runs the usual generators (related stories, contents, share image,
NewsArticle data, sitemap, feed). Editing the `.md` later re-renders the page. Works from the GitHub mobile app or any web editor.

Check locally: `python3 scripts/render-article.py --check`. Render locally: `python3 scripts/render-article.py <slug>`.
Editorial rules still apply: `.claude/rules/editorial.md`.

## Front matter
```
---
title: The full headline exactly as readers see it
summary: One plain-text sentence; it is also the standfirst and the meta description.
topic: spacex          # tesla | spacex | xai | x
tag: Starship          # short label
date: 2026-10-27T09:30:00Z   # optional, default now
image: /assets/dispatch/x.jpg   # optional; then imageAlt is required
imageAlt: Describe the picture
description: Optional meta description if it should differ from the summary
---
```
Title and summary are plain text (no Markdown or HTML).

## Body
- Paragraphs, `## Section`, `### Sub-section`, `- list`, `1. list`, `> quote`, `**bold**`, `*italic*`, `[text](https://...)`.
- A pipe table (header row, `|---|` row, body rows) becomes a scrollable table labelled with the section above it.
- `::pull One-line pull quote`  ·  `::note Small print or caveat`  ·  `::sources [Name](url); [Name](url).`
- Blocks with `key: value` lines, ended by a blank line:

```
::x
url: https://x.com/NASA/status/2110717473372749989
author: NASA (@NASA)
text: The post text, so it reads without loading X.
caption: Video: NASA live broadcast, 15 Oct 2026.

::video
src: /assets/dispatch/clip.mp4
poster: /assets/dispatch/clip-poster.jpg
caption: Video: @SpaceX

::image
src: /assets/dispatch/photo.jpg
alt: What the picture shows
caption: Image: credit
```
Files must already be in `assets/dispatch/`. `::x` posts show as text with a "Load post from X" button.

## What is refused
`DRAFT` markers, raw HTML, fewer than three paragraphs, no source links, an image without alt text, a missing media file, a
malformed X link. The error names the line or field.
