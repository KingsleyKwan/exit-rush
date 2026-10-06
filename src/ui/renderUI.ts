import { t, toggleLang, getLang } from '../i18n';
import type { Game } from '../game/Game';
import { INTROS } from '../game/intros';
import { BOSSES, countersFor } from '../game/bosses';
import { icon } from './icons';
import { renderSkills } from './constellationSkills';
import { renderWorkshop } from './techShop';
import {
  el,
  portrait,
  backdrop,
  langBtn,
  iconBtn,
  QUALITY_CYCLE,
} from './uiShared';
import { renderMenu, renderLevels, renderLegend } from './menuScreens';
import { renderCharacters } from './characterSelect';
import { renderPlayHud, updatePlayHud, renderPause, renderEnd } from './playScreens';
import { entitlements } from '../game/entitlements';

let lastKey = '';

/** Key that forces a full rebuild when it changes; otherwise the play HUD is patched in place. */
function uiKey(game: Game): string {
  return `${game.screen}|${getLang()}|${game.level?.id ?? ''}|${game.skillsReturn}|${game.pendingIntro ?? ''}|${game.showFtueGhost ? 1 : 0}|${game.doorBannerT > 0 ? 1 : 0}|${game.save.character}`;
}

function rerender(game: Game): void {
  const root = document.getElementById('ui-root');
  if (root) renderUI(root, game);
}

/** Wire common `[data-act]` buttons inside `scope`. */
function wireCommon(scope: ParentNode, game: Game): void {
  const on = (act: string, fn: () => void) =>
    scope.querySelectorAll(`[data-act="${act}"]`).forEach((b) =>
      b.addEventListener('click', () => {
        game.audio.unlock();
        game.audio.ui();
        fn();
      }),
    );
  on('lang', () => {
    toggleLang();
    game.persist();
    rerender(game);
  });
  on('skills', () => {
    game.openSkills(); // pauses a running level first; never abandons it
    rerender(game);
  });
  on('levels', () => game.openScreen('levels'));
  on('legend', () => game.openScreen('legend'));
  on('characters', () => game.openCharacters());
  on('menu-back', () => game.openScreen('menu'));
  on('home', () => game.goMenu());
  on('quality', () => {
    const i = QUALITY_CYCLE.indexOf(game.save.quality);
    game.setQuality(QUALITY_CYCLE[(i + 1) % QUALITY_CYCLE.length]);
  });
  on('icons', () => game.setTypeIcons(!game.save.typeIcons));
  on('mute', () => game.toggleMute());
  on('restore', () => {
    void entitlements().restore().then((restored) => {
      const dict = t();
      if (!restored) game.toast(dict.charIapUnavailable);
      else if (restored.mage || restored.tech || restored.noAds) game.toast(dict.charRestoreDone);
      else game.toast(dict.charRestoreEmpty);
      rerender(game);
    });
  });
}

export function renderUI(root: HTMLElement, game: Game): void {
  const key = uiKey(game);
  if (key === lastKey && game.screen === 'playing' && root.querySelector('.play-hud')) {
    updatePlayHud(root, game);
    return;
  }
  lastKey = key;
  game.setShoveHeld(false);
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.id = 'hud';
  wrap.dataset.ui = '1';
  wrap.dataset.screen = game.screen;

  const overRun = game.skillsOverRun;
  if (game.backdrop) wrap.appendChild(el(backdrop()));

  if (game.screen === 'menu') {
    wrap.appendChild(renderMenu(game));
  } else if (game.screen === 'levels') {
    wrap.appendChild(renderLevels(game));
  } else if (game.screen === 'legend') {
    wrap.appendChild(renderLegend(game));
  } else if (game.screen === 'characters') {
    wrap.appendChild(renderCharacters(game));
  } else if (game.screen === 'boss') {
    wrap.appendChild(renderBossCut(game));
  } else if (game.screen === 'intro') {
    if (game.level) wrap.appendChild(renderPlayHud(game));
    else wrap.insertAdjacentHTML('afterbegin', backdrop());
    const ov = el(`<div class="overlay intro-overlay" data-ui="1"></div>`);
    ov.appendChild(renderIntroCard(game));
    wrap.appendChild(ov);
  } else if (game.screen === 'skills') {
    const sheet = game.save.character === 'tech'
      ? renderWorkshop(game, rerender)
      : renderSkills(game, rerender);
    if (overRun) {
      wrap.appendChild(renderPlayHud(game));
      const ov = el(`<div class="overlay" data-ui="1"></div>`);
      ov.appendChild(sheet);
      wrap.appendChild(ov);
    } else {
      wrap.appendChild(sheet);
    }
  } else if (game.screen === 'playing' || game.screen === 'paused') {
    wrap.appendChild(renderPlayHud(game));
    if (game.screen === 'paused') wrap.appendChild(renderPause(game));
  } else if (game.screen === 'win') {
    wrap.appendChild(renderPlayHud(game));
    wrap.appendChild(renderEnd(game, true));
  } else if (game.screen === 'lose') {
    wrap.appendChild(renderPlayHud(game));
    wrap.appendChild(renderEnd(game, false));
  }

  root.appendChild(wrap);
  if (root.querySelector('.play-hud')) updatePlayHud(root, game);
  wireCommon(root, game);
}

