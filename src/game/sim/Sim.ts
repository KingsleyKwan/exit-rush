import { World, type Body, type Box } from './Physics';
import { CrowdSim } from './CrowdSim';
import { PlayerSim, type PlayerInput } from './PlayerSim';
import { DOOR_Z, PLAYER_START_Z, TUNING } from './tuning';
import type { SimEvent, UltKind } from './events';
import type { LevelDef } from '../levels';
import type { SkillModifiers } from '../SkillTree';
import type { Rng } from './rng';

export type SimResult = 'win' | 'lose' | null;

/**
 * One level run: physics world + crowd AI + player controller + door timer.
 * Step it at a fixed rate (TUNING.physics.hz); it never touches the DOM or three.js.
 */
export class Sim {
  readonly world: World;
  readonly crowd: CrowdSim;
  readonly player: PlayerSim;
  readonly level: LevelDef;
  readonly events: SimEvent[] = [];
  time = 0;
  timeLeft: number;
  /** 0 closed … 1 fully open. */
  doorOpen = 1;
  result: SimResult = null;
  /** Ambient mode (menu backdrop): no timer, no boarding, no win/lose. */
  ambient = false;
  private progressBest = 0;
  private lastAngryHit = -99;
  private leafL: Box;
  private leafR: Box;
  private emit = (e: SimEvent): void => {
    this.events.push(e);
  };

  constructor(level: LevelDef, mods: SkillModifiers, rng: Rng) {
    const P = TUNING.physics;
    this.level = level;
    this.timeLeft = level.timer;
    this.world = new World({
      iterations: P.iterations,
      beta: P.contactBeta,
      slop: P.contactSlop,
      hardFrac: P.hardOverlapFrac,
      restitution: P.restitution,
      wallRestitution: P.wallRestitution,
      cellSize: P.cellSize,
      impactThreshold: P.impactEvent,
    });
    const [l, r] = this.buildStatic();
    this.leafL = l;
    this.leafR = r;
    this.player = new PlayerSim(mods);
    this.world.add(this.player.body);
    this.crowd = new CrowdSim(this.world, rng);
    this.crowd.spawnInitial(level, DOOR_Z, this.player.body.x, this.player.body.z);
    this.world.rebuildGrid();
    this.world.onImpact = (a, b, j, x, z) => this.onImpact(a, b, j, x, z);
  }

  private buildStatic(): [Box, Box] {
    const w = this.world;
    const C = TUNING.car;
    const hw = C.halfWidth;
    // Car side walls + back wall.
    w.addBox(-hw - 1, -hw, DOOR_Z - 0.2, C.backZ + 1);
    w.addBox(hw, hw + 1, DOOR_Z - 0.2, C.backZ + 1);
    w.addBox(-hw - 1, hw + 1, C.backZ, C.backZ + 1);
    // Bench seats (longitudinal, like an HCR car): leave a narrower standing aisle.
    for (const sx of [-1, 1]) {
      for (const cz of [-1.5, 0.5, 2.5]) {
        const inner = 1.2;
        w.addBox(sx > 0 ? inner : -hw, sx > 0 ? hw : -inner, cz - 0.7, cz + 0.7);
      }
    }
    // Grab pole.
    w.circles.push({ x: 0.9, z: 1.2, r: 0.05 });
    // End wall around the doorway.
    const pw = C.platformHalfWidth;
    w.addBox(-pw - 1, -C.doorHalf, DOOR_Z - 0.2, DOOR_Z + 0.08);
    w.addBox(C.doorHalf, pw + 1, DOOR_Z - 0.2, DOOR_Z + 0.08);
    // Platform bounds.
    const pz = DOOR_Z - C.platformDepth;
    w.addBox(-pw - 1, pw + 1, pz - 1, pz);
    w.addBox(-pw - 1, -pw, pz - 1, DOOR_Z);
    w.addBox(pw, pw + 1, pz - 1, DOOR_Z);
    // Door leaves: zero-width while open, slide into the doorway as they close.
    const l = w.addBox(-C.doorHalf, -C.doorHalf, DOOR_Z - 0.06, DOOR_Z + 0.06);
    const r = w.addBox(C.doorHalf, C.doorHalf, DOOR_Z - 0.06, DOOR_Z + 0.06);
    l.enabled = false;
    r.enabled = false;
    return [l, r];
  }

