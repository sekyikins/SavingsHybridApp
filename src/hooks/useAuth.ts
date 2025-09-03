import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { databaseService } from '../services/databaseService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set timeout fallback
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          clearTimeout(timeoutId);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  type AuthError = { message: string } | null;

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      // 1. First check if we're rate limited
      const rateLimitKey = `rate_limit_${email}`;
      const lastAttempt = localStorage.getItem(rateLimitKey);
      
      if (lastAttempt) {
        const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt, 10);
        const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
        
        if (timeSinceLastAttempt < RATE_LIMIT_WINDOW) {
          return {
            data: null,
            error: {
              message: 'Too many signup attempts. Please wait a few minutes before trying again.'
            }
          };
        }
      }

      // 2. Store current attempt time
      localStorage.setItem(rateLimitKey, Date.now().toString());

      // 3. Sign up the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        if (error.status === 429) {
          return {
            data: null,
            error: {
              message: 'Too many signup attempts. Please wait a few minutes before trying again.'
            }
          };
        }
        throw error;
      }

      // 4. If signup was successful, initialize user data
      if (data.user) {
        try {
          await databaseService.initializeUserData(data.user.id, email);
          // Clear rate limit on successful signup
          localStorage.removeItem(rateLimitKey);
        } catch (initError) {
          console.error('Error initializing user data:', initError);
          // Don't fail the signup if initialization fails, just log it
        }
      }

      return { 
        data, 
        error: null 
      };
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred during signup';
      
      return { 
        data: null, 
        error: { 
          message: errorMessage,
          isRateLimited: errorMessage.includes('too many requests') || errorMessage.includes('rate limit')
        } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (data.user && !error) {
        // Ensure user data is initialized
        await databaseService.initializeUserData(data.user.id, email);
      }

      return { data, error: error ? { message: error.message } : null };
    } catch (error) {
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to sign in' 
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error ? { message: error.message } : null };
    } catch (error) {
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to sign out' 
        } 
      };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { 
        data, 
        error: error ? { message: error.message } : null 
      };
    } catch (error) {
      return { 
        data: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to send reset email' 
        } 
      };
    }
  };

  const isAuthenticated = !!user;

  return {
    user,
    session,
    loading,
    isAuthenticated,
    error: null as AuthError, // For backward compatibility
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}
