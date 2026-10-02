export interface Dict {
  title: string;
  titleCantonese: string;
  tagline: string;
  play: string;
  retry: string;
  next: string;
  menu: string;
  skills: string;
  pause: string;
  resume: string;
  win: string;
  lose: string;
  loseHint: string;
  skillPoints: string;
  strength: string;
  speed: string;
  wisdom: string;
  ultimate: string;
  locked: string;
  spend: string;
  notEnough: string;
  branchFull: string;
  ultStr: string;
  ultSpd: string;
  ultWis: string;
  door: string;
  stamina: string;
  time: string;
  level: string;
  density: string;
  howTo: string;
  language: string;
  clearBonus: string;
  passenger: {
    normal: string;
    stench: string;
    family: string;
    brat: string;
    couple: string;
    angry: string;
    luggage: string;
  };
  sfxNote: string;
}

export const en: Dict = {
  title: 'Exit Rush',
  titleCantonese: '逼落車',
  tagline: 'Get off before they force on.',
  play: 'Play',
  retry: 'Retry',
  next: 'Next',
  menu: 'Menu',
  skills: 'Skills',
  pause: 'Pause',
  resume: 'Resume',
  win: 'You made it out!',
  lose: 'Doors closed!',
  loseHint: 'Try a different path — or invest in Strength.',
  skillPoints: 'Skill points',
  strength: 'Strength',
  speed: 'Speed',
  wisdom: 'Wisdom',
  ultimate: 'Ultimate',
  locked: 'Locked',
  spend: 'Spend',
  notEnough: 'Need more points',
  branchFull: 'Branch filled',
  ultStr: 'Iron Bull Charge',
  ultSpd: 'Slip-Off Dash',
  ultWis: 'Crowd Sense',
  door: 'Door',
  stamina: 'Stamina',
  time: 'Time',
  level: 'Level',
  density: 'Crowd',
  howTo: 'Swipe toward the door. Push through. Exit before doors close.',
  language: 'Language',
  clearBonus: '+1 skill point',
  passenger: {
    normal: 'Commuter',
    stench: 'Stench',
    family: 'Family',
    brat: 'Brat',
    couple: 'Couple',
    angry: 'Angry man',
    luggage: 'Luggage',
  },
  sfxNote: 'SFX are placeholders (not official MTR audio).',
};
