/// <reference types="vite/client" />

declare const __PLATFORM__: 'web' | 'ios';

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: 'web' | 'ios';
  readonly VITE_REVENUECAT_IOS_KEY?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
