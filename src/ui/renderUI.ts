import { t, toggleLang, getLang, fmt } from '../i18n';
import type { Game } from '../game/Game';
import { playableLevels } from '../game/levels';
import type { QualitySetting } from '../game/storage';
import {
  BRANCH_FILL,
  MAX_POINTS_PER_LEVEL,
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

let lastKey = '';

/** Key that forces a full rebuild when it changes; otherwise the play HUD is patched in place. */
function uiKey(game: Game): string {
  return `${game.screen}|${getLang()}|${game.level?.id ?? ''}|${game.skillsReturn}`;
}

/** Wire every `[data-act=lang]` / `[data-act=skills]` button inside `scope`. */
function wireCommon(scope: ParentNode, root: HTMLElement, game: Game): void {
  scope.querySelectorAll('[data-act="lang"]').forEach((b) =>
    b.addEventListener('click', () => {
      game.audio.unlock();
      game.audio.ui();
      toggleLang();
      game.persist();
      renderUI(root, game);
    }),
  );
  scope.querySelectorAll('[data-act="skills"]').forEach((b) =>
    b.addEventListener('click', () => {
      game.audio.unlock();
      game.audio.ui();
      game.openSkills(); // pauses a running level first; never abandons it
      renderUI(root, game);
    }),
  );
}

const langLabel = () => `🌐 ${getLang() === 'en' ? '粵' : 'EN'}`;

export function renderUI(root: HTMLElement, game: Game): void {
  const key = uiKey(game);
  if (key === lastKey && game.screen === 'playing' && root.querySelector('.play-hud')) {
    updatePlayHud(root, game);
    return;
  }
  lastKey = key;
  game.setShoveHeld(false);
  const dict = t();
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.id = 'hud';
  wrap.dataset.ui = '1';

  // Brand top bar only outside a run (frees the notch area for the play HUD).
  const overRun = game.skillsOverRun;
  if (game.screen === 'menu' || (game.screen === 'skills' && !overRun)) {
    const top = el(`
      <div class="top-bar" data-ui="1">
        <button type="button" class="icon-btn" data-act="lang" title="${dict.language}" aria-label="${dict.language}">${langLabel()}</button>
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">🚇</span>
          <span class="brand-title">${dict.title}</span>
        </div>
        <button type="button" class="icon-btn" data-act="skills" title="${dict.skills}" aria-label="${dict.skills}">🌳</button>
      </div>
    `);
    wrap.appendChild(top);
  }

  if (game.screen === 'menu') {
    wrap.appendChild(renderMenu(game));
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

  wireCommon(root, root, game);
}

const QUALITY_CYCLE: QualitySetting[] = ['auto', 'low', 'high'];

function qualityLabel(game: Game): string {
  const dict = t();
  const name = (q: 'low' | 'high') => (q === 'low' ? dict.qualityLow : dict.qualityHigh);
  const setting = game.save.quality;
  return setting === 'auto' ? `${dict.qualityAuto} · ${name(game.quality)}` : name(setting);
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
      <div class="settings-row">
        <span>⚙️ ${dict.quality}</span>
        <button type="button" class="icon-btn" id="btn-quality" aria-label="${dict.quality}: ${qualityLabel(game)}">${qualityLabel(game)}</button>
      </div>
      ${game.needsReloadForAA() ? `<p class="sfx-note">${dict.qualityNote}</p>` : ''}
      <p class="sfx-note">${dict.sfxNote}</p>
    </div>
  `);
  panel.querySelector('#btn-quality')?.addEventListener('click', () => {
    game.audio.unlock();
    game.audio.ui();
    const i = QUALITY_CYCLE.indexOf(game.save.quality);
    game.setQuality(QUALITY_CYCLE[(i + 1) % QUALITY_CYCLE.length]);
  });
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
        <span class="lv-meta">👥${lv.density} · ⏱${lv.timer}${dict.secShort} ${cleared}</span>
      </button>
    `);
    btn.addEventListener('click', () => {
      game.startLevel(lv.id);
      // parent will re-render via onState
    });
    list.appendChild(btn);
  }
  const note = el(`<div class="level-teaser">${dict.levelsTeaser}</div>`);
  list.appendChild(note);
  return panel;
}

