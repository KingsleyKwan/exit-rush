import type { PassengerKind } from './PassengerTypes';
import type { CharacterId } from './charactersDef';

/** v0.7 boss passengers: one oversized "king" per special type (L20–L90, all eight at L100). */
export type BossKind = Exclude<PassengerKind, 'normal'>;

export interface BossDef {
  kind: BossKind;
  zh: string;
  en: string;
  taglineZh: string;
  taglineEn: string;
  /** Body tint (multiplies the type's palette) so the king reads apart from his subjects. */
  tint: [number, number, number];
  /** Crown / badge accent colour. */
  accent: string;
  /** Which skill(s) counter this boss (shown on the title card). */
  counterZh: string;
  counterEn: string;
}

export const BOSS_ORDER: BossKind[] = ['luggage', 'stench', 'squat', 'family', 'brat', 'couple', 'angry', 'loud'];

export const BOSSES: Record<BossKind, BossDef> = {
  luggage: {
    kind: 'luggage',
    zh: '行李箱大王',
    en: 'Suitcase King',
    taglineZh: '個喼大過你，撞埋去會彈返轉頭',
    taglineEn: 'His case is bigger than you — and it bounces you back',
    tint: [1.12, 1.0, 0.82],
    accent: '#ffb300',
    counterZh: '跨行李 · 震地',
    counterEn: 'Hurdle · Ground Pound',
  },
  stench: {
    kind: 'stench',
    zh: '臭狐王',
    en: 'Stink Fox King',
    taglineZh: '成卡車都聞到，行近啲都腳軟',
    taglineEn: 'The whole car can smell him. Your legs go weak',
    tint: [0.92, 1.12, 0.78],
    accent: '#9ccc65',
    counterZh: '忍臭',
    counterEn: 'Hold Breath',
  },
  squat: {
    kind: 'squat',
    zh: '踎低王',
    en: 'Squat King',
    taglineZh: '踎喺門口，一步都唔郁',
    taglineEn: 'Squats at the door. Will not budge',
    tint: [1.05, 0.96, 1.12],
    accent: '#ab47bc',
    counterZh: '飛身 · 蓄力一推',
    counterEn: 'Leap · Charged Shove',
  },
  family: {
    kind: 'family',
    zh: '大家長',
    en: 'The Patriarch',
    taglineZh: '一家大細，越行越多',
    taglineEn: 'The family just keeps growing',
    tint: [1.12, 1.0, 0.86],
    accent: '#f08a3c',
    counterZh: '好脾氣 · 飛身',
    counterEn: 'Unbothered · Leap',
  },
  brat: {
    kind: 'brat',
    zh: '衰仔王',
    en: 'Brat King',
    taglineZh: '周圍衝，周圍撞，撞完當無事',
    taglineEn: 'Charges everywhere, hits everyone',
    tint: [1.1, 1.05, 0.8],
    accent: '#ffd54f',
    counterZh: '回魂',
    counterEn: 'Second Wind',
  },
  couple: {
    kind: 'couple',
    zh: '黏身情侶王',
    en: 'Clingy Couple Royals',
    taglineZh: '手拖手，封晒成條通道',
    taglineEn: 'Hand in hand, the whole aisle closed',
    tint: [1.12, 0.92, 1.0],
    accent: '#f06292',
    counterZh: '穿插 · 拆散情侶',
    counterEn: 'Thread · Split',
  },
  angry: {
    kind: 'angry',
    zh: '嬲嬲豬王',
    en: 'Grumpy Hog King',
    taglineZh: '掂佢一下，佢即刻衝埋嚟',
    taglineEn: 'Touch him once and he charges',
    tint: [1.15, 0.9, 0.86],
    accent: '#e53935',
    counterZh: '頂硬上',
    counterEn: 'Stand Firm',
  },
  loud: {
    kind: 'loud',
    zh: '大聲公王',
    en: 'Loudmouth King',
    taglineZh: '講電話全車都聽到，聽到你冇氣',
    taglineEn: 'The whole train hears his call — it drains you dry',
    tint: [1.1, 1.0, 0.84],
    accent: '#ff8f00',
    counterZh: '好脾氣',
    counterEn: 'Unbothered',
  },
};

/** Boss kind(s) of a level (`boss` field), [] for normal levels. */
export function bossesOf(level: { boss?: readonly BossKind[] }): readonly BossKind[] {
  return level.boss ?? [];
}


/** Per-character counter blurb for boss cards (v0.8). Falls back to hero copy. */
export function countersFor(kind: BossKind, char: CharacterId = 'hero'): { zh: string; en: string } {
  const b = BOSSES[kind];
  if (char === 'mage') {
    const mage: Record<BossKind, { zh: string; en: string }> = {
      luggage: { zh: '✦ 微風', en: '✦ Breeze' },
      stench: { zh: '✦ 冷氣', en: '✦ Cold Air' },
      squat: { zh: '✦ 慢凍', en: '✦ Slow Cold' },
      family: { zh: '✦ 慢凍', en: '✦ Slow Cold' },
      brat: { zh: '✦ 企實', en: '✦ Dug In' },
      couple: { zh: '✦ 涼風', en: '✦ Cool Breeze' },
      angry: { zh: '✦ 極凍', en: '✦ Bitter Cold' },
      loud: { zh: '✦ 極凍', en: '✦ Bitter Cold' },
    };
    return mage[kind];
  }
  return { zh: b.counterZh, en: b.counterEn };
}
