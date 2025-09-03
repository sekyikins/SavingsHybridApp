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
  IonIcon,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { chatbubbleEllipsesOutline } from 'ionicons/icons';
import './HelpAndSupport.css';

const Feedback: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/help-support" />
          </IonButtons>
          <IonTitle>Send Feedback</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <div className="feedback-container">
          <IonText>
            <h2><IonIcon icon={chatbubbleEllipsesOutline} className="section-icon" /> We'd Love Your Feedback</h2>
            <p>Your input helps us improve the app. What would you like to share?</p>
          </IonText>
          
          <IonItem className="form-item">
            <IonLabel position="floating">Your Name (Optional)</IonLabel>
            <IonInput type="text" />
          </IonItem>
          
          <IonItem className="form-item">
            <IonLabel position="floating">Email (Optional, if you'd like a response)</IonLabel>
            <IonInput type="email" />
          </IonItem>
          
          <IonItem className="form-item">
            <IonLabel>Feedback Type: </IonLabel>
            <IonSelect interface="action-sheet" placeholder="Select type">
              <IonSelectOption value="suggestion">Suggestion</IonSelectOption>
              <IonSelectOption value="compliment">Compliment</IonSelectOption>
              <IonSelectOption value="complaint">Complaint</IonSelectOption>
              <IonSelectOption value="feature-request">Feature Request</IonSelectOption>
              <IonSelectOption value="other">Other</IonSelectOption>
            </IonSelect>
          </IonItem>
          
          <IonItem className="form-item">
            <IonLabel position="floating">Your Feedback</IonLabel>
            <IonTextarea 
              rows={6} 
              placeholder="Please share your thoughts with us..."
              required
            />
          </IonItem>
          
          <IonButton expand="block" className="submit-button">
            Send Feedback
          </IonButton>
          
          <IonText color="medium" className="note">
            <p>Thank you for helping us improve our app!</p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Feedback;
