// import { useState, useEffect } from 'react';
import { formatDate, getWeekStart, isToday } from '../utils/dateUtils';
import { SavingsRecord } from '../types/supabase';
import { useSettings } from './Settings';

interface CalendarProps {
  savings: SavingsRecord[];
  currentWeekStart: Date;
  onDateClick: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onBackToToday: () => void;
}

export function Calendar({ 
  savings, 
  currentWeekStart, 
  onDateClick, 
  onPrevWeek, 
  onNextWeek,
  onBackToToday
}: CalendarProps) {
  const settingsContext = useSettings();
  const weekStart = getWeekStart(currentWeekStart, settingsContext?.settings?.startingDayOfWeek || 'MON');
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Day labels based on starting day of week setting
  const dayLabels = settingsContext?.settings?.startingDayOfWeek === 'SUN'
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
          const dayRecord = savings.find(record => record.date === dateStr);
          const isTodayDate = isToday(dateStr);
          
          return (
            <div
              key={i}
              onClick={() => onDateClick(dateStr)}
              className={`calendar-day p-1 sm:p-3 lg:p-4 text-center rounded-lg cursor-pointer border-2 min-h-[56px] sm:min-h-[72px] lg:min-h-[100px] flex flex-col justify-center ${
                isTodayDate ? 'border-blue-500' : 'border-transparent'
              } ${
                dayRecord?.saved 
                  ? 'bg-green-200 hover:bg-green-300' 
                  : dayRecord && !dayRecord.saved
                  ? 'bg-red-200 hover:bg-red-300'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div className="font-semibold text-base sm:text-lg">{currentDay.getDate()}</div>
              {dayRecord?.saved && (
                <div className="text-xs lg:text-sm mt-1 leading-tight text-center w-full">
                  <span className="sm:hidden">
                    {dayRecord.amount % 1 === 0 ? dayRecord.amount : dayRecord.amount.toFixed(0)}
                  </span>
                  <span className="hidden sm:inline">
                    {settingsContext?.settings?.currencySymbol || '₵'}{(dayRecord.amount % 1 === 0 ? dayRecord.amount : dayRecord.amount.toFixed(2))}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
