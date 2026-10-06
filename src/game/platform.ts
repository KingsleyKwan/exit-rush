/**
 * Compile-time platform flag. Default `web` = GitHub Pages / local demo (everything unlocked).
 * Capacitor iOS builds set VITE_PLATFORM=ios (see docs/GROK_BUILD_PROMPT.md).
 */
declare const __PLATFORM__: 'web' | 'ios';

export type PlatformId = 'web' | 'ios';

export const PLATFORM: PlatformId =
  typeof __PLATFORM__ !== 'undefined' ? __PLATFORM__ : ((import.meta as ImportMeta & { env?: { VITE_PLATFORM?: string } }).env?.VITE_PLATFORM === 'ios' ? 'ios' : 'web');

/** True when Capacitor (or similar) is hosting us. Fail-closed: native shell never gets the unlocked web demo. */
function isNativeShell(): boolean {
  try {
    const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    return !!w.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/**
 * Paid locks apply on iOS builds OR any native shell (even if a web bundle was somehow loaded).
 * Web/Pages demo: unlocked, no IAP UI.
 */
export const IS_STORE_BUILD = PLATFORM === 'ios' || isNativeShell();

if (typeof console !== 'undefined' && isNativeShell() && PLATFORM === 'web') {
  console.warn('[exit-rush] Native shell loaded a web bundle — fail-closed to store locks.');
}
