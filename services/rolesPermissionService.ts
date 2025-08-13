import debugService from './debugService';
import deviceIdentityService from './deviceIdentityService';

// Роли и разрешения
export type UserRole = 'master' | 'admin' | 'editor' | 'viewer' | 'guest';

export type Permission = 
  // Warehouse permissions
  | 'warehouse.create' | 'warehouse.edit' | 'warehouse.delete' | 'warehouse.view'
  // Room permissions  
  | 'room.create' | 'room.edit' | 'room.delete' | 'room.view'
  // Container permissions
  | 'container.create' | 'container.edit' | 'container.delete' | 'container.view'
  // Item permissions
  | 'item.create' | 'item.edit' | 'item.delete' | 'item.view' | 'item.take'
  // User management permissions
  | 'user.invite' | 'user.ban' | 'user.assign-roles' | 'user.view-list'
  // System permissions
  | 'system.export' | 'system.import' | 'system.debug' | 'system.settings';

export interface RoleDefinition {
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  color: string; // CSS color for UI
  icon: string; // Lucide icon name
}

export interface UserPermissionEntry {
  userId: string; // Device ID
  userNickname: string;
  role: UserRole;
  grantedAt: Date;
  grantedBy: string; // Device ID who granted
  grantedByNickname: string;
  warehouseId?: string; // If permission is warehouse-specific
  isActive: boolean;
}

class RolesPermissionService {
  private static readonly PERMISSIONS_KEY = 'inventory-user-permissions';
  private static readonly CUSTOM_ROLES_KEY = 'inventory-custom-roles';
  
  // Базовые роли с матрицей разрешений
  private readonly DEFAULT_ROLES: RoleDefinition[] = [
    {
      name: 'master',
      displayName: 'Master',
      description: 'Full control over everything. Cannot be removed or modified.',
      color: 'text-red-400',
      icon: 'Crown',
      permissions: [
        'warehouse.create', 'warehouse.edit', 'warehouse.delete', 'warehouse.view',
        'room.create', 'room.edit', 'room.delete', 'room.view',
        'container.create', 'container.edit', 'container.delete', 'container.view',
        'item.create', 'item.edit', 'item.delete', 'item.view', 'item.take',
        'user.invite', 'user.ban', 'user.assign-roles', 'user.view-list',
        'system.export', 'system.import', 'system.debug', 'system.settings'
      ]
    },
    {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Can manage warehouse and users, but cannot access system settings.',
      color: 'text-orange-400',
      icon: 'Shield',
      permissions: [
        'warehouse.create', 'warehouse.edit', 'warehouse.view',
        'room.create', 'room.edit', 'room.delete', 'room.view',
        'container.create', 'container.edit', 'container.delete', 'container.view',
        'item.create', 'item.edit', 'item.delete', 'item.view', 'item.take',
        'user.invite', 'user.assign-roles', 'user.view-list',
        'system.export', 'system.import'
      ]
    },
    {
      name: 'editor',
      displayName: 'Editor',
      description: 'Can manage items and containers, but not warehouse structure.',
      color: 'text-blue-400',
      icon: 'Edit',
      permissions: [
        'warehouse.view',
        'room.view',
        'container.create', 'container.edit', 'container.view',
        'item.create', 'item.edit', 'item.delete', 'item.view', 'item.take',
        'user.view-list'
      ]
    },
    {
      name: 'viewer',
      displayName: 'Viewer',
      description: 'Can view everything and take items, but cannot modify structure.',
      color: 'text-green-400',
      icon: 'Eye',
      permissions: [
        'warehouse.view',
        'room.view',
        'container.view',
        'item.view', 'item.take',
        'user.view-list'
      ]
    },
    {
      name: 'guest',
      displayName: 'Guest',
      description: 'Can only view public items. Default role for new users.',
      color: 'text-gray-400',
      icon: 'User',
      permissions: [
        'warehouse.view', // Only public
        'room.view', // Only public
        'container.view', // Only public
        'item.view' // Only public
      ]
    }
  ];

  private userPermissions: UserPermissionEntry[] = [];
  private customRoles: RoleDefinition[] = [];

  constructor() {
    this.loadPermissions();
    this.loadCustomRoles();
  }

