# Cybertruck Studio

The full-screen Cybertruck viewer is now one optional part of a scrollable showroom and ownership guide. The existing site identity, navigation, licensed model and photographs remain. No account, database, newsletter provider or paid-service changes are required.

## Experience

- An angular design, metallic typography treatment and a credited production-truck photograph introduce the page. Five section links connect the studio, engineering, current US comparisons, charging and the ownership workbench.
- Photography works immediately. Three.js and the 787 KB model load only after the visitor chooses 3D. The isolated viewer has a visible parent-page exit, phone pinch, zoom buttons, explicit rotation, keyboard orbit/zoom/reset, exploded components and a parts menu. Offscreen rendering pauses; failed WebGL, module loads, model downloads and startup timeouts return to the photo guide.
- Nineteen sourced system explanations replace older universal claims in both the document and 3D cards. The model and hidden geometry are illustrative, not a current configuration or repair drawing. A small interactive steering diagram explains opposite/coordinated wheel directions without pretending to simulate actual steering angles or calibration.
- Three current US trim references distinguish Dual Motor AWD, Premium AWD and Cyberbeast. The snapshot labels EPA versus Tesla-estimated range and rollout-subtracted acceleration. Current trailer references differ: 7,500 versus 11,000 lb. Current advertised DC peaks are 325 kW. The comparison does not map historical Foundation Series, earlier AWD or Long Range builds onto a new trim name. Other markets and exact historical model years require their own references.
- The charging graphic redraws eight factual EVKX samples for its explicitly named Cybertruck AWD MY2024–2026 reference. The page does not call it a Supercharged Daily test, a test of each individual year, or a current-trim guarantee. Its 132.3 kW 10–80% average and 38m 52s time come from the source's full profile, not from an invented interpolation between the eight displayed samples. Source modification was checked as 25 October 2026.

## Ownership tools

The three tools share an accessible keyboard-operated tab list. All explanatory text remains readable without JavaScript; calculators are hidden when enhancement is unavailable.

### Journey energy

Inputs: distance, baseline consumption, assumed consumption increase, energy tariff, charging loss and average charging power. No universal towing penalty is assumed. Baseline energy is distance × consumption. Loaded driving energy multiplies by the entered increase; energy drawn divides by one minus the loss fraction. Cost and equivalent charging time use that drawn energy.

A 180-mile trip at 500 Wh/mi, with a 50% entered increase, 10% loss of energy drawn, $0.30/kWh and 150 kW average gives 90 kWh baseline, 135 kWh driving, 150 kWh drawn, $45 and 60 equivalent charging minutes. These are scenario outputs, not predicted stops or arrival charge. Miles/kilometres conversion preserves energy.

### Load budget

The actual door-label combined occupant-and-cargo capacity is required and starts blank. Occupants, cargo, added equipment and measured trailer tongue load use that entered budget. The full trailer mass is checked separately against the selected current trim's reference; it is not added again to vehicle payload. Tongue load is checked against its separate published reference.

Example: a user-entered 2,000 lb capacity less 400 lb occupants, 300 lb cargo, 100 lb added equipment and 500 lb tongue load leaves 700 lb of that entered budget. A 5,000 lb trailer is checked separately. The result does not certify axle weights, GVWR, tyre ratings, hardware fitment or legal towing eligibility. Pounds/kilograms conversion preserves the underlying mass. Hitch-mounted accessory carriers have different rules and are not silently treated as trailers.

### Power budget

Inputs: an allocated battery-energy budget after the user's driving reserve, constant load, assumed loss and eligible output mode. Separate reference modes cover a 120V/20A source, an equipped 240V bed outlet and installed home backup. The modes do not imply that every truck has every outlet or that home backup requires no installation.

60 kWh allocated, 10% loss of that allocated energy and a 1,000W constant load gives 54 kWh delivered and 54 illustrative hours. No nominal pack capacity is treated as usable energy. Starting surges, idle draw, reserve settings, conditions and circuit limits still matter. A load above the selected mode's reference produces a visible error.

## Sources and maintenance

Edit `data/cybertruck-studio.json`, then run:

```
node scripts/build-cybertruck-studio.mjs
node scripts/build-js.mjs
python scripts/inject-js-bundles.py
```

The general pre-render build also invokes the builder. It generates `cybertruck-explorer.html`, `cybertruck-parts.js` and the Cybertruck search entries in `data/pages.json`. Renderer, viewer loader and styles remain hand maintained. Preserve media attribution and advance module query versions when changing cached modules.

References were checked on 26 October 2026. This is an editorial snapshot, not a live Tesla configuration feed. Source links and review dates are in the dataset and the visible source desk. Recheck the local configurator and the relevant manual before updating numbers. Do not infer a model year, pack chemistry, usable capacity, suspension, outlet fitment or charging curve from a badge.

The licensed Sketcher model remains CC BY 4.0, with original source, modification context and attribution. Existing photographs retain their individual CC BY, CC BY-SA or CC0 credits. No new paid assets or services were added. Local preferences retain only validated trim, comparison and unit choices; vehicle labels and calculator inputs are not persisted or uploaded.

## Validation

- Six Node tests cover trim/reference distinctions, charging provenance, calculation arithmetic, invalid input, energy/mass conversions, payload separation, mode limits, safe preferences, readable fallback content and deterministic generation.
- Two existing bundle regression tests verify reproducibility and concurrent-publisher behaviour.
- Eighteen browser scenarios cover 320/390/768/1440 widths, short phone viewports, dark/light, no JavaScript, malformed data/storage, blocked storage, legacy/deep/invalid links, steering controls, tabs and all three calculators. Actual software WebGL tests exercise phone pinch, keyboard orbit, zoom, rotation, explode, hidden-system selection, visible exit, restart and message-source validation. Separate fixtures cover failed model/module/WebGL recovery. Non-site services are blocked and no account or signup mutation occurs. CI uploads design previews.

Physical iOS Safari and Android checks remain useful alongside browser touch simulation. Additional markets, verified historical-year comparisons and owner-supplied charging sessions can follow when their provenance and redistribution rights are established. An exact current-trim configurator would require an appropriately licensed matching model and verified equipment mappings.
