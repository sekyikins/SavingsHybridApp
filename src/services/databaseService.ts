      import { supabase, tables, Transaction, UserSettings, UserProfile } from '../config/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import { logger } from '../utils/debugLogger';

type SavingsRecord = {
  id?: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  description?: string;
  updated_at?: string;
};

type DatabaseResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export const databaseService = {
  // Transaction Operations (replaces old savings operations)
  async getTransactions(userId: string, startDate?: string, endDate?: string): Promise<Transaction[]> {
    try {
      logger.supabase('Fetching transactions', { userId, startDate, endDate });
      
      let query = supabase
        .from(tables.transactions)
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);

      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      const { data, error }: DatabaseResult<Transaction[]> = await query.order('transaction_date', { ascending: false });

      if (error || !data) {
        logger.error('Error fetching transactions', error || undefined, { userId });
        throw error || new Error('No data returned from fetch operation');
      }

      return (data as Transaction[]) || [];
    } catch (error) {
      logger.error('Error in getTransactions', error as Error, { userId });
      throw error;
    }
  },

  async saveTransaction(record: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Transaction> {
    try {
      logger.supabase('Saving transaction', { hasId: !!record.id, type: record.transaction_type, amount: record.amount });
      
      const updates = {
        ...record,
        updated_at: new Date().toISOString()
      };

      const { data, error }: DatabaseResult<Transaction> = await supabase
        .from(tables.transactions)
        .upsert(updates)
        .select()
        .single();

      if (error || !data) {
        logger.error('Error saving transaction', error || undefined, { record });
        throw error || new Error('No data returned from save operation');
      }

      logger.supabase('Transaction saved successfully', { id: data.id });
      return data as Transaction;
    } catch (error) {
      logger.error('Error in saveTransaction', error as Error, { record });
      throw error;
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      logger.supabase('Deleting transaction', { id });
      
      // Soft delete by setting is_deleted = true
      const { error }: DatabaseResult<void> = await supabase
        .from(tables.transactions)
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        logger.error('Error deleting transaction', error || undefined, { id });
        throw error;
      }
      
      logger.supabase('Transaction deleted successfully', { id });
    } catch (error) {
      logger.error('Error in deleteTransaction', error as Error, { id });
      throw error;
    }
  },

  // Legacy savings operations for backward compatibility
  async getSavings(userId: string, startDate?: string, endDate?: string): Promise<SavingsRecord[]> {
    logger.auth('Legacy getSavings called - redirecting to getTransactions', { userId });
    // Convert transactions to legacy savings format for backward compatibility
    const transactions = await this.getTransactions(userId, startDate, endDate);
    return transactions.map(tx => ({
      id: tx.id,
      user_id: tx.user_id,
      date: tx.transaction_date,
      amount: tx.transaction_type === 'deposit' ? tx.amount : -tx.amount,
      saved: tx.transaction_type === 'deposit',
      updated_at: tx.updated_at
    }));
  },

  async saveSavings(record: SavingsRecord): Promise<SavingsRecord> {
    logger.auth('Legacy saveSavings called - converting to transaction', { record });
    // Convert legacy savings record to transaction format
    const transaction: Partial<Transaction> = {
      user_id: record.user_id,
      amount: Math.abs(record.amount),
      transaction_type: (record.saved || record.amount > 0 ? 'deposit' : 'withdrawal') as 'deposit' | 'withdrawal',
      transaction_date: record.date,
      description: record.description || (record.saved ? 'Deposit' : 'Withdrawal'),
      id: record.id
    };
    
    const savedTransaction = await this.saveTransaction(transaction as Transaction);
    
    // Convert back to legacy format
    return {
      id: savedTransaction.id,
      user_id: savedTransaction.user_id,
      date: savedTransaction.transaction_date,
      amount: savedTransaction.transaction_type === 'deposit' ? savedTransaction.amount : -savedTransaction.amount,
      saved: savedTransaction.transaction_type === 'deposit',
      updated_at: savedTransaction.updated_at
    };
  },

  async deleteSavings(id: string): Promise<void> {
    logger.auth('Legacy deleteSavings called - redirecting to deleteTransaction', { id });
    return this.deleteTransaction(id);
  },

  // User Settings Operations
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      logger.supabase('Fetching user settings', { userId });
      
      const { data, error } = await supabase
        .from(tables.user_settings)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && !error.message.includes('No rows found')) {
        logger.error('Error fetching user settings', error || undefined, { userId });
        throw error;
      }

      if (!data) {
        logger.supabase('No settings found, returning defaults', { userId });
        return {
          user_id: userId,
          currency: 'GHS',
          currency_symbol: '₵',
          daily_goal: 10.0,
          weekly_goal: 70.0,
          monthly_goal: 300.0,
          yearly_goal: 3600.0,
          starting_day_of_week: 'MON',
          theme: 'system'
        } as UserSettings;
      }

      return data as UserSettings;
    } catch (error) {
      logger.error('Error in getUserSettings', error as Error, { userId });
      throw error;
    }
  },

  async updateUserSettings(settings: Partial<UserSettings> & { user_id: string }): Promise<UserSettings> {
    try {
      logger.supabase('Updating user settings', { userId: settings.user_id });
      
      const updates = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      const { data, error }: DatabaseResult<UserSettings> = await supabase
        .from(tables.user_settings)
        .upsert(updates)
        .eq('user_id', settings.user_id)
        .select()
        .single();

      if (error || !data) {
        logger.error('Error updating user settings', error || undefined, { settings });
        throw error || new Error('No data returned from update operation');
      }

      logger.supabase('User settings updated successfully', { userId: settings.user_id });
      return data as UserSettings;
    } catch (error) {
      logger.error('Error in updateUserSettings', error as Error, { settings });
      throw error;
    }
  },

  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      logger.supabase('Fetching user profile', { userId });
      
      const { data, error } = await supabase
        .from(tables.user_profiles)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching user profile', error || undefined, { userId });
        throw error;
      }

      return data || { user_id: userId };
    } catch (error) {
      logger.error('Error in getUserProfile', error as Error, { userId });
      throw error;
    }
  },

  async updateUserProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      logger.supabase('Updating user profile', { userId: profile.user_id });
      
      const { data: updateData, error: updateError } = await supabase
        .from(tables.user_profiles)
        .update({
          ...profile,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id)
        .select()
        .single();

      if (updateError?.code === 'PGRST116' || updateError?.message?.includes('No rows found')) {
        const { data: insertData, error: insertError } = await supabase
          .from(tables.user_profiles)
          .insert({
            ...profile,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError || !insertData) {
          logger.error('Error creating user profile', insertError || undefined, { profile });
          throw insertError || new Error('Failed to create user profile');
        }
        return insertData as UserProfile;
      }

      if (updateError || !updateData) {
        logger.error('Error updating user profile', updateError || undefined, { profile });
        throw updateError || new Error('No data returned from update operation');
      }

      return updateData as UserProfile;
    } catch (error) {
      logger.error('Error in updateUserProfile', error as Error, { profile });
      throw error;
    }
  },

  // Initialize user data using database functions
  async initializeUserData(userId: string, email: string): Promise<{ success: boolean; error?: Error }> {
    try {
      logger.supabase('Initializing user data', { userId, email });
      
      // Check if user profile already exists
      const existingProfile = await this.getUserProfile(userId);
      if (existingProfile.username || existingProfile.email) {
        logger.supabase('User already initialized', { userId });
        return { success: true };
      }

      // Create user profile
      await this.updateUserProfile({
        user_id: userId,
        email: email,
        username: email.split('@')[0],
        full_name: email.split('@')[0]
      });

      // Create default user settings
      await this.updateUserSettings({
        user_id: userId,
        currency: 'GHS',
        currency_symbol: '₵',
        starting_day_of_week: 'MON',
        daily_goal: 10.0,
        weekly_goal: 70.0,
        monthly_goal: 300.0,
        yearly_goal: 3600.0,
        theme: 'system'
      });

      // Create default categories
      const defaultCategories = [
        { name: 'Food & Dining', description: 'Meals, groceries, restaurants', color: '#e74c3c', icon: 'utensils', category_type: 'system' },
        { name: 'Transportation', description: 'Gas, public transport, taxi', color: '#3498db', icon: 'car', category_type: 'system' },
        { name: 'Shopping', description: 'Clothes, electronics, general shopping', color: '#9b59b6', icon: 'shopping-bag', category_type: 'system' },
        { name: 'Entertainment', description: 'Movies, games, subscriptions', color: '#f39c12', icon: 'film', category_type: 'system' },
        { name: 'Bills & Utilities', description: 'Rent, electricity, water, internet', color: '#34495e', icon: 'receipt', category_type: 'system' },
        { name: 'Healthcare', description: 'Medical expenses, pharmacy', color: '#2ecc71', icon: 'heart', category_type: 'system' },
        { name: 'Income', description: 'Salary, freelance, other income', color: '#27ae60', icon: 'dollar-sign', category_type: 'system' },
        { name: 'Savings', description: 'Emergency fund, investments', color: '#16a085', icon: 'piggy-bank', category_type: 'system' }
      ];

      for (const category of defaultCategories) {
        try {
          const { error } = await supabase
            .from(tables.categories)
            .insert({
              ...category,
              user_id: userId
            });
          
          if (error && error.code !== '23505') { // Ignore unique constraint violations
            logger.error('Error creating category', error || undefined, { category: category.name });
          }
        } catch (err) {
          logger.error('Failed to create category', err as Error, { category: category.name });
        }
      }

      // Log successful initialization
      try {
        await supabase.rpc('log_user_activity', {
          p_user_id: userId,
          p_activity_type: 'user_initialization',
          p_description: 'User data initialized successfully',
          p_success: true
        });
      } catch (err) {
        // Don't fail initialization if logging fails
        logger.error('Error logging user initialization', err as Error, { userId });
      }

      logger.supabase('User initialization completed successfully', { userId });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Unknown error during user initialization');
      logger.error('Error in user initialization', errorMessage, { userId, email });
      return { success: false, error: errorMessage };
    }
  }
};
