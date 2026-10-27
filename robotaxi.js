(() => {
  const root = document.querySelector("[data-taxi]");
  if (!root) return;

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const CAR_PRICE = 2400;
  const OVERNIGHT = 48;
  const FAST = 95;
  const START_CASH = 4800;
  const START_CARS = 5;
  const START_REP = 72;
  const MAX_CARS = 12;
  const REPAIR = 320;
  const GAME = "robotaxi";
  const BOARD_MAX = 8;
  const STORE = "sd.arcade.robotaxi.best.v2";
  const BOARD_STORE = "sd.arcade.robotaxi.runs.v2";
  const NAME_STORE = "aljr.taxi.name";
  const SHARE_URL = "https://superchargeddaily.com/robotaxi.html";

  const ZONES = [
    { id: "downtown", name: "Downtown", fare: 16, base: 22, art: [18, 28, 22, 32, 16] },
    { id: "airport", name: "Airport", fare: 22, base: 16, art: [8, 10, 14, 10, 8] },
    { id: "stadium", name: "Stadium", fare: 18, base: 6, art: [10, 20, 26, 20, 10] },
    { id: "hills", name: "The Hills", fare: 14, base: 12, art: [12, 18, 14, 22, 16] },
  ];

  const hudDay = root.querySelector("[data-hud-day]");
  const hudCash = root.querySelector("[data-hud-cash]");
  const hudFleet = root.querySelector("[data-hud-fleet]");
  const hudRep = root.querySelector("[data-hud-rep]");
  const weekEl = root.querySelector("[data-taxi-week]");
  const forecastEl = root.querySelector("[data-taxi-forecast]");
  const mapEl = root.querySelector("[data-taxi-map]");
  const fleetEl = root.querySelector("[data-taxi-fleet]");
  const idleEl = root.querySelector("[data-taxi-idle]");
  const actionsEl = root.querySelector("[data-taxi-actions]");
  const logEl = root.querySelector("[data-taxi-log]");
  const overlay = root.querySelector("[data-taxi-overlay]");
  const overlayKicker = root.querySelector("[data-overlay-kicker]");
  const overlayTitle = root.querySelector("[data-overlay-title]");
  const overlayCopy = root.querySelector("[data-overlay-copy]");
  const playBtn = root.querySelector("[data-taxi-play]");
  const heroPlay = root.querySelector("[data-taxi-hero-play]");
  const shareBtn = root.querySelector("[data-taxi-share]");
  const bestEl = root.querySelector("[data-taxi-best]");
  const boardList = root.querySelector("[data-board-list]");
  const boardNow = root.querySelector("[data-board-now]");
  const nameInput = root.querySelector("[data-taxi-name]");
  const muteBtn = root.querySelector("[data-taxi-mute]");

  const money = (n) =>
    `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);

  let state = "attract";
  let game = null;
  let selected = new Set();
  let best = Number(window.SDArcade.storage.getItem(STORE) || 0);
  let muted = true;
  let audio = null;
  let tickTimer = 0;
  let freshId = "";
  const M=window.SDArcadeModel;
  let weekRandom=()=>.5;
  let forceNew=false;
  const RESUME='sd-arcade-taxi-resume-v2';
  function powerCost(){return game?.upgrades?.depot?32:OVERNIGHT;}
  function resumeKey(){return RESUME+':'+arcade.mode+(arcade.mode==='daily'?':'+arcade.day:'');}
  function getResume(){try{return M.taxiResume(JSON.parse(window.SDArcade.storage.getItem(resumeKey())||'null'));}catch{return null;}}
  function saveResume(){if(!game||!['deploy','night'].includes(state))return;window.SDArcade.storage.setItem(resumeKey(),JSON.stringify({state,mode:arcade.mode,day:arcade.day,game}));}


  function callsign() {
    const raw = (nameInput?.value || window.SDArcade.storage.getItem(NAME_STORE) || "Boss").trim();
    return (raw || "Boss").slice(0, 12).toUpperCase();
  }

  function loadBoard() {
    try {
      const rows = JSON.parse(window.SDArcade.storage.getItem(BOARD_STORE) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  function saveBoard(rows) {
    window.SDArcade.storage.setItem(BOARD_STORE, JSON.stringify(rows.slice(0, BOARD_MAX)));
  }

  function storedRows() {
    const local = loadBoard();
    const world = window.AljrBoard?.rows?.(GAME) || [];
    if (!world.length) return local;
    const seen = new Set(world.map((row) => `${String(row.name || "").toUpperCase()}|${row.score}`));
    const extra = local.filter((row) => !seen.has(`${String(row.name || "").toUpperCase()}|${row.score}`));
    return [...world, ...extra]
      .sort((a, b) => b.score - a.score || (a.at || 0) - (b.at || 0))
      .slice(0, BOARD_MAX);
  }

  function renderBoard(highlight) {
    const rows = storedRows();
    if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;
    if (!boardList) return;
    boardList.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "is-empty";
      empty.textContent = "No weeks locked yet.";
      boardList.append(empty);
      return;
    }
    rows.forEach((row, i) => {
      const li = document.createElement("li");
      if (row.id === highlight) li.classList.add("is-fresh");
      const rank = document.createElement("span");
      rank.className = "taxi-board-rank";
      rank.textContent = String(i + 1);
      const who = document.createElement("span");
      who.className = "taxi-board-who";
      who.textContent = row.name;
      const pts = document.createElement("span");
      pts.textContent = Number(row.score || 0).toLocaleString();
      li.append(rank, who, pts);
      boardList.append(li);
    });
  }

  function makeCar(id, charge = 100) {
    return { id, charge, zone: null, fast: false, night: false, broken: false };
  }

  function planWeek() {
    const days = DAY_NAMES.map((name, i) => ({
      name,
      weekday: i < 5,
      rain: weekRandom() < (i === 3 ? 0.48 : 0.2),
      concert: false,
      airportDelay: false,
    }));
    if (weekRandom() < 0.78) days[2].concert = true;
    if (weekRandom() < 0.52) days[5].concert = true;
    if (weekRandom() < 0.22) days[4].concert = true;
    if (!days.some((d) => d.concert)) days[5].concert = true;
    days.forEach((d) => {
      if (d.rain && weekRandom() < 0.55) d.airportDelay = true;
    });
    if(arcade.mode==='training')days.forEach(d=>{d.rain=false;d.airportDelay=false;});
    return days;
  }

  function today() {
    return game.days[game.day];
  }

  function demandFor(zone, day) {
    let d = zone.base;
    if (day.weekday && zone.id === "downtown") d += 18;
    if (day.weekday && zone.id === "hills") d += 8;
    if (!day.weekday && zone.id === "downtown") d -= 8;
    if (!day.weekday && zone.id === "airport") d += 10;
    if (!day.weekday && zone.id === "hills") d += 9;
    if (day.concert && zone.id === "stadium") d += 42;
    if (day.airportDelay && zone.id === "airport") d += 12;
    if (day.rain) d = Math.round(d * 1.22);
    if(arcade.mode==='training')d*=.72;
    d*=game.pricing==='value'?1.2:game.pricing==='premium'?.8:1;
    return Math.max(5, Math.round(d));
  }

  function heatLabel(demand) {
    if (demand >= 40) return "Packed";
    if (demand >= 26) return "Busy";
    if (demand >= 14) return "Steady";
    return "Quiet";
  }

  function fareFor(zone, day, rep) {
    let p = zone.fare;
    if (day.rain) p += 4;
    if (day.concert && zone.id === "stadium") p += 3;
    if (rep >= 82) p = Math.round(p * 1.08);
    if (rep < 42) p = Math.round(p * 0.9);
    return Math.round(p*(game.pricing==='value'?.85:game.pricing==='premium'?1.25:1));
  }

  function capacity(car, rain) {
    if (car.broken || car.charge < 18) return 0;
    let n = car.charge >= 70 ? 9 : car.charge >= 40 ? 6 : 4;
    if (rain) n = Math.max(3, Math.round(n * 0.72));
    return n+(game?.upgrades?.routing?2:0);
  }

  function workingCars() {
    return game.cars.filter((c) => !c.broken && c.charge >= 18);
  }

  function idleCars() {
    return workingCars().filter((c) => !c.zone);
  }

  function zoneCars(id) {
    return game.cars.filter((c) => c.zone === id && !c.broken);
  }

  function scoreOf(g) {
    return (
      Math.round(Math.max(0, g.cash) * 0.45) +
      g.cars.length * 1600 +
      g.rides * 8 +
      Math.round(g.reputation) * 40 -
      g.missed * 4
    );
  }

  function forecastCopy(day) {
    const bits = [];
    if (day.weekday) bits.push("Rush hour downtown");
    else bits.push("Weekend traffic");
    if (day.rain) bits.push("rain all day");
    if (day.concert) bits.push("concert at the Stadium");
    if (day.airportDelay) bits.push("airport delays");
    const text = bits.join(", ");
    return text.charAt(0).toUpperCase() + text.slice(1) + ".";
  }

  function beep(freq, dur, type = "square", gain = 0.04) {
    if (muted || !audio) return;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.connect(g);
    g.connect(audio.master);
    osc.start();
    osc.stop(audio.currentTime + dur);
  }

  function ensureAudio() {
    if (audio) {
      if (audio.state === "suspended") audio.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
    const master = audio.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(audio.destination);
    audio.master = master;
  }

  function applyMute() {
    if (audio?.master) audio.master.gain.setTargetAtTime(muted ? 0 : 0.7, audio.currentTime, 0.04);
    if (muteBtn) {
      muteBtn.textContent = muted ? "Sound off" : "Sound on";
      muteBtn.classList.toggle("is-off", muted);
    }
  }

  function setNow(text) {
    if (boardNow) boardNow.textContent = text;
  }

  function showOverlay(kicker, title, copy, playLabel, shareHref) {
    const report=root.querySelector('[data-taxi-report]');if(report)report.hidden=state!=='end';
    if (overlayKicker) overlayKicker.textContent = kicker;
    if (overlayTitle) overlayTitle.textContent = title;
    if (overlayCopy) overlayCopy.textContent = copy;
    if (playBtn) playBtn.textContent = playLabel || "Play";
    if (heroPlay) {
      heroPlay.hidden = false;
      heroPlay.textContent = playLabel || "Play";
    }
    if (shareBtn) {
      if (shareHref) {
        shareBtn.hidden = false;
        shareBtn.href = shareHref;
      } else {
        shareBtn.hidden = true;
      }
    }
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
    if (shareBtn) shareBtn.hidden = true;
    if (heroPlay) heroPlay.hidden = true;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderHud() {
    if (!game) return;
    const day = today();
    if (hudDay) hudDay.textContent = `Day ${game.day + 1} · ${day.name}`;
    if (hudCash) hudCash.textContent = money(game.cash);
    if (hudFleet) hudFleet.textContent = `${game.cars.length} cabs`;
    if (hudRep) hudRep.textContent = `Rep ${Math.round(game.reputation)}`;
    if (weekEl) {
      weekEl.replaceChildren();
      game.days.forEach((d, i) => {
        const item = el("li", "", d.name);
        if (i === game.day) item.classList.add("is-now");
        if (i < game.day) item.classList.add("is-done");
        weekEl.append(item);
      });
    }
    if (forecastEl) {
      if (state === "night") forecastEl.textContent = "Night. Cheap power if you garage a cab.";
      else if (state === "resolve") forecastEl.textContent = "The city is moving.";
      else forecastEl.textContent = forecastCopy(day);
    }
  }

  function renderMap() {
    if (!mapEl || !game) return;
    const day = today();
    const canAssign = state === "deploy";
    mapEl.replaceChildren();
    ZONES.forEach((zone) => {
      const demand = demandFor(zone, day);
      const assigned = zoneCars(zone.id);
      const card = el("div", `taxi-zone taxi-zone-${zone.id}`);
      if (day.rain) card.classList.add("is-rain");
      if (day.concert && zone.id === "stadium") card.classList.add("is-hot");
      if (state === "resolve" && assigned.length) card.classList.add("is-live");
      card.setAttribute("role", "listitem");

      const media = el("div", "taxi-zone-media");
      const bg = document.createElement("img");
      bg.src = `/assets/robotaxi/zone-${zone.id}.jpg`;
      bg.alt = "";
      bg.width = 1100;
      bg.height = 619;
      media.append(bg);
      if (day.rain) media.append(el("div", "taxi-rain"));
      if (day.concert && zone.id === "stadium") media.append(el("div", "taxi-concert"));
      const lot = el("div", "taxi-lot");
      assigned.slice(0, 6).forEach((car) => {
        const pip = document.createElement("img");
        pip.className = car.broken ? "taxi-pip is-broke" : "taxi-pip";
        pip.src = "/assets/robotaxi/cybercab-real-pip.webp";
        pip.alt = "";
        pip.width = 120;
        pip.height = 68;
        lot.append(pip);
      });
      media.append(lot);
      card.append(media);

      const body = el("div", "taxi-zone-body");
      body.append(el("h3", "", zone.name));
      body.append(
        el("p", "", `${heatLabel(demand)} · ${demand} rides · ${money(fareFor(zone, day, game.reputation))}`)
      );
      const meta = el("div", "taxi-zone-meta");
      meta.append(el("span", "", `${assigned.length} cab${assigned.length === 1 ? "" : "s"}`));
      const stepper = el("div", "taxi-stepper");
      const minus = el("button", "", "−");
      minus.type = "button";minus.setAttribute("aria-label","Remove a cab from "+zone.name);
      minus.disabled = !canAssign || assigned.length === 0;
      minus.addEventListener("click", (e) => {
        e.stopPropagation();
        pullFromZone(zone.id);
      });
      const plus = el("button", "", "+");
      plus.type = "button";plus.setAttribute("aria-label","Send a cab to "+zone.name);
      plus.disabled = !canAssign || idleCars().length === 0;
      plus.addEventListener("click", (e) => {
        e.stopPropagation();
        sendToZone(zone.id);
      });
      stepper.append(minus, plus);
      meta.append(stepper);
      body.append(meta);
      card.append(body);
      if (canAssign) {
        card.style.cursor = "pointer";
        card.addEventListener("click", () => sendSelected(zone.id));
      }
      mapEl.append(card);
    });
  }

  function battClass(charge) {
    if (charge < 30) return "is-low";
    if (charge < 70) return "is-mid";
    return "";
  }

  function cabStatus(car) {
    if (car.broken) return "Broken";
    if (state === "night") return car.night ? "Garage" : "Skip";
    if (car.fast) return "Fast charge";
    if (car.zone) return ZONES.find((z) => z.id === car.zone)?.name || car.zone;
    if (car.charge < 18) return "Empty";
    return "Idle";
  }

  function renderFleet() {
    if (!fleetEl || !game) return;
    fleetEl.replaceChildren();
    const idle = idleCars().length;
    if (idleEl) idleEl.textContent = `${idle} idle`;
    game.cars.forEach((car) => {
      const btn = el("button", "taxi-cab");
      btn.type = "button";btn.setAttribute("aria-pressed",String(state==='night'?car.night:selected.has(car.id)));btn.setAttribute("aria-label",`Cab ${car.id+1}, battery ${Math.round(car.charge)} percent, ${cabStatus(car)}`);
      if (selected.has(car.id)) btn.classList.add("is-on");
      if (car.broken || (state === "deploy" && car.charge < 18)) btn.classList.add("is-out");
      if (car.broken) btn.classList.add("is-broke");
      const shot = el("span", "taxi-cab-shot");
      if (state === "night" && car.night) shot.classList.add("is-charging");
      const img = document.createElement("img");
      img.src = "/assets/robotaxi/cybercab-real-pod.webp";
      img.alt = "";
      img.width = 320;
      img.height = 180;
      shot.append(img);
      btn.append(shot);
      btn.append(el("strong", "", `Cab ${car.id + 1}`));
      const batt = el("span", `taxi-batt ${battClass(car.charge)}`);
      const fill = el("i");
      fill.style.width = `${clamp(car.charge, 0, 100)}%`;
      batt.append(fill);
      btn.append(batt);
      btn.append(el("span", "", Math.round(car.charge)+"% · "+cabStatus(car)));
      btn.addEventListener("click", () => tapCab(car.id));
      fleetEl.append(btn);
    });
  }

  function renderActions() {
    if (!actionsEl) return;
    actionsEl.replaceChildren();
    if (!game || state === "attract" || state === "end") return;

    if (state === "deploy") {
      const fast = el("button", "button button-ghost", "Fast-charge selected");
      fast.type = "button";
      fast.disabled = ![...selected].some((id) => {
        const car = game.cars[id];
        return car && !car.broken && car.charge < 100;
      });
      fast.addEventListener("click", fastChargeSelected);
      const buy = el("button", "button button-ghost", `Buy cab · ${money(CAR_PRICE)}`);
      buy.type = "button";
      buy.disabled = game.cash < CAR_PRICE || game.cars.length >= MAX_CARS;
      buy.addEventListener("click", buyCab);
      const go = el("button", "button button-primary", "Run the day");
      go.type = "button";
      go.addEventListener("click", runDay);
      actionsEl.append(fast, buy, go);
    }

    if (state === "night") {
      const all = el("button", "button button-ghost", "Charge empties");
      all.type = "button";
      all.addEventListener("click", markEmpties);
      const cost = game.cars.filter((c) => c.night).length * powerCost();
      const sleep = el("button", "button button-primary", `Sleep · ${money(cost)}`);
      sleep.type = "button";
      sleep.addEventListener("click", finishNight);
      actionsEl.append(all, sleep);
    }

    if (state === "resolve") {
      const skip = el("button", "button button-ghost", "Skip");
      skip.type = "button";
      skip.addEventListener("click", finishResolve);
      actionsEl.append(skip);
    }
  }

  function renderLog(lines) {
    if (!logEl) return;
    logEl.replaceChildren();
    (lines || game?.log || []).forEach((row) => {
      const item = el("li", row.kind ? `is-${row.kind}` : "", row.text);
      logEl.append(item);
    });
  }

  function paint() {
    renderHud();
    renderMap();
    renderFleet();
    renderActions();
    if (state !== "resolve") renderLog();
    renderStrategy();saveResume();
  }

  function tapCab(id) {
    const car = game.cars[id];
    if (!car) return;
    if (state === "night") {
      car.night = !car.night;
      beep(car.night ? 420 : 220, 0.05);
      paint();
      return;
    }
    if (state !== "deploy") return;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    paint();
  }

  function sendToZone(zoneId) {
    if (state !== "deploy") return;
    const pool = idleCars().sort((a, b) => b.charge - a.charge);
    if (!pool.length) return;
    pool[0].zone = zoneId;
    beep(520, 0.04);
    paint();
  }

  function sendSelected(zoneId) {
    if (state !== "deploy") return;
    const ids = [...selected];
    if (!ids.length) {
      sendToZone(zoneId);
      return;
    }
    ids.forEach((id) => {
      const car = game.cars[id];
      if (car && !car.broken && car.charge >= 18) car.zone = zoneId;
    });
    selected.clear();
    beep(520, 0.04);
    paint();
  }

  function pullFromZone(zoneId) {
    const cars = zoneCars(zoneId);
    if (!cars.length) return;
    cars[cars.length - 1].zone = null;
    paint();
  }

  function fastChargeSelected() {
    let n = 0;
    [...selected].forEach((id) => {
      const car = game.cars[id];
      if (!car || car.broken || car.charge >= 100) return;
      if (game.cash < FAST) return;
      game.cash -= FAST;
      car.fast = false;
      car.charge = 100;
      n += 1;
    });
    selected.clear();
    if (n) beep(780, 0.08, "triangle", 0.05);
    paint();
  }

  function buyCab() {
    if (game.cash < CAR_PRICE || game.cars.length >= MAX_CARS) return;
    game.cash -= CAR_PRICE;
    game.cars.push(makeCar(game.cars.length));
    game.bought += 1;
    beep(640, 0.1, "triangle", 0.06);
    setNow(`Bought Cab ${game.cars.length}`);
    paint();
  }

  function markEmpties() {
    let budget = game.cash;
    game.cars.forEach((car) => {
      car.night = false;
    });
    game.cars
      .filter((c) => c.charge < 70)
      .sort((a, b) => a.charge - b.charge)
      .forEach((car) => {
        if (budget < powerCost()) return;
        car.night = true;
        budget -= powerCost();
      });
    paint();
  }

  function pushLog(text, kind) {
    game.log.push({ text, kind });
    renderLog();
  }

  function runDay() {
    if (state !== "deploy") return;
    state = "resolve";
    game.log = [];
    selected.clear();
    const day = today();
    const queue = [];
    const contract=M.contract(arcade.seed(),game.day,today());let contractServed=0;
    let dayCash = 0;
    let dayRides = 0;
    let dayMissed = 0;

    ZONES.forEach((zone) => {
      const demand = demandFor(zone, day);
      const cars = zoneCars(zone.id).filter((c) => capacity(c, day.rain) > 0);
      const cap = cars.reduce((sum, c) => sum + capacity(c, day.rain), 0);
      const served = Math.min(demand, cap);
      const missed = demand - served;
      if(zone.id===contract.zone)contractServed=served;
      const fare = fareFor(zone, day, game.reputation);
      const revenue = served * fare;
      dayCash += revenue;
      dayRides += served;
      dayMissed += missed;
      let left = served;
      cars.forEach((car) => {
        const capN = capacity(car, day.rain);
        const worked = Math.min(capN, left);
        left -= worked;
        const drain = worked > 0 ? (day.rain ? 64 : 52) : 18;
        car.charge = clamp(car.charge - drain, 0, 100);
        if (worked > 0 && M.random(arcade.seed()+":break:"+game.day+":"+car.id)() < (car.charge < 30 ? 0.1 : day.rain ? 0.045 : 0.025)*(game.upgrades.care?.25:1)) {
          car.broken = true;
          game.cash -= REPAIR;
          queue.push({
            text: `Cab ${car.id + 1} broke down in ${zone.name}. Repair ${money(REPAIR)}.`,
            kind: "bad",
          });
        }
      });
      const cover = demand ? served / demand : 1;
      if (demand >= 20 && cover < 0.45) game.reputation -= 7;
      if (day.concert && zone.id === "stadium" && cover >= 0.6) game.reputation += 6;
      if (cover >= 0.85 && demand >= 15) game.reputation += 2;
      if (cover < 0.35 && day.concert && zone.id === "stadium") game.reputation -= 8;
      queue.push({
        text: `${zone.name}: ${cars.length} cab${cars.length === 1 ? "" : "s"}, ${served}/${demand} rides, ${money(revenue)}${missed ? ` · ${missed} missed` : ""}`,
        kind: missed > 12 ? "bad" : served > 0 ? "good" : "",
      });
    });

    game.cars.forEach((car) => {
      car.fast = false;
    });

    const bonus=contractServed>=contract.rides?contract.bonus:0;
    if(bonus){dayCash+=bonus;game.reputation+=3;queue.unshift({text:contract.label+' won · '+money(bonus)+' contract bonus.',kind:'good'});}
    else queue.push({text:contract.label+': '+contractServed+'/'+contract.rides+' rides. No contract bonus today.'});
    game.history.push({name:day.name,revenue:dayCash,rides:dayRides,bonus,missed:dayMissed});
    game.cash += dayCash;
    game.rides += dayRides;
    game.missed += dayMissed;
    game.reputation = clamp(game.reputation, 0, 100);
    if (day.concert) queue.unshift({ text: "Concert at the Stadium.", kind: "good" });
    if (day.rain) queue.unshift({ text: "Rain. Slower trips, fatter fares." });
    queue.unshift({
      text: `${day.name}: ${dayRides} rides, ${money(dayCash)}. Cash ${money(game.cash)}.`,
      kind: dayCash > 0 ? "good" : "",
    });

    game.pending = queue;
    game.queueIndex = 0;
    paint();
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)finishResolve();else playQueue();
  }

  function playQueue() {
    clearTimeout(tickTimer);
    const queue = game.pending || [];
    if (game.queueIndex >= queue.length) {
      tickTimer = setTimeout(finishResolve, 500);
      return;
    }
    const row = queue[game.queueIndex];
    game.log.push(row);
    renderLog();
    beep(row.kind === "bad" ? 180 : 440, 0.05);
    game.queueIndex += 1;
    tickTimer = setTimeout(playQueue, 420);
  }

  function finishResolve() {
    clearTimeout(tickTimer);
    if (game.pending) {
      game.log = game.pending;
      game.pending = null;
      renderLog();
    }
    game.cars.forEach((car) => {
      car.zone = null;
      if (car.broken) {
        car.broken = false;
        car.charge = Math.max(car.charge, 35);
      }
    });
    if (game.day >= 6) {
      endWeek();
      return;
    }
    state = "night";
    game.cars.forEach((car) => {
      car.night = car.charge < 70;
    });
    let cost = game.cars.filter((c) => c.night).length * powerCost();
    if (cost > game.cash) {
      game.cars.forEach((c) => {
        c.night = false;
      });
      game.cars
        .filter((c) => c.charge < 40)
        .sort((a, b) => a.charge - b.charge)
        .forEach((car) => {
          if (game.cash < (game.cars.filter((c) => c.night).length + 1) * powerCost()) return;
          car.night = true;
        });
    }
    setNow(`${today().name} in the books`);
    paint();
  }

  function finishNight() {
    const marked = game.cars.filter((c) => c.night);
    const cost = marked.length * powerCost();
    if (cost > game.cash) {
      pushLog(`Not enough cash to garage ${marked.length} cabs.`, "bad");
      return;
    }
    game.cash -= cost;
    marked.forEach((car) => {
      car.charge = clamp(car.charge + 70, 0, 100);
      car.night = false;
    });
    game.day += 1;
    selected.clear();
    state = "deploy";
    game.log = [];
    setNow(`${today().name} · ${forecastCopy(today())}`);
    beep(360, 0.08);
    paint();root.querySelector('[data-taxi-forecast]').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }

  function shareHref(score, g) {
    const text = `Robotaxi Boss · ${score.toLocaleString()} pts · ${money(g.cash)} · ${g.cars.length} cabs · ${g.rides} rides. Beat me: ${SHARE_URL}?mode=${arcade.mode}${arcade.mode==='daily'?'&day='+arcade.day:''}`;
    return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  }

  function endWeek() {
    state = "end";
    const score = Math.max(0, Math.round(scoreOf(game)));
    if (score > best) {
      best = score;
      window.SDArcade.storage.setItem(STORE, String(best));
    }
    window.SDArcade.storage.removeItem(resumeKey());
    const medal=game.reputation>=65&&game.rides>=250?'gold':game.reputation>=35&&game.rides>=160?'silver':'bronze';
    arcade.record({score,missions:7,complete:true,medal,title:'Your city, in review',copy:game.rides+' rides completed · '+game.missed+' missed · '+Math.round(game.reputation)+' reputation. '+game.history.filter(h=>h.bonus).length+' contracts won. Cash '+money(game.cash)+'. Try a different fare and investment strategy on the same daily seed.'});
    arcade.live('Week complete. '+score.toLocaleString()+' points. Your personal record has been saved.');
    setNow(`Week locked · ${score.toLocaleString()} pts`);
    showOverlay(
      "Week over",
      score.toLocaleString(),
      `${money(game.cash)} in the till. ${game.cars.length} cabs, ${game.rides} rides, ${game.missed} missed, reputation ${Math.round(game.reputation)}.`,
      "Run another week",
      shareHref(score, game)
    );
    paint();
    beep(520, 0.12, "triangle", 0.07);
  }

  function startWeek() {
    ensureAudio();clearTimeout(tickTimer);selected.clear();
    const saved=!forceNew&&getResume();forceNew=false;
    if(saved&&saved.mode===arcade.mode&&(arcade.mode!=='daily'||saved.day===arcade.day)){game=saved.game;state=saved.state;hideOverlay();setNow('Week restored · '+today().name);arcade.markPlayed();paint();return;}
    weekRandom=M.random(arcade.seed()+':week');
    game={day:0,cash:START_CASH,reputation:START_REP,rides:0,missed:0,bought:0,cars:Array.from({length:START_CARS},(_,i)=>makeCar(i)),days:planWeek(),log:[],pending:null,queueIndex:0,pricing:'balanced',upgrades:{depot:false,routing:false,care:false},history:[]};
    state='deploy';hideOverlay();setNow('Day 1 · garage open');arcade.markPlayed();paint();beep(480,.09,'triangle',.05);
  }
  function buyUpgrade(id){if(state!=='deploy')return;const u=M.UPGRADES.find(x=>x.id===id);if(!u||game.upgrades[id]||game.cash<u.cost)return;game.cash-=u.cost;game.upgrades[id]=true;setNow(u.title+' installed');paint();}
  function cityView(){const node=root.querySelector('[data-taxi-city]');if(!node||!game)return;const pos=[[155,95],[460,75],[485,245],[180,260]];const busy=state==='resolve';node.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 350" role="group" aria-label="City deployment map. Use the named zone buttons below to assign cabs."><defs><pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#466079" stroke-opacity=".17"/></pattern></defs><path fill="url(#city-grid)" d="M0 0H640V350H0Z"/><path d="M0 310Q110 180 70 0M600 350Q500 150 640 80" fill="none" stroke="#194658" stroke-width="35"/><g fill="#182c39" stroke="#5e7785" stroke-opacity=".4">'+Array.from({length:21},(_,i)=>'<rect x="'+(85+(i%7)*75)+'" y="'+(60+Math.floor(i/7)*80)+'" width="'+(20+i%3*9)+'" height="'+(25+i%4*9)+'" rx="3"/>').join('')+'</g><path class="ac-route '+(busy?'':'ac-route-idle')+'" d="M155 95H460V245H180V95M180 245L460 95" fill="none" stroke="#e6c36a" stroke-width="3"/>'+ZONES.map((z,i)=>{const[x,y]=pos[i],n=zoneCars(z.id).length;return'<g role="button" tabindex="0" data-city-zone="'+z.id+'" aria-label="Assign selected cabs to '+z.name+'"><circle cx="'+x+'" cy="'+y+'" r="28" fill="#101d27" stroke="'+(n?'#e6c36a':'#6d879a')+'" stroke-width="2"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle">'+n+' cabs</text><text x="'+x+'" y="'+(y+51)+'" text-anchor="middle">'+z.name+'</text></g>';}).join('')+'<text x="22" y="330" style="font-size:10px;letter-spacing:2px">BAY VIEW / OPERATIONS '+(busy?'LIVE':'PLAN')+'</text></svg>';node.querySelectorAll('[data-city-zone]').forEach(g=>{g.onclick=()=>sendSelected(g.dataset.cityZone);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sendSelected(g.dataset.cityZone);}};});}
  function renderStrategy(){if(!game)return;cityView();const contract=M.contract(arcade.seed(),game.day,today()),pricing=root.querySelector('[data-taxi-pricing]');pricing.value=game.pricing;pricing.disabled=state!=='deploy';root.querySelector('[data-taxi-contract]').textContent=contract.label+': serve '+contract.rides+' rides in '+ZONES.find(z=>z.id===contract.zone).name+' for a '+money(contract.bonus)+' bonus.';
    const upgrades=root.querySelector('[data-taxi-upgrades]');upgrades.replaceChildren();M.UPGRADES.forEach(u=>{const b=el('button','');b.type='button';b.dataset.upgrade=u.id;b.disabled=state!=='deploy'||game.upgrades[u.id]||game.cash<u.cost;b.append(el('strong','',u.title),el('b','',game.upgrades[u.id]?'Installed':money(u.cost)),el('span','',u.copy));b.onclick=()=>buyUpgrade(u.id);upgrades.append(b);});
    const planner=root.querySelector('[data-taxi-planner]');planner.replaceChildren();game.days.slice(game.day+1,game.day+3).forEach(d=>{const p=el('p','');p.append(el('b','','Next · '+d.name),document.createTextNode(forecastCopy(d)));planner.append(p);});if(!planner.childNodes.length)planner.append(el('p','','Final day. Finish strong.'));
    const chart=root.querySelector('[data-taxi-chart]');chart.replaceChildren();if(game.history.length){const max=Math.max(1,...game.history.map(d=>d.revenue));game.history.forEach(d=>{const bar=el('div','');const fill=el('i','');fill.style.height=(d.revenue/max*65)+'px';bar.append(el('span','',money(d.revenue)),fill,el('span','',d.name));chart.append(bar);});chart.setAttribute('role','img');chart.setAttribute('aria-label',game.history.map(d=>d.name+' revenue '+money(d.revenue)).join('; '));}
    arcade.telemetry({state:state==='deploy'?'Planning':state==='night'?'Charging':state==='resolve'?'City running':state==='end'?'Week complete':'Ready',sound:muted?'Sound off':'Sound on'});
  }
  const arcade=window.SDArcade.mount('robotaxi',{reset(){clearTimeout(tickTimer);state='attract';game=null;showOverlay('New mission','Open the garage','Choose your fleet strategy. Saved weeks restore when you press Play.','Play');},restart(){forceNew=true;startWeek();},pause(){},sound(){ensureAudio();muted=!muted;applyMute();return muted;}});
  root.querySelector('[data-taxi-report]').onclick=()=>{hideOverlay();root.querySelector('[data-taxi-chart]').scrollIntoView({block:'center',behavior:'instant'});};
  root.querySelector('[data-taxi-pricing]').onchange=e=>{if(state==='deploy'){game.pricing=e.target.value;paint();}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){saveResume();clearTimeout(tickTimer);}else if(state==='resolve')playQueue();});
  window.addEventListener('keydown',e=>{if(state!=='deploy'||e.target?.closest?.('input,select,textarea,button,a'))return;const i=Number(e.key)-1;if(i>=0&&i<4){e.preventDefault();sendSelected(ZONES[i].id);}});

  if (nameInput) {
    const saved = window.SDArcade.storage.getItem(NAME_STORE);
    if (saved) nameInput.value = saved.slice(0, 12);
    nameInput.addEventListener("input", () => {
      window.SDArcade.storage.setItem(NAME_STORE, callsign());
    });
  }

  muteBtn?.addEventListener("click", () => {
    ensureAudio();
    muted = !muted;
    applyMute();
  });

  playBtn?.addEventListener("click", () => {
    startWeek();
  });
  heroPlay?.addEventListener("click", () => {
    startWeek();
  });

  window.addEventListener("keydown", (e) => {
    if (nameInput && document.activeElement === nameInput) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
    if (e.key === "m" || e.key === "M") {
      ensureAudio();
      muted = !muted;
      applyMute();
    }
    if (e.key === "Enter" && (state === "attract" || state === "end")) startWeek();
  });

  weekRandom=M.random(arcade.seed()+':week');
  game = {
    pricing:"balanced",upgrades:{depot:false,routing:false,care:false},history:[],
    day: 0,
    cash: START_CASH,
    reputation: START_REP,
    rides: 0,
    missed: 0,
    bought: 0,
    cars: Array.from({ length: START_CARS }, (_, i) => makeCar(i)),
    days: planWeek(),
    log: [],
    pending: null,
    queueIndex: 0,
  };
  if (window.AljrBoard) {
    window.AljrBoard.onChange((id) => {
      if (id === GAME) renderBoard(freshId);
    });
    window.AljrBoard.load(GAME);
  }
  const savedWeek=getResume();if(savedWeek)showOverlay('Saved week','Your city is waiting.','Continue your saved week, or use Restart to begin a new one.','Continue week');
  window.RobotaxiGame={state:()=>state,snapshot:()=>JSON.parse(JSON.stringify(game)),start:startWeek,assign:sendToZone,runDay,finishResolve,finishNight,buyUpgrade,mode:()=>arcade.mode};
  renderBoard();
  applyMute();
  paint();
  if (bestEl) bestEl.textContent = `Best ${best.toLocaleString()}`;
})();

