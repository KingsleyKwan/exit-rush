/**
 * Gear L 「裝備L」 — coins, polyomino backpack, shop catalogue.
 * Pure TS. The sim never sees the grid; `resolveKit` turns a set into modifiers.
 * See docs/CHARACTERS.md §5.
 */
import type { SkillModifiers } from './SkillTree';
import { modifiersFromSkills } from './SkillTree';
import type { TechProgress, SaveData } from './storage';
import { progressOf } from './storage';
import type { PlayerMods } from './charactersDef';

export type ItemId =
  | 'S1' | 'S2' | 'S3'
  | 'G1' | 'G2' | 'G3'
  | 'H1' | 'H2' | 'H3'
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5'
  | 'C1' | 'C2' | 'C3'
  | 'K1' | 'K2' | 'K3';

export type Tier = 1 | 2 | 3;
export type Rot = 0 | 1 | 2 | 3;
export type Slot = 'shoes' | 'gloves' | 'head' | 'gadget' | 'core' | 'consumable';
export type ShapeCode = 'O1' | 'I2' | 'I3' | 'L3' | 'I4' | 'L4' | 'T4' | 'S4' | 'Z4' | 'U5' | 'X5';

export interface Cell { x: number; y: number }

export interface Placement {
  id: ItemId;
  tier: Tier;
  x: number;
  y: number;
  rot: Rot;
}

export const SHAPES: Record<ShapeCode, string[]> = {
  O1: ['#'],
  I2: ['##'],
  I3: ['###'],
  L3: ['#.', '##'],
  I4: ['####'],
  L4: ['#.', '#.', '##'],
  T4: ['###', '.#.'],
  S4: ['.##', '##.'],
  Z4: ['##.', '.##'],
  U5: ['#.#', '###'],
  X5: ['.#.', '###', '.#.'],
};

export const GRID_TIERS: { cols: number; rows: number; price: number }[] = [
  { cols: 2, rows: 2, price: 0 },
  { cols: 2, rows: 3, price: 150 },
  { cols: 3, rows: 3, price: 450 },
  { cols: 3, rows: 4, price: 1200 },
  { cols: 4, rows: 4, price: 2400 },
];

export interface ItemDef {
  id: ItemId;
  slot: Slot;
  /** Upgrade cost for tier 1 / 2 / 3. Missing = tier does not exist. */
  price: number[];
  /** Cleared-level required to buy that tier. */
  req: number[];
  shape: ShapeCode[];
  active?: boolean;
  nameEn: string;
  nameZh: string;
  blurbEn: string;
  blurbZh: string;
}

export const ITEMS: ItemDef[] = [
  { id: 'S1', slot: 'shoes', price: [100, 200, 350], req: [0, 40, 60], shape: ['O1', 'I2', 'I3'], nameEn: 'Sprint Sneakers', nameZh: '跑鞋', blurbEn: 'Move faster. Luxury is quicker in open space.', blurbZh: '跑快啲。名貴喺空位再快。' },
  { id: 'S2', slot: 'shoes', price: [150, 250, 450], req: [8, 40, 60], shape: ['O1', 'I2', 'Z4'], active: true, nameEn: 'Spring Boots', nameZh: '彈簧鞋', blurbEn: 'Hop over squatters and kids.', blurbZh: '跳過踎低同細路。' },
  { id: 'S3', slot: 'shoes', price: [150, 250, 450], req: [6, 40, 60], shape: ['O1', 'I2', 'I4'], nameEn: 'Hover Skates', nameZh: '磁浮滑板鞋', blurbEn: 'Slip past suitcases. Luxury also the giant case.', blurbZh: '穿過行李箱。名貴連大箱都過到。' },
  { id: 'G1', slot: 'gloves', price: [100, 200, 350], req: [0, 40, 60], shape: ['O1', 'I2', 'L3'], nameEn: 'Hydraulic Gloves', nameZh: '液壓手套', blurbEn: 'Harder push. Luxury shoves squatters harder.', blurbZh: '推得更大力。名貴推踎低更勁。' },
  { id: 'G2', slot: 'gloves', price: [150, 250, 450], req: [6, 40, 60], shape: ['O1', 'I2', 'T4'], nameEn: 'Shock Gauntlets', nameZh: '震波拳套', blurbEn: 'Full-charge shove sends a shockwave.', blurbZh: '蓄滿力推會爆震波。' },
  { id: 'G3', slot: 'gloves', price: [150, 250, 450], req: [18, 40, 60], shape: ['O1', 'I2', 'L4'], nameEn: 'Joy Buzzer Gloves', nameZh: '整蠱震震手套', blurbEn: 'A shove makes a couple let go.', blurbZh: '一推，情侶就鬆手。' },
  { id: 'H1', slot: 'head', price: [150, 250, 450], req: [9, 40, 60], shape: ['O1', 'I2', 'T4'], nameEn: 'Gas Mask', nameZh: '防毒面罩', blurbEn: 'Cuts the stench slow.', blurbZh: '減低臭味減速。' },
  { id: 'H2', slot: 'head', price: [150, 250, 450], req: [26, 40, 60], shape: ['O1', 'I2', 'L4'], nameEn: 'Noise-Cancel Headphones', nameZh: '降噪耳機', blurbEn: 'Cuts loudmouth stamina drain.', blurbZh: '減低大聲公抽體力。' },
  { id: 'H3', slot: 'head', price: [100, 200, 350], req: [0, 40, 60], shape: ['O1', 'I2', 'I3'], nameEn: 'AR Visor', nameZh: 'AR眼鏡', blurbEn: 'Reads gaps. Luxury warns before an angry shove.', blurbZh: '睇到空位。名貴提早警告嬲人。' },
  { id: 'D1', slot: 'gadget', price: [100, 200, 350], req: [0, 40, 60], shape: ['O1', 'I2', 'L3'], nameEn: 'Power Bank', nameZh: '充電寶', blurbEn: 'More stamina and faster regen.', blurbZh: '體力更多，回復更快。' },
  { id: 'D2', slot: 'gadget', price: [150, 250, 450], req: [21, 40, 60], shape: ['O1', 'I2', 'U5'], nameEn: 'Exo-Brace', nameZh: '外骨骼', blurbEn: 'Heavier. Angry shoves barely move you.', blurbZh: '重身。嬲人推你都唔郁。' },
  { id: 'D3', slot: 'gadget', price: [150, 250, 450], req: [15, 40, 60], shape: ['O1', 'I2', 'Z4'], active: true, nameEn: 'Decoy Drone', nameZh: '誘餌無人機', blurbEn: 'Brats chase the drone.', blurbZh: '衰仔追住無人機。' },
  { id: 'D4', slot: 'gadget', price: [150, 250, 450], req: [12, 40, 60], shape: ['O1', 'I2', 'L4'], active: true, nameEn: 'Cartoon Tablet', nameZh: '卡通平板', blurbEn: 'Nearby family stops to watch.', blurbZh: '附近家庭停低睇。' },
  { id: 'D5', slot: 'gadget', price: [150, 250, 450], req: [9, 40, 60], shape: ['O1', 'I2', 'S4'], active: true, nameEn: 'Turbo Fan', nameZh: '手提風扇', blurbEn: 'Gust clears a lane and blows stench away.', blurbZh: '一陣風開路，吹走臭味。' },
  { id: 'C1', slot: 'core', price: [900, 600, 900], req: [70, 80, 90], shape: ['I2', 'L4', 'X5'], nameEn: 'Mech Arms', nameZh: '機械臂', blurbEn: 'Iron Bull charge.', blurbZh: '鐵牛撞門。' },
  { id: 'C2', slot: 'core', price: [900, 600, 900], req: [70, 80, 90], shape: ['I2', 'L4', 'X5'], nameEn: 'Jet Pack', nameZh: '噴射背包', blurbEn: 'Slip-off dash.', blurbZh: '閃身落車。' },
  { id: 'C3', slot: 'core', price: [900, 600, 900], req: [70, 80, 90], shape: ['I2', 'L4', 'X5'], nameEn: 'Force Field', nameZh: '力場護盾', blurbEn: 'Iron stance.', blurbZh: '鐵馬企穩。' },
  { id: 'K1', slot: 'consumable', price: [25], req: [0], shape: ['O1'], nameEn: 'Energy Drink', nameZh: '能量飲品', blurbEn: '+40 stamina, clears winded.', blurbZh: '體力 +40，解除透支。' },
  { id: 'K2', slot: 'consumable', price: [35], req: [0], shape: ['O1'], nameEn: 'Double Espresso', nameZh: '雙倍特濃', blurbEn: '5 s of extra speed.', blurbZh: '5 秒加速。' },
  { id: 'K3', slot: 'consumable', price: [30], req: [9], shape: ['O1'], nameEn: 'Mint Gum', nameZh: '薄荷香口膠', blurbEn: '6 s stench immunity and quieter calls.', blurbZh: '6 秒唔怕臭，電話聲細啲。' },
];

