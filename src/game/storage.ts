import type { Lang } from '../i18n';

export interface SkillState {
  str: number; // 0–60 filled, then ultimate via flag
  spd: number;
  wis: number;
  ultStr: boolean;
  ultSpd: boolean;
  ultWis: boolean;
  points: number;
}

export interface SaveData {
  version: 1;
  lang: Lang;
  skills: SkillState;
  highestCleared: number;
  cleared: number[];
}

const KEY = 'hk-mtr-exit-rush-v1';

export function defaultSkills(): SkillState {
  return {
    str: 0,
    spd: 0,
    wis: 0,
    ultStr: false,
    ultSpd: false,
    ultWis: false,
    points: 0,
  };
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    lang: 'zh-HK',
    skills: defaultSkills(),
    highestCleared: 0,
    cleared: [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed?.version !== 1) return defaultSave();
    return {
      ...defaultSave(),
      ...parsed,
      skills: { ...defaultSkills(), ...parsed.skills },
    };
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}
