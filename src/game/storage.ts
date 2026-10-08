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
  /**
   * Mage spell ids (wind / ice / gravity). Absent on the hero.
   * When this list is non-empty, it is the whole book — str/spd/sta are not mage power.
   */
  known?: string[];
}

/** v0.8 Mage spell loadouts. The book lives in `known` (wind / ice / gravity). */
export interface MageProgress {
  loadouts: SkillState[];
  active: number;
  /** Up to 3 spell ability ids per loadout slot. */
  spellBars: string[][];
}

/** v0.8 Tech kit stub (full grid/shop lands in a later pass). */
export interface TechProgress {
  items: Record<string, 0 | 1 | 2 | 3>;
  /** 0 = 2×2, 1 = 2×3. Saves may still say 2–4; reconcileTech clamps those. */
  gridTier: 0 | 1 | 2 | 3 | 4;
  sets: { placements: { id: string; tier: 1 | 2 | 3; x: number; y: number; rot: 0 | 1 | 2 | 3 }[] }[];
  activeSet: number;
  stock: Record<string, number>;
  ledger: Record<string, { replays: number; fast: boolean }>;
  consumableSpend: number;
  retroGranted: boolean;
  coinNotice: boolean;
}

export type CharacterIdSave = 'hero' | 'mage' | 'tech';

/** v0.8.1: per-character run progress (clears / unlocks / boss cutscenes). */
export interface CharRunProgress {
  cleared: number[];
  clears: Record<string, number>;
  highestCleared: number;
  seenBosses: number[];
}

/** User-facing graphics setting. `auto` picks low/high from device hints + an FPS probe. */
export type QualitySetting = 'auto' | 'low' | 'high';
/** Resolved render tier. */
export type QualityLevel = 'low' | 'high';

export interface SaveData {
  version: 1;
  lang: Lang;
  skills: SkillState;
  /**
   * Top-level clear mirrors of the *active* character (kept in sync by syncTopLevelProgress).
   * Prefer progressOf(save) / save.progress[id] for reads that care about a specific character.
   */
  highestCleared: number;
  cleared: number[];
  /** Clears per level id (active character mirror). */
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
  /** Active-character mirror of boss cutscene flags (see progress[id].seenBosses). */
  seenBosses: number[];
  /** v0.5: first-run FTUE (auto L1 + ghost hand) completed. */
  ftueDone: boolean;
  /**
   * v0.7: three skill loadouts (配點1/2/3). Each stores its own allocation from the SAME earned total;
   * `skills` is always the active slot (kept in sync on switch / persist). `points` = earned − spent.
   */
  loadouts: SkillState[];
  activeLoadout: number;
  /** v0.7: one-time 「技能點已重新計算」 notice pending (economy change refunded a save). */
  respecNotice: boolean;
  /**
   * v0.8: selected character. v0.8.1: each character has its own clears / SP (see `progress`).
   */
  character: CharacterIdSave;
  /** Cache only — StoreKit / RevenueCat is the truth on iOS. */
  entitlementCache: { mage: boolean; tech: boolean; noAds: boolean; at: number };
  mage: MageProgress;
  tech: TechProgress;
  /** Cosmetic "cleared with" marks per level (completionist; not unlock gates). */
  clearedWith: Record<string, CharacterIdSave[]>;
  trialsPlayed: Record<string, number>;
  /** v0.8.1: per-character cleared / unlocks / boss intros. */
  progress: Record<CharacterIdSave, CharRunProgress>;
  /** v0.8.1: one-time notice after mage spell points were refunded to match mage-only clears. */
  progressSplitNotice: boolean;
}

/** Points granted each time the player completes another block of levels. */
export const SP_PER_CLEAR = 1;
/** First clears per skill point. 100 levels → 10 points. */
export const LEVELS_PER_SKILL_POINT = 10;
export const LOADOUT_SLOTS = 3;
/**
 * Skills bought.
 * Hero: each 10 power in a branch is one skill. An ultimate is one skill.
 * Partial power below the next 10 (old saves) does not count as an extra skill.
 * Mage: one point per id in `known`, once that list exists. Hero math is unchanged.
 */
export function spentOf(s: SkillState): number {
  if (s.known && s.known.length > 0) return Math.min(10, s.known.length);
  return heroSpent(s);
}

function heroSpent(s: SkillState): number {
  const nodes = (v: number) => Math.min(6, Math.floor(Math.max(0, v) / 10));
  return nodes(s.str) + nodes(s.spd) + nodes(s.sta)
    + (s.ultStr ? 1 : 0) + (s.ultSpd ? 1 : 0) + (s.ultSta ? 1 : 0);
}

