import React, { useState, useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonButton,
  IonIcon,
  IonButtons
} from '@ionic/react';
import { 
  chevronBack, 
  chevronForward,
  calendarOutline
} from 'ionicons/icons';
import { startOfWeek, format, parseISO, isToday as isTodayDate, isWeekend as isWeekendDate, addDays, addWeeks, getDaysInMonth } from 'date-fns';
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
  // const calendarDays = useMemo(() => [], []);
  const [selectedDayData, setSelectedDayData] = useState<{
    date: string;
    deposits: number;
    withdrawals: number;
  } | null>(null);

  const { getTransactionsInRange, transactions: allTransactions } = useTransactions();
  
  useEffect(() => {
    logger.componentMount('Calendar', { 
      totalTransactions: allTransactions.length,
      currentDate: currentDate.toISOString().split('T')[0]
    });
    return () => logger.componentUnmount('Calendar');
  }, []);

  // Get real transaction data for a specific date using data integration service
  const getTransactionDataForDate = useCallback((date: string) => {
    const dayData = dataIntegrationService.getDayData(date, getTransactionsInRange(
      new Date(date + 'T00:00:00'),
      new Date(date + 'T23:59:59')
    ));
    return dayData;
  }, [getTransactionsInRange]);

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
    
    // Only update the data if we don't have it yet or if the date has changed
    const dayData = getTransactionDataForDate(date);
    setSelectedDayData({
      date: dayData.date,
      deposits: dayData.deposits,
      withdrawals: dayData.withdrawals
    });
  }, [getTransactionDataForDate]);

  // Function to render day cell
  // const renderDayCell = useCallback((day: CalendarDay, index: number) => {
  //   const date = new Date(day.date);
  //   const dayNumber = date.getDate();
  //   const hasInfo = day.deposit || day.withdrawal;

  //   return (
  //     <div
  //       key={`${day.date}-${index}`}
  //       className={`day-cell ${day.isCurrentMonth ? '' : 'other-month'} ${
  //         day.date === selectedDate ? 'selected' : ''
  //       } ${isTodayDate(parseISO(day.date)) ? 'today' : ''}`}
  //       onClick={() => handleDayClick(day.date)}
  //     >
  //       <div className="day-number">
  //         {day.isToday && <div className="today-dot"></div>}
  //         {dayNumber}
  //       </div>
  //       {hasInfo && <div className="day-indicator" />}
  //     </div>
  //   );
  // }, [selectedDate, handleDayClick]);

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

  // Save calendar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('calendarState', JSON.stringify({
      currentDate: currentDate.toISOString(),
      viewMode,
      selectedDate,
      weekStart: weekStart.toISOString()
    }));
  }, [currentDate, viewMode, selectedDate, weekStart]);

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
    
    // Update the selected day data with real transaction data
    const dayData = getTransactionDataForDate(todayStr);
    setSelectedDayData({
      date: dayData.date,
      deposits: dayData.deposits,
      withdrawals: dayData.withdrawals
    });
    
    logger.navigation('Calendar jumped to today', { date: todayStr });
  }, [getTransactionDataForDate]);

  // Initialize calendar with today's date and real data
  useEffect(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Set initial calendar state to today
    setCalendarState(prev => ({
      ...prev,
      currentDate: today,
      selectedDate: todayStr,
      weekStart: startOfWeek(today, { weekStartsOn: 1 })
    }));
    
    // Load today's transaction data
    const dayData = getTransactionDataForDate(todayStr);
    setSelectedDayData({
      date: dayData.date,
      deposits: dayData.deposits,
      withdrawals: dayData.withdrawals
    });
    
    logger.data('Calendar initialized with today\'s data', {
      date: todayStr,
      deposits: dayData.deposits,
      withdrawals: dayData.withdrawals
    });
  }, [getTransactionDataForDate]);

  // Generate calendar grid for month view
  const renderCalendarGrid = React.useCallback((): JSX.Element | null => {
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
          {(() => {
            const dayData = getTransactionDataForDate(dateStr);
            const hasTransactions = dayData.deposits > 0 || dayData.withdrawals > 0;
            const netAmount = dayData.deposits - dayData.withdrawals;
            if (hasTransactions) {
              return (
                <div className={`day-indicator ${
                  netAmount > 0 ? 'indicator-positive' : 
                  netAmount < 0 ? 'indicator-negative' : 'indicator-neutral'
                }`}></div>
              );
            }
            return null;
          })()}
        </div>
      );
    }
    
    return (
      <div className="days-grid">
        {days}
      </div>
    );
  }, [currentDate, selectedDate, viewMode, handleDayClick]);

  // Generate week view
  const renderWeekView = React.useCallback((): JSX.Element => {
    const days = [];
    const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStartDate, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const isSelected = dateStr === selectedDate;
      const isToday = isTodayDate(day);
      const isWeekend = isWeekendDate(day);
      
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
          {(() => {
            const dayData = getTransactionDataForDate(dateStr);
            const hasTransactions = dayData.deposits > 0 || dayData.withdrawals > 0;
            const netAmount = dayData.deposits - dayData.withdrawals;
            if (hasTransactions) {
              return (
                <div className={`day-indicator ${
                  netAmount > 0 ? 'indicator-positive' : 
                  netAmount < 0 ? 'indicator-negative' : 'indicator-neutral'
                }`}></div>
              );
            }
            return null;
          })()}
        </div>
      );
    }
    
    return (
      <div className="days-grid">
        {days}
      </div>
    );
  }, [weekStart, selectedDate, handleDayClick]);

  // Generate calendar days based on current view mode
  React.useEffect(() => {
    const days: CalendarDay[] = [];
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    if (viewMode === 'month') {
      // Generate days for month view
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const startDay = startOfWeek(firstDay, { weekStartsOn: 1 });
      const endDay = startOfWeek(new Date(lastDay.setDate(lastDay.getDate() + 6)), { weekStartsOn: 1 });

      for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        days.push({
          date: dateStr,
          isToday: isTodayDate(d),
          isWeekend: isWeekendDate(d),
          isCurrentMonth: d.getMonth() === currentMonth
        });
      }
    } else {
      // Generate days for week view
      const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStartDate, i);
        const dateStr = day.toISOString().split('T')[0];
        days.push({
          date: dateStr,
          isToday: isTodayDate(day),
          isWeekend: isWeekendDate(day),
          isCurrentMonth: true
        });
      }
    }

    // setCalendarDays(days);
  }, [currentDate, viewMode, weekStart]);

  // Save calendar state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('calendarState', JSON.stringify({
      currentDate: currentDate.toISOString(),
      viewMode,
      selectedDate,
      weekStart: weekStart.toISOString()
    }));
  }, [currentDate, viewMode, selectedDate, weekStart]);

  // Load selected day data when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    
    // Only update if we don't have data for this date yet
    if (selectedDayData?.date !== selectedDate) {
      const dayData = getTransactionDataForDate(selectedDate);
      setSelectedDayData({
        date: dayData.date,
        deposits: dayData.deposits,
        withdrawals: dayData.withdrawals
      });
      
      logger.data('Calendar day data loaded', {
        date: selectedDate,
        deposits: dayData.deposits,
        withdrawals: dayData.withdrawals,
        transactionCount: dayData.transactionCount
      });
    }
  }, [selectedDate, selectedDayData?.date, getTransactionDataForDate]);

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

      <IonContent>
        <div className="calendar-container">
          {/* Days of Week */}
          <div className="days-header">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          {/* Display Calendar */}
          {viewMode === 'month' ? renderCalendarGrid() : renderWeekView()}
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