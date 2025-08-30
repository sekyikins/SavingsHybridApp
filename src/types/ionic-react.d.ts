import { JSX as IonicJSX } from '@ionic/core';
import { JSX as IoniconsJSX } from 'ionicons';
import { ReactNode, ComponentProps } from 'react';

declare module '@ionic/react' {
  // Base interface for all Ionic components to extend
  interface IonicReactProps {
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    slot?: string;
  }

  // Button component
  interface IonButtonProps extends Omit<IonicJSX.IonButton, 'children' | 'onClick'>, IonicReactProps {
    onClick?: (event: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => void;
    fill?: 'clear' | 'outline' | 'solid' | 'default';
    routerLink?: string;
    routerDirection?: 'none' | 'forward' | 'back' | 'root';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    'aria-label'?: string;
  }

  // Icon component
  interface IonIconProps extends Omit<IonicJSX.IonIcon, 'icon' | 'slot'>, IonicReactProps {
    icon: string;
    slot?: 'icon-only' | string;
    color?: string;
    size?: 'small' | 'large' | string;
  }

  // Header component
  interface IonHeaderProps extends Omit<IonicJSX.IonHeader, 'children'>, IonicReactProps {}

  // Toolbar component
  interface IonToolbarProps extends Omit<IonicJSX.IonToolbar, 'children'>, IonicReactProps {}

  // Buttons container component
  interface IonButtonsProps extends Omit<IonicJSX.IonButtons, 'children'>, IonicReactProps {
    slot?: 'start' | 'end' | 'primary' | 'secondary' | string;
  }

  // Menu button component
  interface IonMenuButtonProps extends Omit<IonicJSX.IonMenuButton, 'children'>, IonicReactProps {
    menu?: string;
    autoHide?: boolean;
  }

  // Title component
  interface IonTitleProps extends Omit<IonicJSX.IonTitle, 'children'>, IonicReactProps {}

  // Content component
  interface IonContentProps extends Omit<IonicJSX.IonContent, 'children'>, IonicReactProps {
    fullscreen?: boolean;
    scrollEvents?: boolean;
    scrollY?: boolean;
    scrollX?: boolean;
    forceOverscroll?: boolean;
    scrollbarX?: boolean;
    scrollbarY?: boolean;
  }

  // Card components
  interface IonCardProps extends Omit<IonicJSX.IonCard, 'children'>, IonicReactProps {
    button?: boolean;
    href?: string;
    routerLink?: string;
  }

  interface IonCardHeaderProps extends Omit<IonicJSX.IonCardHeader, 'children'>, IonicReactProps {}
  interface IonCardTitleProps extends Omit<IonicJSX.IonCardTitle, 'children'>, IonicReactProps {}
  interface IonCardContentProps extends Omit<IonicJSX.IonCardContent, 'children'>, IonicReactProps {}

  // Re-export the components with the correct props
  // Grid components
  export const IonGrid: React.FC<IonicReactProps>;
  export const IonRow: React.FC<IonicReactProps>;
  export const IonCol: React.FC<{ size?: string; sizeSm?: string; sizeMd?: string; sizeLg?: string; sizeXl?: string } & IonicReactProps>;
  
  // Navigation components
  export const IonButton: React.FC<IonButtonProps>;
  export const IonIcon: React.FC<IonIconProps>;
  export const IonHeader: React.FC<IonHeaderProps>;
  export const IonContent: React.FC<IonContentProps>;
  export const IonPage: React.FC<IonicReactProps>;
  export const IonToolbar: React.FC<IonToolbarProps>;
  export const IonTitle: React.FC<IonTitleProps>;
  export const IonButtons: React.FC<IonButtonsProps>;
  export const IonMenuButton: React.FC<IonMenuButtonProps>;
  
  // Card components
  export const IonCard: React.FC<IonCardProps>;
  export const IonCardHeader: React.FC<IonCardHeaderProps>;
  export const IonCardTitle: React.FC<IonCardTitleProps>;
  export const IonCardContent: React.FC<IonCardContentProps>;
  
  // Form components
  export const IonInput: React.FC<{
    value?: string | number | null;
    onIonChange?: (event: CustomEvent) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    inputMode?: string;
    autoCapitalize?: string;
    autoCorrect?: string;
    minlength?: number;
  } & IonicReactProps>;
  
  export const IonLabel: React.FC<{
    position?: 'fixed' | 'stacked' | 'floating';
  } & IonicReactProps>;
  
  export const IonItem: React.FC<{
    button?: boolean;
    detail?: boolean;
    detailIcon?: string;
    lines?: 'full' | 'inset' | 'none';
    color?: string;
    onClick?: (event: React.MouseEvent<HTMLIonItemElement, MouseEvent>) => void;
  } & IonicReactProps>;
  
  export const IonList: React.FC<{
    lines?: 'full' | 'inset' | 'none';
  } & IonicReactProps>;
  
  export const IonToggle: React.FC<{
    checked: boolean;
    onIonChange: (event: CustomEvent) => void;
    disabled?: boolean;
  } & IonicReactProps>;
  
  export const IonNote: React.FC<{
    color?: string;
  } & IonicReactProps>;
  
  // Feedback components
  export const IonLoading: React.FC<{
    isOpen: boolean;
    message?: string;
    duration?: number;
    onDidDismiss?: () => void;
  } & IonicReactProps>;
  
  export const IonAlert: React.FC<{
    isOpen: boolean;
    onDidDismiss: (event: CustomEvent) => void;
    header?: string;
    message?: string;
    buttons?: (string | {
      text: string;
      role?: string;
      handler?: (value: any) => boolean | void | { [key: string]: any };
    })[];
    inputs?: Array<{
      name: string;
      type: string;
      placeholder?: string;
      value?: any;
    }>;
  } & IonicReactProps>;
  
  export const IonText: React.FC<{
    color?: string;
  } & IonicReactProps>;
  
  // Utility components
  export const IonBackButton: React.FC<{
    defaultHref?: string;
    icon?: string;
    text?: string;
  } & IonicReactProps>;
  
  export const IonSpinner: React.FC<{
    name?: 'circular' | 'bubbles' | 'circles' | 'crescent' | 'dots' | 'lines' | 'lines-sharp' | 'lines-sharp-small' | 'lines-small';
    paused?: boolean;
    duration?: number;
  } & IonicReactProps>;
  export const IonToolbar: React.FC<IonToolbarProps>;
  export const IonButtons: React.FC<IonButtonsProps>;
  export const IonMenuButton: React.FC<IonMenuButtonProps>;
  export const IonTitle: React.FC<IonTitleProps>;
  export const IonContent: React.FC<IonContentProps>;
  export const IonCard: React.FC<IonCardProps>;
  export const IonCardHeader: React.FC<IonCardHeaderProps>;
  export const IonCardTitle: React.FC<IonCardTitleProps>;
  export const IonCardContent: React.FC<IonCardContentProps>;
}
