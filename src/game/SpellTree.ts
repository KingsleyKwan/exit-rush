/**
 * Mage 「凱婷」 spellbook. Not the hero constellation.
 * Three chains — wind, ice, gravity — read bottom to top.
 * A skill needs the one below it. Only one of the three last skills can be learned.
 * Schools mix: wind blows; wind + ice sends people another way; ice + gravity holds them still.
 * SkillState.known is the book. str/spd/sta stay the hero's power fields and are not read here.
 */
import type { SkillModifiers } from './SkillTree';
import type { Branch } from './SkillTree';
import type { SkillState } from './storage';
import { TUNING } from './sim/tuning';

export type SpellSchool = 'wind' | 'ice' | 'grav';
/** Old name. The book is wind / ice / gravity, not fire / lightning. */
export type SpellBranch = SpellSchool;

export interface SpellNodeDef {
  id: string;
  school: SpellSchool;
  /** Skill that must already be learned. Starts have none. */
  requires?: string;
  /** Last skill of a chain. Only one capstone may be known. */
  capstone?: boolean;
  kind: 'passive' | 'active';
  nameEn: string;
  nameZh: string;
  tipEn: string;
  tipZh: string;
  /** Shown on the node. Casts read TUNING.weather. */
  mana?: number;
  cd?: number;
}

export const SPELL_SCHOOLS: readonly SpellSchool[] = ['wind', 'ice', 'grav'];

export const SPELL_NODES: SpellNodeDef[] = [
  {
    id: 'wind_1', school: 'wind', kind: 'active', mana: 18, cd: 3.4,
    nameEn: 'Breeze', nameZh: '微風',
    tipEn: 'Blows people aside. Not a hit. With ice, they feel cold and take another way.',
    tipZh: '吹開身邊嘅人，唔係打。加冰就覺得凍，想行第二條路。',
  },
  {
    id: 'wind_2', school: 'wind', requires: 'wind_1', kind: 'passive',
    nameEn: 'Tailwind', nameZh: '順風',
    tipEn: 'She walks a little lighter.',
    tipZh: '行路輕少少。',
  },
  {
    id: 'wind_3', school: 'wind', requires: 'wind_2', kind: 'passive',
    nameEn: 'Crosswind', nameZh: '橫風',
    tipEn: 'The breeze is wider, and people keep drifting.',
    tipZh: '風闊啲，人會繼續飄開。',
  },
  {
    id: 'wind_4', school: 'wind', requires: 'wind_3', capstone: true, kind: 'active',
    nameEn: 'Headwind', nameZh: '逆風',
    tipEn: 'A headwind down the aisle. Nobody wants to stand in the door. Only one last skill.',
    tipZh: '成條通道都係逆風，冇人想企喺門口。最後嗰招只可以揀一條路。',
  },
  {
    id: 'ice_1', school: 'ice', kind: 'passive',
    nameEn: 'Cool Air', nameZh: '涼氣',
    tipEn: 'She does not get winded as fast.',
    tipZh: '佢自己冇咁易喘。',
  },
  {
    id: 'ice_2', school: 'ice', requires: 'ice_1', kind: 'passive',
    nameEn: 'Cold Air', nameZh: '冷空氣',
    tipEn: 'The smell bothers her less. The car starts to feel cold.',
    tipZh: '臭味冇咁入。車廂開始凍。',
  },
  {
    id: 'ice_3', school: 'ice', requires: 'ice_2', kind: 'active', mana: 22, cd: 4.6,
    nameEn: 'Turn Aside', nameZh: '轉彎',
    tipEn: 'People feel the cold. With wind they take another way. With gravity they cannot move.',
    tipZh: '人覺得凍。加風就轉去第二條路。加重就郁唔到。',
  },
  {
    id: 'ice_4', school: 'ice', requires: 'ice_3', capstone: true, kind: 'active',
    nameEn: 'Whiteout', nameZh: '白茫茫',
    tipEn: 'The aisle goes white and cold. Only one last skill.',
    tipZh: '成條通道白茫茫咁凍。最後嗰招只可以揀一條路。',
  },
  {
    id: 'grav_1', school: 'grav', kind: 'passive',
    nameEn: 'Heavy Feet', nameZh: '腳重',
    tipEn: 'Shoves do not move her as much.',
    tipZh: '人推佢冇咁郁。',
  },
  {
    id: 'grav_2', school: 'grav', requires: 'grav_1', kind: 'passive',
    nameEn: 'Sink', nameZh: '沉落',
    tipEn: 'A squatter\'s feet do not drag her.',
    tipZh: '踎低客嘅腳步拖唔住佢。',
  },
  {
    id: 'grav_3', school: 'grav', requires: 'grav_2', kind: 'active', mana: 22, cd: 4.6,
    nameEn: 'Held Down', nameZh: '撳住',
    tipEn: 'People feel heavy and stop darting. With ice, the cold holds them still. With wind, a breeze moves them, then they stay.',
    tipZh: '人覺得重，唔再左穿右插。加冰就凍到郁唔到。加風就吹完再停低。',
  },
  {
    id: 'grav_4', school: 'grav', requires: 'grav_3', capstone: true, kind: 'active',
    nameEn: 'Still', nameZh: '定住',
    tipEn: 'The aisle goes still. Only one last skill.',
    tipZh: '成條通道靜止。最後嗰招只可以揀一條路。',
  },
];

