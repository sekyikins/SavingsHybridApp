import React, { useMemo } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/react';
import { eyeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import useTransactions from '../../hooks/useTransactions';
import { useSettings } from '../../contexts/SettingsContext';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();
  const { transactions } = useTransactions();
  const { savingsGoals } = useSettings();
  const now = new Date();
  
  console.log('=== DEBUG: Home Component ===');
  console.log('Current savings goals:', savingsGoals);
  console.log('Current date:', now.toISOString());
  console.log('All transactions:', transactions);
  
  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    console.log('Monthly date range:', { start, end });
    
    const monthlyTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const isInRange = txDate >= start && txDate <= end;
      console.log(`[Monthly] Transaction ${tx.id} - Date: ${tx.date} (${txDate.toISOString()}), Type: ${tx.type}, Amount: ${tx.amount}, In Range: ${isInRange} (${start.toISOString()} - ${end.toISOString()})`);
      return isInRange;
    });
    
    console.log('Monthly transactions:', monthlyTransactions);
    
    const deposits = monthlyTransactions
      .filter(tx => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const withdrawals = monthlyTransactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const monthlyGoal = savingsGoals?.monthlyGoal || 1000;
    const progress = monthlyGoal > 0 ? Math.min(deposits / monthlyGoal, 1) : 0;
    
    console.log('Monthly calculations:', { deposits, withdrawals, monthlyGoal, progress });
    
    return {
      totalSaved: deposits - withdrawals,
      monthlyGoal,
      progress,
      dailyAverage: now.getDate() > 0 ? (deposits / now.getDate()) : 0
    };
  }, [transactions, now]);
  
  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    
    console.log('Weekly date range:', { start, end });
    
    const weeklyTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const isInRange = txDate >= start && txDate <= end;
      console.log(`[Weekly] Transaction ${tx.id} - Date: ${tx.date} (${txDate.toISOString()}), Type: ${tx.type}, Amount: ${tx.amount}, In Range: ${isInRange} (${start.toISOString()} - ${end.toISOString()})`);
      return isInRange;
    });
    
    console.log('Weekly transactions:', weeklyTransactions);
    
    const deposits = weeklyTransactions
      .filter(tx => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const withdrawals = weeklyTransactions
      .filter(tx => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const weeklyGoal = savingsGoals?.weeklyGoal || 250;
    const progress = weeklyGoal > 0 ? Math.min(deposits / weeklyGoal, 1) : 0;
    
    console.log('Weekly calculations:', { deposits, withdrawals, weeklyGoal, progress });
    
    return {
      totalSaved: deposits - withdrawals,
      weeklyGoal,
      progress,
      daysPassed: Math.min(
        Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        7
      )
    };
  }, [transactions, now]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="ion-text-center">Savings Overview</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen className="ion-padding">
        <div className="dashboard-container">
          {/* Monthly Progress Card */}
          <IonCard 
            className="savings-card" 
            button 
            onClick={() => history.push('/progress/monthly')}
          >
            <IonCardHeader>
              <IonCardTitle className="card-title">Monthly Progress</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="amount-display">
                <span className="current-amount">${monthlyStats.totalSaved.toFixed(2)}</span>
                <span className="goal-amount"> / ${monthlyStats.monthlyGoal}</span>
              </div>
              
              <IonProgressBar 
                value={monthlyStats.progress} 
                className="progress-bar"
              />
              
              <div className="progress-text">
                {Math.round(monthlyStats.progress * 100)}% of monthly goal
              </div>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Daily Average</div>
                  <div className="stat-value">
                    ${monthlyStats.dailyAverage.toFixed(2)}
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">Remaining</div>
                  <div className="stat-value">
                    ${(monthlyStats.monthlyGoal - monthlyStats.totalSaved).toFixed(2)}
                  </div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Weekly Progress Card */}
          <IonCard 
            className="savings-card" 
            button 
            onClick={() => history.push('/progress/weekly')}
          >
            <IonCardHeader>
              <IonCardTitle className="card-title">Weekly Progress</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="amount-display">
                <span className="current-amount">${weeklyStats.totalSaved.toFixed(2)}</span>
                <span className="goal-amount"> / ${weeklyStats.weeklyGoal}</span>
              </div>
              
              <IonProgressBar 
                value={weeklyStats.progress} 
                className="progress-bar"
              />
              
              <div className="progress-text">
                {Math.round(weeklyStats.progress * 100)}% of weekly goal
              </div>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Days Tracked</div>
                  <div className="stat-value">
                    {weeklyStats.daysPassed}/7
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">Remaining</div>
                  <div className="stat-value">
                    ${(weeklyStats.weeklyGoal - weeklyStats.totalSaved).toFixed(2)}
                  </div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
          
          {/* Action Button */}
          <IonButton 
            expand="block" 
            className="primary-button"
            routerLink="/activities"
          >
            <IonIcon slot="start" icon={eyeOutline} />
            View Activities
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
