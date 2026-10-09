(() => {
  const ENDPOINT = "https://formsubmit.co/ajax/alexrickard86@gmail.com";
  const STORAGE_KEY = "aljr-newsletter";
  const BANNER_HTML = `
    <div>
      <p class="eyebrow">Newsletter</p>
      <h2 id="newsletter-heading">Tesla, SpaceX and Grok in the inbox</h2>
      <p>Headlines and notes from the desk. Independent, not affiliated. No spam.</p>
    </div>
    <form class="newsletter-form" data-newsletter-form>
      <label class="visually-hidden" for="newsletter-email">Email</label>
      <input id="newsletter-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com" />
      <input class="newsletter-honey" type="text" name="website" tabindex="-1" autocomplete="off" />
      <button class="button button-primary" type="submit">Subscribe</button>
    </form>
    <p class="newsletter-status" data-newsletter-status role="status"></p>
  `;
  const FOOTER_HTML = `
    <div>
      <p class="eyebrow">Newsletter</p>
      <h2>Get the desk by email</h2>
      <p>Tesla, SpaceX and Grok from @AlJR86.</p>
    </div>
    <form class="newsletter-form" data-newsletter-form>
      <label class="visually-hidden" for="newsletter-email-footer">Email</label>
      <input id="newsletter-email-footer" name="email" type="email" required autocomplete="email" placeholder="you@email.com" />
      <input class="newsletter-honey" type="text" name="website" tabindex="-1" autocomplete="off" />
      <button class="button button-primary" type="submit">Subscribe</button>
    </form>
    <p class="newsletter-status" data-newsletter-status role="status"></p>
  `;

  const already = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (_) {
      return false;
    }
  };

  const remember = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch (_) {}
  };

  const setStatus = (root, text, kind) => {
    const status = root.querySelector("[data-newsletter-status]");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-ok", kind === "ok");
    status.classList.toggle("is-err", kind === "err");
  };

  const lock = (form, done) => {
    form.querySelectorAll("input, button").forEach((el) => {
      el.disabled = done;
    });
    const button = form.querySelector("button[type='submit']");
    if (button && done) button.textContent = "Subscribed";
  };

  const subscribe = async (email, source) => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        source,
        _subject: "Newsletter signup — @AlJR86",
        _template: "box",
        _captcha: "false",
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && String(data.success) !== "false";
    if (!ok) throw new Error(data.message || "Subscribe failed");
  };

  const bind = (root) => {
    const form = root.querySelector("[data-newsletter-form]");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";

    if (already()) {
      lock(form, true);
      setStatus(root, "You're on the list.", "ok");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const honey = form.querySelector(".newsletter-honey");
      if (honey && honey.value) {
        remember();
        lock(form, true);
        setStatus(root, "You're on the list.", "ok");
        return;
      }
      const email = String(new FormData(form).get("email") || "")
        .trim()
        .toLowerCase();
      if (!email) {
        setStatus(root, "Add an email address.", "err");
        return;
      }
      const button = form.querySelector("button[type='submit']");
      const prior = button ? button.textContent : "";
      if (button) {
        button.disabled = true;
        button.textContent = "Sending…";
      }
      setStatus(root, "Sending…", "");
      try {
        await subscribe(email, location.pathname);
        remember();
        lock(form, true);
        setStatus(root, "You're in. Watch for a note from the desk.", "ok");
      } catch (_) {
        if (button) {
          button.disabled = false;
          button.textContent = prior || "Subscribe";
        }
        setStatus(root, "Could not subscribe. Try again in a moment.", "err");
      }
    });
  };

  document.querySelectorAll("[data-newsletter]").forEach((root) => {
    if (!root.querySelector("[data-newsletter-form]")) {
      root.innerHTML = BANNER_HTML;
    }
    const email = root.querySelector("input[type='email']");
    if (email && !email.id) email.id = "newsletter-email";
    bind(root);
  });

  if (!document.querySelector("[data-newsletter]") && document.querySelector(".site-footer")) {
    const wrap = document.createElement("section");
    wrap.className = "section newsletter-strip";
    wrap.setAttribute("aria-label", "Newsletter");
    wrap.innerHTML = `<div class="newsletter newsletter-compact reveal is-visible">${FOOTER_HTML}</div>`;
    document.querySelector(".site-footer").before(wrap);
    bind(wrap);
  }
})();
