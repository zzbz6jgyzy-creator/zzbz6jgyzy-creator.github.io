import type { AppMode, DerivedState, Observer, QualityTier, Settings, SourceFacts } from "../types";
import { OrbitalEngine, webglAvailable } from "../engine/scene";
import { renderFallback } from "../engine/fallback2d";
import { SimulationClock, SPEEDS } from "../orbit/clock";
import { loadSnapshot, loadStarlink, newestEpoch, searchObjects } from "../orbit/catalog";
import { parseDeepLink, buildDeepLink } from "../orbit/deeplink";
import { freshnessLabel, freshnessOf, formatUtc, lookAngles, periodMinutes, propagateDerived, satrecFromFacts } from "../orbit/math";
import { cardinalFromAzimuth } from "../orbit/math";
import { classifyVisibility, predictPasses, visibilityLabel } from "../orbit/pass";
import { formatAltitude, formatSpeed, guessTier, loadSettings, saveSettings } from "../orbit/settings";
import {
  MISSIONS,
  buildDiscoveries,
  clearObserver,
  dailyChallenge,
  loadProgress,
  loadSavedObserver,
  missionById,
  recordCompletion,
  saveObserver,
  scoreChallenge,
  shareText,
  xShareUrl,
} from "../orbit/engagement";
import { CITIES, DEFAULT_CITY, filterCities, geocodeCity } from "../data/cities";
import { track } from "../analytics";

interface WorkerReady {
  type: "ready";
  count: number;
}
interface WorkerPos {
  type: "positions";
  timeMs: number;
  count: number;
  buffer: ArrayBuffer;
}

