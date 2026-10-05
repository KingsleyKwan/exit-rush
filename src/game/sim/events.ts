export type UltKind = 'str' | 'spd' | 'sta';

/** Gameplay events emitted by the sim; the view layer turns them into juice. */
export type SimEvent =
  | { t: 'bump'; x: number; z: number; power: number; player: boolean }
  | { t: 'shove'; x: number; z: number; dx: number; dz: number; power: number; hits: number }
  | { t: 'shoveHit'; x: number; z: number; power: number; agentId: number }
  | { t: 'angryWindup'; agentId: number }
  | { t: 'angryHit'; x: number; z: number; dx: number; dz: number; power: number }
  | { t: 'ult'; kind: UltKind; x: number; z: number; dx: number; dz: number }
  | { t: 'milestone'; pct: number }
  | { t: 'winded' }
  | { t: 'win' }
  | { t: 'lose' };

export type Emit = (e: SimEvent) => void;
