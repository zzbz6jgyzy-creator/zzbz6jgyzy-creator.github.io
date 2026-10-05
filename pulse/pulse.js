(() => {
  const REPO = "zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io";
  const API = `https://api.github.com/repos/${REPO}`;

  const commitCountEl = document.getElementById("commit-count");
  const issueCountEl = document.getElementById("issue-count");
  const bpmEl = document.getElementById("bpm");
  const lastMutEl = document.getElementById("last-mut");
  const commitList = document.getElementById("commit-list");
  const issueList = document.getElementById("issue-list");
  const issuesEmpty = document.getElementById("issues-empty");
  const ghostsEl = document.getElementById("ghosts");
  const shockBtn = document.getElementById("shock");
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");

  const ghosts = [
    {
      tag: "Deleted",
      title: "Beast game",
      blurb: "A full browser game that lived at /beast-game/ until the repo ate it.",
      href: "https://github.com/zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io/tree/fd5184eb742a77f3bd16d83b9a6030548739b4de/beast-game",
      alive: false,
    },
    {
      tag: "Deleted",
      title: "Irish EV Tariff Watch",
      blurb: "Tariff calculator multi-page tool. Fossilized in commits #1 and #2.",
      href: "https://github.com/zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io/tree/c2806d9adabf477d262c02b9b714dded1954e29f/ev-tariff-watch",
      alive: false,
    },
    {
      tag: "Still twitching",
      title: "Tesla OAuth callback",
      blurb: "Weird leftover organ at /callback.html + a public-key well-known path.",
      href: "../callback.html",
      alive: true,
    },
    {
      tag: "Alive now",
      title: "SkipThisTech",
      blurb: "Hot takes. Better buys. The current skin of the organism.",
      href: "../index.html",
      alive: true,
    },
  ];

  ghostsEl.innerHTML = ghosts
    .map(
      (g) => `
      <a class="ghost ${g.alive ? "alive" : ""}" href="${g.href}" ${
        g.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""
      }>
        <span class="ghost-tag">${g.tag}</span>
        <h3>${g.title}</h3>
        <p>${g.blurb}</p>
      </a>`
    )
    .join("");

  const cells = [];
  let shock = 0;
  let bpm = 60;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedCells(commits) {
    cells.length = 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    commits.forEach((c, i) => {
      const angle = (i / Math.max(commits.length, 1)) * Math.PI * 2;
      const radius = 90 + (i % 7) * 28;
      cells.push({
        x: w * 0.62 + Math.cos(angle) * radius,
        y: h * 0.38 + Math.sin(angle) * radius * 0.72,
        vx: Math.cos(angle) * 0.15,
        vy: Math.sin(angle) * 0.15,
        r: 3 + (c.sha.charCodeAt(0) % 5),
        shade: i % 3 === 0 ? "#ff5a36" : i % 3 === 1 ? "#b8f000" : "#3de0c5",
        phase: Math.random() * Math.PI * 2,
        label: c.sha.slice(0, 7),
      });
    });
  }

  function draw(ts) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const pulse = 0.55 + Math.sin(ts / (60000 / Math.max(bpm, 30))) * 0.45;
    const cx = w * 0.62;
    const cy = h * 0.38;

    ctx.beginPath();
    ctx.arc(cx, cy, 54 + pulse * 18 + shock * 30, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(184, 240, 0, ${0.15 + pulse * 0.25})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 18 + pulse * 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 90, 54, ${0.35 + pulse * 0.35})`;
    ctx.fill();

    for (let i = 0; i < cells.length; i++) {
      const a = cells[i];
      for (let j = i + 1; j < cells.length; j++) {
        const b = cells[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(61, 224, 197, ${0.18 * (1 - dist / 130)})`;
          ctx.stroke();
        }
      }
    }

    cells.forEach((cell) => {
      if (!reducedMotion) {
        cell.x += cell.vx + Math.cos(cell.phase + ts / 900) * 0.12;
        cell.y += cell.vy + Math.sin(cell.phase + ts / 1100) * 0.12;
        cell.x += (cx - cell.x) * 0.0008;
        cell.y += (cy - cell.y) * 0.0008;
        if (cell.x < 40 || cell.x > w - 40) cell.vx *= -1;
        if (cell.y < 40 || cell.y > h - 40) cell.vy *= -1;
      }

      const wobble = reducedMotion ? 0 : Math.sin(ts / 350 + cell.phase) * 1.5;
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, cell.r + wobble + shock * 4, 0, Math.PI * 2);
      ctx.fillStyle = cell.shade;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    shock = Math.max(0, shock - 0.03);
    requestAnimationFrame(draw);
  }

  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  function computeBpm(commits) {
    if (commits.length < 2) return 48;
    const newest = new Date(commits[0].commit.author.date).getTime();
    const oldest = new Date(commits[commits.length - 1].commit.author.date).getTime();
    const hours = Math.max((newest - oldest) / 3600000, 1);
    const rate = commits.length / hours;
    return Math.round(Math.min(180, Math.max(36, 40 + rate * 25)));
  }

  async function load() {
    try {
      const [commitsRes, issuesRes, repoRes] = await Promise.all([
        fetch(`${API}/commits?per_page=30`),
        fetch(`${API}/issues?state=all&per_page=10`),
        fetch(API),
      ]);

      if (!commitsRes.ok) throw new Error(`commits ${commitsRes.status}`);
      const commits = await commitsRes.json();
      const issues = issuesRes.ok ? await issuesRes.json() : [];
      const repo = repoRes.ok ? await repoRes.json() : {};
      const openCount = typeof repo.open_issues_count === "number" ? repo.open_issues_count : 0;

      commitCountEl.textContent = String(commits.length);
      issueCountEl.textContent = String(openCount);
      bpm = computeBpm(commits);
      bpmEl.textContent = String(bpm);

      if (commits[0]) {
        lastMutEl.textContent = relativeTime(commits[0].commit.author.date);
        lastMutEl.title = commits[0].commit.message.split("\n")[0];
      }

      commitList.innerHTML = commits
        .slice(0, 18)
        .map((c) => {
          const msg = c.commit.message.split("\n")[0].replace(/</g, "&lt;");
          return `<li>
            <span class="commit-sha">${c.sha.slice(0, 7)}</span>
            <a class="commit-msg" href="${c.html_url}" target="_blank" rel="noopener">${msg}</a>
            <span class="commit-when">${relativeTime(c.commit.author.date)}</span>
          </li>`;
        })
        .join("");

      const onlyIssues = issues.filter((i) => !i.pull_request);
      if (!onlyIssues.length) {
        issuesEmpty.hidden = false;
        issueList.innerHTML = "";
      } else {
        issuesEmpty.hidden = true;
        issueList.innerHTML = onlyIssues
          .map(
            (i) => `<li>
              <a href="${i.html_url}" target="_blank" rel="noopener">
                <span>#${i.number} ${i.title.replace(/</g, "&lt;")}</span>
                <span>${i.state}</span>
              </a>
            </li>`
          )
          .join("");
      }

      seedCells(commits);
    } catch (err) {
      commitCountEl.textContent = "?";
      issueCountEl.textContent = "?";
      bpmEl.textContent = "42";
      lastMutEl.textContent = "offline";
      commitList.innerHTML = `<li><span class="commit-sha">error</span><span class="commit-msg">${String(
        err.message || err
      )}</span><span class="commit-when">now</span></li>`;
      seedCells([
        { sha: "abcdef0" },
        { sha: "1234567" },
        { sha: "deadbee" },
        { sha: "cafebabe" },
        { sha: "pulsex01" },
      ]);
    }
  }

  shockBtn.addEventListener("click", () => {
    shock = 1;
    document.body.classList.add("is-shocked");
    cells.forEach((c) => {
      c.vx += (Math.random() - 0.5) * 3;
      c.vy += (Math.random() - 0.5) * 3;
    });
    window.setTimeout(() => document.body.classList.remove("is-shocked"), 650);
  });

  window.addEventListener("resize", () => {
    resize();
  });

  resize();
  requestAnimationFrame(draw);
  load();
})();
