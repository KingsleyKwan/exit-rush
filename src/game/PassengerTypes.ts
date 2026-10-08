export type PassengerKind =
  | 'normal'
  | 'stench'
  | 'family'
  | 'brat'
  | 'couple'
  | 'angry'
  | 'luggage'
  | 'squat'
  | 'loud';

export interface PassengerDef {
  kind: PassengerKind;
  /** Body colour */
  color: number;
  /** Mass (kg-ish units). Higher = harder to move, hits harder. */
  mass: number;
  /** Collision radius (m) in the XZ plane. */
  radius: number;
  /** Linear damping (1/s): footing / friction. */
  damping: number;
  /** Bounciness when bumped. */
  restitution: number;
  /** Multiplier on how hard riders spring back to their spot. */
  anchorMul: number;
  /** Multiplier on boarding push force. */
  driveMul: number;
  /** Multiplier on walking speed. */
  speedMul: number;
  /** Special flags */
  auraSlow?: number;
  zigzag?: boolean;
  shoveInterval?: number;
  shoveForce?: number;
  cluster?: boolean;
  /** Visual width multiplier for the body mesh. */
  widthMul?: number;
  linkPair?: boolean;
  /** Visual scale of the whole figure. */
  scale?: number;
  /** 大聲公: loud phone call — stamina-draining noise zone (TUNING.types.loud). */
  noise?: boolean;
}

export const PASSENGER_DEFS: Record<PassengerKind, PassengerDef> = {
  normal: {
    kind: 'normal',
    color: 0x6b7c93,
    mass: 1,
    radius: 0.23,
    damping: 4,
    restitution: 0.05,
    anchorMul: 1,
    driveMul: 1,
    speedMul: 1,
  },
  stench: {
    kind: 'stench',
    color: 0x6b8f3a,
    mass: 1.1,
    radius: 0.24,
    damping: 4,
    restitution: 0.05,
    anchorMul: 1.1,
    driveMul: 0.9,
    speedMul: 0.85,
    auraSlow: 0.45,
  },
  family: {
    kind: 'family',
    color: 0xe8b84a,
    mass: 1.25,
    radius: 0.24,
    damping: 4.5,
    restitution: 0.05,
    anchorMul: 1.2,
    driveMul: 1,
    speedMul: 0.9,
    cluster: true,
  },
  brat: {
    kind: 'brat',
    color: 0xff4fa3,
    mass: 0.5,
    radius: 0.17,
    damping: 2.4,
    restitution: 0.4,
    anchorMul: 0.45,
    driveMul: 1.1,
    speedMul: 1.35,
    zigzag: true,
    scale: 0.74,
  },
  couple: {
    kind: 'couple',
    color: 0xc43b8c,
    mass: 1.1,
    radius: 0.23,
    damping: 4,
    restitution: 0.05,
    anchorMul: 1,
    driveMul: 1,
    speedMul: 0.9,
    linkPair: true,
  },
  angry: {
    kind: 'angry',
    color: 0xc62828,
    mass: 1.6,
    radius: 0.26,
    damping: 4,
    restitution: 0.08,
    anchorMul: 1.4,
    driveMul: 1.6,
    speedMul: 1.1,
    shoveInterval: 3.2,
    shoveForce: 2.8,
    widthMul: 1.12,
  },
  luggage: {
    kind: 'luggage',
    color: 0x6d4c41,
    mass: 1.8,
    radius: 0.25,
    damping: 6,
    restitution: 0.02,
    anchorMul: 1.6,
    driveMul: 1.2,
    speedMul: 0.75,
    widthMul: 1.05,
  },
  squat: {
    kind: 'squat',
    color: 0x5c6bc0,
    // Boss inputs. A walking squatter overwrites mass, damping, and scale each
    // step from TUNING.types.squat. The king does not.
    mass: 1.7,
    radius: 0.28,
    damping: 7.5,
    restitution: 0.02,
    anchorMul: 2.0,
    driveMul: 1,
    speedMul: 0.95,
    widthMul: 1.15,
    scale: 0.82,
  },
  loud: {
    kind: 'loud',
    color: 0xf39c12,
    mass: 1.15,
    radius: 0.24,
    damping: 4.2,
    restitution: 0.05,
    anchorMul: 1.15,
    driveMul: 0.95,
    speedMul: 0.8,
    noise: true,
  },
};
