import { barAfterLearn, canLearn, learnSpell, lineElements, spellById, type SpellLine } from '../game/SpellTree';
import { spentOf } from '../game/storage';
import { t, getLang, fmt } from '../i18n';
import type { Game } from '../game/Game';
import { icon } from './icons';
import { loadoutStrip, wireLoadoutStrip } from './uiShared';
import { spentPoints } from '../game/SkillTree';
import {
  BRANCH_FILL,
  ULT_DEFS,
  branchProgressLabel,
  canSpend,
  nextNodeAt,
  nodesFor,
  nodeUnlocked,
  spendPoint,
  ultUnlocked,
  type Branch,
} from '../game/SkillTree';

function el(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as HTMLElement;
}

const iconBtn = (act: string, name: string, label: string, extra = ''): string =>
  `<button type="button" class="icon-btn" data-act="${act}" title="${label}" aria-label="${label}" ${extra}>${icon(name)}</button>`;

function screenBar(title: string, iconName: string, right = ''): string {
  const dict = t();
  return `
    <div class="top-bar" data-ui="1">
      ${iconBtn('menu-back', 'back', dict.back)}
      <div class="bar-title">${icon(iconName, 'sm')}<span>${title}</span></div>
      <div class="bar-right">${right}</div>
    </div>`;
}

/** One glyph per hero node. 凱婷's book draws school icons itself. */
const NODE_ICON: Record<string, string> = {
  str_t1: 'str', str_t2a: 'shove', str_t2b: 'sk_charge', str_t3a: 'sk_split', str_t3b: 'sk_pound', str_t3c: 'sk_firm',
  spd_t1: 'spd', spd_t2a: 'sk_lane', spd_t2b: 'sk_squeeze', spd_t3a: 'sk_hurdle', spd_t3b: 'sk_leap', spd_t3c: 'sk_thread',
  sta_t1: 'stamina', sta_t2a: 'sk_regen', sta_t2b: 'sk_tank', sta_t3a: 'sk_breath', sta_t3b: 'sk_revive', sta_t3c: 'sk_calm',
};
const HERO_ULT_ICON: Record<string, string> = { str: 'sk_bull', spd: 'sk_dash', sta: 'sk_stance' };
function skillIcon(id: string): string {
  if (id.startsWith('ult-')) return HERO_ULT_ICON[id.slice(4)] ?? 'star';
  return NODE_ICON[id] ?? 'star';
}

const pointsChip = (game: Game): string => {
  const pts = game.save.character === 'mage'
    ? (game.save.mage.loadouts[game.save.mage.active]?.points ?? 0)
    : game.save.skills.points;
  return `<span class="chip points-chip" title="${t().skillPoints}" aria-label="${t().skillPoints}: ${pts}">${icon('star', 'sm')}<b>${pts}</b></span>`;
};

const LINE_ICON: Record<SpellLine, string> = {
  w: 'wind', i: 'ice', g: 'grav', iw: 'sp_iw', ig: 'sp_ig', wg: 'sp_wg',
};

/** Clockwise degrees from 12. Ice 10 o'clock, wind 2, gravity 6. Mixes sit between. */
const RAY_ANGLE: Record<SpellLine, number> = {
  iw: 0, w: 60, wg: 120, g: 180, ig: 240, i: 300,
};
/** Clock order, so the eye reads ice → the mix → wind. */
const RAY_ORDER: readonly SpellLine[] = ['iw', 'w', 'wg', 'g', 'ig', 'i'];
/** Same four orbits on every ray. Rank 1 is the inner ring. */
const RAY_R = [13, 22, 31, 40];

function lineLabel(dict: ReturnType<typeof t>, line: SpellLine): string {
  if (line === 'w') return dict.wind;
  if (line === 'i') return dict.ice;
  if (line === 'g') return dict.grav;
  const parts = lineElements(line).map((el) => (el === 'w' ? dict.wind : el === 'i' ? dict.ice : dict.grav));
  return `${parts[0]}<br>+${parts[1]}`;
}

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: 50 + Math.sin(a) * radius, y: 50 - Math.cos(a) * radius };
}



const SCHOOL_INK = { w: '#26a69a', i: '#1e88e5', g: '#fb8c00' } as const;

