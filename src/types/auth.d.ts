import { User } from '@supabase/supabase-js';

declare module '../hooks/useAuth' {
  export interface AuthContextType {
    user: User | null;
    session: any; // Replace 'any' with the actual Session type from @supabase/supabase-js if available
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    resetPassword: (email: string) => Promise<{ error: Error | null }>;
  }

  const useAuth: () => AuthContextType;
  export default useAuth;
}
