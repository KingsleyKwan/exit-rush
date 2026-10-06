import { PASS_KID, PASS_LUGGAGE, PASS_SQUAT, applyImpulse, createBody, setMass, type Body, type World } from './Physics';
import { PASSENGER_DEFS, type PassengerKind } from '../PassengerTypes';
import type { BossKind } from '../bosses';
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
  /** v0.7 boss state (shared by both halves of the couple boss); null for ordinary passengers. */
  boss: BossState | null;
  /** Original standing spot (bosses step aside from it while yielding, then return). */
  originX: number;
  originZ: number;
}

/** v0.7: a boss is worn down, not defeated — see TUNING.boss. */
export interface BossState {
  kind: BossKind;
  /** 1 = immovable … 0 = yields. */
  stub: number;
  yieldUntil: number;
  /** Visual / mechanic size multiplier (TUNING.boss.scale, smaller at L100). */
  size: number;
  /** Mechanic cooldown (kids, dashes). */
  cd: number;
  /** Player-hit cooldown (bounce, bump). */
  hitCd: number;
  lastPushT: number;
  /** Last time the player leaned on the royal couple's hand-hold. */
  linkT: number;
  /** Luggage / couple link rest length override. */
  rest: number;
  clusterId: number;
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
  /** v0.7: STR ult Iron Bull Charge active — rams through a boss's stubbornness. */
  playerCharging?: boolean;
  /** v0.7: STR 60 Stand Firm owned (boss shoves ignore other resist). */
  standFirm?: boolean;
  /** v0.7: player push-force multiplier (STR) — speeds up wearing a boss down. */
  pushForce?: number;
  /** SPD Thread: the couple hand-hold link does not block the player. */
  threadCouples?: boolean;
  emit: Emit;
  /** `heavy` = a boss shove (longer stun unless Stand Firm). */
  onPlayerShoved: (dx: number, dz: number, power: number, heavy?: boolean) => void;
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
/** v0.7: reset per Sim (agent ids feed wander phase) so runs are seed-deterministic. */
export function resetAgentIds(): void {
  agentSeq = 0;
  groupSeq = 0;
}

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

