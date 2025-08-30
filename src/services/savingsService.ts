import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, tables, SavingsRecord } from '../config/supabase';
import OfflineStorage from './offlineStorage';
import { useNetwork } from '../hooks/useNetwork';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type RealtimePayload = {
  eventType: RealtimeEvent;
  new: any;
  old: any;
  table: string;
  schema: string;
  commit_timestamp: string;
};

interface OfflineOperation<T = any> {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  data: T;
  id: string;
  timestamp: number;
  table: string;
}

interface ISavingsService {
  getSavings(userId: string): Promise<SavingsRecord[]>;
  saveSavingsRecord(record: Omit<SavingsRecord, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  syncData(userId: string): Promise<void>;
  subscribeToChanges(userId: string, callback: (payload: RealtimePayload) => void): RealtimeChannel;
}

class SavingsService implements ISavingsService {
  private static instance: SavingsService;
  private networkStatus: ReturnType<typeof useNetwork>;
  private channel: RealtimeChannel | null = null;

  private constructor() {
    this.networkStatus = useNetwork();
    if (this.networkStatus.isOnline) {
      this.initializeRealtime();
    }
  }

  public static getInstance(): SavingsService {
    if (!SavingsService.instance) {
      SavingsService.instance = new SavingsService();
    }
    return SavingsService.instance;
  }

  private initializeRealtime() {
    if (this.channel) return;
    
    this.channel = supabase
      .channel('savings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tables.savings,
        },
        () => {}
      )
      .subscribe();
  }

  public async getSavings(userId: string): Promise<SavingsRecord[]> {
    try {
      if (!this.networkStatus.isOnline) {
        const cached = await OfflineStorage.getLocalData<SavingsRecord[]>(`user_${userId}_savings`);
        return cached || [];
      }

      const { data, error } = await supabase
        .from(tables.savings)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      // Cache the data for offline use
      if (data) {
        await OfflineStorage.saveLocalData(`user_${userId}_savings`, data);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching savings:', error);
      const cached = await OfflineStorage.getLocalData<SavingsRecord[]>(`user_${userId}_savings`);
      return cached || [];
    }
  }

  public async saveSavingsRecord(record: Omit<SavingsRecord, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      if (!this.networkStatus.isOnline) {
        // Queue the operation for later sync
        const operation = {
          type: 'CREATE' as const,
          table: tables.savings,
          data: record
        };
        await OfflineStorage.addToQueue(operation);
        return;
      }

      const { error } = await supabase
        .from(tables.savings)
        .insert(record);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving record:', error);
      throw error;
    }
  }

  public async syncData(userId: string): Promise<void> {
    if (!this.networkStatus.isOnline) return;

    try {
      await this.processOfflineQueue();
      // Force refresh from server
      await this.getSavings(userId);
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }

  public subscribeToChanges(userId: string, callback: (payload: RealtimePayload) => void): RealtimeChannel {
    return supabase
      .channel('savings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tables.savings,
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          callback(payload as RealtimePayload);
          await this.handleRealtimeUpdate(payload as RealtimePayload);
        }
      )
      .subscribe();
  }

  private async handleRealtimeUpdate(payload: RealtimePayload) {
    try {
      const userId = payload.new?.user_id || payload.old?.user_id;
      if (!userId) return;
      
      const currentSavings = await this.getSavings(userId);
      
      switch (payload.eventType) {
        case 'INSERT':
          await OfflineStorage.saveLocalData(
            `user_${userId}_savings`,
            [payload.new, ...currentSavings]
          );
          break;
          
        case 'UPDATE':
          const updatedSavings = currentSavings.map(item => 
            item.id === payload.new.id ? payload.new : item
          );
          await OfflineStorage.saveLocalData(
            `user_${userId}_savings`,
            updatedSavings
          );
          break;
          
        case 'DELETE':
          const filteredSavings = currentSavings.filter(
            (item) => item.id !== payload.old?.id
          );
          await OfflineStorage.saveLocalData(
            `user_${userId}_savings`,
            filteredSavings
          );
          break;
      }
    } catch (error) {
      console.error('Error handling realtime update:', error);
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.networkStatus.isOnline) return;

    type SavingsData = Omit<SavingsRecord, 'id' | 'created_at' | 'updated_at'>;
    
    // @ts-ignore - TypeScript has issues with the generic type here
    await OfflineStorage.processQueue(async (op: OfflineOperation<SavingsData>) => {
      try {
        switch (op.type) {
          case 'CREATE':
            const { error } = await supabase
              .from(tables.savings)
              .insert(op.data);
            if (error) throw error;
            break;
          
          case 'UPDATE':
            const updateData = { ...op.data } as any;
            if (updateData.id) {
              delete updateData.id; // Remove id from update data
              const { error: updateError } = await supabase
                .from(tables.savings)
                .update(updateData)
                .eq('id', (op as any).data.id);
              if (updateError) throw updateError;
            }
            break;
            
          case 'DELETE':
            if ((op as any).data?.id) {
              const { error: deleteError } = await supabase
                .from(tables.savings)
                .delete()
                .eq('id', (op as any).data.id);
              if (deleteError) throw deleteError;
            }
            break;
        }
        return true; // Mark as processed
      } catch (error) {
        console.error('Error processing queued operation:', error);
        return false; // Keep in queue to retry later
      }
    });
  }
}

export default SavingsService.getInstance();
