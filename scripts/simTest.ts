/**
 * Headless sanity + balance harness for the crowd physics.
 *
 *   npm run test:sim                      # quick sanity pass (default loadouts, RUNS=6)
 *   RUNS=40 npm run test:sim              # balance-grade sample (see docs/BALANCE.md)
 *   LEVEL=1,10,100 LOADOUTS=earned,ult-spd RUNS=60 npm run test:sim
 *
 * Env:
 *   RUNS      runs per (level, loadout)                     default 6   (SEEDS is an alias)
 *   LEVEL     comma list of level ids                        default all
 *   LOADOUTS  comma list (see LOADOUTS below, or ad-hoc b:STR/SPD/STA[+str|+spd|+sta])   default: none,earned on 1–20;
 *             pts20,ult-str,ult-spd,ult-sta on 100
 *   WORKERS   worker threads                                 default min(8, cpus)
 *   SEED      base seed offset                               default 0
 *   JSON      path: also write raw summary rows as JSON
 *   TUNE      JSON deep-merged into TUNING for this run, e.g. '{"ult":{"spd":{"burst":4}}}'
 *   PATCH     JSON per-level overrides, e.g. '{"1":{"density":5,"timer":45}}'
 *
 * A simple bot plays (stick toward the doorway with a weave, charged shove when
 * blocked, sidestep when stuck, ults when sensible, uses Iron Stance when jammed). It is a
 * proxy for a decent — not perfect — player. Hard failures (exit 1): NaNs,
 * body cap exceeded, runaway overlap. Balance targets are reported, not enforced.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { Sim } from '../src/game/sim/Sim';
import { mulberry32 } from '../src/game/sim/rng';
import { passes } from '../src/game/sim/Physics';
import { DOOR_BAYS, DOOR_Z, TUNING, doorWallX, nearestDoorBay, openDoorBays } from '../src/game/sim/tuning';
import { LEVELS } from '../src/game/levels';
import { BRANCH_FILL, modifiersFromSkills } from '../src/game/SkillTree';
import { defaultSkills, type SkillState } from '../src/game/storage';
import type { PlayerInput } from '../src/game/sim/PlayerSim';
import type { PassengerKind } from '../src/game/PassengerTypes';
import type { Agent } from '../src/game/sim/CrowdSim';

// ------------------------------------------------------------------ overrides (for tuning sweeps)

function deepMerge(dst: Record<string, unknown>, src: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object') {
      deepMerge(dst[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      dst[k] = v;
    }
  }
}
if (process.env.TUNE) deepMerge(TUNING as unknown as Record<string, unknown>, JSON.parse(process.env.TUNE));
if (process.env.PATCH) {
  const patch = JSON.parse(process.env.PATCH) as Record<string, Record<string, unknown>>;
  for (const [id, p] of Object.entries(patch)) {
    const lv = LEVELS.find((l) => l.id === Number(id));
    if (lv) Object.assign(lv, p);
  }
}

const DT = 1 / TUNING.physics.hz;

// ------------------------------------------------------------------ loadouts

/** Spread `pts` over the three branches (round-robin, STR first), capped per branch. */
function spread(pts: number, order: ('str' | 'spd' | 'sta')[] = ['str', 'spd', 'sta']): SkillState {
  const s = defaultSkills();
  let i = 0;
  let guard = 0;
  while (pts > 0 && guard++ < 1000) {
    const b = order[i++ % order.length];
    if (s[b] < BRANCH_FILL) {
      s[b]++;
      pts--;
    }
  }
  return s;
}
function focus(pts: number, b: 'str' | 'spd' | 'sta'): SkillState {
  const s = defaultSkills();
  s[b] = Math.min(BRANCH_FILL, pts);
  return s;
}
/** 99-point endgame build: one branch filled + ultimate (70), remaining 29 split over the others. */
function ultBuild(b: 'str' | 'spd' | 'sta'): SkillState {
  const others = (['str', 'spd', 'sta'] as const).filter((x) => x !== b);
  const s = defaultSkills();
  s[b] = BRANCH_FILL;
  s[others[0]] = 15;
  s[others[1]] = 14;
  if (b === 'str') s.ultStr = true;
  if (b === 'spd') s.ultSpd = true;
  if (b === 'sta') s.ultSta = true;
  return s;
}
/** Points a player has when *starting* this level (1 per clear; 100 assumes 99). */
const earnedPts = (id: number): number => (id === 100 ? 99 : id - 1);

