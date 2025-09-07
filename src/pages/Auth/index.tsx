import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonLabel,
  IonLoading,
  IonAlert,
  IonIcon,
  IonToast
} from '@ionic/react';
import { logoGoogle, logoApple } from 'ionicons/icons';
import './Auth.css';
import { supabase } from '../../config/supabase';
import { databaseService } from '../../services/databaseService';
import { logger } from '../../utils/debugLogger'; // Fixed import path

interface FormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LocationState {
  from?: {
    pathname: string;
  };
}

const AuthPage: React.FC = () => {
  const history = useHistory();
  const { 
    signIn, 
    signUp, 
    resetPassword, 
    user, 
    loading,
    error: authError 
  } = useAuth();
  const isAuthenticated = !!user;
  
  const location = useLocation<LocationState>();
  const from = location.state?.from?.pathname || '/home';
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  // UI state
  const [isLogin, setIsLogin] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('error');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger' | 'warning'>('danger');
  
  // New state for validation
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }>({});
  
  // Helper function to show toast notifications
  const showToastNotification = (message: string, color: 'success' | 'danger' | 'warning' = 'danger') => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  // Helper function to show alert with better categorization
  const showAlertMessage = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  // Validate email format
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validate password strength
  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  // Handle input with validation
  const handleInputChange = (field: keyof FormData) => (e: CustomEvent) => {
    const value = e.detail.value || '';
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate in real-time
    if (field === 'email') {
      setErrors(prev => ({
        ...prev,
        email: value && !validateEmail(value) ? 'Invalid email format' : undefined
      }));
    }
    
    if (field === 'password') {
      setErrors(prev => ({
        ...prev,
        password: value && !validatePassword(value) 
          ? 'Password must be at least 6 characters' 
          : undefined
      }));
    }
  };

  // Enhanced submit handler with better error messages
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation with specific messages
    if (!formData.email || !formData.password) {
      showToastNotification('Please fill in all required fields', 'warning');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      showToastNotification('Please enter a valid email address', 'warning');
      return;
    }
    
    if (!validatePassword(formData.password)) {
      showToastNotification('Password must be at least 6 characters long', 'warning');
      return;
    }
    
    if (!isLogin && (!formData.firstName || !formData.lastName)) {
      showToastNotification('Please enter your first and last name', 'warning');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let result;
      if (isLogin) {
        result = await signIn(formData.email, formData.password);
      } else {
        result = await signUp(
          formData.email, 
          formData.password, 
          `${formData.firstName} ${formData.lastName}`,
          { firstName: formData.firstName, lastName: formData.lastName }
        );
      }
      
      if (result.error) {
        // Enhanced error message handling
        const errorMessage = result.error.message;
        
        if (errorMessage.includes('Invalid login credentials')) {
          showAlertMessage('Invalid email or password. Please check your credentials and try again.', 'error');
        } else if (errorMessage.includes('Email not confirmed')) {
          showAlertMessage('Please check your email and click the confirmation link before signing in.', 'warning');
        } else if (errorMessage.includes('User already registered')) {
          showAlertMessage('An account with this email already exists. Please sign in instead.', 'warning');
        } else if (errorMessage.includes('Password should be at least')) {
          showToastNotification('Password must be at least 6 characters long', 'warning');
        } else if (errorMessage.includes('Invalid email')) {
          showToastNotification('Please enter a valid email address', 'warning');
        } else if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
          showAlertMessage('Too many attempts. Please wait a few minutes before trying again.', 'warning');
        } else if (errorMessage.includes('Account created successfully')) {
          showAlertMessage('Account created successfully! You can now sign in with your credentials.', 'success');
        } else {
          showAlertMessage(errorMessage, 'error');
        }
      } else if (!isLogin) {
        // Success message for signup - redirect to passcode setup
        logger.auth('Signup successful, preparing passcode setup redirect', {
          userId: result.data?.user?.id,
          hasSession: !!result.data?.session,
          userEmail: result.data?.user?.email
        });
        
        showToastNotification('Account created successfully! Please set up your passcode.', 'success');
        
        // Redirect to passcode setup immediately without delay
        logger.auth('Redirecting to passcode setup immediately');
        history.replace('/auth/passcode-setup');
        
      } else {
        // Success message for signin - check if user has passcode
        const currentUser = result.data.user || user;
        if (currentUser) {
          const hasPasscode = await databaseService.hasUserPasscode(currentUser.id);
          if (hasPasscode) {
            // User has passcode, redirect to passcode verification
            history.replace('/auth/passcode-verify');
          } else {
            // User doesn't have passcode, redirect to setup
            history.replace('/auth/passcode-setup');
          }
        } else {
          showToastNotification('Welcome back!', 'success');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      showAlertMessage(`Authentication failed: ${errorMessage}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Prevent going back to auth page if already authenticated - ALWAYS call this hook
  useEffect(() => {
    // If user is already authenticated, check if they need passcode setup
    const checkAuthRedirect = async () => {
      if (isAuthenticated && user) {
        logger.auth('Auth useEffect triggered', { 
          pathname: location.pathname, 
          isAuthenticated, 
          userId: user.id 
        });
        
        // Add a small delay to allow signup redirect to happen first
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if we're currently on a passcode-related page
        if (location.pathname && location.pathname.includes('/auth/passcode')) {
          logger.auth('Already on passcode page, skipping redirect', { pathname: location.pathname });
          return; // Don't redirect if already on passcode pages
        }
        
        // Check if user has a passcode set up
        try {
          const hasPasscode = await databaseService.hasUserPasscode(user.id);
          logger.auth('Passcode check result', { hasPasscode, userId: user.id });
          
          if (!hasPasscode) {
            // User needs passcode setup, redirect there
            logger.auth('Redirecting to passcode setup from useEffect');
            history.replace('/auth/passcode-setup');
            return;
          }
        } catch (error) {
          logger.error('Error checking passcode status', error instanceof Error ? error : undefined);
        }
        
        // User has passcode or check failed, redirect to home
        logger.auth('Redirecting to home from useEffect');
        history.replace(from);
        return;
      }
    };

    // Only run this check if we're not in the middle of processing a signup
    if (!isProcessing) {
      checkAuthRedirect();
    }
  }, [isAuthenticated, user, from, history, location.pathname, isProcessing]);

  // Show error alert if authentication fails - ALWAYS call this hook
  useEffect(() => {
    if (authError) {
      showAlertMessage(authError.message || 'An authentication error occurred', 'error');
    }
  }, [authError]);

  // Show loading during auth state determination
  if (loading) {
    return (
      <IonPage>
        <IonContent className="auth-container">
          <IonLoading 
            isOpen={true} 
            message="Loading..." 
            duration={0}
            backdropDismiss={false}
            showBackdrop={true}
            translucent={false}
            aria-busy="true"
            aria-label="Loading..."
          />
        </IonContent>
      </IonPage>
    );
  }

  // Don't render anything if already authenticated (redirect will happen in useEffect)
  if (isAuthenticated) {
    return null;
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      showToastNotification('Please enter your email address first', 'warning');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      showToastNotification('Please enter a valid email address', 'warning');
      return;
    }
    
    try {
      setIsProcessing(true);
      const { error } = await resetPassword(formData.email);
      if (error) {
        throw error;
      }
      showAlertMessage('Password reset email sent successfully! Please check your inbox and follow the instructions.', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
        showAlertMessage('Too many password reset attempts. Please wait a few minutes before trying again.', 'warning');
      } else if (errorMessage.includes('User not found')) {
        showAlertMessage('No account found with this email address. Please check your email or sign up for a new account.', 'error');
      } else {
        showAlertMessage(`Password reset failed: ${errorMessage}`, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsProcessing(true);
    setShowAlert(false);
    setShowToast(false);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`
        }
      });
      
      if (error) throw error;
      
      showToastNotification(`Redirecting to ${provider === 'google' ? 'Google' : 'Apple'} for authentication...`, 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate with provider';
      
      if (errorMessage.includes('popup')) {
        showAlertMessage('Please allow popups for this site and try again.', 'warning');
      } else if (errorMessage.includes('network')) {
        showAlertMessage('Network error. Please check your connection and try again.', 'error');
      } else {
        showAlertMessage(`${provider === 'google' ? 'Google' : 'Apple'} authentication failed: ${errorMessage}`, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="auth-container">
        <div className="auth-content">
          <h1 className="auth-title">Welcome Back</h1>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-item">
              <IonLabel className='label'>Email</IonLabel>
              <IonInput
                type="email"
                value={formData.email}
                onIonChange={handleInputChange('email')}
                required
              />
              {errors.email && <div style={{ color: 'red' }}>{errors.email}</div>}
            </div>
            {!isLogin && (
              <>
                <div className="auth-input-item">
                  <IonLabel className='label'>First Name</IonLabel>
                  <IonInput
                    type="text"
                    value={formData.firstName}
                    onIonChange={handleInputChange('firstName')}
                    required={!isLogin}
                  />
                  {errors.firstName && <div style={{ color: 'red' }}>{errors.firstName}</div>}
                </div>
                <div className="auth-input-item">
                  <IonLabel className='label'>Last Name</IonLabel>
                  <IonInput
                    type="text"
                    value={formData.lastName}
                    onIonChange={handleInputChange('lastName')}
                    required={!isLogin}
                  />
                  {errors.lastName && <div style={{ color: 'red' }}>{errors.lastName}</div>}
                </div>
              </>
            )}
            <div className="auth-input-item">
              <IonLabel className='label'>Password</IonLabel>
              <IonInput
                type="password"
                value={formData.password}
                onIonChange={handleInputChange('password')}
                required
              />
              {errors.password && <div style={{ color: 'red' }}>{errors.password}</div>}
            </div>
            
            <IonButton 
              expand="block" 
              type="submit" 
              className={`auth-button ${isProcessing ? 'button-loading' : ''}`}
              disabled={isProcessing}
            >
              {isProcessing ? '' : (isLogin ? 'Sign In' : 'Sign Up')}
            </IonButton>
            
            {isLogin && (
              <div className="auth-links">
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="auth-link"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </form>
          
          <div className="social-login">
            <div className="divider">or continue with</div>
            
            <div className="social-buttons">
              <IonButton 
                fill="outline" 
                className="social-button"
                onClick={() => handleSocialLogin('google')}
              >
                <IonIcon icon={logoGoogle} slot="start" />
                Google
              </IonButton>
              
              <IonButton 
                fill="outline" 
                className="social-button"
                onClick={() => handleSocialLogin('apple')}
              >
                <IonIcon icon={logoApple} slot="start" />
                Apple
              </IonButton>
            </div>
          </div>

          <div className="divider2">{isLogin ? 'Need an account?' : 'Already have an account?'}</div>
          <IonButton 
            fill="clear" 
            expand="block" 
            onClick={() => setIsLogin(!isLogin)}
            className="signup-toggle"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </IonButton>
        </div>
        
        <IonLoading 
          isOpen={isProcessing} 
          message="Authenticating..." 
          duration={0}
          backdropDismiss={false}
          showBackdrop={true}
          translucent={false}
        />
        
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={
            alertType === 'success' ? 'Success' : 
            alertType === 'warning' ? 'Warning' : 
            'Error'
          }
          message={alertMessage}
          buttons={['OK']}
        />
        
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="top"
          color={toastColor}
        />
      </IonContent>
    </IonPage>
  );
};

export default AuthPage;
