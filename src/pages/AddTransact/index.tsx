import { useState, useEffect } from 'react';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButton, IonInput, IonItem, IonLabel, IonSelect, 
  IonSelectOption, IonButtons, IonIcon, useIonToast 
} from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { chevronBack } from 'ionicons/icons';
import { useTheme } from '../../contexts/ThemeContext';
import useTransactions from '../../hooks/useTransactions';
import { logger } from '../../utils/debugLogger';
import dataIntegrationService from '../../services/dataIntegrationService'; // Import dataIntegrationService
import './AddTransact.css';

export default function AddTransact() {
  const history = useHistory();
  const location = useLocation();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { darkMode } = useTheme();
  const { addTransaction } = useTransactions();
  const [present] = useIonToast();

  // Get date from URL params
  useEffect(() => {
    logger.navigation('AddTransact component mounted', { search: location.search });
    const urlParams = new URLSearchParams(location.search);
    const dateParam = urlParams.get('date');
    if (dateParam) {
      logger.navigation('Date parameter found', { dateParam });
      setSelectedDate(dateParam);
    } else {
      const today = new Date().toISOString().split('T')[0];
      logger.navigation('No date parameter, using today', { today });
      setSelectedDate(today);
    }
  }, [location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      logger.data('Form submission already in progress, ignoring');
      return;
    }

    logger.data('Form submission started', { amount, type, description, selectedDate });
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      logger.data('Invalid amount provided', { amount });
      present({
        message: 'Please enter a valid amount',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const transactionData = {
        amount: Number(amount),
        transaction_type: type,
        transaction_date: selectedDate,
        description: description || (type === 'deposit' ? 'Deposit' : 'Withdrawal')
      };
      
      logger.data('Calling addTransaction with data', transactionData);
      await addTransaction(transactionData);
      
      logger.data('Transaction added successfully', { amount: Number(amount), type });
      
      // Clear cache to refresh UI components
      dataIntegrationService.clearCache();
      
      present({
        message: 'Transaction added successfully',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      
      // Clear form
      setAmount('');
      setDescription('');
      
      // Navigate back after a short delay to allow toast to show
      setTimeout(() => {
        logger.navigation('Navigating back after successful transaction');
        history.push('/home');
      }, 1000);
      
    } catch (error) {
      logger.error('Failed to add transaction', error as Error, { amount, type, description });
      present({
        message: `Failed to add transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackButton = () => {
    logger.navigation('Back button clicked');
    history.push('/home');
  };
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleBackButton}>
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle className="ion-text-center">
            {selectedDate && selectedDate !== new Date().toISOString().split('T')[0] 
              ? `Add Transaction - ${new Date(selectedDate).toLocaleDateString()}` 
              : 'Add Transaction'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Amount</IonLabel>
            <IonInput 
              type="number" 
              value={amount} 
              onIonInput={e => setAmount(e.detail.value!)} 
              required 
              placeholder="Enter amount"
            />
          </IonItem>
          
          <IonItem>
            <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Type</IonLabel>
            <IonSelect 
              value={type} 
              onIonChange={e => setType(e.detail.value as 'deposit' | 'withdrawal')}
              interface="popover"
            >
              <IonSelectOption value="deposit">Deposit</IonSelectOption>
              <IonSelectOption value="withdrawal">Withdrawal</IonSelectOption>
            </IonSelect>
          </IonItem>
          
          <IonItem>
            <IonLabel position="stacked" className={darkMode ? 'dark-label' : ''}>Description (Optional)</IonLabel>
            <IonInput 
              value={description} 
              onIonInput={e => setDescription(e.detail.value!)} 
              placeholder="e.g., Salary, Groceries, etc."
            />
          </IonItem>
          
          <IonButton 
            expand="block" 
            type="submit" 
            className="ion-margin-top"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
