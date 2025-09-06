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
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isToday, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import useTransactions from '../../hooks/useTransactions';
import { useSettings } from '../../contexts/SettingsContext';
import { Transaction } from '../../config/supabase';
import './Progress.css';

interface WeeklyProgressProps {
  initialDate?: Date;
}

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ initialDate = new Date() }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(initialDate, { weekStartsOn: 1 }));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { getTransactionsInRange } = useTransactions();
  const { savingsGoals, updateSavingsGoals } = useSettings();
  const [editingTarget, setEditingTarget] = useState<number>(savingsGoals?.weeklyGoal || 0);
  const [isEditing, setIsEditing] = useState(false);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: weekEnd,
  });

  // Get transactions for the current week
  const transactions = getTransactionsInRange(currentWeekStart, weekEnd);
  
  // Debug logging
  console.log('WeeklyProgress Debug:', {
    weekStart: format(currentWeekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    totalTransactions: transactions.length,
    transactionDates: transactions.map(t => t.transaction_date),
    transactions: transactions.map(t => ({ date: t.transaction_date, type: t.transaction_type, amount: t.amount }))
  });
  
  // Calculate weekly goal - use weekly goal if set, otherwise derive from monthly goal
  const monthlyGoal = savingsGoals?.monthlyGoal || 0;
  const weeklyGoalFromSettings = savingsGoals?.weeklyGoal;
  
  // Calculate actual weeks in the current month for better weekly goal calculation
  const currentMonth = startOfMonth(currentWeekStart);
  const monthEnd = endOfMonth(currentMonth);
  const weeksInMonth = eachWeekOfInterval(
    { start: currentMonth, end: monthEnd },
    { weekStartsOn: 1 }
  ).length;
  
  const weeklyGoal = weeklyGoalFromSettings !== undefined && weeklyGoalFromSettings > 0 
    ? weeklyGoalFromSettings 
    : monthlyGoal > 0 
      ? Math.round((monthlyGoal / weeksInMonth) * 100) / 100 // Divide by actual weeks in month
      : 0;
  
  // Calculate weekly stats
  const deposits = transactions.reduce((sum: number, t: Transaction) => sum + (t.transaction_type === 'deposit' ? t.amount : 0), 0);
  const withdrawals = transactions.reduce((sum: number, t: Transaction) => sum + (t.transaction_type === 'withdrawal' ? t.amount : 0), 0);
  const totalAmount = deposits - withdrawals; // Total amount (saved + withdrawals)
  const daysPassed = weekDays.filter(day => day <= new Date() && day <= weekEnd).length;
  const dailyAverage = daysPassed > 0 ? totalAmount / daysPassed : 0; // Daily average based on deposits only
  const remaining = Math.max(0, weeklyGoal - totalAmount); // Remaining based on total amount
  const progress = weeklyGoal > 0 && totalAmount > 0 ? Math.min(1, totalAmount / weeklyGoal) : 0; // Progress based on total amount, 0% if total is negative or zero
  const isTargetReached = totalAmount >= weeklyGoal && weeklyGoal > 0;

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
      updateSavingsGoals({ weeklyGoal: editingTarget });
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
                  <small>+${(totalAmount - weeklyGoal).toFixed(2)} extra</small>
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
            
            <IonText className="progress-text">
              {weeklyGoal > 0 ? `${Math.round((totalAmount / weeklyGoal) * 100)}%` : '0%'} of weekly goal
            </IonText>
            
            <div className="progress-stats">
              <div className="stat-item">
                <IonText color="medium">Saved</IonText>
                <IonText color="primary">${deposits.toFixed(2)}</IonText>
              </div>
              <div className="stat-item">
                <IonText color="medium">Total</IonText>
                <IonText color={totalAmount >= 0 ? 'primary' : 'danger'}>${totalAmount.toFixed(2)}</IonText>
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
                  <IonText className="editable" onClick={() => setIsEditing(true)}>
                    ${weeklyGoal.toFixed(2)}
                  </IonText>
                )}
              </div>
              <div className="stat-item">
                <IonText color="medium">Remaining</IonText>
                <IonText color={remaining > 0 ? 'danger' : 'success'}>
                  ${remaining.toFixed(2)}
                </IonText>
              </div>
              <div className="stat-item">
                <IonText>Daily Average</IonText>
                <IonText>${dailyAverage.toFixed(2)}</IonText>
              </div>
              <div className="stat-item">
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
              const transDate = new Date(t.transaction_date);
              const dayString = format(day, 'yyyy-MM-dd');
              const transDateString = format(transDate, 'yyyy-MM-dd');
              return transDateString === dayString;
            });
            const dayTotal = dayTransactions.reduce((sum: number, t: Transaction) => sum + (t.transaction_type === 'deposit' ? t.amount : -t.amount), 0);
            
            // Debug logging
            if (dayTransactions.length > 0) {
              console.log(`Day ${format(day, 'yyyy-MM-dd')} has ${dayTransactions.length} transactions, total: ${dayTotal}`);
            }
            
            return (
              <IonItem key={index} className={isToday(day) ? 'today' : ''}>
                <IonLabel>
                  <h3>{format(day, 'EEEE')}</h3>
                  <p>{format(day, 'MMM d, yyyy')}</p>
                </IonLabel>

                <div className='transaction-count'>
                  <div>
                    {dayTransactions.length > 0 && (
                      <p style={{ fontSize: '0.8em', color: 'gray' }}>
                        {dayTransactions.length} transaction(s)
                      </p>
                    )}
                  </div>
                <IonText color={dayTotal >= 0 ? 'primary' : 'danger'} slot="end">
                  {dayTotal >= 0 ? '+' : ''}${Math.abs(dayTotal).toFixed(2)}
                </IonText>
                </div>
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