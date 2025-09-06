import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface CalendarSettings {
  startOfWeek: 'sunday' | 'monday';
  defaultView: 'month' | 'week';
}

export interface SavingsGoals {
  monthlyGoal: number;
  weeklyGoal: number;
}

interface SettingsContextType {
  calendar: CalendarSettings;
  savingsGoals: SavingsGoals;
  updateCalendarSettings: (settings: Partial<CalendarSettings>) => void;
  updateSavingsGoals: (goals: Partial<SavingsGoals>) => void;
}

// const defaultSettings: SettingsContextType = {
//   calendar: {
//     startOfWeek: 'monday',
//     defaultView: 'month'
//   },
//   savingsGoals: {
//     monthlyGoal: 1000,
//     weeklyGoal: 250
//   },
//   updateCalendarSettings: () => {},
//   updateSavingsGoals: () => {}
// };

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [settings, setSettings] = useState<Omit<SettingsContextType, 'updateCalendarSettings' | 'updateSavingsGoals'>>(() => {
    // Load settings from localStorage if available
    const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('appSettings') : null;
    return savedSettings 
      ? JSON.parse(savedSettings) 
      : {
          calendar: {
            startOfWeek: 'monday',
            defaultView: 'month'
          },
          savingsGoals: {
            monthlyGoal: 0,
            weeklyGoal: 0
          }
        };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    }
  }, [settings]);

  const updateCalendarSettings = (newSettings: Partial<CalendarSettings>) => {
    setSettings(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        ...newSettings
      }
    }));
  };

  const updateSavingsGoals = (newGoals: Partial<SavingsGoals>) => {
    setSettings(prev => ({
      ...prev,
      savingsGoals: {
        ...prev.savingsGoals,
        ...newGoals
      }
    }));
  };

  const contextValue = {
    calendar: settings.calendar,
    savingsGoals: settings.savingsGoals,
    updateCalendarSettings,
    updateSavingsGoals
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
