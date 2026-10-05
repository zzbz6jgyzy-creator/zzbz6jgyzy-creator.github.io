/* SkipThisTech affiliate engine.
 * MONEY STEP 1: replace AMAZON_TAG with your Amazon Associates tag (e.g. "skipthis-20").
 * Until then, links still open Amazon search — you just won't get credit.
 */
window.SkipAffiliates = (() => {
  const AMAZON_TAG = ""; // ← PASTE YOUR TAG HERE
  const AMAZON_HOST = "https://www.amazon.com";

  const storageKey = "st_aff_clicks";

  function searchUrl(query) {
    const params = new URLSearchParams({ k: query });
    if (AMAZON_TAG.trim()) params.set("tag", AMAZON_TAG.trim());
    return `${AMAZON_HOST}/s?${params.toString()}`;
  }

  function productUrl(asin) {
    if (!asin) return AMAZON_HOST;
    const base = `${AMAZON_HOST}/dp/${asin}`;
    if (!AMAZON_TAG.trim()) return base;
    return `${base}?tag=${encodeURIComponent(AMAZON_TAG.trim())}`;
  }

  function recordClick(label) {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
      raw.total = (raw.total || 0) + 1;
      raw.byLabel = raw.byLabel || {};
      raw.byLabel[label] = (raw.byLabel[label] || 0) + 1;
      raw.last = { label, at: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify(raw));
      window.dispatchEvent(new CustomEvent("st:aff-click", { detail: raw }));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function stats() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (_) {
      return {};
    }
  }

  function wire(root = document) {
    root.querySelectorAll("[data-aff-query], [data-aff-asin]").forEach((el) => {
      const asin = el.getAttribute("data-aff-asin");
      const query = el.getAttribute("data-aff-query") || el.textContent.trim();
      const href = asin ? productUrl(asin) : searchUrl(query);
      if (el.tagName === "A") el.setAttribute("href", href);
      el.setAttribute("rel", "nofollow sponsored noopener");
      el.setAttribute("target", "_blank");
      el.addEventListener("click", () => recordClick(query || asin || "unknown"));
    });

    const tagStatus = root.querySelectorAll("[data-aff-tag-status]");
    tagStatus.forEach((el) => {
      el.textContent = AMAZON_TAG.trim()
        ? `Tag live: ${AMAZON_TAG.trim()}`
        : "Tag missing — paste AMAZON_TAG in affiliates.js to get paid";
      el.classList.toggle("is-live", Boolean(AMAZON_TAG.trim()));
      el.classList.toggle("is-missing", !AMAZON_TAG.trim());
    });

    const clickEls = root.querySelectorAll("[data-aff-clicks]");
    const syncClicks = () => {
      const s = stats();
      clickEls.forEach((el) => {
        el.textContent = String(s.total || 0);
      });
    };
    syncClicks();
    window.addEventListener("st:aff-click", syncClicks);
  }

  return { searchUrl, productUrl, recordClick, stats, wire, AMAZON_TAG };
})();

document.addEventListener("DOMContentLoaded", () => {
  if (window.SkipAffiliates) window.SkipAffiliates.wire();
});
