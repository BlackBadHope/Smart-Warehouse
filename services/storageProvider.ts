// Storage provider abstraction to support offline (localStorage) and future online mode
import * as local from './localStorageService';
import { ItemCore } from '../types';

export type StorageMode = 'offline' | 'online';

let currentMode: StorageMode = 'offline';

export const setMode = (mode: StorageMode) => {
  currentMode = mode;
};

export const getMode = (): StorageMode => currentMode;

// For now, online is not implemented; we fallback to local
const api = {
  getWarehouses: local.getWarehouses,
  addWarehouse: local.addWarehouse,
  updateWarehouseName: local.updateWarehouseName,
  deleteWarehouse: local.deleteWarehouse,
  getRooms: local.getRooms,
  addRoom: local.addRoom,
  updateRoomName: local.updateRoomName,
  deleteRoom: local.deleteRoom,
  getShelves: local.getShelves,
  addShelf: local.addShelf,
  updateShelfName: local.updateShelfName,
  deleteShelf: local.deleteShelf,
  moveShelf: local.moveShelf,
  getItems: local.getItems,
  addItem: local.addItem,
  updateItem: local.updateItem,
  deleteItem: local.deleteItem,
  updateItemQuantity: local.updateItemQuantity,
  getBucketItems: local.getBucketItems,
  addItemToBucket: local.addItemToBucket,
  updateBucketItem: local.updateBucketItem,
  removeBucketItem: local.removeBucketItem,
  transferBucketItem: local.transferBucketItem,
  getShoppingList: local.getShoppingList,
  addToShoppingList: local.addToShoppingList,
  findItemsByName: local.findItemsByName,
  getExpiringItems: local.getExpiringItems,
  getInventorySummary: local.getInventorySummary,
  findEntityByNameAndType: local.findEntityByNameAndType,
};

export default api;


