import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuckerbrewer.golfscorecard',
  appName: 'Golf Scorecard',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#2d7a3a',
      showSpinner: false,
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
      backgroundColor: '#f8faf8',
    },
  },
  server: {
    url: 'http://10.2.1.202:5173',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#f8faf8',
  },
};

export default config;