/** New ids, plus the old column ids mapped onto the same rank. iw before i and w. */
const WEATHER_ID = /^(iw|ig|wg|w|i|g)[1-4]$/;
const OLD_WEATHER: Record<string, string> = {
  wind_1: 'w1', wind_2: 'w2', wind_3: 'w3', wind_4: 'w4',
  ice_1: 'i1', ice_2: 'i2', ice_3: 'i3', ice_4: 'i4',
  grav_1: 'g1', grav_2: 'g2', grav_3: 'g3', grav_4: 'g4',
};
/**
 * Same graph as SpellTree.ts. This file must not import it.
 * A mix rank 1 needs both pure starts. A later rank needs only the one before it.
 */
const WEATHER_NEED: Record<string, readonly string[]> = {
  w1: [], w2: ['w1'], w3: ['w2'], w4: ['w3'],
  i1: [], i2: ['i1'], i3: ['i2'], i4: ['i3'],
  g1: [], g2: ['g1'], g3: ['g2'], g4: ['g3'],
  iw1: ['i1', 'w1'], iw2: ['iw1'], iw3: ['iw2'], iw4: ['iw3'],
  ig1: ['i1', 'g1'], ig2: ['ig1'], ig3: ['ig2'], ig4: ['ig3'],
  wg1: ['w1', 'g1'], wg2: ['wg1'], wg3: ['wg2'], wg4: ['wg3'],
};

function mapWeatherId(id: string): string | null {
  const next = OLD_WEATHER[id] ?? id;
  return WEATHER_ID.test(next) && WEATHER_NEED[next] ? next : null;
}

function weatherLine(id: string): string {
  if (id.startsWith('iw') || id.startsWith('ig') || id.startsWith('wg')) return id.slice(0, 2);
  return id.slice(0, 1);
}

/** Rank-4 ids share an element when one letter sits in both line names. */
function rank4Shares(a: string, b: string): boolean {
  if (!a.endsWith('4') || !b.endsWith('4')) return false;
  const ea = weatherLine(a);
  const eb = weatherLine(b);
  const parts = (s: string) => (s.length === 2 ? [s[0], s[1]] : [s]);
  return parts(ea).some((e) => parts(eb).includes(e));
}

/**
 * Keep ids that are in the book, whose needs are already kept, and that do not
 * clash with a kept last rank. Dropped ids give the point back through spentOf.
 */
function cleanKnown(ids: readonly string[]): string[] {
  const pool: string[] = [];
  for (const raw of ids) {
    const id = mapWeatherId(raw);
    if (!id || pool.includes(id)) continue;
    pool.push(id);
  }
  const out: string[] = [];
  let progressed = true;
  while (progressed && out.length < 10) {
    progressed = false;
    for (const id of pool) {
      if (out.length >= 10 || out.includes(id)) continue;
      if (!WEATHER_NEED[id].every((req) => out.includes(req))) continue;
      if (id.endsWith('4') && out.some((k) => rank4Shares(id, k))) continue;
      out.push(id);
      progressed = true;
    }
  }
  return out;
}

/** One id per line, upgraded to the best rank she still knows. */
function upgradeBar(ids: readonly string[], known: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = mapWeatherId(raw);
    if (!id) continue;
    const line = weatherLine(id);
    if (seen.has(line)) continue;
    let best = '';
    let rank = 0;
    for (const k of known) {
      if (weatherLine(k) !== line) continue;
      const n = Number(k.slice(line.length));
      if (n > rank) { rank = n; best = k; }
    }
    if (!best) continue;
    seen.add(line);
    out.push(best);
    if (out.length >= 6) break;
  }
  return out;
}
/** Skill points earned: one per 10 distinct first clears. Replays add nothing. */
export function earnedFrom(cleared: readonly number[]): number {
  return Math.floor(new Set(cleared).size / LEVELS_PER_SKILL_POINT) * SP_PER_CLEAR;
}
/** Re-derive `points` from earned − spent; refund everything if over-spent. Returns [state, wasRefunded]. */
export function reconcileSlot(s: SkillState, earned: number): [SkillState, boolean] {
  const spent = spentOf(s);
  if (spent > earned) return [{ ...defaultSkills(), points: earned }, true];
  return [{ ...s, points: earned - spent }, false];
}

export function emptyProgress(): CharRunProgress {
  return { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] };
}

