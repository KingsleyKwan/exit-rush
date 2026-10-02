import type { SkillState } from './storage';

/** Points to fill one branch before ultimate */
export const BRANCH_FILL = 60;
/** Extra points to unlock ultimate after fill */
export const ULTIMATE_COST = 10;
export const BRANCH_TOTAL = BRANCH_FILL + ULTIMATE_COST;

export type Branch = 'str' | 'spd' | 'wis';

export interface SkillModifiers {
  pushForce: number;
  moveSpeed: number;
  staminaMax: number;
  staminaRegen: number;
  resist: number;
  auraResist: number;
  gapSense: number; // wis: slight auto-steer / reduced crowd friction
}

export function modifiersFromSkills(s: SkillState): SkillModifiers {
  const strT = s.str / BRANCH_FILL;
  const spdT = s.spd / BRANCH_FILL;
  const wisT = s.wis / BRANCH_FILL;
  return {
    pushForce: 1 + strT * 0.85,
    moveSpeed: 1 + spdT * 0.7,
    staminaMax: 100 + strT * 50,
    staminaRegen: 12 + spdT * 18,
    resist: strT * 0.5,
    auraResist: wisT * 0.7,
    gapSense: wisT * 0.4,
  };
}

export function canSpend(s: SkillState, branch: Branch): boolean {
  if (s.points < 1) return false;
  const v = s[branch];
  if (v < BRANCH_FILL) return true;
  // ultimate
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

export function branchProgressLabel(s: SkillState, branch: Branch): string {
  const v = s[branch];
  const ult =
    branch === 'str' ? s.ultStr : branch === 'spd' ? s.ultSpd : s.ultWis;
  if (ult) return `${BRANCH_TOTAL}/${BRANCH_TOTAL}`;
  if (v >= BRANCH_FILL) return `${BRANCH_FILL}/${BRANCH_FILL} → Ult ${ULTIMATE_COST}`;
  return `${v}/${BRANCH_FILL}`;
}
