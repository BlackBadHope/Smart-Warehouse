import { AccessLevel, UserRole, UserPermission, WarehouseAccessControl, Warehouse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import debugService from './debugService';
import userService from './userService';

class AccessControlService {
  private currentUserId: string;

  constructor() {
    this.currentUserId = userService.getCurrentUser()?.id || 'anonymous';
  }

  // Create default access control for new warehouse
  createDefaultAccessControl(ownerId: string, isPublic: boolean = true): WarehouseAccessControl {
    const accessControl: WarehouseAccessControl = {
      accessLevel: isPublic ? 'public' : 'private',
      permissions: [
        {
          userId: ownerId,
          role: 'master',
          grantedAt: new Date(),
          grantedBy: ownerId
        }
      ],
      encryptionEnabled: !isPublic,
      inviteCode: isPublic ? undefined : this.generateInviteCode()
    };

    debugService.info('AccessControlService: Created access control', {
      ownerId,
      isPublic,
      encryptionEnabled: accessControl.encryptionEnabled
    });

    return accessControl;
  }

  // Generate secure invite code for private warehouses
  private generateInviteCode(): string {
    return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  }

  // Check if user has permission to perform action
  hasPermission(warehouse: Warehouse, action: string, userId?: string): boolean {
    const checkUserId = userId || this.currentUserId;
    
    // Owner always has full access
    if (warehouse.ownerId === checkUserId) {
      return true;
    }

    // Find user permission
    const userPermission = warehouse.accessControl.permissions.find(
      p => p.userId === checkUserId
    );

    if (!userPermission) {
      // For public warehouses, guests can view
      if (warehouse.accessControl.accessLevel === 'public' && action === 'view') {
        return true;
      }
      return false;
    }

    return this.roleHasPermission(userPermission.role, action);
  }

  private roleHasPermission(role: UserRole, action: string): boolean {
    const permissions = {
      master: ['view', 'edit', 'delete', 'invite', 'manage_permissions'],
      editor: ['view', 'edit'],
      viewer: ['view'],
      guest: ['view'] // Limited view only
    };

    return permissions[role]?.includes(action) || false;
  }

  // Grant permission to user
  grantPermission(
    warehouse: Warehouse, 
    userId: string, 
    role: UserRole,
    grantedBy?: string
  ): boolean {
    const granterUserId = grantedBy || this.currentUserId;
    
    // Check if granter has permission to grant
    if (!this.hasPermission(warehouse, 'manage_permissions', granterUserId)) {
      debugService.warn('AccessControlService: User cannot grant permissions', {
        granterUserId,
        warehouseId: warehouse.id
      });
      return false;
    }

    // Remove existing permission if any
    warehouse.accessControl.permissions = warehouse.accessControl.permissions.filter(
      p => p.userId !== userId
    );

    // Add new permission
    const permission: UserPermission = {
      userId,
      role,
      grantedAt: new Date(),
      grantedBy: granterUserId
    };

    warehouse.accessControl.permissions.push(permission);

    debugService.info('AccessControlService: Permission granted', {
      userId,
      role,
      warehouseId: warehouse.id,
      grantedBy: granterUserId
    });

    return true;
  }

  // Revoke permission from user
  revokePermission(warehouse: Warehouse, userId: string, revokedBy?: string): boolean {
    const revokerUserId = revokedBy || this.currentUserId;
    
    // Cannot revoke owner's permissions
    if (userId === warehouse.ownerId) {
      return false;
    }

    // Check if revoker has permission
    if (!this.hasPermission(warehouse, 'manage_permissions', revokerUserId)) {
      return false;
    }

    const initialLength = warehouse.accessControl.permissions.length;
    warehouse.accessControl.permissions = warehouse.accessControl.permissions.filter(
      p => p.userId !== userId
    );

    const success = warehouse.accessControl.permissions.length < initialLength;
    
    if (success) {
      debugService.info('AccessControlService: Permission revoked', {
        userId,
        warehouseId: warehouse.id,
        revokedBy: revokerUserId
      });
    }

    return success;
  }

  // Get user's role in warehouse
  getUserRole(warehouse: Warehouse, userId?: string): UserRole | null {
    const checkUserId = userId || this.currentUserId;
    
    if (warehouse.ownerId === checkUserId) {
      return 'master';
    }

    const permission = warehouse.accessControl.permissions.find(
      p => p.userId === checkUserId
    );

    if (permission) {
      return permission.role;
    }

    // For public warehouses, default to guest
    if (warehouse.accessControl.accessLevel === 'public') {
      return 'guest';
    }

    return null;
  }

  // Check if warehouse is accessible to user
  isWarehouseAccessible(warehouse: Warehouse, userId?: string): boolean {
    const checkUserId = userId || this.currentUserId;
    
    // Owner always has access
    if (warehouse.ownerId === checkUserId) {
      return true;
    }

    // Check if user has explicit permission
    const hasExplicitPermission = warehouse.accessControl.permissions.some(
      p => p.userId === checkUserId
    );

    if (hasExplicitPermission) {
      return true;
    }

    // Public warehouses are accessible to all
    return warehouse.accessControl.accessLevel === 'public';
  }

  // Filter warehouses based on user access
  filterAccessibleWarehouses(warehouses: Warehouse[], userId?: string): Warehouse[] {
    const checkUserId = userId || this.currentUserId;
    
    return warehouses.filter(warehouse => 
      this.isWarehouseAccessible(warehouse, checkUserId)
    );
  }

  // Change warehouse privacy level
  changeWarehousePrivacy(warehouse: Warehouse, newAccessLevel: AccessLevel): boolean {
    if (!this.hasPermission(warehouse, 'manage_permissions')) {
      return false;
    }

    const oldLevel = warehouse.accessControl.accessLevel;
    warehouse.accessControl.accessLevel = newAccessLevel;
    
    // Update encryption based on privacy level
    warehouse.accessControl.encryptionEnabled = newAccessLevel === 'private';
    
    // Generate invite code for private warehouses
    if (newAccessLevel === 'private' && !warehouse.accessControl.inviteCode) {
      warehouse.accessControl.inviteCode = this.generateInviteCode();
    }
    
    // Remove invite code for public warehouses
    if (newAccessLevel === 'public') {
      warehouse.accessControl.inviteCode = undefined;
    }

    debugService.info('AccessControlService: Warehouse privacy changed', {
      warehouseId: warehouse.id,
      oldLevel,
      newLevel: newAccessLevel
    });

    return true;
  }

  // Join private warehouse using invite code
  joinPrivateWarehouse(warehouse: Warehouse, inviteCode: string, userId?: string): boolean {
    const joiningUserId = userId || this.currentUserId;
    
    // Verify warehouse is private
    if (warehouse.accessControl.accessLevel !== 'private') {
      return false;
    }

    // Verify invite code
    if (warehouse.accessControl.inviteCode !== inviteCode) {
      debugService.warn('AccessControlService: Invalid invite code', {
        warehouseId: warehouse.id,
        userId: joiningUserId
      });
      return false;
    }

    // Check if user already has permission
    const existingPermission = warehouse.accessControl.permissions.find(
      p => p.userId === joiningUserId
    );

    if (existingPermission) {
      return true; // Already has access
    }

    // Add as guest by default
    const permission: UserPermission = {
      userId: joiningUserId,
      role: 'guest',
      grantedAt: new Date(),
      grantedBy: 'invite_code'
    };

    warehouse.accessControl.permissions.push(permission);

    debugService.info('AccessControlService: User joined private warehouse', {
      userId: joiningUserId,
      warehouseId: warehouse.id
    });

    return true;
  }

  // Regenerate invite code for private warehouse
  regenerateInviteCode(warehouse: Warehouse): string | null {
    if (!this.hasPermission(warehouse, 'manage_permissions')) {
      return null;
    }

    if (warehouse.accessControl.accessLevel !== 'private') {
      return null;
    }

    const newCode = this.generateInviteCode();
    warehouse.accessControl.inviteCode = newCode;

    debugService.info('AccessControlService: Invite code regenerated', {
      warehouseId: warehouse.id
    });

    return newCode;
  }

  // Get warehouse statistics for owner
  getWarehouseStats(warehouse: Warehouse): any {
    if (!this.hasPermission(warehouse, 'manage_permissions')) {
      return null;
    }

    const stats = {
      totalUsers: warehouse.accessControl.permissions.length,
      roleDistribution: {} as Record<UserRole, number>,
      accessLevel: warehouse.accessControl.accessLevel,
      encryptionEnabled: warehouse.accessControl.encryptionEnabled,
      inviteCode: warehouse.accessControl.inviteCode
    };

    // Count roles
    warehouse.accessControl.permissions.forEach(permission => {
      stats.roleDistribution[permission.role] = 
        (stats.roleDistribution[permission.role] || 0) + 1;
    });

    return stats;
  }

  // Bulk permission management
  bulkUpdatePermissions(
    warehouse: Warehouse, 
    updates: Array<{ userId: string; role: UserRole | null }>
  ): boolean {
    if (!this.hasPermission(warehouse, 'manage_permissions')) {
      return false;
    }

    updates.forEach(update => {
      if (update.role === null) {
        // Revoke permission
        this.revokePermission(warehouse, update.userId);
      } else {
        // Grant/update permission
        this.grantPermission(warehouse, update.userId, update.role);
      }
    });

    debugService.info('AccessControlService: Bulk permissions updated', {
      warehouseId: warehouse.id,
      updateCount: updates.length
    });

    return true;
  }

  // Set current user (when user changes)
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
  }

  // Check if action requires network permission
  requiresNetworkPermission(action: string): boolean {
    const networkActions = ['sync', 'invite', 'join', 'discover'];
    return networkActions.includes(action);
  }
}

// Singleton instance
const accessControlService = new AccessControlService();
export default accessControlService;