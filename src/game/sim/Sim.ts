import { World, resetBodyIds, type Body, type Box } from './Physics';
import { CrowdSim, resetAgentIds } from './CrowdSim';
import { PlayerSim, type PlayerInput } from './PlayerSim';
import {
  CAR_Z_MAX,
  CAR_Z_MIN,
  DOOR_BAYS,
  DOOR_Z,
  PLAYER_START_X,
  TUNING,
  doorWallX,
  nearestDoorBay,
  openDoorBays,
} from './tuning';
import type { SimEvent, UltKind } from './events';
import type { LevelDef } from '../levels';
import type { SkillModifiers } from '../SkillTree';
import type { PlayerMods } from '../charactersDef';
import { abilitiesForBar, castMageUlt, type AbilityCtx } from './abilities';
import type { Rng } from './rng';

export type SimResult = 'win' | 'lose' | null;

/** One solid clump of people standing in a doorway. Not a passenger and not pushable. */
export interface DoorBlock {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  people: { x: number; z: number; yaw: number }[];
}

/**
 * Standing party in the near door (player's left, +Z) when that door is shut.
 * Fills the opening so the squeeze is gone; the other door stays the way out.
 */
function nearDoorParty(wallX: number, bayZ: number): DoorBlock {
  const people = [
    { x: wallX + 0.48, z: bayZ - 0.45, yaw: Math.PI / 2 },
    { x: wallX + 0.8, z: bayZ - 0.18, yaw: Math.PI / 2 - 0.25 },
    { x: wallX + 0.48, z: bayZ + 0.18, yaw: Math.PI / 2 + 0.2 },
    { x: wallX + 0.8, z: bayZ + 0.45, yaw: Math.PI / 2 - 0.1 },
  ];
  const pad = 0.3;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of people) {
    minX = Math.min(minX, p.x - pad);
    maxX = Math.max(maxX, p.x + pad);
    minZ = Math.min(minZ, p.z - pad);
    maxZ = Math.max(maxZ, p.z + pad);
  }
  minX = Math.max(minX, wallX + 0.02);
  return { minX, maxX, minZ, maxZ, people };
}

interface DoorLeafPair {
  bayZ: number;
  /** Leaf that slides toward −Z. */
  leafNeg: Box;
  /** Leaf that slides toward +Z. */
  leafPos: Box;
  open: boolean;
}

/**
 * One level run: physics world + crowd AI + player controller + door timer.
 * Step it at a fixed rate (TUNING.physics.hz); it never touches the DOM or three.js.
 *
 * v0.4.1: exits are sliding doors on the left (−X) long wall; car ends are gangways.
 */
export class Sim {
  readonly world: World;
  readonly crowd: CrowdSim;
  readonly player: PlayerSim;
  readonly level: LevelDef;
  readonly events: SimEvent[] = [];
  readonly openBays: number[];
  /** Unpushable standing party in a shut door. Null when that door is an exit. */
  doorBlock: DoorBlock | null = null;
  time = 0;
  timeLeft: number;
  /** 0 closed … 1 fully open (shared across open bays). */
  doorOpen = 1;
  result: SimResult = null;
  /** Ambient mode (menu backdrop): no timer, no boarding, no win/lose. */
  ambient = false;
  private progressBest = 0;
  private lastAngryHit = -99;
  private doors: DoorLeafPair[] = [];
  /** v0.8 full mods (hero path still SkillModifiers-compatible). */
  readonly playerMods: SkillModifiers | PlayerMods;
  private readonly rng: Rng;
  private emit = (e: SimEvent): void => {
    this.events.push(e);
  };

  constructor(level: LevelDef, mods: SkillModifiers | PlayerMods, rng: Rng) {
    resetBodyIds();
    resetAgentIds();
    const P = TUNING.physics;
    this.level = level;
    this.playerMods = mods;
    this.rng = rng;
    this.timeLeft = level.timer;
    this.openBays = openDoorBays(level.id, level.openDoors);
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
    this.doors = this.buildStatic();
    this.player = new PlayerSim(mods);
    this.world.add(this.player.body);
    this.crowd = new CrowdSim(this.world, rng);
    this.crowd.spawnInitial(level, this.openBays, this.player.body.x, this.player.body.z);
    this.world.rebuildGrid();
    this.world.onImpact = (a, b, j, x, z) => this.onImpact(a, b, j, x, z);
  }

