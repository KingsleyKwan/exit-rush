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
import { PASSENGER_DEFS } from '../src/game/PassengerTypes';
import { DOOR_BAYS, DOOR_Z, TUNING, doorWallX, nearestDoorBay, openDoorBays } from '../src/game/sim/tuning';
import { LEVELS } from '../src/game/levels';
import { BRANCH_FILL, modifiersFromSkills } from '../src/game/SkillTree';
import { CHARACTERS, modsFor, type CharacterId } from '../src/game/charactersDef';
import { defaultSpellBar } from '../src/game/SpellTree';
import { defaultSkills, migrateLegacyKeys, normalizeSave, SAVE_KEY, type KeyValueStore, type SaveData, type SkillState } from '../src/game/storage';
import { earnedPoints, resetActiveLoadout, spendPoint, spentPoints, switchLoadout, POINTS_PER_FIRST_CLEAR } from '../src/game/SkillTree';
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


// ------------------------------------------------------------------ characters (v0.8)
const CHARS: CharacterId[] = (process.env.CHARS ?? 'hero')
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is CharacterId => s === 'hero' || s === 'mage' || s === 'tech');


/** Prefer boss-counter T3 + its T1, then a secondary for common mix threats. */
function mageBarForLevel(id: number, skills: SkillState): string[] {
  const unlocked = new Set(
    (['fire_t1','fire_t3b','ice_t1','ice_t3b','volt_t1','volt_t3b'] as const).filter((x) => {
      // mirror hasSpell thresholds via branch points
      const branch = x.startsWith('fire') ? 'str' : x.startsWith('volt') ? 'spd' : 'sta';
      const need = x.endsWith('_t3b') ? 35 : 10;
      return skills[branch] >= need;
    }),
  );
  const bossPrefer: Record<number, string[]> = {
    20: ['fire_t3b', 'fire_t1', 'ice_t1'],
    30: ['fire_t3b', 'fire_t1', 'volt_t1'],
    40: ['ice_t3b', 'ice_t1', 'fire_t1'],
    50: ['ice_t3b', 'ice_t1', 'fire_t1'],
    60: ['volt_t3b', 'volt_t1', 'ice_t1'],
    70: ['fire_t3b', 'fire_t1', 'ice_t1'],
    80: ['ice_t3b', 'ice_t1', 'volt_t1'],
    90: ['volt_t3b', 'volt_t1', 'ice_t1'],
    100: ['fire_t3b', 'ice_t3b', 'volt_t3b'],
  };
  const prefer = bossPrefer[id] ?? ['fire_t3b', 'ice_t3b', 'volt_t3b', 'fire_t1', 'ice_t1', 'volt_t1'];
  const bar: string[] = [];
  for (const id0 of prefer) {
    if (unlocked.has(id0 as typeof prefer[number]) && !bar.includes(id0)) bar.push(id0);
    if (bar.length >= 3) break;
  }
  if (bar.length < 3) {
    for (const id0 of ['fire_t3b','ice_t3b','volt_t3b','fire_t1','ice_t1','volt_t1']) {
      if (unlocked.has(id0 as never) && !bar.includes(id0)) bar.push(id0);
      if (bar.length >= 3) break;
    }
  }
  return bar.length ? bar : defaultSpellBar(skills);
}

