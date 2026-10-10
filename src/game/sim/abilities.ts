/**
 * Ability registry (v0.8) — pure TS, no three.js.
 * Hero actives stay as thin wrappers on PlayerSim; mage spells live here.
 */
import { applyImpulse, type Body, type World } from './Physics';
import type { CrowdSim, Agent } from './CrowdSim';
import type { PlayerSim } from './PlayerSim';
import type { Emit } from './events';
import type { LevelDef } from '../levels';
import type { Rng } from './rng';
import { TUNING } from './tuning';
import { spellById, type SpellNodeDef } from '../SpellTree';
import type { PlayerMods } from '../charactersDef';
import type { PassengerKind } from '../PassengerTypes';

export interface AbilityCtx {
  world: World;
  crowd: CrowdSim;
  player: PlayerSim;
  time: number;
  rng: Rng;
  emit: Emit;
  level: LevelDef;
  mods: PlayerMods;
}

export interface AbilityDef {
  id: string;
  resource: 'stamina' | 'mana' | 'none';
  cost: number;
  cd: number;
  /** Passenger kinds this counters (boss weak-point ×2.5). */
  counters?: PassengerKind[];
  cast(ctx: AbilityCtx): boolean;
}

function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}


/** Prefer doorward facing; if no forward hits would land, aim at nearest agent. */
function aimDir(ctx: AbilityCtx): { dx: number; dz: number } {
  const face = facing(ctx.player);
  const px = ctx.player.body.x;
  const pz = ctx.player.body.z;
  let forwardHits = 0;
  for (const a of ctx.crowd.agents) {
    const vx = a.body.x - px;
    const vz = a.body.z - pz;
    const d = Math.hypot(vx, vz);
    if (d > 2.8 || d < 0.05) continue;
    if ((vx * face.dx + vz * face.dz) / d > 0.2) forwardHits++;
  }
  if (forwardHits > 0) return face;
  let best: Agent | null = null;
  let bestD = 9;
  for (const a of ctx.crowd.agents) {
    const d = Math.hypot(a.body.x - px, a.body.z - pz);
    if (d < bestD && d > 0.1) { bestD = d; best = a; }
  }
  if (!best) return face;
  let dx = best.body.x - px;
  let dz = best.body.z - pz;
  const len = Math.hypot(dx, dz) || 1;
  return { dx: dx / len, dz: dz / len };
}

function facing(p: PlayerSim): { dx: number; dz: number } {
  const len = Math.hypot(p.faceX, p.faceZ) || 1;
  return { dx: p.faceX / len, dz: p.faceZ / len };
}

function disableDur(base: number, isBoss: boolean): number {
  return base * (isBoss ? TUNING.mage.bossDisableMul : 1);
}

function applyStatus(
  a: Agent,
  kind: 'chill' | 'freeze' | 'daze' | 'auraOff' | 'callOff' | 'linkOff',
  until: number,
  emit: Emit,
): void {
  if (kind === 'chill') a.chillUntil = Math.max(a.chillUntil, until);
  else if (kind === 'freeze') a.freezeUntil = Math.max(a.freezeUntil, until);
  else if (kind === 'daze') a.dazedUntil = Math.max(a.dazedUntil, until);
  else if (kind === 'auraOff') a.auraOffUntil = Math.max(a.auraOffUntil, until);
  else if (kind === 'callOff') a.callOffUntil = Math.max(a.callOffUntil, until);
  else if (kind === 'linkOff') {
    a.splitUntil = Math.max(a.splitUntil, until);
    if (a.partner) a.partner.splitUntil = Math.max(a.partner.splitUntil, until);
  }
  emit({ t: 'status', agentId: a.id, kind, until });
}

function hitAgents(
  crowd: CrowdSim,
  px: number,
  pz: number,
  radius: number,
  filter?: (a: Agent) => boolean,
): Agent[] {
  const r2 = radius * radius;
  const out: Agent[] = [];
  for (const a of crowd.agents) {
    if (filter && !filter(a)) continue;
    if (dist2(a.body.x, a.body.z, px, pz) <= r2) out.push(a);
  }
  return out;
}

function sideImpulse(body: Body, faceDx: number, faceDz: number, impulse: number, _massDiv = true): void {
  // Perpendicular to facing (prefer +right). applyImpulse already scales by invMass.
  let sx = -faceDz;
  let sz = faceDx;
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl;
  sz /= sl;
  applyImpulse(body, sx * impulse, sz * impulse);
}

function radialImpulse(body: Body, px: number, pz: number, impulse: number, luggageMul = 1): void {
  let dx = body.x - px;
  let dz = body.z - pz;
  const d = Math.hypot(dx, dz) || 1;
  dx /= d;
  dz /= d;
  const mul = impulse * luggageMul;
  applyImpulse(body, dx * mul, dz * mul);
}

