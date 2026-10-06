import type { SkillState } from './storage';
import type { PassengerKind } from './PassengerTypes';
import { TUNING } from './sim/tuning';

/** Points to fill one branch before ultimate */
export const BRANCH_FILL = 60;
/** Extra points to unlock ultimate after fill */
export const ULTIMATE_COST = 10;
export const BRANCH_TOTAL = BRANCH_FILL + ULTIMATE_COST;

/**
 * v0.5/v0.6 skill-point economy (see docs/BALANCE.md):
 * - First clear of each playable level awards POINTS_PER_FIRST_CLEAR.
 * - Replays award nothing.
 * - 31 playable clears × 3 = 93 SP — enough for one full branch+ult (70)
 *   and a strong L100 loadout (~90).
 */
export const POINTS_PER_FIRST_CLEAR = 3;
/** Kept for UI/docs: only the first clear of a level awards points. */
export const MAX_POINTS_PER_LEVEL = 1;

/** Major skill unlock thresholds along a branch (Valhalla-style icons). */
export const NODE_THRESHOLDS = [10, 20, 30, 40, 50, 60] as const;

export type Branch = 'str' | 'spd' | 'sta';

export type SkillNodeKind = 'passive' | 'active';

export interface SkillNodeDef {
  id: string;
  branch: Branch;
  /** 1 = Tier1, 2 = Tier2, 3 = Tier3 (v0.6.2: counters to special passengers). */
  tier: 1 | 2 | 3;
  /** Points invested in the branch required to unlock. */
  at: number;
  kind: SkillNodeKind;
  /** True when copy/numbers are provisional (unused since v0.6.2). */
  tbd?: boolean;
  /** Tier 3: special passenger type(s) this skill counters (icon shown on the node). */
  counters?: PassengerKind[];
  nameEn: string;
  nameZh: string;
  tipEn: string;
  tipZh: string;
}

/**
 * Per branch: 4 passive + 2 active + ultimate (wired separately).
 * Unlock every ~10 points: 10 / 20 / 30 / 40 / 50 / 60, then +10 ult.
 */