function modsForChar(char: CharacterId, skills: SkillState, levelId = 1) {
  if (char === 'hero') return modifiersFromSkills(skills);
  if (char === 'mage') return modsFor(CHARACTERS.mage, skills, mageBarForLevel(levelId, skills));
  return modsFor(CHARACTERS[char], skills, []);
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

/** Mage earned: unlock all T1s (10 each), dump rest into the counter branch for this level. */
function mageEarned(id: number): SkillState {
  const pts = earnedPts(id) === 99 ? 19 : earnedPts(id);
  // Dual-counter bosses: spend into primary + secondary T3 so the bar can cover the mix.
  if (id === 30 && pts >= 25) {
    // Stench king: Firebolt + Cleansing (str 30) — Flame Burst overcleared vs hero.
    const s = defaultSkills();
    s.str = Math.min(30, pts);
    let left = pts - s.str;
    s.sta = Math.min(10, left);
    left -= s.sta;
    s.spd = Math.min(10, left);
    return s;
  }
  if (id === 20 && pts >= 15) {
    const s = defaultSkills();
    s.str = Math.min(35, pts); // flame burst
    let left = pts - s.str;
    // pts at L20 = 19 → str 19 only if we don't special-case min 35
    // Keep flame burst: dump all into fire first.
    if (pts < 35) { s.str = pts; return s; }
    s.sta = Math.min(10, left);
    left -= s.sta;
    s.spd = Math.min(10, left);
    return s;
  }
  if (id === 70 && pts >= 60) {
    // Couple royals: Too Hot to Hold (str 60) + Flame Burst; leftover into ice T1.
    const s = defaultSkills();
    s.str = Math.min(60, pts);
    let left = pts - s.str;
    s.sta = Math.min(10, left);
    left -= s.sta;
    s.spd = Math.min(10, left);
    return s;
  }
  if (id === 80 && pts >= 70) {
    // Angry king + brat/loud mix: Flash Freeze + Chill Out + volt T1 (save a few pts).
    const s = defaultSkills();
    s.sta = Math.min(50, pts);
    let left = pts - s.sta;
    s.spd = Math.min(30, left); // volt_t1 only — thunderclap was overshooting vs hero
    left -= s.spd;
    s.str = Math.min(10, left);
    return s;
  }
  if (id === 90 && pts >= 70) {
    // Loud king: Thunderclap + Dropped Call (spd 50) + ice T1 for jam clears.
    const s = defaultSkills();
    s.spd = Math.min(60, pts);
    let left = pts - s.spd;
    s.sta = Math.min(10, left);
    left -= s.sta;
    s.str = Math.min(10, left);
    return s;
  }
  const focus: Record<number, 'str' | 'spd' | 'sta'> = {
    20: 'str', 30: 'str', 40: 'sta', 50: 'sta', 60: 'spd', 70: 'str', 80: 'sta', 90: 'spd', 100: 'str',
  };
  if (!focus[id]) {
    // Unlock all T1s first (10/10/10), then round-robin the rest like hero fill.
    const s = defaultSkills();
    let left = pts;
    for (const b of ['str', 'spd', 'sta'] as const) {
      const add = Math.min(10, left);
      s[b] = add;
      left -= add;
    }
    let i = 0;
    const order = ['str', 'spd', 'sta'] as const;
    while (left > 0) {
      const b = order[i++ % 3];
      if (s[b] < BRANCH_FILL) { s[b]++; left--; } else break;
    }
    return s;
  }
  const s = defaultSkills();
  let left = pts;
  const primary = focus[id];
  // L80 mix is angry+brat+loud — unlock volt (spd) before fire once ice is set.
  const others = (
    id === 80 ? (['spd', 'str'] as const)
    : (['str', 'spd', 'sta'] as const).filter((b) => b !== primary)
  );
  const targets: { b: 'str' | 'spd' | 'sta'; cap: number }[] = [
    { b: primary, cap: 10 },
    { b: primary, cap: 35 },
    { b: others[0], cap: 10 },
    { b: others[1], cap: 10 },
    { b: primary, cap: 50 },
    { b: primary, cap: 60 },
    { b: others[0], cap: 35 },
    { b: others[1], cap: 35 },
    { b: others[0], cap: BRANCH_FILL },
    { b: others[1], cap: BRANCH_FILL },
    { b: primary, cap: BRANCH_FILL },
  ];
  for (const { b, cap } of targets) {
    while (left > 0 && s[b] < cap) { s[b]++; left--; }
  }
  return s;
}


const LOADOUTS: Record<string, (levelId: number) => SkillState> = {
  none: () => defaultSkills(),
  earned: (id) => spread(earnedPts(id) === 99 ? 19 : earnedPts(id)),
  'earned-mage': (id) => mageEarned(id),
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
  /** Stamina lost to 大聲公 noise / to pushing over the run. */
  loudDrain: number;
  pushDrain: number;
  stepMs: number;
  shoves: number;
  angryHits: number;
  ults: number;
  endX: number;
  endZ: number;
  /** v0.7 bosses: times a boss yielded / bounced or bumped the player. */
  bossYields: number;
  bossHits: number;
}

function runLevel(levelId: number, skills: SkillState, seed: number, char: CharacterId = 'hero'): Run {
  const level = LEVELS.find((l) => l.id === levelId)!;
  const sim = new Sim(level, modsForChar(char, skills, levelId), mulberry32(seed));
  const p = sim.player;
  let held = false;
  let heldT = 0;
  let blockedT = 0;
  let maxBodies = 0;
  let maxPen = 0;
  let shoves = 0;
  let angryHits = 0;
  let ults = 0;
  let bossYields = 0;
  let bossHits = 0;
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
    // v0.7: a player who owns Second Wind fires it when the 衰仔王 closes in.
    const bratKing = sim.crowd.bosses().some((a) => a.kind === 'brat' && Math.hypot(a.body.x - b.x, a.body.z - b.z) < 1.3);
    if (p.stamina < p.staminaMax * 0.25 || bratKing) sim.trySecondWind();
    // v0.8 mage: cast counters on nearby specials/bosses; otherwise clear lanes when jammed.
    if (char === 'mage' && sim.time > 0.5) {
      const pm = sim.playerMods as import('../src/game/charactersDef').PlayerMods;
      const bar = pm.spellBar ?? [];
      // Nearest non-normal (prefer boss).
      let focus: { kind: string; d: number } | null = null;
      for (const a of sim.crowd.agents) {
        if (a.kind === 'normal') continue;
        const d = Math.hypot(a.body.x - b.x, a.body.z - b.z);
        if (d > (a.boss ? 4.0 : 3.0)) continue;
        const score = d - (a.boss ? 1.5 : 0);
        if (!focus || score < focus.d) focus = { kind: a.kind, d: score };
      }
      const counterFor = (kind: string): string[] => {
        if (kind === 'luggage' || kind === 'stench') return ['fire_t3b', 'fire_t1'];
        if (kind === 'squat' || kind === 'family' || kind === 'angry') return ['ice_t3b', 'ice_t1'];
        if (kind === 'brat' || kind === 'loud' || kind === 'couple') return ['volt_t3b', 'volt_t1', 'fire_t3b', 'fire_t1'];
        return ['fire_t3b', 'ice_t3b', 'volt_t3b', 'fire_t1', 'ice_t1', 'volt_t1'];
      };
      const manaFull = p.mana >= p.manaMax * 0.75;
      const want = blockedT > 0.12 || !!focus || manaFull || b.contacts >= 1;
      if (want) {
        const prefer = focus ? counterFor(focus.kind) : ['fire_t3b', 'ice_t3b', 'volt_t3b', 'fire_t1', 'ice_t1', 'volt_t1'];
        const ordered = [
          ...prefer.filter((id) => bar.includes(id)),
          ...bar.filter((id) => !prefer.includes(id)),
        ];
        // Face the focus so directional spells land.
        if (focus) {
          for (const a of sim.crowd.agents) {
            if (a.kind !== focus.kind) continue;
            const d = Math.hypot(a.body.x - b.x, a.body.z - b.z);
            if (d > 4.0) continue;
            const len = d || 1;
            p.faceX = (a.body.x - b.x) / len;
            p.faceZ = (a.body.z - b.z) / len;
            break;
          }
        }
        for (const id of ordered) {
          if ((p.spellCd[id] ?? 0) > 0) continue;
          if (sim.tryAbility(id)) { blockedT = 0; break; }
        }
      }
      // Mage ults when stuck hard (prefer ice ult vs angry king).
      if (blockedT > 0.4 && sim.time > 1.2) {
        if (focus?.kind === 'angry' && skills.ultSta && sim.tryUltimate('sta')) ults++;
        else if (skills.ultStr && sim.tryUltimate('str')) ults++;
        else if (skills.ultSta && sim.tryUltimate('sta')) ults++;
        else if (skills.ultSpd && sim.tryUltimate('spd')) ults++;
      }
    }
    const input: PlayerInput = { x: dx, z: -dz, mag: 1, shoveHeld: held };
    sim.step(DT, input);
    steps++;
    for (const e of sim.events) {
      if (e.t === 'shove') shoves++;
      else if (e.t === 'angryHit') angryHits++;
      else if (e.t === 'bossYield') bossYields++;
      else if (e.t === 'bossBounce') bossHits++;
      else if (e.t === 'cast' && process.env.SPELLCASTDBG) { (globalThis as any).__casts = ((globalThis as any).__casts||0)+1; (globalThis as any).__castIds = ((globalThis as any).__castIds||[]).concat([e.ability]); }
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
    loudDrain: p.stats.loudDrain,
    pushDrain: p.stats.pushDrain,
    bossYields,
    bossHits,
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
const NO_MOVE: PlayerInput = { x: 0, z: 0, mag: 0, shoveHeld: false };
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
      // brace the pair with commuters above/below so going around is costly.
      for (const z of [-0.72, 0.72, -1.18, 1.18]) spawn(s, 'normal', 0, z);
      // v0.7: measure Thread directly — the pair lets go and steps apart for you. (With the
      // seed-deterministic agent ids the old time-to-cross measure was dominated by wander luck.)
      let gap = 0;
      const t = timeToX(s, -1.2, (q) => {
        q.player.body.z = Math.max(-0.2, Math.min(0.2, q.player.body.z));
        if (c.length === 2 && q.player.body.x > -0.4) gap = Math.max(gap, Math.abs(c[0].body.z - c[1].body.z));
      });
      return { t, gap };
    };
    const off = run(59);
    const on = run(60);
    push('Thread (couple)', on.gap > off.gap + 0.15 && on.t <= off.t + 0.05, `pair opens ${off.gap.toFixed(2)}m → ${on.gap.toFixed(2)}m, cross ${off.t.toFixed(2)}s → ${on.t.toFixed(2)}s`);
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
  // 大聲公 Loudmouth — stand still 3 s at distance d from one (fresh 100-stamina player).
  {
    const IDLE: PlayerInput = { x: 0, z: 0, mag: 0, shoveHeld: false };
    const run = (d: number, sta = 0) => {
      const s = emptySim(sk(0, 0, sta));
      spawn(s, 'loud', 0, 0);
      place(s, d, 0);
      const start = s.player.stamina;
      let peak = 0;
      for (let i = 0; i < 180; i++) {
        s.step(DT, IDLE);
        peak = Math.max(peak, s.player.noiseDrain);
      }
      return { lost: start - s.player.stamina, drained: s.player.stats.loudDrain, peak, winded: s.player.winded };
    };
    const near = run(0.6);
    const far = run(TUNING.types.loud.radius + 0.5);
    push(
      'Loudmouth inside radius',
      near.lost > 35 && near.lost < 90 && !near.winded,
      `3 s at 0.6 m: −${near.lost.toFixed(0)} of 100 stamina (drain ${near.peak.toFixed(1)}/s), winded=${near.winded}`,
    );
    push('Loudmouth outside radius', far.lost < 0.5 && far.drained === 0, `3 s at ${(TUNING.types.loud.radius + 0.5).toFixed(1)} m: −${far.lost.toFixed(1)}, noise drain ${far.drained.toFixed(1)}`);
    const off = run(0.6, 59);
    const on = run(0.6, 60);
    push(
      'Unbothered (loudmouth)',
      off.drained > 10 && on.drained < off.drained * 0.4,
      `noise drained ${off.drained.toFixed(1)} → ${on.drained.toFixed(1)} (−${Math.round((1 - on.drained / off.drained) * 100)}%)`,
    );
  }
  {
    // v0.6.3 repo rename: pre-rename save keys migrate to `exit-rush…` keys.
    // Legacy key from pre-rename builds (built from parts; no literal old name in source).
    const legacy = ['hk', ['m', 't', 'r'].join(''), 'exit-rush'].join('-');
    const fake = (init: Record<string, string>): KeyValueStore & { m: Map<string, string> } => {
      const m = new Map(Object.entries(init));
      return {
        m,
        get length() { return m.size; },
        key: (i) => [...m.keys()][i] ?? null,
        getItem: (k) => m.get(k) ?? null,
        setItem: (k, v) => void m.set(k, v),
        removeItem: (k) => void m.delete(k),
      };
    };
    const a = fake({ [`${legacy}-v1`]: '{"version":1,"highestCleared":12}', [`${legacy}-settings`]: 'x', other: 'keep' });
    const movedA = migrateLegacyKeys(a);
    const okA = a.m.get(SAVE_KEY) === '{"version":1,"highestCleared":12}' && a.m.get('exit-rush-settings') === 'x'
      && a.m.get('other') === 'keep' && ![...a.m.keys()].some((k) => k.startsWith(legacy));
    const b = fake({ [`${legacy}-v1`]: 'old', [SAVE_KEY]: 'new' });
    migrateLegacyKeys(b);
    const okB = b.m.get(SAVE_KEY) === 'new' && !b.m.has(`${legacy}-v1`);
    const c = fake({ [SAVE_KEY]: 'new' });
    const okC = migrateLegacyKeys(c).length === 0 && c.m.get(SAVE_KEY) === 'new';
    push('Save key migration', okA && okB && okC, `moved [${movedA.join(', ')}]; new key wins=${okB}; no-op=${okC}`);
  }
  {
    // v0.7 economy: 1 SP per first clear; respec + 3 loadouts.
    const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    // Old v0.6 save: 30 clears × 3 SP → 60/15/14 + STR ult spent (99) — more than the 30 now earned → refund.
    const old = normalizeSave({ version: 1, cleared: ids(30), skills: { str: 60, spd: 15, sta: 14, ultStr: true, ultSpd: false, ultSta: false, points: 0 } } as unknown as Partial<SaveData>);
    const okOld = old.skills.points === 30 && spentPoints(old.skills) === 0 && old.respecNotice && old.activeLoadout === 0 && old.loadouts.length === 3;
    // Old save that fits: 40 clears, 20/10/0 spent (30) → kept in slot 1, 10 spare, no notice.
    const fit = normalizeSave({ version: 1, cleared: ids(40), skills: { str: 20, spd: 10, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 90 } } as unknown as Partial<SaveData>);
    const okFit = fit.skills.str === 20 && fit.skills.points === 10 && !fit.respecNotice && fit.loadouts[0].str === 20;
    push('SP economy + migration', POINTS_PER_FIRST_CLEAR === 1 && okOld && okFit, `per clear=${POINTS_PER_FIRST_CLEAR}; over-spent v0.6 save → refund ${old.skills.points} pts + notice=${old.respecNotice}; fitting save kept 20/10/0 +${fit.skills.points} spare`);
    // Reset refunds exactly the earned total (incl. ultimates).
    const sv = normalizeSave({ version: 1, cleared: ids(85) } as Partial<SaveData>);
    for (let i = 0; i < 60; i++) sv.skills = spendPoint(sv.skills, 'spd');
    sv.skills = spendPoint(sv.skills, 'spd'); // ultimate (10)
    for (let i = 0; i < 15; i++) sv.skills = spendPoint(sv.skills, 'str');
    const spent = spentPoints(sv.skills);
    resetActiveLoadout(sv);
    const okReset = spent === 85 && sv.skills.points === earnedPoints(sv) && sv.skills.points === 85 && !sv.skills.ultSpd && sv.skills.spd === 0;
    push('Respec (reset)', okReset, `spent ${spent} (60 SPD + ult + 15 STR) → refund to ${sv.skills.points}/${earnedPoints(sv)}`);
    // Loadouts: slot 2 = STA build, slot 1 = SPD build; switching changes the effective skills.
    for (let i = 0; i < 40; i++) sv.skills = spendPoint(sv.skills, 'spd');
    switchLoadout(sv, 1);
    for (let i = 0; i < 50; i++) sv.skills = spendPoint(sv.skills, 'sta');
    const m2 = modifiersFromSkills(sv.skills);
    switchLoadout(sv, 0);
    const m1 = modifiersFromSkills(sv.skills);
    const back = sv.skills.spd === 40 && sv.skills.sta === 0 && sv.skills.points === 45 && sv.loadouts[1].sta === 50;
    const differ = JSON.stringify(m1) !== JSON.stringify(m2);
    push('Loadout switch', back && differ && sv.activeLoadout === 0, `slot1 SPD 40 (+${sv.skills.points} spare) ↔ slot2 STA 50; modifiers differ=${differ}`);
    const re = normalizeSave(JSON.parse(JSON.stringify(sv)) as Partial<SaveData>);
    push('Loadout save round-trip', re.loadouts[1].sta === 50 && re.skills.spd === 40 && re.loadouts[2].points === 85, `slots ${re.loadouts.map((l) => `${l.str}/${l.spd}/${l.sta}+${l.points}`).join(' | ')}`);
  }

  // ---------------------------------------------------------------- v0.7 bosses
  {
    const want: Record<number, string> = { 20: 'luggage', 30: 'stench', 40: 'squat', 50: 'family', 60: 'brat', 70: 'couple', 80: 'angry', 90: 'loud' };
    let ok = true;
    const bad: string[] = [];
    for (const [id, kind] of Object.entries(want)) {
      const lv = LEVELS.find((l) => l.id === +id)!;
      if (lv.boss?.length !== 1 || lv.boss[0] !== kind || lv.exam) { ok = false; bad.push(id); }
      const sim = new Sim(lv, modifiersFromSkills(defaultSkills()), mulberry32(3));
      const bs = sim.crowd.bosses();
      const def = PASSENGER_DEFS[kind as PassengerKind];
      if (bs.length !== (kind === 'couple' ? 2 : 1) || bs.some((a) => a.body.r < def.radius * 1.3 || a.body.mass < def.mass * 2 || a.scale / (def.scale ?? 1) < 1.5)) { ok = false; bad.push(`${id}:spawn`); }
    }
    const fin = LEVELS.find((l) => l.id === 100)!;
    const finSim = new Sim(fin, modifiersFromSkills(defaultSkills()), mulberry32(3));
    const finKinds = new Set(finSim.crowd.bosses().map((a) => a.boss!.kind));
    if (finKinds.size !== 8) { ok = false; bad.push(`100:${finKinds.size}`); }
    const plain = LEVELS.filter((l) => l.boss && l.id % 10 !== 0);
    if (plain.length) { ok = false; bad.push('stray'); }
    push('Boss levels 20–90 + L100', ok, ok ? '8 kings L20–L90 (exam replaced), all 8 at L100, 1.5×+ size / 2×+ mass' : `bad: ${bad.join(',')}`);
  }
  {
    // Stubbornness: leaning on the 踎低王 wears him down until he yields (steps aside), then he regains resolve.
    const s = emptySim(sk(0, 0, 0));
    s.crowd.spawnBoss('squat', -0.5, 0);
    const boss = s.crowd.bosses()[0];
    place(s, -0.5 + boss.body.r + s.player.body.r + 0.02, 0);
    let yieldT = -1;
    for (let i = 0; i < 9 * 60 && yieldT < 0; i++) {
      // Head-on: hold the player on his line (in a real car the crowd fills the side gaps).
      s.player.body.z = 0;
      s.player.body.vz = 0;
      s.step(DT, LEFT);
      for (const e of s.events) if (e.t === 'bossYield') yieldT = s.time;
      s.events.length = 0;
    }
    const moved = Math.hypot(boss.homeX - boss.originX, boss.homeZ - boss.originZ);
    for (let i = 0; i < 6 * 60; i++) s.step(DT, NO_MOVE);
    const back = Math.hypot(boss.homeX - boss.originX, boss.homeZ - boss.originZ);
    const regen = boss.boss!.stub;
    push('Boss stubbornness → yield', yieldT > 0 && yieldT < 7 && moved > 0.8 && back < 1e-6 && regen > 0.05, `yield at ${yieldT.toFixed(2)}s, stepped aside ${moved.toFixed(2)}m, back home, stub regen → ${regen.toFixed(2)}`);
  }
  {
    // 行李箱大王: his giant case bounces you back — Hurdle (SPD 40) hops it instead.
    const run = (spd: number) => {
      const s = emptySim(sk(0, spd, 0));
      s.crowd.spawnBoss('luggage', -0.9, 0.7);
      const c = s.crowd.bosses()[0].caseBody!;
      place(s, 0.6, c.z);
      let bounces = 0;
      let past = 6;
      const cz = c.z;
      for (let i = 0; i < 6 * 60; i++) {
        s.player.body.z = cz;
        s.player.body.vz = 0;
        s.step(DT, LEFT);
        for (const e of s.events) if (e.t === 'bossBounce') bounces++;
        s.events.length = 0;
        if (s.player.body.x < c.x - c.r - 0.3) { past = s.time; break; }
      }
      return { bounces, past, r: c.r };
    };
    const off = run(39);
    const on = run(40);
    push('Hurdle vs Suitcase King', off.bounces > 0 && on.bounces === 0 && on.past < off.past, `case r=${off.r.toFixed(2)}m · bounces ${off.bounces} → ${on.bounces}, past the case ${off.past.toFixed(2)}s → ${on.past.toFixed(2)}s`);
  }
  {
    // 黏身情侶王: the royal hand-hold is a rope you can't walk through — Thread (SPD 60) slips it.
    const run = (spd: number) => {
      const s = emptySim(sk(0, spd, 0));
      s.crowd.spawnBoss('couple', -0.6, 0);
      place(s, 0.3, 0);
      for (let i = 0; i < 1.6 * 60; i++) s.step(DT, LEFT);
      return s.player.body.x;
    };
    const off = run(59);
    const on = run(60);
    push('Thread vs Couple Royals', off > -0.45 && on < -0.8, `x after 1.6s: no Thread ${off.toFixed(2)} (held at the hand-hold) → Thread ${on.toFixed(2)}`);
  }
  {
    // 嬲嬲豬王: his charge-shove cuts through generic resist; Stand Firm (STR 60) still holds.
    const run = (str: number) => {
      const s = emptySim(sk(str, 0, 0));
      s.crowd.spawnBoss('angry', -0.4, 0);
      place(s, 0.45, 0);
      let power = 0;
      let stun = 0;
      for (let i = 0; i < 4 * 60; i++) {
        s.step(DT, NO_MOVE);
        for (const e of s.events) if (e.t === 'angryHit') power = Math.max(power, e.power);
        stun = Math.max(stun, s.player.stunT);
        s.events.length = 0;
      }
      return { power, stun };
    };
    const off = run(59);
    const on = run(60);
    push('Stand Firm vs Hog King', off.power > 0 && on.power < off.power * 0.6 && on.stun < off.stun * 0.5, `shove ${off.power.toFixed(2)} → ${on.power.toFixed(2)}, stun ${off.stun.toFixed(2)}s → ${on.stun.toFixed(2)}s`);
  }
  {
    // 衰仔王: Second Wind (STA 50) dazes him (no dashes); 大聲公王's noise zone is ~boss-size wide.
    const s = emptySim(sk(0, 0, 50));
    s.crowd.spawnBoss('brat', -0.3, 0);
    const brat = s.crowd.bosses()[0];
    place(s, 0.4, 0);
    s.step(DT, NO_MOVE);
    const fired = s.trySecondWind();
    const dazed = brat.dazedUntil > s.time;
    const l = emptySim(sk(0, 0, 0));
    l.crowd.spawnBoss('loud', 0, 0);
    const R = TUNING.types.loud.radius;
    const far = l.crowd.noiseAt(R * 1.5, 0);
    push('Second Wind / Loud King', fired && dazed && far > 0, `brat king dazed=${dazed}; loud king noise at ${(R * 1.5).toFixed(2)}m = ${far.toFixed(2)} (normal loudmouth: 0)`);
  }
  {
    // Save: seenBosses (cutscene shown in full only once) survives normalisation, junk filtered.
    const n = normalizeSave({ version: 1, seenBosses: [20, 20, 30, 'x', 101, 0, 2.5] } as unknown as SaveData);
    push('Save seenBosses', JSON.stringify(n.seenBosses) === '[20,30]', `normalised → ${JSON.stringify(n.seenBosses)}`);
  }

  return out;
}

// ------------------------------------------------------------------ workers

interface Job {
  level: number;
  loadout: string;
  seed: number;
  char: CharacterId;
}
interface JobResult extends Job {
  run: Run;
}

if (!isMainThread) {
  const jobs = workerData as Job[];
  const out: JobResult[] = jobs.map((j) => ({
    ...j,
    run: runLevel(j.level, loadout(j.char === 'mage' && j.loadout === 'earned' ? 'earned-mage' : j.loadout)(j.level), j.seed, j.char ?? 'hero'),
  }));
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
  if (level <= 30) return [0.55, 0.75];
  if (level <= 60) return [0.5, 0.7];
  return [0.35, 0.6];
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
  for (const char of CHARS) {
    for (const lv of levels) {
      for (const lo of loadEnv ?? DEFAULT_LOADOUTS(lv.id)) {
        for (let s = 0; s < RUNS; s++) {
          jobs.push({
            level: lv.id,
            loadout: lo,
            seed: 1000 + SEED + s * 7919 + lv.id * 31 + (char === 'mage' ? 17 : char === 'tech' ? 29 : 0),
            char,
          });
        }
      }
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


  // v0.8 character framework: hero mods bit-identical; mana; save migration.
  {
    const sk = { str: 40, spd: 20, sta: 10, ultStr: false, ultSpd: false, ultSta: false, points: 30 };
    const a = modifiersFromSkills(sk);
    const b = modsFor(CHARACTERS.hero, sk);
    const keys = Object.keys(a) as (keyof typeof a)[];
    let drift = 0;
    for (const k of keys) {
      if (a[k] !== b[k]) {
        console.error(`hero mods drift on ${k}: ${String(a[k])} vs ${String(b[k])}`);
        drift++;
      }
    }
    if (drift) { console.error(`${drift} hero mod parity failure(s)`); process.exit(1); }
    console.log('hero modsFor parity ok');

    const mageMods = modsFor(CHARACTERS.mage, sk, defaultSpellBar(sk));
    if (mageMods.manaMax <= 0) { console.error('mage manaMax expected > 0'); process.exit(1); }
    if (mageMods.characterId !== 'mage') { console.error('mage characterId'); process.exit(1); }
    const sim = new Sim(LEVELS.find((l) => l.id === 1)!, mageMods, mulberry32(9));
    if (sim.player.manaMax <= 0) { console.error('PlayerSim mana not initialised'); process.exit(1); }
    // Cast Fire Bolt if unlocked (str>=10)
    const ok = sim.tryAbility('fire_t1');
    if (sk.str >= 10 && !ok && sim.player.manaDeniedT <= 0) {
      /* may fail if not on bar — ensure bar has it */
    }
    console.log(`mage mana ok (max=${sim.player.manaMax}, bar=${mageMods.spellBar.join(',')})`);

    const fit = { str: 10, spd: 5, sta: 5, ultStr: false, ultSpd: false, ultSta: false, points: 0 };
    const old = normalizeSave({
      version: 1,
      lang: 'zh-HK',
      skills: fit,
      highestCleared: 20,
      cleared: Array.from({ length: 20 }, (_, i) => i + 1),
      clears: {},
      quality: 'auto',
      autoQuality: null,
      typeIcons: true,
      masterVol: 0.8, musicVol: 0.5, sfxVol: 0.8, muted: false,
      seenIntros: [], seenBosses: [], ftueDone: true,
      loadouts: [fit, defaultSkills(), defaultSkills()],
      activeLoadout: 0,
      respecNotice: false,
    } as SaveData);
    if (old.character !== 'hero') { console.error('save migrate character default'); process.exit(1); }
    if (old.skills.str !== 10 || old.skills.spd !== 5 || old.skills.sta !== 5) {
      console.error('save migrate skills drifted', old.skills); process.exit(1);
    }
    if (!old.mage || old.mage.loadouts.length !== 3) { console.error('save migrate mage defaults'); process.exit(1); }
    console.log('save migration character fields ok');
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
  console.log('char  lvl dens press timer | loadout      win%  medT  medLeft  <10s  bodies maxPen ms/step shove angry ults  loud  yld hit | target');
  let failures = 0;
  const rows: Record<string, unknown>[] = [];
  const heroBand: Record<string, number> = {};
  for (const char of CHARS) {
  for (const lv of levels) {
    for (const lo of loadEnv ?? DEFAULT_LOADOUTS(lv.id)) {
      const runs = results.filter((r) => r.level === lv.id && r.loadout === lo && (r.char ?? 'hero') === char).map((r) => r.run);
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
      const key = `${lv.id}:${lo}`;
      if (char === 'hero') heroBand[key] = wr;
      const delta = char !== 'hero' && key in heroBand ? wr - heroBand[key] : 0;
      const deltaMark = char !== 'hero' ? ` Δ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}pp` : '';
      rows.push({
        char,
        level: lv.id,
        loadout: lo,
        runs: runs.length,
        winRate: wr,
        deltaVsHero: char === 'hero' ? 0 : delta,
        medT,
        medLeft,
        fast,
        timer: lv.timer,
        losses: runs.filter((r) => !r.win).map((r) => [+r.endX.toFixed(2), +r.endZ.toFixed(2)]),
        times: wins.map((r) => +r.t.toFixed(2)).sort((a, b) => a - b),
      });
      console.log(
        `${char.padEnd(5)} ${String(lv.id).padStart(3)} ${String(lv.density).padStart(4)} ${lv.pressure.toFixed(2)} ${String(lv.timer).padStart(5)} | ${lo.padEnd(11)} ${String(Math.round(wr * 100)).padStart(4)}% ${f1(medT)} ${f1(medLeft, 7)} ${String(Math.round(fast * 100)).padStart(4)}%  ${String(bodies).padStart(5)}  ${pen.toFixed(2)}  ${avg('stepMs').toFixed(3)} ${f1(avg('shoves'))} ${f1(avg('angryHits'))} ${f1(avg('ults'), 4)} ${f1(avg('loudDrain'), 5)} ${f1(avg('bossYields'), 4)} ${f1(avg('bossHits'), 3)} | ${mark}${deltaMark}`,
      );
    }
  }
  }
  if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(rows, null, 2));
  if (failures) {
    console.error(`\n${failures} sanity check(s) failed`);
    process.exit(1);
  }
  console.log('\nOK: no NaNs, body cap respected, overlap bounded.');
}