function renderPlayHud(game: Game): HTMLElement {
  const dict = t();
  const lv = game.level!;
  const name = getLang() === 'en' ? lv.stationEn : lv.stationZh;
  // Ults available in this run = skills the run started with.
  const s = game.runSkills;
  const ult = (k: 'str' | 'spd' | 'wis', icon: string, title: string, on: boolean) =>
    `<button type="button" class="skill-use ${on ? '' : 'dim'}" data-ult="${k}" title="${title}" aria-label="${title}" ${on ? '' : 'disabled'}>${icon}</button>`;

  const hud = el(`
    <div class="play-hud" data-ui="1">
      <div class="hud-top">
        <div class="hud-row">
          <div class="station-chip"><span>📍 ${lv.id} · ${name}</span></div>
          <button type="button" class="icon-btn pause-btn" id="btn-pause" title="${dict.pause}" aria-label="${dict.pause}">⏸️</button>
        </div>
        <div class="meters">
          <div class="meter door-meter">
            <span class="meter-icon" title="${dict.door}">🚪</span>
            <div class="meter-bar"><i id="m-door"></i><b class="tick" style="left:25%"></b><b class="tick" style="left:50%"></b><b class="tick" style="left:75%"></b></div>
          </div>
          <div class="meter stam-meter">
            <span class="meter-icon" title="${dict.stamina}">💪</span>
            <div class="meter-bar stamina"><i id="m-stam"></i></div>
          </div>
          <div class="meter timer" id="m-timer">
            <span class="meter-icon" title="${dict.time}">⏱️</span>
            <span class="timer-val" id="m-time"></span>
          </div>
        </div>
      </div>
      <div class="drag-hint" aria-hidden="true">👆</div>
      <div class="hud-actions">
        <div class="ult-col">
          ${ult('str', '🐂', dict.ultStr, s.ultStr)}
          ${ult('spd', '💨', dict.ultSpd, s.ultSpd)}
          ${ult('wis', '🧠', dict.ultWis, s.ultWis)}
        </div>
        <button type="button" class="shove-btn" id="btn-shove" title="${dict.shove}" aria-label="${dict.shove}">✊</button>
      </div>
    </div>
  `);

  hud.querySelectorAll('[data-ult]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const k = (b as HTMLElement).dataset.ult as 'str' | 'spd' | 'wis';
      game.tryUltimate(k);
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
    const k = b.dataset.ult as 'str' | 'spd' | 'wis';
    b.style.setProperty('--cd', game.ultCooldown(k).toFixed(3));
    b.classList.toggle('active', game.ultActive(k));
    b.classList.toggle('cooling', game.ultCooldown(k) > 0);
  });
  root.querySelector('.drag-hint')?.classList.toggle('gone', game.doorProgress() > 0.05 || (game.sim?.time ?? 0) > 4);
}

function renderPause(game: Game): HTMLElement {
  const dict = t();
  const p = el(`
    <div class="overlay" data-ui="1">
      <div class="panel">
        <h2>${dict.pause}</h2>
        ${game.autoPaused ? `<p class="howto">${dict.autoPaused}</p>` : ''}
        <button type="button" class="primary" id="btn-resume">${dict.resume}</button>
        <div class="btn-row">
          <button type="button" class="ghost" data-act="skills">🌳 ${dict.skills}</button>
          <button type="button" class="ghost" data-act="lang" aria-label="${dict.language}">${langLabel()}</button>
        </div>
        <button type="button" class="ghost" id="btn-menu">${dict.menu}</button>
      </div>
    </div>
  `);
  p.querySelector('#btn-resume')?.addEventListener('click', () => game.resume());
  p.querySelector('#btn-menu')?.addEventListener('click', () => game.goMenu());
  return p;
}

function renderEnd(game: Game, win: boolean): HTMLElement {
  const dict = t();
  const p = el(`
    <div class="overlay" data-ui="1">
      <div class="panel">
        <h2>${win ? dict.win : dict.lose}</h2>
        ${win ? endBonus(game) : `<p>${dict.loseHint}</p>`}
        <button type="button" class="primary" id="btn-retry">${dict.retry}</button>
        ${
          win && game.level && game.level.id !== 100
            ? `<button type="button" class="primary" id="btn-next">${dict.next}</button>`
            : ''
        }
        <div class="btn-row">
          <button type="button" class="ghost" data-act="skills">🌳 ${dict.skills}</button>
          <button type="button" class="ghost" id="btn-menu">${dict.menu}</button>
        </div>
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

function endBonus(game: Game): string {
  const dict = t();
  const c = game.lastClear;
  if (!c || (c.awarded && c.count === 1)) return `<p class="bonus">${dict.clearBonus}</p>`;
  if (c.awarded) return `<p class="bonus">${fmt(dict.replayBonus, { n: c.count, max: MAX_POINTS_PER_LEVEL })}</p>`;
  return `<p class="howto">${dict.clearNoBonus}</p>`;
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
            <div class="skill-prog">${branchProgressLabel(s, branch, dict.ultShort)}</div>
          </div>
          <button type="button" class="spend-btn" data-spend="${branch}" aria-label="${dict.spend}: ${label}" title="${can ? dict.spend : filled >= BRANCH_FILL && ult ? dict.branchFull : dict.notEnough}" ${can ? '' : 'disabled'}>
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
      <p class="howto">${fmt(dict.skillHowto, { fill: BRANCH_FILL, ult: ULTIMATE_COST })}</p>
      ${game.skillsOverRun ? `<p class="howto">${dict.skillsApplyNext}</p>` : ''}
      ${branchRow('str', '🐂', dict.strength, dict.ultStr)}
      ${branchRow('spd', '💨', dict.speed, dict.ultSpd)}
      ${branchRow('wis', '🧠', dict.wisdom, dict.ultWis)}
      <button type="button" class="primary" id="btn-back">${dict.back}</button>
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
    game.audio.ui();
    game.closeSkills(); // back to the menu, or to the paused / finished run
  });
  return panel;
}
