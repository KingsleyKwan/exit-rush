/**
 * Per-station visual themes for the platform (wall/pillar tile colour, accents,
 * lettering). Colours approximate the mosaic / panel colours riders recognise
 * on 香島 / 荃直 / etc. — approximate hex values only; no logos or
 * official artwork. Stations marked `approx: true` use a plausible colour
 * when published references were unclear or the real finish is mostly grey.
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
 * Keyed by REAL English station names (dev). `themeFor(displayEn)` resolves via
 * `themeKeyFor`. Wall colours from public fan colour charts — approximate only.
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

  // West / Tuen Ma corridor (v0.5)
  'Yuen Long': theme('#9a3b26', '#6b2818', 'sans', 'Yuen Long'),
  'Long Ping': theme('#c4783a', '#8a5020', 'sans', 'Long Ping'),

  // v0.7 — L31–99: plausible per-station tile colours (approx); serif = older urban lines, sans = newer lines
  'Sai Ying Pun': theme('#7c5aa6', '#523a75', 'sans', 'Sai Ying Pun', true),
  'HKU': theme('#7ab648', '#4f7d2b', 'sans', 'HKU', true),
  'Kennedy Town': theme('#e0a526', '#a9761a', 'sans', 'Kennedy Town', true),
  'Sai Wan Ho': theme('#d84f61', '#9c3241', 'serif', 'Sai Wan Ho', true),
  'Shau Kei Wan': theme('#e8c547', '#b0921f', 'serif', 'Shau Kei Wan', true),
  'Heng Fa Chuen': theme('#e4789a', '#a84b68', 'serif', 'Heng Fa Chuen', true),
  'Chai Wan': theme('#3b78c1', '#25538a', 'serif', 'Chai Wan', true),
  'Yau Ma Tei': theme('#9aa3ad', '#646c75', 'serif', 'Yau Ma Tei', true),
  'Jordan': theme('#6fb24f', '#467a2f', 'serif', 'Jordan', true),
  'Cheung Sha Wan': theme('#f2e07a', '#b9a640', 'serif', 'Cheung Sha Wan', true),
  'Lai King': theme('#f08a3c', '#b25e20', 'serif', 'Lai King', true),
  'Kwai Fong': theme('#d9542c', '#9b3618', 'serif', 'Kwai Fong', true),
  'Kwai Hing': theme('#2f8a58', '#1d5e3a', 'serif', 'Kwai Hing', true),
  'Tai Wo Hau': theme('#8fcf6b', '#5c9541', 'serif', 'Tai Wo Hau', true),
  'Tsuen Wan West': theme('#c9c2b8', '#8d857a', 'sans', 'Tsuen Wan West', true),
  'Shek Kip Mei': theme('#6f8fb0', '#4a6684', 'serif', 'Shek Kip Mei', true),
  'Kowloon Tong': theme('#2d5ea8', '#1d3f73', 'serif', 'Kowloon Tong', true),
  'Lok Fu': theme('#f2c230', '#b38c12', 'serif', 'Lok Fu', true),
  'Wong Tai Sin': theme('#e88a2a', '#a85f15', 'serif', 'Wong Tai Sin', true),
  'Diamond Hill': theme('#3a3d44', '#1f2126', 'serif', 'Diamond Hill', true),
  'Choi Hung': theme('#e85a4f', '#a63a31', 'serif', 'Choi Hung', true),
  'Kowloon Bay': theme('#52a65a', '#357a3d', 'serif', 'Kowloon Bay', true),
  'Ngau Tau Kok': theme('#c79a6b', '#8f6a42', 'serif', 'Ngau Tau Kok', true),
  'Kwun Tong': theme('#1f6fb5', '#134b7d', 'serif', 'Kwun Tong', true),
  'Lam Tin': theme('#3d6fa8', '#284b74', 'serif', 'Lam Tin', true),
  'Yau Tong': theme('#c4a2d6', '#8a6aa0', 'sans', 'Yau Tong', true),
  'Tiu Keng Leng': theme('#a07cc5', '#6f528e', 'sans', 'Tiu Keng Leng', true),
  'Tseung Kwan O': theme('#e0c060', '#a68a32', 'sans', 'Tseung Kwan O', true),
  'Hang Hau': theme('#d77a4a', '#9b522c', 'sans', 'Hang Hau', true),
  'Po Lam': theme('#c2d36a', '#8a993d', 'sans', 'Po Lam', true),
  'LOHAS Park': theme('#8fd0c8', '#5a958e', 'sans', 'LOHAS Park', true),
  'Whampoa': theme('#4ab0b8', '#2c7c83', 'sans', 'Whampoa', true),
  'Ho Man Tin': theme('#e7a33e', '#a97320', 'sans', 'Ho Man Tin', true),
  'To Kwa Wan': theme('#7aa66b', '#527a45', 'sans', 'To Kwa Wan', true),
  'Sung Wong Toi': theme('#b58e5a', '#7d6038', 'sans', 'Sung Wong Toi', true),
  'Kai Tak': theme('#8da7c8', '#5d7696', 'sans', 'Kai Tak', true),
  'Hin Keng': theme('#c6d9e6', '#8ea3b3', 'sans', 'Hin Keng', true),
  'Che Kung Temple': theme('#d9a441', '#9e7424', 'sans', 'Che Kung Temple', true),
  'Sha Tin Wai': theme('#b9c96b', '#82913f', 'sans', 'Sha Tin Wai', true),
  'City One': theme('#a5b6c9', '#718294', 'sans', 'City One', true),
  'Shek Mun': theme('#8b8f98', '#5c6068', 'sans', 'Shek Mun', true),
  'Tai Shui Hang': theme('#e07a4f', '#a2502e', 'sans', 'Tai Shui Hang', true),
  'Heng On': theme('#a4d1a1', '#6d9a6b', 'sans', 'Heng On', true),
  'Ma On Shan': theme('#7fa0c4', '#55728f', 'sans', 'Ma On Shan', true),
  'Wu Kai Sha': theme('#6dbbd0', '#438797', 'sans', 'Wu Kai Sha', true),
  'Nam Cheong': theme('#d2c39a', '#988a62', 'sans', 'Nam Cheong', true),
  'Austin': theme('#c9b3d9', '#8f78a3', 'sans', 'Austin', true),
  'Kam Sheung Road': theme('#9fc77a', '#6c9350', 'sans', 'Kam Sheung Road', true),
  'Tin Shui Wai': theme('#c7a7d6', '#8d6e9e', 'sans', 'Tin Shui Wai', true),
  'Siu Hong': theme('#e6b89c', '#ab8064', 'sans', 'Siu Hong', true),
  'Tuen Mun': theme('#b88a5a', '#7f5c37', 'sans', 'Tuen Mun', true),
  'Mong Kok East': theme('#7fc3e6', '#4b8fb1', 'sans', 'Mong Kok East', true),
  'Tai Wai': theme('#d0ced4', '#94929a', 'sans', 'Tai Wai', true),
  'Sha Tin': theme('#c7d6e8', '#8fa0b4', 'sans', 'Sha Tin', true),
  'Fo Tan': theme('#c8a08a', '#8f6c58', 'sans', 'Fo Tan', true),
  'Racecourse': theme('#5aa96a', '#3b7a49', 'sans', 'Racecourse', true),
  'University': theme('#4a8fc2', '#2d6491', 'sans', 'University', true),
  'Tai Po Market': theme('#b9d38a', '#82a058', 'sans', 'Tai Po Market', true),
  'Tai Wo': theme('#e8b4c4', '#ad7c8d', 'sans', 'Tai Wo', true),
  'Fanling': theme('#a3c96f', '#6f9444', 'sans', 'Fanling', true),
  'Sheung Shui': theme('#78b9d8', '#4a86a3', 'sans', 'Sheung Shui', true),
  'Lo Wu': theme('#a0a8b4', '#6a717c', 'sans', 'Lo Wu', true),
  'Lok Ma Chau': theme('#c4b48f', '#8b7d5c', 'sans', 'Lok Ma Chau', true),
  'Tsing Yi': theme('#6aa5c9', '#437595', 'sans', 'Tsing Yi', true),
  'Sunny Bay': theme('#9ad1d9', '#629aa2', 'sans', 'Sunny Bay', true),
  'Tung Chung': theme('#e9a95b', '#ad7631', 'sans', 'Tung Chung', true),
  'Airport': theme('#e6e8ec', '#9aa0a8', 'sans', 'Airport', true),
  'AsiaWorld-Expo': theme('#d6d9de', '#959aa2', 'sans', 'AsiaWorld-Expo', true),
  'Ocean Park': theme('#2fa3c4', '#1d7088', 'sans', 'Ocean Park', true),
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
