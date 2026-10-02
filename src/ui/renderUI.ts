import { t, toggleLang, getLang } from '../i18n';
import type { Game } from '../game/Game';
import { playableLevels } from '../game/levels';
import {
  BRANCH_FILL,
  ULTIMATE_COST,
  branchProgressLabel,
  canSpend,
  spendPoint,
  type Branch,
} from '../game/SkillTree';

function el(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as HTMLElement;
}

export function renderUI(root: HTMLElement, game: Game): void {
  const dict = t();
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.id = 'hud';
  wrap.dataset.ui = '1';

  // Top bar always
  const top = el(`
    <div class="top-bar" data-ui="1">
      <button type="button" class="icon-btn" id="btn-lang" title="${dict.language}">🌐 ${getLang() === 'en' ? '粵' : 'EN'}</button>
      <div class="brand">
        <span class="brand-mark">🚇</span>
        <span class="brand-title">${dict.title}</span>
      </div>
      <button type="button" class="icon-btn" id="btn-skills" title="${dict.skills}">🌳</button>
    </div>
  `);
  wrap.appendChild(top);

  if (game.screen === 'menu') {
    wrap.appendChild(renderMenu(game));
  } else if (game.screen === 'skills') {
    wrap.appendChild(renderSkills(game));
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

  root.querySelector('#btn-lang')?.addEventListener('click', () => {
    game.audio.unlock();
    game.audio.ui();
    toggleLang();
    game.persist();
    renderUI(root, game);
  });
  root.querySelector('#btn-skills')?.addEventListener('click', () => {
    game.audio.unlock();
    game.audio.ui();
    if (game.screen === 'playing') game.togglePause();
    game.openSkills();
    renderUI(root, game);
  });
}

function renderMenu(game: Game): HTMLElement {
  const dict = t();
  const levels = playableLevels();
  const panel = el(`
    <div class="panel menu-panel" data-ui="1">
      <h1>${dict.title} <small>${dict.titleCantonese}</small></h1>
      <p class="tagline">${dict.tagline}</p>
      <p class="howto">${dict.howTo}</p>
      <p class="points">⭐ ${dict.skillPoints}: <strong>${game.save.skills.points}</strong></p>
      <div class="level-list" id="level-list"></div>
      <p class="sfx-note">${dict.sfxNote}</p>
    </div>
  `);
  const list = panel.querySelector('#level-list')!;
  for (const lv of levels) {
    const name = getLang() === 'en' ? lv.stationEn : lv.stationZh;
    const flav = getLang() === 'en' ? lv.flavourEn : lv.flavourZh;
    const cleared = game.save.cleared.includes(lv.id) ? '✓' : '';
    const btn = el(`
      <button type="button" class="level-btn" data-id="${lv.id}">
        <span class="lv-num">${dict.level} ${lv.id}</span>
        <span class="lv-name">${name}</span>
        <span class="lv-flav">${flav}</span>
        <span class="lv-meta">👥${lv.density} · ⏱${lv.timer}s ${cleared}</span>
      </button>
    `);
    btn.addEventListener('click', () => {
      game.startLevel(lv.id);
      // parent will re-render via onState
    });
    list.appendChild(btn);
  }
  const note = el(`<div class="level-teaser">${getLang() === 'en' ? 'Levels 21–99 TBD · Lv100 is the finale' : '21–99 關待補 · 第100關為終極挑戰'}</div>`);
  list.appendChild(note);
  return panel;
}

function renderPlayHud(game: Game): HTMLElement {
  const dict = t();
  const lv = game.level!;
  const name = getLang() === 'en' ? lv.stationEn : lv.stationZh;
  const progress = Math.round(game.doorProgress() * 100);
  const stam = Math.round((game.player.stamina / game.player.staminaMax) * 100);
  const time = Math.max(0, game.timeLeft);
  const s = game.save.skills;

  const hud = el(`
    <div class="play-hud" data-ui="1">
      <div class="station-chip">
        <span>📍 ${dict.level} ${lv.id} · ${name}</span>
      </div>
      <div class="meters">
        <div class="meter">
          <span class="meter-icon" title="${dict.door}">🚪</span>
          <div class="meter-bar"><i style="width:${progress}%"></i></div>
        </div>
        <div class="meter">
          <span class="meter-icon" title="${dict.stamina}">💪</span>
          <div class="meter-bar stamina"><i style="width:${stam}%"></i></div>
        </div>
        <div class="meter timer ${time < 10 ? 'urgent' : ''}">
          <span class="meter-icon" title="${dict.time}">⏱️</span>
          <span class="timer-val">${time.toFixed(1)}</span>
        </div>
      </div>
      <div class="skill-rail">
        <button type="button" class="skill-use ${s.ultStr ? '' : 'dim'}" data-ult="str" title="${dict.ultStr}">🐂</button>
        <button type="button" class="skill-use ${s.ultSpd ? '' : 'dim'}" data-ult="spd" title="${dict.ultSpd}">💨</button>
        <button type="button" class="skill-use ${s.ultWis ? '' : 'dim'}" data-ult="wis" title="${dict.ultWis}">🧠</button>
        <button type="button" class="icon-btn" id="btn-pause">⏸️</button>
      </div>
    </div>
  `);

  hud.querySelectorAll('[data-ult]').forEach((b) => {
    b.addEventListener('click', () => {
      const k = (b as HTMLElement).dataset.ult as 'str' | 'spd' | 'wis';
      game.tryUltimate(k);
    });
  });
  hud.querySelector('#btn-pause')?.addEventListener('click', () => {
    game.togglePause();
  });
  return hud;
}

function renderPause(game: Game): HTMLElement {
  const dict = t();
  const p = el(`
    <div class="overlay" data-ui="1">
      <div class="panel">
        <h2>${dict.pause}</h2>
        <button type="button" class="primary" id="btn-resume">${dict.resume}</button>
        <button type="button" class="ghost" id="btn-menu">${dict.menu}</button>
      </div>
    </div>
  `);
  p.querySelector('#btn-resume')?.addEventListener('click', () => game.togglePause());
  p.querySelector('#btn-menu')?.addEventListener('click', () => game.goMenu());
  return p;
}

function renderEnd(game: Game, win: boolean): HTMLElement {
  const dict = t();
  const p = el(`
    <div class="overlay" data-ui="1">
      <div class="panel">
        <h2>${win ? dict.win : dict.lose}</h2>
        ${win ? `<p class="bonus">${dict.clearBonus}</p>` : `<p>${dict.loseHint}</p>`}
        <button type="button" class="primary" id="btn-retry">${dict.retry}</button>
        ${
          win && game.level && game.level.id !== 100
            ? `<button type="button" class="primary" id="btn-next">${dict.next}</button>`
            : ''
        }
        <button type="button" class="ghost" id="btn-menu">${dict.menu}</button>
      </div>
    </div>
  `);
  p.querySelector('#btn-retry')?.addEventListener('click', () => {
    if (game.level) game.startLevel(game.level.id);
  });
  p.querySelector('#btn-next')?.addEventListener('click', () => {
    if (!game.level) return;
    const list = playableLevels();
    const idx = list.findIndex((l) => l.id === game.level!.id);
    const next = list[idx + 1];
    if (next) game.startLevel(next.id);
  });
  p.querySelector('#btn-menu')?.addEventListener('click', () => game.goMenu());
  return p;
}

function renderSkills(game: Game): HTMLElement {
  const dict = t();
  const s = game.save.skills;
  const branchRow = (branch: Branch, icon: string, label: string, ultName: string) => {
    const filled = s[branch];
    const ult = branch === 'str' ? s.ultStr : branch === 'spd' ? s.ultSpd : s.ultWis;
    const pct = Math.min(100, (filled / BRANCH_FILL) * 100);
    const can = canSpend(s, branch);
    return `
      <div class="skill-branch" data-branch="${branch}">
        <div class="skill-head">
          <span class="skill-ico">${icon}</span>
          <div>
            <strong>${label}</strong>
            <div class="skill-prog">${branchProgressLabel(s, branch)}</div>
          </div>
          <button type="button" class="spend-btn" data-spend="${branch}" ${can ? '' : 'disabled'}>
            ${filled >= BRANCH_FILL && !ult ? `⚡${ULTIMATE_COST}` : `＋`}
          </button>
        </div>
        <div class="skill-bar"><i style="width:${pct}%"></i></div>
        <div class="ult ${ult ? 'on' : ''}">${dict.ultimate}: ${ultName} ${ult ? '✅' : '🔒'}</div>
      </div>
    `;
  };

  const panel = el(`
    <div class="panel skills-panel" data-ui="1">
      <h2>🌳 ${dict.skills}</h2>
      <p class="points">⭐ ${dict.skillPoints}: <strong id="pts">${s.points}</strong></p>
      <p class="howto">60 ${getLang() === 'en' ? 'to fill a branch' : '點滿一枝'} · +10 ${dict.ultimate}</p>
      ${branchRow('str', '🐂', dict.strength, dict.ultStr)}
      ${branchRow('spd', '💨', dict.speed, dict.ultSpd)}
      ${branchRow('wis', '🧠', dict.wisdom, dict.ultWis)}
      <button type="button" class="primary" id="btn-back">${dict.menu}</button>
    </div>
  `);

  panel.querySelectorAll('[data-spend]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const branch = (btn as HTMLElement).dataset.spend as Branch;
      game.save.skills = spendPoint(game.save.skills, branch);
      game.persist();
      game.audio.ui();
      const root = document.getElementById('ui-root');
      if (root) renderUI(root, game);
    });
  });
  panel.querySelector('#btn-back')?.addEventListener('click', () => {
    game.closeSkillsToMenu();
  });
  return panel;
}
