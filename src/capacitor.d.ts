/// <reference types="@capacitor/status-bar" />
/// <reference types="@capacitor/splash-screen" />

declare module '@capacitor/status-bar' {
  export interface StatusBarPlugin {
    setStyle(options: { style: 'DARK' | 'LIGHT' }): Promise<void>;
    setBackgroundColor(options: { color: string }): Promise<void>;
  }
  
  const StatusBar: StatusBarPlugin;
  export { StatusBar };
}

declare module '@capacitor/splash-screen' {
  export interface SplashScreenPlugin {
    hide(): Promise<void>;
    show(): Promise<void>;
  }
  
  const SplashScreen: SplashScreenPlugin;
  export { SplashScreen };
}