export const SKILL_NODES: SkillNodeDef[] = [
  // ---- STR
  {
    id: 'str_t1',
    branch: 'str',
    tier: 1,
    at: 10,
    kind: 'passive',
    nameEn: 'Bulk Up',
    nameZh: '渾身是力',
    tipEn: 'Strength ×1.1',
    tipZh: '力量 ×1.1',
  },
  {
    id: 'str_t2a',
    branch: 'str',
    tier: 2,
    at: 20,
    kind: 'passive',
    nameEn: 'Shoulder Drive',
    nameZh: '迎面頂推',
    tipEn: 'Extra push power in front of you',
    tipZh: '面前推人更有力',
  },
  {
    id: 'str_t2b',
    branch: 'str',
    tier: 2,
    at: 30,
    kind: 'active',
    nameEn: 'Charged Shove',
    nameZh: '蓄力一推',
    tipEn: 'Hold ~1s then release — shove hits harder',
    tipZh: '蓄力約1秒再放手，推得更勁',
  },
  {
    id: 'str_t3a',
    branch: 'str',
    tier: 3,
    at: 40,
    kind: 'passive',
    counters: ['couple'],
    nameEn: 'Split',
    nameZh: '拆散情侶',
    tipEn: 'Couple: a shove breaks their hand-hold for 4s',
    tipZh: '情侶：推一下就拆開佢哋拖手（4秒）',
  },
  {
    id: 'str_t3b',
    branch: 'str',
    tier: 3,
    at: 50,
    kind: 'active',
    counters: ['luggage'],
    nameEn: 'Ground Pound',
    nameZh: '震地',
    tipEn: 'Full-charge shove → shockwave; shifts Luggage too',
    tipZh: '蓄滿推人出震波，連行李喼都推開',
  },
  {
    id: 'str_t3c',
    branch: 'str',
    tier: 3,
    at: 60,
    kind: 'passive',
    counters: ['angry'],
    nameEn: 'Stand Firm',
    nameZh: '頂硬上',
    tipEn: 'Angry man: his shove barely moves you, no stagger',
    tipZh: '暴躁男：佢推你都推唔郁，唔會踉蹌',
  },
  // ---- SPD
  {
    id: 'spd_t1',
    branch: 'spd',
    tier: 1,
    at: 10,
    kind: 'passive',
    nameEn: 'Light Feet',
    nameZh: '腳下生風',
    tipEn: 'Speed ×1.1',
    tipZh: '速度 ×1.1',
  },
  {
    id: 'spd_t2a',
    branch: 'spd',
    tier: 2,
    at: 20,
    kind: 'passive',
    nameEn: 'Open Lane',
    nameZh: '暢通加速',
    tipEn: 'Run faster when unobstructed',
    tipZh: '前面冇人時跑得更快',
  },
  {
    id: 'spd_t2b',
    branch: 'spd',
    tier: 2,
    at: 30,
    kind: 'passive',
    nameEn: 'Squeeze Through',
    nameZh: '擠縫不減速',
    tipEn: 'Less speed loss when blocked',
    tipZh: '被人擋住時少減速',
  },
  {
    id: 'spd_t3a',
    branch: 'spd',
    tier: 3,
    at: 40,
    kind: 'passive',
    counters: ['luggage'],
    nameEn: 'Hurdle',
    nameZh: '跨行李',
    tipEn: 'Luggage: hop over suitcases, no blocking',
    tipZh: '拉行李喼：直接跨過個喼，唔再擋路',
  },
  {
    id: 'spd_t3b',
    branch: 'spd',
    tier: 3,
    at: 50,
    kind: 'active',
    counters: ['squat', 'family'],
    nameEn: 'Leap',
    nameZh: '飛身',
    tipEn: 'Button: leap past Squatters + Family kids (6s cd)',
    tipZh: '按鍵：飛身跨過踎低客同細路（冷卻6秒）',
  },
  {
    id: 'spd_t3c',
    branch: 'spd',
    tier: 3,
    at: 60,
    kind: 'passive',
    counters: ['couple'],
    nameEn: 'Thread',
    nameZh: '穿插',
    tipEn: 'Couple: slip through the gap between their hands',
    tipZh: '情侶：喺佢哋拖手中間穿過去',
  },
  // ---- STA (replaces Wisdom)
  {
    id: 'sta_t1',
    branch: 'sta',
    tier: 1,
    at: 10,
    kind: 'passive',
    nameEn: 'Winded Less',
    nameZh: '氣長',
    tipEn: 'Stamina ×1.1',
    tipZh: '體力 ×1.1',
  },
  {
    id: 'sta_t2a',
    branch: 'sta',
    tier: 2,
    at: 20,
    kind: 'passive',
    nameEn: 'Second Breath',
    nameZh: '回氣加快',
    tipEn: 'Stamina regen up',
    tipZh: '體力回復加快',
  },
  {
    id: 'sta_t2b',
    branch: 'sta',
    tier: 2,
    at: 30,
    kind: 'passive',
    nameEn: 'Reserve Tank',
    nameZh: '備用體力',
    tipEn: 'Start with extra non-regen stamina buffer',
    tipZh: '開局多一段唔回氣嘅體力緩衝',
  },
  {
    id: 'sta_t3a',
    branch: 'sta',
    tier: 3,
    at: 40,
    kind: 'passive',
    counters: ['stench'],
    nameEn: 'Hold Breath',
    nameZh: '忍臭',
    tipEn: 'Stench: their stink cloud no longer slows you',
    tipZh: '惡臭人：臭氣唔再拖慢你',
  },
  {
    id: 'sta_t3b',
    branch: 'sta',
    tier: 3,
    at: 50,
    kind: 'active',
    counters: ['brat'],
    nameEn: 'Second Wind',
    nameZh: '回魂',
    tipEn: 'Button: +45 stamina and knock Brats away (dazed 3s)',
    tipZh: '按鍵：即回45體力，彈開百厭仔（暈3秒）',
  },
  {
    id: 'sta_t3c',
    branch: 'sta',
    tier: 3,
    at: 60,
    kind: 'passive',
    counters: ['family'],
    nameEn: 'Unbothered',
    nameZh: '好脾氣',
    tipEn: 'Family: pushing through them costs no stamina or drag',
    tipZh: '一家大細：擠過佢哋唔耗體力、唔拖慢',
  },
];

