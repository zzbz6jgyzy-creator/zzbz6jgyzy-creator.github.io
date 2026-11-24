# Design system

One design language for the whole site, news first: every page leads with its latest stories or its live numbers.
The redesign was previewed under `/preview/`, switched over on 23 Nov 2026 and the preview pipeline removed on 24 Nov 2026
(plan approved 22 Nov 2026, see `docs/decisions.md`).

## Files
| File | What it holds |
|---|---|
| `ds.css` | Tokens and shared components (`ds-*` classes). Built on the existing tokens in `styles.css :root` (dark) and `theme.css` (light). |
| `ds-components.js` | Pure HTML renderers for those components (UMD, no Node or DOM APIs): `masthead`, `story`, `storyList`, `stat`, `stats`, `sectionHead`, `band`, `picture`, `note`. Builders use them in Node; pages whose views re-render in the browser get them in their bundle. |
| `scripts/ds-pages.mjs` | The live page transforms (hubs and builder-rendered trackers) plus shared HTML helpers. Each studio builder renders its page, then passes it through its transform just before writing; every cut must match exactly once, and each builder is idempotent. |
| Page stylesheets | Each page's layout rules live in its own stylesheet (`home-v2.css`, `article-reader.css`, `news-studio.css`, `dispatch-list.css`, the hub and tracker CSS). |
| `scripts/article_layout.py` | Where an article's reading tools and "On this page" go: after the lead photo or video, else after the header. |

## Tokens
- **Surfaces:** dark first (`--bg #0c0d10`, cards `#14151a`), light supported. Light mode is a token swap under `html[data-theme=light]`; the toggle and the `sd-theme` key are unchanged.
- **One brand red, two roles:** fills use `#e31937` (white on it is 4.71:1). Red text uses `--red-text`: `#f23a52` on dark (5.09:1 on the page, 4.78:1 on cards), `#b01028` on light (6.3:1, 7.1:1 on white). Do not use `#e31937` or the old `--tesla` `#c8102e` for small text: they fail AA.
- **Section accents** (`--ds-accent`, `--ds-accent-fill`, `--ds-on-accent`): red for Tesla and the site, ice `#93d9f0` for SpaceX (light `#06516f`, 7.71:1), silver `#cfd6e4` for Grok (light `#39425a`). Story labels follow their topic (`--ds-topic-*`).
- **Type:** Inter for UI and text, IBM Plex Mono 400/500 for labels. Scale `--ds-fs-12/14/16/18/22/28/36/48`, display `--ds-fs-display` (clamp 32 to 48px). Nothing below 12px; no weights Inter or Plex Mono do not ship (no 800/900, no Plex Mono bold).
- **Space and shape:** `--ds-sp-1..8` = 4, 8, 12, 16, 24, 32, 48, 64px. Radius 12 (cards), 8 (inputs, thumbnails), 999 (pills, buttons). Two shadows, two durations (`.15s`, `.3s`); motion only inside `prefers-reduced-motion: no-preference`.
- **Width:** `--ds-max` 1180px with a 16px phone gutter (24px from 768px).
- `tests/design-system.test.mjs` pins every token pair's contrast and checks the token declarations.

## Components
- **Masthead** (`.ds-masthead`): kicker, a bare plain-text `<h1>` (several tests count `/<h1>/`), one-line dek, "Updated · source" line, optional key numbers, optional slim photo band (120px phone, 200px desktop). `--small` is the homepage line.
- **Key numbers** (`.ds-stats` / `.ds-stat`): label, value, unit, "As of … · source" and a status chip (Disclosed, Reported, Target, Estimate). Every number carries its label and date (editorial rules 2 and 4).
- **Story list** (`.ds-story-list` / `.ds-story`): topic label, headline (the link text), date and read time or a plain description, optional decorative thumbnail from the 480w AVIF/WebP set.
- **Section head** (`.ds-section-head`): a plain label and a link whose text makes sense alone ("All stories", not "All").
- **Buttons, chips, notes:** `.ds-btn--primary` / `--secondary` (44px tall), `.ds-chip` (40px), `.ds-note` for one-line notices such as the disclosure.