/** A stroke is a requirement. Three spokes leave the hub. Mixes bridge the same rank, and the mix itself runs from rank 1 to rank 4. */
function raySvg(): string {
  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }, color: string, width: number) =>
    `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  const parts: string[] = [];
  const grads: string[] = [];
  for (const school of ['i', 'w', 'g'] as const) {
    let prev = polar(RAY_ANGLE[school], 7.2);
    for (const r of RAY_R) {
      const at = polar(RAY_ANGLE[school], r);
      parts.push(stroke(prev, at, SCHOOL_INK[school], 1.6));
      prev = at;
    }
  }
  const bridges: ReadonlyArray<readonly ['iw' | 'wg' | 'ig', 'i' | 'w' | 'g', 'i' | 'w' | 'g']> = [
    ['iw', 'i', 'w'],
    ['wg', 'w', 'g'],
    ['ig', 'i', 'g'],
  ];
  for (const [mix, a, b] of bridges) {
    for (let rank = 0; rank < 3; rank++) {
      const mid = polar(RAY_ANGLE[mix], RAY_R[rank]);
      parts.push(stroke(polar(RAY_ANGLE[a], RAY_R[rank]), mid, SCHOOL_INK[a], 1.45));
      parts.push(stroke(polar(RAY_ANGLE[b], RAY_R[rank]), mid, SCHOOL_INK[b], 1.45));
    }
    const inner = polar(RAY_ANGLE[mix], RAY_R[0]);
    const outer = polar(RAY_ANGLE[mix], RAY_R[3]);
    grads.push(`<linearGradient id="mix-${mix}" gradientUnits="userSpaceOnUse" x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}"><stop offset="0" stop-color="${SCHOOL_INK[a]}"/><stop offset="1" stop-color="${SCHOOL_INK[b]}"/></linearGradient>`);
    parts.push(stroke(inner, outer, `url(#mix-${mix})`, 1.7));
  }
  return `<svg class="spell-spokes" viewBox="0 0 100 100" aria-hidden="true"><defs>${grads.join('')}</defs>${parts.join('')}</svg>`;
}

/** The node the player was reading, kept across a learn so the text stays put. */
let mageFocus = '';

