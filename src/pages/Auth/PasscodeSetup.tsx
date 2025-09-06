import React, { useState } from 'react';
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
import { lockClosedOutline, backspaceOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { databaseService } from '../../services/databaseService';
import { logger } from '../../utils/debugLogger';
import './Auth.css';

const PasscodeSetup: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState<'setup' | 'confirm'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleNumberPress = (num: string) => {
    if (step === 'setup') {
      if (passcode.length < 6) {
        setPasscode(prev => prev + num);
      }
    } else {
      if (confirmPasscode.length < 6) {
        setConfirmPasscode(prev => prev + num);
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'setup') {
      setPasscode(prev => prev.slice(0, -1));
    } else {
      setConfirmPasscode(prev => prev.slice(0, -1));
    }
  };

  const handleContinue = () => {
    if (step === 'setup' && passcode.length === 6) {
      setStep('confirm');
      setError(null);
    } else if (step === 'confirm' && confirmPasscode.length === 6) {
      handlePasscodeSubmit();
    }
  };

  const handlePasscodeSubmit = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match. Please try again.');
      setStep('setup');
      setPasscode('');
      setConfirmPasscode('');
      return;
    }

    if (passcode.length !== 6) {
      setError('Passcode must be exactly 6 digits');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logger.auth('Setting up passcode for user', { userId: user.id });
      
      // Save passcode to database
      await databaseService.setUserPasscode(user.id, passcode);
      
      logger.auth('Passcode setup successful');
      setShowToast(true);
      
      // Navigate to home after successful setup
      setTimeout(() => {
        history.replace('/home');
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to setup passcode';
      const errorObj = err instanceof Error ? err : undefined;
      logger.error('Passcode setup failed', errorObj);
      setError(errorMessage);
      setStep('setup');
      setPasscode('');
      setConfirmPasscode('');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasscodeDisplay = (code: string) => {
    return (
      <div className="passcode-display">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={`passcode-dot ${i < code.length ? 'filled' : ''}`}
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
                    disabled={isLoading}
                  >
                    <IonIcon icon={backspaceOutline} />
                  </IonButton>
                ) : (
                  <IonButton
                    fill="clear"
                    className="number-button"
                    onClick={() => handleNumberPress(num)}
                    disabled={isLoading}
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
          <IonTitle>Setup Passcode</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div className="passcode-container">
          <IonCard className="passcode-card">
            <IonCardHeader>
              <div className="passcode-icon">
                <IonIcon icon={lockClosedOutline} />
              </div>
              <IonCardTitle className="ion-text-center">
                {step === 'setup' ? 'Create Your Passcode' : 'Confirm Your Passcode'}
              </IonCardTitle>
            </IonCardHeader>
            
            <IonCardContent>
              <IonText className="passcode-description">
                {step === 'setup' 
                  ? 'Create a 6-digit passcode to secure your app. You\'ll need this every time you reopen the app.'
                  : 'Please enter your passcode again to confirm.'
                }
              </IonText>

              {renderPasscodeDisplay(step === 'setup' ? passcode : confirmPasscode)}

              {error && (
                <IonText color="danger" className="error-text">
                  <p>{error}</p>
                </IonText>
              )}

              {renderNumberPad()}

              <IonButton
                expand="block"
                className="continue-button"
                onClick={handleContinue}
                disabled={
                  isLoading || 
                  (step === 'setup' && passcode.length !== 6) ||
                  (step === 'confirm' && confirmPasscode.length !== 6)
                }
              >
                {isLoading ? (
                  <IonSpinner name="crescent" />
                ) : step === 'setup' ? (
                  'Continue'
                ) : (
                  'Complete Setup'
                )}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message="Passcode setup successful! Welcome to your savings app."
          duration={2000}
          color="success"
        />
      </IonContent>
    </IonPage>
  );
};

export default PasscodeSetup;
