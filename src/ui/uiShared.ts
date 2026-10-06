import { t, getLang } from '../i18n';
import type { Game } from '../game/Game';
import { playableLevels, type LevelDef } from '../game/levels';
import type { QualitySetting } from '../game/storage';
import type { PassengerKind } from '../game/PassengerTypes';
import { icon, langIcon } from './icons';

export function el(html: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as HTMLElement;
}

/** Absolute URL for a file in /public (resolves against the page URL — works under /exit-rush/). */
export const asset = (f: string): string => new URL(f, document.baseURI).href;

export type PortraitKind = 'hero' | PassengerKind;
export const PORTRAITS: PortraitKind[] = ['hero', 'normal', 'stench', 'family', 'brat', 'couple', 'angry', 'luggage', 'squat', 'loud'];

/** Character portrait cropped from the concept sheet (public/art/portraits.webp). */
export function portrait(kind: PortraitKind, cls = ''): string {
  if (kind === 'squat' || kind === 'loud') {
    return `<span class="portrait portrait-ico portrait-${kind} ${cls}" aria-hidden="true">${icon(`kind_${kind}`)}</span>`;
  }
  const sheet: PortraitKind[] = ['hero', 'normal', 'stench', 'family', 'brat', 'couple', 'angry', 'luggage'];
  const i = Math.max(0, sheet.indexOf(kind));
  return `<span class="portrait ${cls}" aria-hidden="true" style="background-image:url('${asset('art/portraits.webp')}');background-position:${(i / (sheet.length - 1)) * 100}% 0"></span>`;
}

export const backdrop = (): string => `<div class="backdrop" aria-hidden="true" style="background-image:url('${asset('art/key-art.webp')}')"></div>`;

/** Language toggle shows the language you'd switch TO. */
export const langBtn = (cls = 'icon-btn'): string => {
  const dict = t();
  return `<button type="button" class="${cls}" data-act="lang" title="${dict.language}" aria-label="${dict.language}">${langIcon(getLang() === 'en' ? '粵' : 'EN')}</button>`;
};

export const iconBtn = (act: string, name: string, label: string, extra = ''): string =>
  `<button type="button" class="icon-btn" data-act="${act}" title="${label}" aria-label="${label}" ${extra}>${icon(name)}</button>`;

export function screenBar(title: string, iconName: string, right = ''): string {
  const dict = t();
  return `
    <div class="top-bar" data-ui="1">
      ${iconBtn('menu-back', 'back', dict.back)}
      <div class="bar-title">${icon(iconName, 'sm')}<span>${title}</span></div>
      <div class="bar-right">${right}</div>
    </div>`;
}

export const pointsChip = (game: Game): string =>
  `<span class="chip points-chip" title="${t().skillPoints}" aria-label="${t().skillPoints}: ${game.save.skills.points}">${icon('star', 'sm')}<b>${game.save.skills.points}</b></span>`;

export const QUALITY_CYCLE: QualitySetting[] = ['auto', 'low', 'high'];

export function qualityLabel(game: Game): string {
  const dict = t();
  const name = (q: 'low' | 'high') => (q === 'low' ? dict.qualityLow : dict.qualityHigh);
  const setting = game.save.quality;
  return setting === 'auto' ? `${dict.qualityAuto} · ${name(game.quality)}` : name(setting);
}

export const stationName = (lv: Pick<LevelDef, 'stationEn' | 'stationZh'>): string =>
  getLang() === 'en' ? lv.stationEn : lv.stationZh;

export const stationAlt = (lv: Pick<LevelDef, 'stationEn' | 'stationZh'>): string =>
  getLang() === 'en' ? lv.stationZh : lv.stationEn;

export function nextLevel(game: Game): LevelDef {
  const list = playableLevels();
  return list.find((l) => !game.save.cleared.includes(l.id)) ?? list[list.length - 1];
}

/**
 * v0.7: skill loadout strip (配點1/2/3). Tap a slot to make it active — applies from the next run.
 * `edit` adds the 改技能 shortcut (data-act="skills"), `reset` the 重置配點 button (skill tree only).
 */
export function loadoutStrip(game: Game, opts: { edit?: boolean; reset?: boolean; cls?: string } = {}): string {
  const dict = t();
  const slots = game.save.loadouts
    .map((s, i) => {
      const on = i === game.save.activeLoadout;
      const sk = on ? game.save.skills : s;
      const name = dict.loadoutN.replace('{n}', String(i + 1));
      const u = (sk.ultStr ? 1 : 0) + (sk.ultSpd ? 1 : 0) + (sk.ultSta ? 1 : 0);
      return `<button type="button" class="lo-slot ${on ? 'on' : ''}" data-slot="${i}" aria-pressed="${on}" aria-label="${name}: ${dict.strength} ${sk.str}, ${dict.speed} ${sk.spd}, ${dict.staminaBranch} ${sk.sta}">
        <b>${name}</b><small>${sk.str}·${sk.spd}·${sk.sta}${u ? `<i class="lo-ult">${'★'.repeat(u)}</i>` : ''}</small>
      </button>`;
    })
    .join('');
  return `<div class="loadout-strip ${opts.cls ?? ''}" role="group" aria-label="${dict.loadoutLbl}">
    <span class="lo-lbl" aria-hidden="true">${icon('skills', 'xs')}</span>
    <div class="lo-slots">${slots}</div>
    ${opts.edit ? `<button type="button" class="lo-btn lo-edit" data-act="skills" title="${dict.editSkills}" aria-label="${dict.editSkills}">${icon('skills', 'xs')}<span>${dict.editSkills}</span></button>` : ''}
    ${opts.reset ? `<button type="button" class="lo-btn lo-reset" data-lo-reset="1" title="${dict.resetSkills}" aria-label="${dict.resetSkills}">${icon('restart', 'xs')}<span>${dict.resetSkills}</span></button>` : ''}
  </div>`;
}

/** Wire slot taps inside `scope` (rerender happens through Game hooks). */
export function wireLoadoutStrip(scope: ParentNode, game: Game): void {
  scope.querySelectorAll<HTMLElement>('.lo-slot[data-slot]').forEach((b) =>
    b.addEventListener('click', () => {
      game.audio.ui();
      game.setLoadout(Number(b.dataset.slot));
    }),
  );
}
