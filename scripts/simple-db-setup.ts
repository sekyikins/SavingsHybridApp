import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.log('Please ensure you have the following in your .env file:');
  console.log('VITE_SUPABASE_URL=your-supabase-url');
  console.log('VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTables() {
  try {
    console.log('🔄 Setting up database tables...');
    
    // Create tables using SQL commands
    const commands = [
      // Create user_profiles table
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
        username TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      )`,
      
      // Create savings table
      `CREATE TABLE IF NOT EXISTS savings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        date DATE NOT NULL,
        amount FLOAT DEFAULT 0,
        saved BOOLEAN DEFAULT false,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(user_id, date)
      )`,
      
      // Create user_settings table
      `CREATE TABLE IF NOT EXISTS user_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
        currency TEXT DEFAULT 'USD',
        daily_goal FLOAT DEFAULT 10.0,
        starting_day_of_week TEXT DEFAULT 'SUN',
        theme TEXT DEFAULT 'system',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      )`,
      
      // Create indexes
      'CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_savings_date ON savings(date)',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)'
    ];
    
    for (const cmd of commands) {
      console.log(`\nExecuting: ${cmd.substring(0, 100)}...`);
      const { error } = await supabase.rpc('pg_temp.execute_sql', { query: cmd });
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Error: ${error.message}`);
      } else if (!error) {
        console.log('✅ Success');
      } else {
        console.log('ℹ️ Already exists, skipping...');
      }
    }
    
    console.log('\n✅ Database tables created successfully!');
    
    // Enable RLS and set up policies
    await setupRowLevelSecurity();
    
  } catch (error) {
    console.error('❌ Error setting up tables:', error.message);
  }
}

async function setupRowLevelSecurity() {
  try {
    console.log('\n🔒 Setting up Row Level Security...');
    
    const tables = ['user_profiles', 'savings', 'user_settings'];
    
    for (const table of tables) {
      // Enable RLS
      console.log(`\nConfiguring RLS for ${table}...`);
      
      await supabase.rpc('pg_temp.execute_sql', {
        query: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      });
      
      // Create policies
      const policies = [
        // Select policy
        `CREATE POLICY "Users can see their own ${table}" 
         ON ${table} FOR SELECT 
         USING (auth.uid() = user_id)`,
        
        // Insert policy
        `CREATE POLICY "Users can insert into their own ${table}" 
         ON ${table} FOR INSERT 
         WITH CHECK (auth.uid() = user_id)`,
        
        // Update policy
        `CREATE POLICY "Users can update their own ${table}" 
         ON ${table} FOR UPDATE 
         USING (auth.uid() = user_id)`,
        
        // Delete policy
        `CREATE POLICY "Users can delete their own ${table}" 
         ON ${table} FOR DELETE 
         USING (auth.uid() = user_id)`
      ];
      
      for (const policy of policies) {
        try {
          await supabase.rpc('pg_temp.execute_sql', { query: policy });
          console.log(`✅ Added policy: ${policy.split('\n')[0].trim()}...`);
        } catch (policyError) {
          if (!policyError.message.includes('already exists')) {
            console.error(`❌ Error creating policy: ${policyError.message}`);
          }
        }
      }
    }
    
    console.log('\n✅ Row Level Security setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up RLS:', error.message);
  }
}

// Run the setup
setupTables()
  .then(() => {
    console.log('\n🎉 Database setup completed successfully!');
    console.log('You can now use the application with a properly configured database.');
  })
  .catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
