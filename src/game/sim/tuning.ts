/**
 * Physics & feel tuning knobs — every number that shapes how the crowd and the
 * player behave lives here. Units: metres, seconds, "kg-ish" mass units.
 *
 * In dev builds this object is exposed as `window.TUNING` so values can be
 * tweaked live from the browser console (changes apply on the next step).
 *
 * Layout (v0.4.1): car runs along Z; sliding exits are on the LEFT long wall
 * (−X, platform side). Car ends are gangways only — not exits.
 */

/** Car length along Z (gangway … gangway). */
export const CAR_Z_MIN = -4.2;
export const CAR_Z_MAX = 4.2;

/**
 * Z centres of the three side-door bays (platform / left wall).
 * Which bays open depends on the level (see `openDoorBays`).
 */
export const DOOR_BAYS = [-2.6, 0, 2.6] as const;

/**
 * Compatibility alias: mid-bay Z. Prefer `openDoorBays` / `nearestDoorBay`.
 * Kept so ambient camera / older call sites have a single “door corridor” Z.
 */
export const DOOR_Z = 0;

/** Player starts deep in the car on the far (+X) side, away from the doors. */
export const PLAYER_START_X = 1.15;
export const PLAYER_START_Z = 3.05;

/** Left wall X (inside face ≈ −halfWidth). Platform is more negative X. */
export function doorWallX(): number {
  return -TUNING.car.halfWidth;
}

/**
 * How many / which door bays are open for this level.
 * Early levels: all three. Mid: two (mid + near player). Late / L100: one (mid).
 */
export function openDoorBays(levelId: number, override?: 1 | 2 | 3): number[] {
  const all = [...DOOR_BAYS];
  // v0.7: per-level override (2-door relief levels in 31–99).
  if (override === 3) return all;
  if (override === 2) return [all[1], all[2]];
  if (override === 1) return [all[1]];
  if (levelId >= 100) return [all[1]];
  // v0.5: fewer open bays as the 1–30 curve tightens
  if (levelId >= 24) return [all[1]];
  if (levelId >= 16) return [all[1]];
  if (levelId >= 8) return [all[1], all[2]];
  return all;
}

/** Closest open door bay Z to a world Z. */
export function nearestDoorBay(z: number, open: readonly number[]): number {
  let best = open[0] ?? DOOR_Z;
  let bestD = Math.abs(z - best);
  for (const d of open) {
    const dd = Math.abs(z - d);
    if (dd < bestD) {
      best = d;
      bestD = dd;
    }
  }
  return best;
}

