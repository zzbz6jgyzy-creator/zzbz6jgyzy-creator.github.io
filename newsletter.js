(() => {
  // Signups go to Beehiiv (Supercharged Daily). No API key or email address in public code.
  const SUBSCRIBE_URL = "https://alexs-newsletter-84b17e.beehiiv.com/subscribe";
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
      const url = SUBSCRIBE_URL + "?email=" + encodeURIComponent(email) +
        "&utm_source=website&utm_medium=" + encodeURIComponent(location.pathname);
      if (status) { status.textContent = "Opening Supercharged Daily to confirm…"; status.classList.add("is-ok"); }
      window.open(url, "_blank", "noopener") || (location.href = url);
    });
  };
  document.querySelectorAll("[data-newsletter]").forEach(bind);
})();
