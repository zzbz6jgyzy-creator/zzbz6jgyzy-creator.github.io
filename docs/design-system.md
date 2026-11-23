# Design system

One design language for the whole site, news first: every page leads with its latest stories or its live numbers.
The redesign is built in two layers and rolled out preview first, then switched over in one go (plan approved 22 Nov 2026,
see `docs/decisions.md`).

## Files
| File | What it holds |
|---|---|
| `ds.css` | Tokens and shared components (`ds-*` classes). Built on the existing tokens in `styles.css :root` (dark) and `theme.css` (light). |
| `ds-components.js` | Pure HTML renderers for those components (UMD, no Node or DOM APIs): `masthead`, `story`, `storyList`, `stat`, `stats`, `sectionHead`, `band`, `picture`, `note`. Builders use them in Node; pages whose views re-render in the browser get them in their bundle. |
| `ds-preview.css` | Page layouts for the `/preview/` pages only. At the switch these rules move into each page's own stylesheet and the file is deleted. |
| `scripts/build-design-preview.mjs` | Builds `/preview/*.html` from the live pages plus the renderers. Deleted at the switch. |

## Tokens
- **Surfaces:** dark first (`--bg #0c0d10`, cards `#14151a`), light supported. Light mode is a token swap under `html[data-theme=light]`; the toggle and the `sd-theme` key are unchanged.
- **One brand red, two roles:** fills use `#e31937` (white on it is 4.71:1). Red text uses `--red-text`: `#f23a52` on dark (5.09:1 on the page, 4.78:1 on cards), `#b01028` on light (6.3:1, 7.1:1 on white). Do not use `#e31937` or the old `--tesla` `#c8102e` for small text: they fail AA.
- **Section accents** (`--ds-accent`, `--ds-accent-fill`, `--ds-on-accent`): red for Tesla and the site, ice `#93d9f0` for SpaceX (light `#06516f`, 7.71:1), silver `#cfd6e4` for Grok (light `#39425a`). Story labels follow their topic (`--ds-topic-*`).
- **Type:** Inter for UI and text, IBM Plex Mono 400/500 for labels. Scale `--ds-fs-12/14/16/18/22/28/36/48`, display `--ds-fs-display` (clamp 32 to 48px). Nothing below 12px; no weights Inter or Plex Mono do not ship (no 800/900, no Plex Mono bold).
- **Space and shape:** `--ds-sp-1..8` = 4, 8, 12, 16, 24, 32, 48, 64px. Radius 12 (cards), 8 (inputs, thumbnails), 999 (pills, buttons). Two shadows, two durations (`.15s`, `.3s`); motion only inside `prefers-reduced-motion: no-preference`.
- **Width:** `--ds-max` 1180px with a 16px phone gutter (24px from 768px).
- `tests/design-preview.test.mjs` pins every token pair's contrast and checks the token declarations.

## Components
- **Masthead** (`.ds-masthead`): kicker, a bare plain-text `<h1>` (several tests count `/<h1>/`), one-line dek, "Updated · source" line, optional key numbers, optional slim photo band (120px phone, 200px desktop). `--small` is the homepage line.
- **Key numbers** (`.ds-stats` / `.ds-stat`): label, value, unit, "As of … · source" and a status chip (Disclosed, Reported, Target, Estimate). Every number carries its label and date (editorial rules 2 and 4).
- **Story list** (`.ds-story-list` / `.ds-story`): topic label, headline (the link text), date and read time or a plain description, optional decorative thumbnail from the 480w AVIF/WebP set.
- **Section head** (`.ds-section-head`): a plain label and a link whose text makes sense alone ("All stories", not "All").
- **Buttons, chips, notes:** `.ds-btn--primary` / `--secondary` (44px tall), `.ds-chip` (40px), `.ds-note` for one-line notices such as the disclosure.

