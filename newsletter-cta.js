(() => {
  if (window.__sdNewsletterCta) return;
  window.__sdNewsletterCta = 1;
  const SUB = "/newsletter.html";
  const signupBlock = () => document.getElementById("newsletter") || document.querySelector("[data-newsletter]:not(.sd-pop)");
  const wire = () => {
    let block = signupBlock();
    if (block && block.classList.contains("sd-pop")) block = document.querySelector("[data-newsletter]:not(.sd-pop)");
    if (block) document.querySelectorAll(".sd-band").forEach((b) => { if (b !== block) b.remove(); });
    if (block && !document.getElementById("newsletter")) block.id = "newsletter";
    document.querySelectorAll("a.pn-sub").forEach((a) => { a.href = block ? "#newsletter" : SUB + "?utm_source=website&utm_medium=nav"; });
    const links = document.querySelector(".footer-links");
    if (links && !links.querySelector('a[href="/newsletter.html"]')) {
      const link = document.createElement("a"); link.href = SUB; link.textContent = "Newsletter";
      links.append(document.createTextNode(" · "), link);
    }
  };
  // Navigation creates its buttons after this bundle source runs.
  window.sdWireNewsletterCTA = wire;
  wire();
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a.pn-sub");
    if (!a) return;
    const block = signupBlock();
    if (!block) return;
    e.preventDefault();
    if (window.__pn) window.__pn.sheetOpen(false);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    block.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "center" });
    const input = block.querySelector("input[type=email]");
    if (input) setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 500);
  });
})();