const LOADOUTS: Record<string, (levelId: number) => SkillState> = {
  none: () => defaultSkills(),
  earned: (id) => spread(earnedPts(id) === 99 ? 19 : earnedPts(id)),
  'earned-str': (id) => focus(Math.min(19, id - 1), 'str'),
  'earned-spd': (id) => focus(Math.min(19, id - 1), 'spd'),
  'earned-sta': (id) => focus(Math.min(19, id - 1), 'sta'),
  pts20: () => spread(20),
  pts40: () => spread(40),
  'pts99-noult': () => ({ ...defaultSkills(), str: 33, spd: 33, sta: 33 }),
  'ult-str': () => ultBuild('str'),
  'ult-spd': () => ultBuild('spd'),
  'ult-sta': () => ultBuild('sta'),
  'ult-wis': () => ultBuild('sta'), // alias
  'earned-wis': (id) => focus(Math.min(19, id - 1), 'sta'),
  max: () => ({ str: 60, spd: 60, sta: 60, ultStr: true, ultSpd: true, ultSta: true, points: 0 }),
};
/** Ad-hoc build: "b:STR/SPD/WIS" with optional "+str", "+spd", "+wis" ults, e.g. b:60/15/14+str. */
function parseBuild(name: string): ((levelId: number) => SkillState) | null {
  const m = /^b:(\d+)\/(\d+)\/(\d+)((?:\+(?:str|spd|sta))*)$/.exec(name);
  if (!m) return null;
  const s: SkillState = { ...defaultSkills(), str: +m[1], spd: +m[2], sta: +m[3] };
  s.ultStr = m[4].includes('+str');
  s.ultSpd = m[4].includes('+spd');
  s.ultSta = m[4].includes('+sta');
  return () => s;
}
const loadout = (name: string): ((levelId: number) => SkillState) => LOADOUTS[name] ?? parseBuild(name)!;

const DEFAULT_LOADOUTS = (id: number): string[] =>
  id === 100 ? ['pts20', 'ult-str', 'ult-spd', 'ult-sta'] : ['none', 'earned'];

// ------------------------------------------------------------------ one run

interface Run {
  win: boolean;
  t: number;
  timeLeft: number;
  maxBodies: number;
  maxPen: number;
  stepMs: number;
  shoves: number;
  angryHits: number;
  ults: number;
  endX: number;
  endZ: number;
}