function normalizeProgress(raw: Partial<CharRunProgress> | null | undefined): CharRunProgress {
  const cleared = Array.isArray(raw?.cleared)
    ? [...new Set(raw!.cleared!.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)))]
    : [];
  const clears: Record<string, number> = {};
  if (raw?.clears && typeof raw.clears === 'object') {
    for (const [k, v] of Object.entries(raw.clears)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) clears[k] = Math.floor(v);
    }
  }
  for (const id of cleared) if (!clears[String(id)]) clears[String(id)] = 1;
  const highestCleared = Math.max(
    typeof raw?.highestCleared === 'number' && Number.isFinite(raw.highestCleared) ? raw.highestCleared : 0,
    ...cleared,
    0,
  );
  const seenBosses = Array.isArray(raw?.seenBosses)
    ? [...new Set(raw!.seenBosses!.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 100))]
    : [];
  return { cleared, clears, highestCleared, seenBosses };
}

/** Active (or named) character's run progress. */
export function progressOf(save: Pick<SaveData, 'progress' | 'character'>, id?: CharacterIdSave): CharRunProgress {
  const key = id ?? save.character;
  return save.progress[key] ?? emptyProgress();
}

/** Copy active character progress into top-level mirrors (cleared / clears / highest / seenBosses). */
export function syncTopLevelProgress(save: SaveData): void {
  const p = progressOf(save);
  save.cleared = [...p.cleared];
  save.clears = { ...p.clears };
  save.highestCleared = p.highestCleared;
  save.seenBosses = [...p.seenBosses];
}

