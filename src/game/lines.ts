/**
 * Generic line-colour data for station tiles and the in-car strip map.
 * Colours approximate the public line colours riders recognise; no logos,
 * line names or official artwork are used.
 */
export type LineId = 'isl' | 'twl' | 'ktl' | 'tcl' | 'ael' | 'eal' | 'tml' | 'sil' | 'tkl';

export const LINE_COLORS: Record<LineId, string> = {
  isl: '#0075c2', // blue
  twl: '#e2231a', // red
  ktl: '#00a040', // green
  tcl: '#f38b00', // orange
  ael: '#00888a', // teal
  eal: '#5eb6e4', // light blue
  tml: '#9a3b26', // brown
  sil: '#b5bd00', // lime
  tkl: '#7d499d', // purple
};

/** Lines serving each station (first = primary colour), keyed by English name. */
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
};

export function linesFor(stationEn: string): LineId[] {
  return STATION_LINES[stationEn] ?? ['twl'];
}

export function lineColor(stationEn: string): string {
  return LINE_COLORS[linesFor(stationEn)[0]];
}
