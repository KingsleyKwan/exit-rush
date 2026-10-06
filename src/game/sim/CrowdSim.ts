import { PASS_KID, PASS_LUGGAGE, PASS_SQUAT, applyImpulse, createBody, type Body, type World } from './Physics';
import { PASSENGER_DEFS, type PassengerKind } from '../PassengerTypes';
import { crowdCount, type LevelDef } from '../levels';
import { CAR_Z_MAX, CAR_Z_MIN, TUNING, doorWallX, nearestDoorBay } from './tuning';
import type { Emit } from './events';
import type { Rng } from './rng';

export type AgentMode = 'rider' | 'boarder';

export interface Agent {
  id: number;
  kind: PassengerKind;
  body: Body;
  mode: AgentMode;
  /** Standing spot riders spring back to. */
  homeX: number;
  homeZ: number;
  /** Boarders: final spot inside the car. */
  goalX: number;
  goalZ: number;
  /** Boarders: Z they aim for when funnelling through a side doorway. */
  doorX: number;
  displacedT: number;
  stuckT: number;
  age: number;
  partner: Agent | null;
  clusterId: number;
  isKid: boolean;
  caseBody: Body | null;
  phase: number;
  zig: number;
  dartT: number;
  shoveCd: number;
  /** Angry wind-up time remaining (s); < 0 = idle. */
  windup: number;
  /** Visual bump accumulator (view consumes and zeroes it). */
  bumpAcc: number;
  /** Visual scale of the figure. */
  scale: number;
  /** Couples: hand-hold link released until this sim time (STR Split). */
  splitUntil: number;
  /** Brats: no zigzag / darting until this sim time (STA Second Wind). */
  dazedUntil: number;
}

export interface CrowdCtx {
  time: number;
  /** Left door-wall X (platform side). */
  doorWallX: number;
  /** Open side-door bay Z centres. */
  openBays: readonly number[];
  /** Mid-car Z (compat / ambient). */
  doorZ: number;
  pressure: number;
  boardingActive: boolean;
  /** 0–1: how strongly boarders are currently compressing the crowd. */
  pressureField: number;
  /** 0–1: STA Iron Stance makes the crowd hesitate slightly. */
  calm: number;
  player: Body;
  /** Player's current move direction (unit) and how hard they move (0–1). */
  playerDirX: number;
  playerDirZ: number;
  playerMoving: number;
  /** Rider sidestep strength for the player. */
  yieldK: number;
  angryImmune: boolean;
  /** 0–1 reduction of angry knockback (STR resist). */
  angryResist: number;
  /** SPD Thread: the couple hand-hold link does not block the player. */
  threadCouples?: boolean;
  emit: Emit;
  onPlayerShoved: (dx: number, dz: number, power: number) => void;
}

