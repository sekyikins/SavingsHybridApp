-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create savings table
CREATE TABLE IF NOT EXISTS public.savings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    amount FLOAT DEFAULT 0,
    saved BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    currency TEXT DEFAULT 'USD',
    daily_goal FLOAT DEFAULT 10.0,
    starting_day_of_week TEXT DEFAULT 'SUN',
    theme TEXT DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON public.savings(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_date ON public.savings(date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    -- User Profiles Policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can see their own profile') THEN
        DROP POLICY "Users can see their own profile" ON public.user_profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert their own profile') THEN
        DROP POLICY "Users can insert their own profile" ON public.user_profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update their own profile') THEN
        DROP POLICY "Users can update their own profile" ON public.user_profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can delete their own profile') THEN
        DROP POLICY "Users can delete their own profile" ON public.user_profiles;
    END IF;
    
    -- Savings Policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'savings' AND policyname = 'Users can see their own savings') THEN
        DROP POLICY "Users can see their own savings" ON public.savings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'savings' AND policyname = 'Users can insert their own savings') THEN
        DROP POLICY "Users can insert their own savings" ON public.savings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'savings' AND policyname = 'Users can update their own savings') THEN
        DROP POLICY "Users can update their own savings" ON public.savings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'savings' AND policyname = 'Users can delete their own savings') THEN
        DROP POLICY "Users can delete their own savings" ON public.savings;
    END IF;
    
    -- User Settings Policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can see their own settings') THEN
        DROP POLICY "Users can see their own settings" ON public.user_settings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can insert their own settings') THEN
        DROP POLICY "Users can insert their own settings" ON public.user_settings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can update their own settings') THEN
        DROP POLICY "Users can update their own settings" ON public.user_settings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can delete their own settings') THEN
        DROP POLICY "Users can delete their own settings" ON public.user_settings;
    END IF;
END $$;

-- User Profiles Policies
CREATE POLICY "Users can see their own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.user_profiles FOR DELETE 
USING (auth.uid() = user_id);

-- Savings Policies
CREATE POLICY "Users can see their own savings" 
ON public.savings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings" 
ON public.savings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings" 
ON public.savings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings" 
ON public.savings FOR DELETE 
USING (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can see their own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" 
ON public.user_settings FOR DELETE 
USING (auth.uid() = user_id);

-- Add a comment to indicate successful execution
COMMENT ON TABLE public.user_profiles IS 'User profiles table created by setup script';
COMMENT ON TABLE public.savings IS 'Savings records table created by setup script';
COMMENT ON TABLE public.user_settings IS 'User settings table created by setup script';

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
END $$;
