/**
 * Mage 「凱婷」 Bad Girl spellbook (v0.8).
 * SkillState fields map: str=fire, spd=volt, sta=ice (shared spend/reconcile).
 * See docs/CHARACTERS.md §3.
 */
import type { PassengerKind } from './PassengerTypes';
import type { SkillModifiers, SkillNodeDef, Branch } from './SkillTree';
import { BRANCH_FILL, NODE_THRESHOLDS, nodeUnlocked } from './SkillTree';
import type { SkillState } from './storage';
import { TUNING } from './sim/tuning';

export type SpellBranch = 'fire' | 'ice' | 'volt';

export interface SpellNodeDef {
  id: string;
  branch: SpellBranch;
  skillBranch: Branch;
  tier: 1 | 2 | 3;
  at: number;
  kind: 'passive' | 'active';
  counters?: PassengerKind[];
  nameEn: string;
  nameZh: string;
  tipEn: string;
  tipZh: string;
  /** Mana cost for actives (0 = passive / ult). */
  mana?: number;
  cd?: number;
}

export const SPELL_NODES: SpellNodeDef[] = [
  // ---- 🔥 Fire (str)
  {
    id: 'fire_t1', branch: 'fire', skillBranch: 'str', tier: 1, at: 10, kind: 'active',
    nameEn: 'Fire Bolt', nameZh: '火球',
    tipEn: 'Line blast that shoves bodies sideways', tipZh: '直線火球，側推開路',
    mana: 25, cd: 3.5,
  },
  {
    id: 'fire_t2a', branch: 'fire', skillBranch: 'str', tier: 2, at: 20, kind: 'passive',
    nameEn: 'Hot Blood', nameZh: '熱血',
    tipEn: 'Push force ×1.1', tipZh: '推力 ×1.1',
  },
  {
    id: 'fire_t2b', branch: 'fire', skillBranch: 'str', tier: 2, at: 30, kind: 'passive',
    nameEn: 'Burning Urgency', nameZh: '火燒眉毛',
    tipEn: 'Last 5 s: speed ×1.1, mana regen ×2', tipZh: '最後5秒：速度×1.1、魔力回×2',
  },
  {
    id: 'fire_t3a', branch: 'fire', skillBranch: 'str', tier: 3, at: 50, kind: 'passive',
    counters: ['stench'],
    nameEn: 'Cleansing Flame', nameZh: '淨化之火',
    tipEn: 'Fire hits burn off stench aura 6 s; aura slow −30 %', tipZh: '火系擊中燒走臭氣6秒；臭氣減速−30%',
  },
  {
    id: 'fire_t3b', branch: 'fire', skillBranch: 'str', tier: 3, at: 35, kind: 'active',
    counters: ['luggage'],
    nameEn: 'Flame Burst', nameZh: '爆炎',
    tipEn: 'Radial burst; suitcases ×2.6', tipZh: '範圍爆炎，行李喼特效×2.6',
    mana: 40, cd: 8,
  },
  {
    id: 'fire_t3c', branch: 'fire', skillBranch: 'str', tier: 3, at: 60, kind: 'passive',
    counters: ['couple'],
    nameEn: 'Too Hot to Hold', nameZh: '熱到放手',
    tipEn: 'Fire hit breaks couple hand-hold 5 s', tipZh: '火系擊中拆情侶拖手5秒',
  },
  // ---- ❄️ Ice (sta)
  {
    id: 'ice_t1', branch: 'ice', skillBranch: 'sta', tier: 1, at: 10, kind: 'active',
    nameEn: 'Frost Breath', nameZh: '冰霜吐息',
    tipEn: 'Cone chill: boarders stop pushing', tipZh: '扇形冰息，上車客停推',
    mana: 25, cd: 4,
  },
  {
    id: 'ice_t2a', branch: 'ice', skillBranch: 'sta', tier: 2, at: 20, kind: 'passive',
    nameEn: 'Cool Head', nameZh: '冷靜',
    tipEn: 'Stamina ×1.1', tipZh: '體力 ×1.1',
  },
  {
    id: 'ice_t2b', branch: 'ice', skillBranch: 'sta', tier: 2, at: 30, kind: 'passive',
    nameEn: 'Frost Shield', nameZh: '冰晶護盾',
    tipEn: '+25 stamina buffer; mana max +20', tipZh: '+25體力緩衝；魔力上限+20',
  },
  {
    id: 'ice_t3a', branch: 'ice', skillBranch: 'sta', tier: 3, at: 50, kind: 'passive',
    counters: ['angry'],
    nameEn: 'Chill Out', nameZh: '冷靜一下',
    tipEn: 'Chilled angry can\'t wind up 4 s; angry shove ×0.5', tipZh: '冰凍暴躁男唔蓄力4秒；佢推你×0.5',
  },
  {
    id: 'ice_t3b', branch: 'ice', skillBranch: 'sta', tier: 3, at: 35, kind: 'active',
    counters: ['family', 'brat'],
    nameEn: 'Flash Freeze', nameZh: '急凍',
    tipEn: 'Radial freeze 2.5 s', tipZh: '範圍急凍2.5秒',
    mana: 40, cd: 9,
  },
  {
    id: 'ice_t3c', branch: 'ice', skillBranch: 'sta', tier: 3, at: 60, kind: 'passive',
    counters: ['squat'],
    nameEn: 'Ice Glide', nameZh: '冰面滑行',
    tipEn: 'Squatters shove normally; slip ×3 vs frozen', tipZh: '踎低客可正常推；對急凍身滑行×3',
  },
  // ---- ⚡ Volt (spd)
  {
    id: 'volt_t1', branch: 'volt', skillBranch: 'spd', tier: 1, at: 10, kind: 'active',
    nameEn: 'Zap', nameZh: '電一電',
    tipEn: 'Chain-daze nearest 3 bodies', tipZh: '連鎖電暈最近3人',
    mana: 20, cd: 3,
  },
  {
    id: 'volt_t2a', branch: 'volt', skillBranch: 'spd', tier: 2, at: 20, kind: 'passive',
    nameEn: 'Static Step', nameZh: '靜電步',
    tipEn: 'Speed ×1.1', tipZh: '速度 ×1.1',
  },
  {
    id: 'volt_t2b', branch: 'volt', skillBranch: 'spd', tier: 2, at: 30, kind: 'passive',
    nameEn: 'Conductor', nameZh: '導電體',
    tipEn: 'Spell CD −20 %, mana regen +3/s', tipZh: '法術冷卻−20%，魔力回+3/秒',
  },
  {
    id: 'volt_t3a', branch: 'volt', skillBranch: 'spd', tier: 3, at: 50, kind: 'passive',
    counters: ['loud'],
    nameEn: 'Dropped Call', nameZh: '斷線',
    tipEn: 'Lightning cuts loudmouth call 6 s; noise −30 %', tipZh: '雷系斷電話6秒；噪音−30%',
  },
  {
    id: 'volt_t3b', branch: 'volt', skillBranch: 'spd', tier: 3, at: 35, kind: 'active',
    counters: ['brat'],
    nameEn: 'Thunderclap', nameZh: '雷鳴',
    tipEn: 'Radial: brats knocked + dazed 3.5 s', tipZh: '範圍：百厭仔彈開並暈3.5秒',
    mana: 35, cd: 8,
  },
  {
    id: 'volt_t3c', branch: 'volt', skillBranch: 'spd', tier: 3, at: 60, kind: 'passive',
    counters: ['squat', 'family'],
    nameEn: 'Thunder Step', nameZh: '雷步',
    tipEn: '1.5 s after cast: phase past squatters + kids', tipZh: '施法後1.5秒可穿踎低客同細路',
  },
];

