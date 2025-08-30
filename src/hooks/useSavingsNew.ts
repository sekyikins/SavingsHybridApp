import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuthNew';
import savingsService from '../services/savingsService';
import { SavingsRecord } from '../config/supabase';

export const useSavings = () => {
  const { user } = useAuth();
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSavings = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await savingsService.getSavings(user.id);
      setSavings(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load savings';
      setError(errorMessage);
      console.error('Error loading savings:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSavings();
      
      // Set up real-time subscription
      const channel = savingsService.subscribeToChanges(user.id, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSavings(prev => [payload.new as SavingsRecord, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setSavings(prev => 
            prev.map(item => 
              item.id === (payload.new as SavingsRecord).id 
                ? (payload.new as SavingsRecord) 
                : item
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setSavings(prev => 
            prev.filter(item => item.id !== (payload.old as { id: string }).id)
          );
        }
      });

      return () => {
        channel?.unsubscribe();
      };
    }
  }, [user, loadSavings]);

  const saveSavingsRecord = useCallback(async (record: Omit<SavingsRecord, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      await savingsService.saveSavingsRecord(record);
      // The real-time subscription will handle updating the state
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save record';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshSavings = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await savingsService.syncData(user.id);
      const data = await savingsService.getSavings(user.id);
      setSavings(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh savings';
      setError(errorMessage);
      console.error('Error refreshing savings:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    savings,
    loading,
    error,
    saveSavingsRecord,
    refreshSavings,
  };
};

export default useSavings;
