/**
 * Headless sanity test for the crowd physics + level balance.
 *   npm run test:sim
 * Runs every level with a simple bot (stick toward the door, shove when blocked)
 * for several seeds, with no skills and with maxed skills. Checks for NaNs,
 * runaway overlap, body cap, and reports win rate + step cost.
 */
import { Sim } from '../src/game/sim/Sim';
import { mulberry32 } from '../src/game/sim/rng';
import { DOOR_Z, TUNING } from '../src/game/sim/tuning';
import { LEVELS } from '../src/game/levels';
import { modifiersFromSkills } from '../src/game/SkillTree';
import { defaultSkills, type SkillState } from '../src/game/storage';
import type { PlayerInput } from '../src/game/sim/PlayerSim';

const DT = 1 / TUNING.physics.hz;
const SEEDS = Number(process.env.SEEDS ?? 4);
const only = process.env.LEVEL ? Number(process.env.LEVEL) : null;

function maxed(): SkillState {
  return { str: 60, spd: 60, wis: 60, ultStr: true, ultSpd: true, ultWis: true, points: 0 };
}
/** Roughly what a player could have earned by this level (1 point per clear). */
function earned(levelId: number): SkillState {
  const pts = Math.min(20, levelId - 1);
  const third = Math.floor(pts / 3);
  return { ...defaultSkills(), str: pts - 2 * third, spd: third, wis: third };
}

interface Run {
  win: boolean;
  t: number;
  maxBodies: number;
  maxPen: number;
  stepMs: number;
  shoves: number;
  angryHits: number;
  bumps: number;
}

function runLevel(levelId: number, skills: SkillState, seed: number, useUlts: boolean): Run {
  const level = LEVELS.find((l) => l.id === levelId)!;
  const sim = new Sim(level, modifiersFromSkills(skills), mulberry32(seed));
  let held = false;
  let heldT = 0;
  let maxBodies = 0;
  let maxPen = 0;
  let shoves = 0;
  let angryHits = 0;
  let bumps = 0;
  let steps = 0;
  const t0 = performance.now();
  while (!sim.finished && steps < 200 * 60) {
    const b = sim.player.body;
    // Bot: aim at the doorway with a little weave to find gaps.
    let dx = -b.x * 0.8 + Math.sin(sim.time * 1.7) * 0.25;
    let dz = DOOR_Z - b.z;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const blocked = sim.player.pushing && Math.hypot(b.vx, b.vz) < 0.5;
    if (!held && blocked && sim.player.shoveCd <= 0 && sim.player.stamina > sim.player.staminaMax * 0.35) {
      held = true;
      heldT = 0;
    }
    if (held) {
      heldT += DT;
      if (heldT > 0.3) held = false;
    }
    if (useUlts && sim.time > 2) {
      if (skills.ultSpd) sim.tryUltimate('spd');
      if (skills.ultStr && blocked) sim.tryUltimate('str');
      if (skills.ultWis && sim.time > 4) sim.tryUltimate('wis');
    }
    const input: PlayerInput = { x: dx, z: -dz, mag: 1, shoveHeld: held };
    sim.step(DT, input);
    steps++;
    for (const e of sim.events) {
      if (e.t === 'shove') shoves++;
      else if (e.t === 'angryHit') angryHits++;
      else if (e.t === 'bump') bumps++;
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
  return {
    win: sim.result === 'win',
    t: sim.time,
    maxBodies,
    maxPen,
    stepMs: ms / Math.max(1, steps),
    shoves,
    angryHits,
    bumps,
  };
}

const profiles: [string, (id: number) => SkillState, boolean][] = [
  ['none', () => defaultSkills(), false],
  ['earned', earned, false],
  ['max+ult', () => maxed(), true],
];

let failures = 0;
console.log(`seeds=${SEEDS}  dt=${DT.toFixed(4)}  maxBodies=${TUNING.physics.maxBodies}`);
console.log('lvl  dens press timer | profile  win  avgT   bodies maxPen  ms/step shoves angry');
for (const lv of LEVELS) {
  if (only !== null && lv.id !== only) continue;
  for (const [name, skills, ults] of profiles) {
    const runs: Run[] = [];
    for (let s = 0; s < SEEDS; s++) runs.push(runLevel(lv.id, skills(lv.id), 1000 + s * 17 + lv.id, ults));
    const wins = runs.filter((r) => r.win);
    const avgT = wins.length ? wins.reduce((a, r) => a + r.t, 0) / wins.length : NaN;
    const bodies = Math.max(...runs.map((r) => r.maxBodies));
    const pen = Math.max(...runs.map((r) => r.maxPen));
    const ms = runs.reduce((a, r) => a + r.stepMs, 0) / runs.length;
    const sh = runs.reduce((a, r) => a + r.shoves, 0) / runs.length;
    const ah = runs.reduce((a, r) => a + r.angryHits, 0) / runs.length;
    if (bodies > TUNING.physics.maxBodies) failures++;
    if (pen > 0.75) failures++;
    console.log(
      `${String(lv.id).padStart(3)}  ${String(lv.density).padStart(4)} ${lv.pressure.toFixed(2)} ${String(lv.timer).padStart(5)} | ${name.padEnd(8)} ${wins.length}/${runs.length}  ${Number.isNaN(avgT) ? '  -  ' : avgT.toFixed(1).padStart(5)}  ${String(bodies).padStart(5)}  ${pen.toFixed(2)}   ${ms.toFixed(3)}  ${sh.toFixed(1).padStart(5)} ${ah.toFixed(1).padStart(5)}`,
    );
  }
}
if (failures) {
  console.error(`\n${failures} sanity check(s) failed`);
  process.exit(1);
}
console.log('\nOK: no NaNs, body cap respected, overlap bounded.');
