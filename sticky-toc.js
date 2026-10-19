/* Sticky on-page TOC for long hubs (Roadster, etc.).
   Scans main section[id] elements and builds a floating nav that highlights the current section.
   Respects prefers-reduced-motion. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && false) return; // still show, just no smooth

  const main = document.querySelector('main');
  if (!main) return;

  const sections = Array.from(main.querySelectorAll('section[id], header[id], [id].rd-wrap > section, #gallery, #video, #trims, #tech, #money, #timeline, #promise'))
    .filter(el => el.id && el.id !== 'main' && el.id !== 'top');

  // Deduplicate and prefer named ones
  const seen = new Set();
  const unique = sections.filter(el => {
    if (seen.has(el.id)) return false;
    seen.add(el.id);
    return true;
  }).slice(0, 12); // limit length

  if (unique.length < 3) return;

  const toc = document.createElement('nav');
  toc.className = 'sticky-toc';
  toc.setAttribute('aria-label', 'On this page');
  toc.innerHTML = '<button type="button" class="sticky-toc-toggle" aria-expanded="false" aria-controls="sticky-toc-list">On this page</button><ol id="sticky-toc-list" hidden></ol>';

  const list = toc.querySelector('ol');
  unique.forEach(sec => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + sec.id;
    // Prefer aria-label, then h2, then id
    const label = sec.getAttribute('aria-label') ||
                  (sec.querySelector('h2, h1, .rd-kicker') || {}).textContent?.trim() ||
                  sec.id.replace(/-/g, ' ');
    a.textContent = label.replace(/\s+/g, ' ').slice(0, 40);
    li.appendChild(a);
    list.appendChild(li);
  });

  document.body.appendChild(toc);

  const toggle = toc.querySelector('.sticky-toc-toggle');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    list.hidden = open;
  });

  // Highlight current section
  const links = toc.querySelectorAll('a');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('is-current'));
        const match = toc.querySelector(`a[href="#${entry.target.id}"]`);
        if (match) match.classList.add('is-current');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  unique.forEach(sec => observer.observe(sec));

  // Close on link click (mobile)
  list.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      toggle.setAttribute('aria-expanded', 'false');
      list.hidden = true;
    }
  });
})();
