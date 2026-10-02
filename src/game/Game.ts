import * as THREE from 'three';
import { TrainScene, DOOR_Z, PLAYER_START } from './TrainScene';
import { Player } from './Player';
import { Crowd } from './Crowd';
import { InputController } from './Input';
import { GameAudio } from './Audio';
import { getLevel, type LevelDef } from './levels';
import { modifiersFromSkills } from './SkillTree';
import { loadSave, writeSave, type SaveData } from './storage';
import { setLang, getLang } from '../i18n';

export type GameScreen = 'menu' | 'playing' | 'paused' | 'skills' | 'win' | 'lose';

export interface GameHooks {
  onState: () => void;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly train: TrainScene;
  readonly player: Player;
  readonly crowd: Crowd;
  readonly input: InputController;
  readonly audio = new GameAudio();
  save: SaveData;
  screen: GameScreen = 'menu';
  level: LevelDef | null = null;
  timeLeft = 0;
  private lastPushSfx = 0;
  private raf = 0;
  private lastT = 0;
  private clock = 0;
  private hooks: GameHooks;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.save = loadSave();
    setLang(this.save.lang);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.train = new TrainScene(window.innerWidth / window.innerHeight);
    this.player = new Player();
    this.train.scene.add(this.player.mesh);
    this.crowd = new Crowd();
    this.train.scene.add(this.crowd.group);
    this.input = new InputController(canvas);

    window.addEventListener('resize', this.onResize);
    this.lastT = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
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

  startLevel(id: number): void {
    const level = getLevel(id);
    if (!level || !level.playable) return;
    this.audio.unlock();
    this.audio.arrival();
    this.level = level;
    this.timeLeft = level.timer;
    this.clock = 0;
    const mods = modifiersFromSkills(this.save.skills);
    this.player.reset(mods);
    this.crowd.spawnForLevel(level, DOOR_Z);
    this.train.setDoorsOpen(true);
    this.audio.doorOpen();
    this.screen = 'playing';
    this.hooks.onState();
  }

  togglePause(): void {
    if (this.screen === 'playing') {
      this.screen = 'paused';
    } else if (this.screen === 'paused') {
      this.screen = 'playing';
    }
    this.hooks.onState();
  }

  goMenu(): void {
    this.screen = 'menu';
    this.level = null;
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

  tryUltimate(kind: 'str' | 'spd' | 'wis'): void {
    const s = this.save.skills;
    const ok =
      (kind === 'str' && s.ultStr) ||
      (kind === 'spd' && s.ultSpd) ||
      (kind === 'wis' && s.ultWis);
    if (!ok || this.screen !== 'playing') return;
    if (this.player.activateUltimate(kind, this.clock)) {
      this.audio.ultimate();
      this.hooks.onState();
    }
  }

  private onWin(): void {
    if (!this.level) return;
    this.train.setDoorsOpen(true);
    this.audio.win();
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
    this.audio.doorClose();
    this.audio.lose();
    this.screen = 'lose';
    this.hooks.onState();
  }

  private loop(now: number): void {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;

    this.input.tick(dt);
    this.train.update(dt);

    if (this.screen === 'playing' && this.level) {
      this.clock += dt;
      this.timeLeft -= dt;
      const mods = modifiersFromSkills(this.save.skills);
      const pushDir = new THREE.Vector3(
        this.input.drag.intentX,
        0,
        -Math.max(0.01, this.input.drag.intentZ),
      );
      const sample = this.crowd.sampleCrowdForce(
        this.player.position,
        pushDir,
        mods.auraResist,
      );
      const { pushing } = this.player.update(
        dt,
        this.clock,
        this.input.drag.intentX,
        this.input.drag.intentZ,
        this.input.drag.magnitude,
        mods,
        sample.block,
        sample.slow,
        DOOR_Z,
      );
      if (pushing && sample.hitMass > 0 && this.clock - this.lastPushSfx > 0.18) {
        this.audio.push();
        this.lastPushSfx = this.clock;
      }

      this.crowd.tickSpawn(dt, this.level, DOOR_Z);
      this.crowd.update(dt, DOOR_Z, this.level.pressure, this.player.position, (impulse) => {
        this.player.velocity.add(impulse.multiplyScalar(1 - mods.resist));
        this.audio.collide();
      });

      // Player vs passengers separation
      for (const p of this.crowd.passengers) {
        const dist = this.player.position.distanceTo(p.position);
        const min = 0.42 + p.radius;
        if (dist < min && dist > 0.001) {
          const dir = this.player.position.clone().sub(p.position).normalize();
          const pen = min - dist;
          const invP = 1 / p.mass;
          const invPl = 1 / 1.2;
          this.player.position.addScaledVector(dir, (pen * invPl) / (invP + invPl));
          p.position.addScaledVector(dir, (-pen * invP) / (invP + invPl));
          p.syncMesh();
        }
      }
      this.player.sync();
      this.train.follow(this.player.position, dt);

      if (this.player.reachedDoor(DOOR_Z)) {
        this.onWin();
      } else if (this.timeLeft <= 0) {
        this.onLose();
      } else if (Math.floor(this.clock * 10) !== Math.floor((this.clock - dt) * 10)) {
        this.hooks.onState();
      }
    } else {
      this.train.follow(this.player.position, dt);
    }

    this.renderer.render(this.train.scene, this.train.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.renderer.dispose();
  }

  doorProgress(): number {
    return this.player.doorProgress(DOOR_Z, PLAYER_START.z);
  }
}
