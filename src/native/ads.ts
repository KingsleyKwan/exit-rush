/**
 * AdMob interstitials (iOS store builds only).
 *
 * Rules: first clear of L20/30/40… only; skip if entitlements().interstitialsOff();
 * web never shows; fail quietly on load/show errors.
 *
 * Default unit / Info.plist App ID are Google's public demo IDs for TestFlight.
 * Replace with real AdMob IDs before production (see docs/APP_STORE.md).
 */
import { IS_STORE_BUILD } from '../game/platform';
import { entitlements } from '../game/entitlements';

/** Google iOS demo interstitial — safe for TestFlight; replace via VITE_ADMOB_INTERSTITIAL_ID. */
export const GOOGLE_TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/4411468910';

/** Google sample App ID — must match Info.plist GADApplicationIdentifier until real AdMob app exists. */
export const GOOGLE_TEST_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

let ready = false;
let prepared = false;
let preparing: Promise<boolean> | null = null;

function nativeRuntime(): boolean {
  try {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function interstitialUnitId(): string {
  const fromEnv = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID?.trim() ?? '';
  return fromEnv || GOOGLE_TEST_INTERSTITIAL_ID;
}

/** First-time clear of L20, L30, L40… (decade milestones from 20 up). */
export function shouldOfferInterstitial(level: number, wasFirstClear: boolean): boolean {
  if (!wasFirstClear) return false;
  if (!Number.isFinite(level) || level < 20) return false;
  return level % 10 === 0;
}

async function loadPlugin() {
  return import('@capacitor-community/admob');
}

/**
 * Initialize AdMob + lightweight UMP (no ATT). Call once from the native shell.
 * No-ops on web / non-store. Failures are swallowed so boot never breaks.
 */
export async function initAds(): Promise<void> {
  if (!IS_STORE_BUILD || !nativeRuntime()) return;
  if (ready) return;
  try {
    const { AdMob, AdmobConsentStatus } = await loadPlugin();
    await AdMob.initialize();
    try {
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm();
      }
      if (consent.canRequestAds === false) {
        ready = true;
        return;
      }
    } catch {
      /* UMP optional for v1 non-personalized path — still try to load ads */
    }
    ready = true;
    void prepareInterstitial();
  } catch {
    ready = false;
  }
}

/** Prefetch an interstitial (npa). Safe to call often; coalesces in-flight loads. */
export async function prepareInterstitial(): Promise<boolean> {
  if (!IS_STORE_BUILD || !nativeRuntime()) return false;
  if (entitlements().interstitialsOff()) return false;
  if (!ready) return false;
  if (prepared) return true;
  if (preparing) return preparing;
  preparing = (async () => {
    try {
      const { AdMob } = await loadPlugin();
      await AdMob.prepareInterstitial({
        adId: interstitialUnitId(),
        npa: true,
      });
      prepared = true;
      return true;
    } catch {
      prepared = false;
      return false;
    } finally {
      preparing = null;
    }
  })();
  return preparing;
}

/**
 * After a level clear: show interstitial only on first clear of L20/30/40…
 * when ads are allowed. Never blocks the win UI; failures are silent.
 */
export async function maybeShowInterstitialAfterClear(
  level: number,
  wasFirstClear: boolean,
): Promise<void> {
  if (!shouldOfferInterstitial(level, wasFirstClear)) return;
  if (!IS_STORE_BUILD || !nativeRuntime()) return;
  if (entitlements().interstitialsOff()) return;
  if (!ready) return;
  try {
    const ok = prepared || (await prepareInterstitial());
    if (!ok) return;
    const { AdMob } = await loadPlugin();
    prepared = false;
    await AdMob.showInterstitial();
  } catch {
    prepared = false;
  } finally {
    void prepareInterstitial();
  }
}
