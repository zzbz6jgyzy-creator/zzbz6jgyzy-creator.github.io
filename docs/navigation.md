# Navigation refinements

The mobile menu now shows four direct shortcuts above its expandable sections: Original stories, Software updates, Cybercab and Starship. They are ordinary links in the initial HTML, with 44px minimum touch targets and the existing colours, typography, borders and focus styling.

The News menu distinguishes **Latest headlines** (the news feed) from **Original stories · Dispatch** (the site's own reporting). The Tesla menu groups Software Updates, FSD Europe and Cybercab with the existing evidence and explainers under **Software & autonomy**. Existing destinations remain available in Explore.

`scripts/nav.json` defines the links, including `mobileShortcuts`. `scripts/sync-nav.py` renders desktop and mobile navigation across existing pages and new pages added later. It preserves each page's navigation attributes and updates the navigation stylesheet version. The generated HTML is committed alongside its sources so all pages get the same navigation when deployed.

The new shortcuts reuse the site's existing 21st.dev-inspired menu. They need no library, extra JavaScript, credentials, paid service or framework.

Checks:

- `python3 tests/test_nav_generation.py`: generation preserves page content and per-page navigation attributes, and is repeatable.
- `python3 scripts/sync-nav.py --check`: all page navigation matches the shared configuration.
- `python3 tests/nav-browser.py`: journeys through each shortcut, Tesla tracker discovery, news labels, active links, menu closing and viewport fit on phone, tablet and desktop, with light/dark themes and a static HTML case. Requests use local files; external requests and writes are blocked. Set `CHROMIUM_PATH` to select the browser executable.

Homepage starting-point links and article contents links remain possible later batches.