function pickKind(mix: LevelDef['mix'], rng: Rng): PassengerKind {
  const entries = Object.entries(mix) as [PassengerKind, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'normal';
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

let agentSeq = 0;
let groupSeq = 0;

export class CrowdSim {
  readonly agents: Agent[] = [];
  readonly byBody = new Map<number, Agent>();
  boardBudget = 0;
  boardedCount = 0;
  private spawnAcc = 0;
  private clusterSeq = 0;
  private world: World;
  private rng: Rng;
  private tmp: Body[] = [];
  /** Last sim time seen in update() (for timed effects triggered by the player). */
  private now = 0;

  constructor(world: World, rng: Rng) {
    this.world = world;
    this.rng = rng;
  }

  get bodyCount(): number {
    return this.world.bodies.length;
  }

  // ---------------------------------------------------------------- spawning

  private canFit(x: number, z: number, r: number): boolean {
    return !this.world.overlapsStatic(x, z, r) && !this.world.overlapsBody(x, z, r, 0.01);
  }

  private findSpot(x: number, z: number, r: number, spread = 0.5, tries = 14): [number, number] | null {
    if (this.canFit(x, z, r)) return [x, z];
    for (let i = 0; i < tries; i++) {
      const s = spread * (0.3 + (i / tries) * 0.9);
      const nx = x + (this.rng() - 0.5) * 2 * s;
      const nz = z + (this.rng() - 0.5) * 2 * s;
      if (this.canFit(nx, nz, r)) return [nx, nz];
    }
    return null;
  }

  private makeAgent(kind: PassengerKind, x: number, z: number, mode: AgentMode, kid = false): Agent {
    const def = PASSENGER_DEFS[kind];
    const fam = TUNING.types.family;
    const scale = (def.scale ?? 1) * (kid ? fam.kidScale : 1);
    const mass = kid ? fam.kidMass : def.mass;
    const body = createBody({
      x,
      z,
      r: def.radius * (kid ? 0.78 : 1),
      mass,
      damping: def.damping,
      restitution: def.restitution,
      maxSpeed: 6,
    });
    this.world.add(body);
    const a: Agent = {
      id: ++agentSeq,
      kind,
      body,
      mode,
      homeX: x,
      homeZ: z,
      goalX: x,
      goalZ: z,
      doorX: 0,
      displacedT: 0,
      stuckT: 0,
      age: 0,
      partner: null,
      clusterId: 0,
      isKid: kid,
      caseBody: null,
      phase: this.rng() * 10,
      zig: this.rng() * Math.PI * 2,
      dartT: this.rng() * 2,
      shoveCd: (def.shoveInterval ?? 3) * (0.5 + this.rng()),
      windup: -1,
      bumpAcc: 0,
      scale,
      splitUntil: -1,
      dazedUntil: -1,
    };
    // Hurdle hops the suitcase only; the owner still blocks (keeps L100 luggage walls honest).
    if (kind === 'squat') body.passTag = PASS_SQUAT;
    else if (kid) body.passTag = PASS_KID;
    this.agents.push(a);
    this.byBody.set(body.id, a);
    return a;
  }

  /** Spawn one "unit" of a kind (families = 3, couples = 2, luggage = owner + case). */
  spawnGroup(kind: PassengerKind, x: number, z: number, mode: AgentMode, spread = 0.5): Agent[] {
    const def = PASSENGER_DEFS[kind];
    const max = TUNING.physics.maxBodies;
    const out: Agent[] = [];
    const place = (k: PassengerKind, px: number, pz: number, r: number, kid = false): Agent | null => {
      if (this.world.bodies.length >= max) return null;
      const spot = this.findSpot(px, pz, r, spread);
      if (!spot) return null;
      const a = this.makeAgent(k, spot[0], spot[1], mode, kid);
      out.push(a);
      return a;
    };
    if (kind === 'family') {
      const cid = ++this.clusterSeq;
      const lead = place('family', x, z, def.radius);
      if (!lead) return out;
      lead.clusterId = cid;
      for (let k = 0; k < 2; k++) {
        const kid = place('family', lead.body.x + (k ? 0.36 : -0.36), lead.body.z + 0.22, def.radius * 0.78, true);
        if (kid) kid.clusterId = cid;
      }
    } else if (kind === 'couple') {
      if (this.world.bodies.length + 2 > max) return out;
      const a = place('couple', x - 0.24, z, def.radius);
      if (!a) return out;
      const b = place('couple', a.body.x + 0.48, a.body.z, def.radius);
      if (b) {
        a.partner = b;
        b.partner = a;
      }
    } else if (kind === 'luggage') {
      if (this.world.bodies.length + 2 > max) return out;
      const owner = place('luggage', x, z, def.radius);
      if (!owner) return out;
      const L = TUNING.types.luggage;
      const side = this.rng() < 0.5 ? -1 : 1;
      let cx = owner.body.x + side * L.rest;
      let cz = owner.body.z;
      if (!this.canFit(cx, cz, L.caseRadius)) {
        cx = owner.body.x - side * L.rest;
        if (!this.canFit(cx, cz, L.caseRadius)) {
          cx = owner.body.x;
          cz = owner.body.z + L.rest;
        }
      }
      const g = ++groupSeq + 10000;
      const cb = createBody({
        x: cx,
        z: cz,
        r: L.caseRadius,
        mass: L.caseMass,
        damping: L.caseDamping,
        restitution: 0.02,
        maxSpeed: 5,
        group: g,
      });
      cb.passTag = PASS_LUGGAGE;
      owner.body.group = g;
      this.world.add(cb);
      owner.caseBody = cb;
    } else {
      place(kind, x, z, def.radius);
    }
    return out;
  }

  private randomCarSpot(openBays: readonly number[]): [number, number] {
    const c = TUNING.car;
    // Bias riders toward the door (left) wall — the crush the player must cross.
    const bay = openBays[Math.floor(this.rng() * openBays.length)] ?? 0;
    const z = bay + (this.rng() - 0.5) * 2.2;
    const towardDoor = Math.pow(this.rng(), 0.7);
    const x = -c.halfWidth + 0.55 + towardDoor * (c.halfWidth * 1.55);
    return [clamp(x, -c.halfWidth + 0.35, c.halfWidth - 0.35), clamp(z, CAR_Z_MIN + 0.4, CAR_Z_MAX - 0.4)];
  }

  spawnInitial(level: LevelDef, openBays: readonly number[], avoidX: number, avoidZ: number): void {
    const n = crowdCount(level.density);
    let people = 0;
    let guard = 0;
    while (people < n && guard++ < n * 6) {
      const kind = pickKind(level.mix, this.rng);
      let [x, z] = this.randomCarSpot(openBays);
      if (Math.hypot(x - avoidX, z - avoidZ) < 0.75) continue;
      const made = this.spawnGroup(kind, x, z, 'rider', 0.45);
      people += made.length;
    }
    // Boarders waiting on the platform beyond the left wall.
    const C = TUNING.crowd;
    this.boardBudget = Math.round(C.boardBudgetBase + level.pressure * C.boardBudgetPerPressure);
    const queue = Math.min(this.boardBudget, Math.round(C.boardQueueBase + level.pressure * C.boardQueuePerPressure));
    let q = 0;
    guard = 0;
    while (q < queue && guard++ < queue * 5) {
      const made = this.spawnBoarderUnit(level, openBays);
      if (made === 0) break;
      q += made;
    }
    this.boardBudget = Math.max(0, this.boardBudget - q);
  }

  private spawnBoarderUnit(level: LevelDef, openBays: readonly number[]): number {
    const kind = pickKind(level.mix, this.rng);
    const wall = doorWallX();
    const bay = openBays[Math.floor(this.rng() * openBays.length)] ?? 0;
    // Platform side (−X), lined up on a door bay.
    const x = wall - 0.55 - this.rng() * 1.6;
    const z = bay + (this.rng() - 0.5) * 1.1;
    const made = this.spawnGroup(kind, x, z, 'boarder', 0.6);
    if (made.length === 0) return 0;
    // Goal deep toward the far (+X) side of the car.
    const gx = 0.4 + this.rng() * 1.2;
    const gz = bay + (this.rng() - 0.5) * 2.4;
    const doorZAim = bay + (this.rng() - 0.5) * 0.5;
    for (const a of made) {
      a.goalX = clamp(gx + (a.body.x - made[0].body.x), -TUNING.car.halfWidth + 0.4, TUNING.car.halfWidth - 0.35);
      a.goalZ = clamp(gz + (a.body.z - made[0].body.z), CAR_Z_MIN + 0.4, CAR_Z_MAX - 0.4);
      a.doorX = doorZAim; // reuse field: Z aim through the doorway
    }
    return made.length;
  }

  /** Counterflow: boarders stream in from the platform while the doors are open. */
  tickBoarding(dt: number, level: LevelDef, openBays: readonly number[], time: number, doorOpen: number): void {
    const C = TUNING.crowd;
    if (doorOpen < 0.95 || this.boardBudget <= 0) return;
    const t = time - C.boardDelay;
    if (t < 0) return;
    const ramp = Math.min(1, t / C.boardRamp);
    this.spawnAcc += dt * (C.boardRateBase + level.pressure * C.boardRatePerPressure) * ramp;
    let guard = 0;
    while (this.spawnAcc >= 1 && this.boardBudget > 0 && guard++ < 4) {
      if (this.world.bodies.length >= TUNING.physics.maxBodies - 1) {
        this.spawnAcc = Math.min(this.spawnAcc, 1);
        return;
      }
      const made = this.spawnBoarderUnit(level, openBays);
      if (made === 0) return; // platform jammed — try next step
      this.spawnAcc -= 1;
      this.boardBudget = Math.max(0, this.boardBudget - made);
    }
  }

  activeBoardersNearDoor(wallX: number, openBays: readonly number[]): number {
    let n = 0;
    for (const a of this.agents) {
      if (a.mode !== 'boarder') continue;
      if (a.body.x > wallX + 2.2) continue;
      const bay = nearestDoorBay(a.body.z, openBays);
      if (Math.abs(a.body.z - bay) < 2.2) n++;
    }
    return n;
  }

  // ---------------------------------------------------------------- behaviour

  /** Combined stench slow (0–1, before WIS resist) at a point. */
  /**
   * Extra crowd-drag when weaving laterally past squatting passengers
   * (they block the lower body / hard to slip past sideways).
   */
  squatLateralDrag(px: number, pz: number, aimX: number, aimZ: number): number {
    const T = TUNING.types.squat;
    let extra = 0;
    for (const a of this.agents) {
      if (a.kind !== 'squat') continue;
      const b = a.body;
      const rx = b.x - px;
      const rz = b.z - pz;
      const d = Math.hypot(rx, rz);
      if (d > 1.1 || d < 1e-4) continue;
      // Lateral alignment: beside you more than in front.
      const along = (rx * aimX + rz * aimZ) / d;
      const lat = Math.abs(rx * aimZ - rz * aimX) / d;
      if (lat > 0.35 && along < 0.55) {
        extra += T.lateralDrag * (1 - d / 1.1);
      }
    }
    return Math.min(0.45, extra);
  }

  auraSlowAt(x: number, z: number): number {
    const R = TUNING.types.stench.auraRadius;
    let s = 0;
    for (const a of this.agents) {
      const def = PASSENGER_DEFS[a.kind];
      if (!def.auraSlow) continue;
      const d = Math.hypot(a.body.x - x, a.body.z - z);
      if (d < R) s += def.auraSlow * (1 - d / R);
    }
    return Math.min(0.75, s);
  }

  /** STR Split: a shove breaks this couple's hand-hold for a while and pops them apart. */
  splitCouple(a: Agent): boolean {
    const p = a.partner;
    if (!p) return false;
    const until = this.now + TUNING.skills.splitDuration;
    const fresh = a.splitUntil < this.now;
    a.splitUntil = p.splitUntil = until;
    const dx = p.body.x - a.body.x;
    const dz = p.body.z - a.body.z;
    const d = Math.hypot(dx, dz) || 1e-6;
    const J = TUNING.skills.splitImpulse;
    applyImpulse(a.body, (-dx / d) * J, (-dz / d) * J);
    applyImpulse(p.body, (dx / d) * J, (dz / d) * J);
    return fresh;
  }

  isSplit(a: Agent): boolean {
    return a.splitUntil > this.now;
  }

  /** STA Second Wind: knock nearby brats away and daze them (no darting) for a while. */
  shakeOffBrats(x: number, z: number): number {
    const K = TUNING.skills;
    let n = 0;
    for (const a of this.agents) {
      if (a.kind !== 'brat') continue;
      const dx = a.body.x - x;
      const dz = a.body.z - z;
      const d = Math.hypot(dx, dz) || 1e-6;
      if (d > K.shakeOffRadius) continue;
      const J = K.shakeOffImpulse * (1 - (d / K.shakeOffRadius) * 0.5) * a.body.mass;
      applyImpulse(a.body, (dx / d) * J, (dz / d) * J);
      a.dazedUntil = this.now + K.shakeOffDaze;
      a.bumpAcc = 1;
      n++;
    }
    return n;
  }

  update(dt: number, ctx: CrowdCtx): void {
    this.now = ctx.time;
    const C = TUNING.crowd;
    const T = TUNING.types;
    const ai = 1 - ctx.calm;
    const pl = ctx.player;

    for (const a of this.agents) {
      const b = a.body;
      const def = PASSENGER_DEFS[a.kind];
      const m = b.mass;
      let fx = 0;
      let fz = 0;
      a.age += dt;

      if (a.mode === 'boarder' && ctx.boardingActive) {
        // Funnel through a side doorway (−X → +X), then settle deep in the car.
        const inside = b.x > ctx.doorWallX + 0.25;
        const wx = inside ? a.goalX : ctx.doorWallX + 0.55;
        const wz = inside ? a.goalZ : a.doorX;
        const dx = wx - b.x;
        const dz = wz - b.z;
        const dist = Math.hypot(dx, dz) || 1e-6;
        const speed = C.boardSpeed * def.speedMul * Math.min(1, dist / 0.6 + 0.25);
        const vdx = (dx / dist) * speed;
        const vdz = (dz / dist) * speed;
        fx = (vdx - b.vx) * C.boardAccel * m;
        fz = (vdz - b.vz) * C.boardAccel * m;
        const cap = C.boardMaxDrive * def.driveMul * m * ai;
        const fm = Math.hypot(fx, fz);
        if (fm > cap) {
          fx *= cap / fm;
          fz *= cap / fm;
        }
        const sp = Math.hypot(b.vx, b.vz);
        a.stuckT = sp < 0.15 ? a.stuckT + dt : 0;
        if (
          (inside && dist < 0.45) ||
          a.age > C.boardMaxTime ||
          (b.x > ctx.doorWallX + 1.4 && a.stuckT > 1.8)
        ) {
          a.mode = 'rider';
          a.homeX = b.x;
          a.homeZ = b.z;
          this.boardedCount++;
        }
      } else {
        // Rider (or boarder still waiting): spring to standing spot.
        const dx = a.homeX - b.x;
        const dz = a.homeZ - b.z;
        const k = C.anchorK * def.anchorMul * m;
        fx = dx * k;
        fz = dz * k;
        const cap = C.anchorMax * def.anchorMul * m;
        const fm = Math.hypot(fx, fz);
        if (fm > cap) {
          fx *= cap / fm;
          fz *= cap / fm;
        }
        const disp = Math.hypot(dx, dz);
        if (disp > C.driftDist) {
          a.displacedT += dt;
          if (a.displacedT > C.driftAfter) {
            // Give up the old spot: the crowd compresses / re-settles.
            const r = Math.min(1, C.driftRate * dt);
            a.homeX -= dx * r;
            a.homeZ -= dz * r;
          }
        } else {
          a.displacedT = Math.max(0, a.displacedT - dt);
        }
        // Boarding pressure squeezes riders near the left doors toward the far (+X) wall.
        if (a.mode === 'rider' && ctx.pressureField > 0) {
          const dd = b.x - ctx.doorWallX;
          if (dd > 0 && dd < C.pressureRange) {
            fx += C.pressureForce * ctx.pressureField * (1 - dd / C.pressureRange) * m;
          }
        }
        // Sidestep for the player ("唔該借借") — stronger with WIS.
        if (a.mode === 'rider' && ctx.playerMoving > 0.2 && ctx.yieldK > 0) {
          const rx = b.x - pl.x;
          const rz = b.z - pl.z;
          const along = rx * ctx.playerDirX + rz * ctx.playerDirZ;
          if (along > 0 && along < 1.1) {
            const lat = rx * -ctx.playerDirZ + rz * ctx.playerDirX;
            if (Math.abs(lat) < 0.8) {
              const s = (lat >= 0 ? 1 : -1) * ctx.yieldK * (1 - Math.abs(lat) / 0.8) * (1 - along / 1.1) * ctx.playerMoving;
              fx += -ctx.playerDirZ * s * m;
              fz += ctx.playerDirX * s * m;
            }
          }
        }
      }

      // Idle sway so nobody looks frozen.
      a.phase += dt;
      fx += Math.sin(a.phase * 1.3 + a.id) * C.wander * m * ai;
      fz += Math.cos(a.phase * 0.9 + a.id * 1.7) * C.wander * m * ai;

      if (def.zigzag && a.dazedUntil <= ctx.time) {
        a.zig += dt * T.brat.zigFreq;
        fx += Math.sin(a.zig) * T.brat.zigForce * m * ai;
        a.dartT -= dt * ai;
        if (a.dartT <= 0) {
          a.dartT = T.brat.dartEvery * (0.6 + this.rng() * 0.8);
          const ang = this.rng() * Math.PI * 2;
          applyImpulse(b, Math.cos(ang) * T.brat.dartImpulse * m, Math.sin(ang) * T.brat.dartImpulse * m);
          a.bumpAcc = Math.max(a.bumpAcc, 0.4);
        }
      }

      if (a.kind === 'angry') this.updateAngry(a, dt, ctx);

      b.fx += fx;
      b.fz += fz;
    }

    this.applyLinks(dt, ctx);
    this.applyStenchRepel();
  }

  private updateAngry(a: Agent, dt: number, ctx: CrowdCtx): void {
    const T = TUNING.types.angry;
    const def = PASSENGER_DEFS.angry;
    const pl = ctx.player;
    const dx = pl.x - a.body.x;
    const dz = pl.z - a.body.z;
    const d = Math.hypot(dx, dz) || 1e-6;
    const reach = T.range + pl.r + a.body.r;
    if (a.windup >= 0) {
      a.windup -= dt * (1 - ctx.calm);
      if (a.windup < 0) {
        a.windup = -1;
        a.shoveCd = (def.shoveInterval ?? 3) * (0.7 + this.rng() * 0.6);
        if (d < reach * 1.25 && !ctx.angryImmune) {
          const nx = dx / d;
          const nz = dz / d;
          const power = T.impulse * (def.shoveForce ?? 2.8) / 2.8;
          const j = power * (1 - ctx.angryResist);
          applyImpulse(pl, nx * j, nz * j);
          // Recoil + push neighbours: the angry man barges.
          applyImpulse(a.body, -nx * j * 0.25, -nz * j * 0.25);
          a.bumpAcc = 1;
          ctx.onPlayerShoved(nx, nz, j);
          ctx.emit({ t: 'angryHit', x: pl.x, z: pl.z, dx: nx, dz: nz, power: j });
        }
        // Shoulder-barge anyone else nearby.
        const near = this.world.query(a.body.x, a.body.z, 0.75, this.tmp);
        for (const o of near) {
          if (o === a.body || o === pl) continue;
          const ox = o.x - a.body.x;
          const oz = o.z - a.body.z;
          const od = Math.hypot(ox, oz) || 1e-6;
          applyImpulse(o, (ox / od) * T.neighbourImpulse, (oz / od) * T.neighbourImpulse);
          const ag = this.byBody.get(o.id);
          if (ag) ag.bumpAcc = Math.max(ag.bumpAcc, 0.5);
        }
      }
      return;
    }
    a.shoveCd -= dt * (1 - ctx.calm);
    if (a.shoveCd <= 0 && d < reach && ctx.calm < 0.5) {
      a.windup = T.windup;
      ctx.emit({ t: 'angryWindup', agentId: a.id });
    }
  }

  /** Called when the player shoves an angry man: he retaliates fast. */
  annoy(a: Agent): void {
    if (a.kind === 'angry' && a.windup < 0) a.shoveCd = Math.min(a.shoveCd, TUNING.types.angry.retaliateCd);
  }

  private applyLinks(dt: number, ctx: CrowdCtx): void {
    const T = TUNING.types;
    const pl = ctx.player;
    // Couples: damped spring "holding hands".
    for (const a of this.agents) {
      const p = a.partner;
      if (!p || a.id > p.id) continue;
      if (a.splitUntil > ctx.time) continue; // STR Split: link broken
      const ab = a.body;
      const pb = p.body;
      const dx = pb.x - ab.x;
      const dz = pb.z - ab.z;
      const d = Math.hypot(dx, dz) || 1e-6;
      const nx = dx / d;
      const nz = dz / d;
      if (ctx.threadCouples) {
        // SPD Thread: if the player is at the gap between the pair, let go and step aside.
        const rx = pl.x - ab.x;
        const rz = pl.z - ab.z;
        const along = rx * nx + rz * nz;
        const lat = Math.abs(rx * nz - rz * nx);
        if (along > -0.15 && along < d + 0.15 && lat < TUNING.skills.threadReach) {
          const k = TUNING.skills.threadYield;
          ab.fx -= nx * k * ab.mass;
          ab.fz -= nz * k * ab.mass;
          pb.fx += nx * k * pb.mass;
          pb.fz += nz * k * pb.mass;
          continue;
        }
      }
      const relV = (pb.vx - ab.vx) * nx + (pb.vz - ab.vz) * nz;
      let f = T.couple.k * (d - T.couple.rest) + T.couple.damping * relV;
      f = clamp(f, -T.couple.maxForce, T.couple.maxForce);
      ab.fx += nx * f;
      ab.fz += nz * f;
      pb.fx -= nx * f;
      pb.fz -= nz * f;
    }
    // Luggage: stiff link between owner and case.
    for (const a of this.agents) {
      const cb = a.caseBody;
      if (!cb) continue;
      const ab = a.body;
      const L = T.luggage;
      const dx = cb.x - ab.x;
      const dz = cb.z - ab.z;
      const d = Math.hypot(dx, dz) || 1e-6;
      const nx = dx / d;
      const nz = dz / d;
      const relV = (cb.vx - ab.vx) * nx + (cb.vz - ab.vz) * nz;
      const f = clamp(L.k * (d - L.rest) + L.linkDamping * relV, -60, 60);
      ab.fx += nx * f;
      ab.fz += nz * f;
      cb.fx -= nx * f;
      cb.fz -= nz * f;
    }
    // Families: cohesion toward the cluster centroid.
    const sums = new Map<number, [number, number, number]>();
    for (const a of this.agents) {
      if (!a.clusterId) continue;
      const s = sums.get(a.clusterId) ?? [0, 0, 0];
      s[0] += a.body.x;
      s[1] += a.body.z;
      s[2] += 1;
      sums.set(a.clusterId, s);
    }
    for (const a of this.agents) {
      if (!a.clusterId) continue;
      const s = sums.get(a.clusterId)!;
      if (s[2] < 2) continue;
      const cx = s[0] / s[2];
      const cz = s[1] / s[2];
      const dx = cx - a.body.x;
      const dz = cz - a.body.z;
      const d = Math.hypot(dx, dz);
      const dzn = T.family.cohesionDeadzone;
      if (d > dzn) {
        const f = T.family.cohesionK * (d - dzn) * a.body.mass;
        a.body.fx += (dx / d) * f;
        a.body.fz += (dz / d) * f;
      }
    }
    void dt;
  }

  private applyStenchRepel(): void {
    const S = TUNING.types.stench;
    for (const s of this.agents) {
      if (s.kind !== 'stench') continue;
      const near = this.world.query(s.body.x, s.body.z, S.repelRadius, this.tmp);
      for (const o of near) {
        if (o === s.body) continue;
        const ag = this.byBody.get(o.id);
        if (!ag || ag.kind === 'stench') continue;
        const dx = o.x - s.body.x;
        const dz = o.z - s.body.z;
        const d = Math.hypot(dx, dz) || 1e-6;
        const f = S.repelForce * (1 - d / (S.repelRadius + o.r)) * o.mass;
        if (f <= 0) continue;
        o.fx += (dx / d) * f;
        o.fz += (dz / d) * f;
      }
    }
  }
}
