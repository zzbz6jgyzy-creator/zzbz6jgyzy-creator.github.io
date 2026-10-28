# Navigation and mobile opening — October 2026

The persistent shared header keeps Search and Your Daily visible while scrolling. Four menus organize News, Tesla, SpaceX and Explore; Roadster lives under Tesla, and Explore contains guides and recreation rather than a duplicate tracker directory. Newsroom and external headlines link to their correct views. The main subscription action leads to the free Sunday briefing.

On phones the homepage now reads introduction, showcase, then newsletter signup. Desktop retains the split composition. Both signup forms use the existing native provider handoff. Core fonts, imagery, theme support and source information remain intact.

Edit scripts/nav.json and scripts/sync-nav.py, then regenerate all navigation. The many HTML changes contain the same generated menu and hashed core bundle reference, not individual page redesigns. scripts/build-home.js owns the opening; home-studio.css owns its responsive layout.

Validation: generator preservation/idempotence, homepage structure, responsive browser journeys, nested menu keyboard/pointer navigation, dark/light, no-JavaScript direct utility links, enlarged text and mocked newsletter handoffs. Browser tests run in CI; no subscriptions are submitted to a real provider. Later batches: content deduplication, shared visual tokens, and article saving integration.
