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
  /** {a} and {b} = two skills that have to come first. */
  spellNeedTwo: string;
  /** {a}, {b}, and {c} = three skills that have to come first. */
  spellNeedThree: string;
  /** Word in the centre of the mage wheel. */
  spellMixNeed: string;
  /** Rank 4 of a line. Not a separate ultimate button. */
  spellLast: string;
  /** Confirm button after the player has read the skill. */
  spellLearn: string;
  /** Shown on a skill she already has. */
  spellLearned: string;
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
  /** Toast when the doors are about to close. The warning itself is a chime. */
  doorMind: string;
  /** In-car announcement, Japanese first. `{station}` is the kana reading. */
  trainCallJa: string;
  /** Same announcement in English. `{station}` is the parody English name. */
  trainCallEn: string;
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
  /** Short cell count, shown while a piece is selected. `{n}` is the count. */
  placeShort: string;
  /** Equip dock when no type icon is selected. */
  pickType: string;
  /** That type is not owned yet. */
  noneOwned: string;
  /** Opens the hidden description. */
  moreInfo: string;
  /** Closes the hidden description. */
  lessInfo: string;
  /** The ? button. */
  tips: string;
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
  /** Passive gear. It works without a button. */
  gearKindOn: string;
  /** Active gear, a core, or a consumable. */
  gearKindTap: string;
  slotGadget: string;
  slotSnack: string;
  /** Why the pieces in one worn slot are not interchangeable. */
  gearSlotNote: {
    shoes: string;
    gloves: string;
    head: string;
    gadget: string;
    core: string;
    consumable: string;
  };
  /** What this piece is for, against the others in its slot. */
  gearUse: {
    S1: string; S2: string; S3: string;
    G1: string; G2: string; G3: string;
    H1: string; H2: string; H3: string;
    D1: string; D2: string; D3: string; D4: string; D5: string;
    C1: string; C2: string; C3: string;
    K1: string; K2: string; K3: string;
  };
  /** Cheap, then mid, then luxury. One line each. Consumables have one. */
  gearTier: {
    S1: readonly [string, string, string];
    S2: readonly [string, string, string];
    S3: readonly [string, string, string];
    G1: readonly [string, string, string];
    G2: readonly [string, string, string];
    G3: readonly [string, string, string];
    H1: readonly [string, string, string];
    H2: readonly [string, string, string];
    H3: readonly [string, string, string];
    D1: readonly [string, string, string];
    D2: readonly [string, string, string];
    D3: readonly [string, string, string];
    D4: readonly [string, string, string];
    D5: readonly [string, string, string];
    C1: readonly [string, string, string];
    C2: readonly [string, string, string];
    C3: readonly [string, string, string];
    K1: readonly [string];
    K2: readonly [string];
    K3: readonly [string];
  };
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
  howToMage: 'Drag anywhere to steer. Wind blows people aside. Cold, her weight, and the mixes are each their own skill.',
  howToTech: 'Drag anywhere to steer · use your gear to clear the way · get out before the doors close.',
  language: 'Language',
  clearBonus: '+1 skill point',
  replayBonus: '+{n} skill points (replay {n}/{max})',
  clearNoBonus: 'No more skill points from this level — first clear only',
  nextSkillPoint: '{n} more clears for 1 point',
  back: 'Back',
  levelsTeaser: 'All 100 levels · clear 99 to unlock the Lv100 finale',
  skillHowto: 'Every 10 levels earns 1 point. Each skill costs 1.',
  spellHowto: 'Three lines leave the centre. A skill between two others needs both of that rank, and the mix before it.',
  spellNeed: 'Learn {name} first.',
  spellNeedTwo: 'Learn {a} and {b} first.',
  spellNeedThree: 'Learn {a}, {b}, and {c} first.',
  spellMixNeed: 'Start',
  spellLast: 'Strongest of this line.',
  spellLearn: 'Learn',
  spellLearned: 'Learned',
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
  trainCallJa: '{station}、{station}。ドアが開きます。',
  trainCallEn: '{station}. Doors will open.',
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
  placeShort: '{n} cells',
  pickType: 'Pick a type',
  noneOwned: 'None yet. Buy it in the shop.',
  moreInfo: 'More',
  lessInfo: 'Less',
  tips: 'Tips',
  whyBody: 'Already have {slot}',
  whyOnce: 'Already in the bag',
  whyActive: 'Only 3 buttons',
  whyCons: 'Only 3 snacks',
  whyStock: 'None left',
  slotShoes: 'shoes',
  slotGloves: 'gloves',
  slotHead: 'head',
  slotCore: 'a core',
  coinShop: 'Upgrades spend coins from clears, not skill points.',
  needLevel: 'Clear level {n} first.',
  needCoins: 'Not enough coins. Clear levels to earn them.',
  gearKindOn: 'Always on',
  gearKindTap: 'Button',
  slotGadget: 'Gadget',
  slotSnack: 'Snack',
  gearSlotNote: {
    shoes: 'One pair. Each pair does a different job.',
    gloves: 'One pair. Each pair changes the shove differently.',
    head: 'One. Each one blocks a different nuisance.',
    gadget: 'You can pack more than one. Each does its own job.',
    core: 'One ultimate. They do not stack.',
    consumable: 'Used once. It still takes a cell.',
  },
  gearUse: {
    S1: 'These shoes only make you run faster. No button.',
    S2: 'A button. Jump over someone squatting, and over kids. Walking is not faster.',
    S3: 'Walk through suitcases. Not a jump, and not a speed boost.',
    G1: 'A harder shove. Not a shockwave, and couples stay holding hands.',
    G2: 'A full shove bursts outward. Suitcases fly further.',
    G3: 'A shove makes a couple let go. How long is the same at every level.',
    H1: 'The smell slows you less. It does not quiet a loud call.',
    H2: 'A loud call drains you less. It does not stop the smell.',
    H3: 'You read a gap and slip through. It does not warn you early.',
    D1: 'A bigger stamina bar that refills faster. Not a drink.',
    D2: 'You are heavier, so an angry shove moves you less.',
    D3: 'A button. Nearby brats chase the drone instead of you.',
    D4: 'A button. A nearby family stops to watch.',
    D5: 'A button. A gust clears the people in front and blows the smell aside.',
    C1: 'The ultimate. Charge through. Not a dash, and not a shield.',
    C2: 'The ultimate. Dash off the train. Not a charge.',
    C3: 'The ultimate. Plant your feet and catch your breath. Not a dash.',
    K1: 'One drink. Stamina comes back and you are not winded.',
    K2: 'One drink. A short burst of speed. Not the shoes.',
    K3: 'One piece. The smell and the loud call ease off for a moment.',
  },
  gearTier: {
    S1: ['10% faster', '20% faster, and quicker through a gap', '30% faster, and quickest through a gap'],
    S2: ['Jump. Ready again in 9 s', 'Jump. Ready again in 7.5 s', 'Jump. Ready again in 6 s'],
    S3: ['Through a suitcase, a bit slower', 'Through a suitcase, almost full pace', 'Full pace, and through the giant case too'],
    G1: ['Push 12% harder', 'Push 25% harder, and shoves move you less', 'Push 40% harder, and shoves move you least'],
    G2: ['Shockwave. Suitcases fly further', 'Wider shockwave, and a harder push', 'Widest shockwave, and the hardest push'],
    G3: ['Couples let go', 'Couples let go, and you push harder', 'Couples let go, and you push hardest'],
    H1: ['Half the slow is gone', 'Three quarters of the slow is gone', 'The smell does not slow you'],
    H2: ['Drain cut by 35%', 'Drain cut by 55%', 'Drain cut by 70%'],
    H3: ['A small nudge toward the gap', 'A clearer nudge toward the gap', 'The strongest nudge toward the gap'],
    D1: ['+15 stamina, refill +3', '+30 stamina, refill +8', '+45 stamina, refill +14'],
    D2: ['An angry shove keeps 60% of its force', 'An angry shove keeps 35%', 'An angry shove keeps 15%'],
    D3: ['They chase for 2.5 s', 'They chase for 3.5 s', 'They chase for 4.5 s'],
    D4: ['The family stops for 3 s', 'The family stops for 4 s', 'The family stops for 5 s, and brats for 2 s'],
    D5: ['A short, light gust', 'A longer, harder gust', 'The longest, hardest gust'],
    C1: ['Ready again in 14 s', 'Ready again in 12 s', 'Ready again in 10 s'],
    C2: ['Ready again in 14 s', 'Ready again in 12 s', 'Ready again in 10 s'],
    C3: ['Ready again in 14 s', 'Ready again in 12 s', 'Ready again in 10 s'],
    K1: ['+40 stamina. Then it is gone'],
    K2: ['Extra speed for 5 s. Then it is gone'],
    K3: ['6 s. No smell, and the call is quieter'],
  },
};

