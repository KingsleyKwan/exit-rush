import { t, getLang } from '../i18n';
import type { Game } from '../game/Game';
import { CHARACTER_ORDER, CHARACTERS, type CharacterId } from '../game/charactersDef';
import { charPortraitUrl } from '../game/charPortraits';
import { entitlements } from '../game/entitlements';
import { IS_STORE_BUILD } from '../game/platform';
import { icon } from './icons';
import { el, screenBar } from './uiShared';
import { progressOf } from '../game/storage';
import { playableLevels, getLevel } from '../game/levels';

/** Gear L is not playable yet (v0.8.1). */
const COMING_SOON: Partial<Record<CharacterId, boolean>> = { tech: true };

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

  const footer = showStore
    ? `<div class="char-footer">
        <button type="button" class="ghost" data-act="restore">${icon('star', 'xs')}<span>${dict.charRestore}</span></button>
      </div>`
    : '';

  const page = el(`
    <div class="sub-screen char-select" data-ui="1">
      ${screenBar(dict.charTitle, 'chars')}
      <div class="sub-body char-body">
        <div class="char-stack">${cards}</div>
        ${footer}
        <p class="sfx-note">${dict.charNote}</p>
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
  page.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) => {
    b.addEventListener('click', async () => {
      game.audio.ui();
      const id = b.dataset.buy as CharacterId;
      if (COMING_SOON[id]) return;
      const productId = id === 'mage' ? 'exitrush.char.mage' : 'exitrush.char.tech';
      await entitlements().buy(productId);
      game.toast(dict.charIapStub);
    });
  });
  page.querySelectorAll<HTMLElement>('[data-try]').forEach((b) => {
    b.addEventListener('click', () => {
      game.audio.ui();
      game.toast(dict.charTryStub);
    });
  });
  page.querySelector('[data-act="restore"]')?.addEventListener('click', async () => {
    game.audio.ui();
    await entitlements().restore();
    game.toast(dict.charIapStub);
  });

  return page;
}
