---
description: Add or update a Tesla review page from data/reviews-studio.json
argument-hint: "<model id: model-3|model-y|model-s|model-x|cybertruck|new> [what changed]"
allowed-tools: Read, Edit, Glob, Grep, Bash(node scripts/build-reviews-studio.mjs*), Bash(node --test tests/reviews-studio.test.mjs*), Bash(scripts/audit/*), Bash(node scripts/audit/*), Bash(python3 scripts/audit/*)
---
Work on the review for: $ARGUMENTS

Reviews are data-driven: `data/reviews-studio.json` (`models[]`) is built into `reviews/*.html` by
`node scripts/build-reviews-studio.mjs` using `reviews-studio-model.js`, with tests in `tests/reviews-studio.test.mjs`.
Edit the data, never the generated HTML. Read `.claude/skills/review-page/SKILL.md` first.

1. Read the model's current entry and the fields the builder expects. For a new model, copy the closest entry's shape.
2. Ask the owner for first-hand notes, specs with sources (Tesla's own configurator or EPA/WLTP), pros and cons, and the
   verdict. Keep the owner's own ownership notes as their own words, labelled as such.
3. **Rating:** the data has no star rating and Google's review results need one. Never invent a score. If the owner gives
   one (say "4 out of 5"), add it as an explicit field and tell them the schema change it needs (see the skill).
4. Rebuild with `node scripts/build-reviews-studio.mjs`, run `node --test tests/reviews-studio.test.mjs`, then
   `scripts/audit/run.sh /reviews/<model>.html --quick` and look at the screenshots (`/screenshot`).
5. Do not commit or push; summarise what changed and what is unverified.
