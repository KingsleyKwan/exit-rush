import { en, type Dict } from './en';
import { zhHK } from './zh-HK';

export type Lang = 'en' | 'zh-HK';

const dicts: Record<Lang, Dict> = {
  en,
  'zh-HK': zhHK,
};

let current: Lang = 'zh-HK';

/** Keep `<html lang>` in sync so screen readers / fonts / hyphenation follow the UI language. */
function syncDocumentLang(): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = current;
  }
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang === 'en' ? 'en' : 'zh-HK';
  syncDocumentLang();
}

export function t(): Dict {
  return dicts[current];
}

export function toggleLang(): Lang {
  setLang(current === 'en' ? 'zh-HK' : 'en');
  return current;
}

/** Tiny `{key}` template filler for dictionary strings. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