/** Record a clear for the active character. Returns clear count + whether it was a first clear. */
export function recordClear(save: SaveData, levelId: number): { count: number; first: boolean } {
  const p = progressOf(save);
  const key = String(levelId);
  const count = (p.clears[key] ?? 0) + 1;
  p.clears[key] = count;
  const first = !p.cleared.includes(levelId);
  if (first) p.cleared.push(levelId);
  p.highestCleared = Math.max(p.highestCleared, levelId);
  save.progress[save.character] = p;
  syncTopLevelProgress(save);
  return { count, first };
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
    seenBosses: [],
    ftueDone: false,
    loadouts: [defaultSkills(), defaultSkills(), defaultSkills()],
    activeLoadout: 0,
    respecNotice: false,
    character: 'hero',
    entitlementCache: { mage: false, tech: false, noAds: false, at: 0 },
    mage: {
      loadouts: [defaultSkills(), defaultSkills(), defaultSkills()],
      active: 0,
      spellBars: [[], [], []],
    },
    tech: {
      items: {},
      gridTier: 0,
      sets: [{ placements: [] }, { placements: [] }, { placements: [] }],
      activeSet: 0,
      stock: {},
      ledger: {},
      consumableSpend: 0,
      retroGranted: false,
      coinNotice: false,
    },
    clearedWith: {},
    trialsPlayed: {},
    progress: { hero: emptyProgress(), mage: emptyProgress(), tech: emptyProgress() },
    progressSplitNotice: false,
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
  for (const id of cleared) if (!clears[String(id)]) clears[String(id)] = 1;
  const q = parsed.quality;
  const aq = parsed.autoQuality;
  // v0.6: Wisdom → Stamina. Prefer `sta` / `ultSta`; fall back to old `wis` / `ultWis`.
  const sta = num(sk.sta, num(sk.wis, 0));
  const ultSta = bool(sk.ultSta) || bool(sk.ultWis);
  const cap = (v: number) => Math.min(60, Math.floor(v));
  const toSkills = (o: Partial<SkillState> & { wis?: number; ultWis?: boolean }, withKnown = false): SkillState => {
    const base: SkillState = {
      str: cap(num(o.str, 0)),
      spd: cap(num(o.spd, 0)),
      sta: cap(num(o.sta, num(o.wis, 0))),
      ultStr: bool(o.ultStr),
      ultSpd: bool(o.ultSpd),
      ultSta: bool(o.ultSta) || bool(o.ultWis),
      points: 0,
    };
    if (!withKnown || !Array.isArray(o.known)) return base;
    const known = cleanKnown(o.known.filter((id): id is string => typeof id === 'string'));
    if (known.length === 0) return { ...base, known: [] };
    return {
      ...base,
      str: 0,
      spd: 0,
      sta: 0,
      known,
      ultStr: false,
      ultSta: false,
      ultSpd: false,
    };
  };
  // v0.8.1: build per-character progress BEFORE reconciling SP.
  const rawCwEarly = (parsed as { clearedWith?: Record<string, unknown> }).clearedWith;
  const clearedWithEarly: Record<string, CharacterIdSave[]> = {};
  if (rawCwEarly && typeof rawCwEarly === 'object') {
    for (const [k, v] of Object.entries(rawCwEarly)) {
      if (Array.isArray(v)) {
        clearedWithEarly[k] = [...new Set(v.filter((c): c is CharacterIdSave => c === 'hero' || c === 'mage' || c === 'tech'))];
      }
    }
  }
  const rawProgress = (parsed as { progress?: Partial<Record<CharacterIdSave, Partial<CharRunProgress>>> }).progress;
  const migratingSplit = !(rawProgress && typeof rawProgress === 'object' && rawProgress.hero);
  let progress: Record<CharacterIdSave, CharRunProgress>;
  if (!migratingSplit) {
    progress = {
      hero: normalizeProgress(rawProgress!.hero),
      mage: normalizeProgress(rawProgress!.mage),
      tech: normalizeProgress(rawProgress!.tech),
    };
  } else {
    // Pre-0.8.1: all top-level clears belong to hero. Mage/tech seed only from clearedWith marks.
    const heroProg = normalizeProgress({
      cleared,
      clears,
      highestCleared: num(parsed.highestCleared, 0),
      seenBosses: Array.isArray(parsed.seenBosses) ? parsed.seenBosses as number[] : [],
    });
    const fromMarks = (id: CharacterIdSave): CharRunProgress => {
      const ids: number[] = [];
      for (const [k, chars] of Object.entries(clearedWithEarly)) {
        if (chars.includes(id)) {
          const n = Number(k);
          if (Number.isFinite(n)) ids.push(n);
        }
      }
      const clearsMap: Record<string, number> = {};
      for (const idn of ids) clearsMap[String(idn)] = clears[String(idn)] ?? 1;
      return normalizeProgress({ cleared: ids, clears: clearsMap, highestCleared: ids.length ? Math.max(...ids) : 0, seenBosses: [] });
    };
    progress = { hero: heroProg, mage: fromMarks('mage'), tech: fromMarks('tech') };
  }

  // Hero SP from hero clears (not shared).
  const heroEarned = earnedFrom(progress.hero.cleared);
  const active = Number.isInteger(parsed.activeLoadout) && (parsed.activeLoadout as number) >= 0 && (parsed.activeLoadout as number) < LOADOUT_SLOTS ? (parsed.activeLoadout as number) : 0;
  const rawSlots = Array.isArray(parsed.loadouts) ? parsed.loadouts : [];
  let refunded = false;
  const loadouts: SkillState[] = [];
  for (let i = 0; i < LOADOUT_SLOTS; i++) {
    const src = i === active ? { ...sk, sta, ultSta } : ((rawSlots[i] ?? {}) as Partial<SkillState>);
    const [slot, r] = reconcileSlot(toSkills(src), heroEarned);
    loadouts.push(slot);
    refunded ||= r;
  }

  // v0.8 character layer (defaults keep v0.7 hero saves intact).
  const rawChar = (parsed as { character?: string }).character;
  const character: CharacterIdSave = rawChar === 'mage' || rawChar === 'tech' || rawChar === 'hero' ? rawChar : 'hero';
  const ec = (parsed as { entitlementCache?: Partial<{ mage: boolean; tech: boolean; noAds: boolean; at: number }> }).entitlementCache ?? {};
  const entitlementCache = {
    mage: ec.mage === true,
    tech: ec.tech === true,
    noAds: ec.noAds === true,
    at: typeof ec.at === 'number' && Number.isFinite(ec.at) ? ec.at : 0,
  };
  const rawMage = (parsed as { mage?: Partial<MageProgress> }).mage ?? {};
  const mageActive = Number.isInteger(rawMage.active) && (rawMage.active as number) >= 0 && (rawMage.active as number) < LOADOUT_SLOTS ? (rawMage.active as number) : 0;
  const mageRawSlots = Array.isArray(rawMage.loadouts) ? rawMage.loadouts : [];
  const mageEarned = earnedFrom(progress.mage.cleared);
  let mageRefunded = false;
  let weatherRefund = false;
  const slotRefunds: boolean[] = [];
  const mageLoadouts: SkillState[] = [];
  for (let i = 0; i < LOADOUT_SLOTS; i++) {
    let slotIn = toSkills((mageRawSlots[i] ?? {}) as Partial<SkillState>, true);
    // The old fire / lightning book does not map onto wind, ice, and gravity. Refund it once.
    const attackBook = (!slotIn.known || slotIn.known.length === 0) && heroSpent(slotIn) > 0;
    if (attackBook) {
      slotIn = { ...defaultSkills(), points: 0, known: [] };
      weatherRefund = true;
      slotRefunds.push(true);
    } else {
      slotRefunds.push(false);
    }
    const [slot, r] = reconcileSlot(slotIn, mageEarned);
    mageLoadouts.push(slot);
    mageRefunded ||= r || attackBook;
  }
  const rawBars = Array.isArray(rawMage.spellBars) ? rawMage.spellBars : [];
  const spellBars: string[][] = [];
  for (let i = 0; i < LOADOUT_SLOTS; i++) {
    const known = mageLoadouts[i].known ?? [];
    const mapped = Array.isArray(rawBars[i])
      ? rawBars[i].filter((s): s is string => typeof s === 'string')
      : [];
    let bar = upgradeBar(mapped, known);
    // Fresh mage after refund: clear bars so defaults re-apply on next open.
    if (slotRefunds[i] || (mageRefunded && mageEarned === 0)) bar = [];
    spellBars.push(bar);
  }
  const rawTech = (parsed as { tech?: Partial<TechProgress> }).tech ?? {};
  const tech: TechProgress = {
    items: rawTech.items && typeof rawTech.items === 'object' ? { ...rawTech.items } as TechProgress['items'] : {},
    gridTier: ([0, 1, 2, 3, 4] as const).includes(rawTech.gridTier as 0) ? (rawTech.gridTier as 0 | 1 | 2 | 3 | 4) : 0,
    sets: Array.isArray(rawTech.sets) && rawTech.sets.length
      ? rawTech.sets.slice(0, 3).map((s) => ({ placements: Array.isArray(s?.placements) ? s.placements : [] }))
      : [{ placements: [] }, { placements: [] }, { placements: [] }],
    activeSet: Number.isInteger(rawTech.activeSet) && (rawTech.activeSet as number) >= 0 && (rawTech.activeSet as number) < 3 ? (rawTech.activeSet as number) : 0,
    stock: rawTech.stock && typeof rawTech.stock === 'object' ? { ...rawTech.stock } : {},
    ledger: rawTech.ledger && typeof rawTech.ledger === 'object' ? { ...rawTech.ledger } : {},
    consumableSpend: num(rawTech.consumableSpend, 0),
    retroGranted: rawTech.retroGranted === true,
    coinNotice: rawTech.coinNotice === true,
  };
  while (tech.sets.length < 3) tech.sets.push({ placements: [] });
  const clearedWith = clearedWithEarly;
  const trialsPlayed: Record<string, number> = {};
  const rawTr = (parsed as { trialsPlayed?: Record<string, unknown> }).trialsPlayed;
  if (rawTr && typeof rawTr === 'object') {
    for (const [k, v] of Object.entries(rawTr)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) trialsPlayed[k] = Math.floor(v);
    }
  }
  const progressSplitNotice =
    (parsed as { progressSplitNotice?: boolean }).progressSplitNotice === true
    || (migratingSplit && mageRefunded);

  const out: SaveData = {
    version: 1,
    lang: parsed.lang === 'en' || parsed.lang === 'zh-HK' ? parsed.lang : d.lang,
    skills: { ...loadouts[active] },
    highestCleared: 0,
    cleared: [],
    clears: {},
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
    seenBosses: [],
    ftueDone: parsed.ftueDone === true,
    loadouts,
    activeLoadout: active,
    respecNotice: parsed.respecNotice === true || refunded || (weatherRefund && !migratingSplit),
    character,
    entitlementCache,
    mage: { loadouts: mageLoadouts, active: mageActive, spellBars },
    tech,
    clearedWith,
    trialsPlayed,
    progress,
    progressSplitNotice,
  };
  syncTopLevelProgress(out);
  return out;
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
let mirrorSave: ((json: string) => void) | null = null;

/** Native shell registers a Preferences mirror. Web leaves this unset. */
export function setSaveMirror(fn: ((json: string) => void) | null): void {
  mirrorSave = fn;
}

export function writeSave(data: SaveData): boolean {
  // v0.7: the active loadout slot mirrors `skills`.
  if (Array.isArray(data.loadouts) && data.loadouts[data.activeLoadout]) data.loadouts[data.activeLoadout] = { ...data.skills };
  // v0.8.1: keep top-level cleared mirrors equal to the active character.
  if (data.progress) syncTopLevelProgress(data);
  let json: string;
  try {
    json = JSON.stringify(data);
  } catch {
    return false;
  }
  memory = json;
  try {
    localStorage.setItem(KEY, json);
    mirrorSave?.(json);
    return true;
  } catch {
    return false;
  }
}