function isBossAgent(a: Agent): boolean {
  return !!a.boss;
}

function drainBoss(a: Agent, counters: PassengerKind[] | undefined, mods: PlayerMods): void {
  if (!a.boss || !counters?.length) return;
  if (!counters.includes(a.kind as PassengerKind) && !counters.includes(a.boss.kind)) return;
  const mul = TUNING.mage.bossCounterDrainMul * (a.kind === 'angry' ? 1.55 : 1);
  a.boss.stub = Math.max(0, a.boss.stub - 0.08 * mul * (mods.spellPower || 1));
}

/** Build ability defs for currently bar-equipped spells or Gear L gadgets. */
export function abilitiesForBar(ids: string[], mods: PlayerMods): AbilityDef[] {
  const out: AbilityDef[] = [];
  for (const id of ids) {
    const tech = techAbility(id, mods);
    if (tech) {
      out.push(tech);
      continue;
    }
    const node = spellById(id);
    if (!node || node.kind !== 'active') continue;
    const def = spellAbility(node, mods);
    if (def) out.push(def);
  }
  return out;
}

function tierOf(mods: PlayerMods, id: string): 1 | 2 | 3 {
  const t = mods.techTier?.[id];
  return t === 2 || t === 3 ? t : 1;
}

function techAbility(id: string, mods: PlayerMods): AbilityDef | null {
  if (mods.characterId !== 'tech') return null;
  const tier = tierOf(mods, id);
  const pick = <T,>(a: T, b: T, c: T): T => (tier === 3 ? c : tier === 2 ? b : a);
  if (id === 'D3') {
    return {
      id,
      resource: 'none',
      cost: 0,
      cd: 10,
      counters: ['brat'],
      cast(ctx) {
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        const face = facing(ctx.player);
        // Off the lane: a lure behind the player makes brats walk back through them.
        const lx = px - face.dx * 0.4 - face.dz * 2.2;
        const lz = pz - face.dz * 0.4 + face.dx * 2.2;
        const dur = pick(2.5, 3.5, 4.5);
        ctx.emit({ t: 'gadget', id, x: lx, z: lz });
        for (const a of ctx.crowd.agents) {
          if (a.kind !== 'brat') continue;
          if (dist2(a.body.x, a.body.z, px, pz) > 9) continue;
          a.lureUntil = ctx.time + dur;
          a.lureX = lx;
          a.lureZ = lz;
          drainBoss(a, ['brat'], mods);
        }
        return true;
      },
    };
  }
  if (id === 'D4') {
    return {
      id,
      resource: 'none',
      cost: 0,
      cd: 12,
      counters: ['family'],
      cast(ctx) {
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        const dur = pick(3, 4, 5);
        ctx.emit({ t: 'gadget', id, x: px, z: pz });
        for (const a of ctx.crowd.agents) {
          const d2 = dist2(a.body.x, a.body.z, px, pz);
          if (a.kind === 'family' && d2 <= 2.5 * 2.5) {
            a.huddleUntil = ctx.time + dur;
            drainBoss(a, ['family'], mods);
          } else if (tier === 3 && a.kind === 'brat' && d2 <= 2.5 * 2.5) {
            a.huddleUntil = ctx.time + 2;
          }
        }
        return true;
      },
    };
  }
  if (id === 'D5') {
    return {
      id,
      resource: 'none',
      cost: 0,
      cd: 6,
      counters: ['stench'],
      cast(ctx) {
        const { dx, dz } = aimDir(ctx);
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        const range = pick(2, 2.3, 2.6);
        const impulse = pick(3, 3.6, 4.2);
        const aura = pick(3, 4, 5);
        ctx.emit({ t: 'gadget', id, x: px, z: pz });
        for (const a of ctx.crowd.agents) {
          const vx = a.body.x - px;
          const vz = a.body.z - pz;
          const dist = Math.hypot(vx, vz);
          if (dist < 0.05 || dist > range) continue;
          const along = (vx * dx + vz * dz) / dist;
          if (along < 0.3) continue;
          applyImpulse(a.body, dx * impulse, dz * impulse);
          if (a.kind === 'stench') applyStatus(a, 'auraOff', ctx.time + aura, ctx.emit);
          drainBoss(a, ['stench'], mods);
        }
        return true;
      },
    };
  }
  if (id === 'K1' || id === 'K2' || id === 'K3') {
    return {
      id,
      resource: 'none',
      cost: 0,
      cd: 0.4,
      cast(ctx) {
        const i = ctx.player.consumables.indexOf(id);
        if (i < 0) return false;
        ctx.player.consumables.splice(i, 1);
        if (id === 'K1') {
          ctx.player.winded = false;
          ctx.player.stamina = Math.min(ctx.player.staminaMax, ctx.player.stamina + 40);
        } else if (id === 'K2') {
          ctx.player.espressoUntil = ctx.time + 5;
        } else {
          ctx.player.mintUntil = ctx.time + 6;
        }
        ctx.emit({ t: 'gadget', id, x: ctx.player.body.x, z: ctx.player.body.z });
        return true;
      },
    };
  }
  return null;
}

