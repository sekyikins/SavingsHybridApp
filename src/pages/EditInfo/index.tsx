import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButtons, IonButton, IonInput, IonItem, IonLabel,
  IonIcon, useIonViewWillEnter 
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useState } from 'react';
import { chevronBack } from 'ionicons/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../config/supabase';

interface RouteParams {
  date: string;
}

export const EditInfo: React.FC = () => {
  const history = useHistory();
  const { date } = useParams<RouteParams>();
  const { darkMode } = useTheme();
  const [deposit, setDeposit] = useState<number | undefined>();
  const [withdrawal, setWithdrawal] = useState<number | undefined>();

  // Load data when the view enters
  useIonViewWillEnter(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('deposit, withdrawal')
        .eq('date', date)
        .single();
      
      if (data) {
        setDeposit(data.deposit);
        setWithdrawal(data.withdrawal);
      }
    };
    
    loadData();
  }, [date]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase
        .from('transactions')
        .upsert({
          date,
          deposit: deposit || 0,
          withdrawal: withdrawal || 0,
          updated_at: new Date().toISOString()
        });
      
      // Navigate back to calendar
      history.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
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
            {date ? `Transaction - ${new Date(date).toLocaleDateString()}` : 'Add Transaction'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleSave}>
          <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Deposit</IonLabel>
          <IonItem>
            <IonInput 
              type="number" 
              value={deposit}
              onIonChange={e => setDeposit(Number(e.detail.value))}
              className={darkMode ? 'dark-input' : ''}
            />
          </IonItem>
          
          <IonLabel position="stacked" className={`ion-margin-top ${darkMode ? 'dark-label' : ''}`}>
            Withdrawal
          </IonLabel>
          <IonItem>
            <IonInput 
              type="number" 
              value={withdrawal}
              onIonChange={e => setWithdrawal(Number(e.detail.value))}
              className={darkMode ? 'dark-input' : ''}
            />
          </IonItem>
          
          <IonButton 
            expand="block" 
            type="submit" 
            className="ion-margin-top"
          >
            Save Transaction
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
};
