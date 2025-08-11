import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inventoryos.home',
  appName: 'Inventory OS Home',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
      overlaysWebView: false
    },
    Filesystem: {
      ioTimeout: 60000
    },
    Network: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    loggingBehavior: 'debug',
    hideLogs: false,
    backgroundColor: '#000000',
    toolbarColor: '#000000'
  },
  ios: {
    scheme: 'Inventory OS Home',
    contentInset: 'never'
  }
};

export default config;