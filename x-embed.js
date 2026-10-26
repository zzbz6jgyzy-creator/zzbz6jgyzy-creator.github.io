/* X posts as text first. Each <blockquote class="twitter-tweet"> already holds the post text, author, date and link,
   so it reads fine on its own. The live embed (photos, video, platform.twitter.com) loads only when the reader asks. */
(() => {
  const quotes = document.querySelectorAll("blockquote.twitter-tweet");
  if (!quotes.length) return;
  let loading;
  const loadWidgets = () =>
    loading ||
    (loading = new Promise((resolve, reject) => {
      if (window.twttr && window.twttr.widgets) return resolve(window.twttr);
      const s = document.createElement("script");
      s.src = "https://platform.twitter.com/widgets.js";
      s.async = true;
      s.charset = "utf-8";
      s.onload = () => resolve(window.twttr);
      s.onerror = () => {
        loading = null;
        reject(new Error("widgets.js failed"));
      };
      document.head.appendChild(s);
    }));

  quotes.forEach((quote) => {
    const host = quote.parentElement;
    const link = quote.querySelector("a[href*='/status/']");
    const wrap = document.createElement("p");
    wrap.className = "x-embed-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "x-embed-load";
    btn.textContent = "Load post from X";
    const note = document.createElement("span");
    note.className = "x-embed-note";
    note.setAttribute("role", "status");
    note.textContent = "Photos and video load from X.";
    wrap.append(btn, note);
    quote.insertAdjacentElement("afterend", wrap);

    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "Loading…";
      loadWidgets()
        .then((twttr) => {
          twttr.widgets.load(host);
          const started = Date.now();
          const timer = setInterval(() => {
            if (!quote.isConnected) {
              clearInterval(timer);
              wrap.remove();
            } else if (Date.now() - started > 12000) {
              clearInterval(timer);
              fail();
            }
          }, 300);
        })
        .catch(fail);
    });

    function fail() {
      btn.disabled = false;
      btn.textContent = "Try again";
      note.textContent = "X didn’t load here.";
      if (link && !wrap.querySelector("a")) {
        const a = document.createElement("a");
        a.href = link.href;
        a.rel = "noopener";
        a.target = "_blank";
        a.textContent = "Open it on X";
        wrap.append(" ", a);
      }
    }
  });
})();
