import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kingsleykwan.exitrush',
  appName: '逼落車',
  webDir: 'dist',
  backgroundColor: '#141820',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: '#141820',
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 600,
      backgroundColor: '#141820',
      showSpinner: false,
    },
  },
};

export default config;
