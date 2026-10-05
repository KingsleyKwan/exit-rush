import * as THREE from 'three';
import { TrainScene, DOOR_Z, PLAYER_START } from './TrainScene';
import { Player } from './Player';
import { Crowd } from './Crowd';
import { Effects } from './Effects';
import { InputController } from './Input';
import { GameAudio } from './Audio';
import { haptic } from './haptics';
import { getLevel, type LevelDef } from './levels';
import { modifiersFromSkills } from './SkillTree';
import { loadSave, writeSave, type SaveData } from './storage';
import { setLang, getLang } from '../i18n';
import { Sim } from './sim/Sim';
import { TUNING } from './sim/tuning';
import type { SimEvent, UltKind } from './sim/events';
import type { PlayerInput } from './sim/PlayerSim';

export type GameScreen = 'menu' | 'playing' | 'paused' | 'skills' | 'win' | 'lose';

export interface GameHooks {
  onState: () => void;
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
    setLang(this.save.lang);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.train = new TrainScene(window.innerWidth / window.innerHeight);
    this.player = new Player();
    this.train.scene.add(this.player.mesh);
    this.crowd = new Crowd();
    this.train.scene.add(this.crowd.group);
    this.effects = new Effects();
    this.train.scene.add(this.effects.group);

    const app = canvas.parentElement ?? document.body;
    this.vignette = document.createElement('div');
    this.vignette.className = 'fx-vignette';
    app.insertBefore(this.vignette, canvas.nextSibling);
    this.input = new InputController(canvas, app);
    this.input.cb = {
      onUlt: (k) => this.tryUltimate(k),
      onPause: () => {
        if (this.screen === 'playing' || this.screen === 'paused') this.togglePause();
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

  persist(): void {
    this.save.lang = getLang();
    writeSave(this.save);
  }

  // ------------------------------------------------------------------ HUD API

  get timeLeft(): number {
    return this.sim && !this.sim.ambient ? this.sim.timeLeft : 0;
  }

  staminaFrac(): number {
    const p = this.sim?.player;
    return p ? p.stamina / p.staminaMax : 1;
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
    this.audio.unlock();
    this.audio.arrival();
    this.level = level;
    const sim = new Sim(level, modifiersFromSkills(this.save.skills), Math.random);
    this.bindSim(sim);
    this.player.mesh.visible = true;
    this.resultDelay = -1;
    this.hitStop = 0;
    this.beepT = 0;
    this.input.reset();
    this.shoveBtn = false;
    this.train.setDoorOpenValue(1);
    this.audio.doorOpen();
    this.screen = 'playing';
    this.hooks.onState();
  }

  togglePause(): void {
    if (this.screen === 'playing') {
      this.screen = 'paused';
      this.input.reset();
      this.shoveBtn = false;
    } else if (this.screen === 'paused') {
      this.screen = 'playing';
      this.lastT = performance.now();
    }
    this.hooks.onState();
  }

  goMenu(): void {
    this.screen = 'menu';
    this.level = null;
    this.input.reset();
    this.train.setWarning(0);
    this.makeAmbient();
    this.hooks.onState();
  }

  openSkills(): void {
    this.screen = 'skills';
    this.hooks.onState();
  }

  closeSkillsToMenu(): void {
    this.screen = 'menu';
    this.persist();
    this.hooks.onState();
  }

  tryUltimate(kind: UltKind): void {
    const s = this.save.skills;
    const ok = (kind === 'str' && s.ultStr) || (kind === 'spd' && s.ultSpd) || (kind === 'wis' && s.ultWis);
    if (!ok || this.screen !== 'playing' || !this.sim || this.sim.ambient) return;
    if (this.sim.tryUltimate(kind)) {
      this.audio.ultimate();
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
    if (!this.save.cleared.includes(id)) {
      this.save.cleared.push(id);
      this.save.skills.points += 1;
      this.save.highestCleared = Math.max(this.save.highestCleared, id);
    }
    this.persist();
    this.screen = 'win';
    this.hooks.onState();
  }

  private onLose(): void {
    this.train.setDoorsOpen(false);
    this.train.setWarning(0);
    this.audio.doorClose();
    this.audio.lose();
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
          fx.shockwave(e.x, e.z, 4.5, 0x64ffda, 0.9);
          this.vg.b = 1;
          this.audio.sense();
          haptic([10, 40, 10], 0);
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
    v.b = Math.max(sim?.player.isSensing(sim.time) && !sim.ambient ? 0.45 : 0, v.b - dt * 1.5);
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
    const dt = Math.min(0.1, Math.max(0, (now - this.lastT) / 1000));
    this.lastT = now;
    this.clock += dt;

    const playing = this.screen === 'playing';
    if (this.input.enabled && !playing) this.input.reset();
    this.input.enabled = playing;
    this.input.tick(dt);
    const sim = this.sim;
    let alpha = 1;

    if (sim) {
      const active = this.screen === 'playing' || ((this.screen === 'win' || this.screen === 'lose') && !sim.ambient);
      const runAmbient = sim.ambient && (this.screen === 'menu' || this.screen === 'skills');
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
      this.crowd.update(alpha, dt, this.clock);
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
    this.renderer.render(this.train.scene, this.train.camera);
  }

  private updatePlayFrame(sim: Sim, dt: number): void {
    const p = sim.player;
    const b = p.body;
    const now = sim.time;

    // Result handling (short celebration / slam before the overlay).
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
    this.effects.setPath(p.isSensing(now) ? p.path : [], this.clock);
    // Stench clouds.
    this.stinkT -= dt;
    if (this.stinkT <= 0) {
      this.stinkT = 0.18;
      for (const a of sim.crowd.agents) {
        if (a.kind === 'stench' && Math.random() < 0.5) {
          this.effects.puff(a.body.x, 1.0, a.body.z, 1, 0x9ccc65, 0.25, 1.3, 1.1, 0.5, 0.2);
        }
      }
    }
    // Squeeze feedback: pushing hard into a wall of people.
    if (p.pushing && b.pressure > 0.08 && Math.random() < dt * 6) {
      this.effects.puff(b.x + p.faceX * 0.3, 0.9, b.z + p.faceZ * 0.3, 1, 0xffffff, 0.6, 0.6, 0.3);
      this.train.addTrauma(0.02);
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
    this.input.dispose();
    this.renderer.dispose();
  }
}

export { DOOR_Z };
