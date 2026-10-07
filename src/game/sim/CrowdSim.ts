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
  /** Holds the original spot (door glass, bench, short-path hazard). Home does not drift. */
  posted: boolean;
  /** Sitting on a bench. Collision is the knees in the aisle in front of the cushion. */
  seated: boolean;
  /** Yaw to keep while sitting or leaning (null = free to turn). */
  seatYaw: number | null;
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
  // ---- v0.8 mage status (defaults 0 = inactive)
  /** Ice chill: drive ×0, anchor ×1.5. */
  chillUntil: number;
  /** Ice freeze: rigid statue. */
  freezeUntil: number;
  /** Radius before freeze-shrink (0 = unset). */
  baseR: number;
  /** Brief no-collision window after freeze lands. */
  freezeGhostUntil: number;
  /** Fire cleanse: stench aura off. */
  auraOffUntil: number;
  /** Volt dropped call: loudmouth noise off. */
  callOffUntil: number;
  /** Chill Out: angry wind-up suppressed until. */
  chillWindupUntil: number;
  /** Gear L decoy: brat steers here until this time. */
  lureUntil: number;
  lureX: number;
  lureZ: number;
  /** Gear L tablet: family stops (no collision) until this time. */
  huddleUntil: number;
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
  /** When false, hurdle does not skip the giant boss suitcase. Hero default: allow. */
  passBossLuggage?: boolean;
  emit: Emit;
  /** `heavy` = a boss shove (longer stun unless Stand Firm). */
  onPlayerShoved: (dx: number, dz: number, power: number, heavy?: boolean) => void;
}

/**
 * Specials that can lean on the door glass without parking a noise ring or a
 * stench cloud on the opening. Loudmouths and stench stay on the short way.
 */
