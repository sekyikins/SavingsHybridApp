import React, { useMemo, useEffect } from 'react';
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
  IonCardContent,
  IonSpinner
} from '@ionic/react';
import { eyeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useTransactions from '../../hooks/useTransactions';
import { useSettings } from '../../contexts/SettingsContext';
import { dataIntegrationService } from '../../services/dataIntegrationService';
import { logger } from '../../utils/debugLogger';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();
  const { user, loading: authLoading } = useAuth();
  const { transactions, error } = useTransactions();
  const { savingsGoals } = useSettings();
  const now = new Date();
  
  useEffect(() => {
    logger.auth('Home component mounted', { 
      hasUser: !!user, 
      userId: user?.id,
      authLoading 
    });
  }, [user, authLoading]);
  
  useEffect(() => {
    logger.componentMount('Home', { transactionCount: transactions.length });
    return () => logger.componentUnmount('Home');
  }, []);
  
  useEffect(() => {
    if (error) {
      logger.error('Home page transaction error', error);
    }
  }, [transactions, error]);

  // Calculate monthly stats using the centralized service - ALWAYS call this hook
  const monthlyStats = useMemo(() => {
    const monthStart = dataIntegrationService.getCurrentMonthStart(now);
    const stats = dataIntegrationService.getMonthlyStats(monthStart, transactions);
    
    // Use localStorage to match MonthlyProgress page
    const savedTarget = localStorage.getItem('monthlyTarget');
    const monthlyGoal = savedTarget ? parseFloat(savedTarget) : 4000; // Default target
    const progress = monthlyGoal > 0 ? Math.min(stats.totalDeposits / monthlyGoal, 1) : 0;
    
    logger.data('Home monthly stats calculated', {
      totalDeposits: stats.totalDeposits,
      totalWithdrawals: stats.totalWithdrawals,
      progress: progress * 100
    });
    
    return {
      totalSaved: stats.netAmount,
      monthlyGoal,
      progress,
      dailyAverage: stats.dailyAverage,
      deposits: stats.totalDeposits,
      withdrawals: stats.totalWithdrawals
    };
  }, [transactions, now]);
  
  // Calculate weekly stats using data integration service - ALWAYS call this hook
  const weeklyStats = useMemo(() => {
    const weekStart = dataIntegrationService.getCurrentWeekStart(now);
    const stats = dataIntegrationService.getWeeklyStats(weekStart, transactions);
    
    const weeklyGoal = savingsGoals?.weeklyGoal || 250;
    const progress = weeklyGoal > 0 ? Math.min(stats.totalDeposits / weeklyGoal, 1) : 0;
    
    logger.data('Home weekly stats calculated', {
      totalDeposits: stats.totalDeposits,
      totalWithdrawals: stats.totalWithdrawals,
      progress: progress * 100
    });
    
    return {
      totalSaved: stats.netAmount,
      weeklyGoal,
      progress,
      daysPassed: stats.daysPassed,
      deposits: stats.totalDeposits,
      withdrawals: stats.totalWithdrawals
    };
  }, [transactions, now, savingsGoals?.weeklyGoal]);

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Home</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <div style={{ textAlign: 'center' }}>
              <IonSpinner name="crescent" />
              <p>Loading your savings data...</p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Show error state if no user (shouldn't happen with ProtectedRoute)
  if (!user) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Home</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <p>Please sign in to view your savings data.</p>
            <IonButton onClick={() => history.push('/auth')}>Sign In</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

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
