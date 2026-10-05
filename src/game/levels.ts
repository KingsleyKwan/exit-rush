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
    stationEn: 'Sheung Yuen',
    stationZh: '上圓',
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
    stationEn: 'Bastion Hill',
    stationZh: '堡壘山',
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
    stationEn: 'Gu Ching',
    stationZh: '古城',
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
    stationEn: 'Koi Stream',
    stationZh: '鯉魚涌',
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
    stationEn: 'North Spot',
    stationZh: '北點',
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
    stationEn: 'Tin Wong',
    stationZh: '天王',
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
    stationEn: 'Wan Neoi',
    stationZh: '灣女',
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
    stationEn: 'Silver Bell',
    stationZh: '銀鐘',
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
    stationEn: 'Central Yuen',
    stationZh: '中圓',
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
    stationEn: 'Nine-Head Dragon',
    stationZh: '九頭龍',
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
    stationEn: 'Aa Wan',
    stationZh: '亞運',
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
    stationEn: 'Gong Jyu',
    stationZh: '公主',
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
    stationEn: 'Yam Chow',
    stationZh: '欽洲',
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
    stationEn: 'Lai Chi Gok',
    stationZh: '荔枝角',
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
    stationEn: 'Chuen Jik',
    stationZh: '荃直',
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
    stationEn: 'Maan Gwok',
    stationZh: '萬國',
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
    stationEn: 'Dun East',
    stationZh: '頓東',
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
    stationEn: 'Dun Sha Mouth',
    stationZh: '頓沙嘴',
    flavourEn: 'After fireworks',
    flavourZh: '十一煙花後',
    density: 10,
    timer: 28,
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
