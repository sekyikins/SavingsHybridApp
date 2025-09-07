import React, { useMemo, useEffect, useState } from 'react';
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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonText
} from '@ionic/react';
import { eyeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useTransactions from '../../hooks/useTransactions';
import { useSettings } from '../../hooks/useSettings';
import { dataIntegrationService } from '../../services/dataIntegrationService';
import { databaseService } from '../../services/databaseService';
import { logger } from '../../utils/debugLogger';
import { formatCurrency } from '../../utils/currencyUtils';
import type { UserProfile } from '../../config/supabase';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();
  const { user, loading: authLoading } = useAuth();
  const { transactions, error, refreshTransactions, isLoading } = useTransactions();
  const { settings: userSettings } = useSettings();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const now = new Date();
  
  useEffect(() => {
    logger.auth('Home component mounted', { 
      hasUser: !!user, 
      userId: user?.id,
      authLoading 
    });
    logger.componentMount('Home', { transactionCount: transactions.length });
    return () => logger.componentUnmount('Home');
  }, [user, authLoading, transactions]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const profile = await databaseService.getUserProfile(user.id);
          setUserProfile(profile);
        } catch (error) {
          logger.error('Error fetching user profile for greeting', error instanceof Error ? error : new Error(String(error)));
        }
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

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
    const monthlyGoal = savedTarget ? parseFloat(savedTarget) : 0; // Default target to 0
    const netTotal = stats.totalDeposits - stats.totalWithdrawals; // Net total (deposits - withdrawals)
    const progress = monthlyGoal > 0 && netTotal > 0 ? Math.min(netTotal / monthlyGoal, 1) : 0; // Progress based on net total, 0% if net is negative
    
    logger.data('Home monthly stats calculated', {
      totalDeposits: stats.totalDeposits,
      totalWithdrawals: stats.totalWithdrawals,
      netTotal,
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
    
    const weeklyGoal = userSettings?.weekly_goal || 0; // Use weekly_goal from UserSettings
    const netTotal = stats.totalDeposits - stats.totalWithdrawals; // Net total (deposits - withdrawals)
    const progress = weeklyGoal > 0 && netTotal > 0 ? Math.min(netTotal / weeklyGoal, 1) : 0; // Progress based on net total, 0% if net is negative
    
    logger.data('Home weekly stats calculated', {
      totalDeposits: stats.totalDeposits,
      totalWithdrawals: stats.totalWithdrawals,
      netTotal,
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
  }, [transactions, now, userSettings?.weekly_goal]);

  const handleRefresh = async (event: CustomEvent) => {
    logger.navigation('Pull-to-refresh triggered on Home page');
    try {
      await refreshTransactions();
      logger.navigation('Home page data refreshed successfully');
    } catch (error) {
      logger.error('Error refreshing Home page data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      event.detail.complete();
    }
  };

  // Show loading state while authentication is being determined
  if (authLoading || isLoading) {
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
        <IonRefresher onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon="chevron-down-circle-outline"
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>
        <div className="dashboard-container">
          {/* Greeting Text */}
          <div className="greeting-container">
            <IonText>
              <h2 style={{ margin: '0', fontSize: '1.2rem', fontWeight: '600', color: 'var(--ion-color-medium)' }}>
                👋Hello {userProfile?.username || userProfile?.full_name?.split(' ')[0] || 'there'}!
              </h2>
            </IonText>
          </div>
          
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
                <span className="current-amount">{formatCurrency(monthlyStats.totalSaved, userSettings?.currency)}</span>
                <span className="goal-amount"> / {formatCurrency(monthlyStats.monthlyGoal, userSettings?.currency)}</span>
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
                    {formatCurrency(monthlyStats.dailyAverage, userSettings?.currency)}
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">Remaining</div>
                  <div className="stat-value">
                    {formatCurrency(monthlyStats.monthlyGoal - monthlyStats.totalSaved, userSettings?.currency)}
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
                <span className="current-amount">{formatCurrency(weeklyStats.totalSaved, userSettings?.currency)}</span>
                <span className="goal-amount"> / {formatCurrency(weeklyStats.weeklyGoal, userSettings?.currency)}</span>
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
                    {formatCurrency(weeklyStats.weeklyGoal - weeklyStats.totalSaved, userSettings?.currency)}
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
