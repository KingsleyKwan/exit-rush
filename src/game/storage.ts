import type { Lang } from '../i18n';

export interface SkillState {
  str: number; // 0–60 filled, then ultimate via flag
  spd: number;
  wis: number;
  ultStr: boolean;
  ultSpd: boolean;
  ultWis: boolean;
  points: number;
}

/** User-facing graphics setting. `auto` picks low/high from device hints + an FPS probe. */
export type QualitySetting = 'auto' | 'low' | 'high';
/** Resolved render tier. */
export type QualityLevel = 'low' | 'high';

export interface SaveData {
  version: 1;
  lang: Lang;
  skills: SkillState;
  highestCleared: number;
  cleared: number[];
  /** v0.2.2: clears per level id (for the capped replay bonus). Old saves: derived from `cleared`. */
  clears: Record<string, number>;
  /** v0.2.2: graphics setting (default `auto`). */
  quality: QualitySetting;
  /** v0.2.2: cached result of the auto-quality probe (null = not probed yet). */
  autoQuality: QualityLevel | null;
  /** v0.3: floating passenger-type icons above special passengers (default on). */
  typeIcons: boolean;
}

const KEY = 'hk-mtr-exit-rush-v1';

/**
 * In-memory fallback used when localStorage is unavailable (Safari private mode,
 * quota exceeded, storage blocked). Progress then lasts for the session only.
 */
let memory: string | null = null;

export function defaultSkills(): SkillState {
  return {
    str: 0,
    spd: 0,
    wis: 0,
    ultStr: false,
    ultSpd: false,
    ultWis: false,
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
  };
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const bool = (v: unknown): boolean => v === true;

/** Merge a parsed (possibly old / partial / corrupted) save over defaults. */
export function normalizeSave(parsed: Partial<SaveData> | null | undefined): SaveData {
  const d = defaultSave();
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return d;
  const sk = (parsed.skills ?? {}) as Partial<SkillState>;
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
  return {
    version: 1,
    lang: parsed.lang === 'en' || parsed.lang === 'zh-HK' ? parsed.lang : d.lang,
    skills: {
      str: num(sk.str, 0),
      spd: num(sk.spd, 0),
      wis: num(sk.wis, 0),
      ultStr: bool(sk.ultStr),
      ultSpd: bool(sk.ultSpd),
      ultWis: bool(sk.ultWis),
      points: num(sk.points, 0),
    },
    highestCleared: num(parsed.highestCleared, 0),
    cleared,
    clears,
    quality: q === 'low' || q === 'high' || q === 'auto' ? q : 'auto',
    autoQuality: aq === 'low' || aq === 'high' ? aq : null,
    typeIcons: typeof parsed.typeIcons === 'boolean' ? parsed.typeIcons : true,
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

/**
 * Persist the save. Never throws: on failure the data is kept in memory for this
 * session and `false` is returned so the caller can warn the player once.
 */
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