  private loadPermissions(): void {
    try {
      const permissionsStr = localStorage.getItem(RolesPermissionService.PERMISSIONS_KEY);
      if (permissionsStr) {
        const permissions = JSON.parse(permissionsStr);
        this.userPermissions = permissions.map((p: any) => ({
          ...p,
          grantedAt: new Date(p.grantedAt)
        }));
      }
      debugService.info('RolesPermissionService: Loaded permissions', { count: this.userPermissions.length });
    } catch (error) {
      debugService.error('RolesPermissionService: Failed to load permissions', error);
      this.userPermissions = [];
    }
  }

  private loadCustomRoles(): void {
    try {
      const rolesStr = localStorage.getItem(RolesPermissionService.CUSTOM_ROLES_KEY);
      if (rolesStr) {
        this.customRoles = JSON.parse(rolesStr);
      }
      debugService.info('RolesPermissionService: Loaded custom roles', { count: this.customRoles.length });
    } catch (error) {
      debugService.error('RolesPermissionService: Failed to load custom roles', error);
      this.customRoles = [];
    }
  }

  private savePermissions(): void {
    try {
      const permissions = this.userPermissions.map(p => ({
        ...p,
        grantedAt: p.grantedAt.toISOString()
      }));
      localStorage.setItem(RolesPermissionService.PERMISSIONS_KEY, JSON.stringify(permissions));
      debugService.info('RolesPermissionService: Saved permissions');
    } catch (error) {
      debugService.error('RolesPermissionService: Failed to save permissions', error);
    }
  }

  private saveCustomRoles(): void {
    try {
      localStorage.setItem(RolesPermissionService.CUSTOM_ROLES_KEY, JSON.stringify(this.customRoles));
      debugService.info('RolesPermissionService: Saved custom roles');
    } catch (error) {
      debugService.error('RolesPermissionService: Failed to save custom roles', error);
    }
  }

  // Public API
  getAllRoles(): RoleDefinition[] {
    return [...this.DEFAULT_ROLES, ...this.customRoles];
  }

  getRole(roleName: UserRole): RoleDefinition | undefined {
    return this.getAllRoles().find(r => r.name === roleName);
  }

  getCurrentUserRole(warehouseId?: string): UserRole {
    const deviceId = deviceIdentityService.getDeviceIdentity().deviceId;
    
    // Check if user is master of this warehouse (creator)
    if (this.isWarehouseMaster(deviceId, warehouseId)) {
      return 'master';
    }

    // Check assigned permissions
    const permission = this.userPermissions.find(p => 
      p.userId === deviceId && 
      p.isActive &&
      (!warehouseId || p.warehouseId === warehouseId)
    );

    return permission?.role || 'guest';
  }

  hasPermission(permission: Permission, warehouseId?: string): boolean {
    const userRole = this.getCurrentUserRole(warehouseId);
    const roleDefinition = this.getRole(userRole);
    
    if (!roleDefinition) {
      debugService.warn('RolesPermissionService: Unknown role', { userRole });
      return false;
    }

    return roleDefinition.permissions.includes(permission);
  }

  canViewPrivateContent(warehouseId?: string): boolean {
    const userRole = this.getCurrentUserRole(warehouseId);
    return userRole !== 'guest'; // Guests can only see public content
  }

  canEditObject(objectOwnerId: string, permission: Permission, warehouseId?: string): boolean {
    const deviceId = deviceIdentityService.getDeviceIdentity().deviceId;
    
    // Owner can always edit their own objects (unless it's a guest)
    if (objectOwnerId === deviceId && this.getCurrentUserRole(warehouseId) !== 'guest') {
      return true;
    }

    // Check role-based permission
    return this.hasPermission(permission, warehouseId);
  }

  grantRole(targetUserId: string, targetUserNickname: string, role: UserRole, warehouseId?: string): boolean {
    const granterDeviceId = deviceIdentityService.getDeviceIdentity().deviceId;
    const granterProfile = deviceIdentityService.getUserProfile();
    const granterRole = this.getCurrentUserRole(warehouseId);

    // Only masters and admins can grant roles
    if (!this.hasPermission('user.assign-roles', warehouseId)) {
      debugService.warn('RolesPermissionService: No permission to assign roles', { granterRole });
      return false;
    }

    // Cannot grant master role (only one master per warehouse)
    if (role === 'master') {
      debugService.warn('RolesPermissionService: Cannot grant master role');
      return false;
    }

    // Remove existing permission for this user/warehouse
    this.userPermissions = this.userPermissions.filter(p => 
      !(p.userId === targetUserId && p.warehouseId === warehouseId)
    );

    // Add new permission
    const newPermission: UserPermissionEntry = {
      userId: targetUserId,
      userNickname: targetUserNickname,
      role: role,
      grantedAt: new Date(),
      grantedBy: granterDeviceId,
      grantedByNickname: granterProfile?.nickname || 'Unknown',
      warehouseId: warehouseId,
      isActive: true
    };

    this.userPermissions.push(newPermission);
    this.savePermissions();

    debugService.action('RolesPermissionService: Role granted', {
      targetUser: targetUserNickname,
      role,
      grantedBy: granterProfile?.nickname,
      warehouseId
    });

    return true;
  }

