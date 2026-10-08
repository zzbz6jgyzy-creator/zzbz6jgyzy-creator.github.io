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
})();
