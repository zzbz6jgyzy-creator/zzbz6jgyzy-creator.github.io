(() => {
  const API = "https://aljr-boards.superchargeddaily.workers.dev";
  const GAMES = ["catch", "staging", "robotaxi"];
  const SHOW = 8;
  const cacheKey = (game) => `aljr.board.world.${game}`;

  const state = {
    rows: { catch: [], staging: [], robotaxi: [] },
    status: { catch: "wait", staging: "wait", robotaxi: "wait" },
    listeners: [],
  };

  function readCache(game) {
    try {
      const raw = JSON.parse(localStorage.getItem(cacheKey(game)) || "[]");
      return Array.isArray(raw) ? raw.filter((row) => row && typeof row.score === "number") : [];
    } catch {
      return [];
    }
  }

  function writeCache(game, rows) {
    try {
      localStorage.setItem(cacheKey(game), JSON.stringify(rows.slice(0, 20)));
    } catch {
      /* quota */
    }
  }

  function notify(game) {
    paintStatus();
    paintHub();
    state.listeners.forEach((fn) => {
      try {
        fn(game);
      } catch {
        /* listener */
      }
    });
  }

  function setRows(game, rows, status) {
    state.rows[game] = Array.isArray(rows) ? rows : [];
    state.status[game] = status;
    notify(game);
  }

  function statusLabel(game) {
    const status = state.status[game];
    if (status === "live") return "World · live";
    if (status === "cached") return "World · cached";
    if (status === "wait") return "World · connecting";
    return "This pad only";
  }

  async function load(game) {
    if (!GAMES.includes(game)) return [];
    const cached = readCache(game);
    if (cached.length) setRows(game, cached, "cached");
    try {
      const res = await fetch(`${API}/${game}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      writeCache(game, rows);
      setRows(game, rows, "live");
      return rows;
    } catch {
      if (!cached.length) setRows(game, [], "local");
      return state.rows[game];
    }
  }

  async function loadAll() {
    GAMES.forEach((game) => {
      const cached = readCache(game);
      if (cached.length) setRows(game, cached, "cached");
    });
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      const boards = data.boards || {};
      GAMES.forEach((game) => {
        const rows = Array.isArray(boards[game]) ? boards[game] : [];
        writeCache(game, rows);
        setRows(game, rows, "live");
      });
    } catch {
      GAMES.forEach((game) => {
        if (!state.rows[game].length) setRows(game, [], "local");
      });
    }
    return state.rows;
  }

  async function submit(game, payload) {
    if (!GAMES.includes(game)) return null;
    try {
      const res = await fetch(`${API}/${game}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          score: payload.score,
          flights: payload.flights ?? payload.rides ?? 0,
        }),
      });
      if (res.status === 429) {
        notify(game);
        return { error: "slow down" };
      }
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      writeCache(game, rows);
      setRows(game, rows, "live");
      return data;
    } catch {
      if (state.status[game] === "live") state.status[game] = "cached";
      notify(game);
      return null;
    }
  }

  function rows(game) {
    return (state.rows[game] || []).slice(0, SHOW);
  }

  function fillList(ol, list, emptyCopy) {
    if (!ol) return;
    ol.replaceChildren();
    if (!list.length) {
      const empty = document.createElement("li");
      empty.className = "is-empty";
      empty.textContent = emptyCopy || "No locked runs yet.";
      ol.append(empty);
      return;
    }
    list.forEach((row, i) => {
      const li = document.createElement("li");
      const rank = document.createElement("span");
      rank.className = "world-board-rank";
      rank.textContent = String(i + 1);
      const who = document.createElement("span");
      who.className = "world-board-who";
      who.textContent = row.name || "PILOT";
      const pts = document.createElement("span");
      pts.className = "world-board-pts";
      pts.textContent = Number(row.score || 0).toLocaleString();
      li.append(rank, who, pts);
      ol.append(li);
    });
  }

  function paintStatus() {
    document.querySelectorAll("[data-board-status]").forEach((el) => {
      el.textContent = statusLabel(el.getAttribute("data-board-status"));
    });
  }

  function paintHub() {
    document.querySelectorAll("[data-world-board]").forEach((ol) => {
      const game = ol.getAttribute("data-world-board");
      fillList(ol, rows(game), "No locked runs yet.");
    });
  }

  function onChange(fn) {
    if (typeof fn === "function") state.listeners.push(fn);
  }

  window.AljrBoard = {
    api: API,
    games: GAMES,
    show: SHOW,
    load,
    loadAll,
    submit,
    rows,
    status: (game) => state.status[game] || "local",
    statusLabel,
    onChange,
    paintHub,
    paintStatus,
  };

  paintStatus();
  if (document.querySelector("[data-world-board]")) {
    paintHub();
    loadAll();
  }
})();
