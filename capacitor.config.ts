const config = {
  appId: 'com.savings.app',
  appName: 'Savings App',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  ios: {
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    hideLogs: false,
    allowsLinkPreview: true,
    scrollToInput: true,
    statusBar: {
      style: 'DARK',
      overlay: true
    }
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
