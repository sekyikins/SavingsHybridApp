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
    // Test connection by querying a system table
    const { data: tables, error } = await supabase
      .rpc('get_tables');

    if (error) throw error;

    console.log('✅ Successfully connected to Supabase');
    
    if (tables && tables.length > 0) {
      console.log('\n📋 Found tables:');
      tables.forEach((table: { table_name: string }) => console.log(`- ${table.table_name}`));
    } else {
      console.log('\nℹ️ No tables found in the public schema');
    }

    // Check for required tables
    const requiredTables = ['user_profiles', 'savings', 'user_settings'];
    const foundTables = tables ? tables.map((t: any) => t.table_name) : [];
    const missingTables = requiredTables.filter(
      table => !foundTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.log('\n❌ Missing required tables:');
      missingTables.forEach(table => console.log(`- ${table}`));
      console.log('\nPlease run the database-setup.sql script in your Supabase SQL Editor');
    } else {
      console.log('\n✅ All required tables exist');
    }
  } catch (error: any) {
    if (error.message.includes('function get_tables() does not exist')) {
      console.log('\nℹ️ The get_tables function is not available. Creating it now...');
      await createGetTablesFunction();
      await checkDatabase(); // Try again after creating the function
    } else {
      console.error('❌ Error checking database:', error.message);
      console.log('\nTrying alternative method...');
      await checkTablesAlternative();
    }
  }
}

async function createGetTablesFunction() {
  try {
    const { error } = await supabase.rpc('create_get_tables_function');
    if (error) throw error;
    console.log('✅ Created get_tables function');
  } catch (error: any) {
    console.error('❌ Error creating get_tables function:', error.message);
    console.log('\nPlease run this SQL in your Supabase SQL Editor to create the required function:');
    console.log(`
    CREATE OR REPLACE FUNCTION get_tables()
    RETURNS TABLE (table_name text) AS $$
    BEGIN
      RETURN QUERY
      SELECT tablename::text
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    process.exit(1);
  }
}

async function checkTablesAlternative() {
  console.log('\n🔍 Trying alternative method to check tables...');
  
  const requiredTables = ['user_profiles', 'savings', 'user_settings'];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) throw error;
      console.log(`✅ Table exists: ${table}`);
    } catch (error: any) {
      if (error.message.includes('relation "public.' + table + '" does not exist')) {
        console.log(`❌ Table does not exist: ${table}`);
        missingTables.push(table);
      } else {
        console.log(`ℹ️ Could not verify table ${table}:`, error.message);
      }
    }
  }

  if (missingTables.length > 0) {
    console.log('\n❌ Missing required tables:');
    missingTables.forEach(table => console.log(`- ${table}`));
    console.log('\nPlease run the database-setup.sql script in your Supabase SQL Editor');
  } else {
    console.log('\n✅ All required tables exist');
  }
}

// Run the checks
checkDatabase();
