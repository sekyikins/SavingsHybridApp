import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test@1234';
  let testUserId: string | null = null;

  try {
    // Test sign up
    console.log('🔐 Testing sign up...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'testuser',
          email_confirm: true // Bypass email confirmation in development
        }
      }
    });

    if (signUpError) {
      console.error('❌ Sign up error:', signUpError);
      return;
    }

    testUserId = signUpData.user?.id || null;
    console.log('✅ Signed up successfully');
    console.log('User ID:', testUserId);

    // Test sign in
    console.log('\n🔑 Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('❌ Sign in error:', signInError);
      return;
    }

    console.log('✅ Signed in successfully');
    console.log('Session:', signInData.session);

    // Test getting current user
    console.log('\n👤 Testing get user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Get user error:', userError);
      return;
    }

    console.log('✅ Current user:', user?.email);

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  } finally {
    // Clean up test user
    if (testUserId) {
      console.log('\n🧹 Cleaning up test user...');
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(testUserId);
        if (deleteError) {
          console.error('❌ Error cleaning up test user:', deleteError);
        } else {
          console.log('✅ Test user cleaned up');
        }
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
      }
    }
  }
}

testAuth();