const BY_ID = new Map(ITEMS.map((it) => [it.id, it]));

export function itemDef(id: string): ItemDef | undefined {
  return BY_ID.get(id as ItemId);
}

export function isItemId(id: string): id is ItemId {
  return BY_ID.has(id as ItemId);
}

export function gridOf(tier: number): { cols: number; rows: number } {
  const t = Math.max(0, Math.min(4, tier | 0));
  return GRID_TIERS[t];
}

export function parseMask(rows: string[]): Cell[] {
  const cells: Cell[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') cells.push({ x, y });
  });
  return cells;
}

/** 90° clockwise: (x, y) → (h−1−y, x), then shift to the origin. */
export function rotateCells(cells: Cell[], times: number): Cell[] {
  let cur = cells.map((c) => ({ x: c.x, y: c.y }));
  const n = ((times % 4) + 4) % 4;
  for (let i = 0; i < n; i++) {
    const h = Math.max(0, ...cur.map((c) => c.y)) + 1;
    cur = cur.map((c) => ({ x: h - 1 - c.y, y: c.x }));
  }
  const minX = Math.min(...cur.map((c) => c.x));
  const minY = Math.min(...cur.map((c) => c.y));
  return cur
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

export function rotationsOf(code: ShapeCode): Cell[][] {
  const base = parseMask(SHAPES[code]);
  const seen = new Set<string>();
  const out: Cell[][] = [];
  for (let r = 0; r < 4; r++) {
    const rot = rotateCells(base, r);
    const key = rot.map((c) => `${c.x},${c.y}`).join(';');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rot);
  }
  return out;
}

const ROT_CACHE = new Map<ShapeCode, Cell[][]>(
  (Object.keys(SHAPES) as ShapeCode[]).map((k) => [k, rotationsOf(k)]),
);

export function shapeCells(code: ShapeCode, rot: number): Cell[] {
  const all = ROT_CACHE.get(code)!;
  // Map a requested 0–3 rotation onto the de-duplicated list by recomputing.
  const base = parseMask(SHAPES[code]);
  const want = rotateCells(base, rot);
  const key = want.map((c) => `${c.x},${c.y}`).join(';');
  return all.find((r) => r.map((c) => `${c.x},${c.y}`).join(';') === key) ?? want;
}

export function footprint(id: ItemId, tier: Tier): Cell[][] {
  const def = itemDef(id)!;
  const code = def.shape[Math.min(def.shape.length, tier) - 1];
  return ROT_CACHE.get(code)!;
}

export function cellsFor(id: ItemId, tier: Tier, rot: Rot): Cell[] {
  const def = itemDef(id)!;
  const code = def.shape[Math.min(def.shape.length, tier) - 1];
  return shapeCells(code, rot);
}

/** First-clear coins for a level. Boss levels ×2. L100 is 300. */
export function firstClearCoins(levelId: number): number {
  if (levelId === 100) return 300;
  const base = 10 + levelId;
  if (levelId >= 20 && levelId <= 90 && levelId % 10 === 0) return base * 2;
  return base;
}

export interface CoinBreakdown {
  first: number;
  fast: number;
  replay: number;
  total: number;
}

/** Coins earned from tech clears + ledger. Not stored. */
export function coinsEarned(cleared: readonly number[], ledger: TechProgress['ledger']): CoinBreakdown {
  let first = 0;
  let fast = 0;
  let replay = 0;
  for (const id of cleared) {
    const base = firstClearCoins(id);
    first += base;
    const led = ledger[String(id)];
    if (led?.fast) fast += Math.floor(base * 0.5);
    if (led) replay += Math.floor(base * 0.2) * Math.min(5, Math.max(0, led.replays | 0));
  }
  return { first, fast, replay, total: first + fast + replay };
}