export const ULT_DEFS: Record<
  Branch,
  { nameEn: string; nameZh: string; tipEn: string; tipZh: string }
> = {
  str: {
    nameEn: 'Iron Bull Charge',
    nameZh: '鐵牛撞門',
    tipEn: 'Shockwave + brief unstoppable charge',
    tipZh: '震波 + 短暫無敵衝撞',
  },
  spd: {
    nameEn: 'Slip-Off Dash',
    nameZh: '閃身落車',
    tipEn: 'Burst dash through the crowd',
    tipZh: '高速閃身穿過人群',
  },
  sta: {
    nameEn: 'Iron Stance',
    nameZh: '鐵馬企穩',
    tipEn: 'Burst regen + heavy stance (replaces Crowd Sense)',
    tipZh: '爆發回氣 + 沉重站姿（取代人潮預測）',
  },
};

export function nodesFor(branch: Branch): SkillNodeDef[] {
  return SKILL_NODES.filter((n) => n.branch === branch);
}

export function nodeUnlocked(s: SkillState, node: SkillNodeDef): boolean {
  return s[node.branch] >= node.at;
}

export function ultUnlocked(s: SkillState, branch: Branch): boolean {
  if (branch === 'str') return s.ultStr;
  if (branch === 'spd') return s.ultSpd;
  return s.ultSta;
}

export interface SkillModifiers {
  pushForce: number;
  moveSpeed: number;
  staminaMax: number;
  staminaRegen: number;
  /** Extra non-regen buffer added to starting stamina (STA T2b). */
  staminaBuffer: number;
  resist: number;
  auraResist: number;
  /** Lane-reading / shoulder slip (from SPD fill; was WIS gapSense). */
  gapSense: number;
  /** STR T2a: extra drive when contact normal opposes facing. */
  frontPush: number;
  /** STR T2b: multiplier on shove impulse when charge was high. */
  chargeShoveMul: number;
  /** SPD T2a: speed mul when not in contact. */
  clearSpeed: number;
  /** SPD T2b: fraction of crowd-drag removed. */
  blockedDragCut: number;
  /** Unlocked actives (derived from nodes). */
  hasChargedShove: boolean;
  // ---- v0.6.2 Tier 3 counters
  /** STR 40 拆散情侶: shove hits break couple links. */
  splitCouples: boolean;
  /** STR 50 震地: full-charge shove shockwave (stronger on luggage). */
  hasGroundPound: boolean;
  /** STR 60 頂硬上: angry shoves barely move / stun you. */
  standFirm: boolean;
  /** SPD 40 跨行李: pass through suitcases (owner still blocks). */
  hurdle: boolean;
  /** SPD 50 飛身 (active): leap over squatters + kids. */
  hasLeap: boolean;
  /** SPD 60 穿插: couple link doesn't block you. */
  threadCouples: boolean;
  /** STA 40 忍臭: immune to stench slow. */
  holdBreath: boolean;
  /** STA 50 回魂 (active): stamina burst + shake off brats. */
  hasSecondWind: boolean;
  /** STA 60 好脾氣: family contacts cost no stamina / drag. */
  unbothered: boolean;
}

function hasNode(s: SkillState, id: string): boolean {
  const n = SKILL_NODES.find((x) => x.id === id);
  return !!n && nodeUnlocked(s, n);
}

