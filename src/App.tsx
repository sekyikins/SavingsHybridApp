import React, { useEffect } from 'react';
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

// Initialize Ionic
setupIonicReact({
  mode: 'md',
  rippleEffect: true,
  _forceStatusbarPadding: true,
});

// For status bar styling, use the StatusBar API (only on mobile)
if (isPlatform('capacitor')) {
  StatusBar.setStyle({ style: 'DARK' }).catch(e => console.warn('StatusBar setStyle failed:', e));
  StatusBar.setBackgroundColor({ color: '#00000000' }).catch(e => console.warn('StatusBar setBackgroundColor failed:', e));
}

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
    // Set up status bar
    const setupStatusBar = async () => {
      if (isPlatform('hybrid')) {
        try {
          await StatusBar.setStyle({ 
            style: 'DARK'
          });
          await StatusBar.setBackgroundColor({ 
            color: '#1a1a1a'
          });
          await SplashScreen.hide();
        } catch (e) {
          // Silently ignore StatusBar/SplashScreen errors
        }
      } else {
        // Hide splash screen on web after a delay
        setTimeout(() => SplashScreen.hide().catch(() => {}), 100);
      }
    };
    
    setupStatusBar();
  }, []);

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
