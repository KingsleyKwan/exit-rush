/**
 * Line-colour data for station tiles and the in-car strip map.
 * Colours evoke familiar metro line hues riders recognise; no logos or
 * official artwork. Line *names* are fictional 香城鐵路 parodies.
 */
import { themeKeyFor } from './stations';

export type LineId = 'isl' | 'twl' | 'ktl' | 'tcl' | 'ael' | 'eal' | 'tml' | 'sil' | 'tkl';

export const LINE_COLORS: Record<LineId, string> = {
  isl: '#0075c2', // 香島綫 blue
  twl: '#e2231a', // 荃直綫 red
  ktl: '#00a040', // 觀濱綫 green
  tcl: '#f38b00', // 東沖綫 orange
  ael: '#00888a', // 香城空港綫 teal
  eal: '#5eb6e4', // 東軌綫 light blue
  tml: '#9a3b26', // 屯碼綫 brown
  sil: '#b5bd00', // 南香島綫 lime
  tkl: '#7d499d', // 將軍綫 purple
};

/** Parody display names for lines (UI / docs). */
export const LINE_NAMES: Record<LineId, { en: string; zh: string }> = {
  isl: { en: 'Heung Island Line', zh: '香島綫' },
  twl: { en: 'Chuen Jik Line', zh: '荃直綫' },
  ktl: { en: 'Kun Tong Line', zh: '觀濱綫' },
  tcl: { en: 'Tung Chong Line', zh: '東沖綫' },
  ael: { en: 'HCR Airport Line', zh: '香城空港綫' },
  eal: { en: 'East Track Line', zh: '東軌綫' },
  tml: { en: 'Tuen Ma Code Line', zh: '屯碼綫' },
  sil: { en: 'South Heung Island', zh: '南香島綫' },
  tkl: { en: 'General Bay Line', zh: '將軍綫' },
};

/** Lines serving each station — keyed by REAL English name (dev). */
const STATION_LINES: Record<string, LineId[]> = {
  'Sheung Wan': ['isl'],
  'Fortress Hill': ['isl'],
  'Tai Koo': ['isl'],
  'Quarry Bay': ['isl', 'tkl'],
  'North Point': ['isl', 'tkl'],
  'Causeway Bay': ['isl'],
  'Tin Hau': ['isl'],
  'Wan Chai': ['isl'],
  Admiralty: ['isl', 'twl', 'sil', 'eal'],
  Central: ['isl', 'twl'],
  'Hong Kong': ['tcl', 'ael'],
  Kowloon: ['tcl', 'ael'],
  Olympic: ['tcl'],
  'Mong Kok': ['twl', 'ktl'],
  'Prince Edward': ['twl', 'ktl'],
  'Sham Shui Po': ['twl'],
  'Mei Foo': ['twl', 'tml'],
  'Tsuen Wan': ['twl'],
  'Hung Hom': ['eal', 'tml'],
  'East Tsim Sha Tsui': ['tml'],
  'Tsim Sha Tsui': ['twl'],
  'Yuen Long': ['tml'],
  'Long Ping': ['tml'],
  // v0.7 — L31–99
  'Sai Ying Pun': ['isl'],
  'HKU': ['isl'],
  'Kennedy Town': ['isl'],
  'Sai Wan Ho': ['isl'],
  'Shau Kei Wan': ['isl'],
  'Heng Fa Chuen': ['isl'],
  'Chai Wan': ['isl'],
  'Yau Ma Tei': ['twl', 'ktl'],
  'Jordan': ['twl'],
  'Cheung Sha Wan': ['twl'],
  'Lai King': ['twl', 'tcl'],
  'Kwai Fong': ['twl'],
  'Kwai Hing': ['twl'],
  'Tai Wo Hau': ['twl'],
  'Tsuen Wan West': ['tml'],
  'Shek Kip Mei': ['ktl'],
  'Kowloon Tong': ['ktl', 'eal'],
  'Lok Fu': ['ktl'],
  'Wong Tai Sin': ['ktl'],
  'Diamond Hill': ['ktl', 'tml'],
  'Choi Hung': ['ktl'],
  'Kowloon Bay': ['ktl'],
  'Ngau Tau Kok': ['ktl'],
  'Kwun Tong': ['ktl'],
  'Lam Tin': ['ktl'],
  'Yau Tong': ['ktl', 'tkl'],
  'Tiu Keng Leng': ['ktl', 'tkl'],
  'Tseung Kwan O': ['tkl'],
  'Hang Hau': ['tkl'],
  'Po Lam': ['tkl'],
  'LOHAS Park': ['tkl'],
  'Whampoa': ['ktl'],
  'Ho Man Tin': ['ktl', 'tml'],
  'To Kwa Wan': ['tml'],
  'Sung Wong Toi': ['tml'],
  'Kai Tak': ['tml'],
  'Hin Keng': ['tml'],
  'Che Kung Temple': ['tml'],
  'Sha Tin Wai': ['tml'],
  'City One': ['tml'],
  'Shek Mun': ['tml'],
  'Tai Shui Hang': ['tml'],
  'Heng On': ['tml'],
  'Ma On Shan': ['tml'],
  'Wu Kai Sha': ['tml'],
  'Nam Cheong': ['tml', 'tcl'],
  'Austin': ['tml'],
  'Kam Sheung Road': ['tml'],
  'Tin Shui Wai': ['tml'],
  'Siu Hong': ['tml'],
  'Tuen Mun': ['tml'],
  'Mong Kok East': ['eal'],
  'Tai Wai': ['eal', 'tml'],
  'Sha Tin': ['eal'],
  'Fo Tan': ['eal'],
  'Racecourse': ['eal'],
  'University': ['eal'],
  'Tai Po Market': ['eal'],
  'Tai Wo': ['eal'],
  'Fanling': ['eal'],
  'Sheung Shui': ['eal'],
  'Lo Wu': ['eal'],
  'Lok Ma Chau': ['eal'],
  'Tsing Yi': ['tcl', 'ael'],
  'Sunny Bay': ['tcl'],
  'Tung Chung': ['tcl'],
  'Airport': ['ael'],
  'AsiaWorld-Expo': ['ael'],
  'Ocean Park': ['sil'],
};

export function linesFor(stationEn: string): LineId[] {
  const key = themeKeyFor(stationEn);
  return STATION_LINES[key] ?? ['twl'];
}

export function lineColor(stationEn: string): string {
  return LINE_COLORS[linesFor(stationEn)[0]];
}