  /** Sim time of the last update (views use it for boss yield state). */
  get time(): number {
    return this.now;
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
      boss: null,
      originX: x,
      originZ: z,
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
    // 大聲公 intro car must actually contain a couple of loudmouths to learn from: the car is
    // packed by now, so swap plain commuters (away from the player) for loudmouths in place.
    if (level.introKind === 'loud') {
      let have = this.agents.filter((a) => a.kind === 'loud').length;
      const swap = this.agents.filter((a) => a.kind === 'normal' && Math.hypot(a.body.x - avoidX, a.body.z - avoidZ) > 1.6);
      while (have < 2 && swap.length) {
        const old = swap.splice(Math.floor(this.rng() * swap.length), 1)[0];
        const { x, z } = old.body;
        this.world.remove(old.body);
        this.byBody.delete(old.body.id);
        this.agents.splice(this.agents.indexOf(old), 1);
        this.makeAgent('loud', x, z, 'rider', false);
        have++;
      }
    }
    if (level.boss?.length) this.spawnBosses(level.boss, openBays, level.boss.length > 1);
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

  // ------------------------------------------------------------------ bosses

  /** Remove one passenger (and its suitcase / hand-hold) — used to clear room for a boss. */
  private removeAgent(a: Agent): void {
    this.world.remove(a.body);
    if (a.caseBody) this.world.remove(a.caseBody);
    if (a.partner) a.partner.partner = null;
    this.byBody.delete(a.body.id);
    const i = this.agents.indexOf(a);
    if (i >= 0) this.agents.splice(i, 1);
  }

  private clearAround(x: number, z: number, r: number): void {
    for (const a of [...this.agents]) {
      if (a.boss) continue;
      const near = (b: Body) => Math.hypot(b.x - x, b.z - z) < r + b.r;
      if (near(a.body) || (a.caseBody && near(a.caseBody))) {
        const p = a.partner;
        this.removeAgent(a);
        if (p && !p.boss) this.removeAgent(p);
      }
    }
  }

  /**
   * Bosses stand between the player's start (+X, +Z) and the exit bay. Single-boss levels
   * use a per-type spot; the L100 finale packs all eight along the route at a smaller size.
   */
  private spawnBosses(kinds: readonly BossKind[], openBays: readonly number[], finale: boolean): void {
    const B = TUNING.boss;
    const wall = doorWallX();
    const bay = nearestDoorBay(3.05, openBays);
    const size = finale ? B.scaleFinale : B.scale;
    // Single bosses plant themselves in the door vestibule: push him aside, slip past, or counter.
    const single: Record<BossKind, [number, number]> = {
      luggage: [0.75, 0.8],
      stench: [0.66, 0],
      squat: [0.6, 0.2],
      family: [0.68, 0],
      brat: [0.7, 0],
      couple: [0.72, 0],
      angry: [0.66, 0],
      loud: [0.68, 0],
    };
    // Finale: a gauntlet of kings along the route (door mouth kept passable — the jam is the kings).
    const fin: Record<BossKind, [number, number]> = {
      squat: [0.95, -0.55],
      couple: [1.3, 0.45],
      luggage: [2.05, 1.5],
      angry: [1.55, 2.4],
      stench: [2.9, 1.2],
      family: [0.8, 2.35],
      brat: [2.4, -0.7],
      loud: [3.25, -1.9],
    };
    for (const kind of kinds) {
      const [ox, oz] = (finale ? fin : single)[kind];
      const x = wall + ox;
      const z = clamp(bay + oz, CAR_Z_MIN + 0.5, CAR_Z_MAX - 0.5);
      this.spawnBoss(kind, x, z, size);
    }
  }

  private makeBossBody(kind: BossKind, x: number, z: number, size: number, state: BossState): Agent {
    const B = TUNING.boss;
    const k = size / B.scale;
    const def = PASSENGER_DEFS[kind];
    // Floor the base size so the tiny brat still makes a king-sized obstacle.
    const r = Math.max(0.24, def.radius) * (1 + (B.radiusMul - 1) * k);
    this.clearAround(x, z, r + 0.08);
    const a = this.makeAgent(kind, x, z, 'rider', false);
    a.body.r = r;
    setMass(a.body, Math.max(1.3, def.mass) * (1 + (B.massMul - 1) * k));
    a.scale = (def.scale ?? 1) * size;
    a.boss = state;
    a.dazedUntil = -1;
    a.shoveCd = 1.2;
    return a;
  }

  /** Spawn one boss (public for scripted tests). */
  spawnBoss(kind: BossKind, x: number, z: number, size: number = TUNING.boss.scale): void {
    const B = TUNING.boss;
    const st: BossState = { kind, stub: 1, yieldUntil: -1, size, cd: 1.2, hitCd: 0, lastPushT: -9, linkT: -9, rest: 0, clusterId: 0 };
    if (kind === 'couple') {
      // Hand in hand across the approach to the door (Z span), both crowned.
      st.rest = B.couple.rest * (size / B.scale);
      const a = this.makeBossBody('couple', x, z - st.rest / 2, size, st);
      const b = this.makeBossBody('couple', x, z + st.rest / 2, size, st);
      a.partner = b;
      b.partner = a;
      return;
    }
    const a = this.makeBossBody(kind, x, z, size, st);
    if (kind === 'luggage') {
      const L = TUNING.types.luggage;
      const BL = B.luggage;
      const k = size / B.scale;
      st.rest = BL.rest * k;
      const cr = L.caseRadius * (1 + (BL.caseRadiusMul - 1) * k);
      // Giant case parked on the player's side of him.
      // Giant case parked in the doorway itself (owner stands just inside, beside the door).
      const cx = x - 0.28;
      const cz = z - st.rest;
      this.clearAround(cx, cz, cr + 0.05);
      const g = ++groupSeq + 10000;
      const cb = createBody({ x: cx, z: cz, r: cr, mass: L.caseMass * (1 + (BL.caseMassMul - 1) * k), damping: L.caseDamping, restitution: 0.3, maxSpeed: 5, group: g });
      cb.passTag = PASS_LUGGAGE;
      a.body.group = g;
      this.world.add(cb);
      a.caseBody = cb;
    } else if (kind === 'family') {
      st.clusterId = a.clusterId = ++this.clusterSeq;
      for (let k = 0; k < 2; k++) this.spawnBossKid(a);
    }
  }

  /** 大家長: one more kid joins the trail (toward the player — the trail is in your way). */
  private spawnBossKid(lead: Agent, towardX = 1, towardZ = 1): boolean {
    const st = lead.boss!;
    if (this.world.bodies.length >= TUNING.physics.maxBodies) return false;
    let n = 0;
    for (const o of this.agents) if (o.isKid && o.clusterId === st.clusterId) n++;
    if (n >= TUNING.boss.family.maxKids) return false;
    const l = Math.hypot(towardX, towardZ) || 1;
    const off = lead.body.r + 0.3 + n * 0.12;
    const px = lead.body.x + (towardX / l) * off + (this.rng() - 0.5) * 0.5;
    const pz = lead.body.z + (towardZ / l) * off + (this.rng() - 0.5) * 0.5;
    const r = PASSENGER_DEFS.family.radius * 0.78;
    const spot = this.findSpot(clamp(px, -TUNING.car.halfWidth + 0.3, TUNING.car.halfWidth - 0.3), clamp(pz, CAR_Z_MIN + 0.3, CAR_Z_MAX - 0.3), r, 0.5);
    if (!spot) return false;
    const kid = this.makeAgent('family', spot[0], spot[1], 'rider', true);
    kid.clusterId = st.clusterId;
    kid.bumpAcc = 1;
    return true;
  }

  /** Boss agents (both couple halves included). */
  bosses(): Agent[] {
    return this.agents.filter((a) => a.boss);
  }

  /** Called when the player's shove lands on a boss: chips the stubbornness bar. */
  hitBoss(a: Agent, power: number): void {
    const s = a.boss;
    if (!s || s.yieldUntil > this.now) return;
    s.stub = Math.max(0, s.stub - TUNING.boss.shoveDrain * power);
    s.lastPushT = this.now;
  }

  private updateBosses(dt: number, ctx: CrowdCtx): void {
    const B = TUNING.boss;
    const pl = ctx.player;
    const groups = new Map<BossState, Agent[]>();
    for (const a of this.agents) {
      if (!a.boss) continue;
      const g = groups.get(a.boss);
      if (g) g.push(a);
      else groups.set(a.boss, [a]);
    }
    for (const [s, list] of groups) {
      const yielding = s.yieldUntil > ctx.time;
      s.hitCd -= dt;
      // Leaning on him (body or his suitcase) while moving into him wears him down.
      let touching = ctx.time - s.linkT < 0.05;
      if (ctx.playerMoving > 0.2) {
        for (const a of list) {
          for (const b of a.caseBody ? [a.body, a.caseBody] : [a.body]) {
            const dx = b.x - pl.x;
            const dz = b.z - pl.z;
            const d = Math.hypot(dx, dz) || 1e-6;
            if (d < b.r + pl.r + 0.07 && (dx * ctx.playerDirX + dz * ctx.playerDirZ) / d > 0.15) touching = true;
          }
        }
      }
      if (!yielding) {
        if (touching) {
          s.stub -= B.contactDrain * (ctx.pushForce ?? 1) * ctx.playerMoving * (ctx.playerCharging ? B.chargeDrainMul : 1) * dt;
          s.lastPushT = ctx.time;
        } else if (ctx.time - s.lastPushT > 0.8) {
          s.stub = Math.min(1, s.stub + B.regen * dt);
        }
        if (s.stub <= 0) {
          // Yield: step aside, sideways off the player's line toward the door.
          s.stub = 0;
          s.yieldUntil = ctx.time + B.yieldTime;
          const dirX = ctx.playerDirX || -0.7;
          const dirZ = ctx.playerDirZ || -0.7;
          for (const a of list) {
            const lat = (a.body.x - pl.x) * -dirZ + (a.body.z - pl.z) * dirX;
            const sg = lat >= 0 ? 1 : -1;
            a.homeX = clamp(a.originX - dirZ * sg * B.stepAside, -TUNING.car.halfWidth + 0.45, TUNING.car.halfWidth - 0.45);
            a.homeZ = clamp(a.originZ + dirX * sg * B.stepAside, CAR_Z_MIN + 0.45, CAR_Z_MAX - 0.45);
            a.splitUntil = s.yieldUntil;
            a.windup = -1;
            a.bumpAcc = 1;
          }
          ctx.emit({ t: 'bossYield', x: list[0].body.x, z: list[0].body.z, agentId: list[0].id });
        }
      } else if (s.yieldUntil - ctx.time <= dt) {
        for (const a of list) {
          a.homeX = a.originX;
          a.homeZ = a.originZ;
        }
      }
      if (yielding) continue;
      const a = list[0];
      const b = a.body;
      const dx = pl.x - b.x;
      const dz = pl.z - b.z;
      const d = Math.hypot(dx, dz) || 1e-6;
      if (s.kind === 'luggage' && a.caseBody && s.hitCd <= 0 && !(pl.passMask & PASS_LUGGAGE)) {
        // Giant suitcase: bouncy — walking into it springs you back.
        const c = a.caseBody;
        const cx = pl.x - c.x;
        const cz = pl.z - c.z;
        const cd = Math.hypot(cx, cz) || 1e-6;
        if (cd < c.r + pl.r + 0.05) {
          const j = B.luggage.bounce * (1 - ctx.angryResist * 0.5);
          // Springs you back into the car (away from the door), not around the case.
          let bx = cx / cd + 1.2;
          let bz = cz / cd;
          const bl = Math.hypot(bx, bz) || 1;
          bx /= bl;
          bz /= bl;
          applyImpulse(pl, bx * j, bz * j);
          s.hitCd = B.luggage.bounceCd;
          a.bumpAcc = 0.8;
          ctx.emit({ t: 'bossBounce', x: pl.x, z: pl.z, dx: bx, dz: bz, power: j });
        }
      } else if (s.kind === 'family') {
        s.cd -= dt * (1 - ctx.calm);
        if (s.cd <= 0) {
          s.cd = B.family.kidEvery;
          this.spawnBossKid(a, dx, dz);
        }
      } else if (s.kind === 'brat' && a.dazedUntil <= ctx.time) {
        s.cd -= dt * (1 - ctx.calm);
        if (s.cd <= 0 && d < B.brat.range) {
          s.cd = B.brat.dashEvery * (0.8 + this.rng() * 0.4);
          applyImpulse(b, (dx / d) * B.brat.dashImpulse * b.mass, (dz / d) * B.brat.dashImpulse * b.mass);
          a.bumpAcc = 1;
        }
        const sp = Math.hypot(b.vx, b.vz);
        if (d < b.r + pl.r + 0.08 && sp > 1.2 && s.hitCd <= 0 && !ctx.angryImmune) {
          const j = B.brat.bump * (1 - (ctx.standFirm ? ctx.angryResist : ctx.angryResist * B.angry.resistKeep));
          applyImpulse(pl, (dx / d) * j, (dz / d) * j);
          s.hitCd = B.brat.bumpCd;
          ctx.emit({ t: 'bossBounce', x: pl.x, z: pl.z, dx: dx / d, dz: dz / d, power: j });
        }
      }
    }
  }

  private spawnBoarderUnit(level: LevelDef, openBays: readonly number[]): number {
    let kind = pickKind(level.mix, this.rng);
    // 大聲公 are riders already mid-call; boarders streaming through the door would park the
    // noise zone on the exit itself (unavoidable), so they board as plain commuters.
    if (kind === 'loud') kind = 'normal';
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
      const reach = 1.1 * (a.boss ? 1.3 : 1);
      if (d > reach || d < 1e-4) continue;
      // Lateral alignment: beside you more than in front.
      const along = (rx * aimX + rz * aimZ) / d;
      const lat = Math.abs(rx * aimZ - rz * aimX) / d;
      if (lat > 0.35 && along < 0.55) {
        extra += T.lateralDrag * (1 - d / reach);
      }
    }
    return Math.min(0.45, extra);
  }