function runLevel(levelId: number, skills: SkillState, seed: number): Run {
  const level = LEVELS.find((l) => l.id === levelId)!;
  const sim = new Sim(level, modifiersFromSkills(skills), mulberry32(seed));
  const p = sim.player;
  let held = false;
  let heldT = 0;
  let blockedT = 0;
  let maxBodies = 0;
  let maxPen = 0;
  let shoves = 0;
  let angryHits = 0;
  let ults = 0;
  let steps = 0;
  // Progress tracking for the "unstick" behaviour a human would use.
  let bestZ = p.body.x; // best (most negative / doorward) X
  let stuckT = 0;
  let escapeT = 0;
  let escapeDir = 1;
  const t0 = performance.now();
  while (!sim.finished && steps < 200 * 60) {
    const b = p.body;
    if (b.x < bestZ - 0.12) {
      bestZ = b.x;
      stuckT = 0;
    } else {
      stuckT += DT;
    }
    // Bot: aim at the nearest open side door (−X) with a little weave; follow WIS path if shown.
    const bays = sim.openBays.length ? sim.openBays : openDoorBays(levelId);
    const bay = nearestDoorBay(b.z, bays);
    const wall = doorWallX();
    let dx = wall - b.x + Math.sin(sim.time * 1.7) * 0.2;
    let dz = bay - b.z;
    if (p.path.length > 1) {
      const q = p.path[Math.min(2, p.path.length - 1)];
      dx = q.x - b.x;
      dz = q.z - b.z;
    } else if (b.x > 0.9 && Math.abs(b.z - bay) > 0.9) {
      // Still on the far side: line up with the bay along Z first, then push left.
      dx = -0.35;
      dz = bay - b.z;
    }
    if (escapeT <= 0 && stuckT > 2) {
      escapeT = 0.7;
      escapeDir = Math.abs(b.z - bay) > 0.35 ? Math.sign(bay - b.z) || 1 : -escapeDir;
      stuckT = 0;
    }
    if (escapeT > 0) {
      escapeT -= DT;
      dx = -0.35;
      dz = escapeDir;
    }
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const blocked = p.pushing && Math.hypot(b.vx, b.vz) < 0.5;
    blockedT = blocked ? blockedT + DT : 0;
    if (!held && blocked && p.shoveCd <= 0 && p.stamina > p.staminaMax * 0.35) {
      held = true;
      heldT = 0;
    }
    if (held) {
      heldT += DT;
      if (heldT > 0.3) held = false;
    }
    // Ults: fire when stuck for a moment (WIS: as soon as the crowd closes in).
    if (sim.time > 1.5) {
      if (skills.ultSpd && blockedT > 0.25 && sim.tryUltimate('spd')) ults++;
      if (skills.ultStr && blockedT > 0.25 && sim.tryUltimate('str')) ults++;
      if (skills.ultSta && (blockedT > 0.1 || b.contacts > 0) && sim.tryUltimate('sta')) ults++;
    }
    // Tier-3 actives (v0.6.2): leap when jammed, second wind when low.
    if (sim.time > 1 && blockedT > 0.3 && sim.tryLeap()) blockedT = 0;
    if (p.stamina < p.staminaMax * 0.25) sim.trySecondWind();
    const input: PlayerInput = { x: dx, z: -dz, mag: 1, shoveHeld: held };
    sim.step(DT, input);
    steps++;
    for (const e of sim.events) {
      if (e.t === 'shove') shoves++;
      else if (e.t === 'angryHit') angryHits++;
    }
    sim.events.length = 0;
    maxBodies = Math.max(maxBodies, sim.world.bodies.length);
    for (const bb of sim.world.bodies) {
      if (!Number.isFinite(bb.x) || !Number.isFinite(bb.z) || !Number.isFinite(bb.vx)) {
        throw new Error(`NaN body in level ${levelId} seed ${seed} at t=${sim.time.toFixed(2)}`);
      }
    }
    // Worst pairwise overlap ratio (sampled every 30 steps).
    if (steps % 30 === 0) {
      const bs = sim.world.bodies;
      for (let i = 0; i < bs.length; i++)
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i];
          const c = bs[j];
          if (a.group && a.group === c.group) continue;
          // Tier 3 Hurdle / Leap deliberately let the player overlap luggage / squatters / kids.
          if (passes(a, c)) continue;
          const d = Math.hypot(a.x - c.x, a.z - c.z);
          const pen = (a.r + c.r - d) / (a.r + c.r);
          if (pen > maxPen) maxPen = pen;
        }
    }
  }
  const ms = performance.now() - t0;
  if (process.env.DUMP && sim.result !== 'win') {
    const b = p.body;
    const lines = sim.crowd.agents
      .filter((a) => Math.hypot(a.body.x - b.x, a.body.z - b.z) < 1.4)
      .map((a) => `${a.kind[0]}${a.mode[0]} d=(${(a.body.x - b.x).toFixed(2)},${(a.body.z - b.z).toFixed(2)}) home=(${(a.homeX - a.body.x).toFixed(2)},${(a.homeZ - a.body.z).toFixed(2)})`);
    console.error(`L${levelId} seed ${seed} stuck at (${b.x.toFixed(2)},${b.z.toFixed(2)}) st=${p.stamina.toFixed(0)} winded=${p.winded} boarders=${sim.crowd.agents.filter((a) => a.mode === 'boarder').length}\n  ${lines.join('\n  ')}`);
  }
  return {
    win: sim.result === 'win',
    t: sim.time,
    timeLeft: sim.timeLeft,
    maxBodies,
    maxPen,
    stepMs: ms / Math.max(1, steps),
    shoves,
    angryHits,
    ults,
    endX: p.body.x,
    endZ: p.body.z,
  };
}


