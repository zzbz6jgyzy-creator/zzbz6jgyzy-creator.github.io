/* Share buttons (event pages, articles): X intent link is plain HTML; this adds copy-link
   and, where the browser has one, the native share sheet. No third-party scripts. */
(function () {
  "use strict";
  function init(root) {
    root.querySelectorAll("[data-share-copy]").forEach(function (b) {
      if (b.dataset.bound) return; b.dataset.bound = "1";
      var label = b.textContent;
      b.addEventListener("click", function () {
        var url = b.getAttribute("data-url") || location.href;
        var done = function (ok) { b.textContent = ok ? "Link copied" : "Copy failed"; setTimeout(function () { b.textContent = label; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
        else { try { var t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); done(document.execCommand("copy")); t.remove(); } catch (e) { done(false); } }
      });
    });
    root.querySelectorAll("[data-share-native]").forEach(function (b) {
      if (b.dataset.bound || !navigator.share) return; b.dataset.bound = "1"; b.hidden = false;
      b.addEventListener("click", function () {
        navigator.share({ title: b.getAttribute("data-title") || document.title, url: b.getAttribute("data-url") || location.href }).catch(function () {});
      });
    });
  }
  window.SDShare = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(document); }); else init(document);
})();
