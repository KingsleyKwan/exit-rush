import { t, getLang } from '../i18n';
import type { Game } from '../game/Game';
import { CHARACTER_ORDER, CHARACTERS, type CharacterId } from '../game/charactersDef';
import { charPortraitUrl } from '../game/charPortraits';
import { entitlements, type BuyResult } from '../game/entitlements';
import { IS_STORE_BUILD } from '../game/platform';
import { icon } from './icons';
import { el, screenBar } from './uiShared';
import { progressOf } from '../game/storage';
import { playableLevels, getLevel } from '../game/levels';

/** No character is gated as coming-soon. Store locks use entitlements. */
const COMING_SOON: Partial<Record<CharacterId, boolean>> = {};

export function renderCharacters(game: Game): HTMLElement {
  const dict = t();
  const en = getLang() === 'en';
  const ents = entitlements();
  const showStore = ents.showStoreUi && IS_STORE_BUILD;

  const cards = CHARACTER_ORDER.map((id) => {
    const c = CHARACTERS[id];
    const coming = !!COMING_SOON[id];
    const owned = !coming && ents.canPlay(id);
    const selected = !coming && game.save.character === id;
    const name = en ? c.nameEn : c.nameZh;
    const other = en ? c.nameZh : c.nameEn;
    const pitch = en ? c.pitchEn : c.pitchZh;
    const port = charPortraitUrl(id);
    const portHtml = port
      ? `<img class="char-port-img" src="${port}" width="112" height="126" alt="" decoding="async" />`
      : `<span class="char-port-fallback">${icon(id === 'mage' ? 'fire' : id === 'tech' ? 'shop' : 'str', 'lg')}</span>`;

    let action = '';
    if (coming) {
      action = `<button type="button" class="primary dim char-soon" disabled>${icon('lock', 'sm')}<span>${dict.comingSoon}</span></button>`;
    } else if (owned) {
      action = `<button type="button" class="primary char-pick" data-pick="${id}">${icon('check', 'sm')}<span>${selected ? dict.charSelected : dict.charSelect}</span></button>`;
    } else if (showStore) {
      action = `<button type="button" class="primary char-buy" data-buy="${id}">${icon('star', 'sm')}<span>${dict.charBuy}</span></button>
        <button type="button" class="ghost char-try" data-try="${id}">${icon('play', 'xs')}<span>${dict.charTry}</span></button>`;
    } else {
      action = `<button type="button" class="primary dim" disabled>${icon('lock', 'sm')}<span>${dict.locked}</span></button>`;
    }

    const EL_TINT: Record<string, string> = { fire: 'tint-fire', ice: 'tint-ice', volt: 'tint-volt' };
    const styleIcos = c.styleIcons
      .map((k) => {
        const name = (['str', 'spd', 'sta', 'fire', 'ice', 'volt', 'shop', 'bag', 'star'] as string[]).includes(k) ? k : 'star';
        const tint = EL_TINT[k] ?? '';
        return `<span class="char-style-ico ${tint}">${icon(name, 'sm')}</span>`;
      })
      .join('');

    const prog = progressOf(game.save, id);
    const totalLv = playableLevels().length;
    const clearedN = prog.cleared.length;
    const pct = Math.round((clearedN / Math.max(1, totalLv)) * 100);
    const hi = prog.highestCleared;
    const hiLv = hi > 0 ? getLevel(hi) : null;
    const hiLabel = hiLv ? `${hi} · ${en ? hiLv.stationEn : hiLv.stationZh}` : (en ? 'Not started' : '未開始');
    const progHtml = coming ? '' : `<div class="char-prog" aria-label="${clearedN}/${totalLv}">
          <div class="char-prog-meta"><span>${dict.charCleared}: ${clearedN}/${totalLv}</span><span>${hiLabel}</span></div>
          <div class="char-prog-bar"><i style="width:${pct}%"></i></div>
        </div>`;

    return `
      <article class="char-row ${selected ? 'selected' : ''} ${coming ? 'coming' : ''} char-${id}" data-char="${id}">
        <div class="char-port-wrap">${portHtml}</div>
        <div class="char-info">
          <h2 class="char-name">${name}</h2>
          <p class="char-other">${other}</p>
          <div class="char-styles">${styleIcos}</div>
          <p class="char-pitch">${coming ? (en ? 'Shop + backpack grid next' : '商店同背囊格即將推出') : pitch}</p>
          ${progHtml}
          <div class="char-actions">${action}</div>
        </div>
      </article>`;
  }).join('');

  const bothLocked = showStore && !ents.canPlay('mage') && !ents.canPlay('tech');
  const bundle = bothLocked
    ? `<button type="button" class="primary char-buy" data-buy-product="exitrush.pack.chars">${icon('star', 'sm')}<span>${dict.charBundle}</span></button>`
    : '';
  const footer = showStore
    ? `<div class="char-footer">
        ${bundle}
        <button type="button" class="ghost" data-act="restore">${icon('star', 'xs')}<span>${dict.charRestore}</span></button>
      </div>`
    : '';

  const page = el(`
    <div class="sub-screen char-select" data-ui="1">
      ${screenBar(dict.charTitle, 'chars')}
      <div class="sub-body char-body">
        <div class="char-stack">${cards}</div>
        ${footer}
        ${game.trial ? `<p class="trial-banner">${dict.trialBanner}</p>` : ''}
        <p class="sfx-note">${IS_STORE_BUILD ? dict.charNoteIos : dict.charNote}</p>
      </div>
    </div>
  `);

  page.querySelectorAll<HTMLElement>('[data-pick]').forEach((b) => {
    b.addEventListener('click', () => {
      game.audio.ui();
      const id = b.dataset.pick as CharacterId;
      if (COMING_SOON[id]) return;
      game.selectCharacter(id);
    });
  });
  const toastFor = (result: BuyResult) => {
    if (result === 'ok') game.toast(dict.charIapOk);
    else if (result === 'cancelled') game.toast(dict.charIapCancelled);
    else if (result === 'pending') game.toast(dict.charIapPending);
    else if (result === 'unavailable') game.toast(dict.charIapUnavailable);
    else game.toast(dict.charIapError);
  };
  const wireBuy = (b: HTMLElement, productId: string) => {
    b.addEventListener('click', async () => {
      game.audio.ui();
      const result = await entitlements().buy(productId);
      toastFor(result);
      if (result === 'ok') renderUINeedsRefresh(game);
    });
  };
  page.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) => {
    const id = b.dataset.buy as CharacterId;
    if (COMING_SOON[id]) return;
    wireBuy(b, id === 'mage' ? 'exitrush.char.mage' : 'exitrush.char.tech');
  });
  page.querySelectorAll<HTMLElement>('[data-buy-product]').forEach((b) => {
    wireBuy(b, b.dataset.buyProduct || '');
  });
  page.querySelectorAll<HTMLElement>('[data-try]').forEach((b) => {
    b.addEventListener('click', () => {
      game.audio.ui();
      if (!IS_STORE_BUILD) return;
      game.startTrial(b.dataset.try as CharacterId);
    });
  });
  if (showStore) {
    void entitlements().products().then((list) => {
      const price = new Map(list.map((p) => [p.id, p.localizedPriceString]));
      const label = (id: string, name: string) => {
        const p = price.get(id);
        return p ? `${name} ${p}` : name;
      };
      page.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) => {
        const id = b.dataset.buy === 'mage' ? 'exitrush.char.mage' : 'exitrush.char.tech';
        const span = b.querySelector('span');
        if (span) span.textContent = label(id, dict.charBuy);
      });
      const bundleBtn = page.querySelector<HTMLElement>('[data-buy-product="exitrush.pack.chars"] span');
      if (bundleBtn) bundleBtn.textContent = label('exitrush.pack.chars', dict.charBundle);
    });
  }

  return page;
}

function renderUINeedsRefresh(game: Game): void {
  game.openCharacters();
}
