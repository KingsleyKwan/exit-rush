/// <reference types="vite/client" />

declare const __PLATFORM__: 'web' | 'ios';

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: 'web' | 'ios';
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
