import React, { useState } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonToggle, 
  IonIcon,
  IonNote,
  useIonAlert,
  useIonToast,
  IonListHeader
} from '@ionic/react';
import { 
  moon, 
  notifications, 
  mail, 
  card, 
  shieldCheckmark, 
  helpCircle, 
  logOut,
  trash,
  personCircle,
  documentText,
  cog,
  warning,
  informationCircle,
  keypad,
  fingerPrint
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useBiometrics } from '../../hooks/useBiometrics';
import { passcodeService } from '../../services/passcodeService';
import { logger } from '../../utils/debugLogger';
import './Settings.css';

interface UserProfile {
  name: string;
  email: string;
  initials: string;
}

interface Settings {
  darkMode: boolean;
  notifications: boolean;
  emailNotifications: boolean;
  biometricAuth: boolean;
  calendar: {
    startOfWeek: 'sunday' | 'monday';
    defaultView: 'month' | 'week';
  };
  currency: string;
  language: string;
}

interface LocationState {
  user?: UserProfile;
  from?: {
    pathname: string;
  };
}

interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: string;
  color?: string;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ 
  title, 
  children,
  className = '',
  icon,
  color = 'primary'
}) => {
  return (
    <div className={`settings-group ${className}`}>
      <IonListHeader className="settings-group-header">
        {icon && (
          <IonIcon 
            icon={icon} 
            color={color} 
            slot="start" 
            style={{ marginRight: '8px' }} 
          />
        )}
        <IonLabel>{title}</IonLabel>
      </IonListHeader>
      <div className="settings-group-content">
        {children}
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();
  const { signOut } = useAuth();
  
  // Get user from auth context and fetch additional profile data
  const { user: authUser, loading: authLoading } = useAuth();
  
  // Component mount logging
  React.useEffect(() => {
    logger.componentMount('SettingsPage', { 
      hasAuthUser: !!authUser, 
      authLoading, 
      userEmail: authUser?.email 
    });
    
    return () => {
      logger.componentUnmount('SettingsPage');
    };
  }, []);
  
  const [user, setUser] = useState<UserProfile>({
    name: 'Loading...',
    email: authUser?.email || '',
    initials: ''
  });

  // Theme state - ALWAYS call this hook
  const { darkMode, toggleDarkMode } = useTheme();
  
  // Settings state - ALWAYS call this hook
  const [settings, setSettings] = useState<Omit<Settings, 'darkMode'>>({
    notifications: true,
    emailNotifications: true,
    biometricAuth: false,
    currency: 'USD',
    language: 'en',
    calendar: {
      startOfWeek: 'monday',
      defaultView: 'month'
    }
  });

  // Load user profile data from Supabase - ALWAYS call this effect
  React.useEffect(() => {
    const loadUserProfile = async () => {
      logger.auth('Loading user profile in Settings', { 
        hasAuthUser: !!authUser, 
        authLoading, 
        userEmail: authUser?.email 
      });
      
      if (!authUser) {
        logger.auth('No auth user found, skipping profile load');
        return;
      }
      
      try {
        // Get user metadata from auth
        const firstName = authUser.user_metadata?.firstName || '';
        const lastName = authUser.user_metadata?.lastName || '';
        const fullName = authUser.user_metadata?.full_name || `${firstName} ${lastName}`.trim();
        
        const displayName = fullName || authUser.email?.split('@')[0] || 'User';
        const initials = firstName && lastName 
          ? `${firstName[0]}${lastName[0]}`.toUpperCase()
          : displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        
        setUser({
          name: displayName,
          email: authUser.email || '',
          initials: initials
        });
        
        logger.auth('User profile loaded successfully', { 
          displayName, 
          initials, 
          email: authUser.email 
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to basic user info
        setUser({
          name: authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          initials: (authUser.email?.split('@')[0] || 'U').slice(0, 2).toUpperCase()
        });
      }
    };
    
    loadUserProfile();
  }, [authUser, authLoading]);

  // Debug current state
  logger.auth('Settings page render state', { 
    authLoading, 
    hasAuthUser: !!authUser, 
    userEmail: authUser?.email,
    pathname: location.pathname
  });

  // Show loading state while auth is loading
  if (authLoading) {
    logger.auth('Settings page showing loading state', { authLoading });
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle style={{ textAlign: 'center', width: '100%' }}>Settings</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>Loading your settings...</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Redirect to auth if no user after loading is complete
  if (!authLoading && !authUser) {
    logger.auth('No authenticated user, redirecting to auth');
    history.replace('/auth');
    return null;
  }

  // Additional safety check
  if (!authUser) {
    logger.auth('AuthUser is null, showing fallback');
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle style={{ textAlign: 'center', width: '100%' }}>Settings</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>Authentication required...</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const toggleSetting = (key: keyof Settings, subKey?: keyof Settings['calendar']) => {
    if (key === 'darkMode') {
      // Toggle the theme
      const newDarkMode = !darkMode;
      toggleDarkMode();
      
      // Show toast with the new theme state
      presentToast({
        message: `${newDarkMode ? 'Dark' : 'Light'} mode enabled`,
        duration: 1500,
        position: 'top',
        color: 'primary',
        cssClass: 'theme-toast'
      });
    } else if (key === 'calendar' && subKey) {
      // Handle nested calendar settings
      setSettings(prev => ({
        ...prev,
        calendar: {
          ...prev.calendar,
          [subKey]: prev.calendar[subKey] === 'monday' ? 'sunday' : 'monday'
        }
      }));
    } else if (key in settings) {
      // Handle other top-level settings
      setSettings(prev => ({ ...prev, [key]: !(prev as any)[key] }));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      presentToast({
        message: 'Successfully logged out',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      history.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      presentToast({
        message: 'Error signing out. Please try again.',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
    }
  };

  const handleDeleteAccount = () => {
    presentAlert({
      header: 'Delete Account',
      message: 'This action cannot be undone. All your data will be permanently deleted.',
      inputs: [
        {
          name: 'confirmText',
          type: 'text',
          placeholder: 'Type "DELETE" to confirm',
          attributes: {
            required: true
          }
        }
      ],
      buttons: [
        'Cancel',
        {
          text: 'Delete',
          role: 'destructive',
          handler: async (data: { confirmText: string }) => {
            if (data.confirmText === 'DELETE') {
              try {
                // In a real app, call your account deletion API here
                // await deleteAccount();
                
                // Sign out after deletion
                const { error: signOutError } = await signOut();
                if (signOutError) {
                  console.error('Sign out after deletion error:', signOutError);
                  presentToast({
                    message: signOutError.message || 'Failed to sign out after account deletion',
                    duration: 3000,
                    position: 'top',
                    color: 'danger'
                  });
                  return false;
                }
                
                presentToast({
                  message: 'Account deleted successfully',
                  duration: 2000,
                  position: 'top',
                  color: 'success'
                });
                
                history.replace('/auth');
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
                console.error('Account deletion error:', errorMessage);
                presentToast({
                  message: errorMessage,
                  duration: 3000,
                  position: 'top',
                  color: 'danger'
                });
                return false;
              }
            } else {
              presentToast({
                message: 'Please type DELETE to confirm',
                position: 'top',
                duration: 2000,
                color: 'warning'
              });
              return false;
            }
          }
        }
      ]
    });
  };

  const handleChangePasscode = async () => {
    const { present } = useIonAlert();
    const [showAlert, setShowAlert] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');

    const handlePasscodeChange = (event: CustomEvent) => {
      setPasscode(event.detail.value);
    };

    const handleConfirmPasscodeChange = (event: CustomEvent) => {
      setConfirmPasscode(event.detail.value);
    };

    const handleSavePasscode = async () => {
      if (passcode !== confirmPasscode) {
        presentToast({
          message: 'Passcodes do not match',
          duration: 2000,
          position: 'top',
          color: 'danger'
        });
        return;
      }

      try {
        await passcodeService.setPasscode(passcode);
        presentToast({
          message: 'Passcode changed successfully',
          duration: 2000,
          position: 'top',
          color: 'success'
        });
      } catch (error) {
        presentToast({
          message: 'Failed to change passcode',
          duration: 2000,
          position: 'top',
          color: 'danger'
        });
      }
    };

    setShowAlert(true);

    present({
      header: 'Change Passcode',
      inputs: [
        {
          name: 'passcode',
          type: 'password',
          placeholder: 'Enter new passcode',
          attributes: {
            required: true
          }
        },
        {
          name: 'confirmPasscode',
          type: 'password',
          placeholder: 'Confirm new passcode',
          attributes: {
            required: true
          }
        }
      ],
      buttons: [
        'Cancel',
        {
          text: 'Save',
          handler: handleSavePasscode
        }
      ],
      onWillDismiss: () => setShowAlert(false)
    });
  };

  logger.auth('Settings page rendering main content', { 
    hasUser: !!user, 
    userName: user.name,
    userEmail: user.email 
  });

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ textAlign: 'center', width: '100%' }}>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="settings-container">
          {/* Profile Section */}
          <div className="profile-header">
            <div className="profile-avatar">{user.initials}</div>
            <h2 className="profile-name">{user.name}</h2>
            <p className="profile-email">{user.email}</p>
          </div>

          {/* Account Settings */}
          <SettingsGroup title="Account" icon={personCircle} color="primary">
            <IonList className="settings-section-content">
              <IonItem button detail={true} className="setting-item">
                <IonIcon icon={personCircle} color="primary" slot="start" />
                <IonLabel>
                  <h3>Edit Profile</h3>
                  <IonNote>Update your personal information</IonNote>
                </IonLabel>
              </IonItem>
              <IonItem button detail={true} className="setting-item">
                <IonIcon icon={card} color="primary" slot="start" />
                <IonLabel>
                  <h3>Payment Methods</h3>
                  <IonNote>Add or update payment options</IonNote>
                </IonLabel>
              </IonItem>
            </IonList>
          </SettingsGroup>

          {/* Security Settings */}
          <SettingsGroup title="Security" icon={shieldCheckmark} color="warning">
            <IonList className="settings-section-content">
              <IonItem button detail={true} className="setting-item" onClick={handleChangePasscode}>
                <IonIcon icon={keypad} color="warning" slot="start" />
                <IonLabel>
                  <h3>Change Passcode</h3>
                  <IonNote>Update your 6-digit app passcode</IonNote>
                </IonLabel>
              </IonItem>
              <IonItem className="setting-item">
                <IonIcon icon={fingerPrint} color="warning" slot="start" />
                <IonLabel>
                  <h3>Biometric Authentication</h3>
                  <IonNote>Use fingerprint or face ID</IonNote>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={settings.biometricAuth} 
                  onIonChange={() => toggleSetting('biometricAuth')} 
                />
              </IonItem>
            </IonList>
          </SettingsGroup>

          {/* App Settings */}
          <SettingsGroup title="App Settings" icon={cog} color="primary">
            <IonList className="settings-section-content">
              <IonItem className="setting-item">
                <IonIcon icon={moon} color="primary" slot="start" />
                <IonLabel>
                  <h3>Dark Mode</h3>
                  <IonNote>Switch between light and dark theme</IonNote>
                </IonLabel>
                <IonToggle
                  slot="end"
                  checked={darkMode}
                  onIonChange={() => toggleSetting('darkMode')}
                />
              </IonItem>
              <IonItem className="setting-item">
                <IonIcon icon={notifications} color="primary" slot="start" />
                <IonLabel>
                  <h3>Push Notifications</h3>
                  <IonNote>Receive app notifications</IonNote>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={settings.notifications} 
                  onIonChange={() => toggleSetting('notifications')} 
                />
              </IonItem>
              <IonItem className="setting-item">
                <IonIcon icon={mail} color="primary" slot="start" />
                <IonLabel>
                  <h3>Email Notifications</h3>
                  <IonNote>Receive email updates</IonNote>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={settings.emailNotifications} 
                  onIonChange={() => toggleSetting('emailNotifications')} 
                />
              </IonItem>
            </IonList>
          </SettingsGroup>

          {/* Support Section */}
          <SettingsGroup title="Support" icon={informationCircle} color="primary">
            <IonList className="settings-section-content">
              <IonItem 
                button 
                detail={true} 
                className="setting-item" 
                routerLink="/help-support"
                routerDirection="forward"
              >
                <IonIcon icon={helpCircle} color="primary" slot="start" />
                <IonLabel>
                  <h3>Help & Support</h3>
                  <IonNote>Get help with the app</IonNote>
                </IonLabel>
              </IonItem>
              <IonItem 
                button 
                detail={true} 
                className="setting-item"
                onClick={() => history.push('/privacy-policy')}
              >
                <IonIcon icon={shieldCheckmark} color="primary" slot="start" />
                <IonLabel>
                  <h3>Privacy Policy</h3>
                  <IonNote>Read our privacy policy</IonNote>
                </IonLabel>
              </IonItem>
              <IonItem 
                button 
                detail={true} 
                className="setting-item"
                onClick={() => history.push('/terms-of-service')}
              >
                <IonIcon icon={documentText} color="primary" slot="start" />
                <IonLabel>
                  <h3>Terms of Service</h3>
                  <IonNote>Read our terms and conditions</IonNote>
                </IonLabel>
              </IonItem>
            </IonList>
          </SettingsGroup>

          {/* Danger Zone */}
          <SettingsGroup title="Danger Zone" icon={warning}>
            <IonList className="settings-section-content">
              <IonItem
                button
                className="setting-item"
                onClick={handleSignOut}
                detail={true}
              >
                <IonIcon icon={logOut} slot="start" color="medium" />
                <IonLabel>
                  <h3>Log Out</h3>
                  <IonNote>Sign out of your account</IonNote>
                </IonLabel>
              </IonItem>
              <IonItem
                button
                className="setting-item"
                onClick={handleDeleteAccount}
                detail={true}
              >
                <IonIcon slot="start" icon={trash} color="danger" />
                <IonLabel>
                  <h3 className="danger-text">Delete Account</h3>
                  <IonNote>Permanently delete your account</IonNote>
                </IonLabel>
              </IonItem>
            </IonList>
          </SettingsGroup>

          {/* App Version */}
          <div className="version-note">
            Savings App v1.0.0
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
