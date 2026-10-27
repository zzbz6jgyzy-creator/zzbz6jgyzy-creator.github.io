(() => {
  // Refresh public issue links from the same allowlisted metadata used by the site.
  // Static links remain useful when JSON is unavailable; no email or account state
  // is read or persisted by this page.
  fetch('/data/newsletter-latest.json', { credentials: 'omit' })
    .then((r) => { if (!r.ok) throw new Error('issue unavailable'); return r.json(); })
    .then((data) => {
      if (!data || typeof data.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug) || data.slug.length > 180) return;
      document.querySelectorAll('.ns-page a.sd-latest').forEach((link) => {
        const url = new URL(link.href);
        if (url.origin !== 'https://alexs-newsletter-84b17e.beehiiv.com') return;
        url.pathname = '/p/' + data.slug; link.href = url.href;
      });
    }).catch(() => {});
})();
