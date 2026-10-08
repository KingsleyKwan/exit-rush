import { BOSSES } from '../game/bosses';
import { t, getLang, fmt } from '../i18n';
import type { Game } from '../game/Game';
import { playableLevels, isFinaleUnlocked } from '../game/levels';
import { LINE_COLORS, linesFor, lineColor } from '../game/lines';
import { themeFor } from '../game/stationThemes';
import type { PassengerKind } from '../game/PassengerTypes';
import { icon } from './icons';
import {
  el, portrait, screenBar, pointsChip, stationName, stationAlt, nextLevel,
  PORTRAITS, PortraitKind, asset, langBtn, iconBtn, qualityLabel, loadoutStrip, wireLoadoutStrip,
} from './uiShared';
import { CHARACTER_ORDER, CHARACTERS, type CharacterId } from '../game/charactersDef';
import { charPortraitUrl } from '../game/charPortraits';
import { coinBalance } from '../game/techKit';
import { entitlements } from '../game/entitlements';
import { IS_STORE_BUILD } from '../game/platform';

/** v0.7: long Latin station names (e.g. "Down-to-Earth Town") step down a size instead of ellipsizing. */
function fitCls(name: string): string {
  if (!/^[\x20-\x7e]+$/.test(name)) return '';
  return name.length >= 18 ? 'fit-xl' : name.length >= 15 ? 'fit-l' : '';
}
/** Card title (EN UI): Latin names of 8+ chars drop a size and may wrap to two lines. */
function titleCls(name: string): string {
  if (!/^[\x20-\x7e]+$/.test(name)) return '';
  return name.length >= 15 ? 'wrap wrap-s' : name.length >= 8 ? 'wrap' : '';
}

function charDisplayName(id: CharacterId): string {
  const dict = t();
  const en = getLang() === 'en';
  const c = CHARACTERS[id] ?? CHARACTERS.hero;
  return id === 'hero' ? dict.youOffice : (en ? c.nameEn : c.nameZh);
}

function levelsWhoChip(game: Game): string {
  const dict = t();
  const id = game.save.character;
  const name = charDisplayName(id);
  const port = charPortraitUrl(id);
  const img = port ? `<img src="${port}" alt="" width="28" height="32" />` : icon('chars', 'xs');
  return `<button type="button" class="char-chip who" data-act="characters" aria-label="${dict.charSwitch}: ${name}" title="${dict.charSwitch}: ${name}">${img}<span><b>${name}</b><small class="chip-prog">${dict.charSwitch}</small></span></button>`;
}

/** Three named choices on the start screen. A first run can see the other characters and pick one. */
function titleCharPick(game: Game): string {
  const dict = t();
  const id = game.save.character;
  const ents = entitlements();
  const buttons = CHARACTER_ORDER.map((cid: CharacterId) => {
    const name = charDisplayName(cid);
    const url = charPortraitUrl(cid);
    const on = cid === id;
    const locked = !ents.canPlay(cid);
    const img = url ? `<img src="${url}" alt="" width="72" height="52" />` : '';
    const status = locked ? dict.charBuy : on ? dict.charSelected : dict.charSelect;
    const badge = locked ? icon('lock', 'xs') : on ? icon('check', 'xs') : '';
    return `<button type="button" class="char-opt${on ? ' on' : ''}${locked ? ' locked' : ''}" data-char="${cid}" aria-pressed="${on ? 'true' : 'false'}" aria-label="${name}, ${status}">
      <span class="face">${img}${badge}</span>
      <b>${name}</b>
      <small>${status}</small>
    </button>`;
  }).join('');
  return `<div class="char-pick">
    <p class="char-pick-title">${dict.charPickTitle}</p>
    <div class="char-pick-row" role="group" aria-label="${dict.charPickTitle}">${buttons}</div>
  </div>`;
}

