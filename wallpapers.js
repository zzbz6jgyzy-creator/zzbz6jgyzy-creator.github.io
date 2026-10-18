/* Shared photo viewer for wallpapers + Roadster gallery. No libraries. */
(function () {
  var box = document.querySelector("[data-wp-box]");
  if (!box) return;
  var img = box.querySelector("[data-wp-img]");
  var t = box.querySelector("[data-wp-title]");
  var cap = box.querySelector("[data-wp-caption]");
  var ph = box.querySelector("[data-wp-phone]");
  var dk = box.querySelector("[data-wp-desk]");
  var tg = box.querySelector("[data-wp-toggle]");
  var dlSlot = box.querySelector(".wp-dl-slot");
  var prevBtn = box.querySelector("[data-wp-prev]");
  var nextBtn = box.querySelector("[data-wp-next]");
  var cur = null, isPhone = false, list = [], idx = 0;

  function openersIn(from) {
    var root = from && from.closest("[data-wp-gallery]");
    return [].slice.call((root || document).querySelectorAll("[data-wp-open]"));
  }

  function isPreview(el) {
    return !!(el && (el.hasAttribute("data-wp-preview") ||
      (el.closest && el.closest("[data-wp-preview]"))));
  }

  function slugOf(src) {
    return (src || "").split("/").pop().split("?")[0]
      .replace(/-desktop\.jpe?g$/i, "")
      .replace(/-phone\.jpe?g$/i, "")
      .replace(/\.jpe?g$/i, "");
  }

  function previewOf(full, phone) {
    var slug = slugOf(full);
    if (!slug) return "";
    return phone
      ? "/assets/wallpapers/previews/" + slug + "-phone.webp"
      : "/assets/wallpapers/previews/" + slug + ".webp";
  }

  function show() {
    if (!cur) return;
    if (cur.hasAttribute("data-no-desktop")) isPhone = true;
    if (cur.hasAttribute("data-no-phone")) isPhone = false;
    var full = isPhone ? (cur.dataset.phone || cur.dataset.full) : cur.dataset.full;
    var src = previewOf(full, isPhone) || full;
    img.onerror = function () { img.onerror = null; if (full && img.src.indexOf(full) < 0) img.src = full; };
    img.src = src;
    img.alt = (cur.dataset.title || "") + (isPhone ? " (phone)" : " (desktop)");
    if (t) t.textContent = cur.dataset.title || "";
    if (cap) {
      var html = cur.dataset.caption || "";
      if (html) { cap.innerHTML = html; cap.hidden = false; }
      else { cap.textContent = ""; cap.hidden = true; }
    }
    var preview = isPreview(cur);
    if (dlSlot) dlSlot.hidden = preview;
    if (tg) {
      tg.style.display = preview || cur.hasAttribute("data-no-desktop") || cur.hasAttribute("data-no-phone") ? "none" : "";
      tg.textContent = isPhone ? "Show desktop" : "Show phone";
    }
    if (ph) {
      ph.style.display = preview || cur.hasAttribute("data-no-phone") ? "none" : "";
      if (!preview) {
        var slug = (cur.dataset.full || "").split("/").pop().replace(/-desktop\.jpg.*$/, "").replace(/\.jpg.*$/, "");
        ph.href = cur.dataset.phone || "";
        ph.setAttribute("download", "supercharged-" + slug + "-phone.jpg");
      }
    }
    if (dk) {
      dk.style.display = preview || cur.hasAttribute("data-no-desktop") ? "none" : "";
      if (!preview) {
        var slug2 = (cur.dataset.full || "").split("/").pop().replace(/-desktop\.jpg.*$/, "").replace(/\.jpg.*$/, "");
        dk.href = cur.dataset.full || "";
        dk.setAttribute("download", "supercharged-" + slug2 + "-desktop.jpg");
      }
    }
    var multi = list.length > 1;
    if (prevBtn) prevBtn.hidden = !multi;
    if (nextBtn) nextBtn.hidden = !multi;
    box.classList.toggle("wp-has-nav", multi);
    box.classList.toggle("wp-preview", preview);
  }

  function openAt(i) {
    if (!list.length) return;
    idx = ((i % list.length) + list.length) % list.length;
    cur = list[idx];
    isPhone = !(window.matchMedia && matchMedia("(min-width: 900px) and (pointer: fine)").matches);
    if (cur.hasAttribute("data-no-phone")) isPhone = false;
    if (cur.hasAttribute("data-no-desktop")) isPhone = true;
    show();
    if (box.open) return;
    if (box.showModal) box.showModal();
    else box.setAttribute("open", "");
  }

  function close() {
    if (box.close) box.close();
    else box.removeAttribute("open");
    img.removeAttribute("src");
  }

  function step(d) { if (list.length > 1) openAt(idx + d); }

  document.querySelectorAll("[data-wp-open]").forEach(function (b) {
    b.addEventListener("click", function () {
      list = openersIn(b);
      idx = Math.max(0, list.indexOf(b));
      openAt(idx);
    });
  });

  if (tg) tg.addEventListener("click", function () { isPhone = !isPhone; show(); });
  var closeBtn = box.querySelector("[data-wp-close]");
  if (closeBtn) closeBtn.addEventListener("click", close);
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  if (prevBtn) prevBtn.addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function (e) { e.stopPropagation(); step(1); });

  document.addEventListener("keydown", function (e) {
    if (!box.open && !box.hasAttribute("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });

  // Swipe on the dialog image area.
  var sx = null, sy = null;
  box.addEventListener("touchstart", function (e) {
    if (!e.touches || !e.touches[0]) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (sx === null || !e.changedTouches || !e.changedTouches[0]) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  });
})();
