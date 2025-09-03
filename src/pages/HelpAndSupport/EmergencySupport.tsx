import React from 'react';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonBackButton,
  IonButton,
  IonText,
  IonIcon,
  IonAlert
} from '@ionic/react';
import { alertCircleOutline, callOutline, mailOutline } from 'ionicons/icons';
import { useState } from 'react';
import './HelpAndSupport.css';

const EmergencySupport: React.FC = () => {
  const [showAlert, setShowAlert] = useState(false);
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="danger">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/help-support" />
          </IonButtons>
          <IonTitle>Emergency Support</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div className="emergency-container">
          <IonText>
            <h2 className="emergency-header">
              <IonIcon icon={alertCircleOutline} className="emergency-icon" />
              Need Immediate Help?
            </h2>
            <p>If you're experiencing an urgent issue with your account, we're here to help.</p>
          </IonText>
          
          <div className="emergency-options">
            <IonButton 
              expand="block" 
              color="danger" 
              className="emergency-button"
              onClick={() => setShowAlert(true)}
            >
              <IonIcon icon={callOutline} slot="start" />
              Call Support (24/7)
            </IonButton>
            
            <IonButton 
              expand="block" 
              color="warning" 
              className="emergency-button"
              routerLink="/help-support"
            >
              <IonIcon icon={mailOutline} slot="start" />
              Email Support
            </IonButton>
            
            <IonText color="medium" className="emergency-note">
              <h3>Common Emergency Issues:</h3>
              <ul>
                <li>Unauthorized transactions</li>
                <li>Account access issues</li>
                <li>Suspicious activity</li>
                <li>Lost or stolen device</li>
              </ul>
              
              <p className="urgent-note">
                If this is a financial emergency, please contact your bank immediately.
              </p>
            </IonText>
          </div>
          
          <IonAlert
            isOpen={showAlert}
            onDidDismiss={() => setShowAlert(false)}
            header="Contact Support"
            message="Please call our 24/7 support line at: <strong>+233 (556) 90-885</strong>"
            cssClass="emergency-alert"
            backdropDismiss={true}
            buttons={[
              {
                text: 'OK',
                role: 'confirm',
                handler: () => {
                  console.log('Alert confirmed');
                }
              }
            ]}
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EmergencySupport;
