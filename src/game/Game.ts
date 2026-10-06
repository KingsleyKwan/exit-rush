import * as THREE from 'three';
import { TrainScene, DOOR_Z, PLAYER_START } from './TrainScene';
import { openDoorBays } from './sim/tuning';
import { Player } from './Player';
import { Crowd } from './Crowd';
import { Effects } from './Effects';
import { InputController } from './Input';
import { GameAudio } from './Audio';
import { haptic } from './haptics';
import { getLevel, playableLevels, isFinaleUnlocked, type LevelDef } from './levels';
import { MAX_POINTS_PER_LEVEL, POINTS_PER_FIRST_CLEAR, modifiersFromSkills } from './SkillTree';
import type { IntroKind } from './intros';
import type { PassengerKind } from './PassengerTypes';
import { loadSave, writeSave, type QualityLevel, type QualitySetting, type SaveData, type SkillState } from './storage';
import { FpsProbe, PROBE_MIN_FPS, pixelRatioFor, resolveQuality } from './quality';
import { setLang, getLang, t } from '../i18n';
import { Sim } from './sim/Sim';
import { TUNING } from './sim/tuning';
import type { SimEvent, UltKind } from './sim/events';
import type { PlayerInput } from './sim/PlayerSim';

export type GameScreen = 'menu' | 'levels' | 'legend' | 'intro' | 'playing' | 'paused' | 'skills' | 'win' | 'lose';

/** Screens drawn over the full-bleed key art (the 3D view is hidden, so skip rendering it). */
const BACKDROP_SCREENS: GameScreen[] = ['menu', 'levels', 'legend'];

export interface GameHooks {
  onState: () => void;
  /** Transient notice (e.g. storage unavailable). */
  onToast?: (msg: string) => void;
}

/** Result of the last clear, for the win overlay. */
export interface ClearResult {
  /** How many times this level has now been cleared. */
  count: number;
  /** Whether this clear awarded a skill point. */
  awarded: boolean;
}

