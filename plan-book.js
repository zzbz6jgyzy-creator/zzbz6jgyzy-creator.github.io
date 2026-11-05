/* Book edition of "Tesla: The Plan" (hidden preview).
 * Reads the verbatim article from <template id="pb-source">, flows it into fixed-size pages by measuring,
 * then hands the pages to StPageFlip (vendor/page-flip, HTML mode).
 * Notes on the library (2.0.7, unmaintained since 2021):
 *  - it clones page elements while flipping, so pages carry no ids; contents rows are text-only buttons
 *    (its click check looks at the event target's own tag) and clicks are handled on document;
 *  - destroy() does not stop its render loop, so this script never destroys it: when the layout class changes
 *    (spread <-> single page, or a large resize) it remembers the reader's place and reloads the page.
 */
(() => {
  'use strict';
  const source = document.getElementById('pb-source');
  const bookEl = document.getElementById('pb-book');
  const stage = document.querySelector('[data-pb-stage]');
  const loading = document.querySelector('[data-pb-loading]');
  const bar = document.querySelector('[data-pb-bar]');
  const hint = document.querySelector('[data-pb-hint]');
  const statusEl = document.querySelector('[data-pb-status]');
  const prevBtn = document.querySelector('[data-pb-prev]');
  const nextBtn = document.querySelector('[data-pb-next]');
  const tocBtn = document.querySelector('[data-pb-contents]');
  const root = document.documentElement;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SS = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };

  function fail(msg) {
    if (loading) loading.textContent = msg;
    console.warn('plan-book:', msg);
  }
  if (!source || !bookEl || !window.St || !window.St.PageFlip) return fail('The book could not start. Read the standard article instead.');

  /* ---------- layout ---------- */
  function computeLayout() {
    const vw = Math.max(280, root.clientWidth);
    const vh = Math.max(360, window.innerHeight);
    const spread = vw >= 900;
    const margin = vw < 640 ? 12 : 28;
    const availH = Math.max(420, vh - (vw < 640 ? 150 : 170));
    let pw, ph;
    if (spread) {
      pw = Math.min(Math.floor((vw - margin * 2) / 2), 540);
      ph = Math.round(pw * 1.42);
      if (ph > availH) { ph = availH; pw = Math.floor(ph / 1.42); }
    } else {
      pw = Math.min(vw - margin * 2, 520);
      ph = Math.min(availH, Math.round(pw * 1.6));
    }
    const fs = Math.max(14.5, Math.min(18, Math.round(pw * 0.034 * 10) / 10));
    const pad = Math.round(Math.max(20, pw * 0.085));
    return { spread, pw, ph, fs, pad, key: (spread ? 'S' : 'P') + Math.round(pw / 40) + 'x' + Math.round(ph / 40), vw };
  }
  const L = computeLayout();
  root.style.setProperty('--pw', L.pw + 'px');
  root.style.setProperty('--ph', L.ph + 'px');
  root.style.setProperty('--pb-fs', L.fs + 'px');
  root.style.setProperty('--pb-pad', L.pad + 'px');
  bookEl.style.width = (L.spread ? L.pw * 2 : L.pw) + 'px';
  bookEl.style.height = L.ph + 'px';

  /* ---------- page building ---------- */
  const frag = source.content;
  const bySel = (s) => frag.querySelector(s);
  const makePage = (cls, density) => {
    const page = document.createElement('div');
    page.className = 'pb-page ' + (cls || '');
    if (density) page.dataset.density = density;
    const inner = document.createElement('div');
    inner.className = 'pb-inner';
    page.appendChild(inner);
    return { page, inner };
  };
  const meas = makePage('pb-measure');
  document.body.appendChild(meas.page);
  const fits = () => meas.inner.scrollHeight <= meas.inner.clientHeight + 1;

  const words = (el) => {
    let n = 0;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) n += (w.currentNode.nodeValue.match(/\S+/g) || []).length;
    return n;
  };
  // Clone of `el` holding only its first k words (head) or everything after them (tail).
  function cut(el, k, head) {
    const c = el.cloneNode(true);
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    let seen = 0, hit = null, at = 0;
    for (const t of nodes) {
      const re = /\S+/g;
      let m, local = 0;
      while ((m = re.exec(t.nodeValue))) {
        local++;
        if (seen + local === k) { hit = t; at = m.index + m[0].length; break; }
      }
      if (hit) break;
      seen += local;
    }
    if (!hit) return c;
    const txt = hit.nodeValue;
    if (head) {
      hit.nodeValue = txt.slice(0, at);
      for (let n = hit; n && n !== c; n = n.parentNode) while (n.nextSibling) n.parentNode.removeChild(n.nextSibling);
    } else {
      hit.nodeValue = txt.slice(at).replace(/^\s+/, '');
      for (let n = hit; n && n !== c; n = n.parentNode) while (n.previousSibling) n.parentNode.removeChild(n.previousSibling);
    }
    return c;
  }
  // Split a paragraph so the head fills the rest of the current measuring page.
  function split(el) {
    const total = words(el);
    if (total < 14) return null;
    let lo = 0, hi = total - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const probe = cut(el, mid, true);
      meas.inner.appendChild(probe);
      const ok = fits();
      meas.inner.removeChild(probe);
      if (ok) lo = mid; else hi = mid - 1;
    }
    let k = lo;
    const empty = meas.inner.childNodes.length === 0;
    if (k < (empty ? 1 : 10)) return null;
    if (total - k < 8) k = Math.max(1, total - 8);
    const headEl = cut(el, k, true);
    headEl.classList.add('pb-cut');
    return { head: headEl, tail: cut(el, k, false) };
  }

  function flow(blocks, onPage) {
    const out = [];
    let carry = null;
    const finish = () => {
      let last = meas.inner.lastElementChild;
      let held = null;
      if (last && /^H[23]$/.test(last.tagName) && meas.inner.childElementCount > 1) { held = last; meas.inner.removeChild(last); }
      out.push(Array.from(meas.inner.childNodes));
      meas.inner.textContent = '';
      if (held) meas.inner.appendChild(held);
    };
    for (const src of blocks) {
      let node = src;
      let guard = 0;
      while (node && guard++ < 400) {
        meas.inner.appendChild(node);
        if (fits()) { node = null; break; }
        meas.inner.removeChild(node);
        const parts = node.tagName === 'P' ? split(node) : null;
        if (parts) {
          meas.inner.appendChild(parts.head);
          finish();
          node = parts.tail;
          continue;
        }
        if (meas.inner.childNodes.length === 0) { // taller than a page and not splittable: keep, clipped
          console.warn('plan-book: block taller than a page', node.tagName);
          meas.inner.appendChild(node);
          finish();
          node = null;
          break;
        }
        finish();
      }
    }
    if (meas.inner.childNodes.length) finish();
    meas.inner.textContent = '';
    return out;
  }

  function prepBlock(el, index) {
    const c = el.cloneNode(true);
    c.removeAttribute('id');
    c.dataset.b = String(index);
    if (c.tagName === 'H2') {
      const m = c.innerHTML.match(/^(Part [a-z-]+:)\s+([\s\S]*)$/i);
      if (m) c.innerHTML = '<span class="pb-part">' + m[1] + '</span><span class="pb-ptitle"> ' + m[2] + '</span>';
      c.dataset.ch = el.id || 'chapter-' + index;
      c.dataset.chTitle = el.textContent.trim().replace(/\s+/g, ' ');
    }
    return c;
  }

  const bodyBlocks = Array.from(bySel('[data-pb=body]').children).map((el, i) => prepBlock(el, i));
  const creditBlocks = Array.from(bySel('[data-pb=credits]').children).map((el, i) => prepBlock(el, 10000 + i));

  const pages = []; // { page, inner, kind, running }
  const addPages = (groups, cls, kind, running) => {
    for (const nodes of groups) {
      const p = makePage(cls);
      p.inner.append(...nodes);
      pages.push({ ...p, kind, running });
    }
  };
  const frontPage = (name, cls, kind) => {
    const sec = bySel('[data-pb=' + name + ']');
    const groups = flow(Array.from(sec.children).map((c) => c.cloneNode(true)), null);
    addPages(groups, cls, kind, '');
  };

  // Cover
  {
    const sec = bySel('[data-pb=cover]');
    const p = makePage('pb-cover', 'hard');
    p.inner.append(...Array.from(sec.children).map((c) => c.cloneNode(true)));
    pages.push({ ...p, kind: 'cover', running: '' });
  }
  frontPage('colophon', 'pb-colophon', 'front');
  frontPage('film', 'pb-film-page', 'front');

  // Contents: first pass with placeholder numbers to learn its length, numbers are filled in before the library sees the pages
  const chapters = [];
  bodyBlocks.forEach((b) => { if (b.dataset.ch) chapters.push({ id: b.dataset.ch, title: b.dataset.chTitle }); });
  const creditsTitle = creditBlocks.find((b) => b.dataset.ch);
  if (creditsTitle) chapters.push({ id: creditsTitle.dataset.ch, title: creditsTitle.dataset.chTitle });
  const tocBlocks = () => {
    const list = [];
    const h = document.createElement('h2');
    h.className = 'pb-toc-title';
    h.textContent = 'Contents';
    list.push(h);
    chapters.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pb-toc-row';
      b.dataset.goto = c.id;
      b.dataset.page = '000';
      b.textContent = c.title;
      list.push(b);
    });
    return list;
  };
  const tocGroups = flow(tocBlocks(), null);
  const tocStart = pages.length;
  addPages(tocGroups, 'pb-toc', 'toc', 'Contents');
  // Body and credits
  const bodyStart = pages.length;
  const bodyGroups = flow(bodyBlocks, null);
  addPages(bodyGroups, 'pb-body-page', 'body', '');
  const creditsStart = pages.length;
  const creditGroups = flow(creditBlocks, null);
  addPages(creditGroups, 'pb-credits', 'credits', 'Credits');
  if ((pages.length - 1) % 2 === 1) { // inner pages must pair up so the back cover is a single page
    const blank = makePage('pb-blank');
    pages.push({ ...blank, kind: 'blank', running: '' });
  }
  { // Back cover
    const sec = bySel('[data-pb=back]');
    const p = makePage('pb-backcover', 'hard');
    p.inner.append(...Array.from(sec.children).map((c) => c.cloneNode(true)));
    pages.push({ ...p, kind: 'back', running: '' });
  }
  meas.page.remove();

  // Running chapter titles, numbers, parity classes
  let chapterNow = '';
  const chapterPage = {};
  pages.forEach((p, i) => {
    if (p.kind === 'body') {
      const h = p.inner.querySelector('h2[data-ch]');
      if (h) chapterNow = h.dataset.chTitle;
      p.running = chapterNow;
    }
    p.inner.querySelectorAll('h2[data-ch]').forEach((h) => { chapterPage[h.dataset.ch] = i; });
    if (p.kind !== 'cover' && p.kind !== 'back') {
      p.page.classList.add(i % 2 === 1 ? 'pb-left' : 'pb-right');
      const head = document.createElement('div');
      head.className = 'pb-head';
      head.setAttribute('aria-hidden', 'true');
      const a = document.createElement('span');
      a.textContent = 'Tesla: The Plan';
      const b = document.createElement('span');
      b.textContent = p.running || '';
      head.append(a, b);
      const foot = document.createElement('div');
      foot.className = 'pb-foot';
      foot.setAttribute('aria-hidden', 'true');
      foot.textContent = String(i);
      p.page.append(head, foot);
    }
  });
  pages.forEach((p) => p.page.querySelectorAll('.pb-toc-row').forEach((row) => {
    const at = chapterPage[row.dataset.goto];
    row.dataset.page = at == null ? '' : String(at);
    row.dataset.goto = at == null ? '0' : String(at);
  }));
  window.__planBook = { pages: pages.length, bodyStart, tocStart, creditsStart, layout: L };

  /* ---------- the book ---------- */
  const total = pages.length;
  const pageFlip = new window.St.PageFlip(bookEl, {
    width: L.pw,
    height: L.ph,
    size: 'fixed',
    autoSize: false,
    showCover: true,
    usePortrait: true,
    maxShadowOpacity: 0.45,
    flippingTime: reduced ? 60 : 800,
    mobileScrollSupport: true,
    swipeDistance: 30,
    clickEventForward: true,
    useMouseEvents: true,
    showPageCorners: !reduced,
  });
  pageFlip.loadFromHTML(pages.map((p) => p.page));
  window.__planBook.flip = pageFlip;

  const label = (i) => (i <= 0 ? 'Cover' : i >= total - 1 ? 'Back cover' : 'Page ' + i);
  function update(index) {
    const spread = pageFlip.getOrientation() === 'landscape';
    const left = index;
    const visible = spread && index > 0 && index < total - 1 ? [left, left + 1] : [left];
    let text;
    if (visible.length === 2) text = 'Pages ' + visible[0] + '–' + visible[1] + ' of ' + (total - 2);
    else text = label(index) + (index > 0 && index < total - 1 ? ' of ' + (total - 2) : '');
    statusEl.textContent = text;
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= total - 1;
    pages.forEach((p, i) => {
      if (visible.includes(i)) p.page.removeAttribute('aria-hidden'); else p.page.setAttribute('aria-hidden', 'true');
    });
    // A closed book sits in one half of the spread; slide it so the cover and back cover are centred.
    const shift = spread && index === 0 ? -L.pw / 2 : spread && index >= total - 1 ? L.pw / 2 : 0;
    bookEl.style.transform = shift ? 'translateX(' + shift + 'px)' : '';
    window.__planBook.index = index;
    try { history.replaceState(null, '', '#page-' + index); } catch (e) {}
    const first = pages[index] && pages[index].inner.querySelector('[data-b]');
    SS.set('pb-anchor', JSON.stringify({ b: first ? first.dataset.b : null, p: index, key: L.key }));
  }
  // Always read the book's real position: a late event from an earlier flip must not overwrite a newer one.
  pageFlip.on('flip', () => update(pageFlip.getCurrentPageIndex()));
  pageFlip.on('changeOrientation', () => update(pageFlip.getCurrentPageIndex()));

  prevBtn.addEventListener('click', () => pageFlip.flipPrev());
  nextBtn.addEventListener('click', () => pageFlip.flipNext());
  tocBtn.addEventListener('click', () => pageFlip.flip(tocStart));
  document.addEventListener('click', (e) => {
    const row = e.target && e.target.closest && e.target.closest('.pb-toc-row');
    if (!row) return;
    const to = parseInt(row.dataset.goto, 10);
    if (Number.isFinite(to)) pageFlip.flip(to);
  });
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { pageFlip.flipNext(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { pageFlip.flipPrev(); e.preventDefault(); }
    else if (e.key === 'Home') { pageFlip.turnToPage(0); update(0); e.preventDefault(); }
    else if (e.key === 'End') { pageFlip.turnToPage(total - 1); update(total - 1); e.preventDefault(); }
  });

  /* ---------- start page: #page-N, or the place kept across a re-layout ---------- */
  let start = 0;
  const h = /^#page-(\d+)$/.exec(location.hash || '');
  if (h) start = Math.min(total - 1, parseInt(h[1], 10));
  try {
    const saved = JSON.parse(SS.get('pb-anchor') || 'null');
    if (saved && !h && saved.key !== L.key) {
      if (saved.b != null) {
        const idx = pages.findIndex((p) => p.inner.querySelector('[data-b="' + saved.b + '"]'));
        if (idx >= 0) start = idx;
      } else if (Number.isFinite(saved.p)) start = Math.min(total - 1, saved.p);
    }
  } catch (e) {}
  if (start > 0) pageFlip.turnToPage(start);
  bookEl.classList.add('is-ready');
  loading.hidden = true;
  bar.hidden = false;
  hint.hidden = false;
  update(pageFlip.getCurrentPageIndex());

  /* ---------- re-layout when the window changes class ---------- */
  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const next = computeLayout();
      if (next.key === L.key) return;
      const last = parseInt(SS.get('pb-reloaded') || '0', 10);
      if (Date.now() - last < 4000) return; // never loop
      SS.set('pb-reloaded', String(Date.now()));
      location.reload();
    }, 500);
  });
})();
