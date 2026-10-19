(() => {
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
  const bind = (root) => {
    const form = root.querySelector("[data-newsletter-form]");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    const status = root.querySelector("[data-newsletter-status]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const honey = form.querySelector("input[name='website']");
      if (honey && honey.value) return;
      const email = String(new FormData(form).get("email") || "").trim().toLowerCase();
      if (!email) {
        if (status) { status.textContent = "Add an email address."; status.classList.add("is-err"); }
        return;
      }
      const topic = topicOf(form);
      const url = SUBSCRIBE_URL + "?email=" + encodeURIComponent(email) +
        "&utm_source=website&utm_medium=" + (form.closest(".sd-band") ? "site-band" : form.closest(".sd-pop") ? "site-pop" : "site-form") +
        "&utm_campaign=" + encodeURIComponent(location.pathname) +
        "&utm_content=" + encodeURIComponent(topic);
      if (status) { status.textContent = "Taking you to Supercharged Daily…"; status.classList.add("is-ok"); }
      location.href = url;
    });
  };
  document.querySelectorAll("[data-newsletter]").forEach(bind);
})();
