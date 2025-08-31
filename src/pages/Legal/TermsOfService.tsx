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
import { documentText } from 'ionicons/icons';
import './Legal.css';

const TermsOfService: React.FC = () => {
  const effectiveDate = 'August 31, 2024';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Terms of Service</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding legal-content">
        <div className="legal-header">
          <IonIcon className='legal-header-icon' icon={documentText} size="large" color="primary" />
          <h1>Terms of Service</h1>
          <IonText color="medium">Effective: {effectiveDate}</IonText>
        </div>

        <IonList lines="none" className="legal-section">
          <IonItem>
            <IonText>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Savings App ("Service"), you agree to be bound by these Terms of Service 
                ("Terms"). If you disagree with any part of the terms, you may not access the Service.
              </p>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>2. Description of Service</h2>
              <p>
                The Savings App provides personal finance management tools to help users track their savings, 
                set financial goals, and manage their money more effectively.
              </p>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>3. User Accounts</h2>
              <p>When you create an account, you must provide accurate and complete information. You are responsible for:</p>
              <ul>
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Keeping your account information up to date</li>
              </ul>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>4. User Responsibilities</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use any automated means to access the Service without our permission</li>
              </ul>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>5. Financial Information</h2>
              <p>
                The Service may provide financial information for educational and informational purposes only. 
                We are not a financial institution and do not provide financial advice. You should consult 
                with a qualified financial advisor before making any financial decisions.
              </p>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>6. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, the Service is provided "as is" without warranties 
                of any kind. We shall not be liable for any indirect, incidental, special, consequential, 
                or punitive damages resulting from your use of the Service.
              </p>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will provide notice of any 
                significant changes. Your continued use of the Service after such changes constitutes 
                your acceptance of the new Terms.
              </p>
            </IonText>
          </IonItem>

          <IonItem>
            <IonText>
              <h2>8. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
                <br />
                <strong>Email:</strong> legal@savingsapp.com
              </p>
            </IonText>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default TermsOfService;
