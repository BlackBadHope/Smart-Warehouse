import { v4 as uuidv4 } from 'uuid';
import { Warehouse, Room, Shelf, ItemCore, Item, BucketItem, ShoppingListItem, InventorySummary, ItemLocationSummary, EntityType } from '../types';
import uiUpdateService from './uiUpdateService';
import userService from './userService';

const STORAGE_KEY = 'inventory-os-data';

interface LocalData {
  warehouses: Warehouse[];
  bucketItems: BucketItem[];
  shoppingList: ShoppingListItem[];
}

let localData: LocalData = {
  warehouses: [],
  bucketItems: [],
  shoppingList: []
};

// Load data from localStorage
export const initializeLocalStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      localData = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
};

// Save data to localStorage (debounced to reduce write pressure)
let saveTimer: number | null = null;
const saveToLocalStorage = () => {
  try {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    // @ts-expect-error setTimeout in browser returns number
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      } catch (error) {
        console.error('Error saving data to localStorage:', error);
      } finally {
        saveTimer = null;
      }
    }, 300);
  } catch (error) {
    console.error('Error scheduling save to localStorage:', error);
  }
};

// Initialize on module load
initializeLocalStorage();

// Test helper: reset all local data (not used in app runtime)
export const __resetLocalDataForTests = () => {
  localData = { warehouses: [], bucketItems: [], shoppingList: [] };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

// Utility functions
const findWarehouseById = (id: string): Warehouse | undefined => {
  return localData.warehouses.find(w => w.id === id);
};

const findRoomById = (warehouseId: string, roomId: string): Room | undefined => {
  const warehouse = findWarehouseById(warehouseId);
  return warehouse?.rooms?.find(r => r.id === roomId);
};

const findShelfById = (warehouseId: string, roomId: string, shelfId: string): Shelf | undefined => {
  const room = findRoomById(warehouseId, roomId);
  return room?.shelves?.find(s => s.id === shelfId);
};

const findItemById = (warehouseId: string, roomId: string, shelfId: string, itemId: string): Item | undefined => {
  const shelf = findShelfById(warehouseId, roomId, shelfId);
  return shelf?.items?.find(i => i.id === itemId);
};

// Warehouse operations
export const getWarehouses = (): Warehouse[] => {
  return localData.warehouses;
};

export const addWarehouse = (name: string): Warehouse => {
  const currentUserId = userService.getCurrentUser()?.id || 'default-user';
  
  const warehouse: Warehouse = {
    id: uuidv4(),
    name,
    createdAt: new Date(),
    rooms: [],
    // Required fields for chat/permissions
    ownerId: currentUserId,
    accessControl: {
      accessLevel: 'public' as const,
      permissions: [],
      encryptionEnabled: false
    },
    networkVisible: true,
    syncVersion: 1
  };
  localData.warehouses.push(warehouse);
  saveToLocalStorage();
  
  // Emit UI update event
  uiUpdateService.emit('warehouse-added', { warehouse }, 'localStorageService');
  
  return warehouse;
};

export const updateWarehouseName = (id: string, name: string): void => {
  const warehouse = findWarehouseById(id);
  if (warehouse) {
    warehouse.name = name;
    saveToLocalStorage();
    
    // Emit UI update event
    uiUpdateService.emit('warehouse-updated', { warehouse }, 'localStorageService');
  }
};

export const deleteWarehouse = (id: string): void => {
  const warehouse = findWarehouseById(id);
  localData.warehouses = localData.warehouses.filter(w => w.id !== id);
  saveToLocalStorage();
  
  // Emit UI update event
  uiUpdateService.emit('warehouse-deleted', { warehouseId: id, warehouse }, 'localStorageService');
};

// Room operations
export const getRooms = (warehouseId: string): Room[] => {
  const warehouse = findWarehouseById(warehouseId);
  return warehouse?.rooms || [];
};

export const addRoom = (warehouseId: string, name: string): Room => {
  const warehouse = findWarehouseById(warehouseId);
  if (!warehouse) throw new Error('Warehouse not found');

  const room: Room = {
    id: uuidv4(),
    name,
    createdAt: new Date(),
    shelves: []
  };
  
  if (!warehouse.rooms) warehouse.rooms = [];
  warehouse.rooms.push(room);
  saveToLocalStorage();
  
  // Emit UI update event
  uiUpdateService.emit('room-added', { room, warehouseId }, 'localStorageService');
  
  return room;
};

export const updateRoomName = (warehouseId: string, roomId: string, name: string): void => {
  const room = findRoomById(warehouseId, roomId);
  if (room) {
    room.name = name;
    saveToLocalStorage();
  }
};

export const deleteRoom = (warehouseId: string, roomId: string): void => {
  const warehouse = findWarehouseById(warehouseId);
  if (warehouse?.rooms) {
    warehouse.rooms = warehouse.rooms.filter(r => r.id !== roomId);
    saveToLocalStorage();
  }
};

// Shelf operations
export const getShelves = (warehouseId: string, roomId: string): Shelf[] => {
  const room = findRoomById(warehouseId, roomId);
  return room?.shelves || [];
};

export const addShelf = (warehouseId: string, roomId: string, name: string): Shelf => {
  const room = findRoomById(warehouseId, roomId);
  if (!room) throw new Error('Room not found');

  const shelf: Shelf = {
    id: uuidv4(),
    name,
    createdAt: new Date(),
    items: []
  };
  
  if (!room.shelves) room.shelves = [];
  room.shelves.push(shelf);
  saveToLocalStorage();
  
  // Emit UI update event
  uiUpdateService.emit('shelf-added', { shelf, warehouseId, roomId }, 'localStorageService');
  
  return shelf;
};

export const updateShelfName = (warehouseId: string, roomId: string, shelfId: string, name: string): void => {
  const shelf = findShelfById(warehouseId, roomId, shelfId);
  if (shelf) {
    shelf.name = name;
    saveToLocalStorage();
  }
};

export const deleteShelf = (warehouseId: string, roomId: string, shelfId: string): void => {
  const room = findRoomById(warehouseId, roomId);
  if (room?.shelves) {
    room.shelves = room.shelves.filter(s => s.id !== shelfId);
    saveToLocalStorage();
  }
};

export const moveShelf = (warehouseId: string, oldRoomId: string, shelfId: string, newRoomId: string): void => {
  const oldRoom = findRoomById(warehouseId, oldRoomId);
  const newRoom = findRoomById(warehouseId, newRoomId);
  
  if (!oldRoom || !newRoom) throw new Error('Room not found');
  
  const shelfIndex = oldRoom.shelves?.findIndex(s => s.id === shelfId) ?? -1;
  if (shelfIndex === -1) throw new Error('Shelf not found');
  
  const shelf = oldRoom.shelves![shelfIndex];
  oldRoom.shelves!.splice(shelfIndex, 1);
  
  if (!newRoom.shelves) newRoom.shelves = [];
  newRoom.shelves.push(shelf);
  
  saveToLocalStorage();
};

// Item operations
export const getItems = (warehouseId: string, roomId: string, shelfId: string): Item[] => {
  const shelf = findShelfById(warehouseId, roomId, shelfId);
  return shelf?.items || [];
};

export const addItem = (warehouseId: string, roomId: string, shelfId: string, itemData: ItemCore): Item => {
  const shelf = findShelfById(warehouseId, roomId, shelfId);
  if (!shelf) throw new Error('Shelf not found');

  const item: Item = {
    ...itemData,
    id: uuidv4(),
    createdAt: new Date()
  };
  
  if (!shelf.items) shelf.items = [];
  shelf.items.push(item);
  saveToLocalStorage();
  
  // Emit UI update event
  uiUpdateService.emit('item-added', { item, warehouseId, roomId, shelfId }, 'localStorageService');
  
  return item;
};

export const updateItem = (warehouseId: string, roomId: string, shelfId: string, itemId: string, itemData: Partial<ItemCore>): void => {
  const item = findItemById(warehouseId, roomId, shelfId, itemId);
  if (item) {
    Object.assign(item, itemData);
    saveToLocalStorage();
    
    // Emit UI update event
    uiUpdateService.emit('item-updated', { item, warehouseId, roomId, shelfId, itemId }, 'localStorageService');
  }
};

export const deleteItem = (warehouseId: string, roomId: string, shelfId: string, itemId: string): void => {
  const shelf = findShelfById(warehouseId, roomId, shelfId);
  if (shelf?.items) {
    const item = shelf.items.find(i => i.id === itemId);
    shelf.items = shelf.items.filter(i => i.id !== itemId);
    saveToLocalStorage();
    
    // Emit UI update event
    uiUpdateService.emit('item-deleted', { item, warehouseId, roomId, shelfId, itemId }, 'localStorageService');
  }
};

export const updateItemQuantity = (warehouseId: string, roomId: string, shelfId: string, itemId: string, quantity: number): void => {
  const item = findItemById(warehouseId, roomId, shelfId, itemId);
  if (item) {
    item.quantity = Math.max(0, quantity);
    saveToLocalStorage();
  }
};

// Bucket operations
export const getBucketItems = (): BucketItem[] => {
  return localData.bucketItems;
};

export const addItemToBucket = (item: Item, originalPath: string): BucketItem => {
  const bucketItem: BucketItem = {
    ...item,
    originalPath,
    isReadyToTransfer: false
  };
  
  localData.bucketItems.push(bucketItem);
  saveToLocalStorage();
  
  // Emit UI update event
  uiUpdateService.emit('bucket-updated', { action: 'item-added', bucketItem }, 'localStorageService');
  
  return bucketItem;
};

export const updateBucketItem = (itemId: string, data: Partial<BucketItem>): void => {
  const item = localData.bucketItems.find(i => i.id === itemId);
  if (item) {
    Object.assign(item, data);
    saveToLocalStorage();
    
    // Emit UI update event
    uiUpdateService.emit('bucket-updated', { action: 'item-updated', bucketItem: item }, 'localStorageService');
  }
};

export const removeBucketItem = (itemId: string): void => {
  console.log('🗑️ Before remove - bucket items count:', localData.bucketItems.length);
  console.log('🎯 Removing item with ID:', itemId);
  console.log('📋 Current bucket items:', localData.bucketItems.map(i => ({ id: i.id, name: i.name })));
  
  if (!itemId || itemId === 'undefined') {
    console.error('❌ Cannot remove item: invalid ID:', itemId);
    return;
  }
  
  const itemsBefore = localData.bucketItems.length;
  localData.bucketItems = localData.bucketItems.filter(i => i.id !== itemId);
  const itemsAfter = localData.bucketItems.length;
  
  console.log('✅ After remove - bucket items count:', itemsAfter);
  console.log('📋 Remaining items:', localData.bucketItems.map(i => ({ id: i.id, name: i.name })));
  console.log('🔢 Removed items count:', itemsBefore - itemsAfter);
  
  if (itemsBefore === itemsAfter) {
    console.warn('⚠️ No items were removed - ID not found:', itemId);
  } else {
    // Emit UI update event only if item was actually removed
    uiUpdateService.emit('bucket-updated', { action: 'item-removed', itemId }, 'localStorageService');
  }
  
  saveToLocalStorage();
};

export const transferBucketItem = (bucketItem: BucketItem): void => {
  if (!bucketItem.destination) throw new Error('Destination not set');
  
  const { warehouseId, roomId, shelfId } = bucketItem.destination;
  const { id, originalPath, destination, isReadyToTransfer, ...itemData } = bucketItem;
  
  // These functions will emit their own events
  addItem(warehouseId, roomId, shelfId, itemData as ItemCore);
  removeBucketItem(bucketItem.id);
  
  // Emit specific transfer event
  uiUpdateService.emit('item-moved', { 
    bucketItem, 
    destination: bucketItem.destination,
    action: 'transfer-completed' 
  }, 'localStorageService');
};

// Shopping list operations
export const getShoppingList = (): ShoppingListItem[] => {
  return localData.shoppingList;
};

export const addToShoppingList = (items: string[]): void => {
  items.forEach(itemName => {
    const item: ShoppingListItem = {
      id: uuidv4(),
      name: itemName,
      addedAt: new Date()
    };
    localData.shoppingList.push(item);
  });
  saveToLocalStorage();
};

// Search and summary operations
export const findItemsByName = (itemName: string): Array<{ path: string; quantity: number; name: string; id: string; unit?: string; expiryDate?: string }> => {
  const results: Array<{ path: string; quantity: number; name: string; id: string; unit?: string; expiryDate?: string }> = [];
  
  localData.warehouses.forEach(warehouse => {
    warehouse.rooms?.forEach(room => {
      room.shelves?.forEach(shelf => {
        shelf.items?.forEach(item => {
          if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
            results.push({
              id: item.id,
              path: `${warehouse.name} > ${room.name} > ${shelf.name}`,
              quantity: item.quantity,
              name: item.name,
              unit: item.unit,
              expiryDate: item.expiryDate
            });
          }
        });
      });
    });
  });
  
  return results;
};

