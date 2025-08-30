import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Database } from '../types/supabase';
import { useAuth } from './useAuth';

type SavingsRecord = Database['public']['Tables']['savings']['Row'];
type SavingsUpdate = Database['public']['Tables']['savings']['Update'];
type SavingsInsert = Database['public']['Tables']['savings']['Insert'];

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
      
      console.log('About to execute Supabase query...');
      
      // Query with faster timeout for responsiveness
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 3 seconds')), 3000)
      );
      
      const queryPromise = supabase
        .from('savings')
        .select('id,user_id,date,amount,saved,updated_at')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      console.log('Query promises created, waiting for result...');
      const { data, error: queryError } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log('Supabase query completed. Data:', data, 'Error:', queryError);
      
      if (queryError) {
        console.error('Supabase query error:', queryError);
        throw queryError;
      }
      
      // Type assertion to handle the response from Supabase
      const savingsData = (data || []) as unknown as SavingsRecord[];
      
      console.log('Processed savings data:', savingsData);
      setSavings(savingsData);
      return savingsData;
    } catch (error) {
      console.error('Detailed error in fetchSavings:', error);
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
        return [];
      }
    } finally {
      console.log('Fetch savings completed, setting loading to false');
      setLoading(false);
    }
  }, [user?.id]);

  const saveSavingsRecord = useCallback(async (date: string, amount: number, saved: boolean): Promise<boolean> => {
    if (!user) {
      console.error('No user found when trying to save record');
      return false;
    }

    try {
      console.log(`Saving record (strict sync) - Date: ${date}, Amount: ${amount}, Saved: ${saved}`);

      // Build payload for upsert to keep DB as the source of truth
      const payload: any = {
        user_id: user.id,
        date,
        amount: parseFloat(amount.toString()) || 0,
        saved,
        updated_at: new Date().toISOString()
      };

      // Helper to detect transient errors
      const isTransient = (err: any) => {
        const msg = (err?.message || err?.error_description || '').toString().toLowerCase();
        const status = err?.status || err?.code;
        return (
          msg.includes('timeout') ||
          msg.includes('network') ||
          msg.includes('fetch') ||
          (typeof status === 'number' && status >= 500)
        );
      };

      // Retry with exponential backoff for transient failures
      const maxAttempts = 3;
      const delays = [200, 500, 1000]; // ms
      let lastError: any = null;
      let savedRow: any = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Execute upsert with fast timeout and return the saved row
          const saveTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timeout')), 3000));
          const dbSave = supabase
            .from('savings')
            .upsert(payload, { onConflict: 'user_id,date' })
            .select();

          const result: any = await Promise.race([dbSave, saveTimeout]);

          if (result && !result.error) {
            const rows = Array.isArray(result.data) ? result.data : [result.data];
            savedRow = rows[0];
            if (savedRow) {
              break; // success
            }
            throw new Error('No row returned from upsert');
          } else {
            throw result?.error || new Error('Unknown save error');
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Save attempt ${attempt} failed:`, err?.message || err);
          if (attempt < maxAttempts && isTransient(err)) {
            const delay = delays[attempt - 1] || 1000;
            await new Promise(res => setTimeout(res, delay));
            continue;
          }
          break; // non-transient or max attempts reached
        }
      }

      if (!savedRow) {
        console.error('Database save failed after retries:', lastError);
        setError('Failed to save record to the database.');
        return false;
      }

      // Update local state based on confirmed DB row
      setSavings(prev => {
        const idx = prev.findIndex(r => r.date === date);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...savedRow } as any;
          return copy;
        }
        return [savedRow as any, ...prev];
      });

      console.log('Database save successful and local state synced');
      return true;
    } catch (error) {
      console.error('Error in saveSavingsRecord (strict):', error);
      logError('Error saving record', error);
      setError('Failed to save record');
      return false;
    }
  }, [user, setSavings]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    console.log('useEffect in useSavings, user:', user?.id);
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSavings();
        
        if (isMounted) {
          // Check if today's record exists in the fetched data
          const today = new Date().toISOString().split('T')[0];
          const hasSavedToday = data.some(record => record.date === today && record.saved);
          
          // Update the parent component's state if it exists
          if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({ 
              type: 'SAVINGS_UPDATED',
              hasSavedToday 
            }, '*');
          }
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        if (isMounted) {
          setError('Failed to fetch savings data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Set up an interval to refresh data periodically (every 5 minutes)
    const refreshInterval = setInterval(fetchData, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [fetchSavings, user?.id]);

  // Add a manual refresh function that can be called from parent components
  const refreshSavings = useCallback(async () => {
    try {
      setLoading(true);
      return await fetchSavings();
    } finally {
      setLoading(false);
    }
  }, [fetchSavings]);

  return { 
    savings, 
    loading, 
    error, 
    saveSavingsRecord, 
    refetch: fetchSavings,
    refreshSavings 
  };
}