const GLASS_KINDS = new Set<PassengerKind>(['squat', 'angry', 'brat', 'luggage', 'couple', 'family']);

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
      posted: false,
      seated: false,
      seatYaw: null,
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
      chillUntil: -1,
      freezeUntil: -1,
      baseR: 0,
      freezeGhostUntil: -1,
      auraOffUntil: -1,
      callOffUntil: -1,
      chillWindupUntil: -1,
      lureUntil: -1,
      lureX: 0,
      lureZ: 0,
      huddleUntil: -1,
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

  /** From L20 the car is no longer an empty diagonal: seats, door glass, and the short way are taken. */
  private shapedCar(level: LevelDef): boolean {
    return level.id >= 20 && level.id < 100;
  }

  /**
   * Both sides of every door, inside the vestibule, backs toward the glass
   * beside the bench. The middle of the opening stays a sideways squeeze.
   * Open doors come first — that is the squeeze the player actually uses.
   */
  private doorSideHomes(openBays: readonly number[]): { x: number; z: number; yaw: number }[] {
    const x = -1.52;
    const yaw = Math.PI / 2;
    const open = new Set(openBays);
    const bays = [...TUNING.car.doorBays].sort((a, b) => {
      const ao = open.has(a) ? 0 : 1;
      const bo = open.has(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return b - a;
    });
    const out: { x: number; z: number; yaw: number }[] = [];
    for (const bay of bays) {
      out.push({ x, z: bay + 0.5, yaw }, { x, z: bay - 0.5, yaw });
    }
    return out;
  }

  /** Nearest door bay to a glass spot (the opening whose middle must stay clear). */
  private bayOf(z: number): number {
    let bay: number = TUNING.car.doorBays[0];
    let best = Infinity;
    for (const z0 of TUNING.car.doorBays) {
      const d = Math.abs(z - z0);
      if (d < best) {
        best = d;
        bay = z0;
      }
    }
    return bay;
  }

  /** True if this circle covers the middle of a door opening. */
  private coversGap(x: number, z: number, r: number, bay: number): boolean {
    return Math.hypot(x + 1.52, z - bay) < r + 0.18;
  }

  /** A spawned group (or its suitcase) is standing in an open doorway. */
  private groupCoversGap(made: readonly Agent[], openBays: readonly number[]): boolean {
    for (const a of made) {
      const bodies = a.caseBody ? [a.body, a.caseBody] : [a.body];
      for (const b of bodies) {
        for (const bay of openBays) {
          if (Math.hypot(b.x + 1.52, b.z - bay) < b.r + 0.12) return true;
        }
      }
    }
    return false;
  }

  /**
   * Suitcase in the aisle, not across the opening. The link rest is shorter
   * than the two radii, so a case at rest distance overlaps its owner and the
   * spawn fallback steps +Z — straight into the door when the owner is on the
   * lower side of the glass.
   */
  private aisleCase(homeX: number, homeZ: number): { x: number; z: number } | null {
    const r = PASSENGER_DEFS.luggage.radius;
    const L = TUNING.types.luggage;
    const x = homeX + r + L.caseRadius + 0.02;
    const z = homeZ;
    if (!this.canFit(x, z, L.caseRadius) || this.coversGap(x, z, L.caseRadius, this.bayOf(z))) return null;
    return { x, z };
  }

  /** Parent against the glass, both kids in the aisle. The wall side has no room for a child. */
  private familyRow(home: { x: number; z: number }): { x: number; z: number; kid: boolean }[] | null {
    const bay = this.bayOf(home.z);
    // +Z side only: a child stepping toward −Z would stand in the opening.
    if (!(home.z > bay)) return null;
    const r = PASSENGER_DEFS.family.radius;
    const kidR = r * 0.78;
    const x1 = home.x + r + kidR + 0.04;
    const x2 = x1 + kidR * 2 + 0.04;
    const spots = [
      { x: home.x, z: home.z, kid: false },
      { x: x1, z: home.z, kid: true },
      { x: x2, z: home.z, kid: true },
    ];
    for (const s of spots) {
      const rr = s.kid ? kidR : r;
      if (!this.canFit(s.x, s.z, rr) || this.coversGap(s.x, s.z, rr, bay)) return null;
    }
    return spots;
  }

  /** True if this special can take the spot without standing in the door gap. */
  private glassFits(kind: PassengerKind, home: { x: number; z: number }): boolean {
    const bay = this.bayOf(home.z);
    if (kind === 'family') return this.familyRow(home) !== null;
    if (kind === 'couple') {
      const r = PASSENGER_DEFS.couple.radius;
      const x2 = home.x + TUNING.types.couple.rest;
      return this.canFit(home.x, home.z, r) && this.canFit(x2, home.z, r) && !this.coversGap(home.x, home.z, r, bay) && !this.coversGap(x2, home.z, r, bay);
    }
    if (kind === 'luggage') {
      const r = PASSENGER_DEFS.luggage.radius;
      return this.canFit(home.x, home.z, r) && !this.coversGap(home.x, home.z, r, bay) && this.aisleCase(home.x, home.z) !== null;
    }
    const r = PASSENGER_DEFS[kind].radius;
    return this.canFit(home.x, home.z, r) && !this.coversGap(home.x, home.z, r, bay);
  }

  private attachCase(owner: Agent, cx: number, cz: number): void {
    const L = TUNING.types.luggage;
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
  }

  /** Plant one special against the glass. Caller has already checked glassFits. */
  private plantGlass(kind: PassengerKind, home: { x: number; z: number; yaw: number }): number {
    const stamp = (a: Agent) => {
      a.posted = true;
      a.seatYaw = home.yaw;
    };
    if (kind === 'luggage') {
      const spot = this.aisleCase(home.x, home.z);
      if (!spot) return 0;
      const owner = this.makeAgent('luggage', home.x, home.z, 'rider');
      this.attachCase(owner, spot.x, spot.z);
      stamp(owner);
      return 1;
    }
    if (kind === 'family') {
      const spots = this.familyRow(home);
      if (!spots) return 0;
      const cid = ++this.clusterSeq;
      for (const s of spots) {
        const a = this.makeAgent('family', s.x, s.z, 'rider', s.kid);
        a.clusterId = cid;
        stamp(a);
      }
      return spots.length;
    }
    if (kind === 'couple') {
      const r = PASSENGER_DEFS.couple.radius;
      const x2 = home.x + TUNING.types.couple.rest;
      const a = this.makeAgent('couple', home.x, home.z, 'rider');
      const b = this.makeAgent('couple', x2, home.z, 'rider');
      a.partner = b;
      b.partner = a;
      stamp(a);
      stamp(b);
      return 2;
    }
    const a = this.makeAgent(kind, home.x, home.z, 'rider');
    stamp(a);
    return 1;
  }

  /**
   * Two seats per bench side. Collision sits just in front of the cushion
   * (a body inside the bench box does not fit). Door-wall benches first.
   */
  private benchPairs(): { x: number; yaw: number; z0: number; z1: number }[] {
    const dh = TUNING.car.doorHalf;
    const bays = [...TUNING.car.doorBays].sort((a, b) => a - b);
    const out: { x: number; yaw: number; z0: number; z1: number }[] = [];
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < bays.length - 1; i++) {
        const cz = (bays[i] + dh + bays[i + 1] - dh) / 2;
        out.push({
          x: side * 0.98,
          yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
          z0: cz - 0.34,
          z1: cz + 0.34,
        });
      }
    }
    return out;
  }

  /** A standing spot must not steal a loudmouth or stench home. */
  private clearOfHazards(x: number, z: number, r: number, openBays: readonly number[], fromZ: number): boolean {
    for (const kind of ['loud', 'stench'] as const) {
      const hr = PASSENGER_DEFS[kind].radius;
      for (const h of this.shortHomes(openBays, fromZ, kind, true)) {
        if (Math.hypot(x - h.x, z - h.z) < r + hr + 0.08) return false;
      }
    }
    return true;
  }

  /**
   * Two children on the bench, parent standing in the aisle in front of them.
   * Most of the family sits; the one without a seat blocks that lane.
   */
  private trySeatFamily(
    pair: { x: number; yaw: number; z0: number; z1: number },
    openBays: readonly number[],
    avoidZ: number,
  ): Agent[] | null {
    const r = PASSENGER_DEFS.family.radius;
    const kidR = r * 0.78;
    if (!this.canFit(pair.x, pair.z0, kidR) || !this.canFit(pair.x, pair.z1, kidR)) return null;
    const into = pair.yaw > 0 ? 1 : -1;
    // Tuck the parent against both children. A side-by-side gap leaves them
    // standing in the middle of the aisle instead of just in front of the seat.
    const standZ = (pair.z0 + pair.z1) / 2;
    const dz = Math.abs(pair.z1 - standZ);
    const need = kidR + r + 0.02;
    const dx = Math.sqrt(Math.max(need * need - dz * dz, 0.04 * 0.04));
    const standX = pair.x + into * dx;
    if (!this.canFit(standX, standZ, r)) return null;
    if (!this.clearOfHazards(standX, standZ, r, openBays, avoidZ)) return null;
    for (const bay of openBays) {
      if (this.coversGap(standX, standZ, r, bay)) return null;
    }
    const cid = ++this.clusterSeq;
    const made: Agent[] = [];
    const sit = (x: number, z: number) => {
      const a = this.makeAgent('family', x, z, 'rider', true);
      a.clusterId = cid;
      a.posted = true;
      a.seated = true;
      a.seatYaw = pair.yaw;
      made.push(a);
    };
    sit(pair.x, pair.z0);
    sit(pair.x, pair.z1);
    const parent = this.makeAgent('family', standX, standZ, 'rider', false);
    parent.clusterId = cid;
    parent.posted = true;
    // Face the bench, toward the children.
    parent.seatYaw = -pair.yaw;
    made.push(parent);
    return made;
  }

  /**
   * Loudmouth / stench spots on the short way to the nearest door.
   * The ring or cloud must be able to miss both the spawn and the open mouth,
   * so two-door stench stands beside that short crossing rather than on the mouth.
   */
  private shortHomes(openBays: readonly number[], fromZ: number, kind: 'loud' | 'stench', shaped: boolean): { x: number; z: number }[] {
    const near = nearestDoorBay(fromZ, openBays);
    const longWay = openBays.some((z) => Math.abs(z - near) > 0.5);
    if (!shaped) {
      if (kind === 'stench') return [];
      if (longWay) {
        return [
          { x: -0.4, z: near - 0.55 },
          { x: -0.6, z: near - 0.95 },
          { x: -0.25, z: near - 0.8 },
          { x: -0.5, z: near - 1.05 },
        ];
      }
      return [
        { x: 0.95, z: near + 1.2 },
        { x: 0.85, z: near + 0.25 },
        { x: 0.78, z: near - 0.7 },
        { x: 0.7, z: near - 1.55 },
      ];
    }
    if (longWay) {
      // Loudmouths screen the near door. The crossing is shorter than two stench
      // auras, so stench stands just past the player — the cloud still covers the line.
      return kind === 'loud'
        ? [
            { x: -0.24, z: near + 0.22 },
            { x: -0.2, z: near + 0.05 },
            { x: -0.35, z: near - 0.45 },
          ]
        : [{ x: -0.4, z: near + 1.05 }];
    }
    // One door: center of the diagonal. Seat aisles (x ≈ ±0.98) belong to the sitters.
    // Stench aura is wider than the loud ring, so it stands further toward +X.
    return kind === 'loud'
      ? [
          { x: 0.35, z: near + 1.7 },
          { x: 0.3, z: near + 0.95 },
          { x: 0.25, z: near + 0.4 },
        ]
      : [
          { x: 0.52, z: near + 0.75 },
          { x: 0.62, z: near + 0.2 },
        ];
  }

  /** Points on the way around. A hazard reach must not cover these. */
  private detourPoints(openBays: readonly number[], fromZ: number): [number, number][] {
    const near = nearestDoorBay(fromZ, openBays);
    const far = openBays.find((z) => Math.abs(z - near) > 0.5);
    if (far === undefined) {
      return [
        [-1.05, near + 2.3],
        [-1.05, near + 1.15],
        [-1.1, near + 0.45],
      ];
    }
    const toward = far - near;
    return [
      [1.05, near + toward * 0.31],
      [1.0, near + toward * 0.73],
      [-1.15, far + Math.sign(near - far) * 0.25],
    ];
  }

  /** A spot on a hazard home. Slides away from the player, never onto the spawn, an open mouth, or the detour. */
  private hazardPlace(
    homeX: number,
    homeZ: number,
    avoidX: number,
    avoidZ: number,
    openBays: readonly number[],
    reach: number,
    bodyR: number,
    shaped: boolean,
  ): [number, number] | null {
    const wall = doorWallX();
    const hw = TUNING.car.halfWidth;
    const away = Math.sign(homeZ - avoidZ) || -1;
    const near = nearestDoorBay(avoidZ, openBays);
    const screen = openBays.some((bay) => Math.abs(bay - near) > 0.5);
    const detour = shaped ? this.detourPoints(openBays, avoidZ) : [];
    for (let i = 0; i < 3; i++) {
      const x = clamp(homeX, -hw + 0.45, hw - 0.5);
      let z = clamp(homeZ + away * 0.12 * i, CAR_Z_MIN + 0.55, CAR_Z_MAX - 0.55);
      if (screen && z < near - 1.15) z = near - 1.15;
      if (Math.hypot(x - avoidX, z - avoidZ) < reach + 0.08) continue;
      let blocked = false;
      for (const bay of openBays) {
        if (Math.hypot(x - (wall + 0.35), z - bay) < reach + 0.05) blocked = true;
      }
      for (const [qx, qz] of detour) {
        if (Math.hypot(x - qx, z - qz) < reach + 0.02) blocked = true;
      }
      if (blocked) continue;
      if (this.canFit(x, z, bodyR)) return [x, z];
    }
    return null;
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
    const shaped = this.shapedCar(level);
    let people = 0;
    let guard = 0;
    const rNormal = PASSENGER_DEFS.normal.radius;
    const takeHazard = (kind: 'loud' | 'stench'): [number, number] | null => {
      const reach = kind === 'loud' ? TUNING.types.loud.radius : TUNING.types.stench.auraRadius;
      const bodyR = PASSENGER_DEFS[kind].radius;
      for (const home of this.shortHomes(openBays, avoidZ, kind, shaped)) {
        const spot = this.hazardPlace(home.x, home.z, avoidX, avoidZ, openBays, reach, bodyR, shaped);
        if (spot) return spot;
      }
      return null;
    };
    const queued: PassengerKind[] = [];
    let planned = 0;
    while (people + planned < n && guard++ < n * 4) {
      const kind = pickKind(level.mix, this.rng);
      queued.push(kind);
      planned += kind === 'family' ? 3 : kind === 'couple' ? 2 : 1;
    }
    if (shaped) {
      const pairs = this.benchPairs();
      const used = new Set<number>();
      for (let p = 0; p < pairs.length; p++) {
        const idx = queued.indexOf('family');
        if (idx < 0) break;
        const pair = pairs[p];
        if (!pair) continue;
        const made = this.trySeatFamily(pair, openBays, avoidZ);
        if (!made) continue;
        queued.splice(idx, 1);
        people += made.length;
        used.add(p);
      }
      for (let p = 0; p < pairs.length; p++) {
        if (used.has(p)) continue;
        const pair = pairs[p];
        if (!pair) continue;
        for (const z of [pair.z0, pair.z1]) {
          if (people >= n) break;
          const ni = queued.indexOf('normal');
          if (ni < 0 || !this.canFit(pair.x, z, rNormal)) continue;
          queued.splice(ni, 1);
          const a = this.makeAgent('normal', pair.x, z, 'rider');
          a.posted = true;
          a.seated = true;
          a.seatYaw = pair.yaw;
          people++;
        }
      }
    }
    const placeRider = (kind: PassengerKind, x: number, z: number, spread: number, posted = false) => {
      const made = this.spawnGroup(kind, x, z, 'rider', spread);
      if (posted) for (const a of made) a.posted = true;
      people += made.length;
    };
    const glass: PassengerKind[] = [];
    const later: PassengerKind[] = [];
    for (const kind of queued) {
      if (shaped && GLASS_KINDS.has(kind)) glass.push(kind);
      else later.push(kind);
    }
    if (shaped) {
      // Specials lean on the door glass. Empty sides stay ordinary commuters
      // so every door still has someone on both sides.
      for (const home of this.doorSideHomes(openBays)) {
        if (people >= n) break;
        const idx = glass.findIndex((kind) => this.glassFits(kind, home));
        if (idx >= 0) {
          const [kind] = glass.splice(idx, 1);
          if (kind) {
            const made = this.plantGlass(kind, home);
            if (made > 0) {
              people += made;
              continue;
            }
            glass.unshift(kind);
          }
        }
        const nIdx = later.indexOf('normal');
        if (nIdx >= 0) later.splice(nIdx, 1);
        if (people >= n || !this.canFit(home.x, home.z, rNormal)) continue;
        const a = this.makeAgent('normal', home.x, home.z, 'rider');
        a.posted = true;
        a.seatYaw = home.yaw;
        people++;
      }
      later.push(...glass);
    }
    const rest: PassengerKind[] = [];
    // Hazards first, while the short-way spots are still empty.
    for (const kind of later) {
      if (people >= n) break;
      // Loudmouths always take a short-way spot or they are not spawned — a random
      // one lands on the quiet aisle. Stench does the same once the car is shaped;
      // before L20 it still mixes in at random so the early intro is unchanged.
      const anchored = kind === 'loud' || (kind === 'stench' && shaped);
      if (!anchored) {
        rest.push(kind);
        continue;
      }
      const spot = takeHazard(kind);
      if (!spot) continue;
      placeRider(kind, spot[0], spot[1], 0.08, true);
    }
    for (const kind of rest) {
      if (people >= n) break;
      for (let t = 0; t < 6; t++) {
        const [x, z] = this.randomCarSpot(openBays);
        if (Math.hypot(x - avoidX, z - avoidZ) < 0.75) continue;
        // Leave the middle of each open door as a squeeze. Glass riders already own the sides.
        const inGap = shaped && openBays.some((bay) => Math.hypot(x + 1.52, z - bay) < 0.85);
        if (inGap) continue;
        const made = this.spawnGroup(kind, x, z, 'rider', 0.45);
        if (made.length === 0) continue;
        // A lead can clear the gap while a child or suitcase does not.
        if (shaped && this.groupCoversGap(made, openBays)) {
          for (const a of made) this.removeAgent(a);
          continue;
        }
        people += made.length;
        break;
      }
    }
    // Intro car teaches the detour: at least two loudmouths standing on the short way.
    if (level.introKind === 'loud') {
      const homes = this.shortHomes(openBays, avoidZ, 'loud', shaped);
      for (const home of homes) {
        const have = this.agents.filter((a) => a.kind === 'loud').length;
        if (have >= 2) break;
        const taken = this.agents.some((a) => a.kind === 'loud' && Math.hypot(a.body.x - home.x, a.body.z - home.z) < 0.55);
        if (taken) continue;
        const postedThere = this.agents.some((a) => a.posted && Math.hypot(a.body.x - home.x, a.body.z - home.z) < 0.5);
        if (postedThere) continue;
        this.clearAround(home.x, home.z, 0.4);
        const spot = this.hazardPlace(home.x, home.z, avoidX, avoidZ, openBays, TUNING.types.loud.radius, PASSENGER_DEFS.loud.radius, shaped);
        if (!spot) continue;
        const a = this.makeAgent('loud', spot[0], spot[1], 'rider', false);
        a.posted = true;
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
      const passBossCase = (pl.passMask & PASS_LUGGAGE) !== 0 && ctx.passBossLuggage !== false;
      if (s.kind === 'luggage' && a.caseBody && s.hitCd <= 0 && !passBossCase) {
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
    const shaped = this.shapedCar(level);
    for (let attempt = 0; attempt < 4; attempt++) {
      let kind = pickKind(level.mix, this.rng);
      // 大聲公 are riders already mid-call; boarders streaming through the door would park the
      // noise zone on the exit itself (unavoidable), so they board as plain commuters.
      if (kind === 'loud') kind = 'normal';
      // Same for stench once the car is shaped: a cloud waiting on the platform
      // sits on the opening, so the squeeze is unavoidable. Before L20 they still board.
      if (kind === 'stench' && shaped) kind = 'normal';
      const wall = doorWallX();
      const bay = openBays[Math.floor(this.rng() * openBays.length)] ?? 0;
      // Platform side (−X), lined up on a door bay.
      const x = wall - 0.55 - this.rng() * 1.6;
      const z = bay + (this.rng() - 0.5) * 1.1;
      const made = this.spawnGroup(kind, x, z, 'boarder', 0.6);
      if (made.length === 0) return 0;
      // A child or suitcase can step off the platform into the opening. They still
      // walk in during the round; they must not spawn already filling the squeeze.
      if (shaped && this.groupCoversGap(made, openBays)) {
        for (const a of made) this.removeAgent(a);
        continue;
      }
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
    return 0;
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
      if (a.callOffUntil > this.now) continue;
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
      if (a.auraOffUntil > this.now) continue;
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

      // v0.8 status: frozen = ice statue (no AI). First ~1.3s: no collision so the
      // mage can dash the opened lane; then shrunk solid ice for the rest.
      if (a.freezeUntil > ctx.time) {
        if (!a.baseR) a.baseR = b.r;
        b.vx *= 0.08;
        b.vz *= 0.08;
        if (a.freezeGhostUntil > ctx.time) {
          b.enabled = false;
          if (a.caseBody) a.caseBody.enabled = false;
        } else {
          b.enabled = true;
          if (a.caseBody) a.caseBody.enabled = true;
          b.r = a.baseR * (a.boss ? 0.78 : 0.5);
        }
        continue;
      }
      if (a.huddleUntil > ctx.time) {
        b.vx *= 0.15;
        b.vz *= 0.15;
        b.enabled = false;
        continue;
      }
      if (a.baseR) {
        b.r = a.baseR;
        a.baseR = 0;
        b.enabled = true;
        if (a.caseBody) a.caseBody.enabled = true;
      }
      const chilled = a.chillUntil > ctx.time;
      const dazed = a.dazedUntil > ctx.time;
      const statusDrive = chilled || dazed ? 0 : 1;
      const statusYield = dazed ? 3 : 1;
      const statusAnchor = chilled ? 1.5 : 1;

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
        const cap = C.boardMaxDrive * def.driveMul * m * ai * statusDrive;
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
        const lured = a.lureUntil > ctx.time && a.kind === 'brat';
        const dx = (lured ? a.lureX : a.homeX) - b.x;
        const dz = (lured ? a.lureZ : a.homeZ) - b.z;
        const bossYield = !!a.boss && a.boss.yieldUntil > ctx.time;
        const anchorMul = (a.boss ? Math.max(1.3, def.anchorMul) * (bossYield ? TUNING.boss.yieldAnchor : TUNING.boss.anchorMul) : def.anchorMul) * (a.posted ? 1.65 : 1) * statusAnchor;
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
        if (a.boss || a.posted) {
          // Bosses and people who picked a spot (door glass, bench, short way) keep it.
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
              const s = (lat >= 0 ? 1 : -1) * ctx.yieldK * statusYield * (1 - Math.abs(lat) / 0.8) * (1 - along / 1.1) * ctx.playerMoving;
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

      if (def.zigzag && a.dazedUntil <= ctx.time && !chilled) {
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
    if (a.chillWindupUntil > ctx.time || a.chillUntil > ctx.time || a.freezeUntil > ctx.time) {
      a.windup = -1;
      return;
    }
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