export function modifiersFromSkills(s: SkillState): SkillModifiers {
  const K = TUNING.skills;
  const strT = Math.min(1, s.str / BRANCH_FILL);
  const spdT = Math.min(1, s.spd / BRANCH_FILL);
  const staT = Math.min(1, s.sta / BRANCH_FILL);

  const t1Str = hasNode(s, 'str_t1') ? 1.1 : 1;
  const t1Spd = hasNode(s, 'spd_t1') ? 1.1 : 1;
  const t1Sta = hasNode(s, 'sta_t1') ? 1.1 : 1;

  return {
    pushForce: (1 + strT * K.pushForce) * t1Str,
    moveSpeed: (1 + spdT * K.moveSpeed) * t1Spd,
    staminaMax: (K.staminaBase + staT * K.staminaMax) * t1Sta,
    staminaRegen: K.regenBase + spdT * K.staminaRegen * 0.35 + staT * K.staminaRegen * 0.65
      + (hasNode(s, 'sta_t2a') ? K.regenNodeBonus : 0),
    staminaBuffer: hasNode(s, 'sta_t2b') ? K.staminaBuffer : 0,
    resist: strT * K.resist,
    auraResist: staT * K.auraResist,
    gapSense: spdT * K.gapSense,
    frontPush: hasNode(s, 'str_t2a') ? K.frontPush : 0,
    chargeShoveMul: hasNode(s, 'str_t2b') ? K.chargeShoveMul : 1,
    clearSpeed: hasNode(s, 'spd_t2a') ? K.clearSpeed : 1,
    blockedDragCut: hasNode(s, 'spd_t2b') ? K.blockedDragCut : 0,
    hasChargedShove: hasNode(s, 'str_t2b'),
    splitCouples: hasNode(s, 'str_t3a'),
    hasGroundPound: hasNode(s, 'str_t3b'),
    standFirm: hasNode(s, 'str_t3c'),
    hurdle: hasNode(s, 'spd_t3a'),
    hasLeap: hasNode(s, 'spd_t3b'),
    threadCouples: hasNode(s, 'spd_t3c'),
    holdBreath: hasNode(s, 'sta_t3a'),
    hasSecondWind: hasNode(s, 'sta_t3b'),
    unbothered: hasNode(s, 'sta_t3c'),
  };
}

export function canSpend(s: SkillState, branch: Branch): boolean {
  if (s.points < 1) return false;
  const v = s[branch];
  if (v < BRANCH_FILL) return true;
  if (branch === 'str' && !s.ultStr) return s.points >= ULTIMATE_COST;
  if (branch === 'spd' && !s.ultSpd) return s.points >= ULTIMATE_COST;
  if (branch === 'sta' && !s.ultSta) return s.points >= ULTIMATE_COST;
  return false;
}

export function spendPoint(s: SkillState, branch: Branch): SkillState {
  const next = { ...s };
  if (next[branch] < BRANCH_FILL) {
    if (next.points < 1) return s;
    next[branch] += 1;
    next.points -= 1;
    return next;
  }
  if (next.points < ULTIMATE_COST) return s;
  if (branch === 'str' && !next.ultStr) {
    next.ultStr = true;
    next.points -= ULTIMATE_COST;
  } else if (branch === 'spd' && !next.ultSpd) {
    next.ultSpd = true;
    next.points -= ULTIMATE_COST;
  } else if (branch === 'sta' && !next.ultSta) {
    next.ultSta = true;
    next.points -= ULTIMATE_COST;
  }
  return next;
}

export function branchProgressLabel(s: SkillState, branch: Branch, ultLabel = 'Ult'): string {
  const v = s[branch];
  const ult = ultUnlocked(s, branch);
  if (ult) return `${BRANCH_TOTAL}/${BRANCH_TOTAL}`;
  if (v >= BRANCH_FILL) return `${BRANCH_FILL}/${BRANCH_FILL} → ${ultLabel} ${ULTIMATE_COST}`;
  return `${v}/${BRANCH_FILL}`;
}

/** Next major node threshold above current fill (or null if filled). */
export function nextNodeAt(filled: number): number | null {
  for (const t of NODE_THRESHOLDS) if (filled < t) return t;
  return null;
}
