import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonDatetime,
  IonModal,
} from '@ionic/react';
import { calendarOutline, arrowForward, arrowBack } from 'ionicons/icons';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isToday } from 'date-fns';
import useTransactions from '../../hooks/useTransactions';
import { Transaction } from '../../types';
import './Progress.css';

interface WeeklyProgressProps {
  initialDate?: Date;
}

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ initialDate = new Date() }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(initialDate, { weekStartsOn: 1 }));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { getTransactionsInRange } = useTransactions();
  const [weeklyTarget, setWeeklyTarget] = useState<number>(() => {
    const saved = localStorage.getItem('weeklyTarget');
    return saved ? parseFloat(saved) : 1000; // Default target
  });
  const [editingTarget, setEditingTarget] = useState<number>(weeklyTarget);
  const [isEditing, setIsEditing] = useState(false);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: weekEnd,
  });

  // Get transactions for the current week
  const transactions = getTransactionsInRange(currentWeekStart, weekEnd);
  
  // Calculate weekly stats
  const deposits = transactions.reduce((sum: number, t: Transaction) => sum + (t.type === 'deposit' ? t.amount : 0), 0);
  const withdrawals = transactions.reduce((sum: number, t: Transaction) => sum + (t.type === 'withdrawal' ? t.amount : 0), 0);
  const weeklyTotal = deposits - withdrawals;
  const daysPassed = weekDays.filter(day => day <= new Date() && day <= weekEnd).length;
  const dailyAverage = daysPassed > 0 ? deposits / daysPassed : 0; // Daily average based on deposits only
  const remaining = Math.max(0, weeklyTarget - deposits); // Remaining based on deposits only for savings goal
  const progress = weeklyTarget > 0 ? Math.min(1, deposits / weeklyTarget) : 0; // Progress based on deposits only
  const isTargetReached = deposits >= weeklyTarget;

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    setCurrentWeekStart(startOfWeek(newDate, { weekStartsOn: 1 }));
  };

  const handleDateChange = (e: CustomEvent) => {
    const selectedDate = new Date(e.detail.value);
    setCurrentWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }));
    setShowDatePicker(false);
  };

  const saveTarget = () => {
    const target = parseFloat(editingTarget.toString());
    if (!isNaN(target) && target > 0) {
      setWeeklyTarget(target);
      localStorage.setItem('weeklyTarget', target.toString());
      setIsEditing(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/calendar" />
          </IonButtons>
          <IonTitle>Weekly Progress</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Week Navigation */}
        <div className="progress-navigation">
          <IonButton fill="clear" onClick={() => navigateWeek('prev')}>
            <IonIcon icon={arrowBack} />
          </IonButton>
          
          <IonButton fill="clear" onClick={() => setShowDatePicker(true)}>
            {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            <IonIcon icon={calendarOutline} slot="end" />
          </IonButton>
          
          <IonButton fill="clear" onClick={() => navigateWeek('next')} disabled={isWithinInterval(new Date(), { start: currentWeekStart, end: weekEnd })}>
            <IonIcon icon={arrowForward} />
          </IonButton>
        </div>

        {/* Progress Card */}
        <IonCard className="progress-card">
          <IonCardHeader>
            <IonCardTitle className="ion-text-center">
              {isTargetReached ? (
                <IonText color="success">
                  Target Reached!<br />
                  <small>+${(weeklyTotal - weeklyTarget).toFixed(2)} extra</small>
                </IonText>
              ) : (
                `${(progress * 100).toFixed(1)}% of Weekly Goal`
              )}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonProgressBar 
              value={progress} 
              color={isTargetReached ? 'success' : 'primary'} 
              className="progress-bar"
            />
            
            <div className="progress-stats">
              <div className="stat-item">
                <IonText color="medium">Saved</IonText>
                <IonText color="primary">${weeklyTotal.toFixed(2)}</IonText>
              </div>
              <div className="stat-item">
                <IonText color="medium">Target</IonText>
                {isEditing ? (
                  <div className="target-edit">
                    <input 
                      type="number" 
                      value={editingTarget}
                      onChange={(e) => setEditingTarget(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="target-input"
                    />
                    <IonButton size="small" onClick={saveTarget}>Save</IonButton>
                  </div>
                ) : (
                  <IonText onClick={() => setIsEditing(true)} className="editable">
                    ${weeklyTarget.toFixed(2)}
                  </IonText>
                )}
              </div>
              <div className="stat-item">
                <IonText color="medium">Remaining</IonText>
                <IonText color={remaining > 0 ? 'danger' : 'success'}>
                  ${remaining.toFixed(2)}
                </IonText>
              </div>
            </div>
            
            <div className="progress-details">
              <div className="detail-item">
                <IonText>Daily Average</IonText>
                <IonText>${dailyAverage.toFixed(2)}</IonText>
              </div>
              <div className="detail-item">
                <IonText>Withdrawals</IonText>
                <IonText color="danger">-${withdrawals.toFixed(2)}</IonText>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Transactions List */}
        <IonList className="transactions-list">
          {weekDays.map((day, index) => {
            const dayTransactions = transactions.filter((t: Transaction) => {
              const transDate = new Date(t.date);
              return transDate.toDateString() === day.toDateString();
            });
            const dayTotal = dayTransactions.reduce((sum: number, t: Transaction) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);
            
            return (
              <IonItem key={index} className={isToday(day) ? 'today' : ''}>
                <IonLabel>
                  <h3>{format(day, 'EEEE')}</h3>
                  <p>{format(day, 'MMM d, yyyy')}</p>
                </IonLabel>
                <IonText color={dayTotal >= 0 ? 'primary' : 'danger'} slot="end">
                  {dayTotal >= 0 ? '+' : ''}{dayTotal.toFixed(2)}
                </IonText>
              </IonItem>
            );
          })}
        </IonList>

        {/* Date Picker Modal */}
        <IonModal isOpen={showDatePicker} onDidDismiss={() => setShowDatePicker(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Select Week</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDatePicker(false)}>Done</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonDatetime
              presentation="date"
              onIonChange={handleDateChange}
              value={currentWeekStart.toISOString()}
              firstDayOfWeek={1}
              showDefaultButtons
              doneText="Select"
              cancelText="Cancel"
            />
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default WeeklyProgress;