const NO_INPUT: PlayerInput = { x: 0, z: 0, mag: 0, shoveHeld: false };

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly train: TrainScene;
  readonly player: Player;
  readonly crowd: Crowd;
  readonly effects: Effects;
  readonly input: InputController;
  readonly audio = new GameAudio();
  save: SaveData;
  screen: GameScreen = 'menu';
  level: LevelDef | null = null;
  sim: Sim | null = null;
  /** Real time of the last milestone (for HUD pulse). */
  milestoneAt = -10;
  /** Screen to return to when the skill tree closes (menu, or a paused / finished run). */
  skillsReturn: GameScreen = 'menu';
  /** True when the current pause was triggered by backgrounding / blur. */
  autoPaused = false;
  /** Skills the current run was started with (spending mid-run applies on the next run). */
  runSkills: SkillState;
  lastClear: ClearResult | null = null;
  /** Active intro card kind (screen === 'intro'). */
  pendingIntro: IntroKind | null = null;
  /** HUD tip chip kind while playing a reinforce level. */
  activeTip: PassengerKind | null = null;
  /** Show FTUE ghost-hand on L1. */
  showFtueGhost = false;
  /** Seconds remaining for FTUE ghost (visual only). */
  ftueGhostT = 0;
  /** Level-start door-count banner countdown (seconds). 0 = hidden. */
  doorBannerT = 0;
  /** Open-door count shown on the level-start banner. */
  doorBannerOpen = 0;
  /** Rate-limit closed-door toast (sim time of last toast). */
  private closedDoorToastAt = -99;
  /** Resolved render tier currently applied. */
  quality: QualityLevel = 'high';
  /** Whether the WebGL context was created with antialias (fixed for its lifetime). */
  readonly antialias: boolean;
  private probe = new FpsProbe();
  private saveWarned = false;
  private shoveBtn = false;
  private acc = 0;
  private hitStop = 0;
  private raf = 0;
  private lastT = 0;
  /** Real seconds since boot (render clock). */
  clock = 0;
  private hudT = 0;
  private beepT = 0;
  private ghostT = 0;
  private stinkT = 0;
  /** 大聲公 chatter-blip timer. */
  private chatterT = 0;
  private resultDelay = -1;
  private hooks: GameHooks;
  private canvas: HTMLCanvasElement;
  private vignette: HTMLDivElement;
  private vg = { g: 0, r: 0, b: 0, f: 0, fr: 0 };
  private vgApplied = { g: -1, r: -1, b: -1, f: -1 };

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.save = loadSave();
    this.runSkills = { ...this.save.skills };
    setLang(this.save.lang);
    this.audio.applySettings({
      master: this.save.masterVol,
      music: this.save.musicVol,
      sfx: this.save.sfxVol,
      muted: this.save.muted,
    });

    const q = resolveQuality(this.save.quality, this.save.autoQuality);
    this.antialias = q === 'high';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.antialias, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.train = new TrainScene(window.innerWidth / window.innerHeight);
    this.player = new Player();
    this.train.scene.add(this.player.mesh);
    this.crowd = new Crowd();
    this.train.scene.add(this.crowd.group);
    this.effects = new Effects();
    this.train.scene.add(this.effects.group);
    this.crowd.setIcons(this.save.typeIcons);
    this.applyQuality(q);
    this.probe.done = !this.probeWanted();

    const app = canvas.parentElement ?? document.body;
    this.vignette = document.createElement('div');
    this.vignette.className = 'fx-vignette';
    app.insertBefore(this.vignette, canvas.nextSibling);
    this.input = new InputController(canvas, app);
    this.input.cb = {
      onUlt: (k) => this.tryUltimate(k),
      onPause: () => {
        if (this.screen === 'skills') this.closeSkills();
        else if (this.screen === 'playing' || this.screen === 'paused') this.togglePause();
      },
    };

    // Ambient crowd behind the menu.
    this.makeAmbient();

    const params = new URLSearchParams(location.search);
    if (import.meta.env.DEV || params.has('debug')) {
      (window as unknown as Record<string, unknown>).__game = this;
      (window as unknown as Record<string, unknown>).TUNING = TUNING;
    }

    window.addEventListener('resize', this.onResize);
    // Mobile lifecycle: never let the door timer run while the player can't see it.
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onBackground);
    window.addEventListener('pageshow', this.onForeground);
    window.addEventListener('blur', this.onWindowBlur);
    this.lastT = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  private makeAmbient(): void {
    const lv = getLevel(5) ?? getLevel(1);
    if (!lv) return;
    const sim = new Sim(lv, modifiersFromSkills(this.save.skills), Math.random);
    sim.ambient = true;
    sim.player.body.enabled = false;
    this.bindSim(sim);
    this.setStationFor(lv);
    this.train.setOpenBays(openDoorBays(lv.id));
  }

  /** Platform sign + strip map: this level's station with its neighbours in the level list. */
  private setStationFor(lv: LevelDef): void {
    const list = playableLevels();
    const i = Math.max(0, list.findIndex((l) => l.id === lv.id));
    const lo = Math.max(0, Math.min(i - 2, list.length - 5));
    this.train.setStation(lv, list.slice(lo, lo + 5));
  }

  private bindSim(sim: Sim): void {
    this.sim = sim;
    this.crowd.bind(sim.crowd);
    this.effects.clear();
    this.acc = 0;
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.train.setAspect(w / h);
  };

  private onVisibility = (): void => {
    if (document.hidden) this.onBackground();
    else this.onForeground();
  };

  /** Tab hidden / app backgrounded / page unloading: pause the run and silence audio. */
  private onBackground = (): void => {
    this.pause(true);
    this.input.reset();
    this.shoveBtn = false;
    this.audio.suspend();
  };

  /** Back in view: resume audio, but the run stays paused until the player taps Resume. */
  private onForeground = (): void => {
    if (document.hidden) return;
    this.lastT = performance.now();
    this.acc = 0;
    this.probe.restart();
    this.audio.resume();
  };

  private onWindowBlur = (): void => {
    this.pause(true);
  };

  persist(): void {
    this.save.lang = getLang();
    const ok = writeSave(this.save);
    if (!ok && !this.saveWarned) {
      this.saveWarned = true;
      this.hooks.onToast?.(t().saveFailed);
    }
  }

  // ----------------------------------------------------------------- quality

  /** Apply a render tier live. Antialias is fixed per WebGL context (see `antialias`). */
  private applyQuality(q: QualityLevel): void {
    this.quality = q;
    this.renderer.setPixelRatio(pixelRatioFor(q));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const shadows = q === 'high';
    this.train.setShadows(shadows);
    this.crowd.setDetail(q);
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows;
      // Shadow defines are baked into shader programs — force a recompile.
      this.train.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
        else if (m) m.needsUpdate = true;
      });
    }
  }

  private probeWanted(): boolean {
    return this.save.quality === 'auto' && this.save.autoQuality === null;
  }

  /** User setting: auto → low → high. Re-runs the probe when switching back to auto. */
  setQuality(setting: QualitySetting): void {
    this.save.quality = setting;
    if (setting === 'auto') {
      this.save.autoQuality = null;
      this.probe.reset();
    } else {
      this.probe.done = true;
    }
    this.applyQuality(resolveQuality(setting, this.save.autoQuality));
    this.persist();
    this.hooks.onState();
  }

  /** Settings toggle: floating passenger-type icons. */
  setMuted(muted: boolean): void {
    this.save.muted = muted;
    this.audio.setMuted(muted);
    this.persist();
    this.hooks.onState();
  }

  toggleMute(): void {
    this.setMuted(!this.save.muted);
  }

  setMasterVol(v: number): void {
    this.save.masterVol = v;
    this.audio.setMaster(v);
    this.persist();
  }

  setMusicVol(v: number): void {
    this.save.musicVol = v;
    this.audio.setMusic(v);
    this.persist();
  }

  setSfxVol(v: number): void {
    this.save.sfxVol = v;
    this.audio.setSfx(v);
    this.persist();
  }

  setTypeIcons(on: boolean): void {
    this.save.typeIcons = on;
    this.crowd.setIcons(on);
    this.persist();
    this.hooks.onState();
  }

  /** True when the chosen tier wants a different antialias than the live context has. */
  needsReloadForAA(): boolean {
    return (this.quality === 'high') !== this.antialias;
  }

  private tickProbe(rawDt: number): void {
    if (this.probe.done || document.hidden) return;
    const fps = this.probe.sample(rawDt);
    if (fps === null) return;
    const result: QualityLevel = this.quality === 'high' && fps < PROBE_MIN_FPS ? 'low' : this.quality;
    this.save.autoQuality = result;
    if (result !== this.quality) this.applyQuality(result);
    this.persist();
    if (this.screen !== 'playing') this.hooks.onState();
  }

  // ------------------------------------------------------------------ HUD API

  get timeLeft(): number {
    return this.sim && !this.sim.ambient ? this.sim.timeLeft : 0;
  }

  staminaFrac(): number {
    const p = this.sim?.player;
    return p ? p.stamina / p.staminaMax : 1;
  }

  /** 大聲公: current loudmouth noise drain on the player (stamina/s; 0 outside every zone). */
  noiseDrain(): number {
    return this.sim && !this.sim.ambient ? this.sim.player.noiseDrain : 0;
  }

  isWinded(): boolean {
    return this.sim?.player.winded ?? false;
  }

  /** 0 = ready … 1 = just used. */
  shoveCooldown(): number {
    const p = this.sim?.player;
    return p ? p.shoveCd / TUNING.player.shove.cooldown : 0;
  }

  shoveCharge(): number {
    return this.sim?.player.shoveCharge ?? 0;
  }

  ultCooldown(kind: UltKind): number {
    const p = this.sim?.player;
    return p ? p.ultCd[kind] / TUNING.ult.cooldown : 0;
  }

  /** 0–1 remaining cooldown of a Tier-3 active ('leap' | 'wind'). */
  activeCooldown(id: 'leap' | 'wind'): number {
    const p = this.sim?.player;
    if (!p) return 0;
    const K = TUNING.skills;
    return id === 'leap' ? p.activeCd.leap / K.leapCd : p.activeCd.wind / K.secondWindCd;
  }

  ultActive(kind: UltKind): boolean {
    const p = this.sim?.player;
    if (!p || !this.sim) return false;
    const now = this.sim.time;
    return kind === 'str' ? p.isCharging(now) : kind === 'spd' ? p.isDashing(now) : p.isSensing(now);
  }

  doorProgress(): number {
    return this.sim && !this.sim.ambient ? this.sim.doorProgress() : 0;
  }

  setShoveHeld(held: boolean): void {
    this.shoveBtn = held;
  }

  // -------------------------------------------------------------- flow control

  startLevel(id: number): void {
    const level = getLevel(id);
    if (!level || !level.playable) return;
    if (id === 100 && !isFinaleUnlocked(this.save.cleared, this.save.highestCleared)) {
      this.hooks.onToast?.(t().finaleLocked);
      return;
    }
    this.audio.unlock();
    this.audio.arrival();
    this.audio.announce(getLang());
    this.level = level;
    this.setStationFor(level);
    this.train.setOpenBays(openDoorBays(level.id));
    this.train.flashAnnouncement(level, getLang());
    this.audio.startAmbience(level.density, level.id === 100);
    this.lastClear = null;
    this.autoPaused = false;
    this.pendingIntro = null;
    this.activeTip = level.tipKind ?? null;
    const openN = openDoorBays(level.id).length;
    // Banner when fewer than 3 doors open (L8–15: 2, L16+: 1).
    this.doorBannerOpen = openN;
    this.doorBannerT = openN < 3 ? 3.6 : 0;
    this.closedDoorToastAt = -99;
    this.runSkills = { ...this.save.skills };
    const sim = new Sim(level, modifiersFromSkills(this.runSkills), Math.random);
    this.bindSim(sim);
    this.player.mesh.visible = true;
    this.resultDelay = -1;
    this.hitStop = 0;
    this.beepT = 0;
    this.input.reset();
    this.shoveBtn = false;
    this.train.setDoorOpenValue(1);
    this.audio.doorOpen();

    // FTUE ghost on first L1
    this.showFtueGhost = id === 1 && !this.save.ftueDone;
    this.ftueGhostT = this.showFtueGhost ? 5 : 0;

    const intro = level.introKind;
    if (intro && !this.save.seenIntros.includes(intro)) {
      this.pendingIntro = intro as IntroKind;
      this.screen = 'intro';
    } else {
      this.screen = 'playing';
    }
    this.hooks.onState();
  }

  /** Dismiss the intro card and start the door timer. */
  dismissIntro(markSeen = true): void {
    if (this.screen !== 'intro' || !this.pendingIntro) return;
    if (markSeen && !this.save.seenIntros.includes(this.pendingIntro)) {
      this.save.seenIntros.push(this.pendingIntro);
      this.persist();
    }
    this.activeTip = this.pendingIntro;
    this.pendingIntro = null;
    this.screen = 'playing';
    this.lastT = performance.now();
    this.audio.unlock();
    this.hooks.onState();
  }

  /** Re-show an intro card from the legend (does not start a level). */
  reviewIntro(kind: IntroKind): void {
    if (this.level) return; // only from menu/legend
    this.pendingIntro = kind;
    if (!this.save.seenIntros.includes(kind)) {
      this.save.seenIntros.push(kind);
      this.persist();
    }
    this.screen = 'intro';
    this.skillsReturn = 'legend';
    this.hooks.onState();
  }

  /** Close a legend-only intro review. */
  closeIntroReview(): void {
    if (this.screen !== 'intro' || this.level) return;
    this.pendingIntro = null;
    this.screen = 'legend';
    this.hooks.onState();
  }

  /** Mark FTUE complete once the player has dragged or time ran out. */
  completeFtue(): void {
    if (!this.save.ftueDone) {
      this.save.ftueDone = true;
      this.persist();
    }
    this.showFtueGhost = false;
    this.ftueGhostT = 0;
  }

  /** First launch: jump straight into L1. */
  tryAutoFtue(): void {
    if (this.save.ftueDone || this.save.cleared.length > 0) return;
    if (this.screen !== 'menu') return;
    this.startLevel(1);
  }

  /** Pause a running level (no-op otherwise). `auto` = backgrounded / blurred. */
  pause(auto = false): void {
    if (this.screen === 'intro') return;
    if (this.screen !== 'playing') return;
    this.screen = 'paused';
    this.autoPaused = auto;
    this.input.reset();
    this.shoveBtn = false;
    this.hooks.onState();
  }

  resume(): void {
    if (this.screen !== 'paused') return;
    this.screen = 'playing';
    this.autoPaused = false;
    this.lastT = performance.now();
    this.audio.unlock();
    this.hooks.onState();
  }

  togglePause(): void {
    if (this.screen === 'playing') this.pause();
    else if (this.screen === 'paused') this.resume();
  }

  /** Menu sub-screens (level select, passenger legend). Only from outside a run. */
  openScreen(screen: 'levels' | 'legend' | 'menu'): void {
    if (this.level) return this.goMenu();
    this.screen = screen;
    this.hooks.onState();
  }

  /** True while a full-screen menu backdrop hides the 3D view. */
  get backdrop(): boolean {
    return BACKDROP_SCREENS.includes(this.screen) || (this.screen === 'skills' && !this.skillsOverRun);
  }

  /** Explicitly abandon the run (if any) and return to the main menu. */
  goMenu(): void {
    this.screen = 'menu';
    this.skillsReturn = 'menu';
    this.autoPaused = false;
    this.pendingIntro = null;
    this.activeTip = null;
    this.showFtueGhost = false;
    this.level = null;
    this.input.reset();
    this.train.setWarning(0);
    this.audio.stopAmbience();
    this.makeAmbient();
    this.hooks.onState();
  }

  /**
   * Open the skill tree as an overlay. From a run it pauses first and remembers
   * where to go back to; the run itself is untouched.
   */
  openSkills(): void {
    if (this.screen === 'skills') return;
    if (this.screen === 'playing') this.pause();
    this.skillsReturn = this.screen;
    this.screen = 'skills';
    this.hooks.onState();
  }

  /** True while the skill tree is open on top of a (paused or finished) run. */
  get skillsOverRun(): boolean {
    return this.screen === 'skills' && this.skillsReturn !== 'menu' && !!this.level;
  }

  /** Close the skill tree and return to wherever it was opened from. */
  closeSkills(): void {
    if (this.screen !== 'skills') return;
    this.screen = this.level ? this.skillsReturn : 'menu';
    this.skillsReturn = 'menu';
    this.persist();
    this.hooks.onState();
  }

  tryUltimate(kind: UltKind): void {
    const s = this.runSkills;
    const ok = (kind === 'str' && s.ultStr) || (kind === 'spd' && s.ultSpd) || (kind === 'sta' && s.ultSta);
    if (!ok || this.screen !== 'playing' || !this.sim || this.sim.ambient) return;
    if (this.sim.tryUltimate(kind)) {
      this.audio.ultimate();
      this.hooks.onState();
    }
  }

  tryLeap(): void {
    if (this.screen !== 'playing' || !this.sim || this.sim.ambient) return;
    if (this.sim.tryLeap()) {
      this.audio.dash();
      this.hooks.onState();
    }
  }

  trySecondWind(): void {
    if (this.screen !== 'playing' || !this.sim || this.sim.ambient) return;
    if (this.sim.trySecondWind()) {
      this.audio.skillPoint();
      this.hooks.onState();
    }
  }

  private onWin(): void {
    if (!this.level) return;
    this.train.setDoorsOpen(true);
    this.train.setWarning(0);
    this.audio.win();
    haptic([20, 40, 20, 40, 80], 0);
    this.train.addTrauma(0.2);
    const id = this.level.id;
    const count = (this.save.clears[id] ?? 0) + 1;
    this.save.clears[id] = count;
    if (!this.save.cleared.includes(id)) this.save.cleared.push(id);
    this.save.highestCleared = Math.max(this.save.highestCleared, id);
    // v0.5: first clear only, POINTS_PER_FIRST_CLEAR each (no replay SP).
    const awarded = count <= MAX_POINTS_PER_LEVEL;
    if (awarded) {
      this.save.skills.points += POINTS_PER_FIRST_CLEAR;
      this.audio.skillPoint();
    }
    if (id === 1) this.completeFtue();
    this.lastClear = { count, awarded };
    this.audio.stopAmbience();
    this.persist();
    this.screen = 'win';
    this.hooks.onState();
  }

  private onLose(): void {
    this.train.setDoorsOpen(false);
    this.train.setWarning(0);
    this.audio.doorClose();
    this.audio.lose();
    this.audio.stopAmbience();
    haptic([80, 50, 120], 0);
    this.screen = 'lose';
    this.hooks.onState();
  }

  // ------------------------------------------------------------------- juice

  private handleEvent(e: SimEvent): void {
    const fx = this.effects;
    const cam = this.train;
    const sim = this.sim!;
    switch (e.t) {
      case 'bump': {
        const p = Math.min(1, e.power / 3);
        if (e.player) {
          fx.puff(e.x, 0.75, e.z, 2 + Math.round(p * 4), 0xffffff, 1 + p * 1.6, 0.7 + p * 0.6, 0.35);
          cam.addTrauma(0.04 + p * 0.12);
          this.audio.thud(e.power);
          if (p > 0.45) haptic(8 + Math.round(p * 16));
        } else {
          fx.puff(e.x, 0.6, e.z, 2, 0xd0d0d0, 0.8, 0.6, 0.3);
        }
        break;
      }
      case 'shove': {
        const hit = e.hits > 0;
        fx.spray(e.x, e.z, e.dx, e.dz, 8 + e.hits * 3, 0xfff3c4, 1 + 3.5 * e.power);
        cam.addTrauma((hit ? 0.14 : 0.05) + 0.16 * e.power * (hit ? 1 : 0.3));
        cam.kickCamera(e.dx, e.dz, 1.4 * e.power);
        cam.punchFov(2.5 * e.power);
        this.audio.shove(e.power);
        haptic(hit ? 15 + Math.round(25 * e.power) : 8, 0);
        if (hit && e.power > 0.8) this.hitStop = Math.max(this.hitStop, 0.045);
        break;
      }
      case 'shoveHit':
        fx.puff(e.x, 0.85, e.z, 4, 0xffffff, 2, 1, 0.35);
        break;
      case 'angryWindup': {
        this.audio.angryWindup();
        const a = sim.crowd.agents.find((ag) => ag.id === e.agentId);
        if (a) fx.puff(a.body.x, 1.45, a.body.z, 4, 0xff5252, 0.4, 0.9, 0.45, 1.2, 0);
        break;
      }
      case 'angryHit':
        cam.addTrauma(0.55);
        cam.kickCamera(e.dx, e.dz, 2.6);
        this.hitStop = Math.max(this.hitStop, 0.07);
        this.vg.r = Math.max(this.vg.r, 0.8);
        fx.puff(e.x, 0.9, e.z, 12, 0xff5252, 2.6, 1.2, 0.45);
        this.player.punch(4);
        this.audio.angryHit();
        haptic([35, 30, 60], 0);
        break;
      case 'ult':
        if (e.kind === 'str') {
          fx.shockwave(e.x, e.z, TUNING.ult.str.radius, 0xffb74d, 0.55);
          fx.shockwave(e.x, e.z, TUNING.ult.str.radius * 0.6, 0xffffff, 0.3);
          fx.puff(e.x, 0.3, e.z, 28, 0xffcc80, 5, 1.4, 0.6, 0.6);
          cam.addTrauma(0.85);
          cam.punchFov(6);
          this.hitStop = Math.max(this.hitStop, 0.09);
          this.vg.f = Math.max(this.vg.f, 0.7);
          this.audio.shockwave();
          haptic([60, 30, 90], 0);
        } else if (e.kind === 'spd') {
          fx.spray(e.x, e.z, -e.dx, -e.dz, 14, 0x80deea, 3);
          cam.punchFov(9);
          cam.kickCamera(e.dx, e.dz, 2.2);
          this.audio.dash();
          haptic(30, 0);
        } else {
          // STA Iron Stance
          fx.shockwave(e.x, e.z, 2.8, 0xffd54f, 0.7);
          fx.puff(e.x, 0.4, e.z, 16, 0xffe082, 2.2, 1.0, 0.5);
          this.vg.b = 0.85;
          this.audio.sense();
          haptic([20, 30, 40], 0);
        }
        break;
      case 'milestone': {
        const b = sim.player.body;
        fx.puff(b.x, 0.2, b.z, 8, 0x69f0ae, 1.6, 0.9, 0.5, 1.5);
        this.audio.milestone(e.pct);
        this.milestoneAt = this.clock;
        haptic(12);
        break;
      }
      case 'winded': {
        const b = sim.player.body;
        fx.puff(b.x, 1.4, b.z, 7, 0x81d4fa, 0.8, 0.8, 0.6, 1.8, -3);
        this.audio.winded();
        haptic([15, 60, 15], 0);
        break;
      }
      case 'win': {
        const b = sim.player.body;
        for (const c of [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff]) fx.puff(b.x, 1.2, b.z, 8, c, 3, 1.2, 0.9, 3, -5);
        break;
      }
      case 'lose':
        cam.addTrauma(0.45);
        break;
    }
  }

  private updateVignette(dt: number): void {
    const v = this.vg;
    const sim = this.sim;
    let green = 0;
    let warnPulse = 0;
    if (sim && !sim.ambient && (this.screen === 'playing' || this.screen === 'paused')) {
      const b = sim.player.body;
      green = sim.crowd.auraSlowAt(b.x, b.z) * (1 - sim.player.mods.auraResist) * 1.3;
      const W = TUNING.door.warnTime;
      if (sim.timeLeft < W && !sim.result) {
        const u = 1 - sim.timeLeft / W;
        warnPulse = (0.25 + 0.45 * u) * (0.5 + 0.5 * Math.sin(this.clock * (4 + u * 14)));
      }
    }
    v.g += (Math.min(1, green) - v.g) * Math.min(1, dt * 5);
    v.r = Math.max(warnPulse, v.r - dt * 2.2);
    v.b = Math.max(sim?.player.isIronStance(sim.time) && !sim.ambient ? 0.45 : 0, v.b - dt * 1.5);
    v.f = Math.max(0, v.f - dt * 3);
    const st = this.vignette.style;
    const ap = this.vgApplied;
    const set = (k: 'g' | 'r' | 'b' | 'f', val: number) => {
      if (Math.abs(ap[k] - val) > 0.01) {
        ap[k] = val;
        st.setProperty(`--${k}`, val.toFixed(3));
      }
    };
    set('g', v.g);
    set('r', v.r);
    set('b', v.b);
    set('f', v.f);
  }

  // -------------------------------------------------------------------- loop

  private loop(now: number): void {
    this.raf = requestAnimationFrame(this.loop);
    const rawDt = (now - this.lastT) / 1000;
    const dt = Math.min(0.1, Math.max(0, rawDt));
    this.lastT = now;
    this.tickProbe(rawDt);
    this.clock += dt;

    const playing = this.screen === 'playing';
    if (this.input.enabled && !playing) this.input.reset();
    this.input.enabled = playing;
    this.input.tick(dt);
    const sim = this.sim;
    let alpha = 1;

    if (sim) {
      const active = this.screen === 'playing' || ((this.screen === 'win' || this.screen === 'lose') && !sim.ambient);
      const runAmbient = sim.ambient && (this.screen === 'skills' || BACKDROP_SCREENS.includes(this.screen));
      if (active || runAmbient) {
        const fixed = 1 / TUNING.physics.hz;
        if (this.hitStop > 0) {
          this.hitStop -= dt;
        } else {
          this.acc += dt;
        }
        const d = this.input.drag;
        const input: PlayerInput =
          this.screen === 'playing' && !sim.ambient && this.resultDelay < 0
            ? { x: d.intentX, z: d.intentZ, mag: d.magnitude, shoveHeld: this.shoveBtn || this.input.shoveKey }
            : NO_INPUT;
        let steps = 0;
        while (this.acc >= fixed && steps < TUNING.physics.maxSubSteps) {
          sim.step(fixed, input);
          this.acc -= fixed;
          steps++;
        }
        if (steps >= TUNING.physics.maxSubSteps) this.acc = 0;
        alpha = this.acc / fixed;
        for (const e of sim.events) this.handleEvent(e);
        sim.events.length = 0;
      }

      if (!sim.ambient) this.updatePlayFrame(sim, dt);
      this.train.setDoorOpenValue(sim.doorOpen);
      const pb = sim.player.body;
      this.crowd.update(alpha, dt, this.clock, this.train.camera, sim.ambient ? null : { x: pb.x, z: pb.z });
      this.player.mesh.visible = !sim.ambient;
      this.player.update(sim.player, alpha, dt, sim.time, this.clock);
      const b = sim.player.body;
      const camTarget = sim.ambient ? { x: 0, z: PLAYER_START.z + Math.sin(this.clock * 0.2) * 0.6 } : { x: b.px + (b.x - b.px) * alpha, z: b.pz + (b.z - b.pz) * alpha };
      this.train.follow(camTarget, dt);
    } else {
      this.train.follow({ x: 0, z: PLAYER_START.z }, dt);
    }

    this.train.update(dt);
    this.effects.update(dt);
    this.updateVignette(dt);
    // Menus cover the canvas with key art: don't burn GPU / battery drawing under it.
    if (!this.backdrop) this.renderer.render(this.train.scene, this.train.camera);
  }

  private updatePlayFrame(sim: Sim, dt: number): void {
    const p = sim.player;
    const b = p.body;
    const now = sim.time;

    // Result handling (short celebration / slam before the overlay).
    if (this.showFtueGhost && this.screen === 'playing') {
      this.ftueGhostT -= dt;
      if (this.input.drag.magnitude > 0.25 || this.ftueGhostT <= 0) {
        this.completeFtue();
        this.hooks.onState();
      }
    }

    if (sim.result && this.screen === 'playing') {
      if (this.resultDelay < 0) {
        this.resultDelay = sim.result === 'win' ? 0.55 : 0.35;
        if (sim.result === 'lose') {
          this.audio.doorClose();
          this.train.addTrauma(0.5);
        }
      }
      this.resultDelay -= dt;
      if (this.resultDelay <= 0) {
        if (sim.result === 'win') this.onWin();
        else this.onLose();
      }
    }

    if (this.screen !== 'playing') {
      this.effects.setPath([], this.clock);
      return;
    }

    // Door-closing warning: lights + beeps speeding up in the last seconds.
    const W = TUNING.door.warnTime;
    if (!sim.result && sim.timeLeft < W) {
      const u = 1 - sim.timeLeft / W;
      this.train.setWarning(u);
      this.beepT -= dt;
      if (this.beepT <= 0) {
        this.beepT = 0.6 - 0.47 * u;
        this.audio.warnBeep(u);
        if (u > 0.6) haptic(6, 0);
      }
    } else {
      this.train.setWarning(0);
    }

    // Closed-door push feedback (toast + flash + buzz), rate-limited ~2s.
    if (!sim.result) {
      const d = this.input.drag;
      const bay = sim.closedBayPush(d.intentX, d.magnitude);
      if (bay !== null && now - this.closedDoorToastAt >= 2) {
        this.closedDoorToastAt = now;
        this.train.flashClosedBay(bay);
        this.audio.deny();
        haptic(10, 30);
        this.hooks.onToast?.(t().doorClosedToast);
      }
    }

    if (this.doorBannerT > 0) {
      this.doorBannerT = Math.max(0, this.doorBannerT - dt);
    }

    // SPD afterimages.
    if (p.isDashing(now)) {
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostT = 0.035;
        this.effects.ghost(b.x, b.z, Math.atan2(p.faceX, p.faceZ));
      }
      this.train.setFovExtra(6);
    } else {
      this.train.setFovExtra(0);
    }
    // STR charge dust trail.
    if (p.isCharging(now) && Math.random() < dt * 25) {
      this.effects.puff(b.x, 0.1, b.z, 1, 0xffcc80, 0.8, 0.9, 0.4, 0.4);
    }
    // WIS path highlight.
    this.effects.setPath([], this.clock);
    // Stench clouds (Low quality stand-in for the wavy lines + flies) and angry steam.
    this.stinkT -= dt;
    if (this.stinkT <= 0) {
      this.stinkT = 0.18;
      const low = this.quality === 'low';
      for (const a of sim.crowd.agents) {
        if (a.kind === 'stench' && Math.random() < (low ? 0.5 : 0.15)) {
          this.effects.puff(a.body.x, 1.0, a.body.z, 1, 0x9ccc65, 0.25, 1.3, 1.1, 0.5, 0.2);
        } else if (a.kind === 'angry' && a.windup >= 0) {
          const side = Math.random() < 0.5 ? -1 : 1;
          this.effects.puff(a.body.x + side * 0.2, 1.35, a.body.z, 2, 0xf4f4f4, 0.5, 1.1, 0.55, 1.6, 0.4);
        }
      }
    }
    // Squeeze feedback: pushing hard into a wall of people.
    if (p.pushing && b.pressure > 0.08 && Math.random() < dt * 6) {
      this.effects.puff(b.x + p.faceX * 0.3, 0.9, b.z + p.faceZ * 0.3, 1, 0xffffff, 0.6, 0.6, 0.3);
      this.train.addTrauma(0.02);
    }

    // 大聲公: muffled chatter blips while you're inside a noise zone (synth only).
    this.chatterT -= dt;
    if (p.noiseDrain > 0 && this.chatterT <= 0) {
      this.chatterT = 0.28 + Math.random() * 0.3;
      this.audio.chatter(Math.min(1, p.noiseDrain / TUNING.types.loud.drainPeak));
    }
    // HUD refresh at ~12 Hz.
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.08;
      this.hooks.onState();
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onBackground);
    window.removeEventListener('pageshow', this.onForeground);
    window.removeEventListener('blur', this.onWindowBlur);
    this.crowd.dispose();
    this.input.dispose();
    this.renderer.dispose();
  }
}

export { DOOR_Z };
