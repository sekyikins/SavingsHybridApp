import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { logger } from '../utils/debugLogger';
import PasscodeVerify from '../pages/Auth/PasscodeVerify';

interface PasscodeGuardProps {
  children: React.ReactNode;
}

const PasscodeGuard: React.FC<PasscodeGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [needsPasscodeVerification, setNeedsPasscodeVerification] = useState(false);
  const [isCheckingPasscode, setIsCheckingPasscode] = useState(true);

  useEffect(() => {
    const checkPasscodeRequirement = async () => {
      // Don't check passcode if:
      // 1. Auth is still loading
      // 2. User is not authenticated
      // 3. Already on auth pages
      // 4. Already verified passcode in this session
      if (authLoading || !user || !location.pathname || location.pathname.startsWith('/auth/')) {
        setIsCheckingPasscode(false);
        setNeedsPasscodeVerification(false);
        return;
      }

      try {
        logger.auth('Checking passcode requirement for user', { userId: user.id });
        
        // Check if user has a passcode set up
        const hasPasscode = await databaseService.hasUserPasscode(user.id);
        
        if (hasPasscode) {
          // Check if passcode verification is needed
          // This could be based on app startup, time since last verification, etc.
          const sessionKey = `passcode_verified_${user.id}`;
          const lastVerified = sessionStorage.getItem(sessionKey);
          const now = Date.now();
          const verificationTimeout = 5 * 60 * 1000; // 5 minutes
          
          if (!lastVerified || (now - parseInt(lastVerified)) > verificationTimeout) {
            logger.auth('Passcode verification required');
            setNeedsPasscodeVerification(true);
          } else {
            logger.auth('Passcode verification not required - recent verification found');
            setNeedsPasscodeVerification(false);
          }
        } else {
          logger.auth('User has no passcode set up');
          setNeedsPasscodeVerification(false);
        }
      } catch (error: unknown) {
        logger.error('Error checking passcode requirement', error instanceof Error ? error : undefined);
        // On error, don't block the user
        setNeedsPasscodeVerification(false);
      } finally {
        setIsCheckingPasscode(false);
      }
    };

    checkPasscodeRequirement();
  }, [user, authLoading, location.pathname]);

  const handlePasscodeSuccess = () => {
    if (user) {
      // Mark passcode as verified in session
      const sessionKey = `passcode_verified_${user.id}`;
      sessionStorage.setItem(sessionKey, Date.now().toString());
      
      logger.auth('Passcode verification successful, allowing app access');
      setNeedsPasscodeVerification(false);
    }
  };

  // Show loading while checking passcode requirement
  if (isCheckingPasscode) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <IonSpinner name="crescent" />
            <div>Checking security settings...</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Show passcode verification if needed
  if (needsPasscodeVerification) {
    return <PasscodeVerify onSuccess={handlePasscodeSuccess} />;
  }

  // Otherwise, render children normally
  return <>{children}</>;
};

export default PasscodeGuard;