  /** Build car walls with gaps at open door bays on the left (−X) wall. */
  private buildStatic(): DoorLeafPair[] {
    const w = this.world;
    const C = TUNING.car;
    const hw = C.halfWidth;
    const dh = C.doorHalf;
    const open = new Set(this.openBays);
    const wallX = -hw;

    // Right (+X) wall — solid (far from platform).
    w.addBox(hw, hw + 1, CAR_Z_MIN - 0.5, CAR_Z_MAX + 0.5);
    // Gangway end walls (no exit).
    w.addBox(-hw - 0.2, hw + 0.2, CAR_Z_MIN - 1, CAR_Z_MIN);
    w.addBox(-hw - 0.2, hw + 0.2, CAR_Z_MAX, CAR_Z_MAX + 1);

    // Left (−X) wall segments between door bays.
    const bays = [...C.doorBays].sort((a, b) => a - b);
    const edges: number[] = [CAR_Z_MIN];
    for (const bz of bays) {
      edges.push(bz - dh, bz + dh);
    }
    edges.push(CAR_Z_MAX);
    for (let i = 0; i + 1 < edges.length; i += 2) {
      const z0 = edges[i];
      const z1 = edges[i + 1];
      if (z1 - z0 > 0.05) w.addBox(wallX - 1, wallX, z0, z1);
    }
    // Closed door bays: fill the gap with a solid wall (no leaf).
    for (const bz of bays) {
      if (!open.has(bz)) w.addBox(wallX - 1, wallX, bz - dh, bz + dh);
    }
    // Near door shut: one standing party in the mouth. Not an agent, so shove and spells miss it.
    const nearBay = DOOR_BAYS[2];
    if (!open.has(nearBay)) {
      const party = nearDoorParty(wallX, nearBay);
      this.doorBlock = party;
      w.addBox(party.minX, party.maxX, party.minZ, party.maxZ);
    }

    // Longitudinal benches (matches TrainScene v0.6):
    // BOTH walls: only long between-bay segments (skip short end stubs at door Z).
    // Never overlap a door vestibule [bayZ ± doorHalf]. Fill most of each segment.
    const betweenBaySegs: [number, number][] = [];
    for (let i = 0; i < bays.length - 1; i++) betweenBaySegs.push([bays[i] + dh, bays[i + 1] - dh]);
    const aislePoleZs: number[] = [];
    const seatInset = 0.1;
    const seatW = 0.62;
    /** Small clearance from vestibule edge; segment already excludes [bay±doorHalf]. */
    const BENCH_MARGIN = 0.06;
    const BENCH_FILL = 0.96; // use 96% of (segment − margins)
    const addBench = (sx: -1 | 1, z0: number, z1: number, opts: { minAvail?: number; margin?: number } = {}): boolean => {
      const margin = opts.margin ?? BENCH_MARGIN;
      const minAvail = opts.minAvail ?? 0.5;
      const avail = z1 - z0 - 2 * margin;
      if (avail < minAvail) return false;
      const halfLen = (avail * BENCH_FILL) / 2;
      const cz = (z0 + z1) / 2;
      // Keep colliders inside the car (do not cross doorWallX / +halfWidth).
      const outer = sx * (hw - seatInset);
      const inner = sx * (hw - seatInset - seatW);
      w.addBox(Math.min(inner, outer), Math.max(inner, outer), cz - halfLen, cz + halfLen);
      return true;
    };
    for (const [z0, z1] of betweenBaySegs) {
      if (addBench(-1, z0, z1)) aislePoleZs.push((z0 + z1) / 2);
    }
    for (const [z0, z1] of betweenBaySegs) {
      addBench(1, z0, z1);
    }
    // Grab poles in the aisle at between-door centres (never in a doorway).
    for (const pz of aislePoleZs.slice(0, 2)) {
      w.circles.push({ x: 0.35, z: pz, r: 0.05 });
    }

    // Platform bounds (−X of the door wall).
    const px0 = wallX - C.platformDepth;
    const pl = C.platformHalfLen;
    w.addBox(px0 - 1, px0, -pl - 1, pl + 1); // far platform edge
    w.addBox(px0 - 1, wallX + 0.5, -pl - 1, -pl); // −Z lip
    w.addBox(px0 - 1, wallX + 0.5, pl, pl + 1); // +Z lip

    // Door leaves for open bays (slide along Z into the opening as they close).
    const pairs: DoorLeafPair[] = [];
    for (const bz of bays) {
      if (!open.has(bz)) continue;
      const leafNeg = w.addBox(wallX - 0.08, wallX + 0.08, bz, bz); // zero-height while open
      const leafPos = w.addBox(wallX - 0.08, wallX + 0.08, bz, bz);
      leafNeg.enabled = false;
      leafPos.enabled = false;
      pairs.push({ bayZ: bz, leafNeg, leafPos, open: true });
    }
    return pairs;
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

  /** 0 at start (+X / deep) → 1 at the nearest open door on the platform side. */
  doorProgress(): number {
    const b = this.player.body;
    const wall = doorWallX();
    const bay = nearestDoorBay(b.z, this.openBays);
    const spanX = PLAYER_START_X - (wall - TUNING.car.winDepth);
    const tX = (PLAYER_START_X - b.x) / Math.max(0.5, spanX);
    const tZ = 1 - Math.min(1, Math.abs(b.z - bay) / 3.5);
    return Math.max(0, Math.min(1, tX * 0.75 + tZ * 0.25 * Math.max(0, tX)));
  }

  /**
   * If the player is pressed against / pushing into a closed door bay, return its Z.
   * `worldX` is stick world +X (negative = toward the −X doors), not the raw screen axis.
   */
  closedBayPush(worldX: number, mag: number): number | null {
    const wall = doorWallX();
    const b = this.player.body;
    const C = TUNING.car;
    const nearWall = b.x <= wall + TUNING.player.radius + 0.4;
    const shovingIn = mag > 0.18 && worldX < -0.2;
    if (!nearWall) return null;
    if (!shovingIn && !(this.player.pushing && b.pressure > 0.01)) return null;
    const open = new Set(this.openBays);
    for (const bz of C.doorBays) {
      if (open.has(bz)) continue;
      if (Math.abs(b.z - bz) < C.doorHalf * 0.95) return bz;
    }
    return null;
  }

  reachedDoor(): boolean {
    const b = this.player.body;
    const C = TUNING.car;
    const wall = doorWallX();
    if (b.x > wall - C.winDepth) return false;
    if (this.doorOpen < 0.15) return false;
    return this.openBays.some((bay) => Math.abs(b.z - bay) < C.winHalf);
  }

  /** SPD 50 飛身 Leap. */
  tryLeap(): boolean {
    if (this.result) return false;
    return this.player.tryLeap(this.time);
  }

  /** STA 50 回魂 Second Wind (also shakes off nearby brats). */
  trySecondWind(): boolean {
    if (this.result) return false;
    return this.player.trySecondWind(this.crowd);
  }

  tryUltimate(kind: UltKind): boolean {
    if (this.result) return false;
    const pm = this.playerMods as PlayerMods;
    if (pm.characterId === 'mage') {
      return castMageUlt(kind, this.abilityCtx());
    }
    return this.player.activateUltimate(kind, this.time, this.world, this.crowd, this.emit);
  }

  /** v0.8: cast a bar spell by ability id (mage). */
  tryAbility(abilityId: string): boolean {
    if (this.result) return false;
    const pm = this.playerMods as PlayerMods;
    if (pm.characterId !== 'mage' && pm.characterId !== 'tech') return false;
    const defs = abilitiesForBar([abilityId], pm);
    const def = defs[0];
    if (!def) return false;
    if (def.resource === 'none') {
      if ((this.player.spellCd[def.id] ?? 0) > 0) return false;
      if (!def.cast(this.abilityCtx())) return false;
      this.player.spellCd[def.id] = def.cd;
      return true;
    }
    if (!this.player.beginSpell(def.id, def.cost, def.cd)) return false;
    return def.cast(this.abilityCtx());
  }

  private abilityCtx(): AbilityCtx {
    return {
      world: this.world,
      crowd: this.crowd,
      player: this.player,
      time: this.time,
      rng: this.rng,
      emit: this.emit,
      level: this.level,
      mods: this.playerMods as PlayerMods,
    };
  }

  /** Advance one fixed step. After a result, keeps simulating for ambience (player walks out on win). */
  step(dt: number, input: PlayerInput): void {
    const D = TUNING.door;
    const C = TUNING.car;
    const pl = this.player;
    const now = this.time;
    const wall = doorWallX();

    if (this.ambient) {
      this.doorOpen = 1;
    } else if (!this.result) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.doorOpen = Math.min(1, this.timeLeft / D.closeTime);
    } else if (this.result === 'lose') {
      this.doorOpen = Math.max(0, this.doorOpen - dt * 3);
    } else {
      this.doorOpen = 1;
      // Victory walk out onto the platform (−X).
      const bay = nearestDoorBay(pl.body.z, this.openBays);
      const tx = wall - 1.8 - pl.body.x;
      const tz = bay - pl.body.z;
      const l = Math.hypot(tx, tz);
      input = l > 0.2 ? { x: tx / l, z: -tz / l, mag: 0.8, shoveHeld: false } : { x: 0, z: 0, mag: 0, shoveHeld: false };
    }

    // Door leaves narrow each open bay along Z while closing.
    const half = C.doorHalf * this.doorOpen;
    for (const d of this.doors) {
      d.leafNeg.maxZ = d.bayZ - half;
      d.leafNeg.minZ = d.bayZ - C.doorHalf;
      d.leafPos.minZ = d.bayZ + half;
      d.leafPos.maxZ = d.bayZ + C.doorHalf;
      d.leafNeg.enabled = d.leafPos.enabled = this.doorOpen < 0.999;
    }

    const iron = pl.isIronStance(now);
    const boardingActive = !this.ambient && now >= TUNING.crowd.boardDelay && this.doorOpen > 0.5;
    const nearDoor = this.crowd.activeBoardersNearDoor(wall, this.openBays);
    const pressureField = boardingActive ? this.level.pressure * Math.min(1, nearDoor / 4) : 0;

    {
      const pm = this.playerMods as PlayerMods;
      pl.burningUrgencyActive = !!(pm.burningUrgency && !this.ambient && this.timeLeft <= 5 && this.timeLeft > 0);
    }
    if (!this.ambient && (!this.result || this.result === 'win')) {
      this.crowd.tickBoarding(dt, this.level, this.openBays, now, this.doorOpen);
    }
    const C2 = TUNING.crowd;
    this.crowd.update(dt, {
      time: now,
      doorWallX: wall,
      openBays: this.openBays,
      doorZ: DOOR_Z,
      pressure: this.level.pressure,
      boardingActive,
      pressureField,
      calm: iron ? TUNING.ult.sta.calm : 0,
      player: pl.body,
      playerDirX: pl.aimX,
      playerDirZ: pl.aimZ,
      playerMoving: pl.moving,
      yieldK: C2.yieldBase + pl.mods.gapSense * C2.yieldPerGapSense,
      angryImmune:
        pl.isCharging(now) ||
        pl.isDashing(now) ||
        iron ||
        this.result !== null ||
        now - this.lastAngryHit < TUNING.player.hitIFrames,
      // STR 60 Stand Firm: angry shoves barely move you.
      angryResist: (() => {
        const tech = (pl.mods as PlayerMods).techAngryRemain;
        if (typeof tech === 'number' && tech < 1) return 1 - tech;
        return pl.mods.standFirm
          ? 1 - TUNING.skills.standFirmMul
          : (pl.mods as PlayerMods).chillOut
            ? 1 - TUNING.spells.angryShoveMul
            : Math.min(0.85, pl.mods.resist * 1.2);
      })(),
      threadCouples: pl.mods.threadCouples,
      passBossLuggage: (pl.mods as PlayerMods).techPassBossCase !== false,
      pushForce: pl.mods.pushForce,
      standFirm: pl.mods.standFirm,
      playerCharging: pl.isCharging(now),
      emit: this.emit,
      onPlayerShoved: (_dx, _dz, _p, heavy) => {
        this.lastAngryHit = now;
        pl.stunT =
          TUNING.player.stunTime *
          (1 - pl.mods.resist) *
          (pl.mods.standFirm ? TUNING.skills.standFirmMul : heavy ? TUNING.boss.angry.heavyStun : 1);
      },
    });
    // Tell the player which bay to aim for (dash / aim assist).
    pl.targetDoorZ = nearestDoorBay(pl.body.z, this.openBays);
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
