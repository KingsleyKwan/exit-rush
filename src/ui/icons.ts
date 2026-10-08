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
  fire: `<path d="M24 42c-8 0-14-6.5-14-14 0-6 3.5-10 7-14 1.5 4 4 6 7 6 0-5 3-10 7-14 2 5 4 9 4 14 0 7.5-6 14-11 14z" fill="currentColor"/>`,
  ice: `<path d="M24 5v38M10 12l28 24M38 12L10 36M8 24h32" stroke="currentColor" ${S(4)}/><circle cx="24" cy="24" r="5" fill="currentColor"/>`,
  wind: `<path d="M6 16c8-6 14-6 22 0s12 6 14 0" stroke="currentColor" ${S(4)}/><path d="M6 26c8-6 14-6 22 0s12 6 14 0" stroke="currentColor" ${S(4)} opacity=".75"/><path d="M8 36c7-5 12-5 18 0s10 5 14 0" stroke="currentColor" ${S(3.5)} opacity=".55"/>`,
  grav: `<path d="M24 6v20" stroke="currentColor" ${S(5)}/><path d="M13 20l11 14 11-14" fill="currentColor"/><path d="M8 42h32" stroke="currentColor" ${S(5)}/>`,
  volt: `<path d="M28 4L14 26h10L20 44l18-26H28z" fill="currentColor"/>`,
  shop: `<path d="M8 16h32l-2 24H10z" fill="currentColor"/><path d="M16 16V12a8 8 0 0 1 16 0v4" stroke="currentColor" ${S(4)}/>`,
  bag: `<path d="M12 18h24v22H12z" fill="currentColor"/><path d="M18 18V14a6 6 0 0 1 12 0v4" stroke="currentColor" ${S(4)}/>`,
  mana: `<path d="M24 6c8 10 14 16 14 24a14 14 0 0 1-28 0c0-8 6-14 14-24z" fill="currentColor"/><path d="M20 28h8M22 34h4" class="ws" ${S(3)}/>`,
  chars: `<circle cx="16" cy="16" r="8" fill="currentColor"/><circle cx="32" cy="16" r="8" fill="currentColor" opacity=".75"/><circle cx="24" cy="34" r="8" fill="currentColor" opacity=".9"/>`,
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
  // v0.7 boss crown (boss levels, cutscene, stubbornness hint).
  crown: `<path d="M5 15l9.5 8.5L24 9l9.5 14.5L43 15l-3.5 21h-31z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="8" y="37.5" width="32" height="6" rx="2.5" fill="currentColor"/><circle cx="24" cy="27.5" r="3.6" class="a"/><circle cx="14.5" cy="29" r="2.4" class="w"/><circle cx="33.5" cy="29" r="2.4" class="w"/>`,
  // Skill-tree glyphs — one picture per node, same 48×48 filled set.
  sk_charge: `<rect x="16" y="8" width="12" height="7" rx="2.5" fill="currentColor"/><rect x="10" y="14" width="24" height="26" rx="6" fill="currentColor"/><path d="M25 20l-6 9h5l-2 9 9-13h-5z" class="w"/>`,
  sk_split: `<path d="M24 42S7 31 7 19a9 9 0 0 1 15.2-6.4L24 16l1.8-3.4A9 9 0 0 1 41 19c0 12-17 23-17 23z" fill="currentColor"/><path d="M24 12l-3 7 5 2-2 6 6-4h-4l3-7-3 2z" class="w"/>`,
  sk_pound: `<path d="M8 38h32" stroke="currentColor" ${S(5)}/><path d="M14 30c3-6 17-6 20 0M10 22c4-8 24-8 28 0M16 14c2.4-5 13.6-5 16 0" stroke="currentColor" ${S(4)}/>`,
  sk_firm: `<path d="M24 5l16 6v12c0 10-7 16-16 20C15 39 8 33 8 23V11z" fill="currentColor"/><path d="M16 24l5 5 11-12" class="ws" ${S(4)}/>`,
  sk_bull: `<path d="M7 22c2-10 9-12 12-4M41 22c-2-10-9-12-12-4" stroke="currentColor" ${S(5.5)}/><circle cx="24" cy="28" r="10" fill="currentColor"/><path d="M18 38h12v6H18z" fill="currentColor"/>`,
  sk_lane: `<path d="M24 5l14 16h-8v18h-12V21h-8z" fill="currentColor"/>`,
  sk_squeeze: `<rect x="2" y="4" width="13" height="40" rx="3" fill="currentColor"/><rect x="33" y="4" width="13" height="40" rx="3" fill="currentColor"/><circle cx="24" cy="12" r="4.5" fill="currentColor"/><rect x="21.5" y="17" width="5" height="11" rx="2" fill="currentColor"/><path d="M24 28l-6 14h5l1-8 1 8h5z" fill="currentColor"/>`,
  sk_hurdle: `<path d="M6 30c8-16 28-16 36 0" stroke="currentColor" ${S(5)}/><rect x="15" y="30" width="18" height="12" rx="3" fill="currentColor"/>`,
  sk_leap: `<circle cx="32" cy="10" r="5.5" fill="currentColor"/><path d="M30 16l-10 12 7 2-2 12M26 28l12 5" stroke="currentColor" ${S(4.5)}/>`,
  sk_thread: `<rect x="3" y="18" width="14" height="8" rx="3" fill="currentColor"/><rect x="31" y="18" width="14" height="8" rx="3" fill="currentColor"/><path d="M24 3l8 12h-5v22h-6V15h-5z" fill="currentColor"/>`,
  sk_dash: `<path d="M4 18h22l-7-10 20 16-20 16 7-10H4z" fill="currentColor"/>`,
  sk_regen: `<path d="M36 16a16 16 0 1 1-6-8" stroke="currentColor" ${S(5)}/><path d="M28 4l8 8-10 1z" fill="currentColor"/><path d="M24 22c2.2 3.2 4 5 4 7.2a4 4 0 0 1-8 0c0-2.2 1.8-4 4-7.2z" fill="currentColor"/>`,
  sk_tank: `<rect x="18" y="6" width="12" height="8" rx="2.5" fill="currentColor"/><rect x="11" y="13" width="26" height="28" rx="6" fill="currentColor"/><path d="M18 24h12M18 31h8" class="ws" ${S(3.2)}/>`,
  sk_breath: `<path d="M24 7v9" stroke="currentColor" ${S(4)}/><path d="M15 18c-7 0-9 8-9 14 0 6 4 9 8 9 3.2 0 6-2 8-6 2 4 4.8 6 8 6 4 0 8-3 8-9 0-6-2-14-8-14-3 0-5.2 2-8 6-2.8-4-5-6-8-6z" fill="currentColor"/><path d="M14 28h20" class="ws" ${S(3.2)}/>`,
  sk_revive: `<path d="M24 42S7 31 7 19.2A9.2 9.2 0 0 1 24 13a9.2 9.2 0 0 1 17 6.2C41 31 24 42 24 42z" fill="currentColor"/><path d="M24 20v12M18 26h12" class="ws" ${S(3.6)}/>`,
  sk_calm: `<path d="M4 18h8l11-10v32L12 30H4z" fill="currentColor"/><path d="M30 16l14 16M44 16L30 32" stroke="currentColor" ${S(5)}/>`,
  sk_stance: `<circle cx="24" cy="9" r="7" fill="currentColor"/><path d="M24 16L6 44h9l9-18 9 18h9z" fill="currentColor"/>`,
  sk_hot: `<path d="M24 42c-8 0-14-6.5-14-14 0-6 3.5-10 7-14 1.5 4 4 6 7 6 0-5 3-10 7-14 2 5 4 9 4 14 0 7.5-6 14-11 14z" fill="currentColor"/><path d="M5 24c3 2 3 5 0 7M43 24c-3 2-3 5 0 7M7 14c2.2 1.6 2.2 4 0 5.6" stroke="currentColor" ${S(3.2)}/>`,
  sk_urgent: `<path d="M14 10l5 6M34 10l-5 6" stroke="currentColor" ${S(4.5)}/><circle cx="24" cy="28" r="14" fill="currentColor"/><path d="M24 20v9l6 4" class="ws" ${S(3.4)}/>`,
  sk_cleanse: `<path d="M18 42c-7 0-12-6-12-13 0-6 3-10 7-13 1.4 3.4 3.6 5 6 5 0-5 2.6-9 6-13 2 5 3.4 8 3.4 12 0 8-5 22-10.4 22z" fill="currentColor"/><path d="M38 8l1.6 4.2 4.4 1.4-4.4 1.6L38 20l-1.6-4.8-4.4-1.6 4.4-1.4z" fill="currentColor"/>`,
  sk_fburst: `<circle cx="24" cy="24" r="6" fill="currentColor"/><path d="M24 3l4.5 11h-9zM24 45l-4.5-11h9zM3 24l11-4.5v9zM45 24l-11 4.5v-9z" fill="currentColor"/>`,
  sk_unhand: `<path d="M16 8c-12 8-12 24 0 32" stroke="currentColor" ${S(6.5)}/><path d="M32 8c12 8 12 24 0 32" stroke="currentColor" ${S(6.5)}/>`,
  sk_phoenix: `<path d="M24 6c3 8 9 12 9 20a9 9 0 0 1-18 0c0-8 6-12 9-20z" fill="currentColor"/><path d="M6 32c8-8 12-2 18 0-7 2-12 7-18 0z" fill="currentColor"/><path d="M42 32c-8-8-12-2-18 0 7 2 12 7 18 0z" fill="currentColor"/>`,
  sk_cone: `<path d="M6 24L38 8v32z" fill="currentColor"/><path d="M16 24h8M28 17v14" class="ws" ${S(3.2)}/>`,
  sk_cool: `<path d="M8 20c4-10 28-10 32 0" fill="currentColor"/><circle cx="24" cy="28" r="13" fill="currentColor"/><path d="M18 28h3.2M26.8 28H30M19 34h10" class="ws" ${S(2.8)}/>`,
  sk_ishield: `<path d="M24 5l15 7v11c0 9-6.5 15-15 19-8.5-4-15-10-15-19V12z" fill="currentColor"/><path d="M24 16v14M17 23h14" class="ws" ${S(3.4)}/>`,
  sk_chill: `<circle cx="24" cy="22" r="12" fill="currentColor"/><path d="M24 12v20M15 16l18 12M33 16L15 28" class="ws" ${S(2.8)}/><path d="M14 40h6M28 40h6" stroke="currentColor" ${S(4)}/>`,
  sk_freeze: `<path d="M24 3l5 13 13 2-10 9 4 13-12-7-12 7 4-13L6 18l13-2z" fill="currentColor"/>`,
  sk_glide: `<path d="M14 12h12v14H16z" fill="currentColor"/><path d="M8 30h32M12 38h26" stroke="currentColor" ${S(4.5)}/><path d="M28 16l10 8" stroke="currentColor" ${S(4.5)}/>`,
  sk_age: `<path d="M4 4h10L9 42z" fill="currentColor"/><path d="M19 8h10L24 44z" fill="currentColor"/><path d="M34 12h10L39 38z" fill="currentColor"/>`,
  sk_static: `<path d="M10 16h12v14l12 4v8H6V30z" fill="currentColor"/><path d="M36 6l-5 10h7l-6 12" stroke="currentColor" ${S(3.6)}/>`,
  sk_conduct: `<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="5"/><path d="M27 12l-8 12h7l-3 12 12-16h-7z" fill="currentColor"/>`,
  sk_dropcall: `<rect x="16" y="4" width="18" height="34" rx="4" fill="currentColor"/><rect x="19.5" y="10" width="11" height="16" rx="2" class="w"/><path d="M6 42L42 6" stroke="currentColor" ${S(5.5)}/>`,
  sk_clap: `<circle cx="24" cy="26" r="6" fill="currentColor"/><path d="M24 4l4 12h-8zM6 38l12-8-2 10zM42 38L30 30l2 10z" fill="currentColor"/>`,
  sk_tstep: `<path d="M4 14h8M2 24h8M4 34h8" stroke="currentColor" ${S(3.4)} opacity=".65"/><path d="M30 6l-8 14h8l-4 18 16-22h-8z" fill="currentColor"/>`,
  sk_blink: `<rect x="2" y="12" width="12" height="24" rx="2.5" fill="currentColor"/><rect x="34" y="12" width="12" height="24" rx="2.5" fill="currentColor"/><path d="M16 24h12" stroke="currentColor" ${S(4.5)}/><path d="M24 16l10 8-10 8z" fill="currentColor"/>`,
  // Gear L — one picture per piece, so the shop and the weapon buttons aren't all the same bag.
  it_sneaker: `<path d="M2 24h6M1 31h7" stroke="currentColor" ${S(3)}/><path d="M12 34V20l6-4 8 1 10 6 8 8v3H12z" fill="currentColor"/><rect x="6" y="32" width="38" height="9" rx="3" fill="currentColor"/><path d="M14 33h24" class="ks" ${S(2.2)}/><path d="M20 21h6M22 26h6" class="ks" ${S(2)}/>`,
  it_boot: `<path d="M16 2h10v16l16 8v8H10v-8l6-8z" fill="currentColor"/><path d="M17 10h8" class="ks" ${S(2.4)}/><path d="M8 40q5-8 10 0t10 0 10 0 10 0" stroke="currentColor" ${S(3.4)}/>`,
  it_skate: `<path d="M16 4h8c2 0 4 2 5 4l7 5c2 1 3 3 2 5H14V9c0-3 1-5 2-5z" fill="currentColor"/><path d="M18 19v7M32 19v7" stroke="currentColor" ${S(3.2)}/><rect x="4" y="26" width="40" height="7" rx="3" fill="currentColor"/><circle cx="12" cy="40" r="4.5" fill="currentColor"/><circle cx="36" cy="40" r="4.5" fill="currentColor"/>`,
  it_hydro: `<rect x="8" y="4" width="6.5" height="14" rx="3" fill="currentColor"/><rect x="16.5" y="1" width="6.5" height="17" rx="3" fill="currentColor"/><rect x="25" y="4" width="6.5" height="14" rx="3" fill="currentColor"/><path d="M31 16c7 0 12 4 11 9-1 4-6 6-11 4" fill="currentColor"/><path d="M8 14h24v12c0 7-5 12-13 12S8 33 8 26z" fill="currentColor"/><rect x="4" y="34" width="20" height="9" rx="3" fill="currentColor"/><rect x="8" y="36.5" width="8" height="4" rx="1" class="k"/><path d="M24 38.5h8" stroke="currentColor" ${S(3.4)}/>`,
  it_shock: `<path d="M6 20h20v18H6z" fill="currentColor"/><path d="M10 20V12h12v8" fill="currentColor"/><path d="M28 6l-7 14h7l-5 16 16-20h-8z" fill="currentColor"/>`,
  it_buzz: `<rect x="7" y="6" width="6" height="13" rx="3" fill="currentColor"/><rect x="15" y="3" width="6" height="16" rx="3" fill="currentColor"/><rect x="23" y="6" width="6" height="13" rx="3" fill="currentColor"/><path d="M29 18c6 0 11 4 10 9-1 5-6 7-11 4" fill="currentColor"/><path d="M6 16h24v13c0 8-5 13-13 13S6 37 6 29z" fill="currentColor"/><circle cx="17" cy="29" r="6" fill="none" class="ks" stroke-width="2.8"/><circle cx="17" cy="29" r="2" class="k"/>`,
  it_mask: `<path d="M8 16c0-7 7-10 16-10s16 3 16 10v10c0 9-7 16-16 16S8 35 8 26z" fill="currentColor"/><circle cx="17" cy="24" r="4.2" class="k"/><circle cx="31" cy="24" r="4.2" class="k"/><rect x="36" y="26" width="10" height="9" rx="2" fill="currentColor"/>`,
  it_phones: `<path d="M14 24v-4c0-7 4-12 10-12s10 5 10 12v4h-6v-4c0-4-2-6-4-6s-4 2-4 6v4z" fill="currentColor"/><rect x="4" y="20" width="10" height="18" rx="4" fill="currentColor"/><rect x="34" y="20" width="10" height="18" rx="4" fill="currentColor"/>`,
  it_visor: `<path d="M2 26h7M39 26h7" stroke="currentColor" ${S(4)}/><circle cx="16" cy="26" r="9" fill="currentColor"/><circle cx="32" cy="26" r="9" fill="currentColor"/><rect x="22" y="22" width="4" height="8" fill="currentColor"/><circle cx="16" cy="26" r="4.2" class="k"/><circle cx="32" cy="26" r="4.2" class="k"/><path d="M32 17V6" stroke="currentColor" ${S(3.2)}/><circle cx="32" cy="5" r="2.4" fill="currentColor"/>`,
  it_bank: `<rect x="16" y="3" width="16" height="6" rx="2" fill="currentColor"/><rect x="8" y="8" width="32" height="34" rx="6" fill="currentColor"/><path d="M27 16l-8 12h7l-3 12 13-16h-8z" class="k"/>`,
  it_exo: `<rect x="13" y="3" width="14" height="15" rx="3" fill="currentColor"/><circle cx="20" cy="22" r="6.5" fill="currentColor"/><circle cx="20" cy="22" r="2.3" class="k"/><rect x="13" y="28" width="14" height="16" rx="3" fill="currentColor"/><rect x="31" y="6" width="6" height="32" rx="3" fill="currentColor"/><rect x="16" y="8" width="8" height="3" rx="1" class="k"/><rect x="16" y="34" width="8" height="3" rx="1" class="k"/>`,
  it_drone: `<rect x="16" y="18" width="16" height="12" rx="3" fill="currentColor"/><path d="M20 22L8 8M28 22l12-14M20 26L8 40M28 26l12 14" stroke="currentColor" ${S(4)}/><circle cx="8" cy="8" r="6.5" fill="currentColor"/><circle cx="40" cy="8" r="6.5" fill="currentColor"/><circle cx="8" cy="40" r="6.5" fill="currentColor"/><circle cx="40" cy="40" r="6.5" fill="currentColor"/><circle cx="8" cy="8" r="2" class="k"/><circle cx="40" cy="8" r="2" class="k"/><circle cx="8" cy="40" r="2" class="k"/><circle cx="40" cy="40" r="2" class="k"/>`,
  it_tab: `<rect x="8" y="4" width="32" height="40" rx="4" fill="currentColor"/><rect x="12" y="8" width="24" height="26" rx="2" class="k"/><circle cx="19" cy="17" r="2.1" fill="currentColor"/><circle cx="29" cy="17" r="2.1" fill="currentColor"/><path d="M18 26c2.2 3 9.8 3 12 0" stroke="currentColor" ${S(2.4)} fill="none"/>`,
  it_fan: `<circle cx="22" cy="18" r="14" fill="currentColor"/><path d="M22 18V6M22 18l11 7M22 18L11 25" class="ks" ${S(3.6)}/><circle cx="22" cy="18" r="3" class="k"/><path d="M22 32v12" stroke="currentColor" ${S(5)}/>`,
  it_arms: `<path d="M2 12h14l4 10-4 10H2l4-10z" fill="currentColor"/><path d="M28 12h18l-4 10 4 10H28l4-10z" fill="currentColor"/><path d="M16 22h12" stroke="currentColor" ${S(5)}/>`,
  it_jet: `<rect x="12" y="4" width="24" height="24" rx="5" fill="currentColor"/><path d="M18 8v14M30 8v14" class="ks" ${S(3.2)}/><path d="M15 28h8l-1.5 8h-5z" fill="currentColor"/><path d="M25 28h8l-1.5 8h-5z" fill="currentColor"/><path d="M16.5 37c1.2 6 3.6 6 4.6 0M26.5 37c1.2 6 3.6 6 4.6 0" stroke="currentColor" ${S(2.6)}/>`,
  it_field: `<path d="M24 3l17 7v12c0 11-7.5 17-17 22C14.5 39 7 33 7 22V10z" fill="currentColor"/><path d="M24 12l10 4v8c0 6-4.2 10-10 13-5.8-3-10-7-10-13v-8z" class="k"/><path d="M24 17l6 2.4V25c0 3.6-2.4 6-6 7.6-3.6-1.6-6-4-6-7.6v-5.6z" fill="currentColor"/>`,
  it_can: `<ellipse cx="24" cy="12" rx="11" ry="4.2" fill="currentColor"/><rect x="13" y="12" width="22" height="22" fill="currentColor"/><ellipse cx="24" cy="34" rx="11" ry="4.2" fill="currentColor"/><ellipse cx="24" cy="8" rx="3.2" ry="1.6" fill="currentColor"/><path d="M24 6.4V3" stroke="currentColor" ${S(2.4)}/><path d="M27 18l-6 7h5l-2 7 8-9h-5z" class="k"/>`,
  it_cup: `<path d="M8 16h22v12a9 9 0 0 1-18 0v-1H8a5 5 0 0 1 0-11z" fill="currentColor"/><path d="M30 18h5a5 5 0 0 1 0 10h-5" stroke="currentColor" ${S(3.6)} fill="none"/><path d="M14 10c1.2-4 3.2-4 2-8M23 10c1.2-4 3.2-4 2-8" stroke="currentColor" ${S(2.8)} fill="none"/>`,
  it_gum: `<rect x="10" y="8" width="6" height="13" rx="1.5" fill="currentColor"/><rect x="18" y="4" width="6" height="17" rx="1.5" fill="currentColor"/><rect x="26" y="8" width="6" height="13" rx="1.5" fill="currentColor"/><rect x="5" y="18" width="32" height="22" rx="3.5" fill="currentColor"/><rect x="11" y="23" width="4" height="12" rx="1" class="k"/><rect x="19" y="23" width="4" height="12" rx="1" class="k"/><rect x="27" y="23" width="4" height="12" rx="1" class="k"/><path d="M38 6c7-2 10 5 5 9-4 3-8 0-5-9z" fill="currentColor"/><path d="M41 9c.5 2 .5 4 0 6" class="ks" ${S(1.6)}/>`,
};

export type IconName = keyof typeof P;

/** One icon per Gear L piece. Unknown ids fall back to the bag. */
export const ITEM_ICON: Record<string, IconName> = {
  S1: 'it_sneaker', S2: 'it_boot', S3: 'it_skate',
  G1: 'it_hydro', G2: 'it_shock', G3: 'it_buzz',
  H1: 'it_mask', H2: 'it_phones', H3: 'it_visor',
  D1: 'it_bank', D2: 'it_exo', D3: 'it_drone', D4: 'it_tab', D5: 'it_fan',
  C1: 'it_arms', C2: 'it_jet', C3: 'it_field',
  K1: 'it_can', K2: 'it_cup', K3: 'it_gum',
};

export function itemIcon(id: string): IconName {
  return ITEM_ICON[id] ?? 'bag';
}

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