export class OrbitalApp {
  private root: HTMLElement;
  private settings = loadSettings();
  private clock: SimulationClock;
  private engine: OrbitalEngine | null = null;
  private worker: Worker | null = null;
  private objects: SourceFacts[] = [];
  private starlink: SourceFacts[] = [];
  private starlinkLoaded = false;
  private states = new Map<number, DerivedState>();
  private recs = new Map<number, ReturnType<typeof satrecFromFacts>>();
  private mode: AppMode = "explore";
  private selected: SourceFacts | null = null;
  private observer: Observer | null = loadSavedObserver();
  private quality: QualityTier;
  private landingOpen = true;
  private webgl = false;
  private snapshotRetrieved = "";
  private snapshotStale = false;
  private articles: { title: string; url: string; topic?: string; tag?: string }[] = [];
  private challenge = dailyChallenge();
  private challengeStart = Date.now();
  private usedHint = false;
  private lastWorker = 0;
  private raf = 0;
  private hoverEl: HTMLElement | null = null;
  private liveEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.quality = this.settings.quality === "auto" ? guessTier() : this.settings.quality;
    this.clock = new SimulationClock();
  }

  async start(): Promise<void> {
    this.webgl = webglAvailable();
    this.renderShell();
    this.liveEl = this.root.querySelector("[data-live]");
    this.hoverEl = this.root.querySelector("[data-hover]");
    this.announce("Loading Orbital Command.");
    const [snap, arts] = await Promise.all([loadSnapshot(), this.loadArticles()]);
    this.articles = arts;
    if (snap) {
      this.objects = snap.objects;
      this.snapshotRetrieved = snap.retrievedAt;
      this.snapshotStale = snap.stale;
      const epoch = newestEpoch(snap.objects);
      this.clock = new SimulationClock(epoch || undefined);
    }
    this.objects.forEach((o) => {
      const r = satrecFromFacts(o);
      if (r) this.recs.set(o.norad, r);
    });
    if (this.webgl) {
      const canvas = this.root.querySelector("canvas") as HTMLCanvasElement;
      this.engine = new OrbitalEngine(
        canvas,
        {
          onPick: (n) => n && this.selectNorad(n),
          onHover: (n, name, x, y) => this.hover(n, name, x, y),
          announce: (m) => this.announce(m),
        },
        this.quality,
        this.settings.reducedMotion,
      );
      this.engine.setObjects(this.visibleObjects(), this.settings.markerDensity);
      this.bootWorker(this.visibleObjects());
      track("orbital_globe_load");
    } else {
      this.root.querySelector("[data-globe]")?.classList.add("is-fallback");
      this.updateFallback();
      track("orbital_globe_fail");
    }
    this.applyLink(parseDeepLink(location.search));
    this.bind();
    this.loop();
    this.announce("Earth is ready. Positions are calculated from dated orbital elements.");
    this.paint();
  }

  private visibleObjects(): SourceFacts[] {
    if (this.mode === "starlink") return this.starlink.length ? this.starlink : this.objects.filter((o) => o.group === "starlink");
    if (this.mode === "above") return this.objects;
    return this.objects;
  }

  private bootWorker(list: SourceFacts[]): void {
    this.worker?.terminate();
    this.worker = new Worker(new URL("../worker/propagate.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (ev: MessageEvent<WorkerReady | WorkerPos>) => {
      const msg = ev.data;
      if (msg.type === "positions") {
        const buf = new Float32Array(msg.buffer);
        for (let i = 0; i < buf.length; i += 8) {
          const norad = buf[i];
          const facts = this.find(norad);
          this.states.set(norad, {
            norad,
            ecef: { x: buf[i + 1] * 6371, y: buf[i + 2] * 6371, z: buf[i + 3] * 6371 },
            latitudeDeg: buf[i + 4],
            longitudeDeg: buf[i + 5],
            altitudeKm: buf[i + 6],
            velocityKmS: buf[i + 7],
            periodMin: facts ? periodMinutes(facts.meanMotionRevPerDay) : NaN,
          });
        }
        this.engine?.applyPositions(buf, msg.timeMs);
        if (!this.webgl) this.updateFallback();
      }
    };
    this.worker.postMessage({
      type: "init",
      objects: list.map((o) => ({ norad: o.norad, tle1: o.tle1, tle2: o.tle2, meanMotion: o.meanMotionRevPerDay })),
    });
  }

  private find(norad: number): SourceFacts | undefined {
    return this.objects.find((o) => o.norad === norad) || this.starlink.find((o) => o.norad === norad);
  }

  private async loadArticles(): Promise<{ title: string; url: string; topic?: string; tag?: string }[]> {
    try {
      const res = await fetch("/data/articles.json", { credentials: "same-origin" });
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.articles || [];
      return list.filter((a: { topic?: string; tag?: string }) => /spacex|starlink|dragon|starship/i.test(`${a.topic || ""} ${a.tag || ""}`)).slice(0, 12);
    } catch {
      return [];
    }
  }

  private applyLink(link: ReturnType<typeof parseDeepLink>): void {
    this.setMode(link.mode, false);
    if (link.time) this.clock.setMs(Date.parse(link.time));
    if (link.lat != null && link.lon != null) {
      this.observer = {
        latitudeDeg: link.lat,
        longitudeDeg: link.lon,
        altitudeKm: 0,
        label: "Shared location",
        timeZone: "UTC",
      };
      this.engine?.setObserver(this.observer);
    }
    if (link.satellite) this.selectNorad(link.satellite);
    if (link.mission) this.setMode("missions", false);
  }

  private setMode(mode: AppMode, trackIt = true): void {
    this.mode = mode;
    if (mode !== "explore") this.landingOpen = false;
    if (mode === "starlink") {
      void this.ensureStarlink();
      if (trackIt) track("orbital_starlink");
    }
    if (mode === "above" && trackIt) track("orbital_above");
    if (mode === "missions" && trackIt) track("orbital_mission");
    this.root.dataset.mode = mode;
    this.root.classList.toggle("has-selection", !!this.selected);
    this.paint();
  }

  private async ensureStarlink(): Promise<void> {
    if (this.starlinkLoaded) return;
    this.announce("Loading the Starlink catalogue from this site. The browser does not call CelesTrak.");
    this.starlink = await loadStarlink();
    this.starlinkLoaded = true;
    this.starlink.forEach((o) => {
      const r = satrecFromFacts(o);
      if (r) this.recs.set(o.norad, r);
    });
    const list = this.starlink;
    this.engine?.setObjects(list, this.settings.markerDensity);
    this.bootWorker(list);
    this.announce(`${list.length.toLocaleString()} Starlink objects loaded from the cached catalogue.`);
    this.paint();
  }

  private selectNorad(norad: number): void {
    const facts = this.find(norad);
    if (!facts) {
      this.announce(`Satellite ${norad} is not in the loaded set.`);
      return;
    }
    this.selected = facts;
    this.landingOpen = false;
    this.root.classList.toggle("has-selection", true);
    const rec = this.recs.get(norad);
    const state = rec ? propagateDerived(rec, this.clock.now, norad, facts.meanMotionRevPerDay) : this.states.get(norad);
    if (state) {
      this.states.set(norad, state);
      this.engine?.flyTo(state, this.settings.reducedMotion);
    }
    this.engine?.setSelected(norad, facts, this.clock.now);
    track("orbital_sat_select");
    if (this.challenge.kind === "select-iss" && norad === 25544) this.completeChallenge(true);
    if (this.challenge.kind === "starlink-alt" && facts.group === "starlink" && state && state.altitudeKm >= 500 && state.altitudeKm <= 600) {
      this.completeChallenge(true);
    }
    this.announce(`Selected ${facts.name}, NORAD ${facts.norad}. Calculated position.`);
    this.paint();
    history.replaceState(null, "", buildDeepLink({ mode: this.mode, satellite: norad }));
  }

  private completeChallenge(correct: boolean): void {
    const score = scoreChallenge({
      correct,
      elapsedMs: Date.now() - this.challengeStart,
      usedHint: this.usedHint,
      difficulty: this.challenge.difficulty,
    });
    if (correct) {
      recordCompletion(this.challenge.id, score);
      track("orbital_challenge");
      this.announce(`Challenge complete. Score ${score}. Saved on this device.`);
    }
    this.paint();
  }

  private hover(norad: number | null, name: string | null, x: number, y: number): void {
    if (!this.hoverEl) return;
    if (!norad || !name || matchMedia("(pointer: coarse)").matches) {
      this.hoverEl.hidden = true;
      return;
    }
    this.hoverEl.hidden = false;
    this.hoverEl.textContent = `${name} · ${norad}`;
    this.hoverEl.style.left = `${x + 12}px`;
    this.hoverEl.style.top = `${y + 12}px`;
  }

  private announce(msg: string): void {
    if (this.liveEl) this.liveEl.textContent = msg;
  }

  private loop = (): void => {
    this.clock.tick();
    const clamp = this.clock.clampToEpochWindow();
    if (clamp.reason) this.announce(clamp.reason);
    this.engine?.setSun(this.clock.now);
    this.engine?.interpolate(this.clock.nowMs);
    if (this.selected) {
      const rec = this.recs.get(this.selected.norad);
      const state = rec ? propagateDerived(rec, this.clock.now, this.selected.norad, this.selected.meanMotionRevPerDay) : null;
      if (state) {
        this.states.set(this.selected.norad, state);
        this.engine?.followSelected(state);
      }
    }
    const interval = this.clock.playbackSpeed >= 300 ? 180 : this.clock.playbackSpeed > 1 ? 280 : 500;
    if (this.worker && performance.now() - this.lastWorker > interval) {
      this.lastWorker = performance.now();
      this.worker.postMessage({ type: "tick", timeMs: this.clock.nowMs });
    }
    this.engine?.render();
    this.raf = requestAnimationFrame(this.loop);
    const clockEl = this.root.querySelector("[data-clock]");
    if (clockEl) clockEl.textContent = this.clockLabel();
  };

  private clockLabel(): string {
    const d = this.clock.now;
    const live = this.clock.isLive ? "LIVE" : "SIM";
    return `${live}  ${d.toISOString().replace(".000Z", "Z")}`;
  }

  private updateFallback(): void {
    const el = this.root.querySelector("[data-fallback]");
    if (el instanceof HTMLElement) renderFallback(el, this.visibleObjects(), this.states, this.observer);
  }

  private bind(): void {
    this.root.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (!t) return;
      const act = t.dataset.act;
      if (act === "explore") this.setMode("explore");
      if (act === "starlink") this.setMode("starlink");
      if (act === "above") this.setMode("above");
      if (act === "missions") this.setMode("missions");
      if (act === "discover") this.setMode("discover");
      if (act === "challenges") this.setMode("challenges");
      if (act === "deselect") {
        this.selected = null;
        this.root.classList.remove("has-selection");
        this.engine?.setSelected(null, null, this.clock.now);
        this.engine?.setFollow(false);
      }
      if (act === "landing-explore") { this.landingOpen = false; this.setMode("explore"); }
      if (act === "landing-starlink") { this.landingOpen = false; this.setMode("starlink"); }
      if (act === "landing-above") { this.landingOpen = false; this.setMode("above"); }
      if (act === "dismiss-landing") this.landingOpen = false;
      if (act === "chrome") this.root.classList.toggle("is-cinematic");
      if (act === "play") this.clock.toggle();
      if (act === "now") { this.clock.resetToNow(); track("orbital_time"); }
      if (act === "back") this.clock.jumpMs(-3600_000);
      if (act === "fwd") this.clock.jumpMs(3600_000);
      if (act === "follow") this.engine?.setFollow(true);
      if (act === "orbit") this.selected && this.engine?.setSelected(this.selected.norad, this.selected, this.clock.now);
      if (act === "track") this.selected && this.engine?.showGroundTrack(this.selected, this.clock.now);
      if (act === "reset-cam") this.engine?.resetCamera();
      if (act === "overview") this.engine?.cinematicOverview();
      if (act === "ground") this.observer && this.engine?.groundView(this.observer);
      if (act === "share") this.share();
      if (act === "hint") { this.usedHint = true; this.announce(this.challenge.hint); }
      if (act === "save-obs") this.observer && saveObserver(this.observer);
      if (act === "clear-obs") { clearObserver(); this.observer = null; this.engine?.setObserver(null); }
      if (act === "geo") this.askGeo();
      if (act === "killarney") this.setObserverCity(DEFAULT_CITY.name, DEFAULT_CITY.region, DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY.tz);
      if (act === "pick-city") {
        const lat = Number(t.dataset.lat);
        const lon = Number(t.dataset.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          this.setObserverCity(t.dataset.name || "City", t.dataset.region || "", lat, lon, t.dataset.tz || "UTC");
        }
      }
      if (act === "select") this.selectNorad(Number(t.dataset.norad));
      if (act === "mission") { this.setMode("missions"); history.replaceState(null, "", buildDeepLink({ mode: "missions", mission: t.dataset.mission })); }
      if (act === "challenge-opt") this.answerChallenge(t.dataset.answer || "");
      this.paint();
    });
    this.root.addEventListener("change", (e) => {
      const t = e.target as HTMLSelectElement | HTMLInputElement;
      if (t.id === "oc-speed") {
        this.clock.setSpeed(Number(t.value) as (typeof SPEEDS)[number]);
        track("orbital_time");
      }
      if (t.id === "oc-quality") {
        this.settings.quality = t.value as Settings["quality"];
        this.quality = t.value === "auto" ? guessTier() : (t.value as QualityTier);
        this.engine?.setQuality(this.quality);
        saveSettings(this.settings);
        track("orbital_quality");
      }
      if (t.id === "oc-density") {
        this.settings.markerDensity = t.value as Settings["markerDensity"];
        this.engine?.setObjects(this.visibleObjects(), this.settings.markerDensity);
        saveSettings(this.settings);
      }
      if (t.id === "oc-units") { this.settings.units = t.value as Settings["units"]; saveSettings(this.settings); }
      if (t.id === "oc-timefmt") { this.settings.timeFormat = t.value as Settings["timeFormat"]; saveSettings(this.settings); }
      if (t.id === "oc-motion") { this.settings.reducedMotion = (t as HTMLInputElement).checked; this.engine?.setReducedMotion(this.settings.reducedMotion); saveSettings(this.settings); }
      if (t.id === "oc-scrub") {
        const v = Number((t as HTMLInputElement).value);
        this.clock.setMs(this.clock.epochMs + v * 3600_000);
        track("orbital_time");
      }
      this.paint();
    });
    const search = this.root.querySelector("#oc-search") as HTMLInputElement | null;
    let st = 0;
    search?.addEventListener("input", () => {
      clearTimeout(st);
      st = window.setTimeout(() => {
        this.paintSearch(search.value);
        if (search.value.trim()) track("orbital_search");
      }, 160);
    });
    this.root.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      if (form.dataset.form === "coords") {
        e.preventDefault();
        const lat = Number((form.elements.namedItem("lat") as HTMLInputElement).value);
        const lon = Number((form.elements.namedItem("lon") as HTMLInputElement).value);
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          this.setObserverCity("Custom", "Entered coordinates", lat, lon, "UTC");
        }
      }
      if (form.dataset.form === "city") {
        e.preventDefault();
        const q = (form.elements.namedItem("city") as HTMLInputElement).value;
        void this.searchCity(q);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clock.pause();
    });
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement).matches("input, textarea, select")) return;
      if (e.key === " ") { e.preventDefault(); this.clock.toggle(); }
      if (e.key === "ArrowRight") this.clock.jumpMs(e.shiftKey ? 6 * 3600_000 : 3600_000);
      if (e.key === "ArrowLeft") this.clock.jumpMs(e.shiftKey ? -6 * 3600_000 : -3600_000);
      if (e.key === "Escape") {
        this.selected = null;
        this.root.classList.remove("has-selection");
        this.engine?.setSelected(null, null, this.clock.now);
      }
      if (e.key === "/") { e.preventDefault(); search?.focus(); }
    });
  }

  private setObserverCity(name: string, region: string, lat: number, lon: number, tz: string): void {
    this.observer = { latitudeDeg: lat, longitudeDeg: lon, altitudeKm: 0, label: `${name}, ${region}`, timeZone: tz };
    this.engine?.setObserver(this.observer);
    this.announce(`Observer set to ${this.observer.label}. Location stays on this device unless you save it.`);
    track("orbital_pass");
    this.paint();
  }

  private async searchCity(q: string): Promise<void> {
    const local = filterCities(q);
    if (local.length === 1 && local[0].name.toLowerCase() === q.trim().toLowerCase()) {
      this.setObserverCity(local[0].name, local[0].region, local[0].lat, local[0].lon, local[0].tz);
      return;
    }
    try {
      const hits = await geocodeCity(q);
      const box = this.root.querySelector("[data-city-results]");
      if (box) {
        box.innerHTML = (hits.length ? hits : local).map((c) =>
          `<button type="button" data-act="pick-city" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${escapeHtml(c.name)}" data-region="${escapeHtml(c.region)}" data-tz="${escapeHtml(c.tz)}">${escapeHtml(c.name)}<small>${escapeHtml(c.region)}</small></button>`,
        ).join("") || `<p>No cities matched. Try Killarney or latitude and longitude.</p>`;
      }
    } catch {
      this.announce("City search failed. Enter latitude and longitude, or use Killarney.");
    }
  }

  private askGeo(): void {
    if (!navigator.geolocation) {
      this.announce("This browser has no geolocation. Use a city or coordinates.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => this.setObserverCity("My location", "From this browser", pos.coords.latitude, pos.coords.longitude, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
      () => this.announce("Location permission denied. Use a city or coordinates. Nothing was stored."),
      { maximumAge: 60_000, timeout: 8000, enableHighAccuracy: false },
    );
  }

  private share(): void {
    const url = location.origin + buildDeepLink({
      mode: this.mode,
      satellite: this.selected?.norad ?? null,
      lat: this.observer?.latitudeDeg ?? null,
      lon: this.observer?.longitudeDeg ?? null,
    });
    let text = "Orbital Command — calculated satellite positions from Supercharged Daily.";
    if (this.selected?.norad === 25544 && this.observer) text = shareText("iss", this.observer.label);
    else if (this.mode === "above" && this.observer) text = shareText("above", `${this.aboveCount()} satellites`);
    else if (this.mode === "challenges") text = shareText("challenge", this.challenge.title);
    track("orbital_share");
    if (navigator.share) void navigator.share({ title: "Orbital Command", text, url }).catch(() => copy(url));
    else copy(url);
    this.announce("Share link ready. Claims match the calculated result.");
    const x = this.root.querySelector("[data-xshare]") as HTMLAnchorElement | null;
    if (x) x.href = xShareUrl(text, url);
  }

  private aboveCount(): number {
    if (!this.observer) return 0;
    let n = 0;
    for (const o of this.visibleObjects()) {
      const rec = this.recs.get(o.norad);
      if (!rec) continue;
      const st = propagateDerived(rec, this.clock.now, o.norad, o.meanMotionRevPerDay);
      if (!st) continue;
      const look = lookAngles(this.observer, st, this.clock.now, rec);
      if (look && look.elevationDeg > 10) n += 1;
    }
    return n;
  }

  private answerChallenge(answer: string): void {
    const c = this.challenge;
    let ok = false;
    if (c.kind === "inclination") ok = answer.includes("52");
    if (c.kind === "period") ok = answer.includes("93");
    this.completeChallenge(ok);
  }

  private paintSearch(q: string): void {
    const box = this.root.querySelector("[data-results]");
    if (!box) return;
    const hits = searchObjects([...this.objects, ...this.starlink], q);
    box.innerHTML = hits.length
      ? hits.map((o) => `<button type="button" data-act="select" data-norad="${o.norad}">${escapeHtml(o.name)}<small>${o.norad} · ${escapeHtml(o.group)}</small></button>`).join("")
      : q.trim() ? `<p>No loaded object matches that name or NORAD number.</p>` : "";
  }

  private paint(): void {
    const landing = this.root.querySelector("[data-landing]") as HTMLElement | null;
    if (landing) landing.hidden = !this.landingOpen;
    const right = this.root.querySelector("[data-right]");
    if (right) right.innerHTML = this.rightHtml();
    const left = this.root.querySelector("[data-left-body]");
    if (left) left.innerHTML = this.leftHtml();
    const modes = this.root.querySelectorAll("[data-act]");
    modes.forEach((el) => {
      if (["explore", "starlink", "above", "missions", "discover", "challenges"].includes((el as HTMLElement).dataset.act || "")) {
        el.setAttribute("aria-current", (el as HTMLElement).dataset.act === this.mode ? "page" : "false");
      }
    });
    const warn = this.root.querySelector("[data-warn]");
    if (warn) warn.textContent = this.clock.reliabilityWarning() || (this.snapshotStale ? "Serving the last valid orbital snapshot after an upstream failure." : "");
  }

  private leftHtml(): string {
    if (this.mode === "starlink") {
      return `<p class="oc-kicker">Starlink</p>
        <p>${(this.starlink.length || this.objects.filter((o) => o.group === "starlink").length).toLocaleString()} objects from the cached CelesTrak catalogue on this site. Counts and generations stay on the <a href="/starlink.html">Starlink tracker</a>.</p>
        <p class="oc-fine">Dataset retrieval ${escapeHtml(this.snapshotRetrieved || "see catalogue stamp")}. Positions are calculated. Operational status is not inferred.</p>
        <label>Altitude (km) filter is applied in the inspector after selection. Use search for a name or NORAD.</label>`;
    }
    if (this.mode === "above") return this.aboveHtml();
    if (this.mode === "missions") return this.missionHtml();
    if (this.mode === "discover") return this.discoverHtml();
    if (this.mode === "challenges") return this.challengeHtml();
    return `<p class="oc-kicker">Explore Earth</p>
      <p>Drag to orbit. Pinch or scroll to zoom. Positions are SGP4 calculations from dated elements — not onboard telemetry.</p>
      <div class="oc-actions">
        <button type="button" data-act="reset-cam">Reset camera</button>
        <button type="button" data-act="overview">Cinematic overview</button>
      </div>
      <ul class="oc-links">
        <li><a href="/starlink.html">Starlink tracker</a></li>
        <li><a href="/see-the-launch.html">Can I see the launch?</a></li>
        <li><a href="/spacex.html">SpaceX desk</a></li>
        <li><a href="/calendar.html">Launch calendar</a></li>
      </ul>`;
  }

  private aboveHtml(): string {
    const cities = CITIES.slice(0, 6).map((c) =>
      `<button type="button" class="oc-chip" data-act="pick-city" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${escapeHtml(c.name)}" data-region="${escapeHtml(c.region)}" data-tz="${escapeHtml(c.tz)}">${escapeHtml(c.name)}</button>`,
    ).join("");
    let body = `<p class="oc-kicker">What’s above me?</p>
      <p>Location is optional. Default example: Killarney, Co. Kerry. Precise coordinates stay in this browser if you save them.</p>
      <div class="oc-actions">
        <button type="button" data-act="geo">Use this device</button>
        <button type="button" data-act="killarney">Killarney</button>
        <button type="button" data-act="save-obs">Save on this device</button>
        <button type="button" data-act="clear-obs">Clear saved</button>
      </div>
      <form data-form="city" class="oc-form"><label>City search<input name="city" type="search" placeholder="Killarney, Dublin, New York" /></label><button type="submit">Find</button></form>
      <div data-city-results class="oc-results">${cities}</div>
      <form data-form="coords" class="oc-form oc-form-row">
        <label>Latitude<input name="lat" type="number" step="0.0001" min="-90" max="90" required /></label>
        <label>Longitude<input name="lon" type="number" step="0.0001" min="-180" max="180" required /></label>
        <button type="submit">Set</button>
      </form>`;
    if (!this.observer) return body;
    const recs = this.visibleObjects().slice(0, this.starlinkLoaded ? 400 : this.objects.length);
    const rows: string[] = [];
    const passes: string[] = [];
    for (const o of recs) {
      const rec = this.recs.get(o.norad);
      if (!rec) continue;
      const st = propagateDerived(rec, this.clock.now, o.norad, o.meanMotionRevPerDay);
      if (!st) continue;
      const look = lookAngles(this.observer, st, this.clock.now, rec);
      if (!look || look.elevationDeg < 10) continue;
      const vis = classifyVisibility(this.observer, st, look.elevationDeg, this.clock.now, 10);
      rows.push(`<li><button type="button" data-act="select" data-norad="${o.norad}">${escapeHtml(o.name)}</button>
        <span>${look.elevationDeg.toFixed(0)}° ${cardinalFromAzimuth(look.azimuthDeg)}</span>
        <small>${vis ? visibilityLabel(vis) : ""}</small></li>`);
    }
    const iss = this.find(25544);
    const issRec = iss && this.recs.get(25544);
    if (iss && issRec) {
      const ev = predictPasses(issRec, iss, this.observer, this.clock.nowMs, this.clock.nowMs + 36 * 3600_000, 10);
      for (const p of ev.slice(0, 4)) {
        passes.push(`<li><strong>ISS</strong> rise ${this.fmtLocal(p.aos)} · max ${p.maxElevationDeg.toFixed(0)}° ${cardinalFromAzimuth(p.tcaAzimuthDeg)} · ${Math.round(p.durationSec / 60)} min
          <small>Geometric pass. Weather and brightness unknown.</small></li>`);
      }
    }
    body += `<p>Observer ${escapeHtml(this.observer.label)}.</p>
      <button type="button" data-act="ground">Ground view</button>
      <h3>Above 10° elevation now</h3>
      <ul class="oc-list">${rows.join("") || "<li>Nothing in the loaded set is above 10° at this simulation time.</li>"}</ul>
      <h3>Upcoming ISS passes (36 h)</h3>
      <ul class="oc-list">${passes.join("") || "<li>No ISS geometric pass in the next 36 hours at 10° minimum elevation, or ISS elements are missing.</li>"}</ul>
      ${this.skyHtml()}`;
    return body;
  }

  private skyHtml(): string {
    if (!this.observer || !this.selected) return `<div class="oc-sky" role="img" aria-label="Sky view. Select a satellite to plot azimuth and elevation."><p>Select a satellite to plot it on the sky dome.</p></div>`;
    const rec = this.recs.get(this.selected.norad);
    if (!rec) return "";
    const st = propagateDerived(rec, this.clock.now, this.selected.norad, this.selected.meanMotionRevPerDay);
    if (!st) return "";
    const look = lookAngles(this.observer, st, this.clock.now, rec);
    if (!look) return "";
    const r = (90 - Math.max(-10, look.elevationDeg)) / 100;
    const th = ((look.azimuthDeg - 90) * Math.PI) / 180;
    const x = 50 + r * 42 * Math.cos(th);
    const y = 50 + r * 42 * Math.sin(th);
    return `<div class="oc-sky" role="img" aria-label="Sky view: ${this.selected.name} at ${look.elevationDeg.toFixed(0)} degrees elevation, ${cardinalFromAzimuth(look.azimuthDeg)}.">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#36D5EF" stroke-opacity=".25"/>
        <circle cx="50" cy="50" r="23" fill="none" stroke="#6B99BE" stroke-opacity=".25"/>
        <text x="50" y="8" text-anchor="middle" fill="#9CB4C7" font-size="4">N</text>
        <text x="50" y="98" text-anchor="middle" fill="#9CB4C7" font-size="4">S</text>
        <text x="6" y="52" fill="#9CB4C7" font-size="4">W</text>
        <text x="90" y="52" fill="#9CB4C7" font-size="4">E</text>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="#F2A444"/>
      </svg>
      <p>${escapeHtml(this.selected.name)} · el ${look.elevationDeg.toFixed(0)}° · az ${look.azimuthDeg.toFixed(0)}° ${cardinalFromAzimuth(look.azimuthDeg)}</p>
    </div>`;
  }

  private missionHtml(): string {
    const m = missionById("crs-35") || MISSIONS[0];
    const events = m.events.map((ev) =>
      `<li><strong>${escapeHtml(ev.label)}</strong>
        <time>${ev.at ? formatUtc(ev.at) : ev.dateOnly || "Time not published"}</time>
        <small>${escapeHtml(ev.fidelity)} · ${escapeHtml(ev.source)}</small>
        ${ev.note ? `<small>${escapeHtml(ev.note)}</small>` : ""}</li>`,
    ).join("");
    return `<p class="oc-kicker">Mission replay</p>
      <h3>${escapeHtml(m.name)}</h3>
      <p>${escapeHtml(m.summary)}</p>
      <p class="oc-warn">${escapeHtml(m.fidelityNote)}</p>
      <p>Vehicle ${escapeHtml(m.vehicle)} · ${escapeHtml(m.launchSite)} · verified events: ${m.verified ? "yes" : "no"}.</p>
      <ol class="oc-timeline">${events}</ol>
      <div class="oc-actions">
        <button type="button" data-act="select" data-norad="25544">Follow ISS (current elements)</button>
      </div>
      <ul class="oc-links">${m.articles.map((a) => `<li><a href="${a.url}">${escapeHtml(a.title)}</a></li>`).join("")}</ul>`;
  }

  private discoverHtml(): string {
    const iss = this.find(25544);
    const issRec = iss && this.recs.get(25544);
    const next = iss && issRec && this.observer
      ? predictPasses(issRec, iss, this.observer, this.clock.nowMs, this.clock.nowMs + 48 * 3600_000, 10)[0]
      : null;
    const cards = buildDiscoveries({
      now: this.clock.now,
      iss,
      snapshotRetrieved: this.snapshotRetrieved,
      nextIssPass: next,
      observer: this.observer,
      articles: this.articles,
    });
    return `<p class="oc-kicker">Discover</p>
      <p>Only calculated, imported or editorial items. Nothing is invented to fill the board.</p>
      ${cards.map((c) => `<article class="oc-card"><p class="oc-kicker">${c.kind}</p><h3><a href="${c.href}">${escapeHtml(c.title)}</a></h3><p>${escapeHtml(c.body)}</p><small>${escapeHtml(c.source)}${c.at ? " · " + formatUtc(c.at) : ""}</small>
        ${c.article ? `<p><a href="${c.article.url}">${escapeHtml(c.article.title)}</a></p>` : ""}</article>`).join("")}`;
  }

  private challengeHtml(): string {
    const p = loadProgress();
    const opts = (this.challenge.options || []).map((o) => `<button type="button" data-act="challenge-opt" data-answer="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("");
    return `<p class="oc-kicker">Daily challenge</p>
      <h3>${escapeHtml(this.challenge.title)}</h3>
      <p>${escapeHtml(this.challenge.body)}</p>
      <div class="oc-actions">${opts}
        <button type="button" data-act="hint">Hint</button>
      </div>
      <p class="oc-fine">Scoring uses today’s challenge definition, not a moving live feed. Progress stays in this browser. A Supabase leaderboard can plug in later without requiring an account for play.</p>
      <p>Streak ${p.streak} day${p.streak === 1 ? "" : "s"} · personal best ${p.best}.</p>`;
  }

  private rightHtml(): string {
    if (!this.selected) {
      return `<p class="oc-kicker">Inspector</p><p>Select a satellite. Hover labels on desktop; tap on a phone. Figures are calculated from the element set below.</p>
        <dl class="oc-dl">
          <div><dt>Simulation</dt><dd>${escapeHtml(this.clockLabel())}</dd></div>
          <div><dt>Quality</dt><dd>${this.quality}</dd></div>
          <div><dt>Loaded objects</dt><dd>${this.visibleObjects().length.toLocaleString()}</dd></div>
        </dl>`;
    }
    const o = this.selected;
    const st = this.states.get(o.norad);
    const rec = this.recs.get(o.norad);
    const look = this.observer && rec && st ? lookAngles(this.observer, st, this.clock.now, rec) : null;
    const fresh = freshnessOf(o.epoch, Date.now());
    return `<p class="oc-kicker">Selected object</p>
      <h3>${escapeHtml(o.name)}</h3>
      <p class="oc-fine">${freshnessLabel(fresh, o.epoch, o.retrievedAt)}</p>
      <dl class="oc-dl">
        <div><dt>NORAD</dt><dd>${o.norad}</dd></div>
        <div><dt>Calculated position</dt><dd>${st ? `${st.latitudeDeg.toFixed(2)}°, ${st.longitudeDeg.toFixed(2)}°` : "…"}</dd></div>
        <div><dt>Altitude</dt><dd>${st ? formatAltitude(st.altitudeKm, this.settings.units) : "—"}</dd></div>
        <div><dt>Inclination</dt><dd>${o.inclinationDeg.toFixed(2)}°</dd></div>
        <div><dt>Orbital period</dt><dd>${st && Number.isFinite(st.periodMin) ? st.periodMin.toFixed(1) + " min" : "—"}</dd></div>
        <div><dt>Approx. velocity</dt><dd>${st ? formatSpeed(st.velocityKmS, this.settings.units) : "—"}</dd></div>
        <div><dt>Element epoch</dt><dd>${formatUtc(o.epoch)}</dd></div>
        <div><dt>Source</dt><dd><a href="${escapeHtml(o.sourceUrl)}" rel="noopener">${escapeHtml(o.sourceId)}</a></dd></div>
        ${o.starlinkGen ? `<div><dt>Catalogue generation</dt><dd>${escapeHtml(o.starlinkGen)} (from the Starlink tracker bake — not an operational status)</dd></div>` : ""}
        ${look ? `<div><dt>From observer</dt><dd>az ${look.azimuthDeg.toFixed(0)}° el ${look.elevationDeg.toFixed(0)}° · ${look.rangeKm.toFixed(0)} km</dd></div>` : ""}
      </dl>
      <div class="oc-actions">
        <button type="button" data-act="follow">Follow</button>
        <button type="button" data-act="orbit">Show orbit</button>
        <button type="button" data-act="track">Ground track</button>
        <button type="button" data-act="share">Share</button>
        <button type="button" data-act="deselect">Close inspector</button>
      </div>
      <p class="oc-fine">Marker scale is illustrative. This is not the spacecraft’s true geometry.</p>`;
  }

  private renderShell(): void {
    this.root.innerHTML = `
      <a class="skip-link" href="#oc-main">Skip to Orbital Command</a>
      <div class="oc-live" data-live role="status" aria-live="polite"></div>
      <header class="oc-top">
        <a class="oc-brand" href="/" aria-label="Supercharged Daily home"><img src="/assets/brand/icon-1b-mark.svg" alt="" width="22" height="22" /> Supercharged Daily</a>
        <p class="oc-title">Orbital Command</p>
        <h1 class="visually-hidden">Orbital Command</h1>
        <label class="oc-search-wrap"><span class="visually-hidden">Search satellites</span>
          <input id="oc-search" type="search" placeholder="Name or NORAD" autocomplete="off" />
        </label>
        <p class="oc-clock" data-clock></p>
        <button type="button" class="oc-icon" data-act="chrome" aria-label="Hide or show interface">View</button>
      </header>
      <div class="oc-results-pop" data-results></div>
      <div class="oc-hover" data-hover hidden></div>
      <div class="oc-globe" data-globe>
        <canvas aria-label="Interactive Earth. Drag to rotate. Select a satellite marker for details."></canvas>
        <div class="oc-fallback" data-fallback hidden></div>
      </div>
      <nav class="oc-modes" aria-label="Orbital Command modes">
        <button type="button" data-act="explore">Explore</button>
        <button type="button" data-act="starlink">Starlink</button>
        <button type="button" data-act="above">Above me</button>
        <button type="button" data-act="missions">Missions</button>
        <button type="button" data-act="discover">Discover</button>
        <button type="button" data-act="challenges">Challenges</button>
      </nav>
      <aside class="oc-left" aria-label="Mode panel"><div data-left-body></div></aside>
      <aside class="oc-right" aria-label="Selection" data-right></aside>
      <footer class="oc-bottom">
        <button type="button" data-act="back" aria-label="Jump back one hour">−1h</button>
        <button type="button" data-act="play">Play / pause</button>
        <button type="button" data-act="now">Now</button>
        <button type="button" data-act="fwd" aria-label="Jump forward one hour">+1h</button>
        <label>Speed
          <select id="oc-speed">${SPEEDS.map((s) => `<option value="${s}">${s}×</option>`).join("")}</select>
        </label>
        <label class="oc-scrub">Time from epoch (h)
          <input id="oc-scrub" type="range" min="-72" max="72" value="0" />
        </label>
        <p class="oc-warn" data-warn></p>
      </footer>
      <details class="oc-settings">
        <summary>Settings &amp; sources</summary>
        <label>Graphics <select id="oc-quality">
          <option value="auto">Auto (${this.quality})</option>
          <option value="high">High</option>
          <option value="balanced">Balanced</option>
          <option value="low">Low</option>
        </select></label>
        <label>Marker density <select id="oc-density">
          <option value="sparse">Sparse</option>
          <option value="reduced" selected>Reduced</option>
          <option value="full">Full</option>
        </select></label>
        <label>Units <select id="oc-units"><option value="metric">km</option><option value="imperial">miles</option></select></label>
        <label>Clock <select id="oc-timefmt"><option value="utc">UTC</option><option value="local">Local</option></select></label>
        <label><input id="oc-motion" type="checkbox" ${this.settings.reducedMotion ? "checked" : ""}/> Reduced motion</label>
        <p class="oc-fine">Earth imagery: NASA Visible Earth (Blue Marble / city lights / clouds). Orbits: CelesTrak GP via a same-origin snapshot. SGP4 via satellite.js. The browser never queries CelesTrak. <a href="/starlink.html">Starlink tracker</a> · <a href="/docs/orbital-command/data-sources.md">Sources</a></p>
      </details>
      <div class="oc-landing" data-landing>
        <p class="oc-kicker">Earth is live. Explore what’s above.</p>
        <h1 id="oc-main">Orbital Command</h1>
        <p>A calculated globe. Real orbital elements. Honest labels.</p>
        <div class="oc-hero-actions">
          <button type="button" data-act="landing-explore">Explore Earth</button>
          <button type="button" data-act="landing-starlink">Track Starlink</button>
          <button type="button" data-act="landing-above">What’s above me?</button>
        </div>
        <button type="button" class="oc-text" data-act="dismiss-landing">Continue</button>
      </div>`;
    if (!this.webgl) {
      const fb = this.root.querySelector("[data-fallback]") as HTMLElement;
      const canvas = this.root.querySelector("canvas");
      if (fb) fb.hidden = false;
      if (canvas) canvas.hidden = true;
    }
  }

  private fmtLocal(iso: string): string {
    const d = new Date(iso);
    if (this.settings.timeFormat === "utc" || !this.observer) return formatUtc(iso);
    try {
      return new Intl.DateTimeFormat("en-IE", { timeZone: this.observer.timeZone, dateStyle: "medium", timeStyle: "short" }).format(d);
    } catch {
      return formatUtc(iso);
    }
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}