// ------------------------------------------------------------------ v0.6.2 Tier-3 counter tests

const sk = (str: number, spd: number, sta: number): SkillState => ({ ...defaultSkills(), str, spd, sta });

/** A sim with an empty car (no riders / boarders, no timer) for scripted micro-scenarios. */
function emptySim(skills: SkillState, seed = 7): Sim {
  const lv = { ...LEVELS.find((l) => l.id === 1)! };
  const sim = new Sim(lv, modifiersFromSkills(skills), mulberry32(seed));
  for (const a of sim.crowd.agents) {
    sim.world.remove(a.body);
    if (a.caseBody) sim.world.remove(a.caseBody);
  }
  sim.crowd.agents.length = 0;
  sim.crowd.byBody.clear();
  sim.crowd.boardBudget = 0;
  sim.ambient = true;
  sim.world.rebuildGrid();
  return sim;
}
function place(sim: Sim, x: number, z: number): void {
  const b = sim.player.body;
  b.x = b.px = x;
  b.z = b.pz = z;
  b.vx = b.vz = 0;
}
function spawn(sim: Sim, kind: PassengerKind, x: number, z: number): Agent[] {
  const made = sim.crowd.spawnGroup(kind, x, z, 'rider', 0.05);
  sim.world.rebuildGrid();
  return made;
}
const LEFT: PlayerInput = { x: -1, z: 0, mag: 1, shoveHeld: false };
/** Walk toward −X; seconds until the player passes `goalX` (cap 8 s). */
function timeToX(sim: Sim, goalX: number, each?: (s: Sim) => void): number {
  for (let i = 0; i < 8 * 60; i++) {
    each?.(sim);
    sim.step(DT, LEFT);
    if (sim.player.body.x < goalX) return sim.time;
  }
  return 8;
}

interface CounterResult { name: string; ok: boolean; detail: string }

