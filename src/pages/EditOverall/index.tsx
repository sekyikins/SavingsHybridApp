import React, { useState } from 'react';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButton, IonInput, IonItem, IonLabel, IonButtons, 
  IonIcon, useIonViewWillEnter 
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { chevronBack } from 'ionicons/icons';
import { useTheme } from '../../contexts/ThemeContext';
import './EditOverall.css';

interface RouteParams {
  date: string;
}

export default function EditOverall() {
  const history = useHistory();
  const { date } = useParams<RouteParams>();
  const [deposits, setDeposits] = useState('');
  const [withdrawals, setWithdrawals] = useState('');
  const { darkMode } = useTheme();
  
  // Load data for the selected date
  useIonViewWillEnter(() => {
    // TODO: Load existing data for the date if it exists
    console.log('Loading data for date:', date);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save the changes
    console.log('Saving data for date:', date, { deposits, withdrawals });
    history.goBack();
  };
  
  const handleBack = () => {
    history.goBack();
  };
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleBack}>
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle className="ion-text-center">
            {date ? `Edit ${new Date(date).toLocaleDateString()}` : 'Edit Day Summary'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Total Deposits</IonLabel>
          <IonItem>
            
            <IonInput 
              type="number" 
              value={deposits} 
              onIonChange={e => setDeposits(e.detail.value!)} 
              required 
            />
          </IonItem>
          
          <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Total Withdrawals</IonLabel>
          <IonItem>
            
            <IonInput 
              type="number" 
              value={withdrawals} 
              onIonChange={e => setWithdrawals(e.detail.value!)} 
              required 
            />
          </IonItem>
          
          <IonButton expand="block" type="submit" className="ion-margin-top">
            Save Changes
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
