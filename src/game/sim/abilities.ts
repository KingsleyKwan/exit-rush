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

function spellAbility(node: SpellNodeDef, mods: PlayerMods): AbilityDef | null {
  const Sp = TUNING.spells;
  const cdr = mods.cdr || 1;
  const power = mods.spellPower || 1;

  if (node.id === 'fire_t1') {
    const T = Sp.fireBolt;
    return {
      id: node.id,
      resource: 'mana',
      cost: T.mana,
      cd: T.cd * cdr,
      cast(ctx) {
        const { dx, dz } = aimDir(ctx);
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx, dz, el: 'fire' });
        // Wide forward wedge (not a thin ray) — shove bodies forward + aside.
        const halfW = Math.max(T.width, 0.85);
        for (const a of ctx.crowd.agents) {
          const vx = a.body.x - px;
          const vz = a.body.z - pz;
          const dist = Math.hypot(vx, vz);
          if (dist < 0.05 || dist > T.range) continue;
          const along = (vx * dx + vz * dz) / dist;
          if (along < 0.15) continue; // behind / steeply beside
          const lat = Math.abs(vx * -dz + vz * dx);
          if (lat > halfW + dist * 0.45) continue;
          const imp = T.impulse * power * (1.15 - dist / T.range * 0.35);
          // Blend: mostly away from caster, with a forward bias.
          let kx = vx / dist * 0.65 + dx * 0.55;
          let kz = vz / dist * 0.65 + dz * 0.55;
          const kl = Math.hypot(kx, kz) || 1;
          kx /= kl; kz /= kl;
          const lug = (a.kind === 'luggage' || a.caseBody) ? 2.4 : 1;
          applyImpulse(a.body, kx * imp * lug, kz * imp * lug);
          if (a.caseBody) applyImpulse(a.caseBody, kx * imp * 1.9, kz * imp * 1.9);
          applyStatus(a, 'daze', ctx.time + disableDur(0.35, !!a.boss), ctx.emit);
          if (a.kind === 'stench') {
            const dur = mods.cleansingFlame ? Sp.cleanseAura : Sp.cleanseAura * 0.25;
            applyStatus(a, 'auraOff', ctx.time + dur, ctx.emit);
          }
          if (mods.tooHotToHold && a.kind === 'couple') {
            applyStatus(a, 'linkOff', ctx.time + Sp.hotHold, ctx.emit);
          }
          drainBoss(a, a.kind === 'stench' || a.kind === 'luggage' ? [a.kind] : undefined, mods);
        }
        if (mods.thunderStep) ctx.player.phaseUntil = ctx.time + Sp.thunderStep;
        return true;
      },
    };
  }

  if (node.id === 'fire_t3b') {
    const T = Sp.flameBurst;
    return {
      id: node.id,
      resource: 'mana',
      cost: T.mana,
      cd: T.cd * cdr,
      counters: ['luggage', 'couple'],
      cast(ctx) {
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx: 0, dz: 0, el: 'fire' });
        for (const a of hitAgents(ctx.crowd, px, pz, T.radius)) {
          const lug = a.kind === 'luggage' || !!a.caseBody ? T.luggageMul : 1;
          radialImpulse(a.body, px, pz, T.impulse * power, lug);
          if (a.caseBody) radialImpulse(a.caseBody, px, pz, T.impulse * power, T.luggageMul);
          if (mods.cleansingFlame && a.kind === 'stench') {
            applyStatus(a, 'auraOff', ctx.time + Sp.cleanseAura, ctx.emit);
          }
          if (mods.tooHotToHold && a.kind === 'couple') {
            applyStatus(a, 'linkOff', ctx.time + Sp.hotHold, ctx.emit);
          }
          drainBoss(a, a.kind === 'couple' ? ['couple'] : ['luggage'], mods);
          if (a.kind === 'couple' && a.boss) a.boss.stub = Math.max(0, a.boss.stub - 0.28 * (mods.spellPower || 1));
        }
        const hitLug = ctx.crowd.agents.some(
          (a) => (a.kind === 'luggage' || a.caseBody) && Math.hypot(a.body.x - px, a.body.z - pz) <= T.radius,
        );
        ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + (hitLug ? 1.45 : 0.85));
        if (mods.thunderStep) ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + Sp.thunderStep);
        return true;
      },
    };
  }

  if (node.id === 'ice_t1') {
    const T = Sp.frostBreath;
    const cosMin = Math.cos((T.halfAngleDeg * Math.PI) / 180);
    return {
      id: node.id,
      resource: 'mana',
      cost: T.mana,
      cd: T.cd * cdr,
      cast(ctx) {
        const { dx, dz } = aimDir(ctx);
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx, dz, el: 'ice' });
        for (const a of ctx.crowd.agents) {
          const vx = a.body.x - px;
          const vz = a.body.z - pz;
          const d = Math.hypot(vx, vz);
          if (d > T.range || d < 1e-4) continue;
          const dot = (vx * dx + vz * dz) / d;
          if (dot < cosMin) continue;
          const dur = disableDur(T.chill, isBossAgent(a));
          applyStatus(a, 'chill', ctx.time + dur, ctx.emit);
          radialImpulse(a.body, px, pz, 1.35 * power, 1);
          if (mods.chillOut && a.kind === 'angry') {
            a.windup = -1;
            a.chillWindupUntil = ctx.time + Sp.chillOutWindup;
          }
          if (a.kind === 'angry' && a.boss) {
            a.boss.stub = Math.max(0, a.boss.stub - 0.12 * (mods.spellPower || 1));
          }
          drainBoss(a, a.kind === 'squat' || a.kind === 'angry' ? [a.kind] : undefined, mods);
        }
        ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + 0.7);
        if (mods.thunderStep) ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + Sp.thunderStep);
        return true;
      },
    };
  }

  if (node.id === 'ice_t3b') {
    const T = Sp.flashFreeze;
    return {
      id: node.id,
      resource: 'mana',
      cost: T.mana,
      cd: T.cd * cdr,
      counters: ['family', 'brat', 'squat', 'angry'],
      cast(ctx) {
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx: 0, dz: 0, el: 'ice' });
        const angryNear = ctx.crowd.agents.some(
          (a) => a.kind === 'angry' && a.boss && Math.hypot(a.body.x - px, a.body.z - pz) < 4.0,
        );
        const rad = angryNear ? T.radius + 0.85 : T.radius;
        for (const a of hitAgents(ctx.crowd, px, pz, rad)) {
          let dur = disableDur(T.freeze, isBossAgent(a));
          if (a.kind === 'angry') dur *= 1.15;
          if (a.kind === 'family') dur *= 1.12;
          applyStatus(a, 'freeze', ctx.time + dur, ctx.emit);
          const ghostT = a.kind === 'angry' ? 1.15 : a.kind === 'family' ? 1.2 : a.kind === 'squat' ? 0.85 : 0.9;
          a.freezeGhostUntil = Math.max(a.freezeGhostUntil, ctx.time + ghostT);
          if (a.kind === 'angry' && a.boss) {
            // Flash Freeze is the Hog King counter — heavy stub chip; finish the yield if close.
            a.boss.stub = Math.max(0, a.boss.stub - 0.28 * (mods.spellPower || 1));
          }
          const impulseMul = a.kind === 'family' ? 1.75 : a.kind === 'angry' ? 2.4 : a.kind === 'squat' ? 1.15 : 1.2;
          radialImpulse(a.body, px, pz, 3.3 * power, impulseMul);
          // Shove angry king sideways off the exit line.
          if (a.kind === 'angry') {
            const { dx: fdx, dz: fdz } = facing(ctx.player);
            sideImpulse(a.body, fdx, fdz, 1.8 * power);
          }
          if (a.caseBody) radialImpulse(a.caseBody, px, pz, 1.8 * power, 1);
          if (mods.chillOut && a.kind === 'angry') {
            a.windup = -1;
            a.chillWindupUntil = ctx.time + Sp.chillOutWindup;
          }
          drainBoss(a, ['family', 'brat', 'squat', 'angry'], mods);
        }
        // Slip through the frozen statues for a beat.
        ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + 1.15);
        if (mods.thunderStep) ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + Sp.thunderStep);
        return true;
      },
    };
  }

  if (node.id === 'volt_t1') {
    const T = Sp.zap;
    return {
      id: node.id,
      resource: 'mana',
      cost: T.mana,
      cd: T.cd * cdr,
      cast(ctx) {
        const { dx, dz } = facing(ctx.player);
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        const candidates = ctx.crowd.agents
          .map((a) => {
            const vx = a.body.x - px;
            const vz = a.body.z - pz;
            const d = Math.hypot(vx, vz);
            const along = vx * dx + vz * dz;
            const frontBias = along > 0 ? 0 : 0.6;
            return { a, d: d + frontBias, along };
          })
          .filter((c) => c.d <= T.range)
          .sort((u, v) => u.d - v.d || u.a.id - v.a.id)
          .slice(0, T.count);
        const pts = [{ x: px, z: pz }, ...candidates.map((c) => ({ x: c.a.body.x, z: c.a.body.z }))];
        ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx, dz, el: 'volt' });
        ctx.emit({ t: 'chain', pts });
        for (const { a } of candidates) {
          const dur = disableDur(T.daze, isBossAgent(a));
          applyStatus(a, 'daze', ctx.time + dur, ctx.emit);
          if (mods.droppedCall && a.kind === 'loud') {
            applyStatus(a, 'callOff', ctx.time + Sp.droppedCall, ctx.emit);
          }
          drainBoss(a, undefined, mods);
        }
        if (mods.thunderStep) ctx.player.phaseUntil = ctx.time + Sp.thunderStep;
        return true;
      },
    };
  }

  if (node.id === 'volt_t3b') {
    const T = Sp.thunderclap;
    return {
      id: node.id,
      resource: 'mana',
      cost: T.mana,
      cd: T.cd * cdr,
      counters: ['brat', 'loud'],
      cast(ctx) {
        const px = ctx.player.body.x;
        const pz = ctx.player.body.z;
        ctx.emit({ t: 'cast', ability: node.id, x: px, z: pz, dx: 0, dz: 0, el: 'volt' });
        for (const a of hitAgents(ctx.crowd, px, pz, T.radius)) {
          const brat = a.kind === 'brat' || (a.isKid && a.kind === 'family');
          const daze = brat ? T.bratDaze : T.otherDaze;
          const dur = disableDur(daze, isBossAgent(a));
          applyStatus(a, 'daze', ctx.time + dur, ctx.emit);
          radialImpulse(a.body, px, pz, (brat ? T.bratImpulse : T.bratImpulse * 0.5) * power, 1);
          if (mods.droppedCall && a.kind === 'loud') {
            applyStatus(a, 'callOff', ctx.time + Sp.droppedCall, ctx.emit);
          }
          drainBoss(a, ['brat', 'loud'], mods);
        }
        // Player-only phase — do NOT ghost the crowd (that overbuffed L60/L90).
        ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + 1.05);
        if (mods.thunderStep) ctx.player.phaseUntil = Math.max(ctx.player.phaseUntil, ctx.time + Sp.thunderStep);
        return true;
      },
    };
  }

  return null;
}

