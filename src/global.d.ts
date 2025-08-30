/// <reference types="react-scripts" />

declare module 'react-native-gesture-handler' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface GestureHandlerRootViewProps extends ViewProps {
    children?: React.ReactNode;
  }

  const GestureHandlerRootView: ComponentType<GestureHandlerRootViewProps>;
  
  export { GestureHandlerRootView };
  // Add other exports as needed
}

declare module 'react-native-safe-area-context' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface SafeAreaProviderProps extends ViewProps {
    children?: React.ReactNode;
    initialMetrics?: any;
  }

  const SafeAreaProvider: ComponentType<SafeAreaProviderProps>;
  
  export { SafeAreaProvider };
  // Add other exports as needed
}
