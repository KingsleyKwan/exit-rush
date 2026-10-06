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
  coinBalance,
  gridOf,
  GRID_TIERS,
  isItemId,
  itemDef,
  placeCheck,
  type ItemId,
  type Rot,
  type Tier,
} from '../game/techKit';
import { icon, itemIcon } from './icons';
import { el, screenBar } from './uiShared';

type Tab = 'equip' | 'shop' | 'sets';
let tab: Tab = 'equip';
let pick: { id: ItemId; tier: Tier } | null = null;
let selected = -1;

function gearIcon(id: string, slot: string): string {
  return icon(itemIcon(id), `it it-${slot}`);
}

function tierName(tier: number, dict: ReturnType<typeof t>): string {
  if (tier >= 3) return dict.tierLux;
  if (tier === 2) return dict.tierMid;
  return dict.tierCheap;
}

function slotName(slot: string | undefined, dict: ReturnType<typeof t>): string {
  if (slot === 'shoes') return dict.slotShoes;
  if (slot === 'gloves') return dict.slotGloves;
  if (slot === 'head') return dict.slotHead;
  if (slot === 'core') return dict.slotCore;
  return '';
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

  let hint = dict.placeHint;
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
    } else {
      hint = dict.placeSize.replace('{n}', String(n));
    }
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
      cells.push(
        `<button type="button" class="bag-cell${p ? ' filled' : ''}${on}${clash}" data-cell="${x},${y}" aria-label="${label || `${x},${y}`}">${mark}${size}</button>`,
      );
    }
  }

  const tray = ITEMS.filter((it) => {
    if (it.slot === 'consumable') return (tech.stock[it.id] ?? 0) > 0;
    return (tech.items[it.id] ?? 0) > 0;
  }).map((it) => {
    const owned = it.slot === 'consumable' ? (tech.stock[it.id] ?? 0) : (tech.items[it.id] ?? 0);
    const tier = Math.min(3, Math.max(1, owned)) as Tier;
    const on = pick?.id === it.id ? ' on' : '';
    const name = en ? it.nameEn : it.nameZh;
    const size = isItemId(it.id) ? shapeHtml(it.id, tier, dict, true) : '';
    const tag = it.slot === 'consumable' ? `×${owned}` : tierName(owned, dict);
    return `<button type="button" class="tray-item${on}" data-tray="${it.id}" data-tier="${tier}">${gearIcon(it.id, it.slot)}<span>${name}</span><span class="piece-size">${size}<small>${tag}</small></span></button>`;
  }).join('');

  const sel = selected >= 0 ? placements[selected] : undefined;
  const selId = sel && isItemId(sel.id) ? sel.id : null;
  const selDef = selId ? itemDef(selId) : undefined;
  const selTools = selDef && sel && selId
    ? `<div class="bag-tools">
        <button type="button" class="ghost" data-act="bag-rot">${dict.rotateItem}</button>
        <button type="button" class="ghost" data-act="bag-off">${dict.removeItem}</button>
        ${([1, 2, 3] as Tier[]).filter((n) => (tech.items[selId] ?? 0) >= n && selDef.price.length >= n).map((n) =>
          `<button type="button" class="ghost ${sel.tier === n ? 'on' : ''}" data-tier-set="${n}">${tierName(n, dict)} ${shapeHtml(selId, n, dict)}</button>`,
        ).join('')}
      </div>`
    : '';

  const nextGrid = tech.gridTier < 4 ? GRID_TIERS[tech.gridTier + 1] : null;
  const shopCards = ITEMS.map((it) => {
    const owned = it.slot === 'consumable' ? 0 : (tech.items[it.id] ?? 0);
    const stock = tech.stock[it.id] ?? 0;
    const next = it.slot === 'consumable' ? (stock >= 9 ? -1 : 0) : (owned >= it.price.length ? -1 : owned);
    const price = next >= 0 ? it.price[next] : 0;
    const name = en ? it.nameEn : it.nameZh;
    const blurb = en ? it.blurbEn : it.blurbZh;
    const have = it.slot === 'consumable' ? (stock > 0 ? `${dict.ownedTier} ×${stock}` : '') : owned > 0 ? `${dict.ownedTier} · ${tierName(owned, dict)}` : '';
    const buyLabel = it.slot === 'consumable' || owned === 0 ? dict.buyItem : dict.upgradeItem;
    const haveTier = (it.slot === 'consumable' ? (stock > 0 ? 1 : 0) : owned >= 1 ? Math.min(owned, it.shape.length, 3) : 0) as Tier | 0;
    const buyTier = (next >= 0 ? Math.min(next + 1, it.shape.length, 3) : 0) as Tier | 0;
    const nowShape = haveTier >= 1 && isItemId(it.id) ? shapeHtml(it.id, haveTier as Tier, dict, true) : '';
    const nextShape = buyTier >= 1 && buyTier !== haveTier && isItemId(it.id) ? shapeHtml(it.id, buyTier as Tier, dict, true) : '';
    const sizeRow = nowShape && nextShape
      ? `${nowShape}<span class="shape-arrow">→</span>${nextShape}`
      : (nowShape || nextShape);
    return `<article class="shop-card">
      <header>${gearIcon(it.id, it.slot)}<b>${name}</b></header>
      <p>${blurb}</p>
      ${have ? `<p class="shop-meta">${have}</p>` : ''}
      <div class="shop-size">${sizeRow}</div>
      <div class="shop-actions">
        ${next >= 0 ? `<button type="button" class="primary" data-buy="${it.id}" ${coins < price ? 'disabled' : ''}>${buyLabel} · ${price}</button>` : ''}
        ${owned > 0 && it.slot !== 'consumable' ? `<button type="button" class="ghost" data-sell="${it.id}">${dict.sellItem}</button>` : ''}
      </div>
    </article>`;
  }).join('');

  const sets = [0, 1, 2].map((i) => {
    const n = tech.sets[i]?.placements.length ?? 0;
    return `<button type="button" class="set-btn ${tech.activeSet === i ? 'on' : ''}" data-set="${i}"><b>${dict.tabSets} ${i + 1}</b><small>${n}</small></button>`;
  }).join('');

  const body = tab === 'equip'
    ? `<p class="place-hint${hintWarn ? ' warn' : ''}">${hint}</p>
       <p class="sfx-note">${dict.oneEach}</p>
       <div class="bag-grid" style="--cols:${grid.cols}">${cells.join('')}</div>
       ${selTools}
       <div class="tray">${tray || `<p class="sfx-note">${dict.tabShop}</p>`}</div>
       <div class="bag-actions">
         <button type="button" class="ghost" data-act="bag-pack">${dict.autoPack}</button>
         <button type="button" class="ghost" data-act="bag-rec">${dict.recommendKit}</button>
         ${nextGrid ? `<button type="button" class="primary" data-act="bag-grow" ${coins < nextGrid.price ? 'disabled' : ''}>${dict.expandBag} · ${nextGrid.price}</button>` : ''}
       </div>`
    : tab === 'shop'
      ? `<div class="shop-list">${shopCards}
          ${nextGrid ? `<button type="button" class="primary bag-grow" data-act="bag-grow" ${coins < nextGrid.price ? 'disabled' : ''}>${dict.expandBag} · ${nextGrid.cols}×${nextGrid.rows} · ${nextGrid.price}</button>` : ''}
        </div>`
      : `<div class="set-row">${sets}</div><p class="sfx-note">${dict.placeHint}</p>`;

  const page = el(`
    <div class="sub-screen workshop" data-ui="1">
      ${screenBar(dict.workshop, 'skills')}
      <div class="sub-body workshop-body">
        <div class="workshop-top">
          <b>${dict.coins} ${coins}</b>
          <span>${used}/${cap} ${dict.cells}</span>
        </div>
        <div class="workshop-tabs">
          <button type="button" class="${tab === 'equip' ? 'on' : ''}" data-tab="equip">${dict.tabEquip}</button>
          <button type="button" class="${tab === 'shop' ? 'on' : ''}" data-tab="shop">${dict.tabShop}</button>
          <button type="button" class="${tab === 'sets' ? 'on' : ''}" data-tab="sets">${dict.tabSets}</button>
        </div>
        ${body}
      </div>
    </div>
  `);

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
      const tier = Number(b.dataset.tier) as Tier;
      pick = pick?.id === id ? null : { id, tier: tier === 2 || tier === 3 ? tier : 1 };
      selected = -1;
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
        _rerender(game);
        return;
      }
      const p = { id: pick.id, tier: pick.tier, x, y, rot: 0 as Rot };
      const chk = placeCheck(placements as never, tech.gridTier, tech.items, tech.stock, p);
      if (!chk.ok) {
        game.toast(whyBlocked(chk.reason, itemDef(pick.id)?.slot, dict));
        return;
      }
      pick = null;
      selected = -1;
      game.techPlace(p);
    });
  });

  page.querySelector('[data-act="bag-rot"]')?.addEventListener('click', () => {
    if (selected >= 0 && !game.techRotate(selected)) game.toast(dict.noRoom);
  });
  page.querySelector('[data-act="bag-off"]')?.addEventListener('click', () => {
    if (selected >= 0) {
      game.techRemove(selected);
      selected = -1;
    }
  });
  page.querySelectorAll<HTMLElement>('[data-tier-set]').forEach((b) => {
    b.addEventListener('click', () => {
      const tier = Number(b.dataset.tierSet) as Tier;
      if (selected >= 0 && !game.techSetTier(selected, tier)) game.toast(dict.noRoom);
    });
  });
  page.querySelectorAll('[data-act="bag-pack"]').forEach((b) => b.addEventListener('click', () => game.techAutoPack()));
  page.querySelectorAll('[data-act="bag-rec"]').forEach((b) => b.addEventListener('click', () => game.techRecommend(nextUncleared(game))));
  page.querySelectorAll('[data-act="bag-grow"]').forEach((b) => b.addEventListener('click', () => {
    if (!game.techExpand()) game.toast(dict.notEnough);
  }));
  page.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.buy ?? '';
      if (!game.techBuy(id)) game.toast(dict.notEnough);
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
