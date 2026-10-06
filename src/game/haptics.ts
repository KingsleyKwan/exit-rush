/**
 * Guarded haptics via navigator.vibrate (Android Chrome etc.; iOS Safari ignores it).
 * Throttled so rapid bumps don't spam the motor.
 */
let last = 0;
let enabled = true;
let native: ((pattern: number | number[]) => void) | null = null;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

/** Installed by the Capacitor shell. Web keeps using navigator.vibrate. */
export function setNativeHaptics(fn: ((pattern: number | number[]) => void) | null): void {
  native = fn;
}

export function haptic(pattern: number | number[], minGapMs = 45): void {
  if (!enabled) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - last < minGapMs) return;
  last = now;
  if (native) {
    try {
      native(pattern);
    } catch {
      /* plugin missing */
    }
    return;
  }
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw before user activation */
  }
}
