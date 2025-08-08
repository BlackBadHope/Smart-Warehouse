

// Interface to represent the structure of a Firestore Timestamp relevant to the app
// This avoids needing to import 'firebase' directly into this type definition file.
export interface FirestoreTimestamp {
  toDate(): Date;
  toMillis(): number;
  isEqual(other: FirestoreTimestamp): boolean;
  // Add other methods if used by the application, e.g., nanoseconds, seconds
}

export type Priority = 'High' | 'Normal' | 'Low' | 'Dispose';
export type Unit = 'pcs' | 'kg' | 'g' | 'l' | 'ml' | 'box' | 'pack';
export type EntityType = 'warehouse' | 'room' | 'shelf'; // shelf is a container

export interface ItemCore {
  name: string;
  category?: string;
  quantity: number;
  unit?: Unit;
  price?: number;
  purchaseDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  priority: Priority;
  description?: string;
  labels?: string[];
  barcode?: string;
  createdAt?: FirestoreTimestamp | Date; // Changed Timestamp to FirestoreTimestamp
}

export interface Item extends ItemCore {
  id: string;
}

export interface BucketItem extends Item {
  originalPath?: string; // Path from where the item was moved to bucket
  destination?: {
    warehouseId: string;
    warehouseName: string;
    roomId: string;
    roomName: string;
    shelfId: string;
    shelfName: string;
  };
  isReadyToTransfer?: boolean;
}

export interface FirebaseEntity {
  id: string;
  name: string;
  createdAt?: FirestoreTimestamp | Date; // Changed Timestamp to FirestoreTimestamp
}

export interface Warehouse extends FirebaseEntity {
  rooms?: Room[];
}
export interface Room extends FirebaseEntity {
  shelves?: Shelf[];
}
export interface Shelf extends FirebaseEntity {
  items?: Item[];
}

export interface UserProfile {
  username: string;
  currency: string; // e.g., 'USD'
}


// For AddItemModal form state
export interface NewItemFormState {
  name: string;
  category: string;
  quantity: string; // Input type="number" gives string value, parse on submit
  unit: Unit;
  price: string; // Input type="number" step="0.01" gives string value
  purchaseDate: string;
  expiryDate: string;
  priority: Priority;
  description: string;
  labels: string; // Comma-separated string
  barcode?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  addedAt: FirestoreTimestamp | Date;
}

// --- AI Tool Argument Types ---
export interface EntityCreationArgs {
  entityType: EntityType;
  name: string;
  parentWarehouseName?: string; // For room or shelf
  parentRoomName?: string;     // For shelf
}

export interface EntityMutationArgs extends EntityCreationArgs { // Inherits name (for new entity), entityType, parentWarehouseName, parentRoomName
  entityId?: string; // For rename/delete, AI might provide ID or name to find
  currentName: string; // Name of the entity to act upon (e.g. for renaming)
  newName: string; // New name for the entity (e.g. for renaming)
}

export interface ItemArgsBase {
  itemName: string;
  quantity?: number;
  unit?: Unit;
  category?: string;
  price?: number;
  purchaseDate?: string;
  expiryDate?: string;
  priority?: Priority;
  description?: string;
  labels?: string[];
}
export interface ItemInteractionArgs extends ItemArgsBase {
  // containerPath removed
  containerWarehouseName: string;
  containerRoomName: string;
  containerShelfName: string;
}

export interface GetExpiringItemsArgs {
  daysUntilExpiry?: number; // Optional, defaults to a week or so
}

// --- Inventory Summary Types ---
export interface ItemLocationSummary {
  path: string; // e.g., "Warehouse A > Room 1 > Shelf X"
  itemName: string;
  quantity: number;
  unit?: Unit;
  expiryDate?: string;
}
export interface InventorySummary {
  totalWarehouses: number;
  totalRooms: number;
  totalShelves: number;
  totalItems: number;
  items: ItemLocationSummary[]; // A sample of items or all items if feasible
  expiringSoon?: ItemLocationSummary[]; // Items expiring within a certain timeframe
}


