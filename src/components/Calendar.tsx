import { formatDate, getWeekStart, isToday } from '../utils/dateUtils';
import { Transaction } from '../config/supabase';
import { useSettings } from '../hooks/useSettings';
import { dataIntegrationService } from '../services/dataIntegrationService';
import { formatCurrency } from '../utils/currencyUtils';

interface CalendarProps {
  transactions: Transaction[];
  currentWeekStart: Date;
  onDateClick: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onBackToToday: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
  transactions, 
  currentWeekStart, 
  onDateClick, 
  onPrevWeek, 
  onNextWeek,
  onBackToToday
}) => {
  const settingsContext = useSettings();
  const weekStart = getWeekStart(currentWeekStart, settingsContext?.settings?.starting_day_of_week || 'MON');
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Day labels based on starting day of week setting
  const dayLabels = settingsContext?.settings?.starting_day_of_week === 'SUN'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      {/* Navigation - Responsive */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={onPrevWeek}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
        >
          ← Previous
        </button>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-800 text-center">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
            {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </h3>
          {formatDate(weekStart) !== formatDate(new Date()) && (
            <button 
              onClick={onBackToToday}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <button 
          onClick={onNextWeek}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid - Responsive */}
      <div className="grid grid-cols-7 gap-2 lg:gap-4">
        {/* Headers */}
        {dayLabels.map((day, index) => (
          <div key={index} className="text-center font-semibold text-gray-600 py-2">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
        
        {/* Calendar Days */}
        {Array.from({ length: 7 }, (_, i) => {
          const currentDay = new Date(weekStart);
          currentDay.setDate(weekStart.getDate() + i);
          const dateStr = formatDate(currentDay);
          const dayData = dataIntegrationService.getDayData(dateStr, transactions);
          const isTodayDate = isToday(dateStr);
          const hasTransactions = dayData.transactionCount > 0;
          const netAmount = dayData.netAmount;
          
          return (
            <div
              key={i}
              onClick={() => onDateClick(dateStr)}
              className={`calendar-day p-1 sm:p-3 lg:p-4 text-center rounded-lg cursor-pointer border-2 min-h-[56px] sm:min-h-[72px] lg:min-h-[100px] flex flex-col justify-center ${
                isTodayDate ? 'border-blue-500' : 'border-transparent'
              } ${
                hasTransactions
                  ? netAmount > 0
                    ? 'bg-green-200 hover:bg-green-300' 
                    : netAmount < 0
                    ? 'bg-red-200 hover:bg-red-300'
                    : 'bg-yellow-200 hover:bg-yellow-300'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div className="font-semibold text-base sm:text-lg">{currentDay.getDate()}</div>
              {hasTransactions && (
                <div className="text-xs lg:text-sm mt-1 leading-tight text-center w-full">
                  <span className="sm:hidden">
                    {Math.abs(netAmount) % 1 === 0 ? Math.abs(netAmount) : Math.abs(netAmount).toFixed(0)}
                  </span>
                  <span className="hidden sm:inline">
                    {formatCurrency(Math.abs(netAmount), settingsContext?.settings?.currency)}
                  </span>
                  {dayData.transactionCount > 1 && (
                    <div className="text-xs opacity-75">
                      {dayData.transactionCount} txns
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;
