export interface CourtesySlogan {
  zh: string;
  en: string;
}

/**
 * Short station courtesy lines shown after every clear.
 * Voice is 香城鐵路: Hong Kong colloquial, phone-length.
 * Index is stable per level: (levelId - 1) % length.
 */
export const COURTESY_SLOGANS: readonly CourtesySlogan[] = [
  { zh: '請先落後上', en: 'Let passengers alight first' },
  { zh: '唔該讓吓位', en: 'Please give way' },
  { zh: '小心月台空隙', en: 'Mind the gap' },
  { zh: '請讓座畀有需要嘅乘客', en: 'Please offer your seat to those in need' },
  { zh: '請安靜啲', en: 'Please keep quiet' },
  { zh: '請企喺黃線後', en: 'Please stand behind the yellow line' },
  { zh: '唔好擋住車門', en: 'Please keep the doors clear' },
  { zh: '請睇住同行嘅細路', en: 'Please look after children with you' },
];

/** Stable pick by level id (1-based). Falls back to 0 if no id. */
export function pickCourtesy(levelId: number | undefined | null): CourtesySlogan {
  const n = COURTESY_SLOGANS.length;
  const i = Math.max(0, (levelId ?? 1) - 1) % n;
  return COURTESY_SLOGANS[i]!;
}
