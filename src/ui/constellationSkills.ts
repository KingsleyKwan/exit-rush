import { t, getLang, fmt } from '../i18n';
import type { Game } from '../game/Game';
import { icon } from './icons';
import {
  BRANCH_FILL,
  ULTIMATE_COST,
  ULT_DEFS,
  branchProgressLabel,
  canSpend,
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

const pointsChip = (game: Game): string =>
  `<span class="chip points-chip" title="${t().skillPoints}" aria-label="${t().skillPoints}: ${game.save.skills.points}">${icon('star', 'sm')}<b>${game.save.skills.points}</b></span>`;

export function renderSkills(game: Game, rerender: (game: Game) => void): HTMLElement {
  const dict = t();
  const s = game.save.skills;
  const overRun = game.skillsOverRun;
  const branchLabel = (b: Branch) => (b === 'str' ? dict.strength : b === 'spd' ? dict.speed : dict.staminaBranch);
  const branchIco = (b: Branch) => (b === 'sta' ? 'sta' : b);

  /** Portrait constellation arm: vertical stack, bilingual major labels always on. */
  const arm = (branch: Branch) => {
    const filled = s[branch];
    const nodes = nodesFor(branch);
    const ult = ultUnlocked(s, branch);
    const can = canSpend(s, branch);
    const ultNext = filled >= BRANCH_FILL && !ult;
    const ultDef = ULT_DEFS[branch];
    const nodeHtml = nodes
      .map((n, i) => {
        const on = nodeUnlocked(s, n);
        const tip = getLang() === 'en' ? n.tipEn : n.tipZh;
        const tbd = n.tbd ? ` · ${dict.tier3Tbd}` : '';
        const kind = n.kind === 'active' ? dict.skillNodeActive : dict.skillNodePassive;
        const title = `${n.nameEn} / ${n.nameZh} — ${tip}${tbd} (${kind})`;
        // Every ~10pt unlock is a major (Valhalla-style); keep early passives slightly compact via CSS.
        const major = true;
        const compact = n.kind === 'passive' && n.at < 30;
        return `<button type="button" class="cst-node major ${compact ? 'compact' : ''} ${on ? 'on' : ''} ${n.tbd ? 'tbd' : ''} t${n.tier}" style="--i:${i}" title="${title}" aria-label="${title}" data-node="${n.id}" data-tip="${tip.replace(/"/g, '&quot;')}" data-kind="${kind}" data-en="${n.nameEn}" data-zh="${n.nameZh}">
          <span class="cst-dot">${on ? icon(branchIco(branch), compact ? 'xs' : 'sm') : icon('lock', compact ? 'xs' : 'sm')}</span>
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
          <button type="button" class="spend-btn" data-spend="${branch}" aria-label="${dict.spend}: ${branchLabel(branch)}" title="${can ? dict.spend : filled >= BRANCH_FILL && ult ? dict.branchFull : dict.notEnough}" ${can ? '' : 'disabled'}>
            ${ultNext ? `${icon('star', 'xs')}${ULTIMATE_COST}` : `<span class="plus">＋</span>`}
          </button>
        </div>
        <div class="cst-arm-line" aria-hidden="true"></div>
        <div class="cst-nodes">${nodeHtml}
          <button type="button" class="cst-node major ult ${ult ? 'on' : ''}" title="${ultTitle}" aria-label="${ultTitle}" data-node="ult-${branch}" data-tip="${ultTip.replace(/"/g, '&quot;')}" data-kind="${dict.ultShort}" data-en="${ultDef.nameEn}" data-zh="${ultDef.nameZh}">
            <span class="cst-dot">${icon(ult ? 'star' : 'lock', 'sm')}</span>
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
        <p class="howto skill-howto">${fmt(dict.skillHowto, { fill: BRANCH_FILL, ult: ULTIMATE_COST })}</p>
        ${overRun ? `<p class="howto">${dict.skillsApplyNext}</p>` : ''}
        <div class="constellation" role="group" aria-label="${dict.skills}">
          <div class="cst-core" title="${dict.skillPoints}">${icon('skills')}<b>${s.points}</b></div>
          <div class="cst-detail" id="cst-detail" aria-live="polite">
            <div class="cst-detail-names"><b class="cst-detail-en"></b><span class="cst-detail-zh"></span></div>
            <p class="cst-detail-tip"></p>
            <span class="cst-detail-kind"></span>
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
  const detail = panel.querySelector('#cst-detail') as HTMLElement | null;
  const showDetail = (btn: HTMLElement) => {
    panel.querySelectorAll('.cst-node.selected').forEach((n) => n.classList.remove('selected'));
    btn.classList.add('selected');
    if (!detail) return;
    detail.classList.add('on');
    detail.querySelector('.cst-detail-en')!.textContent = btn.dataset.en ?? '';
    detail.querySelector('.cst-detail-zh')!.textContent = btn.dataset.zh ?? '';
    detail.querySelector('.cst-detail-tip')!.textContent = btn.dataset.tip ?? '';
    detail.querySelector('.cst-detail-kind')!.textContent = btn.dataset.kind ?? '';
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

