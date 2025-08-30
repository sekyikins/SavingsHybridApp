import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../config/supabase';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
  // Add any additional props needed for the component
}

export function DeleteAccountDialog({ isOpen, onClose, onAccountDeleted }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'warning' | 'confirmation' | 'deleting'>('warning');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (step === 'warning') {
      setStep('confirmation');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (confirmationText.toLowerCase() !== 'delete my account') {
      setError('Please type "delete my account" to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // Verify password first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) throw new Error('Could not verify your identity');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) throw signInError;

      // Delete user account
      const { error: deleteError } = await supabase.rpc('delete_user_account');
      
      if (deleteError) throw deleteError;

      // Sign out the user
      await supabase.auth.signOut();
      
      // Call the success handler
      onAccountDeleted();
      
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-600">
            {step === 'warning' ? 'Delete Account' : 'Confirm Deletion'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            disabled={isDeleting}
          >
            <X size={24} />
          </button>
        </div>

        {step === 'warning' ? (
          <div>
            <div className="flex items-start mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">This action cannot be undone</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Deleting your account will permanently remove all your data, including your savings history and settings. 
                  This action cannot be reversed.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('confirmation')}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                disabled={isDeleting}
              >
                I understand, continue
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                To confirm account deletion, please enter your password and type <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">delete my account</span> in the box below.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isDeleting}
                  />
                </div>

                <div>
                  <label htmlFor="confirmationText" className="block text-sm font-medium text-gray-700 mb-1">
                    Type "delete my account" to confirm
                  </label>
                  <input
                    id="confirmationText"
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="delete my account"
                    disabled={isDeleting}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 flex items-center"
                disabled={isDeleting || !password || confirmationText.toLowerCase() !== 'delete my account'}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete My Account'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
