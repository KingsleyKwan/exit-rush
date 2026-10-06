/**
 * Authored icon set (v0.3) — bold, rounded, filled, 48×48 grid.
 *
 * Colour roles (see `.ico` rules in style.css):
 *   currentColor = main shape · `.w` white detail · `.k` ink detail · `.a` HCR-red accent
 *   `.ws` / `.ks` / `.as` = the same colours as round strokes.
 * Inline SVG keeps them crisp at any DPR, themable via CSS and free of extra requests.
 */

const S = (w: number) => `stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

const P: Record<string, string> = {
  door: `<rect x="5" y="4" width="38" height="40" rx="7" fill="currentColor"/><rect x="9.5" y="9" width="12.5" height="31" rx="2.5" class="w"/><rect x="26" y="9" width="12.5" height="31" rx="2.5" class="w"/><rect x="12.5" y="12.5" width="6.5" height="11" rx="2" class="k"/><rect x="29" y="12.5" width="6.5" height="11" rx="2" class="k"/><path d="M16 31h-4m24 0h-4" class="as" ${S(3)}/>`,
  stamina: `<path d="M24 42S7.5 32.3 7.5 19.8A9.3 9.3 0 0 1 24 13.6a9.3 9.3 0 0 1 16.5 6.2C40.5 32.3 24 42 24 42z" fill="currentColor"/><path d="M10.5 25h7.5l3-6 4.5 11 3-5h9" class="ws" ${S(3.6)}/>`,
  timer: `<rect x="18" y="3" width="12" height="6" rx="2.5" fill="currentColor"/><path d="M36.5 10.5l3 3" stroke="currentColor" ${S(4.5)}/><circle cx="24" cy="27.5" r="16.5" fill="currentColor"/><circle cx="24" cy="27.5" r="12" class="w"/><path d="M24 27.5v-8" class="as" ${S(4)}/><path d="M24 27.5l5 3.5" class="ks" ${S(3.4)}/><circle cx="24" cy="27.5" r="2.6" class="k"/>`,
  shove: `<path d="M3.5 17h7M2 25h6M3.5 33h7" stroke="currentColor" opacity=".55" ${S(3.4)}/><path d="M14 19.5a5.5 5.5 0 0 1 5.5-5.5h16a6 6 0 0 1 6 6v10c0 7.7-6.3 14-14 14H25c-6.1 0-11-4.9-11-11z" fill="currentColor"/><path d="M22.5 14.5v7m7-7v7m7-6v6" class="ks" ${S(2.6)}/><path d="M14 26.5h11.5a4.2 4.2 0 0 1 0 8.4H21" class="ks" ${S(2.8)}/>`,
  str: `<path d="M6 9.5c0 6.5 4 11 9.5 11M42 9.5c0 6.5-4 11-9.5 11" stroke="currentColor" ${S(5)}/><path d="M13 19h22l-1.6 13.5C32.8 38.5 28.8 43 24 43s-8.8-4.5-9.4-10.5z" fill="currentColor"/><path d="M8.5 21.5l5 1.5m26-1.5l-5 1.5" stroke="currentColor" ${S(4)}/><ellipse cx="24" cy="35.5" rx="7.5" ry="5.2" class="w"/><circle cx="21" cy="35.5" r="1.7" class="k"/><circle cx="27" cy="35.5" r="1.7" class="k"/><circle cx="18.5" cy="26" r="2.2" class="w"/><circle cx="29.5" cy="26" r="2.2" class="w"/>`,
  spd: `<path d="M3.5 19h8M2 27h6M4.5 35h7" stroke="currentColor" opacity=".55" ${S(3.4)}/><path d="M30 3L13 26.5h11.5L21 45l19-25.5H28.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  wis: `<path d="M3 24c5.2-9.4 12.4-14.5 21-14.5S39.8 14.6 45 24c-5.2 9.4-12.4 14.5-21 14.5S8.2 33.4 3 24z" fill="currentColor"/><circle cx="24" cy="24" r="9.5" class="w"/><circle cx="24" cy="24" r="5" class="k"/><circle cx="26" cy="21.8" r="1.8" class="w"/><path d="M24 3.5v3.5M11 7.5l2.2 2.8M37 7.5l-2.2 2.8" stroke="currentColor" ${S(3)}/>`,
  sta: `<path d="M24 6c-3 8-10 12-10 22a10 10 0 0 0 20 0c0-10-7-14-10-22z" fill="currentColor"/><path d="M16 40h16M18 44h12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M20 22h8M21 28h6" class="ws" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  skills: `<path d="M24 15v8.5M24 23.5L12.5 32M24 23.5L35.5 32" stroke="currentColor" ${S(4.2)}/><circle cx="24" cy="10" r="7" fill="currentColor"/><circle cx="12" cy="36" r="7" fill="currentColor"/><circle cx="36" cy="36" r="7" fill="currentColor"/><path d="M24 6.2l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" class="a"/><circle cx="24" cy="23.5" r="3.2" fill="currentColor"/>`,
  pause: `<rect x="11" y="8" width="9.5" height="32" rx="3.5" fill="currentColor"/><rect x="27.5" y="8" width="9.5" height="32" rx="3.5" fill="currentColor"/>`,
  play: `<path d="M15 8.6c0-2.3 2.5-3.7 4.5-2.5l20.3 15.4c1.8 1.3 1.8 3.9 0 5.2L19.5 42c-2 1.2-4.5-.2-4.5-2.5z" fill="currentColor"/>`,
  restart: `<path d="M38.5 28.5A15 15 0 1 1 33 12.6" stroke="currentColor" ${S(5.2)}/><path d="M28.5 4.5l9.5 7.5-9 6.8z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>`,
  home: `<path d="M5.5 22.5L24 6.5l18.5 16" stroke="currentColor" ${S(5)}/><path d="M10 21.5L24 9.5l14 12V40a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="currentColor"/><rect x="19.5" y="28" width="9" height="15" rx="2" class="a"/>`,
  quality: `<path d="M14 6h20l9 11-19 25L5 17z" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M5.5 17h37M18 6.5L24 17l6-10.5M24 17v24" class="ws" ${S(2.4)} opacity=".75"/>`,
  star: `<path d="M24 4.5l5.7 11.6 12.8 1.9-9.2 9 2.2 12.7L24 33.7l-11.5 6 2.2-12.7-9.2-9 12.8-1.9z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`,
  lock: `<path d="M15 21v-6a9 9 0 0 1 18 0v6" stroke="currentColor" ${S(5)}/><rect x="9" y="20" width="30" height="23" rx="5.5" fill="currentColor"/><circle cx="24" cy="30" r="3.5" class="k"/><path d="M24 31v5" class="ks" ${S(3.4)}/>`,
  check: `<path d="M9 25l10 10L39 13" stroke="currentColor" ${S(7)}/>`,
  crowd: `<circle cx="24" cy="13" r="7" fill="currentColor"/><path d="M12 42v-6a12 12 0 0 1 24 0v6z" fill="currentColor"/><circle cx="10" cy="19" r="5.2" fill="currentColor" opacity=".7"/><path d="M1.5 42v-3.5A8.5 8.5 0 0 1 13 30.6V42z" fill="currentColor" opacity=".7"/><circle cx="38" cy="19" r="5.2" fill="currentColor" opacity=".7"/><path d="M46.5 42v-3.5A8.5 8.5 0 0 0 35 30.6V42z" fill="currentColor" opacity=".7"/>`,
  legend: `<rect x="4" y="8" width="40" height="32" rx="6" fill="currentColor"/><circle cx="16" cy="21" r="5.5" class="w"/><path d="M8.5 34.5a7.5 7.5 0 0 1 15 0z" class="w"/><path d="M28 18h10M28 25h10M28 32h6" class="ws" ${S(3.4)}/>`,
  levels: `<rect x="5" y="5" width="16" height="16" rx="4.5" fill="currentColor"/><rect x="27" y="5" width="16" height="16" rx="4.5" fill="currentColor"/><rect x="5" y="27" width="16" height="16" rx="4.5" fill="currentColor"/><rect x="27" y="27" width="16" height="16" rx="4.5" class="a"/>`,
  next: `<path d="M12 9.5l14 14.5-14 14.5M26 9.5L40 24 26 38.5" stroke="currentColor" ${S(5.4)}/>`,
  back: `<path d="M29.5 9L14.5 24l15 15" stroke="currentColor" ${S(6)}/>`,
  close: `<path d="M12 12l24 24M36 12L12 36" stroke="currentColor" ${S(6)}/>`,
  tag: `<path d="M5 9a4 4 0 0 1 4-4h14.3a4 4 0 0 1 2.8 1.2l16 16a4 4 0 0 1 0 5.6L27.8 42.1a4 4 0 0 1-5.6 0l-16-16A4 4 0 0 1 5 23.3z" fill="currentColor"/><circle cx="15" cy="15" r="3.6" class="w"/>`,
  volume: `<path d="M4 16.5h8.5L24 7v34L12.5 31.5H4z" fill="currentColor"/><path d="M30 17.5c2.8 2.2 2.8 10.8 0 13M35.5 12.5c5.2 4.2 5.2 19.8 0 24" class="ws" ${S(3.4)}/>`,
  mute: `<path d="M4 16.5h8.5L24 7v34L12.5 31.5H4z" fill="currentColor"/><path d="M31 18l14 14M45 18L31 32" class="as" ${S(4.2)}/>`,
  station: `<circle cx="24" cy="20" r="14" fill="currentColor"/><circle cx="24" cy="20" r="6" class="w"/><path d="M24 34v10" stroke="currentColor" ${S(5)}/>`,
  drag: `<circle cx="22" cy="13" r="9.5" stroke="currentColor" ${S(3)} opacity=".5"/><path d="M18 13.5a4 4 0 0 1 8 0v11.2l7.6 1.9a4.3 4.3 0 0 1 3.2 4.8L35.4 44H19.5l-7.2-9.4a3.6 3.6 0 0 1 5.5-4.6l.2.2z" fill="currentColor"/>`,
  // ---- passenger type glyphs (used for UI badges and the 3D floating icons)
  kind_hero: `<circle cx="24" cy="13.5" r="8.5" fill="currentColor"/><path d="M9 43v-5a15 15 0 0 1 30 0v5z" fill="currentColor"/><path d="M19 25.5l5 8 5-8" class="ws" ${S(2.6)}/><rect x="20.5" y="32" width="7" height="8" rx="1.5" class="w"/>`,
  kind_normal: `<rect x="13" y="3.5" width="22" height="41" rx="6" fill="currentColor"/><rect x="16.5" y="9" width="15" height="25" rx="2" class="w"/><circle cx="24" cy="39" r="2.4" class="w"/><path d="M19.5 15h9M19.5 20h9M19.5 25h5" class="as" ${S(2.4)}/>`,
  kind_stench: `<path d="M12 42c-5-6 5-10 0-16s5-10 0-16M24 42c-5-6 5-10 0-16s5-10 0-16M36 42c-5-6 5-10 0-16s5-10 0-16" stroke="currentColor" ${S(4.6)}/>`,
  kind_family: `<circle cx="17" cy="11" r="6.5" fill="currentColor"/><path d="M6 43V31a11 11 0 0 1 22 0v12z" fill="currentColor"/><circle cx="35.5" cy="21.5" r="5" fill="currentColor"/><path d="M27.5 43v-6.5a8 8 0 0 1 16 0V43z" fill="currentColor"/>`,
  kind_brat: `<path d="M8 27a16 16 0 0 1 32 0z" fill="currentColor"/><path d="M4 27h40a3 3 0 0 1 0 6H8a4 4 0 0 1-4-4z" fill="currentColor"/><circle cx="24" cy="15" r="3" class="w"/><path d="M19 36.5h10v3a5 5 0 0 1-10 0z" class="a"/>`,
  kind_couple: `<path d="M24 43S4.5 31.5 4.5 17.4A10.4 10.4 0 0 1 24 12.3a10.4 10.4 0 0 1 19.5 5.1C43.5 31.5 24 43 24 43z" fill="currentColor"/><path d="M13 18.5a5 5 0 0 1 5-4.5" class="ws" ${S(3)} opacity=".8"/>`,
  kind_angry: `<path d="M20 5c0 7-1 11-6 13M28 5c0 7 1 11 6 13M20 43c0-7-1-11-6-13M28 43c0-7 1-11 6-13M5 20c7 0 11 1 13 6M5 28c7 0 11-1 13-6M43 20c-7 0-11 1-13 6M43 28c-7 0-11-1-13-6" stroke="currentColor" ${S(5.2)}/>`,
  kind_luggage: `<path d="M18 11V7.5A3.5 3.5 0 0 1 21.5 4h5A3.5 3.5 0 0 1 30 7.5V11" stroke="currentColor" ${S(3.6)}/><rect x="9" y="10" width="30" height="29" rx="6" fill="currentColor"/><path d="M18 15v19M30 15v19" class="ws" ${S(3)} opacity=".7"/><circle cx="15" cy="42" r="3.2" fill="currentColor"/><circle cx="33" cy="42" r="3.2" fill="currentColor"/>`,
  kind_squat: `<path d="M10 42c0-6 4-8 8-10V22a6 6 0 0 1 12 0v10c4 2 8 4 8 10z" fill="currentColor"/><circle cx="24" cy="14" r="7" fill="currentColor"/><path d="M14 42h20M12 38h24" class="ws" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  // 大聲公 Loudmouth: phone + sound waves.
  kind_loud: `<rect x="6" y="6" width="17" height="36" rx="4.5" fill="currentColor"/><rect x="9.5" y="11" width="10" height="21.5" rx="1.5" class="w"/><circle cx="14.5" cy="37.3" r="2.1" class="w"/><path d="M28.5 18.5c2.4 3 2.4 8 0 11M34 13.5c4.8 5.4 4.8 15.6 0 21M39.5 8.5c7 8 7 23 0 31" stroke="currentColor" ${S(3.8)}/>`,
};

export type IconName = keyof typeof P;

/** Inline SVG markup for one icon. `cls` adds classes (e.g. size modifiers). */
export function icon(name: IconName | string, cls = ''): string {
  const body = P[name] ?? P.star;
  return `<svg class="ico ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Language toggle glyph: a speech bubble showing the language you would switch TO. */