function renderIntroCard(game: Game): HTMLElement {
  const dict = t();
  const kind = game.pendingIntro;
  if (!kind) return el(`<div class="panel"></div>`);
  const copy = INTROS[kind];
  const en = getLang() === 'en';
  const nameEn = en ? dict.passenger[kind] : dict.passenger[kind];
  // Always show both names on the card
  const titleEn = dict.passenger[kind]; // will swap via two dicts
  const namePrimary = en ? dict.passenger[kind] : dict.passenger[kind];
  // Bilingual title: current lang big, other small — fetch both from i18n modules is awkward;
  // passenger names are already localised; show icon + localised name + other lang via hardcoded pair from INTROS tips.
  const what = en ? copy.whatEn : copy.whatZh;
  const block = en ? copy.blockEn : copy.blockZh;
  const tip = en ? copy.tipEn : copy.tipZh;
  const otherName = en
    ? ({ luggage: '拉行李喼', stench: '惡臭人', family: '一家大細', brat: '百厭仔', couple: '情侶', angry: '暴躁男', squat: '踎低客', loud: '大聲公' } as Record<string, string>)[kind]
    : ({ luggage: 'Luggage', stench: 'Stench', family: 'Family', brat: 'Brat', couple: 'Couple', angry: 'Angry man', squat: 'Squatter', loud: 'Loudmouth' } as Record<string, string>)[kind];

  const inLevel = !!game.level;
  const panel = el(`
    <div class="panel intro-card" data-ui="1" role="dialog" aria-label="${dict.introTitle}">
      <p class="intro-kicker">${icon(`kind_${kind}`, 'sm')}${dict.introTitle}</p>
      <div class="intro-hero">${portrait(kind, 'lg')}</div>
      <h2 class="panel-title">${dict.passenger[kind]}</h2>
      <p class="intro-other">${otherName}</p>
      <ul class="intro-beats">
        <li><strong>${what}</strong></li>
        <li>${block}</li>
        <li class="intro-tip">${icon('star', 'xs')}<span>${tip}</span></li>
      </ul>
      <button type="button" class="primary" id="btn-intro-go">${icon('play', 'sm')}<span>${inLevel ? dict.introTap : dict.back}</span></button>
    </div>
  `);
  panel.querySelector('#btn-intro-go')?.addEventListener('click', () => {
    game.audio.ui();
    if (inLevel) game.dismissIntro(true);
    else game.closeIntroReview();
  });
  // Also tap overlay backdrop
  return panel;
}

/** v0.7 boss entrance: letterbox bars + title card (粵 + EN + tagline + counter skills). Tap to skip. */
function renderBossCut(game: Game): HTMLElement {
  const dict = t();
  const lv = game.level;
  const cut = game.bossCut;
  const kinds = lv?.boss ?? [];
  const en = getLang() === 'en';
  const all = kinds.length > 1;
  const b = BOSSES[kinds[0] ?? 'luggage'];
  const zh = all ? dict.bossAllZh : b.zh;
  const enName = all ? dict.bossAllEn : b.en;
  const tagline = all ? dict.bossAllTagline : en ? b.taglineEn : b.taglineZh;
  const ctr = all ? null : countersFor(kinds[0] ?? 'luggage', game.save.character);
  const counter = ctr ? (en ? ctr.en : ctr.zh) : '';
  const dur = cut?.dur ?? 2.6;
  const crowns = all ? `<div class="boss-crowns">${kinds.map((k) => `<span style="--acc:${BOSSES[k].accent}">${icon('crown', 'xs')}</span>`).join('')}</div>` : '';
  const node = el(`
    <div class="boss-cut ${cut?.full ? 'full' : 'short'}" data-ui="1" style="--dur:${dur}s;--acc:${all ? '#ffcc33' : b.accent}" role="dialog" aria-label="${zh} ${enName}">
      <div class="lb lb-top"></div>
      <div class="lb lb-bot"></div>
      <div class="boss-card">
        <p class="boss-kicker">${icon('crown', 'sm')}<span>${dict.bossKicker} · ${dict.level} ${lv?.id ?? ''}</span></p>
        <h1 class="boss-zh" lang="zh-HK">${zh}</h1>
        <p class="boss-en" lang="en">${enName}</p>
        <p class="boss-tagline">${tagline}</p>
        ${counter ? `<p class="boss-counter">${icon('star', 'xs')}<span>${dict.bossCounter}: ${counter}</span></p>` : ''}
        ${crowns}
      </div>
      <button type="button" class="boss-skip" aria-label="${dict.bossSkip}"><span>${dict.bossSkip}</span>${icon('play', 'xs')}</button>
    </div>
  `);
  node.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    game.skipBossCut();
  });
  return node;
}
