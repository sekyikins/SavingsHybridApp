import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

type DayOfWeek = 'SUN' | 'MON';

export interface AppSettings {
  startingDayOfWeek: DayOfWeek;
  currency: string;
  currencySymbol: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}


const CURRENCIES: Currency[] = [
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
];

const getCurrencySymbol = (currencyCode: string): string => {
  const currency = CURRENCIES.find((c: Currency) => c.code === currencyCode);
  return currency ? currency.symbol : '₵'; // Default to GHS symbol
};


interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, userId }): JSX.Element | null => {
  const [settings, setSettingsState] = useState<AppSettings>({
    startingDayOfWeek: 'MON', // Monday by default
    currency: 'GHS',
    currencySymbol: '₵'
  });

  // Load settings from database on mount
  const loadSettings = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userSettings = data[0];
        const loadedSettings: AppSettings = {
          startingDayOfWeek: userSettings.starting_day_of_week === 'SUN' ? 'SUN' : 'MON',
          currency: userSettings.currency || 'GHS',
          currencySymbol: userSettings.currency_symbol || '₵'
        };
        
        setSettingsState(loadedSettings);
        localStorage.setItem('appSettings', JSON.stringify(loadedSettings));
      } else {
        // If no settings exist, use defaults
        const defaultSettings: AppSettings = {
          startingDayOfWeek: 'MON',
          currency: 'GHS',
          currencySymbol: '₵'
        };
        setSettingsState(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // If there's an error, use defaults
      const defaultSettings: AppSettings = {
        startingDayOfWeek: 'MON',
        currency: 'GHS',
        currencySymbol: '₵'
      };
      setSettingsState(defaultSettings);
    }
  }, [userId]);
  
  // Load settings when component mounts or userId changes
  useEffect(() => {
    // Load settings from localStorage first for immediate UI update
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettingsState(parsedSettings);
      } catch (e) {
        console.error('Failed to load settings from localStorage:', e);
      }
    }
    
    // Then load from database which will override if available
    if (userId) {
      loadSettings();
    }
  }, [userId, loadSettings]);

  // Save settings to database and localStorage
  const saveSettings = useCallback(async (newSettings: AppSettings): Promise<boolean> => {
    if (!userId) {
      console.error('No user ID available for saving settings');
      return false;
    }
    
    // Ensure startingDayOfWeek is properly typed
    const settingsToSave: AppSettings = {
      ...newSettings,
      startingDayOfWeek: (newSettings.startingDayOfWeek === 'SUN' || newSettings.startingDayOfWeek === 'MON') 
        ? newSettings.startingDayOfWeek 
        : 'MON' // Default to 'MON' if invalid
    };
    
    
    // Update local state and localStorage immediately for better UX
    setSettingsState(settingsToSave);
    localStorage.setItem('appSettings', JSON.stringify(settingsToSave));
    
    try {
      
      // First try to update existing settings
      const { data: updateData, error: updateError } = await supabase
        .from('user_settings')
        .update({
          starting_day_of_week: settingsToSave.startingDayOfWeek,
          currency: settingsToSave.currency,
          currency_symbol: settingsToSave.currencySymbol,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      
      // If no rows were updated, try to insert
      if (updateError || (updateData && updateData.length === 0)) {
        const { data: insertData, error: insertError } = await supabase
          .from('user_settings')
          .insert([
            {
              user_id: userId,
              starting_day_of_week: settingsToSave.startingDayOfWeek,
              currency: settingsToSave.currency,
              currency_symbol: settingsToSave.currencySymbol
            }
          ])
          .select();
          
        
        if (insertError) {
          console.error('Error inserting settings:', insertError);
          throw insertError;
        }
        
        if (!insertData || insertData.length === 0) {
          console.error('Failed to insert settings: No data returned');
          return false;
        }
        
      } else if (updateError) {
        console.error('Error updating settings:', updateError);
        throw updateError;
      } else {
      }
      
      
      // Notify other components of settings change
      window.dispatchEvent(new CustomEvent('settingsChanged', { 
        detail: settingsToSave 
      }));
      
      return true;
      
    } catch (error) {
      console.error('Error saving settings to database:', error);
      
      // Revert local changes if save fails
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          setSettingsState(JSON.parse(savedSettings));
        } catch (e) {
          console.error('Failed to revert settings:', e);
        }
      }
      
      // Show error to user (you might want to implement a toast notification)
      alert('Failed to save settings. Please try again.');
      return false;
    }
  }, [userId]);

  const [pendingSettings, setPendingSettings] = useState<AppSettings>(settings);

  // Initialize pending settings when component mounts or settings change
  useEffect(() => {
    setPendingSettings(settings);
  }, [settings]);

  const handleStartingDayChange = useCallback((day: 'SUN' | 'MON') => {
    setPendingSettings(prev => ({
      ...prev,
      startingDayOfWeek: day
    }));
  }, []);

  const handleCurrencyChange = useCallback((currency: string) => {
    setPendingSettings(prev => ({
      ...prev,
      currency,
      currencySymbol: getCurrencySymbol(currency)
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!pendingSettings) return;
    const success = await saveSettings(pendingSettings);
    if (success) {
      onClose();
    }
  }, [pendingSettings, saveSettings, onClose]);

  if (!isOpen || !pendingSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            ⚙️ Settings
          </h2>
          <div className="flex space-x-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Starting Day of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Week starts on
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStartingDayChange('SUN')}
                className={`py-2 px-4 rounded-md transition-colors ${
                  pendingSettings.startingDayOfWeek === 'SUN'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sunday
              </button>
              <button
                onClick={() => handleStartingDayChange('MON')}
                className={`py-2 px-4 rounded-md transition-colors ${
                  pendingSettings.startingDayOfWeek === 'MON'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monday
              </button>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              id="currency"
              value={pendingSettings.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create a context to share settings across components
const SettingsContext = React.createContext<SettingsContextType | null>(null);

// Hook to use settings in other components
export function useSettings(): SettingsContextType {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Provider component to wrap your app with
export function SettingsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({
    startingDayOfWeek: 'MON',
    currency: 'GHS',
    currencySymbol: '₵'
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (e) {
        console.error('Failed to load settings from localStorage:', e);
      }
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      // Ensure we always have a currency symbol
      currencySymbol: newSettings.currencySymbol || 
                     getCurrencySymbol(newSettings.currency || prev.currency)
    }));
  }, []);

  // Listen for settings changes from other components
  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppSettings>;
      updateSettings(customEvent.detail);
    };

    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, [updateSettings]);

  const contextValue = React.useMemo<SettingsContextType>(
    () => ({ settings, updateSettings }),
    [settings, updateSettings]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
