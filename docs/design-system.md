# Design system: section themes

One design language for the whole site. The Tesla and SpaceX sections share type, grid, cards, spacing, buttons and motion rules. Only a few tokens change per section, so the two read as different places at a glance and still as one brand. Added 6 Nov 2026 (`section-theme.css`).

## How it works
`<main data-section="tesla">` or `<main data-section="spacex">` (set by `scripts/build-tesla-overview.mjs` and `scripts/build-spacex-studio.mjs`). `section-theme.css` loads after the section stylesheets and sets:

| Token / element | Tesla | SpaceX |
|---|---|---|
| Idea | The product: precise, human-scale | The mission: vast, technical, nocturnal |
| Accent (dark) | `#e31937` red | `#93d9f0` ice blue. Red is left for warnings |
| Accent (light) | `#ba0935` | `#075a7b` |
| Heading signature | 64px red "charge line" under each section heading | 96px thin "trajectory arc" under each section heading |
| Primary button | Red (unchanged) | Ice blue with dark text (white on `#075a7b` on light surfaces) |

## Rules
- Do not add a third accent to a section. New components read `--sec-accent`.
- The SpaceX hero and programme cards are dark in both themes, so small text on them keeps the light ice value. The darker `#075a7b` is for light surfaces only.
- Contrast: ice `#93d9f0` on `#080c12` and dark text `#06121a` on ice are both above 9:1; `#075a7b` on the light page and white on `#075a7b` are above 7:1.
- The site nav and logo stay Tesla red in every section: they are the brand, not the section.
- Not yet themed: the Starship, Starlink and Grok pages, articles, and the home page. Roll them out one section at a time.
