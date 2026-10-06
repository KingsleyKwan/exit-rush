import { t, getLang, fmt } from '../i18n';
import type { Game } from '../game/Game';
import { INTROS, type IntroKind } from '../game/intros';
import { playableLevels } from '../game/levels';
import { POINTS_PER_FIRST_CLEAR, MAX_POINTS_PER_LEVEL, modifiersFromSkills } from '../game/SkillTree';
import { spellById } from '../game/SpellTree';
import { itemDef, previewCoins } from '../game/techKit';
import { linesFor, lineColor } from '../game/lines';
import { icon, langIcon } from './icons';
import { el, iconBtn, langBtn, qualityLabel, stationName, loadoutStrip, wireLoadoutStrip } from './uiShared';
import { charPortraitUrl } from '../game/charPortraits';


function mageActions(game: Game, dict: ReturnType<typeof t>): string {
  const s = game.runSkills;
  // Always one visible slot per element (highest-tier unlocked), then one ult.
  // Never drop a branch mid-run — cooldown uses a pie overlay, button stays.
  const raw = game.runMods.spellBar ?? [];
  const byBranch = new Map<string, string>();
  for (const id of raw) {
    const n = spellById(id);
    if (!n) continue;
    const prev = byBranch.get(n.branch);
    if (!prev || (spellById(prev)?.at ?? 0) < n.at) byBranch.set(n.branch, id);
  }
  // Fallback stubs so fire/ice/volt always occupy a slot when that T1 is unlocked.
  for (const [branch, stub] of [['fire', 'fire_t1'], ['ice', 'ice_t1'], ['volt', 'volt_t1']] as const) {
    if (!byBranch.has(branch) && spellById(stub) && (branch === 'fire' ? s.str : branch === 'ice' ? s.sta : s.spd) >= 10) {
      byBranch.set(branch, stub);
    }
  }
  const spellBtn = (branch: 'fire' | 'ice' | 'volt') => {
    const id = byBranch.get(branch);
    const ico = branch;
    if (!id) {
      return `<button type="button" class="skill-use act-spell el-${branch} dim" disabled title="${branch}" aria-label="${branch}">${icon(ico)}</button>`;
    }
    const n = spellById(id)!;
    const title = `${n.nameZh} / ${n.nameEn}`;
    return `<button type="button" class="skill-use act-spell el-${branch}" data-spell="${id}" data-branch="${branch}" title="${title}" aria-label="${title}">${icon(ico)}</button>`;
  };
  const ults: string[] = [];
  if (s.ultStr) ults.push(`<button type="button" class="skill-use ult-str ult-mage" data-ult="str" title="${dict.fire}" aria-label="${dict.fire}">${icon('fire')}</button>`);
  if (s.ultSpd) ults.push(`<button type="button" class="skill-use ult-spd ult-mage" data-ult="spd" title="${dict.volt}" aria-label="${dict.volt}">${icon('volt')}</button>`);
  if (s.ultSta) ults.push(`<button type="button" class="skill-use ult-sta ult-mage" data-ult="sta" title="${dict.ice}" aria-label="${dict.ice}">${icon('ice')}</button>`);
  return [spellBtn('fire'), spellBtn('ice'), spellBtn('volt'), ...ults.slice(0, 1)].join('');
}

function techActions(game: Game, dict: ReturnType<typeof t>): string {
  const mods = game.runMods;
  const en = getLang() === 'en';
  const gadget = (mods.techActives ?? []).filter((id) => id !== 'S2').map((id) => {
    const def = itemDef(id);
    const name = def ? (en ? def.nameEn : def.nameZh) : id;
    return `<button type="button" class="skill-use act-gadget" data-gadget="${id}" title="${name}" aria-label="${name}">${icon('shop')}</button>`;
  });
  if (mods.hasLeap) {
    gadget.push(`<button type="button" class="skill-use act-leap" data-act-skill="leap" title="${dict.skLeap}" aria-label="${dict.skLeap}">${icon('kind_squat')}</button>`);
  }
  if (mods.techCore) {
    const k = mods.techCore;
    const title = k === 'str' ? dict.ultStr : k === 'spd' ? dict.ultSpd : dict.ultSta;
    gadget.push(`<button type="button" class="skill-use ult-${k}" data-ult="${k}" title="${title}" aria-label="${title}">${icon(k)}</button>`);
  }
  const drinks = (mods.techConsumables ?? []).map((id) => {
    const def = itemDef(id);
    const name = def ? (en ? def.nameEn : def.nameZh) : id;
    return `<button type="button" class="skill-use act-cons" data-cons="${id}" title="${name}" aria-label="${name}">${icon('bag', 'xs')}</button>`;
  }).join('');
  return `${drinks ? `<div class="cons-row">${drinks}</div>` : ''}${gadget.join('')}`;
}