/** Wheel. Three lines leave the start. A line is who you must learn first. */
function renderMageBook(game: Game, rerender: (game: Game) => void): HTMLElement {
  const dict = t();
  const en = getLang() === 'en';
  const active = game.save.mage.active;
  const s = game.save.mage.loadouts[active] ?? game.save.mage.loadouts[0];
  const known = new Set(s.known ?? []);
  const overRun = game.skillsOverRun;

  const nodeBtn = (id: string) => {
    const n = spellById(id)!;
    const on = known.has(id);
    const ready = canLearn(s, id);
    const missing = n.requires.filter((req) => !known.has(req));
    let why = '';
    if (!on && missing.length === 1) {
      const req = spellById(missing[0]);
      if (req) why = fmt(dict.spellNeed, { name: en ? req.nameEn : req.nameZh });
    } else if (!on && missing.length === 2) {
      const a = spellById(missing[0]);
      const b = spellById(missing[1]);
      if (a && b) why = fmt(dict.spellNeedTwo, { a: en ? a.nameEn : a.nameZh, b: en ? b.nameEn : b.nameZh });
    } else if (!on && missing.length >= 3) {
      const names = missing.slice(0, 3).map((req) => {
        const n = spellById(req);
        return n ? (en ? n.nameEn : n.nameZh) : '';
      });
      if (names[0] && names[1] && names[2]) why = fmt(dict.spellNeedThree, { a: names[0], b: names[1], c: names[2] });
    }
    const tip = en ? n.tipEn : n.tipZh;
    const kind = n.rank === 4 ? dict.spellLast : dict.skillNodeActive;
    const title = `${n.nameEn} / ${n.nameZh} — ${tip}${why ? ` (${why})` : ''}`;
    const mix = n.line.length > 1;
    const at = polar(RAY_ANGLE[n.line], RAY_R[n.rank - 1]);
    const glyphs = icon(LINE_ICON[n.line]);
    return `<button type="button" class="spell-node line-${n.line} ${mix ? 'mix' : ''} ${on ? 'on' : ''} ${ready ? 'ready' : ''} ${n.rank === 4 ? 'cap' : ''} ${!on && !ready ? 'locked' : ''}" data-spell="${id}" data-line="${n.line}" style="left:${at.x.toFixed(2)}%;top:${at.y.toFixed(2)}%" data-tip="${tip.replace(/"/g, '&quot;')}" data-why="${why.replace(/"/g, '&quot;')}" data-kind="${kind}" data-en="${n.nameEn}" data-zh="${n.nameZh}" title="${title.replace(/"/g, '&quot;')}" aria-label="${title.replace(/"/g, '&quot;')}">
      <span class="spell-dot">${glyphs}${n.rank === 4 ? '<i class="spell-star">★</i>' : ''}</span>
    </button>`;
  };

  const rayLabel = (line: SpellLine) => {
    const at = polar(RAY_ANGLE[line], 47.8);
    const name = lineLabel(dict, line);
    return `<span class="spell-ray-label line-${line}" style="left:${at.x.toFixed(2)}%;top:${at.y.toFixed(2)}%">${name}</span>`;
  };

  const panel = el(`
    <div class="${overRun ? 'panel skills-panel' : 'sub-screen skills-screen'}" data-ui="1">
      ${overRun ? `<h2 class="panel-title">${icon('skills', 'sm')}${dict.spells}</h2>` : screenBar(dict.spells, 'skills', pointsChip(game))}
      <div class="${overRun ? 'skills-body' : 'sub-body skills-body'}">
        ${overRun ? `<p class="points">${pointsChip(game)}</p>` : ''}
        <p class="howto skill-howto">${dict.spellHowto}</p>
        ${loadoutStrip(game, { reset: true, cls: 'in-tree' })}
        ${overRun ? `<p class="howto">${dict.skillsApplyNext}</p>` : ''}
        <div class="spell-wheel" role="group" aria-label="${dict.spells}">
          ${raySvg()}
          <div class="spell-hub">${dict.spellMixNeed}</div>
          ${RAY_ORDER.map((line) => [1, 2, 3, 4].map((rank) => nodeBtn(`${line}${rank}`)).join('')).join('')}
          ${RAY_ORDER.map((line) => rayLabel(line)).join('')}
        </div>
        <div class="cst-detail spell-detail" id="cst-detail" aria-live="polite">
          <div class="cst-detail-names"><span class="cst-detail-ico"></span><b class="cst-detail-en"></b><span class="cst-detail-zh"></span></div>
          <p class="cst-detail-tip"></p>
          <div class="cst-detail-foot"><span class="cst-detail-kind"></span><span class="cst-detail-why"></span></div>
          <button type="button" class="spell-learn" id="spell-learn"></button>
        </div>
        ${overRun ? `<button type="button" class="primary" id="btn-back">${icon('back', 'sm')}<span>${dict.back}</span></button>` : ''}
      </div>
    </div>
  `);

  const detail = panel.querySelector('#cst-detail') as HTMLElement | null;
  const showDetail = (btn: HTMLElement) => {
    panel.querySelectorAll('.spell-node.selected').forEach((n) => n.classList.remove('selected'));
    btn.classList.add('selected');
    if (!detail) return;
    detail.classList.add('on');
    const glyph = btn.querySelector('.spell-pair') ?? btn.querySelector('.spell-dot .ico');
    const slot = detail.querySelector('.cst-detail-ico');
    if (slot) slot.innerHTML = glyph ? glyph.outerHTML : '';
    detail.querySelector('.cst-detail-en')!.textContent = btn.dataset.en ?? '';
    detail.querySelector('.cst-detail-zh')!.textContent = btn.dataset.zh ?? '';
    detail.querySelector('.cst-detail-tip')!.textContent = btn.dataset.tip ?? '';
    detail.querySelector('.cst-detail-kind')!.textContent = btn.dataset.kind ?? '';
    const why = detail.querySelector('.cst-detail-why') as HTMLElement;
    why.textContent = btn.dataset.why ?? '';
    const learn = detail.querySelector('#spell-learn') as HTMLButtonElement | null;
    if (learn) {
      const id = btn.dataset.spell ?? '';
      const on = btn.classList.contains('on');
      learn.dataset.spell = id;
      learn.disabled = !btn.classList.contains('ready');
      learn.textContent = on ? dict.spellLearned : dict.spellLearn;
    }
  };

  panel.querySelector('#spell-learn')?.addEventListener('click', () => {
    const id = (panel.querySelector('#spell-learn') as HTMLElement | null)?.dataset.spell ?? '';
    const next = learnSpell(s, id);
    if (!next) return;
    mageFocus = id;
    game.save.mage.loadouts[active] = next;
    game.save.mage.spellBars[active] = barAfterLearn(next, game.save.mage.spellBars[active] ?? []);
    game.persist();
    game.audio.ui();
    rerender(game);
  });

  panel.querySelectorAll<HTMLElement>('.spell-node[data-spell]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mageFocus = btn.dataset.spell ?? '';
      showDetail(btn);
      game.audio.ui();
    });
  });

  wireLoadoutStrip(panel, game);
  panel.querySelector('[data-lo-reset]')?.addEventListener('click', () => {
    game.audio.ui();
    const spent = spentOf(s);
    const slot = fmt(dict.loadoutN, { n: active + 1 });
    const veil = el(`
      <div class="confirm-veil" role="dialog" aria-modal="true" aria-labelledby="cf-title">
        <div class="confirm-card">
          <div class="confirm-ico">${icon('restart')}</div>
          <h3 id="cf-title">${dict.resetTitle}</h3>
          <p>${fmt(dict.resetBody, { n: spent, slot })}</p>
          <div class="confirm-row">
            <button type="button" class="ghost" data-cf="no">${icon('close', 'xs')}<span>${dict.cancel}</span></button>
            <button type="button" class="primary" data-cf="yes" ${spent ? '' : 'disabled'}>${icon('restart', 'xs')}<span>${dict.resetYes}</span></button>
          </div>
        </div>
      </div>`);
    const close = () => veil.remove();
    veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
    veil.querySelector('[data-cf="no"]')!.addEventListener('click', () => { game.audio.ui(); close(); });
    veil.querySelector('[data-cf="yes"]')!.addEventListener('click', () => { close(); game.resetSkills(); });
    panel.appendChild(veil);
    (veil.querySelector('[data-cf="no"]') as HTMLElement).focus();
  });

  const prefer = (mageFocus ? panel.querySelector<HTMLElement>(`.spell-node[data-spell="${mageFocus}"]`) : null)
    ?? panel.querySelector<HTMLElement>('.spell-node.ready')
    ?? panel.querySelector<HTMLElement>('.spell-node.on')
    ?? panel.querySelector<HTMLElement>('.spell-node');
  if (prefer) showDetail(prefer);
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

