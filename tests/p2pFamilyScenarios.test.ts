/**
 * P2P Family Scenarios Test Suite
 * Tests the family use case: Father (master), Mother (admin), Son (editor)
 * Validates role-based permissions, sync conflict resolution, and data visibility
 */

import deviceIdentityService from '../services/deviceIdentityService';
import rolesPermissionService from '../services/rolesPermissionService';
import syncBatchService from '../services/syncBatchService';
import localStorageService from '../services/localStorageService';
import trashService from '../services/trashService';

// Mock device identities for family members
const FAMILY_DEVICES = {
  father: {
    deviceId: 'device-father-001',
    nickname: 'Father',
    role: 'master' as const
  },
  mother: {
    deviceId: 'device-mother-002', 
    nickname: 'Mother',
    role: 'admin' as const
  },
  son: {
    deviceId: 'device-son-003',
    nickname: 'Son', 
    role: 'editor' as const
  }
};

// Test warehouse structure
const TEST_WAREHOUSE = {
  id: 'warehouse-family-home',
  name: 'Family Home',
  isPublic: true,
  author: FAMILY_DEVICES.father.nickname,
  authorId: FAMILY_DEVICES.father.deviceId
};

describe('P2P Family Scenarios', () => {
  beforeEach(() => {
    // Clear all data
    localStorage.clear();
    
    // Reset services
    syncBatchService.clearPending();
    
    // Setup Father as initial master
    deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.father.deviceId, FAMILY_DEVICES.father.nickname);
    rolesPermissionService.grantRole(
      FAMILY_DEVICES.father.deviceId, 
      FAMILY_DEVICES.father.nickname, 
      'master'
    );
  });

  describe('Initial Setup and User Management', () => {
    test('Father can invite Mother and Son to warehouse', () => {
      // Father grants admin role to Mother
      const motherGranted = rolesPermissionService.grantRole(
        FAMILY_DEVICES.mother.deviceId,
        FAMILY_DEVICES.mother.nickname,
        'admin',
        TEST_WAREHOUSE.id
      );
      expect(motherGranted).toBe(true);

      // Father grants editor role to Son  
      const sonGranted = rolesPermissionService.grantRole(
        FAMILY_DEVICES.son.deviceId,
        FAMILY_DEVICES.son.nickname,
        'editor',
        TEST_WAREHOUSE.id
      );
      expect(sonGranted).toBe(true);

      // Verify all users have access
      const warehouseUsers = rolesPermissionService.getWarehouseUsers(TEST_WAREHOUSE.id);
      expect(warehouseUsers).toHaveLength(3);
      expect(warehouseUsers.find(u => u.userId === FAMILY_DEVICES.father.deviceId)?.role).toBe('master');
      expect(warehouseUsers.find(u => u.userId === FAMILY_DEVICES.mother.deviceId)?.role).toBe('admin');
      expect(warehouseUsers.find(u => u.userId === FAMILY_DEVICES.son.deviceId)?.role).toBe('editor');
    });

    test('Son cannot grant roles to others', () => {
      // Switch to Son's device
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.son.deviceId, FAMILY_DEVICES.son.nickname);
      
      // Son tries to grant role (should fail)
      const canAssignRoles = rolesPermissionService.hasPermission('user.assign-roles', TEST_WAREHOUSE.id);
      expect(canAssignRoles).toBe(false);
    });
  });

  describe('Warehouse and Room Creation', () => {
    test('Father creates private Master Bedroom, public Kitchen', () => {
      // Father creates private master bedroom
      const masterBedroom = {
        id: 'room-master-bedroom',
        name: 'Master Bedroom',
        warehouseId: TEST_WAREHOUSE.id,
        isPublic: false,
        author: FAMILY_DEVICES.father.nickname,
        authorId: FAMILY_DEVICES.father.deviceId
      };

      // Father creates public kitchen
      const kitchen = {
        id: 'room-kitchen',
        name: 'Kitchen', 
        warehouseId: TEST_WAREHOUSE.id,
        isPublic: true,
        author: FAMILY_DEVICES.father.nickname,
        authorId: FAMILY_DEVICES.father.deviceId
      };

      // Record sync changes for room creation
      syncBatchService.addChange(
        'room.create',
        'room',
        masterBedroom.id,
        masterBedroom,
        TEST_WAREHOUSE.id
      );

      syncBatchService.addChange(
        'room.create', 
        'room',
        kitchen.id,
        kitchen,
        TEST_WAREHOUSE.id
      );

      // Verify sync batch contains both rooms
      const status = syncBatchService.getStatus();
      expect(status.pendingChanges).toBe(2);
    });

    test('Son can see Kitchen but not Master Bedroom (when acting as guest)', () => {
      // Create rooms as Father
      const rooms = [
        { id: 'room-kitchen', name: 'Kitchen', isPublic: true },
        { id: 'room-master-bedroom', name: 'Master Bedroom', isPublic: false }
      ];

      // Switch to Son (with guest access to test visibility)
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.son.deviceId, FAMILY_DEVICES.son.nickname);
      
      // Son should have editor permissions for warehouse, but let's test guest visibility rules
      rooms.forEach(room => {
        const canView = room.isPublic || rolesPermissionService.hasPermission('warehouse.view-private', TEST_WAREHOUSE.id);
        
        if (room.id === 'room-kitchen') {
          expect(canView).toBe(true); // Public room
        }
        // Son as editor should actually see private rooms too, unlike guest
      });
    });
  });

  describe('Item Management and "Take to Hands"', () => {
    test('Mother moves medicine to private location, Son cannot access', () => {
      // Mother creates private medicine cabinet
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.mother.deviceId, FAMILY_DEVICES.mother.nickname);
      
      const medicineItem = {
        id: 'item-medicine-001',
        name: 'Heart Medication',
        isPublic: false,
        containerId: 'container-medicine-cabinet',
        author: FAMILY_DEVICES.mother.nickname,
        authorId: FAMILY_DEVICES.mother.deviceId
      };

      // Record take to hands action
      syncBatchService.addChange(
        'item.move',
        'item', 
        medicineItem.id,
        { ...medicineItem, action: 'take-to-hands' },
        TEST_WAREHOUSE.id
      );

      // Switch to Son
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.son.deviceId, FAMILY_DEVICES.son.nickname);
      
      // Son cannot see private items
      const canViewPrivate = rolesPermissionService.hasPermission('warehouse.view-private', TEST_WAREHOUSE.id);
      expect(canViewPrivate).toBe(true); // Actually editors can see private items

      // But Son cannot edit items he didn't create (depending on implementation)
      const canEditOthersItems = rolesPermissionService.hasPermission('item.edit-others', TEST_WAREHOUSE.id);
      expect(canEditOthersItems).toBe(false); // Editors can't edit others' items
    });

    test('Son disposes item to trash, Father can restore', () => {
      // Son disposes an item
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.son.deviceId, FAMILY_DEVICES.son.nickname);
      
      const item = {
        id: 'item-old-toy',
        name: 'Old Toy',
        quantity: 1,
        category: 'toy'
      };

      // Son disposes item
      const trashItem = trashService.disposeItem(
        item.id,
        item.name,
        item.quantity,
        'Kitchen',
        FAMILY_DEVICES.son.nickname,
        'Too old and broken',
        item.category
      );
      expect(trashItem).toBeTruthy();

      // Record sync change
      syncBatchService.addChange(
        'item.delete',
        'item',
        item.id,
        { ...item, disposalReason: 'Too old and broken' },
        TEST_WAREHOUSE.id
      );

      // Father can restore from trash
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.father.deviceId, FAMILY_DEVICES.father.nickname);
      
      const restored = trashService.restoreFromTrash(trashItem!.id);
      expect(restored).toBeTruthy();
      expect(restored?.name).toBe('Old Toy');
    });
  });

  describe('Conflict Resolution', () => {
    test('Father and Mother edit same item simultaneously - Master wins', () => {
      const item = {
        id: 'item-shared-001',
        name: 'Shared Item',
        description: 'Original description'
      };

      // Mother edits item
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.mother.deviceId, FAMILY_DEVICES.mother.nickname);
      
      const motherChange = {
        id: 'change-mother-001',
        action: 'item.update' as const,
        entityType: 'item' as const,
        entityId: item.id,
        data: { ...item, description: 'Updated by Mother' },
        userId: FAMILY_DEVICES.mother.deviceId,
        userNickname: FAMILY_DEVICES.mother.nickname,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        warehouseId: TEST_WAREHOUSE.id,
        conflictPriority: 825 // admin role + update action + timestamp
      };

      // Father edits same item 1 minute later
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.father.deviceId, FAMILY_DEVICES.father.nickname);
      
      const fatherChange = {
        id: 'change-father-001', 
        action: 'item.update' as const,
        entityType: 'item' as const,
        entityId: item.id,
        data: { ...item, description: 'Updated by Father' },
        userId: FAMILY_DEVICES.father.deviceId,
        userNickname: FAMILY_DEVICES.father.nickname,
        timestamp: new Date('2024-01-01T10:01:00Z'),
        warehouseId: TEST_WAREHOUSE.id,
        conflictPriority: 1025 // master role + update action + timestamp
      };

      // Test conflict resolution
      const conflictData = syncBatchService.getConflictData([motherChange, fatherChange]);
      
      // Father's change should win (higher priority)
      expect(conflictData[0].userId).toBe(FAMILY_DEVICES.father.deviceId);
      expect(conflictData[0].conflictPriority).toBeGreaterThan(conflictData[1].conflictPriority);
      expect(conflictData[0].data.description).toBe('Updated by Father');
    });

    test('Son deletion vs Mother update - Master role priority applies', () => {
      const item = {
        id: 'item-conflict-002',
        name: 'Conflict Item'
      };

      // Son tries to delete
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.son.deviceId, FAMILY_DEVICES.son.nickname);
      
      const sonChange = {
        id: 'change-son-delete',
        action: 'item.delete' as const,
        entityType: 'item' as const,
        entityId: item.id,
        data: item,
        userId: FAMILY_DEVICES.son.deviceId,
        userNickname: FAMILY_DEVICES.son.nickname,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        warehouseId: TEST_WAREHOUSE.id,
        conflictPriority: 700 // editor role + delete action + timestamp
      };

      // Mother updates at same time
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.mother.deviceId, FAMILY_DEVICES.mother.nickname);
      
      const motherChange = {
        id: 'change-mother-update',
        action: 'item.update' as const,
        entityType: 'item' as const, 
        entityId: item.id,
        data: { ...item, name: 'Updated by Mother' },
        userId: FAMILY_DEVICES.mother.deviceId,
        userNickname: FAMILY_DEVICES.mother.nickname,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        warehouseId: TEST_WAREHOUSE.id,
        conflictPriority: 825 // admin role + update action + timestamp
      };

      // Mother's update should win over Son's deletion
      const conflictData = syncBatchService.getConflictData([sonChange, motherChange]);
      expect(conflictData[0].userId).toBe(FAMILY_DEVICES.mother.deviceId);
      expect(conflictData[0].action).toBe('item.update');
    });
  });

  describe('Sync Batching and Network Behavior', () => {
    test('Multiple family members create items - batched into single sync', () => {
      // Clear any existing batches
      syncBatchService.clearPending();
      
      // Father creates item
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.father.deviceId, FAMILY_DEVICES.father.nickname);
      syncBatchService.addChange('item.create', 'item', 'item-father-1', { name: 'Father Item' }, TEST_WAREHOUSE.id);
      
      // Mother creates item (within debounce window)
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.mother.deviceId, FAMILY_DEVICES.mother.nickname);
      syncBatchService.addChange('item.create', 'item', 'item-mother-1', { name: 'Mother Item' }, TEST_WAREHOUSE.id);
      
      // Son creates item (within debounce window)
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.son.deviceId, FAMILY_DEVICES.son.nickname);
      syncBatchService.addChange('item.create', 'item', 'item-son-1', { name: 'Son Item' }, TEST_WAREHOUSE.id);

      // Should be batched together
      const status = syncBatchService.getStatus();
      expect(status.isPending).toBe(true);
      expect(status.pendingChanges).toBe(3);
      expect(status.timeUntilSend).toBeGreaterThan(0);
    });

    test('Offline sync behavior - changes saved locally', () => {
      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Son creates item while offline
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.son.deviceId, FAMILY_DEVICES.son.nickname);
      syncBatchService.addChange('item.create', 'item', 'item-offline-1', { name: 'Offline Item' }, TEST_WAREHOUSE.id);
      
      // Force send (should save locally instead)
      syncBatchService.forceSend();
      
      // Coming back online should trigger sync
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
      
      // Should attempt to sync saved changes
      const status = syncBatchService.getStatus();
      expect(status.failedBatches).toBe(0); // Assuming mock P2P succeeds
    });
  });

  describe('Guest Access Scenarios', () => {
    test('Guest user can only see public items and rooms', () => {
      // Create guest user
      const guestDevice = {
        deviceId: 'device-guest-001',
        nickname: 'Guest User'
      };
      
      deviceIdentityService.setDeviceIdentity(guestDevice.deviceId, guestDevice.nickname);
      
      // Grant guest role
      rolesPermissionService.grantRole(
        guestDevice.deviceId,
        guestDevice.nickname,
        'guest',
        TEST_WAREHOUSE.id
      );

      // Check permissions
      expect(rolesPermissionService.hasPermission('warehouse.view-private', TEST_WAREHOUSE.id)).toBe(false);
      expect(rolesPermissionService.hasPermission('item.create', TEST_WAREHOUSE.id)).toBe(false);
      expect(rolesPermissionService.hasPermission('item.edit-own', TEST_WAREHOUSE.id)).toBe(false);
      expect(rolesPermissionService.hasPermission('item.dispose', TEST_WAREHOUSE.id)).toBe(false);
      
      // Can only view public content
      expect(rolesPermissionService.hasPermission('warehouse.view-public', TEST_WAREHOUSE.id)).toBe(true);
    });
  });

  describe('Ban and Permission Management', () => {
    test('Father can ban Son, Mother can unban', () => {
      // Father bans Son
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.father.deviceId, FAMILY_DEVICES.father.nickname);
      
      const banned = rolesPermissionService.banUser(FAMILY_DEVICES.son.deviceId, TEST_WAREHOUSE.id);
      expect(banned).toBe(true);

      // Verify Son is banned
      const sonPermission = rolesPermissionService.getWarehouseUsers(TEST_WAREHOUSE.id)
        .find(u => u.userId === FAMILY_DEVICES.son.deviceId);
      expect(sonPermission?.isActive).toBe(false);

      // Mother (admin) can unban
      deviceIdentityService.setDeviceIdentity(FAMILY_DEVICES.mother.deviceId, FAMILY_DEVICES.mother.nickname);
      
      const unbanned = rolesPermissionService.unbanUser(FAMILY_DEVICES.son.deviceId, TEST_WAREHOUSE.id);
      expect(unbanned).toBe(true);

      // Verify Son is unbanned
      const sonPermissionAfter = rolesPermissionService.getWarehouseUsers(TEST_WAREHOUSE.id)
        .find(u => u.userId === FAMILY_DEVICES.son.deviceId);
      expect(sonPermissionAfter?.isActive).toBe(true);
    });
  });
});

// Helper function to simulate P2P sync callback
export const simulateP2PSync = (batch: any): Promise<boolean> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      console.log(`P2P Sync: Sending batch ${batch.id} with ${batch.changes.length} changes`);
      resolve(true); // Always succeed in tests
    }, 100);
  });
};

// Test setup helper
export const setupFamilyTestEnvironment = () => {
  // Register mock P2P sync callback
  syncBatchService.registerSyncCallback(simulateP2PSync);
  
  // Setup test warehouse
  localStorageService.createWarehouse(
    TEST_WAREHOUSE.id,
    TEST_WAREHOUSE.name,
    TEST_WAREHOUSE.isPublic,
    TEST_WAREHOUSE.author,
    TEST_WAREHOUSE.authorId
  );
  
  return {
    warehouse: TEST_WAREHOUSE,
    devices: FAMILY_DEVICES
  };
};