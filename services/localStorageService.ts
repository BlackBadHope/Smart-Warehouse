import { v4 as uuidv4 } from 'uuid';
import { Warehouse, Room, Shelf, ItemCore, Item, BucketItem, ShoppingListItem, InventorySummary, ItemLocationSummary, EntityType } from '../types';

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

// Save data to localStorage
const saveToLocalStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
  }
};

// Initialize on module load
initializeLocalStorage();

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
  const warehouse: Warehouse = {
    id: uuidv4(),
    name,
    createdAt: new Date(),
    rooms: []
  };
  localData.warehouses.push(warehouse);
  saveToLocalStorage();
  return warehouse;
};

export const updateWarehouseName = (id: string, name: string): void => {
  const warehouse = findWarehouseById(id);
  if (warehouse) {
    warehouse.name = name;
    saveToLocalStorage();
  }
};

export const deleteWarehouse = (id: string): void => {
  localData.warehouses = localData.warehouses.filter(w => w.id !== id);
  saveToLocalStorage();
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
  return item;
};

export const updateItem = (warehouseId: string, roomId: string, shelfId: string, itemId: string, itemData: Partial<ItemCore>): void => {
  const item = findItemById(warehouseId, roomId, shelfId, itemId);
  if (item) {
    Object.assign(item, itemData);
    saveToLocalStorage();
  }
};

export const deleteItem = (warehouseId: string, roomId: string, shelfId: string, itemId: string): void => {
  const shelf = findShelfById(warehouseId, roomId, shelfId);
  if (shelf?.items) {
    shelf.items = shelf.items.filter(i => i.id !== itemId);
    saveToLocalStorage();
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
  return bucketItem;
};

export const updateBucketItem = (itemId: string, data: Partial<BucketItem>): void => {
  const item = localData.bucketItems.find(i => i.id === itemId);
  if (item) {
    Object.assign(item, data);
    saveToLocalStorage();
  }
};

export const removeBucketItem = (itemId: string): void => {
  localData.bucketItems = localData.bucketItems.filter(i => i.id !== itemId);
  saveToLocalStorage();
};

export const transferBucketItem = (bucketItem: BucketItem): void => {
  if (!bucketItem.destination) throw new Error('Destination not set');
  
  const { warehouseId, roomId, shelfId } = bucketItem.destination;
  const { id, originalPath, destination, isReadyToTransfer, ...itemData } = bucketItem;
  
  addItem(warehouseId, roomId, shelfId, itemData as ItemCore);
  removeBucketItem(bucketItem.id);
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