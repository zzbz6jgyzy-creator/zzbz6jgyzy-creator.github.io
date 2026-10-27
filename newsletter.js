(() => {
  if (window.__sdNewsletter) return;
  window.__sdNewsletter = 1;
  // Signups go to Beehiiv (Supercharged Daily). No API key or email address in public code.
  // utm_content is an allowlisted topic so Beehiiv can tag / segment the signup.
  const SUBSCRIBE_URL = "https://alexs-newsletter-84b17e.beehiiv.com/";
  const TOPICS = new Set(["roadster", "tesla-software", "spacex", "tesla", "website"]);
  const topicFromPath = () => {
    const path = (location.pathname || "").toLowerCase();
    if (/roadster/.test(path)) return "roadster";
    if (/my-tesla|\/updates|fsd|tcmv|cybercab|robotaxi/.test(path)) return "tesla-software";
    if (/starship|starlink|spacex|falcon|dragon|see-the-launch|\/calendar/.test(path)) return "spacex";
    if (/tesla|\/reviews|buying-guide|\/gear\.html/.test(path)) return "tesla";
    const section = (document.querySelector('meta[property="article:section"]')?.content || "").toLowerCase();
    const tag = (document.querySelector(".art-tag")?.textContent || "").toLowerCase();
    const hay = `${section} ${tag}`;
    if (/roadster/.test(hay)) return "roadster";
    if (/fsd|software|update|cybercab|robotaxi/.test(hay)) return "tesla-software";
    if (/starship|starlink|spacex|falcon|dragon/.test(hay)) return "spacex";
    if (/tesla/.test(hay)) return "tesla";
    return "website";
  };
  const topicOf = (form) => {
    const raw = (form.closest("[data-band-topic]")?.getAttribute("data-band-topic") || "").toLowerCase();
    if (raw === "default") return "website";
    if (TOPICS.has(raw)) return raw;
    return topicFromPath();
  };
  const mediumOf = (form) => {
    const place = (form.closest("[data-newsletter]")?.getAttribute("data-newsletter") || "").toLowerCase();
    if (place === "landing-hero") return "site-newsletter-hero";
    if (place === "landing-footer") return "site-newsletter-footer";
    if (place === "article") return "site-article";
    if (place === "tracker") return "site-tracker";
    if (place === "pop" || form.closest(".sd-pop")) return "site-pop";
    if (place === "band" || form.closest(".sd-band")) return "site-band";
    return "site-form";
  };
  const setStatus = (status, input, text, ok) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-ok", !!ok);
    status.classList.toggle("is-err", !ok);
    if (input) {
      input.setAttribute("aria-invalid", ok ? "false" : "true");
    }
  };
  const bind = (root) => {
    const form = root.querySelector("[data-newsletter-form]");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    const status = root.querySelector("[data-newsletter-status]");
    const input = form.querySelector("input[type=email]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const honey = form.querySelector("input[name='website']");
      if (honey && honey.value) return;
      const email = String(new FormData(form).get("email") || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus(status, input, email ? "Enter a valid email address." : "Add an email address.", false);
        if (input) input.focus();
        return;
      }
      const topic = topicOf(form);
      const url = SUBSCRIBE_URL + "?email=" + encodeURIComponent(email) +
        "&utm_source=website&utm_medium=" + mediumOf(form) +
        "&utm_campaign=" + encodeURIComponent(location.pathname) +
        "&utm_content=" + encodeURIComponent(topic);
      // Beehiiv confirms signup after this redirect. Keep the form available if
      // the visitor returns without completing it; old browser flags prove nothing.
      setStatus(status, input, "Continue on Beehiiv to finish subscribing…", true);
      if (typeof window.sdTrack === "function") window.sdTrack("signup_submit");
      location.href = url;
    });
  };
  document.querySelectorAll("[data-newsletter]").forEach(bind);
  // Bind forms added later by the optional scroll prompt without double binding.
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver((changes) => changes.forEach((change) => change.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.matches("[data-newsletter]")) bind(node);
      node.querySelectorAll("[data-newsletter]").forEach(bind);
      if (node.matches("[data-newsletter-form]")) { const root = node.closest("[data-newsletter]"); if (root) bind(root); }
    })))
      .observe(document.body, { childList: true, subtree: true });
  }
})();