## Page types (news first)
- **Homepage:** lead story, then "Latest" (7, no repeats), live numbers, the Sunday briefing, trackers and tools by plain name, upcoming launches, what changed and the wire. h1 is the small line "Tesla, SpaceX and xAI news"; the tagline "Go beyond the headline." moves to the footer brand line at the switch (the preview does not show it yet).
- **Dispatch list and news.html:** compact masthead (plain h1, one-line dek, updated line), then the first card. The Dispatch list keeps its topic chips (one sideways-scrolling row on a phone), search and sort above the cards; the cards keep their markup (`data/articles.json`, `new-article.py` and the integrity check read it) and are restyled as rows like the homepage's Latest list, with the newest story big. Styling the first card as featured until `dispatch-browse.js` marks the grid `disp-ready` keeps it from shifting. The Editorial desk box moves below the list (beside it from 1024px). news.html keeps `#ns-reporting-date` in the masthead, the featured stories (`#latest`) straight after it, and gets a plain "All stories" heading on the library.
- **12px floor in previews:** legacy labels the previews reuse (news toolbar and cards, article captions and tables, homepage widgets) are lifted to 12px; the switch removes the old rules instead.
- **Articles:** eyebrow, headline, standfirst, byline, disclosure (finance pieces) and the lead photo or video sit together at the top; the reading tools (`rs:tools`) and "On this page" (`sd:article-wayfinding`) follow the lead figure, or sit just before the first paragraph when there is none. Header, tools and text share one reading column (`--ds-measure`, 44rem); photos, tables and boxes break out to the full article width. Only those two furniture blocks move: `scripts/editorial-dates.py` already strips the wayfinding block and strips `rs:tools` once step 3 adds it to `BLOCKS`, so the move never re-stamps "Updated" dates. At the switch `build-article-reader.py` and `build-wayfinding.py` take the same insertion point (step 3 lands first).
- **Hubs:** plain title, one-line dek, updated/source line, the hub's own key numbers, a slim photo band (96px on a phone, 200px from 768px), then "Latest stories" from the hub's existing list, restyled as rows like the homepage's Latest. Tesla's numbers are `#to-brief-grid` (its methodology note sits behind "About these numbers"); SpaceX's is the live next-launch card `#sx-next`; Grok's are the newest official release per product line from its release notes (dated, linked). Every id and data hook stays, except ids that lived only inside the old hero (an SVG gradient). The hubs' deeper tool sections keep their old 8–11px labels and slogan section heads until the switch.
- **Trackers:** plain title, dek, updated/source and the tracker's own key numbers, then the tool. No full-screen heroes. In the previews: FSD (`.ft-kpis` and its jump links), Starship (the next-flight card with `#ss-hero-next`, `#ss-hero-window`, and `#ss-source-date`), Cybercab (masthead before `#mw-app`, the old hero kept inside it hidden with its h1 demoted; the overview metrics follow), calendar (`#cs-hero` becomes an inert `<template>`; `#cs-app` ships `cs-enhanced` so the week strip is there from first paint), Starlink (inside `.so-workspace`, with the source strip and key figures; `#overview` keeps its old h1 as an h2) and production (`#pd-quarter`, `#pd-stats` and `#pd-view-note` in the masthead, `#pd-spotlight` kept hidden, `data-enhanced` shipped). The calendar and FSD studios are dark in both themes, so their masthead takes the dark tokens. Number rows whose tiles hold no link use a 2-column grid, not a sideways scroller, so keyboard users can reach every figure.
- **Plain h1s, not slogans.** Showcases (Roadster, Model 3, Cybertruck, Cybercab guide) keep their cinematic stage under the masthead.

