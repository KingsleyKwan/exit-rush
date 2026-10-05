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
 *   LOADOUTS  comma list (see LOADOUTS below, or ad-hoc b:STR/SPD/WIS[+str|+spd|+wis])   default: none,earned on 1–20;
 *             pts20,ult-str,ult-spd,ult-wis on 100
 *   WORKERS   worker threads                                 default min(8, cpus)
 *   SEED      base seed offset                               default 0
 *   JSON      path: also write raw summary rows as JSON
 *   TUNE      JSON deep-merged into TUNING for this run, e.g. '{"ult":{"spd":{"burst":4}}}'
 *   PATCH     JSON per-level overrides, e.g. '{"1":{"density":5,"timer":45}}'
 *
 * A simple bot plays (stick toward the doorway with a weave, charged shove when
 * blocked, sidestep when stuck, ults when sensible, follows the WIS path while shown). It is a
 * proxy for a decent — not perfect — player. Hard failures (exit 1): NaNs,
 * body cap exceeded, runaway overlap. Balance targets are reported, not enforced.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { Sim } from '../src/game/sim/Sim';
import { mulberry32 } from '../src/game/sim/rng';
import { DOOR_Z, TUNING } from '../src/game/sim/tuning';
import { LEVELS } from '../src/game/levels';
import { BRANCH_FILL, modifiersFromSkills } from '../src/game/SkillTree';
import { defaultSkills, type SkillState } from '../src/game/storage';
import type { PlayerInput } from '../src/game/sim/PlayerSim';

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
function spread(pts: number, order: ('str' | 'spd' | 'wis')[] = ['str', 'spd', 'wis']): SkillState {
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
function focus(pts: number, b: 'str' | 'spd' | 'wis'): SkillState {
  const s = defaultSkills();
  s[b] = Math.min(BRANCH_FILL, pts);
  return s;
}
/** 99-point endgame build: one branch filled + ultimate (70), remaining 29 split over the others. */
function ultBuild(b: 'str' | 'spd' | 'wis'): SkillState {
  const others = (['str', 'spd', 'wis'] as const).filter((x) => x !== b);
  const s = defaultSkills();
  s[b] = BRANCH_FILL;
  s[others[0]] = 15;
  s[others[1]] = 14;
  if (b === 'str') s.ultStr = true;
  if (b === 'spd') s.ultSpd = true;
  if (b === 'wis') s.ultWis = true;
  return s;
}
/** Points a player has when *starting* this level (1 per clear; 100 assumes 99). */
const earnedPts = (id: number): number => (id === 100 ? 99 : id - 1);

const LOADOUTS: Record<string, (levelId: number) => SkillState> = {
  none: () => defaultSkills(),
  earned: (id) => spread(earnedPts(id) === 99 ? 19 : earnedPts(id)),
  'earned-str': (id) => focus(Math.min(19, id - 1), 'str'),
  'earned-spd': (id) => focus(Math.min(19, id - 1), 'spd'),
  'earned-wis': (id) => focus(Math.min(19, id - 1), 'wis'),
  pts20: () => spread(20),
  pts40: () => spread(40),
  'pts99-noult': () => ({ ...defaultSkills(), str: 33, spd: 33, wis: 33 }),
  'ult-str': () => ultBuild('str'),
  'ult-spd': () => ultBuild('spd'),
  'ult-wis': () => ultBuild('wis'),
  max: () => ({ str: 60, spd: 60, wis: 60, ultStr: true, ultSpd: true, ultWis: true, points: 0 }),
};
/** Ad-hoc build: "b:STR/SPD/WIS" with optional "+str", "+spd", "+wis" ults, e.g. b:60/15/14+str. */
function parseBuild(name: string): ((levelId: number) => SkillState) | null {
  const m = /^b:(\d+)\/(\d+)\/(\d+)((?:\+(?:str|spd|wis))*)$/.exec(name);
  if (!m) return null;
  const s: SkillState = { ...defaultSkills(), str: +m[1], spd: +m[2], wis: +m[3] };
  s.ultStr = m[4].includes('+str');
  s.ultSpd = m[4].includes('+spd');
  s.ultWis = m[4].includes('+wis');
  return () => s;
}
const loadout = (name: string): ((levelId: number) => SkillState) => LOADOUTS[name] ?? parseBuild(name)!;

const DEFAULT_LOADOUTS = (id: number): string[] =>
  id === 100 ? ['pts20', 'ult-str', 'ult-spd', 'ult-wis'] : ['none', 'earned'];

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
  let bestZ = p.body.z;
  let stuckT = 0;
  let escapeT = 0;
  let escapeDir = 1;
  const t0 = performance.now();
  while (!sim.finished && steps < 200 * 60) {
    const b = p.body;
    if (b.z < bestZ - 0.15) {
      bestZ = b.z;
      stuckT = 0;
    } else {
      stuckT += DT;
    }
    // Bot: aim at the doorway with a little weave to find gaps; follow the WIS path if shown.
    let dx = -b.x * 0.8 + Math.sin(sim.time * 1.7) * 0.25;
    let dz = DOOR_Z - b.z;
    if (p.path.length > 1) {
      const q = p.path[Math.min(2, p.path.length - 1)];
      dx = q.x - b.x;
      dz = q.z - b.z;
    } else if (Math.abs(b.x) > 1.0 && b.z > DOOR_Z + 1.2) {
      // Squeezed out beside the benches: get back into the aisle first.
      dx = -Math.sign(b.x);
      dz = -0.25;
    }
    // No progress for a while: sidestep for a moment (alternating sides), like a player feeling for a gap.
    if (escapeT <= 0 && stuckT > 2) {
      escapeT = 0.7;
      escapeDir = Math.abs(b.x) > 0.45 ? -Math.sign(b.x) : -escapeDir;
      stuckT = 0;
    }
    if (escapeT > 0) {
      escapeT -= DT;
      dx = escapeDir;
      dz = -0.35;
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
      if (skills.ultWis && (blockedT > 0.1 || b.contacts > 0) && sim.tryUltimate('wis')) ults++;
    }
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
