/**
 * Fictional 香城鐵路 (Hong City Rail / HCR) station catalogue.
 *
 * Display names are playful parodies of well-known Hong Kong metro stops.
 * `realEn` / `realZh` are DEV-ONLY references for theme colours & docs —
 * never shown in UI, signs, or store text.
 */
export interface StationDef {
  /** Stable id (kebab of the real English name). */
  id: string;
  /** DEV ONLY — real-world station being parodied. */
  realEn: string;
  /** DEV ONLY — real-world Chinese name. */
  realZh: string;
  /** Player-facing English (parody). */
  displayEn: string;
  /** Player-facing Chinese (parody). */
  displayZh: string;
  /** Japanese reading used in JR-style announce scripts (hiragana/katakana). */
  displayJa: string;
}

/**
 * All stations used by levels.ts. Colours/fonts still follow `realEn`
 * via stationThemes.ts.
 */
export const STATIONS: StationDef[] = [
  { id: 'sheung-wan', realEn: 'Sheung Wan', realZh: '上環', displayEn: 'Sheung Yuen', displayZh: '上圓', displayJa: 'ションユエン' },
  { id: 'fortress-hill', realEn: 'Fortress Hill', realZh: '炮台山', displayEn: 'Bastion Hill', displayZh: '堡壘山', displayJa: 'とりでやま' },
  { id: 'tai-koo', realEn: 'Tai Koo', realZh: '太古', displayEn: 'Gu Ching', displayZh: '古城', displayJa: 'こじょう' },
  { id: 'quarry-bay', realEn: 'Quarry Bay', realZh: '鰂魚涌', displayEn: 'Koi Stream', displayZh: '鯉魚涌', displayJa: 'こいストリーム' },
  { id: 'north-point', realEn: 'North Point', realZh: '北角', displayEn: 'North Spot', displayZh: '北點', displayJa: 'ノーススポット' },
  // Owner-specified
  { id: 'causeway-bay', realEn: 'Causeway Bay', realZh: '銅鑼灣', displayEn: 'Causeway Bay Village', displayZh: '銅鑼灣村', displayJa: 'トングロワンソン' },
  { id: 'tin-hau', realEn: 'Tin Hau', realZh: '天后', displayEn: 'Tin Wong', displayZh: '天王', displayJa: 'ティンウォン' },
  { id: 'wan-chai', realEn: 'Wan Chai', realZh: '灣仔', displayEn: 'Wan Neoi', displayZh: '灣女', displayJa: 'ワンノイ' },
  { id: 'admiralty', realEn: 'Admiralty', realZh: '金鐘', displayEn: 'Silver Bell', displayZh: '銀鐘', displayJa: 'ぎんしょう' },
  { id: 'central', realEn: 'Central', realZh: '中環', displayEn: 'Central Yuen', displayZh: '中圓', displayJa: 'チュンユエン' },
  { id: 'hong-kong', realEn: 'Hong Kong', realZh: '香港', displayEn: 'Hong City', displayZh: '香城', displayJa: 'ホンシティ' },
  { id: 'kowloon', realEn: 'Kowloon', realZh: '九龍', displayEn: 'Nine-Head Dragon', displayZh: '九頭龍', displayJa: 'ナインヘッドドラゴン' },
  { id: 'olympic', realEn: 'Olympic', realZh: '奧運', displayEn: 'Aa Wan', displayZh: '亞運', displayJa: 'アーワン' },
  // Owner-specified
  { id: 'mong-kok', realEn: 'Mong Kok', realZh: '旺角', displayEn: 'Mong Gok', displayZh: '望角', displayJa: 'モンゴク' },
  // Owner-specified
  { id: 'prince-edward', realEn: 'Prince Edward', realZh: '太子', displayEn: 'Gong Jyu', displayZh: '公主', displayJa: 'コンジュ' },
  { id: 'sham-shui-po', realEn: 'Sham Shui Po', realZh: '深水埗', displayEn: 'Yam Chow', displayZh: '欽洲', displayJa: 'ヤムチャウ' },
  { id: 'mei-foo', realEn: 'Mei Foo', realZh: '美孚', displayEn: 'Lai Chi Gok', displayZh: '荔枝角', displayJa: 'ライチーゴク' },
  { id: 'tsuen-wan', realEn: 'Tsuen Wan', realZh: '荃灣', displayEn: 'Chuen Jik', displayZh: '荃直', displayJa: 'チュエンジック' },
  { id: 'hung-hom', realEn: 'Hung Hom', realZh: '紅磡', displayEn: 'Maan Gwok', displayZh: '萬國', displayJa: 'マーングォック' },
  { id: 'east-tst', realEn: 'East Tsim Sha Tsui', realZh: '尖東', displayEn: 'Dun East', displayZh: '頓東', displayJa: 'トン東' },
  { id: 'tst', realEn: 'Tsim Sha Tsui', realZh: '尖沙咀', displayEn: 'Dun Sha Mouth', displayZh: '頓沙嘴', displayJa: 'トンシャーツィ' },
];

/** Extra parody names (not in current levels) kept for docs / future levels. */
export const STATIONS_EXTRA: StationDef[] = [
  // Owner-specified
  { id: 'yuen-long', realEn: 'Yuen Long', realZh: '元朗', displayEn: 'Yuen Kwok', displayZh: '元國', displayJa: 'ユエンコク' },
  { id: 'long-ping', realEn: 'Long Ping', realZh: '朗屏', displayEn: 'Long Ping Flat', displayZh: '塱平', displayJa: 'ロンピン' },
];

const byRealEn = new Map(STATIONS.map((s) => [s.realEn, s]));
const byDisplayEn = new Map(STATIONS.map((s) => [s.displayEn, s]));

export function stationByRealEn(realEn: string): StationDef | undefined {
  return byRealEn.get(realEn);
}

export function stationByDisplayEn(displayEn: string): StationDef | undefined {
  return byDisplayEn.get(displayEn);
}

/** Resolve theme / line lookup key (real English) from a display or real name. */
export function themeKeyFor(stationEn: string): string {
  return stationByDisplayEn(stationEn)?.realEn ?? stationByRealEn(stationEn)?.realEn ?? stationEn;
}

/** Operator branding (fictional). */
export const OPERATOR_ZH = '香城鐵路';
export const OPERATOR_EN = 'Hong City Rail';
export const OPERATOR_SHORT = 'HCR';
