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
  IonTextarea,
  IonItem,
  IonLabel,
  IonInput,
  IonText,
  IonIcon
} from '@ionic/react';
import { bugOutline } from 'ionicons/icons';
import './HelpAndSupport.css';

const BugReport: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/help-support" />
          </IonButtons>
          <IonTitle>Report a Bug</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div className="bug-report-container">
          <IonText>
            <h2><IonIcon icon={bugOutline} className="section-icon" /> Found a Bug?</h2>
            <p>Please describe the issue in detail to help us fix it faster.</p>
          </IonText>
          
          <IonItem className="form-item">
            <IonLabel position="floating">Email Address</IonLabel>
            <IonInput type="email" required />
          </IonItem>
          
          <IonItem className="form-item">
            <IonLabel position="floating">Subject</IonLabel>
            <IonInput type="text" value="Bug Report" readonly />
          </IonItem>
          
          <IonItem className="form-item">
            <IonLabel position="floating">Description</IonLabel>
            <IonTextarea 
              rows={6} 
              placeholder="Please describe the bug in detail. Include steps to reproduce, expected behavior, and actual behavior."
              required
            />
          </IonItem>
          
          <IonButton expand="block" className="submit-button">
            Submit Bug Report
          </IonButton>
          
          <IonText color="medium" className="note">
            <p>We'll review your report and get back to you as soon as possible.</p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BugReport;