  revokeRole(targetUserId: string, warehouseId?: string): boolean {
    const granterRole = this.getCurrentUserRole(warehouseId);

    if (!this.hasPermission('user.assign-roles', warehouseId)) {
      debugService.warn('RolesPermissionService: No permission to revoke roles', { granterRole });
      return false;
    }

    const removedCount = this.userPermissions.length;
    this.userPermissions = this.userPermissions.filter(p => 
      !(p.userId === targetUserId && p.warehouseId === warehouseId)
    );

    if (this.userPermissions.length < removedCount) {
      this.savePermissions();
      debugService.action('RolesPermissionService: Role revoked', { targetUserId, warehouseId });
      return true;
    }

    return false;
  }

  banUser(targetUserId: string, warehouseId?: string): boolean {
    if (!this.hasPermission('user.ban', warehouseId)) {
      return false;
    }

    // Set all permissions for this user/warehouse as inactive
    let banned = false;
    this.userPermissions.forEach(p => {
      if (p.userId === targetUserId && p.warehouseId === warehouseId) {
        p.isActive = false;
        banned = true;
      }
    });

    if (banned) {
      this.savePermissions();
      debugService.action('RolesPermissionService: User banned', { targetUserId, warehouseId });
    }

    return banned;
  }

  unbanUser(targetUserId: string, warehouseId?: string): boolean {
    if (!this.hasPermission('user.ban', warehouseId)) {
      return false;
    }

    let unbanned = false;
    this.userPermissions.forEach(p => {
      if (p.userId === targetUserId && p.warehouseId === warehouseId) {
        p.isActive = true;
        unbanned = true;
      }
    });

    if (unbanned) {
      this.savePermissions();
      debugService.action('RolesPermissionService: User unbanned', { targetUserId, warehouseId });
    }

    return unbanned;
  }

  getWarehouseUsers(warehouseId: string): UserPermissionEntry[] {
    return this.userPermissions.filter(p => p.warehouseId === warehouseId);
  }

  getAllUsers(): UserPermissionEntry[] {
    return [...this.userPermissions];
  }

  isWarehouseMaster(userId: string, warehouseId?: string): boolean {
    // For now, assume first creator is master
    // This should be enhanced to check warehouse ownerId field
    return false; // TODO: Implement warehouse ownership check
  }

  createCustomRole(name: string, displayName: string, description: string, permissions: Permission[]): boolean {
    if (!this.hasPermission('user.assign-roles')) {
      return false;
    }

    // Check if role name already exists
    if (this.getAllRoles().find(r => r.name === name as UserRole)) {
      debugService.warn('RolesPermissionService: Role name already exists', { name });
      return false;
    }

    const customRole: RoleDefinition = {
      name: name as UserRole,
      displayName,
      description,
      permissions,
      color: 'text-purple-400', // Default color for custom roles
      icon: 'Users' // Default icon for custom roles
    };

    this.customRoles.push(customRole);
    this.saveCustomRoles();

    debugService.action('RolesPermissionService: Custom role created', { name, displayName });
    return true;
  }

  deleteCustomRole(roleName: UserRole): boolean {
    if (!this.hasPermission('user.assign-roles')) {
      return false;
    }

    // Cannot delete default roles
    if (this.DEFAULT_ROLES.find(r => r.name === roleName)) {
      debugService.warn('RolesPermissionService: Cannot delete default role', { roleName });
      return false;
    }

    const initialLength = this.customRoles.length;
    this.customRoles = this.customRoles.filter(r => r.name !== roleName);

    if (this.customRoles.length < initialLength) {
      this.saveCustomRoles();
      
      // Remove all permissions using this role
      this.userPermissions = this.userPermissions.filter(p => p.role !== roleName);
      this.savePermissions();

      debugService.action('RolesPermissionService: Custom role deleted', { roleName });
      return true;
    }

    return false;
  }
}

const rolesPermissionService = new RolesPermissionService();
export default rolesPermissionService;