import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { logger } from '../utils/debugLogger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfynhxbedrhbhwwsggpw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeW5oeGJlZHJoYmh3d3NnZ3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MTYxNjksImV4cCI6MjA3MjA5MjE2OX0.bHyOpCuR2-NH5kQvN-uCH271Hg0kOcb4RhteTkYX1yM';

// Debug Supabase configuration
logger.supabase('Initializing Supabase client', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length
});

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase configuration', undefined, {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    envVars: Object.keys(import.meta.env).filter(key => key.includes('SUPABASE'))
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key) => {
        const { value } = await Preferences.get({ key });
        return value;
      },
      setItem: async (key, value) => {
        await Preferences.set({ key, value: value || '' });
      },
      removeItem: async (key) => {
        await Preferences.remove({ key });
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const tables = {
  user_profiles: 'user_profiles',
  user_passcodes: 'user_passcodes',
  user_settings: 'user_settings',
  categories: 'categories',
  transactions: 'transactions',
  savings_summary: 'savings_summary',
};

// Updated type definitions matching new database schema
export type UserProfile = {
  id?: string;
  user_id: string;
  username?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  last_login?: string;
  login_attempts?: number;
  account_locked_until?: string;
  created_at?: string;
  updated_at?: string;
};

export type UserPasscode = {
  id?: string;
  user_id: string;
  passcode_hash: string;
  salt: string;
  failed_attempts?: number;
  locked_until?: string;
  last_used?: string;
  created_at?: string;
  updated_at?: string;
};

export type UserSettings = {
  id?: string;
  user_id: string;
  currency?: string;
  currency_symbol?: string;
  starting_day_of_week?: 'SUN' | 'MON';
  daily_goal?: number;
  weekly_goal?: number;
  monthly_goal?: number;
  yearly_goal?: number;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications_enabled?: boolean;
  daily_reminder_enabled?: boolean;
  daily_reminder_time?: string;
  weekly_summary_enabled?: boolean;
  goal_achievement_notifications?: boolean;
  push_notifications?: boolean;
  email_notifications?: boolean;
  biometrics_enabled?: boolean;
  passcode_required?: boolean;
  auto_lock_timeout?: number;
  require_passcode_on_startup?: boolean;
  data_sharing_enabled?: boolean;
  analytics_enabled?: boolean;
  auto_backup_enabled?: boolean;
  cloud_sync_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  category_type?: 'system' | 'custom';
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type Transaction = {
  id?: string;
  user_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal';
  signed_amount?: number;
  description?: string;
  notes?: string;
  category_id?: string;
  transaction_date: string;
  transaction_time?: string;
  reference_number?: string;
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'other';
  location?: string;
  receipt_url?: string;
  is_recurring?: boolean;
  is_verified?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SavingsSummary = {
  id?: string;
  user_id: string;
  summary_date: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  total_deposits?: number;
  total_withdrawals?: number;
  net_savings?: number;
  transaction_count?: number;
  goal_amount?: number;
  goal_achieved?: boolean;
  goal_percentage?: number;
  created_at?: string;
  updated_at?: string;
};

// Legacy types for backward compatibility (deprecated)
export type SavingsRecord = {
  id?: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  created_at?: string;
  updated_at?: string;
};

// Passcode utility functions
export const passcodeUtils = {
  async hashPasscode(passcode: string): Promise<{ hash: string; salt: string }> {
    const { data, error } = await supabase.rpc('hash_passcode', { passcode });
    if (error) throw error;
    return data;
  },

  async verifyPasscode(userId: string, passcode: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_passcode', {
      p_user_id: userId,
      p_passcode: passcode
    });
    if (error) throw error;
    return data;
  },

  async setPasscode(userId: string, passcode: string): Promise<void> {
    const { hash, salt } = await this.hashPasscode(passcode);
    const { error } = await supabase
      .from(tables.user_passcodes)
      .upsert({
        user_id: userId,
        passcode_hash: hash,
        salt: salt,
        failed_attempts: 0,
        locked_until: null
      });
    if (error) throw error;
  },

  async incrementFailedAttempts(userId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_passcode_attempts', {
      p_user_id: userId
    });
    if (error) throw error;
  }
};
