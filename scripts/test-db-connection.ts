import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.log('Please ensure you have the following in your .env file:');
  console.log('VITE_SUPABASE_URL=your-supabase-url');
  console.log('VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
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
      
      // Test data insertion
      await testDataInsertion();
    }
  } catch (error) {
    console.error('❌ Error testing database connection:', error.message);
  }
}

async function testDataInsertion() {
  try {
    console.log('\n🧪 Testing data insertion...');
    
    // Create a test user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
    });

    if (signUpError) throw signUpError;

    const userId = authData.user?.id;
    console.log(`✅ Created test user with ID: ${userId}`);

    // Test inserting into user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        { 
          user_id: userId,
          username: 'testuser'
        }
      ]);

    if (profileError) throw profileError;
    console.log('✅ Successfully inserted test profile');

    // Test inserting into savings
    const { error: savingsError } = await supabase
      .from('savings')
      .insert([
        {
          user_id: userId,
          date: new Date().toISOString().split('T')[0],
          amount: 10.50,
          saved: true
        }
      ]);

    if (savingsError) throw savingsError;
    console.log('✅ Successfully inserted test savings record');

    console.log('\n✅ All database tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Error during data insertion test:', error.message);
  } finally {
    // Clean up test data
    if (authData?.user) {
      await supabase.auth.admin.deleteUser(authData.user.id);
    }
  }
}

// Run the tests
testConnection();
