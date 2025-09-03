import React from 'react';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonIcon, 
  IonButton,
  IonAccordionGroup,
  IonAccordion,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButtons,
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { 
  helpCircleOutline, 
  mailOutline, 
  informationCircleOutline,
  bugOutline,
  chatbubbleEllipsesOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './HelpAndSupport.css';

const HelpAndSupport: React.FC = () => {
  const history = useHistory();
  // const [expanded, setExpanded] = useState<string | undefined>();

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "Go to Settings > Account > Change Password. You'll receive an email with instructions to reset your password."
    },
    {
      question: "How do I add a new transaction?",
      answer: "Tap the '+' button on the home screen and fill in the transaction details."
    },
    {
      question: "How do I set a savings goal?",
      answer: "Navigate to the Goals section and tap 'Add New Goal'. Set your target amount and deadline."
    },
    {
      question: "How do I enable notifications?",
      answer: "Go to Settings > Notifications and toggle on the notification types you want to receive."
    }
  ];

  // const handleAccordionToggle = (value: string) => {
  //   setExpanded(expanded === value ? undefined : value);
  // };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Help & Support</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* FAQ Section */}
        <IonCard className="section-card">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={helpCircleOutline} className="section-icon" />
              Frequently Asked Questions
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonAccordionGroup>
              {faqs.map((faq, index) => (
                <IonAccordion key={index} value={`item-${index}`}>
                  <IonItem slot="header" color="light">
                    <IonLabel className="ion-text-wrap">{faq.question}</IonLabel>
                  </IonItem>
                  <div className="ion-padding" slot="content">
                    {faq.answer}
                  </div>
                </IonAccordion>
              ))}
            </IonAccordionGroup>
          </IonCardContent>
        </IonCard>

        {/* Contact Support Section */}
        <IonCard className="section-card">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={mailOutline} className="section-icon" />
              Contact Support
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText>
              <p>Our support team is here to help you with any questions or issues you may have.</p>
              <p>Please provide the following details when contacting us:</p>
              <ul>
                <li>Your account email</li>
                <li>Device model and OS version</li>
                <li>App version (found in Settings &gt; About)</li>
                <li>Detailed description of your issue</li>
                <li>Screenshots if applicable</li>
              </ul>
              <p>We typically respond within 24 hours on business days.</p>
            </IonText>
            <IonButton expand="block" fill="outline" onClick={() => window.location.href = 'mailto:support@savingsapp.com'}>
              <IonIcon icon={mailOutline} slot="start" />
              Email Support
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* App Information Section */}
        <IonCard className="section-card">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={informationCircleOutline} className="section-icon" />
              App Information
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList lines="none">
              <IonItem>
                <IonLabel>Version</IonLabel>
                <IonText>1.0.0</IonText>
              </IonItem>
              <IonItem>
                <IonLabel>Last Updated</IonLabel>
                <IonText>2024-09-01</IonText>
              </IonItem>
              <IonItem>
                <IonLabel>Terms of Service</IonLabel>
                <IonButton fill="clear" routerLink="/terms-of-service" size="default">
                  View
                </IonButton>
              </IonItem>
              <IonItem>
                <IonLabel>Privacy Policy</IonLabel>
                <IonButton fill="clear" routerLink="/privacy-policy" size="default">
                  View
                </IonButton>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Action Buttons */}
        <IonGrid>
          <IonRow>
            <IonCol size="12">
              <IonButton 
                expand="block" 
                fill="outline" 
                onClick={() => history.push('/report-bug')}
                className="action-button"
              >
                <IonIcon icon={bugOutline} slot="start" />
                Report a Bug
              </IonButton>
            </IonCol>
            <IonCol size="12">
              <IonButton 
                expand="block" 
                fill="outline" 
                onClick={() => history.push('/feedback')}
                className="action-button"
              >
                <IonIcon icon={chatbubbleEllipsesOutline} slot="start" />
                Send Feedback
              </IonButton>
            </IonCol>
            <IonCol size="12">
              <IonButton 
                expand="block" 
                fill="outline" 
                color="danger"
                onClick={() => history.push('/emergency')}
                className="action-button"
              >
                <IonIcon icon={alertCircleOutline} slot="start" />
                Emergency Support
              </IonButton>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default HelpAndSupport;
