/**
 * Gear L workshop: equip grid, shop, three sets.
 * Tap-to-place (no drag required). Coins are derived in techKit.
 */
import { t, getLang } from '../i18n';
import type { Game } from '../game/Game';
import { progressOf } from '../game/storage';
import { playableLevels } from '../game/levels';
import {
  ITEMS,
  cellsFor,
  buyBlock,
  coinBalance,
  gridOf,
  gridMaxTier,
  GRID_TIERS,
  isItemId,
  itemDef,
  placeCheck,
  placementOnCell,
  type BuyBlock,
  type ItemId,
  type Rot,
  type Slot,
  type Tier,
} from '../game/techKit';
import { icon, itemIcon, type IconName } from './icons';
import { el, screenBar } from './uiShared';

type Tab = 'equip' | 'shop' | 'sets';
let tab: Tab = 'equip';
let pick: { id: ItemId; tier: Tier } | null = null;
let selected = -1;
/** Type icon beside the bag. Null until the player picks one. */
let slotOn: Slot | null = null;
let helpOn = false;
/** Item id whose description is open. */
let moreId: string | null = null;
/** Last place failure, so the reason stays on screen after the toast. */
let failNote = '';

function gearIcon(id: string, slot: string): string {
  return icon(itemIcon(id), `it it-${slot}`);
}

function tierName(tier: number, dict: ReturnType<typeof t>): string {
  if (tier >= 3) return dict.tierLux;
  if (tier === 2) return dict.tierMid;
  return dict.tierCheap;
}

function buyLock(block: BuyBlock | null, dict: ReturnType<typeof t>): string {
  if (!block || block.reason === 'max') return '';
  if (block.reason === 'level') return dict.needLevel.replace('{n}', String(block.need));
  return dict.needCoins;
}

function slotName(slot: string | undefined, dict: ReturnType<typeof t>): string {
  if (slot === 'shoes') return dict.slotShoes;
  if (slot === 'gloves') return dict.slotGloves;
  if (slot === 'head') return dict.slotHead;
  if (slot === 'core') return dict.slotCore;
  if (slot === 'gadget') return dict.slotGadget;
  if (slot === 'consumable') return dict.slotSnack;
  return '';
}

const SLOT_LEFT: Slot[] = ['shoes', 'gloves', 'head'];
const SLOT_RIGHT: Slot[] = ['gadget', 'core', 'consumable'];
const SLOT_ORDER: Slot[] = [...SLOT_LEFT, ...SLOT_RIGHT];

function gearUseOf(id: string, dict: ReturnType<typeof t>): string {
  return dict.gearUse[id as keyof typeof dict.gearUse] ?? '';
}

function gearKind(slot: string, active: boolean | undefined, dict: ReturnType<typeof t>): string {
  return active || slot === 'core' || slot === 'consumable' ? dict.gearKindTap : dict.gearKindOn;
}

function whyBlocked(reason: string, slot: string | undefined, dict: ReturnType<typeof t>): string {
  if (reason === 'body') return dict.whyBody.replace('{slot}', slotName(slot, dict));
  if (reason === 'once') return dict.whyOnce;
  if (reason === 'active') return dict.whyActive;
  if (reason === 'consumable') return dict.whyCons;
  if (reason === 'stock') return dict.whyStock;
  return dict.noRoom;
}

/** Amber polyomino. `count` adds the cell total next to it. */
function shapeHtml(id: ItemId, tier: Tier, dict: ReturnType<typeof t>, count = false): string {
  const cells = cellsFor(id, tier, 0);
  const w = Math.max(1, ...cells.map((c) => c.x + 1));
  const h = Math.max(1, ...cells.map((c) => c.y + 1));
  const on = new Set(cells.map((c) => `${c.x},${c.y}`));
  let bits = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) bits += `<i class="${on.has(`${x},${y}`) ? 'on' : ''}"></i>`;
  }
  const n = count ? `<small>${cells.length} ${dict.cells}</small>` : '';
  return `<span class="shape" style="--sw:${w};--sh:${h}" aria-hidden="true">${bits}</span>${n}`;
}

