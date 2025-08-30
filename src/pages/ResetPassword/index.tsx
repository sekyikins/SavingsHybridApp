import React, { useState } from 'react';
import { IonPage, IonContent, IonInput, IonButton, IonItem, IonLabel, IonLoading, IonAlert } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import './ResetPassword.css';

const ResetPasswordPage: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setAlertMessage('Please enter a valid email address');
      setShowAlert(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      });
      
      if (error) throw error;
      
      setEmailSent(true);
      setAlertMessage('Password reset email sent. Please check your inbox.');
      setShowAlert(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to send reset email'
      );
      setShowAlert(true);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <IonPage>
      <IonContent className="reset-password-container">
        <div className="reset-password-content">
          <h1 className="reset-password-title">Reset Password</h1>
          
          {emailSent ? (
            <div className="success-message">
              <p>Check your email for the password reset link.</p>
              <IonButton 
                expand="block" 
                onClick={() => history.push('/login')}
                className="auth-button"
              >
                Back to Login
              </IonButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="reset-password-form">
              <IonItem className="auth-input-item">
                <IonLabel position="floating">Email</IonLabel>
                <IonInput
                  type="email"
                  value={email}
                  onIonChange={(e) => setEmail(e.detail.value || '')}
                  required
                  className="auth-input"
                />
              </IonItem>
              
              <IonButton 
                expand="block" 
                type="submit" 
                className="auth-button"
                disabled={isProcessing}
              >
                Send Reset Link
              </IonButton>
              
              <IonButton 
                fill="clear" 
                expand="block" 
                onClick={() => history.push('/login')}
                className="auth-link"
              >
                Remember your password? Sign in
              </IonButton>
            </form>
          )}
        </div>
        
        <IonLoading isOpen={isProcessing} message="Sending reset link..." />
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

export default ResetPasswordPage;
