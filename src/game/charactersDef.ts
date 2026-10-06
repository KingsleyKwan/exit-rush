/**
 * CharacterDef layer (v0.8) — pure data, no three.js.
 * Name avoids clashing with render-side `characters.ts`.
 * See docs/CHARACTERS.md.
 */
import { SKILL_NODES, ULT_DEFS, modifiersFromSkills, type Branch, type SkillModifiers, type SkillNodeDef } from './SkillTree';
import { SPELL_NODES, SPELL_ULT_DEFS, modifiersFromSpells, type SpellBranch } from './SpellTree';
import type { SaveData, SkillState } from './storage';
import { TUNING } from './sim/tuning';
import { resolveKit, type ActiveKit } from './techKit';

export type CharacterId = 'hero' | 'mage' | 'tech';
export type ProgressionKind = 'tree' | 'shop';
export type SkinId = 'hero' | 'mage' | 'tech';

export interface BaseStats {
  mass: number;
  pushMul: number;
  speedMul: number;
  staminaMax: number;
  staminaRegen: number;
  manaMax?: number;
  manaRegen?: number;
}

export interface TreeDef {
  kind: 'tree';
  /** Branch ids used by spend UI (hero: str/spd/sta · mage: fire/ice/volt mapped onto SkillState). */
  branches: Branch[];
  colours: Record<Branch, string>;
  nodes: SkillNodeDef[];
  ults: typeof ULT_DEFS;
  /** i18n key prefix for branch labels. */
  labelKey: 'hero' | 'mage';
}

export interface CharacterDef {
  id: CharacterId;
  nameEn: string;
  nameZh: string;
  pitchEn: string;
  pitchZh: string;
  skin: SkinId;
  base: BaseStats;
  progression: TreeDef | { kind: 'shop' };
  entitlement?: 'mage' | 'tech';
  hud: { resource2?: 'mana'; maxActives: 3 };
  /** Playstyle icons for the select card. */
  styleIcons: [string, string, string];
}

/** Hero tree — existing SKILL_NODES / ULT_DEFS without changing ids. */
export const HERO_TREE: TreeDef = {
  kind: 'tree',
  branches: ['str', 'spd', 'sta'],
  colours: { str: '#e57373', spd: '#64b5f6', sta: '#81c784' },
  nodes: SKILL_NODES,
  ults: ULT_DEFS,
  labelKey: 'hero',
};

/** Mage spellbook — fire→str, volt→spd, ice→sta on the shared SkillState shape. */
export const SPELL_TREE: TreeDef = {
  kind: 'tree',
  branches: ['str', 'spd', 'sta'],
  colours: { str: '#ff7043', spd: '#ffd54f', sta: '#4dd0e1' },
  nodes: SPELL_NODES as unknown as SkillNodeDef[],
  ults: SPELL_ULT_DEFS as unknown as typeof ULT_DEFS,
  labelKey: 'mage',
};

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  hero: {
    id: 'hero',
    nameEn: 'Office Worker',
    nameZh: '上班族',
    pitchEn: 'Push through!',
    pitchZh: '推出去！',
    skin: 'hero',
    base: {
      mass: 1.3,
      pushMul: 1.0,
      speedMul: 1.0,
      staminaMax: 100,
      staminaRegen: 12,
    },
    progression: HERO_TREE,
    hud: { maxActives: 3 },
    styleIcons: ['str', 'spd', 'sta'],
  },
  mage: {
    id: 'mage',
    nameEn: 'Bad Girl',
    nameZh: '凱婷',
    pitchEn: 'Cast your way out!',
    pitchZh: '用魔法開路！',
    skin: 'mage',
    base: {
      mass: TUNING.mage?.baseMass ?? 1.1,
      pushMul: TUNING.mage?.pushMul ?? 0.85,
      speedMul: TUNING.mage?.speedMul ?? 1.05,
      staminaMax: TUNING.mage?.staminaMax ?? 90,
      staminaRegen: TUNING.mage?.staminaRegen ?? 12,
      manaMax: TUNING.mage?.manaMax ?? 100,
      manaRegen: TUNING.mage?.manaRegen ?? 8,
    },
    progression: SPELL_TREE,
    entitlement: 'mage',
    hud: { resource2: 'mana', maxActives: 3 },
    styleIcons: ['fire', 'ice', 'volt'],
  },
  tech: {
    id: 'tech',
    nameEn: 'Gear L',
    nameZh: '裝備L',
    pitchEn: 'Buy gear, pack a kit!',
    pitchZh: '買裝備，砌套裝！',
    skin: 'tech',
    base: {
      mass: 1.4,
      pushMul: 1.0,
      speedMul: 0.95,
      staminaMax: 90,
      staminaRegen: 11,
    },
    progression: { kind: 'shop' },
    entitlement: 'tech',
    hud: { maxActives: 3 },
    styleIcons: ['shop', 'bag', 'star'],
  },
};

export const CHARACTER_ORDER: CharacterId[] = ['hero', 'mage', 'tech'];

