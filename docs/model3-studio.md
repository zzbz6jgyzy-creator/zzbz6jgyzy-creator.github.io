# Model 3 Studio

The old full-screen viewer is now an optional part of a scrollable editorial showroom. The existing licensed 2024 model, site logo, fonts, red accents and primary navigation remain. No account, database or newsletter provider changes are required.

## What changed and why

- A clear introduction and five section links connect photography, 3D, engineering, comparisons and charging. Phone visitors can read the complete guide without capturing every gesture inside a full-screen canvas.
- Three.js and the 1.82 MB model load only after the visitor chooses 3D. An isolated same-origin viewer keeps its full-screen CSS away from the site. The parent pauses rendering offscreen, times out failed startup and provides an image fallback. Rotation is explicit; touch pinch, zoom buttons and keyboard controls remain available. Menus no longer intercept controls while hidden.
- Nineteen source-linked system explanations replace older trim-specific assertions in both the document and 3D cards. Simplified internals and the historical model are labelled. The front-motor illustration is explicitly AWD-only. No universal pack chemistry, usable capacity, low-voltage system or current equipment is invented.
- UK WLTP and US EPA references are separate. Each has four trims, source links, wheel/configuration notes and rollout context. Native tables remain available without JavaScript. Prices are omitted because they change frequently and were not independently established for every configuration.
- The charging graphic uses eight numeric EVKX reference samples for its named MY2024–25 Long Range LG 5L profile. It is not a test by Supercharged Daily, is not assigned to current trims and does not promise a charging time. The reference 10–80% average and elapsed time are labelled separately from a manufacturer peak.
- The scenario calculator exposes distance, consumption, tariff, energy loss and assumed average charging power. It calculates energy and cost, not stops or arrival charge. A 180-mile / 250 Wh-per-mile / 10% drawn-energy-loss / £0.30-per-kWh / 120 kW scenario gives 45 kWh driving, 50 kWh drawn, £15 and 25 equivalent charging minutes. Miles/kilometres conversion preserves energy. Invalid or impossible average charging power produces a visible message.
- Comparison links and validated local market/trim/unit preferences support return visits. No VIN or personal vehicle data is collected. Malformed or blocked storage leaves the guide usable.
- Metadata, social cards, descriptive headings, alt text, JSON-LD and site-search entries describe the expanded guide. The inner viewer is noindex. The existing free newsletter flow is reused.

## Maintenance

Edit `data/model3-studio.json`, then run:

```
node scripts/build-model3-studio.mjs
node scripts/build-js.mjs
python scripts/inject-js-bundles.py
```

The general pre-render build also invokes this builder. The builder generates `model3-explorer.html`, `model3-parts.js` and its entries in `data/pages.json`. Do not edit generated part text directly. The 3D renderer remains hand maintained. Keep viewer import versions in step when changing its modules.

References were reviewed on 26 October 2026. This is a maintained editorial snapshot, not an automated live Tesla configuration feed. Recheck the two regional configurators whenever specifications change; advance source check dates only after a real check. The dataset validator rejects mismatched test cycles, unknown evidence and invalid curve samples. A manufacturer peak is not enough to infer a battery capacity or full curve.

The existing model and images retain their credits and Creative Commons links. The source desk includes full model attribution, modifications and historical photo context. No new paid assets or services were added.

## Validation

`node --test tests/model3-studio.test.mjs` checks regional separation, scenario arithmetic, invalid input, unit conversion, preference validation, curve provenance, readable fallback content and deterministic generation.

`python tests/model3-studio-browser.py` checks widths 320/390/768/1440, dark/light themes, no JavaScript, malformed/blocked storage, malformed embedded data, deep/legacy links, all comparison and scenario controls, actual software-rendered WebGL at phone/desktop widths, touch pinch, keyboard/zoom/explode/part selection, return-to-images, and failed model/module/WebGL recovery. All non-site services are blocked; no signup or account mutation occurs. CI stores design previews as an artifact.

## Later decisions

- Add other markets only after all trim figures and test cycles can be verified locally. Ireland's full current set was not sufficiently established for publication here.
- An exact current-trim visual configurator needs a correctly licensed matching model and validated equipment mappings. The 2024 illustration must not imply that precision.
- Owner charging-session data could support additional curves if provenance, model year, pack, conditions and redistribution rights are established. Do not treat a published peak as a measured curve.
- Physical iOS Safari and Android device checks remain useful alongside browser touch simulation. No unsupported claim of real-device testing is made.
