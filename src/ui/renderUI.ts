import { t, toggleLang, getLang, fmt } from '../i18n';
import type { Game } from '../game/Game';
import { playableLevels, isFinaleUnlocked, type LevelDef } from '../game/levels';
import { INTROS, type IntroKind } from '../game/intros';
import { POINTS_PER_FIRST_CLEAR } from '../game/SkillTree';
import type { QualitySetting } from '../game/storage';
import { LINE_COLORS, linesFor, lineColor } from '../game/lines';
import { themeFor } from '../game/stationThemes';
import type { PassengerKind } from '../game/PassengerTypes';
import { icon, langIcon } from './icons';
import {
  BRANCH_FILL,
  MAX_POINTS_PER_LEVEL,
  ULTIMATE_COST,
  ULT_DEFS,
  branchProgressLabel,
  canSpend,
  nodesFor,
  nodeUnlocked,
  spendPoint,
  ultUnlocked,
  modifiersFromSkills,
  type Branch,
} from '../game/SkillTree';

function el(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as HTMLElement;
}

/** Absolute URL for a file in /public (resolves against the page URL — works under /hk-mtr-exit-rush/). */
const asset = (f: string): string => new URL(f, document.baseURI).href;

type PortraitKind = 'hero' | PassengerKind;
const PORTRAITS: PortraitKind[] = ['hero', 'normal', 'stench', 'family', 'brat', 'couple', 'angry', 'luggage', 'squat'];

/** Character portrait cropped from the concept sheet (public/art/portraits.webp). */
function portrait(kind: PortraitKind, cls = ''): string {
  if (kind === 'squat') {
    return `<span class="portrait portrait-ico ${cls}" aria-hidden="true">${icon('kind_squat')}</span>`;
  }
  const sheet: PortraitKind[] = ['hero', 'normal', 'stench', 'family', 'brat', 'couple', 'angry', 'luggage'];
  const i = Math.max(0, sheet.indexOf(kind));
  return `<span class="portrait ${cls}" aria-hidden="true" style="background-image:url('${asset('art/portraits.webp')}');background-position:${(i / (sheet.length - 1)) * 100}% 0"></span>`;
}

const backdrop = (): string => `<div class="backdrop" aria-hidden="true" style="background-image:url('${asset('art/key-art.webp')}')"></div>`;

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

/** Language toggle shows the language you'd switch TO. */
const langBtn = (cls = 'icon-btn'): string => {
  const dict = t();
  return `<button type="button" class="${cls}" data-act="lang" title="${dict.language}" aria-label="${dict.language}">${langIcon(getLang() === 'en' ? '粵' : 'EN')}</button>`;
};

