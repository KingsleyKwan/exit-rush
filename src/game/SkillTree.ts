import type { SkillState } from './storage';
import { TUNING } from './sim/tuning';

/** Points to fill one branch before ultimate */
export const BRANCH_FILL = 60;
/** Extra points to unlock ultimate after fill */
export const ULTIMATE_COST = 10;
export const BRANCH_TOTAL = BRANCH_FILL + ULTIMATE_COST;

/**
 * v0.5 skill-point economy (see docs/BALANCE.md):
 * - First clear of each playable level awards POINTS_PER_FIRST_CLEAR.
 * - Replays award nothing (replay cap removed).
 * - 31 playable clears × 3 = 93 SP — enough for one full branch+ult (70)
 *   and a strong L100 loadout (~90).
 */
export const POINTS_PER_FIRST_CLEAR = 3;
/** Kept for UI/docs: only the first clear of a level awards points. */
export const MAX_POINTS_PER_LEVEL = 1;

export type Branch = 'str' | 'spd' | 'wis';

export interface SkillModifiers {
  pushForce: number;
  moveSpeed: number;
  staminaMax: number;
  staminaRegen: number;
  resist: number;
  auraResist: number;
  gapSense: number;
}

export function modifiersFromSkills(s: SkillState): SkillModifiers {
  const K = TUNING.skills;
  const strT = Math.min(1, s.str / BRANCH_FILL);
  const spdT = Math.min(1, s.spd / BRANCH_FILL);
  const wisT = Math.min(1, s.wis / BRANCH_FILL);
  return {
    pushForce: 1 + strT * K.pushForce,
    moveSpeed: 1 + spdT * K.moveSpeed,
    staminaMax: K.staminaBase + strT * K.staminaMax,
    staminaRegen: K.regenBase + spdT * K.staminaRegen,
    resist: strT * K.resist,
    auraResist: wisT * K.auraResist,
    gapSense: wisT * K.gapSense,
  };
}

export function canSpend(s: SkillState, branch: Branch): boolean {
  if (s.points < 1) return false;
  const v = s[branch];
  if (v < BRANCH_FILL) return true;
  if (branch === 'str' && !s.ultStr) return s.points >= ULTIMATE_COST;
  if (branch === 'spd' && !s.ultSpd) return s.points >= ULTIMATE_COST;
  if (branch === 'wis' && !s.ultWis) return s.points >= ULTIMATE_COST;
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
  } else if (branch === 'wis' && !next.ultWis) {
    next.ultWis = true;
    next.points -= ULTIMATE_COST;
  }
  return next;
}

export function branchProgressLabel(s: SkillState, branch: Branch, ultLabel = 'Ult'): string {
  const v = s[branch];
  const ult = branch === 'str' ? s.ultStr : branch === 'spd' ? s.ultSpd : s.ultWis;
  if (ult) return `${BRANCH_TOTAL}/${BRANCH_TOTAL}`;
  if (v >= BRANCH_FILL) return `${BRANCH_FILL}/${BRANCH_FILL} → ${ultLabel} ${ULTIMATE_COST}`;
  return `${v}/${BRANCH_FILL}`;
}