export function itemSpend(items: TechProgress['items']): number {
  let n = 0;
  for (const [id, tier] of Object.entries(items)) {
    const def = itemDef(id);
    if (!def || def.slot === 'consumable') continue;
    const t = Math.max(0, Math.min(def.price.length, tier));
    for (let i = 0; i < t; i++) n += def.price[i];
  }
  return n;
}

export function gridSpend(gridTier: number): number {
  let n = 0;
  for (let i = 1; i <= Math.max(0, Math.min(4, gridTier)); i++) n += GRID_TIERS[i].price;
  return n;
}

export function coinBalance(save: Pick<SaveData, 'tech' | 'progress' | 'character'>): number {
  const cleared = progressOf(save as SaveData, 'tech').cleared;
  const earned = coinsEarned(cleared, save.tech.ledger).total;
  const spent = itemSpend(save.tech.items) + gridSpend(save.tech.gridTier) + Math.max(0, save.tech.consumableSpend | 0);
  return earned - spent;
}

/** Refund owned gear (not the grid, not used consumables) when a retune over-spends. */
export function reconcileTech(save: SaveData): boolean {
  if (coinBalance(save) >= 0) return false;
  save.tech.items = {};
  for (const set of save.tech.sets) set.placements = set.placements.filter((p) => itemDef(p.id)?.slot === 'consumable');
  save.tech.coinNotice = true;
  if (coinBalance(save) < 0) {
    // Grid is non-refundable. Drop it only if even an empty backpack is over-spent (price retune).
    save.tech.gridTier = 0;
  }
  return true;
}

export type PlaceResult =
  | { ok: true }
  | { ok: false; reason: 'bounds' | 'overlap' | 'unknown' | 'tier' | 'body' | 'once' | 'active' | 'consumable' | 'stock' };

const BODY: Slot[] = ['shoes', 'gloves', 'head', 'core'];

export function placeCheck(
  placements: readonly { id: string; tier: number; x: number; y: number; rot: number }[],
  gridTier: number,
  owned: TechProgress['items'],
  stock: TechProgress['stock'],
  next: Placement,
  skipIndex?: number,
): PlaceResult {
  const def = itemDef(next.id);
  if (!def) return { ok: false, reason: 'unknown' };
  const { cols, rows } = gridOf(gridTier);
  if (def.slot === 'consumable') {
    if (next.tier !== 1) return { ok: false, reason: 'tier' };
    const have = stock[next.id] ?? 0;
    const already = placements.filter((p, i) => p.id === next.id && i !== skipIndex).length;
    if (already >= have) return { ok: false, reason: 'stock' };
    const cons = placements.filter((p, i) => itemDef(p.id)?.slot === 'consumable' && i !== skipIndex).length;
    if (cons >= 3) return { ok: false, reason: 'consumable' };
  } else {
    const have = owned[next.id] ?? 0;
    if (have < next.tier || next.tier < 1) return { ok: false, reason: 'tier' };
    if (placements.some((p, i) => i !== skipIndex && p.id === next.id)) return { ok: false, reason: 'once' };
    if (BODY.includes(def.slot)) {
      if (placements.some((p, i) => i !== skipIndex && itemDef(p.id)?.slot === def.slot)) return { ok: false, reason: 'body' };
    }
    if (def.active) {
      const n = placements.filter((p, i) => i !== skipIndex && itemDef(p.id)?.active).length;
      if (n >= 3) return { ok: false, reason: 'active' };
    }
  }
  const cells = cellsFor(next.id, next.tier, next.rot);
  let bits = 0;
  placements.forEach((p, i) => {
    if (i === skipIndex || !isItemId(p.id)) return;
    const tier = (p.tier === 2 || p.tier === 3 ? p.tier : 1) as Tier;
    const rot = (p.rot & 3) as Rot;
    for (const c of cellsFor(p.id, tier, rot)) bits |= 1 << ((p.y + c.y) * 4 + (p.x + c.x));
  });
  let piece = 0;
  for (const c of cells) {
    const x = next.x + c.x;
    const y = next.y + c.y;
    if (x < 0 || y < 0 || x >= cols || y >= rows || x >= 4 || y >= 4) return { ok: false, reason: 'bounds' };
    piece |= 1 << (y * 4 + x);
  }
  if ((bits & piece) !== 0) return { ok: false, reason: 'overlap' };
  return { ok: true };
}

export interface ActiveKit {
  placements: Placement[];
  /** Up to 3 active gadget/shoe ids (not cores). */
  actives: ItemId[];
  core: 'C1' | 'C2' | 'C3' | null;
  coreTier: Tier | null;
  consumables: ItemId[];
  mods: SkillModifiers;
  extras: Partial<PlayerMods>;
}

function emptyMods(): SkillModifiers {
  return modifiersFromSkills({ str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 });
}

interface Fx {
  speed: number;
  push: number;
  stam: number;
  regen: number;
  gap: number;
  clearSpeed: number;
  mass: number;
  hurdle: boolean;
  hurdlePace: number;
  passBoss: boolean;
  leap: boolean;
  leapCd: number;
  pound: boolean;
  gpR: number;
  gpLug: number;
  split: boolean;
  stench: number;
  loud: number;
  angryRemain: number;
  front: number;
  resist: number;
  core: 'C1' | 'C2' | 'C3' | null;
  coreTier: Tier | null;
  actives: ItemId[];
  consumables: ItemId[];
  tiers: Record<string, Tier>;
}

function blankFx(): Fx {
  return {
    speed: 1, push: 1, stam: 0, regen: 0, gap: 0, clearSpeed: 1, mass: 0,
    hurdle: false, hurdlePace: 1, passBoss: false, leap: false, leapCd: 9,
    pound: false, gpR: 1.2, gpLug: 2, split: false, stench: 0, loud: 0, angryRemain: 1,
    front: 0, resist: 0,
    core: null, coreTier: null, actives: [], consumables: [], tiers: {},
  };
}

/** Mid/名貴 gloves keep Hero's STR-20 shoulder and a slice of resist, so a counter glove is not a push reset. 平 stays the spec effect only. */
function applyGloveStats(fx: Fx, tier: Tier, withPush: boolean): void {
  if (tier < 2) return;
  if (withPush) fx.push *= tier === 3 ? 1.4 : 1.25;
  fx.front = 0.35;
  fx.resist = tier === 3 ? 0.25 : 0.15;
}