const iconBtn = (act: string, name: string, label: string, extra = ''): string =>
  `<button type="button" class="icon-btn" data-act="${act}" title="${label}" aria-label="${label}" ${extra}>${icon(name)}</button>`;

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
      // Overlay on top of the paused / finished run.
      wrap.appendChild(renderPlayHud(game));
      const ov = el(`<div class="overlay" data-ui="1"></div>`);
      ov.appendChild(renderSkills(game));
      wrap.appendChild(ov);
    } else {
      wrap.appendChild(renderSkills(game));
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

const QUALITY_CYCLE: QualitySetting[] = ['auto', 'low', 'high'];

function qualityLabel(game: Game): string {
  const dict = t();
  const name = (q: 'low' | 'high') => (q === 'low' ? dict.qualityLow : dict.qualityHigh);
  const setting = game.save.quality;
  return setting === 'auto' ? `${dict.qualityAuto} · ${name(game.quality)}` : name(setting);
}

const stationName = (lv: Pick<LevelDef, 'stationEn' | 'stationZh'>): string => (getLang() === 'en' ? lv.stationEn : lv.stationZh);
const stationAlt = (lv: Pick<LevelDef, 'stationEn' | 'stationZh'>): string => (getLang() === 'en' ? lv.stationZh : lv.stationEn);

/** The level the big Play button starts: first uncleared, else the finale. */
function nextLevel(game: Game): LevelDef {
  const list = playableLevels();
  return list.find((l) => !game.save.cleared.includes(l.id)) ?? list[list.length - 1];
}

function screenBar(title: string, iconName: string, right = ''): string {
  const dict = t();
  return `
    <div class="top-bar" data-ui="1">
      ${iconBtn('menu-back', 'back', dict.back)}
      <div class="bar-title">${icon(iconName, 'sm')}<span>${title}</span></div>
      <div class="bar-right">${right}</div>
    </div>`;
}

const pointsChip = (game: Game): string =>
  `<span class="chip points-chip" title="${t().skillPoints}" aria-label="${t().skillPoints}: ${game.save.skills.points}">${icon('star', 'sm')}<b>${game.save.skills.points}</b></span>`;

function renderMenu(game: Game): HTMLElement {
  const dict = t();
  const levels = playableLevels();
  const nxt = nextLevel(game);
  const clearedCount = levels.filter((l) => game.save.cleared.includes(l.id)).length;
  const panel = el(`
    <div class="title-screen" data-ui="1">
      <div class="top-bar">
        ${langBtn()}
        <div class="bar-right">
          ${iconBtn('legend', 'legend', dict.legendTitle)}
          ${iconBtn('skills', 'skills', dict.skills)}
        </div>
      </div>
      <div class="title-main">
        <div class="logo">
          <img class="logo-icon" src="${asset('icons/icon-192.png')}" alt="" width="84" height="84" />
          <div class="wordmark"><b>${dict.title}</b><span>${dict.titleCantonese}</span></div>
        </div>
        <p class="tagline">${dict.tagline}</p>
        <div class="howto-icons" aria-label="${dict.howTo}">
          <span>${icon('drag')}<small>${dict.hintDrag}</small></span>
          <span>${icon('shove')}<small>${dict.hintShove}</small></span>
          <span>${icon('door')}<small>${dict.hintExit}</small></span>
        </div>
        <button type="button" class="play-big" id="btn-play" aria-label="${dict.play}: ${dict.level} ${nxt.id} ${stationName(nxt)}">
          ${icon('play', 'lg')}
          <span class="play-txt"><b>${dict.play}</b><small><i class="line-dot" style="background:${lineColor(nxt.stationEn)}"></i>${nxt.id} · ${stationName(nxt)}</small></span>
        </button>
        <div class="menu-tiles">
          <button type="button" class="tile" data-act="levels">${icon('levels')}<span>${dict.levelsTitle}</span><em>${clearedCount}/${levels.length}</em></button>
          <button type="button" class="tile" data-act="skills">${icon('skills')}<span>${dict.skills}</span><em>${icon('star', 'xs')}${game.save.skills.points}</em></button>
          <button type="button" class="tile" data-act="legend">${icon('legend')}<span>${dict.legendTitle}</span><em>9</em></button>
        </div>
        <div class="settings-row">
          <button type="button" class="setting" data-act="quality" aria-label="${dict.quality}: ${qualityLabel(game)}">${icon('quality', 'sm')}<span>${qualityLabel(game)}</span></button>
          <button type="button" class="setting ${game.save.typeIcons ? 'on' : ''}" data-act="icons" aria-pressed="${game.save.typeIcons}" aria-label="${dict.typeIcons}">${icon('tag', 'sm')}<span>${dict.typeIcons} · ${game.save.typeIcons ? dict.on : dict.off}</span></button>
          <button type="button" class="setting ${game.save.muted ? '' : 'on'}" data-act="mute" aria-pressed="${!game.save.muted}" aria-label="${game.save.muted ? dict.unmute : dict.mute}">${icon(game.save.muted ? 'mute' : 'volume', 'sm')}<span>${dict.sound} · ${game.save.muted ? dict.off : dict.on}</span></button>
        </div>
        ${game.needsReloadForAA() ? `<p class="sfx-note">${dict.qualityNote}</p>` : ''}
        <p class="sfx-note">${dict.sfxNote}<br />${dict.artCredit}</p>
      </div>
    </div>
  `);
  panel.querySelector('#btn-play')?.addEventListener('click', () => game.startLevel(nxt.id));
  return panel;
}

function renderLevels(game: Game): HTMLElement {
  const dict = t();
  const levels = playableLevels();
  const page = el(`
    <div class="sub-screen" data-ui="1">
      ${screenBar(dict.levelsTitle, 'levels', pointsChip(game))}
      <div class="sub-body"><div class="level-grid" id="level-list"></div><div class="level-teaser">${dict.levelsTeaser}</div></div>
    </div>
  `);
  const list = page.querySelector('#level-list')!;
  for (const lv of levels) {
    const done = game.save.cleared.includes(lv.id);
    const finale = lv.id === 100;
    const locked = finale && !isFinaleUnlocked(game.save.cleared, game.save.highestCleared);
    const lines = linesFor(lv.stationEn);
    const flav = getLang() === 'en' ? lv.flavourEn : lv.flavourZh;
    const btn = el(`
      <button type="button" class="lv-card ${done ? 'done' : ''} ${finale ? 'finale' : ''} ${locked ? 'locked' : ''}" data-id="${lv.id}" ${locked ? 'disabled' : ''} style="--line:${LINE_COLORS[lines[0]]};--station:${themeFor(lv.stationEn).wall}${finale ? `;background-image:linear-gradient(90deg,rgba(14,18,28,.92),rgba(14,18,28,.35)),url('${asset('art/key-art.webp')}')` : ''}" title="${locked ? dict.finaleLocked : flav}" aria-label="${dict.level} ${lv.id} ${stationName(lv)}${done ? ` · ${dict.cleared}` : ''}${locked ? ` · ${dict.locked}` : ''}">
        <span class="lv-swatch" aria-hidden="true"></span>
        <span class="lv-badge">${lv.id}<span class="lv-lines">${lines.map((l) => `<i style="background:${LINE_COLORS[l]}"></i>`).join('')}</span></span>
        <span class="lv-station"><b>${stationName(lv)}</b><small>${stationAlt(lv)}</small></span>
        <span class="lv-meta"><span>${icon('crowd', 'xs')}${lv.density}</span><span>${icon('timer', 'xs')}${lv.timer}</span></span>
        <span class="lv-state">${done ? icon('check', 'sm') : finale ? icon('star', 'sm') : ''}</span>
        ${finale ? `<span class="lv-finale">${dict.finale}</span>` : ''}
      </button>
    `);
    btn.addEventListener('click', () => { if (!(btn as HTMLButtonElement).disabled) game.startLevel(lv.id); });
    list.appendChild(btn);
  }
  return page;
}

function renderLegend(game: Game): HTMLElement {
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

function renderPlayHud(game: Game): HTMLElement {
  const dict = t();
  const lv = game.level!;
  // Ults / actives available in this run = skills the run started with.
  const s = game.runSkills;
  const mods = modifiersFromSkills(s);
  const ult = (k: 'str' | 'spd' | 'sta', title: string, on: boolean) =>
    `<button type="button" class="skill-use ult-${k} ${on ? '' : 'dim'}" data-ult="${k}" title="${title}" aria-label="${title}" ${on ? '' : 'disabled'}>${icon(on ? k : 'lock')}</button>`;
  const act = (id: string, title: string, on: boolean, ico: string) =>
    `<button type="button" class="skill-use act-${id} ${on ? '' : 'dim'}" data-act-skill="${id}" title="${title}" aria-label="${title}" ${on ? '' : 'disabled'}>${icon(on ? ico : 'lock')}</button>`;

  const hud = el(`
    <div class="play-hud" data-ui="1">
      <div class="hud-top">
        <div class="hud-row">
          <div class="station-chip" style="--line:${lineColor(lv.stationEn)}"><span class="lv-badge sm">${lv.id}</span><span>${stationName(lv)}</span></div>
          <button type="button" class="icon-btn pause-btn" id="btn-pause" title="${dict.pause}" aria-label="${dict.pause}">${icon('pause')}</button>
        </div>
        <div class="meters">
          <div class="meter door-meter">
            <span class="meter-icon" title="${dict.door}">${icon('door')}</span>
            <div class="meter-bar"><i id="m-door"></i><b class="tick" style="left:25%"></b><b class="tick" style="left:50%"></b><b class="tick" style="left:75%"></b></div>
          </div>
          <div class="meter stam-meter">
            <span class="meter-icon" title="${dict.stamina}">${icon('stamina')}</span>
            <div class="meter-bar stamina"><i id="m-stam"></i></div>
          </div>
          <div class="meter timer" id="m-timer">
            <span class="meter-icon" title="${dict.time}">${icon('timer')}</span>
            <span class="timer-val" id="m-time"></span>
          </div>
        </div>
      </div>
      ${game.activeTip ? `<div class="tip-chip" id="tip-chip">${icon(`kind_${game.activeTip}`, 'xs')}<span>${dict.tipChip}: ${getLang() === 'en' ? (INTROS[game.activeTip as IntroKind]?.tipEn ?? '') : (INTROS[game.activeTip as IntroKind]?.tipZh ?? '')}</span></div>` : ''}
      <div class="drag-hint ${game.showFtueGhost ? 'ftue-ghost' : ''}" aria-hidden="true">
        ${game.showFtueGhost ? `<span class="ghost-hand"></span><span class="ghost-label">${dict.hintDrag}</span>` : icon('drag')}
      </div>
      <div class="hud-actions">
        <div class="ult-col">
          ${ult('str', dict.ultStr, s.ultStr)}
          ${ult('spd', dict.ultSpd, s.ultSpd)}
          ${ult('sta', dict.ultSta, s.ultSta)}
          ${mods.hasBriefDash ? act('dash', dict.skillNodeActive + ': Brief Dash', true, 'spd') : ''}
          ${mods.hasSecondWind ? act('wind', dict.skillNodeActive + ': Second Wind', true, 'sta') : ''}
        </div>
        <button type="button" class="shove-btn" id="btn-shove" title="${dict.shove}" aria-label="${dict.shove}">${icon('shove')}</button>
      </div>
    </div>
  `);

  hud.querySelectorAll('[data-ult]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const k = (b as HTMLElement).dataset.ult as 'str' | 'spd' | 'sta';
      game.tryUltimate(k);
    });
  });
  hud.querySelectorAll('[data-act-skill]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const id = (b as HTMLElement).dataset.actSkill;
      if (id === 'dash') game.tryBriefDash();
      if (id === 'wind') game.trySecondWind();
    });
  });
  hud.querySelector('#btn-pause')?.addEventListener('click', () => {
    game.togglePause();
  });
  const shove = hud.querySelector('#btn-shove') as HTMLElement | null;
  if (shove) {
    const down = (e: PointerEvent) => {
      e.preventDefault();
      try {
        shove.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      game.audio.unlock();
      game.setShoveHeld(true);
    };
    const up = () => game.setShoveHeld(false);
    shove.addEventListener('pointerdown', down);
    shove.addEventListener('pointerup', up);
    shove.addEventListener('pointercancel', up);
    shove.addEventListener('lostpointercapture', up);
    shove.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  return hud;
}

/** Patch dynamic HUD values in place (cheap; no DOM rebuild). */
function updatePlayHud(root: HTMLElement, game: Game): void {
  const q = (id: string) => root.querySelector<HTMLElement>(id);
  const progress = Math.round(game.doorProgress() * 100);
  const stam = Math.round(game.staminaFrac() * 100);
  const time = Math.max(0, game.timeLeft);
  const door = q('#m-door');
  if (door) door.style.width = `${progress}%`;
  const doorMeter = root.querySelector('.door-meter');
  doorMeter?.classList.toggle('pulse', game.clock - game.milestoneAt < 0.45);
  const st = q('#m-stam');
  if (st) st.style.width = `${stam}%`;
  root.querySelector('.stam-meter')?.classList.toggle('winded', game.isWinded());
  root.querySelector('.stam-meter')?.classList.toggle('low', stam < 25);
  const tv = q('#m-time');
  if (tv) tv.textContent = time.toFixed(1);
  q('#m-timer')?.classList.toggle('urgent', time < 10);
  q('#m-timer')?.classList.toggle('critical', time < 5);
  const shove = q('#btn-shove');
  if (shove) {
    shove.style.setProperty('--cd', game.shoveCooldown().toFixed(3));
    shove.style.setProperty('--charge', game.shoveCharge().toFixed(3));
    shove.classList.toggle('cooling', game.shoveCooldown() > 0);
    shove.classList.toggle('charging', game.shoveCharge() > 0);
  }
  root.querySelectorAll<HTMLElement>('[data-ult]').forEach((b) => {
    const k = b.dataset.ult as 'str' | 'spd' | 'sta';
    b.style.setProperty('--cd', game.ultCooldown(k).toFixed(3));
    b.classList.toggle('active', game.ultActive(k));
    b.classList.toggle('cooling', game.ultCooldown(k) > 0);
  });
  root.querySelector('.drag-hint')?.classList.toggle('gone', !game.showFtueGhost && (game.doorProgress() > 0.05 || (game.sim?.time ?? 0) > 4));
}

/** Round icon button with a tiny caption (pause / end overlays). */
const roundBtn = (attrs: string, name: string, label: string, cls = ''): string =>
  `<button type="button" class="round-btn ${cls}" ${attrs} aria-label="${label}">${icon(name)}<small>${label}</small></button>`;

function renderPause(game: Game): HTMLElement {
  const dict = t();
  const p = el(`
    <div class="overlay" data-ui="1">
      <div class="panel end-panel">
        <div class="end-icon pause-ico">${icon('pause', 'xl')}</div>
        <h2>${dict.pause}</h2>
        ${game.autoPaused ? `<p class="howto">${dict.autoPaused}</p>` : ''}
        <button type="button" class="primary" id="btn-resume">${icon('play', 'sm')}<span>${dict.resume}</span></button>
        <div class="round-row">
          ${roundBtn('id="btn-restart"', 'restart', dict.retry)}
          ${roundBtn('data-act="skills"', 'skills', dict.skills)}
          <button type="button" class="round-btn" data-act="lang" aria-label="${dict.language}">${langIcon(getLang() === 'en' ? '粵' : 'EN')}<small>${dict.language}</small></button>
          ${roundBtn('data-act="mute"', game.save.muted ? 'mute' : 'volume', game.save.muted ? dict.unmute : dict.mute)}
          ${roundBtn('data-act="home"', 'home', dict.menu)}
        </div>
      </div>
    </div>
  `);
  p.querySelector('#btn-resume')?.addEventListener('click', () => game.resume());
  p.querySelector('#btn-restart')?.addEventListener('click', () => {
    if (game.level) game.startLevel(game.level.id);
  });
  return p;
}

function renderEnd(game: Game, win: boolean): HTMLElement {
  const dict = t();
  const lv = game.level;
  const hasNext = win && lv && lv.id !== 100;
  const p = el(`
    <div class="overlay" data-ui="1">
      <div class="panel end-panel ${win ? 'win' : 'lose'}">
        ${
          win
            ? `<div class="end-hero">${portrait('hero', 'lg')}<span class="burst" aria-hidden="true"></span></div>`
            : `<div class="end-icon lose-ico">${icon('door', 'xl')}<span class="x">${icon('close')}</span></div>`
        }
        <h2>${win ? dict.win : dict.lose}</h2>
        ${lv ? `<p class="end-station"><span class="lv-badge sm" style="--line:${lineColor(lv.stationEn)}">${lv.id}</span>${stationName(lv)}</p>` : ''}
        ${win ? endBonus(game) : `<p class="howto">${dict.loseHint}</p>`}
        ${
          hasNext
            ? `<button type="button" class="primary" id="btn-next">${icon('next', 'sm')}<span>${dict.next}</span></button>`
            : `<button type="button" class="primary" id="btn-retry">${icon('restart', 'sm')}<span>${dict.retry}</span></button>`
        }
        <div class="round-row">
          ${hasNext ? roundBtn('id="btn-retry"', 'restart', dict.retry) : ''}
          ${roundBtn('data-act="skills"', 'skills', dict.skills)}
          ${roundBtn('data-act="home"', 'home', dict.menu)}
        </div>
      </div>
    </div>
  `);
  p.querySelectorAll('#btn-retry').forEach((b) =>
    b.addEventListener('click', () => {
      if (game.level) game.startLevel(game.level.id);
    }),
  );
  p.querySelector('#btn-next')?.addEventListener('click', () => {
    if (!game.level) return;
    const list = playableLevels();
    const idx = list.findIndex((l) => l.id === game.level!.id);
    const next = list[idx + 1];
    if (next) game.startLevel(next.id);
  });
  return p;
}

function endBonus(game: Game): string {
  const dict = t();
  const c = game.lastClear;
  const star = icon('star', 'sm');
  if (!c || (c.awarded && c.count === 1)) return `<p class="bonus">${star}${fmt(dict.clearBonusN, { n: POINTS_PER_FIRST_CLEAR })}</p>`;
  if (c.awarded) return `<p class="bonus">${star}${fmt(dict.replayBonus, { n: c.count, max: MAX_POINTS_PER_LEVEL })}</p>`;
  return `<p class="howto">${dict.clearNoBonus}</p>`;
}

function renderSkills(game: Game): HTMLElement {
  const dict = t();
  const s = game.save.skills;
  const overRun = game.skillsOverRun;
  const en = getLang() === 'en';
  const branchLabel = (b: Branch) => (b === 'str' ? dict.strength : b === 'spd' ? dict.speed : dict.staminaBranch);
  const branchIco = (b: Branch) => (b === 'sta' ? 'sta' : b);

  const arm = (branch: Branch, angleDeg: number) => {
    const filled = s[branch];
    const nodes = nodesFor(branch);
    const ult = ultUnlocked(s, branch);
    const can = canSpend(s, branch);
    const ultNext = filled >= BRANCH_FILL && !ult;
    const ultDef = ULT_DEFS[branch];
    const nodeHtml = nodes
      .map((n, i) => {
        const on = nodeUnlocked(s, n);
        const name = en ? n.nameEn : n.nameZh;
        const tip = en ? n.tipEn : n.tipZh;
        const tbd = n.tbd ? ` · ${dict.tier3Tbd}` : '';
        const kind = n.kind === 'active' ? dict.skillNodeActive : dict.skillNodePassive;
        const title = `${name} — ${tip}${tbd} (${kind})`;
        const major = n.kind === 'active' || n.at >= 40;
        return `<button type="button" class="cst-node ${on ? 'on' : ''} ${major ? 'major' : ''} ${n.tbd ? 'tbd' : ''} t${n.tier}" style="--i:${i}" title="${title}" aria-label="${title}" disabled>
          <span class="cst-dot">${on ? icon(branchIco(branch), 'xs') : icon('lock', 'xs')}</span>
          <span class="cst-label">${name}</span>
        </button>`;
      })
      .join('');
    const ultTitle = `${en ? ultDef.nameEn : ultDef.nameZh} — ${en ? ultDef.tipEn : ultDef.tipZh}`;
    return `
      <div class="cst-arm b-${branch}" style="--angle:${angleDeg}deg" data-branch="${branch}">
        <div class="cst-arm-line" aria-hidden="true"></div>
        <div class="cst-nodes">${nodeHtml}
          <button type="button" class="cst-node major ult ${ult ? 'on' : ''}" title="${ultTitle}" aria-label="${ultTitle}" disabled>
            <span class="cst-dot">${icon(ult ? 'star' : 'lock', 'xs')}</span>
            <span class="cst-label">${en ? ultDef.nameEn : ultDef.nameZh}</span>
          </button>
        </div>
        <div class="cst-arm-head">
          <span class="skill-ico">${icon(branchIco(branch))}</span>
          <strong>${branchLabel(branch)}</strong>
          <div class="skill-prog">${branchProgressLabel(s, branch, dict.ultShort)}</div>
          <button type="button" class="spend-btn" data-spend="${branch}" aria-label="${dict.spend}: ${branchLabel(branch)}" title="${can ? dict.spend : filled >= BRANCH_FILL && ult ? dict.branchFull : dict.notEnough}" ${can ? '' : 'disabled'}>
            ${ultNext ? `${icon('star', 'xs')}${ULTIMATE_COST}` : `<span class="plus">＋</span>`}
          </button>
        </div>
      </div>
    `;
  };

  const panel = el(`
    <div class="${overRun ? 'panel skills-panel' : 'sub-screen'}" data-ui="1">
      ${overRun ? `<h2 class="panel-title">${icon('skills', 'sm')}${dict.skills}</h2>` : screenBar(dict.skills, 'skills', pointsChip(game))}
      <div class="${overRun ? '' : 'sub-body'}">
        ${overRun ? `<p class="points">${pointsChip(game)}</p>` : ''}
        <p class="howto">${fmt(dict.skillHowto, { fill: BRANCH_FILL, ult: ULTIMATE_COST })}</p>
        ${overRun ? `<p class="howto">${dict.skillsApplyNext}</p>` : ''}
        <div class="constellation" role="group" aria-label="${dict.skills}">
          <div class="cst-core" title="${dict.skillPoints}">${icon('skills')}<b>${s.points}</b></div>
          ${arm('str', -90)}
          ${arm('spd', 30)}
          ${arm('sta', 150)}
        </div>
        ${overRun ? `<button type="button" class="primary" id="btn-back">${icon('back', 'sm')}<span>${dict.back}</span></button>` : ''}
      </div>
    </div>
  `);

  panel.querySelectorAll('[data-spend]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const branch = (btn as HTMLElement).dataset.spend as Branch;
      game.save.skills = spendPoint(game.save.skills, branch);
      game.persist();
      game.audio.ui();
      rerender(game);
    });
  });
  const back = () => {
    game.audio.ui();
    game.closeSkills();
  };
  panel.querySelector('#btn-back')?.addEventListener('click', back);
  const barBack = panel.querySelector('[data-act="menu-back"]');
  if (barBack) {
    barBack.removeAttribute('data-act');
    barBack.addEventListener('click', back);
  }
  return panel;
}


/** Full-screen intro / review card for a special passenger. */
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