/** Capstones occupy the existing ult slots: wind → str, ice → sta, gravity → spd. */
export const SPELL_ULT_DEFS: Record<
  Branch,
  { nameEn: string; nameZh: string; tipEn: string; tipZh: string; element: SpellSchool }
> = {
  str: {
    nameEn: 'Headwind', nameZh: '逆風',
    tipEn: 'A headwind down the aisle. Nobody wants to stand in the door.',
    tipZh: '成條通道都係逆風，冇人想企喺門口。',
    element: 'wind',
  },
  sta: {
    nameEn: 'Whiteout', nameZh: '白茫茫',
    tipEn: 'The aisle goes white and cold.',
    tipZh: '成條通道白茫茫咁凍。',
    element: 'ice',
  },
  spd: {
    nameEn: 'Still', nameZh: '定住',
    tipEn: 'The aisle goes still.',
    tipZh: '成條通道靜止。',
    element: 'grav',
  },
};

const CAPSTONES = ['wind_4', 'ice_4', 'grav_4'] as const;

export function spellById(id: string): SpellNodeDef | undefined {
  return SPELL_NODES.find((n) => n.id === id);
}

export function knows(s: SkillState, id: string): boolean {
  return !!s.known?.includes(id);
}

export function schoolKnown(s: SkillState, school: SpellSchool): boolean {
  return SPELL_NODES.some((n) => n.school === school && knows(s, n.id));
}

export function capstoneOwned(s: SkillState): string | null {
  return CAPSTONES.find((id) => knows(s, id)) ?? null;
}

/** True when this skill can be learned with the point she is holding. */
export function canLearn(s: SkillState, id: string): boolean {
  const n = spellById(id);
  if (!n || knows(s, id)) return false;
  if ((s.points ?? 0) < 1) return false;
  if ((s.known?.length ?? 0) >= 10) return false;
  if (n.requires && !knows(s, n.requires)) return false;
  if (n.capstone && capstoneOwned(s)) return false;
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
    ultStr: known.includes('wind_4'),
    ultSta: known.includes('ice_4'),
    ultSpd: known.includes('grav_4'),
  };
}

/** One active button per school, in wind / ice / gravity order. */
export function defaultSpellBar(s: SkillState): string[] {
  return (['wind_1', 'ice_3', 'grav_3'] as const).filter((id) => knows(s, id));
}

export function unlockedSpellActives(s: SkillState): SpellNodeDef[] {
  const bar = new Set(defaultSpellBar(s));
  return SPELL_NODES.filter((n) => bar.has(n.id));
}

/**
 * Trial car only. Not written to the save.
 * The three actives, so wind, cold, and weight can mix. No last skill.
 */
export function trialSpellState(): SkillState {
  const known = ['wind_1', 'wind_2', 'ice_1', 'ice_2', 'ice_3', 'grav_1', 'grav_2', 'grav_3'];
  return {
    str: 0, spd: 0, sta: 0,
    ultStr: false, ultSpd: false, ultSta: false,
    points: 0,
    known,
  };
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

/** Passives from the book. Does not read str/spd/sta. */
export function modifiersFromSpells(s: SkillState): SpellModResult {
  const M = TUNING.mage;
  const W = TUNING.weather;
  const coolHead = knows(s, 'ice_1');
  const coldAir = knows(s, 'ice_2');
  const staticStep = knows(s, 'wind_2');
  const crosswind = knows(s, 'wind_3');
  const heavyFeet = knows(s, 'grav_1');
  const sink = knows(s, 'grav_2');

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
    spellPower: crosswind ? (W?.crossPower ?? 1.12) : 1,
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
    hasWind: schoolKnown(s, 'wind'),
    hasIce: schoolKnown(s, 'ice'),
    hasGrav: schoolKnown(s, 'grav'),
    crosswind,
  };
}
