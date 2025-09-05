-- Comprehensive Savings Mobile App Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_passcodes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS savings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS device_sessions CASCADE;
DROP TABLE IF EXISTS user_activity_log CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS backup_history CASCADE;

-- 1. USER PROFILES TABLE (Enhanced with security tokens)
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    -- Security tokens for enhanced security
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USER PASSCODES TABLE (6-digit login codes)
CREATE TABLE user_passcodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    passcode_hash TEXT NOT NULL, -- Hashed 6-digit code
    salt TEXT NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. USER SETTINGS TABLE (Comprehensive user preferences)
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Currency and localization
    currency TEXT DEFAULT 'GHS' NOT NULL,
    currency_symbol TEXT DEFAULT '₵' NOT NULL,
    starting_day_of_week TEXT DEFAULT 'MON' NOT NULL CHECK (starting_day_of_week IN ('SUN', 'MON')),
    
    -- Goals and targets
    daily_goal DECIMAL(15,2) DEFAULT 10.00,
    weekly_goal DECIMAL(15,2) DEFAULT 70.00,
    monthly_goal DECIMAL(15,2) DEFAULT 300.00,
    yearly_goal DECIMAL(15,2) DEFAULT 3600.00,
    
    -- UI preferences
    theme TEXT DEFAULT 'system' NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en' NOT NULL,
    
    -- Notifications
    notifications_enabled BOOLEAN DEFAULT true,
    daily_reminder_enabled BOOLEAN DEFAULT true,
    daily_reminder_time TIME DEFAULT '09:00:00',
    weekly_summary_enabled BOOLEAN DEFAULT true,
    goal_achievement_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT false,
    
    -- Security preferences
    biometrics_enabled BOOLEAN DEFAULT false,
    passcode_required BOOLEAN DEFAULT true,
    auto_lock_timeout INTEGER DEFAULT 300, -- seconds
    require_passcode_on_startup BOOLEAN DEFAULT true,
    
    -- Privacy settings
    data_sharing_enabled BOOLEAN DEFAULT false,
    analytics_enabled BOOLEAN DEFAULT true,
    
    -- Backup and sync
    auto_backup_enabled BOOLEAN DEFAULT true,
    cloud_sync_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CATEGORIES TABLE (Transaction categories)
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3498db', -- Hex color code
    icon TEXT DEFAULT 'folder', -- Icon name
    category_type TEXT DEFAULT 'custom' CHECK (category_type IN ('system', 'custom')),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

-- 5. TRANSACTIONS TABLE (Replaces savings table with enhanced functionality)
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction details
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
    -- Alternative: use signed amount instead of type (positive for deposits, negative for withdrawals)
    signed_amount DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE WHEN transaction_type = 'deposit' THEN amount ELSE -amount END
    ) STORED,
    
    -- Transaction metadata
    description TEXT,
    notes TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Date and time
    transaction_date DATE NOT NULL,
    transaction_time TIME DEFAULT CURRENT_TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Additional fields
    reference_number TEXT,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_money', 'other')),
    location TEXT,
    receipt_url TEXT,
    
    -- Status and flags
    is_recurring BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Indexing
    CONSTRAINT idx_user_date UNIQUE(user_id, transaction_date, created_at)
);

-- 6. SAVINGS SUMMARY TABLE (Daily/Weekly/Monthly aggregates)
CREATE TABLE savings_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Period information
    summary_date DATE NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    
    -- Calculated totals
    total_deposits DECIMAL(15,2) DEFAULT 0.00,
    total_withdrawals DECIMAL(15,2) DEFAULT 0.00,
    net_savings DECIMAL(15,2) GENERATED ALWAYS AS (total_deposits - total_withdrawals) STORED,
    transaction_count INTEGER DEFAULT 0,
    
    -- Goal tracking
    goal_amount DECIMAL(15,2),
    goal_achieved BOOLEAN DEFAULT false,
    goal_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(user_id, summary_date, period_type)
);

