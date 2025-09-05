import React, { useState, useMemo, useCallback } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonDatetime,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonText,
  IonProgressBar
} from '@ionic/react';
import { 
  arrowBack, 
  arrowForward, 
  calendarOutline,
} from 'ionicons/icons';
import useTransactions from '../../hooks/useTransactions';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  isSameMonth,
  endOfDay,
} from 'date-fns';
import { Transaction } from '../../config/supabase';
import './Progress.css';

interface MonthlyProgressProps {
  initialDate?: Date;
}

interface MonthlyStats {
  total: number;
  withdrawals: number;
  dailyAverage: number;
  remaining: number;
  progress: number;
  isTargetReached: boolean;
  extra: number;
}

const MonthlyProgress: React.FC<MonthlyProgressProps> = ({ initialDate = new Date() }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialDate));
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const { getTransactionsInRange } = useTransactions();
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem('monthlyTarget');
    return saved ? parseFloat(saved) : 4000; // Default target
  });
  const [editingTarget, setEditingTarget] = useState<number>(monthlyTarget);
  const [isEditing, setIsEditing] = useState(false);

  const monthEnd = endOfMonth(currentMonth);
  const monthStart = startOfMonth(currentMonth);
  const today = new Date();
  const monthDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd
  });

  // Calculate monthly stats with useMemo to prevent unnecessary recalculations
  const { total, withdrawals, dailyAverage, remaining, progress, isTargetReached } = useMemo<Omit<MonthlyStats, 'extra'>>(() => {
    const transactions = getTransactionsInRange(monthStart, monthEnd);
    
    const total = transactions.reduce((sum, t) => 
      sum + (t.transaction_type === 'deposit' ? t.amount : 0), 0);
      
    const withdrawals = transactions.reduce((sum, t) => 
      sum + (t.transaction_type === 'withdrawal' ? Math.abs(t.amount) : 0), 0);
      
    const daysPassed = monthDays.filter(day => day <= today && day <= monthEnd).length;
    const dailyAvg = daysPassed > 0 ? total / daysPassed : 0;
    const targetReached = monthlyTarget > 0 && total >= monthlyTarget;
    const remaining = Math.max(0, monthlyTarget - total);
    const prog = monthlyTarget > 0 ? Math.min(1, total / monthlyTarget) : 0;
    
    return {
      total,
      withdrawals,
      dailyAverage: dailyAvg,
      remaining,
      progress: prog,
      isTargetReached: targetReached
    };
  }, [getTransactionsInRange, monthStart, monthEnd, monthDays, monthlyTarget, today, monthEnd]);

  const navigateMonth = (direction: 'prev' | 'next'): void => {
    setCurrentMonth(direction === 'prev' 
      ? subMonths(currentMonth, 1) 
      : addMonths(currentMonth, 1)
    );
  };

  // Get transactions for a specific day
  const getTransactionsByDay = useCallback((day: Date): Transaction[] => {
    const transactions = getTransactionsInRange(day, endOfDay(day));
    return transactions;
  }, [getTransactionsInRange]);

  // Get days that have transactions
  // const daysWithTransactions = useMemo(() => {
  //   return monthDays.filter(day => {
  //     const dayTransactions = getTransactionsByDay(day);
  //     return dayTransactions.length > 0;
  //   });
  // }, [monthDays, getTransactionsByDay]);

  const handleDateChange = (e: CustomEvent) => {
    const selectedDate = new Date(e.detail.value);
    setCurrentMonth(startOfMonth(selectedDate));
    setShowDatePicker(false);
  };

  const saveTarget = (): void => {
    const target = parseFloat(editingTarget.toString());
    if (!isNaN(target) && target > 0) {
      setMonthlyTarget(target);
      localStorage.setItem('monthlyTarget', target.toString());
      setIsEditing(false);
    }
  };

  // Calculate month name and year for display
  const monthName = format(currentMonth, 'MMMM yyyy');
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/progress" />
          </IonButtons>
          <IonTitle>Monthly Progress</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Month Navigation */}
        <div className="progress-navigation">
          <IonButton fill="clear" onClick={() => navigateMonth('prev')}>
            <IonIcon icon={arrowBack} />
          </IonButton>
          
          <IonButton fill="clear" onClick={() => setShowDatePicker(true)}>
            {monthName}
            <IonIcon icon={calendarOutline} slot="end" />
          </IonButton>
          
          <IonButton 
            fill="clear" 
            onClick={() => navigateMonth('next')} 
            disabled={isCurrentMonth}
          >
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
                  <small>+${(total - monthlyTarget).toFixed(2)} extra</small>
                </IonText>
              ) : (
                `${(progress * 100).toFixed(1)}% of Monthly Goal`
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
              {monthlyTarget > 0 ? `${Math.round((total / monthlyTarget) * 100)}%` : '0%'} of monthly goal
            </IonText>
            
            <div className="progress-stats">
              <div className="stat-item">
                <IonText color="medium">Saved</IonText>
                <IonText color="primary">${total.toFixed(2)}</IonText>
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
                    ${monthlyTarget.toFixed(2)}
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
          {monthDays.map((day, index) => {
            const dayTransactions = getTransactionsByDay(day);
            const dayTotal = dayTransactions.reduce((sum: number, t: Transaction) => sum + (t.transaction_type === 'deposit' ? t.amount : -t.amount), 0);
            
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
              <IonTitle>Select Month</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDatePicker(false)}>Done</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonDatetime
              presentation="month"
              onIonChange={handleDateChange}
              value={currentMonth.toISOString()}
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

export default MonthlyProgress;
