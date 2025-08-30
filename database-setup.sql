-- Daily Savings Tracker Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create user profiles table for additional user data
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create savings table with user authentication
CREATE TABLE IF NOT EXISTS savings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    amount FLOAT DEFAULT 0,
    saved BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_user_date ON savings(user_id, date);
CREATE INDEX IF NOT EXISTS idx_savings_user_created ON savings(user_id, updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can only insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can only update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can only delete their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can only see their own savings" ON savings;
DROP POLICY IF EXISTS "Users can only insert their own savings" ON savings;
DROP POLICY IF EXISTS "Users can only update their own savings" ON savings;
DROP POLICY IF EXISTS "Users can only delete their own savings" ON savings;

-- Create RLS policies for user profiles
CREATE POLICY "Users can only see their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for savings data
CREATE POLICY "Users can only see their own savings" ON savings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own savings" ON savings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own savings" ON savings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own savings" ON savings
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update updated_at if the row actually changes
  IF (TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW) OR TG_OP = 'INSERT' THEN
    NEW.updated_at = timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    starting_day_of_week TEXT DEFAULT 'MON' NOT NULL CHECK (starting_day_of_week IN ('SUN', 'MON')),
    currency TEXT DEFAULT 'GHS' NOT NULL,
    currency_symbol TEXT DEFAULT '₵' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for user settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create trigger to update updated_at for savings
DROP TRIGGER IF EXISTS update_savings_updated_at ON savings;
CREATE TRIGGER update_savings_updated_at
  BEFORE UPDATE ON savings
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Enable RLS for user settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can only insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can only update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can only delete their own settings" ON user_settings;

-- Create RLS policies for user settings
CREATE POLICY "Users can only see their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to initialize default settings for new users
CREATE OR REPLACE FUNCTION public.initialize_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, starting_day_of_week, currency, currency_symbol)
  VALUES (NEW.id, 'MON', 'GHS', '₵');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize settings when a new user signs up
DROP TRIGGER IF EXISTS on_user_created_initialize_settings ON auth.users;
CREATE TRIGGER on_user_created_initialize_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.initialize_user_settings();

-- Create trigger to update updated_at for user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