-- Create device_sessions table for biometrics and device tracking
CREATE TABLE device_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'web')),
    platform TEXT, -- iOS, Android, Windows, etc.
    app_version TEXT,
    biometric_type TEXT CHECK (biometric_type IN ('fingerprint', 'face_id', 'voice', 'none')),
    biometric_enabled BOOLEAN DEFAULT false,
    is_trusted_device BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,
    session_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, device_id)
);

-- Create user_activity_log table to track all user actions
CREATE TABLE user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, -- login, logout, transaction_add, transaction_edit, settings_change, etc.
    activity_description TEXT,
    metadata JSONB, -- Additional data about the activity
    device_id TEXT,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create notification_history table
CREATE TABLE notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    notification_type TEXT NOT NULL, -- daily_reminder, goal_achieved, weekly_summary, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create backup_history table
CREATE TABLE backup_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'automatic', 'export')),
    backup_size_bytes BIGINT,
    backup_location TEXT, -- cloud storage location or local path
    backup_status TEXT DEFAULT 'in_progress' CHECK (backup_status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT,
    data_types TEXT[], -- ['transactions', 'settings', 'categories', etc.]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

CREATE INDEX idx_user_passcodes_user_id ON user_passcodes(user_id);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(category_type);
CREATE INDEX idx_categories_active ON categories(is_active);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX idx_transactions_created ON transactions(created_at);

CREATE INDEX idx_savings_summary_user_id ON savings_summary(user_id);
CREATE INDEX idx_savings_summary_date ON savings_summary(summary_date);
CREATE INDEX idx_savings_summary_period ON savings_summary(period_type);

CREATE INDEX idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX idx_device_sessions_last_active ON device_sessions(last_active);

CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_activity_type ON user_activity_log(activity_type);
CREATE INDEX idx_user_activity_log_created_at ON user_activity_log(created_at);

CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);

