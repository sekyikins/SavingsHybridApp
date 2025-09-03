import { supabase } from '../config/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

type SavingsRecord = {
  id?: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  updated_at?: string;
};

type UserSettings = {
  id?: string;
  user_id: string;
  currency: string;
  daily_goal: number;
  starting_day_of_week: 'SUN' | 'MON';
  theme: 'light' | 'dark' | 'system';
  created_at?: string;
  updated_at?: string;
};

type UserProfile = {
  id?: string;
  user_id: string;
  username?: string;
  updated_at?: string;
};

type DatabaseResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export const databaseService = {
  // Savings Operations
  async getSavings(userId: string, startDate?: string, endDate?: string): Promise<SavingsRecord[]> {
    try {
      let query = supabase
        .from('savings')
        .select('*')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error }: DatabaseResult<SavingsRecord[]> = await query.order('date', { ascending: false });

      if (error) {
        console.error('Error fetching savings:', error);
        throw error;
      }

      return (data as SavingsRecord[]) || [];
    } catch (error) {
      console.error('Error in getSavings:', error);
      throw error;
    }
  },

  async saveSavings(record: Omit<SavingsRecord, 'id' | 'updated_at'> & { id?: string }): Promise<SavingsRecord> {
    try {
      const updates = {
        ...record,
        updated_at: new Date().toISOString()
      };

      let query = supabase.from('savings').upsert(updates);

      if (record.id) {
        query = query.eq('id', record.id);
      } else {
        query = query.eq('user_id', record.user_id);
      }

      const { data, error }: DatabaseResult<SavingsRecord> = await query.select().single();

      if (error || !data) {
        console.error('Error saving savings record:', error);
        throw error || new Error('No data returned from save operation');
      }

      return data as SavingsRecord;
    } catch (error) {
      console.error('Error in saveSavings:', error);
      throw error;
    }
  },

  async deleteSavings(id: string): Promise<void> {
    try {
      const { error }: DatabaseResult<void> = await supabase
        .from('savings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting savings record:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteSavings:', error);
      throw error;
    }
  },

  // User Settings Operations
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Check for error that's not a "no rows" error
      if (error && !error.message.includes('No rows found')) {
        console.error('Error fetching user settings:', error);
        throw error;
      }

      // Return default settings if no settings exist
      if (!data) {
        return {
          user_id: userId,
          currency: 'USD',
          daily_goal: 10.0,
          starting_day_of_week: 'SUN',
          theme: 'system'
        } as UserSettings;
      }

      return data as UserSettings;
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      throw error;
    }
  },

  async updateUserSettings(settings: Partial<UserSettings> & { user_id: string }): Promise<UserSettings> {
    try {
      const updates = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      const { data, error }: DatabaseResult<UserSettings> = await supabase
        .from('user_settings')
        .upsert(updates)
        .eq('user_id', settings.user_id)
        .select()
        .single();

      if (error || !data) {
        console.error('Error updating user settings:', error);
        throw error || new Error('No data returned from update operation');
      }

      return data as UserSettings;
    } catch (error) {
      console.error('Error in updateUserSettings:', error);
      throw error;
    }
  },

  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      // Return the profile if it exists, otherwise return a default one
      return data || { user_id: userId };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      throw error;
    }
  },

  async updateUserProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      // First try to update if exists
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          ...profile,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id)
        .select()
        .single();

      // If update fails with 'not found', try to insert
      if (updateError?.code === 'PGRST116' || updateError?.message?.includes('No rows found')) {
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            ...profile,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError || !insertData) {
          console.error('Error creating user profile:', insertError);
          throw insertError || new Error('Failed to create user profile');
        }
        return insertData as UserProfile;
      }

      if (updateError || !updateData) {
        console.error('Error updating user profile:', updateError);
        throw updateError || new Error('No data returned from update operation');
      }

      return updateData as UserProfile;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  },

  // Helper to initialize user data
  async initializeUserData(userId: string, email: string): Promise<{ success: boolean; error?: Error }> {
    try {
      // Create user profile first
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          username: email.split('@')[0]
        })
        .select()
        .single();

      // If profile already exists, that's fine - we'll continue
      if (profileError && profileError.code !== '23505') { // 23505 is unique_violation
        console.error('Error creating user profile:', profileError);
        throw profileError;
      }

      // Create default settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          currency: 'USD',
          daily_goal: 10.0,
          starting_day_of_week: 'SUN',
          theme: 'system'
        })
        .select()
        .single();

      // If settings already exist, that's fine
      if (settingsError && settingsError.code !== '23505') { // 23505 is unique_violation
        console.error('Error creating user settings:', settingsError);
        throw settingsError;
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Unknown error initializing user data');
      console.error('Error initializing user data:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
};
