import React, { useState } from 'react';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButton, IonInput, IonItem, IonLabel, IonButtons, 
  IonIcon, useIonViewWillEnter, useIonToast 
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { chevronBack } from 'ionicons/icons';
import { useTheme } from '../../contexts/ThemeContext';
import useTransactions from '../../hooks/useTransactions';
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
  const { transactions, addTransaction } = useTransactions();
  const [present] = useIonToast();
  
  // Load existing data for the selected date
  useIonViewWillEnter(() => {
    if (date) {
      const dateTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.transaction_date).toISOString().split('T')[0];
        return txDate === date;
      });
      
      const totalDeposits = dateTransactions
        .filter(tx => tx.transaction_type === 'deposit')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const totalWithdrawals = dateTransactions
        .filter(tx => tx.transaction_type === 'withdrawal')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      setDeposits(totalDeposits.toString());
      setWithdrawals(totalWithdrawals.toString());
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deposits && !withdrawals) {
      present({
        message: 'Please enter at least one amount',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      return;
    }

    // Add new summary transactions
    if (deposits && Number(deposits) > 0) {
      addTransaction({
        amount: Number(deposits),
        transaction_type: 'deposit',
        transaction_date: new Date(date!).toISOString(),
        description: 'Daily deposit summary'
      });
    }

    if (withdrawals && Number(withdrawals) > 0) {
      addTransaction({
        amount: Number(withdrawals),
        transaction_type: 'withdrawal',
        transaction_date: new Date(date!).toISOString(),
        description: 'Daily withdrawal summary'
      });
    }

    present({
      message: 'Daily summary updated successfully',
      duration: 2000,
      color: 'success',
      position: 'top'
    });

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