function applyPiece(fx: Fx, id: ItemId, tier: Tier): void {
  fx.tiers[id] = tier;
  const i = tier - 1;
  const pick = (a: number, b: number, c: number) => [a, b, c][i];
  switch (id) {
    case 'S1':
      fx.speed *= pick(1.1, 1.2, 1.3);
      // 🎛️ Hero's earned spread has Open Lane + gap sense from SPD 20, which
      // mid shoes can first match (名貴 stays the full 1.18 clear).
      if (tier >= 2) fx.clearSpeed = tier === 3 ? 1.18 : 1.12;
      if (tier >= 2) fx.gap += tier === 3 ? 0.2 : 0.12;
      break;
    case 'S2':
      fx.leap = true;
      fx.leapCd = pick(9, 7.5, 6);
      fx.actives.push('S2');
      break;
    case 'S3':
      fx.hurdle = true;
      // 🎛️ Spec starts at 0.6/0.7/0.8. A 0.6 hop is slower than walking and
      // lost the ±10 pp band on luggage levels, so cheap/mid stay near full pace.
      fx.hurdlePace = pick(0.85, 0.92, 1);
      fx.passBoss = tier === 3;
      break;
    case 'G1':
      fx.push *= pick(1.12, 1.25, 1.4);
      applyGloveStats(fx, tier, false);
      break;
    case 'G2':
      fx.pound = true;
      fx.gpR = pick(1.2, 1.4, 1.6);
      fx.gpLug = pick(2, 2.3, 2.6);
      applyGloveStats(fx, tier, true);
      break;
    case 'G3':
      fx.split = true;
      applyGloveStats(fx, tier, true);
      break;
    case 'H1':
      fx.stench = pick(0.5, 0.75, 1);
      break;
    case 'H2':
      fx.loud = pick(0.35, 0.55, 0.7);
      break;
    case 'H3':
      fx.gap += pick(0.12, 0.24, 0.35);
      break;
    case 'D1':
      fx.stam += pick(15, 30, 45);
      // 🎛️ Mid/名貴 regen stands in for Hero STA 20 Second Breath. 平 stays +3.
      fx.regen += pick(3, 8, 14);
      break;
    case 'D2':
      fx.mass += pick(0.3, 0.5, 0.7);
      fx.angryRemain = Math.min(fx.angryRemain, pick(0.6, 0.35, 0.15));
      break;
    case 'D3':
    case 'D4':
    case 'D5':
      fx.actives.push(id);
      break;
    case 'C1':
    case 'C2':
    case 'C3':
      fx.core = id;
      fx.coreTier = tier;
      break;
    case 'K1':
    case 'K2':
    case 'K3':
      fx.consumables.push(id);
      break;
    default:
      break;
  }
}

/** Validate a set and fold placed pieces into modifiers. Invalid pieces are dropped. */
export function resolveKit(tech: Pick<TechProgress, 'items' | 'gridTier' | 'sets' | 'activeSet' | 'stock'>): ActiveKit {
  const set = tech.sets[tech.activeSet] ?? tech.sets[0] ?? { placements: [] };
  const kept: Placement[] = [];
  for (const raw of set.placements) {
    if (!isItemId(raw.id)) continue;
    const p: Placement = {
      id: raw.id,
      tier: (raw.tier === 2 || raw.tier === 3 ? raw.tier : 1) as Tier,
      x: raw.x | 0,
      y: raw.y | 0,
      rot: (raw.rot & 3) as Rot,
    };
    const chk = placeCheck(kept, tech.gridTier, tech.items, tech.stock, p);
    if (chk.ok) kept.push(p);
  }
  const fx = blankFx();
  for (const p of kept) applyPiece(fx, p.id, p.tier);
  const mods = emptyMods();
  mods.moveSpeed = fx.speed;
  mods.pushForce = fx.push;
  mods.frontPush = fx.front;
  mods.resist = fx.resist;
  mods.staminaMax = 90 + fx.stam;
  mods.staminaRegen = 11 + fx.regen;
  mods.gapSense = fx.gap;
  mods.clearSpeed = fx.clearSpeed;
  mods.hurdle = fx.hurdle;
  mods.hasLeap = fx.leap;
  mods.hasGroundPound = fx.pound;
  mods.splitCouples = fx.split;
  mods.holdBreath = fx.stench >= 0.999;
  mods.auraResist = fx.stench >= 0.999 ? 0 : fx.stench;
  mods.unbothered = fx.loud >= 0.7;
  mods.standFirm = fx.angryRemain <= 0.15;
  const coreCd = fx.coreTier === 3 ? 10 : fx.coreTier === 2 ? 12 : fx.coreTier === 1 ? 14 : undefined;
  const extras: Partial<PlayerMods> = {
    mass0: 1.4 + fx.mass,
    pushMul: 1,
    speedMul: 0.95,
    techLeapCd: fx.leap ? fx.leapCd : undefined,
    techUltCd: coreCd,
    techLoudCut: fx.loud > 0 && fx.loud < 0.7 ? fx.loud : undefined,
    techAngryRemain: fx.angryRemain < 1 ? fx.angryRemain : undefined,
    techHurdlePace: fx.hurdle ? fx.hurdlePace : undefined,
    techPassBossCase: fx.passBoss,
    techGpRadius: fx.pound ? fx.gpR : undefined,
    techGpLuggage: fx.pound ? fx.gpLug : undefined,
    techActives: fx.actives.slice(0, 3),
    techCore: fx.core === 'C1' ? 'str' : fx.core === 'C2' ? 'spd' : fx.core === 'C3' ? 'sta' : null,
    techConsumables: fx.consumables.slice(0, 3),
    techTier: fx.tiers,
    spellBar: fx.actives.slice(0, 3),
  };
  return {
    placements: kept,
    actives: fx.actives.slice(0, 3),
    core: fx.core,
    coreTier: fx.coreTier,
    consumables: fx.consumables.slice(0, 3),
    mods,
    extras,
  };
}

function spendStock(save: SaveData, id: string): void {
  const have = save.tech.stock[id] ?? 0;
  if (have > 0) save.tech.stock[id] = have - 1;
}

