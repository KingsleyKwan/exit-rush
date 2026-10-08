/**
 * Mage 「凱婷」 spellbook. Not the hero constellation.
 * Six rays on a wheel. The centre is the start. Ice is at 10 o'clock, wind at 2, gravity at 6.
 * A mix sits between the two schools it needs. Farther from the centre is the stronger rank.
 * Wind w1–w4, ice i1–i4, gravity g1–g4.
 * A mix starts only when both pure starts are already learned: iw1 needs i1 and w1,
 * ig1 needs i1 and g1, wg1 needs w1 and g1. The next mix rank needs only the mix rank before it.
 * Two last ranks (rank 4) lock each other when they share wind, ice, or gravity.
 * i4 and g4 can both be learned. i4 blocks ig4 and iw4. ig4 blocks i4 and g4, and not w4.
 * SkillState.known is the book. str/spd/sta stay the hero's power fields and are not read here.
 */
import type { SkillModifiers } from './SkillTree';
import type { Branch } from './SkillTree';
import type { SkillState } from './storage';
import { TUNING } from './sim/tuning';

export type SpellLine = 'w' | 'i' | 'g' | 'iw' | 'ig' | 'wg';
export type SpellElement = 'w' | 'i' | 'g';
/** Colour bucket for icons. Not a separate tree. */
export type SpellSchool = 'wind' | 'ice' | 'grav';
/** Old name. The book is wind / ice / gravity, not fire / lightning. */
export type SpellBranch = SpellSchool;

export interface SpellNodeDef {
  id: string;
  line: SpellLine;
  rank: 1 | 2 | 3 | 4;
  /** Every one of these must already be learned. */
  requires: readonly string[];
  kind: 'active';
  nameEn: string;
  nameZh: string;
  tipEn: string;
  tipZh: string;
}

export const SPELL_LINES: readonly SpellLine[] = ['w', 'i', 'g', 'iw', 'ig', 'wg'];
export const PURE_LINES: readonly SpellLine[] = ['w', 'i', 'g'];
export const MIX_LINES: readonly SpellLine[] = ['iw', 'ig', 'wg'];
/** One button per learned line. */
export const MAGE_BAR_CAP = 6;

const LINE_EL: Record<SpellLine, readonly SpellElement[]> = {
  w: ['w'],
  i: ['i'],
  g: ['g'],
  iw: ['i', 'w'],
  ig: ['i', 'g'],
  wg: ['w', 'g'],
};

function node(
  id: string,
  line: SpellLine,
  rank: 1 | 2 | 3 | 4,
  requires: readonly string[],
  nameEn: string,
  nameZh: string,
  tipEn: string,
  tipZh: string,
): SpellNodeDef {
  return { id, line, rank, requires, kind: 'active', nameEn, nameZh, tipEn, tipZh };
}

