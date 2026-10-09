(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  if (!document.querySelector(".scroll-beam")) {
    const beam = document.createElement("div");
    beam.className = "scroll-beam";
    beam.setAttribute("aria-hidden", "true");
    document.body.append(beam);
  }

  const beam = document.querySelector(".scroll-beam");
  if (beam && !reduce) {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      beam.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length && !reduce) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  const counts = document.querySelectorAll("[data-count]");
  const writeCount = (el) => {
    el.textContent = Number(el.dataset.count).toLocaleString() + (el.dataset.suffix || "");
  };
  if (counts.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      counts.forEach(writeCount);
    } else {
      const countIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const end = Number(el.dataset.count);
            const suffix = el.dataset.suffix || "";
            const start = performance.now();
            const tick = (now) => {
              const t = Math.min(1, (now - start) / 900);
              el.textContent = Math.round(end * (1 - (1 - t) ** 3)).toLocaleString() + suffix;
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            countIo.unobserve(el);
          });
        },
        { threshold: 0.4 }
      );
      counts.forEach((el) => countIo.observe(el));
    }
  }

  document.querySelectorAll(".video-card-media video").forEach((video) => {
    const wrap = video.parentElement;
    if (!wrap || wrap.querySelector(".video-play-hint")) return;
    const hint = document.createElement("span");
    hint.className = "video-play-hint";
    hint.textContent = "Play";
    wrap.append(hint);
    const sync = () => wrap.classList.toggle("is-playing", !video.paused);
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("ended", () => {
      wrap.classList.remove("is-playing");
      try {
        video.currentTime = 0;
      } catch (_) {}
    });
  });

  // Mute preview play on hover for listing-card videos (no controls inside links)
  if (!reduce) {
    document.querySelectorAll(".story-media video, .lead-media video").forEach((video) => {
      const card = video.closest("a");
      if (!card) return;
      const play = () => {
        video.muted = true;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };
      const stop = () => {
        video.pause();
        try {
          video.currentTime = 0;
        } catch (_) {}
      };
      card.addEventListener("mouseenter", play);
      card.addEventListener("mouseleave", stop);
      card.addEventListener("focusin", play);
      card.addEventListener("focusout", stop);
    });
  }

  // Click-to-load YouTube embeds (avoids loading iframes until the user plays)
  document.querySelectorAll("[data-youtube-embed]").forEach((frame) => {
    const trigger = frame.querySelector(".review-video-card");
    if (!trigger) return;
    const activate = () => {
      if (frame.classList.contains("is-playing")) return;
      const id = frame.getAttribute("data-youtube-embed");
      const title = frame.getAttribute("data-youtube-title") || "YouTube video";
      if (!id) return;
      const iframe = document.createElement("iframe");
      iframe.src =
        "https://www.youtube.com/embed/" +
        encodeURIComponent(id) +
        "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
      iframe.title = title;
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      frame.replaceChildren(iframe);
      frame.classList.add("is-playing");
    };
    trigger.addEventListener("click", activate);
    if (trigger.tagName === "A") {
      trigger.addEventListener("click", (event) => event.preventDefault());
    }
  });

  const newsletter = document.createElement("script");
  newsletter.src = "/newsletter.js";
  document.body.append(newsletter);
})();
