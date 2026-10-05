import type { PassengerKind } from './PassengerTypes';

export interface LevelDef {
  id: number;
  stationEn: string;
  stationZh: string;
  flavourEn: string;
  flavourZh: string;
  density: number; // 0–10
  timer: number; // seconds
  /** Relative weights for special spawns */
  mix: Partial<Record<PassengerKind, number>>;
  /** Boarding pressure: 0–1 for regular levels; >1 = event surge (L100). */
  pressure: number;
  playable: boolean;
}

const baseMix = (extra: Partial<Record<PassengerKind, number>> = {}): LevelDef['mix'] => ({
  normal: 10,
  ...extra,
});

/**
 * v0.2.1 balance pass: densities / pressures / timers tuned with the headless
 * sim (see docs/BALANCE.md). Difficulty is composite — luggage-heavy levels use
 * lower density, boarding-wave levels lower density but higher pressure.
 */
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    stationEn: 'Sheung Huan',
    stationZh: '上圜',
    flavourEn: 'Mid-morning quiet',
    flavourZh: '早上人少',
    density: 10,
    timer: 36,
    mix: baseMix({ luggage: 1 }),
    pressure: 0.15,
    playable: true,
  },
  {
    id: 2,
    stationEn: 'Fortress Knoll',
    stationZh: '炮台崗',
    flavourEn: 'Lunch trickle',
    flavourZh: '午飯時段',
    density: 6,
    timer: 38,
    mix: baseMix({ luggage: 2, stench: 1 }),
    pressure: 0.2,
    playable: true,
  },
  {
    id: 3,
    stationEn: 'Tai Gu',
    stationZh: '太故',
    flavourEn: 'After-school',
    flavourZh: '放學潮',
    density: 10,
    timer: 37,
    mix: baseMix({ brat: 3, luggage: 1, family: 1 }),
    pressure: 0.35,
    playable: true,
  },
  {
    id: 4,
    stationEn: 'Carp Stream',
    stationZh: '鯽魚涌',
    flavourEn: 'Office spill',
    flavourZh: '放工潮',
    density: 8,
    timer: 37,
    mix: baseMix({ angry: 3, couple: 1, luggage: 1 }),
    pressure: 0.3,
    playable: true,
  },
  {
    id: 5,
    stationEn: 'North Gok',
    stationZh: '北覺',
    flavourEn: 'Evening peak start',
    flavourZh: '晚高峰開始',
    density: 5,
    timer: 40,
    mix: baseMix({ family: 3, angry: 2, stench: 1, couple: 1, brat: 1, luggage: 2 }),
    pressure: 0.6,
    playable: true,
  },
  // 6–20 stubs from LEVELS.md
  {
    id: 6,
    stationEn: 'Causeway Bay Village',
    stationZh: '銅鑼灣村',
    flavourEn: 'Weekend shoppers',
    flavourZh: '週末購物',
    density: 6,
    timer: 36,
    mix: baseMix({ luggage: 5, couple: 2 }),
    pressure: 0.3,
    playable: true,
  },
  {
    id: 7,
    stationEn: 'Tin Hau After',
    stationZh: '天後',
    flavourEn: 'Temple fair spill',
    flavourZh: '廟會散場',
    density: 9,
    timer: 37,
    mix: baseMix({ stench: 3, family: 3 }),
    pressure: 0.3,
    playable: true,
  },
  {
    id: 8,
    stationEn: 'Wan Jai',
    stationZh: '灣崽',
    flavourEn: 'Conference let-out',
    flavourZh: '會議散場',
    density: 8,
    timer: 39,
    mix: baseMix({ couple: 3, angry: 3 }),
    pressure: 0.6,
    playable: true,
  },
  {
    id: 9,
    stationEn: 'Gold Bell',
    stationZh: '金鍾',
    flavourEn: 'Cross-platform crush',
    flavourZh: '轉車迫爆',
    density: 8,
    timer: 40,
    mix: baseMix({ angry: 2, luggage: 2, family: 2 }),
    pressure: 0.6,
    playable: true,
  },
  {
    id: 10,
    stationEn: 'Central Ring',
    stationZh: '中圜',
    flavourEn: 'Fri 18:30',
    flavourZh: '金曜傍晚',
    density: 8,
    timer: 40,
    mix: baseMix({ angry: 3, couple: 2, luggage: 2, stench: 1 }),
    pressure: 0.4,
    playable: true,
  },
  {
    id: 11,
    stationEn: 'Hong City',
    stationZh: '香城',
    flavourEn: 'Airport transfer vibe',
    flavourZh: '機場轉車感',
    density: 7,
    timer: 41,
    mix: baseMix({ luggage: 8 }),
    pressure: 0.2,
    playable: true,
  },
  {
    id: 12,
    stationEn: 'Nine Dragons',
    stationZh: '九朧',
    flavourEn: 'Tourist wave',
    flavourZh: '遊客潮',
    density: 6,
    timer: 39,
    mix: baseMix({ couple: 3, luggage: 4 }),
    pressure: 0.55,
    playable: true,
  },
  {
    id: 13,
    stationEn: 'Ou Wan',
    stationZh: '澳運',
    flavourEn: 'Concert let-out',
    flavourZh: '演唱會散場',
    density: 9,
    timer: 42,
    mix: baseMix({ angry: 5, brat: 2 }),
    pressure: 0.85,
    playable: true,
  },
  {
    id: 14,
    stationEn: 'Mong Gok',
    stationZh: '望角',
    flavourEn: 'Sat night',
    flavourZh: '週六夜晚',
    density: 8,
    timer: 45,
    mix: baseMix({
      family: 2,
      brat: 2,
      couple: 2,
      angry: 2,
      stench: 2,
      luggage: 2,
    }),
    pressure: 0.6,
    playable: true,
  },
  {
    id: 15,
    stationEn: 'Tai Jai',
    stationZh: '太仔',
    flavourEn: 'Calm then surge',
    flavourZh: '突然湧入',
    density: 9,
    timer: 48,
    mix: baseMix({ angry: 3, family: 2 }),
    pressure: 0.9,
    playable: true,
  },
  {
    id: 16,
    stationEn: 'Sham Shui Pooh',
    stationZh: '深水埔',
    flavourEn: 'Market close',
    flavourZh: '墟市收檔',
    density: 8,
    timer: 40,
    mix: baseMix({ stench: 4, family: 3 }),
    pressure: 0.65,
    playable: true,
  },
  {
    id: 17,
    stationEn: 'Mei Foo Float',
    stationZh: '美浮',
    flavourEn: 'Typhoon signal eve',
    flavourZh: '打風前夕',
    density: 7,
    timer: 37,
    mix: baseMix({ luggage: 3, angry: 2, family: 2 }),
    pressure: 0.8,
    playable: true,
  },
  {
    id: 18,
    stationEn: 'Chuen Wan',
    stationZh: '全灣',
    flavourEn: 'Terminal dump',
    flavourZh: '總站瀉人',
    density: 8,
    timer: 45,
    mix: baseMix({ angry: 3, luggage: 2 }),
    pressure: 0.75,
    playable: true,
  },
  {
    id: 19,
    stationEn: 'Hung Hom Chop',
    stationZh: '紅砍',
    flavourEn: 'Through-train fantasy',
    flavourZh: '過境幻想',
    density: 7,
    timer: 45,
    mix: baseMix({ luggage: 5, angry: 4 }),
    pressure: 0.6,
    playable: true,
  },
  {
    id: 20,
    stationEn: 'East Point Winter',
    stationZh: '尖冬',
    flavourEn: 'Pre-fireworks',
    flavourZh: '煙花前',
    density: 10,
    timer: 50,
    mix: baseMix({
      family: 3,
      couple: 3,
      luggage: 3,
      angry: 2,
      brat: 2,
    }),
    pressure: 0.8,
    playable: true,
  },
  {
    id: 100,
    stationEn: 'Tsim Sha Mouth',
    stationZh: '尖沙嘴',
    flavourEn: 'After fireworks',
    flavourZh: '十一煙花後',
    density: 10,
    timer: 23,
    mix: {
      normal: 2,
      angry: 7,
      luggage: 5,
      family: 3,
      couple: 2,
      stench: 2,
      brat: 1,
    },
    pressure: 1.6,
    playable: true,
  },
];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function playableLevels(): LevelDef[] {
  return LEVELS.filter((l) => l.playable);
}

/** How many agents to spawn from density 0–10 */
export function crowdCount(density: number): number {
  return Math.round(6 + density * 3.2);
}
