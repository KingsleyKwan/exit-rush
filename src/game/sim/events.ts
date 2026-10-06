export type UltKind = 'str' | 'spd' | 'sta';

export type SpellElement = 'fire' | 'ice' | 'volt';

/** Gameplay events emitted by the sim; the view layer turns them into juice. */
export type SimEvent =
  | { t: 'bump'; x: number; z: number; power: number; player: boolean }
  | { t: 'shove'; x: number; z: number; dx: number; dz: number; power: number; hits: number }
  | { t: 'shoveHit'; x: number; z: number; power: number; agentId: number }
  | { t: 'angryWindup'; agentId: number }
  | { t: 'angryHit'; x: number; z: number; dx: number; dz: number; power: number }
  | { t: 'ult'; kind: UltKind; x: number; z: number; dx: number; dz: number }
  | { t: 'bossBounce'; x: number; z: number; dx: number; dz: number; power: number }
  | { t: 'bossYield'; x: number; z: number; agentId: number }
  | { t: 'milestone'; pct: number }
  | { t: 'winded' }
  | { t: 'win' }
  | { t: 'lose' }
  // v0.8 mage
  | { t: 'cast'; ability: string; x: number; z: number; dx: number; dz: number; el: SpellElement }
  | { t: 'status'; agentId: number; kind: string; until: number }
  | { t: 'chain'; pts: { x: number; z: number }[] }
  | { t: 'gadget'; id: string; x: number; z: number }
  | { t: 'coins'; amount: number; kind: string };

export type Emit = (e: SimEvent) => void;