/**
 * Record a finished tech run into the coin ledger. Call after recordClear on a win.
 * Consumables: a cast is spent on a win; a loss spends every unit that was packed.
 * `remainingConsumables` is the run's leftover list (wins only).
 */
export function noteTechResult(
  save: SaveData,
  levelId: number,
  won: boolean,
  timeLeft: number,
  timer: number,
  wasFirst: boolean,
  remainingConsumables?: readonly string[],
): void {
  if (save.character !== 'tech' || save.tech == null) return;
  const key = String(levelId);
  const led = save.tech.ledger[key] ?? { replays: 0, fast: false };
  if (won && !wasFirst) led.replays = Math.min(99, led.replays + 1);
  if (won && !led.fast && timer > 0 && timeLeft >= timer * 0.35) led.fast = true;
  save.tech.ledger[key] = led;
  const kit = resolveKit(save.tech);
  if (!won) {
    for (const id of kit.consumables) spendStock(save, id);
    return;
  }
  if (!remainingConsumables) return;
  const left = [...remainingConsumables];
  for (const id of kit.consumables) {
    const i = left.indexOf(id);
    if (i >= 0) left.splice(i, 1);
    else spendStock(save, id);
  }
}

export type BuyBlock =
  | { reason: 'coins'; price: number }
  | { reason: 'level'; need: number; price: number }
  | { reason: 'max' };

/** Why the next tier cannot be bought. Null means the same checks buyItem is about to pass. */
export function buyBlock(save: SaveData, id: ItemId): BuyBlock | null {
  const def = itemDef(id);
  if (!def) return { reason: 'max' };
  const prog = progressOf(save, 'tech');
  const cleared = new Set(prog.cleared);
  const highest = prog.highestCleared;
  if (def.slot === 'consumable') {
    const have = save.tech.stock[id] ?? 0;
    if (have >= 9) return { reason: 'max' };
    const need = def.req[0] ?? 0;
    const price = def.price[0];
    // Consumables require that exact level, not any later clear.
    if (highest < need && !cleared.has(need)) return { reason: 'level', need, price };
    if (coinBalance(save) < price) return { reason: 'coins', price };
    return null;
  }
  const cur = (save.tech.items[id] ?? 0) as 0 | Tier;
  if (cur >= def.price.length) return { reason: 'max' };
  const next = (cur + 1) as Tier;
  const need = def.req[next - 1] ?? 0;
  const price = def.price[next - 1];
  if (need > 0 && highest < need && ![...cleared].some((n) => n >= need)) return { reason: 'level', need, price };
  if (coinBalance(save) < price) return { reason: 'coins', price };
  return null;
}

export function buyItem(save: SaveData, id: ItemId): boolean {
  if (buyBlock(save, id)) return false;
  const def = itemDef(id);
  if (!def) return false;
  if (def.slot === 'consumable') {
    const have = save.tech.stock[id] ?? 0;
    const price = def.price[0];
    save.tech.stock[id] = have + 1;
    save.tech.consumableSpend += price;
    return true;
  }
  const cur = (save.tech.items[id] ?? 0) as 0 | Tier;
  save.tech.items[id] = (cur + 1) as Tier;
  return true;
}

export function sellItem(save: SaveData, id: ItemId): boolean {
  const def = itemDef(id);
  if (!def || def.slot === 'consumable') return false;
  const cur = save.tech.items[id] ?? 0;
  if (cur <= 0) return false;
  const next = (cur - 1) as 0 | Tier;
  if (next === 0) delete save.tech.items[id];
  else save.tech.items[id] = next;
  for (const set of save.tech.sets) {
    set.placements = set.placements.filter((p) => p.id !== id || (next > 0 && p.tier <= next));
    for (const p of set.placements) if (p.id === id && p.tier > next) p.tier = next as Tier;
  }
  return true;
}

export function expandGrid(save: SaveData): boolean {
  if (save.tech.gridTier >= 4) return false;
  const price = GRID_TIERS[save.tech.gridTier + 1].price;
  if (coinBalance(save) < price) return false;
  save.tech.gridTier = (save.tech.gridTier + 1) as 0 | 1 | 2 | 3 | 4;
  return true;
}

/** Deterministic pack: largest footprints first, then fixed rotation order. */
export function autoPack(tech: TechProgress): Placement[] {
  const owned = Object.entries(tech.items)
    .filter((e): e is [ItemId, Tier] => isItemId(e[0]) && (e[1] === 1 || e[1] === 2 || e[1] === 3) && itemDef(e[0])?.slot !== 'consumable')
    .map(([id, tier]) => ({ id, tier }));
  owned.sort((a, b) => {
    const ca = cellsFor(a.id, a.tier, 0).length;
    const cb = cellsFor(b.id, b.tier, 0).length;
    if (cb !== ca) return cb - ca;
    return a.id < b.id ? -1 : 1;
  });
  const { cols, rows } = gridOf(tech.gridTier);
  const placed: Placement[] = [];
  const tryPlace = (id: ItemId, tier: Tier): boolean => {
    const def = itemDef(id)!;
    const rots: Rot[] = [0, 1, 2, 3];
    for (const rot of rots) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const p: Placement = { id, tier, x, y, rot };
          if (placeCheck(placed, tech.gridTier, tech.items, tech.stock, p).ok) {
            placed.push(p);
            return true;
          }
        }
      }
    }
    return false;
  };
  for (const it of owned) {
    let tier = it.tier;
    while (tier >= 1) {
      if (tryPlace(it.id, tier as Tier)) break;
      tier = (tier - 1) as Tier;
      if (tier < 1) break;
    }
  }
  // Up to 3 consumables that are in stock, smallest, after gear.
  const cons: ItemId[] = ['K1', 'K2', 'K3'];
  for (const id of cons) {
    let guard = 0;
    while ((tech.stock[id] ?? 0) > placed.filter((p) => p.id === id).length && guard++ < 3) {
      if (!tryPlace(id, 1)) break;
    }
  }
  return placed;
}