export function langIcon(label: string, cls = ''): string {
  const small = label.length > 1;
  return `<svg class="ico ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M9 5h30a6 6 0 0 1 6 6v19a6 6 0 0 1-6 6H22l-9.5 8v-8H9a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6z" fill="currentColor"/><text x="24" y="${small ? 26.5 : 28.5}" text-anchor="middle" font-size="${small ? 15 : 19}" font-weight="900" font-family="system-ui,'PingFang HK','Noto Sans HK','Noto Sans CJK HK',sans-serif" class="wt">${label}</text></svg>`;
}

/** Colours for the 3D floating badges + UI badges, per passenger kind. */
export const KIND_BADGE: Record<string, { ring: string; glyph: string }> = {
  hero: { ring: '#2f6fdc', glyph: '#2f6fdc' },
  normal: { ring: '#5b6573', glyph: '#5b6573' },
  stench: { ring: '#7cb342', glyph: '#6a9f2a' },
  family: { ring: '#e8772e', glyph: '#e8772e' },
  brat: { ring: '#ec5fa8', glyph: '#e0448f' },
  couple: { ring: '#d6338a', glyph: '#e8336f' },
  angry: { ring: '#d32f2f', glyph: '#e53935' },
  luggage: { ring: '#7a5541', glyph: '#7a5541' },
  squat: { ring: '#5c6bc0', glyph: '#3f51b5' },
  loud: { ring: '#f39c12', glyph: '#e67e22' },
};

/**
 * Standalone SVG document for one kind badge (white disc, coloured ring, glyph) —
 * rasterised into a canvas texture for the 3D floating icons.
 */
export function badgeSvg(kind: string, size = 128): string {
  const c = KIND_BADGE[kind] ?? KIND_BADGE.normal;
  const body = (P[`kind_${kind}`] ?? P.star).replace(/currentColor/g, c.glyph);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><style>.w{fill:#fff}.ws{stroke:#fff}.a{fill:#b01c2e}.as{stroke:#b01c2e}.k{fill:#1a1d22}.ks{stroke:#1a1d22}</style><circle cx="32" cy="32" r="29" fill="#fff" stroke="${c.ring}" stroke-width="5"/><g transform="translate(12 12) scale(.8333)">${body}</g></svg>`;
}
