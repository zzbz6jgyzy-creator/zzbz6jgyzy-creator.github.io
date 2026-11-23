/* Supercharged Daily design system: HTML renderers for the shared components in ds.css.
   Pure functions with no Node or DOM APIs and deterministic output, so builders (Node, vm contexts) and pages
   (browser bundles) render identical markup. Callers pass data that already carries its source and as-of date
   (editorial rules: label what a number is). See docs/design-system.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DS = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const TOPICS = { tesla: "Tesla", spacex: "SpaceX", xai: "xAI", x: "X" };
  const STATUS = { disclosed: "Disclosed", reported: "Reported", target: "Target", estimate: "Estimate" };
  const ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ENT[c]);
  const parse = (iso) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };
  /** "21 Nov" in UTC, the same for every reader and every build. */
  const fmtDay = (iso) => {
    const d = parse(iso);
    return d ? d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] : "";
  };
  /** "21 Nov 2026" in UTC. */
  const fmtDate = (iso) => {
    const d = parse(iso);
    return d ? fmtDay(iso) + " " + d.getUTCFullYear() : "";
  };

  /**
   * Responsive picture from an image set on disk ("<base>-<w>w.avif|webp").
   * p: { base, widths: [480, 960, ...], ratio: [w, h] }.
   * o: { alt, sizes, loading, fetchpriority, maxWidth, img (fallback src), width + height (for the fallback img) }.
   */
  function picture(p, o) {
    o = o || {};
    if (!p || !p.base || !Array.isArray(p.widths) || !p.widths.length) {
      const dims = o.width && o.height ? ' width="' + Number(o.width) + '" height="' + Number(o.height) + '"' : "";
      return o.img ? '<img src="' + esc(o.img) + '" alt="' + esc(o.alt || "") + '"' + dims + ' loading="' + (o.loading || "lazy") + '" decoding="async">' : "";
    }
    const widths = p.widths.slice().sort((a, b) => a - b);
    const ws = o.maxWidth ? widths.filter((w) => w <= o.maxWidth) : widths;
    const use = ws.length ? ws : [widths[0]];
    const set = (ext) => use.map((w) => p.base + "-" + w + "w." + ext + " " + w + "w").join(", ");
    const ratio = Array.isArray(p.ratio) && p.ratio.length === 2 ? p.ratio : [16, 9];
    const sizes = o.sizes || "100vw";
    const src = o.img || p.base + "-" + use[0] + "w.webp";
    return (
      '<picture><source type="image/avif" srcset="' + esc(set("avif")) + '" sizes="' + esc(sizes) + '">' +
      '<source type="image/webp" srcset="' + esc(set("webp")) + '" sizes="' + esc(sizes) + '">' +
      '<img src="' + esc(src) + '" alt="' + esc(o.alt || "") + '" width="' + ratio[0] + '" height="' + ratio[1] + '" loading="' + (o.loading || "lazy") + '" decoding="async"' +
      (o.fetchpriority ? ' fetchpriority="' + esc(o.fetchpriority) + '"' : "") + "></picture>"
    );
  }

  /** One story row: topic label, headline, date (or a.meta), optional thumbnail. The headline is the link text, so the thumbnail is decorative. */
  function story(a, o) {
    o = o || {};
    const thumb = o.thumbs !== false && a.picture
      ? '<span class="ds-story-thumb">' + picture(a.picture, { alt: "", sizes: "(min-width:768px) 128px, 72px", maxWidth: 480, loading: "lazy" }) + "</span>"
      : "";
    const meta = a.meta != null ? a.meta : [fmtDay(a.date), a.minutes ? a.minutes + " min read" : ""].filter(Boolean).join(" · ");
    return (
      '<a class="ds-story' + (thumb ? "" : " ds-story--text") + '" href="' + esc(a.url) + '" data-topic="' + esc(a.topic || "") + '">' +
      '<span class="ds-story-text"><span class="ds-story-tag">' + esc(a.tag || TOPICS[a.topic] || "Dispatch") + "</span>" +
      '<span class="ds-story-title">' + esc(a.title) + "</span>" +
      (meta ? '<span class="ds-story-meta">' + esc(meta) + "</span>" : "") + "</span>" + thumb + "</a>"
    );
  }

  /** Ordered list of stories; skips repeats, any URL in o.exclude, and stops at o.limit. */
  function storyList(items, o) {
    o = o || {};
    const seen = new Set(o.exclude || []);
    const out = [];
    for (const a of items || []) {
      if (!a || !a.url || !a.title || seen.has(a.url)) continue;
      seen.add(a.url);
      out.push(a);
      if (o.limit && out.length >= o.limit) break;
    }
    return (
      '<ol class="ds-story-list"' + (o.id ? ' id="' + esc(o.id) + '"' : "") + (o.label ? ' aria-label="' + esc(o.label) + '"' : "") + ">" +
      out.map((a) => "<li>" + story(a, o) + "</li>").join("") + "</ol>"
    );
  }

  /** Key number: s = { label, value, unit, asOf, source: { label, href }, status: disclosed|reported|target|estimate }. */
  function stat(s) {
    const src = s.source && s.source.href
      ? '<a href="' + esc(s.source.href) + '">' + esc(s.source.label || "Source") + "</a>"
      : esc((s.source && s.source.label) || "");
    const line = [s.asOf ? (s.asOfLabel || "As of") + " " + esc(s.asOf) : "", src].filter(Boolean).join(" · ");
    return (
      '<li class="ds-stat"><span class="ds-stat-label">' + esc(s.label) + "</span>" +
      '<span class="ds-stat-value">' + esc(s.value) + "</span>" +
      (s.unit ? '<span class="ds-stat-unit">' + esc(s.unit) + "</span>" : "") +
      (line ? '<span class="ds-stat-src">' + line + "</span>" : "") +
      (s.status ? '<span class="ds-status">' + esc(STATUS[s.status] || s.status) + "</span>" : "") + "</li>"
    );
  }
  function stats(list, o) {
    o = o || {};
    return list && list.length ? '<ul class="ds-stats"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : "") + ">" + list.map(stat).join("") + "</ul>" : "";
  }

  /** Plain section label with an optional link. linkText should make sense on its own ("All stories", not "All"). */
  function sectionHead(o) {
    return (
      '<div class="ds-section-head"><h2' + (o.id ? ' id="' + esc(o.id) + '"' : "") + ">" + esc(o.title) + "</h2>" +
      (o.href ? '<a href="' + esc(o.href) + '">' + esc(o.linkText || "See all") + '<span aria-hidden="true"> →</span></a>' : "") + "</div>"
    );
  }

  /** Slim photo band. b = { picture, img, alt, captionHtml (already escaped, may hold credit links), loading, fetchpriority }. */
  function band(b) {
    if (!b) return "";
    return (
      '<figure class="ds-band">' + picture(b.picture, { alt: b.alt || "", sizes: "(min-width:1228px) 1180px, 100vw", img: b.img, loading: b.loading, fetchpriority: b.fetchpriority }) +
      (b.captionHtml ? "<figcaption>" + b.captionHtml + "</figcaption>" : "") + "</figure>"
    );
  }

  /**
   * Page masthead with a bare <h1> (tests count /<h1>/). o = { kicker, title, titleId, small, dek, metaHtml (escaped),
   * statsList | statsHtml, band, extraHtml, id, className }.
   */
  function masthead(o) {
    return (
      '<header class="ds-masthead' + (o.small ? " ds-masthead--small" : "") + (o.className ? " " + esc(o.className) : "") + '"' + (o.id ? ' id="' + esc(o.id) + '"' : "") + ">" +
      (o.kicker ? '<p class="ds-kicker">' + esc(o.kicker) + "</p>" : "") +
      "<h1" + (o.titleId ? ' id="' + esc(o.titleId) + '"' : "") + ">" + esc(o.title) + "</h1>" +
      (o.dek ? '<p class="ds-dek">' + esc(o.dek) + "</p>" : "") +
      (o.metaHtml ? '<p class="ds-meta">' + o.metaHtml + "</p>" : "") +
      (o.statsHtml || "") + (o.statsList ? stats(o.statsList) : "") + band(o.band) + (o.extraHtml || "") + "</header>"
    );
  }

  const note = (html) => '<p class="ds-note">' + html + "</p>";
  const previewFlag = (liveUrl) => '<p class="ds-preview-flag" role="note">Preview of the new design. Readers still see the <a href="' + esc(liveUrl) + '">current page</a>.</p>';

  return { esc, fmtDay, fmtDate, picture, story, storyList, stat, stats, sectionHead, band, masthead, note, previewFlag, TOPICS, STATUS };
});
