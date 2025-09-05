export interface UserProfile {
  id: string;
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
  login_attempts: number;
  account_locked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPasscode {
  id: string;
  user_id: string;
  passcode_hash: string;
  salt: string;
  failed_attempts: number;
  locked_until?: string;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  currency: string;
  currency_symbol: string;
  starting_day_of_week: 'SUN' | 'MON';
  daily_goal: number;
  weekly_goal: number;
  monthly_goal: number;
  yearly_goal: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  weekly_summary_enabled: boolean;
  goal_achievement_notifications: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  biometrics_enabled: boolean;
  passcode_required: boolean;
  auto_lock_timeout: number;
  require_passcode_on_startup: boolean;
  data_sharing_enabled: boolean;
  analytics_enabled: boolean;
  auto_backup_enabled: boolean;
  cloud_sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  category_type: 'system' | 'custom';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal';
  signed_amount: number;
  description?: string;
  notes?: string;
  category_id?: string;
  transaction_date: string;
  transaction_time?: string;
  created_at: string;
  updated_at: string;
  reference_number?: string;
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'other';
  location?: string;
  receipt_url?: string;
  is_recurring: boolean;
  is_verified: boolean;
  is_deleted: boolean;
}

export interface SavingsSummary {
  id: string;
  user_id: string;
  summary_date: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  total_deposits: number;
  total_withdrawals: number;
  net_savings: number;
  transaction_count: number;
  goal_amount?: number;
  goal_achieved: boolean;
  goal_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface DeviceSession {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop' | 'web';
  platform?: string;
  app_version?: string;
  biometric_type?: 'fingerprint' | 'face_id' | 'voice' | 'none';
  biometric_enabled: boolean;
  is_trusted_device: boolean;
  last_active: string;
  ip_address?: string;
  user_agent?: string;
  location_data?: any;
  session_token?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Legacy interface for backward compatibility
export interface SavingsRecord {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  created_at?: string;
  description?: string;
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
      };
      user_passcodes: {
        Row: UserPasscode;
        Insert: Omit<UserPasscode, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserPasscode, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSettings, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'signed_amount'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'signed_amount'>>;
      };
      savings_summary: {
        Row: SavingsSummary;
        Insert: Omit<SavingsSummary, 'id' | 'created_at' | 'updated_at' | 'net_savings'>;
        Update: Partial<Omit<SavingsSummary, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'net_savings'>>;
      };
      device_sessions: {
        Row: DeviceSession;
        Insert: Omit<DeviceSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeviceSession, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
      };
      // Legacy table for backward compatibility
      savings: {
        Row: SavingsRecord;
        Insert: Omit<SavingsRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<SavingsRecord, 'id' | 'created_at' | 'user_id'>>;
      };
    };
  };
}
