import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils/dateUtils';

interface SavingsReminderProps {
  hasSavedToday: boolean;
  lastNotificationTime: Date | null;
  onDismiss: () => void;
}

export function SavingsReminder({ hasSavedToday, lastNotificationTime, onDismiss }: SavingsReminderProps) {
  const [showReminder, setShowReminder] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Show reminder if:
    // 1. User hasn't saved today
    // 2. It's after 12 PM (to give them the morning)
    // 3. We haven't shown a reminder in the last 6 hours
    const now = new Date();
    const isAfterNoon = now.getHours() >= 12;
    const lastNotification = lastNotificationTime ? new Date(lastNotificationTime) : null;
    const hoursSinceLastNotification = lastNotification 
      ? (now.getTime() - lastNotification.getTime()) / (1000 * 60 * 60)
      : 24; // Default to 24 hours if no previous notification

    setShowReminder(!hasSavedToday && isAfterNoon && hoursSinceLastNotification >= 6);
  }, [hasSavedToday, lastNotificationTime, isClient]);

  if (!showReminder) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 w-full max-w-md rounded shadow-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Don't forget to log your savings for today! You haven't saved anything yet.
          </p>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                setShowReminder(false);
                onDismiss();
              }}
              className="text-sm font-medium text-yellow-700 hover:text-yellow-600 focus:outline-none focus:underline transition duration-150 ease-in-out"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
