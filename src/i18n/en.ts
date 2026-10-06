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
  wisdom: string; // legacy alias
  staminaBranch: string;
  ultimate: string;
  locked: string;
  spend: string;
  notEnough: string;
  branchFull: string;
  ultStr: string;
  ultSpd: string;
  ultWis: string; // legacy
  ultSta: string;
  skCounters: string;
  skLeap: string;
  skSecondWind: string;
  skillNodePassive: string;
  skillNodeActive: string;
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
    squat: string;
  };
  sfxNote: string;
  mute: string;
  unmute: string;
  sound: string;
  volMaster: string;
  volMusic: string;
  volSfx: string;
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
    squat: string;
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
  // v0.5
  finaleLocked: string;
  introTap: string;
  introTitle: string;
  tipChip: string;
  reviewIntro: string;
  clearBonusN: string;
  levelsTeaserV05: string;
  doorClosedToast: string;
  doorBanner: string;
  doorBannerZh: string;
  doorBannerEn: string;
  doorBannerEnOne: string;
  doorOpenIcon: string;
  doorClosedIcon: string;
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
  wisdom: 'Stamina',
  staminaBranch: 'Stamina',
  ultimate: 'Ultimate',
  locked: 'Locked',
  spend: 'Spend',
  notEnough: 'Need more points',
  branchFull: 'Branch filled',
  ultStr: 'Iron Bull Charge',
  ultSpd: 'Slip-Off Dash',
  ultWis: 'Iron Stance',
  ultSta: 'Iron Stance',
  skCounters: 'Counters',
  skLeap: 'Leap',
  skSecondWind: 'Second Wind',
  skillNodePassive: 'Passive',
  skillNodeActive: 'Active',
  door: 'Door',
  shove: 'Hold to shove',
  stamina: 'Stamina',
  time: 'Time',
  level: 'Level',
  density: 'Crowd',
  howTo: 'Drag anywhere to steer · hold ✊ to shove · get out before the doors close.',
  language: 'Language',
  clearBonus: '+3 skill points',
  replayBonus: '+{n} skill points (replay {n}/{max})',
  clearNoBonus: 'No more skill points from this level — first clear only',
  back: 'Back',
  levelsTeaser: 'Levels 1–30 playable · clear 30 to unlock Lv100',
  skillHowto: 'Constellation: spend into a branch · major skills every ~10 · +{ult} for the Ultimate after {fill}',
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
    squat: 'Squatter',
  },
  sfxNote: 'All sounds are original. Fiction: 香城鐵路 / Hong City Rail — not affiliated with any real railway.',
  mute: 'Mute',
  unmute: 'Unmute',
  sound: 'Sound',
  volMaster: 'Master',
  volMusic: 'Music',
  volSfx: 'SFX',
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
    squat: 'Crouched low — shove barely works; weave wide.',
  },
  typeIcons: 'Type icons',
  on: 'On',
  off: 'Off',
  hintDrag: 'Drag',
  hintShove: 'Hold',
  hintExit: 'Get off',
  finale: 'Finale',
  cleared: 'Cleared',
  artCredit: 'Concept art: Grok Image. 香城鐵路 is fiction — inspired by HK metro, not affiliated.',
  finaleLocked: 'Clear level 30 to unlock the fireworks finale.',
  introTap: 'Tap to start',
  introTitle: 'New passenger',
  tipChip: 'Tip',
  reviewIntro: 'How they block you',
  clearBonusN: '+{n} skill points',
  levelsTeaserV05: 'Short exits · learn one special every few levels',
  doorClosedToast: "This door won't open!",
  doorBanner: 'Only {n} doors open',
  doorBannerZh: '只開{n}道門',
  doorBannerEn: 'Only {n} doors open',
  doorBannerEnOne: 'Only 1 door open',
  doorOpenIcon: 'Open',
  doorClosedIcon: 'Closed',
};

