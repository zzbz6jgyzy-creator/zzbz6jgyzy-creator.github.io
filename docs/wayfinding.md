# Homepage and article wayfinding

The homepage introduction now has three ordinary links: Latest stories opens Dispatch, Explore trackers jumps to the existing tracker heading, and Find your Tesla opens the existing Tesla buying guide. The row reuses the site's colours, typography and borders, with 44px minimum touch targets.

Dispatch articles with four or more body H2 sections get a closed native **On this page** disclosure near their introduction. Its contents come from the actual section headings. Existing heading IDs are preserved; missing ones get unique readable IDs. Author, newsletter, navigation and related-story sections are excluded. Opening and following the contents needs no JavaScript.

**Jump to discussion** appears when the member module creates that article's comment section. It stays hidden when comments are disabled, configuration is unavailable or JavaScript is off. This avoids advertising an absent destination. The existing lazy SDK loading, sign-in flow, publication and moderation rules are preserved.

`scripts/build-wayfinding.py` updates the homepage and eligible articles. The normal article build calls it, so future articles receive the same controls. Run it directly to refresh existing pages, or use `--check` to detect drift. It changes only owned navigation/style blocks and missing section IDs, retaining article copy and metadata. No new service, dependency, database migration or paid resource is required.

Verification covers anchor preservation/collisions, escaped inline headings, generated-section exclusions, future articles, updated headings, removal on shorter articles, idempotency, real homepage destinations, native contents with JavaScript off, viewport fit in both themes and the handoff to the existing discussion with mocked provider endpoints.