/** Cast a mage ultimate (maps to SkillState ult flags). */
export function castMageUlt(kind: 'str' | 'spd' | 'sta', ctx: AbilityCtx): boolean {
  const p = ctx.player;
  const mods = ctx.mods;
  const Sp = TUNING.spells;
  const U = TUNING.ult;
  if (kind === 'str' && mods.ultFire) {
    if (p.ultCd.str > 0) return false;
    const px = p.body.x;
    const pz = p.body.z;
    const { dx, dz } = facing(p);
    ctx.emit({ t: 'ult', kind: 'str', x: px, z: pz, dx, dz });
    ctx.emit({ t: 'cast', ability: 'ultFire', x: px, z: pz, dx, dz, el: 'fire' });
    for (const a of hitAgents(ctx.crowd, px, pz, U.str.radius)) {
      radialImpulse(a.body, px, pz, U.str.impulse, 1);
    }
    p.chargeUntil = ctx.time + U.str.duration;
    p.ultCd.str = U.cooldown;
    if (mods.thunderStep) p.phaseUntil = ctx.time + Sp.thunderStep;
    return true;
  }
  if (kind === 'sta' && mods.ultIce) {
    if (p.ultCd.sta > 0) return false;
    const px = p.body.x;
    const pz = p.body.z;
    ctx.emit({ t: 'ult', kind: 'sta', x: px, z: pz, dx: 0, dz: -1 });
    ctx.emit({ t: 'cast', ability: 'ultIce', x: px, z: pz, dx: 0, dz: -1, el: 'ice' });
    for (const a of hitAgents(ctx.crowd, px, pz, Sp.iceAge.radius)) {
      const dur = disableDur(Sp.iceAge.freeze, isBossAgent(a));
      applyStatus(a, 'freeze', ctx.time + dur, ctx.emit);
    }
    p.ironUntil = ctx.time + Sp.iceAge.regenDur;
    p.manaRegenBurstUntil = ctx.time + Sp.iceAge.regenDur;
    p.manaRegenBurstMul = Sp.iceAge.regenMul;
    p.ultCd.sta = U.cooldown;
    if (mods.thunderStep) p.phaseUntil = ctx.time + Sp.thunderStep;
    return true;
  }
  if (kind === 'spd' && mods.ultVolt) {
    if (p.ultCd.spd > 0) return false;
    const { dx, dz } = facing(p);
    // Prefer toward door (−X).
    const doorDx = -1;
    const doorDz = 0;
    let bx = doorDx * 0.7 + dx * 0.3;
    let bz = doorDz * 0.7 + dz * 0.3;
    const bl = Math.hypot(bx, bz) || 1;
    bx /= bl;
    bz /= bl;
    const range = Sp.thunderBlink.range;
    const px = p.body.x + bx * range;
    const pz = p.body.z + bz * range;
    // Simple blink: move if free-ish.
    p.body.x = px;
    p.body.z = pz;
    p.body.vx = bx * 2;
    p.body.vz = bz * 2;
    ctx.emit({ t: 'ult', kind: 'spd', x: p.body.x, z: p.body.z, dx: bx, dz: bz });
    ctx.emit({ t: 'cast', ability: 'ultVolt', x: p.body.x, z: p.body.z, dx: bx, dz: bz, el: 'volt' });
    p.dashUntil = ctx.time + Sp.thunderBlink.speedDur;
    p.blinkSpeedMul = Sp.thunderBlink.speedMul;
    p.ultCd.spd = U.cooldown;
    if (mods.thunderStep) p.phaseUntil = ctx.time + Sp.thunderStep;
    return true;
  }
  return false;
}
