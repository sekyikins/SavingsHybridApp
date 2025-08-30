import 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Add any custom HTML attributes here if needed
  }
}

declare module '@ionic/react' {
  // Add any custom Ionic React module augmentations here if needed
}

// This tells TypeScript about the JSX runtime
declare namespace JSX {
  interface IntrinsicElements {
    // Add any custom JSX elements here if needed
  }
}
