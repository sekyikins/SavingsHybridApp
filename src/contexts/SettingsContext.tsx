import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CalendarSettings {
  startOfWeek: 'sunday' | 'monday';
  defaultView: 'month' | 'week';
}

interface SettingsContextType {
  calendar: CalendarSettings;
  updateCalendarSettings: (settings: Partial<CalendarSettings>) => void;
}

const defaultSettings: SettingsContextType = {
  calendar: {
    startOfWeek: 'monday',
    defaultView: 'month'
  },
  updateCalendarSettings: () => {}
};

export const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export const SettingsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [settings, setSettings] = useState<Omit<SettingsContextType, 'updateCalendarSettings'>>({
    calendar: {
      startOfWeek: 'monday',
      defaultView: 'month'
    }
  });

  const updateCalendarSettings = (newSettings: Partial<CalendarSettings>) => {
    setSettings(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        ...newSettings
      }
    }));
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateCalendarSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