export const getExpiringItems = (daysUntilExpiry: number = 7): ItemLocationSummary[] => {
  const results: ItemLocationSummary[] = [];
  const today = new Date();
  const limitDate = new Date(today.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  
  localData.warehouses.forEach(warehouse => {
    warehouse.rooms?.forEach(room => {
      room.shelves?.forEach(shelf => {
        shelf.items?.forEach(item => {
          if (item.expiryDate) {
            const expiryDate = new Date(item.expiryDate);
            if (expiryDate >= today && expiryDate <= limitDate) {
              results.push({
                path: `${warehouse.name} > ${room.name} > ${shelf.name}`,
                itemName: item.name,
                quantity: item.quantity,
                unit: item.unit,
                expiryDate: item.expiryDate
              });
            }
          }
        });
      });
    });
  });
  
  return results;
};

export const getInventorySummary = (): InventorySummary => {
  let totalRooms = 0;
  let totalShelves = 0;
  let totalItems = 0;
  const itemsSample: ItemLocationSummary[] = [];
  
  localData.warehouses.forEach(warehouse => {
    totalRooms += warehouse.rooms?.length || 0;
    warehouse.rooms?.forEach(room => {
      totalShelves += room.shelves?.length || 0;
      room.shelves?.forEach(shelf => {
        totalItems += shelf.items?.length || 0;
        shelf.items?.slice(0, 2).forEach(item => {
          if (itemsSample.length < 20) {
            itemsSample.push({
              path: `${warehouse.name} > ${room.name} > ${shelf.name}`,
              itemName: item.name,
              quantity: item.quantity,
              unit: item.unit,
              expiryDate: item.expiryDate
            });
          }
        });
      });
    });
  });
  
  return {
    totalWarehouses: localData.warehouses.length,
    totalRooms,
    totalShelves,
    totalItems,
    items: itemsSample,
    expiringSoon: getExpiringItems(7)
  };
};

// Entity finding functions
export const findEntityByNameAndType = (
  entityName: string,
  entityType: EntityType,
  parentWarehouseName?: string,
  parentRoomName?: string
): { id: string; name: string } | null => {
  if (entityType === 'warehouse') {
    const warehouse = localData.warehouses.find(w => w.name === entityName);
    return warehouse ? { id: warehouse.id, name: warehouse.name } : null;
  }
  
  if (entityType === 'room' && parentWarehouseName) {
    const warehouse = localData.warehouses.find(w => w.name === parentWarehouseName);
    if (!warehouse?.rooms) return null;
    const room = warehouse.rooms.find(r => r.name === entityName);
    return room ? { id: room.id, name: room.name } : null;
  }
  
  if (entityType === 'shelf' && parentWarehouseName && parentRoomName) {
    const warehouse = localData.warehouses.find(w => w.name === parentWarehouseName);
    if (!warehouse?.rooms) return null;
    const room = warehouse.rooms.find(r => r.name === parentRoomName);
    if (!room?.shelves) return null;
    const shelf = room.shelves.find(s => s.name === entityName);
    return shelf ? { id: shelf.id, name: shelf.name } : null;
  }
  
  return null;
};

// Export all data for backup/sharing
export const exportData = () => {
  try {
    return {
      warehouses: localData.warehouses,
      bucketItems: localData.bucketItems,
      shoppingList: localData.shoppingList,
      exportedAt: new Date().toISOString(),
      version: '2.6.0'
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return {
      warehouses: [],
      bucketItems: [],
      shoppingList: [],
      exportedAt: new Date().toISOString(),
      version: '2.6.0'
    };
  }
};

// Import data from backup
export const importData = (importedData: any, options = { conflictResolution: 'new-ids' }) => {
  try {
    if (importedData.warehouses) {
      if (options.conflictResolution === 'overwrite') {
        localData.warehouses = importedData.warehouses;
      } else {
        // Generate new IDs to avoid conflicts
        const processedWarehouses = importedData.warehouses.map((warehouse: any) => ({
          ...warehouse,
          id: uuidv4(),
          rooms: warehouse.rooms?.map((room: any) => ({
            ...room,
            id: uuidv4(),
            shelves: room.shelves?.map((shelf: any) => ({
              ...shelf,
              id: uuidv4(),
              items: shelf.items?.map((item: any) => ({
                ...item,
                id: uuidv4()
              })) || []
            })) || []
          })) || []
        }));
        localData.warehouses.push(...processedWarehouses);
      }
    }
    
    if (importedData.bucketItems && options.conflictResolution !== 'skip-bucket') {
      const processedBucketItems = importedData.bucketItems.map((item: any) => ({
        ...item,
        id: uuidv4()
      }));
      localData.bucketItems.push(...processedBucketItems);
    }
    
    saveToLocalStorage();
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};

// Reset all data for testing purposes
export const resetAllData = () => {
  try {
    localData = {
      warehouses: [],
      bucketItems: [],
      shoppingList: []
    };
    localStorage.removeItem(STORAGE_KEY);
    
    // Emit UI update events through new system
    uiUpdateService.emitBatch([
      { type: 'warehouse-deleted', data: { action: 'reset-all' } },
      { type: 'bucket-updated', data: { action: 'reset-all' } },
      { type: 'data-imported', data: { action: 'reset-all', timestamp: new Date().toISOString() } }
    ], 'resetAllData');
    
    // Keep legacy events for backward compatibility
    window.dispatchEvent(new CustomEvent('dataReset', { detail: { timestamp: new Date().toISOString() } }));
    window.dispatchEvent(new CustomEvent('warehouseUpdated', { detail: { action: 'reset' } }));
    
    return true;
  } catch (error) {
    console.error('Error resetting data:', error);
    return false;
  }
};

// Backup data before tests
export const createTestBackup = () => {
  try {
    const currentData = exportData();
    const backupKey = `test-backup-${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(currentData));
    return backupKey;
  } catch (error) {
    console.error('Error creating test backup:', error);
    return null;
  }
};

// Restore data after tests
export const restoreTestBackup = (backupKey: string) => {
  try {
    const backupData = localStorage.getItem(backupKey);
    if (backupData) {
      const parsedData = JSON.parse(backupData);
      localData = {
        warehouses: parsedData.warehouses || [],
        bucketItems: parsedData.bucketItems || [],
        shoppingList: parsedData.shoppingList || []
      };
      saveToLocalStorage();
      localStorage.removeItem(backupKey); // Clean up backup
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('warehouseUpdated', { detail: { action: 'restore' } }));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error restoring test backup:', error);
    return false;
  }
};