function clampCar(x: number, z: number): { x: number; z: number } {
  const h = TUNING.car.halfWidth - 0.4;
  return {
    x: Math.max(-h, Math.min(h, x)),
    z: Math.max(-3.8, Math.min(3.8, z)),
  };
}

/** Away from her, and deeper into the car so the doorway clears. */
function blowVector(px: number, pz: number, ax: number, az: number): { x: number; z: number } {
  const dx = ax - px;
  const dz = az - pz;
  const d = Math.hypot(dx, dz) || 1;
  let kx = (dx / d) * 0.55 + 0.75;
  let kz = (dz / d) * 0.85;
  const kl = Math.hypot(kx, kz) || 1;
  kx /= kl;
  kz /= kl;
  return { x: kx, z: kz };
}

function markCold(a: Agent, until: number, emit: Emit): void {
  a.coldUntil = Math.max(a.coldUntil, until);
  if (a.kind === 'loud') a.callOffUntil = Math.max(a.callOffUntil, until);
  if (a.kind === 'stench') a.auraOffUntil = Math.max(a.auraOffUntil, until);
  emit({ t: 'status', agentId: a.id, kind: 'cold', until });
}

function markSlow(a: Agent, until: number, mul: number, emit: Emit): void {
  if (until >= a.slowUntil) {
    a.slowUntil = until;
    a.slowMul = mul;
  } else if (mul < a.slowMul) {
    a.slowMul = mul;
  }
  emit({ t: 'status', agentId: a.id, kind: 'slow', until });
}

function markFlee(a: Agent, until: number, x: number, z: number, emit: Emit): void {
  if (a.boss) return;
  const spot = clampCar(x, z);
  a.fleeUntil = Math.max(a.fleeUntil, until);
  a.fleeX = spot.x;
  a.fleeZ = spot.z;
  emit({ t: 'status', agentId: a.id, kind: 'flee', until });
}

const WEAR_KINDS: Record<'wind' | 'ice' | 'grav', PassengerKind[]> = {
  wind: ['luggage', 'couple'],
  ice: ['stench', 'angry', 'loud'],
  grav: ['squat', 'brat', 'family'],
};

/** Weather wears a boss down. It does not strike them. One chip per cast, even on a mix. */
function weatherTouch(a: Agent, schools: readonly ('wind' | 'ice' | 'grav')[], mods: PlayerMods): void {
  if (!a.boss) return;
  const base = (TUNING.weather.wear ?? 0.08) * (mods.spellPower || 1);
  a.boss.stub = Math.max(0, a.boss.stub - base);
  const kinds: PassengerKind[] = [];
  for (const school of schools) {
    for (const k of WEAR_KINDS[school]) if (!kinds.includes(k)) kinds.push(k);
  }
  drainBoss(a, kinds, mods);
}

function blowBody(a: Agent, px: number, pz: number, impulse: number, mods: PlayerMods): void {
  const dir = blowVector(px, pz, a.body.x, a.body.z);
  const scale = a.boss ? (TUNING.weather?.bossImpulse ?? 0.35) : 1;
  const push = impulse * (mods.spellPower || 1) * scale;
  applyImpulse(a.body, dir.x * push, dir.z * push);
  if (a.caseBody) {
    const mul = TUNING.weather?.caseMul ?? 1.45;
    applyImpulse(a.caseBody, dir.x * push * mul, dir.z * push * mul);
  }
}

function inCone(
  a: Agent,
  px: number,
  pz: number,
  dx: number,
  dz: number,
  range: number,
  width: number,
): number {
  const vx = a.body.x - px;
  const vz = a.body.z - pz;
  const dist = Math.hypot(vx, vz);
  if (dist < 0.05 || dist > range) return -1;
  const along = (vx * dx + vz * dz) / dist;
  if (along < 0.05) return -1;
  const lat = Math.abs(vx * -dz + vz * dx);
  if (lat > width + dist * 0.55) return -1;
  return dist;
}

type WearSchool = 'wind' | 'ice' | 'grav';

