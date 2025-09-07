import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { databaseService } from '../services/databaseService';
import { UserSettings } from '../config/supabase';
import { logger } from '../utils/debugLogger';

export interface UseSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.supabase('Loading user settings', { userId: user.id });
      
      const userSettings = await databaseService.getUserSettings(user.id);
      setSettings(userSettings);
      
      logger.supabase('User settings loaded successfully', { 
        userId: user.id, 
        currency: userSettings.currency 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      logger.error('Error loading user settings', err instanceof Error ? err : new Error(String(err)));
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ): Promise<boolean> => {
    if (!user?.id || !settings) {
      return false;
    }

    try {
      logger.supabase('Updating user setting', { userId: user.id, key, value });
      
      const updatedSettings = await databaseService.updateUserSettings({
        user_id: user.id,
        [key]: value
      });
      
      setSettings(updatedSettings);
      
      logger.supabase('User setting updated successfully', { 
        userId: user.id, 
        key, 
        value 
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update setting';
      logger.error('Error updating user setting', err instanceof Error ? err : new Error(String(err)), { key, value });
      setError(errorMessage);
      return false;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  return {
    settings,
    loading,
    error,
    updateSetting,
    refreshSettings
  };
};
