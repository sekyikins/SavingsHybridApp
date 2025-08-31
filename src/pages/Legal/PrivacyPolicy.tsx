import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonText,
  IonIcon
} from '@ionic/react';
import { shieldCheckmark } from 'ionicons/icons';
import './Legal.css';

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = 'August 31, 2024';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Privacy Policy</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="legal-content">
        <div className="legal-header">
          <IonIcon className='legal-header-icon' icon={shieldCheckmark} size="large" color="primary" />
          <h1>Privacy Policy</h1>
          <IonText color="medium">Last updated: {lastUpdated}</IonText>
        </div>

        <IonList className="legal-section">
          <IonItem>
            <IonText>
              <h2>1. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us, such as when you create an account, 
                update your profile, or make transactions. This may include:
              </p>
              <ul>
                <li>Personal identification information (name, email address, etc.)</li>
                <li>Financial information (savings goals, transaction history)</li>
                <li>Device information and usage data</li>
              </ul>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices and support messages</li>
                <li>Monitor and analyze usage and trends</li>
                <li>Personalize your experience</li>
              </ul>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>3. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information from 
                unauthorized access, alteration, disclosure, or destruction. Your data is encrypted 
                in transit and at rest.
              </p>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>4. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access, update, or delete your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Request a copy of your data</li>
                <li>Withdraw consent where applicable</li>
              </ul>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
                <br />
                <strong>Email:</strong> privacy@savingsapp.com
              </p>
            </IonText>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicy;