const fitMemo = new Map<string, boolean>();

/** True when some rotation of this tier fits the biggest bag, empty. */
function everFits(id: ItemId, tier: Tier): boolean {
  const key = `${id}${tier}`;
  const cached = fitMemo.get(key);
  if (cached != null) return cached;
  const bag = gridMaxTier();
  const { cols, rows } = gridOf(bag);
  let ok = false;
  for (const rot of [0, 1, 2, 3] as Rot[]) {
    for (let y = 0; y < rows && !ok; y++) {
      for (let x = 0; x < cols; x++) {
        const chk = placeCheck([], bag, { [id]: tier }, { [id]: 1 }, { id, tier, x, y, rot });
        if (chk.ok) { ok = true; break; }
      }
    }
  }
  fitMemo.set(key, ok);
  return ok;
}

/**
 * The three sizes, shapes only. The long effect line stays behind More.
 * `pick` makes an owned size selectable. `set` changes a piece already in the bag.
 */
function tierSizesHtml(
  id: ItemId,
  dict: ReturnType<typeof t>,
  dimAbove = 0,
  mark = 0,
  mode: 'look' | 'pick' | 'set' = 'look',
): string {
  const def = itemDef(id);
  if (!def) return '';
  const chips = def.shape.map((_, i) => {
    const tier = (i + 1) as Tier;
    const n = cellsFor(id, tier, 0).length;
    const locked = dimAbove > 0 && tier > dimAbove;
    const fit = everFits(id, tier);
    const cls = [
      'tier-size',
      mark === tier ? 'on' : '',
      locked ? 'locked' : '',
      fit ? '' : 'nofit',
    ].filter(Boolean).join(' ');
    const label = `${tierName(tier, dict)} · ${n}`;
    const title = fit ? label : `${label} · ${dict.wontFit}`;
    const attr = mode === 'pick' && !locked
      ? ` data-tier-pick="${tier}"`
      : mode === 'set' && !locked
        ? ` data-tier-set="${tier}"`
        : '';
    const tag = mode === 'look' || locked ? 'span' : 'button';
    const type = tag === 'button' ? ' type="button"' : '';
    return `<${tag}${type} class="${cls}"${attr} title="${title}" aria-label="${title}">${shapeHtml(id, tier, dict)}<small>${label}</small></${tag}>`;
  }).join('');
  // div, not span: a span cannot contain the size buttons, and the parser would pull them out.
  return `<div class="tier-sizes">${chips}</div>`;
}

function moreBlock(id: string, dict: ReturnType<typeof t>): string {
  if (moreId !== id) return '';
  const def = itemDef(id as ItemId);
  const kind = def ? gearKind(def.slot, def.active, dict) : '';
  const lines = (dict.gearTier[id as keyof typeof dict.gearTier] ?? []).join(' · ');
  return `<div class="gear-more"><p><i class="gear-kind">${kind}</i> ${gearUseOf(id, dict)}</p>${lines ? `<p>${lines}</p>` : ''}</div>`;
}

/** Icon button. The dict string stays the accessible name, so both languages are the same width. */
function actBtn(
  label: string,
  glyph: IconName,
  attrs: string,
  opt: { cls?: string; extra?: string; title?: string; primary?: boolean } = {},
): string {
  const tone = opt.primary ? 'primary' : 'ghost';
  const cls = opt.cls ? ` ${opt.cls}` : '';
  const title = opt.title ?? label;
  const tail = opt.extra ? `<b>${opt.extra}</b>` : '';
  return `<button type="button" class="${tone} icon-act${cls}" ${attrs} aria-label="${label}" title="${title}">${icon(glyph)}${tail}</button>`;
}

function moreBtn(id: string, dict: ReturnType<typeof t>): string {
  const open = moreId === id;
  const label = open ? dict.lessInfo : dict.moreInfo;
  return `<button type="button" class="ghost icon-act more-btn${open ? ' on' : ''}" data-more="${id}" aria-expanded="${open}" aria-label="${label}" title="${label}">${icon('chev')}</button>`;
}

