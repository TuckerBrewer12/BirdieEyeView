import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

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
      backgroundColor: '#f3f4ef',
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
    backgroundColor: '#f3f4ef',
  },
};

export default config;
