#!/usr/bin/env node
// Builds tesla-the-plan-book.html: a hidden (noindex) book edition of the long read
// dispatch/tesla-the-plan-complete-story.html. The article text is copied verbatim; plan-book.js paginates it.
// Run: node scripts/build-plan-book.mjs   (re-run after the article changes; it is not part of CI on purpose)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'dispatch/tesla-the-plan-complete-story.html';
const OUT = 'tesla-the-plan-book.html';
const ARTICLE_URL = '/dispatch/tesla-the-plan-complete-story.html';
const V = '20261105-book';

const one = (re, s, what) => { const m = s.match(re); if (!m) throw new Error('book builder: missing ' + what); return m[1].trim(); };
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function extract(html) {
  const article = one(/<article[^>]*>([\s\S]*?)<\/article>/, html, 'article');
  const eyebrow = one(/<p class="eyebrow">([\s\S]*?)<\/p>/, article, 'eyebrow');
  const title = one(/<h1>([\s\S]*?)<\/h1>/, article, 'h1');
  const standfirst = one(/<p class="standfirst">([\s\S]*?)<\/p>/, article, 'standfirst');
  const meta = one(/<p class="meta">([\s\S]*?)<\/p>/, article, 'meta');
  const updated = article.match(/<p class="sd-updated">([\s\S]*?)<\/p>/);
  const disclosure = one(/<p class="sd-disclosure">([\s\S]*?)<\/p>/, article, 'disclosure');
  const figure = one(/<figure class="sd-film"[^>]*>([\s\S]*?)<\/figure>/, article, 'film figure');
  const poster = one(/poster="([^"]+)"/, figure, 'film poster');
  const caption = one(/<figcaption>([\s\S]*?)<\/figcaption>/, figure, 'film caption');
  const afterFigure = article.slice(article.indexOf('</figure>') + '</figure>'.length);
  const creditsAt = afterFigure.indexOf('<section class="sd-credits"');
  if (creditsAt < 0) throw new Error('book builder: missing credits section');
  const bodyHtml = afterFigure.slice(0, creditsAt);
  const rest = afterFigure.slice(creditsAt);
  const credits = one(/<section class="sd-credits"[^>]*>([\s\S]*?)<\/section>/, rest, 'credits');
  const note = one(/(<p class="sd-note">[\s\S]*?<\/p>)/, rest, 'sources note');
  const about = (rest.match(/<aside class="sd-about"[\s\S]*?<\/aside>/) || [''])[0];
  const aboutText = [...about.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1].trim());
  const blocks = (h) => {
    const list = [...h.matchAll(/<(h2|h3|p)\b[^>]*>[\s\S]*?<\/\1>/g)].map((m) => m[0].trim());
    const left = h.replace(/<(h2|h3|p)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
    if (left) throw new Error('book builder: unexpected markup in article body: ' + left.slice(0, 120));
    return list;
  };
  return {
    eyebrow, title, standfirst, meta: [...meta.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => strip(m[1])).join(' · ') || strip(meta), disclosure, poster, caption, aboutText,
    updated: updated ? { iso: one(/datetime="([^"]+)"/, updated[1], 'updated time'), label: strip(updated[1]) } : null,
    body: blocks(bodyHtml), credits: blocks(credits), note,
  };
}

export function render(d) {
  const sec = (name, inner) => `<section data-pb="${name}">\n${inner}\n</section>`;
  const cover = sec('cover', `<p class="pb-eyebrow">${d.eyebrow}</p>\n<h1>${d.title}</h1>\n<p class="pb-standfirst">${d.standfirst}</p>\n<p class="pb-byline">${esc(d.meta)}</p>`);
  const colophon = sec('colophon', [
    `<h2 class="pb-small-title">About this edition</h2>`,
    `<p>This is a book-style edition of a long read published on Supercharged Daily. The text is the article's, unchanged. The standard article is the accessible, searchable version: <a href="${ARTICLE_URL}">read it here</a>.</p>`,
    d.updated ? `<p class="sd-updated">${d.updated.label}</p>` : '',
    `<p class="sd-disclosure">${d.disclosure}</p>`,
    ...d.aboutText.slice(0, 1).map((t) => `<p>${t}</p>`),
  ].filter(Boolean).join('\n'));
  const film = sec('film', `<figure class="pb-film"><img src="${d.poster}" alt="Poster for the film Tesla: The Plan" width="1280" height="720" loading="lazy" decoding="async" /><figcaption>${d.caption}</figcaption></figure>\n<p class="pb-film-link"><a href="${ARTICLE_URL}">Watch the film in the article</a></p>`);
  const body = `<div data-pb="body">\n${d.body.join('\n')}\n</div>`;
  const credits = `<div data-pb="credits">\n${d.credits.join('\n')}\n${d.note}\n</div>`;
  const back = sec('back', `<p class="pb-back-mark">Supercharged Daily</p>\n${d.aboutText.map((t) => `<p>${t}</p>`).join('\n')}`);
  const title = 'Tesla: The Plan, book edition (preview) | Supercharged Daily';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="/theme-boot.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="A book-style test edition of Tesla: The Plan, the complete story from 2003 to today." />
    <meta name="robots" content="noindex,nofollow" />
    <link rel="canonical" href="https://superchargeddaily.com${ARTICLE_URL}" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/plan-book.css?v=${V}" />
  </head>
  <body class="pb-body">
    <a class="pb-skip" href="#pb-main">Skip to the book</a>
    <header class="pb-top">
      <a class="pb-back" href="${ARTICLE_URL}"><span aria-hidden="true">←</span> Read the standard article</a>
      <p class="pb-tag">Book edition · hidden preview</p>
    </header>
    <main id="pb-main" class="pb-main" tabindex="-1">
      <div class="pb-stage" data-pb-stage>
        <div class="pb-loading" data-pb-loading role="status">Setting the pages…</div>
        <div class="pb-book" id="pb-book" role="region" aria-roledescription="book" aria-label="Tesla: The Plan, book edition"></div>
      </div>
      <div class="pb-bar" data-pb-bar hidden>
        <button type="button" class="pb-btn" data-pb-prev aria-label="Previous page"><span aria-hidden="true">←</span></button>
        <p class="pb-status" data-pb-status role="status" aria-live="polite"></p>
        <button type="button" class="pb-btn" data-pb-next aria-label="Next page"><span aria-hidden="true">→</span></button>
        <button type="button" class="pb-btn pb-btn-text" data-pb-contents>Contents</button>
      </div>
      <p class="pb-hint" data-pb-hint hidden>Drag a page corner, swipe, or use the arrow keys.</p>
      <noscript><p class="pb-noscript">The book needs JavaScript. <a href="${ARTICLE_URL}">Read the standard article</a> instead.</p></noscript>
    </main>
    <template id="pb-source">
${cover}
${colophon}
${film}
${body}
${credits}
${back}
    </template>
    <script src="/vendor/page-flip/page-flip.browser.js"></script>
    <script src="/plan-book.js?v=${V}" defer></script>
  </body>
</html>
`;
}

export function build(root = ROOT) {
  const data = extract(fs.readFileSync(path.join(root, SRC), 'utf8'));
  fs.writeFileSync(path.join(root, OUT), render(data));
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const d = build();
  console.log(`Book edition written: ${d.body.length} body blocks, ${d.credits.length} credit blocks.`);
}
