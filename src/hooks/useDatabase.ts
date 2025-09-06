import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { databaseService } from '../services/databaseService';
import { UserSettings, UserProfile } from '../config/supabase';

type SavingsRecord = {
  id?: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  updated_at?: string;
};

export function useDatabase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load all user data
  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load data in parallel
      const [savingsData, settingsData, profileData] = await Promise.all([
        databaseService.getSavings(user.id),
        databaseService.getUserSettings(user.id),
        databaseService.getUserProfile(user.id)
      ]);
      
      setSavings(savingsData);
      setSettings(settingsData);
      setProfile(profileData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      setError(errorMessage);
      console.error('Error loading user data:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save savings record
  const saveSavings = useCallback(async (record: Omit<SavingsRecord, 'user_id' | 'id'> & { id?: string }) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      const savedRecord = await databaseService.saveSavings({
        ...record,
        user_id: user.id,
      });
      
      setSavings(prev => {
        const exists = prev.some(item => item.id === savedRecord.id);
        if (exists) {
          return prev.map(item => item.id === savedRecord.id ? savedRecord : item);
        } else {
          return [savedRecord, ...prev];
        }
      });
      
      return savedRecord;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save record';
      setError(errorMessage);
      console.error('Error saving record:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Delete savings record
  const deleteSavings = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await databaseService.deleteSavings(id);
      
      setSavings(prev => prev.filter(record => record.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete record';
      setError(errorMessage);
      console.error('Error deleting record:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user settings
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      const updatedSettings = await databaseService.updateUserSettings({
        ...updates,
        user_id: user.id,
      });
      
      setSettings(prev => ({ ...prev, ...updatedSettings }));
      return updatedSettings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      console.error('Error updating settings:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      const updatedProfile = await databaseService.updateUserProfile({
        ...updates,
        user_id: user.id,
      });
      
      setProfile(prev => ({ ...prev, ...updatedProfile }));
      return updatedProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      console.error('Error updating profile:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setSavings([]);
      setSettings(null);
      setProfile(null);
      setLoading(false);
    }
  }, [user, loadUserData]);

  return {
    // State
    loading,
    error,
    savings,
    settings,
    profile,
    
    // Actions
    saveSavings,
    deleteSavings,
    updateSettings,
    updateProfile,
    refresh: loadUserData,
  };
}
