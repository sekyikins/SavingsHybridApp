import React, { useState, useEffect } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonButton,
  IonIcon,
  IonProgressBar
} from '@ionic/react';
import { eyeOutline } from 'ionicons/icons';
import './Home.css';

// Type definitions
interface SavingsSummary {
  totalSaved: number;
  monthlyGoal: number;
  progress: number;
}

const Home: React.FC = () => {
  const [savings, setSavings] = useState<SavingsSummary>({
    totalSaved: 0,
    monthlyGoal: 1000,
    progress: 0
  });

  const [weeklyProgress, setWeeklyProgress] = useState(0);

  // Load savings data
  useEffect(() => {
    const fetchSavings = async () => {
      try {
        // Simulated data
        setTimeout(() => {
          setSavings({
            totalSaved: 750,
            monthlyGoal: 1000,
            progress: 0.75
          });
        }, 500);
      } catch (error) {
        console.error('Error fetching savings data:', error);
      }
    };

    fetchSavings();
  }, []);

  // Calculate weekly progress
  useEffect(() => {
    // Add your weekly progress calculation logic here
    const calculatedWeeklyProgress = 65; // Example value
    setWeeklyProgress(calculatedWeeklyProgress);
  }, []);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="ion-text-center">Savings Overview</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen className="ion-padding">
        <div className="dashboard-container">
          
          {/* Savings Card - Monthly Progress*/}
          <div className="savings-card">
            <h3 className="card-title">Monthly Progress</h3>
            
            <div className="amount-display">
              <span className="current-amount">${savings.totalSaved.toFixed(2)}</span>
              <span className="goal-amount"> / ${savings.monthlyGoal}</span>
            </div>
            
            <IonProgressBar 
              value={savings.progress} 
              className="progress-bar"
            />
            
            <div className="progress-text">
              {Math.round(savings.progress * 100)}% of monthly goal
            </div>
            
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Daily Average</div>
                <div className="stat-value">
                  ${(savings.totalSaved / new Date().getDate()).toFixed(2)}
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-label">Remaining</div>
                <div className="stat-value">
                  ${(savings.monthlyGoal - savings.totalSaved).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="savings-card">
            <h3 className="card-title">Weekly Progress</h3>
            
            <div className="amount-display">
              <span className="current-amount">${savings.totalSaved.toFixed(2)}</span>
              <span className="goal-amount"> / ${savings.monthlyGoal}</span>
            </div>
            
            <IonProgressBar 
              value={weeklyProgress/100} 
              className="progress-bar"
            />
            
            <div className="progress-text">
              {Math.round(weeklyProgress)}% of weekly goal
            </div>
            
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Daily Average</div>
                <div className="stat-value">
                  ${(savings.totalSaved / new Date().getDate()).toFixed(2)}
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-label">Remaining</div>
                <div className="stat-value">
                  ${(savings.monthlyGoal - savings.totalSaved).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
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