  private onImpact(a: Body, b: Body | null, j: number, x: number, z: number): void {
    const pl = this.player.body;
    const isPlayer = a === pl || b === pl;
    if (!isPlayer && j < TUNING.physics.impactEvent * 2.2) return;
    this.events.push({ t: 'bump', x, z, power: j, player: isPlayer });
    const ag = this.crowd.byBody.get(a.id);
    if (ag) ag.bumpAcc = Math.max(ag.bumpAcc, Math.min(1, j * 0.35));
    if (b) {
      const bg = this.crowd.byBody.get(b.id);
      if (bg) bg.bumpAcc = Math.max(bg.bumpAcc, Math.min(1, j * 0.35));
    }
  }

  get finished(): boolean {
    return this.result !== null;
  }

  doorProgress(): number {
    const z = this.player.body.z;
    const t = (PLAYER_START_Z - z) / (PLAYER_START_Z - DOOR_Z);
    return Math.max(0, Math.min(1, t));
  }

  reachedDoor(): boolean {
    const b = this.player.body;
    const C = TUNING.car;
    return b.z <= DOOR_Z + C.winDepth && Math.abs(b.x) < C.winHalf;
  }

  tryUltimate(kind: UltKind): boolean {
    if (this.result) return false;
    return this.player.activateUltimate(kind, this.time, this.world, this.crowd, this.emit);
  }

  /** Advance one fixed step. After a result, keeps simulating for ambience (player walks out on win). */
  step(dt: number, input: PlayerInput): void {
    const D = TUNING.door;
    const C = TUNING.car;
    const pl = this.player;
    const now = this.time;

    if (this.ambient) {
      this.doorOpen = 1;
    } else if (!this.result) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.doorOpen = Math.min(1, this.timeLeft / D.closeTime);
    } else if (this.result === 'lose') {
      this.doorOpen = Math.max(0, this.doorOpen - dt * 3);
    } else {
      this.doorOpen = 1;
      // Victory walk out onto the platform.
      const tx = 0 - pl.body.x;
      const tz = DOOR_Z - 1.6 - pl.body.z;
      const l = Math.hypot(tx, tz);
      input = l > 0.2 ? { x: tx / l, z: -tz / l, mag: 0.8, shoveHeld: false } : { x: 0, z: 0, mag: 0, shoveHeld: false };
    }

    // Door leaves narrow the doorway physically while closing.
    const half = C.doorHalf * this.doorOpen;
    this.leafL.maxX = -half;
    this.leafR.minX = half;
    this.leafL.enabled = this.leafR.enabled = this.doorOpen < 0.999;

    const sensing = pl.isSensing(now);
    const boardingActive = !this.ambient && now >= TUNING.crowd.boardDelay && this.doorOpen > 0.5;
    const nearDoor = this.crowd.activeBoardersNearDoor(DOOR_Z);
    const pressureField = boardingActive ? this.level.pressure * Math.min(1, nearDoor / 4) : 0;

    if (!this.ambient && (!this.result || this.result === 'win')) {
      this.crowd.tickBoarding(dt, this.level, DOOR_Z, now, this.doorOpen);
    }
    const C2 = TUNING.crowd;
    this.crowd.update(dt, {
      time: now,
      doorZ: DOOR_Z,
      pressure: this.level.pressure,
      boardingActive,
      pressureField,
      calm: sensing ? TUNING.ult.wis.calm : 0,
      player: pl.body,
      playerDirX: pl.aimX,
      playerDirZ: pl.aimZ,
      playerMoving: pl.moving,
      yieldK: C2.yieldBase + pl.mods.gapSense * C2.yieldPerGapSense,
      angryImmune:
        pl.isCharging(now) ||
        pl.isDashing(now) ||
        this.result !== null ||
        now - this.lastAngryHit < TUNING.player.hitIFrames,
      angryResist: Math.min(0.85, pl.mods.resist * 1.2),
      emit: this.emit,
      onPlayerShoved: () => {
        this.lastAngryHit = now;
        pl.stunT = TUNING.player.stunTime * (1 - pl.mods.resist);
      },
    });
    pl.step(dt, now, input, this.world, this.crowd, this.emit);
    this.world.step(dt);
    this.time += dt;

    if (this.result || this.ambient) return;
    const prog = this.doorProgress();
    for (const m of [0.25, 0.5, 0.75]) {
      if (this.progressBest < m && prog >= m) this.emit({ t: 'milestone', pct: m });
    }
    this.progressBest = Math.max(this.progressBest, prog);
    if (this.reachedDoor()) {
      this.result = 'win';
      this.emit({ t: 'win' });
    } else if (this.timeLeft <= 0) {
      this.result = 'lose';
      this.emit({ t: 'lose' });
    }
  }
}
