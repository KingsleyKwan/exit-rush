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
  /** 大聲公 HUD chip while the noise zone drains you. */
  loudHud: string;
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
  howToMage: string;
  howToTech: string;
  language: string;
  clearBonus: string;
  /** Replay clear bonus; {n} = this level's clears, {max} = cap. */
  replayBonus: string;
  clearNoBonus: string;
  /** {n} clears until the next skill point. */
  nextSkillPoint: string;
  back: string;
  levelsTeaser: string;
  /** How skill points are earned and spent. No placeholders. */
  skillHowto: string;
  /** Mage book only. Centre is the start. Farther out is stronger. */
  spellHowto: string;
  /** {name} = the skill that has to come first. */
  spellNeed: string;
  /** {a} and {b} = the two starts a mix needs. */
  spellNeedTwo: string;
  /** Word in the centre of the mage wheel. */
  spellMixNeed: string;
  /** Rank 4 of a line. Not a separate ultimate button. */
  spellLast: string;
  spellOneEnd: string;
  ultShort: string;
  skillsApplyNext: string;
  examTag: string;
  /** v0.7 bosses */
  bossTag: string;
  bossKicker: string;
  bossSkip: string;
  bossCounter: string;
  bossYield: string;
  bossAllZh: string;
  bossAllEn: string;
  bossAllTagline: string;
  bossBarHint: string;
  loadoutN: string;
  loadoutLbl: string;
  resetSkills: string;
  resetTitle: string;
  resetBody: string;
  resetYes: string;
  cancel: string;
  editSkills: string;
  respecNotice: string;
  progressSplitNotice: string;
  charCleared: string;
  charProgressOf: string;
  loadoutNext: string;
  spLeft: string;
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
    loud: string;
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
    loud: string;
  };
  typeIcons: string;
  on: string;
  off: string;
  hintDrag: string;
  hintShove: string;
  hintCast: string;
  hintGear: string;
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
  /** Spoken once in the last few seconds, while the doors are about to close. */
  doorMind: string;
  /** Spoken once before the doors open. `{station}` is the parody name. */
  stationCall: string;
  doorBanner: string;
  doorBannerZh: string;
  doorBannerEn: string;
  doorBannerEnOne: string;
  doorOpenIcon: string;
  doorClosedIcon: string;
  charTitle: string;
  charSelect: string;
  charSelected: string;
  charBuy: string;
  charTry: string;
  charRestore: string;
  charNote: string;
  charIapStub: string;
  charIapOk: string;
  charIapCancelled: string;
  charIapPending: string;
  charIapError: string;
  charIapUnavailable: string;
  charRestoreDone: string;
  charRestoreEmpty: string;
  charBundle: string;
  charTryStub: string;
  manaEmpty: string;
  mana: string;
  spells: string;
  fire: string;
  ice: string;
  volt: string;
  wind: string;
  grav: string;
  chars: string;
  charSwitch: string;
  charPickTitle: string;
  comingSoon: string;
  youOffice: string;
  gear: string;
  workshop: string;
  tabEquip: string;
  tabShop: string;
  tabSets: string;
  coins: string;
  coinGain: string;
  cells: string;
  tierCheap: string;
  tierMid: string;
  tierLux: string;
  buyItem: string;
  upgradeItem: string;
  sellItem: string;
  expandBag: string;
  autoPack: string;
  recommendKit: string;
  removeItem: string;
  rotateItem: string;
  placeHint: string;
  coinNotice: string;
  coinPreview: string;
  replayCoins: string;
  fastExit: string;
  charNoteIos: string;
  trialBanner: string;
  noRoom: string;
  /** A tier's shape cannot be placed in the 6-cell bag. */
  wontFit: string;
  ownedTier: string;
  /** Standing workshop rule: one of each worn slot, and upgrades grow. */
  oneEach: string;
  /** The backpack never grows into a kit that covers every stage. */
  bagLimit: string;
  /** {n} = cells this piece covers. */
  placeSize: string;
  /** {slot} = shoes / gloves / head / core. */
  whyBody: string;
  whyOnce: string;
  whyActive: string;
  whyCons: string;
  whyStock: string;
  slotShoes: string;
  slotGloves: string;
  slotHead: string;
  slotCore: string;
  /** Gear L shop: upgrades spend coins, not skill points. */
  coinShop: string;
  /** {n} = cleared level required before this tier. */
  needLevel: string;
  needCoins: string;
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
  loudHud: 'Noise!',
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
  howToMage: 'Drag anywhere to steer. Wind blows people aside. Cold and weight mix only after that mix is learned.',
  howToTech: 'Drag anywhere to steer · use your gear to clear the way · get out before the doors close.',
  language: 'Language',
  clearBonus: '+1 skill point',
  replayBonus: '+{n} skill points (replay {n}/{max})',
  clearNoBonus: 'No more skill points from this level — first clear only',
  nextSkillPoint: '{n} more clears for 1 point',
  back: 'Back',
  levelsTeaser: 'All 100 levels · clear 99 to unlock the Lv100 finale',
  skillHowto: 'Every 10 levels earns 1 point. Each skill costs 1.',
  spellHowto: 'The start is the centre. Farther out is stronger. The skill between two schools needs both starts. Last skills cannot share an element.',
  spellNeed: 'Learn {name} first.',
  spellNeedTwo: 'Learn {a} and {b} first.',
  spellMixNeed: 'Start',
  spellLast: 'Strongest of this line.',
  spellOneEnd: 'A last skill that shares an element is already learned.',
  ultShort: 'Ult',
  skillsApplyNext: 'Changes apply from your next run.',
  examTag: 'Exam',
  bossTag: 'Boss',
  bossKicker: 'Boss',
  bossSkip: 'Tap to skip',
  bossCounter: 'Counter',
  bossYield: 'He yields — go!',
  bossAllZh: '八王齊集',
  bossAllEn: 'All Eight Kings',
  bossAllTagline: 'Every king in one car. Wear them down, slip past, get out.',
  bossBarHint: 'Push into the king to drain his stubbornness bar — at zero he steps aside',
  loadoutN: 'Build {n}',
  loadoutLbl: 'Build',
  resetSkills: 'Reset',
  resetTitle: 'Reset this build?',
  resetBody: 'Refund all {n} spent points (incl. Ultimates) to {slot}. Free and instant.',
  resetYes: 'Reset',
  cancel: 'Cancel',
  editSkills: 'Edit skills',
  respecNotice: 'Skill points recalculated — please re-allocate',
  progressSplitNotice: 'Each character now has its own level progress. Mage spell points were reset to match Mage clears.',
  loadoutNext: 'Applies from your next run',
  spLeft: '{n} pts left',
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
    loud: 'Loudmouth',
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
    squat: 'Walks like anyone. Once he squats, he is the hardest to move.',
    loud: 'Shouting into the phone. The noise ring drains stamina.',
  },
  typeIcons: 'Type icons',
  on: 'On',
  off: 'Off',
  hintDrag: 'Drag',
  hintShove: 'Hold',
  hintCast: 'Blow',
  hintGear: 'Gear',
  hintExit: 'Get off',
  finale: 'Finale',
  cleared: 'Cleared',
  artCredit: 'Concept art: Grok Image. 香城鐵路 is fiction — inspired by HK metro, not affiliated.',
  finaleLocked: 'Clear level 99 to unlock the fireworks finale.',
  introTap: 'Tap to start',
  introTitle: 'New passenger',
  tipChip: 'Tip',
  reviewIntro: 'How they block you',
  clearBonusN: '+{n} skill point',
  levelsTeaserV05: 'Short exits · learn one special every few levels',
  doorClosedToast: "This door won't open!",
  doorMind: 'Please mind the door.',
  stationCall: 'Passengers, this station is {station}.',
  doorBanner: 'Only {n} doors open',
  doorBannerZh: '只開{n}道門',
  doorBannerEn: 'Only {n} doors open',
  doorBannerEnOne: 'Only 1 door open',
  doorOpenIcon: 'Open',
  doorClosedIcon: 'Closed',
  // v0.8 characters
  charTitle: 'Characters',
  charSelect: 'Select',
  charSelected: 'Selected',
  charBuy: 'Buy',
  charTry: 'Try',
  charRestore: 'Restore Purchases',
  charNote: 'Each character has its own level progress. Web demo: all characters unlocked.',
  charCleared: 'Cleared',
  charProgressOf: 'Progress for',
  charIapStub: 'IAP hooks land in the iOS build (Grok Build).',
  charIapOk: 'Unlocked.',
  charIapCancelled: 'Purchase cancelled.',
  charIapPending: 'Waiting for approval.',
  charIapError: 'Purchase failed. Try again.',
  charIapUnavailable: 'The store is not available yet.',
  charRestoreDone: 'Purchases restored.',
  charRestoreEmpty: 'No purchases to restore.',
  charBundle: 'Both characters',
  charTryStub: 'Trial car (L6 / L20) comes with the iOS build.',
  manaEmpty: 'Not enough mana!',
  mana: 'Mana',
  spells: 'Spells',
  fire: 'Fire',
  ice: 'Ice',
  volt: 'Lightning',
  wind: 'Wind',
  grav: 'Gravity',
  chars: 'Characters',
  charSwitch: 'Change character',
  charPickTitle: 'Pick a character',
  comingSoon: 'Coming soon',
  youOffice: 'Office Worker',
  gear: 'Gear',
  workshop: 'Workshop',
  tabEquip: 'Equip',
  tabShop: 'Shop',
  tabSets: 'Sets',
  coins: 'Coins',
  coinGain: '+{n} coins',
  cells: 'cells',
  tierCheap: 'Cheap',
  tierMid: 'Mid',
  tierLux: 'Luxury',
  buyItem: 'Buy',
  upgradeItem: 'Upgrade',
  sellItem: 'Sell',
  expandBag: 'Expand bag',
  autoPack: 'Auto-pack',
  recommendKit: 'Suggested kit',
  removeItem: 'Take off',
  rotateItem: 'Rotate',
  placeHint: 'Tap an item, then a cell',
  coinNotice: 'Coins were recalculated',
  coinPreview: 'This run',
  replayCoins: 'Replay coins {n}/5',
  fastExit: 'Fast exit',
  charNoteIos: 'Each character keeps their own level progress. Mage and Gear L are optional characters.',
  trialBanner: 'Trial · no rewards',
  noRoom: 'No space',
  wontFit: "Won't fit",
  ownedTier: 'Owned',
  oneEach: 'Shoes, gloves, head and core: one each. Upgrades take more cells.',
  bagLimit: 'The bag stops at 6 cells. Pack for this stage. One kit will not cover every car.',
  placeSize: 'Covers {n} cells. Tap a cell to drop it.',
  whyBody: 'Already wearing {slot}. Only one.',
  whyOnce: 'Already in the bag.',
  whyActive: 'Only 3 active pieces.',
  whyCons: 'Only 3 drinks or snacks.',
  whyStock: 'None left to place.',
  slotShoes: 'shoes',
  slotGloves: 'gloves',
  slotHead: 'head',
  slotCore: 'a core',
  coinShop: 'Upgrades spend coins from clears, not skill points.',
  needLevel: 'Clear level {n} first.',
  needCoins: 'Not enough coins. Clear levels to earn them.',
};