export const SPELL_ULT_DEFS: Record<
  Branch,
  { nameEn: string; nameZh: string; tipEn: string; tipZh: string; element: SpellBranch }
> = {
  str: {
    nameEn: 'Phoenix Blaze', nameZh: '火鳳燎原',
    tipEn: 'Shockwave + blazing charge', tipZh: '震波 + 火熱衝撞',
    element: 'fire',
  },
  spd: {
    nameEn: 'Thunder Blink', nameZh: '雷霆閃落',
    tipEn: 'Blink toward the door, then speed burst', tipZh: '閃身近門口，再加速',
    element: 'volt',
  },
  sta: {
    nameEn: 'Ice Age', nameZh: '冰河時代',
    tipEn: 'Freeze nearby + burst stamina & mana regen', tipZh: '急凍周圍 + 體力魔力爆發回',
    element: 'ice',
  },
};

function hasSpell(s: SkillState, id: string): boolean {
  const n = SPELL_NODES.find((x) => x.id === id);
  if (!n) return false;
  return s[n.skillBranch] >= n.at;
}

export function spellNodeAsSkill(n: SpellNodeDef): SkillNodeDef {
  return {
    id: n.id,
    branch: n.skillBranch,
    tier: n.tier,
    at: n.at,
    kind: n.kind,
    counters: n.counters,
    nameEn: n.nameEn,
    nameZh: n.nameZh,
    tipEn: n.tipEn,
    tipZh: n.tipZh,
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
}

/** Continuous fill at 60 pts mirrors Hero STR/STA/SPD (docs §3.3). */
export function modifiersFromSpells(s: SkillState): SpellModResult {
  const M = TUNING.mage;
  const Sp = TUNING.spells;
  const fireT = Math.min(1, s.str / BRANCH_FILL);
  const voltT = Math.min(1, s.spd / BRANCH_FILL);
  const iceT = Math.min(1, s.sta / BRANCH_FILL);

  const hotBlood = hasSpell(s, 'fire_t2a');
  const coolHead = hasSpell(s, 'ice_t2a');
  const staticStep = hasSpell(s, 'volt_t2a');
  const conductor = hasSpell(s, 'volt_t2b');
  const frostShield = hasSpell(s, 'ice_t2b');

  const skillMods: SkillModifiers = {
    pushForce: 1 + fireT * (Sp?.fillPush ?? 0.45),
    moveSpeed: 1 + voltT * (Sp?.fillSpeed ?? 0.35),
    staminaMax: (M?.staminaMax ?? 90) * (coolHead ? 1.1 : 1) + iceT * (Sp?.fillStamina ?? 40),
    staminaRegen: M?.staminaRegen ?? 12,
    staminaBuffer: frostShield ? (Sp?.frostBuffer ?? 25) : 0,
    resist: fireT * 0.25,
    auraResist: iceT * (Sp?.fillAura ?? 0.45) + (hasSpell(s, 'fire_t3a') ? 0.3 : 0),
    gapSense: voltT * (Sp?.fillGap ?? 0.3),
    frontPush: 0,
    chargeShoveMul: 1,
    clearSpeed: 1,
    blockedDragCut: 0,
    hasChargedShove: false,
    splitCouples: hasSpell(s, 'fire_t3c'),
    hasGroundPound: hasSpell(s, 'fire_t3b'),
    standFirm: hasSpell(s, 'ice_t3a'),
    hurdle: false,
    hasLeap: false,
    threadCouples: false,
    holdBreath: hasSpell(s, 'fire_t3a'),
    hasSecondWind: false,
    unbothered: false,
  };

  const cdr = (1 - voltT * (Sp?.fillCdr ?? 0.15)) * (conductor ? 0.8 : 1);

  return {
    skillMods,
    manaMaxBonus: iceT * (Sp?.fillMana ?? 40) + (frostShield ? 20 : 0),
    manaRegenBonus: conductor ? 3 : 0,
    spellPower: 1 + fireT * (Sp?.fillSpellPower ?? 0.3),
    cdr: Math.max(0.5, cdr),
    hotBlood,
    burningUrgency: hasSpell(s, 'fire_t2b'),
    cleansingFlame: hasSpell(s, 'fire_t3a'),
    tooHotToHold: hasSpell(s, 'fire_t3c'),
    coolHead,
    frostShield,
    chillOut: hasSpell(s, 'ice_t3a'),
    iceGlide: hasSpell(s, 'ice_t3c'),
    staticStep,
    conductor,
    droppedCall: hasSpell(s, 'volt_t3a'),
    thunderStep: hasSpell(s, 'volt_t3c'),
  };
}

export function unlockedSpellActives(s: SkillState): SpellNodeDef[] {
  return SPELL_NODES.filter((n) => n.kind === 'active' && hasSpell(s, n.id));
}

/** Default spell bar: up to 3 most recent unlocked actives (highest `at`, then id). */
export function defaultSpellBar(s: SkillState): string[] {
  return unlockedSpellActives(s)
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((n) => n.id);
}

export function spellById(id: string): SpellNodeDef | undefined {
  return SPELL_NODES.find((n) => n.id === id);
}

export { NODE_THRESHOLDS, nodeUnlocked, BRANCH_FILL };
