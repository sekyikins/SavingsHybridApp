import { useState } from 'react';
import { X } from 'lucide-react';
import { UsernameDialog } from './UsernameDialog';
import { EmailDialog } from './EmailDialog';
import { PasswordDialog } from './PasswordDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';

type SettingsOption = 'main' | 'username' | 'email' | 'password' | 'delete';

interface UserData {
  email: string;
  username: string;
}

interface UserSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserData;
  onUsernameUpdated: () => void;
  onEmailUpdated: () => void;
  onPasswordReset: () => void;
  onDeleteAccount: () => void;
}

export function UserSettingsDialog({
  isOpen,
  onClose,
  userData,
  onUsernameUpdated,
  onEmailUpdated,
  onPasswordReset,
  onDeleteAccount,
}: UserSettingsDialogProps) {
  const [currentView, setCurrentView] = useState<SettingsOption>('main');
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleViewChange = (view: SettingsOption) => {
    if (view === 'username') {
      setIsUsernameDialogOpen(true);
    } else if (view === 'email') {
      setIsEmailDialogOpen(true);
    } else if (view === 'password') {
      setIsPasswordDialogOpen(true);
    } else if (view === 'delete') {
      setIsDeleteDialogOpen(true);
    } else {
      setCurrentView(view);
    }
  };

  const handleClose = () => {
    setCurrentView('main');
    setIsUsernameDialogOpen(false);
    setIsPasswordDialogOpen(false);
    setIsDeleteDialogOpen(false);
    onClose();
  };
  
  const handleUsernameDialogClose = () => {
    setIsUsernameDialogOpen(false);
    setCurrentView('main');
  };
  
  const handlePasswordDialogClose = () => {
    setIsPasswordDialogOpen(false);
    setCurrentView('main');
  };
  
  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setCurrentView('main');
  };

  if (!isOpen) return null;

  const { email, username } = userData;

  const renderMainView = () => (
    <div className="space-y-4">
      <button
        onClick={() => handleViewChange('username')}
        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex justify-between items-center"
      >
        <div>
          <p className="font-medium">Username</p>
          <p className="text-sm text-gray-500">{username || 'Not set'}</p>
        </div>
        <span className="text-gray-400">→</span>
      </button>
      
      <button
        onClick={() => handleViewChange('password')}
        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        Change Password
      </button>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleViewChange('delete')}
          className="w-full text-left p-3 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );

  // const renderBackButton = () => (
  //   <button
  //     type="button"
  //     onClick={() => setCurrentView('main')}
  //     className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
  //   >
  //     ← Back to settings
  //   </button>
  // );

  const renderMainContent = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
      <p className="text-sm text-gray-500 mb-4">
        Manage your account information and security settings
      </p>
      {renderMainView()}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
        <div className="bg-white rounded-xl p-6 w-full max-w-md relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            disabled={isUsernameDialogOpen || isEmailDialogOpen || isPasswordDialogOpen || isDeleteDialogOpen}
          >
            <X size={20} />
          </button>

          <div className="mt-2">
            {renderMainContent()}
            {currentView !== 'main' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mt-4">
                <p className="text-yellow-800">
                  This feature is not fully implemented yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Child Dialogs */}
      <UsernameDialog
        isOpen={isUsernameDialogOpen}
        onClose={handleUsernameDialogClose}
        currentUsername={username || ''}
        onUsernameUpdated={() => {
          onUsernameUpdated();
          handleUsernameDialogClose();
        }}
      />

      <EmailDialog
        isOpen={isEmailDialogOpen}
        onClose={handleUsernameDialogClose}
        currentEmail={email || ''}
        onEmailUpdated={() => {
          onEmailUpdated();
          handleUsernameDialogClose();
        }}
      />

      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={handlePasswordDialogClose}
        onPasswordReset={() => {
          onPasswordReset();
          handlePasswordDialogClose();
        }}
      />

      <DeleteAccountDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onAccountDeleted={() => {
          onDeleteAccount();
          handleDeleteDialogClose();
        }}
      />
    </>
  );
}