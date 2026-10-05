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
  { id: 'sheung-wan', realEn: 'Sheung Wan', realZh: '上環', displayEn: 'Sheung Huan', displayZh: '上圜', displayJa: 'ションファン' },
  { id: 'fortress-hill', realEn: 'Fortress Hill', realZh: '炮台山', displayEn: 'Fortress Knoll', displayZh: '炮台崗', displayJa: 'ほうだいこう' },
  { id: 'tai-koo', realEn: 'Tai Koo', realZh: '太古', displayEn: 'Tai Gu', displayZh: '太故', displayJa: 'タイグ' },
  { id: 'quarry-bay', realEn: 'Quarry Bay', realZh: '鰂魚涌', displayEn: 'Carp Stream', displayZh: '鯽魚涌', displayJa: 'カープストリーム' },
  { id: 'north-point', realEn: 'North Point', realZh: '北角', displayEn: 'North Gok', displayZh: '北覺', displayJa: 'ノースゴク' },
  // Owner-specified
  { id: 'causeway-bay', realEn: 'Causeway Bay', realZh: '銅鑼灣', displayEn: 'Causeway Bay Village', displayZh: '銅鑼灣村', displayJa: 'トングロワンソン' },
  { id: 'tin-hau', realEn: 'Tin Hau', realZh: '天后', displayEn: 'Tin Hau After', displayZh: '天後', displayJa: 'ティンハウ' },
  { id: 'wan-chai', realEn: 'Wan Chai', realZh: '灣仔', displayEn: 'Wan Jai', displayZh: '灣崽', displayJa: 'ワンジャイ' },
  { id: 'admiralty', realEn: 'Admiralty', realZh: '金鐘', displayEn: 'Gold Bell', displayZh: '金鍾', displayJa: 'きんしょう' },
  { id: 'central', realEn: 'Central', realZh: '中環', displayEn: 'Central Ring', displayZh: '中圜', displayJa: 'チュンファン' },
  { id: 'hong-kong', realEn: 'Hong Kong', realZh: '香港', displayEn: 'Hong City', displayZh: '香城', displayJa: 'ホンシティ' },
  { id: 'kowloon', realEn: 'Kowloon', realZh: '九龍', displayEn: 'Nine Dragons', displayZh: '九朧', displayJa: 'ナインドラゴンズ' },
  { id: 'olympic', realEn: 'Olympic', realZh: '奧運', displayEn: 'Ou Wan', displayZh: '澳運', displayJa: 'オウワン' },
  // Owner-specified
  { id: 'mong-kok', realEn: 'Mong Kok', realZh: '旺角', displayEn: 'Mong Gok', displayZh: '望角', displayJa: 'モンゴク' },
  // Owner-specified
  { id: 'prince-edward', realEn: 'Prince Edward', realZh: '太子', displayEn: 'Tai Jai', displayZh: '太仔', displayJa: 'タイジャイ' },
  { id: 'sham-shui-po', realEn: 'Sham Shui Po', realZh: '深水埗', displayEn: 'Sham Shui Pooh', displayZh: '深水埔', displayJa: 'サムスイプー' },
  { id: 'mei-foo', realEn: 'Mei Foo', realZh: '美孚', displayEn: 'Mei Foo Float', displayZh: '美浮', displayJa: 'メイフー' },
  { id: 'tsuen-wan', realEn: 'Tsuen Wan', realZh: '荃灣', displayEn: 'Chuen Wan', displayZh: '全灣', displayJa: 'チュエンワン' },
  { id: 'hung-hom', realEn: 'Hung Hom', realZh: '紅磡', displayEn: 'Hung Hom Chop', displayZh: '紅砍', displayJa: 'ホンハム' },
  { id: 'east-tst', realEn: 'East Tsim Sha Tsui', realZh: '尖東', displayEn: 'East Point Winter', displayZh: '尖冬', displayJa: 'チムトン' },
  { id: 'tst', realEn: 'Tsim Sha Tsui', realZh: '尖沙咀', displayEn: 'Tsim Sha Mouth', displayZh: '尖沙嘴', displayJa: 'チムシャーツィ' },
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
