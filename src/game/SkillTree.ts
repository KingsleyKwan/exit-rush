import type { SkillState } from './storage';
import { TUNING } from './sim/tuning';

export const BRANCH_FILL = 60;
export const ULTIMATE_COST = 10;
export const BRANCH_TOTAL = BRANCH_FILL + ULTIMATE_COST;
export const POINTS_PER_FIRST_CLEAR = 3;
export const MAX_POINTS_PER_LEVEL = 1;
export const NODE_THRESHOLDS = [10, 20, 30, 40, 50, 60] as const;
export type Branch = 'str' | 'spd' | 'sta';
export type SkillNodeKind = 'passive' | 'active';
export interface SkillNodeDef {
  id: string;
  branch: Branch;
  tier: 1 | 2 | 3;
  at: number;
  kind: SkillNodeKind;
  tbd?: boolean;
  nameEn: string;
  nameZh: string;
  tipEn: string;
  tipZh: string;
}
export const SKILL_NODES: SkillNodeDef[] = [];
export const ULT_DEFS: Record<Branch, { nameEn: string; nameZh: string; tipEn: string; tipZh: string }> = {
  str: { nameEn: 'Iron Bull Charge', nameZh: '鐵牛撞門', tipEn: '', tipZh: '' },
  spd: { nameEn: 'Slip-Off Dash', nameZh: '閃身落車', tipEn: '', tipZh: '' },
  sta: { nameEn: 'Iron Stance', nameZh: '鐵馬企穩', tipEn: '', tipZh: '' },
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
  staminaBuffer: number;
  resist: number;
  auraResist: number;
  gapSense: number;
  frontPush: number;
  chargeShoveMul: number;
  shoveConeCos: number;
  knockbackMul: number;
  clearSpeed: number;
  blockedDragCut: number;
  weaveSlip: number;
  drainResist: number;
  hasChargedShove: boolean;
  hasGroundPound: boolean;
  hasBriefDash: boolean;
  hasAfterimage: boolean;
  hasSecondWind: boolean;
}
export function modifiersFromSkills(s: SkillState): SkillModifiers {
  const K = TUNING.skills;
  const strT = Math.min(1, s.str / BRANCH_FILL);
  const spdT = Math.min(1, s.spd / BRANCH_FILL);
  const staT = Math.min(1, s.sta / BRANCH_FILL);
  return {
    pushForce: 1 + strT * K.pushForce,
    moveSpeed: 1 + spdT * K.moveSpeed,
    staminaMax: K.staminaBase + staT * K.staminaMax,
    staminaRegen: K.regenBase + staT * K.staminaRegen,
    staminaBuffer: 0,
    resist: strT * K.resist,
    auraResist: staT * K.auraResist,
    gapSense: spdT * K.gapSense,
    frontPush: 0,
    chargeShoveMul: 1,
    shoveConeCos: TUNING.player.shove.coneCos,
    knockbackMul: 1,
    clearSpeed: 1,
    blockedDragCut: 0,
    weaveSlip: 1,
    drainResist: 0,
    hasChargedShove: false,
    hasGroundPound: false,
    hasBriefDash: false,
    hasAfterimage: false,
    hasSecondWind: false,
  };
}
export function canSpend(s: SkillState, branch: Branch): boolean {
  if (s.points < 1) return false;
  if (s[branch] < BRANCH_FILL) return true;
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
export function nextNodeAt(filled: number): number | null {
  for (const t of NODE_THRESHOLDS) if (filled < t) return t;
  return null;
}