/** Recommended buys for the next level, then auto-pack. Used by the bot and 「推介套裝」. */
export function recommendKit(cleared: readonly number[], levelId: number, fastFrac = 0.5): TechProgress {
  const tech: TechProgress = {
    items: {},
    gridTier: 0,
    sets: [{ placements: [] }, { placements: [] }, { placements: [] }],
    activeSet: 0,
    stock: {},
    ledger: {},
    consumableSpend: 0,
    retroGranted: true,
    coinNotice: false,
  };
  for (const id of cleared) {
    if (fastFrac > 0) tech.ledger[String(id)] = { replays: 0, fast: true };
  }
  // fastFrac 0.5 means half of levels were fast — approximate with a synthetic ledger ratio via coins.
  // coinsEarned only adds fast when the flag is set. Scale by granting fast on the first N levels.
  if (fastFrac > 0 && fastFrac < 1) {
    const ids = [...cleared].sort((a, b) => a - b);
    const n = Math.round(ids.length * fastFrac);
    tech.ledger = {};
    ids.forEach((id, i) => {
      tech.ledger[String(id)] = { replays: 0, fast: i < n };
    });
  }
  const wish = wishFor(levelId);
  const cores = wish.filter((id) => id.startsWith('C'));
  const rest = wish.filter((id) => !id.startsWith('C'));
  const fakeSave = {
    tech,
    progress: {
      hero: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
      mage: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
      tech: { cleared: [...cleared], clears: {}, highestCleared: cleared.length ? Math.max(...cleared) : 0, seenBosses: [] },
    },
    character: 'tech' as const,
  };
  const saveAs = fakeSave as unknown as SaveData;
  const tryExpand = () => {
    if (tech.gridTier >= 4) return false;
    const price = GRID_TIERS[tech.gridTier + 1].price;
    // Buy power before a bigger bag, unless the current grid is already tight.
    const free = gridOf(tech.gridTier).cols * gridOf(tech.gridTier).rows;
    const ownedCells = Object.entries(tech.items).reduce((n, [id, tier]) => {
      if (!isItemId(id) || tier < 1) return n;
      return n + cellsFor(id, Math.min(3, tier) as Tier, 0).length;
    }, 0);
    if (ownedCells + 1 < free) return false;
    if (coinBalance(saveAs) < price + 150) return false;
    tech.gridTier = (tech.gridTier + 1) as 0 | 1 | 2 | 3 | 4;
    return true;
  };
  // One tier of each staple before upgrading anyone, and before a core.
  for (const target of [1, 2, 3] as const) {
    for (const id of rest) {
      if ((tech.items[id] ?? 0) >= target) continue;
      if ((tech.items[id] ?? 0) !== target - 1) continue;
      buyItem(saveAs, id);
      tryExpand();
    }
  }
  for (const id of cores) {
    for (let i = 0; i < 3; i++) {
      if (!buyItem(saveAs, id)) break;
      tryExpand();
    }
  }
  // Two drinks on a long early boss (L40) overshot the hero band. One until mid game.
  const drinks = levelId >= 60 ? 2 : 1;
  for (let i = 0; i < drinks; i++) buyItem(saveAs, 'K1');
  tech.sets[0].placements = packFitted(tech, wish);
  return tech;
}

/** Place every owned item at 平, then grow tiers in prefer order when the new shape fits. */
export function packFitted(tech: TechProgress, prefer: readonly ItemId[] = []): Placement[] {
  const placed: Placement[] = [];
  const ids: ItemId[] = [];
  for (const id of [...prefer, ...(Object.keys(tech.items) as ItemId[])]) {
    if (!isItemId(id) || ids.includes(id)) continue;
    if ((tech.items[id] ?? 0) < 1) continue;
    if (itemDef(id)?.slot === 'consumable') continue;
    ids.push(id);
  }
  const fit = (id: ItemId, tier: Tier): boolean => {
    const { cols, rows } = gridOf(tech.gridTier);
    for (const rot of [0, 1, 2, 3] as Rot[]) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const p: Placement = { id, tier, x, y, rot };
          if (placeCheck(placed, tech.gridTier, tech.items, tech.stock, p).ok) {
            placed.push(p);
            return true;
          }
        }
      }
    }
    return false;
  };
  const staple = new Set<ItemId>(['S1', 'D1', 'G1']);
  const placeOrder = [...ids.filter((id) => staple.has(id)), ...ids.filter((id) => !staple.has(id))];
  for (const id of placeOrder) fit(id, 1);
  const grow = [...ids.filter((id) => staple.has(id)), ...ids.filter((id) => !staple.has(id))];
  for (const id of grow) {
    const owned = tech.items[id] ?? 1;
    for (let tier = 2; tier <= owned; tier++) {
      const idx = placed.findIndex((p) => p.id === id);
      const prev = idx >= 0 ? placed[idx] : null;
      if (idx >= 0) placed.splice(idx, 1);
      if (!fit(id, tier as Tier) && prev) placed.push(prev);
    }
  }
  for (const id of ['K1', 'K2', 'K3'] as ItemId[]) {
    let guard = 0;
    while ((tech.stock[id] ?? 0) > placed.filter((p) => p.id === id).length && guard++ < 3) {
      if (!fit(id, 1)) break;
    }
  }
  return placed;
}

function wishFor(levelId: number): ItemId[] {
  // One shoe only (body rule). Counter piece first, then speed / stamina / push.
  // Cores come last so they don't eat the whole coin pile.
  const boss: Record<number, ItemId[]> = {
    20: ['S3', 'G2', 'D1'],
    30: ['S1', 'D1', 'G1', 'H1', 'D5'],
    40: ['S2', 'G2', 'D1'],
    50: ['S1', 'D1', 'G1', 'D4'],
    60: ['S1', 'D1', 'G1', 'H2', 'D3'],
    70: ['S1', 'D1', 'G3'],
    80: ['S1', 'D1', 'G1', 'H2'],
    90: ['S1', 'D1', 'G1', 'H2', 'D5'],
    100: ['S1', 'D1', 'G1', 'S3', 'H1', 'D5', 'C2'],
  };
  const keys = Object.keys(boss).map(Number).sort((a, b) => a - b);
  let pick = keys[0];
  for (const k of keys) if (levelId >= k - 2) pick = k;
  if (levelId < 18) {
    return ['S1', 'D1', 'G1', 'S3', 'G2'];
  }
  return boss[pick];
}