## Preview pages (`/preview/`)
- Built by `node scripts/build-design-preview.mjs` from the live page: the old header is cut between unique anchors and the new masthead and lists are inserted. Every hook a page script needs is kept (for the homepage: all `data-hv-*` hooks and `hv:*` markers; the old supporting cards stay in the page, hidden, because `home-v2.js` repaints them).
- Hidden: `noindex, nofollow`, canonical to the live URL, "Preview ·" in the tab title, a preview note at the end of the page, `Disallow: /preview/` in robots.txt. The sitemap, `data/pages.json`, `build-seo.py`, `sync-nav.py`, `check-site-integrity.py` and `indexnow-ping.py` skip them; `inject-js-bundles.py` gives a preview the bundles of its live page.
- Never edit a preview by hand. `.github/workflows/design-preview.yml` refreshes them daily, on design changes and on demand; the bots that rebuild bundles (home-build, news-snapshot, starlink-refresh) also stage `preview/`. The refresh shares the `data-push-main` queue with the bots, so a preview's server-rendered lists can be up to a day older than the live page (the homepage scripts still repaint the lead, numbers and wire in the browser).
- Proposed navigation: every preview carries the menu from `scripts/nav.next.json`, rendered by `sync-nav.py --block` (so the markup is exactly what the switch ships, and no second script writes preview pages). It removes the 8 links that appeared in two menus (trackers stay under Trackers, mission pages under SpaceX, the explorers and gear under Tesla), names `/cybercab.html` "Cybercab fleet", adds a Grok menu built from the Grok hub's own sections, and drops the phone "Quick access" list. Six menus need about 85px more than today's bar, so in the preview the "Ctrl K" hint goes (the shortcut still works), the menu buttons tighten and the bar shows the Menu button below 1280px (today: below 1080px). The live `scripts/nav.json` is untouched until the switch.
- Checks: `node --test tests/design-preview.test.mjs` and `python3 tests/design-preview-browser.py` (also run by `.github/workflows/design-preview-checks.yml`).

## Section themes
One design language for the whole site. The Tesla and SpaceX sections share type, grid, cards, spacing, buttons and motion rules. Only a few tokens change per section, so the two read as different places at a glance and still as one brand. Added 6 Nov 2026 (`section-theme.css`).

## How it works
`theme-boot.js` (already on every page, in the head) has one path map. It sets `<html data-section="tesla|spacex|grok">` and adds `section-theme.css` on pages that do not link it, so no page or builder needs editing. The two hubs also set `data-section` on `<main>` and link the CSS. To put a page in a section, add its path to the map in `theme-boot.js`.

| Section | Pages (path map) |
|---|---|
| SpaceX | spacex, starship*, starlink*, see-the-launch, staging, catch |
| Grok | grok*, grok-bot |
| Tesla | tesla, tsla, cybercab*, cybertruck*, model3*, roadster*, fsd*, optimus*, robotaxi, my-tesla, updates, production, promise-tracker, autonomy, tcmv, goldcab |
| None | home, news, Dispatch articles, calendar, games, About, members and the rest |

`section-theme.css` sets `--sec-accent` per section and moves each studio's own accent token or hard-coded colour to it. Bump `SECTION_CSS_V` in `theme-boot.js` and the `?v=` in the two hub builders whenever the CSS changes. Selectors use `html[data-section][data-section=x]` (doubled attribute) so they win over a studio stylesheet loaded after them.

| Token / element | Tesla | SpaceX | Grok |
|---|---|---|---|
| Idea | The product: precise, human-scale | The mission: vast, technical, nocturnal | The assistant: quiet, monochrome |
| Accent (dark) | `#e31937` red | `#93d9f0` ice blue. Red is left for warnings | `#cfd6e4` silver |
| Accent (light) | `#ba0935` | `#075a7b` | `#39425a` |
| Heading signature (hubs) | 64px red "charge line" | 96px "trajectory arc" | none yet |
| Primary button | Red (unchanged) | Ice with dark text (white on `#075a7b` on light surfaces) | Silver with dark text (white on `#39425a` on light) |

## Rules
- Do not add a third accent to a section. New components read `--sec-accent`.
- The SpaceX hero and programme cards are dark in both themes, so small text on them keeps the light ice value. The darker `#075a7b` is for light surfaces only.
- Contrast: ice `#93d9f0` on `#080c12` and dark text `#06121a` on ice are both above 9:1; `#075a7b` on the light page and white on `#075a7b` are above 7:1.
- The site nav and logo stay Tesla red in every section: they are the brand, not the section.
- Left on the Tesla red for now: the Tesla trackers (they are already red), and everything marked None above. Dispatch articles could follow their topic later.
- Known leftovers: a faint pink glow on the See the launch trajectory tip and the red Grok orbit glow in dark mode, both hard-coded in the studio CSS.
