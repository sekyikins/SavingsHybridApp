import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonText,
  IonSpinner,
  IonToast,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { lockClosedOutline, backspaceOutline, alertCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { databaseService } from '../../services/databaseService';
import { logger } from '../../utils/debugLogger';
import './Auth.css';

interface PasscodeVerifyProps {
  onSuccess?: () => void;
}

const PasscodeVerify: React.FC<PasscodeVerifyProps> = ({ onSuccess }) => {
  const history = useHistory();
  const { user, signOut } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger' | 'warning'>('success');

  useEffect(() => {
    // Clear any previous errors when component mounts
    setError(null);
    setPasscode('');
  }, []);

  const handleNumberPress = (num: string) => {
    if (passcode.length < 6 && !isLoading && !isLocked) {
      setPasscode(prev => prev + num);
      setError(null); // Clear error when user starts typing
    }
  };

  const handleBackspace = () => {
    if (!isLoading && !isLocked) {
      setPasscode(prev => prev.slice(0, -1));
      setError(null);
    }
  };

  const handlePasscodeSubmit = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (passcode.length !== 6) {
      setError('Please enter a 6-digit passcode');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logger.auth('Verifying passcode for user', { userId: user.id });
      
      const result = await databaseService.verifyUserPasscode(user.id, passcode);
      
      if (result.success) {
        logger.auth('Passcode verification successful');
        setToastMessage('Welcome back!');
        setToastColor('success');
        setShowToast(true);
        
        // Call success callback or navigate to home
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            history.replace('/home');
          }
        }, 1000);
      } else {
        logger.auth('Passcode verification failed', { error: result.error });
        setError(result.error || 'Incorrect passcode');
        setIsLocked(result.locked || false);
        setPasscode(''); // Clear passcode on failure
        
        if (result.locked) {
          setToastMessage('Account temporarily locked due to too many failed attempts');
          setToastColor('danger');
          setShowToast(true);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify passcode';
      const errorObj = err instanceof Error ? err : undefined;
      logger.error('Passcode verification error', errorObj);
      setError(errorMessage);
      setPasscode('');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (passcode.length === 6 && !isLoading) {
      handlePasscodeSubmit();
    }
  }, [passcode]);

  const handleLogout = async () => {
    try {
      await signOut();
      history.replace('/auth');
    } catch (error) {
      const errorObj = error instanceof Error ? error : undefined;
      logger.error('Logout failed', errorObj);
    }
  };

  const renderPasscodeDisplay = () => {
    return (
      <div className="passcode-display">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={`passcode-dot ${i < passcode.length ? 'filled' : ''} ${error ? 'error' : ''}`}
          />
        ))}
      </div>
    );
  };

  const renderNumberPad = () => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];
    
    return (
      <IonGrid className="number-pad">
        {Array.from({ length: 4 }, (_, row) => (
          <IonRow key={row}>
            {numbers.slice(row * 3, (row + 1) * 3).map((num, col) => (
              <IonCol key={col} size="4">
                {num === '' ? (
                  <div className="number-button empty" />
                ) : num === 'backspace' ? (
                  <IonButton
                    fill="clear"
                    className="number-button"
                    onClick={handleBackspace}
                    disabled={isLoading || isLocked}
                  >
                    <IonIcon icon={backspaceOutline} />
                  </IonButton>
                ) : (
                  <IonButton
                    fill="clear"
                    className="number-button"
                    onClick={() => handleNumberPress(num)}
                    disabled={isLoading || isLocked}
                  >
                    {num}
                  </IonButton>
                )}
              </IonCol>
            ))}
          </IonRow>
        ))}
      </IonGrid>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Enter Passcode</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div className="passcode-container">
          <IonCard className="passcode-card">
            <IonCardHeader>
              <div className="passcode-icon">
                <IonIcon 
                  icon={error || isLocked ? alertCircleOutline : lockClosedOutline} 
                  color={error || isLocked ? 'danger' : 'primary'}
                />
              </div>
              <IonCardTitle className="ion-text-center">
                {isLocked ? 'Account Locked' : 'Enter Your Passcode'}
              </IonCardTitle>
            </IonCardHeader>
            
            <IonCardContent>
              <IonText className="passcode-description">
                {isLocked 
                  ? 'Your account has been temporarily locked due to multiple failed attempts. Please wait before trying again.'
                  : 'Enter your 6-digit passcode to access your savings app.'
                }
              </IonText>

              {!isLocked && renderPasscodeDisplay()}

              {error && (
                <IonText color="danger" className="error-text">
                  <p>{error}</p>
                </IonText>
              )}

              {isLoading && (
                <div className="loading-container">
                  <IonSpinner name="crescent" />
                  <IonText>Verifying...</IonText>
                </div>
              )}

              {!isLocked && !isLoading && renderNumberPad()}

              <div className="passcode-actions">
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={handleLogout}
                  className="logout-button"
                >
                  Sign out and use different account
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          color={toastColor}
        />
      </IonContent>
    </IonPage>
  );
};

export default PasscodeVerify;