export const SPELL_NODES: SpellNodeDef[] = [
  node('w1', 'w', 1, [], 'Breeze', '微風',
    'A soft blow. People move aside. Not a hit.',
    '輕輕吹開身邊嘅人，唔係打。'),
  node('w2', 'w', 2, ['w1'], 'Tailwind', '順風',
    'The same blow, stronger. She walks a little lighter.',
    '同一陣風，勁啲。佢行路輕少少。'),
  node('w3', 'w', 3, ['w2'], 'Strong Wind', '勁風',
    'Stronger and wider than Tailwind. Still only a blow.',
    '比順風更勁、更闊。都係吹，唔係打。'),
  node('w4', 'w', 4, ['w3'], 'Gale', '狂風',
    'The strongest wind on this line. A last skill that shares wind cannot also be learned.',
    '呢條風線最勁。最後一級如果同屬風，就唔可以再學。'),

  node('i1', 'i', 1, [], 'Cool Air', '涼氣',
    'People feel cool and ease off the door. She does not get winded as fast. Not a hit. They can still move.',
    '人覺得涼，冇咁想擠住門口。佢自己冇咁易喘。唔係打，人仲郁到。'),
  node('i2', 'i', 2, ['i1'], 'Cold Air', '冷氣',
    'Colder than Cool Air. The smell bothers her less.',
    '比涼氣更凍。臭味冇咁入。'),
  node('i3', 'i', 3, ['i2'], 'Hard Cold', '寒氣',
    'Harder cold than Cold Air. Still only cold.',
    '比冷氣更寒。都係凍，唔係凍到郁唔到。'),
  node('i4', 'i', 4, ['i3'], 'Bitter Cold', '極凍',
    'The coldest on this line. Still only cold. A last skill that shares ice cannot also be learned.',
    '呢條冰線最凍。都係凍。最後一級如果同屬冰，就唔可以再學。'),

  node('g1', 'g', 1, [], 'Heavy Feet', '腳重',
    'People feel heavy in the feet and stop darting. Shoves move her less. Not a hit.',
    '人覺得腳重，冇咁左穿右插。人推佢冇咁郁。唔係打。'),
  node('g2', 'g', 2, ['g1'], 'Heavy Body', '身重',
    'Heavier than Heavy Feet. A squatter\'s feet do not drag her.',
    '比腳重更重。踎低客嘅腳步拖唔住佢。'),
  node('g3', 'g', 3, ['g2'], 'Held Down', '撳住',
    'Heavier than Heavy Body. They stay down. Not ice.',
    '比身重更重。人停低。唔係冰。'),
  node('g4', 'g', 4, ['g3'], 'Weighed Down', '壓實',
    'The heaviest on this line. A last skill that shares gravity cannot also be learned.',
    '呢條重力線最重。最後一級如果同屬重力，就唔可以再學。'),

  node('iw1', 'iw', 1, ['i1', 'w1'], 'Cool Breeze', '涼風',
    'Needs Cool Air and Breeze. A blow that is also cold, so they take another way. Not a hit.',
    '要先學涼氣同微風。吹開，同時覺得凍，想行第二條路。唔係打。'),
  node('iw2', 'iw', 2, ['iw1'], 'Cold Wind', '冷風',
    'A colder, stronger Cool Breeze.',
    '比涼風更凍、更勁。'),
  node('iw3', 'iw', 3, ['iw2'], 'Hard Wind', '寒風',
    'Harder than Cold Wind. Same cold blow.',
    '比冷風更寒。都係凍風。'),
  node('iw4', 'iw', 4, ['iw3'], 'Bitter Wind', '極寒風',
    'The strongest cold wind. A last skill that shares wind or ice cannot also be learned.',
    '呢條凍風最勁。最後一級如果同屬風或者冰，就唔可以再學。'),

  node('ig1', 'ig', 1, ['i1', 'g1'], 'Cold Hold', '凍住',
    'Needs Cool Air and Heavy Feet. Cold, and they cannot move for a short while. Not a hit.',
    '要先學涼氣同腳重。覺得凍，而且會停低一陣。唔係打。'),
  node('ig2', 'ig', 2, ['ig1'], 'Colder Hold', '再凍住',
    'A longer, colder hold than Cold Hold.',
    '比凍住更凍、停得更耐。'),
  node('ig3', 'ig', 3, ['ig2'], 'Still Cold', '凍到企定',
    'Longer than Colder Hold. They stand still.',
    '比再凍住停得更耐。人企定。'),
  node('ig4', 'ig', 4, ['ig3'], 'Cannot Move', '凍到郁唔到',
    'The longest cold hold. They cannot move. A last skill that shares ice or gravity cannot also be learned.',
    '呢條線最耐。凍到郁唔到。最後一級如果同屬冰或者重力，就唔可以再學。'),

  node('wg1', 'wg', 1, ['w1', 'g1'], 'Heavy Wind', '重風',
    'Needs Breeze and Heavy Feet. A blow, then they feel heavy and stay. They do not run off. Not a hit.',
    '要先學微風同腳重。吹完覺得重，停低。唔會走去第二邊。唔係打。'),
  node('wg2', 'wg', 2, ['wg1'], 'Pressing Wind', '壓風',
    'A heavier, stronger Heavy Wind.',
    '比重風更重、更勁。'),
  node('wg3', 'wg', 3, ['wg2'], 'Blow and Stop', '吹完停',
    'Stronger than Pressing Wind. The blow ends, then they stop.',
    '比壓風更勁。吹完再停。'),
  node('wg4', 'wg', 4, ['wg3'], 'Blown Still', '吹到企定',
    'The strongest heavy wind. A last skill that shares wind or gravity cannot also be learned.',
    '呢條重風最勁。最後一級如果同屬風或者重力，就唔可以再學。'),
];