export function renderSkills(game: Game, rerender: (game: Game) => void): HTMLElement {
  if (game.save.character === 'mage') return renderMageBook(game, rerender);
  const dict = t();
  const s = game.save.skills;
  const overRun = game.skillsOverRun;
  const branchLabel = (b: Branch) => (b === 'str' ? dict.strength : b === 'spd' ? dict.speed : dict.staminaBranch);
  const branchIco = (b: Branch) => (b === 'sta' ? 'sta' : b);
  const ultDefs = ULT_DEFS;

  /** Portrait constellation arm: vertical stack, bilingual major labels always on. */
  const arm = (branch: Branch) => {
    const filled = s[branch];
    const nodes = nodesFor(branch);
    const ult = ultUnlocked(s, branch);
    const can = canSpend(s, branch);
    const ultNext = filled >= BRANCH_FILL && !ult;
    const ultDef = ultDefs[branch];
    const nextAt = nextNodeAt(filled);
    const nextNode = nodes.find((n) => n.at === nextAt);
    const nextName = ultNext
      ? (getLang() === 'en' ? ultDef.nameEn : ultDef.nameZh)
      : nextNode
        ? (getLang() === 'en' ? nextNode.nameEn : nextNode.nameZh)
        : '';
    const nodeHtml = nodes
      .map((n, i) => {
        const on = nodeUnlocked(s, n);
        const upcoming = !on && n.at === nextAt;
        const tip = getLang() === 'en' ? n.tipEn : n.tipZh;
        const counters = n.counters ?? [];
        const ctrNames = counters.map((k) => dict.passenger[k]).join(' · ');
        const kind = n.kind === 'active' ? dict.skillNodeActive : dict.skillNodePassive;
        const title = `${n.nameEn} / ${n.nameZh} — ${tip} (${kind})`;
        // Every ~10pt unlock is a major (Valhalla-style); keep early passives slightly compact via CSS.
        const major = true;
        const compact = n.kind === 'passive' && n.at < 30;
        return `<button type="button" class="cst-node major ${compact ? 'compact' : ''} ${on ? 'on' : ''} ${upcoming ? 'next' : ''} ${counters.length ? 'counter' : ''} t${n.tier}" style="--i:${i}" title="${title}" aria-label="${title}" data-node="${n.id}" data-tip="${tip.replace(/"/g, '&quot;')}" data-kind="${kind}" data-en="${n.nameEn}" data-zh="${n.nameZh}" data-counters="${counters.join(',')}" data-ctr-names="${ctrNames}">
          <span class="cst-dot">${icon(skillIcon(n.id))}${counters.length ? `<span class="cst-ctr" aria-hidden="true">${icon(`kind_${counters[0]}`, 'xs')}</span>` : ''}</span>
          <span class="cst-label">
            <span class="cst-en">${n.nameEn}</span>
            <span class="cst-zh">${n.nameZh}</span>
          </span>
        </button>`;
      })
      .join('');
    const ultTip = getLang() === 'en' ? ultDef.tipEn : ultDef.tipZh;
    const ultTitle = `${ultDef.nameEn} / ${ultDef.nameZh} — ${ultTip}`;
    return `
      <div class="cst-arm b-${branch}" data-branch="${branch}">
        <div class="cst-arm-head">
          <span class="skill-ico">${icon(branchIco(branch))}</span>
          <strong>${branchLabel(branch)}</strong>
          <div class="skill-prog">${branchProgressLabel(s, branch, dict.ultShort)}</div>
          <button type="button" class="spend-btn" data-spend="${branch}" aria-label="${dict.spend}: ${nextName || branchLabel(branch)}" title="${can ? `${dict.spend}: ${nextName}` : filled >= BRANCH_FILL && ult ? dict.branchFull : dict.notEnough}" ${can ? '' : 'disabled'}>
            ${nextName ? `<span class="learn-lbl">1 · ${nextName}</span>` : `<span class="plus">${dict.branchFull}</span>`}
          </button>
        </div>
        <div class="cst-arm-line" aria-hidden="true"></div>
        <div class="cst-nodes">${nodeHtml}
          <button type="button" class="cst-node major ult ${ult ? 'on' : ''} ${ultNext ? 'next' : ''}" title="${ultTitle}" aria-label="${ultTitle}" data-node="ult-${branch}" data-tip="${ultTip.replace(/"/g, '&quot;')}" data-kind="${dict.ultShort}" data-en="${ultDef.nameEn}" data-zh="${ultDef.nameZh}">
            <span class="cst-dot">${icon(skillIcon(`ult-${branch}`))}</span>
            <span class="cst-label">
              <span class="cst-en">${ultDef.nameEn}</span>
              <span class="cst-zh">${ultDef.nameZh}</span>
            </span>
          </button>
        </div>
      </div>
    `;
  };

  const panel = el(`
    <div class="${overRun ? 'panel skills-panel' : 'sub-screen skills-screen'}" data-ui="1">
      ${overRun ? `<h2 class="panel-title">${icon('skills', 'sm')}${dict.skills}</h2>` : screenBar(dict.skills, 'skills', pointsChip(game))}
      <div class="${overRun ? 'skills-body' : 'sub-body skills-body'}">
        ${overRun ? `<p class="points">${pointsChip(game)}</p>` : ''}
        <p class="howto skill-howto">${dict.skillHowto}</p>
        ${loadoutStrip(game, { reset: true, cls: 'in-tree' })}
        ${overRun ? `<p class="howto">${dict.skillsApplyNext}</p>` : ''}
        <div class="constellation hero" role="group" aria-label="${dict.skills}">
          <div class="cst-core" title="${dict.skillPoints}">${icon('skills')}<b>${s.points}</b></div>
          <div class="cst-detail" id="cst-detail" aria-live="polite">
            <div class="cst-detail-names"><span class="cst-detail-ico"></span><b class="cst-detail-en"></b><span class="cst-detail-zh"></span></div>
            <p class="cst-detail-tip"></p>
            <div class="cst-detail-foot"><span class="cst-detail-kind"></span><span class="cst-detail-ctr"></span></div>
          </div>
          <div class="cst-arms">
            ${arm('str')}
            ${arm('spd')}
            ${arm('sta')}
          </div>
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
  // v0.7 respec + loadouts.
  wireLoadoutStrip(panel, game);
  panel.querySelector('[data-lo-reset]')?.addEventListener('click', () => {
    game.audio.ui();
    const spent = spentPoints(game.save.skills);
    const slot = fmt(dict.loadoutN, { n: game.save.activeLoadout + 1 });
    const veil = el(`
      <div class="confirm-veil" role="dialog" aria-modal="true" aria-labelledby="cf-title">
        <div class="confirm-card">
          <div class="confirm-ico">${icon('restart')}</div>
          <h3 id="cf-title">${dict.resetTitle}</h3>
          <p>${fmt(dict.resetBody, { n: spent, slot })}</p>
          <div class="confirm-row">
            <button type="button" class="ghost" data-cf="no">${icon('close', 'xs')}<span>${dict.cancel}</span></button>
            <button type="button" class="primary" data-cf="yes" ${spent ? '' : 'disabled'}>${icon('restart', 'xs')}<span>${dict.resetYes}</span></button>
          </div>
        </div>
      </div>`);
    const close = () => veil.remove();
    veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
    veil.querySelector('[data-cf="no"]')!.addEventListener('click', () => { game.audio.ui(); close(); });
    veil.querySelector('[data-cf="yes"]')!.addEventListener('click', () => { close(); game.resetSkills(); });
    panel.appendChild(veil);
    (veil.querySelector('[data-cf="no"]') as HTMLElement).focus();
  });
  const detail = panel.querySelector('#cst-detail') as HTMLElement | null;
  const showDetail = (btn: HTMLElement) => {
    panel.querySelectorAll('.cst-node.selected').forEach((n) => n.classList.remove('selected'));
    btn.classList.add('selected');
    if (!detail) return;
    detail.classList.add('on');
    const glyph = btn.querySelector('.cst-dot > .ico');
    const slot = detail.querySelector('.cst-detail-ico');
    if (slot) slot.innerHTML = glyph ? glyph.outerHTML : '';
    detail.querySelector('.cst-detail-en')!.textContent = btn.dataset.en ?? '';
    detail.querySelector('.cst-detail-zh')!.textContent = btn.dataset.zh ?? '';
    detail.querySelector('.cst-detail-tip')!.textContent = btn.dataset.tip ?? '';
    detail.querySelector('.cst-detail-kind')!.textContent = btn.dataset.kind ?? '';
    const ctr = detail.querySelector('.cst-detail-ctr') as HTMLElement;
    const kinds = (btn.dataset.counters ?? '').split(',').filter(Boolean);
    ctr.innerHTML = kinds.length
      ? `<span class="ctr-lbl">${dict.skCounters}</span>${kinds.map((k) => `<span class="ctr-kind">${icon(`kind_${k}`, 'xs')}<span>${dict.passenger[k as keyof typeof dict.passenger]}</span></span>`).join('')}`
      : '';
    ctr.style.display = kinds.length ? '' : 'none';
  };
  panel.querySelectorAll('.cst-node[data-node]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showDetail(btn as HTMLElement);
      game.audio.ui();
    });
  });
  // Default-select an unlocked major so EN+粵+tip are readable immediately.
  const prefer =
    panel.querySelector<HTMLElement>('.cst-node.on.major:not(.compact)') ??
    panel.querySelector<HTMLElement>('.cst-node.on') ??
    panel.querySelector<HTMLElement>('.cst-node');
  if (prefer) showDetail(prefer);
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

