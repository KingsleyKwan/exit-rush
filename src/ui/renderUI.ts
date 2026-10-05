import { t, toggleLang, getLang } from '../i18n';
import type { Game } from '../game/Game';
import { INTROS } from '../game/intros';
import { icon } from './icons';
import { renderSkills } from './constellationSkills';
import {
  el,
  portrait,
  backdrop,
  langBtn,
  iconBtn,
  QUALITY_CYCLE,
} from './uiShared';
import { renderMenu, renderLevels, renderLegend } from './menuScreens';
import { renderPlayHud, updatePlayHud, renderPause, renderEnd } from './playScreens';

let lastKey = '';

/** Key that forces a full rebuild when it changes; otherwise the play HUD is patched in place. */
function uiKey(game: Game): string {
  return `${game.screen}|${getLang()}|${game.level?.id ?? ''}|${game.skillsReturn}|${game.pendingIntro ?? ''}|${game.showFtueGhost ? 1 : 0}`;
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
  on('menu-back', () => game.openScreen('menu'));
  on('home', () => game.goMenu());
  on('quality', () => {
    const i = QUALITY_CYCLE.indexOf(game.save.quality);
    game.setQuality(QUALITY_CYCLE[(i + 1) % QUALITY_CYCLE.length]);
  });
  on('icons', () => game.setTypeIcons(!game.save.typeIcons));
  on('mute', () => game.toggleMute());
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
  } else if (game.screen === 'intro') {
    if (game.level) wrap.appendChild(renderPlayHud(game));
    else wrap.insertAdjacentHTML('afterbegin', backdrop());
    const ov = el(`<div class="overlay intro-overlay" data-ui="1"></div>`);
    ov.appendChild(renderIntroCard(game));
    wrap.appendChild(ov);
  } else if (game.screen === 'skills') {
    if (overRun) {
      wrap.appendChild(renderPlayHud(game));
      const ov = el(`<div class="overlay" data-ui="1"></div>`);
      ov.appendChild(renderSkills(game, rerender));
      wrap.appendChild(ov);
    } else {
      wrap.appendChild(renderSkills(game, rerender));
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
    ? ({ luggage: '拉行李喼', stench: '惡臭人', family: '一家大細', brat: '百厭仔', couple: '情侶', angry: '暴躁男', squat: '踎低客' } as Record<string, string>)[kind]
    : ({ luggage: 'Luggage', stench: 'Stench', family: 'Family', brat: 'Brat', couple: 'Couple', angry: 'Angry man', squat: 'Squatter' } as Record<string, string>)[kind];

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