/** Rank-4 names kept for the tree record. The HUD casts them on the same line button. */
export const SPELL_ULT_DEFS: Record<
  Branch,
  { nameEn: string; nameZh: string; tipEn: string; tipZh: string; element: SpellSchool }
> = {
  str: {
    nameEn: 'Gale', nameZh: '狂風',
    tipEn: 'The strongest wind. Same blow, not a second button.',
    tipZh: '最勁嗰陣風。同一下吹，唔係另一粒掣。',
    element: 'wind',
  },
  sta: {
    nameEn: 'Bitter Cold', nameZh: '極凍',
    tipEn: 'The coldest air. Same cold, not a second button.',
    tipZh: '最凍嗰陣氣。同一種凍，唔係另一粒掣。',
    element: 'ice',
  },
  spd: {
    nameEn: 'Weighed Down', nameZh: '壓實',
    tipEn: 'The heaviest weight. Same weight, not a second button.',
    tipZh: '最重嗰下。同一種重，唔係另一粒掣。',
    element: 'grav',
  },
};

const BY_ID = new Map(SPELL_NODES.map((n) => [n.id, n]));

export function spellById(id: string): SpellNodeDef | undefined {
  return BY_ID.get(id);
}

export function knows(s: SkillState, id: string): boolean {
  return !!s.known?.includes(id);
}

export function lineElements(line: SpellLine): readonly SpellElement[] {
  return LINE_EL[line];
}

export function sharesElement(a: SpellLine, b: SpellLine): boolean {
  const ea = LINE_EL[a];
  return LINE_EL[b].some((e) => ea.includes(e));
}

export function bestOnLine(s: SkillState, line: SpellLine): SpellNodeDef | undefined {
  let best: SpellNodeDef | undefined;
  for (const n of SPELL_NODES) {
    if (n.line !== line || !knows(s, n.id)) continue;
    if (!best || n.rank > best.rank) best = n;
  }
  return best;
}

export function lineRank(s: SkillState, line: SpellLine): number {
  return bestOnLine(s, line)?.rank ?? 0;
}

/** True when this rank-4 shares an element with a rank-4 she already has. */
export function rank4Blocked(s: SkillState, id: string): boolean {
  const n = spellById(id);
  if (!n || n.rank !== 4) return false;
  for (const k of s.known ?? []) {
    const o = spellById(k);
    if (o && o.rank === 4 && sharesElement(n.line, o.line)) return true;
  }
  return false;
}

/** True when this skill can be learned with the point she is holding. */
export function canLearn(s: SkillState, id: string): boolean {
  const n = spellById(id);
  if (!n || knows(s, id)) return false;
  if ((s.points ?? 0) < 1) return false;
  if ((s.known?.length ?? 0) >= 10) return false;
  if (n.requires.some((req) => !knows(s, req))) return false;
  if (rank4Blocked(s, id)) return false;
  return true;
}

/** Spend 1 point on a spell. Returns null if it cannot be learned. Does not touch hero power. */
export function learnSpell(s: SkillState, id: string): SkillState | null {
  if (!canLearn(s, id)) return null;
  const known = [...(s.known ?? []), id];
  return {
    ...s,
    str: 0,
    spd: 0,
    sta: 0,
    known,
    points: Math.max(0, s.points - 1),
    ultStr: false,
    ultSta: false,
    ultSpd: false,
  };
}

/** Highest rank of each learned line, in line order. One button casts that rank. */
export function defaultSpellBar(s: SkillState): string[] {
  const out: string[] = [];
  for (const line of SPELL_LINES) {
    const best = bestOnLine(s, line);
    if (best) out.push(best.id);
  }
  return out.slice(0, MAGE_BAR_CAP);
}

/**
 * Keep the saved line order, but each button casts the best rank she knows on that line.
 * An empty save falls back to the default bar.
 */
export function resolveSpellBar(s: SkillState, saved?: readonly string[] | null): string[] {
  const source = saved && saved.length ? saved : defaultSpellBar(s);
  const seen = new Set<SpellLine>();
  const out: string[] = [];
  for (const raw of source) {
    const n = spellById(raw);
    if (!n || seen.has(n.line)) continue;
    const best = bestOnLine(s, n.line);
    if (!best) continue;
    seen.add(n.line);
    out.push(best.id);
    if (out.length >= MAGE_BAR_CAP) break;
  }
  return out;
}