export const TUNING = {
  physics: {
    /** Fixed simulation rate (Hz). Rendering interpolates between steps. */
    hz: 60,
    /** Max fixed steps per rendered frame (spiral-of-death guard). */
    maxSubSteps: 5,
    /** Constraint solver iterations per step. */
    iterations: 3,
    /** Fraction of overlap corrected per iteration. Lower = squishier, more compressible crowd. */
    contactBeta: 0.38,
    /** Overlap allowed before correction (m). */
    contactSlop: 0.008,
    /** Overlap beyond this fraction of combined radii is corrected rigidly (anti-tunnel). */
    hardOverlapFrac: 0.38,
    /** Bounciness of body-body contacts (0 = dead, 1 = elastic). */
    restitution: 0.06,
    wallRestitution: 0.12,
    /** Spatial hash cell size (m) — must be >= largest body diameter. */
    cellSize: 0.9,
    /** Hard cap on simultaneous bodies (player + passengers + suitcases). */
    maxBodies: 96,
    /** Normal impulse above which a contact emits a "bump" event for juice. */
    impactEvent: 0.55,
  },

  car: {
    halfWidth: 1.98,
    zMin: CAR_Z_MIN,
    zMax: CAR_Z_MAX,
    /** @deprecated use zMax — kept for any leftover end-door call sites. */
    backZ: CAR_Z_MAX,
    /** Half-length of a side-door opening along Z (m). */
    doorHalf: 0.72,
    /** Platform extends this far past the left wall (−X). */
    platformDepth: 3.4,
    /** Platform half-length along Z. */
    platformHalfLen: 5.2,
    /** @deprecated was end-door platform half-width; aliased for safety. */
    platformHalfWidth: 5.2,
    /**
     * Win zone: reach x <= −halfWidth − winDepth (on platform) with
     * |z − openBay| < winHalf.
     */
    winDepth: 0.35,
    winHalf: 0.85,
    doorBays: DOOR_BAYS,
  },

  player: {
    radius: 0.26,
    /** Radius while shouldering through a squeeze (turns sideways). */
    shoulderRadius: 0.19,
    baseMass: 1.3,
    /** Extra mass per point of STR `resist` (0–0.5). */
    massPerResist: 1.0,
    /** Top walking speed (m/s) before SPD modifiers. */
    maxSpeed: 1.5,
    /** How hard velocity chases the stick (1/s). Higher = snappier. */
    accel: 13,
    /** Braking when the stick is released (1/s). */
    brake: 9,
    /** Max drive force per unit mass — this is the "push" vs crowd "resistance". */
    maxDrive: 10,
    damping: 1.2,
    /** Tangential slide strength along contacts (shouldering around people). */
    slip: 0.4,
    /** Stick deadzone (0–1). */
    deadzone: 0.12,
    stamina: {
      /** Drain per second while pushing into bodies (base + per metre of overlap). */
      drainBase: 3,
      drainPerPressure: 26,
      /** Recover above this fraction after being winded. */
      recoverFrac: 0.25,
      /** Regen fraction while winded but still holding the stick. */
      windedRegen: 0.6,
      /** Regen fraction while pushing (light contact is sustainable, heavy shoving is not). */
      pushRegen: 0.3,
      windedSpeedMul: 0.45,
      windedDriveMul: 0.35,
    },
    shove: {
      cooldown: 0.7,
      /** Hold time to reach full charge. */
      chargeTime: 0.45,
      minCost: 9,
      maxCost: 20,
      range: 1.35,
      /** cos(half-angle) of the shove cone (0.4 ≈ 66°). */
      coneCos: 0.4,
      /** Impulse (mass·m/s) given to each body at point blank, full charge, STR 0. */
      impulse: 4.6,
      /** Player's own forward lunge (m/s) at full charge. */
      lunge: 2.6,
    },
    aim: {
      /** Assist strength with gapSense 0. */
      base: 0.14,
      /** Extra assist per point of SPD gapSense (0–0.4). */
      perGapSense: 1.3,
      probe: 1.7,
      /** Fan half-angle (rad) searched for gaps. */
      fan: 0.95,
      rays: 9,
      /** Smoothing rate of the assisted direction (1/s). */
      smooth: 12,
    },
    /**
     * Crowd drag: top speed shrinks with the number of bodies within `radius`
     * (each weighted 1 − d/radius): × (1 − min(max, n·perBody)). SPD gapSense
     * cuts it by gapSense·perGapSense; the SPD dash keeps `dashMul` of it.
     */
    crowdDrag: { radius: 0.9, perBody: 0.25, max: 0.65, perGapSense: 1.0, dashMul: 0.5 },
    /** Control loss after an angry shove (s). */
    stunTime: 0.3,
    /** Invulnerability to further angry shoves after being hit (s). */
    hitIFrames: 1.0,
  },

  crowd: {
    /** Riders' spring back to their standing spot (per unit mass). */
    anchorK: 4.5,
    anchorMax: 9,
    /** Displaced longer than this (s) beyond driftDist → adopt new spot (crowd compresses). */
    driftDist: 0.3,
    driftAfter: 1.4,
    driftRate: 0.8,
    /** Inward push riders near the door feel while boarders stream in (toward +X). */
    pressureForce: 2.2,
    pressureRange: 3.2,
    /** Smooth idle sway force. */
    wander: 0.35,
    /** Boarders (counterflow). */
    boardDelay: 0.7,
    boardRamp: 2.5,
    boardRateBase: 0.48,
    boardRatePerPressure: 2.3,
    boardBudgetBase: 11,
    boardBudgetPerPressure: 20,
    boardQueueBase: 8,
    boardQueuePerPressure: 7,
    boardSpeed: 1.8,
    boardAccel: 6,
    boardMaxDrive: 12,
    boardMaxTime: 10,
    /** Riders sidestep for the player (base + SPD gapSense bonus). */
    yieldBase: 0.1,
    yieldPerGapSense: 4,
  },

  types: {
    couple: { rest: 0.48, k: 38, damping: 5, maxForce: 30 },
    family: { cohesionK: 5.5, cohesionDeadzone: 0.3, kidScale: 0.72, kidMass: 0.6 },
    stench: { auraRadius: 1.55, repelRadius: 1.05, repelForce: 2.6 },
    brat: { zigFreq: 5.5, zigForce: 3.4, dartEvery: 1.6, dartImpulse: 1.1 },
    angry: { range: 1.0, windup: 0.32, impulse: 3.6, retaliateCd: 0.5, neighbourImpulse: 1.0 },
    luggage: { caseRadius: 0.2, caseMass: 2.6, caseDamping: 7, rest: 0.4, k: 95, linkDamping: 8 },
    /**
     * Squatter. Walks like anyone, then plants when he stops. Planted mass is
     * above the suitcase (2.6), so a squat is the heaviest special body.
     * The king ignores these and keeps the def mass, damping, and anchor.
     */
    squat: {
      shoveMul: 0.2,
      lateralDrag: 0.7,
      walkMass: 1.15,
      walkDamping: 4,
      walkSpeed: 1.15,
      plantMass: 3.4,
      plantDamping: 12,
      /** Extra multiplier on the def anchor while planted (not the king). */
      plantAnchor: 1.8,
      arrive: 0.35,
      stopSpeed: 0.22,
      stopAfter: 0.4,
      /** Dragged this far off the squat spot: stand up and walk. */
      uproot: 0.95,
      strollMin: 1.1,
      strollReach: 2.0,
      postedReach: 0.8,
    },
    /**
     * 大聲公 Loudmouth: stamina drain (per s) inside `radius`, scaling from `edge`×peak at the rim to
     * peak at the centre (linear falloff); overlapping zones sum but are capped at `stackCap`× (=no
     * stacking). Regen is ×`regenMul` while in the zone. ~3 s at 0.6 m costs ~54 of 100 stamina
     * (≈24.5/s): painful, not instantly fatal. Unbothered (sta_t3c) ×`skills.unbotheredLoudMul`.
     */
    loud: { radius: 1.3, drainPeak: 40, edge: 0.08, stackCap: 1.0, regenMul: 0.5 },
  },

  /**
   * v0.7 bosses: an oversized, heavy "king" of a type that sits between you and the exit.
   * Not defeated — worn down: pushing against him (contact) and shoving drain his
   * stubbornness bar; at 0 he yields (steps aside, mechanic paused) for `yieldTime`,
   * then slowly regains his resolve. STR push force speeds the drain.
   */
  boss: {
    scale: 1.75,
    /** L100 crowds eight kings into one car: smaller. */
    scaleFinale: 1.4,
    radiusMul: 1.5,
    massMul: 3.2,
    anchorMul: 1.9,
    /** Anchor while yielding (he lets himself be moved). */
    yieldAnchor: 0.25,
    yieldTime: 3.2,
    /** Stubbornness drained per second of the player leaning on him. */
    contactDrain: 0.26,
    /** Iron Bull Charge (STR ult) multiplies the contact drain. */
    chargeDrainMul: 5,
    /** Per full-power shove hit (× push force × charge). */
    shoveDrain: 0.2,
    /** Regained per second when nobody is pushing (after a yield or between pushes). */
    regen: 0.06,
    /** Step-aside distance while yielding. */
    stepAside: 1.15,
    luggage: { caseRadiusMul: 2.4, caseMassMul: 3, rest: 0.7, bounce: 2.8, bounceCd: 0.6 },
    stench: { auraMul: 1.5 },
    family: { kidEvery: 2.4, maxKids: 6 },
    brat: { dashEvery: 1.25, dashImpulse: 3.6, range: 2.8, bump: 3.4, bumpCd: 0.7 },
    couple: { rest: 1.2, maxForceMul: 3 },
    /** Boss shoves cut through generic STR resist (only Stand Firm keeps its full effect). */
    angry: { rangeMul: 1.6, impulseMul: 1.8, windupMul: 1.5, intervalMul: 0.45, chargeForce: 4, resistKeep: 0.35, heavyStun: 2.6 },
  },

  /**
   * Skill-tree (v0.6 constellation): continuous fill + major nodes every ~10 pts.
   * STR: push / resist / front shove / charge. SPD: move / clear-lane / drag cut / gapSense.
   * STA (was WIS): stamina pool/regen/buffer, auraResist, drain resist. Ult: Iron Stance.
   */
  skills: {
    pushForce: 0.55,
    resist: 0.5,
    staminaBase: 100,
    staminaMax: 55,
    moveSpeed: 0.4,
    regenBase: 12,
    staminaRegen: 16,
    auraResist: 0.65,
    gapSense: 0.35,
    frontPush: 0.35,
    chargeShoveMul: 1.45,
    clearSpeed: 1.18,
    blockedDragCut: 0.4,
    regenNodeBonus: 6,
    staminaBuffer: 28,
    // ---- v0.6.2 Tier 3: counters to special passengers
    /** STR 40 Split: couple link released for N s after a shove hit; pop-apart impulse. */
    splitDuration: 4,
    splitImpulse: 1.1,
    /** STR 50 Ground Pound (full-charge shove): radial shockwave; luggage owner+case get ×luggageMul. */
    groundPoundRadius: 1.6,
    groundPoundImpulse: 2.4,
    groundPoundLuggageMul: 2.6,
    /** STR 60 Stand Firm: angry shove impulse × this; stun × this. */
    standFirmMul: 0.15,
    /** STA 60 Unbothered: loudmouth drain × this (≈ −70%). */
    unbotheredLoudMul: 0.3,
    /** SPD 40 Hurdle: visual hop length (s) when passing through luggage. */
    hurdleHop: 0.32,
    /** Max-speed multiplier while mid-hop. */
    hurdleHopSpeed: 0.7,
    /** SPD 50 Leap (active): burst, airtime, cooldown. Passes over squatters + kids. */
    leapBurst: 3.8,
    leapDuration: 0.55,
    leapCd: 6,
    /** SPD 60 Thread: lateral reach to the couple link line, and step-aside force. */
    threadReach: 0.42,
    threadYield: 3.5,
    /** STA 50 Second Wind (active): stamina, cooldown, brat shake-off. */
    secondWindAmount: 45,
    secondWindCd: 12,
    shakeOffRadius: 1.6,
    shakeOffImpulse: 2.6,
    shakeOffDaze: 3,
  },

  ult: {
    cooldown: 10,
    str: { radius: 2.9, impulse: 5.5, duration: 1.6, massMul: 2.2, driveMul: 1.8 },
    spd: { burst: 5.5, duration: 1.0, speedMul: 1.7, massMul: 2.2 },
    /** Iron Stance — burst regen + heavy footing (replaces WIS Crowd Sense). */
    sta: { duration: 2.8, regenMul: 3.2, massMul: 2.4, auraResist: 0.85, calm: 0.4 },
  },


  /** Mage base stats & shared boss multipliers (v0.8). */
  mage: {
    baseMass: 1.1,
    pushMul: 1.0,
    speedMul: 1.0,
    staminaMax: 105,
    staminaRegen: 15,
    manaMax: 130,
    manaRegen: 12,
    /** Mana regen × this inside a loudmouth noise zone. */
    manaNoiseMul: 0.5,
    /** Boss disable (freeze/daze/chill) duration multiplier. */
    bossDisableMul: 0.65,
    /** Counter ability stubbornness drain vs boss. */
    bossCounterDrainMul: 3.2,
  },

  /** Mage spell numbers (v0.8) — see docs/CHARACTERS.md §3. */
  spells: {
    fillPush: 0.65,
    fillSpeed: 0.6,
    fillStamina: 50,
    fillMana: 45,
    fillAura: 0.45,
    fillGap: 0.3,
    fillCdr: 0.15,
    fillSpellPower: 0.45,
    frostBuffer: 25,
    fireBolt: { range: 3.3, width: 0.95, impulse: 3.15, mana: 15, cd: 3.2 },
    flameBurst: { radius: 2.6, impulse: 4.0, luggageMul: 5.4, mana: 25, cd: 5.0 },
    hotHold: 5.0,
    cleanseAura: 3,
    frostBreath: { range: 3.2, halfAngleDeg: 48, chill: 2.4, mana: 16, cd: 3.6 },
    flashFreeze: { radius: 2.7, freeze: 2.55, mana: 28, cd: 5.8 },
    chillOutWindup: 4,
    angryShoveMul: 0.28,
    zap: { range: 3.0, count: 5, daze: 2.2, mana: 12, cd: 2.0 },
    thunderclap: { radius: 3.0, bratDaze: 4.8, otherDaze: 1.5, bratImpulse: 4.8, mana: 19, cd: 4.2 },
    droppedCall: 4.2,
    thunderStep: 1.5,
    noisePassiveCut: 0.3,
    iceAge: { radius: 3.2, freeze: 2.2, regenDur: 2.8, regenMul: 3 },
    thunderBlink: { range: 2.2, speedDur: 0.8, speedMul: 1.6 },
  },

  door: {
    /** Warning lights + accelerating beeps for the last N seconds. */
    warnTime: 5,
    /** Leaves physically slide shut over the last N seconds. */
    closeTime: 1.2,
  },
};

export type Tuning = typeof TUNING;
