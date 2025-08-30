import React, { useEffect } from 'react';
import { IonApp, setupIonicReact, isPlatform, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/react';
import { Route, Redirect, useLocation, RouteProps, RouteComponentProps } from 'react-router-dom';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { IonReactRouter } from '@ionic/react-router';
import { home, calendar, settings } from 'ionicons/icons';
import { useTheme, ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';

declare global {
  interface Window {
    __theme?: string;
    __setTheme?: (theme: string) => void;
  }
}

// Core CSS required for Ionic components
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

// Optional CSS utils
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

// Theme variables
import './theme/variables.css';
import './App.css'; // Add custom styles

// Pages
import Home from './pages/Home';
import CalendarPage from './pages/Calendar';
import SettingsPage from './pages/Settings';
import AuthPage from './pages/Auth';
import EditOverall from './pages/EditOverall';
import { EditInfo } from './pages/EditInfo';

// Initialize Ionic
setupIonicReact({
  mode: 'md',
  rippleEffect: true,
  _forceStatusbarPadding: true,
});

// For status bar styling, use the StatusBar API
StatusBar.setStyle({ style: 'DARK' });  // or 'LIGHT'
StatusBar.setBackgroundColor({ color: '#00000000' }); // For transparent

// Private route component
interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<RouteComponentProps>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
  const isAuthenticated = true; // Replace with your auth logic

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect
            to={{
              pathname: '/auth',
              state: { from: props.location }
            }}
          />
        )
      }
    />
  );
};

// App routes component
const AppRoutes: React.FC = () => {
  const location = useLocation();
  const { darkMode } = useTheme();

  // Set status bar style based on theme
  useEffect(() => {
    const setStatusBarStyle = async () => {
      if (isPlatform('capacitor')) {
        try {
          await StatusBar.setStyle({
            style: darkMode ? 'DARK' : 'LIGHT'
          });
        } catch (e) {
          console.warn('StatusBar could not be styled', e);
        }
      }
    };

    setStatusBarStyle();
  }, [darkMode]);

  // Check if a tab is active
  const isTabActive = (path: string) => {
    return location.pathname === path || (path === '/home' && location.pathname === '/');
  };

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/home" component={Home} />
        <Route exact path="/calendar" component={CalendarPage} />
        <Route exact path="/settings" component={SettingsPage} />
        <Route exact path="/auth" component={AuthPage} />
        <Route exact path="/edit-transaction/:date" component={EditInfo} />
        <Route exact path="/edit-overall/:date" component={EditOverall} />
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="tab-bar">
        <IonTabButton tab="home" href="/home" className={isTabActive('/home') ? 'tab-active' : ''}>
          <IonIcon icon={home} className={isTabActive('/home') ? 'tab-icon-active' : 'tab-icon'} />
          <IonLabel className={isTabActive('/home') ? 'tab-label-active' : 'tab-label'}>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="calendar" href="/calendar" className={isTabActive('/calendar') ? 'tab-active' : ''}>
          <IonIcon icon={calendar} className={isTabActive('/calendar') ? 'tab-icon-active' : 'tab-icon'} />
          <IonLabel className={isTabActive('/calendar') ? 'tab-label-active' : 'tab-label'}>Calendar</IonLabel>
        </IonTabButton>
        <IonTabButton tab="settings" href="/settings" className={isTabActive('/settings') ? 'tab-active' : ''}>
          <IonIcon icon={settings} className={isTabActive('/settings') ? 'tab-icon-active' : 'tab-icon'} />
          <IonLabel className={isTabActive('/settings') ? 'tab-label-active' : 'tab-label'}>Settings</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

const App: React.FC = () => {
  // Use the theme context
  const { darkMode } = useTheme();
  
  useEffect(() => {
    // Set up status bar
    const setupStatusBar = async () => {
      if (isPlatform('hybrid')) {
        await StatusBar.setStyle({ 
          style: darkMode ? 'DARK' : 'LIGHT'
        });
        await StatusBar.setBackgroundColor({ 
          color: darkMode ? '#1a1a1a' : '#f8f9fa' 
        });
        await SplashScreen.hide();
        
        // Apply theme class to document body
        document.body.classList.toggle('dark', darkMode);
      }
    };
    
    setupStatusBar();
  }, [darkMode]);

  return (
    <IonApp>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </IonApp>
  );
};

// Wrap the app with ThemeProvider
const ThemedApp: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ThemeProvider>
  );
};
export default ThemedApp;
