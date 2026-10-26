# Grok & xAI field guide

The former Grok Bot tutorial has become a complete /grok.html destination. The existing logo, font families, red identity, global navigation, member integration and footer remain. A custom capability map, six original concept illustrations, clearer section navigation and responsive dark/light layouts give the page its own visual identity within the site.

## Reader experience

- Six capability guides explain chat/research, voice, Imagine, Build, Bot and the API. Each has a practical starting task, official sources and a relevant lesson.
- Twelve original lessons form four levels. Each includes three steps, a finish line and a useful prompt. Native expandable sections preserve the complete course without JavaScript.
- The prompt studio provides eight original examples with editable outcome, context, constraints and return format. It assembles text in the browser. It does not call an AI service, request a key or submit the prompt to Grok.
- Model comparison keeps context windows, modalities, tool support and token prices distinct. It uses three reviewed API references rather than a subjective performance score.
- The API token planner handles the documented 200,000-prompt-token long-context boundary, applies long rates to all tokens in that request, scales by request count and optionally applies the US regional 10% token premium.
- Individual subscription cards show monthly prices and prepaid annual totals, with Bot eligibility separate from API billing.
- Four dated official release cards sit beside the latest six xAI stories selected from the site's editorial index. Two existing product-demo clips are retained with archive context, native controls and preload="none".

The original destinations #what, #uses, #marketplace, #latest, #stories, #tutorial, #introduction, #beginner, #intermediate, #advanced, #grok-bot-x-monitor and #grok-bot-claude remain usable. Individual lessons and prompt examples have shareable anchors.

## Sources and freshness

data/grok-studio.json is the reviewed reference, checked **26 October 2026**. It contains 18 official source links, six product guides, three API model references, five individual plans, twelve lessons, eight original templates, four release cards and the two existing media paths.

The linked official documentation currently uses SpaceXSI branding; the page retains familiar Grok/xAI discovery terms and explains that distinction. New individual plan references use The X Subscription documentation, last updated 11 October 2026. Existing Cursor, SuperGrok and X Premium eligibility is acknowledged, with the current official reference linked rather than guessed.

Model and pricing details come from the official model pages and API pricing table. The pricing table explicitly sets long context at a prompt of at least 200,000 tokens and applies that tier to the entire request. The planner uses uncached global text-token list rates, or the documented US regional premium. Its context guard checks input plus estimated output against the listed context capacity.

The estimate is illustrative. Actual billing can depend on cached input, batch processing, search/tool calls, media, reasoning usage, provider output limits, taxes and current terms. Consumer subscription allowances do not include API token billing. Provider marketing benchmarks are not presented as independent test results.

The page distinguishes:

1. The editorial check date for the product, model, plan and release reference.
2. The saved story-index date.
3. The publication date of an individual story or release.

New reporting does not automatically become a verified capability. For example, a Dispatch headline about a feature under review remains a link to that reporting, rather than silently changing the product reference.

## Saved progress and privacy

The browser key sd-grok-studio-v1 contains only:

- Known completed lesson IDs.
- Known saved example IDs.
- The selected product and learning level.
- The most recently opened lesson ID.

Custom prompt wording, file contents, API keys and arbitrary fields are excluded. Saved choices do not sync to the member account. If storage is blocked, the current page remains functional and explains that choices will last only for that visit. A malformed saved value is replaced with validated defaults.

Copy controls use the clipboard when available and expose a selectable text fallback otherwise. Shared lesson links contain a public ID. Opening Grok or another official product does not attach the user's prompt to its URL.

## Updating and building

1. Review the appropriate official reference. Edit data/grok-studio.json deliberately, retaining an exact source for prices, dates and availability. Update checked only after an actual source review.
2. Edit original teaching material or visuals in the catalogue and grok-studio-view.js as needed. Keep product surfaces and API model facts separate.
3. Rebuild:

       node scripts/build-grok-studio.mjs
       node scripts/build-js.mjs
       python scripts/inject-js-bundles.py

4. Review the saved grok.html, Grok entries in data/pages.json, bundle configuration and hashed bundle manifest. Commit only intentional changes.
5. Run the model and browser checks and inspect screenshots in both themes.

scripts/build-noscript.mjs calls the Grok builder as part of the existing general build. The homepage workflow watches the new catalogue, stylesheet and builder. Its existing article-index trigger regenerates the news selection from data/articles.json. The browser uses the complete embedded reference without fetching that catalogue or contacting a model service.

Metadata includes a canonical URL, description, Open Graph and Twitter metadata, and a CollectionPage with twelve LearningResource entries. The existing social image remains. Eight search-index entries make the main guide and its useful sections discoverable.

## Verification

The model suite covers reference integrity, source URLs, immutable input, rate tiers and endpoint arithmetic, invalid estimates, subscription totals, private local preferences, completion progress, prompt composition, story selection, escaped HTML, safe embedded JSON, legacy anchors and deterministic output.

The browser suite covers 320, 390, 768 and 1440 pixel widths in both themes, JavaScript-disabled layouts, blocked or malformed storage, malformed embedded data, direct lesson/prompt links, old level anchors and an invalid hash. It exercises tabs and keyboard navigation, lesson completion, copy fallbacks, saved examples, reload behavior, cost errors and billing controls. All external services are blocked; it checks for unintended model requests and video preloading.

    node --test tests/grok-studio.test.mjs
    CHROMIUM_EXECUTABLE="$(command -v google-chrome)" python tests/grok-studio-browser.py

The dedicated Grok field guide checks workflow uses Node 22, Python 3.12, esbuild 0.25.12 and Playwright 1.62.0 with the runner's system Chrome. It checks deterministic generated files and uploads visual review artifacts.

Local validation passed all **18 model tests** and all **17 browser cases**. Seven committed WebP previews in docs/previews/grok-* cover phone/desktop, dark/light themes, the capability explorer, a lesson and the API planner.

## Generated maintenance found by CI

Site-wide checks also detected two existing saved-output mismatches. The existing SpaceX builder synchronizes its saved schedule timestamp with the current shared calendar, and the existing Starship builder restores its canonical media markup. Only those two generated HTML outputs are included as maintenance; their source catalogs and recorded facts are unchanged. All 23 SpaceX/Starship model tests passed after rebuilding.

## Later decisions

Account-synced learning progress, server-side prompt libraries and a real model integration would need separate implementation and a clear privacy/billing decision. They are not required for this guide. Keeping model references and prices current remains editorial work; the page makes that responsibility visible instead of claiming a live feed.

All new graphics use original SVG and CSS. Existing video and image assets are reused. No new paid service or third-party UI dependency is required.
