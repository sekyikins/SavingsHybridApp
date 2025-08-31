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
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
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
  
  // Get user from location state or use default
  const [user] = useState<UserProfile>(() => {
    return location.state?.user || {
      name: 'John Doe',
      email: 'john.doe@example.com',
      initials: 'JD'
    };
  });
  
  // Theme state
  const { darkMode, toggleDarkMode } = useTheme();
  
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
              <IonItem className="setting-item">
                <IonIcon icon={shieldCheckmark} color="primary" slot="start" />
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

          

          {/* Support Section */}
          <SettingsGroup title="Support" icon={informationCircle} color="primary">
            <IonList className="settings-section-content">
              <IonItem button detail={true} className="setting-item">
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
