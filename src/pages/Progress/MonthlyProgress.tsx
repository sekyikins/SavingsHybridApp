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
  IonCardSubtitle,
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
  checkmarkCircle,
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
import { Transaction } from '../../types/mock';
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
  const { total, withdrawals, dailyAverage, remaining, progress, isTargetReached, extra } = useMemo<MonthlyStats>(() => {
    const transactions = getTransactionsInRange(monthStart, monthEnd);
    
    const total = transactions.reduce((sum, t) => 
      sum + (t.type === 'deposit' ? t.amount : 0), 0);
      
    const withdrawals = transactions.reduce((sum, t) => 
      sum + (t.type === 'withdrawal' ? Math.abs(t.amount) : 0), 0);
      
    const daysPassed = monthDays.filter(day => day <= today && day <= monthEnd).length;
    const dailyAvg = daysPassed > 0 ? total / daysPassed : 0;
    const targetReached = monthlyTarget > 0 && total >= monthlyTarget;
    const remaining = Math.max(0, monthlyTarget - total);
    const extra = Math.max(0, total - monthlyTarget);
    const prog = monthlyTarget > 0 ? Math.min(1, total / monthlyTarget) : 0;
    
    return {
      total,
      withdrawals,
      dailyAverage: dailyAvg,
      remaining,
      progress: prog,
      isTargetReached: targetReached,
      extra: extra
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
  const daysWithTransactions = useMemo(() => {
    return monthDays.filter(day => {
      const dayTransactions = getTransactionsByDay(day);
      return dayTransactions.length > 0;
    });
  }, [monthDays, getTransactionsByDay]);

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
          
          <h2>{monthName}</h2>
          
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
            <div className="progress-container">
              <IonProgressBar 
                value={progress}
                color={isTargetReached ? 'success' : 'primary'}
              />
              <div className="progress-text">
                {isTargetReached 
                  ? `100% of monthly goal with $${extra.toFixed(2)} extra`
                  : `${Math.round(progress * 100)}% of monthly goal`
                }
                {isTargetReached && (
                  <IonIcon 
                    icon={checkmarkCircle} 
                    color="success" 
                    className="target-reached-icon"
                    style={{ marginLeft: '8px' }}
                  />
                )}
              </div>
            </div>
            
            <div className="progress-stats">
              <div className="stat">
                <IonText color="primary">${withdrawals.toFixed(2)}</IonText>
                <IonText color="medium">Withdrawn</IonText>
              </div>
              
              <div className="stat">
                <IonText color={remaining > 0 ? 'success' : 'danger'}>
                  ${remaining.toFixed(2)}
                </IonText>
                <IonText color="medium">Remaining</IonText>
              </div>
              
              <div className="stat">
                <IonText color={dailyAverage >= (monthlyTarget / 30) ? 'success' : 'danger'}>
                  ${dailyAverage.toFixed(2)}
                </IonText>
                <IonText color="medium">Daily Avg</IonText>
              </div>
            </div>
            
            <div className="progress-details">
              <div className="detail-item">
                <IonText>Target</IonText>
                <IonText>${monthlyTarget.toFixed(2)}</IonText>
              </div>
              <div className="detail-item">
                <IonText>Daily Average</IonText>
                <IonText>${dailyAverage.toFixed(2)}</IonText>
              </div>
              <div className="detail-item">
                <IonText>Withdrawals</IonText>
                <IonText color="danger">-${withdrawals.toFixed(2)}</IonText>
              </div>
            </div>
            
            <div className="target-edit">
              <IonText>Monthly Target:</IonText>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    value={editingTarget}
                    onChange={(e) => setEditingTarget(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="target-input"
                    style={{ flex: 1 }}
                  />
                  <IonButton size="small" onClick={saveTarget}>Save</IonButton>
                  <IonButton size="small" color="medium" fill="clear" onClick={() => setIsEditing(false)}>
                    Cancel
                  </IonButton>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonText onClick={() => setIsEditing(true)} className="editable">
                    ${monthlyTarget.toFixed(2)}
                  </IonText>
                  <IonButton size="small" fill="clear" onClick={() => setIsEditing(true)}>
                    Edit
                  </IonButton>
                </div>
              )}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Transactions List */}
        <IonList>
          {monthDays.map((day, index) => {
            const dayTransactions = getTransactionsByDay(day);
            const isDayToday = isToday(day);
            const dayTotal = dayTransactions.reduce((sum: number, t: Transaction) => {
              return t.type === 'deposit' ? sum + t.amount : sum - t.amount;
            }, 0);
            
            return (
              <IonItem 
                key={index} 
                className={`${isDayToday ? 'today' : ''} ${dayTransactions.length > 0 ? 'has-transactions' : ''}`}
                button
                routerLink={`/transactions/day/${format(day, 'yyyy-MM-dd')}`}
                detail={dayTransactions.length > 0}
              >
                <IonLabel>
                  <h3>
                    {format(day, 'EEEE, MMM d')}
                    {isDayToday && <span className="today-badge">Today</span>}
                  </h3>
                  {dayTransactions.length > 0 ? (
                    <p>{dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''}</p>
                  ) : (
                    <p className="no-transactions">No transactions</p>
                  )}
                </IonLabel>
                
                {dayTransactions.length > 0 && (
                  <IonText 
                    slot="end" 
                    color={dayTotal >= 0 ? 'success' : 'danger'}
                    className="transaction-amount"
                  >
                    {dayTotal >= 0 ? '+' : '-'}
                    ${Math.abs(dayTotal).toFixed(2)}
                  </IonText>
                )}
              </IonItem>
            );
          })}
        </IonList>

        {/* Date Picker Modal */}
        <IonModal isOpen={showDatePicker} onDidDismiss={() => setShowDatePicker(false)}>
          <IonCardHeader>
            <IonCardSubtitle>Monthly Progress</IonCardSubtitle>
            <IonCardTitle>
              ${total.toFixed(2)} 
              <span className="target-text">/ ${monthlyTarget.toFixed(2)}</span>
            </IonCardTitle>
          </IonCardHeader>
          <IonContent>
            <IonDatetime
              value={currentMonth.toISOString()}
              onIonChange={handleDateChange}
              presentation="month"
              showDefaultButtons
            />
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default MonthlyProgress;
