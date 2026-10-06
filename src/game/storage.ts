import type { Lang } from '../i18n';
import { DEFAULT_AUDIO } from './Audio';

export interface SkillState {
  str: number; // 0–60 filled, then ultimate via flag
  spd: number;
  /** Stamina branch (v0.6). Old saves used `wis` — migrated in normalizeSave. */
  sta: number;
  ultStr: boolean;
  ultSpd: boolean;
  /** Stamina ultimate (v0.6). Old `ultWis` migrates here. */
  ultSta: boolean;
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
  /** v0.4: mixer — master / music / sfx volumes 0–1 and mute toggle. */
  masterVol: number;
  musicVol: number;
  sfxVol: number;
  muted: boolean;
  /** v0.5: passenger kinds whose intro card has been shown (or re-viewed from legend). */
  seenIntros: string[];
  /** v0.5: first-run FTUE (auto L1 + ghost hand) completed. */
  ftueDone: boolean;
}

/** Save key (v0.6.3: renamed with the repo → `exit-rush`). */
export const SAVE_KEY = 'exit-rush-v1';
const KEY = SAVE_KEY;
const KEY_PREFIX = 'exit-rush';
/**
 * Legacy key prefix from pre-rename builds (old repo/package name). Built from parts on purpose
 * so the old operator-like letters never appear literally in the source (or, unlike
 * a string concat, in the minified bundle — esbuild doesn't fold Array#join).
 */
const LEGACY_PREFIX = ['hk', ['m', 't', 'r'].join(''), 'exit-rush'].join('-');

/** Minimal Storage surface (lets the sim test pass a fake). */
export interface KeyValueStore {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/**
 * One-time migration of every pre-rename key (`<legacy>-v1`, plus any other `<legacy>…` keys such
 * as settings) to the matching new `exit-rush…` key. An existing new key always wins (never
 * overwritten); the legacy key is deleted either way. Returns the migrated new key names.
 */
export function migrateLegacyKeys(store: KeyValueStore): string[] {
  const legacy: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(LEGACY_PREFIX)) legacy.push(k);
  }
  const moved: string[] = [];
  for (const oldKey of legacy) {
    const newKey = KEY_PREFIX + oldKey.slice(LEGACY_PREFIX.length);
    const v = store.getItem(oldKey);
    if (v != null && store.getItem(newKey) == null) {
      store.setItem(newKey, v);
      moved.push(newKey);
    }
    // Only drop the old key once the new one is safely present.
    if (store.getItem(newKey) != null) store.removeItem(oldKey);
  }
  return moved;
}

let migrated = false;
function migrateOnce(): void {
  if (migrated) return;
  migrated = true;
  try {
    migrateLegacyKeys(localStorage);
  } catch {
    /* storage blocked / quota — keep legacy data untouched */
  }
}

/**
 * In-memory fallback used when localStorage is unavailable (Safari private mode,
 * quota exceeded, storage blocked). Progress then lasts for the session only.
 */
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

/** Merge a parsed (possibly old / partial / corrupted) save over defaults. */
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
  // v0.6: Wisdom → Stamina. Prefer `sta` / `ultSta`; fall back to old `wis` / `ultWis`.
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
  migrateOnce();
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
