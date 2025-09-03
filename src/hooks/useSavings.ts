import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { databaseService } from '../services/databaseService';

interface SavingsRecord {
  id?: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  updated_at?: string;
}

type SavingsUpdate = {
  id: string;
  user_id: string;
  date?: string;
  amount?: number;
  saved?: boolean;
};

type SavingsInsert = Omit<SavingsRecord, 'id' | 'updated_at'>;

// Debug function to log errors consistently
const logError = (context: string, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${new Date().toISOString()}] ${context}:`, errorMessage);
  if (error instanceof Error) {
    console.error('Error stack:', error.stack);
  }
};

export function useSavings() {
  const { user } = useAuth();
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add a safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Safety timeout triggered - forcing loading to false');
      setLoading(false);
      setError('Database connection timeout. Using offline mode.');
    }, 5000); // 5 second safety timeout (faster feedback)

    return () => clearTimeout(timeout);
  }, []);

  const deleteSavings = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to delete records');
      return false;
    }

    setLoading(true);
    try {
      await databaseService.deleteSavings(id);
      
      // Update local state
      setSavings(prev => prev.filter(record => record.id !== id));
      return true;
    } catch (error) {
      console.error('Error in deleteSavings:', error);
      logError('Error deleting record', error);
      setError('Failed to delete record');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveSavings = useCallback(async (record: SavingsInsert | SavingsUpdate): Promise<SavingsRecord> => {
    if (!user) throw new Error('User not authenticated');

    console.log('Saving record:', record);
    setLoading(true);
    setError(null);

    try {
      // Ensure user_id is set
      const recordWithUser = { ...record, user_id: user.id } as SavingsRecord;
      
      // Save using database service
      const savedRecord = await databaseService.saveSavings(recordWithUser);
      
      if (!savedRecord) throw new Error('No data returned from save operation');

      // Update local state
      setSavings(prev => {
        const exists = prev.some(item => item.id === savedRecord.id);
        if (exists) {
          return prev.map(item => item.id === savedRecord.id ? savedRecord : item);
        } else {
          return [savedRecord, ...prev].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }
      });

      return savedRecord;
    } catch (error) {
      console.error('Error in saveSavings:', error);
      logError('Error saving record', error);
      setError('Failed to save record');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, setSavings]);

  const saveSavingsRecord = useCallback(async (record: SavingsInsert | SavingsUpdate): Promise<boolean> => {
    if (!user) {
      console.error('No user authenticated');
      setError('You must be logged in to save records');
      return false;
    }

    const isUpdate = 'id' in record;
    setLoading(true);

    try {
      // Ensure we have all required fields for the operation with proper types and defaults
      const recordToSave: Omit<SavingsRecord, 'id' | 'updated_at'> = {
        ...record, // Spread first to get all properties
        user_id: record.user_id ?? user.id,
        date: record.date || new Date().toISOString().split('T')[0],
        amount: record.amount ?? 0,
        saved: record.saved ?? false
      };

      const savedRow = await databaseService.saveSavings(recordToSave);

      if (!savedRow) {
        console.error('No data returned from save operation');
        setError('Failed to save record: No data returned');
        return false;
      }

      // Update local state based on confirmed DB row
      setSavings(prev => {
        const idx = prev.findIndex(r => r.date === record.date);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...savedRow };
          return copy;
        }
        return [savedRow, ...prev];
      });

      console.log('Database save successful and local state synced');
      return true;
    } catch (error) {
      console.error('Error in saveSavingsRecord:', error);
      logError('Error saving record', error);
      setError('Failed to save record');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchSavings = useCallback(async (): Promise<SavingsRecord[]> => {
    console.log('fetchSavings called, user:', user?.id);
    if (!user) {
      console.log('No user, skipping fetch');
      setSavings([]);
      setLoading(false);
      return [];
    }

    try {
      console.log('Starting to fetch savings for user:', user.id);
      setLoading(true);
      setError(null);
      
      console.log('Fetching savings from database service...');
      const savingsData = await databaseService.getSavings(user.id);
      if (savingsData === null) {
        console.error('No data returned when fetching savings');
        setError('Failed to load savings data');
        return [];
      }

      setSavings(savingsData);
      return savingsData || [];
    } catch (error) {
      console.error('Error in fetchSavings:', error);
      logError('Error in fetchSavings', error);
      
      // Check if it's a timeout or connection error
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('Database timeout detected, using fallback mode');
        setError('Database unavailable. Using offline mode.');
        // Set empty savings array to allow app to continue functioning
        setSavings([]);
        return [];
      } else {
        setError('Failed to load savings data. The database might not be set up properly.');
        setSavings([]);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (!user) {
      setSavings([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let refreshInterval: ReturnType<typeof setInterval>;

    const fetchData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        const data = await databaseService.getSavings(user.id);
        
        if (!isMounted) return;
        
        setSavings(data || []);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error in fetchData:', error);
        logError('Error fetching savings data', error);
        setError('Failed to load savings data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Set up an interval to refresh data periodically (every 5 minutes)
    const intervalId = window.setInterval(fetchData, 5 * 60 * 1000);

    // Clean up the interval and mounted flag on component unmount
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  // Add a manual refresh function that can be called from parent components
  const refreshSavings = useCallback(async (): Promise<SavingsRecord[]> => {
    if (!user) {
      setSavings([]);
      return [];
    }
    
    try {
      setLoading(true);
      const data = await databaseService.getSavings(user.id);
      
      setSavings(data);
      return data;
    } catch (error) {
      console.error('Error in refreshSavings:', error);
      logError('Error refreshing savings', error);
      setError('Failed to refresh savings data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    savings,
    loading,
    error,
    saveSavings: saveSavingsRecord,
    deleteSavings,
    refreshSavings,
    setSavings,
    setLoading,
    setError,
  };
}