CREATE INDEX idx_backup_history_user_id ON backup_history(user_id);
CREATE INDEX idx_backup_history_created_at ON backup_history(created_at);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_passcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can see their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_passcodes
CREATE POLICY "Users can see their own passcode" ON user_passcodes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own passcode" ON user_passcodes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own passcode" ON user_passcodes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own passcode" ON user_passcodes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can see their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Users can see their own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can see their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for savings_summary
CREATE POLICY "Users can see their own savings summary" ON savings_summary
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own savings summary" ON savings_summary
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own savings summary" ON savings_summary
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own savings summary" ON savings_summary
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for device_sessions
CREATE POLICY "Users can see their own device sessions" ON device_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own device sessions" ON device_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own device sessions" ON device_sessions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own device sessions" ON device_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_activity_log
CREATE POLICY "Users can see their own activity log" ON user_activity_log
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activity log" ON user_activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification_history
CREATE POLICY "Users can see their own notifications" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notifications" ON notification_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notification_history
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for backup_history
CREATE POLICY "Users can see their own backup history" ON backup_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own backup history" ON backup_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own backup history" ON backup_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to initialize default user data
CREATE OR REPLACE FUNCTION initialize_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile with error handling
    BEGIN
        INSERT INTO user_profiles (user_id, email, username, full_name)
        VALUES (
            NEW.id, 
            NEW.email, 
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            COALESCE(
                TRIM(CONCAT(NEW.raw_user_meta_data->>'firstName', ' ', NEW.raw_user_meta_data->>'lastName')),
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'username'
            )
        )
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Create default user settings with error handling
    BEGIN
        INSERT INTO user_settings (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to create user settings for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Create default categories with error handling
    BEGIN
        INSERT INTO categories (user_id, name, description, color, icon, category_type) VALUES
        (NEW.id, 'Food & Dining', 'Meals, groceries, restaurants', '#e74c3c', 'utensils', 'system'),
        (NEW.id, 'Transportation', 'Gas, public transport, taxi', '#3498db', 'car', 'system'),
        (NEW.id, 'Shopping', 'Clothes, electronics, general shopping', '#9b59b6', 'shopping-bag', 'system'),
        (NEW.id, 'Entertainment', 'Movies, games, subscriptions', '#f39c12', 'film', 'system'),
        (NEW.id, 'Bills & Utilities', 'Rent, electricity, water, internet', '#34495e', 'receipt', 'system'),
        (NEW.id, 'Healthcare', 'Medical expenses, pharmacy', '#2ecc71', 'heart', 'system'),
        (NEW.id, 'Income', 'Salary, freelance, other income', '#27ae60', 'dollar-sign', 'system'),
        (NEW.id, 'Savings', 'Emergency fund, investments', '#16a085', 'piggy-bank', 'system')
        ON CONFLICT (user_id, name) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to create categories for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize new user data
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_new_user();

-- Function to update savings summary (can be called periodically)
CREATE OR REPLACE FUNCTION update_savings_summary(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_period_type TEXT DEFAULT 'daily'
)
RETURNS VOID AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_deposits DECIMAL(15,2);
    v_withdrawals DECIMAL(15,2);
    v_count INTEGER;
    v_goal DECIMAL(15,2);
BEGIN
    -- Calculate date range based on period type
    CASE p_period_type
        WHEN 'daily' THEN
            v_start_date := p_date;
            v_end_date := p_date;
        WHEN 'weekly' THEN
            v_start_date := date_trunc('week', p_date);
            v_end_date := v_start_date + INTERVAL '6 days';
        WHEN 'monthly' THEN
            v_start_date := date_trunc('month', p_date);
            v_end_date := (date_trunc('month', p_date) + INTERVAL '1 month - 1 day')::date;
        WHEN 'yearly' THEN
            v_start_date := date_trunc('year', p_date);
            v_end_date := (date_trunc('year', p_date) + INTERVAL '1 year - 1 day')::date;
    END CASE;
    
    -- Calculate totals
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0),
        COUNT(*)
    INTO v_deposits, v_withdrawals, v_count
    FROM transactions 
    WHERE user_id = p_user_id 
    AND transaction_date BETWEEN v_start_date AND v_end_date
    AND is_deleted = false;
    
    -- Get goal amount
    SELECT 
        CASE p_period_type
            WHEN 'daily' THEN daily_goal
            WHEN 'weekly' THEN weekly_goal
            WHEN 'monthly' THEN monthly_goal
            WHEN 'yearly' THEN yearly_goal
        END
    INTO v_goal
    FROM user_settings 
    WHERE user_id = p_user_id;
    
    -- Insert or update summary
    INSERT INTO savings_summary (
        user_id, summary_date, period_type, 
        total_deposits, total_withdrawals, transaction_count,
        goal_amount, goal_achieved, goal_percentage
    ) VALUES (
        p_user_id, p_date, p_period_type,
        v_deposits, v_withdrawals, v_count,
        v_goal, 
        (v_deposits - v_withdrawals) >= COALESCE(v_goal, 0),
        CASE WHEN COALESCE(v_goal, 0) > 0 THEN ((v_deposits - v_withdrawals) / v_goal * 100) ELSE 0 END
    )
    ON CONFLICT (user_id, summary_date, period_type)
    DO UPDATE SET
        total_deposits = EXCLUDED.total_deposits,
        total_withdrawals = EXCLUDED.total_withdrawals,
        transaction_count = EXCLUDED.transaction_count,
        goal_amount = EXCLUDED.goal_amount,
        goal_achieved = EXCLUDED.goal_achieved,
        goal_percentage = EXCLUDED.goal_percentage,
        updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash passcode
CREATE OR REPLACE FUNCTION hash_passcode(passcode TEXT)
RETURNS TABLE(hash TEXT, salt TEXT) AS $$
DECLARE
    v_salt TEXT;
    v_hash TEXT;
