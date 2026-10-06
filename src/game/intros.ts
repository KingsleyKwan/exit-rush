import type { PassengerKind } from './PassengerTypes';

export type IntroKind = Exclude<PassengerKind, 'normal'>;

export interface IntroCopy {
  kind: IntroKind;
  /** Short "what it is" line. */
  whatEn: string;
  whatZh: string;
  /** How it blocks you. */
  blockEn: string;
  blockZh: string;
  /** One-verb tip. */
  tipEn: string;
  tipZh: string;
}

/** Intro / reinforce tip copy (EN + 粵). Names come from i18n passenger.*. */
export const INTROS: Record<IntroKind, IntroCopy> = {
  luggage: {
    kind: 'luggage',
    whatEn: 'Big rolling suitcase.',
    whatZh: '拖住個大行李喼。',
    blockEn: 'Blocks the aisle — shove barely moves it.',
    blockZh: '擋住通道，大力推都唔郁。',
    tipEn: 'Go around',
    tipZh: '兜路行',
  },
  stench: {
    kind: 'stench',
    whatEn: 'Smelly aura around him.',
    whatZh: '周圍臭味。',
    blockEn: 'Slows you in the green cloud.',
    blockZh: '行入綠色範圍會變慢。',
    tipEn: 'Cut through only if desperate',
    tipZh: '唔急就唔好衝',
  },
  family: {
    kind: 'family',
    whatEn: 'Mum + kids stick together.',
    whatZh: '阿媽同細路黐埋。',
    blockEn: 'Hard to split the cluster.',
    blockZh: '好難拆散。',
    tipEn: 'Nudge the edge',
    tipZh: '掃邊位',
  },
  brat: {
    kind: 'brat',
    whatEn: 'Small, bouncy, zigzags.',
    whatZh: '細細粒又跳又走。',
    blockEn: 'Unpredictable path — don’t chase.',
    blockZh: '路線亂嚟，唔好追。',
    tipEn: 'Weave past',
    tipZh: '閃過去',
  },
  couple: {
    kind: 'couple',
    whatEn: 'Holding hands.',
    whatZh: '拖實手。',
    blockEn: 'They snap back together if split.',
    blockZh: '擘開會彈返埋。',
    tipEn: 'Detour',
    tipZh: '要兜',
  },
  angry: {
    kind: 'angry',
    whatEn: 'Winds up, then shoves.',
    whatZh: '儲完力會大力推。',
    blockEn: 'Steam means a knockback is coming.',
    blockZh: '見到熱氣就快閃。',
    tipEn: 'Dodge or shove first',
    tipZh: '閃或者搶先推',
  },
  squat: {
    kind: 'squat',
    whatEn: 'Crouched low — rooted.',
    whatZh: '踎低喺度，好穩。',
    blockEn: 'Hard to shove over; weave wider around them.',
    blockZh: '好難推踎起，要旁邊大啲閃過。',
    tipEn: 'Weave wide',
    tipZh: '大弧度閃過',
  },
  loud: {
    kind: 'loud',
    whatEn: 'Shouting into the phone.',
    whatZh: '對住電話大嗌「喂！！」。',
    blockEn: 'Inside the orange noise ring your stamina drains fast.',
    blockZh: '行入橙色噪音圈，體力會好快冇。',
    tipEn: 'Keep your distance',
    tipZh: '行遠啲',
  },
};

export const INTRO_ORDER: IntroKind[] = ['luggage', 'squat', 'stench', 'family', 'brat', 'couple', 'angry', 'loud'];
