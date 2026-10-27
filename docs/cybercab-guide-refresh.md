# Cybercab guide: refresh checklist

`/cybercab-guide.html` is an edited snapshot. It is generated from `data/cybercab-guide.json` by
`scripts/build-cybercab-guide.mjs` and validated by `cybercab-guide-model.js`. Never hand-edit the HTML. Bots do not write this
page; the live counters stay on `cybercab.html`.

## Labels (keep them honest)

- **Disclosed**: Tesla or a regulator said it in a document we opened (deck, filing, NHTSA page, Tesla's own post).
- **Target**: a stated aim or date. Never a result.
- **Reported**: a journalist's or reviewer's finding. Tesla has not confirmed it. Spec figures from news reports stay here.

Every metric, table cell and event needs a source in `sources` with a `checked` date no later than `reviewed`. A cell with no
source is `null` and renders "Not published".

## When to refresh

- A Tesla quarterly update and call (late Jan, Apr, Jul, Oct): capacity, production wording, deployment, customer aim.
- NHTSA acts on audit query AQ26002 (response was due 30 Oct 2026): add a regulator event; update the legality FAQ.
- Tesla publishes a spec sheet, price or order page: upgrade `reported` cells to `disclosed` only where Tesla said it.
- Cybercabs reach a customer, or serve a second city (Dallas was stated as next month on the 21 Oct call).
- Any correction: fix it, add a `changes` entry marked `correction` (editorial rule 6), update `reviewed`.

## Steps

1. Open each new source, add it to `sources` with the date you opened it.
2. Update `metrics`, `versions` rows (fill the **Customer version** column only from Tesla material), `timeline` (oldest first; targets that have happened become dated events), and `faqs`.
3. Promises are single-sourced from `data/promises.json`: change the ledger, not the guide. `promises` here holds only ids and a one-line note, and the build fails if an id no longer exists.
4. Add a `changes` entry (newest first) and set `reviewed`.

```
node scripts/build-cybercab-guide.mjs
sh scripts/rebuild-js.sh
node --test tests/cybercab-guide.test.mjs
python3 tests/test_cybercab_guide_ownership.py
CHROMIUM_PATH=... python3 tests/cybercab-guide-browser.py
node scripts/audit/axe.mjs cybercab-guide.html
```
