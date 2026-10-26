---
name: review-page
description: Write or update a Tesla review page in house style. Use for any change to data/reviews-studio.json, a new review, or review structured data.
---
# Review pages in house style

Reviews are generated from `data/reviews-studio.json` by `node scripts/build-reviews-studio.mjs` into `reviews/index.html`
and one page per model. Never edit the generated HTML. Tests: `node --test tests/reviews-studio.test.mjs` and
`tests/reviews-studio-browser.py`. Background: `docs/reviews-studio.md`.

## What a model entry holds
`id`, `name`, `tag`, `verdict`, `best`, `focus`, `strengths` (pairs of title and sentence), `chapters`, `charging`, `checks`,
`faq`, `owner` (`title`, `paragraphs`: the owner's own ownership notes), `reference` (`label`, `source`, `facts`, `note`: Tesla's listed figures
for a named configuration and date), `official` links, `status`, `seats`, `peak`, `image`/`alt`/`credit`, `video`, `readMinutes`.

## The house style
- **Enthusiastic and honest.** The editor owns Tesla and SpaceX shares and discloses it; these are buying analyses, not
  fabricated road tests. Say what comes from the owner's own driving (e.g. "my 2024 RWD, 90,000 km") and label it that way.
- **Specs are references, not promises.** Tie every figure to Tesla's named page and the date it was read. Range is a rating,
  not a measurement. No live prices, no implied availability.
- **Pros and cons are specific** and each traces to a fact or the owner's experience.
- **No unexplained numeric scores.** The site replaced them with recommendations on purpose.

## Review structured data and ratings
Pages currently emit `Article` with an `about: Car`. Google's review rich results need `Review` with a `reviewRating`, which
this house style does not have. If the owner decides to add a rating: they supply the score and its scale, it is shown on
the page and explained there (what 4/5 means), the builder adds `Review`/`reviewRating`/`author` to the graph, and the
model test asserts the rating exists on the page. Don't add a rating field without that decision, and never derive one.
Record the decision in `docs/decisions.md`.

## Done means
Rebuild is deterministic, tests pass, `scripts/audit/run.sh /reviews/<model>.html --quick` is clean, light and dark
screenshots at 390 and 1440 checked, and the `reviewer` agent said SHIP.
