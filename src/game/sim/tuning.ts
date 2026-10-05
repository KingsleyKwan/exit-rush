/**
 * Physics & feel tuning knobs — every number that shapes how the crowd and the
 * player behave lives here. Units: metres, seconds, "kg-ish" mass units.
 *
 * In dev builds this object is exposed as `window.TUNING` so values can be
 * tweaked live from the browser console (changes apply on the next step).
 */

/** World layout (kept free of three.js so the sim can run headless). */
export const DOOR_Z = -3.6;
export const PLAYER_START_X = 0;
export const PLAYER_START_Z = 3.2;

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
    maxBodies: 80,
    /** Normal impulse above which a contact emits a "bump" event for juice. */
    impactEvent: 0.55,
  },

  car: {
    halfWidth: 1.98,
    backZ: 4.45,
    /** Half-width of the open doorway (m). */
    doorHalf: 0.8,
    platformDepth: 3.4,
    platformHalfWidth: 3.0,
    /** Win zone: reach z <= DOOR_Z + winDepth with |x| < winHalf. */
    winDepth: 0.55,
    winHalf: 0.95,
  },

  player: {
    radius: 0.26,
    /** Radius while shouldering through a squeeze (turns sideways). */
    shoulderRadius: 0.19,
    baseMass: 1.3,
    /** Extra mass per point of STR `resist` (0–0.5). */
    massPerResist: 1.6,
    /** Top walking speed (m/s) before SPD modifiers. */
    maxSpeed: 2.0,
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
      /** Assist strength with WIS 0. */
      base: 0.14,
      /** Extra assist per point of WIS gapSense (0–0.4). */
      perGapSense: 1.3,
      probe: 1.7,
      /** Fan half-angle (rad) searched for gaps. */
      fan: 0.95,
      rays: 9,
      /** Smoothing rate of the assisted direction (1/s). */
      smooth: 12,
    },
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
    /** Inward push riders near the door feel while boarders stream in. */
    pressureForce: 2.2,
    pressureRange: 3.2,
    /** Smooth idle sway force. */
    wander: 0.35,
    /** Boarders (counterflow). */
    boardDelay: 0.7,
    boardRamp: 2.5,
    boardRateBase: 0.35,
    boardRatePerPressure: 1.9,
    boardBudgetBase: 3,
    boardBudgetPerPressure: 28,
    boardQueueBase: 2,
    boardQueuePerPressure: 7,
    boardSpeed: 1.8,
    boardAccel: 6,
    boardMaxDrive: 12,
    boardMaxTime: 10,
    /** Riders sidestep for the player (base + WIS gapSense bonus). */
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
  },

  ult: {
    cooldown: 10,
    str: { radius: 2.9, impulse: 7.5, duration: 2.2, massMul: 3, driveMul: 2.2 },
    spd: { burst: 6.2, duration: 1.1, speedMul: 2.1, massMul: 3 },
    wis: { duration: 3.5, calm: 0.75, pathEvery: 0.2 },
  },

  door: {
    /** Warning lights + accelerating beeps for the last N seconds. */
    warnTime: 5,
    /** Leaves physically slide shut over the last N seconds. */
    closeTime: 1.2,
  },
};

export type Tuning = typeof TUNING;
