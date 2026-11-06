# Design system: section themes

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
