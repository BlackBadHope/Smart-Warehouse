import React, { useState, useEffect } from 'react';
import { Users, Crown, Shield, Edit, Eye, UserX, Plus, X, AlertTriangle } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import rolesPermissionService, { UserRole, UserPermissionEntry, RoleDefinition } from '../services/rolesPermissionService';
import debugService from '../services/debugService';

interface UserManagementModalProps {
  show: boolean;
  onClose: () => void;
  warehouseId?: string;
  warehouseName?: string;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ 
  show, 
  onClose, 
  warehouseId, 
  warehouseName 
}) => {
  const [users, setUsers] = useState<UserPermissionEntry[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPermissionEntry | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserNickname, setNewUserNickname] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer');

  useEffect(() => {
    if (show) {
      loadData();
    }
  }, [show, warehouseId]);

  const loadData = () => {
    setRoles(rolesPermissionService.getAllRoles());
    if (warehouseId) {
      setUsers(rolesPermissionService.getWarehouseUsers(warehouseId));
    } else {
      setUsers(rolesPermissionService.getAllUsers());
    }
  };

  const handleGrantRole = () => {
    if (!selectedUser || !selectedRole) return;

    if (rolesPermissionService.grantRole(
      selectedUser.userId,
      selectedUser.userNickname,
      selectedRole,
      warehouseId
    )) {
      loadData();
      setShowRoleModal(false);
      setSelectedUser(null);
      debugService.action('UserManagementModal: Role granted via UI', {
        targetUser: selectedUser.userNickname,
        role: selectedRole,
        warehouseId
      });
    }
  };

  const handleRevokeRole = (user: UserPermissionEntry) => {
    if (rolesPermissionService.revokeRole(user.userId, warehouseId)) {
      loadData();
      debugService.action('UserManagementModal: Role revoked via UI', {
        targetUser: user.userNickname,
        warehouseId
      });
    }
  };

  const handleBanUser = (user: UserPermissionEntry) => {
    if (rolesPermissionService.banUser(user.userId, warehouseId)) {
      loadData();
      debugService.action('UserManagementModal: User banned via UI', {
        targetUser: user.userNickname,
        warehouseId
      });
    }
  };

  const handleUnbanUser = (user: UserPermissionEntry) => {
    if (rolesPermissionService.unbanUser(user.userId, warehouseId)) {
      loadData();
      debugService.action('UserManagementModal: User unbanned via UI', {
        targetUser: user.userNickname,
        warehouseId
      });
    }
  };

  const handleInviteUser = () => {
    if (!newUserId.trim() || !newUserNickname.trim()) return;

    if (rolesPermissionService.grantRole(
      newUserId.trim(),
      newUserNickname.trim(),
      selectedRole,
      warehouseId
    )) {
      loadData();
      setShowInviteModal(false);
      setNewUserId('');
      setNewUserNickname('');
      setSelectedRole('viewer');
      debugService.action('UserManagementModal: User invited via UI', {
        newUser: newUserNickname.trim(),
        role: selectedRole,
        warehouseId
      });
    }
  };

  const getRoleIcon = (roleName: UserRole) => {
    const role = roles.find(r => r.name === roleName);
    switch (role?.icon) {
      case 'Crown': return <Crown className="w-4 h-4" />;
      case 'Shield': return <Shield className="w-4 h-4" />;
      case 'Edit': return <Edit className="w-4 h-4" />;
      case 'Eye': return <Eye className="w-4 h-4" />;
      case 'Users': return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (roleName: UserRole): string => {
    const role = roles.find(r => r.name === roleName);
    return role?.color || 'text-gray-400';
  };

  const canManageUsers = rolesPermissionService.hasPermission('user.assign-roles', warehouseId);
  const canBanUsers = rolesPermissionService.hasPermission('user.ban', warehouseId);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-4xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <div className="flex items-center gap-3">
            <Users className={`w-6 h-6 ${ASCII_COLORS.accent}`} />
            <h2 className={`${ASCII_COLORS.accent} text-xl font-bold`}>
              User Management {warehouseName && `- ${warehouseName}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md hover:bg-red-700 border ${ASCII_COLORS.border}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        {canManageUsers && (
          <div className={`p-4 border-b ${ASCII_COLORS.border} flex justify-between items-center`}>
            <div className="text-sm text-gray-400">
              {warehouseId ? 'Manage users for this warehouse' : 'Manage all users across warehouses'}
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Invite User
            </button>
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4">
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users found</p>
              <p className="text-sm">
                {warehouseId ? 'No users have been granted access to this warehouse' : 'No user permissions configured'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map(user => (
                <div 
                  key={`${user.userId}-${user.warehouseId || 'global'}`} 
                  className={`p-4 border ${ASCII_COLORS.border} rounded-lg ${
                    user.isActive ? 'bg-gray-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20 border-red-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-medium ${user.isActive ? 'text-white' : 'text-red-400'}`}>
                          {user.userNickname}
                        </h3>
                        
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getRoleColor(user.role)} bg-opacity-20 border`}>
                          {getRoleIcon(user.role)}
                          {user.role.toUpperCase()}
                        </div>
                        
                        {!user.isActive && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 bg-red-900 bg-opacity-20 border border-red-600">
                            <UserX className="w-3 h-3" />
                            BANNED
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-400">
                        <div>Device ID: <span className="font-mono">{user.userId.slice(0, 12)}...</span></div>
                        <div>Granted: {user.grantedAt.toLocaleDateString()} by {user.grantedByNickname}</div>
                        {user.warehouseId && (
                          <div>Warehouse: {user.warehouseId.slice(0, 8)}...</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      {canManageUsers && user.role !== 'master' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRole(user.role);
                            setShowRoleModal(true);
                          }}
                          className={`${ASCII_COLORS.buttonBg} p-2 rounded border ${ASCII_COLORS.border} hover:bg-blue-700 text-blue-400`}
                          title="Change role"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      {canBanUsers && user.role !== 'master' && (
                        <>
                          {user.isActive ? (
                            <button
                              onClick={() => handleBanUser(user)}
                              className={`${ASCII_COLORS.buttonBg} p-2 rounded border ${ASCII_COLORS.border} hover:bg-red-700 text-red-400`}
                              title="Ban user"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnbanUser(user)}
                              className={`${ASCII_COLORS.buttonBg} p-2 rounded border ${ASCII_COLORS.border} hover:bg-green-700 text-green-400`}
                              title="Unban user"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                      
                      {canManageUsers && user.role !== 'master' && (
                        <button
                          onClick={() => handleRevokeRole(user)}
                          className={`${ASCII_COLORS.buttonBg} p-2 rounded border ${ASCII_COLORS.border} hover:bg-red-700 text-red-400`}
                          title="Remove access"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg w-full max-w-md border-2 ${ASCII_COLORS.border}`}>
              <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-4`}>Invite User</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Device ID</label>
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="Enter user's device ID..."
                    className={`w-full p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} font-mono`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Nickname</label>
                  <input
                    type="text"
                    value={newUserNickname}
                    onChange={(e) => setNewUserNickname(e.target.value)}
                    placeholder="Enter user's nickname..."
                    className={`w-full p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className={`w-full p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                  >
                    {roles.filter(r => r.name !== 'master').map(role => (
                      <option key={role.name} value={role.name}>
                        {role.displayName} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded border ${ASCII_COLORS.border} text-gray-300`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  disabled={!newUserId.trim() || !newUserNickname.trim()}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}
                >
                  Invite User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Role Modal */}
        {showRoleModal && selectedUser && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg w-full max-w-md border-2 ${ASCII_COLORS.border}`}>
              <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-4`}>
                Change Role for {selectedUser.userNickname}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className={`w-full p-3 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                  >
                    {roles.filter(r => r.name !== 'master').map(role => (
                      <option key={role.name} value={role.name}>
                        {role.displayName} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={`p-3 bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded text-yellow-300 text-sm`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      This will immediately change the user's permissions. 
                      They will be notified of the role change.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded border ${ASCII_COLORS.border} text-gray-300`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantRole}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
                >
                  Change Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementModal;