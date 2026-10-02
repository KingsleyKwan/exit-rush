export type PassengerKind =
  | 'normal'
  | 'stench'
  | 'family'
  | 'brat'
  | 'couple'
  | 'angry'
  | 'luggage';

export interface PassengerDef {
  kind: PassengerKind;
  /** Body colour */
  color: number;
  /** Relative mass / push resistance */
  mass: number;
  /** Radius of influence (world units) */
  radius: number;
  /** Special flags */
  auraSlow?: number;
  zigzag?: boolean;
  shoveInterval?: number;
  shoveForce?: number;
  cluster?: boolean;
  widthMul?: number;
  linkPair?: boolean;
}

export const PASSENGER_DEFS: Record<PassengerKind, PassengerDef> = {
  normal: {
    kind: 'normal',
    color: 0x6b7c93,
    mass: 1,
    radius: 0.35,
  },
  stench: {
    kind: 'stench',
    color: 0x6b8f3a,
    mass: 1.1,
    radius: 0.38,
    auraSlow: 0.45,
  },
  family: {
    kind: 'family',
    color: 0xe8b84a,
    mass: 1.4,
    radius: 0.4,
    cluster: true,
  },
  brat: {
    kind: 'brat',
    color: 0xff4fa3,
    mass: 0.7,
    radius: 0.28,
    zigzag: true,
  },
  couple: {
    kind: 'couple',
    color: 0xc43b8c,
    mass: 1.6,
    radius: 0.42,
    widthMul: 1.8,
    linkPair: true,
  },
  angry: {
    kind: 'angry',
    color: 0xc62828,
    mass: 1.5,
    radius: 0.4,
    shoveInterval: 2.2,
    shoveForce: 2.8,
  },
  luggage: {
    kind: 'luggage',
    color: 0x6d4c41,
    mass: 2.4,
    radius: 0.5,
    widthMul: 1.3,
  },
};
