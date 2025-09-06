import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.savings.app',
  appName: 'Savings App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    StatusBar: {
      style: 'DARK',
      overlay: true
    }
  },
  ios: {
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    loggingBehavior: 'debug',
    allowsLinkPreview: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    buildOptions: {
      keystorePath: 'keystore/upload-keystore.jks',
      keystoreAlias: 'upload'
    }
  }
};

export default config;
