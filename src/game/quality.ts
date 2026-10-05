import type { QualityLevel, QualitySetting } from './storage';

/**
 * Graphics quality tiers.
 *  - high: current look — antialias, PCF shadow map, pixelRatio min(DPR, 2)
 *  - low:  no shadow map (blob shadows stay), no antialias, pixelRatio 1
 *
 * `auto` starts from a device-hint guess and is then confirmed by a short FPS
 * probe; the probe result is cached in the save so later launches start on the
 * right tier (antialias can only be chosen when the WebGL context is created).
 */

/** Frame-rate below which the probe drops `high` → `low`. */
export const PROBE_MIN_FPS = 45;

interface NavHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/** Best guess before any frames are measured. */
export function guessQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'high';
  const nav = navigator as Navigator & NavHints;
  const dpr = window.devicePixelRatio || 1;
  const mem = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;
  // Low-RAM / few-core devices: mid-range Android territory.
  if (mem !== undefined && mem <= 4) return 'low';
  if (cores !== undefined && cores <= 4) return 'low';
  // Very dense screens push far more fragments; only trust them with plenty of cores.
  if (dpr >= 3 && cores !== undefined && cores <= 6) return 'low';
  return 'high';
}

export function resolveQuality(setting: QualitySetting, cachedAuto: QualityLevel | null): QualityLevel {
  if (setting === 'low' || setting === 'high') return setting;
  return cachedAuto ?? guessQuality();
}

export function pixelRatioFor(q: QualityLevel): number {
  if (q === 'low') return 1;
  return Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
}

/** Measures average FPS over a short window, ignoring warm-up and tab hiccups. */
export class FpsProbe {
  private warm = 0;
  private t = 0;
  private frames = 0;
  done = false;

  constructor(
    private readonly warmup = 1,
    private readonly span = 2.5,
  ) {}

  reset(): void {
    this.warm = 0;
    this.t = 0;
    this.frames = 0;
    this.done = false;
  }

  /** Restart measuring (keeps `done`), e.g. after the tab was hidden. */
  restart(): void {
    this.warm = 0;
    this.t = 0;
    this.frames = 0;
  }

  /** Feed the raw (unclamped) frame delta in seconds. Returns avg FPS once finished. */
  sample(rawDt: number): number | null {
    if (this.done) return null;
    if (rawDt <= 0) return null;
    if (rawDt > 0.5) {
      this.restart(); // stall / background — not representative
      return null;
    }
    if (this.warm < this.warmup) {
      this.warm += rawDt;
      return null;
    }
    this.t += rawDt;
    this.frames++;
    if (this.t >= this.span) {
      this.done = true;
      return this.frames / this.t;
    }
    return null;
  }
}
