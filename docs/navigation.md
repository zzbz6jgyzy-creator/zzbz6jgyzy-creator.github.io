# Navigation studio

The shared menu now has five sections: News, Tesla, SpaceX, Trackers and Explore. Desktop panels expose grouped ordinary links. Tesla is edited around choosing, owning and exploring the cars; the full tool directory lives in Trackers. Roadster’s detailed chapter links belong to its own page navigation. Existing URLs remain unchanged.

On phones and tablets below 1080px, the full-width menu puts an inline search form and Your Daily above large section disclosures. Account, appearance and newsletter controls sit below the main destinations. Search results use the existing index and remain inside the open menu. Search, clearing, keyboard selection and fallback links share the existing search implementation. Its standalone overlay remains available from the header and keyboard shortcut.

The server-rendered HTML uses native details for section choices and a hash-target menu fallback, so menu links work before JavaScript. Enhancement adds hover intent, mutual exclusion, current-section cues, Escape, focus restoration, focus trapping and inert background content. SVG symbols reuse the site’s own icon paths; the Roadster tile reuses existing Tesla imagery. No runtime library, new font, paid tool, new analytics collection or framework migration is required.

Sources: [21st.dev Wensity Navigation Menu](https://mcp.21st.dev/@wensity/components/navigation-menu), [NN/g mega-menu guidance](https://www.nngroup.com/articles/mega-menus-work-well/), and [W3C disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/). These inform the design and interaction model; the implementation uses native HTML, CSS and JavaScript.

Edit scripts/nav.json and scripts/sync-nav.py, then regenerate the shared block. Explicit sd:navigation boundaries make subsequent regeneration safe. Page content, schemas and other bundles remain outside this component. The generator excludes packaged Astro copies and CI comparison checkouts. The many generated HTML changes repeat the same component and core bundle reference.

Validation: python3 tests/test_nav_generation.py; python3 scripts/sync-nav.py --check; Python Playwright tests/nav-browser.py and tests/nav-dropdown-browser.py. Tests use local read-only fixtures, mock unavailable network/storage cases, retain no-JavaScript navigation journeys, exercise large text and keyboard routes, and emit phone/tablet/desktop previews. No email is submitted or message sent by these tests. Conversion and task-finding improvements require observation after release; no uplift is claimed.