/** Preset 3×3 trial kit (iOS try-before-buy). Not written to the save. */
export function trialTech(): TechProgress {
  const tech: TechProgress = {
    items: { S3: 2, G2: 2, H1: 1, D3: 1, D4: 1 },
    gridTier: 2,
    sets: [{ placements: [], }, { placements: [] }, { placements: [] }],
    activeSet: 0,
    stock: { K1: 2 },
    ledger: {},
    consumableSpend: 0,
    retroGranted: true,
    coinNotice: false,
  };
  tech.sets[0].placements = [
    { id: 'S3', tier: 2, x: 0, y: 0, rot: 0 },
    { id: 'G2', tier: 2, x: 0, y: 1, rot: 0 },
    { id: 'H1', tier: 1, x: 2, y: 0, rot: 0 },
    { id: 'D3', tier: 1, x: 2, y: 1, rot: 0 },
    { id: 'D4', tier: 1, x: 2, y: 2, rot: 0 },
    { id: 'K1', tier: 1, x: 0, y: 2, rot: 0 },
    { id: 'K1', tier: 1, x: 1, y: 2, rot: 0 },
  ];
  return tech;
}

function activeSet(tech: TechProgress): TechProgress['sets'][number] {
  if (!tech.sets[tech.activeSet]) tech.sets[tech.activeSet] = { placements: [] };
  return tech.sets[tech.activeSet];
}

export function placeInto(tech: TechProgress, p: Placement): PlaceResult {
  const set = activeSet(tech);
  const chk = placeCheck(set.placements, tech.gridTier, tech.items, tech.stock, p);
  if (!chk.ok) return chk;
  set.placements.push({ ...p });
  return chk;
}

export function removeAt(tech: TechProgress, index: number): void {
  const set = activeSet(tech);
  if (index >= 0 && index < set.placements.length) set.placements.splice(index, 1);
}

export function rotateAt(tech: TechProgress, index: number): boolean {
  const set = activeSet(tech);
  const cur = set.placements[index];
  if (!cur || !isItemId(cur.id)) return false;
  const next: Placement = { ...cur, id: cur.id, rot: ((cur.rot + 1) & 3) as Rot };
  const chk = placeCheck(set.placements, tech.gridTier, tech.items, tech.stock, next, index);
  if (!chk.ok) return false;
  set.placements[index] = next;
  return true;
}

export function retierAt(tech: TechProgress, index: number, tier: Tier): boolean {
  const set = activeSet(tech);
  const cur = set.placements[index];
  if (!cur || !isItemId(cur.id)) return false;
  const owned = tech.items[cur.id] ?? 0;
  if (tier < 1 || tier > owned) return false;
  const next: Placement = { ...cur, id: cur.id, tier };
  const chk = placeCheck(set.placements, tech.gridTier, tech.items, tech.stock, next, index);
  if (!chk.ok) return false;
  set.placements[index] = next;
  return true;
}

export function packActive(tech: TechProgress): void {
  activeSet(tech).placements = packFitted(tech);
}

/** Buy toward the recommended kit for the next level, then auto-pack the active set. */
export function applyRecommend(save: SaveData, levelId: number): void {
  const cleared = progressOf(save, 'tech').cleared;
  const want = recommendKit(cleared, Math.max(1, levelId), 0.5);
  let guard = 0;
  while (save.tech.gridTier < want.gridTier && guard++ < 6) {
    if (!expandGrid(save)) break;
  }
  for (const id of Object.keys(want.items)) {
    if (!isItemId(id)) continue;
    const tier = want.items[id] ?? 0;
    let g = 0;
    while ((save.tech.items[id] ?? 0) < tier && g++ < 4) {
      if (!buyItem(save, id)) break;
    }
  }
  for (let i = 0; i < 2; i++) buyItem(save, 'K1');
  activeSet(save.tech).placements = packFitted(save.tech, Object.keys(want.items).filter(isItemId));
}

function emptyTech(): TechProgress {
  return {
    items: {},
    gridTier: 0,
    sets: [{ placements: [] }, { placements: [] }, { placements: [] }],
    activeSet: 0,
    stock: {},
    ledger: {},
    consumableSpend: 0,
    retroGranted: true,
    coinNotice: false,
  };
}

/** Balance-bot kits. `earned` = clears before this level, 50% fast, greedy shop. */
export function kitForBot(loadout: string, levelId: number): TechProgress {
  if (loadout === 'tech:grid4' || loadout === 'tech:max' || loadout === 'max') {
    return syntheticKit(loadout === 'tech:max' || loadout === 'max');
  }
  if (loadout.startsWith('tech:kit:')) return specKit(loadout.slice('tech:kit:'.length));
  if (loadout !== 'earned' && loadout !== 'tech:earned') return emptyTech();
  const cleared: number[] = [];
  for (let i = 1; i < levelId; i++) cleared.push(i);
  return recommendKit(cleared, levelId, 0.5);
}

function syntheticKit(everything: boolean): TechProgress {
  const tech = emptyTech();
  tech.gridTier = 4;
  const focus = ['C2', 'S3', 'S1', 'H1', 'H2', 'D2', 'G3', 'D5', 'D1', 'G1', 'D4', 'S2'];
  for (const it of ITEMS) {
    if (it.slot === 'consumable') continue;
    if (!everything && !focus.includes(it.id)) continue;
    const tier = (everything ? it.price.length : Math.min(2, it.price.length)) as Tier;
    tech.items[it.id] = tier;
  }
  tech.stock = everything ? { K1: 3, K2: 1, K3: 2 } : { K1: 2, K3: 1 };
  tech.sets[0].placements = packFitted(tech, ['S1', 'D1', 'G1', 'C2', 'S3', 'H1', 'H2', 'D5']);
  return tech;
}

function specKit(spec: string): TechProgress {
  const tech = emptyTech();
  tech.gridTier = 4;
  for (const part of spec.split(/[,+]/)) {
    const m = /^([A-Z]\d)@([123])$/.exec(part.trim());
    if (!m || !isItemId(m[1])) continue;
    const tier = Number(m[2]) as Tier;
    const def = itemDef(m[1]);
    if (!def) continue;
    if (def.slot === 'consumable') tech.stock[m[1]] = Math.min(9, (tech.stock[m[1]] ?? 0) + 1);
    else tech.items[m[1]] = Math.max(tech.items[m[1]] ?? 0, Math.min(tier, def.price.length)) as Tier;
  }
  tech.sets[0].placements = autoPack(tech);
  return tech;
}

