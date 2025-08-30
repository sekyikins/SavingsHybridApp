import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export interface UsernameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  onUsernameUpdated: (newUsername: string) => void;
}

export function UsernameDialog({ isOpen, onClose, currentUsername, onUsernameUpdated }: UsernameDialogProps) {
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog is opened/closed
  useEffect(() => {
    if (isOpen) {
      setNewUsername('');
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  // Use a key to force remount when dialog opens/closes
  const dialogKey = isOpen ? 'open' : 'closed';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return; // Prevent multiple submissions
    
    if (!newUsername.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user email
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) {
        throw new Error('Could not get current user information');
      }
      
      // First verify the password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Incorrect password. Please try again.');
        } else {
          throw signInError;
        }
        return;
      }

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

      // Clear the form
      setNewUsername('');
      setPassword('');
      
      // Call the success handler which will show a toast
      onUsernameUpdated(newUsername);
      
      // Close the dialog after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating username:', err);
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div key={dialogKey} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Change Username</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Current username: <span className="font-medium">{currentUsername}</span>
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="newUsername" className="block text-sm font-medium text-gray-700 mb-1">
              New Username
            </label>
            <input
              id="newUsername"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new username"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Enter your password to confirm changes
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your account password"
              autoComplete="current-password"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              For security, please confirm your password to update your username.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || !newUsername.trim() || !password}
            >
              {isLoading ? 'Updating...' : 'Update Username'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