export function renderMenu(game: Game): HTMLElement {
  const dict = t();
  const gear = game.save.character === 'tech';
  const progLabel = gear ? dict.gear : game.save.character === 'mage' ? dict.spells : dict.skills;
  const progEm = gear
    ? String(coinBalance(game.save))
    : String(game.save.character === 'mage' ? (game.save.mage.loadouts[game.save.mage.active]?.points ?? 0) : game.save.skills.points);
  const levels = playableLevels();
  const nxt = nextLevel(game);
  const clearedCount = levels.filter((l) => game.save.cleared.includes(l.id)).length;
  const panel = el(`
    <div class="title-screen" data-ui="1">
      <div class="top-bar">
        ${langBtn()}
        <div class="bar-right">
          ${iconBtn('legend', 'legend', dict.legendTitle)}
          ${iconBtn('skills', 'skills', progLabel)}
        </div>
      </div>
      <div class="title-main">
        <div class="logo">
          <img class="logo-icon" src="${asset('icons/icon-192.png')}" alt="" width="84" height="84" />
          <div class="wordmark"><b>${dict.title}</b><span>${dict.titleCantonese}</span></div>
        </div>
        <p class="tagline">${dict.tagline}</p>
        <div class="howto-icons" aria-label="${game.save.character === 'mage' ? dict.howToMage : game.save.character === 'tech' ? dict.howToTech : dict.howTo}">
          <span>${icon('drag')}<small>${dict.hintDrag}</small></span>
          <span>${game.save.character === 'mage' ? `${icon('wind')}<small>${dict.hintCast}</small>` : game.save.character === 'tech' ? `${icon('shop')}<small>${dict.hintGear}</small>` : `${icon('shove')}<small>${dict.hintShove}</small>`}</span>
          <span>${icon('door')}<small>${dict.hintExit}</small></span>
        </div>
        ${titleCharPick(game)}
        <button type="button" class="play-big" id="btn-play" aria-label="${dict.play}: ${dict.level} ${nxt.id} ${stationName(nxt)}">
          ${icon('play', 'lg')}
          <span class="play-txt"><b>${dict.play}</b><small><i class="line-dot" style="background:${lineColor(nxt.stationEn)}"></i>${nxt.id} · ${stationName(nxt)}</small></span>
        </button>
        <div class="menu-tiles">
          <button type="button" class="tile" data-act="levels">${icon('levels')}<span>${dict.levelsTitle}</span><em>${clearedCount}/${levels.length}</em></button>
          <button type="button" class="tile" data-act="skills">${icon(gear ? 'shop' : 'skills')}<span>${progLabel}</span><em>${gear ? '' : icon('star', 'xs')}${progEm}</em></button>
          <button type="button" class="tile" data-act="legend">${icon('legend')}<span>${dict.legendTitle}</span><em>9</em></button>
        </div>
        <div class="settings-row">
          <button type="button" class="setting" data-act="quality" aria-label="${dict.quality}: ${qualityLabel(game)}">${icon('quality', 'sm')}<span>${qualityLabel(game)}</span></button>
          <button type="button" class="setting ${game.save.typeIcons ? 'on' : ''}" data-act="icons" aria-pressed="${game.save.typeIcons}" aria-label="${dict.typeIcons}">${icon('tag', 'sm')}<span>${dict.typeIcons} · ${game.save.typeIcons ? dict.on : dict.off}</span></button>
          <button type="button" class="setting ${game.save.muted ? '' : 'on'}" data-act="mute" aria-pressed="${!game.save.muted}" aria-label="${game.save.muted ? dict.unmute : dict.mute}">${icon(game.save.muted ? 'mute' : 'volume', 'sm')}<span>${dict.sound} · ${game.save.muted ? dict.off : dict.on}</span></button>
          ${entitlements().showStoreUi && IS_STORE_BUILD ? `<button type="button" class="setting" data-act="restore">${icon('star', 'sm')}<span>${dict.charRestore}</span></button>` : ''}
        </div>
        ${game.needsReloadForAA() ? `<p class="sfx-note">${dict.qualityNote}</p>` : ''}
        <p class="sfx-note">${dict.sfxNote}<br />${dict.artCredit}</p>
      </div>
    </div>
  `);
  panel.querySelector('#btn-play')?.addEventListener('click', () => game.startLevel(nxt.id));
  panel.querySelectorAll<HTMLButtonElement>('[data-char]').forEach((b) => {
    b.addEventListener('click', () => {
      game.audio.unlock();
      game.audio.ui();
      const cid = b.dataset.char as CharacterId;
      if (!cid || !entitlements().canPlay(cid)) {
        game.openCharacters();
        return;
      }
      if (game.save.character === cid) {
        game.openCharacters();
        return;
      }
      game.selectCharacter(cid);
    });
  });
  return panel;
}