BEGIN
    v_salt := encode(gen_random_bytes(32), 'hex');
    v_hash := encode(digest(passcode || v_salt, 'sha256'), 'hex');
    RETURN QUERY SELECT v_hash, v_salt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify passcode
CREATE OR REPLACE FUNCTION verify_passcode(p_user_id UUID, p_passcode TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_stored_hash TEXT;
    v_salt TEXT;
    v_computed_hash TEXT;
BEGIN
    SELECT passcode_hash, salt INTO v_stored_hash, v_salt
    FROM user_passcodes 
    WHERE user_id = p_user_id;
    
    IF v_stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    
    v_computed_hash := encode(digest(p_passcode || v_salt, 'sha256'), 'hex');
    
    RETURN v_computed_hash = v_stored_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment failed passcode attempts
CREATE OR REPLACE FUNCTION increment_passcode_attempts(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_attempts INTEGER;
BEGIN
    UPDATE user_passcodes 
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE 
            WHEN failed_attempts + 1 >= 5 THEN timezone('utc'::text, now()) + INTERVAL '30 minutes'
            ELSE locked_until
        END,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset passcode attempts on successful login
CREATE OR REPLACE FUNCTION reset_passcode_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_passcodes 
    SET failed_attempts = 0,
        locked_until = NULL,
        last_used = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if passcode is locked
CREATE OR REPLACE FUNCTION is_passcode_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT locked_until INTO v_locked_until
    FROM user_passcodes 
    WHERE user_id = p_user_id;
    
    IF v_locked_until IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN v_locked_until > timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_device_id TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_log (
        user_id, activity_type, activity_description, metadata,
        device_id, success, error_message
    ) VALUES (
        p_user_id, p_activity_type, p_description, p_metadata,
        p_device_id, p_success, p_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register/update device session
CREATE OR REPLACE FUNCTION register_device_session(
    p_user_id UUID,
    p_device_id TEXT,
    p_device_name TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT 'mobile',
    p_platform TEXT DEFAULT NULL,
    p_biometric_type TEXT DEFAULT 'none',
    p_biometric_enabled BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO device_sessions (
        user_id, device_id, device_name, device_type, platform,
        biometric_type, biometric_enabled, last_active
    ) VALUES (
        p_user_id, p_device_id, p_device_name, p_device_type, p_platform,
        p_biometric_type, p_biometric_enabled, timezone('utc'::text, now())
    )
    ON CONFLICT (user_id, device_id)
    DO UPDATE SET
        device_name = EXCLUDED.device_name,
        device_type = EXCLUDED.device_type,
        platform = EXCLUDED.platform,
        biometric_type = EXCLUDED.biometric_type,
        biometric_enabled = EXCLUDED.biometric_enabled,
        last_active = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile information with security tokens';
COMMENT ON TABLE user_passcodes IS '6-digit passcode for app startup authentication';
COMMENT ON TABLE user_settings IS 'Comprehensive user preferences and settings';
COMMENT ON TABLE categories IS 'Transaction categories for organization';
COMMENT ON TABLE transactions IS 'Individual transaction records with full details';
COMMENT ON TABLE savings_summary IS 'Aggregated savings data by period';
COMMENT ON TABLE device_sessions IS 'Device sessions for biometrics and device tracking';
COMMENT ON TABLE user_activity_log IS 'User activity log for tracking user actions';
COMMENT ON TABLE notification_history IS 'Notification history for tracking notifications';
COMMENT ON TABLE backup_history IS 'Backup history for tracking backups';

-- Completion notification
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive database setup completed successfully!';
    RAISE NOTICE 'Tables created: user_profiles, user_passcodes, user_settings, categories, transactions, savings_summary, device_sessions, user_activity_log, notification_history, backup_history';
    RAISE NOTICE 'All tables have RLS enabled and proper indexing';
END $$;
