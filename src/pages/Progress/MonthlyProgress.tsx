import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
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
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isToday, 
  isSameMonth, 
  isSameYear, 
  addMonths, 
  subMonths, 
  getDaysInMonth,
  eachDayOfInterval
} from 'date-fns';
import useTransactions from '../../hooks/useTransactions';
import { Transaction } from '../../types';
import './Progress.css';

interface MonthlyProgressProps {
  initialDate?: Date;
}

const MonthlyProgress: React.FC<MonthlyProgressProps> = ({ initialDate = new Date() }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialDate));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { transactions } = useTransactions();
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem('monthlyTarget');
    return saved ? parseFloat(saved) : 4000; // Default target
  });
  const [editingTarget, setEditingTarget] = useState<number>(monthlyTarget);
  const [isEditing, setIsEditing] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = new Date();
  const currentMonthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Calculate daily transactions for the calendar grid
  const dailyTransactions = currentMonthDays.map(day => {
    const dayTransactions = transactions.filter((transaction: Transaction) => {
      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getDate() === day.getDate() &&
        transactionDate.getMonth() === day.getMonth() &&
        transactionDate.getFullYear() === day.getFullYear()
      );
    });

    const daySaved = dayTransactions
      .filter((t: Transaction) => t.type === 'deposit')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      
    const daySpent = dayTransactions
      .filter((t: Transaction) => t.type === 'withdrawal')
      .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

    return {
      date: day,
      total: daySaved - daySpent,
      hasTransactions: dayTransactions.length > 0
    };
  });

  // Calculate monthly stats
  const monthlyTotal = transactions.reduce((sum: number, t: Transaction) => 
    sum + (t.type === 'deposit' ? t.amount : 0), 0);
    
  const monthlyWithdrawals = transactions.reduce((sum: number, t: Transaction) => 
    sum + (t.type === 'withdrawal' ? Math.abs(t.amount) : 0), 0);
    
  const daysPassed = currentMonthDays.filter(day => day <= today && day <= monthEnd).length;
  const totalDaysInMonth = getDaysInMonth(currentMonth);
  const dailyAverage = daysPassed > 0 ? monthlyTotal / daysPassed : 0;
  const remaining = Math.max(0, monthlyTarget - monthlyTotal);
  const progress = monthlyTarget > 0 ? Math.min(1, monthlyTotal / monthlyTarget) : 0;
  const isTargetReached = monthlyTarget > 0 && monthlyTotal >= monthlyTarget;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' 
      ? subMonths(currentMonth, 1) 
      : addMonths(currentMonth, 1)
    );
  };

  const handleDateChange = (e: CustomEvent) => {
    const selectedDate = new Date(e.detail.value);
    setCurrentMonth(startOfMonth(selectedDate));
    setShowDatePicker(false);
  };

  const saveTarget = () => {
    const target = parseFloat(editingTarget.toString());
    if (!isNaN(target) && target > 0) {
      setMonthlyTarget(target);
      localStorage.setItem('monthlyTarget', target.toString());
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
            {format(currentMonth, 'MMMM yyyy')}
            <IonIcon icon={calendarOutline} slot="end" />
          </IonButton>
          
          <IonButton 
            fill="clear" 
            onClick={() => navigateMonth('next')} 
            disabled={isSameMonth(currentMonth, today) && isSameYear(currentMonth, today)}
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
                  <small>+${(monthlyTotal - monthlyTarget).toFixed(2)} extra</small>
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
            
            <div className="progress-stats">
              <div className="stat-item">
                <IonText color="medium">Saved</IonText>
                <IonText color="primary">${monthlyTotal.toFixed(2)}</IonText>
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
                <IonText>Projected</IonText>
                <IonText>${(dailyAverage * totalDaysInMonth).toFixed(2)}</IonText>
              </div>
              <div className="detail-item">
                <IonText>Withdrawals</IonText>
                <IonText color="danger">-${monthlyWithdrawals.toFixed(2)}</IonText>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="calendar-header">
              {day}
            </div>
          ))}
          
          {currentMonthDays.map((day, index) => {
            const monthlyTransactions = transactions.filter((transaction: Transaction) => {
              const transactionDate = new Date(transaction.date);
              return isSameMonth(transactionDate, currentMonth) && 
                     isSameYear(transactionDate, currentMonth);
            });

            const totalSaved = monthlyTransactions.reduce((sum: number, t: Transaction) => {
              return t.type === 'deposit' ? sum + t.amount : sum;
            }, 0);
            
            const totalSpent = monthlyTransactions.reduce((sum: number, t: Transaction) => {
              return t.type === 'withdrawal' ? sum + Math.abs(t.amount) : sum;
            }, 0);
            
            const dayTotal = totalSaved - totalSpent;
            
            return (
              <div 
                key={index} 
                className={`calendar-day ${isToday(day) ? 'today' : ''} ${!isSameMonth(day, currentMonth) ? 'other-month' : ''}`}
                style={{
                  gridColumn: day.getDay() === 0 ? 7 : day.getDay()
                }}
              >
                <span className="day-number">{day.getDate()}</span>
                {dayTotal !== 0 && (
                  <span className={`day-amount ${dayTotal >= 0 ? 'positive' : 'negative'}`}>
                    {dayTotal >= 0 ? '+' : ''}{dayTotal.toFixed(0)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

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
              presentation="month-year"
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
