/**
 * Per-station visual themes for the platform (wall/pillar tile colour, accents,
 * lettering). Colours approximate the mosaic / panel colours riders recognise
 * on Island / Tsuen Wan / etc. — approximate hex values only; no logos or
 * official artwork. Stations marked `approx: true` use a plausible colour
 * when published references were unclear or the real finish is mostly grey.
 * Keys are REAL English names (dev); `themeFor()` accepts parody display names
 * via `themeKeyFor`.
 */
import { LINE_COLORS, linesFor, type LineId } from './lines';
import { themeKeyFor } from './stations';

export type LetteringStyle = 'sans' | 'serif';

export interface StationTheme {
  /** Primary wall / pillar tile colour (hex). */
  wall: string;
  /** Secondary / accent band colour (hex). */
  accent: string;
  /** Primary HCR line colour for this station. */
  line: string;
  lineId: LineId;
  /** Sign lettering: serif ≈ calligraphic / older stations; sans ≈ modern lines. */
  lettering: LetteringStyle;
  /** True when the wall colour is a best-guess rather than a well-known tile. */
  approx?: boolean;
}

/** Darken/lighten a #rrggbb hex for pillar checkers / bands. */
export function shade(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Readable ink on a wall colour (white on dark, navy on light). */
export function inkFor(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#1b2a4e' : '#ffffff';
}

function theme(
  wall: string,
  accent: string,
  lettering: LetteringStyle,
  stationEn: string,
  approx = false,
): StationTheme {
  const ids = linesFor(stationEn);
  const lineId = ids[0];
  return {
    wall,
    accent,
    line: LINE_COLORS[lineId],
    lineId,
    lettering,
    ...(approx ? { approx: true } : {}),
  };
}

/**
 * Keyed by REAL English station name (dev). Look up with `themeFor(displayEn)`.
 * Wall colours from public fan colour charts — approximate only.
 */
export const STATION_THEMES: Record<string, StationTheme> = {
  // Island Line (classic mosaic)
  'Sheung Wan': theme('#f8d29d', '#c9a06e', 'serif', 'Sheung Wan'),
  'Fortress Hill': theme('#1fb27f', '#0e7a55', 'serif', 'Fortress Hill'),
  'Tai Koo': theme('#b2103e', '#7a0a2a', 'serif', 'Tai Koo'),
  'Quarry Bay': theme('#077e7a', '#045552', 'serif', 'Quarry Bay'),
  'North Point': theme('#f67e2a', '#c45a12', 'serif', 'North Point'),
  'Causeway Bay': theme('#f8c9cb', '#d49a9e', 'serif', 'Causeway Bay'),
  'Tin Hau': theme('#f47a25', '#c45a12', 'serif', 'Tin Hau'),
  'Wan Chai': theme('#d7df3f', '#9aa812', 'serif', 'Wan Chai'),
  Admiralty: theme('#4dc7ec', '#1a8fb3', 'serif', 'Admiralty'),
  Central: theme('#c41832', '#8a1022', 'serif', 'Central'),

  // Airport / Tung Chung corridor (grey / cool modern)
  'Hong Kong': theme('#e8e9ec', '#9aa0a8', 'sans', 'Hong Kong'),  // airport-grey family
  Kowloon: theme('#c5c4c9', '#8a8990', 'sans', 'Kowloon'),
  Olympic: theme('#6dade2', '#3a7eb0', 'sans', 'Olympic', true),

  // Tsuen Wan Line
  'Mong Kok': theme('#be3223', '#8a1e14', 'serif', 'Mong Kok'),
  'Prince Edward': theme('#b8a1a9', '#7a6570', 'serif', 'Prince Edward'),
  'Sham Shui Po': theme('#078e82', '#045e56', 'serif', 'Sham Shui Po'),
  'Mei Foo': theme('#098ec4', '#05668c', 'serif', 'Mei Foo'),
  'Tsuen Wan': theme('#c41832', '#8a1022', 'serif', 'Tsuen Wan'),
  'Tsim Sha Tsui': theme('#ffe901', '#2b2b2b', 'serif', 'Tsim Sha Tsui'),

  // East Rail / Tuen Ma
  'Hung Hom': theme('#f45f7c', '#b03050', 'sans', 'Hung Hom', true),
  'East Tsim Sha Tsui': theme('#ffe901', '#c4b200', 'sans', 'East Tsim Sha Tsui'),
};

const FALLBACK: StationTheme = {
  wall: '#c8102e',
  accent: '#f4f4f2',
  line: LINE_COLORS.twl,
  lineId: 'twl',
  lettering: 'sans',
  approx: true,
};

export function themeFor(stationEn: string): StationTheme {
  const key = themeKeyFor(stationEn);
  return STATION_THEMES[key] ?? { ...FALLBACK, line: LINE_COLORS[linesFor(stationEn)[0]], lineId: linesFor(stationEn)[0] };
}

/** CSS font-family stack once the subset woff2 files are loaded. */
export const FONT_SANS = "'ExitRush Sans', 'Noto Sans HK', 'PingFang HK', system-ui, sans-serif";
export const FONT_SERIF = "'ExitRush Serif', 'Noto Serif HK', 'Songti TC', serif";

export function fontStack(style: LetteringStyle): string {
  return style === 'serif' ? FONT_SERIF : FONT_SANS;
}
