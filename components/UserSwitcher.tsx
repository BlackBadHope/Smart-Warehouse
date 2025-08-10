import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Heart, Eye } from 'lucide-react';
import userService from '../services/userService';
import { UserAccount, ROLE_DISPLAY_NAMES } from '../types/roles';
import { ASCII_COLORS } from '../constants';
import debugService from '../services/debugService';

interface UserSwitcherProps {
  onUserChange?: () => void;
}

export default function UserSwitcher({ onUserChange }: UserSwitcherProps) {
  const [currentUser, setCurrentUser] = useState(userService.getCurrentUser());
  const [allUsers, setAllUsers] = useState(userService.getAllUsers());
  const [isOpen, setIsOpen] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'family' | 'guest'>('family');

  useEffect(() => {
    // Check if needs initial setup
    if (userService.needsInitialSetup()) {
      const masterUser = userService.initializeFirstUser('Master');
      setCurrentUser(masterUser);
      setAllUsers([masterUser]);
    }
  }, []);

  const handleUserSwitch = (userId: string) => {
    if (userService.setCurrentUser(userId)) {
      const user = userService.getCurrentUser();
      setCurrentUser(user);
      setIsOpen(false);
      onUserChange?.();
      debugService.info('UserSwitcher: User switched successfully', { userId });
    }
  };

  const handleAddUser = () => {
    if (!newUserName.trim()) return;
    
    const newUser = userService.addUser(newUserName.trim(), newUserRole);
    if (newUser) {
      setAllUsers(userService.getAllUsers());
      setNewUserName('');
      setShowAddUser(false);
      debugService.info('UserSwitcher: New user created', { name: newUserName, role: newUserRole });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'master': return <Crown className={`w-4 h-4 ${ASCII_COLORS.accent}`} />;
      case 'family': return <Heart className="w-4 h-4 text-pink-400" />;
      case 'guest': return <Eye className="w-4 h-4 text-blue-400" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      {/* Current User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 ${ASCII_COLORS.buttonBg} border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.buttonHoverBg} focus:outline-none`}
        title="Switch User"
      >
        {getRoleIcon(currentUser.role)}
        <span className={`text-sm font-medium ${ASCII_COLORS.text} hidden sm:block`}>
          {currentUser.name}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute top-full mt-1 right-0 ${ASCII_COLORS.modalBg} border ${ASCII_COLORS.border} rounded-lg shadow-lg z-50 min-w-48`}>
          {/* User List */}
          <div className="py-1">
            {allUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSwitch(user.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${ASCII_COLORS.buttonHoverBg} focus:outline-none ${
                  user.id === currentUser.id ? `${ASCII_COLORS.accent} bg-yellow-600 bg-opacity-20` : `${ASCII_COLORS.text} hover:bg-gray-700`
                }`}
              >
                {getRoleIcon(user.role)}
                <div className="flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className={`text-xs ${ASCII_COLORS.text} opacity-70`}>
                    {ROLE_DISPLAY_NAMES[user.role]}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Add User Section */}
          {userService.canManageUsers() && (
            <>
              <div className={`border-t ${ASCII_COLORS.border}`}></div>
              {!showAddUser ? (
                <button
                  onClick={() => setShowAddUser(true)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${ASCII_COLORS.text} hover:bg-gray-700`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add User</span>
                </button>
              ) : (
                <div className="p-3">
                  <input
                    type="text"
                    placeholder="User name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className={`w-full p-2 mb-2 text-sm border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                    style={{ fontSize: '16px' }}
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'family' | 'guest')}
                    className={`w-full p-2 mb-2 text-sm border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                  >
                    <option value="family">Family Member</option>
                    <option value="guest">Guest</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddUser}
                      className={`flex-1 p-1 text-xs ${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} rounded`}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowAddUser(false); setNewUserName(''); }}
                      className={`flex-1 p-1 text-xs ${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} rounded`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}