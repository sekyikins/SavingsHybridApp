import { supabase, tables, Transaction, UserSettings, UserProfile, UserPasscode } from '../config/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import { logger } from '../utils/debugLogger';

// Browser-compatible crypto utilities
const cryptoUtils = {
  // Generate random bytes using Web Crypto API
  async generateRandomBytes(length: number): Promise<Uint8Array> {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  },

  // Convert Uint8Array to hex string
  arrayToHex(array: Uint8Array): string {
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  // Convert string to Uint8Array
  stringToArray(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  },

  // PBKDF2 using Web Crypto API
  async pbkdf2(password: string, salt: string, iterations: number, keyLength: number): Promise<string> {
    const passwordArray = this.stringToArray(password);
    const saltArray = this.stringToArray(salt);

    // Import the password as a key
    const key = await crypto.subtle.importKey(
      'raw',
      passwordArray as BufferSource,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive the key
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltArray as BufferSource,
        iterations: iterations,
        hash: 'SHA-512'
      },
      key,
      keyLength * 8 // Convert bytes to bits
    );

    // Convert to hex string
    return this.arrayToHex(new Uint8Array(derivedBits));
  }
};

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
        logger.error('Error fetching transactions', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { userId });
        throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('No data returned from fetch operation');
      }

      return (data as Transaction[]) || [];
    } catch (error) {
      logger.error('Error in getTransactions', error instanceof Error ? error : new Error(String(error)), { userId });
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
        logger.error('Error saving transaction', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { record });
        throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('No data returned from save operation');
      }

      logger.supabase('Transaction saved successfully', { id: data.id });
      return data as Transaction;
    } catch (error) {
      logger.error('Error in saveTransaction', error instanceof Error ? error : new Error(String(error)), { record });
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
        logger.error('Error deleting transaction', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { id });
        throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('Failed to delete transaction');
      }
      
      logger.supabase('Transaction deleted successfully', { id });
    } catch (error) {
      logger.error('Error in deleteTransaction', error instanceof Error ? error : new Error(String(error)), { id });
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
        logger.error('Error fetching user settings', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { userId });
        throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('Failed to fetch user settings');
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
      logger.error('Error in getUserSettings', error instanceof Error ? error : new Error(String(error)), { userId });
      throw error;
    }
  },

  async updateUserSettings(settings: Partial<UserSettings> & { user_id: string }): Promise<UserSettings> {
    try {
      logger.supabase('Updating user settings', { userId: settings.user_id });
      
      // First, try to get existing settings
      const { data: existingData } = await supabase
        .from(tables.user_settings)
        .select('*')
        .eq('user_id', settings.user_id)
        .single();

      const updates = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      let data, error;
      
      if (existingData) {
        // Update existing record
        const result = await supabase
          .from(tables.user_settings)
          .update(updates)
          .eq('user_id', settings.user_id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from(tables.user_settings)
          .insert(updates)
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        logger.error('Error updating user settings', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { settings });
        throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('No data returned from update operation');
      }

      logger.supabase('User settings updated successfully', { userId: settings.user_id });
      return data as UserSettings;
    } catch (error) {
      logger.error('Error in updateUserSettings', error instanceof Error ? error : new Error(String(error)), { settings });
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
        logger.error('Error fetching user profile', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { userId });
        throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('Failed to fetch user profile');
      }

      return data || { user_id: userId };
    } catch (error) {
      logger.error('Error in getUserProfile', error instanceof Error ? error : new Error(String(error)), { userId });
      throw error;
    }
  },

  async updateUserProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      logger.supabase('Updating user profile', { userId: profile.user_id });
      
      // First, check if profile exists
      const { data: existingProfile } = await supabase
        .from(tables.user_profiles)
        .select('*')
        .eq('user_id', profile.user_id)
        .single();

      const updates = {
        ...profile,
        updated_at: new Date().toISOString()
      };

      let data, error;
      
      if (existingProfile) {
        // Update existing record
        const result = await supabase
          .from(tables.user_profiles)
          .update(updates)
          .eq('user_id', profile.user_id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from(tables.user_profiles)
          .insert(updates)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        logger.error('Error updating user profile', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { profile });
        throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('Failed to update user profile');
      }

      logger.supabase('User profile updated successfully', { userId: profile.user_id });
      return data as UserProfile;
    } catch (error) {
      logger.error('Error in updateUserProfile', error instanceof Error ? error : new Error(String(error)), { profile });
      throw error;
    }
  },

  // Passcode Operations
  async setUserPasscode(userId: string, passcode: string): Promise<void> {
    try {
      logger.supabase('Setting user passcode', { userId });
      
      // Generate salt and hash the passcode using Web Crypto API
      const saltArray = await cryptoUtils.generateRandomBytes(32);
      const salt = cryptoUtils.arrayToHex(saltArray);
      const hash = await cryptoUtils.pbkdf2(passcode, salt, 10000, 64);

      // Check if user already has a passcode
      const { data: existingPasscode }: { data: UserPasscode | null } = await supabase
        .from(tables.user_passcodes)
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existingPasscode) {
        // Update existing passcode
        const { error } = await supabase
          .from(tables.user_passcodes)
          .update({
            passcode_hash: hash,
            salt: salt,
            failed_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        if (error) {
          logger.error('Failed to update user passcode', error instanceof Error ? error : error ? new Error(String(error)) : undefined);
          throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('Failed to update passcode');
        }
      } else {
        // Create new passcode record
        const { error } = await supabase
          .from(tables.user_passcodes)
          .insert({
            user_id: userId,
            passcode_hash: hash,
            salt: salt,
            failed_attempts: 0
          });
        
        if (error) {
          logger.error('Failed to create user passcode', error instanceof Error ? error : error ? new Error(String(error)) : undefined);
          throw error instanceof Error ? error : error ? new Error(String(error)) : new Error('Failed to create passcode');
        }
      }
      
      logger.supabase('User passcode set successfully', { userId });
    } catch (error) {
      logger.error('Error setting user passcode', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  },

  async verifyUserPasscode(userId: string, passcode: string): Promise<{ success: boolean; error?: string; locked?: boolean }> {
    try {
      logger.supabase('Verifying user passcode', { userId });
      
      // Get user passcode data
      const { data: userPasscode }: { data: UserPasscode | null } = await supabase
        .from(tables.user_passcodes)
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (!userPasscode) {
        logger.error('No passcode found for user', undefined, { userId });
        return { success: false, error: 'No passcode set for this user' };
      }
      
      // Check if account is locked
      if (userPasscode.locked_until) {
        const lockTime = new Date(userPasscode.locked_until);
        if (lockTime > new Date()) {
          const remainingMinutes = Math.ceil((lockTime.getTime() - Date.now()) / (1000 * 60));
          return { 
            success: false, 
            error: `Account locked. Try again in ${remainingMinutes} minute(s).`,
            locked: true 
          };
        }
      }
      
      // Verify passcode using Web Crypto API
      const hash = await cryptoUtils.pbkdf2(passcode, userPasscode.salt, 10000, 64);
      const isValid = hash === userPasscode.passcode_hash;

      if (isValid) {
        // Reset failed attempts and update last used
        await supabase
          .from(tables.user_passcodes)
          .update({
            failed_attempts: 0,
            locked_until: null,
            last_used: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        logger.supabase('Passcode verification successful', { userId });
        return { success: true };
      } else {
        // Increment failed attempts
        const failedAttempts = (userPasscode.failed_attempts || 0) + 1;
        const maxAttempts = 5;
        
        let updateData: any = {
          failed_attempts: failedAttempts
        };
        
        // Lock account after max attempts
        if (failedAttempts >= maxAttempts) {
          const lockUntil = new Date();
          lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Lock for 30 minutes
          updateData.locked_until = lockUntil.toISOString();
        }
        
        await supabase
          .from(tables.user_passcodes)
          .update(updateData)
          .eq('user_id', userId);
        
        const remainingAttempts = maxAttempts - failedAttempts;
        
        if (failedAttempts >= maxAttempts) {
          return { 
            success: false, 
            error: 'Too many failed attempts. Account locked for 30 minutes.',
            locked: true 
          };
        } else {
          return { 
            success: false, 
            error: `Incorrect passcode. ${remainingAttempts} attempt(s) remaining.` 
          };
        }
      }
    } catch (error) {
      logger.error('Error verifying user passcode', error instanceof Error ? error : new Error(String(error)));
      return { success: false, error: 'Failed to verify passcode' };
    }
  },

  async hasUserPasscode(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(tables.user_passcodes)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        logger.error('Error checking user passcode', error instanceof Error ? error : new Error(String(error)));
        return false;
      }
      
      return !!data;
    } catch (error) {
      logger.error('Error checking user passcode', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  },

  // Initialize user data using database functions
  async initializeUserData(userId: string, email: string): Promise<void> {
    try {
      logger.supabase('Initializing user data', { userId, email });
      
      // Get user metadata from Supabase auth to extract firstName and lastName
      const { data: { user } } = await supabase.auth.getUser();
      const firstName = user?.user_metadata?.firstName || '';
      const lastName = user?.user_metadata?.lastName || '';
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];

      // Create user profile
      await this.updateUserProfile({
        user_id: userId,
        email: email,
        username: email.split('@')[0],
        full_name: fullName
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
            logger.error('Error creating category', error instanceof Error ? error : error ? new Error(String(error)) : undefined, { category: category.name });
          }
        } catch (err) {
          logger.error('Failed to create category', err instanceof Error ? err : new Error(String(err)), { category: category.name });
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
        logger.error('Error logging user initialization', err instanceof Error ? err : new Error(String(err)), { userId });
      }

      logger.supabase('User initialization completed successfully', { userId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Unknown error during user initialization');
      logger.error('Error in user initialization', errorMessage, { userId, email });
      throw error;
    }
  }
};
