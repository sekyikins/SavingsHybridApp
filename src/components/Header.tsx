import { useState, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UsernameDialog } from './UsernameDialog';
import { UserSettingsDialog } from './UserSettingsDialog';
import { EmailDialog } from './EmailDialog';
import { PasswordDialog } from './PasswordDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { supabase } from '../config/supabase';

interface HeaderProps {
  onOpenSettings?: () => void;
}

interface UserData {
  username: string;
  email: string;
}

export function Header({ onOpenSettings }: HeaderProps): JSX.Element {
  const { user, signOut } = useAuth();
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  const username = user?.user_metadata?.username || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const email = user?.email || (user as any)?.user_metadata?.email || '';

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Failed to sign out', 'error');
    }
  };

  const handleUsernameUpdated = async (newUsername: string) => {
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Update the username in the database
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          { 
            user_id: user.id, 
            username: newUsername 
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false
          }
        )
        .eq('user_id', user.id);

      if (error) throw error;

      // Update auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { username: newUsername }
      });

      if (updateError) throw updateError;

      showToast('Username updated successfully');
      setIsSettingsDialogOpen(false); // Close the settings dialog on success
    } catch (error) {
      console.error('Error updating username:', error);
      showToast('Failed to update username', 'error');
    }
  };

  const handleEmailUpdated = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;
      showToast('Verification email sent to your new email address');
    } catch (error) {
      console.error('Error updating email:', error);
      showToast('Failed to update email', 'error');
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!user?.email) throw new Error('No email found');
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      showToast('Password reset email sent');
      setIsSettingsDialogOpen(false); // Close the settings dialog on success
    } catch (error) {
      console.error('Error sending password reset:', error);
      showToast('Failed to send password reset email', 'error');
    }
  };

  const handleAccountDeleted = async () => {
    try {
      await signOut();
      showToast('Your account has been deleted');
    } catch (error) {
      console.error('Error during account deletion:', error);
      showToast('Error during account deletion', 'error');
    }
  };

  const userData: UserData = { username, email };

  return (
    <>
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 px-4 py-3 mb-3 sm:mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Daily Savings Tracker</h1>
            <p className="text-xs text-gray-600">
              Track your daily savings and build better financial habits😉
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-left hidden sm:block">
              <button 
                onClick={() => setIsSettingsDialogOpen(true)}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 hover:underline focus:outline-none transition-colors group"
                title="Account settings"
              >
                {username ? `Hello, ${username}!` : 'Signed in'}
                <span className="ml-1 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">▼</span>
              </button>
              {email && (
                <p className="text-xs text-gray-500 truncate max-w-[160px]">
                  {email}
                </p>
              )}
            </div>

            <div className="sm:hidden">
              <button 
                onClick={() => setIsSettingsDialogOpen(true)}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 hover:underline focus:outline-none transition-colors group"
                title="Account settings"
              >
                {username || 'Account'}
                <span className="ml-1 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">▼</span>
              </button>
            </div>

            {/* Settings Button - Always visible */}
            <button
              onClick={onOpenSettings}
              className="text-sm bg-blue-100 hover:bg-blue-200 p-2 rounded-md transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={handleSignOut}
              className="bg-gray-100 hover:bg-gray-200 p-2 rounded-md transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Dialogs */}
      <UserSettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
        userData={userData}
        onUsernameUpdated={() => {
          setIsSettingsDialogOpen(false);
          setIsUsernameDialogOpen(true);
        }}
        onEmailUpdated={() => {
          setIsSettingsDialogOpen(false);
          setIsEmailDialogOpen(true);
        }}
        onPasswordReset={() => {
          setIsSettingsDialogOpen(false);
          setIsPasswordDialogOpen(true);
        }}
        onDeleteAccount={() => {
          setIsSettingsDialogOpen(false);
          setIsDeleteDialogOpen(true);
        }}
      />

      <UsernameDialog
        isOpen={isUsernameDialogOpen}
        onClose={() => setIsUsernameDialogOpen(false)}
        currentUsername={username}
        onUsernameUpdated={handleUsernameUpdated}
      />

      <EmailDialog
        isOpen={isEmailDialogOpen}
        onClose={() => setIsEmailDialogOpen(false)}
        currentEmail={email}
        onEmailUpdated={handleEmailUpdated}
      />

      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        onPasswordReset={handlePasswordReset}
      />

      <DeleteAccountDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onAccountDeleted={handleAccountDeleted}
      />
    </>
  );
}