  /**
   * 大聲公 noise intensity at a point: 0 outside every loudmouth's radius, else the summed
   * falloff (edge → 1 at the centre), capped at `stackCap`. Multiply by `drainPeak` for stamina/s.
   */
  noiseAt(x: number, z: number): number {
    const L = TUNING.types.loud;
    let n = 0;
    for (const a of this.agents) {
      if (!PASSENGER_DEFS[a.kind].noise) continue;
      const R = L.radius * (a.boss ? a.boss.size : 1);
      const d = Math.hypot(a.body.x - x, a.body.z - z);
      if (d < R) n += L.edge + (1 - L.edge) * (1 - d / R);
    }
    return Math.min(L.stackCap, n);
  }

  auraSlowAt(x: number, z: number): number {
    const R = TUNING.types.stench.auraRadius;
    let s = 0;
    for (const a of this.agents) {
      const def = PASSENGER_DEFS[a.kind];
      if (!def.auraSlow) continue;
      const k = a.boss ? a.boss.size : 1;
      const Ra = R * k;
      const d = Math.hypot(a.body.x - x, a.body.z - z);
      if (d < Ra) s += def.auraSlow * (a.boss ? TUNING.boss.stench.auraMul : 1) * (1 - d / Ra);
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
        const bossYield = !!a.boss && a.boss.yieldUntil > ctx.time;
        const anchorMul = a.boss ? Math.max(1.3, def.anchorMul) * (bossYield ? TUNING.boss.yieldAnchor : TUNING.boss.anchorMul) : def.anchorMul;
        const k = C.anchorK * anchorMul * m;
        fx = dx * k;
        fz = dz * k;
        const cap = C.anchorMax * Math.max(def.anchorMul, anchorMul) * m;
        const fm = Math.hypot(fx, fz);
        if (fm > cap) {
          fx *= cap / fm;
          fz *= cap / fm;
        }
        const disp = Math.hypot(dx, dz);
        if (a.boss) {
          // Bosses never give up their spot (they only step aside while yielding).
        } else if (disp > C.driftDist) {
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
        if (a.mode === 'rider' && !a.boss && ctx.pressureField > 0) {
          const dd = b.x - ctx.doorWallX;
          if (dd > 0 && dd < C.pressureRange) {
            fx += C.pressureForce * ctx.pressureField * (1 - dd / C.pressureRange) * m;
          }
        }
        // Sidestep for the player ("唔該借借") — stronger with WIS.
        if (a.mode === 'rider' && !a.boss && ctx.playerMoving > 0.2 && ctx.yieldK > 0) {
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

    this.updateBosses(dt, ctx);
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
    const BA = TUNING.boss.angry;
    const boss = a.boss;
    if (boss && boss.yieldUntil > ctx.time) return;
    const reach = T.range * (boss ? BA.rangeMul : 1) + pl.r + a.body.r;
    if (a.windup >= 0) {
      a.windup -= dt * (1 - ctx.calm);
      if (boss) {
        // 嬲嬲豬王 charges while winding up.
        a.body.fx += (dx / d) * BA.chargeForce * a.body.mass * (1 - ctx.calm);
        a.body.fz += (dz / d) * BA.chargeForce * a.body.mass * (1 - ctx.calm);
      }
      if (a.windup < 0) {
        a.windup = -1;
        a.shoveCd = (def.shoveInterval ?? 3) * (0.7 + this.rng() * 0.6) * (boss ? BA.intervalMul : 1);
        if (d < reach * 1.25 && !ctx.angryImmune) {
          const nx = dx / d;
          const nz = dz / d;
          const power = (T.impulse * (def.shoveForce ?? 2.8)) / 2.8 * (boss ? BA.impulseMul : 1);
          const resist = boss && !ctx.standFirm ? ctx.angryResist * BA.resistKeep : ctx.angryResist;
          const j = power * (1 - resist);
          applyImpulse(pl, nx * j, nz * j);
          // Recoil + push neighbours: the angry man barges.
          applyImpulse(a.body, -nx * j * 0.25, -nz * j * 0.25);
          a.bumpAcc = 1;
          ctx.onPlayerShoved(nx, nz, j, !!boss);
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
      a.windup = T.windup * (boss ? BA.windupMul : 1);
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
      if (a.boss) this.handHoldBarrier(a, p, ctx);
      const relV = (pb.vx - ab.vx) * nx + (pb.vz - ab.vz) * nz;
      const rest = a.boss ? a.boss.rest : T.couple.rest;
      const maxF = T.couple.maxForce * (a.boss ? TUNING.boss.couple.maxForceMul : 1);
      let f = T.couple.k * (a.boss ? 2 : 1) * (d - rest) + T.couple.damping * relV;
      f = clamp(f, -maxF, maxF);
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
      const f = a.boss
        ? clamp(L.k * 2 * (d - a.boss.rest) + L.linkDamping * relV, -160, 160)
        : clamp(L.k * (d - L.rest) + L.linkDamping * relV, -60, 60);
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

  /** 黏身情侶王: their joined hands are a rope across the aisle — you can't walk through it. */
  private handHoldBarrier(a: Agent, p: Agent, ctx: CrowdCtx): void {
    const pl = ctx.player;
    const ab = a.body;
    const pb = p.body;
    const sx = pb.x - ab.x;
    const sz = pb.z - ab.z;
    const L2 = sx * sx + sz * sz;
    if (L2 < 1e-6) return;
    const t = ((pl.x - ab.x) * sx + (pl.z - ab.z) * sz) / L2;
    if (t <= 0.05 || t >= 0.95) return;
    const qx = ab.x + sx * t;
    const qz = ab.z + sz * t;
    let nx = pl.x - qx;
    let nz = pl.z - qz;
    const d = Math.hypot(nx, nz);
    const reach = pl.r + 0.06;
    if (d >= reach) return;
    if (d < 1e-5) {
      nx = sz;
      nz = -sx;
    }
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    // Push the player back out to their side and cancel velocity into the rope.
    const pen = reach - d;
    pl.x += nx * pen * 0.6;
    pl.z += nz * pen * 0.6;
    const vn = pl.vx * nx + pl.vz * nz;
    if (vn < 0) {
      pl.vx -= vn * nx * 1.2;
      pl.vz -= vn * nz * 1.2;
    }
    a.boss!.linkT = ctx.time;
  }

  private applyStenchRepel(): void {
    const S = TUNING.types.stench;
    for (const s of this.agents) {
      if (s.kind !== 'stench') continue;
      const rr = S.repelRadius * (s.boss ? s.boss.size : 1);
      const near = this.world.query(s.body.x, s.body.z, rr, this.tmp);
      for (const o of near) {
        if (o === s.body) continue;
        const ag = this.byBody.get(o.id);
        if (!ag || ag.kind === 'stench') continue;
        const dx = o.x - s.body.x;
        const dz = o.z - s.body.z;
        const d = Math.hypot(dx, dz) || 1e-6;
        const f = S.repelForce * (1 - d / (rr + o.r)) * o.mass;
        if (f <= 0) continue;
        o.fx += (dx / d) * f;
        o.fz += (dz / d) * f;
      }
    }
  }
}