function coneAbility(
  node: SpellNodeDef,
  cost: number,
  cd: number,
  row: { range: number; width: number; impulse: number },
  schools: readonly WearSchool[],
  after: (a: Agent, ctx: AbilityCtx) => void,
): AbilityDef {
  return {
    id: node.id,
    resource: 'mana',
    cost,
    cd,
    cast(ctx) {
      const { dx, dz } = aimDir(ctx);
      const px = ctx.player.body.x;
      const pz = ctx.player.body.z;
      ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx, dz, el: 'wind', r: row.range, w: row.width });
      for (const a of ctx.crowd.agents) {
        const dist = inCone(a, px, pz, dx, dz, row.range, row.width);
        if (dist < 0) continue;
        blowBody(a, px, pz, row.impulse * (1.1 - dist / row.range * 0.25), ctx.mods);
        weatherTouch(a, schools, ctx.mods);
        after(a, ctx);
      }
      return true;
    },
  };
}

function auraAbility(
  node: SpellNodeDef,
  cost: number,
  cd: number,
  radius: number,
  el: 'ice' | 'grav',
  hold: boolean,
  schools: readonly WearSchool[],
  after: (a: Agent, ctx: AbilityCtx) => void,
): AbilityDef {
  return {
    id: node.id,
    resource: 'mana',
    cost,
    cd,
    cast(ctx) {
      const px = ctx.player.body.x;
      const pz = ctx.player.body.z;
      ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx: 0, dz: el === 'grav' ? -1 : 0, el, hold, r: radius });
      for (const a of hitAgents(ctx.crowd, px, pz, radius)) {
        weatherTouch(a, schools, ctx.mods);
        after(a, ctx);
      }
      return true;
    },
  };
}

/**
 * The cast is the line she pressed. Knowing another line does not mix in.
 * Wind blows. Ice is a cold patch. Gravity is her own weight.
 * iw is a cold patch people leave. ig slows the patch. wg is a thin hard push.
 */
function spellAbility(node: SpellNodeDef, mods: PlayerMods): AbilityDef | null {
  const W = TUNING.weather;
  const rank = node.rank - 1;
  const cost = W.mana[node.line];
  const cd = W.cd[node.line] * (mods.cdr || 1);

  if (node.line === 'w') {
    return coneAbility(node, cost, cd, W.w[rank], ['wind'], () => {});
  }
  if (node.line === 'iw') {
    const row = W.iw[rank];
    return auraAbility(node, cost, cd, row.radius, 'ice', false, ['wind', 'ice'], (a, ctx) => {
      markCold(a, ctx.time + row.cold, ctx.emit);
      const px = ctx.player.body.x;
      const pz = ctx.player.body.z;
      const dir = blowVector(px, pz, a.body.x, a.body.z);
      const dist = Math.hypot(a.body.x - px, a.body.z - pz);
      // Push them past the rim so the ice array clears and the leave reads on phone.
      const step = Math.max(1.2, row.radius - dist + 1.35);
      markFlee(a, ctx.time + row.flee, a.body.x + dir.x * step, a.body.z + dir.z * step, ctx.emit);
    });
  }
  if (node.line === 'wg') {
    return coneAbility(node, cost, cd, W.wg[rank], ['wind', 'grav'], () => {});
  }
  if (node.line === 'i') {
    const row = W.i[rank];
    return auraAbility(node, cost, cd, row.radius, 'ice', false, ['ice'], (a, ctx) => {
      markCold(a, ctx.time + row.cold, ctx.emit);
    });
  }
  if (node.line === 'g') {
    const row = W.g[rank];
    return {
      id: node.id,
      resource: 'mana',
      cost,
      cd,
      cast(ctx) {
        const p = ctx.player;
        const until = ctx.time + row.brace;
        if (until >= p.weightUntil) {
          p.weightUntil = until;
          p.weightMul = row.mul;
          p.weightResist = row.extra;
        }
        ctx.emit({
          t: 'cast', ability: node.id,
          x: p.body.x, z: p.body.z, dx: 0, dz: -1, el: 'grav', r: row.radius,
        });
        return true;
      },
    };
  }
  if (node.line === 'ig') {
    const row = W.ig[rank];
    return auraAbility(node, cost, cd, row.radius, 'ice', false, ['ice', 'grav'], (a, ctx) => {
      markCold(a, ctx.time + row.cold, ctx.emit);
      const dur = disableDur(row.slow, isBossAgent(a));
      markSlow(a, ctx.time + dur, row.mul, ctx.emit);
    });
  }
  return null;
}

/**
 * Rank 4 is a stronger cast of the same line, on the same button.
 * There is no second gale button.
 */
export function castMageUlt(_kind: 'str' | 'spd' | 'sta', _ctx: AbilityCtx): boolean {
  return false;
}