export function renderLevels(game: Game): HTMLElement {
  const dict = t();
  const levels = playableLevels();
  const page = el(`
    <div class="sub-screen" data-ui="1">
      ${screenBar(dict.levelsTitle, 'levels', levelsWhoChip(game) + pointsChip(game))}
      <div class="sub-body lv-body">
        <div class="lv-sticky">
          ${loadoutStrip(game, { edit: true, cls: 'pre-level' })}
          <nav class="lv-jump" aria-label="${dict.levelsTitle}">${[1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 100].map((n) => `<button type="button" data-jump="${n}">${n}</button>`).join('')}</nav>
        </div>
        <div class="level-grid" id="level-list"></div><div class="level-teaser">${dict.levelsTeaser}</div></div>
    </div>
  `);
  wireLoadoutStrip(page, game);
  const list = page.querySelector('#level-list')!;
  for (const lv of levels) {
    // v0.7: act header every 10 levels (1–10, 11–20, … 91–99, 100).
    if (lv.id % 10 === 1 || lv.id === 100) {
      const to = lv.id === 100 ? 100 : Math.min(lv.id + 9, 99);
      const doneN = levels.filter((l) => l.id >= lv.id && l.id <= to && game.save.cleared.includes(l.id)).length;
      list.appendChild(el(`<h3 class="lv-act" id="lv-act-${lv.id}"><span>${lv.id === 100 ? dict.finale : `${lv.id}–${to}`}</span><small>${doneN}/${to - lv.id + 1}</small></h3>`));
    }
    const done = game.save.cleared.includes(lv.id);
    const finale = lv.id === 100;
    const locked = finale && !isFinaleUnlocked(game.save.cleared, game.save.highestCleared);
    const lines = linesFor(lv.stationEn);
    const flav = getLang() === 'en' ? lv.flavourEn : lv.flavourZh;
    const btn = el(`
      <button type="button" class="lv-card ${done ? 'done' : ''} ${finale ? 'finale' : ''} ${lv.boss?.length && !finale ? 'boss' : ''} ${lv.exam ? 'exam' : ''} ${locked ? 'locked' : ''}" data-id="${lv.id}" ${locked ? 'disabled' : ''} style="--line:${LINE_COLORS[lines[0]]};--station:${themeFor(lv.stationEn).wall}${finale ? `;background-image:linear-gradient(90deg,rgba(14,18,28,.92),rgba(14,18,28,.35)),url('${asset('art/key-art.webp')}')` : ''}" title="${locked ? dict.finaleLocked : flav}" aria-label="${dict.level} ${lv.id} ${stationName(lv)}${done ? ` · ${dict.cleared}` : ''}${locked ? ` · ${dict.locked}` : ''}">
        <span class="lv-swatch" aria-hidden="true"></span>
        <span class="lv-badge">${lv.id}<span class="lv-lines">${lines.map((l) => `<i style="background:${LINE_COLORS[l]}"></i>`).join('')}</span></span>
        <span class="lv-station"><b class="${titleCls(stationName(lv))}">${stationName(lv)}</b><small class="${fitCls(stationAlt(lv))}">${stationAlt(lv)}</small></span>
        <span class="lv-meta"><span>${icon('crowd', 'xs')}${lv.density}</span><span>${icon('timer', 'xs')}${lv.timer}</span></span>
        <span class="lv-state">${done ? icon('check', 'sm') : finale ? icon('star', 'sm') : ''}</span>
        ${finale ? `<span class="lv-finale">${dict.finale}</span>` : ''}
        ${lv.exam ? `<span class="lv-exam">${dict.examTag}</span>` : ''}
        ${lv.boss?.length && !finale ? `<span class="lv-boss">${icon('crown', 'xs')}${getLang() === 'en' ? BOSSES[lv.boss[0]].en : BOSSES[lv.boss[0]].zh}</span>` : ''}
      </button>
    `);
    btn.addEventListener('click', () => { if (!(btn as HTMLButtonElement).disabled) game.startLevel(lv.id); });
    list.appendChild(btn);
  }
  const body = page.querySelector('.lv-body') as HTMLElement;
  const sticky = page.querySelector('.lv-sticky') as HTMLElement;
  const scrollToEl = (target: Element | null, smooth: boolean) => {
    if (!target || !body) return;
    const top = body.scrollTop + target.getBoundingClientRect().top - body.getBoundingClientRect().top - (sticky?.offsetHeight ?? 0) - 6;
    body.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  };
  page.querySelectorAll<HTMLElement>('[data-jump]').forEach((b) =>
    b.addEventListener('click', () => {
      game.audio.ui();
      scrollToEl(page.querySelector(`#lv-act-${b.dataset.jump}`), true);
    }),
  );
  // Open near the next uncleared level so 100 cards don't bury progress.
  if (game.save.cleared.length) {
    const nxt = nextLevel(game);
    requestAnimationFrame(() => scrollToEl(page.querySelector(`.lv-card[data-id="${nxt.id}"]`), false));
  }
  return page;
}

export function renderLegend(game: Game): HTMLElement {
  const dict = t();
  const kinds: PortraitKind[] = PORTRAITS;
  const cards = kinds
    .map((k) => {
      const name = k === 'hero' ? dict.you : dict.passenger[k as PassengerKind] ?? k;
      const hint = dict.passengerHint[k];
      const special = k !== 'hero' && k !== 'normal';
      const seen = special && game.save.seenIntros.includes(k);
      const review = special
        ? `<button type="button" class="linkish" data-review="${k}">${icon('kind_' + k, 'xs')} ${dict.reviewIntro}${seen ? '' : ' · !'}</button>`
        : '';
      return `
        <div class="legend-card k-${k}">
          ${portrait(k)}
          <div class="legend-txt">
            <b>${special ? icon(`kind_${k}`, `xs kind-${k}`) : ''}${name}</b>
            <span>${hint}</span>
            ${review}
          </div>
        </div>`;
    })
    .join('');
  return el(`
    <div class="sub-screen" data-ui="1">
      ${screenBar(dict.legendTitle, 'legend')}
      <div class="sub-body">
        <div class="legend-grid">${cards}</div>
        <div class="settings-row">
          <button type="button" class="setting ${game.save.typeIcons ? 'on' : ''}" data-act="icons" aria-pressed="${game.save.typeIcons}" aria-label="${dict.typeIcons}">${icon('tag', 'sm')}<span>${dict.typeIcons} · ${game.save.typeIcons ? dict.on : dict.off}</span></button>
        </div>
        <p class="sfx-note">${dict.artCredit}</p>
      </div>
    </div>
  `);
}

