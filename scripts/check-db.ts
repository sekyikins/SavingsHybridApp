import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
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

async function checkDatabase() {
  console.log('🔍 Checking database connection and tables...');
  
  try {
    // Test connection by listing tables
    const { data: tables, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (error) throw error;

    console.log('✅ Successfully connected to Supabase');
    console.log('\n📋 Found tables:');
    tables.forEach(table => console.log(`- ${table.tablename}`));

    // Check for required tables
    const requiredTables = ['user_profiles', 'savings', 'user_settings'];
    const missingTables = requiredTables.filter(
      table => !tables.some(t => t.tablename === table)
    );

    if (missingTables.length > 0) {
      console.log('\n❌ Missing required tables:');
      missingTables.forEach(table => console.log(`- ${table}`));
      console.log('\nPlease run the database-setup.sql script in your Supabase SQL Editor');
    } else {
      console.log('\n✅ All required tables exist');
    }
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

checkDatabase();