/** Pure checks for the balance bot. Returns failure strings (empty = pass). */
export function techKitSelfTest(): string[] {
  const fail: string[] = [];
  const eq = (name: string, ok: boolean, detail = '') => {
    if (!ok) fail.push(detail ? `${name}: ${detail}` : name);
  };
  eq('rot O1', rotationsOf('O1').length === 1, String(rotationsOf('O1').length));
  eq('rot I2', rotationsOf('I2').length === 2, String(rotationsOf('I2').length));
  eq('rot I3', rotationsOf('I3').length === 2, String(rotationsOf('I3').length));
  eq('rot L3', rotationsOf('L3').length === 4, String(rotationsOf('L3').length));
  eq('rot S4', rotationsOf('S4').length === 2, String(rotationsOf('S4').length));
  eq('rot Z4', rotationsOf('Z4').length === 2, String(rotationsOf('Z4').length));
  eq('rot X5', rotationsOf('X5').length === 1, String(rotationsOf('X5').length));
  eq('L1 coins', firstClearCoins(1) === 11);
  eq('L20 coins', firstClearCoins(20) === 60);
  eq('L100 coins', firstClearCoins(100) === 300);
  const earned = coinsEarned([1], { '1': { replays: 6, fast: true } });
  eq('replay cap', earned.replay === Math.floor(11 * 0.2) * 5, String(earned.replay));
  eq('fast once', earned.fast === Math.floor(11 * 0.5), String(earned.fast));
  const owned = { S1: 1 as const, G1: 1 as const, S3: 1 as const, D3: 1 as const, D4: 1 as const, D5: 1 as const, S2: 1 as const };
  const overlap = placeCheck(
    [{ id: 'S1', tier: 1, x: 0, y: 0, rot: 0 }],
    0, owned, {},
    { id: 'G1', tier: 1, x: 0, y: 0, rot: 0 },
  );
  eq('overlap', !overlap.ok && overlap.ok === false && overlap.reason === 'overlap', overlap.ok ? '' : overlap.reason);
  const body = placeCheck(
    [{ id: 'S1', tier: 1, x: 0, y: 0, rot: 0 }],
    0, owned, {},
    { id: 'S3', tier: 1, x: 1, y: 0, rot: 0 },
  );
  eq('body', !body.ok && body.reason === 'body', body.ok ? '' : body.reason);
  const actives: Placement[] = [
    { id: 'S2', tier: 1, x: 0, y: 0, rot: 0 },
    { id: 'D3', tier: 1, x: 1, y: 0, rot: 0 },
    { id: 'D4', tier: 1, x: 0, y: 1, rot: 0 },
  ];
  const fourth = placeCheck(actives, 2, owned, {}, { id: 'D5', tier: 1, x: 1, y: 1, rot: 0 });
  eq('active cap', !fourth.ok && fourth.reason === 'active', fourth.ok ? '' : fourth.reason);
  const down = placeCheck([], 0, { S3: 3 }, {}, { id: 'S3', tier: 1, x: 0, y: 0, rot: 0 });
  eq('downsize', down.ok);
  const cleared = Array.from({ length: 12 }, (_, i) => i + 1);
  const save = {
    tech: emptyTech(),
    progress: {
      hero: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
      mage: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
      tech: { cleared: [...cleared], clears: {}, highestCleared: 12, seenBosses: [] },
    },
    character: 'tech' as const,
  } as unknown as SaveData;
  const before = coinBalance(save);
  eq('buy S1', buyItem(save, 'S1'));
  eq('spend', coinBalance(save) === before - 100, String(coinBalance(save)));
  const mid = buyBlock(save, 'S1');
  eq('mid level', mid != null && mid.reason === 'level' && mid.need === 40, mid?.reason ?? 'open');
  eq('sell', sellItem(save, 'S1'));
  eq('refund', coinBalance(save) === before, String(coinBalance(save)));
  const poor = {
    tech: emptyTech(),
    progress: {
      hero: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
      mage: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
      tech: { cleared: [1], clears: {}, highestCleared: 1, seenBosses: [] },
    },
    character: 'tech' as const,
  } as unknown as SaveData;
  const poorBlock = buyBlock(poor, 'S1');
  eq('poor coins', poorBlock?.reason === 'coins', poorBlock?.reason ?? 'open');
  const gridBefore = coinBalance(save);
  eq('expand', expandGrid(save));
  eq('grid not free', coinBalance(save) === gridBefore - 150);
  sellItem(save, 'S1');
  eq('expand sticks', save.tech.gridTier === 1);
  const packedTech = syntheticKit(false);
  const packed = packedTech.sets[0].placements;
  let bits = 0;
  let packOk = packed.length > 0;
  const why: string[] = [];
  const rebuilt: Placement[] = [];
  for (const raw of packed) {
    if (!isItemId(raw.id)) { packOk = false; why.push(`bad id ${raw.id}`); continue; }
    const p: Placement = {
      id: raw.id,
      tier: (raw.tier === 2 || raw.tier === 3 ? raw.tier : 1) as Tier,
      x: raw.x | 0,
      y: raw.y | 0,
      rot: (raw.rot & 3) as Rot,
    };
    const chk = placeCheck(rebuilt, 4, packedTech.items, packedTech.stock, p);
    if (!chk.ok) { packOk = false; why.push(`${p.id}@${p.tier} ${chk.reason}`); }
    rebuilt.push(p);
    for (const c of cellsFor(p.id, p.tier, p.rot)) {
      const bit = 1 << ((p.y + c.y) * 4 + (p.x + c.x));
      if (bits & bit) { packOk = false; why.push(`${p.id} overlap`); }
      bits |= bit;
    }
  }
  eq('autopack', packOk, why.join('; ') || `n=${packed.length}`);
  const kit = resolveKit(packedTech);
  eq('resolve', kit.placements.length > 0 && kit.core === 'C2', kit.core ?? 'none');
  return fail;
}

/** Potential coins for the level you are about to play (HUD preview). */
export function previewCoins(save: SaveData, levelId: number): { first: number; fast: number; replaysLeft: number } {
  const cleared = progressOf(save, 'tech').cleared.includes(levelId);
  const base = firstClearCoins(levelId);
  const led = save.tech.ledger[String(levelId)];
  const replays = led?.replays ?? 0;
  return {
    first: cleared ? 0 : base,
    fast: led?.fast ? 0 : Math.floor(base * 0.5),
    replaysLeft: Math.max(0, 5 - replays),
  };
}