export function renderPlayHud(game: Game): HTMLElement {
  const dict = t();
  const lv = game.level!;
  const who = game.trial?.character ?? game.save.character;
  // Ults / actives available in this run = skills the run started with.
  const s = game.runSkills;
  const mods = modifiersFromSkills(s);
  const ult = (k: 'str' | 'spd' | 'sta', title: string, on: boolean) =>
    `<button type="button" class="skill-use ult-${k} ${on ? '' : 'dim'}" data-ult="${k}" title="${title}" aria-label="${title}" ${on ? '' : 'disabled'}>${icon(on ? k : 'lock')}</button>`;
  const act = (id: string, title: string, on: boolean, ico: string) =>
    `<button type="button" class="skill-use act-${id} ${on ? '' : 'dim'}" data-act-skill="${id}" title="${title}" aria-label="${title}" ${on ? '' : 'disabled'}>${icon(on ? ico : 'lock')}</button>`;

  const doorBanner = game.doorBannerT > 0
    ? `<div class="door-banner" id="door-banner" role="status">
        <span class="door-banner-zh">${fmt(dict.doorBannerZh, { n: game.doorBannerOpen })}</span>
        <span class="door-banner-en">${game.doorBannerOpen === 1 ? dict.doorBannerEnOne : fmt(dict.doorBannerEn, { n: game.doorBannerOpen })}</span>
        <span class="door-icons" aria-hidden="true">${[0, 1, 2]
          .map(
            (i) =>
              `<span class="door-ico ${i < game.doorBannerOpen ? 'open' : 'shut'}" title="${i < game.doorBannerOpen ? dict.doorOpenIcon : dict.doorClosedIcon}">${icon('door', 'xs')}${i < game.doorBannerOpen ? '' : '<b>×</b>'}</span>`,
          )
          .join('')}</span>
      </div>`
    : '';

  const hud = el(`
    <div class="play-hud" data-ui="1">
      <div class="hud-stack">
        <div class="hud-top">
          <div class="hud-row">
            <div class="station-chip" style="--line:${lineColor(lv.stationEn)}"><span class="lv-badge sm">${lv.id}</span><span>${stationName(lv)}</span></div>
            <span class="noise-chip" id="m-noise" aria-live="polite">${icon('kind_loud', 'xs')}<b>${dict.loudHud}</b></span>
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
            ${who === 'mage' ? `<div class="meter mana-meter">
              <span class="meter-icon" title="${dict.mana}">${icon('mana')}</span>
              <div class="meter-bar mana"><i id="m-mana"></i></div>
            </div>` : ''}
            ${who === 'tech' && game.level && !game.trial ? (() => {
              const prev = previewCoins(game.save, game.level.id);
              const bits = [
                prev.first ? `+${prev.first}` : '',
                prev.fast ? dict.fastExit : '',
              ].filter(Boolean).join(' · ');
              return `<div class="coin-chip" id="m-coins">${icon('star', 'xs')}<b>${bits || dict.coins}</b><small>${fmt(dict.replayCoins, { n: prev.replaysLeft })}</small></div>`;
            })() : ''}
            <div class="meter timer" id="m-timer">
              <span class="meter-icon" title="${dict.time}">${icon('timer')}</span>
              <span class="timer-val" id="m-time"></span>
            </div>
          </div>
        </div>
        ${doorBanner}
        ${game.trial ? `<div class="trial-banner" role="status">${dict.trialBanner}</div>` : ''}
        ${game.activeTip ? `<div class="tip-chip tip-under-meters" id="tip-chip">${icon(`kind_${game.activeTip}`, 'xs')}<span>${dict.tipChip}: ${getLang() === 'en' ? (INTROS[game.activeTip as IntroKind]?.tipEn ?? '') : (INTROS[game.activeTip as IntroKind]?.tipZh ?? '')}</span></div>` : ''}
      </div>
      <div class="drag-hint ${game.showFtueGhost ? 'ftue-ghost' : ''}" aria-hidden="true">
        ${game.showFtueGhost ? `<span class="ghost-hand"></span><span class="ghost-label">${dict.hintDrag}</span>` : icon('drag')}
      </div>
      <div class="hud-actions">
        <div class="ult-col">
          ${who === 'mage' ? mageActions(game, dict) : who === 'tech' ? techActions(game, dict) : `
          ${ult('str', dict.ultStr, s.ultStr)}
          ${ult('spd', dict.ultSpd, s.ultSpd)}
          ${ult('sta', dict.ultSta, s.ultSta)}
          ${mods.hasLeap ? act('leap', `${dict.skillNodeActive}: ${dict.skLeap}`, true, 'kind_squat') : ''}
          ${mods.hasSecondWind ? act('wind', `${dict.skillNodeActive}: ${dict.skSecondWind}`, true, 'sta') : ''}
          `}
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
      if (id === 'leap') game.tryLeap();
      if (id === 'wind') game.trySecondWind();
    });
  });
  const cast = (id: string | undefined) => {
    if (id) game.tryAbility(id);
  };
  hud.querySelectorAll('[data-spell]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cast((b as HTMLElement).dataset.spell);
    });
  });
  hud.querySelectorAll('[data-gadget], [data-cons]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const el = b as HTMLElement;
      cast(el.dataset.gadget || el.dataset.cons);
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
export function updatePlayHud(root: HTMLElement, game: Game): void {
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
  const mn = q('#m-mana');
  if (mn) {
    const mf = Math.round(game.manaFrac() * 100);
    mn.style.width = `${mf}%`;
    root.querySelector('.mana-meter')?.classList.toggle('low', mf < 25);
    root.querySelector('.mana-meter')?.classList.toggle('denied', (game.sim?.player.manaDeniedT ?? 0) > 0);
  }
  // Spell CD rings — button stays fully visible; pie only.
  root.querySelectorAll<HTMLElement>('[data-gadget]').forEach((b) => {
    const id = b.dataset.gadget!;
    const cd = game.sim?.player.spellCd[id] ?? 0;
    b.classList.toggle('cooling', cd > 0);
    b.style.setProperty('--cd', String(Math.min(1, cd / 12)));
  });
  const left = game.sim?.player.consumables ?? [];
  const seen: Record<string, number> = {};
  root.querySelectorAll<HTMLElement>('[data-cons]').forEach((b) => {
    const id = b.dataset.cons!;
    const n = seen[id] ?? 0;
    seen[id] = n + 1;
    const alive = n < left.filter((x) => x === id).length;
    b.classList.toggle('dim', !alive);
    b.toggleAttribute('disabled', !alive);
  });
  root.querySelectorAll<HTMLElement>('[data-spell]').forEach((b) => {
    const id = b.dataset.spell!;
    const cd = game.sim?.player.spellCd[id] ?? 0;
    b.classList.toggle('cooling', cd > 0);
    // Typical mage CD 2–6 s; map remaining onto a full pie.
    b.style.setProperty('--cd', String(Math.min(1, cd / 6)));
  });
  // 大聲公 noise zone: pulse the stamina bar + show the loudmouth chip.
  const noisy = game.noiseDrain() > 0;
  root.querySelector('.stam-meter')?.classList.toggle('noisy', noisy);
  root.querySelector('#m-noise')?.classList.toggle('on', noisy);
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
  root.querySelectorAll<HTMLElement>('[data-act-skill]').forEach((b) => {
    const id = b.dataset.actSkill as 'leap' | 'wind';
    const cd = game.activeCooldown(id);
    b.style.setProperty('--cd', cd.toFixed(3));
    b.classList.toggle('cooling', cd > 0);
  });
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

export function renderPause(game: Game): HTMLElement {
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

export function renderEnd(game: Game, win: boolean): HTMLElement {
  const dict = t();
  const lv = game.level;
  const hasNext = win && lv && lv.id !== 100;
  const p = el(`
    <div class="overlay" data-ui="1">
      <div class="panel end-panel ${win ? 'win' : 'lose'}">
        ${
          win
            ? `<div class="end-hero">${endPortrait(game)}<span class="burst" aria-hidden="true"></span></div>`
            : `<div class="end-icon lose-ico">${icon('door', 'xl')}<span class="x">${icon('close')}</span></div>`
        }
        <h2>${win ? dict.win : dict.lose}</h2>
        ${lv ? `<p class="end-station"><span class="lv-badge sm" style="--line:${lineColor(lv.stationEn)}">${lv.id}</span>${stationName(lv)}</p>` : ''}
        ${win ? endBonus(game) : `<p class="howto">${dict.loseHint}</p>`}
        ${game.save.character === 'tech' ? '' : loadoutStrip(game, { cls: 'on-end' })}
        ${
          hasNext
            ? `<button type="button" class="primary" id="btn-next">${icon('next', 'sm')}<span>${dict.next}</span></button>`
            : `<button type="button" class="primary" id="btn-retry">${icon('restart', 'sm')}<span>${dict.retry}</span></button>`
        }
        <div class="round-row">
          ${hasNext ? roundBtn('id="btn-retry"', 'restart', dict.retry) : ''}
          ${roundBtn('data-act="skills"', game.save.character === 'tech' ? 'shop' : 'skills', game.save.character === 'tech' ? dict.gear : dict.skills)}
          ${roundBtn('data-act="home"', 'home', dict.menu)}
        </div>
      </div>
    </div>
  `);
  wireLoadoutStrip(p, game);
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

function endPortrait(game: Game): string {
  const id = game.trial?.character ?? game.save.character;
  const url = charPortraitUrl(id);
  if (!url) return '';
  return `<img class="end-portrait who-${id}" src="${url}" width="112" height="112" alt="" />`;
}

function endBonus(game: Game): string {
  const dict = t();
  const c = game.lastClear;
  const star = icon('star', 'sm');
  if (game.save.character === 'tech') {
    return `<p class="bonus">${star}${fmt(dict.coinGain, { n: c?.coins ?? 0 })}</p>`;
  }
  if (!c || (c.awarded && c.count === 1)) return `<p class="bonus">${star}${fmt(dict.clearBonusN, { n: POINTS_PER_FIRST_CLEAR })}</p>`;
  if (c.awarded) return `<p class="bonus">${star}${fmt(dict.replayBonus, { n: c.count, max: MAX_POINTS_PER_LEVEL })}</p>`;
  return `<p class="howto">${dict.clearNoBonus}</p>`;
}