## Page types (news first)
- **Homepage:** lead story, then "Latest" (7, no repeats), live numbers, the Sunday briefing, trackers and tools by plain name, upcoming launches, what changed and the wire. h1 is the small line "Tesla, SpaceX and xAI news"; the tagline "Go beyond the headline." is the footer brand line.
- **Dispatch list and news.html:** compact masthead (plain h1, one-line dek, updated line), then the first card. The Dispatch list keeps its topic chips (one sideways-scrolling row on a phone), search and sort above the cards; the cards keep their markup (`data/articles.json`, `new-article.py` and the integrity check read it) and are restyled as rows like the homepage's Latest list, with the newest story big. Styling the first card as featured until `dispatch-browse.js` marks the grid `disp-ready` keeps it from shifting. The Editorial desk box moves below the list (beside it from 1024px). news.html keeps `#ns-reporting-date` in the masthead, the featured stories (`#latest`) straight after it, and gets a plain "All stories" heading on the library.
- **Articles:** eyebrow, headline, standfirst, byline, disclosure (finance pieces) and the lead photo or video sit together at the top; the reading tools (`rs:tools`) and "On this page" (`sd:article-wayfinding`) follow the lead figure, or sit just before the first paragraph when there is none. Header, tools and text share one reading column (`--ds-measure`, 44rem); photos, tables and boxes break out to the full article width. Only those two furniture blocks move: `scripts/editorial-dates.py` already strips the wayfinding block and strips `rs:tools` once step 3 adds it to `BLOCKS`, after which the move changes no article's fingerprint. Step 3 is itself a deliberate date correction (about 83 stories carry a wrong "Updated 9 Nov 2026" from a toolbar relabel) and lands before the switch, where `build-article-reader.py` and `build-wayfinding.py` take the same insertion point.
- **Hubs:** plain title, one-line dek, updated/source line, the hub's own key numbers, a slim photo band (96px on a phone, 200px from 768px), then "Latest stories" from the hub's existing list, restyled as rows like the homepage's Latest. Tesla's numbers are `#to-brief-grid` (its methodology note sits behind "About these numbers"); SpaceX's is the live next-launch card `#sx-next`; Grok's are the newest official release per product line from its release notes (dated, linked). Every id and data hook stays, except ids that lived only inside the old hero (an SVG gradient).
- **Trackers:** plain title, dek, updated/source and the tracker's own key numbers, then the tool. No full-screen heroes. FSD (`.ft-kpis` and its jump links), Starship (the next-flight card with `#ss-hero-next`, `#ss-hero-window`, and `#ss-source-date`), Cybercab (masthead before `#mw-app`, the old hero kept inside it hidden with its h1 demoted; the overview metrics follow), calendar (`#cs-hero` becomes an inert `<template>`; `#cs-app` ships `cs-enhanced` so the week strip is there from first paint), Starlink (inside `.so-workspace`, with the source strip and key figures; `#overview` keeps its old h1 as an h2) and production (`#pd-quarter`, `#pd-stats` and `#pd-view-note` in the masthead, `#pd-spotlight` kept hidden, `data-enhanced` shipped). The calendar and FSD studios are dark in both themes, so their masthead takes the dark tokens. Number rows whose tiles hold no link use a 2-column grid, not a sideways scroller, so keyboard users can reach every figure.
- **Plain h1s, not slogans.** Showcases (Roadster, Model 3, Cybertruck, Cybercab guide) keep their cinematic stage under the masthead.

## Checks
- `node --test tests/design-system.test.mjs`: renderers, token contrast, the `ds-pages.mjs` helpers and the news-first structure of the live pages.
- `python3 tests/design-acceptance-browser.py`: the plan's acceptance targets on the live homepage, lists, three articles, hubs and six trackers at 320 to 1440px in light and dark (first-screen positions, one plain h1, no sideways scroll, CLS under 0.1, no page errors).
- Both run in `.github/workflows/design-system-checks.yml`.

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
