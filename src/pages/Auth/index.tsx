import React, { useState, useEffect } from 'react';
import { useLocation, Redirect } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonLoading,
  IonAlert,
  IonIcon
} from '@ionic/react';
import { logoGoogle, logoApple } from 'ionicons/icons';
import './Auth.css';
import { supabase } from '../../config/supabase';

interface FormData {
  email: string;
  password: string;
}

interface LocationState {
  from?: {
    pathname: string;
  };
}

const AuthPage: React.FC = () => {
  const { 
    signIn, 
    signUp, 
    resetPassword, 
    user, 
    error: authError 
  } = useAuth();
  const isAuthenticated = !!user;
  
  const location = useLocation<LocationState>();
  const from = location.state?.from?.pathname || '/home';
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });
  
  // UI state
  const [isLogin, setIsLogin] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New state for validation
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

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

  // Enhanced submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation check
    const newErrors = {
      email: !formData.email ? 'Email is required' 
        : !validateEmail(formData.email) ? 'Invalid email format' : undefined,
      password: !formData.password ? 'Password is required'
        : !validatePassword(formData.password) 
          ? 'Password must be at least 6 characters' 
          : undefined
    };
    
    setErrors(newErrors);
    
    if (Object.values(newErrors).some(Boolean)) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const { error } = isLogin 
        ? await signIn(formData.email, formData.password)
        : await signUp(formData.email, formData.password);
        
      if (error) {
        throw error;
      }
    } catch (err) {
      let errorMessage = 'An error occurred';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Map common error codes to user-friendly messages
        if (errorMessage.includes('invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (errorMessage.includes('Email rate limit exceeded')) {
          errorMessage = 'Too many attempts. Please try again later.';
        }
      }
      
      setAlertMessage(errorMessage);
      setShowAlert(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Redirect to={from} />;
  }

  // Show error alert if authentication fails
  useEffect(() => {
    if (authError) {
      setAlertMessage(authError.message || 'An error occurred');
      setShowAlert(true);
    }
  }, [authError]);

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setAlertMessage('Please enter your email address first');
      setShowAlert(true);
      return;
    }
    
    try {
      setIsProcessing(true);
      const { error } = await resetPassword(formData.email);
      if (error) {
        throw error;
      }
      setAlertMessage('Password reset email sent. Please check your inbox.');
      setShowAlert(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      setAlertMessage(errorMessage);
      setShowAlert(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsProcessing(true);
    setShowAlert(false);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`
        }
      });
      
      if (error) throw error;
    } catch (err) {
      setAlertMessage(
        err instanceof Error 
          ? err.message 
          : 'Failed to authenticate with provider'
      );
      setShowAlert(true);
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
          <IonLabel position="stacked">Email</IonLabel>
            <IonItem className="auth-input-item">
              <IonInput
                type="email"
                value={formData.email}
                onIonChange={handleInputChange('email')}
                required
              />
              {errors.email && <div style={{ color: 'red' }}>{errors.email}</div>}
            </IonItem>
            <IonLabel position="stacked">Password</IonLabel>
            <IonItem className="auth-input-item">
              <IonInput
                type="password"
                value={formData.password}
                onIonChange={handleInputChange('password')}
                required
              />
              {errors.password && <div style={{ color: 'red' }}>{errors.password}</div>}
            </IonItem>
            
            <IonButton 
              expand="block" 
              type="submit" 
              className={`auth-button ${isProcessing ? 'button-loading' : ''}`}
              disabled={isProcessing}
            >
              {isProcessing ? '' : (isLogin ? 'Sign In' : 'Sign Up')}
            </IonButton>
            
            <div className="auth-links">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="auth-link"
              >
                Forgot password?
              </button>
            </div>
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
          <IonButton 
            fill="clear" 
            expand="block" 
            onClick={() => setIsLogin(!isLogin)}
            className="signup-toggle"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </IonButton>
        </div>
        
        <IonLoading isOpen={isProcessing} message="Authenticating..." />
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertMessage.includes('sent') ? 'Success' : 'Error'}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default AuthPage;