function counterTests(): CounterResult[] {
  const out: CounterResult[] = [];
  const push = (name: string, ok: boolean, detail: string) => out.push({ name, ok, detail });

  // SPD 40 跨行李 Hurdle — a wall of luggage across the aisle at x = 0.
  {
    const run = (spd: number) => {
      const s = emptySim(sk(0, spd, 0));
      place(s, 1.3, 0);
      for (const z of [-0.55, 0, 0.55]) spawn(s, 'luggage', 0, z);
      return { t: timeToX(s, -1.2), hops: s.player.stats.hops };
    };
    const off = run(39);
    const on = run(40);
    push('Hurdle (luggage)', on.t < off.t * 0.8 && on.hops > 0, `t ${off.t.toFixed(2)}s → ${on.t.toFixed(2)}s, hops=${on.hops}`);
  }
  // SPD 50 飛身 Leap — squatters across the aisle; leap at x ≈ 0.7.
  {
    const run = (spd: number) => {
      const s = emptySim(sk(0, spd, 0));
      place(s, 1.3, 0);
      const sq = [-0.6, 0, 0.6].flatMap((z) => spawn(s, 'squat', 0, z));
      let overlapped = false;
      const t = timeToX(s, -1.2, (ss) => {
        if (ss.player.body.x < 0.75) ss.tryLeap();
        const b = ss.player.body;
        for (const a of sq) if (Math.hypot(a.body.x - b.x, a.body.z - b.z) < (a.body.r + b.r) * 0.6) overlapped = true;
      });
      return { t, overlapped };
    };
    const off = run(49);
    const on = run(50);
    push('Leap (squat)', on.t < off.t * 0.8 && on.overlapped, `t ${off.t.toFixed(2)}s → ${on.t.toFixed(2)}s, passed-over=${on.overlapped}`);
  }
  // SPD 50 Leap also clears family kids (they're PASS_KID while airborne).
  {
    const s = emptySim(sk(0, 50, 0));
    place(s, 0.5, 0);
    const fam = spawn(s, 'family', -0.2, 0);
    const kid = fam.find((a) => a.isKid);
    s.tryLeap();
    const b = s.player.body;
    const ok = !!kid && (b.passMask & kid.body.passTag) !== 0;
    push('Leap (family kids)', ok, `kid passTag=${kid?.body.passTag} playerMask=${b.passMask}`);
  }
  // SPD 60 穿插 Thread — a couple holding hands across the aisle (link along Z).
  {
    const run = (spd: number) => {
      const s = emptySim(sk(0, spd, 0));
      place(s, 1.3, 0);
      const c = spawn(s, 'couple', 0, 0);
      // rotate the pair so the link spans Z across the player's path
      if (c.length === 2) {
        c[0].body.x = c[0].homeX = 0; c[0].body.z = c[0].homeZ = -0.24;
        c[1].body.x = c[1].homeX = 0; c[1].body.z = c[1].homeZ = 0.24;
      }
      // brace the pair with two more couples above/below so going around is costly
      spawn(s, 'normal', 0, -0.75); spawn(s, 'normal', 0, 0.75);
      return timeToX(s, -1.2);
    };
    const off = run(59);
    const on = run(60);
    push('Thread (couple)', on < off * 0.9, `t ${off.toFixed(2)}s → ${on.toFixed(2)}s`);
  }
  // STR 40 拆散情侶 Split — a shove on a couple breaks their link.
  {
    const run = (str: number) => {
      const s = emptySim(sk(str, 0, 0));
      place(s, 0.62, 0);
      const c = spawn(s, 'couple', -0.15, 0);
      s.player.faceX = -1; s.player.faceZ = 0;
      s.step(DT, { x: 0, z: 0, mag: 0, shoveHeld: true });
      s.step(DT, { x: 0, z: 0, mag: 0, shoveHeld: false });
      for (let i = 0; i < 90; i++) s.step(DT, { x: 0, z: 0, mag: 0, shoveHeld: false });
      const d = c.length === 2 ? Math.hypot(c[0].body.x - c[1].body.x, c[0].body.z - c[1].body.z) : 0;
      return { split: c.length === 2 && s.crowd.isSplit(c[0]), d };
    };
    const off = run(39);
    const on = run(40);
    push('Split (couple)', on.split && !off.split && on.d > off.d, `split ${off.split}→${on.split}, gap ${off.d.toFixed(2)}→${on.d.toFixed(2)}m`);
  }
  // STR 50 震地 Ground Pound — full-charge shove; luggage BEHIND the player (outside the cone).
  {
    const run = (str: number) => {
      const s = emptySim(sk(str, 0, 0));
      place(s, 0, 0);
      const lug = spawn(s, 'luggage', 0.75, 0)[0];
      const cb = lug.caseBody!;
      const x0 = cb.x, z0 = cb.z, ox = lug.body.x, oz = lug.body.z;
      s.player.faceX = -1; s.player.faceZ = 0;
      for (let i = 0; i < 70; i++) s.step(DT, { x: -1, z: 0, mag: 0.05, shoveHeld: true });
      s.step(DT, { x: 0, z: 0, mag: 0, shoveHeld: false });
      for (let i = 0; i < 20; i++) s.step(DT, { x: 0, z: 0, mag: 0, shoveHeld: false });
      return Math.max(Math.hypot(cb.x - x0, cb.z - z0), Math.hypot(lug.body.x - ox, lug.body.z - oz));
    };
    const off = run(49);
    const on = run(50);
    push('Ground Pound (luggage)', on > off + 0.08, `luggage moved ${off.toFixed(2)}m → ${on.toFixed(2)}m`);
  }
  // STR 60 頂硬上 Stand Firm — an angry man shoves; measure the player's knockback.
  {
    const run = (str: number) => {
      const s = emptySim(sk(str, 0, 0));
      place(s, 0, 0);
      spawn(s, 'angry', 0.55, 0);
      let hit = -1;
      let maxD = 0;
      for (let i = 0; i < 6 * 60; i++) {
        s.step(DT, { x: 0, z: 0, mag: 0, shoveHeld: false });
        if (hit < 0 && s.events.some((e) => e.t === 'angryHit')) hit = i;
        s.events.length = 0;
        if (hit >= 0) maxD = Math.max(maxD, Math.hypot(s.player.body.x, s.player.body.z));
        if (hit >= 0 && i > hit + 40) break;
      }
      return { maxD, hit: hit >= 0, stun: s.player.stunT };
    };
    const off = run(59);
    const on = run(60);
    push('Stand Firm (angry)', off.hit && on.hit && on.maxD < off.maxD * 0.5, `knockback ${off.maxD.toFixed(2)}m → ${on.maxD.toFixed(2)}m`);
  }
  // STA 40 忍臭 Hold Breath — walk past a stench passenger.
  {
    const run = (sta: number) => {
      const s = emptySim(sk(0, 0, sta));
      place(s, 1.3, 0);
      spawn(s, 'stench', 0.2, 0.62);
      return timeToX(s, -1.2);
    };
    const off = run(39);
    const on = run(40);
    push('Hold Breath (stench)', on < off * 0.95, `t ${off.toFixed(2)}s → ${on.toFixed(2)}s`);
  }
  // STA 50 回魂 Second Wind — brats nearby get knocked away and dazed.
  {
    const s = emptySim(sk(0, 0, 50));
    place(s, 0, 0);
    const brats = [spawn(s, 'brat', 0.45, 0)[0], spawn(s, 'brat', -0.4, 0.3)[0]];
    s.player.stamina = 10;
    const d0 = brats.map((a) => Math.hypot(a.body.x, a.body.z));
    const ok1 = s.trySecondWind();
    for (let i = 0; i < 30; i++) s.step(DT, { x: 0, z: 0, mag: 0, shoveHeld: false });
    const d1 = brats.map((a) => Math.hypot(a.body.x - s.player.body.x, a.body.z - s.player.body.z));
    const dazed = brats.every((a) => a.dazedUntil > s.time);
    const ok = ok1 && dazed && d1[0] > d0[0] && s.player.stamina > 40 && s.player.stats.shakeOffs === 2;
    push('Second Wind (brat)', ok, `stamina 10→${s.player.stamina.toFixed(0)}, brats ${d0.map((d) => d.toFixed(2)).join('/')}→${d1.map((d) => d.toFixed(2)).join('/')}m, dazed=${dazed}`);
  }
  // STA 60 好脾氣 Unbothered — push into a family for 2 s; compare stamina spent.
  {
    const run = (sta: number) => {
      const s = emptySim(sk(0, 0, sta));
      place(s, 0.6, 0);
      spawn(s, 'family', 0, 0);
      spawn(s, 'family', -0.2, 0.55);
      spawn(s, 'family', -0.2, -0.55);
      for (let i = 0; i < 120; i++) s.step(DT, LEFT);
      return { spent: s.player.stats.pushDrain, x: s.player.body.x };
    };
    const off = run(59);
    const on = run(60);
    push('Unbothered (family)', off.spent > 0.5 && on.spent < off.spent * 0.5, `stamina spent ${off.spent.toFixed(1)} → ${on.spent.toFixed(1)}; x ${off.x.toFixed(2)} → ${on.x.toFixed(2)}`);
  }
  return out;
}

