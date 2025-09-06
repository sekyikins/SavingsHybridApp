import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonButton,
  IonIcon,
  IonButtons,
  IonRefresher,
  IonRefresherContent,
  IonSpinner
} from '@ionic/react';
import { 
  chevronBack, 
  chevronForward,
  calendarOutline
} from 'ionicons/icons';
import { 
  startOfWeek, 
  format, 
  parseISO, 
  isToday as isTodayDate, 
  isWeekend as isWeekendDate, 
  addDays, 
  addWeeks, 
  getDaysInMonth 
} from 'date-fns';
import useTransactions from '../../hooks/useTransactions';
import { logger } from '../../utils/debugLogger';
import { dataIntegrationService } from '../../services/dataIntegrationService';
import './Calendar.css';

interface CalendarDay {
  date: string;
  isToday: boolean;
  isWeekend: boolean;
  isCurrentMonth: boolean;
  deposit?: number;
  withdrawal?: number;
}

interface CalendarState {
  currentDate: Date;
  viewMode: 'month' | 'week';
  selectedDate: string;
  weekStart: Date;
}

const CalendarPage: React.FC = () => {
  const history = useHistory();
  const { transactions, refreshTransactions, isLoading } = useTransactions();
  const [calendarState, setCalendarState] = useState<CalendarState>(() => {
    const savedState = localStorage.getItem('calendarState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return {
        currentDate: new Date(parsed.currentDate),
        viewMode: parsed.viewMode || 'month',
        selectedDate: parsed.selectedDate || new Date().toISOString().split('T')[0],
        weekStart: parsed.weekStart ? new Date(parsed.weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 })
      };
    }
    const today = new Date();
    return {
      currentDate: today,
      viewMode: 'month' as const,
      selectedDate: today.toISOString().split('T')[0],
      weekStart: startOfWeek(today, { weekStartsOn: 1 })
    };
  });

  const { currentDate, viewMode, selectedDate, weekStart } = calendarState;

  const handleRefresh = async (event: CustomEvent) => {
    logger.navigation('Pull-to-refresh triggered on Calendar page');
    try {
      await refreshTransactions();
      logger.navigation('Calendar page data refreshed successfully');
    } catch (error) {
      logger.error('Error refreshing Calendar page data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      event.detail.complete();
    }
  };

  // Clear cache and refresh when transactions change
  useEffect(() => {
    dataIntegrationService.clearCache();
    logger.data('Transaction data refreshed in Calendar', { 
      transactionCount: transactions.length 
    });
  }, [transactions.length]);

  // Memoize transaction data mapping for better performance
  const transactionDataMap = useMemo(() => {
    const map = new Map<string, { deposits: number; withdrawals: number; count: number }>();
    
    transactions.forEach(tx => {
      const dateStr = new Date(tx.transaction_date).toISOString().split('T')[0];
      const existing = map.get(dateStr) || { deposits: 0, withdrawals: 0, count: 0 };
      
      if (tx.transaction_type === 'deposit') {
        existing.deposits += tx.amount;
      } else {
        existing.withdrawals += tx.amount;
      }
      existing.count += 1;
      
      map.set(dateStr, existing);
    });
    
    logger.data('Transaction data map created', { 
      totalDates: map.size, 
      totalTransactions: transactions.length 
    });
    
    return map;
  }, [transactions]);

  // Optimized function to get transaction data for a date
  const getTransactionDataForDate = useCallback((date: string) => {
    const data = transactionDataMap.get(date) || { deposits: 0, withdrawals: 0, count: 0 };
    return {
      date,
      deposits: data.deposits,
      withdrawals: data.withdrawals,
      netAmount: data.deposits - data.withdrawals,
      transactionCount: data.count,
      transactions: transactions.filter(tx => 
        new Date(tx.transaction_date).toISOString().split('T')[0] === date
      )
    };
  }, [transactionDataMap, transactions]);

  // Memoize selected day data
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const dayData = getTransactionDataForDate(selectedDate);
    return {
      date: dayData.date,
      deposits: dayData.deposits,
      withdrawals: dayData.withdrawals
    };
  }, [selectedDate, getTransactionDataForDate]);

  useEffect(() => {
    logger.componentMount('Calendar', { 
      totalTransactions: transactions.length,
      currentDate: currentDate.toISOString().split('T')[0]
    });
    return () => logger.componentUnmount('Calendar');
  }, []);

  // Handle day click
  const handleDayClick = useCallback((date: string) => {
    const dateObj = parseISO(date);
    
    setCalendarState(prev => {
      // If in week view, update the week start to include the selected date
      if (prev.viewMode === 'week') {
        return {
          ...prev,
          selectedDate: date,
          weekStart: startOfWeek(dateObj, { weekStartsOn: 1 })
        };
      }
      
      // In month view, just update the selected date
      return {
        ...prev,
        selectedDate: date
      };
    });
    
    logger.navigation('Calendar day selected', { date });
  }, []);

  // Toggle between month and week view
  const toggleViewMode = useCallback((): void => {
    setCalendarState(prev => {
      const newViewMode = prev.viewMode === 'month' ? 'week' : 'month';
      const selectedDateObj = parseISO(selectedDate);
      
      // If switching to month view, set the current date to the selected date
      // to ensure it's visible in the month view
      if (newViewMode === 'month') {
        return {
          ...prev,
          viewMode: newViewMode,
          currentDate: selectedDateObj,
          weekStart: startOfWeek(selectedDateObj, { weekStartsOn: 1 })
        };
      }
      
      // For week view, ensure the selected date is in the current week
      return {
        ...prev,
        viewMode: newViewMode,
        weekStart: startOfWeek(selectedDateObj, { weekStartsOn: 1 })
      };
    });
  }, [selectedDate]);

  // Get week title for week view
  const getWeekTitle = useCallback((): string => {
    const start = format(weekStart, 'MMM d');
    const end = format(addDays(weekStart, 6), 'MMM d, yyyy');
    return `${start} - ${end}`;
  }, [weekStart]);

  // Handle navigation to previous/next month or week
  const navigate = useCallback((direction: 'prev' | 'next') => {
    setCalendarState(prev => {
      let newDate = new Date(prev.currentDate);
      let newWeekStart = prev.weekStart;
      
      if (prev.viewMode === 'month') {
        // Navigate by month
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      } else {
        // Navigate by week
        newWeekStart = addWeeks(prev.weekStart, direction === 'next' ? 1 : -1);
      }
      
      return {
        ...prev,
        currentDate: newDate,
        weekStart: newWeekStart
      };
    });
  }, []);

  // Handle "Jump to Today" button click
  const handleToday = useCallback(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    setCalendarState(prev => ({
      ...prev,
      currentDate: today,
      selectedDate: todayStr,
      weekStart: startOfWeek(today, { weekStartsOn: 1 })
    }));
    
    logger.navigation('Calendar jumped to today', { date: todayStr });
  }, []);

  // Save calendar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('calendarState', JSON.stringify({
      currentDate: currentDate.toISOString(),
      viewMode,
      selectedDate,
      weekStart: weekStart.toISOString()
    }));
  }, [currentDate, viewMode, selectedDate, weekStart]);

  // Generate calendar grid for month view with memoization
  const renderCalendarGrid = useMemo((): JSX.Element | null => {
    if (viewMode !== 'month') return null;
    
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const daysInMonth = getDaysInMonth(currentDate);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < adjustedStartingDay; i++) {
      days.push(<div key={`empty-${i}`} className="day-cell empty"></div>);
    }
    
    // Add day cells for the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      const isToday = isTodayDate(date);
      const isWeekend = isWeekendDate(date);
      
      // Get transaction data from memoized map
      const transactionData = transactionDataMap.get(dateStr);
      const hasTransactions = transactionData && (transactionData.deposits > 0 || transactionData.withdrawals > 0);
      const netAmount = transactionData ? transactionData.deposits - transactionData.withdrawals : 0;
      
      days.push(
        <div
          key={dateStr}
          className={`day-cell ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(dateStr)}
        >
          <div className="day-number">
            {isToday && <div className="today-dot"></div>}
            {i}
          </div>
          {hasTransactions && (
            <div className={`day-indicator ${
              netAmount > 0 ? 'indicator-positive' : 
              netAmount < 0 ? 'indicator-negative' : 'indicator-neutral'
            }`}></div>
          )}
        </div>
      );
    }
    
    return (
      <div className="days-grid">
        {days}
      </div>
    );
  }, [currentDate, selectedDate, viewMode, handleDayClick, transactionDataMap]);

  // Generate week view with memoization
  const renderWeekView = useMemo((): JSX.Element => {
    const days = [];
    const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStartDate, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const isSelected = dateStr === selectedDate;
      const isToday = isTodayDate(day);
      const isWeekend = isWeekendDate(day);
      
      // Get transaction data from memoized map
      const transactionData = transactionDataMap.get(dateStr);
      const hasTransactions = transactionData && (transactionData.deposits > 0 || transactionData.withdrawals > 0);
      const netAmount = transactionData ? transactionData.deposits - transactionData.withdrawals : 0;
      
      days.push(
        <div
          key={dateStr}
          className={`day-cell ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(dateStr)}
        >
          <div className="day-number">
            {isToday && <div className="today-dot"></div>}
            {day.getDate()}
          </div>
          {hasTransactions && (
            <div className={`day-indicator ${
              netAmount > 0 ? 'indicator-positive' : 
              netAmount < 0 ? 'indicator-negative' : 'indicator-neutral'
            }`}></div>
          )}
        </div>
      );
    }
    
    return (
      <div className="days-grid">
        {days}
      </div>
    );
  }, [weekStart, selectedDate, handleDayClick, transactionDataMap]);

  // Show loading state while transactions are being loaded
  if (isLoading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Calendar</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <div style={{ textAlign: 'center' }}>
              <IonSpinner name="crescent" />
              <p>Loading calendar data...</p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Render the component
  return (
    <IonPage className="calendar-page">
      {/* First Header */}
      <IonHeader className="calendar-header">
        <IonToolbar>
          <IonTitle className="ion-text-center">
            Calendar
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={toggleViewMode} fill="clear">
              <IonIcon slot="icon-only" icon={calendarOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {/* Second Header */}
      <IonHeader className="calendar-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={() => navigate('prev')}>
              <IonIcon slot="start" icon={chevronBack} />
              Prev.
            </IonButton>
          </IonButtons>

          <IonTitle className="ion-text-center">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : getWeekTitle()
            }
          </IonTitle>

          <IonButtons slot="end">
            <IonButton fill="clear" onClick={() => navigate('next')}>
              Next
              <IonIcon slot="end" icon={chevronForward} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon="chevron-down-circle-outline"
            pullingText="Pull to refresh"
            refreshingSpinner="circles"
            refreshingText="Refreshing..."
          />
        </IonRefresher>
        <div className="calendar-container">
          {/* Days of Week */}
          <div className="days-header">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          {/* Display Calendar */}
          {viewMode === 'month' ? renderCalendarGrid : renderWeekView}
        </div>
        {/* Jump To Today Button */}
        <div className="today-button">
          <IonButton 
            expand="block" 
            onClick={handleToday}
            className="add-transaction-btn"
            fill="clear"
          >
            Jump To Today
          </IonButton>
        </div>

        {/* Transaction Summary */}
        <div className="transaction-summary">
          <div className="summary-header">
            {selectedDayData ? format(new Date(selectedDayData.date), 'EE, MMM dd') : 'No date selected'}
            <IonButtons slot="end">
            <IonButton onClick={toggleViewMode} fill="clear">
              <IonIcon slot="icon-only" icon={calendarOutline} />
            </IonButton>
          </IonButtons>
          </div>
          <div className="summary-row">
            <span>Deposits</span>
            <span>${selectedDayData?.deposits?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="summary-row">
            <span>Withdrawals</span>
            <span>${selectedDayData?.withdrawals?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="summary-row">
            <span>Overall Total</span>
            <span 
              className={selectedDayData ? 
                (selectedDayData.deposits - selectedDayData.withdrawals >= 0 ? 'positive' : 'negative') : 
                ''
              }
            >
              ${selectedDayData ? (selectedDayData.deposits - selectedDayData.withdrawals).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {selectedDayData && (selectedDayData.deposits || selectedDayData.withdrawals) ? (
            <>
              <IonButton 
                expand="block" 
                onClick={() => history.push(`/add-transact?date=${selectedDayData?.date}`)}
                className="action-button"
              >
                Add Transact.
              </IonButton>
              <IonButton 
                expand="block" 
                onClick={() => history.push(`/edit-overall/${selectedDayData?.date}`)}
                className="action-button"
                fill="outline"
              >
                Edit Overall
              </IonButton>
            </>
          ) : (
            <IonButton 
              expand="block" 
              onClick={() => history.push(`/add-transact?date=${selectedDayData?.date}`)}
              className="action-button"
            >
              Add Transaction
            </IonButton>
          )}
        </div>
        
      </IonContent>
    </IonPage>
  );
};

export default CalendarPage;