/** After a learn: upgrade ranks already on the bar, then add a new line. */
export function barAfterLearn(s: SkillState, prev: readonly string[]): string[] {
  const out = resolveSpellBar(s, prev);
  for (const id of defaultSpellBar(s)) {
    if (out.length >= MAGE_BAR_CAP) break;
    const line = spellById(id)?.line;
    if (!line || out.some((k) => spellById(k)?.line === line)) continue;
    out.push(id);
  }
  return out;
}

export function unlockedSpellActives(s: SkillState): SpellNodeDef[] {
  const bar = new Set(defaultSpellBar(s));
  return SPELL_NODES.filter((n) => bar.has(n.id));
}

/**
 * Trial car only. Not written to the save.
 * Rank 2 of each pure line, and the first mix of each pair. No last rank.
 */
export function trialSpellState(): SkillState {
  const known = ['w1', 'w2', 'i1', 'i2', 'g1', 'g2', 'iw1', 'ig1', 'wg1'];
  return {
    str: 0, spd: 0, sta: 0,
    ultStr: false, ultSpd: false, ultSta: false,
    points: 0,
    known,
  };
}

/** Loadout chip: pure ranks, how many mix lines are started, and how many last ranks. */
export function bookMarks(known: readonly string[] | undefined): { w: number; i: number; g: number; mixes: number; caps: number } {
  const fake: SkillState = { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0, known: [...(known ?? [])] };
  const mixes = MIX_LINES.filter((line) => lineRank(fake, line) > 0).length;
  const caps = SPELL_LINES.filter((line) => lineRank(fake, line) === 4).length;
  return { w: lineRank(fake, 'w'), i: lineRank(fake, 'i'), g: lineRank(fake, 'g'), mixes, caps };
}

export interface SpellModResult {
  skillMods: SkillModifiers;
  manaMaxBonus: number;
  manaRegenBonus: number;
  spellPower: number;
  cdr: number;
  hotBlood: boolean;
  burningUrgency: boolean;
  cleansingFlame: boolean;
  tooHotToHold: boolean;
  coolHead: boolean;
  frostShield: boolean;
  chillOut: boolean;
  iceGlide: boolean;
  staticStep: boolean;
  conductor: boolean;
  droppedCall: boolean;
  thunderStep: boolean;
  hasWind: boolean;
  hasIce: boolean;
  hasGrav: boolean;
  crosswind: boolean;
}

/** Passives from the pure lines. A mix cast does not change them. Does not read str/spd/sta. */
export function modifiersFromSpells(s: SkillState): SpellModResult {
  const M = TUNING.mage;
  const W = TUNING.weather;
  const wind = lineRank(s, 'w');
  const ice = lineRank(s, 'i');
  const grav = lineRank(s, 'g');
  const coolHead = ice >= 1;
  const coldAir = ice >= 2;
  const staticStep = wind >= 2;
  const heavyFeet = grav >= 1;
  const sink = grav >= 2;

  const skillMods: SkillModifiers = {
    pushForce: 1,
    moveSpeed: 1,
    staminaMax: (M?.staminaMax ?? 90) * (coolHead ? 1.1 : 1),
    staminaRegen: M?.staminaRegen ?? 12,
    staminaBuffer: 0,
    resist: heavyFeet ? (W?.resist ?? 0.22) : 0,
    auraResist: coldAir ? (W?.aura ?? 0.45) : 0,
    gapSense: 0,
    frontPush: 0,
    chargeShoveMul: 1,
    clearSpeed: 1,
    blockedDragCut: 0,
    hasChargedShove: false,
    splitCouples: false,
    hasGroundPound: false,
    standFirm: false,
    hurdle: false,
    hasLeap: false,
    threadCouples: false,
    holdBreath: false,
    hasSecondWind: false,
    unbothered: false,
  };

  return {
    skillMods,
    manaMaxBonus: 0,
    manaRegenBonus: 0,
    spellPower: 1,
    cdr: 1,
    hotBlood: false,
    burningUrgency: false,
    cleansingFlame: false,
    tooHotToHold: false,
    coolHead,
    frostShield: false,
    chillOut: false,
    iceGlide: sink,
    staticStep,
    conductor: false,
    droppedCall: false,
    thunderStep: false,
    hasWind: wind >= 1,
    hasIce: ice >= 1,
    hasGrav: grav >= 1,
    crosswind: false,
  };
}
