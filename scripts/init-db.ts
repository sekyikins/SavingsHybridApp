import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Need service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.log('Please ensure you have the following in your .env file:');
  console.log('VITE_SUPABASE_URL=your-supabase-url');
  console.log('VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...');
    
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'database-setup.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into separate statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      if (!statement) continue;
      console.log(`\nExecuting: ${statement.substring(0, 100)}...`);
      
      const { error } = await supabase.rpc('pg_temp.execute_sql', { 
        query: statement 
      });
      
      if (error) {
        // Skip duplicate object errors (tables/functions already exist)
        if (!error.message.includes('already exists')) {
          throw error;
        }
        console.log('  - Already exists, skipping...');
      }
    }
    
    console.log('\n✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.log('\nTrying alternative setup method...');
    await alternativeSetup();
  }
}

async function alternativeSetup() {
  try {
    console.log('\n🔄 Trying alternative setup method...');
    
    // Create tables directly using Supabase client
    const { error: createTablesError } = await supabase.rpc('pg_temp.execute_sql', {
      query: `
        -- Create user_profiles table
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
          username TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        -- Create savings table
        CREATE TABLE IF NOT EXISTS savings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          date DATE NOT NULL,
          amount FLOAT DEFAULT 0,
          saved BOOLEAN DEFAULT false,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(user_id, date)
        );

        -- Create user_settings table
        CREATE TABLE IF NOT EXISTS user_settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
          currency TEXT DEFAULT 'USD',
          daily_goal FLOAT DEFAULT 10.0,
          starting_day_of_week TEXT DEFAULT 'SUN',
          theme TEXT DEFAULT 'system',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    });

    if (createTablesError) throw createTablesError;
    
    console.log('✅ Successfully created tables');
    
    // Enable RLS and create policies
    await setupRLS();
    
  } catch (error) {
    console.error('❌ Alternative setup failed:', error.message);
    console.log('\nPlease run the database-setup.sql file manually in your Supabase SQL Editor');
  }
}

async function setupRLS() {
  try {
    console.log('\n🔒 Setting up Row Level Security...');
    
    // Enable RLS on tables
    const tables = ['user_profiles', 'savings', 'user_settings'];
    
    for (const table of tables) {
      // Enable RLS
      const { error: enableRlsError } = await supabase.rpc('pg_temp.execute_sql', {
        query: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      });
      
      if (enableRlsError) throw enableRlsError;
      
      // Create policies
      const { error: policyError } = await supabase.rpc('pg_temp.execute_sql', {
        query: `
          -- Drop existing policies
          DROP POLICY IF EXISTS "Users can see their own ${table}" ON ${table};
          DROP POLICY IF EXISTS "Users can insert into their own ${table}" ON ${table};
          DROP POLICY IF EXISTS "Users can update their own ${table}" ON ${table};
          DROP POLICY IF EXISTS "Users can delete their own ${table}" ON ${table};
          
          -- Create new policies
          CREATE POLICY "Users can see their own ${table}" 
          ON ${table} FOR SELECT 
          USING (auth.uid() = user_id);
          
          CREATE POLICY "Users can insert into their own ${table}" 
          ON ${table} FOR INSERT 
          WITH CHECK (auth.uid() = user_id);
          
          CREATE POLICY "Users can update their own ${table}" 
          ON ${table} FOR UPDATE 
          USING (auth.uid() = user_id);
          
          CREATE POLICY "Users can delete their own ${table}" 
          ON ${table} FOR DELETE 
          USING (auth.uid() = user_id);
        `
      });
      
      if (policyError) throw policyError;
    }
    
    console.log('✅ Row Level Security setup completed');
    
  } catch (error) {
    console.error('❌ Error setting up RLS:', error.message);
    console.log('\nPlease enable RLS and set up policies manually in your Supabase dashboard');
  }
}

// Create the execute_sql function if it doesn't exist
async function createExecuteSqlFunction() {
  try {
    const { error } = await supabase.rpc('pg_temp.execute_sql', {
      query: `
        CREATE OR REPLACE FUNCTION execute_sql(query text) 
        RETURNS void AS $$
        BEGIN
          EXECUTE query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (error && !error.message.includes('already exists')) {
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error creating execute_sql function:', error.message);
    throw error;
  }
}

// Run the setup
async function main() {
  try {
    await createExecuteSqlFunction();
    await setupDatabase();
    console.log('\n🎉 Database setup completed successfully!');
    console.log('You can now use the application with a properly configured database.');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
