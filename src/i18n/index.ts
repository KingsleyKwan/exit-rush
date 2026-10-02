import { en, type Dict } from './en';
import { zhHK } from './zh-HK';

export type Lang = 'en' | 'zh-HK';

const dicts: Record<Lang, Dict> = {
  en,
  'zh-HK': zhHK,
};

let current: Lang = 'zh-HK';

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function t(): Dict {
  return dicts[current];
}

export function toggleLang(): Lang {
  current = current === 'en' ? 'zh-HK' : 'en';
  return current;
}
