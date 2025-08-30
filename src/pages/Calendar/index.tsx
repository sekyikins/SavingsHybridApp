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
  addOutline
} from 'ionicons/icons';
import { 
  startOfWeek, 
  addDays, 
  format, 
  isSameMonth, 
  getDaysInMonth, 
  isToday as isTodayDate, 
  isWeekend as isWeekendDate 
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
  const router = useHistory();
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

  // Handle day click
  const handleDayClick = useCallback((date: string): void => {
    setCalendarState(prev => ({
      ...prev,
      selectedDate: date
    }));
  }, []);

  // Function to render day cell
  const renderDayCell = useCallback((day: CalendarDay) => {
    const date = new Date(day.date);
    const dayNumber = date.getDate();
    const hasInfo = day.deposit || day.withdrawal;

    return (
      <div
        key={day.date}
        className={`day-cell ${day.date === selectedDate ? 'selected' : ''}`}
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
    setCalendarState(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'month' ? 'week' : 'month',
      weekStart: startOfWeek(currentDate, { weekStartsOn: 1 })
    }));
  }, [currentDate]);

  // Get week title for week view
  const getWeekTitle = useCallback((): string => {
    const start = format(weekStart, 'MMM d');
    const end = format(addDays(weekStart, 6), 'MMM d, yyyy');
    return `${start} - ${end}`;
  }, [weekStart]);

  // Navigate between periods (month/week)
  const navigatePeriod = useCallback((direction: 'prev' | 'next') => {
    setCalendarState(prev => {
      const newDate = new Date(prev.currentDate);
      if (prev.viewMode === 'month') {
        newDate.setMonth(direction === 'prev' ? newDate.getMonth() - 1 : newDate.getMonth() + 1);
      } else {
        const daysToAdd = direction === 'prev' ? -7 : 7;
        newDate.setDate(newDate.getDate() + daysToAdd);
      }
      return {
        ...prev,
        currentDate: newDate,
        weekStart: startOfWeek(newDate, { weekStartsOn: 1 })
      };
    });
  }, []);

  const toggleViewMode = useCallback(() => {
    const newViewMode = viewMode === 'month' ? 'week' : 'month';
    setCalendarState(prev => ({
      ...prev,
      viewMode: newViewMode,
      weekStart: newViewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : prev.weekStart
    }));
  }, [viewMode, currentDate]);

  // Generate calendar days
  useEffect(() => {
    const days: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'month') {
      // Only add current month's days
      const daysInMonth = getDaysInMonth(currentDate);
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        days.push({
          date: date.toISOString().split('T')[0],
          isToday: isTodayDate(date),
          isWeekend: isWeekendDate(date),
          isCurrentMonth: true
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

  // Handle day click
  const handleDayClick = useCallback((date: string): void => {
    setCalendarState(prev => ({
      ...prev,
      selectedDate: date
    }));
  }, []);

  // Handle add transaction
  const handleAddTransaction = React.useCallback(() => {
    router.push(`/add-transaction?date=${selectedDate}`);
  }, [router, selectedDate]);

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
          className={`day-cell ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}`}
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
    return (
      <div className="week-view">
        {calendarDays.map(renderDayCell)}
      </div>
    );
  }, [calendarDays, renderDayCell]);

  // Generate calendar days based on current view mode
  React.useEffect(() => {
    const days: CalendarDay[] = [];
    const today = new Date();
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

  // Handle add transaction
  const handleAddTransaction = useCallback(() => {
    router.push(`/add-transaction?date=${selectedDate}`);
  }, [router, selectedDate]);

  // Render the component
  return (
    <IonPage className="calendar-page">
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="ion-text-center">
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : getWeekTitle()}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={toggleViewMode} fill="clear">
              {viewMode === 'month' ? 'Week' : 'Month'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="calendar-container">
          <div className="calendar-header">
            <IonButton 
              fill="clear" 
              onClick={() => navigatePeriod('prev')}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
            
            <h2>
              {viewMode === 'month' 
                ? format(currentDate, 'MMMM yyyy') 
                : getWeekTitle()}
            </h2>
            
            <IonButton 
              fill="clear" 
              onClick={() => navigatePeriod('next')}
            >
              <IonIcon icon={chevronForward} />
            </IonButton>
          </div>
          
          <div className="days-of-week">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          
          {viewMode === 'month' ? renderCalendarGrid() : renderWeekView()}
          
          <div className="transactions-actions">
            <IonButton 
              expand="block" 
              onClick={handleAddTransaction}
              className="add-transaction-btn"
            >
              <IonIcon icon={addOutline} slot="start" />
              Add Transaction
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CalendarPage;