import { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonButtons, IonIcon } from '@ionic/react';
import { chevronBack, create } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './AddInfoToDate.css';

export default function AddInfoToDate() {
  const history = useHistory();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const { darkMode } = useTheme();
  
  const handleSubmit = () => {
    // Handle form submission
    history.goBack();
  };
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle className="ion-text-center">Add Transaction</IonTitle>
          <IonButtons slot="end">
            <IonButton>
              <IonIcon icon={create} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Amount</IonLabel>
          <IonItem>
            
            <IonInput 
              type="number" 
              value={amount} 
              onIonChange={e => setAmount(e.detail.value!)} 
              required 
            />
          </IonItem>
          
          <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Type</IonLabel>
          <IonItem>
            
            <IonSelect value={type} onIonChange={e => setType(e.detail.value)}>
              <IonSelectOption value="deposit">Deposit</IonSelectOption>
              <IonSelectOption value="withdrawal">Withdrawal</IonSelectOption>
            </IonSelect>
          </IonItem>
          
          <IonButton expand="block" type="submit" className="ion-margin-top">
            Save Transaction
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
