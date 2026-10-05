import type { Lang } from '../i18n';
import { DEFAULT_AUDIO } from './Audio';

export interface SkillState {
  str: number; // 0–60 filled, then ultimate via flag
  spd: number;
  sta: number;
  ultStr: boolean;
  ultSpd: boolean;
  ultSta: boolean;
  points: number;
}
export type QualitySetting = 'auto' | 'low' | 'high';
export type QualityLevel = 'low' | 'high';

export interface SaveData {
  version: 1;
  lang: Lang;
  skills: SkillState;
  highestCleared: number;
  cleared: number[];
  clears: Record<string, number>;
  quality: QualitySetting;
  autoQuality: QualityLevel | null;
  typeIcons: boolean;
  masterVol: number;
  musicVol: number;
  sfxVol: number;
  muted: boolean;
  seenIntros: string[];
  ftueDone: boolean;
}

const KEY = 'hk-mtr-exit-rush-v1';
let memory: string | null = null;

export function defaultSkills(): SkillState {
  return {
    str: 0,
    spd: 0,
    sta: 0,
    ultStr: false,
    ultSpd: false,
    ultSta: false,
    points: 0,
  };
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    lang: 'zh-HK',
    skills: defaultSkills(),
    highestCleared: 0,
    cleared: [],
    clears: {},
    quality: 'auto',
    autoQuality: null,
    typeIcons: true,
    masterVol: DEFAULT_AUDIO.master,
    musicVol: DEFAULT_AUDIO.music,
    sfxVol: DEFAULT_AUDIO.sfx,
    muted: DEFAULT_AUDIO.muted,
    seenIntros: [],
    ftueDone: false,
  };
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const vol = (v: unknown, d: number): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return d;
  return Math.min(1, Math.max(0, v));
};
const bool = (v: unknown): boolean => v === true;
export function normalizeSave(parsed: Partial<SaveData> | null | undefined): SaveData {
  const d = defaultSave();
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return d;
  const sk = (parsed.skills ?? {}) as Partial<SkillState> & { wis?: number; ultWis?: boolean };
  const cleared = Array.isArray(parsed.cleared)
    ? [...new Set(parsed.cleared.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)))]
    : [];
  const clears: Record<string, number> = {};
  if (parsed.clears && typeof parsed.clears === 'object') {
    for (const [k, v] of Object.entries(parsed.clears)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) clears[k] = Math.floor(v);
    }
  }
  for (const id of cleared) if (!clears[id]) clears[id] = 1;
  const q = parsed.quality;
  const aq = parsed.autoQuality;
  const sta = num(sk.sta, num(sk.wis, 0));
  const ultSta = bool(sk.ultSta) || bool(sk.ultWis);
  return {
    version: 1,
    lang: parsed.lang === 'en' || parsed.lang === 'zh-HK' ? parsed.lang : d.lang,
    skills: {
      str: num(sk.str, 0),
      spd: num(sk.spd, 0),
      sta,
      ultStr: bool(sk.ultStr),
      ultSpd: bool(sk.ultSpd),
      ultSta,
      points: num(sk.points, 0),
    },
    highestCleared: num(parsed.highestCleared, 0),
    cleared,
    clears,
    quality: q === 'low' || q === 'high' || q === 'auto' ? q : 'auto',
    autoQuality: aq === 'low' || aq === 'high' ? aq : null,
    typeIcons: typeof parsed.typeIcons === 'boolean' ? parsed.typeIcons : true,
    masterVol: vol(parsed.masterVol, d.masterVol),
    musicVol: vol(parsed.musicVol, d.musicVol),
    sfxVol: vol(parsed.sfxVol, d.sfxVol),
    muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
    seenIntros: Array.isArray(parsed.seenIntros)
      ? [...new Set(parsed.seenIntros.filter((s): s is string => typeof s === 'string'))]
      : [],
    ftueDone: parsed.ftueDone === true,
  };
}

function readRaw(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw != null) return raw;
  } catch {
    /* storage blocked — fall through to memory */
  }
  return memory;
}

export function loadSave(): SaveData {
  try {
    const raw = readRaw();
    if (!raw) return defaultSave();
    return normalizeSave(JSON.parse(raw) as Partial<SaveData>);
  } catch {
    return defaultSave();
  }
}
export function writeSave(data: SaveData): boolean {
  let json: string;
  try {
    json = JSON.stringify(data);
  } catch {
    return false;
  }
  memory = json;
  try {
    localStorage.setItem(KEY, json);
    return true;
  } catch {
    return false;
  }
}