// ------------------------------------------------------------------ workers

interface Job {
  level: number;
  loadout: string;
  seed: number;
}
interface JobResult extends Job {
  run: Run;
}

if (!isMainThread) {
  const jobs = workerData as Job[];
  const out: JobResult[] = jobs.map((j) => ({ ...j, run: runLevel(j.level, loadout(j.loadout)(j.level), j.seed) }));
  parentPort!.postMessage(out);
} else {
  void main();
}

function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const f1 = (x: number, w = 5): string => (Number.isNaN(x) ? '-' : x.toFixed(1)).padStart(w);

/** Target win-rate band for (level, loadout) — reported only. */
function target(level: number, loadout: string): [number, number] | null {
  if (level === 100) {
    if (loadout.startsWith('ult-')) return [0.3, 0.5];
    if (loadout === 'pts20') return [0, 0.05];
    return null;
  }
  if (loadout !== 'earned') return null;
  if (level <= 5) return [0.95, 1];
  if (level <= 15) return [0.75, 0.9];
  return [0.55, 0.75];
}

async function main(): Promise<void> {
  const RUNS = Number(process.env.RUNS ?? process.env.SEEDS ?? 6);
  const SEED = Number(process.env.SEED ?? 0);
  const levelFilter = process.env.LEVEL ? process.env.LEVEL.split(',').map(Number) : null;
  const loadEnv = process.env.LOADOUTS && process.env.LOADOUTS !== 'default' ? process.env.LOADOUTS.split(',') : null;
  for (const lo of loadEnv ?? []) {
    if (!LOADOUTS[lo] && !parseBuild(lo)) throw new Error(`unknown loadout "${lo}" (have: ${Object.keys(LOADOUTS).join(', ')})`);
  }
  const WORKERS = Math.max(1, Number(process.env.WORKERS ?? Math.min(8, cpus().length)));

  const levels = LEVELS.filter((l) => !levelFilter || levelFilter.includes(l.id));
  const jobs: Job[] = [];
  for (const lv of levels) {
    for (const lo of loadEnv ?? DEFAULT_LOADOUTS(lv.id)) {
      for (let s = 0; s < RUNS; s++) jobs.push({ level: lv.id, loadout: lo, seed: 1000 + SEED + s * 7919 + lv.id * 31 });
    }
  }
  // Static round-robin partition → deterministic for a given WORKERS count.
  const parts: Job[][] = Array.from({ length: WORKERS }, () => []);
  jobs.forEach((j, i) => parts[i % WORKERS].push(j));
  const t0 = performance.now();
  const results = (
    await Promise.all(
      parts
        .filter((p) => p.length)
        .map(
          (p) =>
            new Promise<JobResult[]>((res, rej) => {
              const w = new Worker(new URL(import.meta.url), { workerData: p });
              w.once('message', res);
              w.once('error', rej);
            }),
        ),
    )
  ).flat();

  // v0.6.2 Tier-3 counter skills: each must measurably change behaviour.
  if (process.env.COUNTERS !== '0') {
    const res = counterTests();
    let bad = 0;
    for (const r of res) {
      console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(24)} ${r.detail}`);
      if (!r.ok) bad++;
    }
    if (bad) {
      console.error(`${bad} counter test(s) failed`);
      process.exit(1);
    }
  }

  // Seat AABB: benches must not overlap any door vestibule [bayZ ± doorHalf].
  {
    const sim = new Sim(LEVELS.find((l) => l.id === 1)!, modifiersFromSkills(defaultSkills()), mulberry32(1));
    const dh = TUNING.car.doorHalf;
    const hw = TUNING.car.halfWidth;
    let seatBoxes = 0;
    for (const box of sim.world.boxes) {
      const w = Math.abs(box.maxX - box.minX);
      const len = box.maxZ - box.minZ;
      // Seat colliders: ~0.62 wide, ≥0.7 long, both edges inside the car near ±halfWidth.
      if (w < 0.45 || w > 0.75 || len < 0.7) continue;
      const ax = Math.abs(box.minX);
      const bx = Math.abs(box.maxX);
      const nearSide = Math.min(ax, bx) > hw - 1.05 && Math.max(ax, bx) < hw - 0.02;
      if (!nearSide) continue;
      seatBoxes++;
      for (const bay of DOOR_BAYS) {
        const v0 = bay - dh;
        const v1 = bay + dh;
        const overlap = !(box.maxZ <= v0 + 1e-6 || box.minZ >= v1 - 1e-6);
        if (overlap) {
          console.error(`seat AABB overlaps vestibule bay=${bay}: z[${box.minZ.toFixed(3)},${box.maxZ.toFixed(3)}] vs [${v0},${v1}]`);
          process.exit(1);
        }
      }
    }
    if (seatBoxes < 2) {
      console.error(`expected ≥2 seat boxes, got ${seatBoxes}`);
      process.exit(1);
    }
    console.log(`seat AABB ok (${seatBoxes} benches, no vestibule overlap)`);
  }

  console.log(
    `runs=${RUNS}  workers=${WORKERS}  dt=${DT.toFixed(4)}  maxBodies=${TUNING.physics.maxBodies}  (${((performance.now() - t0) / 1000).toFixed(1)} s)`,
  );
  console.log('lvl dens press timer | loadout      win%  medT  medLeft  <10s  bodies maxPen ms/step shove angry ults | target');
  let failures = 0;
  const rows: Record<string, unknown>[] = [];
  for (const lv of levels) {
    for (const lo of loadEnv ?? DEFAULT_LOADOUTS(lv.id)) {
      const runs = results.filter((r) => r.level === lv.id && r.loadout === lo).map((r) => r.run);
      const wins = runs.filter((r) => r.win);
      const wr = wins.length / runs.length;
      const medT = median(wins.map((r) => r.t));
      const medLeft = median(wins.map((r) => r.timeLeft));
      const fast = wins.filter((r) => r.t < 10).length / Math.max(1, runs.length);
      const bodies = Math.max(...runs.map((r) => r.maxBodies));
      const pen = Math.max(...runs.map((r) => r.maxPen));
      const avg = (k: keyof Run): number => runs.reduce((a, r) => a + (r[k] as number), 0) / runs.length;
      if (bodies > TUNING.physics.maxBodies) failures++;
      if (pen > 0.75) failures++;
      const tg = target(lv.id, lo);
      const mark = tg ? `${wr >= tg[0] - 1e-9 && wr <= tg[1] + 1e-9 ? 'ok ' : 'off'} ${Math.round(tg[0] * 100)}–${Math.round(tg[1] * 100)}%` : '';
      rows.push({
        level: lv.id,
        loadout: lo,
        runs: runs.length,
        winRate: wr,
        medT,
        medLeft,
        fast,
        timer: lv.timer,
        losses: runs.filter((r) => !r.win).map((r) => [+r.endX.toFixed(2), +r.endZ.toFixed(2)]),
        times: wins.map((r) => +r.t.toFixed(2)).sort((a, b) => a - b),
      });
      console.log(
        `${String(lv.id).padStart(3)} ${String(lv.density).padStart(4)} ${lv.pressure.toFixed(2)} ${String(lv.timer).padStart(5)} | ${lo.padEnd(11)} ${String(Math.round(wr * 100)).padStart(4)}% ${f1(medT)} ${f1(medLeft, 7)} ${String(Math.round(fast * 100)).padStart(4)}%  ${String(bodies).padStart(5)}  ${pen.toFixed(2)}  ${avg('stepMs').toFixed(3)} ${f1(avg('shoves'))} ${f1(avg('angryHits'))} ${f1(avg('ults'), 4)} | ${mark}`,
      );
    }
  }
  if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(rows, null, 2));
  if (failures) {
    console.error(`\n${failures} sanity check(s) failed`);
    process.exit(1);
  }
  console.log('\nOK: no NaNs, body cap respected, overlap bounded.');
}
