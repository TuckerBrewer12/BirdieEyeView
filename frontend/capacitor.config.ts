import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

// The native build cannot read CSS, so the splash and status bar colours copy
// primary and background from src/brand/theme/tokens.ts; tokens.test.ts keeps them equal.
const config: CapacitorConfig = {
  appId: 'com.tuckerbrewer.golfscorecard',
  appName: 'Golf Scorecard',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#1f6e3c',
      showSpinner: false,
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
      backgroundColor: '#f5f6f3',
    },
  },
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
        },
      }
    : {}),
  ios: {
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#f5f6f3',
  },
};

export default config;
