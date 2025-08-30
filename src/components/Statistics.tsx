import React from 'react';
import { formatCurrency } from '../utils/currency';
import { formatDate, getWeekStart, getWeekEnd } from '../utils/dateUtils';
import { SavingsRecord } from '../types/supabase';

interface StatisticsProps {
  savings: SavingsRecord[];
  currentWeekStart: Date;
}

export function Statistics({ savings, currentWeekStart }: StatisticsProps) {
  const today = formatDate(new Date());
  const todayRecord = savings.find(record => record.date === today);
  
  const weekStart = getWeekStart(currentWeekStart);
  const weekEnd = getWeekEnd(currentWeekStart);
  
  // Calculate week total
  const weekTotal = savings
    .filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= weekStart && recordDate <= weekEnd && record.saved;
    })
    .reduce((sum, record) => sum + (record.amount || 0), 0);
  
  // Calculate total saved
  const totalSaved = savings
    .filter(record => record.saved)
    .reduce((sum, record) => sum + (record.amount || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Today's Status */}
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Today's Status</h3>
        <div className={`text-2xl font-bold ${
          todayRecord?.saved ? 'text-green-600' : 'text-gray-600'
        }`}>
          {todayRecord?.saved ? formatCurrency(todayRecord.amount) : 'Not Saved'}
        </div>
      </div>
      
      {/* This Week */}
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">This Week</h3>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(weekTotal)}
        </div>
      </div>
      
      {/* Total Saved */}
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Saved</h3>
        <div className="text-2xl font-bold text-blue-600">
          {formatCurrency(totalSaved)}
        </div>
      </div>
    </div>
  );
}
