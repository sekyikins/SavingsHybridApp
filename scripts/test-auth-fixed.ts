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

// Log the first few characters of the credentials for verification (don't log full keys)
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set');
console.log('Supabase Key:', supabaseKey ? `${supabaseKey.substring(0, 5)}...${supabaseKey.substring(supabaseKey.length - 5)}` : 'Not set');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  // Use a different email format that's more likely to be accepted
  const testEmail = `testuser.${Date.now()}@test.com`;
  const testPassword = 'Test@1234';
  let testUserId: string | null = null;

  try {
    // Test sign up
    console.log('\n🔐 Testing sign up with email:', testEmail);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'testuser',
          email_confirm: true // Bypass email confirmation in development
        },
        emailRedirectTo: 'http://localhost:3000/welcome' // Add a redirect URL
      }
    });

    if (signUpError) {
      console.error('❌ Sign up error:', signUpError);
      console.log('\nCommon solutions:');
      console.log('1. Check if email confirmation is required in your Supabase Auth settings');
      console.log('2. Verify the email domain is allowed in your Supabase project');
      console.log('3. Check if you have any email restrictions in place');
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

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  } finally {
    // Clean up test user if created
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
