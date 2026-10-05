/**
 * Guarded haptics via navigator.vibrate (Android Chrome etc.; iOS Safari ignores it).
 * Throttled so rapid bumps don't spam the motor.
 */
let last = 0;
let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export function haptic(pattern: number | number[], minGapMs = 45): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - last < minGapMs) return;
  last = now;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw before user activation */
  }
}
