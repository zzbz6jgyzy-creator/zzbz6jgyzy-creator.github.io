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

  mountChrome();
  bootPage();
  observeReveals();
  if (!reduce) {
    paintSky();
    parallaxHero();
    tiltCards();
    magneticButtons();
    pointerGlow();
    countUps();
    scrollBeam();
    launchStreaks();
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    document.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = formatCount(el.dataset.count, el.dataset.suffix);
    });
  }

  function mountChrome() {
    if (!document.getElementById("sky")) {
      const sky = document.createElement("canvas");
      sky.id = "sky";
      sky.setAttribute("aria-hidden", "true");
      document.body.prepend(sky);
    }
    if (!document.querySelector(".scroll-beam")) {
      const beam = document.createElement("div");
      beam.className = "scroll-beam";
      beam.setAttribute("aria-hidden", "true");
      document.body.append(beam);
    }
    if (!document.querySelector(".pointer-glow")) {
      const glow = document.createElement("div");
      glow.className = "pointer-glow";
      glow.setAttribute("aria-hidden", "true");
      document.body.append(glow);
    }
    const path = location.pathname;
    if (path.includes("tesla")) document.body.dataset.desk = "tesla";
    else if (path.includes("spacex") || path.includes("stargaze") || path.includes("ship") || path.includes("dragon") || path.includes("starlink")) {
      document.body.dataset.desk = "spacex";
    } else if (path.includes("grok")) document.body.dataset.desk = "grok";
    else document.body.dataset.desk = "home";
  }

  function bootPage() {
    requestAnimationFrame(() => document.body.classList.add("is-booted"));
  }

  function observeReveals() {
    const reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-visible"));
      return;
    }
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
  }

  function formatCount(value, suffix) {
    const n = Number(value);
    if (Number.isNaN(n)) return value;
    return n.toLocaleString() + (suffix || "");
  }

  function countUps() {
    const nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length || !("IntersectionObserver" in window)) {
      nodes.forEach((el) => {
        el.textContent = formatCount(el.dataset.count, el.dataset.suffix);
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    nodes.forEach((el) => io.observe(el));
  }

  function animateCount(el) {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(end * eased).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function paintSky() {
    const canvas = document.getElementById("sky");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    let stars = [];
    let links = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth * devicePixelRatio;
      h = canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const count = Math.min(140, Math.floor((window.innerWidth * window.innerHeight) / 14000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.2 + 0.3) * devicePixelRatio,
        s: Math.random() * 0.4 + 0.1,
        p: Math.random() * Math.PI * 2,
      }));
      links = stars.slice(0, Math.floor(count / 5));
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, w, h);
      stars.forEach((star) => {
        const twinkle = 0.35 + Math.sin(time * 0.001 * star.s + star.p) * 0.35;
        ctx.beginPath();
        ctx.fillStyle = `rgba(239, 236, 230, ${twinkle})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
        star.x += star.s * 0.12;
        if (star.x > w) star.x = 0;
      });
      ctx.strokeStyle = "rgba(110, 182, 255, 0.08)";
      ctx.lineWidth = 0.6 * devicePixelRatio;
      for (let i = 0; i < links.length; i += 1) {
        const a = links[i];
        const b = links[(i + 3) % links.length];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    });
  }

  function parallaxHero() {
    const plate = document.querySelector(".hero-plate");
    if (!plate) return;
    const onScroll = () => {
      const y = Math.min(window.scrollY, 480);
      plate.style.transform = `scale(1.08) translate3d(0, ${y * 0.22}px, 0)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function tiltCards() {
    const cards = document.querySelectorAll(".desk, .story-card, .lead-card");
    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        card.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-4px)`;
        card.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
        card.style.setProperty("--my", `${(y + 0.5) * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  function magneticButtons() {
    document.querySelectorAll(".button").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const box = button.getBoundingClientRect();
        const x = event.clientX - box.left - box.width / 2;
        const y = event.clientY - box.top - box.height / 2;
        button.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
      });
      button.addEventListener("pointerleave", () => {
        button.style.transform = "";
      });
    });
  }

  function pointerGlow() {
    const glow = document.querySelector(".pointer-glow");
    if (!glow) return;
    window.addEventListener(
      "pointermove",
      (event) => {
        glow.style.left = `${event.clientX}px`;
        glow.style.top = `${event.clientY}px`;
        glow.classList.add("is-on");
      },
      { passive: true }
    );
  }

  function scrollBeam() {
    const beam = document.querySelector(".scroll-beam");
    if (!beam) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      beam.style.transform = `scaleX(${p})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function launchStreaks() {
    const fire = () => {
      const streak = document.createElement("span");
      streak.className = "launch-streak";
      streak.style.left = `${8 + Math.random() * 84}vw`;
      streak.style.animationDuration = `${1.6 + Math.random()}s`;
      document.body.append(streak);
      setTimeout(() => streak.remove(), 2800);
    };
    fire();
    setInterval(fire, 4200);
  }
})();
