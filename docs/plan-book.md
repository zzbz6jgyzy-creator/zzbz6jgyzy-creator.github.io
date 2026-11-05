# Book edition of "Tesla: The Plan" (hidden preview)

`/tesla-the-plan-book.html` is a page-flip book version of the long read `dispatch/tesla-the-plan-complete-story.html`. It is a test: `noindex,nofollow`, canonical pointing at the original article, not in the sitemap, search, menu or any link. Anyone with the address can open it.

## How it is made
- `scripts/build-plan-book.mjs` copies the article text **verbatim** (cover, "About this edition", film page, 225 body blocks, credits) into a `<template>` in `tesla-the-plan-book.html`. Re-run it after the article changes: `node scripts/build-plan-book.mjs`. It is not in CI on purpose, so an editorial change to the article never blocks on the preview.
- `plan-book.js` measures the text and flows it into fixed-size pages (long paragraphs are split at word boundaries, headings are kept with the paragraph after them), builds the contents with real page numbers, then hands the pages to **StPageFlip** (`vendor/page-flip/`, version 2.0.7, MIT, unmodified).
- Layout is chosen once at load: two-page spread from 900px wide, otherwise one page at a time. If the window changes class (rotate a tablet, resize) the script remembers the reader's place and reloads the page. It never calls the library's `destroy()`.
- `plan-book.css` holds the paper pages (the same in dark and light theme; the room around them follows the theme), the covers and the controls.

## What it keeps from the article, and what it changes
- Kept: every word of the body and credits, in order, including links. The browser test compares the paginated pages with the source text word for word.
- The embedded film becomes its poster with a link to the article (a playing video does not belong on a turning page).
- Chapter headings show "Part one:" as a small red label and capitalise the first letter of the title **visually**; the text itself is unchanged.
- Not included: reading tools, the on-page contents, newsletter and share blocks, comments.

## Known limits (StPageFlip and the approach)
- StPageFlip's last npm release is April 2021 (`page-flip` 2.0.7). Open issues include `destroy()` not stopping the render loop and HTML-mode boundary bugs. Fine for a preview; reconsider before it goes public.
- It has no accessibility support of its own. The page labels the region, announces the page in a live region, hides off-screen pages from assistive technology and has buttons and arrow keys, but the standard article stays the accessible, searchable version, and the page says so on its second page and in the top bar.
- Page numbers and the page count depend on screen size (62 pages on a 1440px desktop, 70 on a phone). Text size cannot be changed in the book (it would repaginate).
- Find-in-page only finds text on the pages on screen, because the other pages are hidden.

## Test
`CHROMIUM_EXECUTABLE=/path/to/chromium python3 tests/plan-book-browser.py` checks, at 390, 768 and 1440 px in light and dark: no console errors, noindex and canonical, every word once and in order, no page overflows, no ids on pages, next/previous, arrow keys, Home and End, the Contents button, a contents row landing on the right chapter, and no horizontal scroll.
