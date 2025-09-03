import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { databaseService } from '../services/databaseService';
import { logger } from '../utils/debugLogger';

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
      (_event, session) => {
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

  const signUp = async (email: string, password: string, username?: string, userData?: { firstName: string, lastName: string }) => {
    logger.auth('Starting signup process', { email, hasUsername: !!username });
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
      logger.supabase('Calling supabase.auth.signUp', { email });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || '',
            firstName: userData?.firstName || '',
            lastName: userData?.lastName || '',
            full_name: username || ''
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      logger.supabase('Signup response received', { 
        hasUser: !!data?.user, 
        hasError: !!error,
        errorMessage: error?.message 
      });

      if (error) {
        logger.error('Signup error from Supabase', error, { email, errorCode: error.status });
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

      // Log signup success details for debugging
      logger.auth('Signup completed', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        userEmail: data.user?.email,
        userConfirmed: data.user?.email_confirmed_at !== null
      });
      
      // If email confirmation is disabled, user should have a session immediately
      if (data.user && !data.session) {
        logger.auth('User created but no session - email confirmation may be required', {
          userEmail: data.user.email,
          emailConfirmed: data.user.email_confirmed_at
        });
        return {
          data,
          error: {
            message: 'Account created successfully! You can now sign in with your credentials.'
          }
        };
      }
      
      return { 
        data, 
        error: null 
      };
    } catch (error) {
      let errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred during signup';
      
      // Provide user-friendly error messages for signup
      if (errorMessage.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (errorMessage.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
        errorMessage = 'Too many signup attempts. Please wait a few minutes before trying again.';
      }
      
      logger.error('Signup failed with exception', error as Error, { 
        email, 
        errorMessage,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        isRateLimited: errorMessage.includes('too many requests') || errorMessage.includes('rate limit')
      });
      
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
    logger.auth('Starting signin process', { email });
    try {
      logger.supabase('Calling supabase.auth.signInWithPassword', { email });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      logger.supabase('Signin response received', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        hasError: !!error,
        errorMessage: error?.message,
        userEmail: data?.user?.email,
        userConfirmed: data?.user?.email_confirmed_at,
        errorCode: error?.status
      });

      if (data.user && !error) {
        // Ensure user data is initialized
        await databaseService.initializeUserData(data.user.id, email);
      }

      if (error) {
        logger.error('Signin error from Supabase', error, { email });
      } else {
        logger.auth('Signin successful', { userId: data?.user?.id });
      }
      
      // Provide user-friendly error messages
      if (error) {
        let userFriendlyMessage = error.message;
        
        if (error.message.includes('Email not confirmed')) {
          userFriendlyMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Invalid login credentials')) {
          userFriendlyMessage = 'Invalid email or password. If you just signed up, please check your email for a confirmation link first.';
        } else if (error.message.includes('Too many requests')) {
          userFriendlyMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
        }
        
        return { data, error: { message: userFriendlyMessage } };
      }
      
      return { data, error: null };
    } catch (error) {
      logger.error('Signin failed with exception', error as Error, { email });
      
      let errorMessage = 'Failed to sign in';
      if (error instanceof Error) {
        if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { 
        data: null, 
        error: { message: errorMessage } 
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