function nextUncleared(game: Game): number {
  const cleared = new Set(progressOf(game.save, 'tech').cleared);
  for (const lv of playableLevels()) if (!cleared.has(lv.id)) return lv.id;
  return 100;
}

export function renderWorkshop(game: Game, _rerender: (game: Game) => void): HTMLElement {
  const dict = t();
  const en = getLang() === 'en';
  const tech = game.save.tech;
  const coins = coinBalance(game.save);
  const grid = gridOf(tech.gridTier);
  const set = tech.sets[tech.activeSet] ?? tech.sets[0];
  const placements = set?.placements ?? [];
  let used = 0;
  const occ = new Map<string, number>();
  placements.forEach((p, i) => {
    if (!isItemId(p.id)) return;
    const tier = (p.tier === 2 || p.tier === 3 ? p.tier : 1) as Tier;
    const rot = ((p.rot ?? 0) & 3) as Rot;
    for (const c of cellsFor(p.id, tier, rot)) {
      occ.set(`${p.x + c.x},${p.y + c.y}`, i);
      used++;
    }
  });
  const cap = grid.cols * grid.rows;

  let hint = '';
  let hintWarn = false;
  let clashSlot = '';
  if (pick) {
    const def = itemDef(pick.id);
    const n = cellsFor(pick.id, pick.tier, 0).length;
    const chk = placeCheck(placements as never, tech.gridTier, tech.items, tech.stock, {
      id: pick.id, tier: pick.tier, x: 0, y: 0, rot: 0,
    });
    // bounds/overlap depend on the cell. body/once/active do not.
    if (!chk.ok && chk.reason !== 'bounds' && chk.reason !== 'overlap') {
      hint = whyBlocked(chk.reason, def?.slot, dict);
      hintWarn = true;
      if (chk.reason === 'body' && def) clashSlot = def.slot;
    } else if (failNote) {
      hint = failNote;
      hintWarn = true;
    } else {
      hint = dict.placeShort.replace('{n}', String(n));
    }
  } else if (failNote) {
    // Rotate / resize failed with nothing in hand. Keep the reason next to the bag.
    hint = failNote;
    hintWarn = true;
  }

  const cells: string[] = [];
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const hit = occ.get(`${x},${y}`);
      const p = hit != null ? placements[hit] : undefined;
      const def = p && isItemId(p.id) ? itemDef(p.id) : undefined;
      const label = def ? (en ? def.nameEn : def.nameZh) : '';
      const on = hit === selected ? ' on' : '';
      const clash = def && clashSlot && def.slot === clashSlot ? ' clash' : '';
      let mark = '';
      let size = '';
      if (def && p && isItemId(p.id)) {
        const tier = (p.tier === 2 || p.tier === 3 ? p.tier : 1) as Tier;
        const rot = ((p.rot ?? 0) & 3) as Rot;
        const shape = cellsFor(p.id, tier, rot);
        const anchor = shape.reduce((a, c) => (c.y < a.y || (c.y === a.y && c.x < a.x) ? c : a), shape[0]);
        if (anchor && x === p.x + anchor.x && y === p.y + anchor.y) {
          mark = gearIcon(p.id, def.slot);
          size = `<em class="cell-n">${shape.length}</em>`;
        }
      }
      const piece = p && hit != null ? ` p${hit % 6}` : '';
      cells.push(
        `<button type="button" class="bag-cell${p ? ' filled' : ''}${piece}${on}${clash}" data-cell="${x},${y}" aria-label="${label || `${x},${y}`}">${mark}${size}</button>`,
      );
    }
  }

  const wornSlot = new Set<string>();
  for (const p of placements) {
    if (!isItemId(p.id)) continue;
    const d = itemDef(p.id);
    if (d) wornSlot.add(d.slot);
  }
  const slotBtn = (slot: Slot) => {
    const sample = ITEMS.find((it) => it.slot === slot);
    const id = sample && isItemId(sample.id) ? sample.id : 'S1';
    const name = slotName(slot, dict);
    return `<button type="button" class="slot-ico${slotOn === slot ? ' on' : ''}${wornSlot.has(slot) ? ' has' : ''}" data-slot="${slot}" aria-label="${name}" aria-pressed="${slotOn === slot}" title="${name}">${gearIcon(id, slot)}</button>`;
  };
  const ownedOf = (slot: Slot) => ITEMS.filter((it) => {
    if (it.slot !== slot) return false;
    if (slot === 'consumable') return (tech.stock[it.id] ?? 0) > 0;
    return (tech.items[it.id] ?? 0) > 0;
  });
  const wornAt = (id: string): number => {
    if (selected >= 0 && placements[selected]?.id === id) return selected;
    return placements.findIndex((p) => p.id === id);
  };
  const itemBtn = (it: (typeof ITEMS)[number]) => {
    const owned = it.slot === 'consumable' ? (tech.stock[it.id] ?? 0) : (tech.items[it.id] ?? 0);
    const tier = Math.min(3, Math.max(1, owned)) as Tier;
    const name = en ? it.nameEn : it.nameZh;
    const tag = it.slot === 'consumable' ? `<small>×${owned}</small>` : '';
    const off = wornAt(it.id);
    const wearing = off >= 0 || (selected >= 0 && placements[selected]?.id === it.id);
    const take = off >= 0
      ? actBtn(dict.removeItem, 'unequip', `data-off="${off}"`, { cls: 'take-off' })
      : '';
    return `<div class="item-line"><button type="button" class="tray-item${pick?.id === it.id || wearing ? ' on' : ''}" data-tray="${it.id}" data-tier="${tier}">${gearIcon(it.id, it.slot)}<span class="name">${name}</span>${tag}</button>${take}</div>`;
  };

  const sel = selected >= 0 ? placements[selected] : undefined;
  const selId = sel && isItemId(sel.id) ? sel.id : null;
  const selDef = selId ? itemDef(selId) : undefined;
  const ownedCount = (id: ItemId, slot: Slot) => (
    slot === 'consumable' ? ((tech.stock[id] ?? 0) > 0 ? 1 : 0) : (tech.items[id] ?? 0)
  );

  let dock = `<p class="place-hint">${dict.pickType}</p>`;
  if (slotOn) {
    const owned = ownedOf(slotOn);
    const buttons = owned.map(itemBtn).join('');
    const focus = pick && itemDef(pick.id)?.slot === slotOn
      ? pick.id
      : selId && selDef?.slot === slotOn
        ? selId
        : null;
    let sizes = '';
    let extra = '';
    if (focus && isItemId(focus)) {
      const def = itemDef(focus);
      if (pick && pick.id === focus) {
        sizes = `<div class="size-row">${tierSizesHtml(focus, dict, ownedCount(focus, def?.slot ?? slotOn), pick.tier, 'pick')}</div>`;
      } else if (sel && selId === focus && selDef) {
        const worn = (sel.tier === 2 || sel.tier === 3 ? sel.tier : 1) as Tier;
        sizes = `<div class="size-row">${tierSizesHtml(focus, dict, ownedCount(focus, selDef.slot), worn, 'set')}</div>`;
      }
      extra = `${moreBtn(focus, dict)}${moreBlock(focus, dict)}`;
    }
    const line = hint ? `<p class="place-hint${hintWarn ? ' warn' : ''}">${hint}</p>` : '';
    dock = `<p class="dock-title">${slotName(slotOn, dict)}</p>
      <div class="item-row">${buttons || `<p class="place-hint">${dict.noneOwned}</p>`}</div>
      ${sizes}${line}${extra}`;
  }

  const nextGrid = tech.gridTier + 1 < GRID_TIERS.length ? GRID_TIERS[tech.gridTier + 1] : null;
  const growLocked = nextGrid != null && coins < nextGrid.price;
  const growLabel = nextGrid ? `${dict.expandBag} · ${nextGrid.price}` : '';
  const growBtn = nextGrid
    ? actBtn(growLabel, 'grow', `data-act="bag-grow"${growLocked ? ' aria-disabled="true"' : ''}`, {
        primary: true,
        extra: String(nextGrid.price),
        cls: growLocked ? 'is-locked' : '',
        title: growLocked ? dict.needCoins : growLabel,
      })
    : '';
  const shopRows = (slotOn ? ITEMS.filter((it) => it.slot === slotOn) : []).map((it) => {
    const owned = it.slot === 'consumable' ? 0 : (tech.items[it.id] ?? 0);
    const stock = tech.stock[it.id] ?? 0;
    const next = it.slot === 'consumable' ? (stock >= 9 ? -1 : 0) : (owned >= it.price.length ? -1 : owned);
    const price = next >= 0 ? it.price[next] : 0;
    const name = en ? it.nameEn : it.nameZh;
    const buying = it.slot === 'consumable' || owned === 0;
    const buyLabel = buying ? dict.buyItem : dict.upgradeItem;
    const buyTier = (next >= 0 ? Math.min(next + 1, it.shape.length, 3) : Math.min(owned, it.shape.length, 3)) as Tier | 0;
    const sizes = isItemId(it.id) ? tierSizesHtml(it.id, dict, 0, buyTier, 'look') : '';
    const lockLine = buyLock(buyBlock(game.save, it.id), dict);
    const have = it.slot === 'consumable' && stock > 0 ? ` ×${stock}` : '';
    return `<article class="shop-row">
      <div class="shop-id">${gearIcon(it.id, it.slot)}<b>${name}</b>${have ? `<small>${have}</small>` : ''}</div>
      <div class="size-row">${sizes}</div>
      <div class="shop-buy">
        ${next >= 0 ? actBtn(`${buyLabel} ${price}`, buying ? 'shop' : 'up', `data-buy="${it.id}"${lockLine ? ' aria-disabled="true"' : ''}`, { primary: true, extra: String(price), title: lockLine || `${buyLabel} ${price}`, cls: lockLine ? 'is-locked' : '' }) : ''}
        ${owned > 0 && it.slot !== 'consumable' ? actBtn(dict.sellItem, 'coin', `data-sell="${it.id}"`) : ''}
        ${isItemId(it.id) ? moreBtn(it.id, dict) : ''}
      </div>
      ${isItemId(it.id) ? moreBlock(it.id, dict) : ''}
    </article>`;
  }).join('');

  const sets = [0, 1, 2].map((i) => {
    const n = tech.sets[i]?.placements.length ?? 0;
    return `<button type="button" class="set-btn ${tech.activeSet === i ? 'on' : ''}" data-set="${i}"><b>${dict.tabSets} ${i + 1}</b><small>${n}</small></button>`;
  }).join('');

  const pieceTools = selected >= 0 && !pick
    ? `${actBtn(dict.rotateItem, 'restart', 'data-act="bag-rot"')}${actBtn(dict.removeItem, 'unequip', 'data-act="bag-off"')}`
    : '';
  const actions = `<div class="bag-actions">${pieceTools}
      ${actBtn(dict.autoPack, 'pack', 'data-act="bag-pack"')}
      ${actBtn(dict.recommendKit, 'star', 'data-act="bag-rec"')}
      ${growBtn}
    </div>`;

  const help = helpOn
    ? `<div class="help-pop" role="note">
        <p>${dict.placeHint}</p>
        <p>${dict.oneEach}</p>
        <p>${dict.bagLimit}</p>
        <p>${dict.coinShop}</p>
        ${slotOn ? `<p>${dict.gearSlotNote[slotOn]}</p>` : ''}
      </div>`
    : '';

  const body = tab === 'equip'
    ? `<div class="fit-stage" style="--cols:${grid.cols};--rows:${grid.rows}">
         <div class="bag-cluster">
           <div class="slot-col">${SLOT_LEFT.map(slotBtn).join('')}</div>
           <div class="bag-wrap"><div class="bag-grid" style="--cols:${grid.cols};--rows:${grid.rows}">${cells.join('')}</div></div>
           <div class="slot-col">${SLOT_RIGHT.map(slotBtn).join('')}</div>
         </div>
       </div>
       <div class="fit-dock">${dock}</div>
       ${actions}`
    : tab === 'shop'
      ? `<div class="slot-row">${SLOT_ORDER.map(slotBtn).join('')}</div>
         <div class="shop-fit">${slotOn ? shopRows : `<p class="place-hint">${dict.pickType}</p>`}</div>
         <div class="bag-actions">${growBtn}</div>`
      : `<div class="set-fit"><div class="set-row">${sets}</div></div>`;

  const barRight = `<span class="bar-stat" title="${dict.coins}">${coins}</span><span class="bar-stat" title="${dict.cells}">${used}/${cap}</span><button type="button" class="icon-btn help-btn${helpOn ? ' on' : ''}" data-act="help" aria-label="${dict.tips}" aria-expanded="${helpOn}">?</button>`;

  const page = el(`
    <div class="sub-screen workshop" data-ui="1">
      ${screenBar(dict.workshop, 'skills', barRight)}
      <div class="sub-body workshop-body">
        ${help}
        <div class="workshop-tabs">
          <button type="button" class="${tab === 'equip' ? 'on' : ''}" data-tab="equip">${dict.tabEquip}</button>
          <button type="button" class="${tab === 'shop' ? 'on' : ''}" data-tab="shop">${dict.tabShop}</button>
          <button type="button" class="${tab === 'sets' ? 'on' : ''}" data-tab="sets">${dict.tabSets}</button>
        </div>
        ${body}
      </div>
    </div>
  `);

  page.querySelector('[data-act="help"]')?.addEventListener('click', () => {
    helpOn = !helpOn;
    _rerender(game);
  });
  page.querySelectorAll<HTMLElement>('[data-slot]').forEach((b) => {
    b.addEventListener('click', () => {
      const slot = b.dataset.slot as Slot;
      slotOn = slotOn === slot ? null : slot;
      pick = null;
      selected = -1;
      moreId = null;
      failNote = '';
      _rerender(game);
    });
  });
  page.querySelectorAll<HTMLElement>('[data-more]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.more ?? '';
      moreId = moreId === id ? null : id;
      _rerender(game);
    });
  });
  page.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => {
    b.addEventListener('click', () => {
      tab = (b.dataset.tab as Tab) || 'equip';
      _rerender(game);
    });
  });

  page.querySelectorAll<HTMLElement>('[data-tray]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.tray ?? '';
      if (!isItemId(id)) return;
      const owned = Number(b.dataset.tier);
      const tier = (owned === 2 || owned === 3 ? owned : 1) as Tier;
      const def = itemDef(id);
      const placed = placements.map((p, i) => (p.id === id ? i : -1)).filter((i) => i >= 0);
      const spare = def?.slot === 'consumable' && (tech.stock[id] ?? 0) > placed.length;
      // Already wearing it, and no spare to drop: select it so Take off is the action.
      if (placed.length && !spare) {
        selected = placed.includes(selected) ? selected : placed[0];
        pick = null;
        failNote = '';
        if (def) slotOn = def.slot;
        _rerender(game);
        return;
      }
      // Tapping the item again puts it down. A size chip chooses the tier.
      if (pick?.id === id) {
        pick = null;
        moreId = null;
      } else {
        pick = { id, tier };
        selected = -1;
        failNote = '';
        if (def) slotOn = def.slot;
      }
      _rerender(game);
    });
  });
  page.querySelectorAll<HTMLElement>('[data-tier-pick]').forEach((b) => {
    b.addEventListener('click', () => {
      const tier = Number(b.dataset.tierPick);
      if (!pick || (tier !== 1 && tier !== 2 && tier !== 3)) return;
      const def = itemDef(pick.id);
      const have = def ? ownedCount(pick.id, def.slot) : 0;
      if (tier > have) return;
      pick = { id: pick.id, tier };
      failNote = '';
      _rerender(game);
    });
  });

  page.querySelectorAll<HTMLElement>('[data-cell]').forEach((b) => {
    b.addEventListener('click', () => {
      const [xs, ys] = (b.dataset.cell ?? '0,0').split(',');
      const x = Number(xs);
      const y = Number(ys);
      const hit = occ.get(`${x},${y}`);
      if (!pick) {
        selected = hit ?? -1;
        failNote = '';
        if (hit != null && isItemId(placements[hit].id)) {
          const def = itemDef(placements[hit].id);
          if (def) slotOn = def.slot;
        }
        _rerender(game);
        return;
      }
      // The tap can be any square of the piece. A 2-wide bar fits an empty row from either cell.
      const placingId = pick.id;
      const placingSlot = itemDef(placingId)?.slot;
      const fit = placementOnCell(placements as never, tech.gridTier, tech.items, tech.stock, placingId, pick.tier, x, y);
      if (fit.ok) {
        failNote = '';
        pick = null;
        moreId = null;
        selected = -1;
        game.techPlace(fit.placement);
        return;
      }
      // The cell already holds something, or this piece is already worn. Select it instead of only saying no.
      const held = hit ?? (
        fit.reason === 'once'
          ? placements.findIndex((p) => p.id === placingId)
          : fit.reason === 'body'
            ? placements.findIndex((p) => itemDef(p.id)?.slot === placingSlot)
            : -1
      );
      if (held >= 0 && (fit.reason === 'overlap' || fit.reason === 'once' || fit.reason === 'body')) {
        pick = null;
        moreId = null;
        selected = held;
        failNote = '';
        const heldDef = isItemId(placements[held].id) ? itemDef(placements[held].id) : undefined;
        if (heldDef) slotOn = heldDef.slot;
        _rerender(game);
        return;
      }
      failNote = whyBlocked(fit.reason, placingSlot, dict);
      game.toast(failNote);
      _rerender(game);
    });
  });

  page.querySelector('[data-act="bag-rot"]')?.addEventListener('click', () => {
    if (selected < 0) return;
    failNote = '';
    if (!game.techRotate(selected)) {
      failNote = dict.noRoom;
      game.toast(dict.noRoom);
      _rerender(game);
    }
  });
  const takeOff = (index: number) => {
    if (!(index >= 0)) return;
    selected = -1;
    pick = null;
    failNote = '';
    game.techRemove(index);
  };
  page.querySelector('[data-act="bag-off"]')?.addEventListener('click', () => takeOff(selected));
  page.querySelectorAll<HTMLElement>('[data-off]').forEach((b) => {
    b.addEventListener('click', () => takeOff(Number(b.dataset.off)));
  });
  page.querySelectorAll<HTMLElement>('[data-tier-set]').forEach((b) => {
    b.addEventListener('click', () => {
      const tier = Number(b.dataset.tierSet) as Tier;
      if (selected < 0) return;
      failNote = '';
      if (!game.techSetTier(selected, tier)) {
        failNote = dict.noRoom;
        game.toast(dict.noRoom);
        _rerender(game);
      }
    });
  });
  page.querySelectorAll('[data-act="bag-pack"]').forEach((b) => b.addEventListener('click', () => game.techAutoPack()));
  page.querySelectorAll('[data-act="bag-rec"]').forEach((b) => b.addEventListener('click', () => game.techRecommend(nextUncleared(game))));
  page.querySelectorAll('[data-act="bag-grow"]').forEach((b) => b.addEventListener('click', () => {
    if (!game.techExpand()) game.toast(dict.needCoins);
  }));
  page.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.buy ?? '';
      if (!isItemId(id)) return;
      const why = buyLock(buyBlock(game.save, id), dict);
      if (why) {
        game.toast(why);
        return;
      }
      if (!game.techBuy(id)) game.toast(dict.needCoins);
    });
  });
  page.querySelectorAll<HTMLElement>('[data-sell]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.sell ?? '';
      game.techSell(id);
    });
  });
  page.querySelectorAll<HTMLElement>('[data-set]').forEach((b) => {
    b.addEventListener('click', () => game.techUseSet(Number(b.dataset.set)));
  });

  return page;
}
