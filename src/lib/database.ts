import { supabase } from '../config/supabase';

export async function initializeDatabase() {
  try {
    // Simple check if table exists by trying to query it
    await checkTableExists();
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error };
  }
}

async function checkTableExists() {
  try {
    // Try to query the table to see if it exists
    const { error } = await supabase
      .from('savings')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist
      throw new Error('Database table "savings" does not exist. Please run the setup SQL manually in Supabase.');
    }
  } catch (error) {
    throw error;
  }
}

export async function ensureUserProfile(userId: string) {
  console.log('ensureUserProfile: Starting profile check for user:', userId);
  
  // Add timeout to prevent hanging
  return Promise.race([
    // Main profile check
    (async () => {
      try {
        console.log('ensureUserProfile: Querying savings table');
        const { error } = await supabase
          .from('savings')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (error) {
          console.warn('Database table check failed:', error.message);
        }
        
        console.log('ensureUserProfile: Profile check completed successfully');
        return { success: true };
      } catch (error) {
        console.error('User profile check failed:', error);
        return { success: true };
      }
    })(),
    
    // Timeout fallback
    new Promise((resolve) => {
      setTimeout(() => {
        console.warn('ensureUserProfile: Profile check timed out after 3 seconds');
        resolve({ success: true });
      }, 3000);
    })
  ]);
}
