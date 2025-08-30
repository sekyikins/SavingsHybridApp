import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  savings: 'savings',
  user_settings: 'user_settings',
};

export type SavingsRecord = {
  id?: string;
  user_id: string;
  date: string;
  amount: number;
  saved: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UserSettings = {
  id?: string;
  user_id: string;
  currency: string;
  daily_goal: number;
  starting_day_of_week: 'MON' | 'SUN';
  theme: 'light' | 'dark' | 'system';
  created_at?: string;
  updated_at?: string;
};
