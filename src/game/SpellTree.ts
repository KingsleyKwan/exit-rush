/**
 * Mage 「凱婷」 spellbook. Not the hero constellation.
 * Three lines leave the centre. Ice is at 10 o'clock, wind at 2, gravity at 6.
 * A mix sits between the two schools it needs. Farther from the centre is the stronger rank.
 * Wind w1–w4, ice i1–i4, gravity g1–g4. A new book can learn only i1, w1, and g1.
 * A line is a requirement. iw2 needs i2, w2, and iw1. iw3 needs i3, w3, and iw2.
 * iw4 needs iw3, not i4 or w4. Same shape for ig and wg.
 * Two last ranks (rank 4) lock each other when they share wind, ice, or gravity.
 * That lock is not written on the book. Ten points cannot buy two of those endings.
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
    'A soft blow in front of her. People move aside.',
    '身前輕輕吹開人。'),
  node('w2', 'w', 2, ['w1'], 'Tailwind', '順風',
    'A stronger blow than Breeze. She walks a little lighter.',
    '比微風更勁。佢行路輕少少。'),
  node('w3', 'w', 3, ['w2'], 'Strong Wind', '勁風',
    'Stronger and wider than Tailwind.',
    '比順風更勁、更闊。'),
  node('w4', 'w', 4, ['w3'], 'Gale', '狂風',
    'The strongest, widest blow on this line.',
    '呢條風線最勁、最闊。'),

  node('i1', 'i', 1, [], 'Cool Air', '涼氣',
    'A cool patch. People ease off the door and still walk. She does not get winded as fast.',
    '一片涼。人冇咁想擠住門口，仲行到。佢自己冇咁易喘。'),
  node('i2', 'i', 2, ['i1'], 'Cold Air', '冷氣',
    'Colder than Cool Air. The smell bothers her less.',
    '比涼氣更凍。臭味冇咁入。'),
  node('i3', 'i', 3, ['i2'], 'Hard Cold', '寒氣',
    'Colder and wider than Cold Air.',
    '比冷氣更寒、更闊。'),
  node('i4', 'i', 4, ['i3'], 'Bitter Cold', '極凍',
    'The coldest, widest patch on this line. People still walk.',
    '呢條冰線最凍、最闊。人仲行到。'),

  node('g1', 'g', 1, [], 'Heavy Feet', '腳重',
    'She feels heavier, so a shove moves her less.',
    '佢自己重咗，人推佢冇咁郁。'),
  node('g2', 'g', 2, ['g1'], 'Heavy Body', '身重',
    'Heavier than Heavy Feet. A squatter\'s feet do not drag her.',
    '比腳重更重。踎低客嘅腳步拖唔住佢。'),
  node('g3', 'g', 3, ['g2'], 'Dug In', '企實',
    'Heavier than Heavy Body. A shove moves her even less.',
    '比身重更重。人推佢更難郁到。'),
  node('g4', 'g', 4, ['g3'], 'Weighed Down', '壓實',
    'The heaviest she gets on this line.',
    '呢條線佢自己最重。'),

  node('iw1', 'iw', 1, ['i1', 'w1'], 'Cool Breeze', '涼風',
    'Ice array on the floor. People in the zone leave, so she can walk through.',
    '地下結冰陣。範圍入面嘅人會走開，佢就行得入去。'),
  node('iw2', 'iw', 2, ['i2', 'w2', 'iw1'], 'Cold Wind', '冷風',
    'Wider ice array. People in the zone leave farther.',
    '冰陣更闊。範圍入面嘅人走得更開。'),
  node('iw3', 'iw', 3, ['i3', 'w3', 'iw2'], 'Hard Wind', '寒風',
    'Colder, wider ice array. People leave the zone; she walks through.',
    '更寒、更闊嘅冰陣。人會走開，佢行得入去。'),
  node('iw4', 'iw', 4, ['iw3'], 'Bitter Wind', '極寒風',
    'The coldest ice array on this line. People leave the zone.',
    '呢條線最凍嘅冰陣。範圍入面嘅人會走開。'),

  node('ig1', 'ig', 1, ['i1', 'g1'], 'Slow Cold', '慢凍',
    'People in the patch walk slower. They still walk.',
    '呢度嘅人行慢咗，但係仲行到。'),
  node('ig2', 'ig', 2, ['i2', 'g2', 'ig1'], 'Slower Cold', '再慢',
    'Slower than Slow Cold, and the patch is wider.',
    '比慢凍更慢，範圍更闊。'),
  node('ig3', 'ig', 3, ['i3', 'g3', 'ig2'], 'Hard Slow', '寒慢',
    'Slower and wider than Slower Cold.',
    '比再慢更慢、更闊。'),
  node('ig4', 'ig', 4, ['ig3'], 'Deep Slow', '極慢',
    'The slowest patch on this line. They still walk.',
    '呢條線最慢。人仲行到。'),

  node('wg1', 'wg', 1, ['w1', 'g1'], 'Heavy Wind', '重風',
    'A thin gust. It pushes people out harder than Breeze.',
    '一條窄風，比微風推得更開。'),
  node('wg2', 'wg', 2, ['w2', 'g2', 'wg1'], 'Pressing Wind', '壓風',
    'A harder thin push than Heavy Wind.',
    '比重風更勁，都係窄。'),
  node('wg3', 'wg', 3, ['w3', 'g3', 'wg2'], 'Hard Push', '勁壓',
    'Harder than Pressing Wind. Still thinner than Strong Wind.',
    '比壓風更勁，範圍仍然窄過勁風。'),
  node('wg4', 'wg', 4, ['wg3'], 'Crushing Push', '極壓',
    'The hardest thin push on this line.',
    '呢條線最勁嘅窄風。'),
];

/** Rank-4 names kept for the tree record. The HUD casts them on the same line button. */
export const SPELL_ULT_DEFS: Record<
  Branch,
  { nameEn: string; nameZh: string; tipEn: string; tipZh: string; element: SpellSchool }
> = {
  str: {
    nameEn: 'Gale', nameZh: '狂風',
    tipEn: 'The strongest, widest blow on this line.',
    tipZh: '呢條風線最勁、最闊。',
    element: 'wind',
  },
  sta: {
    nameEn: 'Bitter Cold', nameZh: '極凍',
    tipEn: 'The coldest, widest patch on this line. People still walk.',
    tipZh: '呢條冰線最凍、最闊。人仲行到。',
    element: 'ice',
  },
  spd: {
    nameEn: 'Weighed Down', nameZh: '壓實',
    tipEn: 'The heaviest she gets on this line.',
    tipZh: '呢條線佢自己最重。',
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
