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
  IonButton,
  IonNote,
  useIonAlert,
  useIonToast,
  IonListHeader,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonModal,
  IonButtons
} from '@ionic/react';
import { 
  moon,
  notifications,
  notificationsOff,
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
  fingerPrint,
  cash,
  card,
  mail
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../contexts/ThemeContext';
import { useBiometrics } from '../../hooks/useBiometrics';
import { passcodeService } from '../../services/passcodeService';
import { databaseService } from '../../services/databaseService';
import { logger } from '../../utils/debugLogger';
import { BiometryType } from '@capgo/capacitor-native-biometric';
import { CURRENCIES, getCurrencyByCode } from '../../utils/currencyUtils';
import { UserProfile } from '../../config/supabase';
import './Settings.css';

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

interface ProfileFormData {
  full_name: string;
  username: string;
  phone_number: string;
  email: string;
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
  
  // Settings integration
  const { 
    settings: userSettings, 
    loading: settingsLoading, 
    error: settingsError,
    updateSetting 
  } = useSettings();
  
  // Biometrics integration
  const {
    isEnabled: biometricsEnabled,
    capabilities: biometricCapabilities,
    isLoading: biometricsLoading,
    error: biometricsError,
    enableBiometrics,
    disableBiometrics,
    clearError: clearBiometricsError
  } = useBiometrics();
  
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
    user_id: '',
    full_name: 'Loading...',
    email: authUser?.email || '',
    username: ''
  });

  // Profile editing state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: '',
    username: '',
    phone_number: '',
    email: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Theme state - ALWAYS call this hook
  const { darkMode, toggleDarkMode } = useTheme();
  
  // Settings state - ALWAYS call this hook
  const [settings, setSettings] = useState<Omit<Settings, 'darkMode'>>({
    notifications: userSettings?.push_notifications ?? true,
    emailNotifications: userSettings?.email_notifications ?? true,
    biometricAuth: userSettings?.biometrics_enabled ?? false,
    currency: userSettings?.currency ?? 'GHS',
    language: userSettings?.language ?? 'en',
    calendar: {
      startOfWeek: userSettings?.starting_day_of_week === 'SUN' ? 'sunday' : 'monday',
      defaultView: 'month'
    }
  });

  // Update local settings when userSettings change
  React.useEffect(() => {
    if (userSettings) {
      setSettings(prev => ({
        ...prev,
        notifications: userSettings.push_notifications ?? true,
        emailNotifications: userSettings.email_notifications ?? true,
        biometricAuth: userSettings.biometrics_enabled ?? false,
        currency: userSettings.currency ?? 'GHS',
        language: userSettings.language ?? 'en',
        calendar: {
          ...prev.calendar,
          startOfWeek: userSettings.starting_day_of_week === 'SUN' ? 'sunday' : 'monday'
        }
      }));
    }
  }, [userSettings]);

  // Handle settings error
  React.useEffect(() => {
    if (settingsError) {
      presentToast({
        message: 'Failed to load settings. Please try refreshing.',
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
    }
  }, [settingsError, presentToast]);

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
          user_id: authUser.id,
          full_name: displayName,
          email: authUser.email || '',
          username: authUser.user_metadata?.username || ''
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
          user_id: authUser.id,
          full_name: authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          username: ''
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

  const toggleSetting = async (key: keyof Settings, subKey?: keyof Settings['calendar']) => {
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
      const newValue = settings.calendar[subKey] === 'monday' ? 'sunday' : 'monday';
      setSettings(prev => ({
        ...prev,
        calendar: {
          ...prev.calendar,
          [subKey]: newValue
        }
      }));
      
      // Update in database
      const dbValue = newValue === 'sunday' ? 'SUN' : 'MON';
      await updateSetting('starting_day_of_week', dbValue);
    } else if (key === 'notifications') {
      const newValue = !settings.notifications;
      setSettings(prev => ({ ...prev, notifications: newValue }));
      await updateSetting('push_notifications', newValue);
    } else if (key === 'emailNotifications') {
      const newValue = !settings.emailNotifications;
      setSettings(prev => ({ ...prev, emailNotifications: newValue }));
      await updateSetting('email_notifications', newValue);
    } else if (key === 'biometricAuth') {
      const newValue = !settings.biometricAuth;
      setSettings(prev => ({ ...prev, biometricAuth: newValue }));
      await updateSetting('biometrics_enabled', newValue);
    }
  };

  const handleCurrencyChange = async (currencyCode: string) => {
    const currency = getCurrencyByCode(currencyCode);
    if (!currency) return;

    try {
      // Update local state immediately for better UX
      setSettings(prev => ({ ...prev, currency: currencyCode }));
      
      // Update in database
      const success = await updateSetting('currency', currencyCode);
      const symbolSuccess = await updateSetting('currency_symbol', currency.symbol);
      
      if (success && symbolSuccess) {
        presentToast({
          message: `Currency changed to ${currency.name} (${currency.symbol})`,
          duration: 2000,
          position: 'top',
          color: 'success'
        });
      } else {
        // Revert local state if database update failed
        setSettings(prev => ({ ...prev, currency: userSettings?.currency ?? 'GHS' }));
        presentToast({
          message: 'Failed to update currency. Please try again.',
          duration: 2000,
          position: 'top',
          color: 'danger'
        });
      }
    } catch (error) {
      // Revert local state on error
      setSettings(prev => ({ ...prev, currency: userSettings?.currency ?? 'GHS' }));
      presentToast({
        message: 'Error updating currency. Please try again.',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
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

  const handleChangePasscode = async () => {
    presentAlert({
      header: 'Change Passcode',
      inputs: [
        {
          name: 'currentPasscode',
          type: 'password',
          placeholder: 'Enter current passcode',
          attributes: {
            required: true
          }
        },
        {
          name: 'newPasscode',
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
          handler: async (data) => {
            const { currentPasscode, newPasscode, confirmPasscode } = data;
            
            if (!currentPasscode || currentPasscode.length !== 6) {
              presentToast({
                message: 'Current passcode must be 6 digits',
                duration: 2000,
                position: 'top',
                color: 'danger'
              });
              return false; // Keep alert open
            }
            
            if (newPasscode !== confirmPasscode) {
              presentToast({
                message: 'New passcodes do not match',
                duration: 2000,
                position: 'top',
                color: 'danger'
              });
              return false; // Keep alert open
            }

            if (!newPasscode || newPasscode.length !== 6) {
              presentToast({
                message: 'New passcode must be 6 digits',
                duration: 2000,
                position: 'top',
                color: 'danger'
              });
              return false; // Keep alert open
            }

            if (currentPasscode === newPasscode) {
              presentToast({
                message: 'New passcode must be different from current passcode',
                duration: 2000,
                position: 'top',
                color: 'danger'
              });
              return false; // Keep alert open
            }

            try {
              const result = await passcodeService.changePasscode(authUser?.id || '', currentPasscode, newPasscode);
              
              if (result.success) {
                presentToast({
                  message: 'Passcode changed successfully',
                  duration: 2000,
                  position: 'top',
                  color: 'success'
                });
                return true; // Close alert
              } else {
                presentToast({
                  message: result.error || 'Failed to change passcode',
                  duration: 2000,
                  position: 'top',
                  color: 'danger'
                });
                return false; // Keep alert open
              }
            } catch (error) {
              presentToast({
                message: 'Failed to change passcode',
                duration: 2000,
                position: 'top',
                color: 'danger'
              });
              return false; // Keep alert open
            }
          }
        }
      ]
    });
  };

  const handleDeleteAccount = async () => {
    presentAlert({
      header: 'Delete Account',
      message: 'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              // TODO: Implement account deletion logic
              // This would typically involve:
              // 1. Deleting user data from database
              // 2. Deleting user from Supabase auth
              // 3. Clearing local storage
              
              presentToast({
                message: 'Account deletion is not yet implemented',
                duration: 3000,
                position: 'top',
                color: 'warning'
              });
              
              // For now, just sign out
              await handleSignOut();
            } catch (error) {
              console.error('Error deleting account:', error);
              presentToast({
                message: 'Failed to delete account. Please try again.',
                duration: 2000,
                position: 'top',
                color: 'danger'
              });
            }
          }
        }
      ]
    });
  };

  const handleRefresh = async (event: CustomEvent) => {
    logger.navigation('Pull-to-refresh triggered on Settings page');
    try {
      // Add your refresh logic here
      logger.navigation('Settings page data refreshed successfully');
    } catch (error) {
      logger.error('Error refreshing Settings page data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      event.detail.complete();
    }
  };

  logger.auth('Settings page rendering main content', { 
    hasUser: !!user, 
    userName: user.full_name,
    userEmail: user.email 
  });

  // Load user profile data from database
  const loadDbUserProfile = async () => {
    if (!authUser) return;
    
    try {
      setProfileLoading(true);
      const profile = await databaseService.getUserProfile(authUser.id);
      
      if (profile) {
        setProfileForm({
          full_name: profile.full_name || '',
          username: profile.username || '',
          phone_number: profile.phone_number || '',
          email: profile.email || authUser.email || '',
        });
      } else {
        // Initialize with auth user data if no profile exists
        setProfileForm({
          full_name: authUser.user_metadata?.full_name || '',
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || '',
          phone_number: '',
          email: authUser.email || '',
        });
      }
    } catch (error) {
      logger.error('Error loading user profile', error instanceof Error ? error : new Error(String(error)));
      presentToast({
        message: 'Failed to load profile data',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Update user profile
  const updateUserProfile = async () => {
    if (!authUser) return;
    
    try {
      setProfileLoading(true);
      
      const profileData: UserProfile = {
        user_id: authUser.id,
        full_name: profileForm.full_name.trim(),
        username: profileForm.username.trim(),
        phone_number: profileForm.phone_number.trim(),
        email: profileForm.email.trim(),
      };

      const updatedProfile = await databaseService.updateUserProfile(profileData);
      
      // Update local user display using the returned profile data
      const displayName = updatedProfile.full_name || updatedProfile.username || updatedProfile.email?.split('@')[0] || 'User';
      
      setUser({
        user_id: authUser.id,
        full_name: displayName,
        email: updatedProfile.email || '',
        username: updatedProfile.username || ''
      });
      
      setIsProfileModalOpen(false);
      
      presentToast({
        message: 'Profile updated successfully',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      
      logger.auth('Profile updated successfully', { userId: authUser.id });
    } catch (error) {
      logger.error('Error updating profile', error instanceof Error ? error : new Error(String(error)));
      presentToast({
        message: 'Failed to update profile. Please try again.',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle profile form changes
  const handleProfileFormChange = (field: keyof ProfileFormData, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Open profile editing modal
  const openProfileModal = () => {
    loadDbUserProfile();
    setIsProfileModalOpen(true);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ textAlign: 'center', width: '100%' }}>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon="chevron-down-circle-outline"
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>
        <div className="settings-container">
          {/* Profile Section */}
          <div className="profile-header">
            <div className="profile-avatar">{user.full_name && user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>
            <h2 className="profile-name">{user.full_name}</h2>
            <p className="profile-email">{user.email}</p>
          </div>

          {/* Account Settings */}
          <SettingsGroup title="Account" icon={personCircle} color="primary">
            <IonList className="settings-section-content">
              <IonItem button detail={true} className="setting-item" onClick={openProfileModal}>
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
                  <IonNote>
                    {biometricCapabilities?.isAvailable 
                      ? `Use ${biometricCapabilities.biometryType === BiometryType.FACE_ID ? 'Face ID' : 'fingerprint'} authentication`
                      : 'Biometrics not available on this device'
                    }
                  </IonNote>
                </IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={biometricsEnabled} 
                  disabled={!biometricCapabilities?.isAvailable || biometricsLoading}
                  onIonChange={async () => {
                    try {
                      if (biometricsEnabled) {
                        const success = await disableBiometrics();
                        if (success) {
                          presentToast({
                            message: 'Biometric authentication disabled',
                            duration: 2000,
                            position: 'top',
                            color: 'success'
                          });
                        } else {
                          presentToast({
                            message: 'Failed to disable biometric authentication',
                            duration: 2000,
                            position: 'top',
                            color: 'danger'
                          });
                        }
                      } else {
                        const success = await enableBiometrics();
                        if (success) {
                          presentToast({
                            message: 'Biometric authentication enabled',
                            duration: 2000,
                            position: 'top',
                            color: 'success'
                          });
                        } else {
                          presentToast({
                            message: biometricsError || 'Failed to enable biometric authentication',
                            duration: 3000,
                            position: 'top',
                            color: 'danger'
                          });
                        }
                      }
                      if (biometricsError) {
                        clearBiometricsError();
                      }
                    } catch (error) {
                      presentToast({
                        message: 'Error toggling biometric authentication',
                        duration: 2000,
                        position: 'top',
                        color: 'danger'
                      });
                    }
                  }} 
                />
              </IonItem>
            </IonList>
          </SettingsGroup>

          {/* App Settings */}
          <SettingsGroup title="App Settings" icon={cog} color="primary">
            <IonList className="settings-section-content">
              <IonItem className="setting-item">
                <IonIcon icon={cash} color="primary" slot="start" />
                <IonLabel>
                  <h3>Currency</h3>
                  <IonNote>Choose your preferred currency</IonNote>
                </IonLabel>
                <IonSelect
                  slot="end"
                  value={settings.currency}
                  placeholder="Select Currency"
                  onIonChange={(e) => handleCurrencyChange(e.detail.value)}
                  interface="popover"
                  disabled={settingsLoading}
                  selectedText={(() => {
                    const selectedCurrency = getCurrencyByCode(settings.currency);
                    return selectedCurrency ? `${selectedCurrency.symbol} ${selectedCurrency.code}` : settings.currency;
                  })()}
                >
                  {CURRENCIES.map((currency) => (
                    <IonSelectOption key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
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
                <IonIcon icon={settings.notifications ? notifications : notificationsOff} color="primary" slot="start" />
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

      {/* Profile Editing Modal */}
      <IonModal isOpen={isProfileModalOpen} onDidDismiss={() => setIsProfileModalOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit Profile</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsProfileModalOpen(false)}>Cancel</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Full Name</IonLabel>
              <IonInput
                value={profileForm.full_name}
                placeholder="Enter your full name"
                onIonInput={(e) => handleProfileFormChange('full_name', e.detail.value!)}
                disabled={profileLoading}
              />
            </IonItem>
            
            <IonItem>
              <IonLabel position="stacked">Username</IonLabel>
              <IonInput
                value={profileForm.username}
                placeholder="Enter your username"
                onIonInput={(e) => handleProfileFormChange('username', e.detail.value!)}
                disabled={profileLoading}
              />
            </IonItem>
            
            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                value={profileForm.email}
                placeholder="Enter your email"
                type="email"
                onIonInput={(e) => handleProfileFormChange('email', e.detail.value!)}
                disabled={profileLoading}
              />
            </IonItem>
            
            <IonItem>
              <IonLabel position="stacked">Phone Number</IonLabel>
              <IonInput
                value={profileForm.phone_number}
                placeholder="Enter your phone number"
                type="tel"
                onIonInput={(e) => handleProfileFormChange('phone_number', e.detail.value!)}
                disabled={profileLoading}
              />
            </IonItem>
          </IonList>
          
          <div style={{ padding: '20px 0' }}>
            <IonButton 
              expand="block" 
              onClick={updateUserProfile}
              disabled={profileLoading || !profileForm.full_name.trim()}
            >
              {profileLoading ? 'Updating...' : 'Update Profile'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default SettingsPage;
