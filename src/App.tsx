import React, { useEffect, ErrorInfo, Component } from 'react';
import { IonApp, setupIonicReact, isPlatform, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel, IonPage, IonContent, IonSpinner } from '@ionic/react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { IonReactRouter } from '@ionic/react-router';
import { home, calendar, settings } from 'ionicons/icons';
import { useTheme, ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { SettingsProvider } from './contexts/SettingsContext';
import PasscodeGuard from './components/PasscodeGuard';

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
import PasscodeSetup from './pages/Auth/PasscodeSetup';
import PasscodeVerify from './pages/Auth/PasscodeVerify';
import EditOverall from './pages/EditOverall';
import AddTransact from './pages/AddTransact';
import MonthlyProgress from './pages/Progress/MonthlyProgress';
import WeeklyProgress from './pages/Progress/WeeklyProgress';
import Activities from './pages/Activities';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsOfService from './pages/Legal/TermsOfService';
import HelpAndSupport from './pages/HelpAndSupport';
import BugReport from './pages/HelpAndSupport/BugReport';
import Feedback from './pages/HelpAndSupport/Feedback';
import EmergencySupport from './pages/HelpAndSupport/EmergencySupport';

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <IonApp>
          <IonPage>
            <IonContent className="ion-padding">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%', 
                flexDirection: 'column', 
                gap: '16px',
                textAlign: 'center'
              }}>
                <h2>Something went wrong</h2>
                <p>Please restart the app</p>
                <button onClick={() => window.location.reload()}>
                  Reload App
                </button>
              </div>
            </IonContent>
          </IonPage>
        </IonApp>
      );
    }

    return this.props.children;
  }
}

// Initialize Ionic with safer settings
try {
  setupIonicReact({
    mode: 'md',
    rippleEffect: true,
    _forceStatusbarPadding: isPlatform('capacitor'),
  });
} catch (e) {
  console.warn('Ionic setup failed:', e);
}

// For status bar styling, use the StatusBar API (only on mobile)
const initializeStatusBar = async () => {
  if (isPlatform('capacitor')) {
    try {
      await StatusBar.setStyle({ style: 'DARK' });
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    } catch (e) {
      console.warn('StatusBar initialization failed:', e);
    }
  }
};

// Initialize status bar safely
initializeStatusBar();

// Protected Route component
interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  exact?: boolean;
  path: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, ...rest }) => {
  const { user, loading } = useAuth();
  
  return (
    <Route
      {...rest}
      render={(props) => {
        console.log('ProtectedRoute render:', { 
          loading, 
          hasUser: !!user, 
          pathname: props.location.pathname,
          userEmail: user?.email 
        });
        
        if (loading) {
          return (
            <IonPage>
              <IonContent className="ion-padding">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
                  <IonSpinner name="crescent" />
                  <div>Loading...</div>
                </div>
              </IonContent>
            </IonPage>
          );
        }
        
        if (!user) {
          return <Redirect to={{ pathname: '/auth', state: { from: props.location } }} />;
        }
        
        return <Component {...props} />;
      }}
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
          // Silently ignore StatusBar errors on web
        }
      }
    };

    setStatusBarStyle();
  }, [darkMode]);

  // Check if a tab is active
  const isTabActive = (path: string) => {
    return location.pathname === path || (path === '/home' && location.pathname === '/');
  };

  // If we're on the auth page, don't show tabs
  if (location.pathname === '/auth' || (location.pathname && location.pathname.startsWith('/auth/'))) {
    return (
      <IonRouterOutlet>
        <Route exact path="/auth" component={AuthPage} />
        <Route exact path="/auth/passcode-setup" component={PasscodeSetup} />
        <Route exact path="/auth/passcode-verify" component={PasscodeVerify} />
      </IonRouterOutlet>
    );
  }

  // For all other routes, show tabs
  return (
    <PasscodeGuard>
      <IonTabs>
        <IonRouterOutlet>
          <ProtectedRoute exact path="/home" component={Home} />
          <ProtectedRoute exact path="/calendar" component={CalendarPage} />
          <ProtectedRoute path="/settings" component={SettingsPage} />
          <ProtectedRoute path="/privacy-policy" component={PrivacyPolicy} />
          <ProtectedRoute path="/terms-of-service" component={TermsOfService} />
          <ProtectedRoute exact path="/progress/monthly" component={MonthlyProgress} />
          <ProtectedRoute exact path="/progress/weekly" component={WeeklyProgress} />
          <ProtectedRoute exact path="/activities" component={Activities} />
          <Route path="/auth" component={AuthPage} />
          <ProtectedRoute exact path="/add-transact" component={AddTransact} />
          <ProtectedRoute exact path="/edit-overall/:date" component={EditOverall} />
          <ProtectedRoute exact path="/help-support" component={HelpAndSupport} />
          <ProtectedRoute exact path="/report-bug" component={BugReport} />
          <ProtectedRoute exact path="/feedback" component={Feedback} />
          <ProtectedRoute exact path="/emergency" component={EmergencySupport} />
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
    </PasscodeGuard>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Set up status bar with better error handling
    const setupStatusBar = async () => {
      if (isPlatform('capacitor')) {
        try {
          await StatusBar.setStyle({ 
            style: 'DARK'
          });
          await StatusBar.setBackgroundColor({ 
            color: '#1a1a1a'
          });
        } catch (e) {
          console.warn('StatusBar setup failed:', e);
        }
      }
      
      // Hide splash screen with delay and error handling
      try {
        if (isPlatform('capacitor')) {
          setTimeout(async () => {
            try {
              await SplashScreen.hide();
            } catch (e) {
              console.warn('SplashScreen hide failed:', e);
            }
          }, 500);
        }
      } catch (e) {
        console.warn('SplashScreen initialization failed:', e);
      }
    };
    
    setupStatusBar();
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
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
