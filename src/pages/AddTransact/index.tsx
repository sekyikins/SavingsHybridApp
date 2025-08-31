import { useState } from 'react';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButton, IonInput, IonItem, IonLabel, IonSelect, 
  IonSelectOption, IonButtons, IonIcon, useIonToast 
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { chevronBack } from 'ionicons/icons';
import { useTheme } from '../../contexts/ThemeContext';
import useTransactions from '../../hooks/useTransactions';
import './AddTransact.css';

export default function AddTransact() {
  const history = useHistory();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [description, setDescription] = useState('');
  const { darkMode } = useTheme();
  const { addTransaction } = useTransactions();
  const [present] = useIonToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      present({
        message: 'Please enter a valid amount',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      return;
    }
    
    addTransaction({
      amount: Number(amount),
      type,
      date: new Date().toISOString(),
      description: description || (type === 'deposit' ? 'Deposit' : 'Withdrawal')
    });
    
    present({
      message: 'Transaction added successfully',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    
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
            <IonSelect 
              value={type} 
              onIonChange={e => setType(e.detail.value as 'deposit' | 'withdrawal')}
              interface="popover"
            >
              <IonSelectOption value="deposit">Deposit</IonSelectOption>
              <IonSelectOption value="withdrawal">Withdrawal</IonSelectOption>
            </IonSelect>
          </IonItem>
          
          <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Description (Optional)</IonLabel>
          <IonItem>
            <IonInput 
              value={description} 
              onIonChange={e => setDescription(e.detail.value!)} 
              placeholder="e.g., Salary, Groceries, etc."
            />
          </IonItem>
          
          <IonButton expand="block" type="submit" className="ion-margin-top">
            Save Transaction
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
