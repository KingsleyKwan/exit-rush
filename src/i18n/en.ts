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
  shove: string;
  stamina: string;
  time: string;
  level: string;
  density: string;
  howTo: string;
  language: string;
  clearBonus: string;
  /** Replay clear bonus; {n} = this level's clears, {max} = cap. */
  replayBonus: string;
  clearNoBonus: string;
  back: string;
  levelsTeaser: string;
  /** {fill} = points to fill a branch, {ult} = ultimate cost. */
  skillHowto: string;
  ultShort: string;
  skillsApplyNext: string;
  quality: string;
  qualityAuto: string;
  qualityLow: string;
  qualityHigh: string;
  qualityNote: string;
  saveFailed: string;
  autoPaused: string;
  secShort: string;
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
  // ---- v0.3 icon-first UI
  levelsTitle: string;
  legendTitle: string;
  you: string;
  passengerHint: {
    hero: string;
    normal: string;
    stench: string;
    family: string;
    brat: string;
    couple: string;
    angry: string;
    luggage: string;
  };
  typeIcons: string;
  on: string;
  off: string;
  hintDrag: string;
  hintShove: string;
  hintExit: string;
  finale: string;
  cleared: string;
  artCredit: string;
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
  shove: 'Hold to shove',
  stamina: 'Stamina',
  time: 'Time',
  level: 'Level',
  density: 'Crowd',
  howTo: 'Drag anywhere to steer · hold ✊ to shove · get out before the doors close.',
  language: 'Language',
  clearBonus: '+1 skill point',
  replayBonus: '+1 skill point (replay {n}/{max})',
  clearNoBonus: 'No more skill points from this level',
  back: 'Back',
  levelsTeaser: 'Levels 21–99 TBD · Lv100 is the finale',
  skillHowto: '{fill} points fill a branch · +{ult} for the Ultimate',
  ultShort: 'Ult',
  skillsApplyNext: 'Changes apply from your next run.',
  quality: 'Graphics',
  qualityAuto: 'Auto',
  qualityLow: 'Low',
  qualityHigh: 'High',
  qualityNote: 'Anti-aliasing changes apply after a reload.',
  saveFailed: "Can't save on this device — progress lasts until you close the game.",
  autoPaused: 'Paused while you were away.',
  secShort: 's',
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
  levelsTitle: 'Stations',
  legendTitle: 'Passengers',
  you: 'You',
  passengerHint: {
    hero: 'Follow the glow and get off!',
    normal: 'Eyes on the phone. Easy to nudge.',
    stench: 'The stink cloud slows you down.',
    family: 'Moves as a group. Hard to split.',
    brat: 'Small, bouncy, darts everywhere.',
    couple: 'Holding hands. Go around, not through.',
    angry: 'Winds up, then shoves hard.',
    luggage: 'That giant suitcase blocks the aisle.',
  },
  typeIcons: 'Type icons',
  on: 'On',
  off: 'Off',
  hintDrag: 'Drag',
  hintShove: 'Hold',
  hintExit: 'Get off',
  finale: 'Finale',
  cleared: 'Cleared',
  artCredit: 'Concept art generated with Grok Image.',
};
