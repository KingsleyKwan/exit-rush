/// <reference types="vite/client" />

declare const __PLATFORM__: 'web' | 'ios';

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: 'web' | 'ios';
  readonly VITE_REVENUECAT_IOS_KEY?: string;
  /** AdMob interstitial unit id. Defaults to Google's iOS demo unit when unset. */
  readonly VITE_ADMOB_INTERSTITIAL_ID?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