/** PlayerMods = SkillModifiers + character base + mage extras. Hero path must stay bit-identical on skill fields. */
export interface PlayerMods extends SkillModifiers {
  characterId: CharacterId;
  mass0: number;
  pushMul: number;
  speedMul: number;
  manaMax: number;
  manaRegen: number;
  spellPower: number;
  cdr: number;
  /** Unlocked spell actives on the bar (mage). */
  spellBar: string[];
  /** Mage passive flags beyond SkillModifiers. */
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
  ultFire: boolean;
  ultIce: boolean;
  ultVolt: boolean;
  /** Gear L. Absent on hero/mage — hero skill fields stay bit-identical. */
  techLeapCd?: number;
  techUltCd?: number;
  /** Loudmouth drain fraction removed (0–1) when not full Unbothered. */
  techLoudCut?: number;
  /** Angry shove impulse that still lands (1 = full). */
  techAngryRemain?: number;
  techHurdlePace?: number;
  techPassBossCase?: boolean;
  techGpRadius?: number;
  techGpLuggage?: number;
  techActives?: string[];
  techCore?: 'str' | 'spd' | 'sta' | null;
  techConsumables?: string[];
  techTier?: Record<string, 1 | 2 | 3>;
}

function emptyMageFlags(): Pick<
  PlayerMods,
  | 'hotBlood' | 'burningUrgency' | 'cleansingFlame' | 'tooHotToHold'
  | 'coolHead' | 'frostShield' | 'chillOut' | 'iceGlide'
  | 'staticStep' | 'conductor' | 'droppedCall' | 'thunderStep'
  | 'ultFire' | 'ultIce' | 'ultVolt'
> {
  return {
    hotBlood: false,
    burningUrgency: false,
    cleansingFlame: false,
    tooHotToHold: false,
    coolHead: false,
    frostShield: false,
    chillOut: false,
    iceGlide: false,
    staticStep: false,
    conductor: false,
    droppedCall: false,
    thunderStep: false,
    ultFire: false,
    ultIce: false,
    ultVolt: false,
  };
}

/** Active skill/spell state for the selected character. */
export function activeTreeState(save: SaveData): SkillState {
  if (save.character === 'mage') {
    const slot = save.mage.loadouts[save.mage.active] ?? save.mage.loadouts[0];
    return slot;
  }
  return save.skills;
}

/**
 * Pure mods for a character + tree state.
 * Hero: bit-identical SkillModifiers to modifiersFromSkills(), then base mass/push/speed from hero.
 */
export function modsFor(char: CharacterDef, skills: SkillState, spellBar?: string[], kit?: ActiveKit | null): PlayerMods {
  if (char.id === 'hero') {
    const sm = modifiersFromSkills(skills);
    return {
      ...sm,
      characterId: 'hero',
      mass0: char.base.mass,
      pushMul: char.base.pushMul,
      speedMul: char.base.speedMul,
      manaMax: 0,
      manaRegen: 0,
      spellPower: 1,
      cdr: 1,
      spellBar: [],
      ...emptyMageFlags(),
    };
  }
  if (char.id === 'mage') {
    const sm = modifiersFromSpells(skills);
    const bar = (spellBar ?? []).filter(Boolean).slice(0, 3);
    return {
      ...sm.skillMods,
      characterId: 'mage',
      mass0: char.base.mass,
      pushMul: char.base.pushMul * (sm.hotBlood ? 1.1 : 1),
      speedMul: char.base.speedMul * (sm.staticStep ? 1.1 : 1),
      manaMax: (char.base.manaMax ?? 100) + sm.manaMaxBonus,
      manaRegen: (char.base.manaRegen ?? 8) + sm.manaRegenBonus,
      spellPower: sm.spellPower,
      cdr: sm.cdr,
      spellBar: bar,
      hotBlood: sm.hotBlood,
      burningUrgency: sm.burningUrgency,
      cleansingFlame: sm.cleansingFlame,
      tooHotToHold: sm.tooHotToHold,
      coolHead: sm.coolHead,
      frostShield: sm.frostShield,
      chillOut: sm.chillOut,
      iceGlide: sm.iceGlide,
      staticStep: sm.staticStep,
      conductor: sm.conductor,
      droppedCall: sm.droppedCall,
      thunderStep: sm.thunderStep,
      ultFire: skills.ultStr,
      ultIce: skills.ultSta,
      ultVolt: skills.ultSpd,
    };
  }
  const resolved = kit ?? resolveKit({
    items: {},
    gridTier: 0,
    sets: [{ placements: [] }, { placements: [] }, { placements: [] }],
    activeSet: 0,
    stock: {},
  });
  const bar = resolved.actives.filter((id) => id !== 'S2');
  return {
    ...resolved.mods,
    characterId: 'tech',
    mass0: resolved.extras.mass0 ?? char.base.mass,
    pushMul: char.base.pushMul,
    speedMul: char.base.speedMul,
    manaMax: 0,
    manaRegen: 0,
    spellPower: 1,
    cdr: 1,
    ...emptyMageFlags(),
    ...resolved.extras,
    spellBar: bar,
  };
}

function defaultEmptySkills(): SkillState {
  return { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 };
}

export function characterOf(id: CharacterId | undefined | null): CharacterDef {
  return CHARACTERS[id && id in CHARACTERS ? id : 'hero'];
}

/** Map mage element branch → SkillState branch field. */
export function spellBranchToSkill(b: SpellBranch): Branch {
  if (b === 'fire') return 'str';
  if (b === 'volt') return 'spd';
  return 'sta';
}

export function skillBranchToSpell(b: Branch): SpellBranch {
  if (b === 'str') return 'fire';
  if (b === 'spd') return 'volt';
  return 'ice';
}
