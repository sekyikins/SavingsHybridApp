import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  startOfWeek, 
  addDays, 
  format, 
  isSameMonth, 
  getDaysInMonth, 
  isToday as isTodayDate, 
  isWeekend as isWeekendDate,
  parseISO,
  addWeeks
} from 'date-fns';
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
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDayData, setSelectedDayData] = useState<{
    date: string;
    deposits: number;
    withdrawals: number;
  } | null>(null);

  // Generate consistent but varied transaction data based on date
  const generateTransactionData = useCallback((date: string) => {
    // Create a consistent hash from the date string
    const hash = date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const day = new Date(date).getDate();
    
    // 20% chance of no data
    if (hash % 5 === 0) {
      return {
        date: date,
        deposits: 0,
        withdrawals: 0
      };
    }
    
    // Generate varied amounts based on the hash and day
    const baseAmount = 100 + (hash % 900); // 100-1000
    const depositMultiplier = 0.5 + (hash % 11) * 0.1; // 0.5-1.5
    const withdrawalMultiplier = 0.3 + (hash % 15) * 0.1; // 0.3-1.7
    
    // Make some days have higher withdrawals (negative balance)
    const isNegativeDay = day % 5 === 0; // 20% chance of negative balance
    
    let deposits = Math.floor(baseAmount * depositMultiplier);
    let withdrawals = Math.floor(baseAmount * withdrawalMultiplier);
    
    // For negative days, make sure withdrawals are higher than deposits
    if (isNegativeDay && withdrawals < deposits) {
      [deposits, withdrawals] = [withdrawals, deposits];
    }
    
    // Add some randomness to the amounts
    deposits = Math.max(0, deposits + (hash % 200) - 100);
    withdrawals = Math.max(0, withdrawals + (hash % 200) - 100);
    
    return {
      date: date,
      deposits: deposits,
      withdrawals: withdrawals
    };
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
    
    // Only update the data if we don't have it yet or if the date has changed
    setSelectedDayData(prev => {
      if (prev?.date === date) return prev;
      return generateTransactionData(date);
    });
  }, [generateTransactionData]);

  // Function to render day cell
  const renderDayCell = useCallback((day: CalendarDay, index: number) => {
    const date = new Date(day.date);
    const dayNumber = date.getDate();
    const hasInfo = day.deposit || day.withdrawal;

    return (
      <div
        key={`${day.date}-${index}`}
        className={`day-cell ${day.isCurrentMonth ? '' : 'other-month'} ${
          day.date === selectedDate ? 'selected' : ''
        } ${isTodayDate(parseISO(day.date)) ? 'today' : ''}`}
        onClick={() => handleDayClick(day.date)}
      >
        <div className="day-number">
          {day.isToday && <div className="today-dot"></div>}
          {dayNumber}
        </div>
        {hasInfo && <div className="day-indicator" />}
      </div>
    );
  }, [selectedDate, handleDayClick]);

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

  // Generate calendar days
  useEffect(() => {
    const days: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'month') {
      // Get first day of month and its day of week (0-6, where 0 is Sunday)
      const firstDayOfMonth = new Date(year, month, 1);
      const startingDayOfWeek = firstDayOfMonth.getDay();
      
      // Adjust for week starting on Monday (1) instead of Sunday (0)
      const daysToSubtract = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
      const startDate = addDays(firstDayOfMonth, -daysToSubtract);
      
      // We need 6 rows to ensure we show all days (7 days * 6 weeks = 42 days)
      for (let i = 0; i < 42; i++) {
        const date = addDays(startDate, i);
        const isCurrentMonth = date.getMonth() === month;
        
        days.push({
          date: date.toISOString().split('T')[0],
          isToday: isTodayDate(date),
          isWeekend: isWeekendDate(date),
          isCurrentMonth: isCurrentMonth
        });
      }
    } else {
      // Week view
      const startOfWeekDate = startOfWeek(weekStart, { weekStartsOn: 1 });
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(startOfWeekDate, i);
        days.push({
          date: date.toISOString().split('T')[0],
          isToday: isTodayDate(date),
          isWeekend: isWeekendDate(date),
          isCurrentMonth: isSameMonth(date, currentDate)
        });
      }
    }
    
    setCalendarDays(days);
  }, [currentDate, viewMode, weekStart]);

  // Save calendar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('calendarState', JSON.stringify({
      currentDate: currentDate.toISOString(),
      viewMode,
      selectedDate,
      weekStart: weekStart.toISOString()
    }));
  }, [currentDate, viewMode, selectedDate, weekStart]);

  // Handle jump to today
  const handleToday = useCallback(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    setCalendarState(prev => ({
      ...prev,
      currentDate: today,
      selectedDate: todayStr,
      weekStart: startOfWeek(today, { weekStartsOn: 1 })
    }));
    
    // Update the selected day data
    const mockData = {
      date: todayStr,
      deposits: Math.floor(Math.random() * 1000),
      withdrawals: Math.floor(Math.random() * 500)
    };
    setSelectedDayData(mockData);
  }, []);

  // Load selected date from localStorage on initial load
  useEffect(() => {
    const savedState = localStorage.getItem('calendarState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      const savedDate = new Date(parsed.selectedDate);
      if (!isNaN(savedDate.getTime())) {  // Check if saved date is valid
        setCalendarState(prev => ({
          ...prev,
          selectedDate: parsed.selectedDate
        }));
        return;
      }
    }
    
    // If no saved date or invalid, use today
    const today = new Date();
    setCalendarState(prev => ({
      ...prev,
      selectedDate: format(today, 'yyyy-MM-dd')
    }));
  }, []);


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

    setCalendarDays(days);
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
      setSelectedDayData(generateTransactionData(selectedDate));
    }
  }, [selectedDate, selectedDayData?.date, generateTransactionData]);

  // Render the component
  return (
    <IonPage className="calendar-page">
      {/* First Header */}
      <IonHeader className="ion-no-border">
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
                onClick={() => history.push('/add-transact')}
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
              onClick={() => history.push('/add-transact')}
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