import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
// import { formatCurrency } from '../utils/currency';
import { SavingsRecord } from '../types/supabase';
import { SavingsReminder } from './SavingsReminder';
import { useSettings } from './Settings';

interface TodaysSavingsProps {
  savings: SavingsRecord[];
  onSave: (date: string, amount: number, saved: boolean) => Promise<boolean>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function TodaysSavings({ savings, onSave, onSuccess, onError }: TodaysSavingsProps) {
  const [loading, setLoading] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null);
  const settingsContext = useSettings();
  const settings = settingsContext?.settings || { currency: 'GHS', currencySymbol: '₵' };
  const today = formatDate(new Date());
  const todayRecord = savings.find(record => record.date === today);

  const [saved, setSaved] = useState(todayRecord?.saved || false);
  const [amount, setAmount] = useState(todayRecord?.amount?.toString() || '');

  // Load last notification time from localStorage
  useEffect(() => {
    const savedTime = localStorage.getItem('lastNotificationDismissTime');
    if (savedTime) {
      setLastNotificationTime(new Date(savedTime));
    }
  }, []);

  const handleDismissReminder = () => {
    const now = new Date();
    setLastNotificationTime(now);
    localStorage.setItem('lastNotificationDismissTime', now.toISOString());
  };

  const handleSubmit = async () => {
    if (saved && (!amount || parseFloat(amount) <= 0)) {
      onError('Please enter a valid amount when marking as saved');
      return;
    }

    setLoading(true);
    const success = await onSave(today, parseFloat(amount) || 0, saved);
    setLoading(false);

    if (success) {
      onSuccess('Today\'s savings updated successfully!');
    }
  };

  React.useEffect(() => {
    setSaved(todayRecord?.saved || false);
    setAmount(todayRecord?.amount?.toString() || '');
  }, [todayRecord]);

  return (
    <>
      <SavingsReminder 
        hasSavedToday={saved}
        lastNotificationTime={lastNotificationTime}
        onDismiss={handleDismissReminder}
      />
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">Today's Savings</h2>
      
      {/* Responsive layout - vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="todaySaved" 
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
          />
          <label htmlFor="todaySaved" className="ml-2 text-gray-700">
            Saved today
          </label>
        </div>
        
        <div className="flex-1 lg:max-w-xs">
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount saved (${settings.currency})`} 
            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="0.01" 
            min="0"
          />
        </div>
        
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full lg:w-auto bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <div className="loading w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            'Save'
          )}
        </button>
      </div>
      </div>
    </>
  );
}
