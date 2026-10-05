import { applyImpulse, createBody, type Body, type World } from './Physics';
import { PASSENGER_DEFS, type PassengerKind } from '../PassengerTypes';
import { crowdCount, type LevelDef } from '../levels';
import { TUNING } from './tuning';
import type { Emit } from './events';
import type { Rng } from './rng';

export type AgentMode = 'rider' | 'boarder';

export interface Agent {
  id: number;
  kind: PassengerKind;
  body: Body;
  mode: AgentMode;
  /** Standing spot riders spring back to. */
  homeX: number;
  homeZ: number;
  /** Boarders: final spot inside the car. */
  goalX: number;
  goalZ: number;
  /** Boarders: x they aim for when funnelling through the doorway. */
  doorX: number;
  displacedT: number;
  stuckT: number;
  age: number;
  partner: Agent | null;
  clusterId: number;
  isKid: boolean;
  caseBody: Body | null;
  phase: number;
  zig: number;
  dartT: number;
  shoveCd: number;
  /** Angry wind-up time remaining (s); < 0 = idle. */
  windup: number;
  /** Visual bump accumulator (view consumes and zeroes it). */
  bumpAcc: number;
  /** Visual scale of the figure. */
  scale: number;
}
